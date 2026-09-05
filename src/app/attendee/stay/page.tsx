"use client";
import { useApp } from "@/state/AppContext";
import { getHotels } from "@/services/mockDataService";
import styles from "./stay.module.css";

export default function StayPage() {
  const { activeScenario } = useApp();
  const hotels = getHotels(activeScenario);
  const zoneC = hotels.filter(h => h.zone === "ZONE_C");
  const zoneA = hotels.filter(h => h.zone === "ZONE_A");
  const zoneB = hotels.filter(h => h.zone === "ZONE_B");

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Stay Where the Destination Has Room</h1>

      {/* ZONE COMPARISON */}
      <div className={styles.zoneCards}>
        {[
          { zone: "Zone A", hotels: zoneA, pressure: 91, rooms: zoneA.reduce((a,h) => a+h.usableRooms, 0), travel: 12, recommended: false },
          { zone: "Zone B", hotels: zoneB, pressure: 74, rooms: zoneB.reduce((a,h) => a+h.usableRooms, 0), travel: 18, recommended: false },
          { zone: "Zone C", hotels: zoneC, pressure: 50, rooms: zoneC.reduce((a,h) => a+h.usableRooms, 0), travel: 22, recommended: true },
        ].map(z => (
          <div key={z.zone} className={`${styles.zoneCard} ${z.recommended ? styles.zoneRec : ""}`}>
            <div className={styles.zoneHeader}>
              <span className={styles.zoneName}>{z.zone}</span>
              {z.recommended && <span className="pill pill-yellow">★ Recommended</span>}
            </div>
            <span className={styles.zoneRooms}>{z.rooms} usable rooms</span>
            <div className={styles.zoneMeta}>
              <span className={styles.zoneMetaItem} style={{ color: z.pressure >= 85 ? "var(--red)" : z.pressure >= 70 ? "var(--orange)" : "var(--green)" }}>
                {z.pressure}% pressure
              </span>
              <span className={styles.zoneMetaDot}>·</span>
              <span className={styles.zoneMetaItem}>{z.travel} min to venue</span>
            </div>
            <div className="pressure-bar">
              <div className="pressure-bar-fill" style={{ width: `${z.pressure}%`, background: z.pressure >= 85 ? "var(--red)" : z.pressure >= 70 ? "var(--orange)" : "var(--green)" }} />
            </div>
          </div>
        ))}
      </div>

      {/* HOTEL LIST */}
      <div>
        <span className="text-meta" style={{ marginBottom: 12, display: "block" }}>Hotels — Zone C Recommended</span>
        <div className={styles.hotelList}>
          {[...zoneC, ...zoneB, ...zoneA].map(h => (
            <div key={h.id} className={`${styles.hotelCard} ${h.zone === "ZONE_C" ? styles.hotelRec : ""}`}>
              <div className={styles.hotelHeader}>
                <h3 className={styles.hotelName}>{h.name}</h3>
                <span className={`pill ${h.pressureLevel === "NORMAL" ? "pill-live" : h.pressureLevel === "WATCH" ? "pill-watch" : "pill-high"}`}>
                  {h.zone.replace("_", " ")}
                </span>
              </div>
              <div className={styles.hotelMeta}>
                <div className={styles.metaGroup}>
                  <span className={styles.metaLabel}>USABLE ROOMS</span>
                  <span className={styles.metaValue}>{h.usableRooms}</span>
                  <span className={styles.metaSub}>(of {h.availableRooms} available)</span>
                </div>
                <div className={styles.metaGroup}>
                  <span className={styles.metaLabel}>TO VENUE</span>
                  <span className={styles.metaValue}>{h.travelTimeToVenue} min</span>
                </div>
                <div className={styles.metaGroup}>
                  <span className={styles.metaLabel}>PRESSURE</span>
                  <span className={styles.metaValue} style={{ color: h.pressure >= 85 ? "var(--red)" : h.pressure >= 70 ? "var(--orange)" : "var(--green)" }}>
                    {h.pressure}%
                  </span>
                </div>
              </div>
              {h.priceRange && <span className={styles.hotelPrice}>{h.priceRange} / night</span>}
              <div className={styles.hotelFooter}>
                <span className={`pill ${h.transportConnectivity === "EXCELLENT" ? "pill-live" : h.transportConnectivity === "GOOD" ? "pill-predicted" : "pill-watch"}`}>
                  Transport: {h.transportConnectivity}
                </span>
                <span className="pill pill-simulated">SIMULATED</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.usableNote}>
        <span>*</span> <span>Usable rooms = rooms accessible given current travel conditions, distance, and event timing. May differ from raw availability.</span>
      </div>
    </div>
  );
}
