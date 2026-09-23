// ============================================================
// JUNCTION - Hospitality & Dining Domain Contracts
// ============================================================

import { GeoLocation, PressureLevel, OperatingStatus, ConfidenceSource } from "./index";

export type RoomCategory = "STANDARD" | "DELUXE" | "SUITE" | "ACCESSIBLE";

export interface HotelRoomCategoryDetail {
  category: RoomCategory;
  totalRooms: number;
  availableRooms: number;
  ratePerNightUsd?: number;
}

export interface ExtendedHotel {
  id: string;
  name: string;
  zone: string;
  location: GeoLocation;
  address?: string;
  phone?: string;
  totalRooms: number;
  availableRooms: number;
  usableRooms: number;
  categories?: HotelRoomCategoryDetail[];
  
  // Real-time Event Demand Modeling
  expectedCheckIns: number;
  expectedCheckOuts: number;
  travelTimeToVenueMinutes: number;
  pressure: number;
  pressureLevel: PressureLevel;
  transportConnectivity: "EXCELLENT" | "GOOD" | "MODERATE" | "POOR";
  eventDemand: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
  
  // Partner Management & Redistribution
  partnerVerified: boolean;
  acceptsRedirectedDemand: boolean;
  maxRedirectedRoomsCapacity?: number;
  lastUpdatedByPartnerAt?: string;
  
  source: ConfidenceSource;
  confidence: number;
}

export interface DiningSeatingBreakdown {
  indoorSeats: number;
  outdoorSeats: number;
  barSeats: number;
}

export interface ExtendedRestaurant {
  id: string;
  name: string;
  cuisine: string;
  zone: string;
  location: GeoLocation;
  totalCapacity: number;
  currentOccupancy: number;
  availableTables: number;
  seating?: DiningSeatingBreakdown;
  
  // Dynamics & Queues
  queueLength: number;
  estimatedWaitMinutes: number;
  averageMealDurationMinutes: number;
  serviceRateTablesPerHour?: number;
  
  operatingStatus: OperatingStatus;
  distanceFromVenueMeters: number;
  pressure: number;
  pressureLevel: PressureLevel;
  
  // Event Incentives & Partner Synchronization
  hasIncentive: boolean;
  incentiveLabel?: string;
  recommended?: boolean;
  acceptsRedirection: boolean;
  partnerVerified: boolean;
  lastUpdatedByPartnerAt?: string;
  
  source: ConfidenceSource;
  confidence: number;
}

export interface HospitalityDemandSignal {
  targetType: "HOTEL" | "RESTAURANT";
  zoneId: string;
  resourceId?: string;
  incomingCrowdCohortSize: number;
  estimatedArrivalTime: string;
  expectedDurationMinutes: number;
  recommendedSurgePricingOrCap?: boolean;
}
