import {
  ZoneDefinition,
  ZoneState,
  ZoneTier,
  ZoneCoverageProfile,
  MonitoringStatus,
  Resource,
  Hotel,
  SimulationState,
  ScenarioId,
} from "@/types";
import { getPressureLevel } from "@/data/mockResources";
import { SCENARIOS } from "@/data/mockScenarios";

// ============================================================
// JUNCTION - Tiered Zone Registry & Explicit Coverage Contracts
// ============================================================

export const OPERATIONAL_ZONES: ZoneDefinition[] = [
  {
    id: "ZONE_WANKHEDE",
    name: "Wankhede Stadium & Perimeter Concourse",
    shortName: "Wankhede Concourse",
    tier: "TIER_1_CRITICAL",
    defaultMonitoringStatus: "CONTINUOUS",
    center: { latitude: 18.9389, longitude: 72.8258 },
    radiusMeters: 350,
    resourceIds: ["WANKHEDE", "WANKHEDE_EXIT"],
    hotelIds: [],
    connectedRoadIds: ["ROAD_MARINE_DR", "ROAD_VEER_NARIMAN", "ROAD_MAHARSHI_KARVE"],
    nominalPedestrianCapacity: 37000,
    nominalTransitCapacity: 0,
    description: "Primary mega-event venue bowl, turnstiles, and perimeter egress concourse.",
  },
  {
    id: "ZONE_CHURCHGATE",
    name: "Churchgate Western Railway Terminal Hub",
    shortName: "Churchgate Station",
    tier: "TIER_1_CRITICAL",
    defaultMonitoringStatus: "CONTINUOUS",
    center: { latitude: 18.9355, longitude: 72.8272 },
    radiusMeters: 280,
    resourceIds: ["CHURCHGATE"],
    hotelIds: ["H2"], // Ambassador Hotel in Zone A/Churchgate
    connectedRoadIds: ["ROAD_VEER_NARIMAN", "ROAD_MAHARSHI_KARVE"],
    nominalPedestrianCapacity: 10000,
    nominalTransitCapacity: 18000,
    description: "Western Railway terminus and primary pedestrian clearance corridor for South Mumbai.",
  },
  {
    id: "ZONE_TAXI_STAGING",
    name: "South Stadium Taxi & Rideshare Staging Zone",
    shortName: "Taxi Staging Bay",
    tier: "TIER_1_CRITICAL",
    defaultMonitoringStatus: "CONTINUOUS",
    center: { latitude: 18.9372, longitude: 72.8268 },
    radiusMeters: 180,
    resourceIds: ["TAXI_ZONE"],
    hotelIds: [],
    connectedRoadIds: ["ROAD_VEER_NARIMAN", "ROAD_MARINE_DR"],
    nominalPedestrianCapacity: 800,
    nominalTransitCapacity: 1200,
    description: "Curbside vehicle pickup bays, taxi queue buffer, and rideshare dispatch staging.",
  },
  {
    id: "ZONE_MARINE_LINES",
    name: "Marine Lines Station & North Concourse",
    shortName: "Marine Lines",
    tier: "TIER_2_SUPPORTING",
    defaultMonitoringStatus: "ADAPTIVE",
    center: { latitude: 18.9436, longitude: 72.8236 },
    radiusMeters: 240,
    resourceIds: ["MARINE_LINES"],
    hotelIds: [],
    connectedRoadIds: ["ROAD_MAHARSHI_KARVE", "ROAD_MARINE_DR"],
    nominalPedestrianCapacity: 8000,
    nominalTransitCapacity: 12000,
    description: "Western Railway intermediate station providing secondary relief for northern egress.",
  },
  {
    id: "ZONE_CSMT",
    name: "CSMT Central & Harbour Terminal Hub",
    shortName: "CSMT Terminal",
    tier: "TIER_2_SUPPORTING",
    defaultMonitoringStatus: "ADAPTIVE",
    center: { latitude: 18.9400, longitude: 72.8353 },
    radiusMeters: 400,
    resourceIds: ["CSMT"],
    hotelIds: ["H3"], // Residency Hotel Fort
    connectedRoadIds: ["ROAD_DN_ROAD", "ROAD_CENTRAL_SPINE"],
    nominalPedestrianCapacity: 14000,
    nominalTransitCapacity: 25000,
    description: "Central and Harbour Railway terminus hub capturing eastern and suburban passenger dispersal.",
  },
  {
    id: "ZONE_HOTELS_SOUTH",
    name: "Nariman Point & Marine Drive Hospitality Corridor",
    shortName: "South Hospitality",
    tier: "TIER_2_SUPPORTING",
    defaultMonitoringStatus: "PERIODIC",
    center: { latitude: 18.9280, longitude: 72.8230 },
    radiusMeters: 550,
    resourceIds: [],
    hotelIds: ["H1", "H2", "H3"],
    connectedRoadIds: ["ROAD_MARINE_DR"],
    nominalPedestrianCapacity: 5000,
    nominalTransitCapacity: 0,
    description: "Zone A & Zone B accommodation clusters supporting premium event visitors.",
  },
  {
    id: "ZONE_DADAR",
    name: "Dadar Artery & Transit Interchange Hub",
    shortName: "Dadar Interchange",
    tier: "TIER_3_PERIPHERAL",
    defaultMonitoringStatus: "ON_DEMAND",
    center: { latitude: 19.0183, longitude: 72.8434 },
    radiusMeters: 600,
    resourceIds: ["DADAR"],
    hotelIds: ["H4"], // Ramada Dadar in Zone C
    connectedRoadIds: ["ROAD_CENTRAL_SPINE"],
    nominalPedestrianCapacity: 18000,
    nominalTransitCapacity: 35000,
    description: "Dual-railway interchange (Western & Central) and northern bus feeder terminal for crowd redistribution.",
  },
];

