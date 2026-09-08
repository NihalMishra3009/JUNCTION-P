"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/state/AuthContext";
import { useApp } from "@/state/AppContext";
import styles from "./partner.module.css";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, isAuthenticated, isLoading, logout } = useAuth();
  const { hotels } = useApp();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !currentUser) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (currentUser.role !== "PARTNER") {
        // Organizer trying to access /partner -> redirect to /organizer
        router.replace("/organizer");
      }
    }
  }, [isLoading, isAuthenticated, currentUser, router, pathname]);

  if (isLoading || !isAuthenticated || currentUser?.role !== "PARTNER") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <span className="pill pill-simulated">VERIFYING PARTNER SESSION</span>
          <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>Connecting to hotel operations...</p>
        </div>
      </div>
    );
  }

  // Find bound hotel property
  const boundHotel = hotels.find(h => h.id === currentUser.propertyId) || hotels[0];

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

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
              PARTNER ACCOUNT
            </span>
          </div>

          <Link href="/attendee/stay" className="btn btn-outline btn-sm" title="View attendee stay recommendation">
            Attendee Stay View
          </Link>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
            style={{ color: "var(--red)", fontWeight: 700, fontSize: 11 }}
          >
            Log Out
          </button>
        </div>
      </header>

      {children}
    </div>
  );
}
