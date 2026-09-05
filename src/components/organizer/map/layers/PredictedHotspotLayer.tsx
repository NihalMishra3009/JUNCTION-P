"use client";
import React from "react";
import { Circle, Tooltip } from "react-leaflet";
import { PredictedHotspot } from "@/types";

interface Props {
  hotspots: PredictedHotspot[];
}

export default function PredictedHotspotLayer({ hotspots }: Props) {
  return (
    <>
      {hotspots.map(h => {
        const color = h.severity === "CRITICAL" ? "#dc2626" : "#f97316";

        return (
          <React.Fragment key={h.id}>
            {/* Outer Caution Border (Distinct from continuous density) */}
            <Circle
              center={[h.location.latitude, h.location.longitude]}
              radius={h.radiusMeters + 35}
              pathOptions={{
                color,
                fillColor: "transparent",
                weight: 1.5,
                dashArray: "4, 6",
                opacity: 0.7,
                interactive: false,
              }}
            />
            {/* Inner Forecast Hazard Zone */}
            <Circle
              center={[h.location.latitude, h.location.longitude]}
              radius={h.radiusMeters}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.12,
                weight: 2.5,
                dashArray: "8, 5",
                className: "leaflet-hotspot-ring",
              }}
            >
              <Tooltip sticky>
                <div style={{ fontSize: 11, fontFamily: "Inter", fontWeight: 600, minWidth: 170 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ color, textTransform: "uppercase", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em" }}>
                      ⚠️ PREDICTED HOTSPOT
                    </span>
                    <span style={{ fontSize: 8, background: "#dc2626", color: "#ffffff", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>
                      SIMULATED FORECAST
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, marginTop: 1, fontSize: 12, color: "var(--ink)" }}>{h.name}</div>
                  <div style={{ marginTop: 2, color: "var(--ink-light)", fontSize: 11 }}>
                    Current: {h.currentPressure}% → <strong style={{ color }}>Projected: {h.predictedPressure}%</strong>
                  </div>
                  <div style={{ color, fontWeight: 700, marginTop: 2, fontSize: 10 }}>
                    Projected Breach: {h.projectedTimeframe}
                  </div>
                </div>
              </Tooltip>
            </Circle>
          </React.Fragment>
        );
      })}
    </>
  );
}
