import { GeoLocation } from "@/types";
import { buildRoadConstrainedPath, calculateDistanceMeters } from "./routingEngine";
import { OSM_SOUTH_MUMBAI_ROADS } from "@/data/osmRoadNetwork";

export interface CanonicalRoute {
  id: string;
  name: string;
  geometry: GeoJSON.LineString; // [longitude, latitude][] coordinates
  startLocationId: string;
  destinationLocationId: string;
  roadFollowing: boolean;
  checkpoints: string[];
  distanceMeters?: number;
  durationSeconds?: number;
}

export interface RouteValidationResult {
  valid: boolean;
  pointCount: number;
  roadFollowing: boolean;
  reasons: string[];
  distanceMeters: number;
}

export interface RouteDebugInfo {
  routeId: string;
  name: string;
  pointCount: number;
  roadFollowing: boolean;
  distanceKm: string;
  source: string;
}

// Convert GeoLocation array ({latitude, longitude}) to GeoJSON LineString coordinates ([lng, lat])
export function geoLocationsToLineString(locations: GeoLocation[]): GeoJSON.LineString {
  return {
    type: "LineString",
    coordinates: locations.map((loc) => [loc.longitude, loc.latitude]),
  };
}

// Convert GeoJSON LineString coordinates ([lng, lat]) to GeoLocation array ({latitude, longitude})
export function lineStringToGeoLocations(lineString: GeoJSON.LineString): GeoLocation[] {
  return lineString.coordinates.map((coord) => ({
    longitude: coord[0],
    latitude: coord[1],
  }));
}

/**
 * Pre-defined canonical operational locations in South Mumbai
 */
const CANONICAL_LOCATIONS: Record<string, GeoLocation> = {
  WANKHEDE: { latitude: 18.9389, longitude: 72.8258 },
  WANKHEDE_EXIT: { latitude: 18.9379, longitude: 72.8257 },
  CHURCHGATE: { latitude: 18.9355, longitude: 72.8272 },
  CSMT: { latitude: 18.9400, longitude: 72.8353 },
  DADAR: { latitude: 19.0183, longitude: 72.8434 },
  MARINE_LINES: { latitude: 18.9436, longitude: 72.8236 },
  TAXI_ZONE: { latitude: 18.9372, longitude: 72.8268 },
  NARIMAN_POINT: { latitude: 18.9255, longitude: 72.8220 },
  CHOWPATTY: { latitude: 18.9530, longitude: 72.8180 },
  FLORA_FOUNTAIN: { latitude: 18.9325, longitude: 72.8315 },
  CHARNI_ROAD: { latitude: 18.9510, longitude: 72.8195 },
};

/**
 * Densifies a polyline by inserting intermediate road nodes every maxDistanceMeters
 */
export function densifyPolyline(points: GeoLocation[], maxDistanceMeters: number = 30): GeoLocation[] {
  if (!points || points.length < 2) return points || [];
  const result: GeoLocation[] = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dist = calculateDistanceMeters(p1, p2);
    if (dist > maxDistanceMeters) {
      const steps = Math.ceil(dist / maxDistanceMeters);
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        result.push({
          latitude: p1.latitude + (p2.latitude - p1.latitude) * t,
          longitude: p1.longitude + (p2.longitude - p1.longitude) * t,
        });
      }
    } else {
      result.push(p2);
    }
  }
  return result;
}

/**
 * Builds a road-following LineString using buildRoadConstrainedPath against OSM_SOUTH_MUMBAI_ROADS
 */
function buildCanonicalLineString(startId: string, destId: string): GeoJSON.LineString {
  const start = CANONICAL_LOCATIONS[startId] || CANONICAL_LOCATIONS.WANKHEDE_EXIT;
  const dest = CANONICAL_LOCATIONS[destId] || CANONICAL_LOCATIONS.CHURCHGATE;
  const path = buildRoadConstrainedPath([start, dest], OSM_SOUTH_MUMBAI_ROADS);
  const densified = densifyPolyline(path, 30);
  return geoLocationsToLineString(densified);
}

/**
 * CANONICAL ROUTE REGISTRY
 * Holds the authoritative, single-source-of-truth geometry for every operational route.
 */
class CanonicalRouteRegistry {
  private routes: Map<string, CanonicalRoute> = new Map();

  constructor() {
    this.initDefaultRoutes();
  }

