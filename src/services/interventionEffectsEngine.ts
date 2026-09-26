// ============================================================
// JUNCTION - Deterministic Intervention Effects Engine
// ============================================================

import {
  ActiveIntervention,
  InterventionType,
  ScenarioId,
} from "@/types";

export interface SimulationModifiers {
  destinationFractions: {
    CHURCHGATE: number;
    TAXI_ZONE: number;
    MARINE_LINES: number;
    CSMT: number;
    DADAR: number;
  };
  outflowRateMultiplier: number;
  nodeClearanceAdditions: Record<string, number>;
  activeInterventionCount: number;
}

export class InterventionEffectsEngine {
  /**
   * Computes the time-dependent ramp factor for an active intervention.
   * Prevents instantaneous state jumps by gradually applying the effect over rampDurationSeconds.
   */
  public computeRampFactor(
    intervention: ActiveIntervention,
    currentTimeMs: number = Date.now()
  ): number {
    if (intervention.status !== "APPROVED" && intervention.status !== "ACTIVE") {
      return 0.0;
    }

    const elapsedMs = Math.max(0, currentTimeMs - intervention.approvedAt);
    const rampMs = (intervention.rampDurationSeconds || 15) * 1000;
    const rawRamp = Math.min(1.0, elapsedMs / rampMs);

    return Number((rawRamp * (intervention.intensity || 1.0)).toFixed(3));
  }

  /**
   * Evaluates active interventions and generates aggregated, flow-conserving simulation modifiers.
   */
  public calculateModifiers(
    activeInterventions: ActiveIntervention[],
    simulationMinutes: number,
    currentTimeMs: number = Date.now()
  ): SimulationModifiers {
    // Default baseline destination fractions:
    // Churchgate 52%, Taxi Zone 20%, Marine Lines 16%, CSMT 8%, Dadar 4%
    let fracChurchgate = 0.52;
    let fracTaxi = 0.20;
    let fracMarine = 0.16;
    let fracCsmt = 0.08;
    let fracDadar = 0.04;

    let outflowRateMultiplier = 1.0;
    const nodeClearanceAdditions: Record<string, number> = {
      CHURCHGATE: 0,
      MARINE_LINES: 0,
      CSMT: 0,
      TAXI_ZONE: 0,
      DADAR: 0,
      WANKHEDE_EXIT: 0,
    };

    let activeCount = 0;

    for (const item of activeInterventions) {
      if (item.status !== "APPROVED" && item.status !== "ACTIVE") {
        continue;
      }

      // Check for expiration based on simulation elapsed minutes
      const elapsedSimMins = simulationMinutes - item.approvedAtSimulationMinute;
      if (item.durationMinutes && elapsedSimMins > item.durationMinutes) {
        continue;
      }

      const ramp = this.computeRampFactor(item, currentTimeMs);
      if (ramp <= 0) continue;

      activeCount++;
      const actionType = item.type || item.actionType;

      switch (actionType) {
        case "REROUTE_ATTENDEES": {
          // Diverts up to 32% of Churchgate-bound flow to Marine Lines (60%) and Dadar (40%)
          const divertShare = 0.32 * ramp;
          const divertedAmount = fracChurchgate * divertShare;

          fracChurchgate = Math.max(0.20, fracChurchgate - divertedAmount);
          fracMarine += divertedAmount * 0.60;
          fracDadar += divertedAmount * 0.40;
          break;
        }

        case "GATE_CAPACITY_CHANGE": {
          // Turnstile wave metering: smooths post-event outflow surge rate into concourses
          const holdReduction = 0.22 * ramp;
          outflowRateMultiplier = Math.max(0.70, outflowRateMultiplier * (1.0 - holdReduction));
          break;
        }

        case "ADD_TRANSIT_SHUTTLES": {
          // Dispatches high-capacity reserve buses, increasing taxi staging clearance from 110 to 250 pax/min
          const extraClearance = Math.round(140 * ramp);
          nodeClearanceAdditions["TAXI_ZONE"] = (nodeClearanceAdditions["TAXI_ZONE"] || 0) + extraClearance;
          break;
        }

        case "REDIRECT_PICKUP_ZONE": {
          // Diverts 35% of taxi queue demand to secondary transit pickup nodes
          const divertTaxi = fracTaxi * (0.35 * ramp);
          fracTaxi = Math.max(0.08, fracTaxi - divertTaxi);
          fracCsmt += divertTaxi * 0.70;
          fracMarine += divertTaxi * 0.30;
          break;
        }

        case "HOSPITALITY_DEMAND_SIGNAL": {
          // Emits commercial vouchers holding crowd in dining/hospitality corridors
          const hospitalityDivert = fracChurchgate * (0.12 * ramp);
          fracChurchgate = Math.max(0.25, fracChurchgate - hospitalityDivert);
          fracCsmt += hospitalityDivert;
          break;
        }

        case "DYNAMIC_MESSAGING_DISPATCH": {
          // Moderates pedestrian pacing and balances walkway utilization
          const balanceDivert = fracChurchgate * (0.08 * ramp);
          fracChurchgate = Math.max(0.25, fracChurchgate - balanceDivert);
          fracMarine += balanceDivert;
          break;
        }

        case "EMERGENCY_CORRIDOR_HOLD": {
          // Emergency platform hold reduces immediate egress rate
          const holdMultiplier = 1.0 - (0.35 * ramp);
          outflowRateMultiplier = Math.min(outflowRateMultiplier, holdMultiplier);
          break;
        }

        default:
          break;
      }
    }

    // Ensure strict flow conservation: normalizes destination fractions to sum exactly to 1.0
    const totalFrac = fracChurchgate + fracTaxi + fracMarine + fracCsmt + fracDadar;
    const normalizedFractions = {
      CHURCHGATE: Number((fracChurchgate / totalFrac).toFixed(4)),
      TAXI_ZONE: Number((fracTaxi / totalFrac).toFixed(4)),
      MARINE_LINES: Number((fracMarine / totalFrac).toFixed(4)),
      CSMT: Number((fracCsmt / totalFrac).toFixed(4)),
      DADAR: Number((fracDadar / totalFrac).toFixed(4)),
    };

    return {
      destinationFractions: normalizedFractions,
      outflowRateMultiplier: Number(outflowRateMultiplier.toFixed(3)),
      nodeClearanceAdditions,
      activeInterventionCount: activeCount,
    };
  }
}

export const interventionEffectsEngine = new InterventionEffectsEngine();
