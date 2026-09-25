// ============================================================
// JUNCTION - Full-System Verification & Quality Audit Suite
// ============================================================

import {
  getAllZones,
  getZoneById,
  getAllZoneCoverageProfiles,
  getZoneCoverageProfile,
} from "../src/services/zoneRegistry";
import { deviceRegistry } from "../src/services/deviceRegistry";
import { SensorStreamSimulator } from "../src/services/sensorStreamSimulator";
import { IngestionPipeline } from "../src/services/ingestionPipeline";
import { SensorFusionEngine } from "../src/services/sensorFusionEngine";
import {
  OsmRoadRoutingProvider,
  buildRoadConstrainedPath,
  snapPointToNearestRoad,
  calculateDistanceMeters,
} from "../src/services/routingEngine";
import { OSM_SOUTH_MUMBAI_ROADS } from "../src/data/osmRoadNetwork";
import { recommendationLifecycleEngine } from "../src/services/recommendationLifecycleEngine";
import { persistenceService } from "../src/services/persistenceService";
import { hospitalityDemandService } from "../src/services/hospitalityDemandService";
import { STATIC_RESOURCES } from "../src/data/mockResources";
import { MOCK_HOTELS_BASE } from "../src/data/mockHotels";
import { MOCK_RESTAURANTS_BASE } from "../src/data/mockRestaurants";
import { NormalizedObservation, ZoneState, Resource } from "../src/types";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` -> ${detail}` : ""}`);
    failedCount++;
  }
}

async function runFullSystemSuite() {
  console.log("\n=======================================================");
  console.log("  JUNCTION Master Implementation Verification Suite");
  console.log("=======================================================\n");

  // =========================================================================
  // SUITE 1: Operational Zone Coverage & Honesty Contracts
  // =========================================================================
  console.log("--- 1. Zone Coverage & Data Honesty Contracts ---");
  const allZones = getAllZones();
  assert(allZones.length === 7, "All 7 canonical operational zones are registered", `Found ${allZones.length}`);

  const coverageProfiles = getAllZoneCoverageProfiles();
  assert(coverageProfiles.length === 9, "Coverage profiles defined for all 9 operational areas (zones, subzones, corridors)", `Found ${coverageProfiles.length}`);

  const wankhedeCov = getZoneCoverageProfile("ZONE_WANKHEDE");
  assert(wankhedeCov.coverageStatus === "FULL", "Wankhede has FULL coverage status");
  assert(wankhedeCov.canTriggerOperationalRecommendations === true, "Wankhede can trigger operational recommendations");
  assert(wankhedeCov.maxPermittedConfidence === 1.0, "Wankhede max permitted confidence is 1.0");

  const wankhedeExitCov = getZoneCoverageProfile("WANKHEDE_EXIT");
  assert(wankhedeExitCov.coverageStatus === "FULL", "Wankhede Exit Gates subzone has FULL coverage profile");
  assert(wankhedeExitCov.registeredDeviceCount === 3, "Wankhede Exit Gates has 3 registered hardware nodes");

  const mahapalikaCov = getZoneCoverageProfile("ZONE_MAHAPALIKA");
  assert(mahapalikaCov.coverageStatus === "PARTIAL", "Mahapalika Marg corridor is classified as PARTIAL coverage");
  assert(mahapalikaCov.fallbackBehavior === "TOPOLOGY_PROPAGATION", "Mahapalika uses TOPOLOGY_PROPAGATION fallback");

  const csmtCov = getZoneCoverageProfile("ZONE_CSMT");
  assert(csmtCov.coverageStatus === "UNINSTRUMENTED", "CSMT is honestly classified as UNINSTRUMENTED");
  assert(csmtCov.dataSource === "REGIONAL_BASELINE", "CSMT data source is REGIONAL_BASELINE");
  assert(csmtCov.maxPermittedConfidence <= 0.50, "CSMT max permitted confidence is capped at <= 0.50");
  assert(csmtCov.canTriggerOperationalRecommendations === false, "Uninstrumented CSMT cannot trigger automated recommendations");

  const dadarCov = getZoneCoverageProfile("ZONE_DADAR");
  assert(dadarCov.coverageStatus === "UNINSTRUMENTED", "Dadar is honestly classified as UNINSTRUMENTED");
  assert(dadarCov.maxPermittedConfidence <= 0.50, "Dadar confidence capped at <= 0.50");

  // =========================================================================
  // SUITE 2: Multi-Modal Ingestion & Sensor Fusion
  // =========================================================================
  console.log("\n--- 2. Multi-Modal Ingestion & Sensor Fusion ---");
  const simulator = new SensorStreamSimulator({ scenarioId: "POST_EVENT_SURGE" });
  simulator.initializeDefaultDevices();

  const registeredDevices = deviceRegistry.getAll();
  assert(registeredDevices.length >= 6, "Default hardware nodes registered in DeviceRegistry", `Found ${registeredDevices.length}`);

  const sampleLoads: Record<string, number> = {
    WANKHEDE: 4200,
    WANKHEDE_EXIT: 3100,
    CHURCHGATE: 5200,
    TAXI_ZONE: 600,
    MARINE_LINES: 1800,
    CSMT: 4500,
  };
  const rawSimStream = simulator.generateObservationsForState(sampleLoads, 280);
  assert(rawSimStream.length > 0, "Simulator emits batch of hardware observations", `Generated ${rawSimStream.length}`);

  const ingestion = new IngestionPipeline();
  const ingestResult = ingestion.processBatch(rawSimStream);
  assert(ingestResult.accepted.length > 0, "Ingestion pipeline accepts valid simulated observations", `Accepted ${ingestResult.accepted.length}`);
  assert(ingestResult.quarantined.length === 0, "No valid simulated observations quarantined");

  // Deduplication check
  const dupResult = ingestion.processBatch(rawSimStream);
  assert(dupResult.accepted.length === 0, "Deduplicator drops duplicate observation batch");
  assert(dupResult.deduplicatedCount === rawSimStream.length, "All re-ingested observations quarantined as duplicates");

  // Fusion Check
  const fusionEngine = new SensorFusionEngine();
  const fusedStates: ZoneState[] = allZones.map((zone) =>
    fusionEngine.fuseZoneObservations(zone, ingestResult.accepted, {
      scenario: "POST_EVENT_SURGE",
      resources: STATIC_RESOURCES as unknown as Resource[],
      hotels: MOCK_HOTELS_BASE,
    })
  );

  assert(fusedStates.length === 7, "All 7 operational zones produce canonical ZoneState", `Produced ${fusedStates.length}`);

  const wankhedeState = fusedStates.find(z => z.id === "ZONE_WANKHEDE");
  assert(wankhedeState !== undefined, "Wankhede fused state exists");
  assert(wankhedeState!.pressure >= 0 && wankhedeState!.pressure <= 99, "Wankhede pressure is bounded in [0, 99]", `${wankhedeState?.pressure}%`);
  assert(wankhedeState!.fusionDiagnostics !== undefined, "Wankhede state contains explainable fusionDiagnostics");
  assert(wankhedeState!.fusionDiagnostics!.contributingSensors.length > 0, "Wankhede diagnostics lists contributing sensors");

  // =========================================================================
  // SUITE 3: OSM Road Network Routing & Road Concurrency
  // =========================================================================
  console.log("\n--- 3. OSM Road Network Routing & Road Concurrency ---");
  const routingProvider = new OsmRoadRoutingProvider();

  // Test snapPointToNearestRoad
  const churchgatePoint = { latitude: 18.9355, longitude: 72.8272 };
  const snapRes = snapPointToNearestRoad(churchgatePoint, OSM_SOUTH_MUMBAI_ROADS);
  assert(snapRes.segment !== undefined, "Snaps Churchgate coordinates to OSM road network");
  assert(snapRes.segment.name.length > 0, `Snapped to named road: ${snapRes.segment.name}`);

  // Test buildRoadConstrainedPath between Wankhede and Marine Lines
  const wankhedePoint = { latitude: 18.9389, longitude: 72.8258 };
  const marineLinesPoint = { latitude: 18.9436, longitude: 72.8236 };
  const roadPath = buildRoadConstrainedPath([wankhedePoint, marineLinesPoint], OSM_SOUTH_MUMBAI_ROADS);

  assert(roadPath.length >= 2, "Builds multi-waypoint road-constrained path", `Waypoints: ${roadPath.length}`);

  // Verify all points on path belong to OSM road network geometry
  let roadAdherencePassed = true;
  for (const pt of roadPath) {
    const nearest = snapPointToNearestRoad(pt, OSM_SOUTH_MUMBAI_ROADS);
    const dist = calculateDistanceMeters(pt, nearest.snapped);
    if (dist > 5) {
      roadAdherencePassed = false;
      break;
    }
  }
  assert(roadAdherencePassed, "All path coordinates strictly adhere to OSM road network geometry (<= 5m deviation)");

  // Test multi-point routing provider
  const routeResult = await routingProvider.getRoute(wankhedePoint, churchgatePoint);
  assert(routeResult.distanceKm > 0, "Calculates positive road distance", `${routeResult.distanceKm} km`);
  assert(routeResult.estimatedTimeMin > 0, "Calculates positive travel time", `${routeResult.estimatedTimeMin} min`);
  assert(routeResult.roadNames.length > 0, "Identifies traversed road names", routeResult.roadNames.join(", "));
  assert(routeResult.isValidRoute === true, "Flags calculated road path as isValidRoute: true");
  assert(routeResult.congestionFactor >= 1.0, "Includes dynamic congestion scaling factor", `${routeResult.congestionFactor}x`);

  // Test no-route handling with empty waypoints
  const noRouteRes = await routingProvider.getMultiPointRoute([]);
  assert(noRouteRes.isValidRoute === false, "Handles empty waypoints gracefully with isValidRoute: false");
  assert(noRouteRes.warning !== undefined, "Provides actionable warning for invalid route queries");

  // =========================================================================
  // SUITE 4: Intelligence Traceability & Recommendation Lifecycle
  // =========================================================================
  console.log("\n--- 4. Recommendation Evidence Traceability & Lifecycle ---");
  recommendationLifecycleEngine.resetCooldowns();

  const highPressureZones: ZoneState[] = [
    {
      ...wankhedeState!,
      pressure: 92,
      confidence: 0.94,
      currentUtilization: 3800,
    },
    {
      id: "ZONE_CHURCHGATE",
      name: "Churchgate Western Railway Terminal Hub",
      tier: "TIER_1_CRITICAL",
      baseTier: "TIER_1_CRITICAL",
      monitoringStatus: "CONTINUOUS",
      isEscalated: false,
      pressure: 90,
      predictedPressure15: 92,
      predictedPressure30: 95,
      predictedPressure60: 95,
      pressureLevel: "HIGH",
      trend: "INCREASING",
      inflowRate: 350,
      outflowRate: 200,
      netFlow: 150,
      totalCapacity: 10000,
      currentUtilization: 9000,
      availableCapacity: 1000,
      usableCapacity: 1000,
      activeBottlenecks: ["Churchgate Concourse (90%)"],
      memberResources: ["CHURCHGATE"],
      lastUpdated: "JUST NOW",
      confidence: 0.91,
      source: "SIMULATED",
    },
  ];

  const interventions = recommendationLifecycleEngine.generateInterventions(highPressureZones);
  assert(interventions.length >= 2, "Generates actionable interventions for high pressure zones", `Generated ${interventions.length}`);

  // Test Duplicate Suppression (Cooldown)
  const immediateSecondGen = recommendationLifecycleEngine.generateInterventions(highPressureZones);
  assert(immediateSecondGen.length === 0, "Duplicate suppression cooldown blocks redundant proposals within 5 minutes");

  const churchgateIntervention = interventions.find(i => i.targetZoneId === "ZONE_CHURCHGATE");
  assert(churchgateIntervention !== undefined, "Churchgate diversion recommendation generated");
  assert(churchgateIntervention!.status === "PROPOSED", "Initial intervention lifecycle status is PROPOSED");
  assert(churchgateIntervention!.contributingSignals.length >= 3, "Intervention contains explainable signal evidence");
  assert(churchgateIntervention!.confidenceScore >= 0.85, "Intervention carries verifiable confidence score");

  // Approval Process Test
  const approvalDecision = recommendationLifecycleEngine.processApproval(
    churchgateIntervention!,
    "APPROVE",
    "USER_ORGANIZER_01",
    "ORGANIZER"
  );
  assert(approvalDecision.updatedIntervention.status === "APPROVED", "Intervention transitions to APPROVED upon operator action");
  assert(approvalDecision.auditRecord.actorId === "USER_ORGANIZER_01", "Audit record captures authenticated actor ID");
  assert(approvalDecision.auditRecord.category === "RECOMMENDATION_APPROVAL", "Audit category is RECOMMENDATION_APPROVAL");

  // Execution Transition Test
  const executionDecision = recommendationLifecycleEngine.executeIntervention(
    approvalDecision.updatedIntervention,
    "USER_ORGANIZER_01",
    "ORGANIZER"
  );
  assert(executionDecision.updatedIntervention.status === "EXECUTED", "Transitions APPROVED intervention to EXECUTED upon confirmation");
  assert(executionDecision.auditRecord.category === "OPERATIONAL_OVERRIDE", "Execution recorded as OPERATIONAL_OVERRIDE audit event");

  // Invalid Transition Guard Test (Cannot execute PROPOSED without prior approval)
  let invalidTransitionBlocked = false;
  try {
    const unapprovedIntervention = interventions[1];
    recommendationLifecycleEngine.executeIntervention(unapprovedIntervention, "USER_OPERATOR_02", "ORGANIZER");
  } catch {
    invalidTransitionBlocked = true;
  }
  assert(invalidTransitionBlocked, "Enforces lifecycle rule: Cannot EXECUTE unapproved PROPOSED intervention");

  // Rejection Process Test
  recommendationLifecycleEngine.resetCooldowns();
  const freshInterventions = recommendationLifecycleEngine.generateInterventions(highPressureZones);
  const taxiIntervention = freshInterventions.find(i => i.targetZoneId === "ZONE_TAXI_STAGING") || freshInterventions[0];
  const rejectionDecision = recommendationLifecycleEngine.processApproval(
    taxiIntervention,
    "REJECT",
    "USER_ORGANIZER_01",
    "ORGANIZER"
  );
  assert(rejectionDecision.updatedIntervention.status === "REJECTED", "Intervention transitions to REJECTED upon operator action");
  assert(rejectionDecision.auditRecord.category === "RECOMMENDATION_REJECTION", "Audit category is RECOMMENDATION_REJECTION");

  // Persistence & Storage Diagnostics Test
  const auditTrail = await persistenceService.getAuditTrail(10);
  assert(auditTrail.length >= 2, "PersistenceService maintains complete audit trail", `Trail count: ${auditTrail.length}`);

  const storageDiag = persistenceService.getStorageDiagnostics();
  assert(storageDiag.storageMode === "DURABLE_POSTGRES" || storageDiag.storageMode === "IN_MEMORY_SESSION", "Exposes transparent storageMode diagnostic");
  assert(storageDiag.inMemoryAuditRecordCount > 0, "Tracks active in-memory audit record count", `Count: ${storageDiag.inMemoryAuditRecordCount}`);

  // =========================================================================
  // SUITE 5: Hospitality Demand Propagation & Commercial Vouchers
  // =========================================================================
  console.log("\n--- 5. Hospitality Demand Propagation & Voucher Rules ---");
  const hospitalityResult = hospitalityDemandService.propagateDemandToHospitality(
    MOCK_HOTELS_BASE,
    MOCK_RESTAURANTS_BASE,
    450, // egressOutflowRate
    3200 // venueExitLoad
  );

  assert(hospitalityResult.updatedHotels.length === MOCK_HOTELS_BASE.length, "Propagates demand across all partner hotels");
  assert(hospitalityResult.updatedRestaurants.length === MOCK_RESTAURANTS_BASE.length, "Propagates demand across all partner restaurants");
  assert(hospitalityResult.demandSignals.length > 0, "Emits high-pressure demand signals for hospitality surges");
  assert(hospitalityResult.recommendedVoucherInterventions.length > 0, "Generates digital voucher recommendations for restaurants with open capacity");

  const voucherIntervention = hospitalityResult.recommendedVoucherInterventions[0];
  assert(voucherIntervention.type === "HOSPITALITY_DEMAND_SIGNAL", "Voucher recommendation type is HOSPITALITY_DEMAND_SIGNAL");
  assert(voucherIntervention.status === "PROPOSED", "Voucher recommendation starts in PROPOSED status");
  assert(voucherIntervention.requiresApproval === true, "Commercial vouchers require operator approval");

  console.log("\n=======================================================");
  console.log(`  SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runFullSystemSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