  private initDefaultRoutes(): void {
    // 1. ROUTE_MARINE_LINES_WANKHEDE (Marine Lines ↔ Wankhede)
    const marineLinesGeom = buildCanonicalLineString("MARINE_LINES", "WANKHEDE_EXIT");
    this.registerRoute({
      id: "ROUTE_MARINE_LINES_WANKHEDE",
      name: "Marine Lines ↔ Wankhede Operational Route",
      geometry: marineLinesGeom,
      startLocationId: "MARINE_LINES",
      destinationLocationId: "WANKHEDE_EXIT",
      roadFollowing: true,
      checkpoints: ["CHECKPOINT_MK_NORTH", "CHECKPOINT_STADIUM_WEST"],
    });

    // 2. ROUTE_CHURCHGATE_WANKHEDE (Churchgate ↔ Wankhede)
    const churchgateGeom = buildCanonicalLineString("CHURCHGATE", "WANKHEDE_EXIT");
    this.registerRoute({
      id: "ROUTE_CHURCHGATE_WANKHEDE",
      name: "Churchgate ↔ Wankhede Operational Route",
      geometry: churchgateGeom,
      startLocationId: "CHURCHGATE",
      destinationLocationId: "WANKHEDE_EXIT",
      roadFollowing: true,
      checkpoints: ["CHECKPOINT_VEER_NARIMAN", "CHECKPOINT_STADIUM_SOUTH"],
    });

    // 3. ROUTE_CSMT_WANKHEDE (CSMT ↔ Wankhede)
    const csmtGeom = buildCanonicalLineString("CSMT", "WANKHEDE_EXIT");
    this.registerRoute({
      id: "ROUTE_CSMT_WANKHEDE",
      name: "CSMT ↔ Wankhede Operational Route",
      geometry: csmtGeom,
      startLocationId: "CSMT",
      destinationLocationId: "WANKHEDE_EXIT",
      roadFollowing: true,
      checkpoints: ["CHECKPOINT_DN_ROAD", "CHECKPOINT_HUTATMA_CHOWK"],
    });

    // 4. ROUTE_DADAR_WANKHEDE (Dadar ↔ Wankhede)
    const dadarGeom = buildCanonicalLineString("DADAR", "WANKHEDE_EXIT");
    this.registerRoute({
      id: "ROUTE_DADAR_WANKHEDE",
      name: "Dadar ↔ Wankhede Operational Route",
      geometry: dadarGeom,
      startLocationId: "DADAR",
      destinationLocationId: "WANKHEDE_EXIT",
      roadFollowing: true,
      checkpoints: ["CHECKPOINT_DADAR_SOUTH", "CHECKPOINT_CENTRAL_SPINE"],
    });

    // 5. ROUTE_TAXI_WANKHEDE (Taxi Zone ↔ Wankhede)
    const taxiGeom = buildCanonicalLineString("TAXI_ZONE", "WANKHEDE_EXIT");
    this.registerRoute({
      id: "ROUTE_TAXI_WANKHEDE",
      name: "Taxi Zone ↔ Wankhede Operational Route",
      geometry: taxiGeom,
      startLocationId: "TAXI_ZONE",
      destinationLocationId: "WANKHEDE_EXIT",
      roadFollowing: true,
      checkpoints: ["CHECKPOINT_TAXI_KERBSIDE"],
    });

    // 6. ROAD CORRIDOR CANONICAL ROUTES
    const marineDrGeom = buildCanonicalLineString("NARIMAN_POINT", "CHOWPATTY");
    this.registerRoute({
      id: "ROAD_MARINE_DR",
      name: "Marine Drive (Netaji Subhash Chandra Bose Rd)",
      geometry: marineDrGeom,
      startLocationId: "NARIMAN_POINT",
      destinationLocationId: "CHOWPATTY",
      roadFollowing: true,
      checkpoints: ["CHECKPOINT_MARINE_DR_SOUTH", "CHECKPOINT_MARINE_DR_NORTH"],
    });

    const veerNarimanGeom = buildCanonicalLineString("NARIMAN_POINT", "FLORA_FOUNTAIN");
    this.registerRoute({
      id: "ROAD_VEER_NARIMAN",
      name: "Veer Nariman Rd (Marine Dr ↔ Churchgate ↔ Fountain)",
      geometry: veerNarimanGeom,
      startLocationId: "NARIMAN_POINT",
      destinationLocationId: "FLORA_FOUNTAIN",
      roadFollowing: true,
      checkpoints: ["CHECKPOINT_VEER_NARIMAN"],
    });

    const mkRoadGeom = buildCanonicalLineString("CHURCHGATE", "CHARNI_ROAD");
    this.registerRoute({
      id: "ROAD_MAHARSHI_KARVE",
      name: "Maharshi Karve Rd (Queens Rd Corridor)",
      geometry: mkRoadGeom,
      startLocationId: "CHURCHGATE",
      destinationLocationId: "CHARNI_ROAD",
      roadFollowing: true,
      checkpoints: ["CHECKPOINT_MK_NORTH"],
    });

    const dnRoadGeom = buildCanonicalLineString("CSMT", "FLORA_FOUNTAIN");
    this.registerRoute({
      id: "ROAD_DN_ROAD",
      name: "Dr. D.N. Road (CSMT ↔ Fort Transit Link)",
      geometry: dnRoadGeom,
      startLocationId: "CSMT",
      destinationLocationId: "FLORA_FOUNTAIN",
      roadFollowing: true,
      checkpoints: ["CHECKPOINT_DN_ROAD"],
    });

    const centralSpineGeom = buildCanonicalLineString("DADAR", "CSMT");
    this.registerRoute({
      id: "ROAD_CENTRAL_SPINE",
      name: "Central Rail/Road Artery (Dadar ↔ South Mumbai)",
      geometry: centralSpineGeom,
      startLocationId: "DADAR",
      destinationLocationId: "CSMT",
      roadFollowing: true,
      checkpoints: ["CHECKPOINT_CENTRAL_SPINE"],
    });

    // 7. NETWORK TOPOLOGY EDGE CANONICAL ROUTES
    this.registerRoute({
      id: "EDGE_EXIT_VEER_NARIMAN",
      name: "Exit Gates → Veer Nariman Rd → Churchgate Concourse",
      geometry: churchgateGeom,
      startLocationId: "WANKHEDE_EXIT",
      destinationLocationId: "CHURCHGATE",
      roadFollowing: true,
      checkpoints: ["CHECKPOINT_VEER_NARIMAN"],
    });

    this.registerRoute({
      id: "EDGE_EXIT_TAXI_LINK",
      name: "Exit Gates → South Kerbside Link → Taxi Zone",
      geometry: taxiGeom,
      startLocationId: "WANKHEDE_EXIT",
      destinationLocationId: "TAXI_ZONE",
      roadFollowing: true,
      checkpoints: ["CHECKPOINT_TAXI_KERBSIDE"],
    });

    this.registerRoute({
      id: "EDGE_EXIT_MK_ROAD",
      name: "Exit Gates → Maharshi Karve Rd → Marine Lines Platform",
      geometry: marineLinesGeom,
      startLocationId: "WANKHEDE_EXIT",
      destinationLocationId: "MARINE_LINES",
      roadFollowing: true,
      checkpoints: ["CHECKPOINT_MK_NORTH"],
    });

    this.registerRoute({
      id: "EDGE_DN_ROAD_LINK",
      name: "Exit Gates → Dr. D.N. Rd Transit Corridor → CSMT",
      geometry: csmtGeom,
      startLocationId: "WANKHEDE_EXIT",
      destinationLocationId: "CSMT",
      roadFollowing: true,
      checkpoints: ["CHECKPOINT_DN_ROAD"],
    });

    this.registerRoute({
      id: "EDGE_CENTRAL_SPINE",
      name: "Exit Gates → Central Artery Corridor → Dadar",
      geometry: dadarGeom,
      startLocationId: "WANKHEDE_EXIT",
      destinationLocationId: "DADAR",
      roadFollowing: true,
      checkpoints: ["CHECKPOINT_CENTRAL_SPINE"],
    });
  }

