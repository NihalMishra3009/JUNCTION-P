// ============================================================
// JUNCTION - Server-Side Computer Vision Observation & Detection API
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { NormalizedObservation } from "@/types";
import { CctvFrameTelemetry } from "@/types/cctv";
import { ingestionPipeline } from "@/services/ingestionPipeline";

// In-memory ring buffer of normalized observations
let latestCvObservations: NormalizedObservation[] = [];
let totalIngestedCount = 0;
let lastIngestedAt: string | null = null;

// Real-time detection frames per camera channel (with heartbeat timestamps)
const latestCctvFrames: Record<string, { frame: CctvFrameTelemetry; receivedAtMs: number }> = {};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawObs: NormalizedObservation[] = body.observations || (body.id ? [body] : []);
    const cctvFrame: CctvFrameTelemetry | undefined = body.cctvFrame;

    let acceptedCount = 0;
    let quarantinedCount = 0;
    let deduplicatedCount = 0;

    // 1. Process canonical NormalizedObservations if present
    if (Array.isArray(rawObs) && rawObs.length > 0) {
      const pipelineResult = ingestionPipeline.processBatch(rawObs);
      acceptedCount = pipelineResult.accepted.length;
      quarantinedCount = pipelineResult.quarantined.length;
      deduplicatedCount = pipelineResult.deduplicatedCount;

      if (pipelineResult.accepted.length > 0) {
        latestCvObservations = [
          ...pipelineResult.accepted,
          ...latestCvObservations,
        ].slice(0, 200);

        totalIngestedCount += pipelineResult.accepted.length;
        lastIngestedAt = new Date().toISOString();
      }
    }

    // 2. Process real-time CCTV detection frame payload if present
    if (cctvFrame && cctvFrame.cameraId) {
      latestCctvFrames[cctvFrame.cameraId] = {
        frame: cctvFrame,
        receivedAtMs: Date.now(),
      };
      lastIngestedAt = new Date().toISOString();
    }

    return NextResponse.json({
      success: true,
      acceptedCount,
      quarantinedCount,
      deduplicatedCount,
      totalIngested: totalIngestedCount,
      hasCctvFrame: Boolean(cctvFrame),
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
  const now = Date.now();
  const activeThresholdMs = 6000; // Active if frame received within 6 seconds

  const activeFrames: Record<string, CctvFrameTelemetry> = {};
  const activeCameraIds: string[] = [];

  for (const [camId, data] of Object.entries(latestCctvFrames)) {
    const age = now - data.receivedAtMs;
    if (age <= activeThresholdMs) {
      activeFrames[camId] = data.frame;
      activeCameraIds.push(camId);
    } else if (age <= 120000) {
      // Retain recent frame for inspection with standby flag
      activeFrames[camId] = {
        ...data.frame,
      };
    }
  }

  const isCvBridgeActive = activeCameraIds.length > 0;

  return NextResponse.json({
    status: isCvBridgeActive ? "ONLINE" : "STANDBY",
    provider: "JUNCTION-CV-Ingestion-Gateway",
    totalIngestedCount,
    lastIngestedAt,
    serverTimeMs: now,
    isCvBridgeActive,
    activeCameraIds,
    latestCctvFrames: activeFrames,
    latestObservations: latestCvObservations.slice(0, 20),
    activeCount: latestCvObservations.find((o) => o.metricType === "CROWD_COUNT")?.value ?? 0,
  });
}
