"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/state/AppContext";
import styles from "./organizer.module.css";
import { SCENARIOS } from "@/data/mockScenarios";
import { ScenarioId } from "@/types";
import { useState, useEffect } from "react";
import { useUser, UserButton, useClerk } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Map as MapIcon,
  Video,
  Building2,
  TrendingUp,
  Zap,
  Sliders,
  Calendar,
  ShieldAlert,
} from "lucide-react";
import FlowIndicator from "@/components/organizer/FlowIndicator";

const NAV = [
  {
    group: "OBSERVE",
    items: [
      { href: "/organizer/cctv-demo", label: "CCTV & Sensor Inputs", icon: <Video size={16} strokeWidth={2} /> },
    ],
  },
  {
    group: "ASSESS",
    items: [
      { href: "/organizer", label: "Live Operations Room", icon: <LayoutDashboard size={16} strokeWidth={2} /> },
      { href: "/organizer/map", label: "Spatial Command Map", icon: <MapIcon size={16} strokeWidth={2} /> },
      { href: "/organizer/capacity", label: "Capacity & Hotels", icon: <Building2 size={16} strokeWidth={2} /> },
    ],
  },
  {
    group: "PREDICT",
    items: [
      { href: "/organizer/predictions", label: "Predictions", icon: <TrendingUp size={16} strokeWidth={2} /> },
    ],
  },
  {
    group: "SIMULATE",
    items: [
      { href: "/organizer/simulation", label: "What-If Simulator", icon: <Sliders size={16} strokeWidth={2} /> },
    ],
  },
  {
    group: "DECIDE",
    items: [
      { href: "/organizer/recommendations", label: "Action Recommendations", icon: <Zap size={16} strokeWidth={2} /> },
    ],
  },
  {
    group: "CONTEXT",
    items: [
      { href: "/organizer/event", label: "Event & Gate Info", icon: <Calendar size={16} strokeWidth={2} /> },
    ],
  },
];

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeScenario, setScenario } = useApp();
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auth protection guard
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace(`/login/organizer?redirect=${encodeURIComponent(pathname)}`);
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

  // Strict Role Check: Must be ORGANIZER (or unset in dev mode)
  const junctionRole = user?.publicMetadata?.junctionRole as string | undefined;
  const isProduction = process.env.NODE_ENV === "production";
  const isAuthorized = junctionRole === "ORGANIZER" || (!isProduction && !junctionRole);

  if (!isAuthorized) {
    const isPartner = junctionRole === "RESTAURANT_PARTNER";
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", padding: 24 }}>
        <div style={{ background: "#141414", border: "1.5px solid #dc2626", padding: "40px 32px", maxWidth: 520, width: "100%", textAlign: "center" }}>
          <ShieldAlert size={36} color="#dc2626" style={{ margin: "0 auto 16px" }} />
          <div style={{ fontSize: 20, fontWeight: 800, color: "#dc2626", fontFamily: "var(--font-display)", marginBottom: 8, letterSpacing: "-0.01em" }}>
            Access Denied: Role Mismatch
          </div>
          <p style={{ color: "#cccccc", fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
            {isPartner
              ? "This account is configured as a Restaurant Partner, not a JUNCTION Organizer."
              : "This account is not configured as a JUNCTION Organizer."}
          </p>
          <p style={{ color: "#888888", fontSize: 12, marginBottom: 24 }}>
            Authenticated Account: <strong style={{ color: "#ffffff" }}>{user.fullName || user.primaryEmailAddress?.emailAddress}</strong>
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => signOut({ redirectUrl: "/login/organizer" })}
              className="btn"
              style={{ background: "#262626", color: "#ffffff", border: "1px solid #404040", fontWeight: 700 }}
            >
              Sign Out
            </button>
            <Link href="/login" className="btn" style={{ background: "#262626", color: "#ffffff", border: "1px solid #404040", fontWeight: 700 }}>
              Return to Role Selection
            </Link>
            {isPartner && (
              <Link href="/partner" className="btn btn-yellow" style={{ fontWeight: 800 }}>
                Go to Partner Portal →
              </Link>
            )}
          </div>
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

        <FlowIndicator />

        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
