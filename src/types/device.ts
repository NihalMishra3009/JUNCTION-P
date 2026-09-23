// ============================================================
// JUNCTION - Hardware-Agnostic Device Contracts
// ============================================================

import { GeoLocation } from "./index";

export type DeviceType =
  | "PEDESTRIAN_COUNTER"
  | "CCTV_CAMERA"
  | "DENSITY_SENSOR"
  | "TURNSTILE_GATE"
  | "BLUETOOTH_WIFI_BEACON"
  | "TRANSIT_OCCUPANCY_FEED"
  | "ROAD_SPEED_SENSOR"
  | "HOTEL_PMS_FEED"
  | "RESTAURANT_POS_FEED"
  | "WEATHER_STATION"
  | "MANUAL_OPERATOR_TERMINAL";

export type DeviceHealthStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "UNHEALTHY"
  | "OFFLINE"
  | "MAINTENANCE";

export type MeasurementCapability =
  | "PERSON_COUNT"
  | "DENSITY"
  | "FLOW_RATE"
  | "DIRECTION"
  | "QUEUE_LENGTH"
  | "WAIT_TIME"
  | "SPEED"
  | "VEHICLE_COUNT"
  | "ROOM_AVAILABILITY"
  | "TABLE_AVAILABILITY"
  | "PRECIPITATION"
  | "TEMPERATURE";

export interface DeviceDefinition {
  id: string;
  name: string;
  type: DeviceType;
  provider: string;
  vendorModel?: string;
  zoneId: string;
  resourceId?: string;
  location: GeoLocation;
  coverageAreaMeters?: number;
  samplingIntervalSeconds: number;
  supportedCapabilities: MeasurementCapability[];
  nominalAccuracy: number; // 0.0 to 1.0 scale
  reliabilityScore: number; // 0.0 to 1.0 historical uptime/reliability weight
  health: DeviceHealth;
  calibrationOffset?: number;
  isSimulated: boolean;
}

export interface DeviceHealth {
  status: DeviceHealthStatus;
  lastSeenAt: string;
  batteryLevelPercent?: number;
  errorCountLastHour: number;
  firmwareVersion?: string;
  latencyMs?: number;
  lastErrorMessage?: string;
}

export interface DeviceRegistryFilter {
  zoneId?: string;
  type?: DeviceType;
  status?: DeviceHealthStatus;
  isSimulated?: boolean;
}