export const ZONE_COVERAGE_PROFILES: Record<string, ZoneCoverageProfile> = {
  ZONE_WANKHEDE: {
    zoneId: "ZONE_WANKHEDE",
    displayName: "Wankhede Stadium & Perimeter Concourse",
    coverageStatus: "FULL",
    dataSource: "SENSOR_FUSED",
    registeredDeviceCount: 6,
    deviceModalities: ["LIDAR", "TURNSTILE_GATE", "CCTV_CAMERA"],
    maxPermittedConfidence: 1.0,
    fallbackBehavior: "NONE",
    freshnessMaxAgeSeconds: 30,
    canTriggerOperationalRecommendations: true,
    assumptions: "Complete optical LiDAR and turnstile hardware instrumentation on egress gates 1-7.",
  },
  ZONE_CHURCHGATE: {
    zoneId: "ZONE_CHURCHGATE",
    displayName: "Churchgate Western Railway Terminal Hub",
    coverageStatus: "FULL",
    dataSource: "SENSOR_FUSED",
    registeredDeviceCount: 8,
    deviceModalities: ["TURNSTILE_GATE", "CCTV_CAMERA", "WIFI_PROBE", "BLE_BEACON"],
    maxPermittedConfidence: 1.0,
    fallbackBehavior: "NONE",
    freshnessMaxAgeSeconds: 30,
    canTriggerOperationalRecommendations: true,
    assumptions: "Full turnstile bank, CCTV optical density, and passenger probe tracking on subsurface concourses.",
  },
  ZONE_TAXI_STAGING: {
    zoneId: "ZONE_TAXI_STAGING",
    displayName: "South Stadium Taxi & Rideshare Staging Zone",
    coverageStatus: "FULL",
    dataSource: "SENSOR_FUSED",
    registeredDeviceCount: 4,
    deviceModalities: ["CCTV_CAMERA", "BLE_BEACON", "GPS_FLEET"],
    maxPermittedConfidence: 1.0,
    fallbackBehavior: "NONE",
    freshnessMaxAgeSeconds: 30,
    canTriggerOperationalRecommendations: true,
    assumptions: "Curbside CCTV queue estimation and beacon array for dispatch flow measurement.",
  },
  ZONE_MARINE_LINES: {
    zoneId: "ZONE_MARINE_LINES",
    displayName: "Marine Lines Station & North Concourse",
    coverageStatus: "PARTIAL",
    dataSource: "SENSOR_FUSED",
    registeredDeviceCount: 2,
    deviceModalities: ["CCTV_CAMERA", "ENTRANCE_COUNTER"],
    maxPermittedConfidence: 0.85,
    fallbackBehavior: "TOPOLOGY_PROPAGATION",
    freshnessMaxAgeSeconds: 45,
    canTriggerOperationalRecommendations: true,
    assumptions: "Concourse optical monitoring with platform load inferred from corridor flow.",
  },
  ZONE_CSMT: {
    zoneId: "ZONE_CSMT",
    displayName: "CSMT Central & Harbour Terminal Hub",
    coverageStatus: "UNINSTRUMENTED",
    dataSource: "REGIONAL_BASELINE",
    registeredDeviceCount: 0,
    deviceModalities: [],
    maxPermittedConfidence: 0.50,
    fallbackBehavior: "REGIONAL_BASELINE",
    freshnessMaxAgeSeconds: 120,
    canTriggerOperationalRecommendations: false,
    assumptions: "Regional baseline schedule extrapolation. Direct measurements unavailable without field nodes.",
  },
  ZONE_HOTELS_SOUTH: {
    zoneId: "ZONE_HOTELS_SOUTH",
    displayName: "Nariman Point & Marine Drive Hospitality Corridor",
    coverageStatus: "PARTIAL",
    dataSource: "PARTNER_ESTIMATE",
    registeredDeviceCount: 3,
    deviceModalities: ["HOTEL_INVENTORY", "BLE_BEACON"],
    maxPermittedConfidence: 0.80,
    fallbackBehavior: "PARTNER_ESTIMATE",
    freshnessMaxAgeSeconds: 300,
    canTriggerOperationalRecommendations: true,
    assumptions: "Partner-reported reservation occupancy and curbside BLE cluster estimation.",
  },
  ZONE_DADAR: {
    zoneId: "ZONE_DADAR",
    displayName: "Dadar Artery & Transit Interchange Hub",
    coverageStatus: "UNINSTRUMENTED",
    dataSource: "REGIONAL_BASELINE",
    registeredDeviceCount: 0,
    deviceModalities: [],
    maxPermittedConfidence: 0.50,
    fallbackBehavior: "REGIONAL_BASELINE",
    freshnessMaxAgeSeconds: 120,
    canTriggerOperationalRecommendations: false,
    assumptions: "Regional transit baseline extrapolation. Uninstrumented; requires operator manual confirmation for major actions.",
  },
  WANKHEDE_EXIT: {
    zoneId: "WANKHEDE_EXIT",
    displayName: "Wankhede Concourse Exit Gates Subzone",
    coverageStatus: "FULL",
    dataSource: "SENSOR_FUSED",
    registeredDeviceCount: 3,
    deviceModalities: ["TURNSTILE_GATE", "CCTV_CAMERA"],
    maxPermittedConfidence: 1.0,
    fallbackBehavior: "NONE",
    freshnessMaxAgeSeconds: 30,
    canTriggerOperationalRecommendations: true,
    assumptions: "Egress throughput concourse monitoring at stadium gates 1–7 with flow rate metering.",
  },
  ZONE_MAHAPALIKA: {
    zoneId: "ZONE_MAHAPALIKA",
    displayName: "Mahapalika Marg Evacuation & Transfer Corridor",
    coverageStatus: "PARTIAL",
    dataSource: "TOPOLOGY_PROPAGATION",
    registeredDeviceCount: 1,
    deviceModalities: ["CCTV_CAMERA"],
    maxPermittedConfidence: 0.70,
    fallbackBehavior: "TOPOLOGY_PROPAGATION",
    freshnessMaxAgeSeconds: 60,
    canTriggerOperationalRecommendations: true,
    assumptions: "Pedestrian arterial corridor between Churchgate and CSMT concourses.",
  },
};

