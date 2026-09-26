import { Resource, PressureLevel } from "@/types";

export function getPressureLevel(p: number): PressureLevel {
  if (p < 70) return "NORMAL";
  if (p < 85) return "WATCH";
  if (p < 95) return "HIGH";
  return "CRITICAL";
}

export const STATIC_RESOURCES: Omit<Resource, "pressure"|"pressureLevel"|"currentUtilization"|"availableCapacity"|"predictedDemand"|"trend">[] = [
  {
    id: "WANKHEDE", type: "VENUE", name: "Wankhede Stadium",
    shortName: "Wankhede", zone: "SOUTH_MUMBAI",
    location: { latitude: 18.9389, longitude: 72.8258 },
    mapPos: { x: 320, y: 290 },
    totalCapacity: 33000, operatingStatus: "OPERATIONAL",
    confidence: 0.99, source: "SIMULATED",
    connectedTransport: ["CHURCHGATE", "MARINE_LINES"],
    description: "Primary event venue — IPL Match",
  },
  {
    id: "CHURCHGATE", type: "STATION", name: "Churchgate Station",
    shortName: "Churchgate", zone: "CHURCHGATE",
    location: { latitude: 18.9355, longitude: 72.8272 },
    mapPos: { x: 220, y: 350 },
    totalCapacity: 10000, operatingStatus: "OPERATIONAL",
    confidence: 0.95, source: "SIMULATED",
    connectedTransport: ["WESTERN_RAILWAY"],
    description: "Western Railway terminus — major exit point",
  },
  {
    id: "CSMT", type: "STATION", name: "CSMT",
    shortName: "CSMT", zone: "FORT",
    location: { latitude: 18.9400, longitude: 72.8353 },
    mapPos: { x: 450, y: 240 },
    totalCapacity: 14000, operatingStatus: "OPERATIONAL",
    confidence: 0.95, source: "SIMULATED",
    connectedTransport: ["CENTRAL_RAILWAY", "HARBOUR_LINE"],
    description: "Chhatrapati Shivaji Maharaj Terminus",
  },
  {
    id: "DADAR", type: "STATION", name: "Dadar Station",
    shortName: "Dadar", zone: "DADAR",
    location: { latitude: 19.0183, longitude: 72.8434 },
    mapPos: { x: 380, y: 130 },
    totalCapacity: 18000, operatingStatus: "OPERATIONAL",
    confidence: 0.93, source: "SIMULATED",
    connectedTransport: ["WESTERN_RAILWAY", "CENTRAL_RAILWAY"],
    description: "Major interchange — Western & Central lines",
  },
  {
    id: "MARINE_LINES", type: "STATION", name: "Marine Lines Station",
    shortName: "Marine Lines", zone: "MARINE_LINES",
    location: { latitude: 18.9436, longitude: 72.8236 },
    mapPos: { x: 260, y: 295 },
    totalCapacity: 8000, operatingStatus: "OPERATIONAL",
    confidence: 0.90, source: "SIMULATED",
    connectedTransport: ["WESTERN_RAILWAY"],
    description: "Western Railway station near venue",
  },
  {
    id: "TAXI_ZONE", type: "PICKUP_ZONE", name: "Wankhede Taxi & Rideshare Zone",
    shortName: "Taxi Zone", zone: "SOUTH_MUMBAI",
    location: { latitude: 18.9372, longitude: 72.8268 },
    mapPos: { x: 370, y: 340 },
    totalCapacity: 200, operatingStatus: "OPERATIONAL",
    confidence: 0.85, source: "SIMULATED",
    connectedTransport: [],
    description: "Primary pickup zone south of stadium",
  },
  {
    id: "WANKHEDE_EXIT", type: "VENUE", name: "Wankhede Exit Gates",
    shortName: "Exit Gates", zone: "SOUTH_MUMBAI",
    location: { latitude: 18.9379, longitude: 72.8257 },
    mapPos: { x: 320, y: 345 },
    totalCapacity: 4000, operatingStatus: "OPERATIONAL",
    confidence: 0.95, source: "SIMULATED",
    connectedTransport: ["CHURCHGATE", "MARINE_LINES"],
    description: "Stadium exit — combined dispersal bottleneck post-match",
  },
  {
    id: "WANKHEDE_EXIT_GATE_1", type: "VENUE", name: "Wankhede Stadium — Exit Gate 1",
    shortName: "Exit Gate 1", zone: "SOUTH_MUMBAI",
    location: { latitude: 18.9385, longitude: 72.8252 },
    mapPos: { x: 310, y: 340 },
    totalCapacity: 2200, operatingStatus: "OPERATIONAL",
    confidence: 0.96, source: "SIMULATED",
    connectedTransport: ["MARINE_LINES"],
    description: "North perimeter turnstiles and egress chute toward Marine Drive.",
  },
  {
    id: "WANKHEDE_EXIT_GATE_2", type: "VENUE", name: "Wankhede Stadium — Exit Gate 2",
    shortName: "Exit Gate 2", zone: "SOUTH_MUMBAI",
    location: { latitude: 18.9375, longitude: 72.8262 },
    mapPos: { x: 330, y: 350 },
    totalCapacity: 1800, operatingStatus: "OPERATIONAL",
    confidence: 0.97, source: "SIMULATED",
    connectedTransport: ["CHURCHGATE", "TAXI_ZONE"],
    description: "South perimeter turnstiles leading directly to Churchgate and Taxi Staging.",
  },
];
