// ============================================================
// JUNCTION - Core Type Definitions
// ============================================================

export type ScenarioId =
  | 'NORMAL'
  | 'POST_EVENT_SURGE'
  | 'TRANSPORT_DISRUPTION'
  | 'HEAVY_RAIN'
  | 'ACCOMMODATION_SATURATION'
  | 'EVENT_DELAY';

export type ResourceType =
  | 'VENUE'
  | 'STATION'
  | 'HOTEL'
  | 'RESTAURANT'
  | 'PICKUP_ZONE'
  | 'PARKING'
  | 'SHUTTLE_HUB'
  | 'ROAD';

export type PressureLevel = 'NORMAL' | 'WATCH' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
export type OperatingStatus = 'OPERATIONAL' | 'REDUCED' | 'DISRUPTED' | 'CLOSED';
export type ConfidenceSource = 'OBSERVED' | 'PARTNER_REPORTED' | 'HISTORICAL' | 'ESTIMATED' | 'SIMULATED' | 'PREDICTED';
export type Trend = 'INCREASING' | 'STABLE' | 'DECREASING';

export interface JunctionEvent {
  id: string; name: string; venue: string; city: string;
  expectedAttendance: number; startTime: string; endTime: string;
  status: 'PRE_EVENT' | 'LIVE' | 'POST_EVENT';
  gates: { id: string; label: string; capacity: number }[];
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export * from "./zone";
export * from "./transport";
export * from "./device";
export * from "./observation";
export * from "./computerVision";
export * from "./hospitality";
export * from "./forecast";
export * from "./recommendation";
export * from "./audit";
export * from "./resource";
export * from "./cctv";

export interface Zone {
  id: string;
  name: string;
  tier?: import("./zone").ZoneTier;
  pressure: number;
  predictedPressure: number;
  availableCapacity: number;
  resources: string[];
}

export interface Resource {
  id: string; type: ResourceType; name: string; shortName: string;
  zone: string;
  location: GeoLocation;
  mapPos?: { x: number; y: number };
  totalCapacity: number; currentUtilization: number;
  availableCapacity: number; predictedDemand: number;
  operatingStatus: OperatingStatus; pressure: number;
  pressureLevel: PressureLevel; trend: Trend; confidence: number;
  source: ConfidenceSource; connectedTransport: string[];
  description?: string;
}

export interface Hotel {
  id: string; name: string; zone: string;
  location: GeoLocation;
  totalRooms: number;
  availableRooms: number; usableRooms: number;
  expectedCheckIns: number; expectedCheckOuts: number;
  travelTimeToVenue: number; pressure: number;
  pressureLevel: PressureLevel;
  transportConnectivity: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR';
  eventDemand: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  source: ConfidenceSource; priceRange?: string;
}

export interface Restaurant {
  id: string; name: string; cuisine: string; zone: string;
  location: GeoLocation;
  capacity: number; currentOccupancy: number; availableTables: number;
  waitTime: number; predictedWaitTime: number;
  distanceFromVenue: number; pressure: number;
  pressureLevel: PressureLevel; source: ConfidenceSource;
  hasIncentive: boolean; incentiveLabel?: string; recommended?: boolean;
}

export interface RoadEdge {
  id: string;
  name: string;
  fromId: string;
  toId: string;
  geometry: GeoLocation[];
  distanceKm?: number;
  capacity?: number;
  travelTimeMin?: number;
  congestion: number;
  status: 'NORMAL' | 'HEAVY' | 'CONGESTED' | 'DISRUPTED';
}

export interface CrowdFlow {
  id: string;
  fromId: string;
  toId: string;
  fromCoord: GeoLocation;
  toCoord: GeoLocation;
  direction: 'INBOUND' | 'OUTBOUND';
  volume: number;
  pressure: number;
  corridorName: string;
}

export interface PredictedHotspot {
  id: string;
  resourceId: string;
  name: string;
  location: GeoLocation;
  currentPressure: number;
  predictedPressure: number;
  severity: 'WATCH' | 'HIGH' | 'CRITICAL';
  projectedTimeframe: string;
  radiusMeters: number;
}

export interface TransportRoute {
  id: string; name: string; type: 'RAIL' | 'METRO' | 'BUS' | 'ROAD';
  from: string; to: string; travelTime: number; congestion: number;
  status: OperatingStatus; incidents: string[];
  capacity?: number; source: ConfidenceSource;
}

export interface CrowdObservation {
  locationId: string; timestamp: string;
  peopleCount: number; inflowRate: number; outflowRate: number;
  netFlow: number; density: number;
  direction: 'INBOUND' | 'OUTBOUND' | 'MIXED';
  confidence: number; source: ConfidenceSource;
}

export interface PredictionPoint { label: string; minutesFromNow: number; pressure: number; }

export interface ResourcePrediction {
  resourceId: string; resourceName: string; current: number;
  color: string; points: PredictionPoint[];
  thresholdCrossing?: { level: PressureLevel; minutesFromNow: number };
}

export interface CascadeNode {
  id: string; resourceId: string; label: string; pressure: number;
  predictedMinutes: number; impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  children: string[];
}

export type RecommendationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED';

export interface RecommendationImpact { resourceName: string; before: number; after: number; }

export interface Recommendation {
  id: string; type: 'REDISTRIBUTE' | 'TRANSPORT' | 'ACCOMMODATION' | 'TIMING' | 'ALERT';
  title: string; problem: string; action: string; reason: string;
  expectedImpact: RecommendationImpact[]; tradeOff: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'; source: ConfidenceSource;
  status: RecommendationStatus; affectsAttendee: boolean;
  attendeeMessage?: string; priority: number;
}

export type AlertSeverity = 'WATCH' | 'HIGH' | 'CRITICAL';
export type AlertCategory = 'CROWD' | 'TRANSPORT' | 'EVENT' | 'WEATHER' | 'ACCOMMODATION';

export interface Alert {
  id: string; severity: AlertSeverity; category: AlertCategory;
  title: string; message: string; resourceId?: string;
  actionLabel?: string; actionRoute?: string; timestamp: string;
}

export interface SimulationParams {
  attendance: number; eventDelay: 0 | 15 | 30;
  weather: 'NORMAL' | 'HEAVY_RAIN'; additionalBuses: 0 | 10 | 20;
  visitorRedistribution: 0 | 20 | 40; transportDisruption: boolean;
}

export interface SimulationResult {
  params: SimulationParams;
  before: Record<string, number>; after: Record<string, number>;
  recommendations: string[]; summary: string;
}

export type SimulationStatus = 'IDLE' | 'PLAYING' | 'PAUSED';
export type SimulationSpeed = 1 | 5 | 10;

export interface HumanCohort {
  id: string;
  originId: string;
  destinationId: string;
  path: string[];
  volume: number;
  currentSegmentIndex: number;
  progress: number; // 0.0 to 1.0 along current segment
  speedMps: number;
  status: 'MOVING' | 'ARRIVED';
}

export interface DensityCell {
  id: string;
  location: GeoLocation;
  radiusMeters: number;
  density: number;
  capacity: number;
  pressure: number;
}

export interface SimulationState {
  simulationTime: string;
  minutesElapsed: number;
  status: SimulationStatus;
  speed: SimulationSpeed;
  humanCohorts: HumanCohort[];
  nodeLoads: Record<string, number>;
  edgeLoads: Record<string, number>;
  densityCells: DensityCell[];
  totalExitedVenue: number;
  totalCleared: number;
}

export type RouteType = 'FASTEST' | 'BALANCED' | 'LOW_CROWD';

export interface RouteStep { from: string; to: string; mode: 'RAIL' | 'BUS' | 'WALK' | 'METRO'; duration: number; }

export interface AttendeeRoute {
  id: string; type: RouteType; label: string; totalTime: number;
  crowdLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  congestionLevel: 'LOW' | 'MODERATE' | 'HIGH';
  transfers: number; walkingTime: number;
  reliability: 'HIGH' | 'MEDIUM' | 'LOW';
  recommended: boolean; steps: RouteStep[]; explanation: string; score: number;
}

export interface RedistributionImpact {
  churchgateBefore: number;
  churchgateAfter: number;
  dadarBefore: number;
  dadarAfter: number;
  wankhedeExitBefore: number;
  wankhedeExitAfter: number;
  visitorsRedistributed: number;
  travelDeltaMin: number;
}

export interface PartnerHotelUpdate {
  hotelId: string;
  availableRooms: number;
  expectedCheckIns?: number;
  expectedCheckOuts?: number;
  lastUpdated: string;
}

export interface AppState {
  activeScenario: ScenarioId;
  approvedRecommendations: string[];
  attendeeSelectedRouteId: string | null;
  attendeeRouteChoiceAffectsState: boolean;
}

