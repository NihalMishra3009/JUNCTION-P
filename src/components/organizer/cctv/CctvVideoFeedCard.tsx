"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { CctvFeedConfig, CctvFrameTelemetry } from "@/types/cctv";
import { NormalizedObservation, ZoneState } from "@/types";
import { Video, AlertTriangle, Scan, Camera, Maximize2, Activity, Cpu } from "lucide-react";
import styles from "./cctvComponents.module.css";

interface CctvVideoFeedCardProps {
  feed: CctvFeedConfig;
  isPrimary?: boolean;
  isGridMode?: boolean;
  onSelectPrimary?: (feedId: string) => void;
  zoneState?: ZoneState;
  observations: NormalizedObservation[];
  apiConnected: boolean;
  cctvFrame?: CctvFrameTelemetry;
  isCvBridgeActive?: boolean;
}

export default function CctvVideoFeedCard({
  feed,
  isPrimary = false,
  isGridMode = false,
  onSelectPrimary,
  zoneState,
  observations,
  apiConnected,
  cctvFrame,
  isCvBridgeActive = false,
}: CctvVideoFeedCardProps) {
  const [showAnnotated, setShowAnnotated] = useState<boolean>(true);
  const [videoError, setVideoError] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Filter normalized observations specific to this camera
  const cameraObs = observations.filter(
    (o) => o.sourceId === feed.cameraId || o.zoneId === feed.zoneId
  );
  const countObs = cameraObs.find((o) => o.metricType === "CROWD_COUNT");
  const inflowObs = cameraObs.find((o) => o.metricType === "INFLOW_RATE");
  const outflowObs = cameraObs.find((o) => o.metricType === "OUTFLOW_RATE");
  const densityObs = cameraObs.find((o) => o.metricType === "DENSITY");

  // Metrics from real-time detection frame (if available) or normalized observations
  const detectionsList = cctvFrame?.detections || [];
  const hasLiveDetections = detectionsList.length > 0;
  const personCount = cctvFrame?.personCount ?? (countObs ? Number(countObs.value) : null);
  const activeTracks = cctvFrame?.activeTracksCount ?? (hasLiveDetections ? detectionsList.length : null);
  const meanConf = cctvFrame?.meanConfidence ?? (countObs ? countObs.confidence : null);
  const inflow = cctvFrame?.inflow ?? (inflowObs ? Number(inflowObs.value) : null);
  const outflow = cctvFrame?.outflow ?? (outflowObs ? Number(outflowObs.value) : null);
  const density = densityObs ? `${densityObs.value} p/m²` : null;

  // Active video source
  const currentVideoSrc =
    showAnnotated && feed.annotatedVideoSrc
      ? feed.annotatedVideoSrc
      : feed.videoSrc;

  // Derive crowd state
  const pressureLevel = zoneState?.pressureLevel || "NORMAL";
  const pressureValue = zoneState?.pressure ?? 45;

  // Formatted orientation badge text
  const orientationBadge =
    feed.orientation === "PORTRAIT"
      ? "9:16 PORTRAIT"
      : feed.orientation === "ULTRAWIDE"
      ? "21:9 ULTRAWIDE"
      : "16:9 LANDSCAPE";

  // Render bounding box canvas overlay
  const renderCanvasOverlay = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Use intrinsic video resolution so drawing coordinates are 1:1 with the video frame
    const nativeW = video.videoWidth || (feed.orientation === "PORTRAIT" ? 1080 : feed.orientation === "ULTRAWIDE" ? 2320 : 1920);
    const nativeH = video.videoHeight || (feed.orientation === "PORTRAIT" ? 1920 : feed.orientation === "ULTRAWIDE" ? 1080 : 1080);

    if (canvas.width !== nativeW || canvas.height !== nativeH) {
      canvas.width = nativeW;
      canvas.height = nativeH;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showAnnotated) return;

    const w = canvas.width;
    const h = canvas.height;

    // 1. Draw Real ByteTrack Trajectory Trails (First, under the boxes)
    if (detectionsList.length > 0) {
      for (const det of detectionsList) {
        if (det.trail && det.trail.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(56, 189, 248, 0.75)"; // bright cyan trail
          ctx.lineWidth = Math.max(3, Math.round(w / 500));
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          det.trail.forEach((pt, idx) => {
            const tx = pt.x * w;
            const ty = pt.y * h;
            if (idx === 0) ctx.moveTo(tx, ty);
            else ctx.lineTo(tx, ty);
          });
          ctx.stroke();
        }
      }
    }

    // 2. Draw Real YOLO Bounding Boxes & Track IDs
    if (detectionsList.length > 0) {
      for (const det of detectionsList) {
        const bx = det.bbox.x * w;
        const by = det.bbox.y * h;
        const bw = det.bbox.width * w;
        const bh = det.bbox.height * h;
        const cx = det.centroid.x * w;
        const cy = det.centroid.y * h;

        // Bounding Box (Vibrant Emerald with subtle fill)
        ctx.strokeStyle = "#00ff66";
        ctx.lineWidth = Math.max(3, Math.round(w / 380));
        ctx.fillStyle = "rgba(0, 255, 102, 0.12)";
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillRect(bx, by, bw, bh);

        // Centroid dot
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(4, Math.round(w / 320)), 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Track ID and Confidence Header Tag
        const confPercent = Math.round((det.confidence || 0) * 100);
        const tagText = det.trackId != null ? `ID ${det.trackId} · ${confPercent}%` : `PERSON · ${confPercent}%`;
        const fontSize = Math.max(13, Math.round(w / 95));
        ctx.font = `bold ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        const tagMetrics = ctx.measureText(tagText);
        const tagW = tagMetrics.width + 14;
        const tagH = fontSize + 10;
        const tagY = Math.max(0, by - tagH);

        ctx.fillStyle = "rgba(11, 19, 41, 0.94)";
        ctx.fillRect(bx, tagY, tagW, tagH);
        ctx.strokeStyle = "#00ff66";
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, tagY, tagW, tagH);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(tagText, bx + 6, tagY + fontSize + 2);
      }
    }

    // 3. Draw Tripwire Line (On top of boxes)
    const tripwireNormY =
      cctvFrame?.tripwireNormalizedY ??
      ((feed.defaultTripwireY || 540) / (feed.orientation === "PORTRAIT" ? 1920 : 1080));

    if (tripwireNormY > 0 && tripwireNormY < 1) {
      const lineY = tripwireNormY * h;

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = Math.max(2.5, Math.round(w / 450));
      ctx.setLineDash([14, 7]);
      ctx.moveTo(0, lineY);
      ctx.lineTo(w, lineY);
      ctx.stroke();

      // Tripwire label pill
      const tripwireText = `TRIPWIRE LINE (Y: ${Math.round(tripwireNormY * (video.videoHeight || 1080))}px) · IN: ${inflow ?? 0} | OUT: ${outflow ?? 0}`;
      const twFontSize = Math.max(12, Math.round(w / 115));
      ctx.font = `bold ${twFontSize}px ui-monospace, monospace`;
      const twMetrics = ctx.measureText(tripwireText);
      const twW = twMetrics.width + 16;
      const twH = twFontSize + 12;

      ctx.fillStyle = "rgba(17, 17, 17, 0.94)";
      ctx.setLineDash([]);
      ctx.fillRect(w - twW - 14, lineY - twH / 2, twW, twH);
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(w - twW - 14, lineY - twH / 2, twW, twH);

      ctx.fillStyle = "#facc15";
      ctx.fillText(tripwireText, w - twW - 6, lineY + twFontSize / 2 - 1);
      ctx.restore();
    }
  }, [cctvFrame, detectionsList, feed, inflow, outflow, showAnnotated]);

  // Update canvas on animation frame
  useEffect(() => {
    let animId: number;
    const handleRender = () => {
      renderCanvasOverlay();
      animId = requestAnimationFrame(handleRender);
    };
    animId = requestAnimationFrame(handleRender);
    return () => cancelAnimationFrame(animId);
  }, [renderCanvasOverlay]);

  // ==========================================================
  // Compact 3x3 Grid Mode View
  // ==========================================================
  if (isGridMode && !isPrimary) {
    return (
      <div
        className={styles.gridTile}
        id={`cctv-tile-${feed.id}`}
        onClick={() => onSelectPrimary && onSelectPrimary(feed.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onSelectPrimary && onSelectPrimary(feed.id);
          }
        }}
      >
        {/* Tile Header */}
        <div className={styles.tileHeader}>
          <div className={styles.tileHeaderLeft}>
            <span className={styles.tileCameraId}>{feed.cameraId}</span>
            <span className={styles.tileRecordedBadge}>RECORDED CCTV</span>
          </div>
          <div className={styles.tileHeaderRight}>
            <span className={styles.tileOrientationBadge}>{orientationBadge}</span>
            <span
              className={
                isCvBridgeActive
                  ? styles.tileStatusActive
                  : styles.tileStatusStandby
              }
            >
              <span className={styles.statusDot} />
              {isCvBridgeActive ? "YOLO ACTIVE" : "STANDBY"}
            </span>
          </div>
        </div>

        {/* Video Player Container */}
        <div className={styles.tileVideoWrapper}>
          {videoError ? (
            <div className={styles.tileVideoFallback}>
              <AlertTriangle size={18} color="var(--orange)" />
              <span>Asset Offline</span>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={currentVideoSrc}
              muted
              autoPlay
              loop
              playsInline
              preload="metadata"
              onError={() => setVideoError(true)}
              className={styles.tileVideoElement}
            />
          )}

          {/* Quick Focus Button Overlay */}
          <div className={styles.tileOverlayAction}>
            <button
              type="button"
              className={styles.btnTileFocus}
              onClick={(e) => {
                e.stopPropagation();
                onSelectPrimary && onSelectPrimary(feed.id);
              }}
              title="Focus this camera feed"
            >
              <Maximize2 size={13} />
              <span>Focus Feed</span>
            </button>
          </div>
        </div>

        {/* Tile Metrics Ribbon */}
        <div className={styles.tileMetricsGrid}>
          <div className={styles.tileMetricCell}>
            <span className={styles.tileMetricLabel}>Count</span>
            <span className={styles.tileMetricVal}>
              {personCount !== null ? personCount : "Unavailable"}
            </span>
          </div>
          <div className={styles.tileMetricCell}>
            <span className={styles.tileMetricLabel}>Density</span>
            <span className={styles.tileMetricVal}>
              {density || (feed.calibratedAreaSqM ? "Calibrating" : "Unavailable")}
            </span>
          </div>
          <div className={styles.tileMetricCell}>
            <span className={styles.tileMetricLabel}>Flow</span>
            <span className={styles.tileMetricVal}>
              {inflow !== null || outflow !== null
                ? `+${inflow ?? 0}/-${outflow ?? 0}`
                : "Unavailable"}
            </span>
          </div>
          <div className={styles.tileMetricCell}>
            <span className={styles.tileMetricLabel}>Tracking</span>
            <span className={styles.tileMetricVal} style={{ color: "#38bdf8" }}>
              {isCvBridgeActive ? "ACTIVE" : "STANDBY"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // Primary Focus Monitor View with Rich Canvas Overlay
  // ==========================================================
  return (
    <div
      className={`${styles.feedCard} ${isPrimary ? styles.primaryCard : ""}`}
      id={`cctv-card-${feed.id}`}
    >
      {/* Card Top Header */}
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.feedTitleRow}>
            <Video size={18} className={styles.cameraIcon} />
            <h3 className={styles.feedTitle}>{feed.name}</h3>
            {isPrimary && (
              <span className={styles.primaryBadge}>PRIMARY FOCUS MONITOR</span>
            )}
          </div>
          <div className={styles.feedSubtitle}>
            <span className={styles.tagCameraId}>{feed.cameraId}</span>
            <span className={styles.tagDivider}>•</span>
            <span className={styles.tagZone}>{feed.zoneName}</span>
            <span className={styles.tagDivider}>•</span>
            <span className={styles.tagSpec}>{orientationBadge} ({feed.resolution} @ {feed.fps}fps)</span>
          </div>
        </div>

        <div className={styles.headerRight}>
          {/* Provenance Badge */}
          <span className={styles.badgeRecorded}>
            RECORDED CCTV / VIDEO SIMULATION
          </span>

          {/* Telemetry connection status */}
          <span
            className={
              isCvBridgeActive
                ? styles.badgeOnline
                : styles.badgeStandby
            }
          >
            <span className={styles.statusDot} />
            {isCvBridgeActive
              ? "YOLOv12 + BYTETrack ACTIVE"
              : "INFERENCE STANDBY"}
          </span>

          {/* Focus Toggle if not currently primary */}
          {!isPrimary && onSelectPrimary && (
            <button
              onClick={() => onSelectPrimary(feed.id)}
              className={styles.btnSetPrimary}
              title="Focus this camera feed as primary monitor"
              type="button"
            >
              <Maximize2 size={14} /> Focus Primary
            </button>
          )}
        </div>
      </div>

      {/* Video Container with Real-Time Canvas Overlay */}
      <div className={styles.videoSection}>
        <div
          className={`${styles.videoWrapper} ${
            feed.orientation === "PORTRAIT" ? styles.videoPortraitWrapper : ""
          }`}
        >
          {videoError ? (
            <div className={styles.videoFallback}>
              <AlertTriangle size={28} color="var(--orange)" className={styles.fallbackIcon} />
              <p className={styles.fallbackTitle}>Video Asset Unavailable</p>
              <p className={styles.fallbackText}>
                Failed to load media at <code>{currentVideoSrc}</code>
              </p>
              <button
                type="button"
                onClick={() => setVideoError(false)}
                className={styles.btnRetry}
              >
                Retry Playback
              </button>
            </div>
          ) : (
            <div className={styles.videoStage}>
              <video
                ref={videoRef}
                key={currentVideoSrc}
                src={currentVideoSrc}
                controls
                muted
                autoPlay
                loop
                playsInline
                preload="metadata"
                onError={() => setVideoError(true)}
                className={`${styles.videoElement} ${
                  feed.orientation === "PORTRAIT" ? styles.videoPortrait : ""
                }`}
              />

              {/* Dynamic HTML5 Canvas Overlay for Real YOLO + ByteTrack Boxes & Trails */}
              <canvas
                ref={canvasRef}
                className={styles.cvOverlayCanvas}
              />

              {/* Top-Right Video State Overlay Tag */}
              <div className={styles.videoOverlayTag}>
                {showAnnotated ? (
                  <span className={styles.overlayAnnotated}>
                    <Scan size={12} /> {isCvBridgeActive ? "YOLOv12 + BYTETrack LIVE" : "CV OVERLAY READY"}
                  </span>
                ) : (
                  <span className={styles.overlayRaw}>
                    <Camera size={12} /> RAW FOOTAGE
                  </span>
                )}
              </div>

              {/* Live Detection Status Banner at Bottom-Left of Video */}
              <div className={styles.cvDetectionPill}>
                {isCvBridgeActive ? (
                  <>
                    <Activity size={12} color="#00ff66" />
                    <span>
                      Live YOLOv12: <strong>{detectionsList.length}</strong> persons tracked | Mean Conf: <strong>{((meanConf ?? 0.85) * 100).toFixed(0)}%</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <Cpu size={12} color="#94a3b8" />
                    <span>Inference Standby · Run Python CV Bridge CLI to stream detections</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Video Mode Toolbar */}
        <div className={styles.videoToolbar}>
          <div className={styles.toolbarLeft}>
            <div className={styles.viewModeToggle}>
              <button
                type="button"
                className={`${styles.btnToggle} ${
                  showAnnotated ? styles.btnToggleActive : ""
                }`}
                onClick={() => setShowAnnotated(true)}
              >
                <Scan size={12} /> CV Annotated
              </button>
              <button
                type="button"
                className={`${styles.btnToggle} ${
                  !showAnnotated ? styles.btnToggleActive : ""
                }`}
                onClick={() => setShowAnnotated(false)}
              >
                <Camera size={12} /> Raw Video
              </button>
            </div>
            <span className={styles.videoSpec}>
              {feed.resolution} • {feed.fps} FPS • {feed.durationSeconds}s loop
            </span>
          </div>

          <div className={styles.toolbarRight}>
            <span className={styles.descriptionText}>{feed.description}</span>
          </div>
        </div>
      </div>

      {/* Operational Metrics Bar */}
      <div className={styles.metricsBar}>
        {/* Metric: Detected Persons */}
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Detected Persons</span>
          <span className={styles.metricNumber}>
            {personCount !== null ? (
              personCount
            ) : (
              <span className={styles.mutedPlaceholder}>Unavailable</span>
            )}
          </span>
          <span className={styles.metricCaption}>
            {personCount !== null ? "YOLO Class 0 (Person)" : "Awaiting CV bridge"}
          </span>
        </div>

        {/* Metric: Active Tracks */}
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Active Tracks</span>
          <span className={`${styles.metricNumber} ${styles.colorSky}`}>
            {activeTracks !== null ? activeTracks : "Unavailable"}
          </span>
          <span className={styles.metricCaption}>
            ByteTrack persistent IDs
          </span>
        </div>

        {/* Metric: Inflow */}
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Tripwire Inflow</span>
          <span className={`${styles.metricNumber} ${styles.colorEmerald}`}>
            {inflow !== null ? `+${inflow}` : "Unavailable"}
          </span>
          <span className={styles.metricCaption}>Inbound crossings</span>
        </div>

        {/* Metric: Outflow */}
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Tripwire Outflow</span>
          <span className={`${styles.metricNumber} ${styles.colorAmber}`}>
            {outflow !== null ? `-${outflow}` : "Unavailable"}
          </span>
          <span className={styles.metricCaption}>Outbound crossings</span>
        </div>

        {/* Metric: Average Confidence */}
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Avg Confidence</span>
          <span className={styles.metricNumber}>
            {meanConf !== null ? `${(meanConf * 100).toFixed(1)}%` : "Unavailable"}
          </span>
          <span className={styles.metricCaption}>
            Mean detection score
          </span>
        </div>

        {/* Metric: Pipeline Status */}
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>CV Subsystem</span>
          <span
            className={`${styles.metricNumber} ${
              isCvBridgeActive ? styles.colorEmerald : styles.mutedPlaceholder
            }`}
          >
            {isCvBridgeActive ? "ACTIVE" : "STANDBY"}
          </span>
          <span className={styles.metricCaption}>
            {isCvBridgeActive ? "YOLOv12 + ByteTrack" : "Bridge waiting"}
          </span>
        </div>
      </div>
    </div>
  );
}
