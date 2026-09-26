// ============================================================
// JUNCTION - Human-in-the-Loop Recommendation Approval Endpoint
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { recommendationLifecycleEngine } from "@/services/recommendationLifecycleEngine";
import { persistenceService } from "@/services/persistenceService";
import { getCurrentProfile } from "@/services/authService";
import { OperationalIntervention } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const profile = await getCurrentProfile("ORGANIZER");

    const actorId = profile?.clerkUserId || body.actorId || "ORGANIZER_OPERATOR";
    const actorRole = profile?.role === "RESTAURANT_PARTNER" ? "PARTNER" : "ORGANIZER";

    const existingIntervention = persistenceService
      .getInterventions()
      .find((i) => i.id === id) || {
      id,
      type: "REROUTE_ATTENDEES",
      title: "Divert Northern Foot Traffic to Marine Lines Station",
      description: "Concourse egress congestion mitigation",
      targetZoneId: "ZONE_CHURCHGATE",
      status: "PROPOSED",
      urgency: "HIGH",
      requiresApproval: true,
      rationale: "Churchgate station concourse threshold saturation",
      confidenceScore: 0.9,
      expectedPressureReductionPercent: 25,
      timeToEffectMinutes: 5,
      proposedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    } as OperationalIntervention;

    const { updatedIntervention, auditRecord } = recommendationLifecycleEngine.processApproval(
      existingIntervention,
      "APPROVE",
      actorId,
      actorRole
    );

    await persistenceService.persistIntervention(updatedIntervention);
    await persistenceService.persistAuditEvent(auditRecord);

    return NextResponse.json({
      success: true,
      message: `Intervention '${id}' successfully approved by ${actorId}.`,
      intervention: updatedIntervention,
      auditRecord,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to approve intervention" },
      { status: 500 }
    );
  }
}
