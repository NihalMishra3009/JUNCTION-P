// ============================================================
// JUNCTION - Input Provider Registry & Dispatcher
// ============================================================

import { DeviceDefinition, DeviceType, NormalizedObservation } from "@/types";
import { SensorInputProvider, SimulationContext } from "./types";
import { CctvCameraCvProvider } from "./CctvCameraCvProvider";
import { EntranceExitCounterProvider } from "./EntranceExitCounterProvider";
import { DensityBeaconProvider } from "./DensityBeaconProvider";

export class ProviderRegistry {
  private providers: Map<string, SensorInputProvider> = new Map();
  private typeToProviderMap: Map<DeviceType, SensorInputProvider> = new Map();

  constructor() {
    // Register default P0 providers
    this.register(new CctvCameraCvProvider());
    this.register(new EntranceExitCounterProvider());
    this.register(new DensityBeaconProvider());
  }

  /**
   * Registers a provider instance and binds its supported device types.
   */
  public register(provider: SensorInputProvider): void {
    this.providers.set(provider.providerId, provider);
    for (const type of provider.supportedDeviceTypes) {
      this.typeToProviderMap.set(type, provider);
    }
  }

  /**
   * Retrieves the provider registered for a specific DeviceType.
   */
  public getForDeviceType(type: DeviceType): SensorInputProvider | undefined {
    return this.typeToProviderMap.get(type);
  }

  /**
   * Generates observations for a single device using its matching provider.
   */
  public generateObservationsForDevice(
    device: DeviceDefinition,
    context: SimulationContext
  ): NormalizedObservation[] {
    const provider = this.typeToProviderMap.get(device.type);
    if (!provider) {
      // Fallback: Return basic mock observation if no specialized provider exists
      return [
        {
          id: `OBS_GENERIC_${device.id}_${Date.now()}`,
          sourceId: device.id,
          sourceProvider: device.provider,
          metricType: "CROWD_COUNT",
          zoneId: device.zoneId,
          resourceId: device.resourceId,
          observedAt: context.simulatedTime ?? new Date().toISOString(),
          receivedAt: new Date().toISOString(),
          value: device.resourceId && context.nodeLoads[device.resourceId] ? context.nodeLoads[device.resourceId] : 100,
          unit: "units",
          confidence: device.reliabilityScore || 0.8,
          qualityStatus: "FRESH",
          derivationType: "SIMULATED",
          freshnessSeconds: 0,
          schemaVersion: "1.0.0",
        },
      ];
    }

    return provider.generateObservations(device, context);
  }
}

export const providerRegistry = new ProviderRegistry();
