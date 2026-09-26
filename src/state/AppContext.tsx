"use client";
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from "react";
import {
  ScenarioId,
  Recommendation,
  Hotel,
  Resource,
  Alert,
  RedistributionImpact,
  SimulationState,
  SimulationSpeed,
  SimulationParams,
  ZoneState,
  ActiveIntervention,
  ZoneBaselineSnapshot,
} from "@/types";
import { MOCK_RECOMMENDATIONS } from "@/data/mockRecommendations";
import { getHotels, getResources, getScenarioKPIs, getAlerts } from "@/services/mockDataService";
import { getPressureLevel } from "@/data/mockResources";
import { createInitialSimulationState, nextSimulationState, calculateOutflowRate } from "@/services/simulationEngine";
import { OPERATIONAL_ZONES, fuseZoneState } from "@/services/zoneRegistry";
import { deviceRegistry } from "@/services/deviceRegistry";
import { sensorStreamSimulator } from "@/services/sensorStreamSimulator";
import { ingestionPipeline } from "@/services/ingestionPipeline";
import { sensorFusionEngine } from "@/services/sensorFusionEngine";
import { hotspotAndCascadeEngine } from "@/services/hotspotAndCascadeEngine";
import { recommendationLifecycleEngine } from "@/services/recommendationLifecycleEngine";
import { aiRecommendationPlanner } from "@/services/aiRecommendationPlanner";

interface AppContextValue {
  // Scenario
  activeScenario: ScenarioId;
  setScenario: (s: ScenarioId) => void;

  // Recommendations & AI Planner
  recommendations: Recommendation[];
  recommendationSource: "AI" | "CACHED_AI" | "DETERMINISTIC_FALLBACK";
  aiPlanSummary: string;
  aiModelUsed?: string;
  isGeneratingAiPlan: boolean;
  regenerateAiRecommendations: () => Promise<void>;
  approveRecommendation: (id: string) => void;
  rejectRecommendation: (id: string) => void;
  isRecommendationApproved: (id: string) => boolean;

  // Attendee state
  attendeeSelectedRouteId: string | null;
  selectAttendeeRoute: (id: string) => void;

  // Derived: does an approved rec affect attendees?
  hasAttendeeRecommendation: boolean;
  attendeeRecommendationMessage: string;

  // Destination pressure adjusted for attendee choice
  redistributionApplied: boolean;
  redistributionImpact: RedistributionImpact | null;

  // Centralized Dynamic Hotels
  hotels: Hotel[];
  hotelOverrides: Record<string, Partial<Hotel>>;
  updateHotelAvailability: (hotelId: string, availableRooms: number, checkIns?: number, checkOuts?: number) => void;
  resetHotels: () => void;

  // Centralized Dynamic Destination State
  resources: Resource[];
  kpis: ReturnType<typeof getScenarioKPIs>;
  alerts: Alert[];

  // Simulation Engine State & Controls
  simulationState: SimulationState;
  playSimulation: () => void;
  pauseSimulation: () => void;
  resetSimulation: () => void;
  setSimulationSpeed: (speed: SimulationSpeed) => void;
  simParams: SimulationParams;
  updateSimParams: (p: Partial<SimulationParams>) => void;

  // Zone Registry & Fused State
  zones: ZoneState[];
  getZoneState: (zoneId: string) => ZoneState | undefined;

  // Real-Time Hardware-Agnostic & CV Intelligence (Additive Seams)
  devices: import("@/types").DeviceDefinition[];
  latestObservations: import("@/types").NormalizedObservation[];
  hotspots: import("@/types").HotspotPrediction[];
  cascadeResult: import("@/types").CascadeAnalysisResult | null;
  interventions: import("@/types").OperationalIntervention[];
  activeInterventions: import("@/types").ActiveIntervention[];
  auditRecords: import("@/types").AuditRecord[];

