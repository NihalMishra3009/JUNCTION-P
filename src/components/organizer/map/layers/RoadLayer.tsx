"use client";
import React from "react";
import { Polyline, Tooltip, Popup } from "react-leaflet";
import { RoadEdge } from "@/types";
import { getPressureColor } from "@/components/ui/PressureIndicator";
import styles from "../../DestinationMap.module.css";

interface Props {
  roads: RoadEdge[];
}

export default function RoadLayer({ roads }: Props) {
  return (
    <>
      {roads.map(road => {
        const positions = road.geometry.map(g => [g.latitude, g.longitude] as [number, number]);
        const isCritical = road.congestion >= 90;
        const isHigh = road.congestion >= 75 && road.congestion < 90;
        const isModerate = road.congestion >= 50 && road.congestion < 75;
        const isNormal = road.congestion < 50;

        // Visual hierarchy styling
        const color = isCritical
          ? "#dc2626"
          : isHigh
          ? "#ea580c"
          : isModerate
          ? "#f59e0b"
          : "#64748b";

        const coreWeight = isCritical ? 6.5 : isHigh ? 5.5 : isModerate ? 4 : 2.5;
        const casingWeight = coreWeight + 4;
        const coreOpacity = isNormal ? 0.55 : 0.95;
        const casingOpacity = isNormal ? 1 : (isCritical ? 0.6 : isHigh ? 0.45 : 0.3);
        const casingColor = isNormal ? "rgba(255, 255, 255, 0.15)" : "#0f172a";

        return (
          <React.Fragment key={road.id}>
            {/* Outline / Casing for depth */}
            <Polyline
              positions={positions}
              pathOptions={{
                color: casingColor,
                weight: casingWeight,
                opacity: casingOpacity,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            {/* Core Congestion Line */}
            <Polyline
              positions={positions}
              pathOptions={{
                color,
                weight: coreWeight,
                opacity: coreOpacity,
                dashArray: road.status === "DISRUPTED" ? "8, 6" : undefined,
                lineCap: "round",
                lineJoin: "round",
              }}
            >
              <Tooltip sticky>
                <div style={{ fontSize: 11, fontFamily: "Inter", fontWeight: 600, minWidth: 160 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <span style={{ color, textTransform: "uppercase", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em" }}>
                      ROAD CONGESTION · {road.status}
                    </span>
                    <span style={{ fontSize: 8, background: "#111", color: "#fbbf24", padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>
                      SIMULATED
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "var(--ink)" }}>{road.name}</div>
                  <div style={{ color, marginTop: 2, fontSize: 11 }}>
                    Congestion Load: {road.congestion}%
                  </div>
                  <div style={{ marginTop: 2, color: "var(--ink-light)", fontSize: 10 }}>
                    Estimated Corridor Time: ~{road.travelTimeMin} min
                  </div>
                </div>
              </Tooltip>
              <Popup className={styles.customPopup}>
                <div className={styles.popupContent}>
                  <div className={styles.popupHeader}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className={styles.popupType}>VEHICULAR ROAD CORRIDOR</span>
                      <span style={{ fontSize: 8, background: "#111", color: "#fbbf24", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>
                        SIMULATED
                      </span>
                    </div>
                    <h4 className={styles.popupTitle}>{road.name}</h4>
                  </div>
                  <div className={styles.popupBody}>
                    <div className={styles.popupRow}>
                      <span>Simulated Congestion:</span>
                      <strong style={{ color }}>{road.congestion}% ({road.status})</strong>
                    </div>
                    <div className={styles.popupRow}>
                      <span>Estimated Travel Time:</span>
                      <strong>~{road.travelTimeMin} min</strong>
                    </div>
                    {road.distanceKm && (
                      <div className={styles.popupRow}>
                        <span>Length:</span>
                        <span>{road.distanceKm} km</span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Polyline>
          </React.Fragment>
        );
      })}
    </>
  );
}
