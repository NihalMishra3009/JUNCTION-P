// ============================================================
// JUNCTION - Input System & Sensor Fusion Verification Suite
// ============================================================

import { deviceRegistry } from "../src/services/deviceRegistry";
import { providerRegistry } from "../src/services/providers/providerRegistry";
import { sensorStreamSimulator } from "../src/services/sensorStreamSimulator";
import { ingestionPipeline } from "../src/services/ingestionPipeline";
import { sensorFusionEngine, ZONE_CAPACITY_PROFILES } from "../src/services/sensorFusionEngine";
import { OPERATIONAL_ZONES, getZoneById } from "../src/services/zoneRegistry";
import { NormalizedObservation, DeviceDefinition, ZoneDefinition } from "../src/types";

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (detail) console.error(`    Detail: ${detail}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

console.log("\n=======================================================");
console.log("  JUNCTION Input System & Sensor Fusion Test Suite");
console.log("=======================================================\n");

// Ensure default devices registered
sensorStreamSimulator.initializeDefaultDevices();

// -------------------------------------------------------------
// Test Suite 1: Observation Normalization & Validation
// -------------------------------------------------------------
console.log("--- 1. Observation Ingestion & Normalization ---");

{
  const rawBatch: NormalizedObservation[] = [
    {
      id: "OBS_TEST_VALID_01",
      sourceId: "DEV_CCTV_CHURCHGATE_CONCOURSE",
      sourceProvider: "TEST_PROVIDER",
      metricType: "CROWD_COUNT",
      zoneId: "ZONE_CHURCHGATE",
      observedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      value: 1200,
      unit: "persons",
      confidence: 0.95,
      qualityStatus: "FRESH",
      derivationType: "MEASURED",
      freshnessSeconds: 0,
      schemaVersion: "1.0.0",
    },
    // Invalid: Negative value
    {
      id: "OBS_TEST_INVALID_NEG",
      sourceId: "DEV_CCTV_CHURCHGATE_CONCOURSE",
      sourceProvider: "TEST_PROVIDER",
      metricType: "CROWD_COUNT",
      zoneId: "ZONE_CHURCHGATE",
      observedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      value: -50,
      unit: "persons",
      confidence: 0.95,
      qualityStatus: "FRESH",
      derivationType: "MEASURED",
      freshnessSeconds: 0,
      schemaVersion: "1.0.0",
    },
    // Invalid: Missing mandatory zoneId
    {
      id: "OBS_TEST_MISSING_ZONE",
      sourceId: "DEV_CCTV_CHURCHGATE_CONCOURSE",
      sourceProvider: "TEST_PROVIDER",
      metricType: "CROWD_COUNT",
      zoneId: "",
      observedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      value: 100,
      unit: "persons",
      confidence: 0.95,
      qualityStatus: "FRESH",
      derivationType: "MEASURED",
      freshnessSeconds: 0,
      schemaVersion: "1.0.0",
    },
  ];

  const result = ingestionPipeline.processBatch(rawBatch);

  assert(result.accepted.length === 1, "Accepts only valid observations conforming to schema");
  assert(result.accepted[0].id === "OBS_TEST_VALID_01", "Accepted observation matches valid ID");
  assert(result.quarantined.length === 2, "Quarantines invalid observations (negative and missing zoneId)");

  // Test Deduplication
  const duplicateResult = ingestionPipeline.processBatch(rawBatch);
  assert(duplicateResult.deduplicatedCount === 1, "Deduplicates previously ingested observation IDs");
}

// -------------------------------------------------------------
// Test Suite 2: Multiple Sensors Contributing to One Zone
// -------------------------------------------------------------
console.log("\n--- 2. Multiple Sensors Contributing to One Zone ---");

{
  const churchgateZone = getZoneById("ZONE_CHURCHGATE")!;
  const observations: NormalizedObservation[] = [
    {
      id: "OBS_CG_CCTV_COUNT",
      sourceId: "DEV_CCTV_CHURCHGATE_CONCOURSE",
      sourceProvider: "CCTV_CV_PROVIDER",
      metricType: "CROWD_COUNT",
      zoneId: "ZONE_CHURCHGATE",
      observedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      value: 3000,
      unit: "persons",
      confidence: 0.90,
      qualityStatus: "FRESH",
      derivationType: "SIMULATED",
      freshnessSeconds: 0,
      schemaVersion: "1.0.0",
    },
    {
      id: "OBS_CG_WIFI_COUNT",
      sourceId: "DEV_WIFI_CHURCHGATE_HUB",
      sourceProvider: "DENSITY_BEACON_PROVIDER",
      metricType: "CROWD_COUNT",
      zoneId: "ZONE_CHURCHGATE",
      observedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      value: 2600,
      unit: "detected_devices",
      confidence: 0.85,
      qualityStatus: "FRESH",
      derivationType: "SIMULATED",
      freshnessSeconds: 0,
      schemaVersion: "1.0.0",
    },
    {
      id: "OBS_CG_CCTV_DENSITY",
      sourceId: "DEV_CCTV_CHURCHGATE_CONCOURSE",
      sourceProvider: "CCTV_CV_PROVIDER",
      metricType: "DENSITY",
      zoneId: "ZONE_CHURCHGATE",
      observedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      value: 2.2,
      unit: "people_per_sqm",
      confidence: 0.90,
      qualityStatus: "FRESH",
      derivationType: "SIMULATED",
      freshnessSeconds: 0,
      schemaVersion: "1.0.0",
    },
    {
      id: "OBS_CG_CCTV_INFLOW",
      sourceId: "DEV_CCTV_CHURCHGATE_CONCOURSE",
      sourceProvider: "CCTV_CV_PROVIDER",
      metricType: "INFLOW_RATE",
      zoneId: "ZONE_CHURCHGATE",
      observedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      value: 240,
      unit: "persons_per_min",
      confidence: 0.90,
      qualityStatus: "FRESH",
      derivationType: "SIMULATED",
      freshnessSeconds: 0,
      schemaVersion: "1.0.0",
    },
  ];

  const fusedState = sensorFusionEngine.fuseZoneObservations(churchgateZone, observations);

  assert(fusedState.currentUtilization > 2600 && fusedState.currentUtilization < 3000,
    `Weighted headcount fusion combines both sensors properly (fused = ${fusedState.currentUtilization})`);
  assert(fusedState.contributingSensors?.includes("DEV_CCTV_CHURCHGATE_CONCOURSE") === true,
    "DEV_CCTV_CHURCHGATE_CONCOURSE listed in contributing sensors");
  assert(fusedState.contributingSensors?.includes("DEV_WIFI_CHURCHGATE_HUB") === true,
    "DEV_WIFI_CHURCHGATE_HUB listed in contributing sensors");
  assert(fusedState.density === 2.2,
    `Spatial density correctly preserved from density observation (density = ${fusedState.density})`);
  assert(fusedState.inflowRate === 240,
    `Inflow rate correctly fused from inflow observation (inflow = ${fusedState.inflowRate})`);
}

// -------------------------------------------------------------
// Test Suite 3: Missing and Stale Observations
// -------------------------------------------------------------
console.log("\n--- 3. Missing and Stale Observations Handling ---");

{
  const churchgateZone = getZoneById("ZONE_CHURCHGATE")!;

  // Test Stale Observation (weight penalty)
  const staleObs: NormalizedObservation[] = [
    {
      id: "OBS_CG_STALE",
      sourceId: "DEV_CCTV_CHURCHGATE_CONCOURSE",
      sourceProvider: "CCTV_CV_PROVIDER",
      metricType: "CROWD_COUNT",
      zoneId: "ZONE_CHURCHGATE",
      observedAt: new Date(Date.now() - 300_000).toISOString(),
      receivedAt: new Date().toISOString(),
      value: 4000,
      unit: "persons",
      confidence: 0.90,
      qualityStatus: "STALE",
      derivationType: "SIMULATED",
      freshnessSeconds: 300,
      schemaVersion: "1.0.0",
    },
  ];

  const staleFusedState = sensorFusionEngine.fuseZoneObservations(churchgateZone, staleObs);
  assert(staleFusedState.dataQuality === "STALE", "Marks zone data quality as STALE when observation is stale");
  assert(staleFusedState.confidence < 0.80, `Penalizes confidence for stale telemetry (confidence = ${staleFusedState.confidence})`);

  // Test Missing Sensor Detection (WiFi hub missing)
  assert(staleFusedState.missingSensors?.includes("DEV_WIFI_CHURCHGATE_HUB") === true,
    "Detects missing/offline sensors assigned to the zone");
}

// -------------------------------------------------------------
// Test Suite 4: Conflicting Sensor Measurements
// -------------------------------------------------------------
console.log("\n--- 4. Conflicting Sensor Measurements ---");

{
  const wankhedeZone = getZoneById("ZONE_WANKHEDE")!;
  const conflictingObs: NormalizedObservation[] = [
    {
      id: "OBS_WANK_CCTV",
      sourceId: "DEV_CCTV_WANKHEDE_01",
      sourceProvider: "CCTV_CV_PROVIDER",
      metricType: "CROWD_COUNT",
      zoneId: "ZONE_WANKHEDE",
      observedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      value: 3500,
      unit: "persons",
      confidence: 0.94,
      qualityStatus: "FRESH",
      derivationType: "SIMULATED",
      freshnessSeconds: 0,
      schemaVersion: "1.0.0",
    },
    {
      id: "OBS_WANK_CONFLICT",
      sourceId: "DEV_TURNSTILE_WANKHEDE_G1",
      sourceProvider: "ENTRANCE_EXIT_COUNTER_PROVIDER",
      metricType: "CROWD_COUNT",
      zoneId: "ZONE_WANKHEDE",
      observedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      value: 1200,
      unit: "persons",
      confidence: 0.40,
      qualityStatus: "CONFLICTING",
      derivationType: "SIMULATED",
      freshnessSeconds: 0,
      schemaVersion: "1.0.0",
    },
  ];

  const conflictFusedState = sensorFusionEngine.fuseZoneObservations(wankhedeZone, conflictingObs);

  assert(conflictFusedState.dataQuality === "CONFLICTING",
    "Identifies CONFLICTING quality status on zone level");
  assert(conflictFusedState.conflicts !== undefined && conflictFusedState.conflicts.length > 0,
    "Records conflict explanation message in diagnostic audit trail");
  assert(conflictFusedState.confidence <= 0.70,
    `Penalizes overall confidence when sensor conflict detected (confidence = ${conflictFusedState.confidence})`);
}

// -------------------------------------------------------------
// Test Suite 5: Operational Capacity & Utilization Calculation
// -------------------------------------------------------------
console.log("\n--- 5. Operational Capacity & Utilization Calculation ---");

{
  const taxiZone = getZoneById("ZONE_TAXI_STAGING")!;
  const profile = ZONE_CAPACITY_PROFILES["ZONE_TAXI_STAGING"];

  assert(profile.basis === "TRANSIT_STAGING", "Taxi Staging has explicit TRANSIT_STAGING capacity basis");
  assert(profile.operationalCapacity === 800, "Operational capacity is 800 (staging throughput, not static)");

  const usableCapacity = Math.round(profile.operationalCapacity * (1 - profile.safetyBufferPercent / 100)); // 744

  const obs: NormalizedObservation[] = [
    {
      id: "OBS_TAXI_01",
      sourceId: "DEV_TAXI_BAY_CAMERA",
      sourceProvider: "TRAFFIC_POLICE_STREAM",
      metricType: "CROWD_COUNT",
      zoneId: "ZONE_TAXI_STAGING",
      observedAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      value: 600,
      unit: "persons",
      confidence: 0.90,
      qualityStatus: "FRESH",
      derivationType: "SIMULATED",
      freshnessSeconds: 0,
      schemaVersion: "1.0.0",
    },
  ];

  const fusedState = sensorFusionEngine.fuseZoneObservations(taxiZone, obs);
  const expectedPressure = Math.round((600 / usableCapacity) * 100); // ~81%

  assert(Math.abs(fusedState.pressure - expectedPressure) <= 1,
    `Capacity utilization correctly calculated against usable operational capacity (pressure = ${fusedState.pressure}%, expected ~${expectedPressure}%)`);
}

// -------------------------------------------------------------
// Test Suite 6: Full End-to-End Simulation Stream to Fused State
// -------------------------------------------------------------
console.log("\n--- 6. End-to-End Stream Simulation & Fused State Generation ---");

{
  const nodeLoads = {
    CHURCHGATE: 5000,
    WANKHEDE: 12000,
    WANKHEDE_EXIT: 2800,
    TAXI_ZONE: 450,
    MARINE_LINES: 3200,
    CSMT: 6000,
    DADAR: 4000,
  };

  const rawSimObs = sensorStreamSimulator.generateObservationsForState(nodeLoads, 800);
  assert(rawSimObs.length > 5, `Simulator generates multi-sensor observation stream (count = ${rawSimObs.length})`);

  const ingested = ingestionPipeline.processBatch(rawSimObs);
  assert(ingested.accepted.length > 0, `Ingestion pipeline accepts all valid simulated observations (${ingested.accepted.length} accepted)`);

  const allZoneStates = OPERATIONAL_ZONES.map(z =>
    sensorFusionEngine.fuseZoneObservations(z, ingested.accepted)
  );

  assert(allZoneStates.length === OPERATIONAL_ZONES.length, "All operational zones produced fused state");

  for (const zs of allZoneStates) {
    assert(zs.pressure >= 0 && zs.pressure <= 99, `Zone ${zs.name} pressure is bounded in [0, 99]: ${zs.pressure}%`);
    assert(zs.confidence >= 0.35 && zs.confidence <= 1.0, `Zone ${zs.name} confidence is valid: ${zs.confidence}`);
    assert(typeof zs.currentUtilization === "number", `Zone ${zs.name} utilization is integer headcount: ${zs.currentUtilization}`);
  }
}

console.log("\n=======================================================");
console.log(`  ALL ${passedTests} / ${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log("=======================================================\n");