  // Sensor Fault Simulation Controls (Interactive Evaluation)
  faultInjections: {
    outageDeviceIds: string[];
    lagDeviceIds: string[];
    conflictDeviceIds: string[];
  };
  toggleDeviceOutage: (deviceId: string) => void;
  toggleDeviceLag: (deviceId: string) => void;
  toggleDeviceConflict: (deviceId: string) => void;
  resetFaultInjections: () => void;
  selectedEvidenceZoneId: string;
  setSelectedEvidenceZoneId: (zoneId: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeScenario, setActiveScenario] = useState<ScenarioId>("NORMAL");
  const [recommendations, setRecommendations] = useState<Recommendation[]>(MOCK_RECOMMENDATIONS);
  const [recommendationSource, setRecommendationSource] = useState<"AI" | "CACHED_AI" | "DETERMINISTIC_FALLBACK">("AI");
  const [aiPlanSummary, setAiPlanSummary] = useState<string>("Synthesizing live operational intelligence...");
  const [aiModelUsed, setAiModelUsed] = useState<string | undefined>("gemini-3.8-flash");
  const [isGeneratingAiPlan, setIsGeneratingAiPlan] = useState<boolean>(false);

  const [attendeeSelectedRouteId, setAttendeeSelectedRouteId] = useState<string | null>(null);
  const [hotelOverrides, setHotelOverrides] = useState<Record<string, Partial<Hotel>>>({});
  const [selectedEvidenceZoneId, setSelectedEvidenceZoneId] = useState<string>("ZONE_CHURCHGATE");

  // Fault Injections State
  const [faultInjections, setFaultInjections] = useState<{
    outageDeviceIds: string[];
    lagDeviceIds: string[];
    conflictDeviceIds: string[];
  }>({
    outageDeviceIds: [],
    lagDeviceIds: [],
    conflictDeviceIds: [],
  });

  // Simulation Parameters
  const [simParams, setSimParams] = useState<SimulationParams>({
    attendance: 33000,
    eventDelay: 0,
    weather: "NORMAL",
    additionalBuses: 0,
    visitorRedistribution: 0,
    transportDisruption: false,
  });

  // Active Approved Interventions for Live Operational Simulation
  const [activeInterventions, setActiveInterventions] = useState<ActiveIntervention[]>([]);

  // Pure Domain Simulation State
  const [simulationState, setSimulationState] = useState<SimulationState>(() =>
    createInitialSimulationState(activeScenario, simParams.attendance)
  );

  // Play / Pause / Reset / Speed Controls
  const playSimulation = useCallback(() => {
    setSimulationState(prev => ({ ...prev, status: "PLAYING" }));
  }, []);

  const pauseSimulation = useCallback(() => {
    setSimulationState(prev => ({ ...prev, status: "PAUSED" }));
  }, []);

  const resetSimulation = useCallback(() => {
    setActiveInterventions([]);
    setSimulationState(createInitialSimulationState(activeScenario, simParams.attendance));
  }, [activeScenario, simParams.attendance]);

  const setSimulationSpeed = useCallback((speed: SimulationSpeed) => {
    setSimulationState(prev => ({ ...prev, speed }));
  }, []);

  const updateSimParams = useCallback((p: Partial<SimulationParams>) => {
    setSimParams(prev => {
      const next = { ...prev, ...p };
      // Base parameter change rule: Changing attendance, weather, eventDelay, or disruption
      // cleanly reinitializes the simulation from the new configuration.
      const baseChanged =
        p.attendance !== undefined ||
        p.weather !== undefined ||
        p.transportDisruption !== undefined ||
        p.eventDelay !== undefined;
      if (baseChanged) {
        setSimulationState(createInitialSimulationState(activeScenario, next.attendance));
      }
      return next;
    });
  }, [activeScenario]);

  // Reset entire state when scenario changes to prevent leakage across scenarios
  const setScenario = useCallback((s: ScenarioId) => {
    setActiveScenario(s);
    setAttendeeSelectedRouteId(null);
    setHotelOverrides({});
    setActiveInterventions([]);
    setSimulationState(createInitialSimulationState(s, simParams.attendance));
  }, [simParams.attendance]);

