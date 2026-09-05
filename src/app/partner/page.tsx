"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/state/AppContext";
import styles from "./partner.module.css";

export default function PartnerPage() {
  const { activeScenario, hotels, updateHotelAvailability, kpis } = useApp();
  const [selectedHotelId, setSelectedHotelId] = useState("H4");

  const currentHotel = hotels.find(h => h.id === selectedHotelId) || hotels[0];

  const [rooms, setRooms] = useState(currentHotel.availableRooms);
  const [checkins, setCheckins] = useState(currentHotel.expectedCheckIns);
  const [checkouts, setCheckouts] = useState(currentHotel.expectedCheckOuts);
  const [saved, setSaved] = useState(false);

  // Sync inputs when hotel changes or scenario changes
  useEffect(() => {
    if (currentHotel) {
      setRooms(currentHotel.availableRooms);
      setCheckins(currentHotel.expectedCheckIns);
      setCheckouts(currentHotel.expectedCheckOuts);
    }
  }, [selectedHotelId, currentHotel?.availableRooms, currentHotel?.expectedCheckIns, currentHotel?.expectedCheckOuts]);

  const handleSave = () => {
    updateHotelAvailability(selectedHotelId, rooms, checkins, checkouts);
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>JUNCTION</Link>
        <div className={styles.headerRight}>
          <span className="pill pill-simulated">SIMULATED</span>
          <Link href="/organizer" className="btn btn-outline btn-sm">Organizer View</Link>
          <Link href="/attendee/stay" className="btn btn-outline btn-sm">Attendee Stay View</Link>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.portalHeader}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span className="text-meta">Partner Portal · Hospitality Orchestration</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--ink-faint)" }}>Property:</label>
              <select
                className="select"
                style={{ padding: "4px 8px", fontSize: 12 }}
                value={selectedHotelId}
                onChange={e => setSelectedHotelId(e.target.value)}
              >
                {hotels.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.zone.replace("_", " ")})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <h1 className={styles.portalTitle}>{currentHotel.name}</h1>
          <span className={styles.portalSub}>
            {currentHotel.zone.replace("_", " ")} · Hotel Partner · Source:{" "}
            <span className={`pill ${currentHotel.source === "PARTNER_REPORTED" ? "pill-live" : "pill-simulated"}`}>
              {currentHotel.source}
            </span>
            · Connectivity: {currentHotel.transportConnectivity}
          </span>
        </div>

        {/* EVENT DEMAND BANNER */}
        <div className={`${styles.demandBanner} ${kpis.destinationPressure > 80 ? styles.demandHigh : styles.demandMod}`}>
          <div className={styles.demandIcon}>{kpis.destinationPressure > 80 ? "⚠" : "●"}</div>
          <div>
            <span className={styles.demandTitle}>Event Demand: {kpis.destinationPressure > 80 ? "HIGH" : "MODERATE"}</span>
            <p className={styles.demandMsg}>
              Mumbai IPL Match · 33,000 attendees · 19:30 tonight · Destination pressure {kpis.destinationPressure}% · Scenario: {activeScenario.replace(/_/g, " ")}
            </p>
          </div>
        </div>

        {/* STATS */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Rooms</span>
            <span className={styles.statValue}>{currentHotel.totalRooms}</span>
            <span className={styles.statNote}>inventory</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Available (Raw)</span>
            <span className={styles.statValue}>{currentHotel.availableRooms}</span>
            <span className={styles.statNote}>reported vacancies</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Usable Capacity</span>
            <span className={styles.statValue} style={{ color: "var(--yellow-state)" }}>{currentHotel.usableRooms}</span>
            <span className={styles.statNote}>adjusted for travel & transit</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Pressure</span>
            <span className={styles.statValue} style={{ color: currentHotel.pressure >= 85 ? "var(--red)" : currentHotel.pressure >= 70 ? "var(--orange)" : "var(--green)" }}>
              {currentHotel.pressure}%
            </span>
            <span className={styles.statNote}>{currentHotel.pressureLevel}</span>
          </div>
        </div>

        {/* UPDATE FORM */}
        <div className={styles.updateCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 className={styles.updateTitle}>Update Availability</h2>
              <p className={styles.updateNote}>
                Your reported availability updates the shared destination state immediately without reloading. JUNCTION automatically computes usable capacity and orchestrates attendee distribution.
              </p>
            </div>
            <span className="pill pill-live" style={{ fontSize: 10 }}>CONNECTED STATE</span>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Available Rooms (Raw Vacancy)</label>
              <input
                type="number"
                className="input"
                value={rooms}
                min={0}
                max={currentHotel.totalRooms}
                onChange={e => setRooms(Number(e.target.value))}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Expected Check-ins Today</label>
              <input
                type="number"
                className="input"
                value={checkins}
                min={0}
                onChange={e => setCheckins(Number(e.target.value))}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Expected Check-outs Today</label>
              <input
                type="number"
                className="input"
                value={checkouts}
                min={0}
                onChange={e => setCheckouts(Number(e.target.value))}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Travel Time to Venue</label>
              <input
                type="text"
                className="input"
                disabled
                value={`${currentHotel.travelTimeToVenue} min (${currentHotel.transportConnectivity} connectivity)`}
              />
            </div>
          </div>

          <div style={{ background: "var(--paper)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 12, color: "var(--ink-muted)" }}>
            <strong>Raw Availability vs. Usable Capacity:</strong> If you report {rooms} rooms, JUNCTION calculates approximately {Math.max(0, Math.round(rooms * (currentHotel.transportConnectivity === "EXCELLENT" ? 0.92 : 0.82) * 0.92 * 0.94))} usable rooms after factoring in {currentHotel.travelTimeToVenue} min transit time and peak event arrival friction.
          </div>

          <button className="btn btn-yellow" style={{ marginTop: 8 }} onClick={handleSave}>
            UPDATE AVAILABILITY
          </button>

          {saved && (
            <div className={styles.savedBanner}>
              ✓ Availability updated to {rooms} rooms! Change immediately propagated to Organizer Capacity, Destination Pressure, and Attendee Stay views.
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <span className="simulated-env-label tooltip-simulated">
            <span className="simulated-dot" />
            Simulated Environment · All data is prototype demonstration
          </span>
        </div>
      </main>
    </div>
  );
}

