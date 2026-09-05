import { Hotel } from "@/types";

export const MOCK_HOTELS_BASE: Hotel[] = [
  {
    id: "H1", name: "Trident Nariman Point", zone: "ZONE_A",
    totalRooms: 540, availableRooms: 12, usableRooms: 8,
    expectedCheckIns: 24, expectedCheckOuts: 18,
    travelTimeToVenue: 12, pressure: 91,
    pressureLevel: "CRITICAL", transportConnectivity: "EXCELLENT",
    eventDemand: "VERY_HIGH", source: "SIMULATED",
    priceRange: "₹18,000 – ₹32,000",
  },
  {
    id: "H2", name: "Intercontinental Marine Drive", zone: "ZONE_A",
    totalRooms: 410, availableRooms: 6, usableRooms: 4,
    expectedCheckIns: 19, expectedCheckOuts: 12,
    travelTimeToVenue: 15, pressure: 88,
    pressureLevel: "HIGH", transportConnectivity: "EXCELLENT",
    eventDemand: "VERY_HIGH", source: "SIMULATED",
    priceRange: "₹14,000 – ₹28,000",
  },
  {
    id: "H3", name: "Hotel Marine Plaza", zone: "ZONE_B",
    totalRooms: 68, availableRooms: 9, usableRooms: 7,
    expectedCheckIns: 11, expectedCheckOuts: 8,
    travelTimeToVenue: 18, pressure: 74,
    pressureLevel: "WATCH", transportConnectivity: "GOOD",
    eventDemand: "HIGH", source: "SIMULATED",
    priceRange: "₹7,000 – ₹12,000",
  },
  {
    id: "H4", name: "Ramada by Wyndham Dadar", zone: "ZONE_C",
    totalRooms: 250, availableRooms: 62, usableRooms: 48,
    expectedCheckIns: 27, expectedCheckOuts: 14,
    travelTimeToVenue: 22, pressure: 52,
    pressureLevel: "NORMAL", transportConnectivity: "GOOD",
    eventDemand: "MODERATE", source: "SIMULATED",
    priceRange: "₹4,500 – ₹8,000",
  },
  {
    id: "H5", name: "Hotel Kohinoor Dadar", zone: "ZONE_C",
    totalRooms: 180, availableRooms: 38, usableRooms: 31,
    expectedCheckIns: 18, expectedCheckOuts: 9,
    travelTimeToVenue: 25, pressure: 48,
    pressureLevel: "NORMAL", transportConnectivity: "GOOD",
    eventDemand: "LOW", source: "SIMULATED",
    priceRange: "₹3,200 – ₹6,000",
  },
];
