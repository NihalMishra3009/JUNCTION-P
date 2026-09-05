import { Restaurant, ScenarioId } from "@/types";

export const MOCK_RESTAURANTS_BASE: Restaurant[] = [
  {
    id: "R1", name: "Trishna", cuisine: "Coastal Seafood", zone: "ZONE_A",
    location: { latitude: 18.9282, longitude: 72.8318 },
    capacity: 80, currentOccupancy: 76, availableTables: 2,
    waitTime: 55, predictedWaitTime: 75, distanceFromVenue: 8,
    pressure: 91, pressureLevel: "CRITICAL",
    source: "SIMULATED", hasIncentive: false, recommended: false,
  },
  {
    id: "R2", name: "Bade Miya", cuisine: "Street & Kebabs", zone: "ZONE_A",
    location: { latitude: 18.9238, longitude: 72.8324 },
    capacity: 60, currentOccupancy: 54, availableTables: 3,
    waitTime: 42, predictedWaitTime: 60, distanceFromVenue: 10,
    pressure: 84, pressureLevel: "HIGH",
    source: "SIMULATED", hasIncentive: false, recommended: false,
  },
  {
    id: "R3", name: "Britannia & Co.", cuisine: "Parsi Irani Café", zone: "ZONE_B",
    location: { latitude: 18.9372, longitude: 72.8396 },
    capacity: 120, currentOccupancy: 88, availableTables: 8,
    waitTime: 15, predictedWaitTime: 28, distanceFromVenue: 14,
    pressure: 68, pressureLevel: "WATCH",
    source: "SIMULATED", hasIncentive: false, recommended: true,
  },
  {
    id: "R4", name: "Café Madras", cuisine: "South Indian", zone: "ZONE_C",
    location: { latitude: 19.0278, longitude: 72.8556 },
    capacity: 90, currentOccupancy: 42, availableTables: 18,
    waitTime: 5, predictedWaitTime: 12, distanceFromVenue: 24,
    pressure: 46, pressureLevel: "NORMAL",
    source: "SIMULATED", hasIncentive: true, incentiveLabel: "10% OFF for event guests",
    recommended: true,
  },
  {
    id: "R5", name: "Shalimar Restaurant", cuisine: "Mughlai & Kebabs", zone: "ZONE_C",
    location: { latitude: 18.9565, longitude: 72.8335 },
    capacity: 150, currentOccupancy: 58, availableTables: 25,
    waitTime: 8, predictedWaitTime: 15, distanceFromVenue: 22,
    pressure: 42, pressureLevel: "NORMAL",
    source: "SIMULATED", hasIncentive: true, incentiveLabel: "IPL Special Thali",
    recommended: false,
  },
];

export function getRestaurants(scenario?: ScenarioId): Restaurant[] {
  if (!scenario || scenario === "NORMAL") return MOCK_RESTAURANTS_BASE;

  return MOCK_RESTAURANTS_BASE.map(r => {
    let waitMultiplier = 1.0;
    if (scenario === "POST_EVENT_SURGE") {
      waitMultiplier = r.zone === "ZONE_A" ? 1.4 : r.zone === "ZONE_B" ? 1.2 : 1.0;
    } else if (scenario === "HEAVY_RAIN") {
      waitMultiplier = r.zone === "ZONE_A" ? 1.2 : 0.9;
    }
    const waitTime = Math.round(r.waitTime * waitMultiplier);
    const predictedWaitTime = Math.round(r.predictedWaitTime * waitMultiplier);
    const pressure = Math.min(99, Math.round(r.pressure * (waitMultiplier > 1 ? 1.1 : 1.0)));
    return {
      ...r,
      waitTime,
      predictedWaitTime,
      pressure,
    };
  });
}
