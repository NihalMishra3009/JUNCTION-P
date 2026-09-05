"use client";
import styles from "./PressureIndicator.module.css";

interface Props {
  pressure: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function getPressureColor(p: number): string {
  if (p < 70) return "var(--green)";
  if (p < 85) return "var(--yellow-state)";
  if (p < 95) return "var(--orange)";
  return "var(--red)";
}

export function getPressureLabel(p: number): string {
  if (p < 70) return "NORMAL";
  if (p < 85) return "WATCH";
  if (p < 95) return "HIGH";
  return "CRITICAL";
}

export function getPressureClass(p: number): string {
  if (p < 70) return "pill-normal";
  if (p < 85) return "pill-watch";
  if (p < 95) return "pill-high";
  return "pill-critical";
}

export default function PressureIndicator({ pressure, showLabel = true, size = "md" }: Props) {
  const color = getPressureColor(pressure);
  const label = getPressureLabel(pressure);
  return (
    <div className={`${styles.wrap} ${styles[size]}`}>
      <div className={styles.bar}>
        <div
          className={styles.fill}
          style={{ width: `${pressure}%`, background: color }}
        />
      </div>
      {showLabel && (
        <div className={styles.labels}>
          <span className={styles.value} style={{ color }}>{pressure}%</span>
          <span className={`pill ${getPressureClass(pressure)}`}>{label}</span>
        </div>
      )}
    </div>
  );
}
