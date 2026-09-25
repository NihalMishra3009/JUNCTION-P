import {
  NormalizedObservation,
  ZoneDefinition,
  ZoneState,
  PressureLevel,
  Trend,
  MonitoringStatus,
  Resource,
  Hotel,
  ScenarioId,
  SimulationState,
  QualityStatus,
  ContributingSensorSummary,
  FusionDiagnostics,
} from "@/types";
import { deviceRegistry } from "./deviceRegistry";
import { getPressureLevel } from "@/data/mockResources";
import { fuseZoneState as legacyFuseZoneState, evaluateMonitoringStatus } from "./zoneRegistry";
import { SCENARIOS } from "@/data/mockScenarios";

/**
 * Operational Capacity Basis Model
 * Explicitly separates concourse/gate egress throughput from stadium-wide nominal seating.
 */
export type CapacityBasis =
  | "CONCOURSE_EGRESS"      // Perimeter gates & clearance concourses (e.g. Wankhede exit: 4,000)
  | "TRANSIT_STATION"       // Station concourse & platform clearance (e.g. Churchgate: 10,000)
  | "TRANSIT_STAGING"       // Curbside taxi/rideshare buffer (e.g. Taxi Bay: 800)
  | "HOSPITALITY_CORRIDOR"  // Hotel corridor footfall & lobby buffer (e.g. South Hospitality: 3,000)
  | "VENUE_BOWL";           // Full static seating capacity

export interface OperationalCapacityProfile {
  basis: CapacityBasis;
  operationalCapacity: number; // Concourse / staging / platform operational throughput limit
  safetyBufferPercent: number; // e.g. 7% safety margin
  assumptions: string;
}

export const ZONE_CAPACITY_PROFILES: Record<string, OperationalCapacityProfile> = {
  ZONE_WANKHEDE: {
    basis: "CONCOURSE_EGRESS",
    operationalCapacity: 4000,
    safetyBufferPercent: 7,
    assumptions: "Exit gates 1-7 clearance throughput capacity (4,000 persons active in egress wave).",
  },
  ZONE_CHURCHGATE: {
    basis: "TRANSIT_STATION",
    operationalCapacity: 10000,
    safetyBufferPercent: 7,
    assumptions: "Western Railway subsurface concourse & platform staging capacity.",
  },
  ZONE_TAXI_STAGING: {
    basis: "TRANSIT_STAGING",
    operationalCapacity: 800,
    safetyBufferPercent: 7,
    assumptions: "Curbside vehicle pickup bays and pedestrian queuing buffer.",
  },
  ZONE_MARINE_LINES: {
    basis: "TRANSIT_STATION",
    operationalCapacity: 8000,
    safetyBufferPercent: 7,
    assumptions: "Marine Lines concourse & platform relief clearance capacity.",
  },
  ZONE_CSMT: {
    basis: "TRANSIT_STATION",
    operationalCapacity: 14000,
    safetyBufferPercent: 7,
    assumptions: "CSMT Central & Harbour terminus main hall passenger clearance capacity.",
  },
  ZONE_HOTELS_SOUTH: {
    basis: "HOSPITALITY_CORRIDOR",
    operationalCapacity: 3000,
    safetyBufferPercent: 7,
    assumptions: "Nariman Point & Marine Drive hotel lobby buffers and pedestrian footpath capacity.",
  },
  ZONE_DADAR: {
    basis: "TRANSIT_STATION",
    operationalCapacity: 18000,
    safetyBufferPercent: 7,
    assumptions: "Dual-railway interchange & bus terminal passenger handling capacity.",
  },
};

export interface ZoneFusionContext {
  scenario?: ScenarioId;
  resources?: Resource[];
  hotels?: Hotel[];
  simulationState?: SimulationState;
  redistributionApplied?: boolean;
}

