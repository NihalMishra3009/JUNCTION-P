"use client";
import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/state/AuthContext";
import styles from "./login.module.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect");

  const { currentUser, isAuthenticated, login, isLoading } = useAuth();

  const [orgUsername, setOrgUsername] = useState("organizer");
  const [orgPassword, setOrgPassword] = useState("password123");
  const [orgError, setOrgError] = useState("");
  const [isSubmittingOrg, setIsSubmittingOrg] = useState(false);

  const [partnerUsername, setPartnerUsername] = useState("ramada");
  const [partnerPassword, setPartnerPassword] = useState("password123");
  const [partnerError, setPartnerError] = useState("");
  const [isSubmittingPartner, setIsSubmittingPartner] = useState(false);

  // If already logged in, redirect automatically to appropriate portal
  useEffect(() => {
    if (!isLoading && isAuthenticated && currentUser) {
      const target = redirectPath || currentUser.defaultRoute;
      router.replace(target);
    }
  }, [isLoading, isAuthenticated, currentUser, redirectPath, router]);

  const handleOrganizerLogin = async (usernameOverride?: string, passwordOverride?: string) => {
    setOrgError("");
    setIsSubmittingOrg(true);
    const u = usernameOverride || orgUsername;
    const p = passwordOverride || orgPassword;

    const res = await login(u, p);
    setIsSubmittingOrg(false);

    if (res.success) {
      const target = (redirectPath && redirectPath.startsWith("/organizer")) ? redirectPath : "/organizer";
      router.push(target);
    } else {
      setOrgError(res.error || "Authentication failed");
    }
  };

  const handlePartnerLogin = async (usernameOverride?: string, passwordOverride?: string) => {
    setPartnerError("");
    setIsSubmittingPartner(true);
    const u = usernameOverride || partnerUsername;
    const p = passwordOverride || partnerPassword;

    const res = await login(u, p);
    setIsSubmittingPartner(false);

    if (res.success) {
      const target = (redirectPath && redirectPath.startsWith("/partner")) ? redirectPath : "/partner";
      router.push(target);
    } else {
      setPartnerError(res.error || "Authentication failed");
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          JUNCTION
        </Link>
        <Link href="/" className="btn btn-outline btn-sm">
          ← Back to Overview
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.titleArea}>
          <span className="pill pill-simulated" style={{ alignSelf: "center" }}>
            AUTHENTICATED ACCESS
          </span>
          <h1 className={styles.title}>Sign in to JUNCTION</h1>
          <p className={styles.subtitle}>
            Select your operational role to access destination orchestration, operational telemetry, or property-level inventory management.
          </p>
        </div>

        <div className={styles.rolesGrid}>
          {/* 1. ORGANIZER CARD */}
          <div className={styles.roleCard}>
            <div className={styles.roleHeader}>
              <div>
                <span className={`${styles.roleBadge} ${styles.badgeOrganizer}`}>
                  OPERATIONS
                </span>
                <h2 className={styles.roleTitle}>City Operations Command</h2>
              </div>
              <span style={{ fontSize: 20 }}>⌘</span>
            </div>

            <p className={styles.roleDesc}>
              Destination-wide monitoring: live Leaflet command map, crowd flow pressure, capacity analytics, predictive bottleneck intelligence, and recommendation approval.
            </p>

            <div className={styles.demoShortcuts}>
              <span className={styles.demoLabel}>Demo Quick Login</span>
              <button
                type="button"
                className={styles.demoBtn}
                onClick={() => handleOrganizerLogin("organizer", "password123")}
                disabled={isSubmittingOrg}
              >
                <div className={styles.demoBtnMain}>
                  <span className={styles.demoBtnName}>City Operations Command</span>
                  <span className={styles.demoBtnDetail}>Username: organizer · Role: ORGANIZER</span>
                </div>
                <span className={styles.demoBtnArrow}>→</span>
              </button>
            </div>

            <div className={styles.divider}>Or enter credentials</div>

            <form
              className={styles.form}
              onSubmit={e => {
                e.preventDefault();
                handleOrganizerLogin();
              }}
            >
              {orgError && <div className={styles.errorBox}>{orgError}</div>}
              <div className={styles.formGroup}>
                <label className={styles.label}>Username</label>
                <input
                  type="text"
                  className="input"
                  value={orgUsername}
                  onChange={e => setOrgUsername(e.target.value)}
                  placeholder="organizer"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Password</label>
                <input
                  type="password"
                  className="input"
                  value={orgPassword}
                  onChange={e => setOrgPassword(e.target.value)}
                  placeholder="password123"
                  required
                />
              </div>
              <button
                type="submit"
                className={`btn btn-primary ${styles.submitBtn}`}
                disabled={isSubmittingOrg}
              >
                {isSubmittingOrg ? "Signing In..." : "SIGN IN AS ORGANIZER →"}
              </button>
            </form>
          </div>

          {/* 2. HOTEL PARTNER CARD */}
          <div className={styles.roleCard}>
            <div className={styles.roleHeader}>
              <div>
                <span className={`${styles.roleBadge} ${styles.badgePartner}`}>
                  HOSPITALITY PARTNER
                </span>
                <h2 className={styles.roleTitle}>Hotel &amp; Service Partner</h2>
              </div>
              <span style={{ fontSize: 20 }}>🏨</span>
            </div>

            <p className={styles.roleDesc}>
              Property-bound access: report live available rooms, incoming check-ins, and out-of-order inventory to update city-wide usable capacity in real time.
            </p>

            <div className={styles.demoShortcuts}>
              <span className={styles.demoLabel}>Demo Quick Login</span>
              <button
                type="button"
                className={styles.demoBtn}
                onClick={() => handlePartnerLogin("ramada", "password123")}
                disabled={isSubmittingPartner}
                style={{ marginBottom: 4 }}
              >
                <div className={styles.demoBtnMain}>
                  <span className={styles.demoBtnName}>Ramada by Wyndham Dadar</span>
                  <span className={styles.demoBtnDetail}>Username: ramada · Property: H4 (Zone C)</span>
                </div>
                <span className={styles.demoBtnArrow}>→</span>
              </button>

              <button
                type="button"
                className={styles.demoBtn}
                onClick={() => handlePartnerLogin("trident", "password123")}
                disabled={isSubmittingPartner}
              >
                <div className={styles.demoBtnMain}>
                  <span className={styles.demoBtnName}>Trident Nariman Point</span>
                  <span className={styles.demoBtnDetail}>Username: trident · Property: H1 (Zone A)</span>
                </div>
                <span className={styles.demoBtnArrow}>→</span>
              </button>
            </div>

            <div className={styles.divider}>Or enter credentials</div>

            <form
              className={styles.form}
              onSubmit={e => {
                e.preventDefault();
                handlePartnerLogin();
              }}
            >
              {partnerError && <div className={styles.errorBox}>{partnerError}</div>}
              <div className={styles.formGroup}>
                <label className={styles.label}>Partner Username</label>
                <input
                  type="text"
                  className="input"
                  value={partnerUsername}
                  onChange={e => setPartnerUsername(e.target.value)}
                  placeholder="ramada or trident"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Password</label>
                <input
                  type="password"
                  className="input"
                  value={partnerPassword}
                  onChange={e => setPartnerPassword(e.target.value)}
                  placeholder="password123"
                  required
                />
              </div>
              <button
                type="submit"
                className={`btn btn-yellow ${styles.submitBtn}`}
                disabled={isSubmittingPartner}
              >
                {isSubmittingPartner ? "Signing In..." : "SIGN IN AS PARTNER →"}
              </button>
            </form>
          </div>
        </div>

        <p className={styles.footerNote}>
          Simulated Authentication · Hackathon Demo Accounts · Credentials pre-filled for evaluation
        </p>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading login...</div>}>
      <LoginForm />
    </Suspense>
  );
}
