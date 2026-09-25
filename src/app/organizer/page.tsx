"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/state/AppContext";
import { Resource, ZoneState } from "@/types";
import DestinationMap from "@/components/organizer/DestinationMap";
import ResourcePanel from "@/components/organizer/ResourcePanel";
import ActionDrawer from "@/components/organizer/ActionDrawer";
import ZoneDrawer from "@/components/organizer/ZoneDrawer";
import SimulationDrawer from "@/components/organizer/SimulationDrawer";
import CctvWidget from "@/components/organizer/CctvWidget";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import { Zap } from "lucide-react";
import styles from "./dashboard.module.css";

export default function OrganizerDashboard() {
  const {
    activeScenario,
    recommendations,
    resources,
    alerts,
    redistributionApplied,
    redistributionImpact,
    latestObservations,
    hotspots,
    cascadeResult,
    zones,
    approveRecommendation,
    rejectRecommendation,
    isRecommendationApproved,
  } = useApp();

  // Selected state for drawers
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneState | null>(null);
  const [showActionDrawer, setShowActionDrawer] = useState<boolean>(false);
  const [showSimulationDrawer, setShowSimulationDrawer] = useState<boolean>(false);

  // Top pending recommendation
  const topRec = useMemo(
    () => recommendations.find((r) => r.status === "PENDING") || recommendations[0],
    [recommendations]
  );
  const isTopRecApproved = isRecommendationApproved(topRec?.id || "");

  // Critical zones sorting
  const sortedZones = useMemo(
    () => [...zones].sort((a, b) => b.pressure - a.pressure),
    [zones]
  );
  const primaryZone = sortedZones[0] || zones[0];

  // Cascade nodes
  const cascadeNodes = useMemo(() => {
    if (!cascadeResult) return [];
    return cascadeResult.affectedPathways.flat();
  }, [cascadeResult]);

  return (
    <div className={styles.page}>
      {/* 1. EDITORIAL OPERATIONAL STATEMENT HERO */}
      <div className={styles.heroBanner}>
        <div className={styles.heroMain}>
          <div className={styles.heroEyebrow}>
            <span className={styles.heroTag}>
              {activeScenario === "POST_EVENT_SURGE"
                ? "POST-EVENT EGRESS SURGE"
                : activeScenario === "TRANSPORT_DISRUPTION"
                ? "WESTERN RAILWAY SIGNAL DISRUPTION"
                : activeScenario === "HEAVY_RAIN"
                ? "MONSOON WEATHER ADVISORY"
                : "NOMINAL DESTINATION FLOW"}
            </span>
            <span className={styles.heroEventLabel}>WANKHEDE STADIUM · 33,000 ATTENDEES</span>
          </div>

          <h1 className={styles.heroStatement}>
            {primaryZone ? primaryZone.name.toUpperCase() : "CHURCHGATE TERMINUS"} PRESSURE IS {primaryZone?.pressure >= 85 ? "CRITICAL" : "RISING"}
          </h1>

          <div className={styles.heroMetaRow}>
            <span>Forecasted Peak in +15 MIN</span>
            <span>·</span>
            <span>Inflow Rate: +42 people/min</span>
            <span>·</span>
            <span>Usable Transit Capacity: {resources.find(r => r.id === "CHURCHGATE")?.availableCapacity.toLocaleString() || "1,200"} spots remaining</span>
          </div>
        </div>

        <div className={styles.heroMetricBox}>
          <div className={styles.heroMetricValue}>
            {primaryZone?.pressure || 94}%
          </div>
          <div className={styles.heroMetricLabel}>
            <span className={styles.heroMetricSub}>CURRENT PRESSURE</span>
            <span className={styles.heroMetricTrend}>+12% / 10 MIN ACCELERATING</span>
          </div>
        </div>
      </div>

      {/* CLOSED-LOOP ORCHESTRATION BANNER IF APPLIED */}
      {redistributionApplied && redistributionImpact && (
        <div className={styles.closedLoopBanner}>
          <div className={styles.closedLoopTitle}>
            <Zap size={16} color="var(--ink)" />
            <span>PROACTIVE DIVERSION ACTIVE — ATTENDEE REDISTRIBUTION APPLIED</span>
          </div>
          <div className={styles.closedLoopStats}>
            <div>Churchgate: <strong>{redistributionImpact.churchgateBefore}% → {redistributionImpact.churchgateAfter}%</strong></div>
            <div>Dadar: <strong>{redistributionImpact.dadarBefore}% → {redistributionImpact.dadarAfter}%</strong></div>
            <div>Diverted: <strong>~{redistributionImpact.visitorsRedistributed.toLocaleString()} people</strong></div>
          </div>
        </div>
      )}

      {/* 2. SPATIAL CANVAS WORKSPACE (LOCKED MAP CANVAS) */}
      <div className={styles.spatialCanvasContainer}>
        <div className={styles.spatialHud}>
          <div className={styles.hudLeft}>
            <span className={styles.hudTitle}>SOUTH MUMBAI SPATIAL MONITOR</span>
            <span className={styles.hudBadge}>7 MONITORED NODES</span>
          </div>
          <div className={styles.hudRight}>
            <button
              type="button"
              className={styles.hudBtn}
              onClick={() => setSelectedZone(primaryZone)}
            >
              INSPECT {primaryZone?.name} SENSOR FUSION →
            </button>
          </div>
        </div>

        {/* LOCKED MAP COMPONENT (UNTOUCHED) */}
        <div className={styles.mapCanvas}>
          <DestinationMap
            resources={resources}
            onSelectResource={(r) => setSelectedResource(r)}
            selectedId={selectedResource?.id || null}
          />
        </div>
      </div>

      {/* 3. LOWER SPLIT GRID: LIVE OBSERVATION (CCTV) + NEXT 30 MIN FORECAST */}
      <div className={styles.lowerGrid}>
        {/* LEFT: LIVE COMPUTER VISION OBSERVATION */}
        <div className={styles.gridColumn}>
          <div className={styles.columnHeader}>
            <span className={styles.columnTitle}>LIVE COMPUTER VISION OBSERVATION</span>
            <span className="pill pill-live" style={{ fontSize: 9 }}>YOLOv12 ACTIVE</span>
          </div>

          <CctvWidget
            observations={latestObservations}
            zoneState={primaryZone}
          />
        </div>

        {/* RIGHT: NEXT 30 MIN FORECAST & SPATIAL CASCADE */}
        <div className={styles.gridColumn}>
          <div className={styles.columnHeader}>
            <span className={styles.columnTitle}>NEXT 30 MIN PREDICTIVE FORECAST</span>
            <ConfidenceBadge source="SIMULATED" />
          </div>

          <div className={styles.forecastCard}>
            <div className={styles.timelineRow}>
              <div className={styles.timeNode}>
                <span className={styles.timeLabel}>NOW</span>
                <span className={styles.timeVal} style={{ color: primaryZone?.pressure >= 85 ? "var(--red)" : "var(--ink)" }}>
                  {primaryZone?.pressure || 94}%
                </span>
              </div>
              <span className={styles.timeArrow}>→</span>
              <div className={styles.timeNode}>
                <span className={styles.timeLabel}>+15 MIN</span>
                <span className={styles.timeVal} style={{ color: "var(--red)" }}>
                  {primaryZone?.predictedPressure15 || 97}%
                </span>
              </div>
              <span className={styles.timeArrow}>→</span>
              <div className={styles.timeNode}>
                <span className={styles.timeLabel}>+30 MIN</span>
                <span className={styles.timeVal} style={{ color: "var(--orange)" }}>
                  {primaryZone?.predictedPressure30 || 91}%
                </span>
              </div>
            </div>

            {/* CASCADE STORY */}
            {cascadeNodes.length > 0 && (
              <div className={styles.cascadeSummary}>
                <span className={styles.cascadeTitle}>PROJECTED SPATIAL CASCADE PATHWAY</span>
                <div className={styles.cascadeList}>
                  {cascadeNodes.slice(0, 3).map((node, i) => (
                    <div key={node.nodeId} className={styles.cascadeRow}>
                      <span className={styles.cascadeNodeName}>{i + 1}. {node.label}</span>
                      <span className={styles.cascadeLead}>+{node.leadTimeMinutes}m spillover</span>
                      <span className={styles.cascadePress}>{node.currentPressure}% → {node.projectedPressure}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. RECOMMENDED ACTION COMMAND SURFACE */}
      {topRec && (
        <div className={styles.actionSurface}>
          <div className={styles.actionLeft}>
            <span className={styles.actionBadge}>RECOMMENDED OPERATIONAL ACTION</span>
            <h3 className={styles.actionHeadline}>{topRec.title}</h3>
            <p className={styles.actionProblem}>{topRec.action}</p>
          </div>

          <div className={styles.actionRight}>
            <div className={styles.actionImpactBox}>
              <span className={styles.impactLabel}>EXPECTED PRESSURE IMPACT</span>
              <span className={styles.impactValue}>
                {topRec.expectedImpact[0]?.before}% → {topRec.expectedImpact[0]?.after}%
              </span>
            </div>

            <div className={styles.actionBtnGroup}>
              <button
                type="button"
                className="btn btn-yellow"
                style={{ fontWeight: 800, padding: "10px 20px" }}
                onClick={() => setShowActionDrawer(true)}
              >
                {isTopRecApproved ? "✓ VIEW APPROVED ACTION" : "REVIEW & APPROVE ACTION →"}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ borderColor: "rgba(255,255,255,0.3)", color: "var(--white)" }}
                onClick={() => setShowSimulationDrawer(true)}
              >
                TEST SCENARIO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESOURCE INSPECTION OVERLAY (WHEN MAP PIN CLICKED) */}
      {selectedResource && (
        <div className={styles.resourceModalOverlay} onClick={() => setSelectedResource(null)}>
          <div className={styles.resourceModalBox} onClick={(e) => e.stopPropagation()}>
            <ResourcePanel
              resource={selectedResource}
              scenario={activeScenario}
              onClose={() => setSelectedResource(null)}
            />
          </div>
        </div>
      )}

      {/* PROGRESSIVE DISCLOSURE DRAWERS */}
      <ActionDrawer
        isOpen={showActionDrawer}
        recommendation={topRec}
        onClose={() => setShowActionDrawer(false)}
        onApprove={approveRecommendation}
        onReject={rejectRecommendation}
        isApproved={isTopRecApproved}
        onOpenSimulation={() => setShowSimulationDrawer(true)}
      />

      <ZoneDrawer
        isOpen={selectedZone !== null}
        zone={selectedZone}
        onClose={() => setSelectedZone(null)}
      />

      <SimulationDrawer
        isOpen={showSimulationDrawer}
        onClose={() => setShowSimulationDrawer(false)}
      />
    </div>
  );
}

