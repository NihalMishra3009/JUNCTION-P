"use client";
import { useApp } from "@/state/AppContext";
import { getPredictions } from "@/services/mockDataService";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from "recharts";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import styles from "./predictions.module.css";

const TIME_LABELS = ["NOW", "+15 MIN", "+30 MIN", "+60 MIN"];

export default function PredictionsPage() {
  const { activeScenario, redistributionApplied } = useApp();
  const basePredictions = getPredictions(activeScenario);

  const predictions = redistributionApplied
    ? basePredictions.map(p => {
        if (p.resourceId === "CHURCHGATE") {
          return {
            ...p,
            current: Math.max(40, p.current - 18),
            points: p.points.map(pt => ({ ...pt, pressure: Math.max(40, pt.pressure - 18) })),
          };
        }
        if (p.resourceId === "DADAR") {
          return {
            ...p,
            current: Math.min(88, p.current + 11),
            points: p.points.map(pt => ({ ...pt, pressure: Math.min(90, pt.pressure + 10) })),
          };
        }
        return p;
      })
    : basePredictions;

  const chartData = TIME_LABELS.map((label, i) => {
    const obj: Record<string, number | string> = { time: label };
    predictions.forEach(p => { obj[p.resourceName] = p.points[i]?.pressure || 0; });
    return obj;
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className="text-page-heading">Pressure Forecast</h1>
          <p className={styles.subtitle}>Predicted capacity pressure across the event impact zone.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {redistributionApplied && (
            <span className="pill pill-live">REDISTRIBUTION APPLIED</span>
          )}
          <ConfidenceBadge source="SIMULATED" />
        </div>
      </div>

      {/* TABLE */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <span className={styles.resourceCol}>RESOURCE</span>
          {TIME_LABELS.map(l => <span key={l} className={styles.timeCol}>{l}</span>)}
          <span className={styles.trendCol}>TREND</span>
        </div>
        {predictions.map(p => (
          <div key={p.resourceId} className={styles.tableRow}>
            <span className={styles.resourceName}>{p.resourceName}</span>
            {p.points.map((pt, i) => (
              <span
                key={i}
                className={styles.pressureCell}
                style={{ color: pt.pressure >= 95 ? "var(--red)" : pt.pressure >= 85 ? "var(--orange)" : pt.pressure >= 70 ? "var(--yellow-state)" : "var(--green)" }}
              >
                {pt.pressure}%
              </span>
            ))}
            <span className={`${styles.trendCell} ${p.points[3].pressure > p.points[0].pressure + 10 ? styles.trendUp : styles.trendDown}`}>
              {p.points[3].pressure > p.points[0].pressure + 5 ? "↑ Rising" : "→ Stable"}
            </span>
          </div>
        ))}
      </div>

      {/* CHART */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Pressure Over Time</h3>
        <p className={styles.chartNote}>Solid = current, dashed area = predicted</p>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E7E5DE" />
            <XAxis dataKey="time" tick={{ fontSize: 11, fontFamily: "Inter", fill: "#666" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fontFamily: "Inter", fill: "#666" }} tickFormatter={v => `${v}%`} />
            <Tooltip formatter={(v: any) => [`${v}%`]} contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8, border: "1px solid #E7E5DE" }} />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Inter" }} />
            <ReferenceLine y={95} stroke="#EF4444" strokeDasharray="4,3" label={{ value: "CRITICAL", fill: "#EF4444", fontSize: 9 }} />
            <ReferenceLine y={85} stroke="#F97316" strokeDasharray="4,3" label={{ value: "HIGH", fill: "#F97316", fontSize: 9 }} />
            <ReferenceLine y={70} stroke="#CA8A04" strokeDasharray="4,3" label={{ value: "WATCH", fill: "#CA8A04", fontSize: 9 }} />
            {predictions.slice(0, 5).map(p => (
              <Line key={p.resourceId} type="monotone" dataKey={p.resourceName} stroke={p.color} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* CASCADE NOTE */}
      <div className={styles.cascadeNote}>
        <span className="text-meta">Cascade Effect</span>
        <div className={styles.cascade}>
          {["Wankhede Exit", "Road Pressure", "Transport Delay", "Churchgate", "Taxi Demand", "Pickup Zone"].map((node, i, arr) => (
            <span key={node} className={styles.cascadeWrap}>
              <span className={styles.cascadeNode}>{node}</span>
              {i < arr.length - 1 && <span className={styles.cascadeArrow}>↓</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
