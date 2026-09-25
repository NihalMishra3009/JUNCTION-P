"use client";

import React from "react";
import { ZoneState } from "@/types";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import { ZONE_CAPACITY_PROFILES } from "@/services/sensorFusionEngine";

interface ZoneDrawerProps {
  isOpen: boolean;
  zone: ZoneState | null;
  onClose: () => void;
}

export default function ZoneDrawer({ isOpen, zone, onClose }: ZoneDrawerProps) {
  if (!isOpen || !zone) return null;

  const profile = ZONE_CAPACITY_PROFILES[zone.id] || {
    basis: "CONCOURSE_EGRESS",
    operationalCapacity: zone.totalCapacity || 5000,
    safetyBufferPercent: 7,
    assumptions: "Default fallback operational throughput capacity.",
  };

  const getStatusBg = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "var(--red-bg)";
      case "HIGH":
        return "var(--orange-bg)";
      case "WATCH":
        return "var(--yellow-state-bg)";
      default:
        return "var(--green-bg)";
    }
  };

  const getStatusColor = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "var(--red)";
      case "HIGH":
        return "var(--orange)";
      case "WATCH":
        return "var(--yellow-state)";
      default:
        return "var(--green)";
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(17, 17, 17, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 1100,
        display: "flex",
        justifyContent: "flex-end",
        animation: "fadeIn 150ms ease both",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "480px",
          maxWidth: "100%",
          height: "100%",
          backgroundColor: "var(--white)",
          boxShadow: "var(--shadow-panel)",
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 200ms ease both",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: "24px",
            backgroundColor: "var(--ink)",
            color: "var(--white)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--yellow)",
              }}
            >
              ZONE INTELLIGENCE & SENSOR FUSION
            </span>
            <button
              onClick={onClose}
              style={{
                color: "var(--white)",
                fontSize: "18px",
                fontWeight: 700,
                lineHeight: 1,
                padding: "4px 8px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              title="Close drawer"
            >
              ✕
            </button>
          </div>

          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "22px",
              fontWeight: 700,
              color: "var(--white)",
              lineHeight: 1.2,
            }}
          >
            {zone.name}
          </h2>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
            <span
              className="pill"
              style={{
                backgroundColor: getStatusBg(zone.pressureLevel),
                color: getStatusColor(zone.pressureLevel),
                fontSize: "10px",
              }}
            >
              {zone.pressureLevel} ({zone.pressure}%)
            </span>
            <span className="pill pill-simulated" style={{ fontSize: "10px" }}>
              {zone.tier.replace(/_/g, " ")}
            </span>
            <ConfidenceBadge source={zone.source} />
          </div>
        </div>

        {/* Drawer Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
          {/* Key Metric Gauges */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "10px",
              backgroundColor: "var(--paper)",
              padding: "16px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--neutral)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span className="text-meta">Current Pressure</span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "26px",
                  fontWeight: 700,
                  color: getStatusColor(zone.pressureLevel),
                }}
              >
                {zone.pressure}%
              </span>
              <span style={{ fontSize: "10px", color: "var(--ink-muted)" }}>
                {zone.trend === "INCREASING" ? "↑ Accelerating" : zone.trend === "DECREASING" ? "↓ Dissipating" : "→ Stable"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span className="text-meta">+15m Forecast</span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "26px",
                  fontWeight: 700,
                  color: getStatusColor(zone.predictedPressure15 >= 85 ? "CRITICAL" : zone.predictedPressure15 >= 75 ? "HIGH" : "NORMAL"),
                }}
              >
                {zone.predictedPressure15}%
              </span>
              <span style={{ fontSize: "10px", color: "var(--ink-muted)" }}>Short Horizon</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span className="text-meta">+30m Forecast</span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "26px",
                  fontWeight: 700,
                  color: getStatusColor(zone.predictedPressure30 >= 85 ? "CRITICAL" : zone.predictedPressure30 >= 75 ? "HIGH" : "NORMAL"),
                }}
              >
                {zone.predictedPressure30}%
              </span>
              <span style={{ fontSize: "10px", color: "var(--ink-muted)" }}>Extended Horizon</span>
            </div>
          </div>

          {/* Section: Operational Capacity Basis */}
          <div>
            <span className="text-meta" style={{ display: "block", marginBottom: "6px" }}>
              Operational Capacity Basis Model
            </span>
            <div
              style={{
                padding: "14px 16px",
                backgroundColor: "var(--paper)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--neutral)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>
                  Basis: {profile.basis.replace(/_/g, " ")}
                </span>
                <span className="pill pill-yellow" style={{ fontSize: "10px" }}>
                  Cap: {profile.operationalCapacity.toLocaleString()} persons
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--ink-muted)", margin: 0, lineHeight: 1.4 }}>
                {profile.assumptions}
              </p>
              <div style={{ fontSize: "11px", color: "var(--ink-faint)", marginTop: "4px" }}>
                Safety buffer margin: <strong>{profile.safetyBufferPercent}%</strong>
              </div>
            </div>
          </div>

          {/* Section: Flow Rates & Occupancy */}
          <div>
            <span className="text-meta" style={{ display: "block", marginBottom: "8px" }}>
              Real-Time Flow Dynamics & Occupancy
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <div
                style={{
                  padding: "12px",
                  backgroundColor: "var(--paper)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--neutral)",
                }}
              >
                <span style={{ fontSize: "10px", color: "var(--ink-muted)", textTransform: "uppercase" }}>
                  Inflow Rate
                </span>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--green)", marginTop: "2px" }}>
                  +{zone.inflowRate} / min
                </div>
              </div>

              <div
                style={{
                  padding: "12px",
                  backgroundColor: "var(--paper)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--neutral)",
                }}
              >
                <span style={{ fontSize: "10px", color: "var(--ink-muted)", textTransform: "uppercase" }}>
                  Outflow Rate
                </span>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--orange)", marginTop: "2px" }}>
                  -{zone.outflowRate} / min
                </div>
              </div>
            </div>

            <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--ink-muted)" }}>
              Net Flow Gradient: <strong>{zone.netFlow >= 0 ? `+${zone.netFlow}` : zone.netFlow} persons / min</strong>
            </div>
          </div>

          {/* Section: Active Member Bottlenecks */}
          {zone.activeBottlenecks && zone.activeBottlenecks.length > 0 && (
            <div>
              <span className="text-meta" style={{ display: "block", marginBottom: "6px" }}>
                Active Member Bottlenecks
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {zone.activeBottlenecks.map((b, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "var(--red-bg)",
                      borderLeft: "3px solid var(--red)",
                      borderRadius: "var(--radius-xs)",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--red)",
                    }}
                  >
                    ⚠ {b}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Multi-Sensor Fusion Weights */}
          <div>
            <span className="text-meta" style={{ display: "block", marginBottom: "6px" }}>
              Multi-Source Telemetry Weighting
            </span>
            <div
              style={{
                padding: "12px 14px",
                backgroundColor: "var(--paper-dark)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                fontSize: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Computer Vision (YOLOv12 Head Centroids):</span>
                <strong>60% Weight</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Wi-Fi & BLE Beacon Signals:</span>
                <strong>25% Weight</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>GTFS-Realtime Transit Feed:</span>
                <strong>15% Weight</strong>
              </div>
              <div style={{ borderTop: "1px solid var(--neutral-dark)", paddingTop: "6px", marginTop: "2px", display: "flex", justifyContent: "space-between" }}>
                <span>Fused Model Confidence:</span>
                <strong style={{ color: "var(--green)" }}>{Math.round(zone.confidence * 100)}%</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
