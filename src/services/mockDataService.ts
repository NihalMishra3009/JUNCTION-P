import { ScenarioId, Resource, PressureLevel, Trend } from "@/types";
import { SCENARIOS } from "@/data/mockScenarios";
import { STATIC_RESOURCES, getPressureLevel } from "@/data/mockResources";
import { MOCK_HOTELS_BASE } from "@/data/mockHotels";
import { MOCK_RESTAURANTS_BASE } from "@/data/mockRestaurants";
import { MOCK_ALERTS_BY_SCENARIO } from "@/data/mockAlerts";
import { MOCK_RECOMMENDATIONS } from "@/data/mockRecommendations";
import { getPredictions } from "@/data/mockPredictions";

export function getResources(scenario: ScenarioId): Resource[] {
  const s = SCENARIOS[scenario];
  return STATIC_RESOURCES.map(r => {
    const pd = s.pressure[r.id] || { pressure: 50, predictedPressure15: 55, predictedPressure30: 60, predictedPressure60: 65 };
    const pressure = pd.pressure;
    const pressureLevel = getPressureLevel(pressure);
    const predicted30 = pd.predictedPressure30;
    const trend: Trend = predicted30 > pressure + 5 ? "INCREASING" : predicted30 < pressure - 5 ? "DECREASING" : "STABLE";
    return {
      ...r,
      pressure, pressureLevel, trend,
      currentUtilization: Math.round(r.totalCapacity * pressure / 100),
      availableCapacity: Math.round(r.totalCapacity * (100 - pressure) / 100),
      predictedDemand: Math.round(r.totalCapacity * pd.predictedPressure30 / 100),
    };
  });
}

export function getResource(scenario: ScenarioId, id: string): Resource | undefined {
  return getResources(scenario).find(r => r.id === id);
}

export function getHotels(scenario: ScenarioId) {
  const multiplier = SCENARIOS[scenario].hotelPressureMultiplier;
  return MOCK_HOTELS_BASE.map(h => ({
    ...h,
    pressure: Math.min(99, Math.round(h.pressure * multiplier)),
    pressureLevel: getPressureLevel(Math.min(99, h.pressure * multiplier)) as PressureLevel,
    availableRooms: multiplier > 1.3 ? Math.max(1, Math.round(h.availableRooms * (1 / multiplier))) : h.availableRooms,
    usableRooms: multiplier > 1.3 ? Math.max(0, Math.round(h.usableRooms * (1 / multiplier))) : h.usableRooms,
  }));
}

export function getRestaurants(scenario: ScenarioId) {
  const multiplier = SCENARIOS[scenario].restaurantPressureMultiplier;
  const ttMultiplier = SCENARIOS[scenario].travelTimeMultiplier;
  return MOCK_RESTAURANTS_BASE.map(r => ({
    ...r,
    pressure: Math.min(99, Math.round(r.pressure * multiplier)),
    pressureLevel: getPressureLevel(Math.min(99, r.pressure * multiplier)) as PressureLevel,
    waitTime: Math.round(r.waitTime * Math.min(ttMultiplier, 1.5)),
    predictedWaitTime: Math.round(r.predictedWaitTime * Math.min(ttMultiplier, 1.8)),
  }));
}

export function getAlerts(scenario: ScenarioId) {
  return MOCK_ALERTS_BY_SCENARIO[scenario] || MOCK_ALERTS_BY_SCENARIO["NORMAL"];
}

export function getScenarioKPIs(scenario: ScenarioId) {
  const s = SCENARIOS[scenario];
  const resources = getResources(scenario);
  const pressures = resources.map(r => r.pressure);
  const avgPressure = Math.round(pressures.reduce((a, b) => a + b, 0) / pressures.length);
  const maxPressureResource = resources.reduce((a, b) => a.pressure > b.pressure ? a : b);
  const totalCapacity = resources.reduce((a, r) => a + r.availableCapacity, 0);
  const alerts = getAlerts(scenario);
  const highAlerts = alerts.filter(a => a.severity === "HIGH" || a.severity === "CRITICAL").length;
  const watchAlerts = alerts.filter(a => a.severity === "WATCH").length;

  const basePressure = SCENARIOS["NORMAL"].pressure;
  const normalAvg = Object.values(basePressure).reduce((a: number, b: any) => a + b.pressure, 0) / Object.values(basePressure).length;
  const trend = avgPressure - Math.round(normalAvg);

  return {
    destinationPressure: avgPressure,
    destinationPressureTrend: trend,
    predictedBottleneck: maxPressureResource.shortName,
    predictedBottleneckPressure: s.pressure[maxPressureResource.id]?.predictedPressure30 || maxPressureResource.pressure,
    predictedBottleneckMinutes: 25,
    availableCapacity: totalCapacity,
    activeAlerts: alerts.length,
    highAlerts, watchAlerts,
  };
}

export { getPredictions, MOCK_RECOMMENDATIONS };
