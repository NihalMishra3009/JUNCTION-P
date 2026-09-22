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
} from "@/types";
import { MOCK_RECOMMENDATIONS } from "@/data/mockRecommendations";
import { getHotels, getResources, getScenarioKPIs, getAlerts } from "@/services/mockDataService";
import { getPressureLevel } from "@/data/mockResources";
import { createInitialSimulationState, nextSimulationState } from "@/services/simulationEngine";
import { OPERATIONAL_ZONES, fuseZoneState } from "@/services/zoneRegistry";

interface AppContextValue {
  // Scenario
  activeScenario: ScenarioId;
  setScenario: (s: ScenarioId) => void;

  // Recommendations
  recommendations: Recommendation[];
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
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeScenario, setActiveScenario] = useState<ScenarioId>("NORMAL");
  const [recommendations, setRecommendations] = useState<Recommendation[]>(MOCK_RECOMMENDATIONS);
  const [attendeeSelectedRouteId, setAttendeeSelectedRouteId] = useState<string | null>(null);
  const [hotelOverrides, setHotelOverrides] = useState<Record<string, Partial<Hotel>>>({});

  // Simulation Parameters
  const [simParams, setSimParams] = useState<SimulationParams>({
    attendance: 33000,
    eventDelay: 0,
    weather: "NORMAL",
    additionalBuses: 0,
    visitorRedistribution: 0,
    transportDisruption: false,
  });

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
    setRecommendations(MOCK_RECOMMENDATIONS.map(r => ({ ...r, status: "PENDING" as const })));
    setHotelOverrides({});
    setSimulationState(createInitialSimulationState(s, simParams.attendance));
  }, [simParams.attendance]);

  const approveRecommendation = useCallback((id: string) => {
    setRecommendations(prev =>
      prev.map(r => r.id === id ? { ...r, status: "APPROVED" as const } : r)
    );
  }, []);

  const rejectRecommendation = useCallback((id: string) => {
    setRecommendations(prev =>
      prev.map(r => r.id === id ? { ...r, status: "REJECTED" as const } : r)
    );
  }, []);

  const isRecommendationApproved = useCallback((id: string) => {
    return recommendations.find(r => r.id === id)?.status === "APPROVED";
  }, [recommendations]);

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

  // REC1 affects attendees (redistribute Churchgate -> Dadar)
  const rec1Approved = recommendations.find(r => r.id === "REC1")?.status === "APPROVED";
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
  // Advances simulation time by (1 * speed) simulated minutes per tick.
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
          redistributionApplied
        );
      });
    }, 800);

    return () => clearInterval(timer);
  }, [
    simulationState.status,
    simulationState.speed,
    activeScenario,
    simParams.attendance,
    redistributionApplied,
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

  // Fused Zone States — synthesised from live resources, hotels, scenario, and simulation.
  // NOTE: fuseZoneState reads simulationState.nodeLoads and simulationState.minutesElapsed only.
  // We depend on those two specific fields (matching the resources memo pattern) instead of the
  // full simulationState object so that play/pause/speed changes do not trigger a recomputation.
  const zones = useMemo((): ZoneState[] => {
    return OPERATIONAL_ZONES.map(zone =>
      fuseZoneState(
        zone,
        resources,
        hotels,
        activeScenario,
        simulationState,
        redistributionApplied
      )
    );
  }, [resources, hotels, activeScenario, simulationState.minutesElapsed, simulationState.nodeLoads, redistributionApplied]); // eslint-disable-line react-hooks/exhaustive-deps

  const getZoneState = useCallback(
    (zoneId: string): ZoneState | undefined => zones.find(z => z.id === zoneId),
    [zones]
  );

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

  return (
    <AppContext.Provider value={{
      activeScenario, setScenario,
      recommendations, approveRecommendation, rejectRecommendation, isRecommendationApproved,
      attendeeSelectedRouteId, selectAttendeeRoute,
      hasAttendeeRecommendation, attendeeRecommendationMessage,
      redistributionApplied, redistributionImpact,
      hotels, hotelOverrides, updateHotelAvailability, resetHotels,
      resources, kpis, alerts,
      simulationState, playSimulation, pauseSimulation, resetSimulation, setSimulationSpeed,
      simParams, updateSimParams,
      zones, getZoneState,
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
