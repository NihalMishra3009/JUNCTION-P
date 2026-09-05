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
        const color = h.severity === "CRITICAL" ? "#DC2626" : "#EA580C";

        return (
          <Circle
            key={h.id}
            center={[h.location.latitude, h.location.longitude]}
            radius={h.radiusMeters}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.18,
              weight: 2.5,
              dashArray: "6, 4",
              className: "leaflet-hotspot-ring",
            }}
          >
            <Tooltip sticky>
              <div style={{ fontSize: 11, fontFamily: "Inter", fontWeight: 600 }}>
                <span style={{ color, textTransform: "uppercase", fontSize: 9, fontWeight: 700, letterSpacing: "0.05em" }}>
                  ⚠️ PREDICTED BOTTLENECK HOTSPOT
                </span>
                <div style={{ fontWeight: 700, marginTop: 1, fontSize: 12 }}>{h.name}</div>
                <div style={{ marginTop: 2, color: "var(--ink-light)" }}>
                  Current: {h.currentPressure}% → Projected: {h.predictedPressure}%
                </div>
                <div style={{ color, fontWeight: 700, marginTop: 2 }}>
                  Threshold Breach: {h.projectedTimeframe}
                </div>
              </div>
            </Tooltip>
          </Circle>
        );
      })}
    </>
  );
}
