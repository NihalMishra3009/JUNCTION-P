"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/state/AppContext";
import { Resource, ZoneState } from "@/types";
import { CCTV_FEEDS } from "@/data/cctvFeeds";
import DestinationMap from "@/components/organizer/DestinationMap";
import ResourcePanel from "@/components/organizer/ResourcePanel";
import ActionDrawer from "@/components/organizer/ActionDrawer";
import ZoneDrawer from "@/components/organizer/ZoneDrawer";
import SimulationDrawer from "@/components/organizer/SimulationDrawer";
import { Zap, Video } from "lucide-react";
import { getPressureColor, getPressureLabel } from "@/components/ui/PressureIndicator";
import styles from "./dashboard.module.css";

// Feeds to show in the visual verification strip (zone-first, prioritise active gates)
const VERIFICATION_FEED_IDS = ["FEED_CCTV_01", "FEED_CCTV_02", "FEED_CCTV_03", "FEED_CCTV_08"];

export default function OrganizerDashboard() {
  const {
    activeScenario,
    recommendations,
    resources,
    redistributionApplied,
    redistributionImpact,
    latestObservations,
    zones,
    approveRecommendation,
    rejectRecommendation,
    isRecommendationApproved,
  } = useApp();

  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneState | null>(null);
  const [showActionDrawer, setShowActionDrawer] = useState<boolean>(false);
  const [showSimulationDrawer, setShowSimulationDrawer] = useState<boolean>(false);

  // ── Zone state helpers ─────────────────────────────────────────────────────

  const sortedZones = useMemo(
    () => [...zones].sort((a, b) => b.pressure - a.pressure),
    [zones]
  );

  // Primary zone = highest pressure overall
  const primaryZone = sortedZones[0] || zones[0];

  // Gate sub-zones — derived from registry, not hardcoded
  const gate1Zone = zones.find(z => z.id === "ZONE_WANKHEDE_GATE_1");
  const gate2Zone = zones.find(z => z.id === "ZONE_WANKHEDE_GATE_2");

  // If either gate is the active hotspot, surface the more specific label
  const activeGate = useMemo(() => {
    if (!gate1Zone && !gate2Zone) return null;
    if (gate1Zone && gate2Zone) {
      return gate1Zone.pressure >= gate2Zone.pressure ? gate1Zone : gate2Zone;
    }
    return gate1Zone ?? gate2Zone;
  }, [gate1Zone, gate2Zone]);

  const heroZone = useMemo(() => {
    // If the primary zone IS one of the gate zones, use the more specific one
    if (primaryZone?.id === "ZONE_WANKHEDE_GATE_1" || primaryZone?.id === "ZONE_WANKHEDE_GATE_2") {
      return primaryZone;
    }
    // If Wankhede parent is primary, surface the highest-pressure gate instead
    if (primaryZone?.id === "ZONE_WANKHEDE" && activeGate) {
      return activeGate;
    }
    return primaryZone;
  }, [primaryZone, activeGate]);

  // Human-readable location hierarchy for hero
  const heroLocationLine = useMemo(() => {
    if (!heroZone) return "JUNCTION MONITORING ACTIVE";
    if (heroZone.id === "ZONE_WANKHEDE_GATE_1") return "WANKHEDE STADIUM — EXIT GATE 1";
    if (heroZone.id === "ZONE_WANKHEDE_GATE_2") return "WANKHEDE STADIUM — EXIT GATE 2";
    return heroZone.name.toUpperCase();
  }, [heroZone]);

  const heroStatusWord = heroZone?.pressure ?? 0;
  const heroStatusLabel = heroStatusWord >= 90 ? "CRITICAL" : heroStatusWord >= 85 ? "CRITICAL" : heroStatusWord >= 70 ? "RISING" : "ELEVATED";
  const heroColor = heroStatusWord >= 85 ? "var(--red)" : heroStatusWord >= 70 ? "var(--orange)" : "var(--yellow-state)";

  // Recommendation
  const topRec = useMemo(
    () => recommendations.find(r => r.status === "PENDING") || recommendations[0],
    [recommendations]
  );
  const isTopRecApproved = isRecommendationApproved(topRec?.id || "");

  // Churchgate capacity for hero metric
  const churchgateRes = resources.find(r => r.id === "CHURCHGATE");

  // Scenario label
  const scenarioLabel =
    activeScenario === "POST_EVENT_SURGE" ? "POST-EVENT SURGE" :
    activeScenario === "TRANSPORT_DISRUPTION" ? "TRANSIT SIGNAL DISRUPTION" :
    activeScenario === "HEAVY_RAIN" ? "MONSOON WEATHER ADVISORY" :
    "NOMINAL FLOW";

  // Wankhede gate rows (compact)
  const showGateContext = gate1Zone || gate2Zone;

  return (
    <div className={styles.page}>

      {/* ── 1. PIPELINE ─────────────────────────────────────────────────────── */}
      <nav className={styles.pipeline} aria-label="Junction operational pipeline">
        <Link href="/organizer/cctv-demo" className={styles.pipeNode} title="CCTV & sensor signals">
          <span className={styles.pipeStage}>01 · OBSERVE</span>
          <span className={styles.pipeValue}>4 Signals</span>
        </Link>
        <span className={styles.pipeArrow}>→</span>

        <div className={`${styles.pipeNode} ${styles.pipeNodeActive}`}>
          <span className={styles.pipeStage} style={{ color: "var(--yellow)" }}>02 · ASSESS</span>
          <span className={styles.pipeValue}>{heroZone?.pressure ?? "—"}%</span>
        </div>
        <span className={styles.pipeArrow}>→</span>

        <Link href="/organizer/predictions" className={styles.pipeNode} title="Forward demand forecast">
          <span className={styles.pipeStage}>03 · PREDICT</span>
          <span className={styles.pipeValue}>+15m: {heroZone?.predictedPressure15 ?? "—"}%</span>
        </Link>
        <span className={styles.pipeArrow}>→</span>

        <Link href="/organizer/simulation" className={styles.pipeNode} title="Simulate interventions">
          <span className={styles.pipeStage}>04 · SIMULATE</span>
          <span className={styles.pipeValue}>Ready</span>
        </Link>
        <span className={styles.pipeArrow}>→</span>

        <Link href="/organizer/recommendations" className={styles.pipeNode} title="Action recommendations">
          <span className={styles.pipeStage}>05 · DECIDE</span>
          <span className={styles.pipeValue} style={{ color: isTopRecApproved ? "var(--green)" : "var(--yellow)" }}>
            {isTopRecApproved ? "Approved" : "1 Pending"}
          </span>
        </Link>
      </nav>

      {/* ── 2. CURRENT SITUATION HERO ────────────────────────────────────────── */}
      <div className={styles.situationConsole}>
        <div className={styles.situationMain}>
          {/* Eyebrow */}
          <div className={styles.situationEyebrow}>
            <span className={styles.scenarioPill}>{scenarioLabel}</span>
            <span className={styles.eventContextTag}>WANKHEDE STADIUM · 33,000 SPECTATORS</span>
          </div>

          {/* Headline: zone-specific */}
          <h1 className={styles.situationHeadline}>
            {heroLocationLine}
            <br />
            <span style={{ color: heroColor }}>PRESSURE IS {heroStatusLabel}</span>
          </h1>

          {/* Three key metrics — no predictions, just now */}
          <div className={styles.situationDriversList}>
            <div className={styles.driverItem}>
              <span className={styles.driverLabel}>INFLOW VELOCITY</span>
              <span className={styles.driverVal}>+{heroZone?.inflowRate ?? 42} people/min</span>
              <span className={styles.driverDesc}>Egress flowing toward Western Railway</span>
            </div>

            <div className={styles.driverItem}>
              <span className={styles.driverLabel}>PLATFORM CAPACITY</span>
              <span className={styles.driverVal}>
                {churchgateRes?.availableCapacity?.toLocaleString() ?? "1,200"} remaining
              </span>
              <span className={styles.driverDesc}>Churchgate clearance buffer</span>
            </div>

            <div className={styles.driverItem}>
              <span className={styles.driverLabel}>CLEARANCE STATUS</span>
              <span className={styles.driverVal} style={{ color: "var(--red)" }}>High Bottleneck</span>
              <span className={styles.driverDesc}>Downstream trains at full capacity</span>
            </div>
          </div>

          {/* Wankhede gate split — compact, only when relevant */}
          {showGateContext && (
            <div className={styles.gateContextBar}>
              <span className={styles.gateContextLabel}>WANKHEDE STADIUM — EXIT GATES</span>
              <div className={styles.gateContextRows}>
                {gate1Zone && (
                  <div className={styles.gateContextRow}>
                    <span className={styles.gateContextName}>Exit Gate 1</span>
                    <span className={styles.gateContextPressure} style={{ color: getPressureColor(gate1Zone.pressure) }}>
                      {gate1Zone.pressure}%
                    </span>
                    <span className={`pill ${gate1Zone.pressure >= 85 ? "pill-critical" : gate1Zone.pressure >= 70 ? "pill-high" : "pill-watch"}`} style={{ fontSize: 9 }}>
                      {getPressureLabel(gate1Zone.pressure)}
                    </span>
                  </div>
                )}
                {gate2Zone && (
                  <div className={styles.gateContextRow}>
                    <span className={styles.gateContextName}>Exit Gate 2</span>
                    <span className={styles.gateContextPressure} style={{ color: getPressureColor(gate2Zone.pressure) }}>
                      {gate2Zone.pressure}%
                    </span>
                    <span className={`pill ${gate2Zone.pressure >= 85 ? "pill-critical" : gate2Zone.pressure >= 70 ? "pill-high" : "pill-watch"}`} style={{ fontSize: 9 }}>
                      {getPressureLabel(gate2Zone.pressure)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: big pressure number + small forward indicator */}
        <div className={styles.situationMetricsSide}>
          <div className={styles.pressureGaugeRow}>
            <div>
              <span className={styles.driverLabel}>CURRENT ZONE PRESSURE</span>
              <div className={styles.pressureValBig} style={{ color: heroColor }}>
                {heroZone?.pressure ?? "—"}%
              </div>
            </div>
            <div className={styles.pressureStatusMeta}>
              <span className={`pill ${(heroZone?.pressure ?? 0) >= 85 ? "pill-critical" : "pill-high"}`} style={{ fontSize: 10 }}>
                {(heroZone?.pressure ?? 0) >= 85 ? "CRITICAL" : "HIGH LOAD"}
              </span>
            </div>
          </div>

          <div className={styles.forecastPeakLine}>
            <span>Forecast +15 min</span>
            <span style={{ color: heroColor, fontWeight: 800 }}>
              {heroZone?.predictedPressure15 ?? "—"}%
            </span>
          </div>

          <Link href="/organizer/predictions" className={styles.predictionsLink}>
            VIEW FULL FORECAST →
          </Link>
        </div>
      </div>

      {/* Redistribution applied banner */}
      {redistributionApplied && redistributionImpact && (
        <div className={styles.closedLoopBanner}>
          <div className={styles.closedLoopTitle}>
            <Zap size={16} color="var(--green)" />
            <span>PROACTIVE DIVERSION ACTIVE — REDISTRIBUTION APPLIED</span>
          </div>
          <div className={styles.closedLoopStats}>
            <div>Churchgate: <strong>{redistributionImpact.churchgateBefore}% → {redistributionImpact.churchgateAfter}%</strong></div>
            <div>Dadar: <strong>{redistributionImpact.dadarBefore}% → {redistributionImpact.dadarAfter}%</strong></div>
            <div>Diverted: <strong>~{redistributionImpact.visitorsRedistributed.toLocaleString()} people</strong></div>
          </div>
        </div>
      )}

      {/* ── 3. ACTION READY — COMPACT STRIP ─────────────────────────────────── */}
      {topRec && (
        <div className={styles.actionStrip}>
          <div className={styles.actionStripLeft}>
            <span className={styles.actionStepBadge}>ACTION READY</span>
            <div className={styles.actionTextGroup}>
              <span className={styles.actionTitle}>{topRec.title}</span>
              <span className={styles.actionSubtitle}>
                Expected: {topRec.expectedImpact[0]?.before}% → {topRec.expectedImpact[0]?.after}%
              </span>
            </div>
          </div>
          <div className={styles.actionStripRight}>
            <button
              type="button"
              className="btn btn-yellow"
              style={{ fontWeight: 800, padding: "8px 20px", fontSize: 12 }}
              onClick={() => setShowActionDrawer(true)}
            >
              {isTopRecApproved ? "✓ APPROVED" : "REVIEW ACTION →"}
            </button>
            <Link
              href="/organizer/simulation"
              className={styles.actionSecondaryLink}
            >
              Test in Simulator →
            </Link>
          </div>
        </div>
      )}

      {/* ── 4. SPATIAL COMMAND MAP ───────────────────────────────────────────── */}
      <div className={styles.spatialSection}>
        <div className={styles.spatialHud}>
          <div className={styles.hudLeft}>
            <span className={styles.hudTitle}>SPATIAL MONITOR — WHERE THIS IS HAPPENING</span>
            <span className={styles.hudBadge}>{zones.length} MONITORED ZONES</span>
          </div>
          <button
            type="button"
            className={styles.hudBtn}
            onClick={() => setSelectedZone(heroZone ?? null)}
          >
            INSPECT {heroZone?.name?.split("—")[0]?.trim() ?? "ZONE"} →
          </button>
        </div>

        {/* LOCKED MAP COMPONENT — DO NOT TOUCH */}
        <div className={styles.mapCanvas}>
          <DestinationMap
            resources={resources}
            onSelectResource={r => setSelectedResource(r)}
            selectedId={selectedResource?.id ?? null}
          />
        </div>
      </div>

      {/* ── 5. LIVE SIGNAL HEALTH ────────────────────────────────────────────── */}
      <div className={styles.signalStrip}>
        <div className={styles.signalStripHeader}>
          <span className={styles.signalStripTitle}>LIVE SIGNALS</span>
          <Link href="/organizer/cctv-demo" className={styles.signalViewAllLink}>
            <Video size={12} />
            VIEW ALL SIGNALS →
          </Link>
        </div>
        <div className={styles.signalRows}>
          <div className={styles.signalRow}>
            <span className={styles.signalName}>CCTV Computer Vision</span>
            <span className={styles.signalValue}>9 Feeds</span>
            <span className={styles.signalStatus}><span className={styles.signalDot} />ONLINE</span>
          </div>
          <div className={styles.signalRow}>
            <span className={styles.signalName}>Western &amp; Central Rail</span>
            <span className={styles.signalValue}>4.2 min Headway</span>
            <span className={styles.signalStatus}><span className={styles.signalDot} />ONLINE</span>
          </div>
          <div className={styles.signalRow}>
            <span className={styles.signalName}>Road Corridor Sensors</span>
            <span className={styles.signalValue}>18 km/h</span>
            <span className={styles.signalStatus}><span className={styles.signalDot} />ONLINE</span>
          </div>
          <div className={styles.signalRow}>
            <span className={styles.signalName}>Hospitality &amp; Staging</span>
            <span className={styles.signalValue}>1,240 Usable</span>
            <span className={styles.signalStatus}><span className={styles.signalDot} />ONLINE</span>
          </div>
        </div>
      </div>

      {/* ── 6. VISUAL VERIFICATION — 4 RELEVANT FEEDS ───────────────────────── */}
      <div className={styles.verificationSection}>
        <div className={styles.verificationHeader}>
          <span className={styles.verificationTitle}>VISUAL VERIFICATION</span>
          <Link href="/organizer/cctv-demo" className={styles.verificationOpenLink}>
            OPEN CCTV &amp; SENSOR INPUTS →
          </Link>
        </div>
        <div className={styles.verificationGrid}>
          {VERIFICATION_FEED_IDS.map(feedId => {
            const feed = CCTV_FEEDS.find(f => f.id === feedId);
            if (!feed) return null;
            const zoneLabel = feed.operationalZoneGroup && feed.subZoneName
              ? `${feed.operationalZoneGroup} · ${feed.subZoneName}`
              : feed.zoneName;
            return (
              <div key={feed.id} className={styles.verificationTile}>
                <div className={styles.verificationTileHeader}>
                  <span className={styles.verificationZoneName}>{zoneLabel}</span>
                  <span className={styles.verificationCamId}>{feed.cameraId}</span>
                </div>
                <div className={styles.verificationVideoWrapper}>
                  <video
                    src={feed.videoSrc}
                    muted
                    autoPlay
                    loop
                    playsInline
                    preload="metadata"
                    className={styles.verificationVideo}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── OVERLAYS & DRAWERS ───────────────────────────────────────────────── */}
      {selectedResource && (
        <div className={styles.resourceModalOverlay} onClick={() => setSelectedResource(null)}>
          <div className={styles.resourceModalBox} onClick={e => e.stopPropagation()}>
            <ResourcePanel
              resource={selectedResource}
              scenario={activeScenario}
              onClose={() => setSelectedResource(null)}
            />
          </div>
        </div>
      )}

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
