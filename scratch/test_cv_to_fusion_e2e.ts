// ============================================================
// JUNCTION - End-to-End Verification: CV Observations -> Fusion -> Zone State
// ============================================================

import fs from "fs";
import path from "path";
import { ingestionPipeline } from "../src/services/ingestionPipeline";
import { sensorFusionEngine } from "../src/services/sensorFusionEngine";
import { OPERATIONAL_ZONES } from "../src/services/zoneRegistry";
import { NormalizedObservation } from "../src/types";

console.log("==========================================================================================");
console.log("JUNCTION E2E PIPELINE TRACE: CV INFERENCE -> SERIALIZER -> INGESTION -> FUSION -> ZONE STATE");
console.log("==========================================================================================\n");

// 1. Read emitted JSONL records from real validation run
const jsonlPath = path.resolve("artifacts/venue_entrance_observations.jsonl");
if (!fs.existsSync(jsonlPath)) {
  console.error("❌ Error: artifacts/venue_entrance_observations.jsonl not found.");
  process.exit(1);
}

const fileLines = fs.readFileSync(jsonlPath, "utf-8").split("\n").filter(l => l.trim().length > 0);
const rawObservations: NormalizedObservation[] = fileLines.map(line => JSON.parse(line));
console.log(`[1] Read ${rawObservations.length} serialized observations from '${jsonlPath}'.`);

// 2. Process through Ingestion Pipeline (Validation, Deduplication, Quality Scoring)
const pipelineResult = ingestionPipeline.processBatch(rawObservations);
console.log(`[2] Ingestion Pipeline: ${pipelineResult.accepted.length} accepted, ${pipelineResult.quarantined.length} quarantined, ${pipelineResult.deduplicatedCount} deduplicated.`);

// 3. Sensor Fusion Engine: Fuse into Target Zone (ZONE_WANKHEDE)
const targetZoneDef = OPERATIONAL_ZONES.find(z => z.id === "ZONE_WANKHEDE")!;
const fusedZoneState = sensorFusionEngine.fuseZoneObservations(targetZoneDef, pipelineResult.accepted);

console.log("\n[3] Sensor Fusion Result for Wankhede Egress Gate:");
console.log(`    • Zone Name: ${fusedZoneState.name} (${fusedZoneState.id})`);
console.log(`    • Fused Occupancy / Utilization: ${fusedZoneState.currentUtilization} persons`);
console.log(`    • Fused Inflow Rate: ${fusedZoneState.inflowRate} persons/min`);
console.log(`    • Fused Outflow Rate: ${fusedZoneState.outflowRate} persons/min`);
console.log(`    • Calculated Pressure Score: ${fusedZoneState.pressure}% [${fusedZoneState.pressureLevel}]`);
console.log(`    • Fused Confidence Score: ${(fusedZoneState.confidence * 100).toFixed(1)}%`);
console.log(`    • Data Source / Derivation: ${fusedZoneState.source}`);
console.log(`    • Multi-Horizon Predictions: +15m: ${fusedZoneState.predictedPressure15}%, +30m: ${fusedZoneState.predictedPressure30}%, +60m: ${fusedZoneState.predictedPressure60}%`);

// Assertions
let passed = 0;
let failed = 0;

function assert(condition: boolean, title: string) {
  if (condition) {
    console.log(`✅ PASS: ${title}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${title}`);
    failed++;
  }
}

console.log("\n--- Verification Assertions ---");
assert(pipelineResult.accepted.length > 0, "Ingestion pipeline accepted real CV observations");
assert(fusedZoneState.id === "ZONE_WANKHEDE", "Zone ID matched target egress gate");
assert(fusedZoneState.pressure >= 0 && fusedZoneState.pressure <= 100, "Pressure score is bounded in [0, 100]");
assert(fusedZoneState.confidence > 0, "Confidence is evaluated and positive");
assert(fusedZoneState.activeBottlenecks !== undefined, "Active bottlenecks evaluated based on real observations");

console.log(`\nTrace Complete: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) process.exit(1);
