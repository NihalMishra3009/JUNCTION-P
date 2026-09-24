import { sensorStreamSimulator } from "../src/services/sensorStreamSimulator";
import { deviceRegistry } from "../src/services/deviceRegistry";
import { ingestionPipeline } from "../src/services/ingestionPipeline";
import { sensorFusionEngine, ZONE_CAPACITY_PROFILES } from "../src/services/sensorFusionEngine";
import { OPERATIONAL_ZONES, fuseZoneState as legacyFuseZoneState } from "../src/services/zoneRegistry";
import { getResources, getHotels } from "../src/services/mockDataService";
import { createInitialSimulationState, nextSimulationState, calculateOutflowRate } from "../src/services/simulationEngine";
import { NormalizedObservation, ZoneDefinition } from "../src/types";

console.log("==========================================================================================");
console.log("JUNCTION DR-001 COMPREHENSIVE VERIFICATION & COMPARISON SUITE");
console.log("==========================================================================================\n");

// Setup
sensorStreamSimulator.initializeDefaultDevices();
const resources = getResources("POST_EVENT_SURGE", false);
const hotels = getHotels("POST_EVENT_SURGE", {});

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`❌ FAIL: ${testName} - ${details || ""}`);
    testsFailed++;
  }
}

// TEST 1: Capacity-Basis Correctness for Egress (Wankhede Concourse)
console.log("--- TEST 1: Capacity-Basis & Denominator Correctness ---");
const wankhedeZone = OPERATIONAL_ZONES.find(z => z.id === "ZONE_WANKHEDE")!;
const wankhedeEgressObs: NormalizedObservation[] = [
  {
    id: "OBS_TEST_WANKHEDE_CCTV",
    sourceId: "DEV_CCTV_WANKHEDE_01",
    sourceProvider: "JUNCTION_SYNTHETIC_CCTV",
    metricType: "CROWD_COUNT",
    zoneId: "ZONE_WANKHEDE",
    resourceId: "WANKHEDE_EXIT",
    observedAt: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    value: 2800, // 2,800 people in egress gates
    unit: "persons",
    confidence: 0.94,
    qualityStatus: "FRESH",
    derivationType: "SIMULATED",
    freshnessSeconds: 0,
    schemaVersion: "1.0.0",
  },
  {
    id: "OBS_TEST_WANKHEDE_QUEUE",
    sourceId: "DEV_CCTV_WANKHEDE_01",
    sourceProvider: "JUNCTION_SYNTHETIC_CCTV",
    metricType: "QUEUE_LENGTH",
    zoneId: "ZONE_WANKHEDE",
    resourceId: "WANKHEDE_EXIT",
    observedAt: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    value: 350, // 350 people queueing at turnstiles
    unit: "persons",
    confidence: 0.94,
    qualityStatus: "FRESH",
    derivationType: "SIMULATED",
    freshnessSeconds: 0,
    schemaVersion: "1.0.0",
  },
];

const wankhedeFused = sensorFusionEngine.fuseZoneObservations(wankhedeZone, wankhedeEgressObs, {
  scenario: "POST_EVENT_SURGE",
  resources,
  hotels,
});

assert(
  wankhedeFused.pressure >= 75 && wankhedeFused.pressure <= 99,
  "Egress 2,800 people scales realistically against 4,000 concourse capacity",
  `Expected pressure 75-99%, got ${wankhedeFused.pressure}% (Level: ${wankhedeFused.pressureLevel})`
);
assert(
  ZONE_CAPACITY_PROFILES["ZONE_WANKHEDE"].basis === "CONCOURSE_EGRESS",
  "Wankhede zone profile explicitly set to CONCOURSE_EGRESS basis"
);

// TEST 2: Zero-Observation Zone (Dadar Fallback)
console.log("\n--- TEST 2: Zero-Observation Zone & Controlled Fallback ---");
const dadarZone = OPERATIONAL_ZONES.find(z => z.id === "ZONE_DADAR")!;
const dadarFused = sensorFusionEngine.fuseZoneObservations(dadarZone, [], {
  scenario: "POST_EVENT_SURGE",
  resources,
  hotels,
});

assert(
  dadarFused.pressure > 0,
  "Uninstrumented zone (Dadar) does not report 0% pressure; executes fallback",
  `Pressure is ${dadarFused.pressure}% (from legacy fallback table)`
);
assert(
  dadarFused.confidence <= 0.65,
  "Uninstrumented zone confidence is appropriately degraded (<= 0.65)",
  `Confidence is ${dadarFused.confidence}`
);

