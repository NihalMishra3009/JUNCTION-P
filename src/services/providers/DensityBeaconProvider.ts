// ============================================================
// JUNCTION - Density Sensor & Wi-Fi/Bluetooth Beacon Provider
// ============================================================

import {
  DeviceDefinition,
  DeviceType,
  MeasurementCapability,
  NormalizedObservation,
  QualityStatus,
} from "@/types";
import { SensorInputProvider, SimulationContext } from "./types";

export class DensityBeaconProvider implements SensorInputProvider {
  public readonly providerId = "DENSITY_BEACON_PROVIDER";
  public readonly supportedDeviceTypes: DeviceType[] = [
    "BLUETOOTH_WIFI_BEACON",
    "DENSITY_SENSOR",
  ];
  public readonly supportedCapabilities: MeasurementCapability[] = [
    "PERSON_COUNT",
    "DENSITY",
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

    const resourceLoad =
      device.resourceId && context.nodeLoads[device.resourceId] !== undefined
        ? context.nodeLoads[device.resourceId]
        : 500;

    // Radio probe capture rate (typically 80-85% of physical persons have detectable probes)
    const probeCaptureRatio = 0.85;
    const baseCount = Math.round(resourceLoad * probeCaptureRatio * (device.nominalAccuracy || 0.85));
    const finalCount = isConflicting ? Math.round(baseCount * 0.5) : baseCount;

    // 1. Crowd Count from probe signals
    observations.push({
      id: `OBS_BEACON_COUNT_${device.id}_${now.getTime()}`,
      sourceId: device.id,
      sourceProvider: device.provider || this.providerId,
      metricType: "CROWD_COUNT",
      zoneId: device.zoneId,
      resourceId: device.resourceId,
      observedAt: observedTimestamp,
      receivedAt: now.toISOString(),
      value: finalCount,
      unit: "detected_devices",
      confidence: isConflicting ? 0.35 : (device.reliabilityScore || 0.82),
      qualityStatus,
      derivationType: "SIMULATED",
      freshnessSeconds: isLagged ? 120 : 0,
      schemaVersion: "1.0.0",
      metadata: {
        probeCaptureRatio,
        radioTechnology: "BLE_WIFI_SNIFFER",
      },
    });

    // 2. Spatial Density estimation if coverage area is known
    if (device.coverageAreaMeters && device.coverageAreaMeters > 0) {
      const density = Number((finalCount / device.coverageAreaMeters).toFixed(2));
      observations.push({
        id: `OBS_BEACON_DENSITY_${device.id}_${now.getTime()}`,
        sourceId: device.id,
        sourceProvider: device.provider || this.providerId,
        metricType: "DENSITY",
        zoneId: device.zoneId,
        resourceId: device.resourceId,
        observedAt: observedTimestamp,
        receivedAt: now.toISOString(),
        value: density,
        unit: "devices_per_sqm",
        confidence: isConflicting ? 0.35 : (device.reliabilityScore || 0.82),
        qualityStatus,
        derivationType: "SIMULATED",
        freshnessSeconds: isLagged ? 120 : 0,
        schemaVersion: "1.0.0",
      });
    }

    return observations;
  }
}
