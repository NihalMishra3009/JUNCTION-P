// ============================================================
// JUNCTION - Recommendation & Human-in-the-Loop Lifecycle (Steps 21, 22, 23)
// ============================================================

import {
  Recommendation,
  OperationalIntervention,
  RecommendationLifecycleStatus,
  ZoneState,
  AuditRecord,
} from "@/types";

export class RecommendationLifecycleEngine {
  private auditLog: AuditRecord[] = [];

  /**
   * Evaluates zone states and generates explainable operational recommendations.
   * Every recommendation includes contributing evidence, expected impact, and required human approval.
   */
  public generateInterventions(zones: ZoneState[]): OperationalIntervention[] {
    const interventions: OperationalIntervention[] = [];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60_000).toISOString();

    for (const zone of zones) {
      if (zone.pressure >= 85) {
        // High pressure in terminal hub
        if (zone.id === "ZONE_CHURCHGATE") {
          interventions.push({
            id: `INT_DIVERT_MARINE_LINES_${now.getTime()}`,
            type: "REROUTE_ATTENDEES",
            title: "Divert Northern Foot Traffic to Marine Lines Station",
            description: "Churchgate concourse has reached 90% capacity. Signal attendee navigation to direct northbound commuters to Marine Lines.",
            targetZoneId: "ZONE_CHURCHGATE",
            secondaryAffectedResourceIds: ["MARINE_LINES"],
            status: "PROPOSED",
            urgency: "HIGH",
            requiresApproval: true,
            approvalRoleRequired: "ORGANIZER",
            rationale: "Churchgate platform capacity exceeding threshold while Marine Lines has 45% available buffer.",
            contributingSignals: [
              `Zone pressure: ${zone.pressure}%`,
              `Active crowd count: ${zone.currentUtilization} persons`,
              "Queue wait time exceeding 15 minutes",
            ],
            expectedPressureReductionPercent: 22,
            timeToEffectMinutes: 10,
            confidenceScore: 0.92,
            proposedAt: now.toISOString(),
            expiresAt,
            rollbackFeasible: true,
            rollbackPlan: "Restore standard route guidance on attendee navigation screens.",
          });
        }

        // Staging bay pickup congestion
        if (zone.id === "ZONE_TAXI_STAGING") {
          interventions.push({
            id: `INT_SHUTTLE_DISPATCH_${now.getTime()}`,
            type: "ADD_TRANSIT_SHUTTLES",
            title: "Deploy 12 Reserve Shuttles to Veer Nariman Staging Bay",
            description: "Taxi queue is saturated with a 25-minute wait. Dispatch 12 pre-staged high-capacity buses to clear curb queues.",
            targetZoneId: "ZONE_TAXI_STAGING",
            status: "PROPOSED",
            urgency: "CRITICAL",
            requiresApproval: true,
            approvalRoleRequired: "TRANSIT_AUTHORITY",
            rationale: "Rideshare queue length > 300 persons causing vehicle spillback onto Veer Nariman Road.",
            contributingSignals: [
              `Taxi bay pressure: ${zone.pressure}%`,
              "Curb lane gridlock warning",
            ],
            expectedPressureReductionPercent: 35,
            timeToEffectMinutes: 8,
            confidenceScore: 0.95,
            proposedAt: now.toISOString(),
            expiresAt,
            rollbackFeasible: false,
          });
        }
      }
    }

    return interventions;
  }

  /**
   * Processes a human decision (Approve, Reject, Rollback) with complete audit logging.
   */
  public processApproval(
    intervention: OperationalIntervention,
    action: "APPROVE" | "REJECT",
    actorId: string,
    actorRole: "ORGANIZER" | "PARTNER"
  ): { updatedIntervention: OperationalIntervention; auditRecord: AuditRecord } {
    const now = new Date().toISOString();
    const newStatus: RecommendationLifecycleStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    const updatedIntervention: OperationalIntervention = {
      ...intervention,
      status: newStatus,
      approvedAt: action === "APPROVE" ? now : undefined,
      approvedByUserId: action === "APPROVE" ? actorId : undefined,
      rejectionReason: action === "REJECT" ? "Rejected by operational command" : undefined,
    };

    const auditRecord: AuditRecord = {
      id: `AUDIT_${Date.now()}`,
      timestamp: now,
      actorId,
      actorRole,
      category: action === "APPROVE" ? "RECOMMENDATION_APPROVAL" : "RECOMMENDATION_REJECTION",
      targetEntityType: "RECOMMENDATION",
      targetEntityId: intervention.id,
      previousState: { status: intervention.status },
      newState: { status: newStatus },
      changeSummary: `Operational intervention '${intervention.title}' was ${newStatus} by ${actorId} (${actorRole})`,
      rationale: intervention.rationale,
      isSimulatedScenario: true,
    };

    this.auditLog.push(auditRecord);

    return {
      updatedIntervention,
      auditRecord,
    };
  }

  public getAuditTrail(): AuditRecord[] {
    return [...this.auditLog];
  }
}

export const recommendationLifecycleEngine = new RecommendationLifecycleEngine();
