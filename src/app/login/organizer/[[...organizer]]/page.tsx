"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { junctionClerkAppearance } from "@/lib/clerkTheme";
import styles from "@/app/login/login.module.css";

export default function OrganizerSignInPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          JUNCTION
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="pill pill-live" style={{ fontSize: 10 }}>
            ● OPERATIONS AUTH
          </span>
          <Link href="/login" className={styles.backBtn}>
            ← Back to Roles
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.titleArea}>
          <span className="pill pill-yellow" style={{ alignSelf: "center", fontSize: 10, fontWeight: 800 }}>
            CITY OPERATIONS COMMAND
          </span>
          <h1 className={styles.title}>Event Organizer Sign In</h1>
          <p className={styles.subtitle}>
            Sign in with your email or Google account to access destination orchestration, live telemetry, and operations command.
          </p>
        </div>

        <div className={styles.authContainer}>
          <Suspense fallback={<div className="spinner" />}>
            <SignIn
              routing="path"
              path="/login/organizer"
              signUpUrl="/sign-up"
              fallbackRedirectUrl="/organizer"
              forceRedirectUrl="/organizer"
              appearance={junctionClerkAppearance}
            />
          </Suspense>
        </div>

        <p className={styles.footerNote}>
          JUNCTION Destination Orchestration Platform · Secure Authentication via Clerk
        </p>
      </main>
    </div>
  );
}
