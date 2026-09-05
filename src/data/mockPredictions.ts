import { ResourcePrediction } from "@/types";
import { ScenarioId } from "@/types";
import { SCENARIOS } from "./mockScenarios";

export function getPredictions(scenario: ScenarioId): ResourcePrediction[] {
  const s = SCENARIOS[scenario];
  const resources = [
    { id: "CHURCHGATE", name: "Churchgate Station", color: "#EF4444" },
    { id: "WANKHEDE_EXIT", name: "Wankhede Exit", color: "#F97316" },
    { id: "TAXI_ZONE", name: "Taxi Zone", color: "#F5C400" },
    { id: "CSMT", name: "CSMT", color: "#3B82F6" },
    { id: "DADAR", name: "Dadar Station", color: "#22C55E" },
    { id: "ROAD_MARINE_DR", name: "Marine Drive", color: "#8B5CF6" },
  ];
  return resources.map(r => {
    const pd = s.pressure[r.id];
    if (!pd) return null;
    return {
      resourceId: r.id, resourceName: r.name, color: r.color,
      current: pd.pressure,
      points: [
        { label: "NOW", minutesFromNow: 0, pressure: pd.pressure },
        { label: "+15 MIN", minutesFromNow: 15, pressure: pd.predictedPressure15 },
        { label: "+30 MIN", minutesFromNow: 30, pressure: pd.predictedPressure30 },
        { label: "+60 MIN", minutesFromNow: 60, pressure: pd.predictedPressure60 },
      ],
      thresholdCrossing: pd.predictedPressure30 >= 95
        ? { level: "CRITICAL" as const, minutesFromNow: 30 }
        : pd.predictedPressure15 >= 85
        ? { level: "HIGH" as const, minutesFromNow: 15 }
        : undefined,
    };
  }).filter(Boolean) as ResourcePrediction[];
}
