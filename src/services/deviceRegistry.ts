// ============================================================
// JUNCTION - Runtime Device Registry (Step 4)
// ============================================================

import {
  DeviceDefinition,
  DeviceHealth,
  DeviceHealthStatus,
  DeviceType,
  DeviceRegistryFilter,
} from "@/types";

/**
 * In-memory runtime Device Registry.
 *
 * Provides deterministic registration, lookup, health state updates, and lifecycle
 * management for both physical sensors (future live feeds) and synthetic devices (MVP simulation).
 *
 * Downstream services (sensor simulation, fusion, observation pipelines) query this registry
 * in a completely hardware-agnostic manner.
 */
export class DeviceRegistry {
  private devices: Map<string, DeviceDefinition> = new Map();

  /**
   * Registers a new device or updates an existing one if already present.
   * Ensures data integrity and validation of critical identifier attributes.
   */
  public register(device: DeviceDefinition): void {
    if (!device.id || typeof device.id !== "string" || device.id.trim() === "") {
      throw new Error("Device registration rejected: device.id must be a non-empty string.");
    }
    if (!device.zoneId || typeof device.zoneId !== "string" || device.zoneId.trim() === "") {
      throw new Error(`Device registration rejected for ${device.id}: zoneId must be specified.`);
    }

    // Defensive clone to avoid external mutation
    this.devices.set(device.id, {
      ...device,
      supportedCapabilities: [...device.supportedCapabilities],
      health: { ...device.health },
    });
  }

  /**
   * Batch registration of multiple devices.
   */
  public registerMany(devices: DeviceDefinition[]): void {
    for (const d of devices) {
      this.register(d);
    }
  }

  /**
   * Retrieves a device by its unique ID.
   */
  public get(deviceId: string): DeviceDefinition | undefined {
    const device = this.devices.get(deviceId);
    if (!device) return undefined;
    return {
      ...device,
      supportedCapabilities: [...device.supportedCapabilities],
      health: { ...device.health },
    };
  }

  /**
   * Checks whether a device with the given ID exists in the registry.
   */
  public has(deviceId: string): boolean {
    return this.devices.has(deviceId);
  }

  /**
   * Returns all registered devices.
   */
  public getAll(): DeviceDefinition[] {
    return Array.from(this.devices.values()).map(d => ({
      ...d,
      supportedCapabilities: [...d.supportedCapabilities],
      health: { ...d.health },
    }));
  }

  /**
   * Retrieves all devices associated with a specific operational zone.
   */
  public getByZone(zoneId: string): DeviceDefinition[] {
    return this.getAll().filter(d => d.zoneId === zoneId);
  }

  /**
   * Retrieves all devices associated with a specific destination resource.
   */
  public getByResource(resourceId: string): DeviceDefinition[] {
    return this.getAll().filter(d => d.resourceId === resourceId);
  }

  /**
   * Retrieves all devices matching a specific hardware or sensor type.
   */
  public getByType(type: DeviceType): DeviceDefinition[] {
    return this.getAll().filter(d => d.type === type);
  }

  /**
   * Retrieves all devices matching a specific operational health status.
   */
  public getByHealth(status: DeviceHealthStatus): DeviceDefinition[] {
    return this.getAll().filter(d => d.health.status === status);
  }

  /**
   * Advanced query filter supporting zone, type, status, and physical/simulated flags.
   */
  public query(filter: DeviceRegistryFilter): DeviceDefinition[] {
    return this.getAll().filter(d => {
      if (filter.zoneId && d.zoneId !== filter.zoneId) return false;
      if (filter.type && d.type !== filter.type) return false;
      if (filter.status && d.health.status !== filter.status) return false;
      if (filter.isSimulated !== undefined && d.isSimulated !== filter.isSimulated) return false;
      return true;
    });
  }

  /**
   * Updates mutable device fields (metadata, location, reliability, calibration).
   */
  public update(deviceId: string, patch: Partial<Omit<DeviceDefinition, "id">>): boolean {
    const existing = this.devices.get(deviceId);
    if (!existing) return false;

    const updated: DeviceDefinition = {
      ...existing,
      ...patch,
      id: existing.id, // Immutable ID
      supportedCapabilities: patch.supportedCapabilities
        ? [...patch.supportedCapabilities]
        : [...existing.supportedCapabilities],
      health: patch.health
        ? { ...existing.health, ...patch.health }
        : { ...existing.health },
    };

    this.devices.set(deviceId, updated);
    return true;
  }

  /**
   * Updates only the health status and diagnostics of a device.
   */
  public setHealth(deviceId: string, healthPatch: Partial<DeviceHealth> & { status: DeviceHealthStatus }): boolean {
    const existing = this.devices.get(deviceId);
    if (!existing) return false;

    existing.health = {
      ...existing.health,
      ...healthPatch,
    };
    return true;
  }

  /**
   * Updates the lastSeenAt timestamp for a device and optionally resets latency/error counts.
   */
  public markSeen(deviceId: string, timestampIso: string = new Date().toISOString(), latencyMs?: number): boolean {
    const existing = this.devices.get(deviceId);
    if (!existing) return false;

    existing.health.lastSeenAt = timestampIso;
    if (latencyMs !== undefined) {
      existing.health.latencyMs = latencyMs;
    }
    return true;
  }

  /**
   * Deactivates a device by marking it OFFLINE without removing it from the registry.
   * This is preferred over physical deletion to maintain traceability.
   */
  public deactivate(deviceId: string, reason?: string): boolean {
    const existing = this.devices.get(deviceId);
    if (!existing) return false;

    existing.health.status = "OFFLINE";
    if (reason) {
      existing.health.lastErrorMessage = reason;
    }
    return true;
  }

  /**
   * Physically unregisters/removes a device from runtime memory.
   */
  public remove(deviceId: string): boolean {
    return this.devices.delete(deviceId);
  }

  /**
   * Clears all registered devices from the runtime registry.
   */
  public clear(): void {
    this.devices.clear();
  }

  /**
   * Returns total count of registered devices.
   */
  public count(): number {
    return this.devices.size;
  }
}

/**
 * Default global singleton instance for application runtime usage.
 */
export const deviceRegistry = new DeviceRegistry();
