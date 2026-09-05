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

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeScenario, setScenario } = useApp();

  return (
    <div className={styles.shell}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.sidebarLogo}>JUNCTION</Link>
        </div>
        <nav className={styles.sidebarNav}>
          {NAV.map(group => (
            <div key={group.group} className={styles.navGroup}>
              <span className={styles.navGroupLabel}>{group.group}</span>
              {group.items.map(item => {
                const isActive = item.href === "/organizer"
                  ? pathname === "/organizer"
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
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
            <Link href="/attendee" className="btn btn-outline btn-sm">
              Attendee View →
            </Link>
          </div>
        </header>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
