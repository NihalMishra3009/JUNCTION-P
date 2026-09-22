import { GeoLocation, OperatingStatus } from "./index";

export type TransportType = "TAXI" | "BUS" | "TRAIN";

export interface TransportUnit {
  id: string;
  type: TransportType;
  name: string;
  routeId: string;
  originId: string;
  originNodeId?: string;
  destinationId: string;
  capacity: number;
  passengers: number;
  status: "AVAILABLE" | "BOARDING" | "IN_TRANSIT" | "COMPLETED";
  currentRoadId?: string;
  progress: number; // 0.0 to 1.0 along the corridor/route
  speedKmh: number;
  delayMinutes: number;
  location: GeoLocation;
}

export interface TransitRun {
  id: string;
  mode: "TRAIN" | "BUS";
  name: string;
  line: "WESTERN_RAILWAY" | "CENTRAL_RAILWAY" | "SHUTTLE_BUS";
  originId: string;
  destinationId: string;
  scheduledDepartureMinute: number;
  actualDepartureMinute: number;
  intervalMinutes: number;
  capacity: number;
  passengers: number;
  status: "SCHEDULED" | "BOARDING" | "DEPARTED" | "ARRIVED";
  delayMinutes: number;
}

export interface TransportDemand {
  sourceNodeId: string;
  destinationId: string;
  passengerCount: number;
  mode: TransportType;
  timestamp: string;
}

export interface TaxiQueueState {
  zoneId: string;
  waitingPassengers: number;
  availableCabs: number;
  dispatchedCabs: number;
  dispatchRatePerMin: number;
  estimatedWaitMinutes: number;
  passengersBoardedThisTick: number;
}

export interface StationTransportState {
  stationId: string;
  waitingPassengers: number;
  availableCapacity: number;
  activeRuns: string[];
  passengersBoardedThisTick: number;
  nextDepartureMinute: number;
  averageDelayMinutes: number;
  pressure: number; // 0-99%
}

export interface RoadCongestionState {
  roadId: string;
  vehicleCount: number;
  busCount: number;
  taxiCount: number;
  congestion: number; // 0-99%
  travelTimeMin: number;
  status: "NORMAL" | "HEAVY" | "CONGESTED" | "DISRUPTED";
}

export interface TransportBoardingResult {
  boardedByNode: Record<string, number>;
  totalBoarded: number;
}

export interface TransportSimulationMetrics {
  totalDemand: number;
  waitingPassengers: number;
  onVehiclePassengers: number;
  completedPassengers: number;
  totalActiveVehicles: number;
  fleetSize: number;
  totalBoardedCumulative: number;
}

export interface TransportSimulationState {
  simulationTime: string;
  minutesElapsed: number;
  vehicleUnits: TransportUnit[];
  transitRuns: TransitRun[];
  stations: Record<string, StationTransportState>;
  taxiQueue: TaxiQueueState;
  roads: Record<string, RoadCongestionState>;
  metrics: TransportSimulationMetrics;
  lastBoardingResult: TransportBoardingResult;
}
