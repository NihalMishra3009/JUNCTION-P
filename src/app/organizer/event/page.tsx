"use client";
import { MOCK_EVENT } from "@/data/mockEvent";
import PageHeader from "@/components/ui/PageHeader";
import styles from "./event.module.css";

export default function EventPage() {
  return (
    <div className={styles.page}>
      <PageHeader
        category="CONTEXT"
        title="Event Operations & Venue Gates"
        subtitle="Operational parameters, gate capacities, and attendance tracking for Wankhede Stadium matchday."
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <span className="pill pill-live">● LIVE</span>
            <span className="pill pill-simulated">SIMULATED</span>
          </div>
        }
      />
      <div className={styles.grid}>

        <div className={styles.card}>
          <div className={styles.eventHeader}>
            <span className="pill pill-live">● LIVE</span>
            <span className="pill pill-simulated">SIMULATED</span>
          </div>
          <h2 className={styles.eventName}>{MOCK_EVENT.name}</h2>
          <span className={styles.eventVenue}>{MOCK_EVENT.venue} · {MOCK_EVENT.city}</span>
          <div className={styles.eventMeta}>
            <div className={styles.metaItem}><span className={styles.metaLabel}>Attendance</span><span className={styles.metaVal}>{MOCK_EVENT.expectedAttendance.toLocaleString()}</span></div>
            <div className={styles.metaItem}><span className={styles.metaLabel}>Start</span><span className={styles.metaVal}>{MOCK_EVENT.startTime}</span></div>
            <div className={styles.metaItem}><span className={styles.metaLabel}>End</span><span className={styles.metaVal}>{MOCK_EVENT.endTime}</span></div>
            <div className={styles.metaItem}><span className={styles.metaLabel}>Status</span><span className="pill pill-live">{MOCK_EVENT.status}</span></div>
          </div>
        </div>
        <div className={styles.card}>
          <span className="text-meta">Gate Allocations</span>
          <div className={styles.gates}>
            {MOCK_EVENT.gates.map(g => (
              <div key={g.id} className={styles.gate}>
                <span className={styles.gateLabel}>{g.label}</span>
                <span className={styles.gateCap}>{g.capacity.toLocaleString()} capacity</span>
                <div className="pressure-bar" style={{ marginTop: 6 }}>
                  <div className="pressure-bar-fill" style={{ width: "72%", background: "var(--yellow-state)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
