// ============================================================
// JUNCTION - Hospitality Demand Propagation & Partner Sync
// ============================================================

import {
  Hotel,
  Restaurant,
  HospitalityDemandSignal,
  OperationalIntervention,
  PressureLevel,
} from "@/types";
import { getPressureLevel } from "@/data/mockResources";
import { persistenceService } from "./persistenceService";

export interface HospitalityDemandConfig {
  surgePressureThreshold: number; // e.g. 80% or 85%
  enableDynamicVouchers: boolean;
  voucherDiscountPercent: number; // e.g. 20%
}

export class HospitalityDemandService {
  private config: HospitalityDemandConfig = {
    surgePressureThreshold: 80,
    enableDynamicVouchers: true,
    voucherDiscountPercent: 20,
  };

  public setConfig(update: Partial<HospitalityDemandConfig>): void {
    this.config = { ...this.config, ...update };
  }

  public getConfig(): HospitalityDemandConfig {
    return { ...this.config };
  }

  /**
   * Propagates crowd egress into hotel search/check-in demand and restaurant seating pressure
   * based on walking distance, time-of-day, and transport connectivity.
   */
  public propagateDemandToHospitality(
    hotels: Hotel[],
    restaurants: Restaurant[],
    egressOutflowRate: number,
    venueExitLoad: number
  ): {
    updatedHotels: Hotel[];
    updatedRestaurants: Restaurant[];
    demandSignals: HospitalityDemandSignal[];
    recommendedVoucherInterventions: OperationalIntervention[];
  } {
    const demandSignals: HospitalityDemandSignal[] = [];
    const recommendedVoucherInterventions: OperationalIntervention[] = [];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 45 * 60_000).toISOString();

    // 1. Hotel Demand Propagation
    const updatedHotels = hotels.map(hotel => {
      const proximityFactor = Math.max(0.2, 1 - (hotel.travelTimeToVenue / 45));
      const incomingCheckIns = Math.round((venueExitLoad * 0.04) * proximityFactor);
      
      const totalDemandedRooms = (hotel.totalRooms - hotel.availableRooms) + incomingCheckIns;
      const pressure = Math.min(100, Math.round((totalDemandedRooms / hotel.totalRooms) * 100));
      const pressureLevel: PressureLevel = getPressureLevel(pressure);

      if (pressure >= this.config.surgePressureThreshold) {
        demandSignals.push({
          targetType: "HOTEL",
          zoneId: hotel.zone,
          resourceId: hotel.id,
          incomingCrowdCohortSize: incomingCheckIns,
          estimatedArrivalTime: new Date(Date.now() + hotel.travelTimeToVenue * 60_000).toISOString(),
          expectedDurationMinutes: 180,
          recommendedSurgePricingOrCap: true,
        });
      }

      return {
        ...hotel,
        expectedCheckIns: incomingCheckIns,
        pressure,
        pressureLevel,
      };
    });

    // 2. Restaurant Dining Demand Propagation
    const updatedRestaurants = restaurants.map(restaurant => {
      const distFactor = Math.max(0.1, 1 - (restaurant.distanceFromVenue / 2500));
      const dinersSeekingTables = Math.round((egressOutflowRate * 0.18) * distFactor);
      
      const estimatedWaitMinutes = dinersSeekingTables > restaurant.availableTables * 4
        ? Math.round((dinersSeekingTables - restaurant.availableTables * 4) / 4) * 3
        : 5;

      const occupancy = Math.min(restaurant.capacity, restaurant.currentOccupancy + Math.round(dinersSeekingTables * 0.5));
      const pressure = Math.min(100, Math.round((occupancy / restaurant.capacity) * 100));
      const pressureLevel: PressureLevel = getPressureLevel(pressure);

      if (pressure >= this.config.surgePressureThreshold) {
        demandSignals.push({
          targetType: "RESTAURANT",
          zoneId: restaurant.zone,
          resourceId: restaurant.id,
          incomingCrowdCohortSize: dinersSeekingTables,
          estimatedArrivalTime: new Date(Date.now() + 20 * 60_000).toISOString(),
          expectedDurationMinutes: 60,
        });

        // If restaurant has available table capacity in a secondary commercial zone, propose diversion voucher
        if (restaurant.availableTables >= 4 && this.config.enableDynamicVouchers) {
          const intervention: OperationalIntervention = {
            id: `INT_HOSPITALITY_VOUCHER_${restaurant.id}_${now.getTime()}`,
            type: "HOSPITALITY_DEMAND_SIGNAL",
            title: `Activate ${this.config.voucherDiscountPercent}% Crowd Diversion Vouchers at ${restaurant.name}`,
            description: `Offer attendee app digital dining vouchers to divert foot traffic away from congested transit stations into ${restaurant.name} (${restaurant.availableTables} tables available).`,
            targetZoneId: restaurant.zone,
            targetResourceId: restaurant.id,
            status: "PROPOSED",
            urgency: "MEDIUM",
            requiresApproval: true,
            approvalRoleRequired: "ORGANIZER",
            rationale: `Station concourse load is high while ${restaurant.name} has ${restaurant.availableTables} open tables (~${restaurant.availableTables * 4} covers).`,
            contributingSignals: [
              `Restaurant open tables: ${restaurant.availableTables}`,
              `Current occupancy: ${occupancy}/${restaurant.capacity}`,
              `Demand cohort: ${dinersSeekingTables} diners nearby`,
            ],
            expectedPressureReductionPercent: 15,
            timeToEffectMinutes: 15,
            confidenceScore: 0.88,
            proposedAt: now.toISOString(),
            expiresAt,
            rollbackFeasible: true,
            rollbackPlan: "Deactivate voucher broadcast in attendee application.",
          };
          recommendedVoucherInterventions.push(intervention);
          persistenceService.persistIntervention(intervention).catch(() => {});
        }
      }

      return {
        ...restaurant,
        waitTime: estimatedWaitMinutes,
        predictedWaitTime: Math.round(estimatedWaitMinutes * 1.2),
        currentOccupancy: occupancy,
        pressure,
        pressureLevel,
      };
    });

    return {
      updatedHotels,
      updatedRestaurants,
      demandSignals,
      recommendedVoucherInterventions,
    };
  }
}

export const hospitalityDemandService = new HospitalityDemandService();