export class SensorFusionEngine {
  /**
   * Guarded hybrid fusion algorithm:
   * 1. Evaluates observation coverage and sensor health.
   * 2. If coverage is zero or insufficient, uses legacy zoneRegistry fallback with explicit metadata.
   * 3. When observations exist, fuses multi-source streams against an explicit operational capacity basis.
   * 4. Preserves member hotel inventory, multi-horizon forecasts, and critical bottlenecks.
   * 5. Produces an explainable provenance breakdown (contributing sensors, weights, formulas, conflicts).
   */
  public fuseZoneObservations(
    zone: ZoneDefinition,
    observations: NormalizedObservation[],
    context: ZoneFusionContext = {}
  ): ZoneState {
    const zoneObs = observations.filter(o => o.zoneId === zone.id);
    const validObs = zoneObs.filter(o => o.qualityStatus !== "INVALID");
    const freshOrDelayedObs = validObs.filter(o => o.qualityStatus !== "STALE");

    // Expected registered devices for this zone
    const expectedDevices = deviceRegistry.getByZone(zone.id);
    const observedDeviceIds = new Set(zoneObs.map(o => o.sourceId));
    const missingDevices = expectedDevices.filter(d => !observedDeviceIds.has(d.id));

    // Coverage & Zero-Observation Check
    const hasSufficientSensorCoverage = validObs.length > 0;

    if (!hasSufficientSensorCoverage) {
      // Execute legacy fallback
      const fallbackState = legacyFuseZoneState(
        zone,
        context.resources ?? [],
        context.hotels ?? [],
        context.scenario ?? "NORMAL",
        context.simulationState,
        context.redistributionApplied ?? false
      );

      return {
        ...fallbackState,
        confidence: zone.tier === "TIER_1_CRITICAL" ? 0.65 : 0.50,
        source: "SIMULATED",
        density: Number((fallbackState.currentUtilization / Math.max(500, zone.radiusMeters * 3.14)).toFixed(2)),
        contributingSensors: [],
        dataQuality: expectedDevices.length > 0 ? "STALE" : "INTERPOLATED",
        conflicts: [],
        missingSensors: expectedDevices.map(d => `${d.name} (${d.id})`),
      };
    }

    // Separate metric types
    const countObs = validObs.filter(o => o.metricType === "CROWD_COUNT");
    const densityObs = validObs.filter(o => o.metricType === "DENSITY");
    const queueObs = validObs.filter(o => o.metricType === "QUEUE_LENGTH");
    const inflowObs = validObs.filter(o => o.metricType === "INFLOW_RATE");
    const outflowObs = validObs.filter(o => o.metricType === "OUTFLOW_RATE");

    // Weighted Sensor Fusion for Crowd Count
    let weightedCountSum = 0;
    let totalWeight = 0;
    const contributingSensors: ContributingSensorSummary[] = [];
    const conflicts: string[] = [];
    let hasConflict = false;

    for (const obs of validObs) {
      const device = deviceRegistry.get(obs.sourceId);
      const deviceName = device?.name ?? obs.sourceId;
      const deviceType = device?.type ?? "GENERIC_SENSOR";
      const deviceReliability = device?.reliabilityScore ?? 0.85;

      let freshnessWeight = 1.0;
      if (obs.qualityStatus === "STALE" || (obs.freshnessSeconds && obs.freshnessSeconds > 120)) {
        freshnessWeight = 0.35;
      } else if (obs.qualityStatus === "DELAYED") {
        freshnessWeight = 0.75;
      }

      if (obs.qualityStatus === "CONFLICTING") {
        hasConflict = true;
        conflicts.push(`Observation conflict from ${deviceName} (${obs.sourceId}): reading deviated significantly from trend.`);
      }

      const weight = Number((obs.confidence * deviceReliability * freshnessWeight).toFixed(4));

      contributingSensors.push({
        deviceId: obs.sourceId,
        deviceName,
        deviceType,
        metricType: obs.metricType,
        value: obs.value,
        unit: obs.unit,
        weight,
        confidence: obs.confidence,
        qualityStatus: obs.qualityStatus,
        freshnessSeconds: obs.freshnessSeconds ?? 0,
      });

      if (obs.metricType === "CROWD_COUNT") {
        weightedCountSum += obs.value * weight;
        totalWeight += weight;
      }
    }

    const fusedOccupancy = totalWeight > 0 ? Math.round(weightedCountSum / totalWeight) : 0;

    // Fused Spatial Density Calculation
    let fusedDensity = 0;
    if (densityObs.length > 0) {
      let weightedDensitySum = 0;
      let densityWeightSum = 0;
      for (const d of densityObs) {
        const dev = deviceRegistry.get(d.sourceId);
        const w = d.confidence * (dev?.reliabilityScore ?? 0.85);
        weightedDensitySum += d.value * w;
        densityWeightSum += w;
      }
      fusedDensity = densityWeightSum > 0 ? Number((weightedDensitySum / densityWeightSum).toFixed(2)) : 0;
    } else {
      // Derive density from fused occupancy and nominal coverage area
      const estimatedArea = zone.radiusMeters ? Math.PI * Math.pow(zone.radiusMeters * 0.4, 2) : 2500;
      fusedDensity = Number((fusedOccupancy / Math.max(100, estimatedArea)).toFixed(2));
    }

    // Fused Queue Length
    let totalQueuePersons = 0;
    for (const q of queueObs) {
      totalQueuePersons += q.value;
    }

    // Operational Capacity Basis Profile
    const profile = ZONE_CAPACITY_PROFILES[zone.id] || {
      basis: "CONCOURSE_EGRESS" as CapacityBasis,
      operationalCapacity: zone.nominalPedestrianCapacity || 5000,
      safetyBufferPercent: 7,
      assumptions: "Default fallback operational throughput capacity.",
    };

    const operationalUsableCapacity = Math.round(
      profile.operationalCapacity * (1 - profile.safetyBufferPercent / 100)
    );

    // Total Nominal Combined Capacity (Full venue bowl / station nominals for total display)
    const nominalCombinedCapacity = zone.nominalPedestrianCapacity + zone.nominalTransitCapacity;
    const availableCapacity = Math.max(0, nominalCombinedCapacity - fusedOccupancy);

    // Pressure Calculation scaled to Operational Capacity Basis + Queue/Conflict Penalties
    const basePressure = Math.min(100, Math.round((fusedOccupancy / operationalUsableCapacity) * 100));
    const queuePenalty = totalQueuePersons > 50 ? Math.min(25, Math.round(totalQueuePersons / 30)) : 0;
    const conflictPenalty = hasConflict ? 10 : 0;
    const totalPressure = Math.min(99, Math.max(5, basePressure + queuePenalty + conflictPenalty));
    const pressureLevel: PressureLevel = getPressureLevel(totalPressure);

    // Confidence Calculation
    let fusedConfidence = totalWeight > 0 && countObs.length > 0
      ? Number((totalWeight / countObs.length).toFixed(2))
      : 0.5;
    if (hasConflict) fusedConfidence = Number((fusedConfidence * 0.7).toFixed(2));
    if (freshOrDelayedObs.length < validObs.length) fusedConfidence = Number((fusedConfidence * 0.85).toFixed(2));
    if (missingDevices.length > 0) fusedConfidence = Number((fusedConfidence * 0.90).toFixed(2));
    fusedConfidence = Math.min(0.98, Math.max(0.35, fusedConfidence));

    // Dynamic Monitoring Status Evaluation
    const { status: monitoringStatus, isEscalated } = evaluateMonitoringStatus(zone, totalPressure);

    // Flow Rates (Fused from observations or derived from occupancy)
    let inflowRate = Math.round(fusedOccupancy * 0.08);
    if (inflowObs.length > 0) {
      const sum = inflowObs.reduce((acc, o) => acc + o.value, 0);
      inflowRate = Math.round(sum / inflowObs.length);
    }

    let outflowRate = Math.round(fusedOccupancy * 0.06);
    if (outflowObs.length > 0) {
      const sum = outflowObs.reduce((acc, o) => acc + o.value, 0);
      outflowRate = Math.round(sum / outflowObs.length);
    }
    const netFlow = inflowRate - outflowRate;

    // Multi-Horizon Forecast Projection
    const s = SCENARIOS[context.scenario ?? "NORMAL"] || SCENARIOS.NORMAL;
    let p15 = Math.min(99, Math.round(totalPressure * 1.06));
    let p30 = Math.min(99, Math.round(totalPressure * 1.12));
    let p60 = Math.min(99, Math.round(totalPressure * 1.15));

    if (context.redistributionApplied) {
      if (zone.id === "ZONE_CHURCHGATE" || zone.id === "ZONE_WANKHEDE") {
        p15 = Math.max(40, p15 - 12);
        p30 = Math.max(45, p30 - 18);
        p60 = Math.max(45, p60 - 18);
      } else if (zone.id === "ZONE_DADAR") {
        p15 = Math.min(88, p15 + 8);
        p30 = Math.min(90, p30 + 10);
        p60 = Math.min(90, p60 + 8);
      }
    }

    const trend: Trend = p30 > totalPressure + 5 ? "INCREASING" : p30 < totalPressure - 5 ? "DECREASING" : "STABLE";

    // Hospitality & Member Resource Bottlenecks Preservation
    const activeBottlenecks: string[] = [];
    if (totalPressure >= 85) {
      activeBottlenecks.push(`${zone.name} (${totalPressure}%)`);
    }

    const memberHotels = (context.hotels ?? []).filter(h => zone.hotelIds.includes(h.id));
    const memberRes = (context.resources ?? []).filter(r => zone.resourceIds.includes(r.id));

    memberRes.forEach(r => {
      if (r.pressure >= 85 && !activeBottlenecks.some(b => b.includes(r.shortName || r.name))) {
        activeBottlenecks.push(`${r.shortName || r.name} (${r.pressure}%)`);
      }
    });

    memberHotels.forEach(h => {
      if (h.pressure >= 90 && !activeBottlenecks.some(b => b.includes(h.name))) {
        activeBottlenecks.push(`${h.name} (${h.pressure}%)`);
      }
    });

    const usableHotelRooms = memberHotels.reduce((sum, h) => sum + (h.usableRooms || 0), 0);
    const usableCapacity = availableCapacity + usableHotelRooms;

    const hasPartnerReportedHotel = memberHotels.some(h => h.source === "PARTNER_REPORTED");
    const source = hasPartnerReportedHotel ? "PARTNER_REPORTED" : "SIMULATED";

    // Overall Data Quality
    let dataQuality: QualityStatus = "FRESH";
    if (hasConflict) {
      dataQuality = "CONFLICTING";
    } else if (validObs.some(o => o.qualityStatus === "STALE")) {
      dataQuality = "STALE";
    } else if (missingDevices.length > 0) {
      dataQuality = "DELAYED";
    }

    // Full Diagnostics
    const fusionDiagnostics: FusionDiagnostics = {
      capacityBasis: profile.basis,
      operationalCapacity: profile.operationalCapacity,
      safetyBufferPercent: profile.safetyBufferPercent,
      usableCapacityBasis: operationalUsableCapacity,
      formula: "Fused Occupancy = Σ (Count_i × Confidence_i × Reliability_i × Freshness_i) / Σ Weights; Capacity % = (Occupancy / Usable Operational Capacity) × 100",
      contributingSensors,
      conflicts,
      missingSensors: missingDevices.map(d => `${d.name} (${d.id})`),
      density: fusedDensity,
    };

    return {
      id: zone.id,
      name: zone.name,
      tier: isEscalated ? "TIER_1_CRITICAL" : zone.tier,
      baseTier: zone.tier,
      monitoringStatus,
      isEscalated,
      pressure: totalPressure,
      predictedPressure15: p15,
      predictedPressure30: p30,
      predictedPressure60: p60,
      pressureLevel,
      trend,
      inflowRate,
      outflowRate,
      netFlow,
      totalCapacity: nominalCombinedCapacity,
      currentUtilization: fusedOccupancy,
      availableCapacity,
      usableCapacity,
      activeBottlenecks,
      memberResources: [...zone.resourceIds, ...zone.hotelIds],
      lastUpdated: "JUST NOW",
      confidence: fusedConfidence,
      source,
      density: fusedDensity,
      contributingSensors: Array.from(new Set(contributingSensors.map(c => c.deviceId))),
      dataQuality,
      conflicts,
      missingSensors: missingDevices.map(d => d.id),
      fusionDiagnostics,
    };
  }
}

export const sensorFusionEngine = new SensorFusionEngine();
