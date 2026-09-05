"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
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

function SimulationContent() {
  const { activeScenario, recommendations, approveRecommendation, isRecommendationApproved } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();

  const recId = searchParams.get("rec");
  const isModify = searchParams.get("modify") === "true";
  const linkedRec = recommendations.find(r => r.id === recId);

  const [params, setParams] = useState<SimParams>({
    attendance: 33000,
    eventDelay: 0,
    weather: "NORMAL",
    additionalBuses: 0,
    redistribution: 0,
    disruption: false,
  });

  const [result, setResult] = useState<Record<string, { before: number; after: number }> | null>(null);
  const [ran, setRan] = useState(false);
  const [applied, setApplied] = useState(false);

  // Pre-populate if recId is provided
  useEffect(() => {
    if (recId === "REC1") {
      const initialParams: SimParams = {
        attendance: 33000,
        eventDelay: 0,
        weather: "NORMAL",
        additionalBuses: 0,
        redistribution: 20,
        disruption: false,
      };
      setParams(initialParams);
      setResult(runSim(initialParams, activeScenario));
      setRan(true);
    } else if (recId === "REC2") {
      const initialParams: SimParams = {
        attendance: 33000,
        eventDelay: 0,
        weather: "NORMAL",
        additionalBuses: 10,
        redistribution: 0,
        disruption: false,
      };
      setParams(initialParams);
      setResult(runSim(initialParams, activeScenario));
      setRan(true);
    }
  }, [recId, activeScenario]);

  const handleRun = () => {
    setResult(runSim(params, activeScenario));
    setRan(true);
  };

  const handleApproveIntervention = () => {
    if (recId) {
      approveRecommendation(recId);
      setApplied(true);
      setTimeout(() => setApplied(false), 5000);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className="text-page-heading">What-If Simulation</h1>
          <p className={styles.subtitle}>
            Explore how interventions or external changes affect destination pressure.
            This is a deterministic prototype model, not a calibrated simulation.
          </p>
        </div>
        <span className="pill pill-simulated">SIMULATED MODEL</span>
      </div>

      {/* PRE-POPULATED INTERVENTION BANNER */}
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
          gap: 12
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="pill pill-yellow">SIMULATING RECOMMENDATION</span>
              <strong style={{ fontSize: 14 }}>{linkedRec.id}: {linkedRec.title}</strong>
            </div>
            <p style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 4 }}>
              {isModify
                ? "Modify parameters below to explore alternative intervention intensities."
                : "Parameters pre-populated from recommendation action. Review BEFORE vs AFTER impact."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn btn-yellow btn-sm"
              onClick={handleApproveIntervention}
              disabled={isRecommendationApproved(linkedRec.id)}
            >
              {isRecommendationApproved(linkedRec.id) ? "✓ APPROVED" : "APPROVE THIS INTERVENTION"}
            </button>
            <Link href="/organizer/recommendations" className="btn btn-outline btn-sm">
              Back to Recs
            </Link>
          </div>
        </div>
      )}

      {applied && (
        <div style={{
          background: "var(--green-bg)",
          border: "1px solid var(--green)",
          borderRadius: "var(--radius-sm)",
          padding: "12px 16px",
          color: "var(--green)",
          fontSize: 13,
          fontWeight: 600
        }}>
          ✓ Intervention approved! Recommendation published to attendee platform. Shared destination state will update as attendees adopt the route.
        </div>
      )}

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
            <label className={styles.controlLabel}>Additional Buses (Shuttle Interventions)</label>
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
            <label className={styles.controlLabel}>Visitor Redistribution (Churchgate → Dadar)</label>
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
            <label className={styles.controlLabel}>Transport Disruption (Western Railway)</label>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* IMPACT SUMMARY TILES */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <div style={{ background: "var(--paper)", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral)" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--ink-faint)" }}>Churchgate Delta</span>
                  <div style={{ fontSize: 18, fontWeight: 700, color: result["CHURCHGATE"]?.after < result["CHURCHGATE"]?.before ? "var(--green)" : "var(--ink)" }}>
                    {result["CHURCHGATE"]?.before}% → {result["CHURCHGATE"]?.after}% ({result["CHURCHGATE"]?.after - result["CHURCHGATE"]?.before}%)
                  </div>
                </div>
                <div style={{ background: "var(--paper)", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral)" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--ink-faint)" }}>Dadar Absorption</span>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
                    {result["DADAR"]?.before}% → {result["DADAR"]?.after}% (+{result["DADAR"]?.after - result["DADAR"]?.before}%)
                  </div>
                </div>
                <div style={{ background: "var(--paper)", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--neutral)" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--ink-faint)" }}>Average Detour</span>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
                    {params.redistribution > 0 ? "+7-8 min" : "0 min"}
                  </div>
                </div>
              </div>

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

export default function SimulationPage() {
  return (
    <Suspense fallback={<div style={{ padding: 28 }}>Loading simulation environment...</div>}>
      <SimulationContent />
    </Suspense>
  );
}

