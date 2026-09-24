"use client";
import { useState, useMemo } from "react";
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
    devices,
    latestObservations,
    hotspots,
    cascadeResult,
    interventions,
    zones,
    auditRecords,
  } = useApp();
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [showCascade, setShowCascade] = useState(false);

  const topRec = recommendations.find(r => r.status === "PENDING");

  // Live device health
  const onlineDevices = useMemo(() => devices.filter(d => d.health.status === "HEALTHY"), [devices]);
  const degradedDevices = useMemo(() => devices.filter(d => d.health.status === "DEGRADED" || d.health.status === "OFFLINE" || d.health.status === "UNHEALTHY"), [devices]);

  // Top hotspot (highest pressure)
  const topHotspot = useMemo(() => {
    if (hotspots.length === 0) return null;
    return [...hotspots].sort((a, b) => b.currentPressure - a.currentPressure)[0];
  }, [hotspots]);

  // Critical zones
  const criticalZones = useMemo(() => zones.filter(z => z.pressureLevel === "CRITICAL" || z.pressureLevel === "HIGH"), [zones]);

  // Cascade pathway nodes
  const cascadeNodes = useMemo(() => {
    if (!cascadeResult) return [];
    return cascadeResult.affectedPathways.flat();
  }, [cascadeResult]);

  return (
    <div className={styles.page}>
      {/* CLOSED-LOOP IMPACT BANNER */}
      {redistributionApplied && redistributionImpact && (
        <div style={{
          background: "var(--green-bg)",
          border: "1.5px solid var(--green)",
          borderRadius: "var(--radius-md)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          boxShadow: "var(--shadow-sm)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong style={{ fontSize: 13, color: "var(--ink)" }}>Closed-Loop Orchestration Active</strong>
                <span className="pill pill-live" style={{ fontSize: 9, padding: "2px 6px" }}>ATTENDEE CHOICES APPLIED</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 1 }}>
                Attendees adopted the recommended Balanced Route toward Dadar. Destination state updated.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase" }}>Churchgate</span>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)" }}>
                {redistributionImpact.churchgateBefore}% → {redistributionImpact.churchgateAfter}%
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase" }}>Dadar</span>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                {redistributionImpact.dadarBefore}% → {redistributionImpact.dadarAfter}%
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase" }}>Redistributed</span>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                ~{redistributionImpact.visitorsRedistributed.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--ink-faint)", textTransform: "uppercase" }}>Avg Detour</span>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
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
              {/* LIVE TELEMETRY & HOTSPOT STATUS CHIPS */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                padding: "8px 12px",
                background: "var(--surface-sunken)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                marginBottom: 0,
              }}>
                <div>
                  <span style={{ fontSize: 10, color: "var(--ink-faint)", textTransform: "uppercase", fontWeight: 700 }}>Telemetry Feeds</span>
                  <div style={{ fontSize: 12, fontWeight: 700, color: degradedDevices.length > 0 ? "var(--orange)" : "var(--ink)", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: degradedDevices.length > 0 ? "var(--orange)" : "var(--green)", animation: "pulse 2s infinite" }} />
                    {onlineDevices.length} Online{degradedDevices.length > 0 ? ` · ${degradedDevices.length} Degraded` : ""}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 1 }}>
                    {latestObservations.length} observations/tick
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: "var(--ink-faint)", textTransform: "uppercase", fontWeight: 700 }}>Active Hotspots</span>
                  <div style={{ fontSize: 12, fontWeight: 700, color: hotspots.length > 0 ? "var(--red)" : "var(--green)", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: hotspots.length > 0 ? "var(--red)" : "var(--green)", animation: hotspots.length > 0 ? "pulse 1.5s infinite" : "none" }} />
                    {hotspots.length > 0 ? `${hotspots.length} Detected` : "None"}
                  </div>
                  {topHotspot && (
                    <div style={{ fontSize: 10, color: "var(--red)", marginTop: 1, fontWeight: 600 }}>
                      ⚠ {topHotspot.name} ({topHotspot.currentPressure}%)
                    </div>
                  )}
                </div>
              </div>

              {/* LIVE ZONE PRESSURE STRIP */}
              <div className={styles.intelSection} style={{ paddingTop: 8, paddingBottom: 8 }}>
                <div className={styles.intelSectionHeader}>
                  <span className="text-meta">Zone Pressure</span>
                  <span className={`pill ${criticalZones.length > 0 ? "pill-critical" : "pill-watch"}`}>{criticalZones.length} stressed</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {zones.slice(0, 5).map(z => (
                    <div key={z.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                        background: z.pressureLevel === "CRITICAL" ? "var(--red)" : z.pressureLevel === "HIGH" ? "var(--orange)" : z.pressureLevel === "WATCH" ? "var(--yellow-state)" : "var(--green)",
                      }} />
                      <span style={{ fontSize: 11, color: "var(--ink-light)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{z.name}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, fontFamily: "var(--font-display)",
                        color: z.pressure >= 90 ? "var(--red)" : z.pressure >= 75 ? "var(--orange)" : z.pressure >= 60 ? "var(--yellow-state)" : "var(--green)",
                      }}>{z.pressure}%</span>
                      <span style={{ fontSize: 9, color: "var(--ink-faint)", width: 16, textAlign: "center" }}>
                        {z.trend === "INCREASING" ? "↑" : z.trend === "DECREASING" ? "↓" : "→"}
                      </span>
                      <ConfidenceBadge source={z.source} />
                    </div>
                  ))}
                </div>
              </div>

              {/* CASCADE PROPAGATION PREVIEW */}
              {cascadeResult && cascadeNodes.length > 0 && (
                <div className={styles.intelSection} style={{ paddingTop: 8, paddingBottom: 8 }}>
                  <div className={styles.intelSectionHeader}>
                    <span className="text-meta">Cascade Propagation</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 10, padding: "2px 6px" }}
                      onClick={() => setShowCascade(!showCascade)}
                    >
                      {showCascade ? "Hide" : "Expand"}
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {(showCascade ? cascadeNodes : cascadeNodes.slice(0, 3)).map((node, i) => (
                      <div key={node.nodeId} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "4px 8px",
                        borderRadius: "var(--radius-sm)",
                        background: i === 0 ? "var(--red-bg)" : "var(--paper)",
                        borderLeft: `3px solid ${node.status === "CRITICAL" ? "var(--red)" : node.status === "HIGH" ? "var(--orange)" : node.status === "WATCH" ? "var(--yellow-state)" : "var(--green)"}`,
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)" }}>{node.label}</div>
                          <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>Lead: +{node.leadTimeMinutes}min</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{
                            fontSize: 12, fontWeight: 700, fontFamily: "var(--font-display)",
                            color: node.projectedPressure >= 90 ? "var(--red)" : node.projectedPressure >= 75 ? "var(--orange)" : "var(--ink)",
                          }}>
                            {node.currentPressure}% → {node.projectedPressure}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                    <ConfidenceBadge source="ESTIMATED" />
                    <span>Confidence: {Math.round((cascadeResult.confidence || 0.88) * 100)}%</span>
                  </div>
                </div>
              )}

              {/* OPERATIONAL INTERVENTIONS */}
              {interventions.length > 0 && (
                <div className={styles.intelSection}>
                  <div className={styles.intelSectionHeader}>
                    <span className="text-meta">AI Interventions</span>
                    <span className="pill pill-critical">{interventions.length} proposed</span>
                  </div>
                  {interventions.slice(0, 2).map(intv => (
                    <div key={intv.id} style={{
                      background: "var(--paper)",
                      borderRadius: "var(--radius-sm)",
                      padding: "8px 10px",
                      borderLeft: `3px solid ${intv.urgency === "CRITICAL" ? "var(--red)" : "var(--orange)"}`,
                      display: "flex", flexDirection: "column", gap: 4,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span className={`pill ${intv.urgency === "CRITICAL" ? "pill-critical" : "pill-high"}`} style={{ fontSize: 9 }}>
                          {intv.urgency} · {intv.type.replace(/_/g, " ")}
                        </span>
                        <span style={{ fontSize: 9, color: "var(--ink-faint)" }}>{intv.status}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", lineHeight: 1.25 }}>{intv.title}</span>
                      <p style={{ fontSize: 11, color: "var(--ink-muted)", lineHeight: 1.3, margin: 0 }}>{intv.rationale}</p>
                      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 10, color: "var(--green)", fontWeight: 600 }}>↓ {intv.expectedPressureReductionPercent}% pressure</span>
                        <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>· {intv.timeToEffectMinutes}min effect</span>
                        <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>· {Math.round(intv.confidenceScore * 100)}% conf</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 9, color: "var(--ink-faint)", fontStyle: "italic" }}>Requires: {intv.approvalRoleRequired} approval</span>
                      </div>
                    </div>
                  ))}
                  <Link href="/organizer/recommendations" className="btn btn-yellow btn-sm" style={{ marginTop: 4, textAlign: "center", fontSize: 11 }}>
                    Review All Interventions →
                  </Link>
                </div>
              )}

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
                    <Link href="/organizer/recommendations" className="btn btn-yellow btn-sm" style={{ marginTop: 6, textAlign: "center" }}>
                      Review Recommendations →
                    </Link>
                  </div>
                </div>
              )}

              {/* AUDIT TRAIL SUMMARY */}
              {auditRecords.length > 0 && (
                <div className={styles.intelSection} style={{ paddingTop: 8, paddingBottom: 8 }}>
                  <div className={styles.intelSectionHeader}>
                    <span className="text-meta">Audit Trail</span>
                    <span className="pill pill-watch">{auditRecords.length} records</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {auditRecords.slice(-3).reverse().map(ar => (
                      <div key={ar.id} style={{
                        fontSize: 10, color: "var(--ink-muted)", lineHeight: 1.3,
                        padding: "3px 6px", background: "var(--paper)", borderRadius: "var(--radius-sm)",
                      }}>
                        <span style={{ fontWeight: 600, color: "var(--ink-light)" }}>{ar.actorRole}</span>{" "}
                        {ar.changeSummary}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* COMPACT PREDICTION BAR */}
      <div className={styles.predBar}>
        <div className={styles.predBarHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="text-meta">Pressure Forecast</span>
            <ConfidenceBadge source="SIMULATED" />
          </div>
          <Link href="/organizer/predictions" className="btn btn-ghost btn-sm">View Full Predictions →</Link>
        </div>
        <div className={styles.predTableWrap}>
          <div className={styles.predHeaders}>
            <span className={styles.predColName}>RESOURCE</span>
            {["NOW", "+15 MIN", "+30 MIN", "+60 MIN"].map(h => (
              <span key={h} className={styles.predHeader}>{h}</span>
            ))}
          </div>
          <div className={styles.predGrid}>
            {resources.slice(0, 4).map(r => {
              const pd = (require("@/data/mockScenarios").SCENARIOS as any)[activeScenario]?.pressure[r.id];
              if (!pd) return null;
              return (
                <div key={r.id} className={styles.predRow}>
                  <span className={styles.predName}>{r.shortName || r.name}</span>
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
        </div>
      </div>
    </div>
  );
}
