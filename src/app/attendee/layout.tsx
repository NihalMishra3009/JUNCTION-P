"use client";
import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import styles from "./attendee.module.css";

const NAV_ITEMS = [
  { href: "/attendee?app=true", label: "Home", icon: "◉" },
  { href: "/attendee/plan", label: "Plan", icon: "◇" },
  { href: "/attendee/stay", label: "Stay", icon: "◈" },
  { href: "/attendee/food", label: "Food", icon: "◆" },
  { href: "/attendee/event", label: "Event", icon: "★" },
];

function AttendeeLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isApp = searchParams.get("app") === "true";

  // Public showcase at /attendee when NOT in app mode
  const isShowcase = pathname === "/attendee" && !isApp;

  if (isShowcase) {
    return <div className={styles.showcaseShell}>{children}</div>;
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>JUNCTION</Link>
        <div className={styles.headerRight}>
          <span className="pill pill-live" style={{ fontSize: 10 }}>● LIVE</span>
          <span className="pill pill-simulated" style={{ fontSize: 10 }}>SIM</span>
          <Link href="/organizer" className="btn btn-outline btn-sm">Organizer →</Link>
        </div>
      </header>
      <div className={styles.body}>
        <main className={styles.main}>{children}</main>
      </div>
      <nav className={styles.bottomNav}>
        {NAV_ITEMS.map(item => {
          const isActive = item.href.startsWith("/attendee?app=true")
            ? pathname === "/attendee" && isApp
            : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`${styles.navItem} ${isActive ? styles.navActive : ""}`}>
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function AttendeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className={styles.showcaseShell}>{children}</div>}>
      <AttendeeLayoutContent>{children}</AttendeeLayoutContent>
    </Suspense>
  );
}
