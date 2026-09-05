import {
  SimulationState,
  HumanCohort,
  DensityCell,
  ScenarioId,
  GeoLocation,
} from "@/types";
import {
  MVP_NETWORK_EDGES,
  getNetworkEdge,
  getPathForDestination,
} from "@/data/mockNetworkTopology";
import { STATIC_RESOURCES } from "@/data/mockResources";

const NODE_CAPACITIES: Record<string, number> = {
  WANKHEDE_EXIT: 4000,
  CHURCHGATE: 10000,
  TAXI_ZONE: 400,
  MARINE_LINES: 8000,
  CSMT: 14000,
  DADAR: 18000,
};

// Abstract clearance rate: people processed/evacuated per simulated minute
const NOMINAL_CLEARANCE_PER_MIN: Record<string, number> = {
  CHURCHGATE: 380,
  MARINE_LINES: 240,
  CSMT: 280,
  TAXI_ZONE: 110,
  DADAR: 320,
  WANKHEDE_EXIT: 500,
};

const BASELINE_NODE_LOADS: Record<string, number> = {
  WANKHEDE_EXIT: 450,
  CHURCHGATE: 2100,
  TAXI_ZONE: 60,
  MARINE_LINES: 1200,
  CSMT: 2800,
  DADAR: 3100,
};

