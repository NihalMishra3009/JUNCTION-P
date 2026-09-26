// ============================================================
// JUNCTION - Spatial Pressure & Cascade Analysis API Endpoint
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { OPERATIONAL_ZONES, fuseZoneState } from "@/services/zoneRegistry";
import { hotspotAndCascadeEngine } from "@/services/hotspotAndCascadeEngine";
import { getResources } from "@/services/mockDataService";
import { MOCK_HOTELS_BASE } from "@/data/mockHotels";
import { ScenarioId } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scenario = (searchParams.get("scenario") as ScenarioId) || "NORMAL";

    const resources = getResources(scenario);
    const fusedZones = OPERATIONAL_ZONES.map((zoneDef) => {
      return fuseZoneState(zoneDef, resources, MOCK_HOTELS_BASE, scenario);
    });

    const hotspotPredictions = hotspotAndCascadeEngine.detectHotspots(fusedZones);

    // Analyze cascade for primary critical origin (e.g. Wankhede)
    const primaryOrigin = fusedZones.find((z) => z.id === "ZONE_WANKHEDE") || fusedZones[0];
    const cascadeResult = hotspotAndCascadeEngine.analyzeCascade(
      primaryOrigin.id,
      primaryOrigin.pressure,
      resources
    );

    return NextResponse.json({
      success: true,
      scenario,
      timestamp: new Date().toISOString(),
      hotspotCount: hotspotPredictions.length,
      hotspotPredictions,
      cascadeAnalysis: cascadeResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to run hotspot and cascade analysis" },
      { status: 500 }
    );
  }
}
