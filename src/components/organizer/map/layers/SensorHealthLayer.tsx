"use client";
import React from "react";
import { Marker, Popup, CircleMarker } from "react-leaflet";
import type { DeviceDefinition } from "@/types";

interface Props {
  devices: DeviceDefinition[];
}

const HEALTH_COLOR: Record<string, string> = {
  HEALTHY: "#10B981",
  DEGRADED: "#F59E0B",
  UNHEALTHY: "#EF4444",
  OFFLINE: "#6B7280",
  MAINTENANCE: "#8B5CF6",
};

const DEVICE_ICON: Record<string, string> = {
  CCTV_CAMERA: "📹",
  PEDESTRIAN_COUNTER: "🚶",
  DENSITY_SENSOR: "📡",
  TURNSTILE_GATE: "🚪",
  BLUETOOTH_WIFI_BEACON: "📶",
  TRANSIT_OCCUPANCY_FEED: "🚆",
  ROAD_SPEED_SENSOR: "🚗",
  HOTEL_PMS_FEED: "🏨",
  RESTAURANT_POS_FEED: "🍽️",
  WEATHER_STATION: "🌤️",
  MANUAL_OPERATOR_TERMINAL: "👤",
};

export default function SensorHealthLayer({ devices }: Props) {
  return (
    <>
      {devices.map(device => {
        const color = HEALTH_COLOR[device.health.status] || "#6B7280";
        const icon = DEVICE_ICON[device.type] || "📡";
        const lat = device.location.latitude;
        const lng = device.location.longitude;

        return (
          <React.Fragment key={device.id}>
            {/* Coverage area circle */}
            {device.coverageAreaMeters && (
              <CircleMarker
                center={[lat, lng]}
                radius={Math.min(20, Math.max(6, device.coverageAreaMeters / 25))}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.08,
                  weight: 1,
                  dashArray: device.health.status === "HEALTHY" ? undefined : "4 4",
                }}
              />
            )}

            {/* Device marker */}
            <CircleMarker
              center={[lat, lng]}
              radius={5}
              pathOptions={{
                color: "#fff",
                fillColor: color,
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ minWidth: 180, fontFamily: "var(--font-display)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>{icon}</span>
                    <strong style={{ fontSize: 12 }}>{device.name}</strong>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 11 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#6b7280" }}>Status</span>
                      <span style={{ fontWeight: 700, color }}>{device.health.status}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#6b7280" }}>Type</span>
                      <span>{device.type.replace(/_/g, " ")}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#6b7280" }}>Zone</span>
                      <span>{device.zoneId.replace("ZONE_", "")}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#6b7280" }}>Accuracy</span>
                      <span>{Math.round(device.nominalAccuracy * 100)}%</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#6b7280" }}>Reliability</span>
                      <span>{Math.round(device.reliabilityScore * 100)}%</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#6b7280" }}>Sampling</span>
                      <span>{device.samplingIntervalSeconds}s</span>
                    </div>
                    {device.health.errorCountLastHour > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#EF4444" }}>
                        <span>Errors/hr</span>
                        <span style={{ fontWeight: 700 }}>{device.health.errorCountLastHour}</span>
                      </div>
                    )}
                    {device.isSimulated && (
                      <div style={{
                        marginTop: 4, fontSize: 9, fontWeight: 600, textTransform: "uppercase",
                        color: "#8B5CF6", letterSpacing: "0.05em",
                      }}>
                        ⚡ Simulated Device
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          </React.Fragment>
        );
      })}
    </>
  );
}
