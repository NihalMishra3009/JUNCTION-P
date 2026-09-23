// ============================================================
// JUNCTION - Hospitality Demand Propagation & Partner Sync (Steps 16, 17, 18)
// ============================================================

import {
  Hotel,
  Restaurant,
  ExtendedHotel,
  ExtendedRestaurant,
  HospitalityDemandSignal,
  PressureLevel,
} from "@/types";
import { getPressureLevel } from "@/data/mockResources";

export class HospitalityDemandService {
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
  } {
    const demandSignals: HospitalityDemandSignal[] = [];

    // 1. Hotel Demand Propagation
    const updatedHotels = hotels.map(hotel => {
      // Closer hotels with excellent transit take higher surge portion
      const proximityFactor = Math.max(0.2, 1 - (hotel.travelTimeToVenue / 45));
      const incomingCheckIns = Math.round((venueExitLoad * 0.04) * proximityFactor);
      
      const totalDemandedRooms = (hotel.totalRooms - hotel.availableRooms) + incomingCheckIns;
      const pressure = Math.min(100, Math.round((totalDemandedRooms / hotel.totalRooms) * 100));
      const pressureLevel: PressureLevel = getPressureLevel(pressure);

      if (pressure >= 85) {
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

      if (pressure >= 85) {
        demandSignals.push({
          targetType: "RESTAURANT",
          zoneId: restaurant.zone,
          resourceId: restaurant.id,
          incomingCrowdCohortSize: dinersSeekingTables,
          estimatedArrivalTime: new Date(Date.now() + 20 * 60_000).toISOString(),
          expectedDurationMinutes: 60,
        });
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
    };
  }
}

export const hospitalityDemandService = new HospitalityDemandService();
