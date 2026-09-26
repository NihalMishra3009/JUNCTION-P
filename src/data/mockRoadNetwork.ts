import { RoadEdge, ScenarioId } from "@/types";
import { SCENARIOS } from "./mockScenarios";
import { canonicalRouteStore, lineStringToGeoLocations } from "@/services/canonicalRouteStore";

function getCanonicalGeoLocations(routeId: string) {
  const route = canonicalRouteStore.getRoute(routeId);
  if (!route) {
    console.error(`[ROUTE ERROR] mockRoadNetwork failed to resolve routeId: ${routeId}`);
    return [];
  }
  return lineStringToGeoLocations(route.geometry);
}

export const MVP_ROAD_CORRIDORS: Omit<RoadEdge, "congestion" | "status" | "travelTimeMin">[] = [
  {
    id: "ROAD_MARINE_DR",
    name: "Marine Drive (Netaji Subhash Chandra Bose Rd)",
    fromId: "NARIMAN_POINT",
    toId: "CHOWPATTY",
    distanceKm: 3.6,
    capacity: 4500,
    geometry: getCanonicalGeoLocations("ROAD_MARINE_DR"),
  },
  {
    id: "ROAD_VEER_NARIMAN",
    name: "Veer Nariman Rd (Marine Dr ↔ Churchgate ↔ Fountain)",
    fromId: "MARINE_DRIVE",
    toId: "FLORA_FOUNTAIN",
    distanceKm: 1.1,
    capacity: 2200,
    geometry: getCanonicalGeoLocations("ROAD_VEER_NARIMAN"),
  },
  {
    id: "ROAD_MAHARSHI_KARVE",
    name: "Maharshi Karve Rd (Queens Rd Corridor)",
    fromId: "CHURCHGATE",
    toId: "CHARNI_ROAD",
    distanceKm: 2.2,
    capacity: 3200,
    geometry: getCanonicalGeoLocations("ROAD_MAHARSHI_KARVE"),
  },
  {
    id: "ROAD_DN_ROAD",
    name: "Dr. D.N. Road (CSMT ↔ Fort Transit Link)",
    fromId: "CSMT",
    toId: "HUTATMA_CHOWK",
    distanceKm: 1.4,
    capacity: 2800,
    geometry: getCanonicalGeoLocations("ROAD_DN_ROAD"),
  },
  {
    id: "ROAD_CENTRAL_SPINE",
    name: "Central Rail/Road Artery (Dadar ↔ South Mumbai)",
    fromId: "DADAR",
    toId: "CSMT",
    distanceKm: 9.8,
    capacity: 6500,
    geometry: getCanonicalGeoLocations("ROAD_CENTRAL_SPINE"),
  },
];

export function getRoadNetwork(scenario: ScenarioId, redistributionApplied = false): RoadEdge[] {
  const s = SCENARIOS[scenario] || SCENARIOS.NORMAL;
  const ttMultiplier = s.travelTimeMultiplier || 1.0;
  const marinePd = s.pressure.ROAD_MARINE_DR?.pressure ?? 65;
  const churchgatePd = s.pressure.ROAD_CHURCHGATE?.pressure ?? 60;

  return MVP_ROAD_CORRIDORS.map(corridor => {
    let congestion = 50;
    let baseTimeMin = Math.round((corridor.distanceKm || 2) * 3);

    if (corridor.id === "ROAD_MARINE_DR") {
      congestion = marinePd;
      if (redistributionApplied) congestion = Math.max(40, congestion - 6);
    } else if (corridor.id === "ROAD_VEER_NARIMAN" || corridor.id === "ROAD_MAHARSHI_KARVE") {
      congestion = churchgatePd;
      if (redistributionApplied) congestion = Math.max(40, congestion - 8);
    } else if (corridor.id === "ROAD_DN_ROAD") {
      congestion = Math.round((s.pressure.CSMT?.pressure ?? 60) * 0.95);
    } else if (corridor.id === "ROAD_CENTRAL_SPINE") {
      congestion = Math.round((s.pressure.DADAR?.pressure ?? 55) * 0.9);
      if (redistributionApplied) congestion = Math.min(85, congestion + 8);
    }

    let status: RoadEdge["status"] = "NORMAL";
    if (congestion >= 90) status = "DISRUPTED";
    else if (congestion >= 80) status = "CONGESTED";
    else if (congestion >= 65) status = "HEAVY";

    const travelTimeMin = Math.round(baseTimeMin * ttMultiplier * (1 + (congestion - 50) / 100));

    return {
      ...corridor,
      geometry: getCanonicalGeoLocations(corridor.id),
      congestion,
      status,
      travelTimeMin,
    };
  });
}
