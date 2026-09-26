"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { AlertTriangle, Check, RefreshCw, UtensilsCrossed, ExternalLink, ShieldAlert, Building2 } from "lucide-react";
import { Restaurant } from "@/types";
import styles from "./partner.module.css";

// ── Types ──────────────────────────────────────────────────────────────────────

interface IdentityResult {
  success: true;
  junctionRole: "RESTAURANT_PARTNER";
  propertyType: "RESTAURANT";
  propertyId: string;
  establishment: Restaurant;
  userEmail?: string;
  userName?: string;
}

interface IdentityError {
  error: string;
  message?: string;
  junctionRole?: string | null;
  propertyId?: string;
  isOrganizer?: boolean;
  userEmail?: string;
  userName?: string;
}

type IdentityState =
  | { status: "loading" }
  | { status: "role_not_assigned"; message: string; userEmail?: string; userName?: string }
  | { status: "unassigned"; message: string; junctionRole?: string; userEmail?: string; userName?: string }
  | { status: "organizer_account"; message: string; userEmail?: string; userName?: string }
  | { status: "invalid_property"; message: string; propertyId?: string; userEmail?: string; userName?: string }
  | { status: "error"; message: string }
  | { status: "ready"; identity: IdentityResult };

// ── Helpers ────────────────────────────────────────────────────────────────────

function pressureColor(p: number): string {
  if (p >= 85) return "var(--red, #dc2626)";
  if (p >= 70) return "var(--orange, #ea580c)";
  if (p >= 50) return "var(--yellow-state, #d97706)";
  return "var(--green, #059669)";
}

