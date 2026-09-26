"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/state/AppContext";
import { forecastingService } from "@/services/forecastingService";
import { ResourcePrediction } from "@/types";
import { getPressureColor, getPressureLabel, getPressureClass } from "@/components/ui/PressureIndicator";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from "recharts";
import PageHeader from "@/components/ui/PageHeader";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import styles from "./predictions.module.css";

const TIME_LABELS = ["NOW", "+15 MIN", "+30 MIN", "+60 MIN"];

const TARGET_PREDICTION_NODES = [
  { id: "CHURCHGATE", name: "Churchgate Station", color: "#EF4444", zoneId: "ZONE_CHURCHGATE", role: "Transit Hub" },
  { id: "WANKHEDE_GATE_1", name: "Wankhede Gate 1", color: "#F97316", zoneId: "ZONE_WANKHEDE_GATE_1", role: "Stadium Exit Gate 1" },
  { id: "WANKHEDE_GATE_2", name: "Wankhede Gate 2", color: "#FB923C", zoneId: "ZONE_WANKHEDE_GATE_2", role: "Stadium Exit Gate 2" },
  { id: "TAXI_ZONE", name: "Taxi Zone", color: "#F5C400", zoneId: "ZONE_TAXI_STAGING", role: "Rideshare Staging" },
  { id: "CSMT", name: "CSMT", color: "#3B82F6", zoneId: "ZONE_CSMT", role: "Secondary Rail" },
  { id: "DADAR", name: "Dadar Station", color: "#22C55E", zoneId: "ZONE_DADAR", role: "Diversion Terminal" },
  { id: "ROAD_MARINE_DR", name: "Marine Drive", color: "#8B5CF6", zoneId: "ZONE_MARINE_LINES", role: "Egress Arterial" },
];

