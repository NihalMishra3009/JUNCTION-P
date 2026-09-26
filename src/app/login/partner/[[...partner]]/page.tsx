"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { SignIn, useUser, useClerk } from "@clerk/nextjs";
import { junctionClerkAppearance } from "@/lib/clerkTheme";
import styles from "@/app/login/login.module.css";
import { UtensilsCrossed, Building2, ShieldAlert } from "lucide-react";

export default function PartnerSignInPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const { signOut } = useClerk();

  const junctionRole = user?.publicMetadata?.junctionRole as string | undefined;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          JUNCTION
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="pill pill-live" style={{ fontSize: 10 }}>
            ● PARTNER AUTH
          </span>
          <Link href="/login" className={styles.backBtn}>
            ← Back to Roles
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.titleArea}>
          <span className="pill pill-yellow" style={{ alignSelf: "center", fontSize: 10, fontWeight: 800 }}>
            RESTAURANT PARTNER PORTAL
          </span>
          <h1 className={styles.title}>Restaurant Partner Sign In</h1>
          <p className={styles.subtitle}>
            Sign in to manage your restaurant's live table capacity, report current availability, and receive event demand signals.
          </p>
        </div>

        {isLoaded && isSignedIn ? (
          <div
            style={{
              maxWidth: 520,
              margin: "20px auto",
              padding: "36px 28px",
              background: "var(--white)",
              border: "1.5px solid var(--ink)",
              textAlign: "center",
              boxShadow: "3px 3px 0px rgba(0,0,0,0.08)",
            }}
          >
            {junctionRole === "RESTAURANT_PARTNER" ? (
              <>
                <UtensilsCrossed size={28} color="var(--ink)" style={{ margin: "0 auto 12px" }} />
                <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-display)", marginBottom: 6 }}>
                  You are signed in as a Restaurant Partner
                </h2>
                <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 16 }}>
                  Account: <strong>{user.fullName || user.primaryEmailAddress?.emailAddress}</strong>
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link href="/partner" className="btn btn-yellow" style={{ fontWeight: 800 }}>
                    Continue to Partner Portal →
                  </Link>
                  <button onClick={() => signOut({ redirectUrl: "/login/partner" })} className="btn btn-outline" style={{ fontWeight: 700 }}>
                    Sign Out &amp; Switch Account
                  </button>
                </div>
              </>
            ) : junctionRole === "ORGANIZER" ? (
              <>
                <Building2 size={28} color="var(--ink)" style={{ margin: "0 auto 12px" }} />
                <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-display)", marginBottom: 6 }}>
                  You are signed in as an Event Organizer
                </h2>
                <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 16 }}>
                  This account is configured for City Operations Command, not the Restaurant Partner Portal.
                  <br />
                  Account: <strong>{user.fullName || user.primaryEmailAddress?.emailAddress}</strong>
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link href="/organizer" className="btn btn-yellow" style={{ fontWeight: 800 }}>
                    Continue to Organizer Console →
                  </Link>
                  <button onClick={() => signOut({ redirectUrl: "/login/partner" })} className="btn btn-outline" style={{ fontWeight: 700 }}>
                    Sign Out &amp; Switch Account
                  </button>
                </div>
              </>
            ) : (
              <>
                <ShieldAlert size={28} color="var(--orange, #ea580c)" style={{ margin: "0 auto 12px" }} />
                <h2 style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-display)", marginBottom: 6, color: "var(--orange, #ea580c)" }}>
                  Restaurant Access Pending Configuration
                </h2>
                <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 16 }}>
                  Your account is authenticated, but restaurant partner access (R1–R5) has not yet been assigned.
                  <br />
                  Account: <strong>{user.fullName || user.primaryEmailAddress?.emailAddress}</strong>
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link href="/login" className="btn btn-outline" style={{ fontWeight: 700 }}>
                    Return to Role Selection
                  </Link>
                  <button onClick={() => signOut({ redirectUrl: "/login/partner" })} className="btn btn-outline" style={{ fontWeight: 700 }}>
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className={styles.authContainer}>
            <Suspense fallback={<div className="spinner" />}>
              <SignIn
                routing="path"
                path="/login/partner"
                fallbackRedirectUrl="/partner"
                forceRedirectUrl="/partner"
                appearance={junctionClerkAppearance}
              />
            </Suspense>
          </div>
        )}

        <div
          style={{
            maxWidth: 440,
            margin: "20px auto 0",
            padding: "14px 18px",
            background: "var(--white)",
            border: "1px solid var(--ink)",
            fontSize: 12,
            color: "var(--ink-muted)",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          <strong>Restaurant Access Provisioning</strong>
          <br />
          Restaurant Partner accounts and property bindings (R1–R5) are provisioned directly by JUNCTION administrators. Newly registered accounts will remain in pending state until assigned.
        </div>

        <p className={styles.footerNote}>
          JUNCTION Destination Orchestration Platform · Secure Authentication via Clerk
        </p>
      </main>
    </div>
  );
}
