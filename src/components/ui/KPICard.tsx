import styles from "./KPICard.module.css";

interface Props {
  label: string;
  value: string;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
  accent?: boolean;
}

export default function KPICard({ label, value, subtitle, trend, trendUp, accent }: Props) {
  return (
    <div className={`${styles.card} ${accent ? styles.accent : ""}`}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      {trend && (
        <span className={`${styles.trend} ${trendUp ? styles.trendUp : styles.trendDown}`}>
          {trendUp ? "↑" : "↓"} {trend}
        </span>
      )}
    </div>
  );
}