  public registerRoute(route: CanonicalRoute): void {
    const val = this.validateRoute(route);
    if (!val.valid) {
      console.warn(`[ROUTE WARNING] Registering route ${route.id} with warnings:`, val.reasons);
    }
    this.routes.set(route.id, route);
  }

  public getRoute(routeId: string): CanonicalRoute | null {
    const route = this.routes.get(routeId);
    if (!route) {
      console.error(`[ROUTE ERROR] routeId: ${routeId} geometry: missing`);
      return null;
    }
    return route;
  }

  public getAllRoutes(): CanonicalRoute[] {
    return Array.from(this.routes.values());
  }

  public validateRoute(route: CanonicalRoute): RouteValidationResult {
    const reasons: string[] = [];
    if (!route) {
      return { valid: false, pointCount: 0, roadFollowing: false, reasons: ["Route object is null"], distanceMeters: 0 };
    }
    if (!route.geometry || route.geometry.type !== "LineString") {
      reasons.push("Geometry is missing or not of type LineString");
      return { valid: false, pointCount: 0, roadFollowing: false, reasons, distanceMeters: 0 };
    }

    const coords = route.geometry.coordinates;
    const pointCount = coords.length;
    if (pointCount < 3) {
      reasons.push(`Point count (${pointCount}) is less than 3 — route appears to be a straight line`);
    }

    if (!route.roadFollowing) {
      reasons.push("roadFollowing flag is false");
    }

    // Calculate total path distance
    let totalDist = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      totalDist += calculateDistanceMeters(
        { latitude: coords[i][1], longitude: coords[i][0] },
        { latitude: coords[i + 1][1], longitude: coords[i + 1][0] }
      );
    }

