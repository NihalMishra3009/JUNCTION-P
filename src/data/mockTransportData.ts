import { GeoLocation } from "@/types";

// ============================================================
// JUNCTION - Multi-Modal Transport Fleet & Railway Data
// ============================================================

export interface RailwayCorridor {
  id: string;
  name: string;
  line: "WESTERN_RAILWAY" | "CENTRAL_RAILWAY";
  fromId: string;
  toId: string;
  distanceKm: number;
  geometry: GeoLocation[];
}

export const RAILWAY_CORRIDORS: Record<string, RailwayCorridor> = {
  RAIL_WESTERN_LINE: {
    id: "RAIL_WESTERN_LINE",
    name: "Western Railway (Churchgate ↔ Marine Lines ↔ Dadar)",
    line: "WESTERN_RAILWAY",
    fromId: "CHURCHGATE",
    toId: "DADAR",
    distanceKm: 9.2,
    geometry: [
      { latitude: 18.9355, longitude: 72.8272 }, // Churchgate
      { latitude: 18.9436, longitude: 72.8236 }, // Marine Lines
      { latitude: 18.9515, longitude: 72.8185 }, // Charni Road
      { latitude: 18.9620, longitude: 72.8160 }, // Grant Road
      { latitude: 18.9750, longitude: 72.8210 }, // Mumbai Central
      { latitude: 18.9950, longitude: 72.8310 }, // Lower Parel
      { latitude: 19.0183, longitude: 72.8434 }, // Dadar
    ],
  },
  RAIL_CENTRAL_LINE: {
    id: "RAIL_CENTRAL_LINE",
    name: "Central Railway (CSMT ↔ Byculla ↔ Dadar)",
    line: "CENTRAL_RAILWAY",
    fromId: "CSMT",
    toId: "DADAR",
    distanceKm: 8.8,
    geometry: [
      { latitude: 18.9400, longitude: 72.8353 }, // CSMT
      { latitude: 18.9530, longitude: 72.8375 }, // Masjid
      { latitude: 18.9650, longitude: 72.8380 }, // Sandhurst Rd
      { latitude: 18.9770, longitude: 72.8360 }, // Byculla
      { latitude: 18.9980, longitude: 72.8390 }, // Parel
      { latitude: 19.0183, longitude: 72.8434 }, // Dadar
    ],
  },
};

export const INITIAL_FLEET_CONFIG = {
  baseBuses: 16,
  busCapacity: 60,
  busSpeedKmh: 24,
  baseTaxis: 85,
  taxiCapacity: 3,
  taxiSpeedKmh: 30,
  taxiNominalDispatchRate: 25, // cabs per minute
  trainSpeedKmh: 45,
};

/**
 * Interpolates an exact (latitude, longitude) coordinate along a polyline array of GeoLocations
 * for a given progress ratio between 0.0 and 1.0.
 */
export function interpolatePolyline(points: GeoLocation[], progress: number): GeoLocation {
  if (!points || points.length === 0) {
    return { latitude: 18.9379, longitude: 72.8257 };
  }
  if (points.length === 1 || progress <= 0) return points[0];
  if (progress >= 1) return points[points.length - 1];

  const totalSegments = points.length - 1;
  const scaled = progress * totalSegments;
  const segIndex = Math.min(Math.floor(scaled), totalSegments - 1);
  const fraction = scaled - segIndex;

  const p1 = points[segIndex];
  const p2 = points[segIndex + 1];

  return {
    latitude: Number((p1.latitude + (p2.latitude - p1.latitude) * fraction).toFixed(6)),
    longitude: Number((p1.longitude + (p2.longitude - p1.longitude) * fraction).toFixed(6)),
  };
}
