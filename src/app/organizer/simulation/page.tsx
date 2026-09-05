"use client";
import { useState } from "react";
import { useApp } from "@/state/AppContext";
import { SCENARIOS } from "@/data/mockScenarios";
import styles from "./simulation.module.css";

interface SimParams {
  attendance: number;
  eventDelay: number;
  weather: string;
  additionalBuses: number;
  redistribution: number;
  disruption: boolean;
}

function runSim(params: SimParams, baseScenario: string) {
  const base = SCENARIOS[baseScenario as keyof typeof SCENARIOS].pressure;
  const factor = (params.attendance / 33000) * (params.weather === "HEAVY_RAIN" ? 1.15 : 1.0) * (params.disruption ? 1.12 : 1.0);
  const busFactor = params.additionalBuses > 0 ? (1 - params.additionalBuses * 0.025) : 1.0;
  const redistFactor = params.redistribution > 0 ? (1 - params.redistribution * 0.003) : 1.0;
  const delayCGFactor = params.eventDelay > 0 ? 0.88 : 1.0;
  const result: Record<string, { before: number; after: number }> = {};
  Object.entries(base).forEach(([id, pd]) => {
    const b = pd.pressure;
    let a = Math.round(b * factor * busFactor * redistFactor);
    if (id === "CHURCHGATE" && params.redistribution > 0) a = Math.round(a * (1 - params.redistribution * 0.004));
    if (id === "DADAR" && params.redistribution > 0) a = Math.min(88, Math.round(b + params.redistribution * 0.2));
    if (id === "CHURCHGATE" && params.eventDelay > 0) a = Math.round(a * delayCGFactor);
    a = Math.min(99, Math.max(20, a));
    result[id] = { before: b, after: a };
  });
  return result;
}

const DISPLAY_RESOURCES = ["CHURCHGATE", "WANKHEDE_EXIT", "TAXI_ZONE", "DADAR", "CSMT", "ROAD_MARINE_DR"];
const RESOURCE_NAMES: Record<string, string> = {
  CHURCHGATE: "Churchgate Station", WANKHEDE_EXIT: "Wankhede Exit",
  TAXI_ZONE: "Taxi Zone", DADAR: "Dadar Station",
  CSMT: "CSMT", ROAD_MARINE_DR: "Marine Drive",
};

export default function SimulationPage() {
  const { activeScenario } = useApp();
  const [params, setParams] = useState<SimParams>({
    attendance: 33000, eventDelay: 0, weather: "NORMAL",
    additionalBuses: 0, redistribution: 0, disruption: false,
  });
  const [result, setResult] = useState<Record<string, { before: number; after: number }> | null>(null);
  const [ran, setRan] = useState(false);

  const handleRun = () => {
    setResult(runSim(params, activeScenario));
    setRan(true);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className="text-page-heading">What-If Simulation</h1>
        <p className={styles.subtitle}>
          Explore how interventions or external changes affect destination pressure.
          This is a deterministic prototype model, not a calibrated simulation.
        </p>
      </div>

      <div className={styles.grid}>
        {/* CONTROLS */}
        <div className={styles.controls}>
          <h3 className={styles.controlsTitle}>Scenario Controls</h3>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Attendance: {params.attendance.toLocaleString()}</label>
            <input type="range" min={20000} max={45000} step={1000}
              value={params.attendance}
              onChange={e => setParams(p => ({ ...p, attendance: Number(e.target.value) }))}
              className={styles.slider}
            />
            <div className={styles.sliderRange}><span>20,000</span><span>45,000</span></div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Event Delay</label>
            <div className={styles.segmented}>
              {[0, 15, 30].map(v => (
                <button key={v}
                  className={`${styles.segBtn} ${params.eventDelay === v ? styles.segActive : ""}`}
                  onClick={() => setParams(p => ({ ...p, eventDelay: v }))}
                >
                  {v === 0 ? "No delay" : `+${v} min`}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Weather</label>
            <div className={styles.segmented}>
              {["NORMAL", "HEAVY_RAIN"].map(v => (
                <button key={v}
                  className={`${styles.segBtn} ${params.weather === v ? styles.segActive : ""}`}
                  onClick={() => setParams(p => ({ ...p, weather: v }))}
                >
                  {v === "NORMAL" ? "Normal" : "Heavy Rain"}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Additional Buses</label>
            <div className={styles.segmented}>
              {[0, 10, 20].map(v => (
                <button key={v}
                  className={`${styles.segBtn} ${params.additionalBuses === v ? styles.segActive : ""}`}
                  onClick={() => setParams(p => ({ ...p, additionalBuses: v }))}
                >
                  {v === 0 ? "None" : `+${v}`}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Visitor Redistribution</label>
            <div className={styles.segmented}>
              {[0, 20, 40].map(v => (
                <button key={v}
                  className={`${styles.segBtn} ${params.redistribution === v ? styles.segActive : ""}`}
                  onClick={() => setParams(p => ({ ...p, redistribution: v }))}
                >
                  {v === 0 ? "None" : `${v}%`}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Transport Disruption</label>
            <div className={styles.segmented}>
              {[false, true].map(v => (
                <button key={String(v)}
                  className={`${styles.segBtn} ${params.disruption === v ? styles.segActive : ""}`}
                  onClick={() => setParams(p => ({ ...p, disruption: v }))}
                >
                  {v ? "ON" : "OFF"}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-yellow" style={{ width: "100%", marginTop: 8 }} onClick={handleRun}>
            RUN SIMULATION
          </button>
        </div>

        {/* RESULTS */}
        <div className={styles.results}>
          <div className={styles.resultsHeader}>
            <h3 className={styles.controlsTitle}>
              {ran ? "Before / After Comparison" : "Adjust controls and run simulation"}
            </h3>
            {ran && <span className="pill pill-simulated">SIMULATED</span>}
          </div>

          {ran && result ? (
            <div className={styles.compGrid}>
              {DISPLAY_RESOURCES.map(id => {
                const r = result[id];
                if (!r) return null;
                const delta = r.after - r.before;
                const improved = delta < 0;
                return (
                  <div key={id} className={styles.compCard}>
                    <span className={styles.compName}>{RESOURCE_NAMES[id]}</span>
                    <div className={styles.compValues}>
                      <div className={styles.compBefore}>
                        <span className={styles.compTag}>BEFORE</span>
                        <span className={styles.compNum} style={{ color: r.before >= 95 ? "var(--red)" : r.before >= 85 ? "var(--orange)" : r.before >= 70 ? "var(--yellow-state)" : "var(--green)" }}>{r.before}%</span>
                      </div>
                      <span className={styles.compArrow}>→</span>
                      <div className={styles.compAfter}>
                        <span className={styles.compTag}>AFTER</span>
                        <span className={styles.compNum} style={{ color: r.after >= 95 ? "var(--red)" : r.after >= 85 ? "var(--orange)" : r.after >= 70 ? "var(--yellow-state)" : "var(--green)" }}>{r.after}%</span>
                      </div>
                      <span className={`${styles.compDelta} ${improved ? styles.compImproved : styles.compWorse}`}>
                        {improved ? `▼ ${Math.abs(delta)}%` : `▲ +${delta}%`}
                      </span>
                    </div>
                    <div className="pressure-bar" style={{ marginTop: 4 }}>
                      <div className="pressure-bar-fill" style={{ width: `${r.after}%`, background: r.after >= 95 ? "var(--red)" : r.after >= 85 ? "var(--orange)" : r.after >= 70 ? "var(--yellow-state)" : "var(--green)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>◎</span>
              <span>Results will appear here after running the simulation.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
