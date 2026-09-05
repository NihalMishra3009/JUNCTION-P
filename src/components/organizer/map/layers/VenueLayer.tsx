"use client";
import React from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Resource } from "@/types";
import { getPressureColor } from "@/components/ui/PressureIndicator";
import styles from "../../DestinationMap.module.css";

interface Props {
  resources: Resource[];
  onSelectResource: (r: Resource) => void;
  selectedId: string | null;
}

function createVenueIcon(resource: Resource, isSelected: boolean) {
  const color = getPressureColor(resource.pressure);
  const isExit = resource.id === "WANKHEDE_EXIT";
  const label = isExit ? "EXIT GATES" : "WANKHEDE";
  const iconLetter = isExit ? "🚪" : "🏟️";

  const html = `
    <div class="${styles.venueMarker} ${isSelected ? styles.markerSelected : ""}" style="--marker-color: ${color}">
      <div class="${styles.markerBadge}">
        <span class="${styles.markerIcon}">${iconLetter}</span>
        <span class="${styles.markerPressure}" style="background: ${color}; color: ${resource.pressure >= 85 ? '#fff' : '#111'};">${resource.pressure}%</span>
      </div>
      <span class="${styles.markerLabel}">${label}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: styles.leafletCustomIcon,
    iconSize: [80, 52],
    iconAnchor: [40, 26],
    popupAnchor: [0, -28],
  });
}

const MAJOR_VENUE_IDS = new Set(["WANKHEDE", "WANKHEDE_EXIT", "WANKHEDE_STADIUM"]);

export default function VenueLayer({ resources, onSelectResource, selectedId }: Props) {
  const venues = resources.filter(r => r.type === "VENUE" && !MAJOR_VENUE_IDS.has(r.id));

  return (
    <>
      {venues.map(r => {
        if (!r.location) return null;
        const isSelected = selectedId === r.id;
        const icon = createVenueIcon(r, isSelected);

        return (
          <Marker
            key={`${r.id}-${r.pressure}-${isSelected}`}
            position={[r.location.latitude, r.location.longitude]}
            icon={icon}
            eventHandlers={{
              click: () => onSelectResource(r),
            }}
          >
            <Popup className={styles.customPopup}>
              <div className={styles.popupContent}>
                <div className={styles.popupHeader}>
                  <span className={styles.popupType}>{r.type}</span>
                  <h4 className={styles.popupTitle}>{r.name}</h4>
                  <span className={styles.popupZone}>{r.zone.replace("_", " ")}</span>
                </div>
                <div className={styles.popupBody}>
                  <div className={styles.popupRow}>
                    <span>Pressure:</span>
                    <strong style={{ color: getPressureColor(r.pressure) }}>
                      {r.pressure}% ({r.pressureLevel})
                    </strong>
                  </div>
                  <div className={styles.popupRow}>
                    <span>Utilization:</span>
                    <span>{r.currentUtilization.toLocaleString()} / {r.totalCapacity.toLocaleString()}</span>
                  </div>
                  <div className={styles.popupRow}>
                    <span>Operating Status:</span>
                    <span className="pill pill-live" style={{ fontSize: 9, padding: "2px 6px" }}>{r.operatingStatus}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-yellow btn-sm"
                  style={{ width: "100%", marginTop: 8 }}
                  onClick={() => onSelectResource(r)}
                >
                  View Telemetry Panel →
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
