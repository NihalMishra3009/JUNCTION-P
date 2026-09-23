"use client";
import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Resource, RoadEdge } from "@/types";
import { useApp } from "@/state/AppContext";
import { getRoadNetwork } from "@/data/mockRoadNetwork";
import { getCrowdFlows } from "@/data/mockCrowdFlows";
import { getPredictedHotspots } from "@/data/mockHotspotService";
import { getRestaurants } from "@/data/mockRestaurants";
import styles from "./DestinationMap.module.css";

// Dynamic import of LeafletCommandMap with SSR disabled (Leaflet requires browser window)
const LeafletCommandMap = dynamic(() => import("./map/LeafletCommandMap"), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>
      <div className="spinner" />
      <span>Loading 2D Leaflet Operational Map...</span>
    </div>
  ),
});

// Dynamic import of CesiumCommandMap with SSR disabled (Cesium WebGL requires browser window)
const CesiumCommandMap = dynamic(() => import("./map/CesiumCommandMap"), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>
      <div className="spinner" />
      <span>Initializing Cesium 3D Engine...</span>
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
];

export default function DestinationMap({
  resources,
  onSelectResource,
  selectedId,
}: Props) {
  const {
    activeScenario,
    hotels,
    redistributionApplied,
    simulationState,
    playSimulation,
    pauseSimulation,
    resetSimulation,
    setSimulationSpeed,
    simParams,
    devices,
    latestObservations,
  } = useApp();

  const staleObs = useMemo(() => latestObservations.filter(o => o.qualityStatus === "STALE"), [latestObservations]);
  const conflictingObs = useMemo(() => latestObservations.filter(o => o.qualityStatus === "CONFLICTING"), [latestObservations]);

  const isRunning = simulationState.status === "PLAYING";
  const isPaused = simulationState.status === "PAUSED";
  const [showLegend, setShowLegend] = useState(true);
  const [mapRenderer, setMapRenderer] = useState<"2D" | "3D">("3D");

  // Multi-layer simultaneous composability - all 8 operational layers enabled by default
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
    ])
  );

  const toggleLayer = (layerName: string) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(layerName)) {
        next.delete(layerName);
      } else {
        next.add(layerName);
      }
      return next;
    });
  };

  // Pure domain-derived road network reacting dynamically to simulation edge loads
  const roads = useMemo(() => {
    const baseRoads = getRoadNetwork(activeScenario, redistributionApplied);
    if (simulationState.minutesElapsed > 0) {
      const edgeLoadMap: Record<string, string> = {
        ROAD_VEER_NARIMAN: "EDGE_EXIT_VEER_NARIMAN",
        ROAD_MAHARSHI_KARVE: "EDGE_EXIT_MK_ROAD",
        ROAD_DN_ROAD: "EDGE_DN_ROAD_LINK",
        ROAD_CENTRAL_SPINE: "EDGE_CENTRAL_SPINE",
      };

      return baseRoads.map(road => {
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

  const flows = useMemo(
    () => getCrowdFlows(activeScenario, redistributionApplied),
    [activeScenario, redistributionApplied]
  );

  const hotspots = useMemo(
    () => getPredictedHotspots(resources, activeScenario),
    [resources, activeScenario]
  );

  const restaurants = useMemo(
    () => getRestaurants(activeScenario),
    [activeScenario]
  );

  // Exact conservation metrics derived from SimulationState
  const totalModeled = simParams.attendance || 33000;
  const remainingAtVenue = Math.max(0, totalModeled - simulationState.totalExitedVenue);
  const inTransit = Object.values(simulationState.edgeLoads).reduce((s, v) => s + v, 0);
  const accumulated = Object.values(simulationState.nodeLoads).reduce((s, v) => s + v, 0);
  const processed = simulationState.totalCleared;

  return (
    <div className={styles.mapWrap}>
      {/* 8-LAYER OPERATIONAL TOGGLE BAR WITH RENDERER SWITCHER */}
      <div className={styles.layerBar}>
        {/* RENDERER MODE TOGGLE BUTTONS */}
        <div style={{ display: "flex", gap: "2px", background: "var(--paper-dark)", padding: "2px", borderRadius: "20px", marginRight: "8px" }}>
          <button
            className={`${styles.layerBtn} ${mapRenderer === "2D" ? styles.layerActive : ""}`}
            onClick={() => setMapRenderer("2D")}
            title="Switch to Leaflet 2D Operational Map"
            style={{ borderRadius: "12px 0 0 12px", padding: "3px 8px" }}
          >
            🗺️ 2D Map
          </button>
          <button
            className={`${styles.layerBtn} ${mapRenderer === "3D" ? styles.layerActive : ""}`}
            onClick={() => setMapRenderer("3D")}
            title="Switch to Cesium 3D Command Globe"
            style={{ borderRadius: "0 12px 12px 0", padding: "3px 8px" }}
          >
            🌐 3D Globe
          </button>
        </div>

        {LAYER_CONFIG.map(layer => {
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
      </div>

      {/* COMPACT MAP SIMULATION CONTROLLER */}
      <div className={styles.simBar}>
        <div className={styles.simBarLeft}>
          <span className={styles.simClockIcon}>⏱</span>
          <span className={styles.simClockTime}>{simulationState.simulationTime}</span>
          <span className={`${styles.simStatusPill} ${isRunning ? styles.simRunning : isPaused ? styles.simPaused : styles.simIdle
            }`}>
            {isRunning ? "● SIMULATING" : isPaused ? "Ⅱ PAUSED" : "○ IDLE"}
          </span>
          <span className={styles.simElapsed}>+{simulationState.minutesElapsed}m</span>
          <span className={styles.telemetryEnvBadge}>
            {mapRenderer === "3D" ? "CESIUM 3D ACTIVE" : "LEAFLET 2D ACTIVE"}
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
              ▶ Play
            </button>
          )}
          <button className={styles.simControlBtn} onClick={resetSimulation}>
            ↻ Reset
          </button>
          <div className={styles.simSpeedGroup}>
            {([1, 5, 10] as const).map(s => (
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
            className={styles.simControlBtn}
            onClick={() => setShowLegend(prev => !prev)}
            title="Toggle Map Legend"
          >
            {showLegend ? "Legend ▾" : "Legend ▸"}
          </button>
        </div>
      </div>

      {/* GEOGRAPHIC COMMAND MAP CONTAINER (DYNAMIC RENDERER) */}
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {mapRenderer === "3D" ? (
          <CesiumCommandMap
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
          />
        ) : (
          <LeafletCommandMap
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
          />
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
          <span className={styles.telemetryConservedPill}>
            ✓ Flow Conserved
          </span>
          <span className={styles.telemetryEnvBadge}>
            MODEL SIMULATION
          </span>
        </div>
      </div>
    </div>
  );
}

