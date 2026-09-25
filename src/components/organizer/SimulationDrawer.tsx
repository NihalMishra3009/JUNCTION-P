"use client";

import React from "react";
import { useApp } from "@/state/AppContext";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";

interface SimulationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SimulationDrawer({ isOpen, onClose }: SimulationDrawerProps) {
  const {
    simulationState,
    playSimulation,
    pauseSimulation,
    resetSimulation,
    setSimulationSpeed,
    simParams,
    updateSimParams,
    activeScenario,
  } = useApp();

  if (!isOpen) return null;

  const isRunning = simulationState.status === "PLAYING";

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
              WHAT-IF DESTINATION SIMULATION
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
            Time-Stepped Scenario Testing
          </h2>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
            <span className="pill pill-yellow" style={{ fontSize: "10px" }}>
              Clock: {simulationState.simulationTime} (+{simulationState.minutesElapsed}m)
            </span>
            <ConfidenceBadge source="SIMULATED" />
          </div>
        </div>

        {/* Drawer Controls Bar */}
        <div
          style={{
            padding: "14px 20px",
            backgroundColor: "var(--paper-dark)",
            borderBottom: "1px solid var(--neutral)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            {isRunning ? (
              <button className="btn btn-outline btn-sm" onClick={pauseSimulation}>
                Ⅱ PAUSE
              </button>
            ) : (
              <button className="btn btn-yellow btn-sm" onClick={playSimulation}>
                ▶ PLAY
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={resetSimulation}>
              ↻ RESET
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: "var(--ink-muted)", fontWeight: 600 }}>Speed:</span>
            {([1, 5, 10] as const).map((s) => (
              <button
                key={s}
                className={`btn btn-sm ${simulationState.speed === s ? "btn-yellow" : "btn-ghost"}`}
                style={{ padding: "3px 8px", fontSize: "10px" }}
                onClick={() => setSimulationSpeed(s)}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* Drawer Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
          {/* Section: Parameter Sliders */}
          <div>
            <span className="text-meta" style={{ display: "block", marginBottom: "12px" }}>
              Configure Operational Parameters
            </span>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: "4px" }}>
                  Attendance: {simParams.attendance.toLocaleString()}
                </label>
                <input
                  type="range"
                  min={20000}
                  max={45000}
                  step={1000}
                  value={simParams.attendance}
                  onChange={(e) => updateSimParams({ attendance: Number(e.target.value) })}
                  style={{ width: "100%", accentColor: "var(--yellow)" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
                  Additional Reserve Buses
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {([0, 10, 20] as const).map((v) => (
                    <button
                      key={v}
                      className={`btn btn-sm ${simParams.additionalBuses === v ? "btn-yellow" : "btn-outline"}`}
                      style={{ flex: 1 }}
                      onClick={() => updateSimParams({ additionalBuses: v })}
                    >
                      {v === 0 ? "None" : `+${v} Buses`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
                  Weather Condition
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["NORMAL", "HEAVY_RAIN"] as const).map((v) => (
                    <button
                      key={v}
                      className={`btn btn-sm ${simParams.weather === v ? "btn-yellow" : "btn-outline"}`}
                      style={{ flex: 1 }}
                      onClick={() => updateSimParams({ weather: v })}
                    >
                      {v === "NORMAL" ? "Clear Weather" : "Heavy Rain"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", display: "block", marginBottom: "6px" }}>
                  Western Rail Signal Disruption
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[false, true].map((v) => (
                    <button
                      key={String(v)}
                      className={`btn btn-sm ${simParams.transportDisruption === v ? "btn-yellow" : "btn-outline"}`}
                      style={{ flex: 1 }}
                      onClick={() => updateSimParams({ transportDisruption: v })}
                    >
                      {v ? "Disrupted (Signal Fault)" : "Normal Operations"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Live Simulation Telemetry Summary */}
          <div>
            <span className="text-meta" style={{ display: "block", marginBottom: "8px" }}>
              Live Cohort Flow Telemetry
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                backgroundColor: "var(--paper)",
                padding: "14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--neutral)",
              }}
            >
              <div>
                <span style={{ fontSize: "10px", color: "var(--ink-muted)", textTransform: "uppercase" }}>Total Exited Venue</span>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink)" }}>
                  {simulationState.totalExitedVenue.toLocaleString()}
                </div>
              </div>

              <div>
                <span style={{ fontSize: "10px", color: "var(--ink-muted)", textTransform: "uppercase" }}>In-Transit Cohorts</span>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink)" }}>
                  {Object.values(simulationState.edgeLoads).reduce((a, b) => a + b, 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
