// ============================================================
// JUNCTION - Hotspot Detection & Cascade Spillover Service (Steps 14 & 15)
// ============================================================

import {
  HotspotPrediction,
  CascadeAnalysisResult,
  CascadeNodeProjection,
  ZoneState,
  Resource,
} from "@/types";
import { getPressureLevel } from "@/data/mockResources";

import { OPERATIONAL_ZONES } from "./zoneRegistry";

export class HotspotAndCascadeEngine {
  /**
   * Detects spatial hotspots across zones where pressure is critical, rising rapidly, or exceeding safety thresholds.
   */
  public detectHotspots(zones: ZoneState[]): HotspotPrediction[] {
    const hotspots: HotspotPrediction[] = [];

    for (const zone of zones) {
      if (zone.pressure >= 75 || zone.pressureLevel === "HIGH" || zone.pressureLevel === "CRITICAL") {
        const drivers: string[] = [];
        if (zone.pressure >= 85) drivers.push("Severe capacity saturation exceeding 85%");
        if (zone.trend === "INCREASING") drivers.push("Rapid inflow rate accelerating crowd accumulation");
        if (zone.availableCapacity < zone.usableCapacity * 0.15) drivers.push("Available safety capacity below 15%");

        const def = OPERATIONAL_ZONES.find(d => d.id === zone.id);
        const location = def?.center ?? { latitude: 18.9389, longitude: 72.8258 };
        const radiusMeters = def?.radiusMeters ?? 250;

        hotspots.push({
          id: `HOTSPOT_${zone.id}`,
          resourceId: zone.memberResources[0] || zone.id,
          zoneId: zone.id,
          name: zone.name,
          location,
          currentPressure: zone.pressure,
          peakPredictedPressure: zone.predictedPressure30,
          severity: zone.pressure >= 90 ? "CRITICAL" : (zone.pressure >= 80 ? "HIGH" : "WATCH"),
          projectedOnsetMinutes: 10,
          projectedDurationMinutes: 45,
          radiusMeters,
          keyDrivers: drivers,
          confidence: zone.confidence,
        });
      }
    }

    return hotspots;
  }

  /**
   * Models the forward cascade propagation:
   * Venue Exit Surge → Pedestrian Corridors → Road Network → Transit Terminals → Pickup Bays → Hospitality
   */
  public analyzeCascade(
    originZoneId: string,
    originPressure: number,
    resources: Resource[]
  ): CascadeAnalysisResult {
    const timestamp = new Date().toISOString();
    
    // Multi-stage propagation pathway
    const pathway: CascadeNodeProjection[] = [
      {
        nodeId: "CASCADE_ORIGIN",
        resourceId: "WANKHEDE_EXIT",
        label: "Wankhede Gates & Concourse Egress",
        currentPressure: originPressure,
        projectedPressure: originPressure,
        status: getPressureLevel(originPressure) === "UNKNOWN" ? "NORMAL" : getPressureLevel(originPressure) as "NORMAL" | "WATCH" | "HIGH" | "CRITICAL",
        leadTimeMinutes: 0,
        influenceWeight: 1.0,
        mitigationAvailable: true,
      },
      {
        nodeId: "CASCADE_CORRIDOR",
        resourceId: "ROAD_MARINE_DR",
        label: "Marine Drive Pedestrian Corridor",
        currentPressure: Math.round(originPressure * 0.88),
        projectedPressure: Math.min(100, Math.round(originPressure * 0.95)),
        status: getPressureLevel(Math.round(originPressure * 0.88)) === "UNKNOWN" ? "NORMAL" : getPressureLevel(Math.round(originPressure * 0.88)) as "NORMAL" | "WATCH" | "HIGH" | "CRITICAL",
        leadTimeMinutes: 12,
        influenceWeight: 0.85,
        mitigationAvailable: true,
      },
      {
        nodeId: "CASCADE_TRANSIT",
        resourceId: "CHURCHGATE",
        label: "Churchgate Western Railway Terminal",
        currentPressure: Math.round(originPressure * 0.82),
        projectedPressure: Math.min(100, Math.round(originPressure * 0.98)),
        status: getPressureLevel(Math.round(originPressure * 0.82)) === "UNKNOWN" ? "NORMAL" : getPressureLevel(Math.round(originPressure * 0.82)) as "NORMAL" | "WATCH" | "HIGH" | "CRITICAL",
        leadTimeMinutes: 20,
        influenceWeight: 0.90,
        mitigationAvailable: true,
      },
      {
        nodeId: "CASCADE_PICKUP",
        resourceId: "TAXI_ZONE",
        label: "South Taxi & Rideshare Staging Bay",
        currentPressure: Math.round(originPressure * 0.75),
        projectedPressure: Math.min(100, Math.round(originPressure * 0.92)),
        status: getPressureLevel(Math.round(originPressure * 0.75)) === "UNKNOWN" ? "NORMAL" : getPressureLevel(Math.round(originPressure * 0.75)) as "NORMAL" | "WATCH" | "HIGH" | "CRITICAL",
        leadTimeMinutes: 25,
        influenceWeight: 0.70,
        mitigationAvailable: true,
      },
      {
        nodeId: "CASCADE_HOSPITALITY",
        resourceId: "HOSPITALITY_SOUTH",
        label: "Marine Drive Dining & Hotel Corridor",
        currentPressure: Math.round(originPressure * 0.65),
        projectedPressure: Math.min(100, Math.round(originPressure * 0.85)),
        status: getPressureLevel(Math.round(originPressure * 0.65)) === "UNKNOWN" ? "NORMAL" : getPressureLevel(Math.round(originPressure * 0.65)) as "NORMAL" | "WATCH" | "HIGH" | "CRITICAL",
        leadTimeMinutes: 40,
        influenceWeight: 0.60,
        mitigationAvailable: true,
      },
    ];

    return {
      rootIncidentId: `INCIDENT_${originZoneId}_${Date.now()}`,
      rootResourceId: originZoneId,
      timestamp,
      affectedPathways: [pathway],
      summary: `Surge from ${originZoneId} is propagating outward across transit hubs and hospitality within a 40-minute window.`,
      confidence: 0.88,
    };
  }
}

export const hotspotAndCascadeEngine = new HotspotAndCascadeEngine();