function pressureLabel(p: number): string {
  if (p >= 85) return "CRITICAL PEAK";
  if (p >= 70) return "HIGH SURGE";
  if (p >= 50) return "WATCH";
  return "NORMAL";
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PartnerPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [identityState, setIdentityState] = useState<IdentityState>({ status: "loading" });

  // Restaurant form state
  const [availableTables, setAvailableTables] = useState(0);

  // Submission state
  const [validationError, setValidationError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // ── Load Identity from Clerk server-side via API ──────────────────────────

  const loadIdentity = useCallback(async () => {
    setIdentityState({ status: "loading" });
    try {
      const res = await fetch("/api/partner/identity");
      const data = await res.json();

      if (res.status === 401) {
        setIdentityState({ status: "error", message: "Session expired. Please sign in again." });
        return;
      }

      if (!res.ok) {
        const errData = data as IdentityError;

        if (errData.error === "ORGANIZER_ACCOUNT" || errData.isOrganizer) {
          setIdentityState({
            status: "organizer_account",
            message: errData.message || "You are authenticated as an Event Organizer.",
            userEmail: errData.userEmail,
            userName: errData.userName,
          });
          return;
        }

        if (errData.error === "ROLE_NOT_ASSIGNED") {
          setIdentityState({
            status: "role_not_assigned",
            message: errData.message || "Your Clerk account is authenticated, but no JUNCTION role has been assigned yet.",
            userEmail: errData.userEmail,
            userName: errData.userName,
          });
          return;
        }

        if (errData.error === "UNASSIGNED_PROPERTY" || res.status === 404) {
          setIdentityState({
            status: "unassigned",
            message: errData.message || "Your JUNCTION restaurant access has not been assigned yet.",
            junctionRole: errData.junctionRole || undefined,
            userEmail: errData.userEmail,
            userName: errData.userName,
          });
          return;
        }

        if (errData.error === "INVALID_PROPERTY_ID") {
          setIdentityState({
            status: "invalid_property",
            message: errData.message || `Property ID is not a valid Restaurant Partner establishment.`,
            propertyId: errData.propertyId,
            userEmail: errData.userEmail,
            userName: errData.userName,
          });
          return;
        }

        setIdentityState({ status: "error", message: errData.message || errData.error || "Failed to load identity." });
        return;
      }

      const identity = data as IdentityResult;
      setIdentityState({ status: "ready", identity });
      setAvailableTables(identity.establishment.availableTables);
    } catch {
      setIdentityState({ status: "error", message: "Network error. Could not reach JUNCTION server." });
    }
  }, []);

  useEffect(() => {
    if (user) loadIdentity();
  }, [user, loadIdentity]);

  // ── Submit Inventory Update ────────────────────────────────────────────────

  const handleSave = async () => {
    if (identityState.status !== "ready") return;
    const { identity } = identityState;
    const restaurant = identity.establishment;

    setValidationError("");
    setSubmitting(true);

    if (isNaN(availableTables) || availableTables < 0) {
      setValidationError("Available tables cannot be negative.");
      setSubmitting(false);
      return;
    }

    const maxTables = Math.ceil(restaurant.capacity / 4);
    if (availableTables > maxTables + 10) {
      setValidationError(`Available tables (${availableTables}) exceeds maximum table capacity (${maxTables}) for ${restaurant.name}.`);
      setSubmitting(false);
      return;
    }

    try {
      // Server validates propertyId from Clerk metadata (ignoring client body propertyId)
      const res = await fetch("/api/partner/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availableTables }),
      });

      const data = await res.json();

      if (!res.ok) {
        setValidationError(data.error || "Server validation failed.");
        setSubmitting(false);
        return;
      }

      // Update local state with confirmed server update
      identity.establishment.availableTables = availableTables;

      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLastUpdated(timeStr);
      setSaved(true);
      setTimeout(() => setSaved(false), 6000);
    } catch {
      setValidationError("Network error. Could not reach JUNCTION server.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render Access States ───────────────────────────────────────────────────

  if (identityState.status === "loading") {
    return (
      <main className={styles.main}>
        <div className={styles.stateBox}>
          <RefreshCw size={24} className={styles.spinIcon} style={{ color: "var(--ink)" }} />
          <span className={styles.stateTitle}>Verifying Restaurant Partner Identity…</span>
          <p className={styles.stateMsg}>Connecting to Clerk authentication service and verifying restaurant metadata.</p>
        </div>
      </main>
    );
  }

  if (identityState.status === "organizer_account") {
    return (
      <main className={styles.main}>
        <div className={styles.stateBox} style={{ borderColor: "var(--red, #dc2626)" }}>
          <Building2 size={24} color="var(--red, #dc2626)" />
          <span className={styles.stateTitle} style={{ color: "var(--red, #dc2626)" }}>Access Denied: Role Mismatch</span>
          <p className={styles.stateMsg}>This account is configured as an Organizer, not a Restaurant Partner.</p>
          <p className={styles.stateMsg}>
            Authenticated Account: <strong>{identityState.userEmail || user?.primaryEmailAddress?.emailAddress}</strong>
          </p>
          <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="btn btn-outline" onClick={() => signOut({ redirectUrl: "/login" })} style={{ fontWeight: 700 }}>
              Sign Out
            </button>
            <Link href="/login" className="btn btn-outline" style={{ fontWeight: 700 }}>
              Return to Role Selection
            </Link>
            <Link href="/organizer" className="btn btn-yellow" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 800 }}>
              Go to Organizer Dashboard <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (identityState.status === "role_not_assigned") {
    return (
      <main className={styles.main}>
        <div className={styles.stateBox} style={{ borderColor: "var(--orange)" }}>
          <ShieldAlert size={24} color="var(--orange)" />
          <span className={styles.stateTitle} style={{ color: "var(--orange)" }}>JUNCTION Access Setup Needed</span>
          <p className={styles.stateMsg}>{identityState.message}</p>
          <p className={styles.stateMsg}>
            Account: <strong>{identityState.userEmail || user?.primaryEmailAddress?.emailAddress}</strong>
          </p>
          <p className={styles.stateMsg} style={{ fontSize: 12, marginTop: 4 }}>
            A JUNCTION administrator must set <code>junctionRole = "RESTAURANT_PARTNER"</code> and <code>propertyId = "R1"..."R5"</code> in your Clerk user metadata.
          </p>
        </div>
      </main>
    );
  }

  if (identityState.status === "unassigned") {
    return (
      <main className={styles.main}>
        <div className={styles.stateBox} style={{ borderColor: "var(--orange)" }}>
          <UtensilsCrossed size={24} color="var(--orange)" />
          <span className={styles.stateTitle} style={{ color: "var(--orange)" }}>Restaurant Access Not Configured</span>
          <p className={styles.stateMsg}>{identityState.message}</p>
          <p className={styles.stateMsg}>
            Account: <strong>{identityState.userEmail || user?.primaryEmailAddress?.emailAddress}</strong>
          </p>
          <p className={styles.stateMsg} style={{ fontSize: 12, marginTop: 4 }}>
            A JUNCTION administrator must set your <code>propertyId</code> to a valid restaurant ID (R1, R2, R3, R4, or R5) in Clerk publicMetadata.
          </p>
        </div>
      </main>
    );
  }

  if (identityState.status === "invalid_property") {
    return (
      <main className={styles.main}>
        <div className={styles.stateBox} style={{ borderColor: "var(--red)" }}>
          <AlertTriangle size={24} color="var(--red)" />
          <span className={styles.stateTitle} style={{ color: "var(--red)" }}>Invalid Restaurant ID Assignment</span>
          <p className={styles.stateMsg}>{identityState.message}</p>
          <p className={styles.stateMsg} style={{ fontSize: 12, marginTop: 4 }}>
            Only canonical restaurant IDs (R1–R5) are supported in the Restaurant Partner Portal. Hotel IDs (H1–H5) cannot be used here.
          </p>
        </div>
      </main>
    );
  }

  if (identityState.status === "error") {
    return (
      <main className={styles.main}>
        <div className={styles.stateBox} style={{ borderColor: "var(--red)" }}>
          <AlertTriangle size={24} color="var(--red)" />
          <span className={styles.stateTitle} style={{ color: "var(--red)" }}>Authentication Error</span>
          <p className={styles.stateMsg}>{identityState.message}</p>
          <button className="btn btn-outline" onClick={loadIdentity} style={{ marginTop: 12 }}>
            Retry Authentication
          </button>
        </div>
      </main>
    );
  }

  // ── Ready State: Render Restaurant Partner Portal ──────────────────────────
  const { identity } = identityState;
  const restaurant = identity.establishment;

  return (
    <main className={styles.main}>
      {/* ── 1. ESTABLISHMENT HEADER ──────────────────────────────────────── */}
      <div className={styles.portalHeader}>
        <div className={styles.portalHeaderTop}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UtensilsCrossed size={16} style={{ color: "var(--ink)" }} />
            <span className="text-meta" style={{ letterSpacing: "0.08em", fontWeight: 700 }}>
              RESTAURANT PARTNER PORTAL · DINING OPERATIONS
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="pill pill-simulated" style={{ fontSize: 10, fontWeight: 800 }}>
              ID: {restaurant.id}
            </span>
            <span className="pill pill-yellow" style={{ fontSize: 10, fontWeight: 800 }}>
              {user?.fullName || user?.primaryEmailAddress?.emailAddress || "RESTAURANT PARTNER"}
            </span>
          </div>
        </div>

        <h1 className={styles.portalTitle}>{restaurant.name}</h1>

        <div className={styles.portalSub}>
          <span>Zone: {restaurant.zone.replace("_", " ")}</span>
          <span>·</span>
          <span>Cuisine: {restaurant.cuisine}</span>
          <span>·</span>
          <span>Distance to Venue: {restaurant.distanceFromVenue} min walk</span>
          <span>·</span>
          <span>Provenance:</span>
          <span className="pill pill-live" style={{ fontSize: 10 }}>
            PARTNER_REPORTED
          </span>
          {lastUpdated && (
            <>
              <span>·</span>
              <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>
                Fresh as of {lastUpdated}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── 2. KPI ROW ───────────────────────────────────────────────────── */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Cover Capacity</span>
          <span className={styles.kpiValue}>{restaurant.capacity}</span>
          <span className={styles.kpiNote}>maximum dining covers</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Current Seated Occupancy</span>
          <span className={styles.kpiValue}>{restaurant.currentOccupancy}</span>
          <span className={styles.kpiNote}>guests currently seated</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Available Tables</span>
          <span className={styles.kpiValue} style={{ color: "var(--green)" }}>
            {restaurant.availableTables}
          </span>
          <span className={styles.kpiNote}>ready to seat</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Estimated Wait Time</span>
          <span className={styles.kpiValue}>{restaurant.waitTime} min</span>
          <span className={styles.kpiNote}>current walk-in queue</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Demand Pressure</span>
          <span className={styles.kpiValue} style={{ color: pressureColor(restaurant.pressure) }}>
            {restaurant.pressure}%
          </span>
          <span className={styles.kpiNote}>{pressureLabel(restaurant.pressure)}</span>
        </div>
      </div>

      {/* ── 3. MAIN AREA: OPERATIONAL STATUS & INVENTORY FORM ───────────── */}
      <div className={styles.contentGrid}>
        {/* LEFT: Operational Status */}
        <div className={styles.contentLeft}>
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Operational Status</h2>

            <div className={styles.stateRow}>
              <span className={styles.stateKey}>Restaurant ID</span>
              <span className={styles.stateVal}>{restaurant.id}</span>
            </div>
            <div className={styles.stateRow}>
              <span className={styles.stateKey}>Establishment Name</span>
              <span className={styles.stateVal}>{restaurant.name}</span>
            </div>
            <div className={styles.stateRow}>
              <span className={styles.stateKey}>Zone</span>
              <span className={styles.stateVal}>{restaurant.zone.replace("_", " ")}</span>
            </div>
            <div className={styles.stateRow}>
              <span className={styles.stateKey}>Cuisine Type</span>
              <span className={styles.stateVal}>{restaurant.cuisine}</span>
            </div>
            <div className={styles.stateRow}>
              <span className={styles.stateKey}>Walk Distance to Venue</span>
              <span className={styles.stateVal}>{restaurant.distanceFromVenue} min</span>
            </div>
            <div className={styles.stateRow}>
              <span className={styles.stateKey}>Predicted Post-Event Wait</span>
              <span className={styles.stateVal}>{restaurant.predictedWaitTime} min</span>
            </div>
            <div className={styles.stateRow}>
              <span className={styles.stateKey}>Active Event Incentive</span>
              <span className={styles.stateVal}>
                {restaurant.hasIncentive ? restaurant.incentiveLabel || "Active" : "None"}
              </span>
            </div>
            <div className={styles.stateRow}>
              <span className={styles.stateKey}>Pressure Index</span>
              <span className={styles.stateVal} style={{ color: pressureColor(restaurant.pressure), fontWeight: 800 }}>
                {restaurant.pressure}% ({pressureLabel(restaurant.pressure)})
              </span>
            </div>

            {/* Pressure Bar */}
            <div style={{ marginTop: 12 }}>
              <div className={styles.pressureBarLabel}>
                <span>Dining Pressure Gauge</span>
                <span>{restaurant.pressure}%</span>
              </div>
              <div className="pressure-bar">
                <div
                  className="pressure-bar-fill"
                  style={{
                    width: `${restaurant.pressure}%`,
                    background: pressureColor(restaurant.pressure),
                  }}
                />
              </div>
            </div>
          </div>

          <div className={styles.panel} style={{ marginTop: 0 }}>
            <h2 className={styles.panelTitle}>Event Demand Signal</h2>
            <p style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.6 }}>
              <strong>Mumbai IPL Match · 33,000 Attendees</strong>
              <br />
              Wankhede Stadium concourse is experiencing heavy surge. Attendees leaving the stadium are actively guided toward dining options in Zone {restaurant.zone.replace("_", " ")}.
            </p>
          </div>
        </div>

        {/* RIGHT: Table Inventory Update Form */}
        <div className={styles.contentRight}>
          <div className={styles.updateCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <h2 className={styles.updateTitle}>Report Live Table Inventory</h2>
                <p className={styles.updateNote}>
                  Submitting current available table count updates JUNCTION attendee recommendation engines. Verified table availability directs post-event crowds away from congested corridors.
                </p>
              </div>
              <span className="pill pill-live" style={{ fontSize: 10, flexShrink: 0 }}>
                LIVE CONNECTED
              </span>
            </div>

            {validationError && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--red-bg, #fef2f2)",
                  border: "1px solid var(--red, #dc2626)",
                  color: "var(--red, #dc2626)",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <AlertTriangle size={14} /> {validationError}
              </div>
            )}

            <div className={styles.formGrid} style={{ gridTemplateColumns: "1fr" }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Available Tables Ready to Seat <span style={{ color: "var(--red, #dc2626)" }}>*</span>
                </label>
                <input
                  type="number"
                  className="input"
                  value={availableTables}
                  min={0}
                  max={Math.ceil(restaurant.capacity / 4) + 10}
                  onChange={(e) => setAvailableTables(Number(e.target.value))}
                  style={{ fontSize: 16, padding: "10px 14px", fontWeight: 700 }}
                />
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                  Total cover capacity: {restaurant.capacity} covers (approx. {Math.ceil(restaurant.capacity / 4)} tables)
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-yellow"
                onClick={handleSave}
                disabled={submitting}
                style={{ fontWeight: 800, padding: "12px 24px", opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? "UPDATE IN PROGRESS…" : "UPDATE JUNCTION INVENTORY"}
              </button>
              <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                Propagates immediately to City Operations Command
              </span>
            </div>

            {saved && (
              <div className={styles.savedBanner} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Check size={16} /> DATA SENT TO JUNCTION — {restaurant.name} table availability updated to {availableTables} tables! Provenance marked as PARTNER_REPORTED.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. LOWER AREA: TELEMETRY & PROVENANCE ────────────────────────── */}
      <div className={styles.footer}>
        <span className="simulated-env-label tooltip-simulated">
          <span className="simulated-dot" />
          JUNCTION Restaurant Partner Portal · Clerk Authenticated · ID: {restaurant.id} ({restaurant.name})
        </span>
      </div>
    </main>
  );
}
