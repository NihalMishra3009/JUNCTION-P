export type WorldProvider =
  | "google-photorealistic"
  | "cesium-osm"
  | "maplibre-extrusion"
  | "fallback";

export type LocationType =
  | "safehouse"
  | "warehouse"
  | "contact"
  | "transfer"
  | "transit"
  | "venue"
  | "checkpoint"
  | "unknown";

export type EntityType = "Person" | "Organization" | "Vehicle" | "Phone" | "Location" | "Account";

export type Entity = {
  id: string;
  name: string;
  type: EntityType;
  risk: number;
  confidence: number;
  relationships: number;
  lastActivity: string;
  aliases: string[];
  phones?: string[];
  vehicles?: string[];
  locations?: string[];
  organizations?: string[];
};

export type CaseLocation = {
  id: string;
  caseId: string;
  name: string;
  latitude: number;
  longitude: number;
  type: LocationType;
  importance: number;
  timestamp: string;
  entityIds: string[];
  entityNames?: string[];
  eventIds: string[];
  observationCount?: number;
  sourceCount?: number;
};

export type LocationEvent = {
  id: string;
  caseId: string;
  locationId: string;
  timestamp: string;
  type: string;
  entityIds: string[];
  description: string;
  sourceIds: string[];
};

export type CaseMarker = {
  caseId: string;
  title: string;
  priority: string;
  status: string;
  locationIds: string[];
  entityIds: string[];
  eventIds: string[];
  locations: CaseLocation[];
  events: LocationEvent[];
  lastActivity: string;
};

export type GraphResponse = {
  nodes: { id: string; type: string; name: string; properties?: Record<string, any> }[];
  edges: { id: string; source: string; target: string; type: string; properties?: Record<string, any> }[];
};

export type AlertRead = {
  id: number;
  case_id: string;
  profile_id: string | null;
  severity: string;
  status: string;
  score: number;
  title: string;
  description: string;
  source_ids: string[];
  confidence: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type CaseIntelligence = {
  case_id: number;
  evidence_fusion: Record<string, any>;
  evidence: any[];
  temporal_changes: any[];
  anomalies: any[];
  potential_links: any[];
  link_decisions: Record<string, any>;
  evidence_gaps: any[];
  network_dna: Record<string, any>;
  entity_priorities: any[];
  relationship_priorities: any[];
  recommendations: any[];
};
