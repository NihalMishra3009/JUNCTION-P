// ============================================================
// JUNCTION - Normalized Observation & Provenance Contracts
// ============================================================

import { ConfidenceSource } from "./index";

export type DerivationType =
  | "MEASURED"
  | "ESTIMATED"
  | "FORECAST"
  | "SIMULATED"
  | "MANUAL_INPUT";

export type QualityStatus =
  | "FRESH"
  | "DELAYED"
  | "STALE"
  | "CONFLICTING"
  | "INVALID"
  | "INTERPOLATED";

export type ObservationMetricType =
  | "CROWD_COUNT"
  | "DENSITY"
  | "INFLOW_RATE"
  | "OUTFLOW_RATE"
  | "QUEUE_LENGTH"
  | "QUEUE_WAIT_TIME"
  | "DWELL_TIME"
  | "ROOM_OCCUPANCY"
  | "TABLE_OCCUPANCY"
  | "ROAD_SPEED"
  | "ROAD_CONGESTION"
  | "TRANSIT_LOAD";

export interface NormalizedObservation<T = number> {
  id: string;
  sourceId: string; // Device ID or external Provider ID
  sourceProvider: string;
  metricType: ObservationMetricType;
  zoneId: string;
  resourceId?: string;
  eventId?: string;
  observedAt: string; // ISO 8601
  receivedAt: string; // ISO 8601
  value: T;
  unit: string;
  confidence: number; // 0.0 - 1.0
  qualityStatus: QualityStatus;
  derivationType: DerivationType;
  freshnessSeconds: number;
  schemaVersion: string;
  metadata?: Record<string, unknown>;
}

export interface ObservationEnvelope {
  batchId: string;
  ingestedAt: string;
  observations: NormalizedObservation[];
  droppedCount: number;
  warnings?: string[];
}
