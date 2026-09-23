// ============================================================
// JUNCTION - Audit Trail & Security Diagnostics Contracts
// ============================================================

export type AuditActionCategory =
  | "RECOMMENDATION_APPROVAL"
  | "RECOMMENDATION_REJECTION"
  | "OPERATIONAL_OVERRIDE"
  | "SIMULATION_TRIGGERED"
  | "PARTNER_AVAILABILITY_UPDATE"
  | "PARTNER_QUEUE_UPDATE"
  | "SENSOR_HEALTH_ALERT"
  | "THRESHOLD_BREACH"
  | "DISRUPTIVE_INCIDENT_REPORT";

export interface AuditRecord {
  id: string;
  timestamp: string; // ISO 8601
  actorId: string;
  actorRole: "ORGANIZER" | "PARTNER" | "SYSTEM" | "ATTENDEE";
  actorName?: string;
  ipAddress?: string;
  category: AuditActionCategory;
  targetEntityType: "RESOURCE" | "ZONE" | "RECOMMENDATION" | "SIMULATION" | "HOTEL" | "RESTAURANT";
  targetEntityId: string;
  
  // State Transformation
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  changeSummary: string;
  
  // Authorization & Context
  rationale?: string;
  correlationId?: string;
  isSimulatedScenario: boolean;
}

export interface SecurityGovernanceSummary {
  noBiometricsEnforced: boolean;
  noIdentityTrackingEnforced: boolean;
  aggregateMetricsOnly: boolean;
  auditTrailRetentionDays: number;
  lastAuditedTimestamp: string;
}
