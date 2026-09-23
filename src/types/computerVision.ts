// ============================================================
// JUNCTION - Computer Vision Capability & Observation Contracts
// ============================================================

import { GeoLocation } from "./index";
import { QualityStatus, DerivationType } from "./observation";

export type FlowDirectionType =
  | "INBOUND"
  | "OUTBOUND"
  | "CROSS_FLOW"
  | "STATIONARY"
  | "MIXED";

export type AnomalyType =
  | "RAPID_DENSITY_SURGE"
  | "FLOW_REVERSAL"
  | "OVERCROWDING_THRESHOLD"
  | "BOTTLENECK_FORMATION"
  | "PROLONGED_LOITERING"
  | "CAMERA_OCCLUSION"
  | "NONE";

export interface AggregateCVObservation {
  id: string;
  cameraId: string;
  cameraName?: string;
  zoneId: string;
  resourceId?: string;
  location: GeoLocation;
  observedAt: string; // ISO 8601
  
  // Aggregate Metrics (Strictly non-identifiable)
  personCount: number;
  densityPeoplePerSqM: number;
  inflowRatePerMin: number;
  outflowRatePerMin: number;
  dominantDirection: FlowDirectionType;
  directionSpreadDegrees?: number; // Variance in movement angles
  
  // Queue & Congestion Dynamics
  queueLengthPersons: number;
  estimatedWaitMinutes: number;
  averageDwellMinutes: number;
  
  // Safety & Anomaly Indicators
  detectedAnomaly: AnomalyType;
  anomalySeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  
  // Data Integrity & Quality
  confidenceScore: number; // 0.0 - 1.0
  coverageQuality: number; // 0.0 - 1.0 (FOV illumination, occlusion)
  cameraHealth: "ONLINE" | "DEGRADED" | "OCCLUDED" | "OFFLINE";
  derivationType: DerivationType;
  qualityStatus: QualityStatus;
  
  // Provenance & Versioning
  pipelineVersion?: string;
  modelIdentifier?: string; // e.g. "aggregate-cv-v1.0" or "synthetic-cv-generator"
  inferenceLatencyMs?: number;
}

export interface CVCapabilityProfile {
  supportedMetrics: Array<
    | "PERSON_COUNT"
    | "DENSITY"
    | "FLOW_VECTORS"
    | "QUEUE_ESTIMATION"
    | "DWELL_TIME"
    | "ANOMALY_DETECTION"
  >;
  frameRateFps: number;
  fieldOfViewDescription: string;
  maxProcessingCapacityPersons: number;
  isSimulatedProvider: boolean;
}
