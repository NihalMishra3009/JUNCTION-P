// ============================================================
// JUNCTION - Operational Recommendation & Intervention Lifecycle
// ============================================================

export type RecommendationLifecycleStatus =
  | "PROPOSED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SCHEDULED"
  | "EXECUTING"
  | "EXECUTED"
  | "COMPLETED"
  | "EXPIRED"
  | "ROLLED_BACK"
  | "FAILED";

export type InterventionType =
  | "REROUTE_ATTENDEES"
  | "GATE_CAPACITY_CHANGE"
  | "ADD_TRANSIT_SHUTTLES"
  | "REDIRECT_PICKUP_ZONE"
  | "HOSPITALITY_DEMAND_SIGNAL"
  | "DYNAMIC_MESSAGING_DISPATCH"
  | "EMERGENCY_CORRIDOR_HOLD";

export interface OperationalIntervention {
  id: string;
  type: InterventionType;
  title: string;
  description: string;
  targetZoneId: string;
  targetResourceId?: string;
  secondaryAffectedResourceIds?: string[];
  
  // Decision Lifecycle & Human-in-the-Loop
  status: RecommendationLifecycleStatus;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  requiresApproval: boolean;
  approvalRoleRequired?: "ORGANIZER" | "TRANSIT_AUTHORITY" | "VENUE_OPS";
  
  // Explainability & Impact Evidence
  rationale: string;
  contributingSignals: string[];
  expectedPressureReductionPercent: number;
  timeToEffectMinutes: number;
  confidenceScore: number;
  
  // Execution Constraints & Lifecycle
  proposedAt: string;
  expiresAt: string;
  approvedAt?: string;
  approvedByUserId?: string;
  rejectionReason?: string;
  executionStartedAt?: string;
  completedAt?: string;
  
  // Mitigation & Rollback
  rollbackFeasible: boolean;
  rollbackPlan?: string;
}

export interface ZoneBaselineSnapshot {
  zoneId: string;
  zoneName: string;
  pressure: number;
  density: number;
  currentUtilization: number;
  inflowRate: number;
  outflowRate: number;
  timestamp: string;
}

export interface ActiveIntervention {
  id: string;
  recommendationId: string;
  type: InterventionType;
  actionType?: string;
  title: string;
  description: string;
  sourceZoneId?: string;
  targetZoneId?: string;
  secondaryAffectedResourceIds?: string[];
  status: "APPROVED" | "ACTIVE" | "COMPLETED" | "EXPIRED" | "REJECTED";
  approvedAt: number; // Unix timestamp ms
  approvedAtSimulationMinute: number;
  durationMinutes: number; // Duration of active effect in simulated minutes (e.g. 30)
  rampDurationSeconds: number; // Transition period in real-time seconds (e.g. 15s)
  intensity: number; // 0.0 to 1.0 (default 1.0)
  baselines: Record<string, ZoneBaselineSnapshot>;
}

export interface RecommendationFeedback {
  recommendationId: string;
  reviewerId: string;
  action: "APPROVE" | "REJECT" | "MODIFY";
  comments?: string;
  modifiedParameters?: Record<string, unknown>;
  timestamp: string;
}
