"use client";
import React from "react";
import { Circle, Tooltip } from "react-leaflet";
import { DensityCell } from "@/types";
import { getPressureColor } from "@/components/ui/PressureIndicator";

interface Props {
  densityCells?: DensityCell[];
}

/**
 * HumanDensityLayer renders a genuinely continuous-looking spatial density field
 * derived strictly from simulationState.densityCells.
 *
 * For each cell, concentric feathered radial rings with calibrated opacity falloffs
 * overlap and blend across neighboring network nodes to form a smooth heatmap field
 * without completely obscuring the base map street layout.
 */
export default function HumanDensityLayer({ densityCells }: Props) {
  if (!densityCells || densityCells.length === 0) return null;

  return (
    <>
      {densityCells.map(cell => {
        const color = getPressureColor(cell.pressure);
        const lat = cell.location.latitude;
        const lng = cell.location.longitude;
        const baseRadius = cell.radiusMeters;

        // Density level semantics
        const densityLevel =
          cell.pressure >= 90
            ? "CRITICAL"
            : cell.pressure >= 75
            ? "HIGH"
            : cell.pressure >= 50
            ? "MODERATE"
            : "LOW";

        // Multi-ring feathered falloffs (outer diffuse halo, mid transition, dense core)
        const outerRadius = Math.round(baseRadius * 1.55);
        const midRadius = Math.round(baseRadius * 1.1);
        const coreRadius = Math.round(baseRadius * 0.65);

        // Opacity scales with cell density (people per m²) and pressure
        const intensityFactor = Math.min(1.0, Math.max(0.3, cell.pressure / 100));
        const outerOpacity = Number((0.08 * intensityFactor).toFixed(3));
        const midOpacity = Number((0.18 * intensityFactor).toFixed(3));
        const coreOpacity = Number((0.38 * intensityFactor).toFixed(3));

        return (
          <React.Fragment key={`density-cell-${cell.id}`}>
            {/* 1. Outer Diffuse Halo (Continuous Spatial Blend) */}
            <Circle
              center={[lat, lng]}
              radius={outerRadius}
              pathOptions={{
                color: "transparent",
                fillColor: color,
                fillOpacity: outerOpacity,
                interactive: false,
                className: "leaflet-heat-outer",
              }}
            />

            {/* 2. Mid Heat Gradient Ring */}
            <Circle
              center={[lat, lng]}
              radius={midRadius}
              pathOptions={{
                color: "transparent",
                fillColor: color,
                fillOpacity: midOpacity,
                interactive: false,
                className: "leaflet-heat-mid",
              }}
            />

            {/* 3. Core Density Accumulation Zone (Interactive with exact telemetry) */}
            <Circle
              center={[lat, lng]}
              radius={coreRadius}
              pathOptions={{
                color,
                weight: cell.pressure >= 85 ? 1.5 : 1,
                opacity: 0.6,
                fillColor: color,
                fillOpacity: coreOpacity,
                dashArray: cell.pressure >= 85 ? "4, 4" : undefined,
                className: cell.pressure >= 85 ? "leaflet-pulsing-halo" : undefined,
              }}
            >
              <Tooltip sticky>
                <div style={{ fontSize: 11, fontFamily: "Inter", fontWeight: 600, minWidth: 160 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ color, textTransform: "uppercase", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em" }}>
                      HUMAN DENSITY · {densityLevel}
                    </span>
                    <span style={{ fontSize: 8, background: "#111", color: "#fbbf24", padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>
                      SIMULATED
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "var(--ink)" }}>
                    Pressure: {cell.pressure}% · Core Radius: {coreRadius}m
                  </div>
                  <div style={{ marginTop: 2, color: "var(--ink-light)", fontSize: 10 }}>
                    Field Extent: ~{outerRadius}m · Density: {cell.density} p/m²
                  </div>
                  <div style={{ marginTop: 2, color: "var(--ink-faint)", fontSize: 9 }}>
                    Zone Capacity: {cell.capacity.toLocaleString()} attendees
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
