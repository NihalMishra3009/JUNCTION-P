// ============================================================
// JUNCTION - System Health & Diagnostics API Endpoint
// ============================================================

import { NextResponse } from "next/server";
import { persistenceService } from "@/services/persistenceService";

export async function GET() {
  const diagnostics = persistenceService.getStorageDiagnostics();

  return NextResponse.json({
    status: "HEALTHY",
    service: "JUNCTION Destination Orchestration API Layer",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    database: {
      configured: diagnostics.dbConfigured,
      storageMode: diagnostics.storageMode,
    },
    telemetryBuffer: {
      inMemoryAuditRecords: diagnostics.inMemoryAuditRecordCount,
      inMemoryInterventions: diagnostics.inMemoryInterventionCount,
    },
  });
}