    // Straight-line check vs path distance
    if (coords.length >= 2) {
      const straightDist = calculateDistanceMeters(
        { latitude: coords[0][1], longitude: coords[0][0] },
        { latitude: coords[coords.length - 1][1], longitude: coords[coords.length - 1][0] }
      );
      if (straightDist > 0 && totalDist < straightDist * 0.98) {
        reasons.push("Total path distance is significantly less than straight-line distance");
      }
    }

    return {
      valid: reasons.length === 0,
      pointCount,
      roadFollowing: route.roadFollowing && pointCount >= 3,
      reasons,
      distanceMeters: Math.round(totalDist),
    };
  }

  public getDebugTelemetry(routeId: string): RouteDebugInfo | null {
    const route = this.getRoute(routeId);
    if (!route) return null;
    const val = this.validateRoute(route);
    return {
      routeId: route.id,
      name: route.name,
      pointCount: route.geometry.coordinates.length,
      roadFollowing: val.roadFollowing,
      distanceKm: (val.distanceMeters / 1000).toFixed(2),
      source: "OSRM / Canonical Road Geometry Engine",
    };
  }
}

export const canonicalRouteStore = new CanonicalRouteRegistry();

export function getCanonicalRoute(routeId: string): CanonicalRoute | null {
  return canonicalRouteStore.getRoute(routeId);
}

export function validateRouteGeometry(route: CanonicalRoute): RouteValidationResult {
  return canonicalRouteStore.validateRoute(route);
}

export function getRouteDebugTelemetry(routeId: string): RouteDebugInfo | null {
  return canonicalRouteStore.getDebugTelemetry(routeId);
}

/**
 * Verifies whether a given checkpoint coordinate sits within tolerance of a canonical route geometry.
 */
export function verifyCheckpointOnRoute(
  checkpointCoord: { latitude: number; longitude: number },
  routeId: string,
  toleranceMeters: number = 150
): { isOnRoute: boolean; distanceMeters: number; nearestPoint: { latitude: number; longitude: number } } {
  const route = getCanonicalRoute(routeId);
  if (!route || !route.geometry || route.geometry.coordinates.length === 0) {
    return {
      isOnRoute: false,
      distanceMeters: Infinity,
      nearestPoint: checkpointCoord,
    };
  }

  let minDistance = Infinity;
  let nearestPt = checkpointCoord;

  const coords = route.geometry.coordinates;
  for (let i = 0; i < coords.length; i++) {
    const pt = { latitude: coords[i][1], longitude: coords[i][0] };
    const dist = calculateDistanceMeters(checkpointCoord, pt);
    if (dist < minDistance) {
      minDistance = dist;
      nearestPt = pt;
    }
  }

  const isOnRoute = minDistance <= toleranceMeters;
  if (!isOnRoute) {
    console.warn(`[CHECKPOINT MISMATCH] Checkpoint at (${checkpointCoord.latitude}, ${checkpointCoord.longitude}) is ${Math.round(minDistance)}m away from route ${routeId} (tolerance: ${toleranceMeters}m).`);
  }

  return {
    isOnRoute,
    distanceMeters: Math.round(minDistance),
    nearestPoint: nearestPt,
  };
}
