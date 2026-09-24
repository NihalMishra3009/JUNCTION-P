import { sensorStreamSimulator } from "../src/services/sensorStreamSimulator";
import { deviceRegistry } from "../src/services/deviceRegistry";
import { ingestionPipeline } from "../src/services/ingestionPipeline";
import { sensorFusionEngine } from "../src/services/sensorFusionEngine";
import { OPERATIONAL_ZONES, fuseZoneState } from "../src/services/zoneRegistry";
import { getResources, getHotels } from "../src/services/mockDataService";
import { createInitialSimulationState, nextSimulationState, calculateOutflowRate } from "../src/services/simulationEngine";
import { ScenarioId } from "../src/types";

sensorStreamSimulator.initializeDefaultDevices();

console.log("==========================================================================================");
console.log("SIMULATION PROGRESSION: Comparing Legacy zoneRegistry vs SensorFusionEngine at Minute 15 (Surge Peak)");
console.log("==========================================================================================");

let simState = createInitialSimulationState("POST_EVENT_SURGE", 33000);
// Step simulation to minute 15
for (let min = 1; min <= 15; min++) {
  simState = nextSimulationState(simState, 1, "POST_EVENT_SURGE", 33000, false);
}

console.log(`Simulation Time: ${simState.simulationTime} | Minutes Elapsed: ${simState.minutesElapsed} | Total Exited: ${simState.totalExitedVenue}`);
console.log("Active Node Loads:", simState.nodeLoads);

const outflowRate = calculateOutflowRate(simState.minutesElapsed, "POST_EVENT_SURGE", 33000);
sensorStreamSimulator.setConfig({ scenarioId: "POST_EVENT_SURGE" });
const rawObs = sensorStreamSimulator.generateObservationsForState(simState.nodeLoads, outflowRate);
const acceptedObs = ingestionPipeline.processBatch(rawObs).accepted;

const resources = getResources("POST_EVENT_SURGE", false).map(r => {
  const simLoad = simState.nodeLoads[r.id];
  if (simLoad !== undefined) {
    const cap = r.totalCapacity || 1000;
    const pressure = Math.min(99, Math.max(20, Math.round((simLoad / cap) * 100)));
    return { ...r, pressure, currentUtilization: simLoad };
  }
  return r;
});
const hotels = getHotels("POST_EVENT_SURGE", {});

console.log(`\nZone ID                | Legacy Pressure | Fused (Engine) | Legacy Status | Fused Status | Legacy Bottlenecks | Fused Bottlenecks`);
console.log(`-----------------------+-----------------+----------------+---------------+--------------+--------------------+------------------`);

for (const zone of OPERATIONAL_ZONES) {
  const legacyState = fuseZoneState(zone, resources, hotels, "POST_EVENT_SURGE", simState, false);
  const fusedState = sensorFusionEngine.fuseZoneObservations(zone, acceptedObs);

  const legacyP = `${legacyState.pressure}% (${legacyState.pressureLevel})`.padEnd(15);
  const fusedP = `${fusedState.pressure}% (${fusedState.pressureLevel})`.padEnd(14);
  const legacyS = legacyState.monitoringStatus.padEnd(13);
  const fusedS = fusedState.monitoringStatus.padEnd(12);
  const legacyB = (legacyState.activeBottlenecks.join(",") || "None").slice(0, 18).padEnd(18);
  const fusedB = (fusedState.activeBottlenecks.join(",") || "None").slice(0, 18);

  console.log(`${zone.id.padEnd(22)} | ${legacyP} | ${fusedP} | ${legacyS} | ${fusedS} | ${legacyB} | ${fusedB}`);
}
