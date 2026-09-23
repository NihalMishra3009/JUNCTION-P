// ============================================================
// JUNCTION - Synthetic Aggregate Computer Vision Provider (Step 7)
// ============================================================

import {
  AggregateCVObservation,
  CVCapabilityProfile,
  AnomalyType,
  FlowDirectionType,
  DeviceDefinition,
} from "@/types";

export interface SyntheticCVSimulationOptions {
  seed?: number;
  noiseLevel?: number; // 0.0 - 0.2 scale
  injectAnomaly?: AnomalyType;
  cameraHealth?: "ONLINE" | "DEGRADED" | "OCCLUDED" | "OFFLINE";
}

/**
 * Provider-neutral interface for Computer Vision observation sources.
 * Future real CV microservices (e.g. YOLO/ByteTrack REST services) will implement this exact interface.
 */
export interface CrowdObservationProvider {
  getCapabilities(): CVCapabilityProfile;
  generateObservation(
    device: DeviceDefinition,
    currentCrowdLoad: number,
    inflow: number,
    outflow: number,
    options?: SyntheticCVSimulationOptions
  ): AggregateCVObservation;
}

/**
 * Pseudo-random deterministic noise generator based on seed.
 */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * Synthetic Aggregate CV Provider for the JUNCTION MVP (ADR-010).
 * Produces realistic aggregate crowd dynamics without person-level identification or camera hardware dependencies.
 */
export class SyntheticAggregateCVProvider implements CrowdObservationProvider {
  private profile: CVCapabilityProfile = {
    supportedMetrics: [
      "PERSON_COUNT",
      "DENSITY",
      "FLOW_VECTORS",
      "QUEUE_ESTIMATION",
      "DWELL_TIME",
      "ANOMALY_DETECTION",
    ],
    frameRateFps: 15,
    fieldOfViewDescription: "Fixed wide-angle overhead concourse coverage",
    maxProcessingCapacityPersons: 10000,
    isSimulatedProvider: true,
  };

  public getCapabilities(): CVCapabilityProfile {
    return { ...this.profile };
  }

  public generateObservation(
    device: DeviceDefinition,
    currentCrowdLoad: number,
    inflow: number,
    outflow: number,
    options: SyntheticCVSimulationOptions = {}
  ): AggregateCVObservation {
    const seed = options.seed ?? Date.now();
    const noiseLevel = options.noiseLevel ?? 0.05;
    const noise = (pseudoRandom(seed) - 0.5) * 2 * noiseLevel;

    // Aggregate person count with device accuracy factor
    const countAccuracyFactor = device.nominalAccuracy * (1 + noise);
    const personCount = Math.max(0, Math.round(currentCrowdLoad * countAccuracyFactor));

    // Spatial density (people per m²) assuming device coverage area
    const coverageM2 = device.coverageAreaMeters ?? 150;
    const densityPeoplePerSqM = Number((personCount / coverageM2).toFixed(2));

    // Directional flow rates
    const inflowRatePerMin = Math.max(0, Math.round(inflow * (1 + noise * 0.5)));
    const outflowRatePerMin = Math.max(0, Math.round(outflow * (1 + noise * 0.5)));

    let dominantDirection: FlowDirectionType = "STATIONARY";
    if (inflowRatePerMin > outflowRatePerMin * 1.3) dominantDirection = "INBOUND";
    else if (outflowRatePerMin > inflowRatePerMin * 1.3) dominantDirection = "OUTBOUND";
    else if (inflowRatePerMin > 0 || outflowRatePerMin > 0) dominantDirection = "MIXED";

    // Queue length and dwell time heuristics
    const queueCongestion = Math.max(0, inflowRatePerMin - outflowRatePerMin);
    const queueLengthPersons = queueCongestion > 50 ? Math.round(queueCongestion * 0.8) : 0;
    const estimatedWaitMinutes = queueLengthPersons > 0 ? Number((queueLengthPersons / 80).toFixed(1)) : 0;
    const averageDwellMinutes = densityPeoplePerSqM > 2.0 ? Number((3.0 + densityPeoplePerSqM * 1.5).toFixed(1)) : 1.5;

    // Anomaly identification
    let detectedAnomaly: AnomalyType = options.injectAnomaly ?? "NONE";
    let anomalySeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";

    if (densityPeoplePerSqM >= 4.0) {
      detectedAnomaly = "OVERCROWDING_THRESHOLD";
      anomalySeverity = "CRITICAL";
    } else if (densityPeoplePerSqM >= 2.5) {
      detectedAnomaly = "RAPID_DENSITY_SURGE";
      anomalySeverity = "HIGH";
    } else if (queueLengthPersons > 300) {
      detectedAnomaly = "BOTTLENECK_FORMATION";
      anomalySeverity = "HIGH";
    }

    const cameraHealth = options.cameraHealth ?? (device.health.status === "HEALTHY" ? "ONLINE" : "DEGRADED");
    const confidenceScore = Number((device.reliabilityScore * (cameraHealth === "ONLINE" ? 0.95 : 0.65)).toFixed(2));

    return {
      id: `CV_OBS_${device.id}_${Date.now()}`,
      cameraId: device.id,
      cameraName: device.name,
      zoneId: device.zoneId,
      resourceId: device.resourceId,
      location: device.location,
      observedAt: new Date().toISOString(),
      personCount,
      densityPeoplePerSqM,
      inflowRatePerMin,
      outflowRatePerMin,
      dominantDirection,
      directionSpreadDegrees: dominantDirection === "MIXED" ? 65 : 20,
      queueLengthPersons,
      estimatedWaitMinutes,
      averageDwellMinutes,
      detectedAnomaly,
      anomalySeverity,
      confidenceScore,
      coverageQuality: cameraHealth === "ONLINE" ? 0.95 : 0.5,
      cameraHealth,
      derivationType: "SIMULATED",
      qualityStatus: cameraHealth === "ONLINE" ? "FRESH" : "DELAYED",
      modelIdentifier: "synthetic-aggregate-cv-v1",
      pipelineVersion: "1.0.0",
      inferenceLatencyMs: 12,
    };
  }
}

export const syntheticCVProvider = new SyntheticAggregateCVProvider();
