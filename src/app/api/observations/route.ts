// ============================================================
// JUNCTION - Server-Side Computer Vision Observation Ingestion API
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { NormalizedObservation } from "@/types";
import { ingestionPipeline } from "@/services/ingestionPipeline";

// In-memory ring buffer of the most recent CV observations
let latestCvObservations: NormalizedObservation[] = [];
let totalIngestedCount = 0;
let lastIngestedAt: string | null = null;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawObs: NormalizedObservation[] = body.observations || (body.id ? [body] : []);

    if (!Array.isArray(rawObs) || rawObs.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid observations array provided." },
        { status: 400 }
      );
    }

    // Process through canonical ingestion pipeline
    const pipelineResult = ingestionPipeline.processBatch(rawObs);

    if (pipelineResult.accepted.length > 0) {
      // Append to ring buffer (retain last 200 observations)
      latestCvObservations = [
        ...pipelineResult.accepted,
        ...latestCvObservations,
      ].slice(0, 200);

      totalIngestedCount += pipelineResult.accepted.length;
      lastIngestedAt = new Date().toISOString();
    }

    return NextResponse.json({
      success: true,
      acceptedCount: pipelineResult.accepted.length,
      quarantinedCount: pipelineResult.quarantined.length,
      deduplicatedCount: pipelineResult.deduplicatedCount,
      totalIngested: totalIngestedCount,
      lastIngestedAt,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to parse observation payload" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ONLINE",
    provider: "JUNCTION-CV-Ingestion-Gateway",
    totalIngestedCount,
    lastIngestedAt,
    latestObservations: latestCvObservations.slice(0, 20),
    activeCount: latestCvObservations.find(o => o.metricType === "CROWD_COUNT")?.value ?? 0,
  });
}
