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
  const { activeScenario, recommendations } = useApp();
  const resources = getResources(activeScenario);
  const kpis = getScenarioKPIs(activeScenario);
  const alerts = getAlerts(activeScenario);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const topRec = recommendations.find(r => r.status === "PENDING");

  return (
    <div className={styles.page}>
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
          subtitle="usable resources"
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
