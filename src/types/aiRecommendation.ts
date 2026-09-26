// ============================================================
// JUNCTION - AI Recommendation Planner Data Contracts
// ============================================================

import {
  ScenarioId,
  ZoneState,
  Resource,
  HotspotPrediction,
  CascadeAnalysisResult,
  Recommendation,
  OperationalIntervention,
  InterventionType,
} from "@/types";

export interface ZoneContextSummary {
  id: string;
  name: string;
  pressure: number;
  pressureLevel: string;
  density: number;
  inflowRate: number;
  trend: string;
  confidence: number;
  dataQuality: string;
  coverageStatus?: string;
  contributingSensors: string[];
  conflicts: string[];
  missingSensors: string[];
}

export interface ResourceContextSummary {
  id: string;
  name: string;
  type: string;
  pressure: number;
  currentUtilization: number;
  totalCapacity: number;
  availableCapacity: number;
}

export interface HotspotContextSummary {
  id: string;
  name: string;
  currentPressure: number;
  severity: string;
  projectedTimeframe?: string;
  keyDrivers?: string[];
}

export interface CascadeContextSummary {
  originZoneId: string;
  originPressure: number;
  affectedPathways: Array<{
    nodeId: string;
    resourceId: string;
    label: string;
    currentPressure: number;
    projectedPressure: number;
    leadTimeMinutes: number;
    status: string;
  }>;
}

export interface SupportedAction {
  type: InterventionType;
  label: string;
  description: string;
  applicableZones: string[];
  defaultApprovalRole: "ORGANIZER" | "TRANSIT_AUTHORITY" | "VENUE_OPS";
}

export const SUPPORTED_ACTION_CATALOGUE: SupportedAction[] = [
  {
    type: "REROUTE_ATTENDEES",
    label: "Dynamic Attendee Redistribution",
    description: "Publish alternate transit journey recommendations to attendees diverting them from saturated terminals to relief stations.",
    applicableZones: ["ZONE_WANKHEDE", "ZONE_CHURCHGATE", "ZONE_DADAR", "ZONE_MARINE_LINES"],
    defaultApprovalRole: "ORGANIZER",
  },
  {
    type: "GATE_CAPACITY_CHANGE",
    label: "Egress Gate Metering & Throttling",
    description: "Adjust physical turnstile clearance throughput and staging lane buffers to meter flow onto approach avenues.",
    applicableZones: ["ZONE_WANKHEDE", "WANKHEDE_EXIT"],
    defaultApprovalRole: "VENUE_OPS",
  },
  {
    type: "ADD_TRANSIT_SHUTTLES",
    label: "Express Transit Shuttle Deployment",
    description: "Dispatch dedicated event shuttle buses from staging bays directly to secondary interchange hubs.",
    applicableZones: ["ZONE_TAXI_STAGING", "ZONE_CHURCHGATE", "ZONE_CSMT"],
    defaultApprovalRole: "TRANSIT_AUTHORITY",
  },
  {
    type: "REDIRECT_PICKUP_ZONE",
    label: "Rideshare Staging Bay Relocation",
    description: "Shift mobile app rideshare geofence and taxi pickup queues to secondary designated parking lots to relieve curbside gridlock.",
    applicableZones: ["ZONE_TAXI_STAGING", "ZONE_HOTELS_SOUTH"],
    defaultApprovalRole: "ORGANIZER",
  },
  {
    type: "HOSPITALITY_DEMAND_SIGNAL",
    label: "Commercial Dining & Hospitality Inflow Vouchers",
    description: "Emit digital discount incentives to hold exiting spectators in local dining corridors until transit saturation clears.",
    applicableZones: ["ZONE_HOTELS_SOUTH", "ZONE_WANKHEDE"],
    defaultApprovalRole: "ORGANIZER",
  },
  {
    type: "DYNAMIC_MESSAGING_DISPATCH",
    label: "Variable Message Sign Advisory",
    description: "Broadcast electronic street signage updates warning motorists and pedestrians of corridor delays.",
    applicableZones: ["ZONE_MAHAPALIKA", "ZONE_MARINE_LINES", "ZONE_CHURCHGATE"],
    defaultApprovalRole: "VENUE_OPS",
  },
  {
    type: "EMERGENCY_CORRIDOR_HOLD",
    label: "Pedestrian Concourse Emergency Hold",
    description: "Hold outbound movement at venue concourses during severe transit disruptions to prevent platform overcrowding.",
    applicableZones: ["ZONE_WANKHEDE", "ZONE_CHURCHGATE"],
    defaultApprovalRole: "VENUE_OPS",
  },
];

export interface RecommendationContext {
  activeScenario: ScenarioId;
  simulationMinutes: number;
  zones: ZoneContextSummary[];
  resources: ResourceContextSummary[];
  hotspots: HotspotContextSummary[];
  cascade?: CascadeContextSummary;
  candidateInterventions: OperationalIntervention[];
  supportedActions: SupportedAction[];
  fingerprint: string;
}

export interface AiRecommendationPlan {
  planId: string;
  generatedAt: string;
  source: "AI" | "CACHED_AI" | "DETERMINISTIC_FALLBACK";
  modelUsed?: string;
  planSummary: string;
  recommendations: Recommendation[];
  operationalRationale: string;
  contextFingerprint: string;
  isCached?: boolean;
  cooldownRemainingSeconds?: number;
  sourceContextSummary?: string;
}
