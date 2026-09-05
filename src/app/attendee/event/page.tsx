"use client";
import { MOCK_EVENT } from "@/data/mockEvent";
import { useApp } from "@/state/AppContext";
import styles from "./event.module.css";

export default function AttendeeEventPage() {
  const { activeScenario } = useApp();
  const isDelay = activeScenario === "EVENT_DELAY";
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Event Info</h1>
      <div className={styles.card}>
        <div className={styles.cardTop}>
          <span className="pill pill-live">● LIVE</span>
          {isDelay && <span className="pill pill-high">DELAYED +30 MIN</span>}
        </div>
        <h2 className={styles.eventName}>{MOCK_EVENT.name}</h2>
        <span className={styles.eventVenue}>{MOCK_EVENT.venue}</span>
        <div className={styles.times}>
          <div className={styles.timeItem}><span className={styles.timeLabel}>GATE OPEN</span><span className={styles.timeVal}>{isDelay ? "19:30" : "18:00"}</span></div>
          <div className={styles.timeItem}><span className={styles.timeLabel}>MATCH START</span><span className={styles.timeVal}>{isDelay ? "20:00" : "19:30"}</span></div>
          <div className={styles.timeItem}><span className={styles.timeLabel}>EST END</span><span className={styles.timeVal}>{isDelay ? "23:00" : "22:30"}</span></div>
        </div>
      </div>
      <div className={styles.gates}>
        <span className="text-meta">Your Gate</span>
        <div className={styles.gateHighlight}>Gate 3 (South) — Your allocated entry</div>
        <p className={styles.gateNote}>Arrive at least 30 minutes before match time. Expect security queue at peak times.</p>
      </div>
      <div className={styles.simLabel}>
        <span className="simulated-env-label"><span className="simulated-dot" />Simulated Environment</span>
      </div>
    </div>
  );
}
