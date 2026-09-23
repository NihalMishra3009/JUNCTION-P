// ============================================================
// JUNCTION - Simulated Hardware & Sensor Stream Generator (Steps 5 & 6)
// ============================================================

import {
  DeviceDefinition,
  NormalizedObservation,
  ScenarioId,
  QualityStatus,
  ObservationMetricType,
} from "@/types";
import { deviceRegistry } from "./deviceRegistry";
import { syntheticCVProvider } from "./syntheticCVProvider";

export interface HardwareSimulationConfig {
  scenarioId: ScenarioId;
  seed: number;
  noiseLevel: number; // 0.0 to 0.2
  injectOutagesForDeviceIds?: string[];
  injectLagForDeviceIds?: string[];
  injectConflictForDeviceIds?: string[];
}

export class SensorStreamSimulator {
  private config: HardwareSimulationConfig;

  constructor(config?: Partial<HardwareSimulationConfig>) {
    this.config = {
      scenarioId: config?.scenarioId ?? "NORMAL",
      seed: config?.seed ?? 42,
      noiseLevel: config?.noiseLevel ?? 0.05,
      injectOutagesForDeviceIds: config?.injectOutagesForDeviceIds ?? [],
      injectLagForDeviceIds: config?.injectLagForDeviceIds ?? [],
      injectConflictForDeviceIds: config?.injectConflictForDeviceIds ?? [],
    };
  }

  public setConfig(update: Partial<HardwareSimulationConfig>): void {
    this.config = { ...this.config, ...update };
  }

  /**
   * Initializes canonical devices into the DeviceRegistry for the simulation.
   */
  public initializeDefaultDevices(): void {
    const defaultDevices: DeviceDefinition[] = [
      {
        id: "DEV_CCTV_WANKHEDE_01",
        name: "Wankhede Concourse North CCTV",
        type: "CCTV_CAMERA",
        provider: "JUNCTION_SYNTHETIC_CCTV",
        zoneId: "ZONE_WANKHEDE",
        resourceId: "WANKHEDE",
        location: { latitude: 18.9389, longitude: 72.8258 },
        coverageAreaMeters: 400,
        samplingIntervalSeconds: 5,
        supportedCapabilities: ["PERSON_COUNT", "DENSITY", "FLOW_RATE", "QUEUE_LENGTH"],
        nominalAccuracy: 0.94,
        reliabilityScore: 0.96,
        health: { status: "HEALTHY", lastSeenAt: new Date().toISOString(), errorCountLastHour: 0 },
        isSimulated: true,
      },
      {
        id: "DEV_TURNSTILE_WANKHEDE_G1",
        name: "Wankhede Gate 1 Turnstiles",
        type: "TURNSTILE_GATE",
        provider: "VENUE_ACCESS_SYS",
        zoneId: "ZONE_WANKHEDE",
        resourceId: "WANKHEDE_EXIT",
        location: { latitude: 18.9385, longitude: 72.8252 },
        coverageAreaMeters: 50,
        samplingIntervalSeconds: 2,
        supportedCapabilities: ["PERSON_COUNT", "FLOW_RATE"],
        nominalAccuracy: 0.99,
        reliabilityScore: 0.98,
        health: { status: "HEALTHY", lastSeenAt: new Date().toISOString(), errorCountLastHour: 0 },
        isSimulated: true,
      },
      {
        id: "DEV_CCTV_CHURCHGATE_CONCOURSE",
        name: "Churchgate Subsurface Concourse Cam",
        type: "CCTV_CAMERA",
        provider: "RAILWAY_SECURITY_CV",
        zoneId: "ZONE_CHURCHGATE",
        resourceId: "CHURCHGATE",
        location: { latitude: 18.9355, longitude: 72.8272 },
        coverageAreaMeters: 300,
        samplingIntervalSeconds: 5,
        supportedCapabilities: ["PERSON_COUNT", "DENSITY", "QUEUE_LENGTH"],
        nominalAccuracy: 0.91,
        reliabilityScore: 0.92,
        health: { status: "HEALTHY", lastSeenAt: new Date().toISOString(), errorCountLastHour: 0 },
        isSimulated: true,
      },
      {
        id: "DEV_WIFI_CHURCHGATE_HUB",
        name: "Churchgate Station Wi-Fi Sniffer",
        type: "BLUETOOTH_WIFI_BEACON",
        provider: "MUMBAI_TELCO_PROBE",
        zoneId: "ZONE_CHURCHGATE",
        resourceId: "CHURCHGATE",
        location: { latitude: 18.9358, longitude: 72.8270 },
        coverageAreaMeters: 500,
        samplingIntervalSeconds: 15,
        supportedCapabilities: ["PERSON_COUNT", "DENSITY"],
        nominalAccuracy: 0.82,
        reliabilityScore: 0.88,
        health: { status: "HEALTHY", lastSeenAt: new Date().toISOString(), errorCountLastHour: 0 },
        isSimulated: true,
      },
      {
        id: "DEV_TAXI_BAY_CAMERA",
        name: "Taxi Staging Bay Automated Counter",
        type: "CCTV_CAMERA",
        provider: "TRAFFIC_POLICE_STREAM",
        zoneId: "ZONE_TAXI_STAGING",
        resourceId: "TAXI_ZONE",
        location: { latitude: 18.9372, longitude: 72.8268 },
        coverageAreaMeters: 180,
        samplingIntervalSeconds: 10,
        supportedCapabilities: ["QUEUE_LENGTH", "WAIT_TIME", "VEHICLE_COUNT"],
        nominalAccuracy: 0.89,
        reliabilityScore: 0.90,
        health: { status: "HEALTHY", lastSeenAt: new Date().toISOString(), errorCountLastHour: 0 },
        isSimulated: true,
      },
      {
        id: "DEV_CCTV_CSMT_NORTH",
        name: "CSMT Main Hall Overhead Cam",
        type: "CCTV_CAMERA",
        provider: "CENTRAL_RAIL_SECURITY",
        zoneId: "ZONE_CSMT",
        resourceId: "CSMT",
        location: { latitude: 18.9400, longitude: 72.8353 },
        coverageAreaMeters: 450,
        samplingIntervalSeconds: 5,
        supportedCapabilities: ["PERSON_COUNT", "DENSITY", "FLOW_RATE"],
        nominalAccuracy: 0.93,
        reliabilityScore: 0.95,
        health: { status: "HEALTHY", lastSeenAt: new Date().toISOString(), errorCountLastHour: 0 },
        isSimulated: true,
      },
    ];

    deviceRegistry.registerMany(defaultDevices);
  }

