// ============================================================
// JUNCTION - CCTV & Aggregate Computer Vision Provider
// ============================================================

import {
  DeviceDefinition,
  DeviceType,
  MeasurementCapability,
  NormalizedObservation,
  QualityStatus,
} from "@/types";
import { SensorInputProvider, SimulationContext } from "./types";
import { syntheticCVProvider } from "../syntheticCVProvider";

export class CctvCameraCvProvider implements SensorInputProvider {
  public readonly providerId = "CCTV_CV_PROVIDER";
  public readonly supportedDeviceTypes: DeviceType[] = ["CCTV_CAMERA"];
  public readonly supportedCapabilities: MeasurementCapability[] = [
    "PERSON_COUNT",
    "DENSITY",
    "FLOW_RATE",
    "DIRECTION",
    "QUEUE_LENGTH",
    "WAIT_TIME",
  ];

  public generateObservations(
    device: DeviceDefinition,
    context: SimulationContext
  ): NormalizedObservation[] {
    const observations: NormalizedObservation[] = [];
    const now = new Date();

    const isLagged = context.faultInjections?.lagDeviceIds?.includes(device.id);
    const isConflicting = context.faultInjections?.conflictDeviceIds?.includes(device.id);

    const observedTimestamp = isLagged
      ? new Date(now.getTime() - 120_000).toISOString()
      : context.simulatedTime ?? now.toISOString();

    let qualityStatus: QualityStatus = "FRESH";
    if (isLagged) qualityStatus = "STALE";
    if (isConflicting) qualityStatus = "CONFLICTING";

    let resourceLoad = 500;
    if (device.resourceId && context.nodeLoads[device.resourceId] !== undefined) {
      resourceLoad = context.nodeLoads[device.resourceId];
    } else if (device.resourceId === "WANKHEDE") {
      resourceLoad = Math.max(
        context.nodeLoads["WANKHEDE_EXIT"] ? context.nodeLoads["WANKHEDE_EXIT"] * 3 : 0,
        Math.round(context.outflowRate * 2.0)
      );
    }

    const seed = (context.seed ?? 42) + Math.floor(now.getTime() / 1000);

    // Generate aggregate computer vision observation using synthetic CV engine
    const cvObs = syntheticCVProvider.generateObservation(
      device,
      resourceLoad,
      Math.round(context.outflowRate * 0.4),
      Math.round(context.outflowRate * 0.35),
      {
        seed,
        noiseLevel: context.noiseLevel ?? 0.05,
      }
    );

    // 1. Person Count Observation
    const countValue = isConflicting
      ? Math.round(cvObs.personCount * 0.4)
      : cvObs.personCount;

    observations.push({
      id: `OBS_COUNT_${device.id}_${now.getTime()}`,
      sourceId: device.id,
      sourceProvider: device.provider || this.providerId,
      metricType: "CROWD_COUNT",
      zoneId: device.zoneId,
      resourceId: device.resourceId,
      observedAt: observedTimestamp,
      receivedAt: now.toISOString(),
      value: countValue,
      unit: "persons",
      confidence: isConflicting ? 0.45 : cvObs.confidenceScore,
      qualityStatus,
      derivationType: "SIMULATED",
      freshnessSeconds: isLagged ? 120 : 0,
      schemaVersion: "1.0.0",
      metadata: {
        densityPeoplePerSqM: cvObs.densityPeoplePerSqM,
        dominantDirection: cvObs.dominantDirection,
        detectedAnomaly: cvObs.detectedAnomaly,
        anomalySeverity: cvObs.anomalySeverity,
        cameraHealth: cvObs.cameraHealth,
      },
    });

    // 2. Spatial Density Observation
    if (device.supportedCapabilities.includes("DENSITY")) {
      observations.push({
        id: `OBS_DENSITY_${device.id}_${now.getTime()}`,
        sourceId: device.id,
        sourceProvider: device.provider || this.providerId,
        metricType: "DENSITY",
        zoneId: device.zoneId,
        resourceId: device.resourceId,
        observedAt: observedTimestamp,
        receivedAt: now.toISOString(),
        value: cvObs.densityPeoplePerSqM,
        unit: "people_per_sqm",
        confidence: cvObs.confidenceScore,
        qualityStatus,
        derivationType: "SIMULATED",
        freshnessSeconds: isLagged ? 120 : 0,
        schemaVersion: "1.0.0",
      });
    }

    // 3. Queue Length Observation (if queue detected or supported)
    if (
      device.supportedCapabilities.includes("QUEUE_LENGTH") &&
      cvObs.queueLengthPersons > 0
    ) {
      observations.push({
        id: `OBS_QUEUE_${device.id}_${now.getTime()}`,
        sourceId: device.id,
        sourceProvider: device.provider || this.providerId,
        metricType: "QUEUE_LENGTH",
        zoneId: device.zoneId,
        resourceId: device.resourceId,
        observedAt: observedTimestamp,
        receivedAt: now.toISOString(),
        value: cvObs.queueLengthPersons,
        unit: "persons",
        confidence: cvObs.confidenceScore,
        qualityStatus,
        derivationType: "SIMULATED",
        freshnessSeconds: isLagged ? 120 : 0,
        schemaVersion: "1.0.0",
        metadata: {
          estimatedWaitMinutes: cvObs.estimatedWaitMinutes,
        },
      });
    }

    // 4. Inflow Rate Observation — always emit when FLOW_RATE supported (show 0, not blank)
    if (device.supportedCapabilities.includes("FLOW_RATE")) {
      observations.push({
        id: `OBS_INFLOW_${device.id}_${now.getTime()}`,
        sourceId: device.id,
        sourceProvider: device.provider || this.providerId,
        metricType: "INFLOW_RATE",
        zoneId: device.zoneId,
        resourceId: device.resourceId,
        observedAt: observedTimestamp,
        receivedAt: now.toISOString(),
        value: cvObs.inflowRatePerMin,
        unit: "persons_per_min",
        confidence: cvObs.confidenceScore,
        qualityStatus,
        derivationType: "SIMULATED",
        freshnessSeconds: isLagged ? 120 : 0,
        schemaVersion: "1.0.0",
      });

      // 5. Outflow Rate Observation — was missing, added here
      observations.push({
        id: `OBS_OUTFLOW_${device.id}_${now.getTime()}`,
        sourceId: device.id,
        sourceProvider: device.provider || this.providerId,
        metricType: "OUTFLOW_RATE",
        zoneId: device.zoneId,
        resourceId: device.resourceId,
        observedAt: observedTimestamp,
        receivedAt: now.toISOString(),
        value: cvObs.outflowRatePerMin,
        unit: "persons_per_min",
        confidence: cvObs.confidenceScore,
        qualityStatus,
        derivationType: "SIMULATED",
        freshnessSeconds: isLagged ? 120 : 0,
        schemaVersion: "1.0.0",
      });
    }

    return observations;
  }
}
