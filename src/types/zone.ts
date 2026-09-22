// These shared primitives are defined in index.ts (not re-exported from zone.ts),
// so we import them directly. This avoids the barrel re-export cycle that would
// arise from importing from "./index" while index.ts re-exports this very file.
import type { GeoLocation, PressureLevel, Trend, ConfidenceSource } from "./index";

// ============================================================
// JUNCTION - Zone-Aware Intelligence Contracts
// ============================================================

export type ZoneTier = "TIER_1_CRITICAL" | "TIER_2_SUPPORTING" | "TIER_3_PERIPHERAL";

export type MonitoringStatus =
  | "CONTINUOUS"
  | "ADAPTIVE"
  | "PERIODIC"
  | "ON_DEMAND"
  | "ESCALATED";

export type SensorType =
  | "CCTV_HEADCOUNT"
  | "TURNSTILE_COUNT"
  | "TRANSIT_TAP"
  | "GPS_PROBE"
  | "HOTEL_INVENTORY"
  | "WEATHER_STATION"
  | "SIMULATED_PROBE";

export interface ZoneDefinition {
  id: string;
  name: string;
  shortName: string;
  tier: ZoneTier;
  defaultMonitoringStatus: MonitoringStatus;
  center: GeoLocation;
  radiusMeters: number;
  boundary?: GeoLocation[];
  resourceIds: string[];
  hotelIds: string[];
  connectedRoadIds: string[];
  nominalPedestrianCapacity: number;
  nominalTransitCapacity: number;
  description: string;
}

/**
 * Runtime snapshot of a zone's fused state.
 *
 * Pressure values are integers in [0, 99] representing % of capacity.
 * Capacity and utilization values are person-counts (headcount integers).
 * Flow rates are heuristic derivations from utilization, not live sensor readings.
 * Predicted pressure values are drawn from scenario look-up tables (not ML forecasts).
 * confidence is a float in [0.0, 1.0] — higher = more trustworthy data provenance.
 */
export interface ZoneState {
  id: string;
  name: string;
  /** Effective tier (may be elevated to TIER_1_CRITICAL when isEscalated = true) */
  tier: ZoneTier;
  /** Original tier from zone definition — unaffected by escalation */
  baseTier: ZoneTier;
  monitoringStatus: MonitoringStatus;
  /** True when a Tier-2/3 zone has been promoted to Tier-1 frequency due to high pressure */
  isEscalated: boolean;
  /** 0–99 integer representing % of combined resource + hotel capacity currently occupied */
  pressure: number;
  /** Heuristic 15-min forecast pressure (0–99) from scenario pressure table */
  predictedPressure15: number;
  /** Heuristic 30-min forecast pressure (0–99) from scenario pressure table */
  predictedPressure30: number;
  /** Heuristic 60-min forecast pressure (0–99) from scenario pressure table */
  predictedPressure60: number;
  pressureLevel: PressureLevel;
  trend: Trend;
  /** Estimated inflow rate in people/min — heuristic derivation from currentUtilization */
  inflowRate: number;
  /** Estimated outflow rate in people/min — heuristic derivation from currentUtilization */
  outflowRate: number;
  /** netFlow = inflowRate - outflowRate (people/min) */
  netFlow: number;
  /** Total combined capacity in persons (sum of member resource capacities + hotel rooms) */
  totalCapacity: number;
  /** Current person-count occupying the zone (from simulation nodeLoads or resource data) */
  currentUtilization: number;
  /** totalCapacity - currentUtilization (persons) */
  availableCapacity: number;
  /** availableCapacity + usable hotel rooms (persons) */
  usableCapacity: number;
  /** Resource/hotel names that are at or above their critical pressure threshold */
  activeBottlenecks: string[];
  /** Combined list of resourceIds and hotelIds belonging to this zone */
  memberResources: string[];
  lastUpdated: string;
  /** Data provenance confidence score: 0.0 (pure estimate) → 1.0 (directly observed) */
  confidence: number;
  source: ConfidenceSource;
}

export interface SensorObservation {
  id: string;
  sensorId: string;
  sensorType: SensorType;
  zoneId: string;
  timestamp: string;
  headcount?: number;
  inflowRate?: number;
  outflowRate?: number;
  occupancyPercent?: number;
  speedKmh?: number;
  confidence: number;
  source: ConfidenceSource;
  rawPayload?: Record<string, unknown>;
}

export interface SensorFusionPayload {
  zoneId: string;
  timestamp: string;
  observations: SensorObservation[];
  fusedHeadcount: number;
  fusedPressure: number;
  fusedCapacity: number;
  confidenceScore: number;
  anomaliesDetected: string[];
}
