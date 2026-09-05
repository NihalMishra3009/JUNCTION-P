"use client";
import { useState } from "react";
import { useApp } from "@/state/AppContext";
import { getAttendeeRoutes } from "@/data/mockRoutes";
import { AttendeeRoute } from "@/types";
import styles from "./plan.module.css";

export default function PlanPage() {
  const { activeScenario, isRecommendationApproved, selectAttendeeRoute, attendeeSelectedRouteId } = useApp();
  const rec1Approved = isRecommendationApproved("REC1");
  const routes = getAttendeeRoutes(activeScenario, rec1Approved);
  const [selectedRoute, setSelectedRoute] = useState<AttendeeRoute | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleSelect = (r: AttendeeRoute) => { setSelectedRoute(r); setConfirmed(false); };
  const handleChoose = (r: AttendeeRoute) => {
    selectAttendeeRoute(r.id);
    setConfirmed(true);
  };

  const crowdColor = (l: string) => l === "HIGH" ? "var(--red)" : l === "MEDIUM" ? "var(--yellow-state)" : "var(--green)";

  if (selectedRoute) {
    return (
      <div className={styles.page}>
        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedRoute(null)} style={{ alignSelf: "flex-start" }}>← Back to options</button>

        <div className={styles.routeDetail}>
          <div className={styles.routeDetailHeader}>
            <span className={`pill ${selectedRoute.recommended ? "pill-yellow" : "pill-simulated"}`}>
              {selectedRoute.type === "FASTEST" ? "FASTEST" : selectedRoute.type === "BALANCED" ? "BALANCED ★" : "LOW CROWD"}
            </span>
            <span className={styles.detailTime}>{selectedRoute.totalTime} MIN</span>
          </div>

          <div className={styles.routeSteps}>
            {selectedRoute.steps.map((step, i) => (
              <div key={i} className={styles.routeStep}>
                <div className={styles.stepLine}>
                  <div className={styles.stepDot} />
                  {i < selectedRoute.steps.length - 1 && <div className={styles.stepConnector} />}
                </div>
                <div className={styles.stepContent}>
                  <span className={styles.stepFrom}>{step.from}</span>
                  <span className={styles.stepMode}>{step.mode} · {step.duration} min</span>
                  {i === selectedRoute.steps.length - 1 && (
                    <span className={styles.stepFrom}>Wankhede Stadium</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.routeStats}>
            {[
              { label: "Crowd", value: selectedRoute.crowdLevel, color: crowdColor(selectedRoute.crowdLevel) },
              { label: "Traffic", value: selectedRoute.congestionLevel },
              { label: "Transfers", value: String(selectedRoute.transfers) },
              { label: "Walking", value: `${selectedRoute.walkingTime} min` },
              { label: "Reliability", value: selectedRoute.reliability },
            ].map(s => (
              <div key={s.label} className={styles.statItem}>
                <span className={styles.statLabel}>{s.label}</span>
                <span className={styles.statValue} style={{ color: s.color || "var(--ink)" }}>{s.value}</span>
              </div>
            ))}
          </div>

          <div className={styles.whyBox}>
            <span className={styles.whyTitle}>WHY THIS ROUTE?</span>
            <p className={styles.whyText}>{selectedRoute.explanation}</p>
          </div>

          {attendeeSelectedRouteId === selectedRoute.id ? (
            <div className={styles.confirmedBanner} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>✓</span>
                <span style={{ fontWeight: 700 }}>Route Confirmed: {selectedRoute.label}</span>
              </div>
              {selectedRoute.id === "BALANCED" && rec1Approved && (
                <div style={{ background: "rgba(255,255,255,0.8)", borderRadius: 6, padding: "8px 12px", marginTop: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--green)", letterSpacing: "0.05em" }}>
                    Closed-Loop Destination Impact
                  </span>
                  <div style={{ fontSize: 12, color: "var(--ink)", marginTop: 2, fontWeight: 600 }}>
                    Churchgate: 94% → 76% · Dadar: 58% → 69%
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
                    ~1,200 attendees redistributed · Average detour: +8 min
                  </div>
                </div>
              )}
              <span style={{ fontSize: 11, color: "var(--green)", opacity: 0.9 }}>
                Propagated to Destination State · Organizer Command Center updated in real time.
              </span>
            </div>
          ) : (
            <button className="btn btn-yellow" style={{ width: "100%" }} onClick={() => handleChoose(selectedRoute)}>
              CHOOSE THIS ROUTE
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.planHeader}>
        <h1 className={styles.planTitle}>Plan Your Journey</h1>
        <div className={styles.planInputs}>
          <div className={styles.inputRow}>
            <span className={styles.inputLabel}>FROM</span>
            <div className={styles.inputBox}>Harbour Line Area</div>
          </div>
          <div className={styles.inputRow}>
            <span className={styles.inputLabel}>TO</span>
            <div className={styles.inputBox}>Wankhede Stadium</div>
          </div>
        </div>
      </div>

      {rec1Approved && (
        <div className={styles.orgBanner}>
          <span className={styles.orgBannerIcon}>◆</span>
          <div>
            <span className={styles.orgBannerTitle}>Organizer recommendation active</span>
            <p className={styles.orgBannerMsg}>Dadar Station route has been recommended due to rising Churchgate pressure.</p>
          </div>
        </div>
      )}

      <div className={styles.routeOptions}>
        {routes.map(r => (
          <div
            key={r.id}
            className={`${styles.routeCard} ${r.recommended ? styles.routeRecommended : ""} ${attendeeSelectedRouteId === r.id ? styles.routeSelected : ""}`}
            onClick={() => handleSelect(r)}
          >
            <div className={styles.routeCardHeader}>
              <div className={styles.routeCardType}>
                <span className={`pill ${r.type === "FASTEST" ? "pill-predicted" : r.type === "BALANCED" ? "pill-yellow" : "pill-live"}`}>
                  {r.label}{r.recommended ? " ★" : ""}
                </span>
                {attendeeSelectedRouteId === r.id && <span className="pill pill-live">Your choice</span>}
              </div>
              <span className={styles.routeTime}>{r.totalTime} min</span>
            </div>

            <div className={styles.routeCardMeta}>
              <span className={styles.routeMeta} style={{ color: crowdColor(r.crowdLevel) }}>
                {r.crowdLevel === "HIGH" ? "High crowd" : r.crowdLevel === "MEDIUM" ? "Medium crowd" : "Low crowd"}
              </span>
              <span className={styles.routeMetaDot}>·</span>
              <span className={styles.routeMeta}>{r.transfers} transfer{r.transfers !== 1 ? "s" : ""}</span>
              <span className={styles.routeMetaDot}>·</span>
              <span className={styles.routeMeta}>{r.walkingTime} min walk</span>
            </div>

            <div className={styles.routeCardSteps}>
              {r.steps.map((s, i) => (
                <span key={i} className={styles.routeStep2}>
                  {s.from}
                  {i < r.steps.length - 1 && <span className={styles.stepSep}>→</span>}
                </span>
              ))}
              <span className={styles.routeStep2}>Wankhede</span>
            </div>

            {r.recommended && (
              <p className={styles.recExplanation}>{r.explanation}</p>
            )}

            <button className={`btn ${r.recommended ? "btn-yellow" : "btn-outline"} btn-sm`} style={{ alignSelf: "flex-end" }}>
              Select →
            </button>
          </div>
        ))}
      </div>

      <div className={styles.simLabel}>
        <span className="simulated-env-label">
          <span className="simulated-dot" />
          Routes are simulated based on current scenario conditions
        </span>
      </div>
    </div>
  );
}
