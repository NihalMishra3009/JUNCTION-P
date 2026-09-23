// ============================================================
// JUNCTION - Multi-Source Sensor Fusion & Zone State Engine (Steps 9 & 10)
// ============================================================

import {
  NormalizedObservation,
  ZoneDefinition,
  ZoneState,
  PressureLevel,
  Trend,
  MonitoringStatus,
} from "@/types";
import { deviceRegistry } from "./deviceRegistry";
import { getPressureLevel } from "@/data/mockResources";

export interface FusedZoneMetric {
  value: number;
  confidence: number;
  sourcesCount: number;
  disagreementSpread: number;
  isDegraded: boolean;
}

export class SensorFusionEngine {
  /**
   * Fuses normalized multi-sensor observations into a coherent ZoneState.
   * Discards invalid readings, down-weights stale observations, accounts for device reliability,
   * and preserves disagreement metrics when conflicting readings occur.
   */
  public fuseZoneObservations(
    zone: ZoneDefinition,
    observations: NormalizedObservation[],
    activeScenarioKPIs?: { weatherImpact?: number; transitCongestion?: number }
  ): ZoneState {
    const zoneObs = observations.filter(o => o.zoneId === zone.id);

    // 1. Filter out invalid
    const validObs = zoneObs.filter(o => o.qualityStatus !== "INVALID");

    // 2. Separate crowd count observations
    const countObs = validObs.filter(o => o.metricType === "CROWD_COUNT");
    const queueObs = validObs.filter(o => o.metricType === "QUEUE_LENGTH");

    // Weighted fusion for crowd count
    let weightedCountSum = 0;
    let totalWeight = 0;
    const countValues: number[] = [];
    let hasConflict = false;

    for (const obs of countObs) {
      const device = deviceRegistry.get(obs.sourceId);
      const deviceReliability = device?.reliabilityScore ?? 0.85;

      // Down-weight stale or delayed observations
      let freshnessWeight = 1.0;
      if (obs.qualityStatus === "STALE") freshnessWeight = 0.5;
      else if (obs.qualityStatus === "DELAYED") freshnessWeight = 0.75;

      if (obs.qualityStatus === "CONFLICTING") hasConflict = true;

      const weight = obs.confidence * deviceReliability * freshnessWeight;
      weightedCountSum += obs.value * weight;
      totalWeight += weight;
      countValues.push(obs.value);
    }

    const fusedOccupancy = totalWeight > 0 ? Math.round(weightedCountSum / totalWeight) : 0;

    // Disagreement metric (spread between max and min readings)
    const countSpread = countValues.length > 1
      ? Math.max(...countValues) - Math.min(...countValues)
      : 0;

    // Fused queue length
    let totalQueuePersons = 0;
    for (const q of queueObs) {
      totalQueuePersons += q.value;
    }

    // Capacity & Utilization
    const nominalCapacity = zone.nominalPedestrianCapacity + zone.nominalTransitCapacity;
    const usableCapacity = Math.round(nominalCapacity * 0.93); // 7% standard safety buffer
    const availableCapacity = Math.max(0, usableCapacity - fusedOccupancy);
    const capacityUtilization = usableCapacity > 0 ? fusedOccupancy / usableCapacity : 0;

    // Pressure calculation incorporating utilization, queues, and conflict penalty
    const basePressure = Math.min(100, Math.round(capacityUtilization * 100));
    const queuePenalty = totalQueuePersons > 100 ? Math.min(20, Math.round(totalQueuePersons / 50)) : 0;
    const conflictPenalty = hasConflict ? 10 : 0;
    const totalPressure = Math.min(100, Math.max(0, basePressure + queuePenalty + conflictPenalty));
    const pressureLevel = getPressureLevel(totalPressure);

    // Confidence degradation if conflicting or few sensors
    let fusedConfidence = totalWeight > 0 ? Number((totalWeight / countObs.length).toFixed(2)) : 0.5;
    if (hasConflict) fusedConfidence = Number((fusedConfidence * 0.7).toFixed(2));
    if (countObs.length === 0) fusedConfidence = 0.4;

    // Trend estimation
    let trend: Trend = "STABLE";
    if (totalPressure > 80 || queuePenalty > 10) trend = "INCREASING";
    else if (totalPressure < 40) trend = "DECREASING";

    // Adaptive monitoring status escalation
    let monitoringStatus: MonitoringStatus = zone.defaultMonitoringStatus;
    if (pressureLevel === "CRITICAL" || pressureLevel === "HIGH") {
      monitoringStatus = "CONTINUOUS";
    }

    return {
      id: zone.id,
      name: zone.name,
      tier: zone.tier,
      baseTier: zone.tier,
      monitoringStatus,
      isEscalated: monitoringStatus === "CONTINUOUS",
      pressure: totalPressure,
      predictedPressure15: Math.min(99, Math.round(totalPressure * 1.08)),
      predictedPressure30: Math.min(99, Math.round(totalPressure * 1.15)),
      predictedPressure60: Math.min(99, Math.round(totalPressure * 1.20)),
      pressureLevel,
      trend,
      inflowRate: Math.round(fusedOccupancy * 0.08),
      outflowRate: Math.round(fusedOccupancy * 0.06),
      netFlow: Math.round(fusedOccupancy * 0.02),
      totalCapacity: nominalCapacity,
      currentUtilization: fusedOccupancy,
      availableCapacity,
      usableCapacity,
      activeBottlenecks: totalPressure >= 85 ? [`${zone.name} (${totalPressure}%)`] : [],
      memberResources: [...zone.resourceIds, ...zone.hotelIds],
      lastUpdated: new Date().toISOString(),
      confidence: fusedConfidence,
      source: "SIMULATED",
    };
  }
}

export const sensorFusionEngine = new SensorFusionEngine();
