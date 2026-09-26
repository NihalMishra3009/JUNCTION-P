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
import { IngestionPipeline, ingestionPipeline } from "../src/services/ingestionPipeline";
import { SensorFusionEngine, sensorFusionEngine } from "../src/services/sensorFusionEngine";
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
import { forecastingService } from "../src/services/forecastingService";
import { hotspotAndCascadeEngine } from "../src/services/hotspotAndCascadeEngine";
import { createInitialSimulationState, nextSimulationState } from "../src/services/simulationEngine";
import { NormalizedObservation, ZoneState, Resource, OperationalIntervention, ActiveIntervention, ZoneBaselineSnapshot } from "../src/types";

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
  // =========================================================================
  // SUITE 6: Live Forecasting & Dynamic Prediction Pipeline
  // =========================================================================
  console.log("\n--- 6. Live Dynamic Forecasting & Prediction Pipeline ---");
  
  // 1. Initial State (t=0) Egress Surge
  const simT0 = createInitialSimulationState("POST_EVENT_SURGE", 33000);
  const baseChurchgateLoadT0 = simT0.nodeLoads["CHURCHGATE"] || 2100;
  const basePressureT0 = Math.round((baseChurchgateLoadT0 / 10000) * 100);
  
  const forecastT0 = forecastingService.generateResourceForecast(
    "CHURCHGATE",
    "Churchgate Station",
    "ZONE_CHURCHGATE",
    basePressureT0,
    "POST_EVENT_SURGE"
  );
  assert(forecastT0.currentPressure === basePressureT0, "Forecast T0 consumes live initial pressure");
  assert(forecastT0.forecastPoints.length === 4, "Forecast produces 4 horizons (+15m, +30m, +45m, +60m)");
  assert(forecastT0.algorithmUsed === "SCENARIO_CURVE", "Uses authoritative ForecastingService without duplicates");

  // 2. Advance Simulation through multiple ticks (20 simulated minutes)
  let simT20 = simT0;
  for (let i = 0; i < 20; i++) {
    simT20 = nextSimulationState(simT20, 1, "POST_EVENT_SURGE", 33000, false);
  }
  const liveChurchgateLoadT20 = simT20.nodeLoads["CHURCHGATE"] || 0;
  const livePressureT20 = Math.round((liveChurchgateLoadT20 / 10000) * 100);
  
  assert(liveChurchgateLoadT20 > baseChurchgateLoadT0, "Simulation playback dynamically increases Churchgate attendee load over 20 minutes", `Load t0: ${baseChurchgateLoadT0}, load t20: ${liveChurchgateLoadT20}`);
  assert(livePressureT20 > basePressureT0, "Simulated operational pressure increases with attendee accumulation", `Pressure t0: ${basePressureT0}%, t20: ${livePressureT20}%`);

  const forecastT20 = forecastingService.generateResourceForecast(
    "CHURCHGATE",
    "Churchgate Station",
    "ZONE_CHURCHGATE",
    livePressureT20,
    "POST_EVENT_SURGE"
  );
  assert(forecastT20.currentPressure === livePressureT20, "Forecast re-evaluates from live updated operational pressure (t=20)");
  assert(forecastT20.forecastPoints[0].predictedPressure > forecastT0.forecastPoints[0].predictedPressure, "Predictions dynamically change during simulation playback", `t0 +15m: ${forecastT0.forecastPoints[0].predictedPressure}%, t20 +15m: ${forecastT20.forecastPoints[0].predictedPressure}%`);

  // 3. Scenario Divergence Test: NORMAL vs POST_EVENT_SURGE
  const forecastNormal = forecastingService.generateResourceForecast(
    "CHURCHGATE",
    "Churchgate Station",
    "ZONE_CHURCHGATE",
    50,
    "NORMAL"
  );
  assert(forecastNormal.contributingFactors.some(f => f.includes("Nominal background dispersal")), "Scenario change alters surge velocity and contributing factor models");
  assert(forecastNormal.forecastPoints[3].predictedPressure < 50, "Normal scenario exhibits nominal dissipation over 60 minutes", `Normal +60m: ${forecastNormal.forecastPoints[3].predictedPressure}% vs start 50%`);

  // 4. Dynamic Cascade Matching Test
  const dynamicCascade = hotspotAndCascadeEngine.analyzeCascade("ZONE_WANKHEDE", livePressureT20, []);
  assert(dynamicCascade.rootResourceId === "ZONE_WANKHEDE", "Cascade analysis root resource dynamically binds to origin zone ID");
  assert(dynamicCascade.affectedPathways.length > 0, "Dynamic cascade produces multi-stage forward spillover pathways");
  // =========================================================================
  // SUITE 7: AI Recommendation Planning, Grounded Telemetry & Catalogue Bounds
  // =========================================================================
  console.log("\n--- 7. AI Recommendation Planning & Grounded Telemetry ---");
  const { aiRecommendationPlanner } = await import("../src/services/aiRecommendationPlanner");
  const { SUPPORTED_ACTION_CATALOGUE } = await import("../src/types/aiRecommendation");

  // 1. RecommendationContext Construction Test
  const baseZone: ZoneState = {
    id: "ZONE_CHURCHGATE",
    name: "Churchgate Station",
    tier: "TIER_1_CRITICAL",
    baseTier: "TIER_1_CRITICAL",
    monitoringStatus: "CONTINUOUS",
    isEscalated: false,
    pressure: 92,
    predictedPressure15: 94,
    predictedPressure30: 95,
    predictedPressure60: 88,
    pressureLevel: "CRITICAL",
    trend: "INCREASING",
    inflowRate: 180,
    outflowRate: 40,
    netFlow: 140,
    totalCapacity: 10000,
    currentUtilization: 9200,
    availableCapacity: 800,
    usableCapacity: 800,
    activeBottlenecks: ["Churchgate Entry"],
    memberResources: ["CHURCHGATE"],
    lastUpdated: new Date().toISOString(),
    confidence: 0.95,
    source: "OBSERVED",
    density: 4.8,
    contributingSensors: ["DEV_CCTV_CHURCHGATE_1", "DEV_WIFI_CHURCHGATE_HUB"],
    dataQuality: "FRESH",
    conflicts: [],
    missingSensors: [],
  };
  const fusedZones: ZoneState[] = [baseZone];

  const fullResources: Resource[] = STATIC_RESOURCES.map(r => ({
    ...r,
    pressure: 50,
    pressureLevel: "NORMAL" as const,
    currentUtilization: Math.round(r.totalCapacity * 0.5),
    availableCapacity: Math.round(r.totalCapacity * 0.5),
    predictedDemand: Math.round(r.totalCapacity * 0.5),
    trend: "STABLE" as const,
  }));

  const candidateInterventions = recommendationLifecycleEngine.generateInterventions(fusedZones);
  const context = aiRecommendationPlanner.buildContext(
    "POST_EVENT_SURGE",
    fusedZones,
    fullResources,
    [
      {
        id: "HOT_CHURCHGATE",
        resourceId: "CHURCHGATE",
        zoneId: "ZONE_CHURCHGATE",
        name: "Churchgate Exit Gates",
        location: { latitude: 18.9322, longitude: 72.8264 },
        currentPressure: 92,
        peakPredictedPressure: 96,
        severity: "CRITICAL",
        projectedOnsetMinutes: 15,
        projectedDurationMinutes: 45,
        radiusMeters: 250,
        keyDrivers: ["Post-match egress surge", "Single choke point"],
        confidence: 0.95,
      }
    ],
    dynamicCascade,
    candidateInterventions,
    simT20,
    false
  );

  assert(context.activeScenario === "POST_EVENT_SURGE", "Context accurately reflects active scenario");
  assert(context.zones.length === 1, "Context includes fused zone telemetry");
  assert(context.zones[0].pressure === 92, "Context preserves precise fused operational pressure");
  assert(context.zones[0].contributingSensors.length > 0, "Context includes verifiable sensor signals");
  assert(context.supportedActions.length === 7, "Context exposes strict 7 supported action types in catalogue");
  assert(context.fingerprint.length > 0, "Context computes operational fingerprint");

  // 2. Semantic Deduplication / Fingerprinting Test
  const fingerprint1 = aiRecommendationPlanner.computeFingerprint("POST_EVENT_SURGE", fusedZones, [], false);
  const fusedZonesMinorTick: ZoneState[] = [{ ...baseZone, pressure: 93 }]; // Still in CRIT band (>=90)
  const fingerprint2 = aiRecommendationPlanner.computeFingerprint("POST_EVENT_SURGE", fusedZonesMinorTick, [], false);
  assert(fingerprint1 === fingerprint2, "Minor simulation tick within same pressure band retains identical fingerprint (deduplication active)");

  const fusedZonesMajorDrop: ZoneState[] = [{ ...baseZone, pressure: 60, trend: "DECREASING" }]; // Drops to NORM band
  const fingerprint3 = aiRecommendationPlanner.computeFingerprint("POST_EVENT_SURGE", fusedZonesMajorDrop, [], false);
  assert(fingerprint1 !== fingerprint3, "Meaningful pressure band drop triggers fingerprint invalidation for fresh evaluation");

  // 3. Supported Action Catalogue Integrity
  const validActionTypes = SUPPORTED_ACTION_CATALOGUE.map(a => a.type);
  assert(validActionTypes.includes("REROUTE_ATTENDEES"), "Catalogue includes REROUTE_ATTENDEES");
  assert(validActionTypes.includes("ADD_TRANSIT_SHUTTLES"), "Catalogue includes ADD_TRANSIT_SHUTTLES");
  assert(validActionTypes.includes("GATE_CAPACITY_CHANGE"), "Catalogue includes GATE_CAPACITY_CHANGE");
  assert(!validActionTypes.includes("DISPATCH_AIRLIFT" as any), "Catalogue excludes unsupported/hallucinated action DISPATCH_AIRLIFT");
  assert(!validActionTypes.includes("CONSTRUCT_NEW_METRO" as any), "Catalogue excludes unsupported/hallucinated action CONSTRUCT_NEW_METRO");

  // 4. Deterministic Fallback & Grounded Impact Test
  const fallbackPlan = await aiRecommendationPlanner.getOrFetchPlan(context, true);
  assert(fallbackPlan.recommendations.length > 0, "Fallback generates valid operational recommendations");
  assert(fallbackPlan.source === "AI" || fallbackPlan.source === "DETERMINISTIC_FALLBACK" || fallbackPlan.source === "CACHED_AI", "Plan has explicit traceable source (AI, CACHED_AI, or DETERMINISTIC_FALLBACK)");
  assert(fallbackPlan.recommendations.every(r => r.expectedImpact.every(imp => imp.before >= 0 && imp.after <= 100)), "Expected impact values are bounded and physically grounded");

  // 5. Caching & Cooldown Protection Test
  const cachedPlan = await aiRecommendationPlanner.getOrFetchPlan(context, false);
  assert(cachedPlan !== null, "Planner returns valid plan on subsequent call");
  assert(cachedPlan.contextFingerprint === context.fingerprint, "Cached plan matches context fingerprint");
  const remainingCooldown = aiRecommendationPlanner.getRemainingCooldownSeconds();
  assert(remainingCooldown >= 0 && remainingCooldown <= 60, "Cooldown timer is active and bounded [0, 60s]", `Remaining: ${remainingCooldown}s`);

  // 6. Minor Jitter vs Major Phase Shift Fingerprinting Test
  const minorJitterZones: ZoneState[] = [{ ...baseZone, pressure: 91 }]; // 92 -> 91 (still >= 85 CRIT)
  const minorJitterFingerprint = aiRecommendationPlanner.computeFingerprint("POST_EVENT_SURGE", minorJitterZones, [], false);
  assert(minorJitterFingerprint === fingerprint1, "Minor pressure fluctuation (92% -> 91%) does not invalidate fingerprint (quota protected)");

  const phaseShiftFingerprint = aiRecommendationPlanner.computeFingerprint("MONSOON_DISRUPTION" as any, fusedZones, [], false);
  assert(phaseShiftFingerprint !== fingerprint1, "Scenario phase shift immediately invalidates fingerprint for re-evaluation");

  // 5. Human Decision Lifecycle Integrity
  const targetRec = fallbackPlan.recommendations[0];
  const testIntervention: OperationalIntervention = {
    id: targetRec.id,
    type: "REROUTE_ATTENDEES",
    title: targetRec.title,
    description: targetRec.action,
    targetZoneId: "ZONE_CHURCHGATE",
    status: "PROPOSED",
    urgency: "HIGH",
    requiresApproval: true,
    approvalRoleRequired: "ORGANIZER",
    rationale: targetRec.reason,
    contributingSignals: targetRec.evidence || ["Live pressure > 90%"],
    expectedPressureReductionPercent: 15,
    timeToEffectMinutes: 10,
    confidenceScore: 0.9,
    proposedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    rollbackFeasible: true,
  };
  const { updatedIntervention, auditRecord } = recommendationLifecycleEngine.processApproval(
    testIntervention,
    "APPROVE",
    "OPERATOR_CHIEF",
    "ORGANIZER"
  );
  // =========================================================================
  // SUITE 8: Approved Intervention → Simulated Operational Impact & Flow Conservation
  // =========================================================================
  console.log("\n--- 8. Approved Intervention → Simulated Operational Impact ---");
  const { interventionEffectsEngine } = await import("../src/services/interventionEffectsEngine");

  // 1. Baseline Capture Snapshot
  const initialSnapshot: Record<string, ZoneBaselineSnapshot> = {
    ZONE_CHURCHGATE: {
      zoneId: "ZONE_CHURCHGATE",
      zoneName: "Churchgate Station",
      pressure: 92,
      density: 4.8,
      currentUtilization: 9200,
      inflowRate: 180,
      outflowRate: 40,
      timestamp: new Date().toISOString(),
    },
    ZONE_MARINE_LINES: {
      zoneId: "ZONE_MARINE_LINES",
      zoneName: "Marine Lines Station",
      pressure: 45,
      density: 1.8,
      currentUtilization: 3600,
      inflowRate: 60,
      outflowRate: 50,
      timestamp: new Date().toISOString(),
    },
  };

  const activeTestIntervention: ActiveIntervention = {
    id: "ACT_INT_TEST_REROUTE",
    recommendationId: "REC_REROUTE_CHURCHGATE",
    type: "REROUTE_ATTENDEES",
    actionType: "REROUTE_ATTENDEES",
    title: "Divert Northbound Traffic to Marine Lines",
    description: "Signal navigation to divert crowd to Marine Lines.",
    sourceZoneId: "ZONE_CHURCHGATE",
    targetZoneId: "ZONE_MARINE_LINES",
    status: "ACTIVE",
    approvedAt: Date.now() - 20_000, // 20s ago (full ramp factor 1.0)
    approvedAtSimulationMinute: 10,
    durationMinutes: 30,
    rampDurationSeconds: 15,
    intensity: 1.0,
    baselines: initialSnapshot,
  };

  // 2. Ramp Factor Test
  const fullRamp = interventionEffectsEngine.computeRampFactor(activeTestIntervention, Date.now());
  assert(fullRamp === 1.0, "Intervention past ramp duration achieves full intensity (ramp = 1.0)");

  const earlyIntervention: ActiveIntervention = {
    ...activeTestIntervention,
    approvedAt: Date.now() - 5_000, // 5s ago (5/15 = 0.333)
  };
  const partialRamp = interventionEffectsEngine.computeRampFactor(earlyIntervention, Date.now());
  assert(partialRamp >= 0.3 && partialRamp <= 0.4, "Intervention gradually ramps effect over 15 seconds without instantaneous jump", `Ramp: ${partialRamp}`);

  // 3. Flow Conservation & Destination Fraction Redistribution Test
  const modifiers = interventionEffectsEngine.calculateModifiers([activeTestIntervention], 15);
  const totalFractions = Object.values(modifiers.destinationFractions).reduce((a, b) => a + b, 0);
  assert(Math.abs(totalFractions - 1.0) < 0.001, "Redistributed destination fractions strictly sum to 1.0 (Flow Conservation)", `Sum: ${totalFractions}`);
  assert(modifiers.destinationFractions.CHURCHGATE < 0.52, "Reroute intervention reduces Churchgate destination share", `Churchgate: ${modifiers.destinationFractions.CHURCHGATE} vs base 0.52`);
  assert(modifiers.destinationFractions.MARINE_LINES > 0.16, "Diverted passenger flow increases Marine Lines share", `Marine Lines: ${modifiers.destinationFractions.MARINE_LINES} vs base 0.16`);

  // 4. Simulation Engine Integration Test (No Direct ZoneState Mutation)
  let simWithIntervention = createInitialSimulationState("POST_EVENT_SURGE", 33000);
  let simWithoutIntervention = createInitialSimulationState("POST_EVENT_SURGE", 33000);

  // Advance both simulations for 15 simulated minutes
  for (let i = 0; i < 15; i++) {
    simWithIntervention = nextSimulationState(simWithIntervention, 1, "POST_EVENT_SURGE", 33000, [activeTestIntervention]);
    simWithoutIntervention = nextSimulationState(simWithoutIntervention, 1, "POST_EVENT_SURGE", 33000, []);
  }

  const churchgateLoadWith = simWithIntervention.nodeLoads["CHURCHGATE"] || 0;
  const churchgateLoadWithout = simWithoutIntervention.nodeLoads["CHURCHGATE"] || 0;
  const marineEdgeLoadWith = simWithIntervention.edgeLoads["EDGE_EXIT_MK_ROAD"] || 0;
  const marineEdgeLoadWithout = simWithoutIntervention.edgeLoads["EDGE_EXIT_MK_ROAD"] || 0;

  assert(churchgateLoadWith < churchgateLoadWithout, "Active intervention reduces accumulated Churchgate crowd in simulation engine", `With: ${churchgateLoadWith}, Without: ${churchgateLoadWithout}`);
  assert(marineEdgeLoadWith > marineEdgeLoadWithout, "Active intervention transfers crowd to receiving Marine Lines corridor (Flow Conservation)", `With: ${marineEdgeLoadWith}, Without: ${marineEdgeLoadWithout}`);

  // 5. Sensor Observation & Normalization of Changed State
  const simulatorInstance = new SensorStreamSimulator({ scenarioId: "POST_EVENT_SURGE" });
  const rawObsWithIntervention = simulatorInstance.generateObservationsForState(simWithIntervention.nodeLoads, 800);
  const normalizedObs = ingestionPipeline.processBatch(rawObsWithIntervention).accepted;
  assert(normalizedObs.length > 0, "Synthetic sensors observe modified simulation state and pass through ingestion pipeline");

  const churchgateCctvObs = normalizedObs.find(o => o.sourceId === "DEV_CCTV_CHURCHGATE_CONCOURSE" && o.metricType === "CROWD_COUNT");
  assert(churchgateCctvObs !== undefined, "Churchgate CCTV sensor emits observation from modified node load");

  // 6. Sensor Fusion Naturally Produces Changed ZoneState (Zero Direct Mutation)
  const churchgateZoneDef = getAllZones().find(z => z.id === "ZONE_CHURCHGATE")!;
  const fusedWithIntervention = sensorFusionEngine.fuseZoneObservations(churchgateZoneDef, normalizedObs, {
    scenario: "POST_EVENT_SURGE",
    simulationState: simWithIntervention,
  });

  const rawObsWithout = simulatorInstance.generateObservationsForState(simWithoutIntervention.nodeLoads, 800);
  const normalizedObsWithout = ingestionPipeline.processBatch(rawObsWithout).accepted;
  const fusedWithoutIntervention = sensorFusionEngine.fuseZoneObservations(churchgateZoneDef, normalizedObsWithout, {
    scenario: "POST_EVENT_SURGE",
    simulationState: simWithoutIntervention,
  });

  assert(fusedWithIntervention.pressure <= fusedWithoutIntervention.pressure, "Fused Churchgate ZoneState reflects operational pressure relief via natural sensor pipeline", `With intervention: ${fusedWithIntervention.pressure}%, Without: ${fusedWithoutIntervention.pressure}%`);

  // 7. Multi-Action & Node Clearance Modifier Test (ADD_TRANSIT_SHUTTLES)
  const shuttleIntervention: ActiveIntervention = {
    id: "ACT_INT_SHUTTLE",
    recommendationId: "REC_SHUTTLES",
    type: "ADD_TRANSIT_SHUTTLES",
    actionType: "ADD_TRANSIT_SHUTTLES",
    title: "Deploy 12 High-Capacity Shuttles to Taxi Bay",
    description: "Boost curbside clearance rate.",
    status: "ACTIVE",
    approvedAt: Date.now() - 20_000,
    approvedAtSimulationMinute: 10,
    durationMinutes: 30,
    rampDurationSeconds: 15,
    intensity: 1.0,
    baselines: {},
  };

  const multiModifiers = interventionEffectsEngine.calculateModifiers([activeTestIntervention, shuttleIntervention], 15);
  assert(multiModifiers.activeInterventionCount === 2, "Engine combines multiple active interventions deterministically");
  assert(multiModifiers.nodeClearanceAdditions["TAXI_ZONE"] > 100, "Shuttle dispatch intervention adds +140 pax/min clearance throughput to Taxi Staging Bay", `Added: ${multiModifiers.nodeClearanceAdditions["TAXI_ZONE"]}`);

  // 8. Intervention Expiration Test
  const expiredModifiers = interventionEffectsEngine.calculateModifiers([activeTestIntervention], 45); // 45 - 10 = 35m > duration 30m
  assert(expiredModifiers.activeInterventionCount === 0, "Intervention past its duration expires and returns simulation to baseline fractions");
  assert(expiredModifiers.destinationFractions.CHURCHGATE === 0.52, "Expired intervention restores Churchgate baseline fraction to 0.52");

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
