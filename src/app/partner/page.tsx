"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/state/AppContext";
import { getScenarioKPIs } from "@/services/mockDataService";
import styles from "./partner.module.css";

export default function PartnerPage() {
  const { activeScenario } = useApp();
  const kpis = getScenarioKPIs(activeScenario);
  const [rooms, setRooms] = useState(38);
  const [checkins, setCheckins] = useState(27);
  const [checkouts, setCheckouts] = useState(14);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>JUNCTION</Link>
        <div className={styles.headerRight}>
          <span className="pill pill-simulated">SIMULATED</span>
          <Link href="/organizer" className="btn btn-outline btn-sm">Organizer View</Link>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.portalHeader}>
          <span className="text-meta">Partner Portal</span>
          <h1 className={styles.portalTitle}>Ramada by Wyndham Dadar</h1>
          <span className={styles.portalSub}>Zone C · Hotel Partner · Last updated 5 min ago · <span className="pill pill-simulated">PARTNER-REPORTED</span></span>
        </div>

        {/* EVENT DEMAND BANNER */}
        <div className={`${styles.demandBanner} ${kpis.destinationPressure > 80 ? styles.demandHigh : styles.demandMod}`}>
          <div className={styles.demandIcon}>{kpis.destinationPressure > 80 ? "⚠" : "●"}</div>
          <div>
            <span className={styles.demandTitle}>Event Demand: {kpis.destinationPressure > 80 ? "HIGH" : "MODERATE"}</span>
            <p className={styles.demandMsg}>Mumbai IPL Match · 33,000 attendees · 19:30 tonight · Destination pressure {kpis.destinationPressure}%</p>
          </div>
        </div>

        {/* STATS */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Rooms</span>
            <span className={styles.statValue}>250</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Available</span>
            <span className={styles.statValue}>{rooms}</span>
            <span className={styles.statNote}>of 250 total</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Expected Check-ins</span>
            <span className={styles.statValue}>{checkins}</span>
            <span className={styles.statNote}>today</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Expected Check-outs</span>
            <span className={styles.statValue}>{checkouts}</span>
            <span className={styles.statNote}>today</span>
          </div>
        </div>

        {/* UPDATE FORM */}
        <div className={styles.updateCard}>
          <h2 className={styles.updateTitle}>Update Availability</h2>
          <p className={styles.updateNote}>Your reported availability is used by JUNCTION to guide guests to your property when you have capacity.</p>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Available Rooms</label>
              <input type="number" className="input" value={rooms} min={0} max={250}
                onChange={e => setRooms(Number(e.target.value))} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Expected Check-ins Today</label>
              <input type="number" className="input" value={checkins} min={0}
                onChange={e => setCheckins(Number(e.target.value))} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Expected Check-outs Today</label>
              <input type="number" className="input" value={checkouts} min={0}
                onChange={e => setCheckouts(Number(e.target.value))} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Event Inventory (rooms reserved for event guests)</label>
              <input type="number" className="input" defaultValue={15} min={0} />
            </div>
          </div>

          <button className="btn btn-yellow" style={{ marginTop: 8 }} onClick={handleSave}>
            UPDATE AVAILABILITY
          </button>

          {saved && (
            <div className={styles.savedBanner}>
              ✓ Availability updated. JUNCTION will direct guests accordingly.
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
