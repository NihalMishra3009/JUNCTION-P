// ============================================================
// JUNCTION - Single Zone State & Fusion Diagnostics API Endpoint
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getZoneById, fuseZoneState, getZoneCoverageProfile } from "@/services/zoneRegistry";
import { deviceRegistry } from "@/services/deviceRegistry";
import { getResources } from "@/services/mockDataService";
import { MOCK_HOTELS_BASE } from "@/data/mockHotels";
import { ScenarioId } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ zoneId: string }> }
) {
  try {
    const { zoneId } = await params;
    const { searchParams } = new URL(req.url);
    const scenario = (searchParams.get("scenario") as ScenarioId) || "NORMAL";

    const zoneDef = getZoneById(zoneId);
    if (!zoneDef) {
      return NextResponse.json(
        { success: false, error: `Zone ID '${zoneId}' not found.` },
        { status: 404 }
      );
    }

    const resources = getResources(scenario);
    const fusedState = fuseZoneState(zoneDef, resources, MOCK_HOTELS_BASE, scenario);
    const coverageProfile = getZoneCoverageProfile(zoneId);

    // Get live devices for this zone
    const zoneDevices = deviceRegistry.getByZone(zoneId);

    return NextResponse.json({
      success: true,
      zoneId,
      timestamp: new Date().toISOString(),
      state: fusedState,
      coverageProfile,
      registeredDevices: zoneDevices.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        provider: d.provider,
        health: d.health,
        reliabilityScore: d.reliabilityScore,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve zone state" },
      { status: 500 }
    );
  }
}
