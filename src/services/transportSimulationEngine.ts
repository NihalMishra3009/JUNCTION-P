import {
  ScenarioId,
  SimulationParams,
  TransportSimulationState,
  TransportUnit,
  TransitRun,
  StationTransportState,
  TaxiQueueState,
  RoadCongestionState,
  TransportBoardingResult,
  GeoLocation,
} from "@/types";
import { MVP_ROAD_CORRIDORS } from "@/data/mockRoadNetwork";
import {
  RAILWAY_CORRIDORS,
  INITIAL_FLEET_CONFIG,
  interpolatePolyline,
} from "@/data/mockTransportData";

function formatSimulationTime(baseHour: number, baseMinute: number, elapsedMinutes: number): string {
  const totalMins = baseHour * 60 + baseMinute + Math.floor(elapsedMinutes);
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Creates the initial TransportSimulationState for a given scenario and parameters.
 */
export function createInitialTransportState(
  scenario: ScenarioId = "POST_EVENT_SURGE",
  params: SimulationParams = {
    attendance: 33000,
    eventDelay: 0,
    weather: "NORMAL",
    additionalBuses: 0,
    visitorRedistribution: 0,
    transportDisruption: false,
  }
): TransportSimulationState {
  const baseHour = scenario === "POST_EVENT_SURGE" ? 21 : 18;
  const baseMin = scenario === "POST_EVENT_SURGE" ? 30 : 30;

  const isDisruption = scenario === "TRANSPORT_DISRUPTION" || params.transportDisruption;
  const isRain = scenario === "HEAVY_RAIN" || params.weather === "HEAVY_RAIN";

  // 1. Initial Stations
  const stations: Record<string, StationTransportState> = {
    CHURCHGATE: {
      stationId: "CHURCHGATE",
      waitingPassengers: 0,
      availableCapacity: isDisruption ? 500 : 1200,
      activeRuns: ["RUN_WR_CG_01"],
      passengersBoardedThisTick: 0,
      nextDepartureMinute: 4,
      averageDelayMinutes: isDisruption ? 14 : 0,
      pressure: isDisruption ? 88 : 45,
    },
    MARINE_LINES: {
      stationId: "MARINE_LINES",
      waitingPassengers: 0,
      availableCapacity: isDisruption ? 300 : 800,
      activeRuns: ["RUN_WR_ML_01"],
      passengersBoardedThisTick: 0,
      nextDepartureMinute: 4,
      averageDelayMinutes: isDisruption ? 12 : 0,
      pressure: isDisruption ? 78 : 35,
    },
    CSMT: {
      stationId: "CSMT",
      waitingPassengers: 0,
      availableCapacity: 1400,
      activeRuns: ["RUN_CR_CSMT_01"],
      passengersBoardedThisTick: 0,
      nextDepartureMinute: 5,
      averageDelayMinutes: isDisruption ? 6 : 0,
      pressure: isDisruption ? 75 : 40,
    },
    DADAR: {
      stationId: "DADAR",
      waitingPassengers: 0,
      availableCapacity: 1600,
      activeRuns: ["RUN_INT_DADAR_01"],
      passengersBoardedThisTick: 0,
      nextDepartureMinute: 4,
      averageDelayMinutes: isDisruption ? 8 : 0,
      pressure: isDisruption ? 70 : 35,
    },
  };

  // 2. Initial Taxi Queue
  const taxiQueue: TaxiQueueState = {
    zoneId: "TAXI_ZONE",
    waitingPassengers: 0,
    availableCabs: INITIAL_FLEET_CONFIG.baseTaxis,
    dispatchedCabs: 0,
    dispatchRatePerMin: INITIAL_FLEET_CONFIG.taxiNominalDispatchRate,
    estimatedWaitMinutes: 0,
    passengersBoardedThisTick: 0,
  };

  // 3. Initial Road Congestion States
  const roads: Record<string, RoadCongestionState> = {};
  MVP_ROAD_CORRIDORS.forEach(corridor => {
    let baseCongestion = 45;
    if (corridor.id === "ROAD_MARINE_DR") baseCongestion = isDisruption ? 78 : 55;
    if (corridor.id === "ROAD_VEER_NARIMAN") baseCongestion = isDisruption ? 85 : 50;
    if (corridor.id === "ROAD_MAHARSHI_KARVE") baseCongestion = isDisruption ? 82 : 48;
    if (isRain) baseCongestion = Math.min(95, baseCongestion + 15);

    const dist = corridor.distanceKm || 2;
    const travelTimeMin = Math.round(dist * 3 * (1 + (baseCongestion - 50) / 100));
    let status: RoadCongestionState["status"] = "NORMAL";
    if (baseCongestion >= 90) status = "DISRUPTED";
    else if (baseCongestion >= 80) status = "CONGESTED";
    else if (baseCongestion >= 65) status = "HEAVY";

    roads[corridor.id] = {
      roadId: corridor.id,
      vehicleCount: 150,
      busCount: 4,
      taxiCount: 30,
      congestion: baseCongestion,
      travelTimeMin,
      status,
    };
  });

  // 4. Initial Transit Runs
  const transitRuns: TransitRun[] = [
    {
      id: "RUN_WR_101",
      mode: "TRAIN",
      name: "WR Fast Local #101",
      line: "WESTERN_RAILWAY",
      originId: "CHURCHGATE",
      destinationId: "DADAR",
      scheduledDepartureMinute: 0,
      actualDepartureMinute: 0,
      intervalMinutes: isDisruption ? 10 : 4,
      capacity: isDisruption ? 500 : 1200,
      passengers: 0,
      status: "SCHEDULED",
      delayMinutes: isDisruption ? 14 : 0,
    },
    {
      id: "RUN_CR_201",
      mode: "TRAIN",
      name: "CR Slow Local #201",
      line: "CENTRAL_RAILWAY",
      originId: "CSMT",
      destinationId: "DADAR",
      scheduledDepartureMinute: 0,
      actualDepartureMinute: 0,
      intervalMinutes: 5,
      capacity: 1400,
      passengers: 0,
      status: "SCHEDULED",
      delayMinutes: isDisruption ? 4 : 0,
    },
  ];

  return {
    simulationTime: formatSimulationTime(baseHour, baseMin, 0),
    minutesElapsed: 0,
    vehicleUnits: [],
    transitRuns,
    stations,
    taxiQueue,
    roads,
    metrics: {
      totalDemand: 0,
      waitingPassengers: 0,
      onVehiclePassengers: 0,
      completedPassengers: 0,
      totalActiveVehicles: 0,
      fleetSize: INITIAL_FLEET_CONFIG.baseBuses + (params.additionalBuses || 0) + INITIAL_FLEET_CONFIG.baseTaxis,
      totalBoardedCumulative: 0,
    },
    lastBoardingResult: {
      boardedByNode: {},
      totalBoarded: 0,
    },
  };
}

/**
 * Main Pure TypeScript Transport Simulation Step Function.
 *
 * Advances transport fleets, train departures, taxi queues, and road loads
 * based on human passenger demand at destination nodes.
 *
 * Reconciles boarded passengers so they are subtracted from human nodeLoads exactly once.
 */
export function nextTransportSimulationState(
  prevState: TransportSimulationState,
  humanNodeLoads: Record<string, number>,
  deltaMinutes: number,
  scenario: ScenarioId = "POST_EVENT_SURGE",
  params: SimulationParams = {
    attendance: 33000,
    eventDelay: 0,
    weather: "NORMAL",
    additionalBuses: 0,
    visitorRedistribution: 0,
    transportDisruption: false,
  },
  redistributionApplied = false
): TransportSimulationState {
  const newMinutesElapsed = prevState.minutesElapsed + deltaMinutes;
  const baseHour = scenario === "POST_EVENT_SURGE" ? 21 : 18;
  const baseMin = scenario === "POST_EVENT_SURGE" ? 30 : 30;
  const newTime = formatSimulationTime(baseHour, baseMin, newMinutesElapsed);

  const isDisruption = scenario === "TRANSPORT_DISRUPTION" || params.transportDisruption;
  const isRain = scenario === "HEAVY_RAIN" || params.weather === "HEAVY_RAIN";
  const rainSpeedMultiplier = isRain ? 0.65 : 1.0;

  const boardedByNode: Record<string, number> = {
    CHURCHGATE: 0,
    MARINE_LINES: 0,
    CSMT: 0,
    DADAR: 0,
    TAXI_ZONE: 0,
    WANKHEDE_EXIT: 0,
  };

  // =========================================================================
  // 1. TRAIN SIMULATION (Churchgate, Marine Lines, CSMT, Dadar)
  // =========================================================================
  const trainIntervalMin = isDisruption ? 10 : 4;
  const trainDelayMin = isDisruption ? 14 : 0;
  const trainNominalCapacity = isDisruption ? 550 : 1200;

  // Number of departures in this deltaMinutes window
  const trainDeparturesCount = Math.max(1, Math.round(deltaMinutes / trainIntervalMin));

  // A. Churchgate Station Train Boarding
  const cgDemand = humanNodeLoads["CHURCHGATE"] || 0;
  const cgTrainCapacity = trainNominalCapacity * trainDeparturesCount;
  const cgBoarded = Math.min(cgDemand, cgTrainCapacity);
  boardedByNode["CHURCHGATE"] += cgBoarded;

  // B. Marine Lines Train Boarding
  const mlDemand = humanNodeLoads["MARINE_LINES"] || 0;
  const mlTrainCapacity = Math.round(trainNominalCapacity * 0.7) * trainDeparturesCount;
  const mlBoarded = Math.min(mlDemand, mlTrainCapacity);
  boardedByNode["MARINE_LINES"] += mlBoarded;

  // C. CSMT Train Boarding (Central line, lesser disruption impact)
  const csmtDemand = humanNodeLoads["CSMT"] || 0;
  const csmtIntervalMin = 5;
  const csmtDepartures = Math.max(1, Math.round(deltaMinutes / csmtIntervalMin));
  const csmtCapacity = 1400 * csmtDepartures;
  const csmtBoarded = Math.min(csmtDemand, csmtCapacity);
  boardedByNode["CSMT"] += csmtBoarded;

  // D. Dadar Station Interchange Boarding
  const dadarDemand = humanNodeLoads["DADAR"] || 0;
  const dadarCapacity = (isDisruption ? 1100 : 1600) * trainDeparturesCount;
  const dadarBoarded = Math.min(dadarDemand, dadarCapacity);
  boardedByNode["DADAR"] += dadarBoarded;

  // Update Station States
  const stations: Record<string, StationTransportState> = {
    CHURCHGATE: {
      stationId: "CHURCHGATE",
      waitingPassengers: Math.max(0, cgDemand - cgBoarded),
      availableCapacity: cgTrainCapacity,
      activeRuns: ["RUN_WR_101"],
      passengersBoardedThisTick: cgBoarded,
      nextDepartureMinute: (Math.floor(newMinutesElapsed / trainIntervalMin) + 1) * trainIntervalMin,
      averageDelayMinutes: trainDelayMin,
      pressure: Math.min(99, Math.round((Math.max(0, cgDemand - cgBoarded) / 10000) * 100)),
    },
    MARINE_LINES: {
      stationId: "MARINE_LINES",
      waitingPassengers: Math.max(0, mlDemand - mlBoarded),
      availableCapacity: mlTrainCapacity,
      activeRuns: ["RUN_WR_ML_01"],
      passengersBoardedThisTick: mlBoarded,
      nextDepartureMinute: (Math.floor(newMinutesElapsed / trainIntervalMin) + 1) * trainIntervalMin,
      averageDelayMinutes: Math.round(trainDelayMin * 0.8),
      pressure: Math.min(99, Math.round((Math.max(0, mlDemand - mlBoarded) / 8000) * 100)),
    },
    CSMT: {
      stationId: "CSMT",
      waitingPassengers: Math.max(0, csmtDemand - csmtBoarded),
      availableCapacity: csmtCapacity,
      activeRuns: ["RUN_CR_201"],
      passengersBoardedThisTick: csmtBoarded,
      nextDepartureMinute: (Math.floor(newMinutesElapsed / csmtIntervalMin) + 1) * csmtIntervalMin,
      averageDelayMinutes: isDisruption ? 4 : 0,
      pressure: Math.min(99, Math.round((Math.max(0, csmtDemand - csmtBoarded) / 14000) * 100)),
    },
    DADAR: {
      stationId: "DADAR",
      waitingPassengers: Math.max(0, dadarDemand - dadarBoarded),
      availableCapacity: dadarCapacity,
      activeRuns: ["RUN_INT_DADAR_01"],
      passengersBoardedThisTick: dadarBoarded,
      nextDepartureMinute: (Math.floor(newMinutesElapsed / trainIntervalMin) + 1) * trainIntervalMin,
      averageDelayMinutes: Math.round(trainDelayMin * 0.6),
      pressure: Math.min(99, Math.round((Math.max(0, dadarDemand - dadarBoarded) / 18000) * 100)),
    },
  };

  // =========================================================================
  // 2. BUS & SHUTTLE SIMULATION
  // =========================================================================
  const totalBuses = INITIAL_FLEET_CONFIG.baseBuses + (params.additionalBuses || 0);
  const busCapacity = INITIAL_FLEET_CONFIG.busCapacity;
  const busSpeedKmh = INITIAL_FLEET_CONFIG.busSpeedKmh * rainSpeedMultiplier;

  // Shuttle loop: Dadar Artery / Central Spine
  // Bus round-trip time: ~9.8km / (24km/h * rain) * 60 min ≈ 24–36 min
  const busLoopTimeMin = Math.round((9.8 / Math.max(10, busSpeedKmh)) * 60);
  // Max bus departures in this time slice
  const busDepartures = Math.max(1, Math.round((totalBuses / (busLoopTimeMin / 2)) * deltaMinutes));
  const busBoardingCapacity = busDepartures * busCapacity;

  // If redistribution is applied or attendees choose Dadar, additional bus capacity serves Churchgate/Wankhede -> Dadar
  const busEligibleDemand = (humanNodeLoads["WANKHEDE_EXIT"] || 0) * 0.25;
  const busBoarded = Math.min(busEligibleDemand, busBoardingCapacity);
  boardedByNode["WANKHEDE_EXIT"] += busBoarded;

  // =========================================================================
  // 3. TAXI SIMULATION (Taxi Zone Curb)
  // =========================================================================
  const taxiDemand = (humanNodeLoads["TAXI_ZONE"] || 0) * (isDisruption ? 1.4 : 1.0);
  const taxiNominalDispatch = INITIAL_FLEET_CONFIG.taxiNominalDispatchRate; // 25 cabs/min
  const maxCabsDispatched = Math.round(taxiNominalDispatch * deltaMinutes);
  const taxiPassengerCapacity = maxCabsDispatched * INITIAL_FLEET_CONFIG.taxiCapacity; // 3 per cab

  const taxiBoarded = Math.min(taxiDemand, taxiPassengerCapacity);
  boardedByNode["TAXI_ZONE"] += taxiBoarded;

  const waitingTaxiPassengers = Math.max(0, taxiDemand - taxiBoarded);
  const actualCabsDispatched = Math.ceil(taxiBoarded / INITIAL_FLEET_CONFIG.taxiCapacity);
  const availableCabs = Math.max(5, INITIAL_FLEET_CONFIG.baseTaxis - actualCabsDispatched);
  const estWaitMin = Math.round(waitingTaxiPassengers / Math.max(1, taxiNominalDispatch * 3));

  const taxiQueue: TaxiQueueState = {
    zoneId: "TAXI_ZONE",
    waitingPassengers: waitingTaxiPassengers,
    availableCabs,
    dispatchedCabs: actualCabsDispatched,
    dispatchRatePerMin: Math.round(actualCabsDispatched / deltaMinutes),
    estimatedWaitMinutes: estWaitMin,
    passengersBoardedThisTick: taxiBoarded,
  };

  // =========================================================================
  // 4. VEHICLE UNITS ON MAP (Taxis, Buses, Trains)
  // =========================================================================
  const vehicleUnits: TransportUnit[] = [];

  // Active Buses
  const activeBusCount = Math.min(totalBuses, Math.max(4, Math.ceil(busBoarded / busCapacity)));
  for (let i = 0; i < activeBusCount; i++) {
    const busProgress = ((newMinutesElapsed * 0.04 + (i / activeBusCount)) % 1.0);
    const busCoord = interpolatePolyline(MVP_ROAD_CORRIDORS[4].geometry, busProgress); // ROAD_CENTRAL_SPINE
    vehicleUnits.push({
      id: `BUS_SHUTTLE_${i + 1}`,
      type: "BUS",
      name: `Shuttle Bus #${i + 1}`,
      routeId: "ROAD_CENTRAL_SPINE",
      originId: "CHURCHGATE",
      originNodeId: "CHURCHGATE",
      destinationId: "DADAR",
      capacity: busCapacity,
      passengers: Math.round(busCapacity * (busBoarded > 0 ? 0.85 : 0.2)),
      status: "IN_TRANSIT",
      currentRoadId: "ROAD_CENTRAL_SPINE",
      progress: busProgress,
      speedKmh: busSpeedKmh,
      delayMinutes: isRain ? 6 : 0,
      location: busCoord,
    });
  }

  // Active Taxis
  const activeTaxiCount = Math.min(24, Math.max(6, Math.ceil(actualCabsDispatched * 0.4)));
  for (let i = 0; i < activeTaxiCount; i++) {
    const taxiProgress = ((newMinutesElapsed * 0.08 + (i / activeTaxiCount)) % 1.0);
    const roadIndex = i % 2 === 0 ? 0 : 1; // Marine Drive or Veer Nariman
    const road = MVP_ROAD_CORRIDORS[roadIndex];
    const taxiCoord = interpolatePolyline(road.geometry, taxiProgress);
    vehicleUnits.push({
      id: `TAXI_FLEET_${i + 1}`,
      type: "TAXI",
      name: `Taxi #${i + 1}`,
      routeId: road.id,
      originId: "TAXI_ZONE",
      originNodeId: "TAXI_ZONE",
      destinationId: roadIndex === 0 ? "CHOWPATTY" : "FLORA_FOUNTAIN",
      capacity: 3,
      passengers: Math.min(3, Math.max(1, Math.round(taxiBoarded / Math.max(1, actualCabsDispatched)))),
      status: "IN_TRANSIT",
      currentRoadId: road.id,
      progress: taxiProgress,
      speedKmh: INITIAL_FLEET_CONFIG.taxiSpeedKmh * rainSpeedMultiplier,
      delayMinutes: isRain ? 4 : 0,
      location: taxiCoord,
    });
  }

  // Active Trains (Western Railway & Central Railway)
  const wrTrainProgress = ((newMinutesElapsed * 0.05) % 1.0);
  const wrTrainCoord = interpolatePolyline(RAILWAY_CORRIDORS.RAIL_WESTERN_LINE.geometry, wrTrainProgress);
  vehicleUnits.push({
    id: "TRAIN_WR_101",
    type: "TRAIN",
    name: "Western Local #101",
    routeId: "RAIL_WESTERN_LINE",
    originId: "CHURCHGATE",
    originNodeId: "CHURCHGATE",
    destinationId: "DADAR",
    capacity: trainNominalCapacity,
    passengers: Math.round(cgBoarded * 0.9),
    status: "IN_TRANSIT",
    progress: wrTrainProgress,
    speedKmh: INITIAL_FLEET_CONFIG.trainSpeedKmh,
    delayMinutes: trainDelayMin,
    location: wrTrainCoord,
  });

  const crTrainProgress = ((newMinutesElapsed * 0.045 + 0.5) % 1.0);
  const crTrainCoord = interpolatePolyline(RAILWAY_CORRIDORS.RAIL_CENTRAL_LINE.geometry, crTrainProgress);
  vehicleUnits.push({
    id: "TRAIN_CR_201",
    type: "TRAIN",
    name: "Central Local #201",
    routeId: "RAIL_CENTRAL_LINE",
    originId: "CSMT",
    originNodeId: "CSMT",
    destinationId: "DADAR",
    capacity: 1400,
    passengers: Math.round(csmtBoarded * 0.9),
    status: "IN_TRANSIT",
    progress: crTrainProgress,
    speedKmh: INITIAL_FLEET_CONFIG.trainSpeedKmh,
    delayMinutes: isDisruption ? 4 : 0,
    location: crTrainCoord,
  });

  // =========================================================================
  // 5. ROAD CONGESTION (Domain Vehicle Loads on MVP_ROAD_CORRIDORS)
  // =========================================================================
  const roads: Record<string, RoadCongestionState> = {};
  MVP_ROAD_CORRIDORS.forEach(corridor => {
    let baselineVehicles = 180;
    if (corridor.id === "ROAD_MARINE_DR") baselineVehicles = isDisruption ? 320 : 210;
    if (corridor.id === "ROAD_VEER_NARIMAN") baselineVehicles = isDisruption ? 280 : 190;
    if (corridor.id === "ROAD_CENTRAL_SPINE") baselineVehicles = redistributionApplied ? 380 : 260;

    // Count vehicles on this specific corridor
    const corridorVehicles = vehicleUnits.filter(u => u.currentRoadId === corridor.id);
    const busCount = corridorVehicles.filter(u => u.type === "BUS").length;
    const taxiCount = corridorVehicles.filter(u => u.type === "TAXI").length;

    // Total Passenger-Car Equivalent (PCE)
    const totalPCE = baselineVehicles + taxiCount * 1.0 + busCount * 2.5;
    const capacity = corridor.capacity || 3000;
    let congestion = Math.min(99, Math.max(30, Math.round((totalPCE / capacity) * 100) + 25));

    if (isRain) congestion = Math.min(99, congestion + 12);

    const dist = corridor.distanceKm || 2;
    const travelTimeMin = Math.round(dist * 3 * (1 + (congestion - 50) / 100) * (isRain ? 1.25 : 1.0));

    let status: RoadCongestionState["status"] = "NORMAL";
    if (congestion >= 90) status = "DISRUPTED";
    else if (congestion >= 80) status = "CONGESTED";
    else if (congestion >= 65) status = "HEAVY";

    roads[corridor.id] = {
      roadId: corridor.id,
      vehicleCount: Math.round(totalPCE),
      busCount,
      taxiCount,
      congestion,
      travelTimeMin,
      status,
    };
  });

  // =========================================================================
  // 6. TOTALS & CONSERVATION ACCOUNTING
  // =========================================================================
  const totalBoarded = Object.values(boardedByNode).reduce((sum, v) => sum + v, 0);
  const totalDemand = Object.values(humanNodeLoads).reduce((sum, v) => sum + v, 0);
  const waitingPassengers = Object.values(stations).reduce((sum, s) => sum + s.waitingPassengers, 0) + taxiQueue.waitingPassengers;
  const onVehiclePassengers = vehicleUnits.reduce((sum, u) => sum + u.passengers, 0);
  const totalBoardedCumulative = (prevState.metrics?.totalBoardedCumulative || 0) + totalBoarded;

  return {
    simulationTime: newTime,
    minutesElapsed: newMinutesElapsed,
    vehicleUnits,
    transitRuns: prevState.transitRuns,
    stations,
    taxiQueue,
    roads,
    metrics: {
      totalDemand,
      waitingPassengers,
      onVehiclePassengers,
      completedPassengers: Math.max(0, totalBoardedCumulative - onVehiclePassengers),
      totalActiveVehicles: vehicleUnits.length,
      fleetSize: totalBuses + INITIAL_FLEET_CONFIG.baseTaxis,
      totalBoardedCumulative,
    },
    lastBoardingResult: {
      boardedByNode,
      totalBoarded,
    },
  };
}
