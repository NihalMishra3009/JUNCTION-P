// ============================================================
// JUNCTION - AI Recommendation Planner Client Service
// ============================================================

import {
  RecommendationContext,
  AiRecommendationPlan,
  SUPPORTED_ACTION_CATALOGUE,
} from "@/types/aiRecommendation";
import {
  ScenarioId,
  ZoneState,
  Resource,
  HotspotPrediction,
  CascadeAnalysisResult,
  OperationalIntervention,
  SimulationState,
  Recommendation,
} from "@/types";

export class AiRecommendationPlannerService {
  private lastFetchedPlan: AiRecommendationPlan | null = null;
  private lastFingerprint: string | null = null;
  private lastFetchTimestamp: number = 0;
  private readonly COOLDOWN_MS = 60_000; // 60 seconds cooldown between external Gemini calls

  /**
   * Computes a semantic operational fingerprint that captures meaningful macro-state shifts
   * (e.g. pressure band crossings, scenario changes, new hotspots) without triggering on minor percentage jitter.
   */
  public computeFingerprint(
    scenario: ScenarioId,
    zones: ZoneState[],
    hotspots: HotspotPrediction[],
    redistributionApplied: boolean
  ): string {
    const zoneBands = zones
      .map(z => {
        // Coarse operational pressure bands: CRIT (>=85), HIGH (70-84), WATCH (50-69), NORM (<50)
        const band = z.pressure >= 85 ? "CRIT" : z.pressure >= 70 ? "HIGH" : z.pressure >= 50 ? "WATCH" : "NORM";
        const hasConflict = (z.conflicts && z.conflicts.length > 0) ? "CONF" : "OK";
        return `${z.id}:${band}:${z.trend}:${hasConflict}`;
      })
      .sort()
      .join("|");

    const hotspotKey = hotspots.map(h => `${h.id}:${h.severity}`).sort().join(",");
    return `${scenario}::${zoneBands}::HOT:${hotspotKey}::REDIST:${redistributionApplied}`;
  }

  /**
   * Returns the remaining cooldown seconds before a fresh AI call can be initiated.
   */
  public getRemainingCooldownSeconds(): number {
    const elapsed = Date.now() - this.lastFetchTimestamp;
    if (elapsed >= this.COOLDOWN_MS) return 0;
    return Math.ceil((this.COOLDOWN_MS - elapsed) / 1000);
  }

  /**
   * Returns the most recent cached plan if available.
   */
  public getLastFetchedPlan(): AiRecommendationPlan | null {
    return this.lastFetchedPlan;
  }