  const selectAttendeeRoute = useCallback((id: string) => {
    setAttendeeSelectedRouteId(id);
  }, []);

  // Hotel update handler for partner portal
  const updateHotelAvailability = useCallback((
    hotelId: string,
    availableRooms: number,
    checkIns?: number,
    checkOuts?: number
  ) => {
    setHotelOverrides(prev => ({
      ...prev,
      [hotelId]: {
        ...(prev[hotelId] || {}),
        availableRooms,
        ...(checkIns !== undefined ? { expectedCheckIns: checkIns } : {}),
        ...(checkOuts !== undefined ? { expectedCheckOuts: checkOuts } : {}),
      },
    }));
  }, []);

  const resetHotels = useCallback(() => {
    setHotelOverrides({});
  }, []);

  // Compute dynamic hotels incorporating scenario multiplier and partner updates
  const hotels = useMemo(() => {
    return getHotels(activeScenario, hotelOverrides);
  }, [activeScenario, hotelOverrides]);

  // REC1 or first REDISTRIBUTE recommendation affects attendees
  const rec1Approved = recommendations.find(r => r.id === "REC1" || r.type === "REDISTRIBUTE")?.status === "APPROVED" || recommendations.find(r => r.id === "REC1" || r.type === "REDISTRIBUTE")?.status === "ACTIVE";
  const hasAttendeeRecommendation = rec1Approved;
  const attendeeRecommendationMessage = rec1Approved
    ? "Churchgate pressure is rising. Dadar Station offers a better journey with only 8 minutes extra travel time."
    : "";

  // If attendee selected BALANCED route and rec1 is approved, redistribution is applied
  const redistributionApplied = rec1Approved && attendeeSelectedRouteId === "BALANCED";

  const redistributionImpact: RedistributionImpact | null = useMemo(() => {
    if (!redistributionApplied) return null;
    return {
      churchgateBefore: 94,
      churchgateAfter: 76,
      dadarBefore: 58,
      dadarAfter: 69,
      wankhedeExitBefore: 88,
      wankhedeExitAfter: 82,
      visitorsRedistributed: 1200,
      travelDeltaMin: 8,
    };
  }, [redistributionApplied]);

  // Controlled Simulation Ticker Loop
  // Fires at a controlled cadence (800ms) when status is PLAYING.
  // Advances simulation time by (1 * speed) simulated minutes per tick, passing all active interventions.
  useEffect(() => {
    if (simulationState.status !== "PLAYING") return;

    const timer = setInterval(() => {
      setSimulationState(prev => {
        if (prev.status !== "PLAYING") return prev;
        return nextSimulationState(
          prev,
          1 * prev.speed,
          activeScenario,
          simParams.attendance,
          activeInterventions
        );
      });
    }, 800);

    return () => clearInterval(timer);
  }, [
    simulationState.status,
    simulationState.speed,
    activeScenario,
    simParams.attendance,
    activeInterventions,
  ]);

  // Dynamic destination resources (reflecting scenario + attendee redistribution + live simulation loads)
  const resources = useMemo(() => {
    const baseResources = getResources(activeScenario, redistributionApplied);

    // If simulation has run (minutesElapsed > 0), seamlessly incorporate simulation node loads
    if (simulationState.minutesElapsed > 0) {
      return baseResources.map(r => {
        const simLoad = simulationState.nodeLoads[r.id];
        if (simLoad !== undefined) {
          const cap = r.totalCapacity || 1000;
          const pressure = Math.min(99, Math.max(20, Math.round((simLoad / cap) * 100)));
          const pressureLevel = getPressureLevel(pressure);
          return {
            ...r,
            pressure,
            pressureLevel,
            currentUtilization: simLoad,
            availableCapacity: Math.max(0, cap - simLoad),
          };
        }
        return r;
      });
    }

    return baseResources;
  }, [
    activeScenario,
    redistributionApplied,
    simulationState.minutesElapsed,
    simulationState.nodeLoads,
  ]);

