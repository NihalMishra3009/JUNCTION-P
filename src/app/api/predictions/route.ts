// ============================================================
// JUNCTION - Derived Pressure Predictions API Endpoint
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { OPERATIONAL_ZONES, fuseZoneState } from "@/services/zoneRegistry";
import { getResources } from "@/services/mockDataService";
import { MOCK_HOTELS_BASE } from "@/data/mockHotels";
import { ScenarioId } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scenario = (searchParams.get("scenario") as ScenarioId) || "NORMAL";

    const resources = getResources(scenario);
    const predictions = OPERATIONAL_ZONES.map((zoneDef) => {
      const state = fuseZoneState(zoneDef, resources, MOCK_HOTELS_BASE, scenario);
      return {
        zoneId: state.id,
        zoneName: state.name,
        currentPressure: state.pressure,
        pressureLevel: state.pressureLevel,
        forecastHorizons: {
          plus15min: state.predictedPressure15,
          plus30min: state.predictedPressure30,
          plus60min: state.predictedPressure60,
        },
        confidence: state.confidence,
        dataProvenance: state.source,
        timestamp: state.lastUpdated,
      };
    });

    return NextResponse.json({
      success: true,
      scenario,
      timestamp: new Date().toISOString(),
      predictions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate pressure predictions" },
      { status: 500 }
    );
  }
}
