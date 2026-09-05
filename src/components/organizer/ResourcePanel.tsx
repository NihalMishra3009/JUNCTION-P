"use client";
import { Resource } from "@/types";
import { ScenarioId, ResourcePrediction } from "@/types";
import { SCENARIOS } from "@/data/mockScenarios";
import PressureIndicator, { getPressureLabel } from "@/components/ui/PressureIndicator";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import Link from "next/link";
import styles from "./ResourcePanel.module.css";

interface Props {
  resource: Resource | null;
  scenario: ScenarioId;
  onClose: () => void;
}

export default function ResourcePanel({ resource, scenario, onClose }: Props) {
  if (!resource) return null;
  const s = SCENARIOS[scenario];
  const pd = s.pressure[resource.id];

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.panelType}>{resource.type}</span>
          <h3 className={styles.panelName}>{resource.name}</h3>
          <span className={styles.panelZone}>{resource.zone.replace("_", " ")}</span>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
      </div>

      <div className={styles.section}>
        <span className="text-meta">Current Pressure</span>
        <PressureIndicator pressure={resource.pressure} size="lg" />
      </div>

      {pd && (
        <div className={styles.section}>
          <span className="text-meta">Pressure Forecast</span>
          <div className={styles.forecastGrid}>
            {[
              { label: "NOW", value: pd.pressure },
              { label: "+15 MIN", value: pd.predictedPressure15 },
              { label: "+30 MIN", value: pd.predictedPressure30 },
              { label: "+60 MIN", value: pd.predictedPressure60 },
            ].map(pt => (
              <div key={pt.label} className={styles.forecastCell}>
                <span className={styles.forecastTime}>{pt.label}</span>
                <span
                  className={styles.forecastValue}
                  style={{ color: pt.value >= 95 ? "var(--red)" : pt.value >= 85 ? "var(--orange)" : pt.value >= 70 ? "var(--yellow-state)" : "var(--green)" }}
                >
                  {pt.value}%
                </span>
                <span className={styles.forecastLabel}>{getPressureLabel(pt.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <span className="text-meta">Capacity Details</span>
        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Current</span>
            <span className={styles.metaValue}>{resource.currentUtilization.toLocaleString()}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Predicted</span>
            <span className={styles.metaValue}>{resource.predictedDemand.toLocaleString()}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Capacity</span>
            <span className={styles.metaValue}>{resource.totalCapacity.toLocaleString()}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Trend</span>
            <span className={styles.metaValue} style={{ color: resource.trend === "INCREASING" ? "var(--red)" : resource.trend === "DECREASING" ? "var(--green)" : "var(--ink-muted)" }}>
              {resource.trend === "INCREASING" ? "↑ Rising" : resource.trend === "DECREASING" ? "↓ Falling" : "→ Stable"}
            </span>
          </div>
        </div>
      </div>

      {resource.description && (
        <div className={styles.section}>
          <p className={styles.description}>{resource.description}</p>
        </div>
      )}

      <div className={styles.panelFooter}>
        <ConfidenceBadge source={resource.source} />
        <Link href="/organizer/predictions" className="btn btn-outline btn-sm">View Cascade →</Link>
      </div>
    </div>
  );
}
