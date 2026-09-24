"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/state/AppContext";
import { CCTV_FEEDS } from "@/data/cctvFeeds";
import { CctvFeedConfig } from "@/types/cctv";
import { NormalizedObservation } from "@/types";
import CctvVideoFeedCard from "@/components/organizer/cctv/CctvVideoFeedCard";
import CctvFeedTableView from "@/components/organizer/cctv/CctvFeedTableView";
import CctvOperationalActions from "@/components/organizer/cctv/CctvOperationalActions";
import CctvTechnicalPanel from "@/components/organizer/cctv/CctvTechnicalPanel";
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

  // View state
  const [viewMode, setViewMode] = useState<"CARDS" | "TABLE">("CARDS");
  const [primaryFeedId, setPrimaryFeedId] = useState<string>(
    CCTV_FEEDS[0].id
  );

  // Ingested observation telemetry from API
  const [liveObservations, setLiveObservations] = useState<NormalizedObservation[]>([]);
  const [apiStatus, setApiStatus] = useState<string>("CONNECTING");
  const [totalIngested, setTotalIngested] = useState<number>(0);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("Awaiting telemetry");

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
          if (data.latestObservations && data.latestObservations.length > 0) {
            setLiveObservations(data.latestObservations);
            setLastUpdatedTime(new Date().toLocaleTimeString());
          }
        }
      } catch {
        if (isMounted) {
          setApiStatus("OFFLINE / STANDBY");
        }
      }
    }

    fetchObservations();
    const interval = setInterval(fetchObservations, 1500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Compute primary and secondary feeds
  const primaryFeed = useMemo(
    () => CCTV_FEEDS.find((f) => f.id === primaryFeedId) || CCTV_FEEDS[0],
    [primaryFeedId]
  );

  const secondaryFeeds = useMemo(
    () => CCTV_FEEDS.filter((f) => f.id !== primaryFeed.id),
    [primaryFeed.id]
  );

  // Find latest observation for selected primary camera
  const primaryCameraObs = liveObservations.filter(
    (o) => o.sourceId === primaryFeed.cameraId || o.zoneId === primaryFeed.zoneId
  );
  const latestCountObs = primaryCameraObs.find(
    (o) => o.metricType === "CROWD_COUNT"
  ) || liveObservations.find((o) => o.metricType === "CROWD_COUNT");

  // Aggregate active visible person counts across observations
  const totalVisibleCount = useMemo(() => {
    const countObsList = liveObservations.filter(
      (o) => o.metricType === "CROWD_COUNT"
    );
    if (countObsList.length === 0) return null;
    return countObsList.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  }, [liveObservations]);

  // Operational zone for primary feed
  const primaryZoneState = getZoneState(primaryFeed.zoneId);

  return (
    <div className={styles.page}>
      {/* Top Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Live Crowd & CCTV Monitoring Workspace</h1>
          <p className={styles.subtitle}>
            Multi-camera spatial surveillance, YOLOv12 object tracking telemetry, and automated bottleneck mitigation
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className={styles.headerActions}>
          <div className={styles.viewSwitcher}>
            <button
              type="button"
              className={`${styles.viewBtn} ${
                viewMode === "CARDS" ? styles.viewBtnActive : ""
              }`}
              onClick={() => setViewMode("CARDS")}
            >
              <span>🖼️</span> Card View ({CCTV_FEEDS.length})
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${
                viewMode === "TABLE" ? styles.viewBtnActive : ""
              }`}
              onClick={() => setViewMode("TABLE")}
            >
              <span>📊</span> Table View
            </button>
          </div>
        </div>
      </div>

      {/* Operational Summary Ribbon */}
      <div className={styles.summaryRibbon}>
        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>Camera Channels</span>
          <span className={`${styles.summaryValue} ${styles.colorSky}`}>
            {CCTV_FEEDS.length} Monitored
          </span>
          <span className={styles.summarySubtext}>All video assets loaded</span>
        </div>

        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>Telemetry Gateway</span>
          <span
            className={`${styles.summaryValue} ${
              apiStatus === "ONLINE" ? styles.colorEmerald : styles.colorAmber
            }`}
          >
            {apiStatus}
          </span>
          <span className={styles.summarySubtext}>
            Buffer: {totalIngested} observations
          </span>
        </div>

        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>Aggregate Crowd Count</span>
          <span className={styles.summaryValue}>
            {totalVisibleCount !== null ? (
              `${totalVisibleCount} persons`
            ) : (
              <span style={{ color: "#94a3b8", fontSize: "1.1rem" }}>Ready / Standby</span>
            )}
          </span>
          <span className={styles.summarySubtext}>Across active streams</span>
        </div>

        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>Primary Focus Zone</span>
          <span className={styles.summaryValue}>
            {primaryZoneState ? `${primaryZoneState.pressure}%` : "Normal"}
          </span>
          <span className={styles.summarySubtext}>
            {primaryZoneState?.pressureLevel || "Nominal"} ({primaryFeed.zoneName.split(" ")[0]})
          </span>
        </div>

        <div className={styles.summaryTile}>
          <span className={styles.summaryLabel}>Last Observation</span>
          <span className={styles.summaryValue} style={{ fontSize: "1.1rem" }}>
            {lastUpdatedTime}
          </span>
          <span className={styles.summarySubtext}>Polling interval: 1.5s</span>
        </div>
      </div>

      {/* Privacy Governance Banner */}
      <div className={styles.privacyBanner}>
        <svg
          className={styles.privacyIcon}
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <span>
          <strong>Privacy Governance & Compliance:</strong> Computer-vision inference processes strictly non-identifiable spatial telemetry (head/body centroid bounding boxes and tripwire vectors). Facial recognition, biometric indexing, and personal identity tracking are strictly excluded by design.
        </span>
      </div>

      {/* Main Content Area */}
      {viewMode === "CARDS" ? (
        <div className={styles.feedSection}>
          <div className={styles.sectionHeadingRow}>
            <h2 className={styles.sectionHeading}>
              <span>Featured Primary Feed</span>
              <span className={styles.feedCountBadge}>{primaryFeed.name}</span>
            </h2>
          </div>

          {/* Large Primary Video Card */}
          <CctvVideoFeedCard
            feed={primaryFeed}
            isPrimary={true}
            zoneState={primaryZoneState}
            observations={liveObservations}
            apiConnected={apiStatus === "ONLINE"}
          />

          {/* Secondary Stacked Video Cards */}
          <div className={styles.secondaryFeedsContainer}>
            <h3 className={styles.secondarySectionTitle}>
              Additional Operational Channels ({secondaryFeeds.length})
            </h3>

            {secondaryFeeds.map((feed) => (
              <CctvVideoFeedCard
                key={feed.id}
                feed={feed}
                isPrimary={false}
                onSelectPrimary={setPrimaryFeedId}
                zoneState={getZoneState(feed.zoneId)}
                observations={liveObservations}
                apiConnected={apiStatus === "ONLINE"}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Table View */
        <CctvFeedTableView
          feeds={CCTV_FEEDS}
          primaryFeedId={primaryFeedId}
          onSelectPrimary={setPrimaryFeedId}
          getZoneState={getZoneState}
          observations={liveObservations}
          apiConnected={apiStatus === "ONLINE"}
        />
      )}

      {/* Operational Decision Support & Action Workflows */}
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
