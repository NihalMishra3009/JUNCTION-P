// ============================================================
// JUNCTION - Forecasting & Predictive Modeling Contracts
// ============================================================

import { PressureLevel, GeoLocation } from "./index";

export type ForecastHorizonMinutes = 15 | 30 | 45 | 60;

export interface ForecastPoint {
  label: string;
  minutesFromNow: number;
  projectedTime: string; // ISO 8601
  predictedPressure: number; // 0 - 100
  confidenceLow: number; // Lower confidence interval
  confidenceHigh: number; // Upper confidence interval
  predictedOccupancy?: number;
  predictedInflow?: number;
  predictedOutflow?: number;
  predictedQueueWaitMinutes?: number;
}

export interface ResourceForecast {
  resourceId: string;
  resourceName: string;
  zoneId: string;
  currentPressure: number;
  forecastPoints: ForecastPoint[];
  thresholdCrossing?: {
    level: PressureLevel;
    minutesFromNow: number;
    projectedTime: string;
  };
  contributingFactors: string[];
  algorithmUsed: "MOVING_AVERAGE" | "SCENARIO_CURVE" | "WEIGHTED_TREND" | "ML_INFERENCE";
  confidenceScore: number;
}

export interface HotspotPrediction {
  id: string;
  resourceId: string;
  zoneId: string;
  name: string;
  location: GeoLocation;
  currentPressure: number;
  peakPredictedPressure: number;
  severity: "WATCH" | "HIGH" | "CRITICAL";
  projectedOnsetMinutes: number;
  projectedDurationMinutes: number;
  radiusMeters: number;
  keyDrivers: string[];
  confidence: number;
}

export interface CascadeNodeProjection {
  nodeId: string;
  resourceId: string;
  label: string;
  currentPressure: number;
  projectedPressure: number;
  status: "NORMAL" | "WATCH" | "HIGH" | "CRITICAL";
  leadTimeMinutes: number;
  influenceWeight: number; // 0.0 - 1.0 link propagation weight
  mitigationAvailable: boolean;
}

export interface CascadeAnalysisResult {
  rootIncidentId: string;
  rootResourceId: string;
  timestamp: string;
  affectedPathways: CascadeNodeProjection[][];
  summary: string;
  confidence: number;
}
