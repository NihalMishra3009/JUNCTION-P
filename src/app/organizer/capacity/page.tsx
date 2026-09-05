"use client";
import { useApp } from "@/state/AppContext";
import { getResources } from "@/services/mockDataService";
import PressureIndicator from "@/components/ui/PressureIndicator";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import styles from "./capacity.module.css";

export default function CapacityPage() {
  const { activeScenario } = useApp();
  const resources = getResources(activeScenario);
  const sorted = [...resources].sort((a, b) => b.pressure - a.pressure);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className="text-page-heading">Capacity Overview</h1>
        <ConfidenceBadge source="SIMULATED" />
      </div>
      <div className={styles.table}>
        <div className={styles.thead}>
          <span>Resource</span>
          <span>Type</span>
          <span>Current</span>
          <span>Predicted</span>
          <span>Capacity</span>
          <span>Pressure</span>
          <span>Trend</span>
          <span>Status</span>
        </div>
        {sorted.map(r => (
          <div key={r.id} className={styles.trow}>
            <div className={styles.nameCell}>
              <span className={styles.resName}>{r.name}</span>
              <span className={styles.resZone}>{r.zone.replace("_", " ")}</span>
            </div>
            <span className={`pill ${r.type === "VENUE" ? "pill-yellow" : r.type === "STATION" ? "pill-predicted" : "pill-simulated"}`} style={{ fontSize: 9 }}>
              {r.type}
            </span>
            <span className={styles.numCell}>{r.currentUtilization.toLocaleString()}</span>
            <span className={styles.numCell}>{r.predictedDemand.toLocaleString()}</span>
            <span className={styles.numCell}>{r.totalCapacity.toLocaleString()}</span>
            <div style={{ minWidth: 140 }}>
              <PressureIndicator pressure={r.pressure} size="sm" />
            </div>
            <span className={r.trend === "INCREASING" ? styles.trendUp : r.trend === "DECREASING" ? styles.trendDown : styles.trendStable}>
              {r.trend === "INCREASING" ? "↑ Rising" : r.trend === "DECREASING" ? "↓ Falling" : "→ Stable"}
            </span>
            <span className={`pill ${r.operatingStatus === "OPERATIONAL" ? "pill-live" : r.operatingStatus === "DISRUPTED" ? "pill-critical" : "pill-watch"}`}>
              {r.operatingStatus}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