  // Dynamic KPIs (destination pressure, usable capacity including hotels, bottleneck)
  const kpis = useMemo(() => {
    return getScenarioKPIs(activeScenario, redistributionApplied, hotels, resources);
  }, [activeScenario, redistributionApplied, hotels, resources]);

  // Fault Injection Handlers
  const toggleDeviceOutage = useCallback((deviceId: string) => {
    setFaultInjections(prev => {
      const exists = prev.outageDeviceIds.includes(deviceId);
      const nextOutages = exists
        ? prev.outageDeviceIds.filter(id => id !== deviceId)
        : [...prev.outageDeviceIds, deviceId];
      return { ...prev, outageDeviceIds: nextOutages };
    });
  }, []);

  const toggleDeviceLag = useCallback((deviceId: string) => {
    setFaultInjections(prev => {
      const exists = prev.lagDeviceIds.includes(deviceId);
      const nextLag = exists
        ? prev.lagDeviceIds.filter(id => id !== deviceId)
        : [...prev.lagDeviceIds, deviceId];
      return { ...prev, lagDeviceIds: nextLag };
    });
  }, []);

  const toggleDeviceConflict = useCallback((deviceId: string) => {
    setFaultInjections(prev => {
      const exists = prev.conflictDeviceIds.includes(deviceId);
      const nextConflict = exists
        ? prev.conflictDeviceIds.filter(id => id !== deviceId)
        : [...prev.conflictDeviceIds, deviceId];
      return { ...prev, conflictDeviceIds: nextConflict };
    });
  }, []);

  const resetFaultInjections = useCallback(() => {
    setFaultInjections({
      outageDeviceIds: [],
      lagDeviceIds: [],
      conflictDeviceIds: [],
    });
  }, []);

  // Update simulator config when activeScenario or faultInjections change
  useEffect(() => {
    sensorStreamSimulator.setConfig({
      scenarioId: activeScenario,
      injectOutagesForDeviceIds: faultInjections.outageDeviceIds,
      injectLagForDeviceIds: faultInjections.lagDeviceIds,
      injectConflictForDeviceIds: faultInjections.conflictDeviceIds,
    });
  }, [activeScenario, faultInjections]);

  // Real-Time Normalized Observation Pipeline (Runs when simulation steps or faults toggle)
  const latestObservations = useMemo(() => {
    const currentOutflowRate = calculateOutflowRate(
      simulationState.minutesElapsed,
      activeScenario,
      simParams.attendance
    );
    const rawObs = sensorStreamSimulator.generateObservationsForState(
      simulationState.nodeLoads,
      currentOutflowRate
    );
    const normalizedResult = ingestionPipeline.processBatch(rawObs);
    return normalizedResult.accepted;
  }, [simulationState.nodeLoads, simulationState.minutesElapsed, activeScenario, simParams.attendance, faultInjections]);

  // Fused Zone States — Guarded hybrid fusion algorithm (DR-001)
  // Combines real-time multi-sensor fusion with legacy zoneRegistry fallback for uninstrumented zones.
  const zones = useMemo((): ZoneState[] => {
    return OPERATIONAL_ZONES.map(zone =>
      sensorFusionEngine.fuseZoneObservations(
        zone,
        latestObservations,
        {
          scenario: activeScenario,
          resources,
          hotels,
          simulationState,
          redistributionApplied,
        }
      )
    );
  }, [latestObservations, resources, hotels, activeScenario, simulationState.minutesElapsed, simulationState.nodeLoads, redistributionApplied]); // eslint-disable-line react-hooks/exhaustive-deps

  const getZoneState = useCallback(
    (zoneId: string): ZoneState | undefined => zones.find(z => z.id === zoneId),
    [zones]
  );

