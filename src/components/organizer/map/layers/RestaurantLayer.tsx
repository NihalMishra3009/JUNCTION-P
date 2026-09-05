"use client";
import React from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Restaurant } from "@/types";
import { getPressureColor } from "@/components/ui/PressureIndicator";
import styles from "../../DestinationMap.module.css";

interface Props {
  restaurants: Restaurant[];
}

function createRestaurantIcon(restaurant: Restaurant) {
  const color = getPressureColor(restaurant.pressure);

  const html = `
    <div class="${styles.restaurantMarker}" style="--marker-color: ${color}">
      <div class="${styles.restaurantBadge}">
        <span class="${styles.restaurantIcon}">🍽️</span>
        <span class="${styles.restaurantWait}">${restaurant.waitTime}m</span>
      </div>
      <span class="${styles.restaurantLabel}">${restaurant.name}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: styles.leafletCustomIcon,
    iconSize: [85, 46],
    iconAnchor: [42, 23],
    popupAnchor: [0, -23],
  });
}

export default function RestaurantLayer({ restaurants }: Props) {
  return (
    <>
      {restaurants.map(r => {
        if (!r.location) return null;
        const icon = createRestaurantIcon(r);

        return (
          <Marker
            key={r.id}
            position={[r.location.latitude, r.location.longitude]}
            icon={icon}
          >
            <Popup className={styles.customPopup}>
              <div className={styles.popupContent}>
                <div className={styles.popupHeader}>
                  <span className={styles.popupType}>DINING &amp; HOSPITALITY</span>
                  <h4 className={styles.popupTitle}>{r.name}</h4>
                  <span className={styles.popupZone}>{r.cuisine} · {r.zone.replace("_", " ")}</span>
                </div>
                <div className={styles.popupBody}>
                  <div className={styles.popupRow}>
                    <span>Available Tables:</span>
                    <strong>{r.availableTables} / {r.capacity} seats</strong>
                  </div>
                  <div className={styles.popupRow}>
                    <span>Est. Wait Time:</span>
                    <strong style={{ color: r.waitTime >= 30 ? "var(--orange)" : "var(--green)" }}>
                      ~{r.waitTime} min
                    </strong>
                  </div>
                  <div className={styles.popupRow}>
                    <span>Dwell Pressure:</span>
                    <strong style={{ color: getPressureColor(r.pressure) }}>
                      {r.pressure}% ({r.pressureLevel})
                    </strong>
                  </div>
                  {r.hasIncentive && r.incentiveLabel && (
                    <div style={{ background: "var(--yellow-light)", border: "1px solid var(--yellow)", borderRadius: 4, padding: "4px 8px", marginTop: 4, fontSize: 11, fontWeight: 600, color: "var(--ink)" }}>
                      🎁 {r.incentiveLabel}
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
