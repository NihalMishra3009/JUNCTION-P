// ============================================================
// JUNCTION - Simulated Hardware & Sensor Stream Generator (Steps 5 & 6)
// ============================================================

import {
  DeviceDefinition,
  NormalizedObservation,
  ScenarioId,
} from "@/types";
import { deviceRegistry } from "./deviceRegistry";
import { providerRegistry } from "./providers/providerRegistry";
import { SimulationContext } from "./providers/types";

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

  public getConfig(): HardwareSimulationConfig {
    return { ...this.config };
  }

  /**
   * Initializes canonical devices into the DeviceRegistry for the simulation.
   */
  public initializeDefaultDevices(): void {
    const defaultDevices: DeviceDefinition[] = [
      // Zone 1: Wankhede
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
      // Zone 2: Churchgate
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
        supportedCapabilities: ["PERSON_COUNT", "DENSITY", "QUEUE_LENGTH", "FLOW_RATE"],
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
      // Zone 3: Taxi Staging Bay
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
        supportedCapabilities: ["QUEUE_LENGTH", "WAIT_TIME", "PERSON_COUNT", "DENSITY"],
        nominalAccuracy: 0.89,
        reliabilityScore: 0.90,
        health: { status: "HEALTHY", lastSeenAt: new Date().toISOString(), errorCountLastHour: 0 },
        isSimulated: true,
      },
      // Zone 4: Marine Lines
      {
        id: "DEV_CCTV_MARINE_LINES_PLATFORM",
        name: "Marine Lines Platform Concourse Cam",
        type: "CCTV_CAMERA",
        provider: "WESTERN_RAIL_SECURITY",
        zoneId: "ZONE_MARINE_LINES",
        resourceId: "MARINE_LINES",
        location: { latitude: 18.9436, longitude: 72.8236 },
        coverageAreaMeters: 250,
        samplingIntervalSeconds: 5,
        supportedCapabilities: ["PERSON_COUNT", "DENSITY", "FLOW_RATE"],
        nominalAccuracy: 0.90,
        reliabilityScore: 0.91,
        health: { status: "HEALTHY", lastSeenAt: new Date().toISOString(), errorCountLastHour: 0 },
        isSimulated: true,
      },
      // Zone 5: CSMT
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
      // Zone 6: South Hospitality / Nariman Point
      {
        id: "DEV_BEACON_HOTELS_SOUTH",
        name: "Nariman Point Pedestrian Footfall Beacon",
        type: "BLUETOOTH_WIFI_BEACON",
        provider: "BMC_SMART_CITY",
        zoneId: "ZONE_HOTELS_SOUTH",
        location: { latitude: 18.9280, longitude: 72.8230 },
        coverageAreaMeters: 600,
        samplingIntervalSeconds: 15,
        supportedCapabilities: ["PERSON_COUNT", "DENSITY"],
        nominalAccuracy: 0.85,
        reliabilityScore: 0.89,
        health: { status: "HEALTHY", lastSeenAt: new Date().toISOString(), errorCountLastHour: 0 },
        isSimulated: true,
      },
    ];

    deviceRegistry.registerMany(defaultDevices);
  }

  /**
   * Generates a batch of normalized observations for all registered devices
   * driven deterministically by zone crowd load, egress rates, and scenario failure injection.
   * Delegates observation generation to modular SensorInputProvider instances.
   */
  public generateObservationsForState(
    nodeLoads: Record<string, number>,
    outflowRate: number
  ): NormalizedObservation[] {
    const devices = deviceRegistry.getAll();
    const observations: NormalizedObservation[] = [];
    const now = new Date();

    const context: SimulationContext = {
      simulatedTime: now.toISOString(),
      scenarioId: this.config.scenarioId,
      nodeLoads,
      outflowRate,
      noiseLevel: this.config.noiseLevel,
      seed: this.config.seed,
      faultInjections: {
        outageDeviceIds: this.config.injectOutagesForDeviceIds,
        lagDeviceIds: this.config.injectLagForDeviceIds,
        conflictDeviceIds: this.config.injectConflictForDeviceIds,
      },
    };

    for (const device of devices) {
      // 1. Simulate Outage
      if (this.config.injectOutagesForDeviceIds?.includes(device.id)) {
        deviceRegistry.setHealth(device.id, {
          status: "OFFLINE",
          lastErrorMessage: "Simulated hardware link timeout",
        });
        continue; // No observations emitted while offline
      }

      // 2. Delegate observation generation to modular ProviderRegistry
      const deviceObs = providerRegistry.generateObservationsForDevice(device, context);
      observations.push(...deviceObs);

      deviceRegistry.markSeen(device.id, now.toISOString(), 15);
    }

    return observations;
  }
}

export const sensorStreamSimulator = new SensorStreamSimulator();
