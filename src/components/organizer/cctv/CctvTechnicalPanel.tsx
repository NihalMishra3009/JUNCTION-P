"use client";

import React, { useState } from "react";
import { CctvFeedConfig } from "@/types/cctv";
import { NormalizedObservation } from "@/types";
import styles from "./cctvComponents.module.css";

interface CctvTechnicalPanelProps {
  selectedFeed: CctvFeedConfig;
  latestObservation?: NormalizedObservation;
  totalIngested: number;
  apiStatus: string;
}

export default function CctvTechnicalPanel({
  selectedFeed,
  latestObservation,
  totalIngested,
  apiStatus,
}: CctvTechnicalPanelProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const assetVideoPath = selectedFeed.videoSrc.replace("/videos/cctv_suite/", "assets/");
  const command = `python -m cv_bridge.inference --video "${assetVideoPath}" --camera-id ${selectedFeed.cameraId} --tripwire-y ${selectedFeed.defaultTripwireY || 540} --loop`;

  const jsonPayload = latestObservation
    ? JSON.stringify(latestObservation, null, 2)
    : JSON.stringify(
        {
          status: "STANDBY",
          cameraChannel: selectedFeed.cameraId,
          zoneTarget: selectedFeed.zoneId,
          canonicalSchema: "JUNCTION-NormalizedObservation-v1.0.0",
          instructions:
            "Run the Python CV bridge command below to stream real YOLOv12 inference observations into the ingestion pipeline.",
          samplePayload: {
            id: `OBS_CV_${selectedFeed.cameraId}_001`,
            sourceId: selectedFeed.cameraId,
            sourceProvider: "YOLOv12-ByteTrack-Bridge",
            metricType: "CROWD_COUNT",
            zoneId: selectedFeed.zoneId,
            observedAt: new Date().toISOString(),
            value: 16,
            unit: "persons",
            confidence: 0.94,
            qualityStatus: "FRESH",
            derivationType: "MEASURED",
            metadata: {
              model: "yolov12n.pt",
              tracker: "ByteTrack",
              fps: selectedFeed.fps,
              resolution: selectedFeed.resolution,
            },
          },
        },
        null,
        2
      );

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.techPanelWrapper}>
      <button
        type="button"
        className={styles.techPanelToggle}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className={styles.techToggleLeft}>
          <span className={styles.techIcon}>🛠️</span>
          <div>
            <span className={styles.techTitle}>
              Technical Details & Pipeline Telemetry
            </span>
            <span className={styles.techSubtitle}>
              Model architectures, ingestion schema (v1.0.0), and raw observation JSON
            </span>
          </div>
        </div>
        <div className={styles.techToggleRight}>
          <span className={styles.techStatusPill}>
            API: {apiStatus} | Buffer: {totalIngested} Ingested
          </span>
          <span className={styles.arrowIcon}>{isOpen ? "▲ Collapse" : "▼ Expand"}</span>
        </div>
      </button>

      {isOpen && (
        <div className={styles.techPanelContent}>
          <div className={styles.techGrid}>
            {/* Pipeline Configuration Specs */}
            <div className={styles.techCard}>
              <h4 className={styles.techSectionHeading}>
                <span>Pipeline Architecture</span>
              </h4>

              <table className={styles.techTable}>
                <tbody>
                  <tr>
                    <td>Detection Model</td>
                    <td>
                      <code>yolov12n.pt (Ultralytics PyTorch, Class 0 Person)</code>
                    </td>
                  </tr>
                  <tr>
                    <td>Tracker Algorithm</td>
                    <td>
                      <code>ByteTrack (Persistent centroid trajectories)</code>
                    </td>
                  </tr>
                  <tr>
                    <td>Selected Feed Channel</td>
                    <td>
                      <strong>{selectedFeed.name}</strong> (<code>{selectedFeed.cameraId}</code>)
                    </td>
                  </tr>
                  <tr>
                    <td>Target Zone Mapping</td>
                    <td>
                      <code>{selectedFeed.zoneId}</code> ({selectedFeed.zoneName})
                    </td>
                  </tr>
                  <tr>
                    <td>Video Source File</td>
                    <td>
                      <code>{selectedFeed.videoSrc}</code> ({selectedFeed.resolution} @ {selectedFeed.fps}fps)
                    </td>
                  </tr>
                  <tr>
                    <td>Annotated Stream</td>
                    <td>
                      <code>{selectedFeed.annotatedVideoSrc || "None"}</code>
                    </td>
                  </tr>
                  <tr>
                    <td>Spatial Calibration</td>
                    <td>
                      {selectedFeed.calibratedAreaSqM
                        ? `${selectedFeed.calibratedAreaSqM} m² (Verified)`
                        : "Illustrative / Uncalibrated"}
                    </td>
                  </tr>
                  <tr>
                    <td>Ingestion Endpoint</td>
                    <td>
                      <code>POST /api/observations</code>
                    </td>
                  </tr>
                </tbody>
              </table>

              <h5 className={styles.cliHeading}>Bridge Execution Command</h5>
              <div className={styles.cliBox}>
                <code>{command}</code>
              </div>
              <p className={styles.cliHelpText}>
                Execute in terminal to stream live telemetry from this video asset to JUNCTION.
              </p>
            </div>

            {/* Raw JSON Observation Inspector */}
            <div className={styles.techCard}>
              <div className={styles.jsonHeaderRow}>
                <h4 className={styles.techSectionHeading}>
                  <span>Raw Ingested Observation Payload</span>
                </h4>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={styles.btnCopy}
                >
                  {copied ? "✓ Copied!" : "📋 Copy JSON"}
                </button>
              </div>

              <pre className={styles.jsonTerminal}>{jsonPayload}</pre>

              <div className={styles.evidenceNote}>
                <strong>Integrity & Validation:</strong> Real pixel matrices $\rightarrow$ YOLOv12 Class 0 $\rightarrow$ ByteTrack persistent IDs $\rightarrow$ Ingestion pipeline $\rightarrow$ Zone fusion.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