  /**
   * Builds the structured RecommendationContext object from live application state
   */
  public buildContext(
    scenario: ScenarioId,
    zones: ZoneState[],
    resources: Resource[],
    hotspots: HotspotPrediction[],
    cascadeResult: CascadeAnalysisResult | null,
    interventions: OperationalIntervention[],
    simulationState: SimulationState,
    redistributionApplied: boolean
  ): RecommendationContext {
    const fingerprint = this.computeFingerprint(scenario, zones, hotspots, redistributionApplied);

    const zoneSummaries = zones.map(z => {
      const sensors: string[] = z.fusionDiagnostics?.contributingSensors
        ? z.fusionDiagnostics.contributingSensors.map(c => `${c.deviceName} (${c.metricType}: ${c.value} ${c.unit})`)
        : (z.contributingSensors || []);

      return {
        id: z.id,
        name: z.name,
        pressure: z.pressure,
        pressureLevel: z.pressureLevel,
        density: z.density ?? z.fusionDiagnostics?.density ?? 0,
        inflowRate: z.inflowRate,
        trend: z.trend,
        confidence: z.confidence,
        dataQuality: z.dataQuality || "NOMINAL",
        coverageStatus: z.tier,
        contributingSensors: sensors,
        conflicts: z.conflicts || z.fusionDiagnostics?.conflicts || [],
        missingSensors: z.missingSensors || z.fusionDiagnostics?.missingSensors || [],
      };
    });

    const resourceSummaries = resources.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      pressure: r.pressure,
      currentUtilization: r.currentUtilization,
      totalCapacity: r.totalCapacity,
      availableCapacity: r.availableCapacity,
    }));

    const hotspotSummaries = hotspots.map(h => ({
      id: h.id,
      name: h.name,
      currentPressure: h.currentPressure,
      severity: h.severity,
      projectedTimeframe: `+${h.projectedOnsetMinutes || 15}m`,
      keyDrivers: h.keyDrivers || [],
    }));

    const cascadeSummary = cascadeResult
      ? {
          originZoneId: cascadeResult.rootResourceId,
          originPressure: cascadeResult.affectedPathways?.[0]?.[0]?.projectedPressure ?? 0,
          affectedPathways: (cascadeResult.affectedPathways || []).flat().map(p => ({
            nodeId: p.nodeId,
            resourceId: p.resourceId,
            label: p.label,
            currentPressure: p.currentPressure,
            projectedPressure: p.projectedPressure,
            leadTimeMinutes: p.leadTimeMinutes,
            status: p.status,
          })),
        }
      : undefined;

    return {
      activeScenario: scenario,
      simulationMinutes: Math.round(simulationState.minutesElapsed),
      zones: zoneSummaries,
      resources: resourceSummaries,
      hotspots: hotspotSummaries,
      cascade: cascadeSummary,
      candidateInterventions: interventions,
      supportedActions: SUPPORTED_ACTION_CATALOGUE,
      fingerprint,
    };
  }

  /**
   * Evaluates whether a new plan should be requested or if cached plan is valid.
   * Protects API quota by reusing cached plans when the fingerprint is unchanged or cooldown is active.
   */
  public async getOrFetchPlan(
    context: RecommendationContext,
    forceRefresh = false
  ): Promise<AiRecommendationPlan> {
    const now = Date.now();
    const isSameFingerprint = this.lastFingerprint === context.fingerprint;
    const isWithinCooldown = now - this.lastFetchTimestamp < this.COOLDOWN_MS;

    // Fast-path: Return client-side cached AI plan if fingerprint is identical and not forced
    if (!forceRefresh && isSameFingerprint && this.lastFetchedPlan && this.lastFetchedPlan.source !== "DETERMINISTIC_FALLBACK") {
      return {
        ...this.lastFetchedPlan,
        source: "CACHED_AI",
        isCached: true,
        cooldownRemainingSeconds: this.getRemainingCooldownSeconds(),
      };
    }

    // Cooldown protection: If within cooldown and not explicitly forced, return cached AI plan if one exists
    if (!forceRefresh && isWithinCooldown && this.lastFetchedPlan && this.lastFetchedPlan.source !== "DETERMINISTIC_FALLBACK") {
      return {
        ...this.lastFetchedPlan,
        source: "CACHED_AI",
        isCached: true,
        cooldownRemainingSeconds: this.getRemainingCooldownSeconds(),
      };
    }

    try {
      const res = await fetch("/api/recommendations/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...context, forceRefresh }),
      });

      if (!res.ok) {
        throw new Error(`Planner API returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.plan) {
        if (data.plan.source === "AI" || data.plan.source === "CACHED_AI") {
          this.lastFetchedPlan = data.plan;
          this.lastFingerprint = context.fingerprint;
          if (data.plan.source === "AI") {
            this.lastFetchTimestamp = now;
          }
        }
        return data.plan;
      }

      throw new Error(data.error || "Failed to parse planner plan");
    } catch (error: any) {
      console.warn("[AiRecommendationPlannerService] API call failed, generating deterministic in-client fallback:", error.message);
      
      // Resilient client-side fallback
      const items = context.candidateInterventions.length > 0
        ? context.candidateInterventions.map((item, idx) => ({
            id: item.id,
            type: (item.type === "REROUTE_ATTENDEES" ? "REDISTRIBUTE" : item.type === "HOSPITALITY_DEMAND_SIGNAL" ? "ACCOMMODATION" : "TRANSPORT") as any,
            title: item.title,
            problem: `Operational threshold crossed at ${item.targetZoneId}. ${item.contributingSignals.join(", ")}`,
            action: item.description,
            reason: item.rationale,
            expectedImpact: [
              { resourceName: item.targetResourceId || item.targetZoneId, before: 90, after: 75 },
            ],
            tradeOff: item.rollbackPlan || "Requires field operator coordination.",
            confidence: (item.confidenceScore >= 0.8 ? "HIGH" : "MEDIUM") as any,
            source: "SIMULATED" as const,
            status: "PENDING" as const,
            affectsAttendee: item.type === "REROUTE_ATTENDEES",
            attendeeMessage: item.type === "REROUTE_ATTENDEES" ? "High volume detected. Please consider alternate transit routes." : undefined,
            priority: idx + 1,
            actionType: item.type,
            evidence: item.contributingSignals,
            affectedZones: [item.targetZoneId],
            timeHorizonMinutes: 15,
          }))
        : context.zones
            .filter(z => z.pressure >= 70)
            .map((z, idx) => ({
              id: `REC_FALLBACK_${z.id}_${Date.now()}`,
              type: "REDISTRIBUTE" as const,
              title: `Alleviate Congestion Surge at ${z.name}`,
              problem: `Zone pressure at ${z.pressure}% (${z.pressureLevel}) with ${z.inflowRate} inflow rate.`,
              action: `Deploy flow moderators and signal alternate transit corridors away from ${z.name}.`,
              reason: `Multi-sensor fusion indicates elevated density (${z.density} pax/m²) with ${z.trend} trend.`,
              expectedImpact: [
                { resourceName: z.name, before: z.pressure, after: Math.max(50, z.pressure - 15) },
              ],
              tradeOff: "Requires field marshalling and dynamic signage adjustment.",
              confidence: (z.confidence >= 0.8 ? "HIGH" : "MEDIUM") as any,
              source: "SIMULATED" as const,
              status: "PENDING" as const,
              affectsAttendee: true,
              attendeeMessage: `High attendee volume near ${z.name}. Please follow steward directions to alternate exits.`,
              priority: idx + 1,
              actionType: "REROUTE_ATTENDEES",
              evidence: z.contributingSensors,
              affectedZones: [z.id],
              timeHorizonMinutes: 15,
            }));

      return {
        planId: `PLAN_CLIENT_FALLBACK_${Date.now()}`,
        generatedAt: new Date().toISOString(),
        source: "DETERMINISTIC_FALLBACK",
        planSummary: "Deterministic operational plan generated from local sensor fusion rules.",
        recommendations: items.length > 0 ? items : [
          {
            id: `REC_FALLBACK_DEFAULT_${Date.now()}`,
            type: "REDISTRIBUTE",
            title: "Maintain Nominal Corridor Monitoring",
            problem: "Operational pressures are within nominal limits across all monitored zones.",
            action: "Maintain active surveillance and standby shuttle positioning.",
            reason: "Telemetry indicates baseline attendee flow across all terminal corridors.",
            expectedImpact: [{ resourceName: "Venue Corridors", before: 45, after: 45 }],
            tradeOff: "Standard operational resource commitment.",
            confidence: "HIGH",
            source: "SIMULATED",
            status: "PENDING",
            affectsAttendee: false,
            priority: 1,
            actionType: "REROUTE_ATTENDEES",
            evidence: ["Nominal sensor fusion telemetry"],
            affectedZones: ["ZONE_WANKHEDE"],
            timeHorizonMinutes: 15,
          }
        ],
        operationalRationale: "Local deterministic fallback active.",
        contextFingerprint: context.fingerprint,
        sourceContextSummary: `Local fallback for scenario ${context.activeScenario}`,
      };
    }
  }
}

export const aiRecommendationPlanner = new AiRecommendationPlannerService();