export default function PredictionsPage() {
  const {
    activeScenario,
    redistributionApplied,
    recommendations,
    resources,
    zones,
    simulationState,
  } = useApp();

  const [showAuditDetails, setShowAuditDetails] = useState<boolean>(false);

  // 1. Compute dynamic forward predictions for each monitored node
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

  // 2. Chart data matrix
  const chartData = useMemo(() => {
    return TIME_LABELS.map((label, i) => {
      const obj: Record<string, number | string> = { time: label };
      predictions.forEach(p => {
        obj[p.resourceName] = p.points[i]?.pressure || 0;
      });
      return obj;
    });
  }, [predictions]);

  // 3. Dynamic headline derived strictly from actual forecast data (Consistency Check)
  const headlineData = useMemo(() => {
    const primary = predictions.find(p => p.resourceId === "CHURCHGATE") || predictions[0];
    if (!primary) {
      return {
        title: "Pressure Expected to Remain Stable",
        subtitle: "Monitored zones operating within nominal parameters.",
        peakVal: 50,
        peakTime: "NOW",
        isCritical: false,
        isHigh: false,
      };
    }

    // Find actual peak point across primary node's timeline
    let peakPt = primary.points[0];
    for (const pt of primary.points) {
      if (pt.pressure > peakPt.pressure) {
        peakPt = pt;
      }
    }

    const current = primary.current;
    const peakVal = peakPt.pressure;
    const delta = peakVal - current;
    const peakMinutes = peakPt.minutesFromNow;

    const highestAcrossAll = Math.max(...predictions.map(p => Math.max(...p.points.map(pt => pt.pressure))));
    const isCritical = peakVal >= 85 || highestAcrossAll >= 90;
    const isHigh = peakVal >= 75 || highestAcrossAll >= 75;

    let title = "";
    if (delta > 2) {
      title = peakMinutes > 0
        ? `Pressure Expected to Rise in ~${peakMinutes} Minutes`
        : `Elevated Peak Pressure Active`;
    } else if (delta < -2) {
      title = `Pressure Expected to Ease in ~15 Minutes`;
    } else {
      if (current >= 85) {
        title = `Critical Pressure Persisting Across Monitored Corridor`;
      } else if (current >= 75) {
        title = `Elevated Pressure Persisting Across Monitored Corridor`;
      } else {
        title = `Pressure Expected to Remain Stable`;
      }
    }

    let subtitle = "";
    if (delta > 2) {
      subtitle = `${primary.resourceName} at ${current}% now → projected to reach peak ${peakVal}% at +${peakMinutes} min. Monitored corridor demand rising under ${activeScenario.replace(/_/g, " ").toLowerCase()} scenario.`;
    } else if (delta < -2) {
      subtitle = `${primary.resourceName} at ${current}% now → projected to ease to ${peakVal}% at +${peakMinutes} min as corridor egress stabilizes.`;
    } else {
      subtitle = `${primary.resourceName} at ${current}% now with steady demand across +30 min horizon. No abrupt surge detected under current signals.`;
    }

    return {
      title,
      subtitle,
      peakVal,
      peakTime: peakPt.label,
      isCritical,
      isHigh,
    };
  }, [predictions, activeScenario]);

  // 4. Compact Key Forecast Changes
  const keyChanges = useMemo(() => {
    return predictions.map(p => {
      const nodeMeta = TARGET_PREDICTION_NODES.find(n => n.id === p.resourceId);
      const current = p.current;
      const p15 = p.points[1]?.pressure ?? current;
      const delta = p15 - current;

      return {
        id: p.resourceId,
        name: p.resourceName,
        role: nodeMeta?.role || "Infrastructure",
        current,
        p15,
        delta,
        statusLabel: getPressureLabel(p15),
        statusClass: getPressureClass(p15),
        color: p.color,
      };
    });
  }, [predictions]);

  // Top pending recommendation for the next-action transition
  const primaryRec = recommendations.find(r => r.status === "PENDING") || recommendations[0];

  return (
    <div className={styles.page}>

      {/* FORECAST HEADLINE HERO — DERIVED DIRECTLY FROM DATA */}
      <div className={styles.forecastHeadlineBanner}>
        <div className={styles.headlineMain}>
          <div className={styles.headlineTagRow}>
            <span className="pill pill-critical" style={{ fontSize: 10 }}>FORWARD FORECAST</span>
            {simulationState.minutesElapsed > 0 && (
              <span className="pill pill-live">SIM: +{Math.round(simulationState.minutesElapsed)} MIN</span>
            )}
            {redistributionApplied && (
              <span className="pill pill-live">REDISTRIBUTION ACTIVE</span>
            )}
            <ConfidenceBadge source="SIMULATED" />
          </div>
          <h1 className={styles.headlineTitle}>{headlineData.title}</h1>
          <p className={styles.headlineSubtitle}>{headlineData.subtitle}</p>
        </div>

        <div className={styles.headlineMetricBox}>
          <span className={styles.headlineMetricSub}>PEAK FORECAST</span>
          <span
            className={styles.headlineMetricVal}
            style={{
              color: headlineData.peakVal >= 85 ? "var(--red)" : headlineData.peakVal >= 70 ? "var(--yellow-state)" : "var(--green)",
            }}
          >
            {headlineData.peakVal}%
          </span>
          <span className={styles.headlineMetricSub}>AT {headlineData.peakTime}</span>
        </div>
      </div>

      <PageHeader
        category="PREDICT"
        title="Predictions"
        subtitle="Forward-looking capacity demand, key zone shifts, and intervention pathways."
        actions={<></>}
      />

      {/* 01 · FORECAST CHART — VISUAL CORE */}
      <div className={styles.chartCard}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionHeaderTitle}>01 · PROJECTED PRESSURE OVER TIME</h2>
          <span className="text-meta">Now → +60 Min Horizon</span>
        </div>
        <p className={styles.chartNote}>
          Forward demand trajectory across monitored transport and perimeter nodes based on rolling-window egress rates.
        </p>
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

      {/* 02 · KEY FORECAST CHANGES — COMPACT SCANNABLE ROWS */}
      <div className={styles.changesCard}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionHeaderTitle}>02 · KEY FORECAST CHANGES</h2>
          <span className="text-meta">Immediate Shift (+15 Min)</span>
        </div>

        <div className={styles.changesTable}>
          <div className={styles.changesHeaderRow}>
            <span>MONITORED ZONE</span>
            <span>NOW</span>
            <span>+15 MIN</span>
            <span>CHANGE</span>
            <span className={styles.statusColHide}>STATUS</span>
          </div>

          {keyChanges.map(zone => {
            const deltaClass = zone.delta > 0 ? styles.deltaInc : zone.delta < 0 ? styles.deltaDec : styles.deltaStable;

            return (
              <div key={zone.id} className={styles.changesRow}>
                <div className={styles.zoneNameCell}>
                  <span className={styles.zoneNameText}>{zone.name}</span>
                  <span className={styles.zoneRoleText}>{zone.role}</span>
                </div>

                <span className={styles.valCell} style={{ color: getPressureColor(zone.current) }}>
                  {zone.current}%
                </span>

                <span className={styles.valCell} style={{ color: getPressureColor(zone.p15) }}>
                  {zone.p15}%
                </span>

                <div>
                  <span className={`${styles.deltaBadge} ${deltaClass}`}>
                    {zone.delta > 0 ? `+${zone.delta}% Rise` : zone.delta < 0 ? `${zone.delta}% Ease` : "Stable (±0%)"}
                  </span>
                </div>

                <div className={styles.statusColHide}>
                  <span className={`pill ${zone.statusClass}`} style={{ fontSize: 9, padding: "2px 6px" }}>
                    {zone.statusLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 03 · NEXT ACTION CTA — FOCUSED TRANSITION */}
      <div className={styles.nextActionCard}>
        <div className={styles.nextActionContent}>
          <span className={styles.nextActionTag}>NEXT STEP · SIMULATE &amp; DECIDE</span>
          <h3 className={styles.nextActionTitle}>Test Counterfactual Interventions</h3>
          <p className={styles.nextActionDesc}>
            Evaluate gate hold, train schedule, or taxi redistribution interventions against these forward demand curves before issuing operational orders.
          </p>
        </div>

        <div className={styles.nextActionButtons}>
          <Link
            href={`/organizer/simulation?rec=${primaryRec?.id || "REC1"}`}
            className="btn btn-yellow btn-md"
            style={{ fontWeight: 700 }}
          >
            TEST AN INTERVENTION →
          </Link>
          <Link
            href="/organizer/recommendations"
            className={styles.nextActionSecondaryLink}
          >
            VIEW RECOMMENDATIONS →
          </Link>
        </div>
      </div>

      {/* 04 · COLLAPSIBLE AUDIT & METHODOLOGY ACCORDION (SECONDARY) */}
      <div className={styles.auditAccordion}>
        <button
          type="button"
          className={styles.auditToggle}
          onClick={() => setShowAuditDetails(!showAuditDetails)}
          aria-expanded={showAuditDetails}
        >
          <span className={styles.auditToggleLabel}>
            {showAuditDetails ? "▼ Hide Technical Data & Methodology" : "▶ View Detailed Data Matrix & Forecast Methodology"}
          </span>
          <span className="text-meta">Audit / Analytical Provenance</span>
        </button>

        {showAuditDetails && (
          <div className={styles.auditBody}>
            {/* FULL DATA MATRIX */}
            <div className={styles.tableWrap}>
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

            {/* METHODOLOGY SPECIFICATION */}
            <div className={styles.techGrid}>
              <div className={styles.techItem}>
                <span className={styles.techLabel}>FORECAST ENGINE</span>
                <span className={styles.techVal}>forecastingService v1</span>
                <span className={styles.techDesc}>Rolling-window trend analysis with deterministic scenario multipliers</span>
              </div>
              <div className={styles.techItem}>
                <span className={styles.techLabel}>SIGNAL INPUTS</span>
                <span className={styles.techVal}>Multi-Sensor Ingestion</span>
                <span className={styles.techDesc}>Live turnstiles, camera headcount, and probe observations</span>
              </div>
              <div className={styles.techItem}>
                <span className={styles.techLabel}>ACTIVE SCENARIO</span>
                <span className={styles.techVal}>{activeScenario}</span>
                <span className={styles.techDesc}>Scenario adjustment applied across +15m, +30m, and +60m horizons</span>
              </div>
              <div className={styles.techItem}>
                <span className={styles.techLabel}>SIMULATION STATE</span>
                <span className={styles.techVal}>+{Math.round(simulationState.minutesElapsed)} min</span>
                <span className={styles.techDesc}>Synchronized with What-If simulator engine</span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
