import { ScenarioId, Resource, PressureLevel, Trend, Hotel } from "@/types";
import { SCENARIOS } from "@/data/mockScenarios";
import { STATIC_RESOURCES, getPressureLevel } from "@/data/mockResources";
import { MOCK_HOTELS_BASE } from "@/data/mockHotels";
import { MOCK_RESTAURANTS_BASE } from "@/data/mockRestaurants";
import { MOCK_ALERTS_BY_SCENARIO } from "@/data/mockAlerts";
import { MOCK_RECOMMENDATIONS } from "@/data/mockRecommendations";
import { getPredictions } from "@/data/mockPredictions";

export function calculateUsableRooms(
  hotel: {
    availableRooms: number;
    travelTimeToVenue: number;
    transportConnectivity: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR';
    eventDemand: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  },
  travelTimeMultiplier = 1.0
): number {
  if (hotel.availableRooms <= 0) return 0;
  const connectivityFactor: Record<string, number> = {
    EXCELLENT: 0.92,
    GOOD: 0.82,
    MODERATE: 0.68,
    POOR: 0.50,
  };
  const conn = connectivityFactor[hotel.transportConnectivity] ?? 0.80;
  const effectiveTravel = hotel.travelTimeToVenue * travelTimeMultiplier;
  const travelFactor = effectiveTravel > 25 ? 0.85 : effectiveTravel > 15 ? 0.92 : 1.0;
  const demandBuffer: Record<string, number> = {
    LOW: 0.98,
    MODERATE: 0.94,
    HIGH: 0.88,
    VERY_HIGH: 0.82,
  };
  const demand = demandBuffer[hotel.eventDemand] ?? 0.90;
  const usable = Math.max(0, Math.round(hotel.availableRooms * conn * travelFactor * demand));
  return Math.min(hotel.availableRooms, usable);
}

export function calculateHotelPressure(
  totalRooms: number,
  availableRooms: number,
  expectedCheckIns = 0,
  expectedCheckOuts = 0
): number {
  if (totalRooms <= 0) return 50;
  const netInflow = Math.max(0, expectedCheckIns - expectedCheckOuts);
  const occupied = (totalRooms - availableRooms) + netInflow * 0.4;
  const pressure = Math.round((occupied / totalRooms) * 100);
  return Math.min(99, Math.max(20, pressure));
}

export function getResources(scenario: ScenarioId, redistributionApplied = false): Resource[] {
  const s = SCENARIOS[scenario];
  return STATIC_RESOURCES.map(r => {
    const pd = s.pressure[r.id] || { pressure: 50, predictedPressure15: 55, predictedPressure30: 60, predictedPressure60: 65 };
    let pressure = pd.pressure;
    let predicted30 = pd.predictedPressure30;

    // Apply attendee redistribution effect (REC1: Churchgate -> Dadar)
    if (redistributionApplied) {
      if (r.id === "CHURCHGATE") {
        pressure = Math.max(40, pressure - 18);
        predicted30 = Math.max(45, predicted30 - 18);
      } else if (r.id === "DADAR") {
        pressure = Math.min(88, pressure + 11);
        predicted30 = Math.min(90, predicted30 + 10);
      } else if (r.id === "WANKHEDE_EXIT") {
        pressure = Math.max(40, pressure - 6);
        predicted30 = Math.max(45, predicted30 - 6);
      }
    }

    const pressureLevel = getPressureLevel(pressure);
    const trend: Trend = predicted30 > pressure + 5 ? "INCREASING" : predicted30 < pressure - 5 ? "DECREASING" : "STABLE";
    return {
      ...r,
      pressure, pressureLevel, trend,
      currentUtilization: Math.round(r.totalCapacity * pressure / 100),
      availableCapacity: Math.round(r.totalCapacity * (100 - pressure) / 100),
      predictedDemand: Math.round(r.totalCapacity * predicted30 / 100),
    };
  });
}

export function getResource(scenario: ScenarioId, id: string, redistributionApplied = false): Resource | undefined {
  return getResources(scenario, redistributionApplied).find(r => r.id === id);
}

export function getHotels(scenario: ScenarioId, hotelOverrides?: Record<string, Partial<Hotel>>): Hotel[] {
  const multiplier = SCENARIOS[scenario].hotelPressureMultiplier;
  const ttMultiplier = SCENARIOS[scenario].travelTimeMultiplier;

  return MOCK_HOTELS_BASE.map(h => {
    const override = hotelOverrides?.[h.id];
    let availableRooms = override?.availableRooms !== undefined
      ? override.availableRooms
      : (multiplier > 1.3 ? Math.max(1, Math.round(h.availableRooms * (1 / multiplier))) : h.availableRooms);

    const checkIns = override?.expectedCheckIns ?? h.expectedCheckIns;
    const checkOuts = override?.expectedCheckOuts ?? h.expectedCheckOuts;

    let usableRooms = override?.availableRooms !== undefined
      ? calculateUsableRooms({ ...h, availableRooms }, ttMultiplier)
      : (multiplier > 1.3 ? Math.max(0, Math.round(h.usableRooms * (1 / multiplier))) : h.usableRooms);

    let pressure = override?.availableRooms !== undefined
      ? calculateHotelPressure(h.totalRooms, availableRooms, checkIns, checkOuts)
      : Math.min(99, Math.round(h.pressure * multiplier));

    const source = override ? "PARTNER_REPORTED" : h.source;

    return {
      ...h,
      availableRooms,
      usableRooms,
      expectedCheckIns: checkIns,
      expectedCheckOuts: checkOuts,
      pressure,
      pressureLevel: getPressureLevel(pressure) as PressureLevel,
      source,
    };
  });
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

export function getScenarioKPIs(
  scenario: ScenarioId,
  redistributionApplied = false,
  hotels?: Hotel[]
) {
  const s = SCENARIOS[scenario];
  const resources = getResources(scenario, redistributionApplied);
  const pressures = resources.map(r => r.pressure);
  const avgPressure = Math.round(pressures.reduce((a, b) => a + b, 0) / pressures.length);
  const maxPressureResource = resources.reduce((a, b) => a.pressure > b.pressure ? a : b);
  const resourceCapacity = resources.reduce((a, r) => a + r.availableCapacity, 0);

  // Hotel capacity contribution
  const hotelList = hotels || getHotels(scenario);
  const usableHotelRooms = hotelList.reduce((sum, h) => sum + h.usableRooms, 0);
  const totalCapacity = resourceCapacity + usableHotelRooms;

  // Accommodation pressure
  const avgHotelPressure = Math.round(hotelList.reduce((sum, h) => sum + h.pressure, 0) / hotelList.length);

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
    predictedBottleneckPressure: maxPressureResource.pressure,
    predictedBottleneckMinutes: 25,
    availableCapacity: totalCapacity,
    usableHotelRooms,
    avgHotelPressure,
    activeAlerts: alerts.length,
    highAlerts, watchAlerts,
  };
}

export { getPredictions, MOCK_RECOMMENDATIONS };

