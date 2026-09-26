// ============================================================
// JUNCTION - Operational Interventions & Recommendations API Endpoint
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { recommendationLifecycleEngine } from "@/services/recommendationLifecycleEngine";
import { persistenceService } from "@/services/persistenceService";
import { OPERATIONAL_ZONES, fuseZoneState } from "@/services/zoneRegistry";
import { getResources } from "@/services/mockDataService";
import { MOCK_HOTELS_BASE } from "@/data/mockHotels";
import { ScenarioId } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scenario = (searchParams.get("scenario") as ScenarioId) || "NORMAL";

    const resources = getResources(scenario);
    const fusedZones = OPERATIONAL_ZONES.map((z) => fuseZoneState(z, resources, MOCK_HOTELS_BASE, scenario));

    // Generate or fetch lifecycle interventions
    const activeInterventions = recommendationLifecycleEngine.generateInterventions(fusedZones);
    const persistedInterventions = persistenceService.getInterventions();

    const combined = [...persistedInterventions, ...activeInterventions];
    const uniqueMap = new Map();
    combined.forEach((item) => uniqueMap.set(item.id, item));

    return NextResponse.json({
      success: true,
      scenario,
      timestamp: new Date().toISOString(),
      interventionCount: uniqueMap.size,
      interventions: Array.from(uniqueMap.values()),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve recommendations" },
      { status: 500 }
    );
  }
}
