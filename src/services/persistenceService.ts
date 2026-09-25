// ============================================================
// JUNCTION - Unified Persistence & Auditability Service
// ============================================================

import { AuditRecord, OperationalIntervention } from "@/types";

export class PersistenceService {
  private inMemoryAuditLog: AuditRecord[] = [];
  private inMemoryInterventions: Map<string, OperationalIntervention> = new Map();

  /**
   * Persists an audit record to the persistent audit log.
   * Runs safely in both browser client components and Node.js server runtimes.
   */
  public async persistAuditEvent(record: AuditRecord): Promise<void> {
    // Store in memory ring buffer for instantaneous UI access
    this.inMemoryAuditLog.unshift(record);
    if (this.inMemoryAuditLog.length > 500) {
      this.inMemoryAuditLog.pop();
    }

    // In server environment with database configured, persist asynchronously
    if (typeof window === "undefined" && process.env.DATABASE_URL) {
      try {
        const { db } = await import("@/db");
        const { auditEvents } = await import("@/db/schema");
        await db.insert(auditEvents).values({
          id: record.id,
          actorId: record.actorId,
          actorRole: record.actorRole,
          category: record.category,
          targetEntityType: record.targetEntityType,
          targetEntityId: record.targetEntityId,
          changeSummary: record.changeSummary,
          rationale: record.rationale || null,
          previousStateJson: record.previousState ? JSON.stringify(record.previousState) : null,
          newStateJson: record.newState ? JSON.stringify(record.newState) : null,
          isSimulatedScenario: record.isSimulatedScenario,
          timestamp: new Date(record.timestamp),
        });
      } catch (err) {
        // Fall back gracefully to memory store without throwing
        console.warn("[PersistenceService] DB insert skipped/failed, preserved in memory:", (err as Error).message);
      }
    }
  }

  /**
   * Persists or updates an operational intervention state.
   */
  public async persistIntervention(intervention: OperationalIntervention): Promise<void> {
    this.inMemoryInterventions.set(intervention.id, { ...intervention });

    if (typeof window === "undefined" && process.env.DATABASE_URL) {
      try {
        const { db } = await import("@/db");
        const { operationalInterventions } = await import("@/db/schema");
        await db
          .insert(operationalInterventions)
          .values({
            id: intervention.id,
            type: intervention.type,
            title: intervention.title,
            description: intervention.description,
            targetZoneId: intervention.targetZoneId,
            status: intervention.status,
            urgency: intervention.urgency,
            requiresApproval: intervention.requiresApproval,
            approvalRoleRequired: intervention.approvalRoleRequired || null,
            rationale: intervention.rationale,
            confidenceScore: intervention.confidenceScore,
            expectedPressureReductionPercent: intervention.expectedPressureReductionPercent,
            proposedAt: new Date(intervention.proposedAt),
            expiresAt: new Date(intervention.expiresAt),
            approvedAt: intervention.approvedAt ? new Date(intervention.approvedAt) : null,
            approvedByUserId: intervention.approvedByUserId || null,
            rejectionReason: intervention.rejectionReason || null,
          })
          .onConflictDoUpdate({
            target: operationalInterventions.id,
            set: {
              status: intervention.status,
              approvedAt: intervention.approvedAt ? new Date(intervention.approvedAt) : null,
              approvedByUserId: intervention.approvedByUserId || null,
              rejectionReason: intervention.rejectionReason || null,
            },
          });
      } catch (err) {
        console.warn("[PersistenceService] DB intervention update skipped/failed, preserved in memory:", (err as Error).message);
      }
    }
  }

  /**
   * Retrieves audit trail.
   */
  public async getAuditTrail(limit = 100): Promise<AuditRecord[]> {
    if (typeof window === "undefined" && process.env.DATABASE_URL) {
      try {
        const { db } = await import("@/db");
        const { auditEvents } = await import("@/db/schema");
        const { desc } = await import("drizzle-orm");
        const rows = await db.select().from(auditEvents).orderBy(desc(auditEvents.timestamp)).limit(limit);
        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            timestamp: r.timestamp.toISOString(),
            actorId: r.actorId,
            actorRole: r.actorRole as AuditRecord["actorRole"],
            category: r.category as AuditRecord["category"],
            targetEntityType: r.targetEntityType as AuditRecord["targetEntityType"],
            targetEntityId: r.targetEntityId,
            changeSummary: r.changeSummary,
            rationale: r.rationale || undefined,
            previousState: r.previousStateJson ? JSON.parse(r.previousStateJson) : undefined,
            newState: r.newStateJson ? JSON.parse(r.newStateJson) : undefined,
            isSimulatedScenario: r.isSimulatedScenario,
          }));
        }
      } catch {
        return [...this.inMemoryAuditLog.slice(0, limit)];
      }
    }
    return [...this.inMemoryAuditLog.slice(0, limit)];
  }

  /**
   * Returns snapshot of current interventions.
   */
  public getInterventions(): OperationalIntervention[] {
    return Array.from(this.inMemoryInterventions.values());
  }

  /**
   * Returns storage diagnostics for operational transparency.
   */
  public getStorageDiagnostics(): {
    storageMode: "DURABLE_POSTGRES" | "IN_MEMORY_SESSION";
    dbConfigured: boolean;
    inMemoryAuditRecordCount: number;
    inMemoryInterventionCount: number;
  } {
    const dbConfigured = typeof window === "undefined" && Boolean(process.env.DATABASE_URL);
    return {
      storageMode: dbConfigured ? "DURABLE_POSTGRES" : "IN_MEMORY_SESSION",
      dbConfigured,
      inMemoryAuditRecordCount: this.inMemoryAuditLog.length,
      inMemoryInterventionCount: this.inMemoryInterventions.size,
    };
  }
}

export const persistenceService = new PersistenceService();
