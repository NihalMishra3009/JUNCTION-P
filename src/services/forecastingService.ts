// ============================================================
// JUNCTION - Short-Horizon Forecasting & Trend Engine (Step 13)
// ============================================================

import {
  ResourceForecast,
  ForecastPoint,
  PressureLevel,
  ScenarioId,
} from "@/types";
import { getPressureLevel } from "@/data/mockResources";

export class ForecastingService {
  /**
   * Generates transparent, explainable 15, 30, 45, and 60-minute forecasts
   * for an operational resource based on current pressure, trend slope, and scenario surge curves.
   */
  public generateResourceForecast(
    resourceId: string,
    resourceName: string,
    zoneId: string,
    currentPressure: number,
    scenarioId: ScenarioId = "POST_EVENT_SURGE",
    baseConfidence: number = 0.9
  ): ResourceForecast {
    const horizons: Array<15 | 30 | 45 | 60> = [15, 30, 45, 60];
    const now = Date.now();
    const points: ForecastPoint[] = [];

    // Scenario surge velocity coefficients (percentage change per minute)
    let surgeFactor = 0.0;
    const contributingFactors: string[] = [];

    if (scenarioId === "POST_EVENT_SURGE") {
      surgeFactor = 0.35; // Accelerating crowd leaving bowl
      contributingFactors.push("Post-event stadium egress curve (+35% pressure gradient)");
    } else if (scenarioId === "TRANSPORT_DISRUPTION") {
      surgeFactor = 0.45; // Severe backlog
      contributingFactors.push("Transit platform throttling backlog accumulation");
    } else if (scenarioId === "HEAVY_RAIN") {
      surgeFactor = 0.25;
      contributingFactors.push("Weather-induced pedestrian sheltering and surface road delays");
    } else {
      surgeFactor = -0.05; // Normal dissipation
      contributingFactors.push("Nominal background dispersal rate");
    }

    let thresholdCrossing: { level: PressureLevel; minutesFromNow: number; projectedTime: string } | undefined = undefined;

    for (const mins of horizons) {
      const projectedMillis = now + mins * 60_000;
      const projectedIso = new Date(projectedMillis).toISOString();

      // Transparent forecast equation: Current + (Surge Rate * Minutes)
      const projectedPressure = Math.min(100, Math.max(0, Math.round(currentPressure + (surgeFactor * mins))));
      
      // Expanding uncertainty bounds over time (+/- 3% per 15 min horizon)
      const uncertainty = (mins / 15) * 3.5;
      const confidenceLow = Math.max(0, Math.round(projectedPressure - uncertainty));
      const confidenceHigh = Math.min(100, Math.round(projectedPressure + uncertainty));

      const lvl = getPressureLevel(projectedPressure);
      if (!thresholdCrossing && (lvl === "HIGH" || lvl === "CRITICAL") && currentPressure < 85) {
        thresholdCrossing = {
          level: lvl,
          minutesFromNow: mins,
          projectedTime: projectedIso,
        };
      }

      points.push({
        label: `+${mins}m`,
        minutesFromNow: mins,
        projectedTime: projectedIso,
        predictedPressure: projectedPressure,
        confidenceLow,
        confidenceHigh,
      });
    }

    return {
      resourceId,
      resourceName,
      zoneId,
      currentPressure,
      forecastPoints: points,
      thresholdCrossing,
      contributingFactors,
      algorithmUsed: "SCENARIO_CURVE",
      confidenceScore: Math.max(0.6, baseConfidence - 0.1),
    };
  }
}

export const forecastingService = new ForecastingService();
