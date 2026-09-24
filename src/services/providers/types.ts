// ============================================================
// JUNCTION - Reusable Sensor Input Provider Contracts
// ============================================================

import {
  DeviceDefinition,
  DeviceType,
  MeasurementCapability,
  NormalizedObservation,
  ScenarioId,
} from "@/types";

export interface SimulationContext {
  simulatedTime?: string;
  minutesElapsed?: number;
  scenarioId?: ScenarioId;
  nodeLoads: Record<string, number>;
  outflowRate: number;
  noiseLevel?: number;
  seed?: number;
  faultInjections?: {
    outageDeviceIds?: string[];
    lagDeviceIds?: string[];
    conflictDeviceIds?: string[];
  };
}

/**
 * Hardware-agnostic provider contract.
 * Reusable across multiple devices of supported types.
 */
export interface SensorInputProvider {
  readonly providerId: string;
  readonly supportedDeviceTypes: DeviceType[];
  readonly supportedCapabilities: MeasurementCapability[];

  /**
   * Generates or retrieves normalized observations for a specific device.
   */
  generateObservations(
    device: DeviceDefinition,
    context: SimulationContext
  ): NormalizedObservation[];
}