const ZONE_MAP = new Map<string, ZoneDefinition>(
  OPERATIONAL_ZONES.map(z => [z.id, z])
);

export function getAllZones(): ZoneDefinition[] {
  return OPERATIONAL_ZONES;
}

export function getZoneById(id: string): ZoneDefinition | undefined {
  return ZONE_MAP.get(id);
}

export function getZonesByTier(tier: ZoneTier): ZoneDefinition[] {
  return OPERATIONAL_ZONES.filter(z => z.tier === tier);
}

export function getZoneCoverageProfile(zoneId: string): ZoneCoverageProfile {
  return (
    ZONE_COVERAGE_PROFILES[zoneId] || {
      zoneId,
      displayName: zoneId,
      coverageStatus: "UNKNOWN",
      dataSource: "UNKNOWN",
      registeredDeviceCount: 0,
      deviceModalities: [],
      maxPermittedConfidence: 0.3,
      fallbackBehavior: "REGIONAL_BASELINE",
      freshnessMaxAgeSeconds: 60,
      canTriggerOperationalRecommendations: false,
      assumptions: "Unregistered zone profile.",
    }
  );
}

export function getAllZoneCoverageProfiles(): ZoneCoverageProfile[] {
  return Object.values(ZONE_COVERAGE_PROFILES);
}

