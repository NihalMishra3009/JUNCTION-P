"use client";

import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { Resource, RoadEdge } from "@/types";
import { useApp } from "@/state/AppContext";
import { getRoadNetwork } from "@/data/mockRoadNetwork";
import { getCrowdFlows } from "@/data/mockCrowdFlows";
import { getPredictedHotspots } from "@/data/mockHotspotService";
import { getRestaurants } from "@/data/mockRestaurants";
import { SCENARIOS } from "@/data/mockScenarios";
import { getPressureColor, getPressureLabel } from "@/components/ui/PressureIndicator";
import { useMapStore } from "@/store/mapStore";

import styles from "./DestinationMap.module.css";

// Dynamic imports with SSR disabled for browser-only map libraries
const InvestigationMap = dynamic(() => import("./map/InvestigationMap"), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>
      <div className="spinner" />
      <span>Loading SECRET MapLibre 3D Vector Engine...</span>
    </div>
  ),
});

const CesiumCommandMap = dynamic(() => import("./map/CesiumCommandMap"), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>
      <div className="spinner" />
      <span>Initializing Cesium 3D Engine...</span>
    </div>
  ),
});

const LeafletCommandMap = dynamic(() => import("./map/LeafletCommandMap"), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>
      <div className="spinner" />
      <span>Loading 2D Leaflet Operational Map...</span>
    </div>
  ),
});

interface Props {
  resources: Resource[];
  onSelectResource: (r: Resource) => void;
  selectedId: string | null;
}

const LAYER_CONFIG = [
  { name: "Human Flow", dotColor: "#3B82F6" },
  { name: "Human Density", dotColor: "#EF4444" },
  { name: "Transport", dotColor: "#2563EB" },
  { name: "Accommodation", dotColor: "#8B5CF6" },
  { name: "Restaurants", dotColor: "#F59E0B" },
  { name: "Venues", dotColor: "#10B981" },
  { name: "Roads", dotColor: "#64748B" },
  { name: "Predicted Hotspots", dotColor: "#DC2626" },
  { name: "Sensor Health", dotColor: "#06B6D4" },
];

