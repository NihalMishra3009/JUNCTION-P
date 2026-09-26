"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/state/AppContext";
import { CCTV_FEEDS } from "@/data/cctvFeeds";
import { CctvFeedConfig, CctvFrameTelemetry } from "@/types/cctv";
import { NormalizedObservation } from "@/types";
import CctvVideoFeedCard from "@/components/organizer/cctv/CctvVideoFeedCard";
import CctvFeedTableView from "@/components/organizer/cctv/CctvFeedTableView";
import CctvOperationalActions from "@/components/organizer/cctv/CctvOperationalActions";
import CctvTechnicalPanel from "@/components/organizer/cctv/CctvTechnicalPanel";
import PageHeader from "@/components/ui/PageHeader";
import { LayoutGrid, Maximize2, Table, ShieldCheck, Activity, Terminal } from "lucide-react";
import styles from "./cctv.module.css";

export default function CctvCrowdMonitoringPage() {
  const {
    zones,
    getZoneState,
    recommendations,
    alerts,
    hotspots,
    approveRecommendation,
    rejectRecommendation,
    isRecommendationApproved,
  } = useApp();

  // View state: 3x3 Video Wall (default), Primary Focus View, or Fleet Table View
  const [viewMode, setViewMode] = useState<"WALL" | "FOCUS" | "TABLE">("WALL");
  const [primaryFeedId, setPrimaryFeedId] = useState<string>(CCTV_FEEDS[0].id);

  // Ingested observation telemetry & real-time detection frames from API
  const [liveObservations, setLiveObservations] = useState<NormalizedObservation[]>([]);
  const [latestCctvFrames, setLatestCctvFrames] = useState<Record<string, CctvFrameTelemetry>>({});
  const [activeCameraIds, setActiveCameraIds] = useState<string[]>([]);
  const [isCvBridgeActive, setIsCvBridgeActive] = useState<boolean>(false);
  const [apiStatus, setApiStatus] = useState<string>("CONNECTING");
  const [totalIngested, setTotalIngested] = useState<number>(0);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("Awaiting telemetry");

  // Compute primary feed
  const primaryFeed = useMemo(
    () => CCTV_FEEDS.find((f) => f.id === primaryFeedId) || CCTV_FEEDS[0],
    [primaryFeedId]
  );

  // Poll server-side observation endpoint
  useEffect(() => {
    let isMounted = true;

    async function fetchObservations() {
      try {
        const res = await fetch("/api/observations");
        if (!res.ok) throw new Error("API unreachable");
        const data = await res.json();
        if (isMounted) {
          setApiStatus(data.status || "ONLINE");
          setTotalIngested(data.totalIngestedCount || 0);
          setIsCvBridgeActive(Boolean(data.isCvBridgeActive));
          setActiveCameraIds(data.activeCameraIds || []);

          if (data.latestCctvFrames) {
            setLatestCctvFrames(data.latestCctvFrames);
          }
          if (data.latestObservations && data.latestObservations.length > 0) {
            setLiveObservations(data.latestObservations);
            setLastUpdatedTime(new Date().toLocaleTimeString());
          }
        }
      } catch {
        if (isMounted) {
          setApiStatus("STANDBY");
          setIsCvBridgeActive(false);
          setActiveCameraIds([]);
        }
      }
    }

    fetchObservations();
    // Fast polling in focus mode (300ms) for responsive bounding boxes; 1000ms in grid
    const pollInterval = viewMode === "FOCUS" ? 300 : 1000;
    const interval = setInterval(fetchObservations, pollInterval);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [viewMode]);

  // Find latest observation for selected primary camera
  const primaryCameraObs = liveObservations.filter(
    (o) => o.sourceId === primaryFeed.cameraId || o.zoneId === primaryFeed.zoneId
  );
  const latestCountObs =
    primaryCameraObs.find((o) => o.metricType === "CROWD_COUNT") ||
    liveObservations.find((o) => o.metricType === "CROWD_COUNT");

  // Primary camera real-time detection frame
  const primaryFrame = latestCctvFrames[primaryFeed.cameraId];
  const isPrimaryCamActive = activeCameraIds.includes(primaryFeed.cameraId);

  // Aggregate active visible person counts across observations or active frames
  const totalVisibleCount = useMemo(() => {
    // If we have active CCTV detection frames, prioritize them
    const activeFrameKeys = Object.keys(latestCctvFrames);
    if (activeFrameKeys.length > 0) {
      return activeFrameKeys.reduce((acc, k) => acc + (latestCctvFrames[k]?.personCount ?? 0), 0);
    }
    const countObsList = liveObservations.filter(
      (o) => o.metricType === "CROWD_COUNT"
    );
    if (countObsList.length === 0) return null;
    return countObsList.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  }, [latestCctvFrames, liveObservations]);

  // Operational zone for primary feed (diagnostic reference)
  const primaryZoneState = getZoneState(primaryFeed.zoneId);

  const handleSelectCamera = (feedId: string) => {
    setPrimaryFeedId(feedId);
    setViewMode("FOCUS");
  };

  return (
    <div className={styles.page}>
      {/* Top Header */}
      <PageHeader
        category="VISUAL VERIFICATION & DIAGNOSTICS"
        title="Recorded CCTV & YOLO Computer Vision Suite"
        subtitle="Independent multi-channel visual surveillance wall, YOLOv12 person detection, ByteTrack trajectory linking, and tripwire analytics."
        actions={
          <div className={styles.viewSwitcher}>
            <button
              type="button"
              className={`${styles.viewBtn} ${
                viewMode === "WALL" ? styles.viewBtnActive : ""
              }`}
              onClick={() => setViewMode("WALL")}
              title="3x3 Responsive Video Wall (All 9 Feeds)"
            >
              <LayoutGrid size={14} />
              <span>3x3 Video Wall (9)</span>
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${
                viewMode === "FOCUS" ? styles.viewBtnActive : ""
              }`}
              onClick={() => setViewMode("FOCUS")}
              title="Primary Focus Mode"
            >
              <Maximize2 size={14} />
              <span>Focus: {primaryFeed.cameraId}</span>
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${
                viewMode === "TABLE" ? styles.viewBtnActive : ""
              }`}
              onClick={() => setViewMode("TABLE")}
              title="Telemetry Matrix"
            >
              <Table size={14} />
              <span>Telemetry Matrix</span>
            </button>
          </div>
        }
      />

      {/* Subsystem Boundary & Architectural Disclosure Ribbon */}
      <div className={styles.subsystemBanner}>
        <div className={styles.subsystemBannerLeft}>
          <ShieldCheck size={18} className={styles.subsystemIcon} />
          <div>
            <strong>Independent Subsystem Boundary:</strong> CCTV &amp; YOLO telemetry operates strictly as a visual verification and diagnostic tool. Video observations carry <code>sourceProvider: &quot;JUNCTION_VIDEO_CV&quot;</code> and do <strong>not</strong> overwrite the venue-wide sensor-fusion operational simulation or total attendance.
          </div>
        </div>
        <div className={styles.subsystemTag}>
          <span>9 RECORDED ASSETS</span>
        </div>
      </div>

      {/* Operational Summary Ribbon */}
      <div className={styles.summaryRibbon}>
        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>Camera Channels</span>
          <span className={`${styles.summaryValue} ${styles.colorSky}`}>
            {CCTV_FEEDS.length} Monitored
          </span>
          <span className={styles.summarySubtext}>
            4K UHD, Ultrawide &amp; Portrait
          </span>
        </div>

        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>CV Inference Bridge</span>
          <span
            className={`${styles.summaryValue} ${
              isCvBridgeActive ? styles.colorEmerald : styles.colorAmber
            }`}
          >
            {isCvBridgeActive ? "YOLO ACTIVE" : "STANDBY"}
          </span>
          <span className={styles.summarySubtext}>
            {activeCameraIds.length > 0
              ? `${activeCameraIds.join(", ")} streaming`
              : "Awaiting Python CLI"}
          </span>
        </div>

        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>Detected Persons</span>
          <span className={styles.summaryValue}>
            {totalVisibleCount !== null && totalVisibleCount > 0 ? (
              `${totalVisibleCount} persons`
            ) : (
              <span style={{ color: "#94a3b8", fontSize: "1.1rem" }}>Awaiting Bridge</span>
            )}
          </span>
          <span className={styles.summarySubtext}>
            {isCvBridgeActive ? "Real YOLOv12 Class 0" : "Synthetic fallback ready"}
          </span>
        </div>

        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>Active Focus Feed</span>
          <span className={styles.summaryValue} style={{ fontSize: "1.2rem" }}>
            {primaryFeed.cameraId}
          </span>
          <span className={styles.summarySubtext}>
            {primaryFeed.orientation} • {primaryFeed.resolution}
          </span>
        </div>

        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>Telemetry Gateway</span>
          <span className={styles.summaryValue} style={{ fontSize: "1.1rem" }}>
            {lastUpdatedTime}
          </span>
          <span className={styles.summarySubtext}>Buffer: {totalIngested} Ingested</span>
        </div>
      </div>

      {/* Main Content Area based on View Mode */}
      {viewMode === "WALL" ? (
        /* 1. 3x3 Responsive Video Wall */
        <div className={styles.videoWallSection}>
          <div className={styles.sectionHeadingRow}>
            <h2 className={styles.sectionHeading}>
              <LayoutGrid size={18} />
              <span>9-Camera Visual Verification Wall</span>
              <span className={styles.feedCountBadge}>3x3 Scalable Grid</span>
            </h2>
            <div className={styles.wallSubtitle}>
              Click any camera tile to enter Primary Focus Mode with real-time YOLOv12 + ByteTrack bounding box overlays.
            </div>
          </div>

          <div className={styles.gridWallContainer}>
            {CCTV_FEEDS.map((feed) => (
              <CctvVideoFeedCard
                key={feed.id}
                feed={feed}
                isPrimary={false}
                isGridMode={true}
                onSelectPrimary={handleSelectCamera}
                zoneState={getZoneState(feed.zoneId)}
                observations={liveObservations}
                apiConnected={apiStatus === "ONLINE"}
                cctvFrame={latestCctvFrames[feed.cameraId]}
                isCvBridgeActive={activeCameraIds.includes(feed.cameraId)}
              />
            ))}
          </div>
        </div>
      ) : viewMode === "FOCUS" ? (
        /* 2. Primary Focus View with Camera Selector Strip */
        <div className={styles.focusSection}>
          <div className={styles.sectionHeadingRow}>
            <h2 className={styles.sectionHeading}>
              <Maximize2 size={18} />
              <span>Primary Focus Mode</span>
              <span className={styles.feedCountBadge}>{primaryFeed.cameraId}</span>
            </h2>
            <button
              type="button"
              className={styles.btnBackToWall}
              onClick={() => setViewMode("WALL")}
            >
              ← Return to 3x3 Video Wall
            </button>
          </div>

          {/* Quick Camera Selector Bar */}
          <div className={styles.cameraSelectorBar}>
            {CCTV_FEEDS.map((feed) => {
              const hasActiveFeed = activeCameraIds.includes(feed.cameraId);
              return (
                <button
                  key={feed.id}
                  type="button"
                  className={`${styles.selectorChip} ${
                    feed.id === primaryFeed.id ? styles.selectorChipActive : ""
                  }`}
                  onClick={() => setPrimaryFeedId(feed.id)}
                >
                  <span className={styles.chipId}>{feed.cameraId}</span>
                  <span className={styles.chipResolution}>
                    {hasActiveFeed ? "🟢 LIVE" : (feed.orientation || "LANDSCAPE").slice(0, 4)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Primary Featured Card with Full Detection Canvas Overlay */}
          <CctvVideoFeedCard
            feed={primaryFeed}
            isPrimary={true}
            isGridMode={false}
            zoneState={primaryZoneState}
            observations={liveObservations}
            apiConnected={apiStatus === "ONLINE"}
            cctvFrame={primaryFrame}
            isCvBridgeActive={isPrimaryCamActive}
          />
        </div>
      ) : (
        /* 3. Tabular Telemetry Matrix */
        <CctvFeedTableView
          feeds={CCTV_FEEDS}
          primaryFeedId={primaryFeedId}
          onSelectPrimary={handleSelectCamera}
          getZoneState={getZoneState}
          observations={liveObservations}
          apiConnected={apiStatus === "ONLINE"}
        />
      )}

      {/* Operational Actions Workflows (Independent decision support) */}
      <CctvOperationalActions
        recommendations={recommendations}
        alerts={alerts}
        hotspots={hotspots}
        zones={zones}
        selectedZoneId={primaryFeed.zoneId}
        onApproveRec={approveRecommendation}
        onRejectRec={rejectRecommendation}
        isRecApproved={isRecommendationApproved}
      />

      {/* Collapsible Technical Details Panel */}
      <CctvTechnicalPanel
        selectedFeed={primaryFeed}
        latestObservation={latestCountObs}
        totalIngested={totalIngested}
        apiStatus={apiStatus}
      />
    </div>
  );
}
