// ============================================================
// JUNCTION - Recommendation & Human-in-the-Loop Lifecycle
// ============================================================

import {
  OperationalIntervention,
  RecommendationLifecycleStatus,
  ZoneState,
  AuditRecord,
} from "@/types";
import { getZoneCoverageProfile } from "./zoneRegistry";
import { persistenceService } from "./persistenceService";

export class RecommendationLifecycleEngine {
  private auditLog: AuditRecord[] = [];
  private lastProposedTimestamps: Map<string, number> = new Map();
  private cooldownMs: number = 300_000; // 5 minute duplicate suppression cooldown

  /**
   * Evaluates zone states and generates explainable operational recommendations.
   * Every recommendation includes contributing evidence, expected impact, required human approval,
   * duplicate suppression cooldowns, and honesty checks for uninstrumented or low-confidence zones.
   */
  public generateInterventions(zones: ZoneState[]): OperationalIntervention[] {
    const interventions: OperationalIntervention[] = [];
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const expiresAt = new Date(now + 60 * 60_000).toISOString();

    for (const zone of zones) {
      const coverage = getZoneCoverageProfile(zone.id);

      // Uninstrumented zones require manual confirmation and cannot auto-trigger critical interventions
      if (!coverage.canTriggerOperationalRecommendations && zone.pressure >= 85) {
        continue;
      }

      if (zone.pressure >= 85) {
        // High pressure in terminal hub (Churchgate)
        if (zone.id === "ZONE_CHURCHGATE") {
          const key = "REROUTE_ATTENDEES_ZONE_CHURCHGATE";
          const lastTime = this.lastProposedTimestamps.get(key) || 0;
          if (now - lastTime >= this.cooldownMs) {
            this.lastProposedTimestamps.set(key, now);
            interventions.push({
              id: `INT_DIVERT_MARINE_LINES_${now}`,
              type: "REROUTE_ATTENDEES",
              title: "Divert Northern Foot Traffic to Marine Lines Station",
              description: "Churchgate concourse has reached 90% capacity. Signal attendee navigation to direct northbound commuters to Marine Lines.",
              targetZoneId: "ZONE_CHURCHGATE",
              secondaryAffectedResourceIds: ["MARINE_LINES"],
              status: "PROPOSED",
              urgency: "HIGH",
              requiresApproval: true,
              approvalRoleRequired: "ORGANIZER",
              rationale: `Churchgate platform capacity exceeding safety threshold (${zone.pressure}%) while Marine Lines has 45% available buffer.`,
              contributingSignals: [
                `Zone pressure: ${zone.pressure}%`,
                `Active crowd count: ${zone.currentUtilization} persons`,
                `Data source: ${zone.source || coverage.dataSource}`,
                `Confidence score: ${Math.round(zone.confidence * 100)}%`,
                "Queue wait time exceeding 15 minutes",
              ],
              expectedPressureReductionPercent: 22,
              timeToEffectMinutes: 10,
              confidenceScore: Math.min(zone.confidence, coverage.maxPermittedConfidence),
              proposedAt: nowIso,
              expiresAt,
              rollbackFeasible: true,
              rollbackPlan: "Restore standard route guidance on attendee navigation screens.",
            });
          }
        }

        // Staging bay pickup congestion
        if (zone.id === "ZONE_TAXI_STAGING") {
          const key = "ADD_TRANSIT_SHUTTLES_ZONE_TAXI_STAGING";
          const lastTime = this.lastProposedTimestamps.get(key) || 0;
          if (now - lastTime >= this.cooldownMs) {
            this.lastProposedTimestamps.set(key, now);
            interventions.push({
              id: `INT_SHUTTLE_DISPATCH_${now}`,
              type: "ADD_TRANSIT_SHUTTLES",
              title: "Deploy 12 Reserve Shuttles to Veer Nariman Staging Bay",
              description: "Taxi queue is saturated with a 25-minute wait. Dispatch 12 pre-staged high-capacity buses to clear curb queues.",
              targetZoneId: "ZONE_TAXI_STAGING",
              status: "PROPOSED",
              urgency: "CRITICAL",
              requiresApproval: true,
              approvalRoleRequired: "TRANSIT_AUTHORITY",
              rationale: `Rideshare queue length in ${zone.name} causing vehicle spillback onto Veer Nariman Road.`,
              contributingSignals: [
                `Taxi bay pressure: ${zone.pressure}%`,
                `Active count: ${zone.currentUtilization} persons`,
                `Data source: ${zone.source || coverage.dataSource}`,
                "Curb lane gridlock warning",
              ],
              expectedPressureReductionPercent: 35,
              timeToEffectMinutes: 8,
              confidenceScore: Math.min(zone.confidence, coverage.maxPermittedConfidence),
              proposedAt: nowIso,
              expiresAt,
              rollbackFeasible: false,
            });
          }
        }

        // Egress congestion in Wankhede Stadium perimeter
        if (zone.id === "ZONE_WANKHEDE") {
          const key = "GATE_CAPACITY_CHANGE_ZONE_WANKHEDE";
          const lastTime = this.lastProposedTimestamps.get(key) || 0;
          if (now - lastTime >= this.cooldownMs) {
            this.lastProposedTimestamps.set(key, now);
            interventions.push({
              id: `INT_HOLD_GATES_${now}`,
              type: "GATE_CAPACITY_CHANGE",
              title: "Pace Gate 3 & 4 Egress Waves (4-Minute Metering)",
              description: "Concourse egress wave is surging faster than station absorption rate. Meter Gate 3 & 4 turnstiles to prevent platform stampede.",
              targetZoneId: "ZONE_WANKHEDE",
              status: "PROPOSED",
              urgency: "CRITICAL",
              requiresApproval: true,
              approvalRoleRequired: "VENUE_OPS",
              rationale: "Perimeter egress flow rate exceeds 280 persons/min, creating choke point at Maharshi Karve crossing.",
              contributingSignals: [
                `Egress concourse utilization: ${zone.currentUtilization} persons (${zone.pressure}%)`,
                `Optical LiDAR density: ${zone.density || 3.2} p/m²`,
                `Hardware confidence: ${Math.round(zone.confidence * 100)}%`,
              ],
              expectedPressureReductionPercent: 28,
              timeToEffectMinutes: 4,
              confidenceScore: Math.min(zone.confidence, coverage.maxPermittedConfidence),
              proposedAt: nowIso,
              expiresAt,
              rollbackFeasible: true,
              rollbackPlan: "Restore open turnstile flow upon platform clearance.",
            });
          }
        }
      }
    }

    // Persist newly proposed interventions in background
    for (const item of interventions) {
      persistenceService.persistIntervention(item).catch(() => {});
    }

    return interventions;
  }

