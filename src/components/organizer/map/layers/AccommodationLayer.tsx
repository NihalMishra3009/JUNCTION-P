"use client";
import React from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Hotel } from "@/types";
import { getPressureColor } from "@/components/ui/PressureIndicator";
import styles from "../../DestinationMap.module.css";

interface Props {
  hotels: Hotel[];
}

function createHotelIcon(hotel: Hotel) {
  const color = getPressureColor(hotel.pressure);
  const isExhausted = hotel.availableRooms === 0;

  const html = `
    <div class="${styles.hotelMarker}" style="--marker-color: ${color}">
      <div class="${styles.hotelBadge}">
        <span class="${styles.hotelIcon}">🏨</span>
        <span class="${styles.hotelRooms}" style="background: ${isExhausted ? 'var(--red)' : 'var(--ink)'}; color: #fff;">
          ${hotel.availableRooms} rms
        </span>
      </div>
      <span class="${styles.hotelLabel}">${hotel.name}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: styles.leafletCustomIcon,
    iconSize: [95, 48],
    iconAnchor: [47, 24],
    popupAnchor: [0, -24],
  });
}

export default function AccommodationLayer({ hotels }: Props) {
  return (
    <>
      {hotels.map(h => {
        if (!h.location) return null;
        const icon = createHotelIcon(h);

        return (
          <Marker
            key={h.id}
            position={[h.location.latitude, h.location.longitude]}
            icon={icon}
          >
            <Popup className={styles.customPopup}>
              <div className={styles.popupContent}>
                <div className={styles.popupHeader}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className={styles.popupType}>ACCOMMODATION</span>
                    <span className="pill pill-live" style={{ fontSize: 9, padding: "1px 5px" }}>
                      {h.source === "PARTNER_REPORTED" ? "PARTNER UPDATED" : "SIMULATED"}
                    </span>
                  </div>
                  <h4 className={styles.popupTitle}>{h.name}</h4>
                  <span className={styles.popupZone}>{h.zone.replace("_", " ")}</span>
                </div>
                <div className={styles.popupBody}>
                  <div className={styles.popupRow}>
                    <span>Available Rooms:</span>
                    <strong style={{ color: h.availableRooms <= 5 ? "var(--red)" : "var(--green)" }}>
                      {h.availableRooms} / {h.totalRooms}
                    </strong>
                  </div>
                  <div className={styles.popupRow}>
                    <span>Usable Rooms:</span>
                    <span>{h.usableRooms} (connectivity filtered)</span>
                  </div>
                  <div className={styles.popupRow}>
                    <span>Travel to Venue:</span>
                    <span>~{h.travelTimeToVenue} min</span>
                  </div>
                  <div className={styles.popupRow}>
                    <span>Occupancy Pressure:</span>
                    <strong style={{ color: getPressureColor(h.pressure) }}>
                      {h.pressure}% ({h.pressureLevel})
                    </strong>
                  </div>
                  {h.priceRange && (
                    <div className={styles.popupRow}>
                      <span>Est. Rate:</span>
                      <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{h.priceRange}</span>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
