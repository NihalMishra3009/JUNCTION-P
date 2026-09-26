// ============================================================
// JUNCTION - Persistent Audit Trail API Endpoint
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { persistenceService } from "@/services/persistenceService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const auditTrail = await persistenceService.getAuditTrail(limit);
    const diagnostics = persistenceService.getStorageDiagnostics();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: auditTrail.length,
      storageDiagnostics: diagnostics,
      auditTrail,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve audit trail" },
      { status: 500 }
    );
  }
}
