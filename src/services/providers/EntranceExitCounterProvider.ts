// ============================================================
// JUNCTION - Entrance & Exit Turnstile / Gate Counter Provider
// ============================================================

import {
  DeviceDefinition,
  DeviceType,
  MeasurementCapability,
  NormalizedObservation,
  QualityStatus,
} from "@/types";
import { SensorInputProvider, SimulationContext } from "./types";

export class EntranceExitCounterProvider implements SensorInputProvider {
  public readonly providerId = "ENTRANCE_EXIT_COUNTER_PROVIDER";
  public readonly supportedDeviceTypes: DeviceType[] = [
    "TURNSTILE_GATE",
    "PEDESTRIAN_COUNTER",
  ];
  public readonly supportedCapabilities: MeasurementCapability[] = [
    "PERSON_COUNT",
    "FLOW_RATE",
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

    const resourceLoad =
      device.resourceId && context.nodeLoads[device.resourceId] !== undefined
        ? context.nodeLoads[device.resourceId]
        : 500;

    // High accuracy mechanical/optical counter calculation
    const accuracy = device.nominalAccuracy || 0.98;
    const baseCount = Math.round(resourceLoad * 0.7 * accuracy);
    const finalCount = isConflicting ? Math.round(baseCount * 0.35) : baseCount;

    // 1. Person Count Observation
    observations.push({
      id: `OBS_GATE_COUNT_${device.id}_${now.getTime()}`,
      sourceId: device.id,
      sourceProvider: device.provider || this.providerId,
      metricType: "CROWD_COUNT",
      zoneId: device.zoneId,
      resourceId: device.resourceId,
      observedAt: observedTimestamp,
      receivedAt: now.toISOString(),
      value: finalCount,
      unit: "persons",
      confidence: isConflicting ? 0.4 : 0.98,
      qualityStatus,
      derivationType: "SIMULATED",
      freshnessSeconds: isLagged ? 120 : 0,
      schemaVersion: "1.0.0",
      metadata: {
        deviceType: device.type,
        counterAccuracy: accuracy,
      },
    });

    // 2. Outflow Rate Observation (Turnstiles capture immediate egress flow)
    const outflowRate = Math.max(0, Math.round(context.outflowRate * 0.3 * accuracy));
    observations.push({
      id: `OBS_GATE_OUTFLOW_${device.id}_${now.getTime()}`,
      sourceId: device.id,
      sourceProvider: device.provider || this.providerId,
      metricType: "OUTFLOW_RATE",
      zoneId: device.zoneId,
      resourceId: device.resourceId,
      observedAt: observedTimestamp,
      receivedAt: now.toISOString(),
      value: outflowRate,
      unit: "persons_per_min",
      confidence: isConflicting ? 0.4 : 0.95,
      qualityStatus,
      derivationType: "SIMULATED",
      freshnessSeconds: isLagged ? 120 : 0,
      schemaVersion: "1.0.0",
    });

    return observations;
  }
}
