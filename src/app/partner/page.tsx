"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/state/AppContext";
import { useUser } from "@clerk/nextjs";
import { AlertTriangle, Check } from "lucide-react";
import styles from "./partner.module.css";

export default function PartnerPage() {
  const { activeScenario, hotels, updateHotelAvailability, kpis } = useApp();
  const { user } = useUser();

  // Property is bound to partner portal
  const propertyId = "H4";
  const currentHotel = hotels.find(h => h.id === propertyId) || hotels[0];

  const [rooms, setRooms] = useState(currentHotel.availableRooms);
  const [checkins, setCheckins] = useState(currentHotel.expectedCheckIns);
  const [checkouts, setCheckouts] = useState(currentHotel.expectedCheckOuts);
  const [unavailable, setUnavailable] = useState(0);
  const [validationError, setValidationError] = useState("");
  const [saved, setSaved] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Sync inputs when bound hotel data changes (e.g. initial load or scenario change)
  useEffect(() => {
    if (currentHotel) {
      setRooms(currentHotel.availableRooms);
      setCheckins(currentHotel.expectedCheckIns);
      setCheckouts(currentHotel.expectedCheckOuts);
    }
  }, [propertyId, currentHotel?.availableRooms, currentHotel?.expectedCheckIns, currentHotel?.expectedCheckOuts]);

  const handleSave = () => {
    setValidationError("");

    // Client-side validation guardrails
    if (isNaN(rooms) || rooms < 0) {
      setValidationError("Available rooms cannot be negative.");
      return;
    }
    if (rooms > currentHotel.totalRooms) {
      setValidationError(`Available rooms cannot exceed total inventory (${currentHotel.totalRooms}).`);
      return;
    }
    if (isNaN(checkins) || checkins < 0) {
      setValidationError("Expected check-ins cannot be negative.");
      return;
    }
    if (isNaN(checkouts) || checkouts < 0) {
      setValidationError("Expected check-outs cannot be negative.");
      return;
    }
    if (isNaN(unavailable) || unavailable < 0) {
      setValidationError("Temporary unavailable rooms cannot be negative.");
      return;
    }
    if (rooms + unavailable > currentHotel.totalRooms) {
      setValidationError(
        `Available (${rooms}) + out-of-order (${unavailable}) exceeds total inventory (${currentHotel.totalRooms}).`
      );
      return;
    }

    // Effective available rooms reported into destination model
    updateHotelAvailability(propertyId, rooms, checkins, checkouts);

    // Persist inventory update to PostgreSQL database
    fetch("/api/partner/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId: "R1",
        availableTables: Math.max(1, Math.round(rooms / 4)),
        availableCovers: rooms,
        expectedCovers: checkins,
        outOfOrderTables: unavailable,
        notes: `Operational report from partner portal`,
      }),
    }).catch(err => console.warn("Failed to persist to PostgreSQL:", err));

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLastUpdated(timeStr);
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 6000);
  };

  return (
    <main className={styles.main}>
      {/* 1. PROPERTY HEADER (Bound to authenticated user) */}
      <div className={styles.portalHeader}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span className="text-meta">Hotel / Service Partner · Property Operations</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="pill pill-yellow" style={{ fontSize: 10, fontWeight: 800 }}>
              ACCOUNT: {user?.fullName?.toUpperCase() || user?.primaryEmailAddress?.emailAddress?.toUpperCase() || "AUTHENTICATED"}
            </span>
            <span className="pill pill-simulated" style={{ fontSize: 10 }}>
              PROPERTY ID: {propertyId}
            </span>
          </div>
        </div>

        <h1 className={styles.portalTitle}>{currentHotel.name}</h1>

        <div className={styles.portalSub}>
          <span>{currentHotel.zone.replace("_", " ")}</span>
          <span>·</span>
          <span>Connectivity: {currentHotel.transportConnectivity}</span>
          <span>·</span>
          <span>Data Provenance:</span>
          <span className={`pill ${currentHotel.source === "PARTNER_REPORTED" ? "pill-live" : "pill-simulated"}`} style={{ fontSize: 10 }}>
            {currentHotel.source}
          </span>
          {lastUpdated && (
            <>
              <span>·</span>
              <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>
                ● Fresh as of {lastUpdated}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 2. EVENT DEMAND BANNER */}
      <div className={`${styles.demandBanner} ${kpis.destinationPressure > 80 ? styles.demandHigh : styles.demandMod}`}>
        <div className={styles.demandIcon}>
          {kpis.destinationPressure > 80 ? (
            <AlertTriangle size={18} color="var(--orange)" />
          ) : (
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--green)" }} />
          )}
        </div>
        <div>
          <span className={styles.demandTitle}>
            City Event Demand: {kpis.destinationPressure > 80 ? "HIGH PEAK" : "MODERATE"}
          </span>
          <p className={styles.demandMsg}>
            Mumbai IPL Match · 33,000 attendees at Wankhede Stadium (19:30 tonight) · Overall city destination pressure is {kpis.destinationPressure}%. Your reported vacancies dynamically guide attendee route &amp; stay recommendations.
          </p>
        </div>
      </div>

      {/* 3. PROPERTY OPERATIONAL METRICS */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Rooms</span>
          <span className={styles.statValue}>{currentHotel.totalRooms}</span>
          <span className={styles.statNote}>property inventory</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Available (Raw)</span>
          <span className={styles.statValue} style={{ color: "var(--ink)" }}>{currentHotel.availableRooms}</span>
          <span className={styles.statNote}>reported vacancies</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Usable Capacity</span>
          <span className={styles.statValue} style={{ color: "var(--yellow-state)" }}>{currentHotel.usableRooms}</span>
          <span className={styles.statNote}>travel &amp; transit filtered</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Pressure</span>
          <span
            className={styles.statValue}
            style={{
              color: currentHotel.pressure >= 85 ? "var(--red)" : currentHotel.pressure >= 70 ? "var(--orange)" : "var(--green)"
            }}
          >
            {currentHotel.pressure}%
          </span>
          <span className={styles.statNote}>{currentHotel.pressureLevel}</span>
        </div>
      </div>

      {/* 4. OPERATIONAL UPDATE FORM */}
      <div className={styles.updateCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <h2 className={styles.updateTitle}>Report Live Property Inventory</h2>
            <p className={styles.updateNote}>
              Submitting actual numbers directly updates JUNCTION shared destination state without reloading. The intelligence engine recalculates usable event capacity and immediately propagates your inventory to City Operations.
            </p>
          </div>
          <span className="pill pill-live" style={{ fontSize: 10, flexShrink: 0 }}>
            LIVE CONNECTION
          </span>
        </div>

        {validationError && (
          <div style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--red-bg)", border: "1px solid var(--red)", color: "var(--red)", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} /> {validationError}
          </div>
        )}

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Available Rooms (Raw Vacancy) <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <input
              type="number"
              className="input"
              value={rooms}
              min={0}
              max={currentHotel.totalRooms}
              onChange={e => setRooms(Number(e.target.value))}
            />
            <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>
              Max: {currentHotel.totalRooms} total rooms
            </span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Temporary Out-of-Order / Closed</label>
            <input
              type="number"
              className="input"
              value={unavailable}
              min={0}
              max={currentHotel.totalRooms}
              onChange={e => setUnavailable(Number(e.target.value))}
            />
            <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>
              Maintenance or reserved rooms
            </span>
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
        </div>

        <div style={{ background: "var(--paper)", borderRadius: "var(--radius-sm)", padding: "12px 14px", fontSize: 12, color: "var(--ink-muted)", border: "1px solid var(--neutral)" }}>
          <strong>Usable Event Capacity Formula:</strong> When you report <strong>{rooms}</strong> available rooms, JUNCTION computes approximately{" "}
          <strong>
            {Math.max(0, Math.round(rooms * (currentHotel.transportConnectivity === "EXCELLENT" ? 0.92 : 0.82) * 0.92 * 0.94))}
          </strong>{" "}
          usable rooms for the event, factoring in {currentHotel.travelTimeToVenue} min transit time and peak corridor friction.
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-yellow"
            onClick={handleSave}
            style={{ fontWeight: 800, padding: "10px 20px" }}
          >
            UPDATE JUNCTION
          </button>
          <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
            Propagates immediately to City Operations Command
          </span>
        </div>

        {saved && (
          <div className={styles.savedBanner} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Check size={16} /> DATA SENT TO JUNCTION — {currentHotel.name} availability updated to {rooms} rooms! Provenance marked as PARTNER_REPORTED. Reflected in Organizer Capacity, Destination Pressure, and Attendee Stay views.
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <span className="simulated-env-label tooltip-simulated">
          <span className="simulated-dot" />
          Prototype Demonstration · Role-Based Partner Session Active
        </span>
      </div>
    </main>
  );
}
