"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./FlowIndicator.module.css";

export type FlowStage = "OBSERVE" | "ASSESS" | "PREDICT" | "SIMULATE" | "DECIDE";

interface StageConfig {
  id: FlowStage;
  label: string;
  stepNumber: string;
  description: string;
  href: string;
  matchPaths: string[];
}

const STAGES: StageConfig[] = [
  {
    id: "OBSERVE",
    label: "OBSERVE",
    stepNumber: "01",
    description: "Multi-sensor signals",
    href: "/organizer/cctv-demo",
    matchPaths: ["/organizer/cctv-demo"],
  },
  {
    id: "ASSESS",
    label: "ASSESS",
    stepNumber: "02",
    description: "Live destination state",
    href: "/organizer",
    matchPaths: ["/organizer", "/organizer/capacity", "/organizer/map", "/organizer/event"],
  },
  {
    id: "PREDICT",
    label: "PREDICT",
    stepNumber: "03",
    description: "Forward demand curves",
    href: "/organizer/predictions",
    matchPaths: ["/organizer/predictions"],
  },
  {
    id: "SIMULATE",
    label: "SIMULATE",
    stepNumber: "04",
    description: "Test interventions",
    href: "/organizer/simulation",
    matchPaths: ["/organizer/simulation"],
  },
  {
    id: "DECIDE",
    label: "DECIDE",
    stepNumber: "05",
    description: "Operator action",
    href: "/organizer/recommendations",
    matchPaths: ["/organizer/recommendations"],
  },
];

export default function FlowIndicator() {
  const pathname = usePathname();

  // Determine active stage
  const getActiveStage = (): FlowStage => {
    if (pathname === "/organizer/cctv-demo") return "OBSERVE";
    if (pathname === "/organizer/predictions") return "PREDICT";
    if (pathname === "/organizer/simulation") return "SIMULATE";
    if (pathname === "/organizer/recommendations") return "DECIDE";
    if (pathname === "/organizer/capacity" || pathname === "/organizer/map" || pathname === "/organizer/event") return "ASSESS";
    // On the Operations Room dashboard, all stages are presented as the storytelling hub
    return "ASSESS";
  };

  const activeStage = getActiveStage();
  const isDashboardHub = pathname === "/organizer";

  return (
    <div className={styles.flowBar} role="navigation" aria-label="Junction Intelligence Flow">
      <div className={styles.flowLabelWrap}>
        <span className={styles.pipelineTag}>PIPELINE</span>
        {isDashboardHub && (
          <span className={styles.hubBadge}>HUB OVERVIEW</span>
        )}
      </div>

      <div className={styles.stagesTrack}>
        {STAGES.map((stage, idx) => {
          const isCurrent = !isDashboardHub && stage.id === activeStage;
          const isOverviewActive = isDashboardHub;

          return (
            <React.Fragment key={stage.id}>
              <Link
                href={stage.href}
                className={`${styles.stageNode} ${isCurrent ? styles.stageActive : ""} ${
                  isOverviewActive ? styles.stageOverview : ""
                }`}
                title={`${stage.label}: ${stage.description}`}
              >
                <span className={styles.stepNum}>{stage.stepNumber}</span>
                <span className={styles.stepLabel}>{stage.label}</span>
                <span className={styles.stepDot} />
              </Link>

              {idx < STAGES.length - 1 && (
                <div className={styles.flowArrow} aria-hidden="true">
                  →
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
