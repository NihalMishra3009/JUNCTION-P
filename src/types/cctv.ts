// ============================================================
// JUNCTION - CCTV Multi-Feed Configuration & Telemetry Types
// ============================================================

export type CctvSourceType = "LIVE" | "REPLAY" | "RECORDED" | "SYNTHETIC";
export type CctvAnnotationType = "YOLO_BYTETRACK" | "RAW_FOOTAGE" | "SYNTHETIC_BENCHMARK" | "CLIENT_CV_OVERLAY";
export type CctvOrientation = "LANDSCAPE" | "PORTRAIT" | "ULTRAWIDE";

export interface CctvFeedConfig {
  id: string;
  name: string;
  videoSrc: string;
  annotatedVideoSrc?: string;
  cameraId: string;
  zoneId: string;
  zoneName: string;
  sourceType: CctvSourceType;
  annotationType: CctvAnnotationType;
  resolution: string;
  fps: number;
  description: string;
  defaultTripwireY?: number;
  calibratedAreaSqM?: number;
  orientation?: CctvOrientation;
  aspectRatio?: string;
  durationSeconds?: number;
  hasAudio?: boolean;
  isRecorded?: boolean;
  detectionStatus?: "ACTIVE" | "STANDBY" | "PROCESSING" | "OFFLINE";
}

export interface BoundingBoxNormalized {
  x: number; // 0.0 to 1.0 (left)
  y: number; // 0.0 to 1.0 (top)
  width: number; // 0.0 to 1.0
  height: number; // 0.0 to 1.0
  pixelX1?: number;
  pixelY1?: number;
  pixelX2?: number;
  pixelY2?: number;
}

export interface CentroidNormalized {
  x: number; // 0.0 to 1.0
  y: number; // 0.0 to 1.0
  pixelX?: number;
  pixelY?: number;
}

export interface TrackPoint {
  x: number; // 0.0 to 1.0
  y: number; // 0.0 to 1.0
}

export interface DetectionItem {
  trackId: number;
  classId: number; // 0 for person
  className: string; // "person"
  confidence: number;
  bbox: BoundingBoxNormalized;
  centroid: CentroidNormalized;
  trail?: TrackPoint[]; // Recent normalized points for subtle trajectory trail
}

export interface CctvFrameTelemetry {
  cameraId: string;
  sourceProvider: "JUNCTION_VIDEO_CV";
  videoTimestamp?: number; // elapsed seconds in video
  frameNumber: number;
  frameWidth: number;
  frameHeight: number;
  personCount: number;
  activeTracksCount: number;
  meanConfidence: number;
  inflow?: number;
  outflow?: number;
  tripwireY?: number;
  tripwireNormalizedY?: number;
  detections: DetectionItem[];
  receivedAt?: string;
  fps?: number;
}
