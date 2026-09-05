"use client";
import React from "react";
import { Circle, Polyline, Tooltip } from "react-leaflet";
import { Resource, CrowdFlow } from "@/types";
import { getPressureColor } from "@/components/ui/PressureIndicator";

interface Props {
  resources: Resource[];
  flows: CrowdFlow[];
}

export default function CrowdPressureLayer({ resources, flows }: Props) {
  // Elevated pressure nodes (Watch, High, Critical)
  const elevatedResources = resources.filter(r => r.location && r.pressure >= 70);

  return (
    <>
      {/* Dynamic Pressure Halos */}
      {elevatedResources.map(r => {
        const color = getPressureColor(r.pressure);
        const radius = r.pressure >= 95 ? 280 : r.pressure >= 85 ? 220 : 160;

        return (
          <Circle
            key={`halo-${r.id}`}
            center={[r.location.latitude, r.location.longitude]}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.22,
              weight: 2,
              dashArray: "4, 4",
              className: "leaflet-pulsing-halo",
            }}
          />
        );
      })}

      {/* Data-Driven Crowd Flows */}
      {flows.map(flow => {
        const positions: [number, number][] = [
          [flow.fromCoord.latitude, flow.fromCoord.longitude],
          [flow.toCoord.latitude, flow.toCoord.longitude],
        ];
        const color = getPressureColor(flow.pressure);
        const weight = Math.min(7, Math.max(3, Math.round(flow.volume / 2500)));

        return (
          <Polyline
            key={flow.id}
            positions={positions}
            pathOptions={{
              color,
              weight,
              opacity: 0.85,
              dashArray: "6, 6",
              lineCap: "round",
            }}
          >
            <Tooltip sticky>
              <div style={{ fontSize: 11, fontFamily: "Inter", fontWeight: 600 }}>
                <div>
                  <span style={{ color: "var(--ink-faint)", textTransform: "uppercase", fontSize: 9 }}>
                    {flow.direction === "OUTBOUND" ? "↗ DISPERSAL FLOW" : "↘ INFLOW CONVERGENCE"}
                  </span>
                </div>
                <div style={{ fontWeight: 700, marginTop: 1 }}>{flow.corridorName}</div>
                <div style={{ color, marginTop: 2 }}>
                  ~{flow.volume.toLocaleString()} spectators · Pressure: {flow.pressure}%
                </div>
              </div>
            </Tooltip>
          </Polyline>
        );
      })}
    </>
  );
}
