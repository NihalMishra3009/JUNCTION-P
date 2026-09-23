// ============================================================
// JUNCTION - Canonical Destination & Resource Model (Step 3)
// ============================================================

import {
  GeoLocation,
  OperatingStatus,
  PressureLevel,
  ConfidenceSource,
  Trend,
  ResourceType,
  Resource,
  Hotel,
  Restaurant,
  ExtendedHotel,
  ExtendedRestaurant,
} from "./index";

export type CanonicalResourceKind =
  | "VENUE"
  | "VENUE_GATE"
  | "STATION"
  | "TRANSPORT_HUB"
  | "ROAD_SEGMENT"
  | "HOTEL"
  | "RESTAURANT"
  | "PICKUP_ZONE"
  | "PARKING"
  | "SHUTTLE_HUB"
  | "EMERGENCY_POST"
  | "PUBLIC_FACILITY";

export interface CapacityBufferBreakdown {
  safetyBufferPercent: number; // e.g. 0.10 (10% safety margin reserved)
  operatingReductionPercent: number; // e.g. 0.05 (maintenance/closed bays)
  accessibilityReservedPercent: number; // e.g. 0.05 (accessible routing)
  effectiveBufferUnits: number; // Calculated total reserved capacity units
}

export interface CapacityThresholds {
  watchThresholdPercent: number; // e.g. 0.70 (70%)
  highThresholdPercent: number; // e.g. 0.85 (85%)
  criticalThresholdPercent: number; // e.g. 0.95 (95%)
  recoveryHysteresisPercent: number; // e.g. 0.05 (5% drop needed to exit threshold)
}

export interface ResourceProvenanceMetadata {
  source: ConfidenceSource;
  providerId?: string;
  lastReportedAt: string;
  isSimulated: boolean;
  version: string;
}

/**
 * Canonical Destination Resource:
 * The unified entity encompassing physical, usable, and operational capacity,
 * zone hierarchy, connected graph relationships, and capacity buffers.
 */
export interface CanonicalResource {
  id: string;
  kind: CanonicalResourceKind;
  name: string;
  shortName: string;
  description?: string;
  
  // Spatial & Hierarchy
  parentZoneId: string;
  location: GeoLocation;
  geometry?: GeoLocation[]; // For linear/polygon resources (e.g. roads, concourses)
  connectedResourceIds: string[];
  
  // Capacity & Pressure Foundations (Usable vs Physical)
  physicalCapacity: number; // Total architectural/structural capacity
  usableCapacity: number; // Capacity remaining after safety, operating, and event buffers
  currentUtilization: number; // Current active occupants / load
  availableCapacity: number; // usableCapacity - currentUtilization
  predictedDemand: number; // Forecast incoming cohort load
  
  // Operational Status & Pressure
  operatingStatus: OperatingStatus;
  pressure: number; // 0 - 100 normalized score
  pressureLevel: PressureLevel;
  trend: Trend;
  
  // Capacity Buffers & Thresholds (Used by pressure & forecasting engines)
  capacityBuffers: CapacityBufferBreakdown;
  thresholds: CapacityThresholds;
  
  // Confidence & Provenance
  confidence: number; // 0.0 - 1.0
  sourceMetadata: ResourceProvenanceMetadata;
  
  // Type-specific extensions (Optional attachments for specialized domains)
  hospitalityExtension?: {
    hotelDetail?: Partial<ExtendedHotel>;
    restaurantDetail?: Partial<ExtendedRestaurant>;
  };
  transportExtension?: {
    transitLines?: string[];
    headwayMinutes?: number;
    platformCount?: number;
  };
}

// ------------------------------------------------------------
// Compatibility Adapters & Transformers
// ------------------------------------------------------------

export function calculateUsableCapacity(
  physicalCapacity: number,
  buffers: Partial<CapacityBufferBreakdown> = {}
): { usableCapacity: number; breakdown: CapacityBufferBreakdown } {
  const safetyBufferPercent = buffers.safetyBufferPercent ?? 0.05;
  const operatingReductionPercent = buffers.operatingReductionPercent ?? 0.0;
  const accessibilityReservedPercent = buffers.accessibilityReservedPercent ?? 0.02;
  
  const totalReductionRatio = Math.min(0.5, safetyBufferPercent + operatingReductionPercent + accessibilityReservedPercent);
  const effectiveBufferUnits = Math.round(physicalCapacity * totalReductionRatio);
  const usableCapacity = Math.max(0, physicalCapacity - effectiveBufferUnits);

  return {
    usableCapacity,
    breakdown: {
      safetyBufferPercent,
      operatingReductionPercent,
      accessibilityReservedPercent,
      effectiveBufferUnits,
    },
  };
}

/**
 * Transforms an existing prototype Resource into the CanonicalResource representation.
 */
