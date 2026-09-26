"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useUser, UserButton, SignInButton } from "@clerk/nextjs";
import styles from "./partner.module.css";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace(`/login/restaurant?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoaded, isSignedIn, router, pathname]);

  if (!isLoaded) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <span className="pill pill-yellow">JUNCTION</span>
          <p style={{ fontSize: 13, color: "var(--ink-muted)", fontFamily: "var(--font-display)" }}>Loading partner session…</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 32, border: "1px solid var(--ink)", background: "var(--white)", maxWidth: 400 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, letterSpacing: "0.12em", fontSize: 18 }}>JUNCTION</span>
          <p style={{ fontSize: 13, color: "var(--ink-muted)", textAlign: "center" }}>Sign in to access the Partner Portal.</p>
          <SignInButton mode="redirect" fallbackRedirectUrl="/partner">
            <button className="btn btn-yellow" style={{ fontWeight: 800 }}>SIGN IN</button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/" className={styles.logo}>
            JUNCTION
          </Link>
          <span style={{ color: "var(--neutral)", fontSize: 14 }}>/</span>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>
            Partner Portal
          </span>
        </div>

        <div className={styles.headerRight}>
          {user && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em" }}>
              {user.fullName || user.primaryEmailAddress?.emailAddress}
            </span>
          )}
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
