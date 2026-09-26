"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/state/AppContext";
import PageHeader from "@/components/ui/PageHeader";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import { ChevronDown, ChevronUp } from "lucide-react";
import styles from "./recommendations.module.css";

export default function RecommendationsPage() {
  const router = useRouter();
  const {
    recommendations,
    zones,
    approveRecommendation,
    rejectRecommendation,
    isRecommendationApproved,
    auditRecords,
    recommendationSource,
    aiPlanSummary,
    aiModelUsed,
    isGeneratingAiPlan,
    regenerateAiRecommendations
  } = useApp();
  const [approving, setApproving] = useState<string | null>(null);
  const [justApproved, setJustApproved] = useState<string | null>(null);
  const [expandedRecs, setExpandedRecs] = useState<Set<string>>(new Set());

  const handleApprove = (id: string) => { setApproving(id); };
  const handleConfirmApprove = (id: string) => {
    approveRecommendation(id);
    setApproving(null);
    setJustApproved(id);
    setTimeout(() => setJustApproved(null), 4000);
  };

  const toggleExpand = (id: string) => {
    setExpandedRecs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pendingCount = recommendations.filter(r => r.status === "PENDING").length;
  const approvedCount = recommendations.filter(r => r.status === "APPROVED").length;
  const rejectedCount = recommendations.filter(r => r.status === "REJECTED").length;
  const primaryRec = recommendations.find(r => r.status === "PENDING") || recommendations[0];

  return (
    <div className={styles.page}>
      <PageHeader
        category="DECIDE"
        title="Action Recommendations"
        subtitle="AI recommends. Humans decide. Verified operational interventions requiring explicit operator review."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className={`pill ${recommendationSource === "AI" ? "pill-live" : recommendationSource === "CACHED_AI" ? "pill-predicted" : "pill-watch"}`}
              style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}
            >
              {recommendationSource === "AI"
                ? `⚡ AI PLANNER (${aiModelUsed?.toUpperCase() || "GEMINI FLASH"})`
                : recommendationSource === "CACHED_AI"
                ? `⚡ CACHED AI (${aiModelUsed?.toUpperCase() || "GEMINI FLASH"})`
                : "⚙ DETERMINISTIC FALLBACK"}
            </span>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => regenerateAiRecommendations()}
              disabled={isGeneratingAiPlan}
              title="Request a fresh AI recommendation evaluation from live operational state"
            >
              {isGeneratingAiPlan ? "ANALYZING..." : "↻ EVALUATE WITH AI"}
            </button>
            <ConfidenceBadge source="SIMULATED" />
          </div>
        }
      />

      {/* AI PLAN CONTEXT */}
      {aiPlanSummary && (
        <div style={{
          background: "var(--surface-sunken)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
          color: "var(--ink-muted)"
        }}>
          <div>
            <span style={{ fontWeight: 700, color: "var(--ink)", marginRight: 8 }}>Operational Context:</span>
            <span>{aiPlanSummary}</span>
          </div>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--ink-faint)" }}>
            SOURCE: {recommendationSource}{aiModelUsed && recommendationSource !== "DETERMINISTIC_FALLBACK" ? ` · ${aiModelUsed}` : ""}
          </span>
        </div>
      )}

      {/* 1. SUMMARY STRIP */}
      <div className={styles.summaryStrip}>
        <div className={styles.summaryMetric}>
          <span className={styles.summaryMetricVal} style={{ color: pendingCount > 0 ? "var(--yellow)" : "var(--white)" }}>{pendingCount}</span>
          <span className={styles.summaryMetricLabel}>PENDING APPROVAL</span>
        </div>
        <div className={styles.summaryMetric}>
          <span className={styles.summaryMetricVal} style={{ color: approvedCount > 0 ? "#4ade80" : "var(--white)" }}>{approvedCount}</span>
          <span className={styles.summaryMetricLabel}>APPROVED & ACTIVE</span>
        </div>
        <div className={styles.summaryMetric}>
          <span className={styles.summaryMetricVal}>{rejectedCount}</span>
          <span className={styles.summaryMetricLabel}>REJECTED</span>
        </div>
        <div className={styles.summaryMetric}>
          <span className={styles.summaryMetricVal}>{auditRecords.length}</span>
          <span className={styles.summaryMetricLabel}>AUDIT RECORDS</span>
        </div>
      </div>

      {/* 2. PRIMARY RECOMMENDATION HERO */}
      {primaryRec && (
        <div className={styles.primaryRecHero}>
          <div className={styles.primaryRecHeroHeader}>
            <span className={styles.primaryRecHeroTitle}>
              PRIMARY RECOMMENDATION — AWAITING OPERATOR DECISION
            </span>
            {primaryRec.status === "APPROVED" ? (
              <span className="pill pill-live">● APPROVED & PUBLISHED</span>
            ) : (
              <span className="pill pill-yellow">HUMAN APPROVAL REQUIRED</span>
            )}
          </div>

          <div className={styles.primaryRecHeroBody}>
            <div>
              <h2 className={styles.primaryRecActionText}>{primaryRec.title}</h2>
              <p className={styles.primaryRecActionSub}>{primaryRec.action}</p>
            </div>

            <div className={styles.primaryRecImpact}>
              <span className={styles.primaryRecImpactLabel}>EXPECTED RELIEF</span>
              <span className={styles.primaryRecImpactVal}>
                {primaryRec.expectedImpact[0]?.before}% → {primaryRec.expectedImpact[0]?.after}%
              </span>
              <div className={styles.primaryRecActions}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => router.push(`/organizer/simulation?rec=${primaryRec.id}`)}
                >
                  SIMULATE
                </button>
                <button className="btn btn-yellow btn-sm" onClick={() => handleApprove(primaryRec.id)}>
                  APPROVE
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => rejectRecommendation(primaryRec.id)}
                >
                  REJECT
                </button>
              </div>
            </div>
          </div>

          {/* Expand to see full details */}
          <button
            className={styles.expandToggle}
            onClick={() => toggleExpand(primaryRec.id)}
          >
            <span>{expandedRecs.has(primaryRec.id) ? "COLLAPSE DETAILS" : "EXPAND: REASON · TRADE-OFF · ATTENDEE MESSAGE · IMPACT DETAIL"}</span>
            {expandedRecs.has(primaryRec.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expandedRecs.has(primaryRec.id) && (
            <div className={styles.expandBody}>
              <div className={styles.recGrid}>
                <div className={styles.recSection}>
                  <span className="text-meta">Problem</span>
                  <p className={styles.recText}>{primaryRec.problem}</p>
                </div>
                <div className={styles.recSection}>
                  <span className="text-meta">Reason</span>
                  <p className={styles.recText}>{primaryRec.reason}</p>
                </div>
                <div className={styles.recSection}>
                  <span className="text-meta">Trade-off</span>
                  <p className={styles.recText}>{primaryRec.tradeOff}</p>
                </div>
              </div>

              {primaryRec.attendeeMessage && (
                <div className={styles.attendeeNote}>
                  <span className={styles.attendeeNoteLabel}>Attendee Message (if approved)</span>
                  <p>{primaryRec.attendeeMessage}</p>
                </div>
              )}

              {primaryRec.evidence && primaryRec.evidence.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
                    Telemetry Evidence:
                  </span>
                  {primaryRec.evidence.map((ev, i) => (
                    <span key={i} className="pill" style={{ fontSize: 10, background: "var(--surface-sunken)", color: "var(--ink)" }}>
                      {ev}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. ALL RECOMMENDATIONS */}
      <div className={styles.list}>
        {recommendations.map((rec, idx) => {
          const approved = rec.status === "APPROVED";
          const rejected = rec.status === "REJECTED";
          const isExpanded = expandedRecs.has(rec.id);
          if (rec.id === primaryRec?.id && rec.status === "PENDING") return null; // already shown above

          return (
            <div key={rec.id} className={`${styles.recCard} ${approved ? styles.recApproved : ""} ${rejected ? styles.recRejected : ""}`}>
              <div className={styles.recHeader}>
                <div className={styles.recMeta}>
                  <span className={styles.recNum}>RECOMMENDATION {String(idx + 1).padStart(2, "0")}</span>
                  <span className={`pill ${rec.type === "REDISTRIBUTE" ? "pill-high" : rec.type === "TRANSPORT" ? "pill-predicted" : "pill-watch"}`}>{rec.type}</span>
                  <span className={`pill ${rec.confidence === "HIGH" ? "pill-live" : "pill-watch"}`}>Confidence: {rec.confidence}</span>
                  {rec.actionType && (
                    <span className="pill" style={{ background: "var(--surface-sunken)", color: "var(--ink-faint)", fontSize: 10, fontFamily: "var(--font-mono)" }}>
                      {rec.actionType}
                    </span>
                  )}
                </div>
                {approved && <span className="pill pill-live">● ACTIVE · Operational intervention active in live simulation</span>}
                {rejected && <span className="pill bg-unknown">✗ REJECTED</span>}
              </div>

              <h2 className={styles.recTitle}>{rec.title}</h2>

              {/* PRIMARY SURFACE */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  <span className="text-meta">Recommended Action</span>
                  <p className={`${styles.recText} ${styles.recAction}`}>{rec.action}</p>
                </div>
                <div className={styles.impactSection} style={{ flexShrink: 0 }}>
                  {approved ? (
                    <div style={{ borderLeft: "3px solid var(--green)", paddingLeft: 12 }}>
                      <span className="text-meta" style={{ color: "var(--green)", fontWeight: 700 }}>● OBSERVED IMPACT (LIVE)</span>
                      <div className={styles.impactGrid} style={{ marginTop: 6 }}>
                        {rec.expectedImpact.map(imp => {
                          const matchedZone = zones.find(z =>
                            z.name.toLowerCase().includes(imp.resourceName.toLowerCase()) ||
                            imp.resourceName.toLowerCase().includes(z.name.toLowerCase()) ||
                            z.id.toLowerCase().includes(imp.resourceName.toLowerCase())
                          );
                          const beforePressure = rec.baselines?.[matchedZone?.id || ""]?.pressure ?? imp.before;
                          const currentPressure = matchedZone?.pressure ?? imp.before;
                          const delta = currentPressure - beforePressure;
                          return (
                            <div key={imp.resourceName} className={styles.impactCard} style={{ borderColor: delta <= 0 ? "var(--green)" : "var(--amber)" }}>
                              <span className={styles.impactResource}>{imp.resourceName}</span>
                              <div className={styles.impactChange}>
                                <span className={styles.impactBefore}>{beforePressure}%</span>
                                <span className={styles.impactArrow}>→</span>
                                <span className={styles.impactAfter} style={{ color: delta < 0 ? "var(--green)" : delta > 0 ? "var(--amber)" : "var(--ink)" }}>
                                  {currentPressure}%
                                </span>
                              </div>
                              <span className={styles.impactDelta} style={{ color: delta < 0 ? "var(--green)" : delta > 0 ? "var(--red)" : "var(--ink-muted)", fontWeight: 700 }}>
                                {delta < 0 ? `↓ ${Math.abs(delta)}% RELIEF` : delta > 0 ? `↑ +${delta}% LOAD` : "→ 0% STABLE"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-meta">Expected Impact</span>
                      <div className={styles.impactGrid} style={{ marginTop: 6 }}>
                        {rec.expectedImpact.map(imp => (
                          <div key={imp.resourceName} className={styles.impactCard}>
                            <span className={styles.impactResource}>{imp.resourceName}</span>
                            <div className={styles.impactChange}>
                              <span className={styles.impactBefore}>{imp.before}%</span>
                              <span className={styles.impactArrow}>→</span>
                              <span className={styles.impactAfter}>{imp.after}%</span>
                            </div>
                            <span className={styles.impactDelta}>
                              {imp.after > imp.before ? `+${imp.after - imp.before}%` : `${imp.after - imp.before}%`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* EXPAND TOGGLE for secondary details */}
              {!rejected && (
                <button className={styles.expandToggle} onClick={() => toggleExpand(rec.id)}>
                  <span>{isExpanded ? "COLLAPSE DETAILS" : "EXPAND: REASON · TRADE-OFF · EVIDENCE · ATTENDEE MESSAGE"}</span>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}

              {isExpanded && (
                <div className={styles.expandBody}>
                  <div className={styles.recGrid}>
                    <div className={styles.recSection}>
                      <span className="text-meta">Problem</span>
                      <p className={styles.recText}>{rec.problem}</p>
                    </div>
                    <div className={styles.recSection}>
                      <span className="text-meta">Reason</span>
                      <p className={styles.recText}>{rec.reason}</p>
                    </div>
                    <div className={styles.recSection}>
                      <span className="text-meta">Trade-off</span>
                      <p className={styles.recText}>{rec.tradeOff}</p>
                    </div>
                  </div>

                  {rec.evidence && rec.evidence.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
                        Telemetry Evidence:
                      </span>
                      {rec.evidence.map((ev, i) => (
                        <span key={i} className="pill" style={{ fontSize: 10, background: "var(--surface-sunken)", color: "var(--ink)" }}>
                          {ev}
                        </span>
                      ))}
                    </div>
                  )}

                  {rec.attendeeMessage && (
                    <div className={styles.attendeeNote}>
                      <span className={styles.attendeeNoteLabel}>Attendee Message (if approved)</span>
                      <p>{rec.attendeeMessage}</p>
                    </div>
                  )}
                </div>
              )}

              {!approved && !rejected && (
                <div className={styles.recActions}>
                  <button className="btn btn-outline btn-sm" onClick={() => router.push(`/organizer/simulation?rec=${rec.id}`)}>
                    SIMULATE
                  </button>
                  <button className="btn btn-yellow btn-sm" onClick={() => handleApprove(rec.id)}>
                    APPROVE
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => router.push(`/organizer/simulation?rec=${rec.id}&modify=true`)}>
                    MODIFY
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => rejectRecommendation(rec.id)}>
                    REJECT
                  </button>
                </div>
              )}

              {justApproved === rec.id && (
                <div className={styles.approvedBanner}>
                  <span>✓ Approved and published to the attendee platform.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* AUDIT TRAIL */}
      <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--ink)" }}>Operational Audit Trail</h2>
            <p style={{ fontSize: 12, color: "var(--ink-muted)" }}>Immutable human-in-the-loop decision log tracking approvals, rejections, and state transformations.</p>
          </div>
          <span className="pill pill-live" style={{ fontSize: 10 }}>{auditRecords.length} AUDIT RECORDS</span>
        </div>

        {auditRecords.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", background: "var(--surface-sunken)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border)" }}>
            <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>No operational decisions logged in current session. Approve or reject a recommendation above to record an audit entry.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {auditRecords.map(log => (
              <div key={log.id} style={{
                background: "var(--paper)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`pill ${log.category === "RECOMMENDATION_APPROVAL" ? "pill-live" : "pill-critical"}`} style={{ fontSize: 9 }}>
                      {log.category}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{log.changeSummary}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 4 }}>
                    Actor: {log.actorId} ({log.actorRole}) · Target: {log.targetEntityType} #{log.targetEntityId}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--ink-faint)" }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* APPROVAL MODAL */}
      {approving && (
        <div className="modal-overlay" onClick={() => setApproving(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            {(() => {
              const rec = recommendations.find(r => r.id === approving);
              if (!rec) return null;
              return (
                <>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Approve Recommendation?</h2>
                  <p style={{ fontSize: 14, color: "var(--ink-muted)", marginBottom: 24 }}>
                    This will publish the recommendation to eligible attendees on the attendee platform.
                  </p>
                  <div style={{ background: "var(--paper)", borderRadius: "var(--radius-sm)", padding: 16, marginBottom: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Action</span>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>{rec.action}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Expected Impact</span>
                      {rec.expectedImpact.map(imp => (
                        <div key={imp.resourceName} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}>
                          <span>{imp.resourceName}</span>
                          <span style={{ fontWeight: 700, color: "var(--green)" }}>{imp.before}% → {imp.after}%</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Trade-off</span>
                      <p style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 2 }}>{rec.tradeOff}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button className="btn btn-outline" onClick={() => setApproving(null)}>BACK</button>
                    <button className="btn btn-yellow" style={{ flex: 1 }} onClick={() => handleConfirmApprove(approving)}>
                      APPROVE &amp; PUBLISH
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
