// ============================================================
// JUNCTION - Server-Side AI Recommendation Planner API
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import {
  RecommendationContext,
  AiRecommendationPlan,
  SUPPORTED_ACTION_CATALOGUE,
} from "@/types/aiRecommendation";
import { Recommendation, OperationalIntervention } from "@/types";

export const dynamic = "force-dynamic";

// Server-side cache and quota protection
const SERVER_COOLDOWN_MS = 60_000; // 60 seconds cooldown between external Gemini calls
const CACHE_TTL_MS = 180_000; // 3 minutes cache retention
let lastGeminiCallTimestamp = 0;
let rateLimitBackoffUntil = 0;
let lastSuccessfulAiPlan: AiRecommendationPlan | null = null;
const cachedPlans = new Map<string, { plan: AiRecommendationPlan; timestamp: number }>();

/**
 * Builds deterministic fallback recommendations from candidate interventions and zone telemetry
 */
function buildDeterministicFallback(
  context: RecommendationContext,
  reason: string
): AiRecommendationPlan {
  const planId = `PLAN_FALLBACK_${Date.now()}`;
  const now = new Date().toISOString();

  const candidateInterventions = context.candidateInterventions.length > 0
    ? context.candidateInterventions
    : [];

  const mappedRecs: Recommendation[] = candidateInterventions.map((item, idx) => {
    let recType: Recommendation["type"] = "TRANSPORT";
    if (item.type === "REROUTE_ATTENDEES") recType = "REDISTRIBUTE";
    else if (item.type === "HOSPITALITY_DEMAND_SIGNAL") recType = "ACCOMMODATION";
    else if (item.type === "DYNAMIC_MESSAGING_DISPATCH") recType = "ALERT";
    else if (item.type === "GATE_CAPACITY_CHANGE") recType = "TIMING";

    const targetRes = context.resources.find(r => r.id === item.targetResourceId);
    const beforePressure = targetRes?.pressure ?? 85;
    const afterPressure = Math.max(30, beforePressure - item.expectedPressureReductionPercent);

    return {
      id: `REC_FALLBACK_${item.id}`,
      type: recType,
      title: item.title,
      problem: `High operational pressure detected at ${item.targetZoneId}. ${item.contributingSignals.join(" ")}`,
      action: item.description,
      reason: item.rationale,
      expectedImpact: [
        {
          resourceName: targetRes?.name || item.targetZoneId,
          before: beforePressure,
          after: afterPressure,
        },
      ],
      tradeOff: item.rollbackPlan || "Requires active operator coordination across field personnel.",
      confidence: item.confidenceScore >= 0.8 ? "HIGH" : item.confidenceScore >= 0.6 ? "MEDIUM" : "LOW",
      source: "SIMULATED",
      status: "PENDING",
      affectsAttendee: item.type === "REROUTE_ATTENDEES" || item.type === "HOSPITALITY_DEMAND_SIGNAL",
      attendeeMessage: item.type === "REROUTE_ATTENDEES"
        ? "Transit advisory: High volume at primary station. Please consider alternate transit corridors."
        : undefined,
      priority: idx + 1,
      actionType: item.type,
      evidence: item.contributingSignals,
      affectedZones: [item.targetZoneId],
      timeHorizonMinutes: item.timeToEffectMinutes || 15,
    };
  });

  // If no candidate interventions exist (e.g. baseline normal state), provide a baseline monitoring recommendation
  if (mappedRecs.length === 0) {
    mappedRecs.push({
      id: "REC_NORMAL_MONITOR",
      type: "TIMING",
      title: "Maintain Nominal Dispersal Staging",
      problem: "Operational pressures are within standard nominal safety thresholds across all monitored hubs.",
      action: "Maintain steady egress monitoring and keep standby shuttle reserves stationed at South Taxi Bay.",
      reason: "All monitored zones report healthy clearance throughput with no active bottleneck cascades.",
      expectedImpact: [
        { resourceName: "Churchgate Station", before: 45, after: 45 },
        { resourceName: "Wankhede Exit", before: 40, after: 40 },
      ],
      tradeOff: "No intervention necessary; standard operational staffing remains on schedule.",
      confidence: "HIGH",
      source: "SIMULATED",
      status: "PENDING",
      affectsAttendee: false,
      priority: 1,
      actionType: "REROUTE_ATTENDEES",
      evidence: ["Nominal multi-sensor fusion telemetry across all zones"],
      affectedZones: ["ZONE_WANKHEDE"],
      timeHorizonMinutes: 15,
    });
  }

  return {
    planId,
    generatedAt: now,
    source: "DETERMINISTIC_FALLBACK",
    planSummary: `Deterministic operational plan generated (${reason}). Preserves verified sensor fusion and intervention rules.`,
    recommendations: mappedRecs,
    operationalRationale: `Deterministic fallback synthesized from ${context.zones.length} zone states and ${candidateInterventions.length} candidate interventions.`,
    contextFingerprint: context.fingerprint,
    sourceContextSummary: `Fallback generated for scenario ${context.activeScenario} (Minute ${context.simulationMinutes})`,
  };
}

