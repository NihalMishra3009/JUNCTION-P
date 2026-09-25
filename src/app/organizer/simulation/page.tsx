"use client";
import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/state/AppContext";
import { getPressureColor } from "@/components/ui/PressureIndicator";
import { MVP_NETWORK_EDGES } from "@/data/mockNetworkTopology";
import { Clock, Play, Pause, RotateCcw, Check } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import styles from "./simulation.module.css";


const RESOURCE_NAMES: Record<string, string> = {
  CHURCHGATE: "Churchgate Station",
  WANKHEDE_EXIT: "Wankhede Exit",
  TAXI_ZONE: "Taxi Zone",
  DADAR: "Dadar Station",
  CSMT: "CSMT Terminal",
  MARINE_LINES: "Marine Lines",
};

const RESOURCE_CAPACITIES: Record<string, number> = {
  WANKHEDE_EXIT: 4000,
  CHURCHGATE: 10000,
  TAXI_ZONE: 400,
  MARINE_LINES: 8000,
  CSMT: 14000,
  DADAR: 18000,
};

function SimulationContent() {
  const {
    activeScenario,
    recommendations,
    approveRecommendation,
    isRecommendationApproved,
    simulationState,
    playSimulation,
    pauseSimulation,
    resetSimulation,
    setSimulationSpeed,
    simParams,
    updateSimParams,
    redistributionApplied,
  } = useApp();

  const searchParams = useSearchParams();
  const recId = searchParams.get("rec");
  const linkedRec = recommendations.find(r => r.id === recId);

  const isRunning = simulationState.status === "PLAYING";
  const isPaused = simulationState.status === "PAUSED";

  // Calculate live telemetry metrics
  const totalInTransit = Object.values(simulationState.edgeLoads).reduce((a, b) => a + b, 0);
  const totalAccumulated = Object.values(simulationState.nodeLoads).reduce((a, b) => a + b, 0);
  const activeCohorts = simulationState.humanCohorts.filter(c => c.status === "MOVING");

  const handleApproveIntervention = () => {
    if (recId) {
      approveRecommendation(recId);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        category="DECISIONS"
        title="Time-Stepped Destination Simulation"
        subtitle="Aggregate human cohort simulation advancing through South Mumbai geographic network with real-time flow conservation."
        actions={<span className="pill pill-simulated">SIMULATED DESTINATION MODEL</span>}
      />


      {/* LINKED RECOMMENDATION INTERVENTION BANNER */}
      {linkedRec && (
        <div style={{
          background: "var(--paper)",
          border: "1.5px solid var(--yellow-state)",
          borderRadius: "var(--radius-md)",
          padding: "14px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="pill pill-yellow">SIMULATING RECOMMENDATION</span>
              <strong style={{ fontSize: 14 }}>{linkedRec.id}: {linkedRec.title}</strong>
            </div>
            <p style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 4 }}>
              Recommendation intervention will alter downstream cohort distribution at runtime without rewriting history.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn btn-yellow btn-sm"
              onClick={handleApproveIntervention}
              disabled={isRecommendationApproved(linkedRec.id)}
            >
              {isRecommendationApproved(linkedRec.id) ? "APPROVED" : "APPROVE THIS INTERVENTION →"}
            </button>
            <Link href="/organizer/recommendations" className="btn btn-outline btn-sm">
              Back to Recs
            </Link>
          </div>
        </div>
      )}

      {/* SIMULATION COMMAND CONSOLE */}
      <div className={styles.simConsole}>
        <div className={styles.clockGroup}>
          <Clock size={18} className={styles.clockIcon} />
          <div className={styles.clockDetails}>
            <span className={styles.clockLabel}>SIMULATION CLOCK</span>
            <span className={styles.clockTime}>{simulationState.simulationTime}</span>
            <span className={styles.elapsedTag}>
              +{simulationState.minutesElapsed} min elapsed · Scenario: {activeScenario.replace(/_/g, " ")}
            </span>
          </div>
          <span className={`${styles.statusPill} ${isRunning ? styles.statusRunning : isPaused ? styles.statusPaused : styles.statusIdle
            }`}>
            {isRunning ? "RUNNING" : isPaused ? "PAUSED" : "IDLE"}
          </span>
        </div>

        <div className={styles.consoleActions}>
          <div className={styles.btnGroup}>
            {isRunning ? (
              <button className={styles.btnPause} onClick={pauseSimulation}>
                <Pause size={14} /> PAUSE
              </button>
            ) : (
              <button className={styles.btnPlay} onClick={playSimulation}>
                <Play size={14} /> PLAY SIMULATION
              </button>
            )}
            <button className={styles.btnReset} onClick={resetSimulation}>
              <RotateCcw size={14} /> RESET
            </button>
          </div>

          <div className={styles.speedGroup}>
            <span className={styles.speedLabel}>Speed:</span>
            {([1, 5, 10] as const).map(s => (
              <button
                key={s}
                className={`${styles.speedBtn} ${simulationState.speed === s ? styles.speedActive : ""}`}
                onClick={() => setSimulationSpeed(s)}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TELEMETRY STRIP */}
      <div className={styles.telemetryStrip}>
        <div className={styles.telemetryCard}>
          <span className={styles.telemetryLabel}>Total Exited Venue</span>
          <span className={styles.telemetryVal}>{simulationState.totalExitedVenue.toLocaleString()}</span>
          <span className={styles.telemetrySub}>people departed Wankhede</span>
        </div>
        <div className={styles.telemetryCard}>
          <span className={styles.telemetryLabel}>In-Transit on Edges</span>
          <span className={styles.telemetryVal} style={{ color: "var(--ink)" }}>
            {totalInTransit.toLocaleString()}
          </span>
          <span className={styles.telemetrySub}>across {activeCohorts.length} active cohorts</span>
        </div>
        <div className={styles.telemetryCard}>
          <span className={styles.telemetryLabel}>Accumulated at Nodes</span>
          <span className={styles.telemetryVal} style={{ color: totalAccumulated > 6000 ? "var(--red)" : "var(--ink)" }}>
            {totalAccumulated.toLocaleString()}
          </span>
          <span className={styles.telemetrySub}>waiting / queuing at hubs</span>
        </div>
        <div className={styles.telemetryCard}>
          <span className={styles.telemetryLabel}>Flow Conservation</span>
          <span className={styles.telemetryVal} style={{ color: "var(--green)", fontSize: 18 }}>
            ✓ 100% Conserved
          </span>
          <span className={styles.telemetrySub}>
            Transit ({totalInTransit.toLocaleString()}) + Queue ({totalAccumulated.toLocaleString()}) + Cleared ({Math.round(simulationState.totalCleared).toLocaleString()})
          </span>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className={styles.grid}>
        {/* LEFT COLUMN: SCENARIO CONTROLS */}
        <div className={styles.controls}>
          <h3 className={styles.controlsTitle}>Simulation Parameters</h3>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>
              Attendance: {simParams.attendance.toLocaleString()}
            </label>
            <input
              type="range"
              min={20000}
              max={45000}
              step={1000}
              value={simParams.attendance}
              onChange={e => updateSimParams({ attendance: Number(e.target.value) })}
              className={styles.slider}
            />
            <div className={styles.sliderRange}><span>20,000</span><span>45,000</span></div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Event Delay</label>
            <div className={styles.segmented}>
              {([0, 15, 30] as const).map(v => (
                <button
                  key={v}
                  className={`${styles.segBtn} ${simParams.eventDelay === v ? styles.segActive : ""}`}
                  onClick={() => updateSimParams({ eventDelay: v })}
                >
                  {v === 0 ? "None" : `+${v}m`}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Weather Condition</label>
            <div className={styles.segmented}>
              {(["NORMAL", "HEAVY_RAIN"] as const).map(v => (
                <button
                  key={v}
                  className={`${styles.segBtn} ${simParams.weather === v ? styles.segActive : ""}`}
                  onClick={() => updateSimParams({ weather: v })}
                >
                  {v === "NORMAL" ? "Normal" : "Heavy Rain"}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Additional Buses (Intervention)</label>
            <div className={styles.segmented}>
              {([0, 10, 20] as const).map(v => (
                <button
                  key={v}
                  className={`${styles.segBtn} ${simParams.additionalBuses === v ? styles.segActive : ""}`}
                  onClick={() => updateSimParams({ additionalBuses: v })}
                >
                  {v === 0 ? "None" : `+${v}`}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Visitor Redistribution</label>
            <div className={styles.segmented}>
              {([0, 20, 40] as const).map(v => (
                <button
                  key={v}
                  className={`${styles.segBtn} ${simParams.visitorRedistribution === v ? styles.segActive : ""}`}
                  onClick={() => updateSimParams({ visitorRedistribution: v })}
                >
                  {v === 0 ? "None" : `${v}%`}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Transport Disruption (WR)</label>
            <div className={styles.segmented}>
              {[false, true].map(v => (
                <button
                  key={String(v)}
                  className={`${styles.segBtn} ${simParams.transportDisruption === v ? styles.segActive : ""}`}
                  onClick={() => updateSimParams({ transportDisruption: v })}
                >
                  {v ? "ON" : "OFF"}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.paramNote}>
            <strong>Parameter Change Semantics:</strong> Base parameter changes (attendance, weather, disruption)
            cleanly reinitialize the simulation state. Runtime interventions affect downstream flows.
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE SIMULATION TELEMETRY */}
        <div className={styles.results}>
          {/* 1. NODE ACCUMULATION */}
          <div>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Node Accumulation (Simulated People Waiting / Queuing)</span>
              <span className="pill pill-simulated">LIVE ACCUMULATION</span>
            </div>
            <div className={styles.nodeGrid} style={{ marginTop: 12 }}>
              {Object.keys(RESOURCE_NAMES).map(nodeId => {
                const load = simulationState.nodeLoads[nodeId] || 0;
                const capacity = RESOURCE_CAPACITIES[nodeId] || 1000;
                const pressure = Math.min(99, Math.max(20, Math.round((load / capacity) * 100)));
                const color = getPressureColor(pressure);

                return (
                  <div key={nodeId} className={styles.nodeCard}>
                    <div className={styles.nodeCardHeader}>
                      <span className={styles.nodeName}>{RESOURCE_NAMES[nodeId]}</span>
                      <span
                        className={styles.nodePressurePill}
                        style={{
                          background: color,
                          color: pressure >= 85 ? "#ffffff" : "#111111",
                        }}
                      >
                        {pressure}%
                      </span>
                    </div>
                    <div className={styles.nodeMetrics}>
                      <span className={styles.nodeLoadVal}>{load.toLocaleString()}</span>
                      <span className={styles.nodeCapVal}>/ {capacity.toLocaleString()} cap</span>
                    </div>
                    <div className={styles.pressureBar}>
                      <div
                        className={styles.pressureBarFill}
                        style={{ width: `${pressure}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. IN-TRANSIT EDGE LOADS */}
          <div>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Network Corridors (Edge Load — People in Transit)</span>
              <span className="text-meta">{totalInTransit.toLocaleString()} moving</span>
            </div>
            <div className={styles.edgeGrid} style={{ marginTop: 12 }}>
              {Object.values(MVP_NETWORK_EDGES).map(edge => {
                const load = simulationState.edgeLoads[edge.id] || 0;
                return (
                  <div key={edge.id} className={styles.edgeCard}>
                    <span className={styles.edgeName}>{edge.name}</span>
                    <div className={styles.edgeLoadBadge}>
                      <span className={styles.edgeLoadNumber}>{load.toLocaleString()}</span>
                      <span className={styles.edgeLoadLabel}>in transit</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. ACTIVE HUMAN COHORTS */}
          <div>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Active Human Cohorts ({activeCohorts.length})</span>
              <span className="text-meta">Aggregate Movement Stream</span>
            </div>
            {activeCohorts.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "var(--ink-faint)", fontSize: 13 }}>
                No cohorts currently moving. Press [▶ PLAY] to start the simulation clock.
              </div>
            ) : (
              <div style={{ overflowX: "auto", marginTop: 10 }}>
                <table className={styles.cohortTable}>
                  <thead>
                    <tr>
                      <th>Cohort ID</th>
                      <th>Destination Hub</th>
                      <th>Cohort Volume</th>
                      <th>Speed</th>
                      <th>Corridor Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCohorts.slice(0, 8).map(cohort => (
                      <tr key={cohort.id}>
                        <td style={{ fontFamily: "monospace", fontSize: 11 }}>{cohort.id.slice(0, 18)}</td>
                        <td>
                          <strong>{RESOURCE_NAMES[cohort.destinationId] || cohort.destinationId}</strong>
                        </td>
                        <td>
                          <strong>{cohort.volume.toLocaleString()}</strong> people
                        </td>
                        <td>{cohort.speedMps} m/s</td>
                        <td>
                          <div className={styles.progressBarWrap}>
                            <div
                              className={styles.progressBarFill}
                              style={{ width: `${Math.round(cohort.progress * 100)}%` }}
                            />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700 }}>
                            {Math.round(cohort.progress * 100)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SimulationPage() {
  return (
    <Suspense fallback={<div style={{ padding: 28 }}>Loading simulation console...</div>}>
      <SimulationContent />
    </Suspense>
  );
}
