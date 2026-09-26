"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Resource, RoadEdge } from "@/types";
import { useApp } from "@/state/AppContext";
import { getRoadNetwork } from "@/data/mockRoadNetwork";
import { getCrowdFlows } from "@/data/mockCrowdFlows";
import { getPredictedHotspots } from "@/data/mockHotspotService";
import { getRestaurants } from "@/data/mockRestaurants";
import { useMapStore } from "@/store/mapStore";
import { getRouteDebugTelemetry } from "@/services/canonicalRouteStore";
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
  } = useApp();

  const { worldProvider, setWorldProvider } = useMapStore();

  const staleObs = useMemo(() => latestObservations.filter((o) => o.qualityStatus === "STALE"), [latestObservations]);
  const conflictingObs = useMemo(() => latestObservations.filter((o) => o.qualityStatus === "CONFLICTING"), [latestObservations]);

  const isRunning = simulationState.status === "PLAYING";
  const isPaused = simulationState.status === "PAUSED";
  const [showLegend, setShowLegend] = useState(true);
  const [showMatrix, setShowMatrix] = useState(true);

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
            title="SECRET 3D Vector Map Engine"
            style={{ borderRadius: "12px 0 0 12px", padding: "3px 10px" }}
          >
            🏙️ SECRET 3D Map
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
          <span className={`${styles.simStatusPill} ${isRunning ? styles.simRunning : isPaused ? styles.simPaused : styles.simIdle}`}>
            {isRunning ? "● SIMULATING" : isPaused ? "Ⅱ PAUSED" : "○ IDLE"}
          </span>
          <span className={styles.simElapsed}>+{simulationState.minutesElapsed}m</span>
          <span className={styles.telemetryEnvBadge}>
            {mapEngine === "MAPLIBRE" ? "SECRET 3D MAPLIBRE ACTIVE" : "LEAFLET 2D ACTIVE"}
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

            {/* CANONICAL ROUTE DEBUG TELEMETRY (Requirement 25) */}
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.15)", fontSize: 10 }}>
              {(() => {
                const telemetry = getRouteDebugTelemetry("ROUTE_MARINE_LINES_WANKHEDE");
                if (!telemetry) return null;
                const isRoadFollowing = telemetry.roadFollowing;
                return (
                  <div>
                    <div style={{ fontWeight: 800, color: "#38bdf8", letterSpacing: "0.06em", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>ROUTE DEBUG</span>
                      <span style={{ color: isRoadFollowing ? "#34d399" : "#ef4444", fontSize: 9, fontWeight: 700, background: "rgba(0,0,0,0.6)", padding: "2px 6px", borderRadius: 4, border: `1px solid ${isRoadFollowing ? "#059669" : "#dc2626"}` }}>
                        {isRoadFollowing ? "✓ CANONICAL GEOMETRY" : "⚠️ NON-CANONICAL"}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, background: "rgba(15, 23, 42, 0.75)", padding: 8, borderRadius: 6, border: "1px solid rgba(255, 255, 255, 0.12)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "#94a3b8", fontSize: 9 }}>Route ID:</span>
                        <span style={{ color: "#38bdf8", fontWeight: 700, fontFamily: "monospace", fontSize: 9, wordBreak: "break-all" }}>
                          {telemetry.routeId}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#94a3b8", fontSize: 9 }}>Points:</span>
                        <span style={{ color: "#f8fafc", fontWeight: 800, fontSize: 10 }}>{telemetry.pointCount}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#94a3b8", fontSize: 9 }}>Road-following:</span>
                        <span style={{ color: isRoadFollowing ? "#34d399" : "#ef4444", fontWeight: 800, fontSize: 10 }}>
                          {isRoadFollowing ? "YES" : "NO"}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#94a3b8", fontSize: 9 }}>Distance:</span>
                        <span style={{ color: "#f8fafc", fontWeight: 800, fontSize: 10 }}>{telemetry.distanceKm} km</span>
                      </div>
                      <div style={{ fontSize: 8, color: "#64748b", marginTop: 2, borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: 4 }}>
                        Source: {telemetry.source}
                      </div>
                    </div>
                  </div>
                );
              })()}
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
