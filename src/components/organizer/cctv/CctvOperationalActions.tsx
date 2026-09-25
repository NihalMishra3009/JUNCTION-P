import React from "react";
import { Recommendation, Alert, HotspotPrediction, ZoneState } from "@/types";
import { Zap, AlertTriangle, CheckCircle2, Lightbulb, ShieldCheck } from "lucide-react";
import styles from "./cctvComponents.module.css";

interface CctvOperationalActionsProps {
  recommendations: Recommendation[];
  alerts: Alert[];
  hotspots: HotspotPrediction[];
  zones: ZoneState[];
  selectedZoneId: string;
  onApproveRec: (id: string) => void;
  onRejectRec: (id: string) => void;
  isRecApproved: (id: string) => boolean;
}

export default function CctvOperationalActions({
  recommendations,
  alerts,
  hotspots,
  zones,
  selectedZoneId,
  onApproveRec,
  onRejectRec,
  isRecApproved,
}: CctvOperationalActionsProps) {
  // Filter alerts relevant to the monitored venues/corridors
  const activeAlerts = alerts.filter(
    (a) => a.severity === "CRITICAL" || a.severity === "HIGH"
  );

  // Filter recommendations
  const actionableRecs = recommendations.slice(0, 3);

  // Monitored zone states
  const highPressureZones = zones.filter(
    (z) => z.pressureLevel === "HIGH" || z.pressureLevel === "CRITICAL"
  );

  return (
    <div className={styles.operationalSection}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleGroup}>
          <Zap size={18} className={styles.sectionIcon} />
          <div>
            <h3 className={styles.sectionTitle}>Operational Decision Support & Actions</h3>
            <p className={styles.sectionSubtitle}>
              Real-time crowd intelligence, bottleneck mitigation, and active intervention workflows
            </p>
          </div>
        </div>
        <span className={styles.sectionBadge}>
          {actionableRecs.length} Interventions Available
        </span>
      </div>

      <div className={styles.actionGrid}>
        {/* Left Card: Active Alerts & Bottleneck Warnings */}
        <div className={styles.actionCard}>
          <h4 className={styles.cardSubheading}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={15} color="var(--red)" /> Active Bottlenecks & Vision Alerts
            </span>
            <span className={styles.badgeCount}>{activeAlerts.length} Active</span>
          </h4>

          {activeAlerts.length > 0 ? (
            <div className={styles.alertList}>
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`${styles.alertItem} ${
                    alert.severity === "CRITICAL"
                      ? styles.alertItemCritical
                      : styles.alertItemHigh
                  }`}
                >
                  <div className={styles.alertHeader}>
                    <span className={styles.alertLocation}>{alert.title}</span>
                    <span
                      className={`${styles.alertBadge} ${
                        alert.severity === "CRITICAL"
                          ? styles.badgeCritical
                          : styles.badgeWarning
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <p className={styles.alertMessage}>{alert.message}</p>
                  <span className={styles.alertTime}>
                    Logged at {alert.timestamp} {alert.resourceId ? `• [${alert.resourceId}]` : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyStateBox}>
              <CheckCircle2 size={24} color="var(--green)" className={styles.emptyStateIcon} />
              <p className={styles.emptyStateTitle}>All Corridors Clear</p>
              <p className={styles.emptyStateDesc}>
                No critical vision bottlenecks or density warnings detected in active camera sectors.
              </p>
            </div>
          )}

          {/* Hotspots & Zone Pressure Summary */}
          {highPressureZones.length > 0 && (
            <div className={styles.pressureAlertBox}>
              <strong className={styles.pressureAlertTitle} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={14} color="var(--orange)" /> Elevated Zone Pressure Detected:
              </strong>
              <div className={styles.pressureZoneTags}>
                {highPressureZones.map((z) => (
                  <span key={z.id} className={styles.pressureZoneTag}>
                    {z.name}: <strong>{z.pressure}% ({z.pressureLevel})</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Card: Recommended Operational Interventions */}
        <div className={styles.actionCard}>
          <h4 className={styles.cardSubheading}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Lightbulb size={15} color="var(--yellow)" /> Recommended Operational Interventions
            </span>
            <span className={styles.badgeActionable}>Decision Support</span>
          </h4>

          {actionableRecs.length > 0 ? (
            <div className={styles.recList}>
              {actionableRecs.map((rec) => {
                const approved = isRecApproved(rec.id) || rec.status === "APPROVED";
                return (
                  <div
                    key={rec.id}
                    className={`${styles.recItem} ${
                      approved ? styles.recItemApproved : ""
                    }`}
                  >
                    <div className={styles.recTopRow}>
                      <span className={styles.recTypeBadge}>{rec.type}</span>
                      <span className={styles.recImpactBadge}>
                        Confidence: {rec.confidence}
                      </span>
                    </div>

                    <h5 className={styles.recTitle}>{rec.title}</h5>
                    <p className={styles.recDesc}>
                      <strong>Action:</strong> {rec.action} <br />
                      <strong>Reason:</strong> {rec.reason}
                    </p>

                    <div className={styles.recBottomRow}>
                      <span className={styles.recConfidence}>
                        Trade-off: {rec.tradeOff}
                      </span>

                      <div className={styles.recBtnGroup}>
                        {approved ? (
                          <span className={styles.statusApproved}>
                            Approved & Dispatched
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onApproveRec(rec.id)}
                              className={styles.btnApprove}
                            >
                              Approve Intervention →
                            </button>
                            <button
                              type="button"
                              onClick={() => onRejectRec(rec.id)}
                              className={styles.btnReject}
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyStateBox}>
              <ShieldCheck size={24} color="var(--green)" className={styles.emptyStateIcon} />
              <p className={styles.emptyStateTitle}>No Immediate Intervention Required</p>
              <p className={styles.emptyStateDesc}>
                Pedestrian clearance flow is operating within nominal safety thresholds.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
