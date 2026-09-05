import { RoadEdge, ScenarioId } from "@/types";
import { SCENARIOS } from "./mockScenarios";

export const MVP_ROAD_CORRIDORS: Omit<RoadEdge, "congestion" | "status" | "travelTimeMin">[] = [
  {
    id: "ROAD_MARINE_DR",
    name: "Marine Drive (Netaji Subhash Chandra Bose Rd)",
    fromId: "NARIMAN_POINT",
    toId: "CHOWPATTY",
    distanceKm: 3.6,
    capacity: 4500,
    geometry: [
      { latitude: 18.9255, longitude: 72.8220 },
      { latitude: 18.9320, longitude: 72.8235 },
      { latitude: 18.9378, longitude: 72.8242 },
      { latitude: 18.9432, longitude: 72.8230 },
      { latitude: 18.9530, longitude: 72.8180 },
    ],
  },
  {
    id: "ROAD_VEER_NARIMAN",
    name: "Veer Nariman Rd (Marine Dr ↔ Churchgate ↔ Fountain)",
    fromId: "MARINE_DRIVE",
    toId: "FLORA_FOUNTAIN",
    distanceKm: 1.1,
    capacity: 2200,
    geometry: [
      { latitude: 18.9332, longitude: 72.8235 },
      { latitude: 18.9348, longitude: 72.8270 },
      { latitude: 18.9325, longitude: 72.8315 },
    ],
  },
  {
    id: "ROAD_MAHARSHI_KARVE",
    name: "Maharshi Karve Rd (Queens Rd Corridor)",
    fromId: "CHURCHGATE",
    toId: "CHARNI_ROAD",
    distanceKm: 2.2,
    capacity: 3200,
    geometry: [
      { latitude: 18.9355, longitude: 72.8272 },
      { latitude: 18.9385, longitude: 72.8265 },
      { latitude: 18.9436, longitude: 72.8236 },
      { latitude: 18.9510, longitude: 72.8195 },
    ],
  },
  {
    id: "ROAD_DN_ROAD",
    name: "Dr. D.N. Road (CSMT ↔ Fort Transit Link)",
    fromId: "CSMT",
    toId: "HUTATMA_CHOWK",
    distanceKm: 1.4,
    capacity: 2800,
    geometry: [
      { latitude: 18.9400, longitude: 72.8353 },
      { latitude: 18.9360, longitude: 72.8330 },
      { latitude: 18.9330, longitude: 72.8285 },
    ],
  },
  {
    id: "ROAD_CENTRAL_SPINE",
    name: "Central Rail/Road Artery (Dadar ↔ South Mumbai)",
    fromId: "DADAR",
    toId: "CSMT",
    distanceKm: 9.8,
    capacity: 6500,
    geometry: [
      { latitude: 19.0183, longitude: 72.8434 },
      { latitude: 18.9950, longitude: 72.8400 },
      { latitude: 18.9700, longitude: 72.8350 },
      { latitude: 18.9400, longitude: 72.8353 },
    ],
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
      congestion,
      status,
      travelTimeMin,
    };
  });
}
