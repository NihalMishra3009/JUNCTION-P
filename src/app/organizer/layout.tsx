"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/state/AppContext";
import styles from "./organizer.module.css";
import { SCENARIOS } from "@/data/mockScenarios";
import { ScenarioId } from "@/types";

const NAV = [
  { group: "OVERVIEW", items: [{ href: "/organizer", label: "Dashboard", icon: "▣" }] },
  { group: "DESTINATION", items: [
    { href: "/organizer/map", label: "Live Map", icon: "◉" },
    { href: "/organizer/capacity", label: "Capacity", icon: "◈" },
    { href: "/organizer/predictions", label: "Predictions", icon: "◇" },
  ]},
  { group: "DECISIONS", items: [
    { href: "/organizer/recommendations", label: "Recommendations", icon: "◆" },
    { href: "/organizer/simulation", label: "Simulation", icon: "◎" },
  ]},
  { group: "EVENT", items: [
    { href: "/organizer/event", label: "Event", icon: "★" },
  ]},
];

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/state/AuthContext";

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeScenario, setScenario } = useApp();
  const { currentUser, isAuthenticated, isLoading, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auth protection guard
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !currentUser) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (currentUser.role !== "ORGANIZER") {
        // Partner user trying to access /organizer -> redirect to /partner
        router.replace("/partner");
      }
    }
  }, [isLoading, isAuthenticated, currentUser, router, pathname]);

  if (isLoading || !isAuthenticated || currentUser?.role !== "ORGANIZER") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <span className="pill pill-simulated">VERIFYING COMMAND SESSION</span>
          <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>Connecting to City Operations Command...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      {/* SIDEBAR */}
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ""}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.sidebarLogo}>
            {isCollapsed ? "J" : "JUNCTION"}
          </Link>
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? "»" : "«"}
          </button>
        </div>
        <nav className={styles.sidebarNav}>
          {NAV.map(group => (
            <div key={group.group} className={styles.navGroup}>
              {!isCollapsed && <span className={styles.navGroupLabel}>{group.group}</span>}
              {group.items.map(item => {
                const isActive = item.href === "/organizer"
                  ? pathname === "/organizer"
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ""} ${isCollapsed ? styles.navItemCollapsed : ""}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    {!isCollapsed && <span className={styles.navLabel}>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className={`${styles.sidebarFooter} ${isCollapsed ? styles.footerCollapsedWrap : ""}`}>
          {!isCollapsed ? (
            <>
              <div className={styles.scenarioSelector}>
                <span className={styles.scenarioLabel}>SCENARIO</span>
                <select
                  className={`select ${styles.scenarioSelect}`}
                  value={activeScenario}
                  onChange={e => setScenario(e.target.value as ScenarioId)}
                >
                  {Object.values(SCENARIOS).map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.simulatedEnv}>
                <span className="simulated-dot" />
                <span>SIMULATED ENVIRONMENT</span>
              </div>
            </>
          ) : (
            <div className={styles.footerCollapsed} title={`Scenario: ${SCENARIOS[activeScenario]?.label || activeScenario} (Simulated)`}>
              <span className="simulated-dot" />
              <span className={styles.collapsedScenarioTag}>{activeScenario.slice(0, 3)}</span>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <div className={styles.main}>
        {/* HEADER */}
        <header className={styles.header}>
          <div className={styles.headerEvent}>
            <span className={styles.headerEventName}>Mumbai Indians vs Delhi Capitals</span>
            <span className={styles.headerEventMeta}>Wankhede Stadium · 33,000 expected attendees</span>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.headerBadges}>
              <span className="pill pill-live">● LIVE</span>
              <span className="pill pill-simulated">SIMULATED</span>
              <span className={styles.headerTime}>19:30–22:30</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px", borderLeft: "1px solid var(--neutral)", borderRight: "1px solid var(--neutral)" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)" }}>
                {currentUser?.displayName || "City Operations Command"}
              </span>
              <span className="pill pill-simulated" style={{ fontSize: 9, padding: "1px 5px", background: "rgba(17,17,17,0.08)", color: "var(--ink)" }}>
                ORGANIZER
              </span>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              style={{ color: "var(--red)", fontWeight: 700, fontSize: 11 }}
              title="Log out of City Operations Command"
            >
              Log Out
            </button>
          </div>
        </header>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