export async function POST(req: NextRequest) {
  let body: RecommendationContext & { forceRefresh?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON request payload." },
      { status: 400 }
    );
  }

  // Validate required context fields
  if (!body.activeScenario || !Array.isArray(body.zones)) {
    return NextResponse.json(
      { success: false, error: "Missing required RecommendationContext fields (activeScenario, zones)." },
      { status: 400 }
    );
  }

  const nowMs = Date.now();
  const fingerprint = body.fingerprint;

  // 1. Check Server-Side Cache for Identical Fingerprint
  const cachedEntry = cachedPlans.get(fingerprint);
  if (cachedEntry && (nowMs - cachedEntry.timestamp < CACHE_TTL_MS) && !body.forceRefresh) {
    const remainingCooldown = Math.max(0, Math.ceil((SERVER_COOLDOWN_MS - (nowMs - lastGeminiCallTimestamp)) / 1000));
    return NextResponse.json({
      success: true,
      plan: {
        ...cachedEntry.plan,
        source: "CACHED_AI",
        isCached: true,
        cooldownRemainingSeconds: remainingCooldown,
      },
    });
  }

  // 2. Server-Side Rate Limit / Backoff Protection (only block if not forceRefresh)
  if (nowMs < rateLimitBackoffUntil && !body.forceRefresh) {
    if (lastSuccessfulAiPlan) {
      return NextResponse.json({
        success: true,
        plan: {
          ...lastSuccessfulAiPlan,
          source: "CACHED_AI",
          isCached: true,
          cooldownRemainingSeconds: Math.ceil((rateLimitBackoffUntil - nowMs) / 1000),
        },
      });
    }
    const fallbackPlan = buildDeterministicFallback(body, "Gemini rate-limit backoff active (protecting API quota)");
    return NextResponse.json({ success: true, plan: fallbackPlan });
  }

  // If backoff window has elapsed, reset it
  if (nowMs >= rateLimitBackoffUntil) {
    rateLimitBackoffUntil = 0;
  }

  // 3. Cooldown check if not forced: return cached AI plan if available
  const elapsedSinceLastCall = nowMs - lastGeminiCallTimestamp;
  if (elapsedSinceLastCall < SERVER_COOLDOWN_MS && !body.forceRefresh) {
    const planToReturn = cachedEntry?.plan || lastSuccessfulAiPlan;
    if (planToReturn) {
      const remainingCooldown = Math.ceil((SERVER_COOLDOWN_MS - elapsedSinceLastCall) / 1000);
      return NextResponse.json({
        success: true,
        plan: {
          ...planToReturn,
          source: "CACHED_AI",
          isCached: true,
          cooldownRemainingSeconds: remainingCooldown,
        },
      });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // Fallback if no API key configured
  if (!apiKey || apiKey.trim() === "") {
    const fallbackPlan = buildDeterministicFallback(body, "GEMINI_API_KEY not configured");
    return NextResponse.json({ success: true, plan: fallbackPlan });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are the principal operational recommendation planner for JUNCTION crowd orchestration system in Mumbai.

You receive structured operational telemetry from sensor fusion, forward forecasting, spatial hotspot detection, and transit network cascades.

STRICT OPERATIONAL & GROUNDING RULES:
1. Ground every statement strictly in the provided JUNCTION telemetry.
2. Distinguish data sources clearly:
   - OBSERVED (CCTV, Gate counters, Bluetooth beacons)
   - FORECAST (+15m, +30m, +60m trend projections)
   - REGIONAL_BASELINE / UNINSTRUMENTED (CSMT, Dadar)
3. ONLY recommend actions from the supplied 7 SUPPORTED_ACTION_CATALOGUE:
   - REROUTE_ATTENDEES (Dynamic Attendee Redistribution)
   - GATE_CAPACITY_CHANGE (Egress Gate Metering & Throttling)
   - ADD_TRANSIT_SHUTTLES (Express Transit Shuttle Deployment)
   - REDIRECT_PICKUP_ZONE (Rideshare Staging Bay Relocation)
   - HOSPITALITY_DEMAND_SIGNAL (Commercial Dining & Hospitality Inflow Vouchers)
   - DYNAMIC_MESSAGING_DISPATCH (Variable Message Sign Advisory)
   - EMERGENCY_CORRIDOR_HOLD (Pedestrian Concourse Emergency Hold)
4. NEVER invent capacities, sensors, roads, routes, staff counts, infrastructure, or guaranteed impact values.
5. Provide concrete operational problems, evidence signals, actionable instructions, and specific trade-offs.
6. Note any data quality limitations (e.g. uninstrumented stations, missing sensors, camera lag).
7. Keep recommendations structured, concise, and professional. Return valid JSON matching the schema.`;

    const userPrompt = `OPERATIONAL TELEMETRY FOR SYNTHESIS:
Active Scenario: ${body.activeScenario}
Simulation Time Elapsed: ${body.simulationMinutes} minutes

ZONES TELEMETRY (Fused):
${JSON.stringify(body.zones, null, 2)}

RESOURCES STATUS:
${JSON.stringify(body.resources, null, 2)}

SPATIAL HOTSPOTS:
${JSON.stringify(body.hotspots, null, 2)}

CASCADE SPILLOVER RISK:
${JSON.stringify(body.cascade || {}, null, 2)}

CANDIDATE INTERVENTIONS FROM RULES ENGINE:
${JSON.stringify(body.candidateInterventions, null, 2)}

SUPPORTED ACTION CATALOGUE:
${JSON.stringify(SUPPORTED_ACTION_CATALOGUE, null, 2)}

Generate a concise, high-priority operational plan (2-3 recommendations) addressing the most critical bottlenecks.`;

    const candidateModels = [
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-2.5-flash-lite",
      "gemini-3.8-flash",
    ];
    let response: any = null;
    let successfulModel = candidateModels[0];
    let lastError: Error | null = null;
    let anyRateLimited = false;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                planSummary: { type: Type.STRING },
                operationalRationale: { type: Type.STRING },
                recommendations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      type: {
                        type: Type.STRING,
                        enum: [
                          "REDISTRIBUTE",
                          "TRANSPORT",
                          "ACCOMMODATION",
                          "TIMING",
                          "ALERT",
                          "STAFFING",
                          "ACCESS",
                          "COMMUNICATION",
                        ],
                      },
                      title: { type: Type.STRING },
                      problem: { type: Type.STRING },
                      reason: { type: Type.STRING },
                      action: { type: Type.STRING },
                      actionType: { type: Type.STRING },
                      tradeOff: { type: Type.STRING },
                      expectedImpact: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            resourceName: { type: Type.STRING },
                            before: { type: Type.NUMBER },
                            after: { type: Type.NUMBER },
                          },
                          required: ["resourceName", "before", "after"],
                        },
                      },
                      confidence: {
                        type: Type.STRING,
                        enum: ["HIGH", "MEDIUM", "LOW"],
                      },
                      attendeeMessage: { type: Type.STRING },
                      priority: { type: Type.INTEGER },
                    },
                    required: [
                      "id",
                      "type",
                      "title",
                      "problem",
                      "reason",
                      "action",
                      "tradeOff",
                      "expectedImpact",
                      "confidence",
                      "priority",
                    ],
                  },
                },
              },
              required: ["planSummary", "operationalRationale", "recommendations"],
            },
          },
        });
        if (response) {
          successfulModel = modelName;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[API /recommendations/plan] Model ${modelName} call failed:`, err.message);
        if (err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED") || err.message?.includes("quota")) {
          anyRateLimited = true;
        }
        // Continue to test the next candidate model
        continue;
      }
    }

    if (!response) {
      if (anyRateLimited) {
        rateLimitBackoffUntil = Date.now() + 120_000;
      }
      throw lastError || new Error("All candidate Gemini models failed");
    }

    const responseText = typeof (response as any).text === "function" ? (response as any).text() : response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    const parsed = JSON.parse(responseText);
    const supportedActionTypes = new Set(SUPPORTED_ACTION_CATALOGUE.map(a => a.type));

    const validatedRecs: Recommendation[] = (parsed.recommendations || []).map((r: any, idx: number) => {
      const validActionType = r.actionType && supportedActionTypes.has(r.actionType)
        ? r.actionType
        : "REROUTE_ATTENDEES";

      return {
        id: r.id || `AI_REC_${idx + 1}`,
        type: r.type || "TRANSPORT",
        title: r.title,
        problem: r.problem,
        action: r.action,
        reason: r.reason,
        expectedImpact: Array.isArray(r.expectedImpact) && r.expectedImpact.length > 0
          ? r.expectedImpact.map((imp: any) => ({
              resourceName: imp.resourceName || "Monitored Node",
              before: Number(imp.before) || 80,
              after: Number(imp.after) || 65,
            }))
          : [
              { resourceName: "Churchgate Station", before: 94, after: 76 },
            ],
        tradeOff: r.tradeOff,
        confidence: r.confidence === "HIGH" || r.confidence === "MEDIUM" || r.confidence === "LOW" ? r.confidence : "HIGH",
        source: "AI",
        status: "PENDING",
        affectsAttendee: Boolean(r.attendeeMessage && r.attendeeMessage.trim().length > 0),
        attendeeMessage: r.attendeeMessage || undefined,
        priority: Number(r.priority) || idx + 1,
        actionType: validActionType,
      };
    });

    if (validatedRecs.length === 0) {
      throw new Error("No valid recommendations in Gemini structured output");
    }

    lastGeminiCallTimestamp = Date.now();
    rateLimitBackoffUntil = 0;

    const aiPlan: AiRecommendationPlan = {
      planId: `PLAN_AI_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      source: "AI",
      modelUsed: successfulModel,
      planSummary: parsed.planSummary,
      recommendations: validatedRecs,
      operationalRationale: parsed.operationalRationale,
      contextFingerprint: fingerprint,
      isCached: false,
      cooldownRemainingSeconds: 60,
      sourceContextSummary: `Synthesized live with Gemini Flash for scenario ${body.activeScenario}`,
    };

    // Cache the plan server-side
    cachedPlans.set(fingerprint, { plan: aiPlan, timestamp: Date.now() });
    lastSuccessfulAiPlan = aiPlan;

    return NextResponse.json({ success: true, plan: aiPlan });
  } catch (error: any) {
    console.error("[API /api/recommendations/plan] Gemini call failed, invoking deterministic fallback:", error.message);
    const fallbackPlan = buildDeterministicFallback(body, `Gemini call failed: ${error.message}`);
    return NextResponse.json({ success: true, plan: fallbackPlan });
  }
}

