"use client";
import React from "react";
import { Polyline, Tooltip, Popup } from "react-leaflet";
import { RoadEdge } from "@/types";
import { getPressureColor } from "@/components/ui/PressureIndicator";
import styles from "../../DestinationMap.module.css";

interface Props {
  roads: RoadEdge[];
}

export default function RoadLayer({ roads }: Props) {
  return (
    <>
      {roads.map(road => {
        const positions = road.geometry.map(g => [g.latitude, g.longitude] as [number, number]);
        const color = getPressureColor(road.congestion);
        const isDisrupted = road.status === "DISRUPTED";

        return (
          <React.Fragment key={road.id}>
            {/* Outline / Casing */}
            <Polyline
              positions={positions}
              pathOptions={{
                color: "#111111",
                weight: 8,
                opacity: 0.35,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            {/* Core Congestion Line */}
            <Polyline
              positions={positions}
              pathOptions={{
                color,
                weight: 5,
                opacity: 0.95,
                dashArray: isDisrupted ? "8, 6" : undefined,
                lineCap: "round",
                lineJoin: "round",
              }}
            >
              <Tooltip sticky>
                <div style={{ fontSize: 11, fontFamily: "Inter", fontWeight: 600 }}>
                  <div>{road.name}</div>
                  <div style={{ color, marginTop: 2 }}>
                    Congestion: {road.congestion}% · Est: {road.travelTimeMin} min
                  </div>
                </div>
              </Tooltip>
              <Popup className={styles.customPopup}>
                <div className={styles.popupContent}>
                  <div className={styles.popupHeader}>
                    <span className={styles.popupType}>TRANSIT CORRIDOR</span>
                    <h4 className={styles.popupTitle}>{road.name}</h4>
                  </div>
                  <div className={styles.popupBody}>
                    <div className={styles.popupRow}>
                      <span>Congestion Load:</span>
                      <strong style={{ color }}>{road.congestion}% ({road.status})</strong>
                    </div>
                    <div className={styles.popupRow}>
                      <span>Est. Corridor Time:</span>
                      <strong>~{road.travelTimeMin} min</strong>
                    </div>
                    {road.distanceKm && (
                      <div className={styles.popupRow}>
                        <span>Length:</span>
                        <span>{road.distanceKm} km</span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Polyline>
          </React.Fragment>
        );
      })}
    </>
  );
}
