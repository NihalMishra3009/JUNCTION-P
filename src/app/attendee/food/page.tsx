"use client";
import { useApp } from "@/state/AppContext";
import { getRestaurants } from "@/services/mockDataService";
import styles from "./food.module.css";

export default function FoodPage() {
  const { activeScenario } = useApp();
  const restaurants = getRestaurants(activeScenario);
  const sorted = [...restaurants].sort((a, b) => a.waitTime - b.waitTime);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Food & Services</h1>
      <p className={styles.subheading}>Restaurants near Wankhede — sorted by wait time</p>

      <div className={styles.list}>
        {sorted.map(r => (
          <div key={r.id} className={`${styles.card} ${r.recommended ? styles.cardRec : ""}`}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.restName}>{r.name} {r.recommended ? "★" : ""}</h3>
                <span className={styles.restCuisine}>{r.cuisine}</span>
              </div>
              <span className={`pill ${r.pressureLevel === "NORMAL" ? "pill-live" : r.pressureLevel === "WATCH" ? "pill-watch" : r.pressureLevel === "HIGH" ? "pill-high" : "pill-critical"}`}>
                {r.pressureLevel}
              </span>
            </div>
            <div className={styles.cardMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>WAIT NOW</span>
                <span className={styles.metaValue} style={{ color: r.waitTime > 30 ? "var(--red)" : r.waitTime > 15 ? "var(--orange)" : "var(--green)" }}>{r.waitTime} min</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>PREDICTED</span>
                <span className={styles.metaValue}>{r.predictedWaitTime} min</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>DISTANCE</span>
                <span className={styles.metaValue}>{r.distanceFromVenue} min</span>
              </div>
            </div>
            {r.hasIncentive && r.incentiveLabel && (
              <div className={styles.incentive}>
                <span className={styles.incentiveIcon}>🎟</span>
                <span>{r.incentiveLabel}</span>
                <span className={styles.incentiveDiscount}>EXPLORE ZONE C</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
