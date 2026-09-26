import { GeoLocation } from "@/types";
import { canonicalRouteStore, lineStringToGeoLocations } from "@/services/canonicalRouteStore";

export interface NetworkEdge {
  id: string;
  name: string;
  fromNodeId: string;
  toNodeId: string;
  lengthMeters: number;
  capacity: number; // Max concurrent human load
  geometry: GeoLocation[];
}

function getCanonicalGeoLocations(routeId: string) {
  const route = canonicalRouteStore.getRoute(routeId);
  if (!route) {
    console.error(`[ROUTE ERROR] mockNetworkTopology failed to resolve routeId: ${routeId}`);
    return [];
  }
  return lineStringToGeoLocations(route.geometry);
}

export const MVP_NETWORK_EDGES: Record<string, NetworkEdge> = {
  EDGE_EXIT_VEER_NARIMAN: {
    id: "EDGE_EXIT_VEER_NARIMAN",
    name: "Exit Gates → Veer Nariman Rd → Churchgate Concourse",
    fromNodeId: "WANKHEDE_EXIT",
    toNodeId: "CHURCHGATE",
    lengthMeters: 480,
    capacity: 5000,
    geometry: getCanonicalGeoLocations("EDGE_EXIT_VEER_NARIMAN"),
  },
  EDGE_EXIT_TAXI_LINK: {
    id: "EDGE_EXIT_TAXI_LINK",
    name: "Exit Gates → South Kerbside Link → Taxi Zone",
    fromNodeId: "WANKHEDE_EXIT",
    toNodeId: "TAXI_ZONE",
    lengthMeters: 220,
    capacity: 2500,
    geometry: getCanonicalGeoLocations("EDGE_EXIT_TAXI_LINK"),
  },
  EDGE_EXIT_MK_ROAD: {
    id: "EDGE_EXIT_MK_ROAD",
    name: "Exit Gates → Maharshi Karve Rd → Marine Lines Platform",
    fromNodeId: "WANKHEDE_EXIT",
    toNodeId: "MARINE_LINES",
    lengthMeters: 680,
    capacity: 3500,
    geometry: getCanonicalGeoLocations("EDGE_EXIT_MK_ROAD"),
  },
  EDGE_DN_ROAD_LINK: {
    id: "EDGE_DN_ROAD_LINK",
    name: "Exit Gates → Dr. D.N. Rd Transit Corridor → CSMT",
    fromNodeId: "WANKHEDE_EXIT",
    toNodeId: "CSMT",
    lengthMeters: 1350,
    capacity: 3000,
    geometry: getCanonicalGeoLocations("EDGE_DN_ROAD_LINK"),
  },
  EDGE_CENTRAL_SPINE: {
    id: "EDGE_CENTRAL_SPINE",
    name: "Exit Gates → Central Artery Corridor → Dadar",
    fromNodeId: "WANKHEDE_EXIT",
    toNodeId: "DADAR",
    lengthMeters: 9800,
    capacity: 6000,
    geometry: getCanonicalGeoLocations("EDGE_CENTRAL_SPINE"),
  },
};

// Explicit pre-indexed paths connecting Wankhede Exit to key dispersal hubs
export const NETWORK_PATHS: Record<string, string[]> = {
  CHURCHGATE: ["EDGE_EXIT_VEER_NARIMAN"],
  TAXI_ZONE: ["EDGE_EXIT_TAXI_LINK"],
  MARINE_LINES: ["EDGE_EXIT_MK_ROAD"],
  CSMT: ["EDGE_DN_ROAD_LINK"],
  DADAR: ["EDGE_CENTRAL_SPINE"],
};

export function getNetworkEdge(edgeId: string): NetworkEdge | undefined {
  return MVP_NETWORK_EDGES[edgeId];
}

export function getPathForDestination(destId: string): string[] | undefined {
  return NETWORK_PATHS[destId];
}

/**
 * Interpolates an exact (latitude, longitude) coordinate along a multi-point polyline edge
 * given progress p between 0.0 and 1.0.
 */
export function interpolateEdgePosition(edgeId: string, progress: number): GeoLocation {
  const edge = MVP_NETWORK_EDGES[edgeId];
  if (!edge || edge.geometry.length === 0) {
    return { latitude: 18.9379, longitude: 72.8257 };
  }
  const coords = edge.geometry;
  if (coords.length === 1 || progress <= 0) return coords[0];
  if (progress >= 1) return coords[coords.length - 1];

  // Distribute progress across segments
  const totalSegments = coords.length - 1;
  const scaledProgress = progress * totalSegments;
  const segIndex = Math.min(Math.floor(scaledProgress), totalSegments - 1);
  const segFraction = scaledProgress - segIndex;

  const p1 = coords[segIndex];
  const p2 = coords[segIndex + 1];

  return {
    latitude: p1.latitude + (p2.latitude - p1.latitude) * segFraction,
    longitude: p1.longitude + (p2.longitude - p1.longitude) * segFraction,
  };
}
