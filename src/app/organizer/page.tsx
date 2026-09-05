"use client";
import { useState } from "react";
import { useApp } from "@/state/AppContext";
import { getResources, getScenarioKPIs, getAlerts } from "@/services/mockDataService";
import { Resource } from "@/types";
import KPICard from "@/components/ui/KPICard";
import DestinationMap from "@/components/organizer/DestinationMap";
import ResourcePanel from "@/components/organizer/ResourcePanel";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import Link from "next/link";
import styles from "./dashboard.module.css";

export default function OrganizerDashboard() {
  const {
    activeScenario,
    recommendations,
    resources,
    kpis,
    alerts,
    redistributionApplied,
    redistributionImpact,
  } = useApp();
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const topRec = recommendations.find(r => r.status === "PENDING");

  return (
    <div className={styles.page}>
      {/* CLOSED-LOOP IMPACT BANNER */}
      {redistributionApplied && redistributionImpact && (
        <div style={{
          background: "var(--green-bg)",
          border: "1.5px solid var(--green)",
          borderRadius: "var(--radius-md)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          boxShadow: "var(--shadow-sm)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>⚡</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong style={{ fontSize: 14, color: "var(--ink)" }}>Closed-Loop Orchestration Active</strong>
                <span className="pill pill-live">ATTENDEE CHOICES APPLIED</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 2 }}>
                Attendees adopted the recommended Balanced Route toward Dadar. Destination state has been dynamically updated.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase" }}>Churchgate</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green)" }}>
                {redistributionImpact.churchgateBefore}% → {redistributionImpact.churchgateAfter}%
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase" }}>Dadar</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                {redistributionImpact.dadarBefore}% → {redistributionImpact.dadarAfter}%
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase" }}>Redistributed</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                ~{redistributionImpact.visitorsRedistributed.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase" }}>Avg Detour</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                +{redistributionImpact.travelDeltaMin} min
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI ROW */}
      <div className={styles.kpiRow}>
        <KPICard
          label="Destination Pressure"
          value={`${kpis.destinationPressure}%`}
          trend={`${Math.abs(kpis.destinationPressureTrend)}%`}
          trendUp={kpis.destinationPressureTrend > 0}
          subtitle="avg across impact zone"
          accent
        />
        <KPICard
          label="Predicted Bottleneck"
          value={kpis.predictedBottleneck}
          subtitle={`${kpis.predictedBottleneckPressure}% in ${kpis.predictedBottleneckMinutes} min`}
          trend="Increasing"
          trendUp
        />
        <KPICard
          label="Available Capacity"
          value={kpis.availableCapacity.toLocaleString()}
          subtitle="usable resources + hotels"
        />
        <KPICard
          label="Active Alerts"
          value={`0${kpis.activeAlerts}`}
          subtitle={`${kpis.highAlerts} high · ${kpis.watchAlerts} watch`}
          trendUp={kpis.highAlerts > 0}
        />
      </div>

      {/* MAP + PANEL ROW */}
      <div className={styles.mapRow}>
        <div className={styles.mapArea}>
          <DestinationMap
            resources={resources}
            onSelectResource={r => setSelectedResource(r)}
            selectedId={selectedResource?.id || null}
          />
        </div>

        <div className={styles.rightPanel}>
          {selectedResource ? (
            <ResourcePanel
              resource={selectedResource}
              scenario={activeScenario}
              onClose={() => setSelectedResource(null)}
            />
          ) : (
            <div className={styles.intelPanel}>
              {/* ALERTS */}
              <div className={styles.intelSection}>
                <div className={styles.intelSectionHeader}>
                  <span className="text-meta">Active Alerts</span>
                  <span className={`pill ${kpis.highAlerts > 0 ? "pill-critical" : "pill-watch"}`}>{kpis.activeAlerts}</span>
                </div>
                {alerts.slice(0, 3).map(a => (
                  <div key={a.id} className={`${styles.alertCard} ${styles[`alert_${a.severity.toLowerCase()}`]}`}>
                    <div className={styles.alertHeader}>
                      <span className={`pill ${a.severity === "CRITICAL" ? "pill-critical" : a.severity === "HIGH" ? "pill-high" : "pill-watch"}`}>
                        {a.category}
                      </span>
                      <span className={styles.alertTime}>{a.timestamp}</span>
                    </div>
                    <span className={styles.alertTitle}>{a.title}</span>
                    <p className={styles.alertMsg}>{a.message}</p>
                  </div>
                ))}
              </div>

              {/* TOP RECOMMENDATION */}
              {topRec && (
                <div className={styles.intelSection}>
                  <div className={styles.intelSectionHeader}>
                    <span className="text-meta">Top Recommendation</span>
                    <span className={`pill pill-${topRec.confidence.toLowerCase() === "high" ? "live" : "watch"}`}>{topRec.confidence}</span>
                  </div>
                  <div className={styles.recPreview}>
                    <span className={styles.recType}>{topRec.type}</span>
                    <h4 className={styles.recTitle}>{topRec.title}</h4>
                    <p className={styles.recProblem}>{topRec.problem}</p>
                    <div className={styles.recImpacts}>
                      {topRec.expectedImpact.map(imp => (
                        <div key={imp.resourceName} className={styles.recImpact}>
                          <span>{imp.resourceName}</span>
                          <span className={styles.impactChange}>{imp.before}% → {imp.after}%</span>
                        </div>
                      ))}
                    </div>
                    <Link href="/organizer/recommendations" className="btn btn-yellow btn-sm" style={{ marginTop: 12 }}>
                      Review Recommendations →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PREDICTION MINI BAR */}
      <div className={styles.predBar}>
        <div className={styles.predBarHeader}>
          <span className="text-meta">Pressure Forecast</span>
          <ConfidenceBadge source="SIMULATED" />
          <Link href="/organizer/predictions" className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}>View Full →</Link>
        </div>
        <div className={styles.predGrid}>
          {resources.slice(0, 5).map(r => {
            const pd = (require("@/data/mockScenarios").SCENARIOS as any)[activeScenario]?.pressure[r.id];
            if (!pd) return null;
            return (
              <div key={r.id} className={styles.predRow}>
                <span className={styles.predName}>{r.shortName}</span>
                {[pd.pressure, pd.predictedPressure15, pd.predictedPressure30, pd.predictedPressure60].map((p: number, i: number) => (
                  <span
                    key={i}
                    className={styles.predCell}
                    style={{ color: p >= 95 ? "var(--red)" : p >= 85 ? "var(--orange)" : p >= 70 ? "var(--yellow-state)" : "var(--green)" }}
                  >
                    {p}%
                  </span>
                ))}
              </div>
            );
          })}
        </div>
        <div className={styles.predHeaders}>
          <span />
          {["NOW", "+15 MIN", "+30 MIN", "+60 MIN"].map(h => (
            <span key={h} className={styles.predHeader}>{h}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