// TEST 3: Stale & Conflicting Observations
console.log("\n--- TEST 3: Stale & Conflicting Observation Handling ---");
const churchgateZone = OPERATIONAL_ZONES.find(z => z.id === "ZONE_CHURCHGATE")!;
const conflictObs: NormalizedObservation[] = [
  {
    id: "OBS_CG_CCTV",
    sourceId: "DEV_CCTV_CHURCHGATE_CONCOURSE",
    sourceProvider: "RAILWAY_SECURITY_CV",
    metricType: "CROWD_COUNT",
    zoneId: "ZONE_CHURCHGATE",
    observedAt: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    value: 8500,
    unit: "persons",
    confidence: 0.90,
    qualityStatus: "FRESH",
    derivationType: "SIMULATED",
    freshnessSeconds: 0,
    schemaVersion: "1.0.0",
  },
  {
    id: "OBS_CG_WIFI_CONFLICT",
    sourceId: "DEV_WIFI_CHURCHGATE_HUB",
    sourceProvider: "MUMBAI_TELCO_PROBE",
    metricType: "CROWD_COUNT",
    zoneId: "ZONE_CHURCHGATE",
    observedAt: new Date(Date.now() - 200_000).toISOString(), // Stale
    receivedAt: new Date().toISOString(),
    value: 2000, // Conflict (much lower)
    unit: "detected_devices",
    confidence: 0.85,
    qualityStatus: "CONFLICTING",
    derivationType: "SIMULATED",
    freshnessSeconds: 200,
    schemaVersion: "1.0.0",
  },
];

const churchgateFused = sensorFusionEngine.fuseZoneObservations(churchgateZone, conflictObs, {
  scenario: "POST_EVENT_SURGE",
  resources,
  hotels,
});

assert(
  churchgateFused.confidence < 0.85,
  "Conflicting + stale readings degrade fused confidence score",
  `Fused confidence: ${churchgateFused.confidence}`
);
assert(
  churchgateFused.pressure > 80,
  "Weighted fusion favors high-confidence CCTV over degraded stale beacon",
  `Fused pressure: ${churchgateFused.pressure}%`
);

// TEST 4: Hospitality & Member Resource Bottleneck Preservation
console.log("\n--- TEST 4: Hospitality & Member Bottlenecks Preservation ---");
const southHospitalityZone = OPERATIONAL_ZONES.find(z => z.id === "ZONE_HOTELS_SOUTH")!;
const hospBeaconObs: NormalizedObservation[] = [
  {
    id: "OBS_HOSP_BEACON",
    sourceId: "DEV_BEACON_HOTELS_SOUTH",
    sourceProvider: "BMC_SMART_CITY",
    metricType: "CROWD_COUNT",
    zoneId: "ZONE_HOTELS_SOUTH",
    observedAt: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    value: 1200,
    unit: "detected_devices",
    confidence: 0.88,
    qualityStatus: "FRESH",
    derivationType: "SIMULATED",
    freshnessSeconds: 0,
    schemaVersion: "1.0.0",
  },
];

const hospFused = sensorFusionEngine.fuseZoneObservations(southHospitalityZone, hospBeaconObs, {
  scenario: "POST_EVENT_SURGE",
  resources,
  hotels,
});

assert(
  hospFused.activeBottlenecks.some(b => b.includes("Trident") || b.includes("Hotel")),
  "Member hotel bottlenecks (e.g. Trident Nariman Point) are preserved in activeBottlenecks",
  `Bottlenecks: ${hospFused.activeBottlenecks.join(", ")}`
);
assert(
  hospFused.usableCapacity > hospFused.availableCapacity,
  "Usable capacity incorporates usable hotel room inventory",
  `Usable capacity: ${hospFused.usableCapacity}, Available: ${hospFused.availableCapacity}`
);

// TEST 5: Complete Zone Comparison Across Egress Surge Timeline
console.log("\n--- TEST 5: End-to-End Egress Surge Simulation Timeline ---");
let sim = createInitialSimulationState("POST_EVENT_SURGE", 33000);
for (let m = 1; m <= 15; m++) {
  sim = nextSimulationState(sim, 1, "POST_EVENT_SURGE", 33000, false);
}

const outflowRate = calculateOutflowRate(sim.minutesElapsed, "POST_EVENT_SURGE", 33000);
const liveObs = sensorStreamSimulator.generateObservationsForState(sim.nodeLoads, outflowRate);
const acceptedLiveObs = ingestionPipeline.processBatch(liveObs).accepted;

console.log("\n---------------------------------------------------------------------------------------------------------------------------------");
console.log("Zone ID                | Basis              | Fused (Corrected) | Legacy Pressure | Confidence | Bottlenecks");
console.log("-----------------------+--------------------+-------------------+-----------------+------------+---------------------------------");

for (const zone of OPERATIONAL_ZONES) {
  const fused = sensorFusionEngine.fuseZoneObservations(zone, acceptedLiveObs, {
    scenario: "POST_EVENT_SURGE",
    resources,
    hotels,
    simulationState: sim,
  });
  const legacy = legacyFuseZoneState(zone, resources, hotels, "POST_EVENT_SURGE", sim, false);
  const profile = ZONE_CAPACITY_PROFILES[zone.id]?.basis || "DEFAULT";

  const fusedP = `${fused.pressure}% (${fused.pressureLevel})`.padEnd(17);
  const legacyP = `${legacy.pressure}% (${legacy.pressureLevel})`.padEnd(15);
  const conf = `${(fused.confidence * 100).toFixed(0)}%`.padEnd(10);
  const bList = fused.activeBottlenecks.slice(0, 2).join("; ") || "None";

  console.log(`${zone.id.padEnd(22)} | ${profile.padEnd(18)} | ${fusedP} | ${legacyP} | ${conf} | ${bList}`);
}
console.log("---------------------------------------------------------------------------------------------------------------------------------\n");

console.log(`\n==================================================`);
console.log(`TEST SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log(`==================================================`);