/**
 * Evaluates dynamic monitoring escalation based on real-time crowd pressure.
 * 
 * Strategy:
 * - Pressure >= 85%: ESCALATED to CONTINUOUS monitoring (Tier 1 frequency)
 * - Pressure >= 70%: ADAPTIVE monitoring (elevated sampling)
 * - Otherwise: Baseline default monitoring status for the zone's tier
 */
export function evaluateMonitoringStatus(
  zone: ZoneDefinition,
  pressure: number
): { status: MonitoringStatus; isEscalated: boolean } {
  if (pressure >= 85) {
    return {
      status: zone.tier === "TIER_1_CRITICAL" ? "CONTINUOUS" : "ESCALATED",
      isEscalated: zone.tier !== "TIER_1_CRITICAL",
    };
  }
  if (pressure >= 70) {
    return {
      status: "ADAPTIVE",
      isEscalated: zone.tier === "TIER_3_PERIPHERAL",
    };
  }
  return {
    status: zone.defaultMonitoringStatus,
    isEscalated: false,
  };
}

/**
 * Pure domain fusion function synthesizing the real-time ZoneState
 * from live resources, partner hotel updates, scenario multipliers, and simulation state.
 */
export function fuseZoneState(
  zone: ZoneDefinition,
  resources: Resource[],
  hotels: Hotel[],
  scenario: ScenarioId,
  simulationState?: SimulationState,
  redistributionApplied = false
): ZoneState {
  const memberRes = resources.filter(r => zone.resourceIds.includes(r.id));
  const memberHotels = hotels.filter(h => zone.hotelIds.includes(h.id));

  // Compute aggregated total capacity
  const resourceCapacity = memberRes.reduce((s, r) => s + r.totalCapacity, 0);
  const hotelCapacity = memberHotels.reduce((s, h) => s + h.totalRooms, 0);
  const totalCapacity = resourceCapacity + hotelCapacity || zone.nominalPedestrianCapacity;

  // Compute live utilization / load
  let currentUtilization = 0;
  if (simulationState && simulationState.minutesElapsed > 0) {
    zone.resourceIds.forEach(id => {
      currentUtilization += simulationState.nodeLoads[id] || 0;
    });
  } else {
    currentUtilization = memberRes.reduce((s, r) => s + r.currentUtilization, 0);
  }

  // Fused pressure calculation
  let pressure = 50;
  if (memberRes.length > 0) {
    const pressures = memberRes.map(r => r.pressure);
    pressure = Math.round(pressures.reduce((a, b) => a + b, 0) / pressures.length);
  } else if (memberHotels.length > 0) {
    const pressures = memberHotels.map(h => h.pressure);
    pressure = Math.round(pressures.reduce((a, b) => a + b, 0) / pressures.length);
  }

  // Multi-horizon forecast extrapolation
  const s = SCENARIOS[scenario] || SCENARIOS.NORMAL;
  let p15Sum = 0;
  let p30Sum = 0;
  let p60Sum = 0;
  let count = 0;

  zone.resourceIds.forEach(id => {
    const pd = s.pressure[id];
    if (pd) {
      let p15 = pd.predictedPressure15;
      let p30 = pd.predictedPressure30;
      let p60 = pd.predictedPressure60;

      if (redistributionApplied) {
        if (id === "CHURCHGATE" || id === "WANKHEDE_EXIT") {
          p15 = Math.max(40, p15 - 12);
          p30 = Math.max(45, p30 - 18);
          p60 = Math.max(45, p60 - 18);
        } else if (id === "DADAR") {
          p15 = Math.min(88, p15 + 8);
          p30 = Math.min(90, p30 + 10);
          p60 = Math.min(90, p60 + 8);
        }
      }

      p15Sum += p15;
      p30Sum += p30;
      p60Sum += p60;
      count++;
    }
  });

  const predictedPressure15 = count > 0 ? Math.round(p15Sum / count) : Math.min(99, pressure + 5);
  const predictedPressure30 = count > 0 ? Math.round(p30Sum / count) : Math.min(99, pressure + 10);
  const predictedPressure60 = count > 0 ? Math.round(p60Sum / count) : Math.min(99, pressure + 12);

  const pressureLevel = getPressureLevel(pressure);
  const trend = predictedPressure30 > pressure + 5 ? "INCREASING" : predictedPressure30 < pressure - 5 ? "DECREASING" : "STABLE";

  // Dynamic monitoring status evaluation
  const { status: monitoringStatus, isEscalated } = evaluateMonitoringStatus(zone, pressure);

  // Available & Usable Capacity
  const availableCapacity = Math.max(0, totalCapacity - currentUtilization);
  const usableHotelRooms = memberHotels.reduce((s, h) => s + h.usableRooms, 0);
  const usableCapacity = availableCapacity + usableHotelRooms;

  // Active bottlenecks detection
  const activeBottlenecks: string[] = [];
  memberRes.forEach(r => {
    if (r.pressure >= 85) activeBottlenecks.push(`${r.shortName || r.name} (${r.pressure}%)`);
  });
  memberHotels.forEach(h => {
    if (h.pressure >= 90) activeBottlenecks.push(`${h.name} (${h.pressure}%)`);
  });

  return {
    id: zone.id,
    name: zone.name,
    tier: isEscalated ? "TIER_1_CRITICAL" : zone.tier,
    baseTier: zone.tier,
    monitoringStatus,
    isEscalated,
    pressure,
    predictedPressure15,
    predictedPressure30,
    predictedPressure60,
    pressureLevel,
    trend,
    inflowRate: Math.round(currentUtilization * 0.08),
    outflowRate: Math.round(currentUtilization * 0.06),
    netFlow: Math.round(currentUtilization * 0.02),
    totalCapacity,
    currentUtilization,
    availableCapacity,
    usableCapacity,
    activeBottlenecks,
    memberResources: [...zone.resourceIds, ...zone.hotelIds],
    lastUpdated: "JUST NOW",
    confidence: zone.tier === "TIER_1_CRITICAL" ? 0.95 : 0.88,
    source: memberHotels.some(h => h.source === "PARTNER_REPORTED") ? "PARTNER_REPORTED" : "SIMULATED",
  };
}
