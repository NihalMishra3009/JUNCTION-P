"use client";
import { useApp } from "@/state/AppContext";
import { getAlerts } from "@/services/mockDataService";
import { MOCK_EVENT } from "@/data/mockEvent";
import Link from "next/link";
import styles from "./home.module.css";

export default function AttendeeHome() {
  const {
    activeScenario,
    hasAttendeeRecommendation,
    attendeeRecommendationMessage,
    attendeeSelectedRouteId,
    alerts,
  } = useApp();
  const topAlert = alerts[0];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "GOOD MORNING" : hour < 17 ? "GOOD AFTERNOON" : "GOOD EVENING";

  return (
    <div className={styles.page}>
      {/* GREETING */}
      <div className={styles.greeting}>
        <span className={styles.greetText}>{greeting}</span>
        <div className={styles.eventCard}>
          <div className={styles.eventInfo}>
            <span className="pill pill-live" style={{ fontSize: 10 }}>● LIVE</span>
            <h2 className={styles.eventName}>{MOCK_EVENT.name}</h2>
            <span className={styles.eventMeta}>{MOCK_EVENT.venue} · {MOCK_EVENT.startTime} · Gate 3</span>
          </div>
        </div>
      </div>

      {/* ALERT BANNER */}
      {(topAlert || hasAttendeeRecommendation) && (
        <div className={styles.alertBanner}>
          <div className={styles.alertBannerIcon}>!</div>
          <div className={styles.alertBannerContent}>
            <span className={styles.alertBannerTitle}>
              {hasAttendeeRecommendation ? "Organizer recommendation" : topAlert?.title}
            </span>
            <p className={styles.alertBannerMsg}>
              {hasAttendeeRecommendation ? attendeeRecommendationMessage : topAlert?.message}
            </p>
          </div>
          <Link href="/attendee/plan" className="btn btn-yellow btn-sm" style={{ flexShrink: 0 }}>
            See Options
          </Link>
        </div>
      )}

      {/* YOUR JOURNEY */}
      <div className={styles.journeyCard}>
        <span className="text-meta">Your Journey</span>
        <div className={styles.journeyRoute}>
          <div className={styles.journeyFrom}>
            <span className={styles.routeLabel}>FROM</span>
            <span className={styles.routePlace}>Harbour Line Area</span>
          </div>
          <div className={styles.routeArrow}>→</div>
          <div className={styles.journeyTo}>
            <span className={styles.routeLabel}>TO</span>
            <span className={styles.routePlace}>Wankhede Stadium</span>
          </div>
        </div>
        {attendeeSelectedRouteId ? (
          <div className={styles.selectedRoute}>
            <span className="pill pill-live">Route Selected: {attendeeSelectedRouteId}</span>
            <span className={styles.selectedTime}>{attendeeSelectedRouteId === "FASTEST" ? "24" : attendeeSelectedRouteId === "BALANCED" ? "31" : "48"} min</span>
          </div>
        ) : (
          <div className={styles.journeyMeta}>
            <span className={styles.journeyTime}>31 min</span>
            <span className={styles.journeyType}>Balanced route · Recommended</span>
          </div>
        )}
        <Link href="/attendee/plan" className="btn btn-yellow" style={{ width: "100%", marginTop: 12 }}>
          {attendeeSelectedRouteId ? "Change Route" : "VIEW JOURNEY"}
        </Link>
      </div>

      {/* QUICK ACTIONS */}
      <div>
        <span className="text-meta" style={{ marginBottom: 12, display: "block" }}>Quick Actions</span>
        <div className={styles.quickGrid}>
          {[
            { href: "/attendee/plan", label: "Plan Journey", icon: "◇" },
            { href: "/attendee/stay", label: "Find Stay", icon: "◈" },
            { href: "/attendee/food", label: "Food & Services", icon: "◆" },
            { href: "/attendee/event", label: "Event Info", icon: "★" },
          ].map(q => (
            <Link key={q.href} href={q.href} className={styles.quickCard}>
              <span className={styles.quickIcon}>{q.icon}</span>
              <span className={styles.quickLabel}>{q.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ALL ALERTS */}
      <div>
        <span className="text-meta" style={{ marginBottom: 12, display: "block" }}>Alerts</span>
        <div className={styles.alertsList}>
          {alerts.map(a => (
            <div key={a.id} className={`${styles.alertItem} ${styles[`alert${a.severity}`]}`}>
              <div className={styles.alertItemHeader}>
                <span className={`pill ${a.severity === "CRITICAL" ? "pill-critical" : a.severity === "HIGH" ? "pill-high" : "pill-watch"}`}>{a.category}</span>
                <span className={styles.alertTime}>{a.timestamp}</span>
              </div>
              <span className={styles.alertTitle}>{a.title}</span>
              {a.actionLabel && (
                <Link href={a.actionRoute || "/attendee/plan"} className="btn btn-outline btn-sm" style={{ alignSelf: "flex-start", marginTop: 4 }}>
                  {a.actionLabel}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.simLabel}>
        <span className="simulated-env-label tooltip-simulated">
          <span className="simulated-dot" />
          Simulated Environment · All data is prototype demonstration
        </span>
      </div>
    </div>
  );
}
