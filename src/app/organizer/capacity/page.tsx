"use client";
import { useState } from "react";
import { useApp } from "@/state/AppContext";
import PressureIndicator from "@/components/ui/PressureIndicator";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import PageHeader from "@/components/ui/PageHeader";
import ZoneInputEvidencePanel from "@/components/organizer/ZoneInputEvidencePanel";
import styles from "./capacity.module.css";

export default function CapacityPage() {
  const { resources, hotels, kpis, redistributionApplied } = useApp();
  const [activeTab, setActiveTab] = useState<"ALL" | "TRANSPORT" | "HOTELS" | "SENSOR_EVIDENCE">("ALL");

  const sortedResources = [...resources].sort((a, b) => b.pressure - a.pressure);
  const sortedHotels = [...hotels].sort((a, b) => b.pressure - a.pressure);

  const totalRawRooms = hotels.reduce((sum, h) => sum + h.availableRooms, 0);
  const totalUsableRooms = hotels.reduce((sum, h) => sum + h.usableRooms, 0);

  return (
    <div className={styles.page}>
      <PageHeader
        category="PREDICT"
        title="Capacity & Availability"
        subtitle="Real-time usable capacity across transit hubs, venue gates, and hotel partner networks."
        actions={
          <>
            {redistributionApplied && (
              <span className="pill pill-live">REDISTRIBUTION APPLIED</span>
            )}
            <ConfidenceBadge source="SIMULATED" />
          </>
        }
      />


      {/* SUMMARY STATS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <div style={{ background: "var(--white)", border: "1px solid var(--neutral)", borderRadius: "var(--radius-md)", padding: "14px 18px", boxShadow: "var(--shadow-sm)" }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Transit &amp; Venue Spare Capacity</span>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>
            {resources.reduce((sum, r) => sum + r.availableCapacity, 0).toLocaleString()}
          </div>
          <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>available across 7 monitored nodes</span>
        </div>

        <div style={{ background: "var(--white)", border: "1.5px solid var(--yellow-state)", borderRadius: "var(--radius-md)", padding: "14px 18px", boxShadow: "var(--shadow-sm)" }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Usable Hotel Rooms</span>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>
            {totalUsableRooms} <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-muted)" }}>of {totalRawRooms} raw available</span>
          </div>
          <span style={{ fontSize: 11, color: "var(--yellow-state)", fontWeight: 600 }}>
            Filtered for travel distance, transit &amp; event timing
          </span>
        </div>

        <div style={{ background: "var(--white)", border: "1px solid var(--neutral)", borderRadius: "var(--radius-md)", padding: "14px 18px", boxShadow: "var(--shadow-sm)" }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Accommodation Pressure</span>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: kpis.avgHotelPressure >= 85 ? "var(--red)" : kpis.avgHotelPressure >= 70 ? "var(--orange)" : "var(--green)", marginTop: 4 }}>
            {kpis.avgHotelPressure}%
          </div>
          <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>average across Zone A, B, and C properties</span>
        </div>
      </div>

      {/* FILTER TABS */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--neutral)", paddingBottom: 10, flexWrap: "wrap" }}>
        <button
          className={`btn btn-sm ${activeTab === "ALL" ? "btn-yellow" : "btn-outline"}`}
          onClick={() => setActiveTab("ALL")}
        >
          All Resources ({resources.length + hotels.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === "TRANSPORT" ? "btn-yellow" : "btn-outline"}`}
          onClick={() => setActiveTab("TRANSPORT")}
        >
          Transport &amp; Venue ({resources.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === "HOTELS" ? "btn-yellow" : "btn-outline"}`}
          onClick={() => setActiveTab("HOTELS")}
        >
          Hotel Partners ({hotels.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === "SENSOR_EVIDENCE" ? "btn-yellow" : "btn-outline"}`}
          onClick={() => setActiveTab("SENSOR_EVIDENCE")}
          style={{ borderLeft: "2px solid var(--yellow-state)" }}
        >
          🔬 Sensor Fusion Evidence &amp; Audit
        </button>
      </div>

      {/* TRANSPORT & VENUE TABLE */}
      {(activeTab === "ALL" || activeTab === "TRANSPORT") && (
        <div>
          <span className="text-meta" style={{ marginBottom: 8, display: "block" }}>Transport &amp; Venue Nodes</span>
          <div className={styles.table}>
            <div className={styles.thead}>
              <span>Resource</span>
              <span>Type</span>
              <span>Current</span>
              <span>Predicted</span>
              <span>Capacity</span>
              <span>Pressure</span>
              <span>Trend</span>
              <span>Status</span>
            </div>
            {sortedResources.map(r => (
              <div key={r.id} className={styles.trow}>
                <div className={styles.nameCell}>
                  <span className={styles.resName}>{r.name}</span>
                  <span className={styles.resZone}>{r.zone.replace("_", " ")}</span>
                </div>
                <span className={`pill ${r.type === "VENUE" ? "pill-yellow" : r.type === "STATION" ? "pill-predicted" : "pill-simulated"}`} style={{ fontSize: 9 }}>
                  {r.type}
                </span>
                <span className={styles.numCell}>{r.currentUtilization.toLocaleString()}</span>
                <span className={styles.numCell}>{r.predictedDemand.toLocaleString()}</span>
                <span className={styles.numCell}>{r.totalCapacity.toLocaleString()}</span>
                <div style={{ minWidth: 140 }}>
                  <PressureIndicator pressure={r.pressure} size="sm" />
                </div>
                <span className={r.trend === "INCREASING" ? styles.trendUp : r.trend === "DECREASING" ? styles.trendDown : styles.trendStable}>
                  {r.trend === "INCREASING" ? "↑ Rising" : r.trend === "DECREASING" ? "↓ Falling" : "→ Stable"}
                </span>
                <span className={`pill ${r.operatingStatus === "OPERATIONAL" ? "pill-live" : r.operatingStatus === "DISRUPTED" ? "pill-critical" : "pill-watch"}`}>
                  {r.operatingStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HOTEL CAPACITY TABLE */}
      {(activeTab === "ALL" || activeTab === "HOTELS") && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span className="text-meta">Accommodation &amp; Hotel Inventory (Preserving Usable Capacity Distinction)</span>
            <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>*Usable rooms account for transit accessibility &amp; event timing</span>
          </div>
          <div className={styles.table}>
            <div className={styles.thead} style={{ gridTemplateColumns: "220px 100px 90px 90px 90px 140px 110px 130px" }}>
              <span>Property</span>
              <span>Zone</span>
              <span>Available</span>
              <span>Usable*</span>
              <span>Total</span>
              <span>Pressure</span>
              <span>Transit</span>
              <span>Source</span>
            </div>
            {sortedHotels.map(h => (
              <div key={h.id} className={styles.trow} style={{ gridTemplateColumns: "220px 100px 90px 90px 90px 140px 110px 130px" }}>
                <div className={styles.nameCell}>
                  <span className={styles.resName}>{h.name}</span>
                  <span className={styles.resZone}>{h.travelTimeToVenue} min to venue</span>
                </div>
                <span className="pill pill-simulated" style={{ fontSize: 9 }}>
                  {h.zone.replace("_", " ")}
                </span>
                <span className={styles.numCell}>{h.availableRooms}</span>
                <span className={styles.numCell} style={{ color: "var(--yellow-state)", fontWeight: 700 }}>{h.usableRooms}</span>
                <span className={styles.numCell}>{h.totalRooms}</span>
                <div style={{ minWidth: 120 }}>
                  <PressureIndicator pressure={h.pressure} size="sm" />
                </div>
                <span className="pill pill-predicted" style={{ fontSize: 9 }}>
                  {h.transportConnectivity}
                </span>
                <span className={`pill ${h.source === "PARTNER_REPORTED" ? "pill-live" : "pill-simulated"}`}>
                  {h.source}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SENSOR INPUTS & FUSION EVIDENCE TAB */}
      {activeTab === "SENSOR_EVIDENCE" && (
        <ZoneInputEvidencePanel />
      )}
    </div>
  );
}

