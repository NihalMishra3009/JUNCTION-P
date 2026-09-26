// ============================================================
// JUNCTION - Canonical Zone State API Endpoint
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { OPERATIONAL_ZONES, fuseZoneState } from "@/services/zoneRegistry";
import { getResources } from "@/services/mockDataService";
import { MOCK_HOTELS_BASE } from "@/data/mockHotels";
import { ScenarioId, ZoneState } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scenario = (searchParams.get("scenario") as ScenarioId) || "NORMAL";

    const resources = getResources(scenario);
    const fusedZones: ZoneState[] = OPERATIONAL_ZONES.map((zoneDef) => {
      return fuseZoneState(zoneDef, resources, MOCK_HOTELS_BASE, scenario);
    });

    return NextResponse.json({
      success: true,
      scenario,
      timestamp: new Date().toISOString(),
      zoneCount: fusedZones.length,
      zones: fusedZones,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve canonical zone states" },
      { status: 500 }
    );
  }
}
