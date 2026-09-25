"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { useApp } from "@/state/AppContext";
import styles from "./partner.module.css";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded, isSignedIn } = useUser();
  const { hotels } = useApp();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoaded, isSignedIn, router, pathname]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <span className="pill pill-yellow">VERIFYING PARTNER SESSION</span>
          <p style={{ fontSize: 13, color: "var(--ink-muted)", fontFamily: "var(--font-display)" }}>Connecting to hotel operations...</p>
        </div>
      </div>
    );
  }

  // Bound hotel property (defaults to Ramada Dadar for partner portal)
  const boundHotel = hotels.find(h => h.id === "H4") || hotels[0];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/" className={styles.logo}>
            JUNCTION
          </Link>
          <span style={{ color: "var(--neutral)", fontSize: 14 }}>/</span>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ink-light)" }}>
            Partner Portal
          </span>
        </div>

        <div className={styles.headerRight}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 8, borderRight: "1px solid var(--neutral)" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)" }}>
              {boundHotel.name}
            </span>
            <span className="pill pill-yellow" style={{ fontSize: 9, padding: "1px 6px" }}>
              {user?.fullName || user?.primaryEmailAddress?.emailAddress || "PARTNER"}
            </span>
          </div>

          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: {
                  width: 32,
                  height: 32,
                  border: "2px solid #F5C400",
                  borderRadius: "4px",
                },
              },
            }}
          />
        </div>
      </header>

      {children}
    </div>
  );
}
