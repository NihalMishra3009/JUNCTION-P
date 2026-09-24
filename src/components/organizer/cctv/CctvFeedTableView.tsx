"use client";

import React from "react";
import { CctvFeedConfig } from "@/types/cctv";
import { NormalizedObservation, ZoneState } from "@/types";
import styles from "./cctvComponents.module.css";

interface CctvFeedTableViewProps {
  feeds: CctvFeedConfig[];
  primaryFeedId: string;
  onSelectPrimary: (feedId: string) => void;
  getZoneState: (zoneId: string) => ZoneState | undefined;
  observations: NormalizedObservation[];
  apiConnected: boolean;
}

export default function CctvFeedTableView({
  feeds,
  primaryFeedId,
  onSelectPrimary,
  getZoneState,
  observations,
  apiConnected,
}: CctvFeedTableViewProps) {
  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeaderBar}>
        <div>
          <h3 className={styles.tableTitle}>Multi-Camera Telemetry Matrix</h3>
          <p className={styles.tableSubtitle}>
            Live fleet comparison across all 5 operational vision checkpoints
          </p>
        </div>
        <div className={styles.tableBadgeGroup}>
          <span className={styles.tableSummaryBadge}>
            {feeds.length} Monitored Channels
          </span>
        </div>
      </div>

      <div className={styles.tableResponsiveWrapper}>
        <table className={styles.fleetTable}>
          <thead>
            <tr>
              <th>Feed / Camera</th>
              <th>Camera ID</th>
              <th>Operational Zone</th>
              <th>Source & AI Status</th>
              <th>Detected Persons</th>
              <th>Inflow Rate</th>
              <th>Outflow Rate</th>
              <th>Zone State</th>
              <th>Resolution & FPS</th>
              <th>Primary Monitor</th>
            </tr>
          </thead>
          <tbody>
            {feeds.map((feed) => {
              const isPrimary = feed.id === primaryFeedId;
              const zone = getZoneState(feed.zoneId);
              const cameraObs = observations.filter(
                (o) => o.sourceId === feed.cameraId || o.zoneId === feed.zoneId
              );
              const countObs = cameraObs.find((o) => o.metricType === "CROWD_COUNT");
              const inflowObs = cameraObs.find((o) => o.metricType === "INFLOW_RATE");
              const outflowObs = cameraObs.find((o) => o.metricType === "OUTFLOW_RATE");

              const countVal = countObs ? Number(countObs.value) : null;
              const inflowVal = inflowObs ? Number(inflowObs.value) : null;
              const outflowVal = outflowObs ? Number(outflowObs.value) : null;

              const pressureLevel = zone?.pressureLevel || "NORMAL";
              const pressurePct = zone?.pressure ?? 45;

              return (
                <tr
                  key={feed.id}
                  className={`${styles.tableRow} ${
                    isPrimary ? styles.tableRowPrimary : ""
                  }`}
                >
                  {/* Feed Name */}
                  <td className={styles.tdFeedName}>
                    <div className={styles.feedCell}>
                      <span className={styles.tableFeedIcon}>📹</span>
                      <div>
                        <div className={styles.tableFeedNameText}>{feed.name}</div>
                        <div className={styles.tableFeedDesc}>{feed.description}</div>
                      </div>
                    </div>
                  </td>

                  {/* Camera ID */}
                  <td className={styles.tdCameraId}>
                    <code className={styles.codeCameraId}>{feed.cameraId}</code>
                  </td>

                  {/* Operational Zone */}
                  <td className={styles.tdZone}>
                    <span className={styles.tableZoneName}>{feed.zoneName}</span>
                  </td>

                  {/* Source & AI Status */}
                  <td>
                    <div className={styles.statusCell}>
                      <span
                        className={
                          feed.sourceType === "SYNTHETIC"
                            ? styles.tableBadgeSynthetic
                            : styles.tableBadgeReplay
                        }
                      >
                        {feed.sourceType === "SYNTHETIC"
                          ? "SYNTHETIC"
                          : "LOCAL REPLAY"}
                      </span>
                      <span
                        className={
                          countObs && apiConnected
                            ? styles.badgeOnline
                            : styles.badgeStandby
                        }
                      >
                        <span className={styles.statusDot} />
                        {countObs && apiConnected ? "STREAMING" : "STANDBY"}
                      </span>
                    </div>
                  </td>

                  {/* Detected Persons */}
                  <td className={styles.tdMetric}>
                    <span className={styles.tableMetricValue}>
                      {countVal !== null ? (
                        <strong>{countVal}</strong>
                      ) : (
                        <span className={styles.mutedText}>Ready</span>
                      )}
                    </span>
                  </td>

                  {/* Inflow */}
                  <td className={styles.tdMetric}>
                    <span className={`${styles.tableMetricValue} ${styles.colorEmerald}`}>
                      {inflowVal !== null ? `+${inflowVal}` : "—"}
                    </span>
                  </td>

                  {/* Outflow */}
                  <td className={styles.tdMetric}>
                    <span className={`${styles.tableMetricValue} ${styles.colorAmber}`}>
                      {outflowVal !== null ? `-${outflowVal}` : "—"}
                    </span>
                  </td>

                  {/* Zone State */}
                  <td>
                    <span
                      className={`${styles.zoneStatusPill} ${
                        pressureLevel === "CRITICAL"
                          ? styles.pillCritical
                          : pressureLevel === "HIGH"
                          ? styles.pillAmber
                          : styles.pillNormal
                      }`}
                    >
                      {pressurePct}% ({pressureLevel})
                    </span>
                  </td>

                  {/* Resolution & FPS */}
                  <td className={styles.tdSpec}>
                    <span className={styles.specText}>
                      {feed.resolution} @ {feed.fps}fps
                    </span>
                  </td>

                  {/* Action */}
                  <td className={styles.tdAction}>
                    {isPrimary ? (
                      <span className={styles.currentPrimaryTag}>Active Monitor</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectPrimary(feed.id)}
                        className={styles.btnTableFocus}
                      >
                        Set Primary
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
