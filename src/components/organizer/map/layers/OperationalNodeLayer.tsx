"use client";
import React from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Resource } from "@/types";
import { getPressureColor } from "@/components/ui/PressureIndicator";
import styles from "../../DestinationMap.module.css";

interface Props {
  resources: Resource[];
  nodeLoads?: Record<string, number>;
  onSelectResource: (r: Resource) => void;
  selectedId: string | null;
  showTransport?: boolean;
  showVenues?: boolean;
}

const VENUE_NODE_IDS = new Set(["WANKHEDE_EXIT", "WANKHEDE_STADIUM"]);
const TRANSPORT_NODE_IDS = new Set(["CHURCHGATE", "MARINE_LINES", "CSMT", "DADAR", "TAXI_ZONE"]);

const NODE_DISPLAY_CONFIG: Record<string, { label: string; icon: string }> = {
  WANKHEDE_EXIT: { label: "Wankhede Gates", icon: "🚪" },
  WANKHEDE_STADIUM: { label: "Wankhede Stadium", icon: "🏟️" },
  CHURCHGATE: { label: "Churchgate Station", icon: "🚆" },
  MARINE_LINES: { label: "Marine Lines Station", icon: "🚆" },
  CSMT: { label: "CSMT Terminus", icon: "🚆" },
  DADAR: { label: "Dadar Transit Hub", icon: "🚆" },
  TAXI_ZONE: { label: "Taxi Stand Area", icon: "🚕" },
};

function createOperationalNodeIcon(
  resource: Resource,
  load: number,
  isSelected: boolean
) {
  const color = getPressureColor(resource.pressure);
  const cfg = NODE_DISPLAY_CONFIG[resource.id] || {
    label: resource.shortName || resource.name,
    icon: "📍",
  };

  const capacity = resource.totalCapacity || 1000;
  const loadK = (load / 1000).toFixed(1);
  const capK = (capacity / 1000).toFixed(0);

  const html = `
    <div class="${styles.opNodeCard} ${isSelected ? styles.opNodeCardSelected : ""}" style="--node-accent: ${color};">
      <div class="${styles.opNodeHeader}">
        <span class="${styles.opNodeIcon}">${cfg.icon}</span>
        <span class="${styles.opNodeTitle}">${cfg.label}</span>
        <span class="${styles.opNodeSimTag}">SIMULATED</span>
      </div>
      <div class="${styles.opNodeBody}">
        <div class="${styles.opNodePressureRow}">
          <span class="${styles.opNodePressureBadge}" style="background: ${color}; color: ${resource.pressure >= 85 ? '#ffffff' : '#111111'};">
            ${resource.pressureLevel} (${resource.pressure}%)
          </span>
        </div>
        <div class="${styles.opNodeMetricsRow}">
          <span class="${styles.opNodeLoad}">~${loadK}K load</span>
          <span class="${styles.opNodeSep}">/</span>
          <span class="${styles.opNodeCap}">${capK}K cap</span>
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: styles.leafletCustomIcon,
    iconSize: [160, 68],
    iconAnchor: [80, 34],
    popupAnchor: [0, -38],
  });
}

/**
 * Dedicated Operational Node Layer for primary destination hubs.
 * Consumes simulation-derived node loads and resources to render clean,
 * executive-grade operational cards with strictly verified data semantics.
 */
export default function OperationalNodeLayer({
  resources,
  nodeLoads = {},
  onSelectResource,
  selectedId,
  showTransport = true,
  showVenues = true,
}: Props) {
  const majorNodes = resources.filter(r => {
    if (VENUE_NODE_IDS.has(r.id)) return showVenues;
    if (TRANSPORT_NODE_IDS.has(r.id)) return showTransport;
    return false;
  });

  return (
    <>
      {majorNodes.map(r => {
        if (!r.location) return null;
        const currentLoad = nodeLoads[r.id] !== undefined ? nodeLoads[r.id] : r.currentUtilization;
        const isSelected = selectedId === r.id;
        const icon = createOperationalNodeIcon(r, currentLoad, isSelected);

        return (
          <Marker
            key={`op-node-${r.id}-${r.pressure}-${isSelected}`}
            position={[r.location.latitude, r.location.longitude]}
            icon={icon}
            eventHandlers={{
              click: () => onSelectResource(r),
            }}
          >
            <Popup className={styles.customPopup}>
              <div className={styles.popupContent}>
                <div className={styles.popupHeader}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className={styles.popupType}>MAJOR OPERATIONAL HUB</span>
                    <span style={{ fontSize: 8, background: "#111", color: "#fbbf24", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>
                      SIMULATED
                    </span>
                  </div>
                  <h4 className={styles.popupTitle}>{r.name}</h4>
                  <span className={styles.popupZone}>{r.zone.replace("_", " ")}</span>
                </div>
                <div className={styles.popupBody}>
                  <div className={styles.popupRow}>
                    <span>Simulated Pressure:</span>
                    <strong style={{ color: getPressureColor(r.pressure) }}>
                      {r.pressure}% ({r.pressureLevel})
                    </strong>
                  </div>
                  <div className={styles.popupRow}>
                    <span>Current Simulated Load:</span>
                    <strong>{currentLoad.toLocaleString()} attendees</strong>
                  </div>
                  <div className={styles.popupRow}>
                    <span>Total Nominal Capacity:</span>
                    <span>{r.totalCapacity.toLocaleString()}</span>
                  </div>
                  <div className={styles.popupRow}>
                    <span>Operating Status:</span>
                    <span
                      className={`pill ${r.operatingStatus === "OPERATIONAL" ? "pill-simulated" : "pill-watch"}`}
                      style={{ fontSize: 9, padding: "2px 6px" }}
                    >
                      {r.operatingStatus}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-yellow btn-sm"
                  style={{ width: "100%", marginTop: 8 }}
                  onClick={() => onSelectResource(r)}
                >
                  Open Resource Telemetry →
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