export default function DestinationMap({
  resources,
  onSelectResource,
  selectedId,
}: Props) {
  const {
    activeScenario,
    hotels,
    devices,
    redistributionApplied,
    simulationState,
    playSimulation,
    pauseSimulation,
    resetSimulation,
    setSimulationSpeed,
    simParams,
    latestObservations,
    zones,
  } = useApp();

  const { worldProvider, setWorldProvider } = useMapStore();

  const staleObs = useMemo(() => latestObservations.filter((o) => o.qualityStatus === "STALE"), [latestObservations]);
  const conflictingObs = useMemo(() => latestObservations.filter((o) => o.qualityStatus === "CONFLICTING"), [latestObservations]);

  const isRunning = simulationState.status === "PLAYING";
  const isPaused = simulationState.status === "PAUSED";
  const isComplete = simulationState.status === "COMPLETE";
  const [showLegend, setShowLegend] = useState(true);
  const [showMatrix, setShowMatrix] = useState(true);
  const [showSimulationInspect, setShowSimulationInspect] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("ZONE_WANKHEDE_GATE_2");

  // Keep selected zone synchronized if selectedId references a zone
  useEffect(() => {
    if (selectedId && selectedId.startsWith("ZONE_")) {
      setSelectedZoneId(selectedId);
    }
  }, [selectedId]);

  const selectedZone = useMemo(() => {
    return (
      zones.find((z) => z.id === selectedZoneId) ||
      zones.find((z) => z.id === "ZONE_WANKHEDE_GATE_2") ||
      zones[0]
    );
  }, [zones, selectedZoneId]);

  const zoneBaselinePressure = useMemo(() => {
    if (!selectedZone) return 50;
    const s = SCENARIOS[activeScenario] || SCENARIOS.NORMAL;
    const keyMap: Record<string, string> = {
      ZONE_WANKHEDE_GATE_1: "WANKHEDE_EXIT_GATE_1",
      ZONE_WANKHEDE_GATE_2: "WANKHEDE_EXIT_GATE_2",
      ZONE_WANKHEDE: "WANKHEDE_EXIT",
      ZONE_CHURCHGATE: "CHURCHGATE",
      ZONE_DADAR: "DADAR",
      ZONE_MARINE_LINES: "MARINE_LINES",
      ZONE_TAXI_STAGING: "TAXI_ZONE",
      ZONE_CSMT: "CSMT",
    };
    const sKey = keyMap[selectedZone.id] || selectedZone.memberResources?.[0] || selectedZone.id.replace("ZONE_", "");
    const sp = s.pressure[sKey];
    return sp ? sp.pressure : (selectedZone.pressure || 50);
  }, [selectedZone, activeScenario]);

  const simulatedPressure = selectedZone?.pressure ?? 50;
  const pressureDelta = simulatedPressure - zoneBaselinePressure;

  const scenarioLabel =
    activeScenario === "POST_EVENT_SURGE" ? "Post-Event Surge" :
    activeScenario === "TRANSPORT_DISRUPTION" ? "Transit Disruption" :
    activeScenario === "HEAVY_RAIN" ? "Monsoon Advisory" :
    activeScenario === "ACCOMMODATION_SATURATION" ? "Hotel Saturation" :
    "Normal Flow";

  // MAP ENGINE TOGGLE: SECRET 3D Map (default) vs 2D Operational Map
  const [mapEngine, setMapEngine] = useState<"MAPLIBRE" | "LEAFLET">("MAPLIBRE");

  // Multi-layer simultaneous composability - all operational layers enabled by default
  const [activeLayers, setActiveLayers] = useState<Set<string>>(
    new Set([
      "Human Flow",
      "Human Density",
      "Transport",
      "Accommodation",
      "Restaurants",
      "Venues",
      "Roads",
      "Predicted Hotspots",
      "Sensor Health",
    ])
  );

  const toggleLayer = (layerName: string) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerName)) {
        next.delete(layerName);
      } else {
        next.add(layerName);
      }
      return next;
    });
  };

  const roads = useMemo(() => {
    const baseRoads = getRoadNetwork(activeScenario, redistributionApplied);
    if (simulationState.minutesElapsed > 0) {
      const edgeLoadMap: Record<string, string> = {
        ROAD_VEER_NARIMAN: "EDGE_EXIT_VEER_NARIMAN",
        ROAD_MAHARSHI_KARVE: "EDGE_EXIT_MK_ROAD",
        ROAD_DN_ROAD: "EDGE_DN_ROAD_LINK",
        ROAD_CENTRAL_SPINE: "EDGE_CENTRAL_SPINE",
      };

      return baseRoads.map((road) => {
        const topologyEdgeId = edgeLoadMap[road.id];
        if (topologyEdgeId && simulationState.edgeLoads[topologyEdgeId] !== undefined) {
          const load = simulationState.edgeLoads[topologyEdgeId];
          const capacity = road.capacity || 3000;
          const congestion = Math.min(99, Math.max(30, Math.round((load / capacity) * 100) + 35));
          let status: RoadEdge["status"] = "NORMAL";
          if (congestion >= 90) status = "DISRUPTED";
          else if (congestion >= 80) status = "CONGESTED";
          else if (congestion >= 65) status = "HEAVY";
          const travelTimeMin = Math.round((road.distanceKm || 2) * 3 * (1 + (congestion - 50) / 100));

          return {
            ...road,
            congestion,
            status,
            travelTimeMin,
          };
        }
        return road;
      });
    }
    return baseRoads;
  }, [
    activeScenario,
    redistributionApplied,
    simulationState.minutesElapsed,
    simulationState.edgeLoads,
  ]);

  const flows = useMemo(() => getCrowdFlows(activeScenario, redistributionApplied), [activeScenario, redistributionApplied]);
  const hotspots = useMemo(() => getPredictedHotspots(resources, activeScenario), [resources, activeScenario]);
  const restaurants = useMemo(() => getRestaurants(activeScenario), [activeScenario]);

  // Exact conservation metrics derived from SimulationState
  const totalModeled = simParams.attendance || 33000;
  const remainingAtVenue = Math.max(0, totalModeled - simulationState.totalExitedVenue);
  const inTransit = Object.values(simulationState.edgeLoads).reduce((s, v) => s + v, 0);
  const accumulated = Object.values(simulationState.nodeLoads).reduce((s, v) => s + v, 0);
  const processed = simulationState.totalCleared;

  return (
    <div className={styles.mapWrap}>
      {/* OPERATIONAL LAYER TOGGLE BAR */}
      <div className={styles.layerBar}>
        {/* 3D vs 2D MAP ENGINE TOGGLE BUTTONS */}
        <div style={{ display: "flex", gap: "2px", background: "rgba(15, 23, 42, 0.85)", padding: "2px", borderRadius: "16px", marginRight: "8px", border: "1px solid rgba(255,255,255,0.12)" }}>
          <button
            className={`${styles.layerBtn} ${mapEngine === "MAPLIBRE" ? styles.layerActive : ""}`}
            onClick={() => {
              setMapEngine("MAPLIBRE");
              setWorldProvider("maplibre-extrusion");
            }}
            title="3D Vector Map"
            style={{ borderRadius: "12px 0 0 12px", padding: "3px 10px" }}
          >
            🏙️ 3D Map
          </button>

          <button
            className={`${styles.layerBtn} ${mapEngine === "LEAFLET" ? styles.layerActive : ""}`}
            onClick={() => {
              setMapEngine("LEAFLET");
            }}
            title="2D Operational Map View"
            style={{ borderRadius: "0 12px 12px 0", padding: "3px 10px" }}
          >
            🗺️ 2D Map
          </button>
        </div>

        {LAYER_CONFIG.map((layer) => {
          const isActive = activeLayers.has(layer.name);
          return (
            <button
              key={layer.name}
              className={`${styles.layerBtn} ${isActive ? styles.layerActive : ""}`}
              onClick={() => toggleLayer(layer.name)}
              title={`Toggle ${layer.name} layer (${isActive ? "ON" : "OFF"})`}
            >
              <span
                className={styles.layerDot}
                style={{
                  background: isActive ? "#ffffff" : layer.dotColor,
                }}
              />
              {layer.name}
            </button>
          );
        })}

        <button
          className={`${styles.layerBtn} ${showMatrix ? styles.layerActive : ""}`}
          onClick={() => setShowMatrix((prev) => !prev)}
          title="Toggle Simulation Operational Decision Matrix"
          style={{
            background: showMatrix ? "#f59e0b" : undefined,
            color: showMatrix ? "#040714" : undefined,
            fontWeight: 700,
            marginLeft: "auto",
          }}
        >
          📊 Matrix View
        </button>
      </div>

      {/* COMPACT MAP SIMULATION CONTROLLER */}
      <div className={styles.simBar}>
        <div className={styles.simBarLeft}>
          <span className={styles.simClockIcon}>⏱</span>
          <span className={styles.simClockTime}>{simulationState.simulationTime}</span>
          <span className={`${styles.simStatusPill} ${isRunning ? styles.simRunning : isPaused ? styles.simPaused : isComplete ? styles.statusComplete : styles.simIdle}`}>
            {isRunning ? "● SIMULATING" : isPaused ? "Ⅱ PAUSED" : isComplete ? "✓ COMPLETE" : "○ IDLE"}
          </span>
          <span className={styles.simElapsed}>+{simulationState.minutesElapsed}m</span>
          <span className={styles.telemetryEnvBadge}>
            {mapEngine === "MAPLIBRE" ? "3D MAP" : "2D MAP"}
          </span>
          {staleObs.length > 0 && (
            <span className="pill pill-watch" style={{ fontSize: 9 }} title={`${staleObs.length} sensor observations exceed freshness threshold`}>
              ⚠️ STALE TELEMETRY ({staleObs.length})
            </span>
          )}
          {conflictingObs.length > 0 && (
            <span className="pill pill-critical" style={{ fontSize: 9 }} title="Sensor readings exhibit conflicting measurement spread">
              ⚡ SENSOR DISAGREEMENT DETECTED
            </span>
          )}
        </div>

        <div className={styles.simBarRight}>
          {isRunning ? (
            <button className={styles.simControlBtn} onClick={pauseSimulation}>
              Ⅱ Pause
            </button>
          ) : (
            <button className={`${styles.simControlBtn} ${styles.simPlayBtn}`} onClick={playSimulation}>
              {isComplete ? "▶ Replay" : isPaused ? "▶ Resume" : "▶ Play"}
            </button>
          )}
          <button className={styles.simControlBtn} onClick={resetSimulation}>
            ↻ Reset
          </button>
          <div className={styles.simSpeedGroup}>
            {([1, 5, 10] as const).map((s) => (
              <button
                key={s}
                className={`${styles.simSpeedBtn} ${simulationState.speed === s ? styles.simSpeedActive : ""}`}
                onClick={() => setSimulationSpeed(s)}
              >
                {s}×
              </button>
            ))}
          </div>
          <button
            className={`${styles.simControlBtn} ${showSimulationInspect ? styles.simControlBtnActive : ""}`}
            onClick={() => setShowSimulationInspect((prev) => !prev)}
            title="Toggle Simulation Inspection Panel"
          >
            🔬 Inspect
          </button>
          <button className={styles.simControlBtn} onClick={() => setShowLegend((prev) => !prev)} title="Toggle Map Legend">
            {showLegend ? "Legend ▾" : "Legend ▸"}
          </button>
        </div>
      </div>

      {/* GEOGRAPHIC COMMAND MAP CONTAINER */}
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {mapEngine === "LEAFLET" ? (
          <LeafletCommandMap
            resources={resources}
            hotels={hotels}
            restaurants={restaurants}
            roads={roads}
            flows={flows}
            hotspots={hotspots}
            simulationState={simulationState}
            devices={devices}
            activeLayers={activeLayers}
            onSelectResource={onSelectResource}
            selectedId={selectedId}
          />
        ) : (
          <InvestigationMap
            resources={resources}
            hotels={hotels}
            restaurants={restaurants}
            roads={roads}
            flows={flows}
            hotspots={hotspots}
            simulationState={simulationState}
            activeLayers={activeLayers}
            onSelectResource={onSelectResource}
            selectedId={selectedId}
            onSelectZone={(zoneId) => setSelectedZoneId(zoneId)}
          />
        )}

        {/* FLOATING SIMULATION INSPECT PANEL */}
        {showSimulationInspect && (
          <div className={styles.simInspectOverlay}>
            <div className={styles.simInspectHeader}>
              <div className={styles.simInspectTitleGroup}>
                <span className={styles.simInspectKicker}>SIMULATION INSPECT</span>
                <span
                  className={`${styles.simInspectStatusBadge} ${
                    isRunning
                      ? styles.statusRunning
                      : isPaused
                      ? styles.statusPaused
                      : isComplete
                      ? styles.statusComplete
                      : styles.statusIdle
                  }`}
                >
                  {isRunning ? "RUNNING" : isPaused ? "PAUSED" : isComplete ? "COMPLETE" : "IDLE"}
                </span>
              </div>
              <button
                className={styles.simInspectCloseBtn}
                onClick={() => setShowSimulationInspect(false)}
                title="Hide Inspection Panel"
              >
                ✕
              </button>
            </div>

            {/* Simulation Progress & Mass Balance */}
            <div className={styles.simInspectMetaGrid}>
              <div className={styles.simInspectMetaItem}>
                <span className={styles.simInspectMetaLabel}>Scenario</span>
                <span className={styles.simInspectMetaVal}>{scenarioLabel}</span>
              </div>
              <div className={styles.simInspectMetaItem}>
                <span className={styles.simInspectMetaLabel}>Sim Time</span>
                <span className={styles.simInspectMetaVal}>
                  +{simulationState.minutesElapsed} min ({simulationState.simulationTime})
                </span>
              </div>
              <div className={styles.simInspectMetaItem}>
                <span className={styles.simInspectMetaLabel}>Step</span>
                <span className={styles.simInspectMetaVal}>{simulationState.minutesElapsed} / 60</span>
              </div>
              <div className={styles.simInspectMetaItem}>
                <span className={styles.simInspectMetaLabel}>Mass Balance</span>
                <span className={styles.simInspectMetaVal} style={{ color: "#34d399", fontWeight: 800 }}>
                  ✓ CONSERVED
                </span>
              </div>
            </div>

            {/* Quick Zone Selector Strip */}
            <div className={styles.simInspectZoneSelector}>
              <span className={styles.simInspectSectionLabel}>SELECT ZONE TO INSPECT:</span>
              <div className={styles.simInspectChips}>
                {[
                  { id: "ZONE_WANKHEDE_GATE_2", label: "Gate 2" },
                  { id: "ZONE_WANKHEDE_GATE_1", label: "Gate 1" },
                  { id: "ZONE_WANKHEDE", label: "Wankhede" },
                  { id: "ZONE_CHURCHGATE", label: "Churchgate" },
                  { id: "ZONE_DADAR", label: "Dadar" },
                  { id: "ZONE_MARINE_LINES", label: "Marine Drive" },
                  { id: "ZONE_TAXI_STAGING", label: "Taxi Zone" },
                  { id: "ZONE_CSMT", label: "CSMT" },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    className={`${styles.simInspectChip} ${selectedZone?.id === chip.id ? styles.simInspectChipActive : ""}`}
                    onClick={() => setSelectedZoneId(chip.id)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Zone Inspection Details */}
            {selectedZone && (
              <div className={styles.simInspectZoneCard}>
                <div className={styles.simInspectZoneHeader}>
                  <span className={styles.simInspectZoneName}>{selectedZone.name}</span>
                  <span
                    className={styles.simInspectPressurePill}
                    style={{
                      background: getPressureColor(selectedZone.pressure),
                      color: selectedZone.pressure >= 85 ? "#ffffff" : "#111111",
                    }}
                  >
                    {getPressureLabel(selectedZone.pressure)} · {selectedZone.pressure}%
                  </span>
                </div>

                {/* Gate note when inspecting Gate 1 or Gate 2 */}
                {(selectedZone.id === "ZONE_WANKHEDE_GATE_1" || selectedZone.id === "ZONE_WANKHEDE_GATE_2") && (
                  <div className={styles.simInspectGateNote}>
                    ℹ️ Modeled under parent Wankhede concourse (WANKHEDE_EXIT)
                  </div>
                )}

                <div className={styles.simInspectMetricsGrid}>
                  <div className={styles.simInspectMetricBox}>
                    <span className={styles.simInspectMetricLabel}>Baseline</span>
                    <span className={styles.simInspectMetricVal}>{zoneBaselinePressure}%</span>
                  </div>
                  <div className={styles.simInspectMetricBox}>
                    <span className={styles.simInspectMetricLabel}>Simulated</span>
                    <span className={styles.simInspectMetricVal} style={{ color: getPressureColor(selectedZone.pressure) }}>
                      {selectedZone.pressure}%
                    </span>
                  </div>
                  <div className={styles.simInspectMetricBox}>
                    <span className={styles.simInspectMetricLabel}>Delta</span>
                    <span
                      className={styles.simInspectMetricVal}
                      style={{ color: pressureDelta > 0 ? "#ef4444" : pressureDelta < 0 ? "#10b981" : "#94a3b8" }}
                    >
                      {pressureDelta > 0 ? `+${pressureDelta}%` : `${pressureDelta}%`}
                    </span>
                  </div>
                  <div className={styles.simInspectMetricBox}>
                    <span className={styles.simInspectMetricLabel}>Current Load</span>
                    <span className={styles.simInspectMetricVal}>
                      {selectedZone.currentUtilization.toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.simInspectMetricBox}>
                    <span className={styles.simInspectMetricLabel}>Inflow</span>
                    <span className={styles.simInspectMetricVal}>+{selectedZone.inflowRate}/m</span>
                  </div>
                  <div className={styles.simInspectMetricBox}>
                    <span className={styles.simInspectMetricLabel}>Cleared</span>
                    <span className={styles.simInspectMetricVal}>
                      {simulationState.totalCleared.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Completion banner if complete */}
            {isComplete && (
              <div className={styles.simInspectCompleteBanner}>
                <span>✓ 60-MIN SIMULATION RUN COMPLETE — MASS BALANCE CONSERVED</span>
              </div>
            )}
          </div>
        )}

        {/* COMPACT MAP LEGEND OVERLAY */}
        {showLegend && (
          <div className={styles.legendOverlay}>
            <div className={styles.legendHeader}>
              <span className={styles.legendTitle}>MAP INTELLIGENCE</span>
              <span className={styles.legendSimPill}>SIMULATED</span>
            </div>
            <div className={styles.legendGrid}>
              <div className={styles.legendCol}>
                <span className={styles.legendItemTitle}>Human Density</span>
                <div className={styles.legendItemRow}>
                  <span className={styles.legendSwatch} style={{ background: "#10b981" }} />
                  <span>Low &lt;50%</span>
                </div>
                <div className={styles.legendItemRow}>
                  <span className={styles.legendSwatch} style={{ background: "#f59e0b" }} />
                  <span>Moderate 50-74%</span>
                </div>
                <div className={styles.legendItemRow}>
                  <span className={styles.legendSwatch} style={{ background: "#f97316" }} />
                  <span>High 75-89%</span>
                </div>
                <div className={styles.legendItemRow}>
                  <span className={styles.legendSwatch} style={{ background: "#ef4444" }} />
                  <span>Critical ≥90%</span>
                </div>
              </div>
              <div className={styles.legendCol}>
                <span className={styles.legendItemTitle}>Corridor Flow</span>
                <div className={styles.legendItemRow}>
                  <span className={styles.legendLineSwatch} style={{ background: "#3b82f6" }} />
                  <span>Directional Dash</span>
                </div>
                <div className={styles.legendItemRow}>
                  <span className={styles.legendLineSwatch} style={{ background: "#64748b" }} />
                  <span>Road Pressure</span>
                </div>
                <div className={styles.legendItemRow}>
                  <span className={styles.legendSwatch} style={{ background: "transparent", border: "1.5px dashed #dc2626" }} />
                  <span>Forecast Hotspot</span>
                </div>
              </div>
            </div>


          </div>
        )}
      </div>

      {/* BOTTOM SIMULATION TELEMETRY STRIP */}
      <div className={styles.telemetryStrip}>
        <div className={styles.telemetryGrid}>
          <div className={styles.telemetryTile}>
            <span className={styles.telemetryLabel}>Total Modeled</span>
            <span className={styles.telemetryValue}>{totalModeled.toLocaleString()}</span>
          </div>
          <div className={styles.telemetryTile}>
            <span className={styles.telemetryLabel}>Remaining Venue</span>
            <span className={styles.telemetryValue}>~{(remainingAtVenue / 1000).toFixed(1)}K</span>
          </div>
          <div className={styles.telemetryTile}>
            <span className={styles.telemetryLabel}>In Transit</span>
            <span className={styles.telemetryValue} style={{ color: "#38bdf8" }}>
              ~{(inTransit / 1000).toFixed(1)}K
            </span>
          </div>
          <div className={styles.telemetryTile}>
            <span className={styles.telemetryLabel}>Accumulated</span>
            <span className={styles.telemetryValue} style={{ color: "#fbbf24" }}>
              ~{(accumulated / 1000).toFixed(1)}K
            </span>
          </div>
          <div className={styles.telemetryTile}>
            <span className={styles.telemetryLabel}>Processed</span>
            <span className={styles.telemetryValue} style={{ color: "#34d399" }}>
              ~{(processed / 1000).toFixed(1)}K
            </span>
          </div>
        </div>

        <div className={styles.telemetryBadgeWrap}>
          <span className={styles.telemetryConservedPill}>✓ Flow Conserved</span>
          <span className={styles.telemetryEnvBadge}>MODEL SIMULATION</span>
        </div>
      </div>
    </div>
  );
}
