"use client";
import React, { useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/state/AppContext";
import { forecastingService } from "@/services/forecastingService";
import { ScenarioId, ResourcePrediction } from "@/types";
import { getPressureColor, getPressureLabel, getPressureClass } from "@/components/ui/PressureIndicator";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from "recharts";
import { AlertTriangle, Zap, Check } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import styles from "./predictions.module.css";

const TIME_LABELS = ["NOW", "+15 MIN", "+30 MIN", "+60 MIN"];

const TARGET_PREDICTION_NODES = [
  { id: "CHURCHGATE", name: "Churchgate Station", color: "#EF4444", zoneId: "ZONE_CHURCHGATE" },
  { id: "WANKHEDE_EXIT", name: "Wankhede Exit", color: "#F97316", zoneId: "ZONE_WANKHEDE" },
  { id: "TAXI_ZONE", name: "Taxi Zone", color: "#F5C400", zoneId: "ZONE_TAXI_STAGING" },
  { id: "CSMT", name: "CSMT", color: "#3B82F6", zoneId: "ZONE_CSMT" },
  { id: "DADAR", name: "Dadar Station", color: "#22C55E", zoneId: "ZONE_DADAR" },
  { id: "ROAD_MARINE_DR", name: "Marine Drive", color: "#8B5CF6", zoneId: "ZONE_MARINE_LINES" },
];

interface CascadeStage {
  id: string;
  step: string;
  name: string;
  context: string;
  beforeStr: string;
  afterStr: string;
  deltaStr: string;
  isIncrease: boolean;
  pressureForColor: number;
  consequenceToNext?: string;
}

const NO_ACTION_MESSAGES: Record<ScenarioId, { warning: string; affected: string[]; risk: string }> = {
  NORMAL: {
    warning: "Steady egress will progressively concentrate 10,000+ attendees toward Churchgate Station. Inflow is projected to reach high pressure within ~30 minutes, producing platform dwell delays and curbside taxi queuing.",
    affected: ["Churchgate (Peak)", "Taxi Zone (Peak)", "Marine Drive (Peak)"],
    risk: "Unmitigated Inflow Delay: +15 min · Risk: WATCH",
  },
  POST_EVENT_SURGE: {
    warning: "Simultaneous 33,000 attendee exit will overwhelm Churchgate Station in ~15–20 minutes. Concourse overcrowding will force safety gate holds, causing diverted commuters to flood Marine Drive and pushing Taxi Zone wait times beyond 45 minutes.",
    affected: ["Churchgate (CRITICAL)", "Taxi Zone (CRITICAL)", "Marine Drive (HIGH)", "Exit Gates (HIGH)"],
    risk: "Unmitigated Bottleneck: +30–45 min · Safety Risk: HIGH",
  },
  TRANSPORT_DISRUPTION: {
    warning: "Western Railway signal failure halts train departures. Trapped crowds at Churchgate will back up onto approach roads. Taxi and rideshare demand will instantly spike, creating severe cascading gridlock across South Mumbai.",
    affected: ["Churchgate (CRITICAL)", "Taxi Zone (CRITICAL)", "CSMT Terminal (HIGH)", "Marine Drive (HIGH)"],
    risk: "Transit Suspension Hold: +40+ min · Severity: CRITICAL",
  },
  HEAVY_RAIN: {
    warning: "Monsoon downpour eliminates walking viability to Marine Lines and Churchgate. Exiting spectators will converge heavily on curbside taxi pickup bays, resulting in curb gridlock and 2.0x vehicular travel delay.",
    affected: ["Taxi Zone (CRITICAL)", "Pickup Bays (CRITICAL)", "Marine Drive (HIGH)", "Churchgate (HIGH)"],
    risk: "Monsoon Curb Gridlock: +25–35 min · Severity: HIGH",
  },
  ACCOMMODATION_SATURATION: {
    warning: "Zone A hotels reach high occupancy with limited spare rooms. Late-booking attendees face immediate room shortages, resulting in localized vehicle circling around Nariman Point and increased transit frustration.",
    affected: ["Zone A Hotels (CRITICAL)", "Churchgate Station (HIGH)", "Taxi Zone (HIGH)"],
    risk: "Hospitality Exhaustion · Severity: HIGH",
  },
  EVENT_DELAY: {
    warning: "Match delayed by 30 minutes. Premature spectator arrival will congest stadium perimeter gates and local dining if attendees are not notified to stagger departure from surrounding transit hubs.",
    affected: ["Wankhede Gates (WATCH)", "Churchgate Station (WATCH)", "Taxi Zone (WATCH)"],
    risk: "Premature Gate Inflow · Severity: WATCH",
  },
};

export default function PredictionsPage() {
  const {
    activeScenario,
    redistributionApplied,
    recommendations,
    resources,
    zones,
    simulationState,
  } = useApp();

  // Dynamic Live Forecasting computed from live resources, zones, and simulation progression
  const predictions: ResourcePrediction[] = useMemo(() => {
    return TARGET_PREDICTION_NODES.map(node => {
      const res = resources.find(r => r.id === node.id);
      const zone = zones.find(z => z.id === node.zoneId);
      const currentPressure = res ? res.pressure : (zone?.pressure ?? 50);
      const confidenceScore = zone?.confidence ?? 0.85;

      const forecast = forecastingService.generateResourceForecast(
        node.id,
        node.name,
        node.zoneId,
        currentPressure,
        activeScenario,
        confidenceScore
      );

      const p15 = forecast.forecastPoints.find(p => p.minutesFromNow === 15)?.predictedPressure ?? currentPressure;
      const p30 = forecast.forecastPoints.find(p => p.minutesFromNow === 30)?.predictedPressure ?? currentPressure;
      const p60 = forecast.forecastPoints.find(p => p.minutesFromNow === 60)?.predictedPressure ?? currentPressure;

      return {
        resourceId: node.id,
        resourceName: node.name,
        color: node.color,
        current: currentPressure,
        points: [
          { label: "NOW", minutesFromNow: 0, pressure: currentPressure },
          { label: "+15 MIN", minutesFromNow: 15, pressure: p15 },
          { label: "+30 MIN", minutesFromNow: 30, pressure: p30 },
          { label: "+60 MIN", minutesFromNow: 60, pressure: p60 },
        ],
        thresholdCrossing: forecast.thresholdCrossing
          ? {
              level: forecast.thresholdCrossing.level,
              minutesFromNow: forecast.thresholdCrossing.minutesFromNow,
            }
          : undefined,
      };
    });
  }, [resources, zones, activeScenario, simulationState.minutesElapsed, simulationState.nodeLoads]);

  // Transform live predictions into Recharts series data
  const chartData = useMemo(() => {
    return TIME_LABELS.map((label, i) => {
      const obj: Record<string, number | string> = { time: label };
      predictions.forEach(p => {
        obj[p.resourceName] = p.points[i]?.pressure || 0;
      });
      return obj;
    });
  }, [predictions]);

  // Live Dynamic Cascade Stages linked to live node pressures and forward forecasts
  const { stages, cascadeTimeLabel, isCritical } = useMemo(() => {
    const exitPred = predictions.find(p => p.resourceId === "WANKHEDE_EXIT");
    const roadPred = predictions.find(p => p.resourceId === "ROAD_MARINE_DR");
    const cgPred = predictions.find(p => p.resourceId === "CHURCHGATE");
    const taxiPred = predictions.find(p => p.resourceId === "TAXI_ZONE");

    const exitBefore = exitPred?.current ?? 88;
    const exitAfter = exitPred?.points[1]?.pressure ?? exitBefore;
    const exitDelta = exitAfter - exitBefore;

    const roadBefore = roadPred?.current ?? 82;
    const roadAfter = roadPred?.points[1]?.pressure ?? roadBefore;
    const roadDelta = roadAfter - roadBefore;

    const baseDelay = activeScenario === "TRANSPORT_DISRUPTION" ? 8 : activeScenario === "HEAVY_RAIN" ? 7 : activeScenario === "POST_EVENT_SURGE" ? 5 : 4;
    const delayDelta = Math.round((cgPred?.current ?? 80) * 0.12);
    const predDelay = baseDelay + delayDelta;

    const cgBefore = cgPred?.current ?? 94;
    const cgAfter = cgPred?.points[1]?.pressure ?? cgBefore;
    const cgDelta = cgAfter - cgBefore;

    const taxiBefore = taxiPred?.current ?? 91;
    const taxiAfter = taxiPred?.points[1]?.pressure ?? taxiBefore;
    const taxiDelta = taxiAfter - taxiBefore;

    const pickupBefore = Math.min(98, Math.round(taxiBefore * 0.95));
    const pickupAfter = Math.min(99, Math.round(taxiAfter * 1.02));
    const pickupDelta = pickupAfter - pickupBefore;

    const liveStages: CascadeStage[] = [
      {
        id: "WANKHEDE_EXIT",
        step: "STAGE 01",
        name: "Wankhede Exit",
        context: "Stadium gates dispersal",
        beforeStr: `${exitBefore}%`,
        afterStr: `${exitAfter}%`,
        deltaStr: `${exitDelta >= 0 ? `+${exitDelta}%` : `${exitDelta}%`} pressure`,
        isIncrease: exitDelta >= 0,
        pressureForColor: exitAfter,
        consequenceToNext: `+${Math.round(exitAfter * 0.1)} min road congestion`,
      },
      {
        id: "ROAD_PRESSURE",
        step: "STAGE 02",
        name: "Road Pressure",
        context: "Marine Drive corridor",
        beforeStr: `${roadBefore}%`,
        afterStr: `${roadAfter}%`,
        deltaStr: `${roadDelta >= 0 ? `+${roadDelta}%` : `${roadDelta}%`} pressure`,
        isIncrease: roadDelta >= 0,
        pressureForColor: roadAfter,
        consequenceToNext: `+${delayDelta} min transport delay`,
      },
      {
        id: "TRANSPORT_DELAY",
        step: "STAGE 03",
        name: "Transport Delay",
        context: "Western rail dwell",
        beforeStr: `+${baseDelay} min`,
        afterStr: `+${predDelay} min`,
        deltaStr: `+${delayDelta} min delay`,
        isIncrease: true,
        pressureForColor: Math.min(98, Math.round(predDelay * 4.4)),
        consequenceToNext: activeScenario === "TRANSPORT_DISRUPTION" ? "Signal fault concourse hold" : "Inflow surges (+35%)",
      },
      {
        id: "CHURCHGATE",
        step: "STAGE 04",
        name: "Churchgate",
        context: "Terminus platform load",
        beforeStr: `${cgBefore}%`,
        afterStr: `${cgAfter}%`,
        deltaStr: `${cgDelta >= 0 ? `+${cgDelta}%` : `${cgDelta}%`} pressure`,
        isIncrease: cgDelta >= 0,
        pressureForColor: cgAfter,
        consequenceToNext: cgAfter >= 85 ? "Over-capacity diverts to cabs" : "Egress manageable",
      },
      {
        id: "TAXI_DEMAND",
        step: "STAGE 05",
        name: "Taxi Demand",
        context: "Rideshare hail spike",
        beforeStr: `${taxiBefore}%`,
        afterStr: `${taxiAfter}%`,
        deltaStr: `${taxiDelta >= 0 ? `+${taxiDelta}%` : `${taxiDelta}%`} pressure`,
        isIncrease: taxiDelta >= 0,
        pressureForColor: taxiAfter,
        consequenceToNext: "Queue bay overflow",
      },
      {
        id: "PICKUP_ZONE",
        step: "STAGE 06",
        name: "Pickup Zone",
        context: "South stadium pickup bay",
        beforeStr: `${pickupBefore}%`,
        afterStr: `${pickupAfter}%`,
        deltaStr: `${pickupDelta >= 0 ? `+${pickupDelta}%` : `${pickupDelta}%`} pressure`,
        isIncrease: pickupDelta >= 0,
        pressureForColor: pickupAfter,
      },
    ];

    const maxPressure = Math.max(...liveStages.map(s => s.pressureForColor));
    const isCrit = maxPressure >= 85;
    const timeLabel = isCrit ? "Critical in ~15–20 min" : "Projected cascade: ~25–30 min";

    return { stages: liveStages, cascadeTimeLabel: timeLabel, isCritical: isCrit };
  }, [predictions, activeScenario]);

  const noAction = NO_ACTION_MESSAGES[activeScenario] || NO_ACTION_MESSAGES.NORMAL;
  const primaryRec = recommendations.find(r => r.id === "REC1") || recommendations[0];

  return (
    <div className={styles.page}>
      <PageHeader
        category="INTELLIGENCE"
        title="Pressure Forecast & Cascade Analysis"
        subtitle="Predicted capacity pressure and causal bottleneck propagation across South Mumbai monitored nodes."
        actions={
          <>
            {simulationState.minutesElapsed > 0 && (
              <span className="pill pill-live">SIM: +{Math.round(simulationState.minutesElapsed)} MIN</span>
            )}
            {redistributionApplied && (
              <span className="pill pill-live">REDISTRIBUTION APPLIED</span>
            )}
            <ConfidenceBadge source="SIMULATED" />
          </>
        }
      />


      {/* TABLE */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <span className={styles.resourceCol}>RESOURCE</span>
          {TIME_LABELS.map(l => <span key={l} className={styles.timeCol}>{l}</span>)}
          <span className={styles.trendCol}>TREND</span>
        </div>
        {predictions.map(p => (
          <div key={p.resourceId} className={styles.tableRow}>
            <span className={styles.resourceName}>{p.resourceName}</span>
            {p.points.map((pt, i) => (
              <span
                key={i}
                className={styles.pressureCell}
                style={{ color: pt.pressure >= 95 ? "var(--red)" : pt.pressure >= 85 ? "var(--orange)" : pt.pressure >= 70 ? "var(--yellow-state)" : "var(--green)" }}
              >
                {pt.pressure}%
              </span>
            ))}
            <span className={`${styles.trendCell} ${p.points[3].pressure > p.points[0].pressure + 10 ? styles.trendUp : styles.trendDown}`}>
              {p.points[3].pressure > p.points[0].pressure + 5 ? "↑ Rising" : "→ Stable"}
            </span>
          </div>
        ))}
      </div>

      {/* CHART */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Pressure Over Time ("When will pressure peak?")</h3>
        <p className={styles.chartNote}>Forward-looking timeline showing baseline to +60 min projections across monitored infrastructure.</p>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5DE" />
            <XAxis dataKey="time" tick={{ fontSize: 11, fontFamily: "Inter", fill: "#666" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fontFamily: "Inter", fill: "#666" }} tickFormatter={v => `${v}%`} />
            <Tooltip formatter={(v: any) => [`${v}%`]} contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8, border: "1px solid #E7E5DE" }} />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Inter" }} />
            <ReferenceLine y={95} stroke="#EF4444" strokeDasharray="4,3" label={{ value: "CRITICAL", fill: "#EF4444", fontSize: 9 }} />
            <ReferenceLine y={85} stroke="#F97316" strokeDasharray="4,3" label={{ value: "HIGH", fill: "#F97316", fontSize: 9 }} />
            <ReferenceLine y={70} stroke="#CA8A04" strokeDasharray="4,3" label={{ value: "WATCH", fill: "#CA8A04", fontSize: 9 }} />
            {predictions.slice(0, 5).map(p => (
              <Line key={p.resourceId} type="monotone" dataKey={p.resourceName} stroke={p.color} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* UPGRADED CASCADE EFFECT SECTION */}
      <div className={styles.cascadeCard}>
        <div className={styles.cascadeHeader}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 className={styles.cascadeTitle}>Capacity Cascade Effect ("How does pressure propagate?")</h2>
              <span className="pill pill-predicted">PREDICTED CASCADE</span>
              <span className={`pill ${isCritical ? "pill-critical" : "pill-watch"}`}>
                {cascadeTimeLabel}
              </span>
            </div>
            <p className={styles.cascadeSubtitle}>
              Simulated causal propagation: Venue exit surge triggers road queuing, creating transit dwell delays and downstream taxi zone overflow.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="simulated-env-label">
              <span className="simulated-dot" />
              Scenario: {activeScenario.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {/* CASCADE STAGES */}
        <div className={styles.cascadeFlowContainer}>
          {stages.map((stage, idx) => {
            const label = getPressureLabel(stage.pressureForColor);
            const pClass = getPressureClass(stage.pressureForColor);
            const color = getPressureColor(stage.pressureForColor);

            return (
              <div key={stage.id} style={{ display: "flex", alignItems: "center" }}>
                <div
                  className={styles.cascadeNodeCard}
                  style={{
                    borderTop: `3px solid ${color}`,
                  }}
                >
                  <div className={styles.cascadeNodeHeader}>
                    <span className={styles.nodeStep}>{stage.step}</span>
                    <span className={`pill ${pClass}`} style={{ fontSize: 9, padding: "2px 6px" }}>
                      {label}
                    </span>
                  </div>

                  <div className={styles.nodeBody}>
                    <span className={styles.nodeName}>{stage.name}</span>
                    <span className={styles.nodeContext}>{stage.context}</span>
                    <div className={styles.nodeValuesRow}>
                      <span className={styles.valBefore}>{stage.beforeStr}</span>
                      <span className={styles.valArrow}>→</span>
                      <span className={styles.valAfter} style={{ color }}>
                        {stage.afterStr}
                      </span>
                    </div>
                  </div>

                  <span className={`${styles.nodeDelta} ${stage.isIncrease ? styles.deltaInc : styles.deltaDec}`}>
                    {stage.deltaStr}
                  </span>
                </div>

                {idx < stages.length - 1 && (
                  <div className={styles.connector}>
                    <div className={styles.connectorArrow}>→</div>
                    <span className={styles.connectorLabel}>
                      {stage.consequenceToNext}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* DECISION GRID: IF NO ACTION vs JUNCTION RECOMMENDS */}
        <div className={styles.decisionGrid}>
          {/* LEFT: IF NO ACTION IS TAKEN */}
          <div className={styles.noActionCard}>
            <div className={styles.noActionHeader}>
              <span className={styles.noActionTitle} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={15} color="var(--orange)" /> IF NO ACTION IS TAKEN
              </span>
              <span className={styles.riskBanner}>{noAction.risk}</span>
            </div>

            <p className={styles.noActionText}>
              {redistributionApplied ? (
                <span style={{ color: "var(--green)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  <Check size={14} /> Proactive Intervention Active: Attendee redistribution via Dadar has successfully suppressed Churchgate peak bottleneck (94% → 76%), preventing concourse safety holds and stabilizing Marine Drive traffic.
                </span>
              ) : (
                noAction.warning
              )}
            </p>

            <div>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--ink-faint)", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                Projected Bottleneck Nodes (Without Intervention)
              </span>
              <div className={styles.affectedList}>
                {noAction.affected.map(res => (
                  <span key={res} className={styles.affectedItem}>
                    {res}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: JUNCTION RECOMMENDS */}
          <div className={styles.recommendCard}>
            <div className={styles.recommendHeader}>
              <span className={styles.recommendTitle} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Zap size={15} color="var(--yellow)" /> JUNCTION RECOMMENDS
              </span>
              {primaryRec.status === "APPROVED" ? (
                <span className="pill pill-live">APPROVED &amp; PUBLISHED</span>
              ) : (
                <span className="pill pill-yellow">HUMAN APPROVAL REQUIRED</span>
              )}
            </div>

            <div>
              <h4 className={styles.recActionTitle}>{primaryRec.title}</h4>
              <p className={styles.recommendText} style={{ marginTop: 4 }}>
                {primaryRec.action}
              </p>
            </div>

            <div>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--ink-faint)", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                Expected Impact on Cascade Bottlenecks
              </span>
              <div className={styles.impactGrid}>
                {primaryRec.expectedImpact.map(imp => (
                  <div key={imp.resourceName} className={styles.impactPill}>
                    <span className={styles.impactName}>{imp.resourceName}</span>
                    <span className={styles.impactValues}>{imp.before}% → {imp.after}%</span>
                    <span className={styles.impactDelta}>
                      ({imp.after - imp.before > 0 ? `+${imp.after - imp.before}%` : `${imp.after - imp.before}%`})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>
              <strong>Trade-off:</strong> {primaryRec.tradeOff}
            </div>

            <div className={styles.actionRow}>
              <Link href={`/organizer/simulation?rec=${primaryRec.id}`} className="btn btn-yellow btn-sm">
                SIMULATE IMPACT →
              </Link>
              <Link href="/organizer/recommendations" className="btn btn-outline btn-sm">
                Review in Recommendations
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
