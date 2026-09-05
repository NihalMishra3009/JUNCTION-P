"use client";
import { useApp } from "@/state/AppContext";
import styles from "./stay.module.css";

export default function StayPage() {
  const { hotels } = useApp();

  const zoneC = hotels.filter(h => h.zone === "ZONE_C");
  const zoneA = hotels.filter(h => h.zone === "ZONE_A");
  const zoneB = hotels.filter(h => h.zone === "ZONE_B");

  const getZoneAvgPressure = (list: typeof hotels) => {
    if (list.length === 0) return 50;
    return Math.round(list.reduce((sum, h) => sum + h.pressure, 0) / list.length);
  };

  const zoneAPressure = getZoneAvgPressure(zoneA);
  const zoneBPressure = getZoneAvgPressure(zoneB);
  const zoneCPressure = getZoneAvgPressure(zoneC);

  const zoneARooms = zoneA.reduce((a, h) => a + h.usableRooms, 0);
  const zoneBRooms = zoneB.reduce((a, h) => a + h.usableRooms, 0);
  const zoneCRooms = zoneC.reduce((a, h) => a + h.usableRooms, 0);

  // Re-rank hotels dynamically: lowest pressure first, Zone C favored when Zone A is congested
  const sortedHotels = [...hotels].sort((a, b) => {
    if (a.zone === "ZONE_C" && b.zone !== "ZONE_C") return -1;
    if (b.zone === "ZONE_C" && a.zone !== "ZONE_C") return 1;
    return a.pressure - b.pressure;
  });

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Stay Where the Destination Has Room</h1>

      {/* ZONE COMPARISON */}
      <div className={styles.zoneCards}>
        {[
          { zone: "Zone A", hotels: zoneA, pressure: zoneAPressure, rooms: zoneARooms, travel: 12, recommended: false },
          { zone: "Zone B", hotels: zoneB, pressure: zoneBPressure, rooms: zoneBRooms, travel: 18, recommended: false },
          { zone: "Zone C", hotels: zoneC, pressure: zoneCPressure, rooms: zoneCRooms, travel: 22, recommended: true },
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span className="text-meta">Hotels — Dynamic Usable Inventory</span>
          <span className="pill pill-live" style={{ fontSize: 9 }}>SHARED DESTINATION STATE</span>
        </div>
        <div className={styles.hotelList}>
          {sortedHotels.map(h => (
            <div key={h.id} className={`${styles.hotelCard} ${h.zone === "ZONE_C" ? styles.hotelRec : ""}`}>
              <div className={styles.hotelHeader}>
                <div>
                  <h3 className={styles.hotelName}>{h.name}</h3>
                  <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{h.travelTimeToVenue} min to venue via {h.transportConnectivity} transit</span>
                </div>
                <span className={`pill ${h.pressureLevel === "NORMAL" ? "pill-live" : h.pressureLevel === "WATCH" ? "pill-watch" : "pill-high"}`}>
                  {h.zone.replace("_", " ")}
                </span>
              </div>
              <div className={styles.hotelMeta}>
                <div className={styles.metaGroup}>
                  <span className={styles.metaLabel}>USABLE ROOMS</span>
                  <span className={styles.metaValue} style={{ color: "var(--yellow-state)" }}>{h.usableRooms}</span>
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
                <span className={`pill ${h.source === "PARTNER_REPORTED" ? "pill-live" : "pill-simulated"}`}>
                  {h.source}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.usableNote}>
        <span>*</span> <span>Usable rooms = capacity accessible given current travel conditions, distance, and event timing. May differ from raw partner availability.</span>
      </div>
    </div>
  );
}
