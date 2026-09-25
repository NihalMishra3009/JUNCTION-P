"use client";
import React, { useMemo } from "react";
import { useApp } from "@/state/AppContext";
import { OPERATIONAL_ZONES } from "@/services/zoneRegistry";
import { ZONE_CAPACITY_PROFILES } from "@/services/sensorFusionEngine";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import styles from "./ZoneInputEvidencePanel.module.css";

interface ZoneInputEvidencePanelProps {
  initialZoneId?: string;
  onClose?: () => void;
}

export default function ZoneInputEvidencePanel({
  initialZoneId,
  onClose,
}: ZoneInputEvidencePanelProps) {
  const {
    zones,
    devices,
    latestObservations,
    faultInjections,
    toggleDeviceOutage,
    toggleDeviceLag,
    toggleDeviceConflict,
    resetFaultInjections,
    selectedEvidenceZoneId,
    setSelectedEvidenceZoneId,
  } = useApp();

  const currentZoneId = initialZoneId || selectedEvidenceZoneId || "ZONE_CHURCHGATE";
  const activeZoneDef = useMemo(
    () => OPERATIONAL_ZONES.find(z => z.id === currentZoneId) || OPERATIONAL_ZONES[0],
    [currentZoneId]
  );
  const activeZoneState = useMemo(
    () => zones.find(z => z.id === currentZoneId),
    [zones, currentZoneId]
  );

  // Filter devices assigned to this zone
  const zoneDevices = useMemo(
    () => devices.filter(d => d.zoneId === currentZoneId),
    [devices, currentZoneId]
  );

  // Filter normalized observations for this zone
  const zoneObservations = useMemo(
    () => latestObservations.filter(o => o.zoneId === currentZoneId),
    [latestObservations, currentZoneId]
  );

  const capacityProfile = ZONE_CAPACITY_PROFILES[currentZoneId] || {
    basis: "CONCOURSE_EGRESS",
    operationalCapacity: activeZoneDef.nominalPedestrianCapacity || 5000,
    safetyBufferPercent: 7,
    assumptions: "Default fallback operational capacity basis.",
  };

  const diagnostics = activeZoneState?.fusionDiagnostics;

  return (
    <div className={styles.panel}>
      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.heading}>
            <span>🔬 Input Pipeline &amp; Sensor Fusion Evidence</span>
            {onClose && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onClose}
                style={{ fontSize: 11, padding: "2px 6px" }}
              >
                ✕ Close
              </button>
            )}
          </div>
          <span className={styles.subheading}>
            Live provenance audit answering: <em>&ldquo;Where did this zone&rsquo;s estimated people count and percentage come from?&rdquo;</em>
          </span>
        </div>

        {/* ZONE SELECTOR BUTTONS */}
        <div className={styles.zoneSelector}>
          {OPERATIONAL_ZONES.map(z => {
            const isSelected = z.id === currentZoneId;
            const zs = zones.find(item => item.id === z.id);
            return (
              <button
                key={z.id}
                type="button"
                className={`${styles.zoneBtn} ${isSelected ? styles.zoneBtnActive : ""}`}
                onClick={() => setSelectedEvidenceZoneId(z.id)}
              >
                {z.shortName} ({zs?.pressure ?? 0}%)
              </button>
            );
          })}
        </div>
      </div>

      {/* CORE KPI SUMMARY */}
      <div className={styles.overviewGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Selected Zone</span>
          <span className={styles.kpiVal} style={{ fontSize: 15 }}>{activeZoneDef.name}</span>
          <span className={styles.kpiSub}>Tier: {activeZoneDef.tier.replace(/_/g, " ")}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Fused Occupancy</span>
          <span className={styles.kpiVal} style={{ color: "var(--ink)" }}>
            {activeZoneState?.currentUtilization.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 500 }}>persons</span>
          </span>
          <span className={styles.kpiSub}>Weighted multi-sensor consensus</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Capacity Utilization</span>
          <span
            className={styles.kpiVal}
            style={{
              color: (activeZoneState?.pressure ?? 0) >= 85
                ? "var(--red)"
                : (activeZoneState?.pressure ?? 0) >= 70
                ? "var(--orange)"
                : "var(--green)",
            }}
          >
            {activeZoneState?.pressure}%
          </span>
          <span className={styles.kpiSub}>Basis: {capacityProfile.basis}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Spatial Density</span>
          <span className={styles.kpiVal}>
            {activeZoneState?.density ?? 0} <span style={{ fontSize: 11, fontWeight: 500 }}>people/m²</span>
          </span>
          <span className={styles.kpiSub}>Coverage: {activeZoneDef.radiusMeters}m radius</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Net Flow</span>
          <span className={styles.kpiVal}>
            {activeZoneState?.inflowRate} in / {activeZoneState?.outflowRate} out
          </span>
          <span className={styles.kpiSub}>people/min (net: {activeZoneState?.netFlow})</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Data Quality &amp; Confidence</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span
              className={`pill ${
                activeZoneState?.dataQuality === "FRESH"
                  ? "pill-live"
                  : activeZoneState?.dataQuality === "CONFLICTING"
                  ? "pill-critical"
                  : "pill-watch"
              }`}
            >
              {activeZoneState?.dataQuality || "FRESH"}
            </span>
            <ConfidenceBadge source={activeZoneState?.source || "SIMULATED"} />
          </div>
          <span className={styles.kpiSub}>Confidence Score: {Math.round((activeZoneState?.confidence ?? 0.8) * 100)}%</span>
        </div>
      </div>

      {/* CONFLICT OR MISSING SENSORS ALERT */}
      {diagnostics && diagnostics.conflicts.length > 0 && (
        <div className={`${styles.alertBox} ${styles.alertBoxConflict}`}>
          <span>⚠</span>
          <div>
            <strong>Sensor Conflict Detected:</strong> {diagnostics.conflicts.join("; ")}
            <div style={{ fontSize: 10, marginTop: 2, opacity: 0.9 }}>
              Applied +10% risk penalty to pressure and scaled down overall data confidence by 30%.
            </div>
          </div>
        </div>
      )}

      {diagnostics && diagnostics.missingSensors.length > 0 && (
        <div className={`${styles.alertBox} ${styles.alertBoxWarning}`}>
          <span>ℹ</span>
          <div>
            <strong>Missing / Offline Sensors:</strong> {diagnostics.missingSensors.join(", ")}
            <div style={{ fontSize: 10, marginTop: 2 }}>
              Fusion engine gracefully degraded and weighted remaining active sensor observations.
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: SENSOR SOURCES ASSIGNED TO ZONE */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span>1. Assigned Sensor Hardware Devices (Device Registry)</span>
          <span className="text-meta">{zoneDevices.length} registered hardware nodes</span>
        </div>
        {zoneDevices.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--ink-muted)", padding: "8px 0" }}>
            No specialized hardware sensors registered for this zone. System utilizes secondary topology propagation and regional baseline models.
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Device Name / ID</th>
                  <th>Hardware Type</th>
                  <th>Nominal Accuracy</th>
                  <th>Reliability</th>
                  <th>Coverage</th>
                  <th>Health Status</th>
                  <th>Fault Injection Toggles</th>
                </tr>
              </thead>
              <tbody>
                {zoneDevices.map(d => {
                  const isOutage = faultInjections.outageDeviceIds.includes(d.id);
                  const isLagged = faultInjections.lagDeviceIds.includes(d.id);
                  const isConflict = faultInjections.conflictDeviceIds.includes(d.id);

                  return (
                    <tr key={d.id}>
                      <td>
                        <strong>{d.name}</strong>
                        <div style={{ fontSize: 9, color: "var(--ink-faint)", fontFamily: "monospace" }}>{d.id}</div>
                      </td>
                      <td>
                        <span className="pill pill-simulated" style={{ fontSize: 9 }}>{d.type}</span>
                      </td>
                      <td>{Math.round(d.nominalAccuracy * 100)}%</td>
                      <td>{Math.round(d.reliabilityScore * 100)}%</td>
                      <td>{d.coverageAreaMeters ? `${d.coverageAreaMeters} m²` : "Direct Hub"}</td>
                      <td>
                        <span
                          className={`pill ${
                            isOutage
                              ? "pill-critical"
                              : d.health.status === "HEALTHY"
                              ? "pill-live"
                              : "pill-watch"
                          }`}
                          style={{ fontSize: 9 }}
                        >
                          {isOutage ? "OFFLINE (FAULT)" : d.health.status}
                        </span>
                      </td>
                      <td>
                        <div className={styles.faultControls}>
                          <button
                            type="button"
                            className={`${styles.faultBtn} ${isOutage ? styles.faultBtnActive : ""}`}
                            onClick={() => toggleDeviceOutage(d.id)}
                            title="Simulate hardware disconnect / link failure"
                          >
                            {isOutage ? "Outage: ON" : "Outage"}
                          </button>
                          <button
                            type="button"
                            className={`${styles.faultBtn} ${isLagged ? styles.faultBtnLagActive : ""}`}
                            onClick={() => toggleDeviceLag(d.id)}
                            title="Simulate telemetry network lag (120s stale)"
                          >
                            {isLagged ? "Lag: ON" : "Lag (Stale)"}
                          </button>
                          <button
                            type="button"
                            className={`${styles.faultBtn} ${isConflict ? styles.faultBtnActive : ""}`}
                            onClick={() => toggleDeviceConflict(d.id)}
                            title="Simulate severe optical/mechanical count discrepancy"
                          >
                            {isConflict ? "Conflict: ON" : "Conflict"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* STEP 2: RAW MEASUREMENTS & NORMALIZED OBSERVATIONS */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span>2. Current Normalized Observations (Ingestion Pipeline)</span>
          <span className="text-meta">{zoneObservations.length} observations in current tick</span>
        </div>
        {zoneObservations.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--ink-muted)", padding: "8px 0" }}>
            No live observations currently ingested (all sensors offline or zone uninstrumented).
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Observation ID</th>
                  <th>Source Device</th>
                  <th>Metric Type</th>
                  <th>Measured Value &amp; Unit</th>
                  <th>Quality Status</th>
                  <th>Freshness</th>
                  <th>Source Confidence</th>
                </tr>
              </thead>
              <tbody>
                {zoneObservations.map(o => {
                  const dev = devices.find(d => d.id === o.sourceId);
                  return (
                    <tr key={o.id}>
                      <td style={{ fontFamily: "monospace", fontSize: 10 }}>{o.id.slice(0, 24)}...</td>
                      <td>{dev?.name || o.sourceId}</td>
                      <td>
                        <span className="pill pill-yellow" style={{ fontSize: 9 }}>{o.metricType}</span>
                      </td>
                      <td>
                        <strong>{typeof o.value === "number" ? o.value.toLocaleString() : o.value}</strong>{" "}
                        <span style={{ fontSize: 10, color: "var(--ink-muted)" }}>{o.unit}</span>
                      </td>
                      <td>
                        <span
                          className={`pill ${
                            o.qualityStatus === "FRESH"
                              ? "pill-live"
                              : o.qualityStatus === "CONFLICTING"
                              ? "pill-critical"
                              : "pill-watch"
                          }`}
                          style={{ fontSize: 9 }}
                        >
                          {o.qualityStatus}
                        </span>
                      </td>
                      <td>{o.freshnessSeconds === 0 ? "0s (Real-Time)" : `+${o.freshnessSeconds}s (Delayed)`}</td>
                      <td>{Math.round(o.confidence * 100)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* STEP 3: FUSION CALCULATION & EXPLAINABLE DERIVATION */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span>3. Mathematical Fusion Derivation &amp; Capacity Basis</span>
          <span className="text-meta">Sensor Fusion Engine (DR-001)</span>
        </div>

        <div className={styles.mathBox}>
          <div>
            <strong>Operational Capacity Profile:</strong>{" "}
            <span className={styles.mathCode}>{capacityProfile.basis}</span> &middot; Nominal Operational Limit:{" "}
            <strong>{capacityProfile.operationalCapacity.toLocaleString()} persons</strong> (with {capacityProfile.safetyBufferPercent}% safety buffer &rarr;{" "}
            <strong>{Math.round(capacityProfile.operationalCapacity * (1 - capacityProfile.safetyBufferPercent / 100)).toLocaleString()} usable threshold</strong>)
          </div>
          <div style={{ fontSize: 10, color: "var(--ink-muted)" }}>
            <em>Operational Assumption:</em> {capacityProfile.assumptions}
          </div>

          <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #cbd5e1" }}>
            <strong>Fusion Formula:</strong>
            <div className={styles.mathCode} style={{ marginTop: 3, display: "inline-block" }}>
              Fused Occupancy = &Sigma; (Count_i &times; Confidence_i &times; Reliability_i &times; FreshnessMult_i) / &Sigma; Weights
            </div>
          </div>

          {diagnostics && diagnostics.contributingSensors.filter(c => c.metricType === "CROWD_COUNT").length > 0 ? (
            <div style={{ marginTop: 4 }}>
              <strong>Step-by-Step Calculation:</strong>
              <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                {diagnostics.contributingSensors
                  .filter(c => c.metricType === "CROWD_COUNT")
                  .map(c => (
                    <div key={c.deviceId} style={{ fontSize: 10, color: "var(--ink-light)" }}>
                      &bull; {c.deviceName}: <strong>{c.value.toLocaleString()} {c.unit}</strong> &times; weight {c.weight}{" "}
                      <span style={{ color: "var(--ink-faint)" }}>
                        (Conf: {c.confidence} &times; Rel: {devices.find(d => d.id === c.deviceId)?.reliabilityScore ?? 0.85} &times; Freshness: {c.qualityStatus === "STALE" ? "0.35" : "1.0"})
                      </span>{" "}
                      = {(c.value * c.weight).toFixed(1)}
                    </div>
                  ))}
                <div style={{ fontWeight: 700, marginTop: 4, color: "var(--ink)" }}>
                  &rArr; Fused Headcount = <strong>{activeZoneState?.currentUtilization.toLocaleString()} persons</strong>
                </div>
                <div style={{ fontWeight: 700, color: "var(--ink)" }}>
                  &rArr; Capacity Utilization % = ({activeZoneState?.currentUtilization} / {Math.round(capacityProfile.operationalCapacity * (1 - capacityProfile.safetyBufferPercent / 100))}) &times; 100{" "}
                  {diagnostics.conflicts.length > 0 ? "+ 10% (conflict penalty) " : ""}
                  = <strong style={{ color: "var(--red)" }}>{activeZoneState?.pressure}%</strong>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 4 }}>
              Zero direct crowd counter observations. Fused state produced via topological simulation node loads and legacy corridor fallbacks.
            </div>
          )}
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
        <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
          Active Simulation Faults: {faultInjections.outageDeviceIds.length} outages, {faultInjections.lagDeviceIds.length} lagged, {faultInjections.conflictDeviceIds.length} conflicts.
        </span>
        {(faultInjections.outageDeviceIds.length > 0 ||
          faultInjections.lagDeviceIds.length > 0 ||
          faultInjections.conflictDeviceIds.length > 0) && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={resetFaultInjections}
            style={{ fontSize: 11 }}
          >
            ↻ Reset All Simulated Faults
          </button>
        )}
      </div>
    </div>
  );
}
