"use client";
import React from "react";
import { Polyline, CircleMarker, Tooltip } from "react-leaflet";
import { HumanCohort } from "@/types";
import { MVP_NETWORK_EDGES, interpolateEdgePosition } from "@/data/mockNetworkTopology";
import { getPressureColor } from "@/components/ui/PressureIndicator";

interface Props {
  edgeLoads?: Record<string, number>;
  humanCohorts?: HumanCohort[];
}

const DEST_NAMES: Record<string, string> = {
  CHURCHGATE: "Churchgate",
  TAXI_ZONE: "Taxi Zone",
  MARINE_LINES: "Marine Lines",
  CSMT: "CSMT",
  DADAR: "Dadar",
};

/**
 * HumanFlowLayer renders directional aggregate human flow along network corridors.
 * 
 * It eliminates individual cohort badges (e.g. 👥 2, 👥 3) and instead visualizes:
 * 1. Direction: animated polyline dash strokes moving towards destination nodes.
 * 2. Relative Volume: dynamic polyline weight and color mapped from edgeLoads.
 * 3. Moving Particles: subtle glowing directional pulse markers tracking cohort front.
 * 4. Aggregate Corridor Metrics: single concise tooltip per corridor indicating in-transit volume.
 */
export default function HumanFlowLayer({ edgeLoads = {}, humanCohorts = [] }: Props) {
  const activeCohorts = humanCohorts.filter(c => c.status === "MOVING");

  return (
    <>
      {/* 1. AGGREGATE DIRECTIONAL CORRIDOR FLOW POLYLINES */}
      {Object.values(MVP_NETWORK_EDGES).map(edge => {
        const volume = edgeLoads[edge.id] || 0;
        const positions = edge.geometry.map(g => [g.latitude, g.longitude] as [number, number]);
        const destName = DEST_NAMES[edge.toNodeId] || edge.toNodeId;

        // Pressure calculation for corridor flow: volume vs nominal pedestrian capacity
        const flowRatio = Math.min(1.0, volume / edge.capacity);
        const flowPressure = Math.min(99, Math.round(flowRatio * 100));
        const color = volume > 0 ? getPressureColor(flowPressure) : "#94a3b8";

        // Dynamic weight: scales with in-transit volume (3px baseline to 8px surge)
        const weight = volume > 0 ? Math.min(8, Math.max(3, Math.round((volume / edge.capacity) * 6) + 3)) : 2;
        const opacity = volume > 0 ? 0.85 : 0.25;

        return (
          <React.Fragment key={`corridor-flow-${edge.id}`}>
            {/* Background Corridor Trace */}
            <Polyline
              positions={positions}
              pathOptions={{
                color: "#0f172a",
                weight: weight + 3,
                opacity: volume > 0 ? 0.35 : 0.1,
                lineCap: "round",
                lineJoin: "round",
              }}
            />

            {/* Directional Flow Stream (Animated dashes flowing towards destination) */}
            <Polyline
              positions={positions}
              pathOptions={{
                color,
                weight,
                opacity,
                dashArray: volume > 0 ? "8, 6" : "4, 6",
                lineCap: "round",
                className: volume > 0 ? "leaflet-animated-flow-line" : undefined,
              }}
            >
              <Tooltip sticky>
                <div style={{ fontSize: 11, fontFamily: "Inter", fontWeight: 600, minWidth: 170 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ color, textTransform: "uppercase", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em" }}>
                      AGGREGATE HUMAN FLOW
                    </span>
                    <span style={{ fontSize: 8, background: "#111", color: "#fbbf24", padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>
                      SIMULATED
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "var(--ink)" }}>
                    Exit Gates → {destName}
                  </div>
                  <div style={{ marginTop: 3, color: "var(--ink-light)", fontSize: 11 }}>
                    In Transit: <strong style={{ color }}>~{volume.toLocaleString()}</strong> attendees
                  </div>
                  <div style={{ marginTop: 2, color: "var(--ink-faint)", fontSize: 10 }}>
                    Corridor Flow Load: {flowPressure}% · Length: {edge.lengthMeters}m
                  </div>
                </div>
              </Tooltip>
            </Polyline>
          </React.Fragment>
        );
      })}

      {/* 2. SUBTLE MOVING PARTICLES (Aggregated directional pulses without text clutter) */}
      {activeCohorts.map(cohort => {
        const currentEdgeId = cohort.path[cohort.currentSegmentIndex];
        const coord = interpolateEdgePosition(currentEdgeId, cohort.progress);
        const radius = cohort.volume >= 1000 ? 5 : cohort.volume >= 500 ? 4 : 3;

        return (
          <CircleMarker
            key={`pulse-${cohort.id}`}
            center={[coord.latitude, coord.longitude]}
            radius={radius}
            pathOptions={{
              color: "#ffffff",
              weight: 1.5,
              fillColor: "#2563eb",
              fillOpacity: 0.9,
              className: "leaflet-cohort-pulse",
            }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <div style={{ fontSize: 10, fontFamily: "Inter", fontWeight: 600 }}>
                <span style={{ color: "#2563eb", fontWeight: 700 }}>SIMULATED COHORT</span>
                <div>Progress: {Math.round(cohort.progress * 100)}%</div>
                <div>Volume: ~{cohort.volume.toLocaleString()} attendees</div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
