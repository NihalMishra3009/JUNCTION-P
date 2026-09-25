"use client";

import React, { useState } from "react";
import { CctvFeedConfig } from "@/types/cctv";
import { NormalizedObservation, ZoneState } from "@/types";
import { Video, AlertTriangle, Scan, Camera } from "lucide-react";
import styles from "./cctvComponents.module.css";

interface CctvVideoFeedCardProps {
  feed: CctvFeedConfig;
  isPrimary?: boolean;
  onSelectPrimary?: (feedId: string) => void;
  zoneState?: ZoneState;
  observations: NormalizedObservation[];
  apiConnected: boolean;
}

export default function CctvVideoFeedCard({
  feed,
  isPrimary = false,
  onSelectPrimary,
  zoneState,
  observations,
  apiConnected,
}: CctvVideoFeedCardProps) {
  const [showAnnotated, setShowAnnotated] = useState<boolean>(true);
  const [videoError, setVideoError] = useState<boolean>(false);

  // Filter observations specific to this camera
  const cameraObs = observations.filter(
    (o) => o.sourceId === feed.cameraId || o.zoneId === feed.zoneId
  );
  const countObs = cameraObs.find((o) => o.metricType === "CROWD_COUNT");
  const inflowObs = cameraObs.find((o) => o.metricType === "INFLOW_RATE");
  const outflowObs = cameraObs.find((o) => o.metricType === "OUTFLOW_RATE");
  const densityObs = cameraObs.find((o) => o.metricType === "DENSITY");

  const hasLiveTelemetry = Boolean(countObs);
  const personCount = countObs ? Number(countObs.value) : null;
  const inflow = inflowObs ? Number(inflowObs.value) : null;
  const outflow = outflowObs ? Number(outflowObs.value) : null;
  const density = densityObs ? `${densityObs.value} p/m²` : null;

  // Active video source
  const currentVideoSrc =
    showAnnotated && feed.annotatedVideoSrc
      ? feed.annotatedVideoSrc
      : feed.videoSrc;

  // Derive crowd state
  const pressureLevel = zoneState?.pressureLevel || "NORMAL";
  const pressureValue = zoneState?.pressure ?? 45;

  return (
    <div
      className={`${styles.feedCard} ${isPrimary ? styles.primaryCard : ""}`}
      id={`cctv-card-${feed.id}`}
    >
      {/* Card Top Header */}
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.feedTitleRow}>
            <Video size={16} className={styles.cameraIcon} />
            <h3 className={styles.feedTitle}>{feed.name}</h3>
            {isPrimary && (
              <span className={styles.primaryBadge}>PRIMARY MONITOR</span>
            )}
          </div>
          <div className={styles.feedSubtitle}>
            <span className={styles.tagCameraId}>{feed.cameraId}</span>
            <span className={styles.tagDivider}>•</span>
            <span className={styles.tagZone}>{feed.zoneName}</span>
          </div>
        </div>

        <div className={styles.headerRight}>
          {/* Provenance Badge */}
          <span
            className={
              feed.sourceType === "SYNTHETIC"
                ? styles.badgeSynthetic
                : styles.badgeReplay
            }
          >
            {feed.sourceType === "SYNTHETIC"
              ? "SYNTHETIC BENCHMARK"
              : "LOCAL REPLAY"}
          </span>

          {/* Telemetry connection status */}
          <span
            className={
              hasLiveTelemetry && apiConnected
                ? styles.badgeOnline
                : styles.badgeStandby
            }
          >
            <span className={styles.statusDot} />
            {hasLiveTelemetry && apiConnected
              ? "TELEMETRY ACTIVE"
              : "WAITING FOR FEED"}
          </span>

          {/* Primary View Toggle Button */}
          {!isPrimary && onSelectPrimary && (
            <button
              onClick={() => onSelectPrimary(feed.id)}
              className={styles.btnSetPrimary}
              title="Focus this camera feed as primary monitor"
              type="button"
            >
              Focus Primary
            </button>
          )}
        </div>
      </div>

      {/* Video Container */}
      <div className={styles.videoSection}>
        <div className={styles.videoWrapper}>
          {videoError ? (
            <div className={styles.videoFallback}>
              <AlertTriangle size={24} color="var(--orange)" className={styles.fallbackIcon} />
              <p className={styles.fallbackTitle}>Video Source Unavailable</p>
              <p className={styles.fallbackText}>
                Failed to load media at <code>{currentVideoSrc}</code>
              </p>
              <button
                type="button"
                onClick={() => setVideoError(false)}
                className={styles.btnRetry}
              >
                Retry Video
              </button>
            </div>
          ) : (
            <>
              <video
                key={currentVideoSrc}
                src={currentVideoSrc}
                controls
                muted
                playsInline
                preload="metadata"
                loop
                onError={() => setVideoError(true)}
                className={styles.videoElement}
              />
              <div className={styles.videoOverlayTag}>
                {showAnnotated && feed.annotatedVideoSrc ? (
                  <span className={styles.overlayAnnotated} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Scan size={12} /> YOLOv12 + ByteTrack Overlay Active
                  </span>
                ) : (
                  <span className={styles.overlayRaw} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Camera size={12} /> Raw Video (No Overlay)
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Video Mode Toolbar */}
        <div className={styles.videoToolbar}>
          <div className={styles.toolbarLeft}>
            {feed.annotatedVideoSrc && (
              <div className={styles.viewModeToggle}>
                <button
                  type="button"
                  className={`${styles.btnToggle} ${
                    showAnnotated ? styles.btnToggleActive : ""
                  }`}
                  onClick={() => setShowAnnotated(true)}
                >
                  Annotated (AI BBoxes & IDs)
                </button>
                <button
                  type="button"
                  className={`${styles.btnToggle} ${
                    !showAnnotated ? styles.btnToggleActive : ""
                  }`}
                  onClick={() => setShowAnnotated(false)}
                >
                  Raw Camera Footage
                </button>
              </div>
            )}
            <span className={styles.videoSpec}>
              {feed.resolution} @ {feed.fps} FPS
            </span>
          </div>

          <div className={styles.toolbarRight}>
            <span className={styles.descriptionText}>{feed.description}</span>
          </div>
        </div>
      </div>

      {/* Operational Metrics Bar */}
      <div className={styles.metricsBar}>
        {/* Metric: Visible Persons */}
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Visible Persons</span>
          <span className={styles.metricNumber}>
            {personCount !== null ? (
              personCount
            ) : (
              <span className={styles.mutedPlaceholder}>Ready</span>
            )}
          </span>
          <span className={styles.metricCaption}>
            {personCount !== null ? "YOLO Class 0 Head/Body" : "Awaiting stream"}
          </span>
        </div>

        {/* Metric: Inflow */}
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Tripwire Inflow</span>
          <span className={`${styles.metricNumber} ${styles.colorEmerald}`}>
            {inflow !== null ? `+${inflow}` : "—"}
          </span>
          <span className={styles.metricCaption}>Inbound crossings</span>
        </div>

        {/* Metric: Outflow */}
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Tripwire Outflow</span>
          <span className={`${styles.metricNumber} ${styles.colorAmber}`}>
            {outflow !== null ? `-${outflow}` : "—"}
          </span>
          <span className={styles.metricCaption}>Outbound crossings</span>
        </div>

        {/* Metric: Spatial Density */}
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Spatial Density</span>
          <span className={styles.metricNumber}>
            {density ? density : "Illustrative"}
          </span>
          <span className={styles.metricCaption}>
            {feed.calibratedAreaSqM
              ? `Area: ${feed.calibratedAreaSqM}m²`
              : "Uncalibrated"}
          </span>
        </div>

        {/* Metric: Zone Crowd Pressure */}
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Zone Pressure</span>
          <span
            className={`${styles.metricNumber} ${
              pressureLevel === "CRITICAL"
                ? styles.colorCritical
                : pressureLevel === "HIGH"
                ? styles.colorAmber
                : styles.colorNormal
            }`}
          >
            {pressureValue}%
          </span>
          <span className={styles.metricCaption}>
            {pressureLevel} status
          </span>
        </div>
      </div>
    </div>
  );
}
