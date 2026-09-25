"use client";

import React from "react";
import Link from "next/link";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          JUNCTION
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="pill pill-live" style={{ fontSize: 10 }}>
            ● PRODUCTION AUTH
          </span>
          <Link href="/" className={styles.backBtn}>
            ← Back to Overview
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.titleArea}>
          <span className="pill pill-yellow" style={{ alignSelf: "center", fontSize: 10, fontWeight: 800 }}>
            AUTHENTICATED ACCESS
          </span>
          <h1 className={styles.title}>Sign in to JUNCTION</h1>
          <p className={styles.subtitle}>
            Select your operational role to enter the secure Clerk authentication flow.
          </p>
        </div>

        <div className={styles.entryGrid}>
          {/* 1. EVENT ORGANIZER ENTRY */}
          <div className={styles.entryCard}>
            <div>
              <div className={styles.entryHeader}>
                <span className={`${styles.entryBadge} ${styles.badgeOrganizer}`}>
                  OPERATIONS COMMAND
                </span>
                <span className={styles.entryIcon}>⌘</span>
              </div>
              <h2 className={styles.entryTitle}>Event Organizer</h2>
              <p className={styles.entryDesc}>
                Destination-wide command: live command map, crowd flow pressure, capacity analytics, predictive bottleneck intelligence, and recommendation approval.
              </p>
            </div>

            <div className={styles.entryFeatures}>
              <div className={styles.featureItem}>
                <span className={styles.featureDot} />
                <span>City-wide command &amp; operations room</span>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureDot} />
                <span>Real-time crowd intelligence &amp; predictions</span>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureDot} />
                <span>What-if simulation &amp; intervention approval</span>
              </div>
            </div>

            <Link href="/login/organizer" className={`${styles.entryBtn} ${styles.btnOrganizer}`}>
              Continue as Event Organizer →
            </Link>
          </div>

          {/* 2. RESTAURANT PARTNER ENTRY */}
          <div className={styles.entryCard}>
            <div>
              <div className={styles.entryHeader}>
                <span className={`${styles.entryBadge} ${styles.badgeRestaurant}`}>
                  HOSPITALITY PARTNER
                </span>
                <span className={styles.entryIcon}>◈</span>
              </div>
              <h2 className={styles.entryTitle}>Restaurant Partner</h2>
              <p className={styles.entryDesc}>
                Property &amp; venue level access: report live table and room availability, view incoming event demand, and manage operational capacity updates in real time.
              </p>
            </div>

            <div className={styles.entryFeatures}>
              <div className={styles.featureItem}>
                <span className={styles.featureDot} style={{ background: "var(--ink)" }} />
                <span>Property-level capacity &amp; inventory updates</span>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureDot} style={{ background: "var(--ink)" }} />
                <span>Incoming event demand signals &amp; alerts</span>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureDot} style={{ background: "var(--ink)" }} />
                <span>Real-time availability telemetry</span>
              </div>
            </div>

            <Link href="/login/restaurant" className={`${styles.entryBtn} ${styles.btnRestaurant}`}>
              Continue as Restaurant Partner →
            </Link>
          </div>
        </div>

        <p className={styles.footerNote}>
          JUNCTION Destination Orchestration Platform · Secure Authentication via Clerk
        </p>
      </main>
    </div>
  );
}
