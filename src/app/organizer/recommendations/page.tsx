"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/state/AppContext";
import PageHeader from "@/components/ui/PageHeader";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import styles from "./recommendations.module.css";

export default function RecommendationsPage() {
  const router = useRouter();
  const { recommendations, approveRecommendation, rejectRecommendation, isRecommendationApproved, auditRecords } = useApp();
  const [approving, setApproving] = useState<string | null>(null);
  const [justApproved, setJustApproved] = useState<string | null>(null);

  const handleApprove = (id: string) => { setApproving(id); };
  const handleConfirmApprove = (id: string) => {
    approveRecommendation(id);
    setApproving(null);
    setJustApproved(id);
    setTimeout(() => setJustApproved(null), 4000);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        category="DECISIONS"
        title="Action Recommendations"
        subtitle="AI recommends. Humans decide. Verified operational interventions requiring explicit operator review."
        actions={<ConfidenceBadge source="SIMULATED" />}
      />


      <div className={styles.list}>
        {recommendations.map((rec, idx) => {
          const approved = rec.status === "APPROVED";
          const rejected = rec.status === "REJECTED";
          return (
            <div key={rec.id} className={`${styles.recCard} ${approved ? styles.recApproved : ""} ${rejected ? styles.recRejected : ""}`}>
              <div className={styles.recHeader}>
                <div className={styles.recMeta}>
                  <span className={styles.recNum}>RECOMMENDATION {String(idx + 1).padStart(2, "0")}</span>
                  <span className={`pill ${rec.type === "REDISTRIBUTE" ? "pill-high" : rec.type === "TRANSPORT" ? "pill-predicted" : "pill-watch"}`}>{rec.type}</span>
                  <span className={`pill ${rec.confidence === "HIGH" ? "pill-live" : "pill-watch"}`}>Confidence: {rec.confidence}</span>
                </div>
                {approved && <span className="pill pill-live">✓ APPROVED · Published to attendees</span>}
                {rejected && <span className="pill bg-unknown">✗ REJECTED</span>}
              </div>

              <h2 className={styles.recTitle}>{rec.title}</h2>

              <div className={styles.recGrid}>
                <div className={styles.recSection}>
                  <span className="text-meta">Problem</span>
                  <p className={styles.recText}>{rec.problem}</p>
                </div>
                <div className={styles.recSection}>
                  <span className="text-meta">Recommended Action</span>
                  <p className={`${styles.recText} ${styles.recAction}`}>{rec.action}</p>
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

              <div className={styles.impactSection}>
                <span className="text-meta">Expected Impact</span>
                <div className={styles.impactGrid}>
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

              {rec.attendeeMessage && (
                <div className={styles.attendeeNote}>
                  <span className={styles.attendeeNoteLabel}>Attendee Message (if approved)</span>
                  <p>{rec.attendeeMessage}</p>
                </div>
              )}

              {!approved && !rejected && (
                <div className={styles.recActions}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => router.push(`/organizer/simulation?rec=${rec.id}`)}
                  >
                    SIMULATE
                  </button>
                  <button className="btn btn-yellow btn-sm" onClick={() => handleApprove(rec.id)}>
                    APPROVE
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => router.push(`/organizer/simulation?rec=${rec.id}&modify=true`)}
                  >
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

      {/* AUDIT TRAIL LOGGING SECTION (FIX-02) */}
      <div style={{ marginTop: 40, borderTop: "1px solid var(--border)", paddingTop: 24 }}>
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
