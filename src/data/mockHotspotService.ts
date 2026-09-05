import { PredictedHotspot, Resource, ScenarioId } from "@/types";

export function getPredictedHotspots(resources: Resource[], scenario: ScenarioId): PredictedHotspot[] {
  const hotspots: PredictedHotspot[] = [];

  resources.forEach(r => {
    // Condition 1: High/Critical instantaneous or predicted pressure
    const isHighOrCritical = r.pressure >= 85 || (r.predictedDemand && r.totalCapacity && (r.predictedDemand / r.totalCapacity) >= 0.85);

    if (isHighOrCritical) {
      const severity = r.pressure >= 95 ? "CRITICAL" : r.pressure >= 85 ? "HIGH" : "WATCH";
      const radiusMeters = severity === "CRITICAL" ? 220 : 160;

      let projectedTimeframe = "in ~20–30 min";
      if (scenario === "POST_EVENT_SURGE") {
        projectedTimeframe = r.id === "CHURCHGATE" || r.id === "TAXI_ZONE" ? "in ~15 min" : "in ~25 min";
      } else if (scenario === "TRANSPORT_DISRUPTION") {
        projectedTimeframe = r.id === "CHURCHGATE" ? "ACTIVE / SUSPENDED" : "in ~10 min";
      } else if (scenario === "HEAVY_RAIN") {
        projectedTimeframe = r.id === "TAXI_ZONE" ? "in ~10 min" : "in ~20 min";
      }

      hotspots.push({
        id: `HOTSPOT_${r.id}`,
        resourceId: r.id,
        name: r.name,
        location: r.location,
        currentPressure: r.pressure,
        predictedPressure: r.predictedDemand && r.totalCapacity ? Math.round((r.predictedDemand / r.totalCapacity) * 100) : r.pressure + 5,
        severity,
        projectedTimeframe,
        radiusMeters,
      });
    }
  });

  return hotspots;
}
