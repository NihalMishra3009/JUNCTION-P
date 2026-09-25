"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/state/AppContext";
import styles from "./organizer.module.css";
import { SCENARIOS } from "@/data/mockScenarios";
import { ScenarioId } from "@/types";
import { useState, useEffect } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Map as MapIcon,
  Video,
  Building2,
  TrendingUp,
  Zap,
  Sliders,
  Calendar,
} from "lucide-react";

const NAV = [
  {
    group: "COMMAND",
    items: [
      { href: "/organizer", label: "Operations Room", icon: <LayoutDashboard size={16} strokeWidth={2} /> },
    ],
  },
  {
    group: "DESTINATION",
    items: [
      { href: "/organizer/map", label: "Live Command Map", icon: <MapIcon size={16} strokeWidth={2} /> },
      { href: "/organizer/cctv-demo", label: "CCTV Telemetry Lab", icon: <Video size={16} strokeWidth={2} /> },
      { href: "/organizer/capacity", label: "Capacity & Hotels", icon: <Building2 size={16} strokeWidth={2} /> },
      { href: "/organizer/predictions", label: "Predictions & Cascade", icon: <TrendingUp size={16} strokeWidth={2} /> },
    ],
  },
  {
    group: "DECISIONS",
    items: [
      { href: "/organizer/recommendations", label: "Action Recommendations", icon: <Zap size={16} strokeWidth={2} /> },
      { href: "/organizer/simulation", label: "What-If Simulator", icon: <Sliders size={16} strokeWidth={2} /> },
    ],
  },
  {
    group: "EVENT",
    items: [
      { href: "/organizer/event", label: "Event Gate Info", icon: <Calendar size={16} strokeWidth={2} /> },
    ],
  },
];

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeScenario, setScenario } = useApp();
  const { user, isLoaded, isSignedIn } = useUser();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auth protection guard
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoaded, isSignedIn, router, pathname]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111111" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <span className="pill pill-yellow">VERIFYING COMMAND SESSION</span>
          <p style={{ fontSize: 13, color: "#999999", fontFamily: "var(--font-display)" }}>
            Connecting to City Operations Command...
          </p>
        </div>
      </div>
    );
  }

  const userDisplayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || "City Operations Command";

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
                <span className={styles.scenarioLabel}>ACTIVE SCENARIO</span>
                <select
                  className={styles.scenarioSelect}
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

      {/* MAIN COMMAND AREA */}
      <div className={styles.main}>
        {/* HEADER */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerEvent}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={styles.commandTag}>CITY OPERATIONS COMMAND</span>
                <span className={styles.headerEventName}>Mumbai Indians vs Delhi Capitals</span>
              </div>
              <span className={styles.headerEventMeta}>Wankhede Stadium · 33,000 expected attendees</span>
            </div>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.headerBadges}>
              <span className={styles.liveTag}>
                <span className={styles.liveDot} /> LIVE TELEMETRY
              </span>
              <span className={styles.timeTag}>19:30–22:30</span>
            </div>

            <div className={styles.userProfile}>
              <span className={styles.userName}>
                {userDisplayName}
              </span>
              <span className={styles.userRoleTag}>
                ORGANIZER
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

        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
