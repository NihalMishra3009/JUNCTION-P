import { ResourcePrediction, ScenarioId } from "@/types";
import { forecastingService } from "@/services/forecastingService";
import { SCENARIOS } from "./mockScenarios";

export function getPredictions(scenario: ScenarioId): ResourcePrediction[] {
  const s = SCENARIOS[scenario] || SCENARIOS.NORMAL;
  const targetResources = [
    { id: "CHURCHGATE", name: "Churchgate Station", color: "#EF4444", zoneId: "ZONE_CHURCHGATE" },
    { id: "WANKHEDE_EXIT", name: "Wankhede Exit", color: "#F97316", zoneId: "ZONE_WANKHEDE" },
    { id: "TAXI_ZONE", name: "Taxi Zone", color: "#F5C400", zoneId: "ZONE_TAXI_STAGING" },
    { id: "CSMT", name: "CSMT", color: "#3B82F6", zoneId: "ZONE_CSMT" },
    { id: "DADAR", name: "Dadar Station", color: "#22C55E", zoneId: "ZONE_DADAR" },
    { id: "ROAD_MARINE_DR", name: "Marine Drive", color: "#8B5CF6", zoneId: "ZONE_MARINE_LINES" },
  ];

  return targetResources.map(r => {
    const basePressure = s.pressure[r.id]?.pressure ?? 50;
    const forecast = forecastingService.generateResourceForecast(
      r.id,
      r.name,
      r.zoneId,
      basePressure,
      scenario
    );

    return {
      resourceId: r.id,
      resourceName: r.name,
      color: r.color,
      current: basePressure,
      points: [
        { label: "NOW", minutesFromNow: 0, pressure: basePressure },
        ...forecast.forecastPoints.map(pt => ({
          label: pt.label,
          minutesFromNow: pt.minutesFromNow,
          pressure: pt.predictedPressure,
        })),
      ],
      thresholdCrossing: forecast.thresholdCrossing
        ? { level: forecast.thresholdCrossing.level, minutesFromNow: forecast.thresholdCrossing.minutesFromNow }
        : undefined,
    };
  });
}