function formatSimulationTime(baseHour: number, baseMinute: number, elapsedMinutes: number): string {
  const totalMins = baseHour * 60 + baseMinute + Math.floor(elapsedMinutes);
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Deterministic post-event demand outflow rate in people per simulated minute.
 * Models a realistic egress curve:
 * - Minutes 0-5: Gates opening, initial wave (300 -> 800/min)
 * - Minutes 5-20: Surge peak (reaches 1,600/min around min 15)
 * - Minutes 20-40: Sustained heavy exit (1,400 -> 600/min)
 * - Minutes 40-65: Tapering crowd (500 -> 100/min)
 * - Beyond 70 min: Egress complete (< 40/min)
 */
export function calculateOutflowRate(
  minutesElapsed: number,
  scenario: ScenarioId,
  attendance = 33000
): number {
  if (scenario !== "POST_EVENT_SURGE") {
    // Normal / Pre-event baseline background movement
    const baseRate = scenario === "NORMAL" ? 80 : 120;
    return Math.round(baseRate * (attendance / 33000));
  }

  let ratePerMin = 0;
  const t = minutesElapsed;

  if (t < 0) {
    ratePerMin = 0;
  } else if (t <= 5) {
    // Initial exit wave ramping up
    ratePerMin = 250 + t * 110;
  } else if (t <= 18) {
    // Sharp acceleration to peak
    ratePerMin = 800 + (t - 5) * 62;
  } else if (t <= 35) {
    // Sustained high egress gently descending
    ratePerMin = 1600 - (t - 18) * 45;
  } else if (t <= 60) {
    // Gradual dissipation
    ratePerMin = 835 - (t - 35) * 27;
  } else if (t <= 75) {
    // Tail end of dispersal
    ratePerMin = Math.max(30, 160 - (t - 60) * 8);
  } else {
    ratePerMin = 20;
  }

  // Attendance proportionally scales the outflow rate
  const scale = attendance / 33000;
  return Math.round(ratePerMin * scale);
}

/**
 * Initializes simulation state based on scenario and attendance
 */
export function createInitialSimulationState(
  scenario: ScenarioId = "POST_EVENT_SURGE",
  attendance = 33000
): SimulationState {
  const baseHour = scenario === "POST_EVENT_SURGE" ? 21 : 18;
  const baseMin = scenario === "POST_EVENT_SURGE" ? 30 : 30;

  const initialNodeLoads: Record<string, number> = {};
  Object.keys(BASELINE_NODE_LOADS).forEach(id => {
    const scale = attendance / 33000;
    initialNodeLoads[id] = Math.round(BASELINE_NODE_LOADS[id] * scale);
  });

  const initialEdgeLoads: Record<string, number> = {};
  Object.keys(MVP_NETWORK_EDGES).forEach(edgeId => {
    initialEdgeLoads[edgeId] = 0;
  });

  const initialDensity = computeDensityCells(initialNodeLoads);

  return {
    simulationTime: formatSimulationTime(baseHour, baseMin, 0),
    minutesElapsed: 0,
    status: "IDLE",
    speed: 1,
    humanCohorts: [],
    nodeLoads: initialNodeLoads,
    edgeLoads: initialEdgeLoads,
    densityCells: initialDensity,
    totalExitedVenue: 0,
    totalCleared: 0,
  };
}

/**
 * Generates dynamic density cells around key nodes
 */
function computeDensityCells(nodeLoads: Record<string, number>): DensityCell[] {
  const nodeCoords = STATIC_RESOURCES.reduce((acc, r) => {
    acc[r.id] = r.location;
    return acc;
  }, {} as Record<string, GeoLocation>);

  return Object.entries(NODE_CAPACITIES).map(([nodeId, capacity]) => {
    const load = nodeLoads[nodeId] || 0;
    const pressure = Math.min(99, Math.max(20, Math.round((load / capacity) * 100)));
    const radiusMeters = pressure >= 90 ? 260 : pressure >= 75 ? 200 : 140;
    const areaSqM = Math.PI * Math.pow(radiusMeters, 2);
    const density = Number((load / areaSqM).toFixed(4));

    return {
      id: `DENSITY_${nodeId}`,
      location: nodeCoords[nodeId] || { latitude: 18.9379, longitude: 72.8257 },
      radiusMeters,
      density,
      capacity,
      pressure,
    };
  });
}

/**
 * Core Step Function: advances simulation state by deltaMinutes in pure TypeScript
 */
export function nextSimulationState(
  currentState: SimulationState,
  deltaMinutes: number,
  scenario: ScenarioId,
  attendance: number,
  redistributionApplied = false
): SimulationState {
  const newMinutesElapsed = currentState.minutesElapsed + deltaMinutes;
  const baseHour = scenario === "POST_EVENT_SURGE" ? 21 : 18;
  const baseMin = scenario === "POST_EVENT_SURGE" ? 30 : 30;
  const newTime = formatSimulationTime(baseHour, baseMin, newMinutesElapsed);

  // 1. Calculate new demand volume for this time slice (people per min * deltaMinutes)
  const ratePerMin = calculateOutflowRate(currentState.minutesElapsed, scenario, attendance);
  const newVolume = Math.round(ratePerMin * deltaMinutes);

  // 2. Apportion new demand across destinations
  // Fractions: Churchgate 52%, Taxi Zone 20%, Marine Lines 16%, CSMT 8%, Dadar 4%
  // If redistribution is applied: Churchgate reduced to 36%, Dadar increased to 20%
  let fracChurchgate = 0.52;
  let fracTaxi = 0.20;
  let fracMarine = 0.16;
  let fracCsmt = 0.08;
  let fracDadar = 0.04;

  if (redistributionApplied) {
    fracChurchgate = 0.36;
    fracDadar = 0.20;
  }

  const newCohorts: HumanCohort[] = [];
  const destinations: { id: string; fraction: number; speedMps: number }[] = [
    { id: "CHURCHGATE", fraction: fracChurchgate, speedMps: 1.2 }, // 1.2 m/s pedestrian concourse
    { id: "TAXI_ZONE", fraction: fracTaxi, speedMps: 1.1 },
    { id: "MARINE_LINES", fraction: fracMarine, speedMps: 1.2 },
    { id: "CSMT", fraction: fracCsmt, speedMps: 1.3 },
    { id: "DADAR", fraction: fracDadar, speedMps: 6.0 }, // 6 m/s (~22 km/h) curated express transit corridor
  ];

  if (newVolume > 0) {
    destinations.forEach(d => {
      const vol = Math.round(newVolume * d.fraction);
      const path = getPathForDestination(d.id);
      if (vol > 0 && path && path.length > 0) {
        newCohorts.push({
          id: `COHORT_${d.id}_${Math.round(currentState.minutesElapsed * 10)}_${Math.random().toString(36).substr(2, 4)}`,
          originId: "WANKHEDE_EXIT",
          destinationId: d.id,
          path,
          volume: vol,
          currentSegmentIndex: 0,
          progress: 0.0,
          speedMps: d.speedMps,
          status: "MOVING",
        });
      }
    });
  }

  const totalNewVolume = newCohorts.reduce((s, c) => s + c.volume, 0);
  const totalExitedVenue = currentState.totalExitedVenue + totalNewVolume;

  // 3. Advance progress of all existing moving cohorts + newly spawned cohorts
  const updatedCohorts: HumanCohort[] = [];
  const nodeLoads = { ...currentState.nodeLoads };
  let newlyArrivedVolume = 0;

  const allCohorts = [...currentState.humanCohorts.filter(c => c.status === "MOVING"), ...newCohorts];

  for (const cohort of allCohorts) {
    const currentEdgeId = cohort.path[cohort.currentSegmentIndex];
    const edge = getNetworkEdge(currentEdgeId);
    if (!edge) continue;

    const segmentLength = edge.lengthMeters;
    const deltaSeconds = deltaMinutes * 60;
    const distanceTraveled = cohort.speedMps * deltaSeconds;
    const progressInc = distanceTraveled / segmentLength;
    const newProgress = cohort.progress + progressInc;

    if (newProgress >= 1.0) {
      // Cohort completed current segment
      if (cohort.currentSegmentIndex + 1 < cohort.path.length) {
        // Advance to next segment
        updatedCohorts.push({
          ...cohort,
          currentSegmentIndex: cohort.currentSegmentIndex + 1,
          progress: 0.0,
        });
      } else {
        // Reached final destination node: Cohort ARRIVED!
        nodeLoads[cohort.destinationId] = (nodeLoads[cohort.destinationId] || 0) + cohort.volume;
        newlyArrivedVolume += cohort.volume;
        // Mark as arrived (we can keep recent arrived for audit or trim older)
        updatedCohorts.push({
          ...cohort,
          progress: 1.0,
          status: "ARRIVED",
        });
      }
    } else {
      // Still moving on current segment
      updatedCohorts.push({
        ...cohort,
        progress: newProgress,
      });
    }
  }

  // Trim older arrived cohorts to keep memory lean while preserving active moving cohorts
  const movingCohorts = updatedCohorts.filter(c => c.status === "MOVING");
  const recentArrived = updatedCohorts.filter(c => c.status === "ARRIVED").slice(-20);
  const retainedCohorts = [...movingCohorts, ...recentArrived];

  // 4. Compute exact Edge Loads directly from moving cohorts (Flow Conservation)
  const edgeLoads: Record<string, number> = {};
  Object.keys(MVP_NETWORK_EDGES).forEach(edgeId => {
    edgeLoads[edgeId] = 0;
  });

  for (const cohort of movingCohorts) {
    const currentEdgeId = cohort.path[cohort.currentSegmentIndex];
    if (edgeLoads[currentEdgeId] !== undefined) {
      edgeLoads[currentEdgeId] += cohort.volume;
    }
  }

  // 5. Abstract Node Clearance (Transit / Kerb service rate)
  let totalCleared = currentState.totalCleared;
  Object.keys(NOMINAL_CLEARANCE_PER_MIN).forEach(nodeId => {
    const ratePerMin = NOMINAL_CLEARANCE_PER_MIN[nodeId];
    const maxClear = Math.round(ratePerMin * deltaMinutes);
    const baseline = Math.round((attendance / 33000) * (BASELINE_NODE_LOADS[nodeId] || 500));

    // Only clear excess accumulation above baseline operating load
    const currentLoad = Math.round(nodeLoads[nodeId] || 0);
    const excess = Math.max(0, Math.round(currentLoad - baseline * 0.4));
    const cleared = Math.min(excess, maxClear);

    if (cleared > 0) {
      nodeLoads[nodeId] = Math.max(0, Math.round(currentLoad - cleared));
      totalCleared += cleared;
    }
  });

  // 6. Generate Dynamic Density Cells
  const densityCells = computeDensityCells(nodeLoads);

  return {
    simulationTime: newTime,
    minutesElapsed: newMinutesElapsed,
    status: currentState.status,
    speed: currentState.speed,
    humanCohorts: retainedCohorts,
    nodeLoads,
    edgeLoads,
    densityCells,
    totalExitedVenue,
    totalCleared,
  };
}
