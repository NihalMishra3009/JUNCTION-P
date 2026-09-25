import { GeoLocation } from "@/types";
import { OSM_SOUTH_MUMBAI_ROADS, OsmRoadSegment } from "@/data/osmRoadNetwork";

export interface RouteResult {
  distanceKm: number;
  estimatedTimeMin: number;
  path: GeoLocation[];
  roadNames: string[];
  segments: OsmRoadSegment[];
  isValidRoute: boolean;
  congestionFactor: number; // 1.0 (free flow) to 3.5 (gridlock)
  warning?: string;
}

export interface RoutingProvider {
  getRoute(start: GeoLocation, end: GeoLocation, congestionOverrides?: Record<string, number>): Promise<RouteResult>;
  getMultiPointRoute(waypoints: GeoLocation[], congestionOverrides?: Record<string, number>): Promise<RouteResult>;
}

/**
 * Calculates straight line distance (Haversine approximation in meters) between two coordinates
 */
export function calculateDistanceMeters(p1: GeoLocation, p2: GeoLocation): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const dLng = ((p2.longitude - p1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.latitude * Math.PI) / 180) *
      Math.cos((p2.latitude * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates heading angle in degrees (0 to 360) from p1 to p2
 */
export function calculateHeadingAngle(p1: GeoLocation, p2: GeoLocation): number {
  const dLng = ((p2.longitude - p1.longitude) * Math.PI) / 180;
  const lat1 = (p1.latitude * Math.PI) / 180;
  const lat2 = (p2.latitude * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Performs distance-based spatial interpolation along path coordinates given a traveled ratio (0.0 to 1.0)
 */
export function interpolatePathByDistance(path: GeoLocation[], progressRatio: number): { position: GeoLocation; heading: number } {
  if (!path || path.length === 0) {
    return { position: { latitude: 18.9389, longitude: 72.8258 }, heading: 0 };
  }
  if (path.length === 1 || progressRatio <= 0) {
    const heading = path.length >= 2 ? calculateHeadingAngle(path[0], path[1]) : 0;
    return { position: path[0], heading };
  }
  if (progressRatio >= 1) {
    const heading = path.length >= 2 ? calculateHeadingAngle(path[path.length - 2], path[path.length - 1]) : 0;
    return { position: path[path.length - 1], heading };
  }

  // Calculate cumulative segment distances in meters
  const distances: number[] = [0];
  let totalDistance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = calculateDistanceMeters(path[i], path[i + 1]);
    totalDistance += d;
    distances.push(totalDistance);
  }

  const targetMeters = progressRatio * totalDistance;

  // Find active segment index
  let segIndex = 0;
  while (segIndex < distances.length - 1 && distances[segIndex + 1] < targetMeters) {
    segIndex++;
  }

  if (segIndex >= path.length - 1) {
    return { position: path[path.length - 1], heading: 0 };
  }

  const p1 = path[segIndex];
  const p2 = path[segIndex + 1];
  const segStartDist = distances[segIndex];
  const segLen = distances[segIndex + 1] - segStartDist;
  const segFraction = segLen > 0 ? (targetMeters - segStartDist) / segLen : 0;

  const lat = p1.latitude + (p2.latitude - p1.latitude) * segFraction;
  const lng = p1.longitude + (p2.longitude - p1.longitude) * segFraction;
  const heading = calculateHeadingAngle(p1, p2);

  return {
    position: { latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) },
    heading,
  };
}

/**
 * Snaps any arbitrary coordinate to the nearest vertex on the OSM road network
 */
export function snapPointToNearestRoad(
  pt: GeoLocation,
  segments: OsmRoadSegment[] = OSM_SOUTH_MUMBAI_ROADS
): { snapped: GeoLocation; segment: OsmRoadSegment; vertexIndex: number } {
  let minDistance = Infinity;
  let bestPt = pt;
  let bestSeg = segments[0] || OSM_SOUTH_MUMBAI_ROADS[0];
  let bestIdx = 0;

  for (const seg of segments) {
    if (!seg.geometry || seg.geometry.length === 0) continue;
    seg.geometry.forEach((v, idx) => {
      const dist = calculateDistanceMeters(pt, v);
      if (dist < minDistance) {
        minDistance = dist;
        bestPt = v;
        bestSeg = seg;
        bestIdx = idx;
      }
    });
  }

  return { snapped: bestPt, segment: bestSeg, vertexIndex: bestIdx };
}

/**
 * Builds a 100% road-constrained polyline path following OSM road network centerlines and turns
 */
export function buildRoadConstrainedPath(
  waypoints: GeoLocation[],
  segments: OsmRoadSegment[] = OSM_SOUTH_MUMBAI_ROADS
): GeoLocation[] {
  if (!waypoints || waypoints.length === 0) return [];
  if (waypoints.length === 1) {
    const s = snapPointToNearestRoad(waypoints[0], segments);
    return [s.snapped];
  }

  const fullPath: GeoLocation[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const startWp = waypoints[i];
    const endWp = waypoints[i + 1];

    const startSnap = snapPointToNearestRoad(startWp, segments);
    const endSnap = snapPointToNearestRoad(endWp, segments);

    if (startSnap.segment.id === endSnap.segment.id) {
      const seg = startSnap.segment;
      const idx1 = startSnap.vertexIndex;
      const idx2 = endSnap.vertexIndex;
      const step = idx1 <= idx2 ? 1 : -1;
      for (let k = idx1; idx1 <= idx2 ? k <= idx2 : k >= idx2; k += step) {
        const pt = seg.geometry[k];
        if (fullPath.length === 0 || calculateDistanceMeters(fullPath[fullPath.length - 1], pt) > 2) {
          fullPath.push(pt);
        }
      }
    } else {
      const seg1 = startSnap.segment;
      const seg2 = endSnap.segment;

      let bestSeg1Idx = seg1.geometry.length - 1;
      let minSegDist = Infinity;
      seg1.geometry.forEach((v1, idx) => {
        seg2.geometry.forEach((v2) => {
          const d = calculateDistanceMeters(v1, v2);
          if (d < minSegDist) {
            minSegDist = d;
            bestSeg1Idx = idx;
          }
        });
      });

      const step1 = startSnap.vertexIndex <= bestSeg1Idx ? 1 : -1;
      for (let k = startSnap.vertexIndex; startSnap.vertexIndex <= bestSeg1Idx ? k <= bestSeg1Idx : k >= bestSeg1Idx; k += step1) {
        const pt = seg1.geometry[k];
        if (fullPath.length === 0 || calculateDistanceMeters(fullPath[fullPath.length - 1], pt) > 2) {
          fullPath.push(pt);
        }
      }

      let bestSeg2Idx = 0;
      minSegDist = Infinity;
      const lastPt = fullPath[fullPath.length - 1] || startSnap.snapped;
      seg2.geometry.forEach((v2, idx) => {
        const d = calculateDistanceMeters(lastPt, v2);
        if (d < minSegDist) {
          minSegDist = d;
          bestSeg2Idx = idx;
        }
      });

      const step2 = bestSeg2Idx <= endSnap.vertexIndex ? 1 : -1;
      for (let k = bestSeg2Idx; bestSeg2Idx <= endSnap.vertexIndex ? k <= endSnap.vertexIndex : k >= endSnap.vertexIndex; k += step2) {
        const pt = seg2.geometry[k];
        if (fullPath.length === 0 || calculateDistanceMeters(fullPath[fullPath.length - 1], pt) > 2) {
          fullPath.push(pt);
        }
      }
    }
  }

  return fullPath;
}

/**
 * OpenStreetMap Real Road Routing Provider implementation
 */
export class OsmRoadRoutingProvider implements RoutingProvider {
  async getRoute(start: GeoLocation, end: GeoLocation, congestionOverrides?: Record<string, number>): Promise<RouteResult> {
    return this.getMultiPointRoute([start, end], congestionOverrides);
  }

  async getMultiPointRoute(waypoints: GeoLocation[], congestionOverrides?: Record<string, number>): Promise<RouteResult> {
    if (!waypoints || waypoints.length === 0) {
      return {
        distanceKm: 0,
        estimatedTimeMin: 0,
        path: [],
        roadNames: [],
        segments: [],
        isValidRoute: false,
        congestionFactor: 1.0,
        warning: "No waypoints provided for path calculation.",
      };
    }

    const path = buildRoadConstrainedPath(waypoints, OSM_SOUTH_MUMBAI_ROADS);
    if (path.length === 0) {
      return {
        distanceKm: 0,
        estimatedTimeMin: 0,
        path: [],
        roadNames: [],
        segments: [],
        isValidRoute: false,
        congestionFactor: 1.0,
        warning: "Unable to find connected road network path between specified points.",
      };
    }

    const roadNamesSet = new Set<string>();
    let totalCongestion = 0;
    let countedSegments = 0;

    waypoints.forEach((wp) => {
      const snap = snapPointToNearestRoad(wp, OSM_SOUTH_MUMBAI_ROADS);
      if (snap.segment) {
        roadNamesSet.add(snap.segment.name);
        const override = congestionOverrides?.[snap.segment.id];
        const segCongestion = override !== undefined ? override : (snap.segment.congestion || 30);
        totalCongestion += segCongestion;
        countedSegments++;
      }
    });

    let totalMeters = 0;
    for (let i = 0; i < path.length - 1; i++) {
      totalMeters += calculateDistanceMeters(path[i], path[i + 1]);
    }

    const distanceKm = Number((totalMeters / 1000).toFixed(2));
    const avgCongestion = countedSegments > 0 ? totalCongestion / countedSegments : 30;
    // Congestion multiplier: 1.0 (0% congestion) to 3.0 (100% gridlock)
    const congestionFactor = Number((1.0 + (avgCongestion / 100) * 2.0).toFixed(2));
    const baseTimeMin = distanceKm * 2.5; // ~24 km/h baseline urban speed
    const estimatedTimeMin = Math.max(1, Math.round(baseTimeMin * congestionFactor));

    return {
      distanceKm,
      estimatedTimeMin,
      path,
      roadNames: Array.from(roadNamesSet),
      segments: OSM_SOUTH_MUMBAI_ROADS,
      isValidRoute: true,
      congestionFactor,
    };
  }
}

export const defaultRoutingProvider = new OsmRoadRoutingProvider();