  /**
   * Generates a batch of normalized observations for all registered devices
   * driven deterministically by zone crowd load, egress rates, and scenario failure injection.
   */
  public generateObservationsForState(
    nodeLoads: Record<string, number>,
    outflowRate: number
  ): NormalizedObservation[] {
    const devices = deviceRegistry.getAll();
    const observations: NormalizedObservation[] = [];
    const now = new Date();

    for (const device of devices) {
      // 1. Simulate Outage
      if (this.config.injectOutagesForDeviceIds?.includes(device.id)) {
        deviceRegistry.setHealth(device.id, {
          status: "OFFLINE",
          lastErrorMessage: "Simulated hardware link timeout",
        });
        continue; // No observations emitted while offline
      }

      // Check if device was degraded or healthy
      const isLagged = this.config.injectLagForDeviceIds?.includes(device.id);
      const isConflicting = this.config.injectConflictForDeviceIds?.includes(device.id);

      const observedTimestamp = isLagged
        ? new Date(now.getTime() - 120_000).toISOString() // 2 minutes stale
        : now.toISOString();

      let qualityStatus: QualityStatus = "FRESH";
      if (isLagged) qualityStatus = "STALE";
      if (isConflicting) qualityStatus = "CONFLICTING";

      const resourceLoad = (device.resourceId && nodeLoads[device.resourceId]) ? nodeLoads[device.resourceId] : 500;

      // Handle CCTV via synthetic CV provider
      if (device.type === "CCTV_CAMERA") {
        const cvObs = syntheticCVProvider.generateObservation(
          device,
          resourceLoad,
          Math.round(outflowRate * 0.4),
          Math.round(outflowRate * 0.35),
          { seed: this.config.seed + observations.length }
        );

        // Person count observation
        observations.push({
          id: `OBS_COUNT_${device.id}_${now.getTime()}`,
          sourceId: device.id,
          sourceProvider: device.provider,
          metricType: "CROWD_COUNT",
          zoneId: device.zoneId,
          resourceId: device.resourceId,
          observedAt: observedTimestamp,
          receivedAt: now.toISOString(),
          value: isConflicting ? Math.round(cvObs.personCount * 0.4) : cvObs.personCount,
          unit: "persons",
          confidence: isConflicting ? 0.45 : cvObs.confidenceScore,
          qualityStatus,
          derivationType: "SIMULATED",
          freshnessSeconds: isLagged ? 120 : 0,
          schemaVersion: "1.0.0",
          metadata: {
            density: cvObs.densityPeoplePerSqM,
            dominantDirection: cvObs.dominantDirection,
            anomaly: cvObs.detectedAnomaly,
          },
        });

        // Queue length observation if camera supports it
        if (cvObs.queueLengthPersons > 0) {
          observations.push({
            id: `OBS_QUEUE_${device.id}_${now.getTime()}`,
            sourceId: device.id,
            sourceProvider: device.provider,
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
          });
        }
      } else if (device.type === "TURNSTILE_GATE") {
        // High accuracy physical counter
        const count = Math.round(resourceLoad * 0.7);
        observations.push({
          id: `OBS_GATE_${device.id}_${now.getTime()}`,
          sourceId: device.id,
          sourceProvider: device.provider,
          metricType: "CROWD_COUNT",
          zoneId: device.zoneId,
          resourceId: device.resourceId,
          observedAt: observedTimestamp,
          receivedAt: now.toISOString(),
          value: count,
          unit: "persons",
          confidence: 0.98,
          qualityStatus,
          derivationType: "SIMULATED",
          freshnessSeconds: isLagged ? 120 : 0,
          schemaVersion: "1.0.0",
        });
      } else if (device.type === "BLUETOOTH_WIFI_BEACON") {
        // Lower confidence wireless sniffer
        const count = Math.round(resourceLoad * 0.85);
        observations.push({
          id: `OBS_WIFI_${device.id}_${now.getTime()}`,
          sourceId: device.id,
          sourceProvider: device.provider,
          metricType: "CROWD_COUNT",
          zoneId: device.zoneId,
          resourceId: device.resourceId,
          observedAt: observedTimestamp,
          receivedAt: now.toISOString(),
          value: count,
          unit: "detected_devices",
          confidence: 0.82,
          qualityStatus,
          derivationType: "SIMULATED",
          freshnessSeconds: isLagged ? 120 : 0,
          schemaVersion: "1.0.0",
        });
      }

      deviceRegistry.markSeen(device.id, now.toISOString(), 15);
    }

    return observations;
  }
}

export const sensorStreamSimulator = new SensorStreamSimulator();