export function toCanonicalResourceFromLegacy(resource: Resource): CanonicalResource {
  const { usableCapacity, breakdown } = calculateUsableCapacity(resource.totalCapacity);
  
  return {
    id: resource.id,
    kind: resource.type as CanonicalResourceKind,
    name: resource.name,
    shortName: resource.shortName,
    description: resource.description,
    parentZoneId: resource.zone,
    location: resource.location,
    connectedResourceIds: resource.connectedTransport || [],
    
    physicalCapacity: resource.totalCapacity,
    usableCapacity: usableCapacity,
    currentUtilization: resource.currentUtilization,
    availableCapacity: resource.availableCapacity,
    predictedDemand: resource.predictedDemand,
    
    operatingStatus: resource.operatingStatus,
    pressure: resource.pressure,
    pressureLevel: resource.pressureLevel,
    trend: resource.trend,
    
    capacityBuffers: breakdown,
    thresholds: {
      watchThresholdPercent: 0.70,
      highThresholdPercent: 0.85,
      criticalThresholdPercent: 0.95,
      recoveryHysteresisPercent: 0.05,
    },
    
    confidence: resource.confidence,
    sourceMetadata: {
      source: resource.source,
      lastReportedAt: new Date().toISOString(),
      isSimulated: resource.source === "SIMULATED",
      version: "1.0.0",
    },
    transportExtension: {
      transitLines: resource.connectedTransport,
    },
  };
}

/**
 * Transforms an existing prototype Hotel into a CanonicalResource.
 */
export function toCanonicalResourceFromHotel(hotel: Hotel): CanonicalResource {
  const physicalCapacity = hotel.totalRooms;
  const usableCapacity = hotel.usableRooms || Math.round(hotel.totalRooms * 0.95);
  const currentOccupancy = hotel.totalRooms - hotel.availableRooms;
  
  return {
    id: hotel.id,
    kind: "HOTEL",
    name: hotel.name,
    shortName: hotel.name,
    parentZoneId: hotel.zone,
    location: hotel.location,
    connectedResourceIds: [],
    
    physicalCapacity,
    usableCapacity,
    currentUtilization: currentOccupancy,
    availableCapacity: hotel.availableRooms,
    predictedDemand: hotel.expectedCheckIns,
    
    operatingStatus: "OPERATIONAL",
    pressure: hotel.pressure,
    pressureLevel: hotel.pressureLevel,
    trend: "STABLE",
    
    capacityBuffers: {
      safetyBufferPercent: 0.05,
      operatingReductionPercent: 0.0,
      accessibilityReservedPercent: 0.02,
      effectiveBufferUnits: physicalCapacity - usableCapacity,
    },
    thresholds: {
      watchThresholdPercent: 0.75,
      highThresholdPercent: 0.88,
      criticalThresholdPercent: 0.96,
      recoveryHysteresisPercent: 0.04,
    },
    
    confidence: 0.9,
    sourceMetadata: {
      source: hotel.source,
      lastReportedAt: new Date().toISOString(),
      isSimulated: hotel.source === "SIMULATED",
      version: "1.0.0",
    },
    hospitalityExtension: {
      hotelDetail: hotel,
    },
  };
}

/**
 * Transforms an existing prototype Restaurant into a CanonicalResource.
 */
export function toCanonicalResourceFromRestaurant(restaurant: Restaurant): CanonicalResource {
  const physicalCapacity = restaurant.capacity;
  const usableCapacity = Math.round(restaurant.capacity * 0.95);
  
  return {
    id: restaurant.id,
    kind: "RESTAURANT",
    name: restaurant.name,
    shortName: restaurant.name,
    parentZoneId: restaurant.zone,
    location: restaurant.location,
    connectedResourceIds: [],
    
    physicalCapacity,
    usableCapacity,
    currentUtilization: restaurant.currentOccupancy,
    availableCapacity: restaurant.availableTables * 4, // standard 4-top seat approximation
    predictedDemand: restaurant.waitTime > 0 ? restaurant.waitTime * 2 : 0,
    
    operatingStatus: "OPERATIONAL",
    pressure: restaurant.pressure,
    pressureLevel: restaurant.pressureLevel,
    trend: restaurant.waitTime > 20 ? "INCREASING" : "STABLE",
    
    capacityBuffers: {
      safetyBufferPercent: 0.05,
      operatingReductionPercent: 0.0,
      accessibilityReservedPercent: 0.02,
      effectiveBufferUnits: physicalCapacity - usableCapacity,
    },
    thresholds: {
      watchThresholdPercent: 0.70,
      highThresholdPercent: 0.85,
      criticalThresholdPercent: 0.95,
      recoveryHysteresisPercent: 0.05,
    },
    
    confidence: 0.9,
    sourceMetadata: {
      source: restaurant.source,
      lastReportedAt: new Date().toISOString(),
      isSimulated: restaurant.source === "SIMULATED",
      version: "1.0.0",
    },
    hospitalityExtension: {
      restaurantDetail: restaurant,
    },
  };
}
