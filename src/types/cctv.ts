// ============================================================
// JUNCTION - CCTV Multi-Feed Configuration & Telemetry Types
// ============================================================

export type CctvSourceType = "LIVE" | "REPLAY" | "SYNTHETIC";
export type CctvAnnotationType = "YOLO_BYTETRACK" | "RAW_FOOTAGE" | "SYNTHETIC_BENCHMARK";

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
}