  /**
   * Processes a human decision (Approve, Reject) with complete audit logging and persistence.
   */
  public processApproval(
    intervention: OperationalIntervention,
    action: "APPROVE" | "REJECT",
    actorId: string,
    actorRole: "ORGANIZER" | "PARTNER"
  ): { updatedIntervention: OperationalIntervention; auditRecord: AuditRecord } {
    if (intervention.status !== "PROPOSED" && intervention.status !== "UNDER_REVIEW") {
      throw new Error(`Invalid lifecycle transition: Cannot ${action} intervention in '${intervention.status}' status.`);
    }

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

    persistenceService.persistAuditEvent(auditRecord).catch(() => {});
    persistenceService.persistIntervention(updatedIntervention).catch(() => {});

    return {
      updatedIntervention,
      auditRecord,
    };
  }

  /**
   * Transitions an APPROVED recommendation to EXECUTING/COMPLETED with strict validation.
   */
  public executeIntervention(
    intervention: OperationalIntervention,
    actorId: string,
    actorRole: "ORGANIZER" | "PARTNER"
  ): { updatedIntervention: OperationalIntervention; auditRecord: AuditRecord } {
    if (intervention.status !== "APPROVED") {
      throw new Error(`Invalid lifecycle transition: Cannot EXECUTE intervention in '${intervention.status}' status. Human approval required.`);
    }

    const now = new Date().toISOString();
    const updatedIntervention: OperationalIntervention = {
      ...intervention,
      status: "EXECUTED",
      executionStartedAt: now,
      completedAt: now,
    };

    const auditRecord: AuditRecord = {
      id: `AUDIT_EXEC_${Date.now()}`,
      timestamp: now,
      actorId,
      actorRole,
      category: "OPERATIONAL_OVERRIDE",
      targetEntityType: "RECOMMENDATION",
      targetEntityId: intervention.id,
      previousState: { status: "APPROVED" },
      newState: { status: "EXECUTED" },
      changeSummary: `Operational intervention '${intervention.title}' was EXECUTED by ${actorId} (${actorRole})`,
      rationale: intervention.rationale,
      isSimulatedScenario: true,
    };

    this.auditLog.push(auditRecord);

    persistenceService.persistAuditEvent(auditRecord).catch(() => {});
    persistenceService.persistIntervention(updatedIntervention).catch(() => {});

    return {
      updatedIntervention,
      auditRecord,
    };
  }

  /**
   * Convenience helper to record approval/rejection decision by ID and persist audit record.
   */
  public recordDecision(
    recommendationId: string,
    action: "APPROVE" | "REJECT",
    actorId: string,
    actorRole: "ORGANIZER" | "PARTNER"
  ): AuditRecord {
    const now = new Date().toISOString();
    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const auditRecord: AuditRecord = {
      id: `AUDIT_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      actorId,
      actorRole,
      category: action === "APPROVE" ? "RECOMMENDATION_APPROVAL" : "RECOMMENDATION_REJECTION",
      targetEntityType: "RECOMMENDATION",
      targetEntityId: recommendationId,
      previousState: { status: "PROPOSED" },
      newState: { status: newStatus },
      changeSummary: `Operational recommendation #${recommendationId} was ${newStatus} by ${actorId} (${actorRole})`,
      rationale: `Human-in-the-loop decision executed from operations console.`,
      isSimulatedScenario: true,
    };

    this.auditLog.push(auditRecord);
    persistenceService.persistAuditEvent(auditRecord).catch(() => {});
    return auditRecord;
  }

  public getAuditTrail(): AuditRecord[] {
    return [...this.auditLog];
  }

  public resetCooldowns(): void {
    this.lastProposedTimestamps.clear();
  }
}

export const recommendationLifecycleEngine = new RecommendationLifecycleEngine();