  const approveRecommendation = useCallback((id: string) => {
    const rec = recommendations.find(r => r.id === id);
    if (!rec) return;

    // 1. Capture immutable baseline snapshot of all zones at approval time
    const baselines: Record<string, ZoneBaselineSnapshot> = {};
    zones.forEach(z => {
      baselines[z.id] = {
        zoneId: z.id,
        zoneName: z.name,
        pressure: z.pressure,
        density: z.density || 0,
        currentUtilization: z.currentUtilization,
        inflowRate: z.inflowRate,
        outflowRate: z.outflowRate,
        timestamp: new Date().toISOString(),
      };
    });

    const approvedAt = Date.now();
    const actionType: any = rec.actionType || (rec.type === "REDISTRIBUTE" ? "REROUTE_ATTENDEES" : rec.type === "TRANSPORT" ? "ADD_TRANSIT_SHUTTLES" : "REROUTE_ATTENDEES");

    const newIntervention: ActiveIntervention = {
      id: `ACT_INT_${rec.id}_${approvedAt}`,
      recommendationId: rec.id,
      type: actionType,
      actionType,
      title: rec.title,
      description: rec.action,
      status: "ACTIVE",
      approvedAt,
      approvedAtSimulationMinute: simulationState.minutesElapsed,
      durationMinutes: rec.timeHorizonMinutes || 30,
      rampDurationSeconds: 15,
      intensity: 1.0,
      baselines,
    };

    setActiveInterventions(prev => [...prev.filter(i => i.recommendationId !== id), newIntervention]);

    setRecommendations(prev =>
      prev.map(r => r.id === id ? { ...r, status: "ACTIVE" as const, approvedAt, baselines } : r)
    );

    // Log approval in lifecycle engine & persistence audit trail
    recommendationLifecycleEngine.recordDecision(
      id,
      "APPROVE",
      "USER_ORGANIZER_01",
      "ORGANIZER"
    );
  }, [recommendations, zones, simulationState.minutesElapsed]);

  const rejectRecommendation = useCallback((id: string) => {
    setActiveInterventions(prev => prev.filter(i => i.recommendationId !== id));
    setRecommendations(prev =>
      prev.map(r => r.id === id ? { ...r, status: "REJECTED" as const } : r)
    );
    // Log rejection in lifecycle engine & persistence audit trail
    recommendationLifecycleEngine.recordDecision(
      id,
      "REJECT",
      "USER_ORGANIZER_01",
      "ORGANIZER"
    );
  }, []);

  const isRecommendationApproved = useCallback((id: string) => {
    const rec = recommendations.find(r => r.id === id);
    return rec?.status === "APPROVED" || rec?.status === "ACTIVE";
  }, [recommendations]);

  // Dynamic alerts
  const alerts = useMemo(() => {
    const baseAlerts = getAlerts(activeScenario);
    const dynamicList: Alert[] = [...baseAlerts];

    // If redistribution is active, add positive closed loop alert
    if (redistributionApplied) {
      dynamicList.unshift({
        id: "ALERT_CLOSED_LOOP",
        severity: "WATCH",
        category: "CROWD",
        title: "Closed-loop redistribution active",
        message: "Attendee choice diverted ~1,200 visitors to Dadar. Churchgate pressure reduced 94% → 76%.",
        resourceId: "CHURCHGATE",
        timestamp: "JUST NOW",
      });
    }

    // If any partner hotel reported tight inventory (< 25 rooms in Zone C or < 10 in Zone A)
    const tightHotels = hotels.filter(h => h.source === "PARTNER_REPORTED" && h.availableRooms <= 20);
    tightHotels.forEach(h => {
      dynamicList.unshift({
        id: `ALERT_HOTEL_${h.id}`,
        severity: h.availableRooms <= 10 ? "HIGH" : "WATCH",
        category: "ACCOMMODATION",
        title: `${h.name} inventory low`,
        message: `Partner reported ${h.availableRooms} rooms available (${h.usableRooms} usable). Accommodation pressure at ${h.pressure}%.`,
        actionLabel: "View Stay",
        actionRoute: "/attendee/stay",
        timestamp: "JUST NOW",
      });
    });

    return dynamicList;
  }, [activeScenario, redistributionApplied, hotels]);

