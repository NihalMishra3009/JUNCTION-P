import React from "react";
import { CctvFeedConfig } from "@/types/cctv";
import { NormalizedObservation, ZoneState } from "@/types";
import { Video, Maximize2 } from "lucide-react";
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
          <h3 className={styles.tableTitle}>Multi-Camera Fleet Telemetry Matrix</h3>
          <p className={styles.tableSubtitle}>
            Cross-channel telemetry and diagnostic status across all 9 video verification streams
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
              <th>Channel / ID</th>
              <th>Source Type</th>
              <th>Format &amp; Resolution</th>
              <th>AI Detection Status</th>
              <th>Visible Persons</th>
              <th>Inflow</th>
              <th>Outflow</th>
              <th>Calibrated Area</th>
              <th>Primary Focus</th>
            </tr>
          </thead>
          <tbody>
            {feeds.map((feed) => {
              const isPrimary = feed.id === primaryFeedId;
              const cameraObs = observations.filter(
                (o) => o.sourceId === feed.cameraId || o.zoneId === feed.zoneId
              );
              const countObs = cameraObs.find((o) => o.metricType === "CROWD_COUNT");
              const inflowObs = cameraObs.find((o) => o.metricType === "INFLOW_RATE");
              const outflowObs = cameraObs.find((o) => o.metricType === "OUTFLOW_RATE");

              const countVal = countObs ? Number(countObs.value) : null;
              const inflowVal = inflowObs ? Number(inflowObs.value) : null;
              const outflowVal = outflowObs ? Number(outflowObs.value) : null;

              return (
                <tr
                  key={feed.id}
                  className={`${styles.tableRow} ${
                    isPrimary ? styles.tableRowPrimary : ""
                  }`}
                >
                  {/* Feed Name & Camera ID */}
                  <td className={styles.tdFeedName}>
                    <div className={styles.feedCell}>
                      <Video size={16} className={styles.tableFeedIcon} />
                      <div>
                        <div className={styles.tableFeedNameText}>{feed.name}</div>
                        <code className={styles.codeCameraId}>{feed.cameraId}</code>
                      </div>
                    </div>
                  </td>

                  {/* Source Type */}
                  <td>
                    <span className={styles.tableBadgeReplay}>
                      RECORDED CCTV
                    </span>
                  </td>

                  {/* Format & Resolution */}
                  <td className={styles.tdSpec}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span className={styles.specText}>
                        {feed.resolution} @ {feed.fps}fps
                      </span>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {feed.orientation} ({feed.aspectRatio})
                      </span>
                    </div>
                  </td>

                  {/* AI Detection Status */}
                  <td>
                    <div className={styles.statusCell}>
                      <span
                        className={
                          countObs && apiConnected
                            ? styles.badgeOnline
                            : styles.badgeStandby
                        }
                      >
                        <span className={styles.statusDot} />
                        {countObs && apiConnected ? "YOLO ACTIVE" : "STANDBY"}
                      </span>
                    </div>
                  </td>

                  {/* Detected Persons */}
                  <td className={styles.tdMetric}>
                    <span className={styles.tableMetricValue}>
                      {countVal !== null ? (
                        <strong>{countVal}</strong>
                      ) : (
                        <span className={styles.mutedText}>Unavailable</span>
                      )}
                    </span>
                  </td>

                  {/* Inflow */}
                  <td className={styles.tdMetric}>
                    <span className={`${styles.tableMetricValue} ${styles.colorEmerald}`}>
                      {inflowVal !== null ? `+${inflowVal}` : "Unavailable"}
                    </span>
                  </td>

                  {/* Outflow */}
                  <td className={styles.tdMetric}>
                    <span className={`${styles.tableMetricValue} ${styles.colorAmber}`}>
                      {outflowVal !== null ? `-${outflowVal}` : "Unavailable"}
                    </span>
                  </td>

                  {/* Calibrated Area */}
                  <td>
                    <span style={{ fontSize: "12px", color: "#cbd5e1" }}>
                      {feed.calibratedAreaSqM
                        ? `${feed.calibratedAreaSqM} m²`
                        : "Uncalibrated"}
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
                        <Maximize2 size={12} /> Focus
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