  // Initialize Default Hardware Devices into Registry (Runs once)
  useEffect(() => {
    sensorStreamSimulator.initializeDefaultDevices();
  }, []);

  // Registered Devices
  const devices = useMemo(() => {
    return deviceRegistry.getAll();
  }, [latestObservations, faultInjections]);

  // Detected Spatial Hotspots
  const hotspots = useMemo(() => {
    return hotspotAndCascadeEngine.detectHotspots(zones);
  }, [zones]);

  // Forward Cascade Spillover Analysis
  const cascadeResult = useMemo(() => {
    const originZone = zones.find(z => z.id === "ZONE_WANKHEDE");
    const originPressure = originZone ? originZone.pressure : 85;
    return hotspotAndCascadeEngine.analyzeCascade("ZONE_WANKHEDE", originPressure, resources);
  }, [zones, resources]);

  // Generated Operational Interventions
  const interventions = useMemo(() => {
    return recommendationLifecycleEngine.generateInterventions(zones);
  }, [zones]);

  const auditRecords = useMemo(() => {
    return recommendationLifecycleEngine.getAuditTrail();
  }, [recommendations]);

  // AI Recommendation Planner Synchronizer
  const fetchAiPlan = useCallback(async (force = false) => {
    if (zones.length === 0) return;
    setIsGeneratingAiPlan(true);
    try {
      const context = aiRecommendationPlanner.buildContext(
        activeScenario,
        zones,
        resources,
        hotspots,
        cascadeResult,
        interventions,
        simulationState,
        redistributionApplied
      );
      const plan = await aiRecommendationPlanner.getOrFetchPlan(context, force);
      if (plan && plan.recommendations && plan.recommendations.length > 0) {
        setRecommendations(prev => {
          const approvedSet = new Set(prev.filter(r => r.status === "APPROVED").map(r => r.id));
          const rejectedSet = new Set(prev.filter(r => r.status === "REJECTED").map(r => r.id));

          return plan.recommendations.map(newRec => ({
            ...newRec,
            status: approvedSet.has(newRec.id) ? "APPROVED" : (rejectedSet.has(newRec.id) ? "REJECTED" : newRec.status),
          }));
        });
        setRecommendationSource(plan.source);
        setAiPlanSummary(plan.planSummary);
        if (plan.modelUsed) {
          setAiModelUsed(plan.modelUsed);
        }
      }
    } catch (err) {
      console.warn("[AppContext] AI plan fetch failed:", err);
    } finally {
      setIsGeneratingAiPlan(false);
    }
  }, [activeScenario, zones, resources, hotspots, cascadeResult, interventions, simulationState.minutesElapsed, redistributionApplied]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fetch on scenario shift or new hotspot detection
  useEffect(() => {
    fetchAiPlan(false);
  }, [activeScenario, hotspots.length, redistributionApplied]); // eslint-disable-line react-hooks/exhaustive-deps

  const regenerateAiRecommendations = useCallback(async () => {
    await fetchAiPlan(true);
  }, [fetchAiPlan]);

  return (
    <AppContext.Provider value={{
      activeScenario, setScenario,
      recommendations, recommendationSource, aiPlanSummary, aiModelUsed, isGeneratingAiPlan, regenerateAiRecommendations,
      approveRecommendation, rejectRecommendation, isRecommendationApproved,
      attendeeSelectedRouteId, selectAttendeeRoute,
      hasAttendeeRecommendation, attendeeRecommendationMessage,
      redistributionApplied, redistributionImpact,
      hotels, hotelOverrides, updateHotelAvailability, resetHotels,
      resources, kpis, alerts,
      simulationState, playSimulation, pauseSimulation, resetSimulation, setSimulationSpeed,
      simParams, updateSimParams,
      zones, getZoneState,
      devices, latestObservations, hotspots, cascadeResult, interventions, activeInterventions, auditRecords,
      faultInjections, toggleDeviceOutage, toggleDeviceLag, toggleDeviceConflict, resetFaultInjections,
      selectedEvidenceZoneId, setSelectedEvidenceZoneId,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
