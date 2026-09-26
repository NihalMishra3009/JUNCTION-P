import { ScenarioId } from "@/types";

export interface ScenarioPressureData {
  pressure: number;
  predictedPressure15: number;
  predictedPressure30: number;
  predictedPressure60: number;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  label: string;
  description: string;
  pressure: Record<string, ScenarioPressureData>;
  transportStatus: Record<string, string>;
  weatherCondition: string;
  hotelPressureMultiplier: number;
  restaurantPressureMultiplier: number;
  travelTimeMultiplier: number;
}

function p(pressure: number, p15: number, p30: number, p60: number): ScenarioPressureData {
  return { pressure, predictedPressure15: p15, predictedPressure30: p30, predictedPressure60: p60 };
}

export const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  NORMAL: {
    id: "NORMAL", label: "Normal", description: "Baseline event conditions — steady inflow, manageable pressure.",
    pressure: {
      WANKHEDE: p(71,78,85,91), CHURCHGATE: p(72,84,94,97),
      CSMT: p(58,63,71,76), DADAR: p(58,62,66,69),
      MARINE_LINES: p(44,51,59,67), TAXI_ZONE: p(45,67,91,95),
      WANKHEDE_EXIT: p(61,78,88,90),
      WANKHEDE_EXIT_GATE_1: p(54,62,71,78),
      WANKHEDE_EXIT_GATE_2: p(68,81,91,93),
      ROAD_MARINE_DR: p(54,69,79,83),
      ROAD_CHURCHGATE: p(48,62,74,78),
    },
    transportStatus: { CHURCHGATE: "OPERATIONAL", CSMT: "OPERATIONAL", DADAR: "OPERATIONAL" },
    weatherCondition: "NORMAL", hotelPressureMultiplier: 1.0,
    restaurantPressureMultiplier: 1.0, travelTimeMultiplier: 1.0,
  },
  POST_EVENT_SURGE: {
    id: "POST_EVENT_SURGE", label: "Post-Event Surge", description: "Match ended — 33,000 attendees exiting simultaneously.",
    pressure: {
      WANKHEDE: p(95,98,91,74), CHURCHGATE: p(94,97,89,78),
      CSMT: p(83,88,82,71), DADAR: p(71,79,76,65),
      MARINE_LINES: p(68,77,71,58), TAXI_ZONE: p(91,97,88,72),
      WANKHEDE_EXIT: p(88,93,85,69),
      WANKHEDE_EXIT_GATE_1: p(82,88,81,65),
      WANKHEDE_EXIT_GATE_2: p(94,98,89,72),
      ROAD_MARINE_DR: p(82,87,79,64),
      ROAD_CHURCHGATE: p(76,83,74,58),
    },
    transportStatus: { CHURCHGATE: "REDUCED", CSMT: "OPERATIONAL", DADAR: "OPERATIONAL" },
    weatherCondition: "NORMAL", hotelPressureMultiplier: 1.2,
    restaurantPressureMultiplier: 1.4, travelTimeMultiplier: 1.5,
  },
  TRANSPORT_DISRUPTION: {
    id: "TRANSPORT_DISRUPTION", label: "Transport Disruption", description: "Western Railway signal fault — services delayed 20 min.",
    pressure: {
      WANKHEDE: p(71,79,88,93), CHURCHGATE: p(89,94,97,98),
      CSMT: p(83,87,91,89), DADAR: p(71,77,83,79),
      MARINE_LINES: p(61,68,75,71), TAXI_ZONE: p(68,82,94,97),
      WANKHEDE_EXIT: p(72,83,91,94),
      WANKHEDE_EXIT_GATE_1: p(65,76,85,88),
      WANKHEDE_EXIT_GATE_2: p(81,91,97,98),
      ROAD_MARINE_DR: p(74,83,89,91),
      ROAD_CHURCHGATE: p(68,77,86,90),
    },
    transportStatus: { CHURCHGATE: "DISRUPTED", CSMT: "REDUCED", DADAR: "OPERATIONAL" },
    weatherCondition: "NORMAL", hotelPressureMultiplier: 1.0,
    restaurantPressureMultiplier: 1.1, travelTimeMultiplier: 1.8,
  },
  HEAVY_RAIN: {
    id: "HEAVY_RAIN", label: "Heavy Rain", description: "Heavy monsoon rain — reduced walking, higher taxi demand.",
    pressure: {
      WANKHEDE: p(68,75,82,88), CHURCHGATE: p(82,88,93,96),
      CSMT: p(74,79,84,87), DADAR: p(62,68,74,79),
      MARINE_LINES: p(53,61,68,73), TAXI_ZONE: p(87,94,97,96),
      WANKHEDE_EXIT: p(75,83,89,92),
      WANKHEDE_EXIT_GATE_1: p(68,76,82,86),
      WANKHEDE_EXIT_GATE_2: p(84,91,95,96),
      ROAD_MARINE_DR: p(71,79,86,88),
      ROAD_CHURCHGATE: p(65,73,80,84),
    },
    transportStatus: { CHURCHGATE: "REDUCED", CSMT: "OPERATIONAL", DADAR: "OPERATIONAL" },
    weatherCondition: "HEAVY_RAIN", hotelPressureMultiplier: 1.3,
    restaurantPressureMultiplier: 1.5, travelTimeMultiplier: 2.0,
  },
  ACCOMMODATION_SATURATION: {
    id: "ACCOMMODATION_SATURATION", label: "Accommodation Saturation", description: "Hotel zones A & B fully booked — redirect to Zone C.",
    pressure: {
      WANKHEDE: p(71,78,85,91), CHURCHGATE: p(78,86,91,94),
      CSMT: p(61,67,74,79), DADAR: p(58,62,66,69),
      MARINE_LINES: p(44,51,59,67), TAXI_ZONE: p(48,69,88,93),
      WANKHEDE_EXIT: p(61,78,88,90),
      WANKHEDE_EXIT_GATE_1: p(54,62,71,78),
      WANKHEDE_EXIT_GATE_2: p(68,81,91,93),
      ROAD_MARINE_DR: p(54,69,79,83),
      ROAD_CHURCHGATE: p(48,62,74,78),
    },
    transportStatus: { CHURCHGATE: "OPERATIONAL", CSMT: "OPERATIONAL", DADAR: "OPERATIONAL" },
    weatherCondition: "NORMAL", hotelPressureMultiplier: 1.8,
    restaurantPressureMultiplier: 1.0, travelTimeMultiplier: 1.0,
  },
  EVENT_DELAY: {
    id: "EVENT_DELAY", label: "Event Delay (+30 min)", description: "Match delayed 30 minutes — arrival demand shifts later.",
    pressure: {
      WANKHEDE: p(45,57,69,82), CHURCHGATE: p(55,67,79,91),
      CSMT: p(42,54,64,73), DADAR: p(48,55,61,67),
      MARINE_LINES: p(35,44,52,62), TAXI_ZONE: p(38,52,71,88),
      WANKHEDE_EXIT: p(42,59,74,85),
      WANKHEDE_EXIT_GATE_1: p(38,51,66,77),
      WANKHEDE_EXIT_GATE_2: p(48,65,80,90),
      ROAD_MARINE_DR: p(41,55,67,78),
      ROAD_CHURCHGATE: p(37,49,62,75),
    },
    transportStatus: { CHURCHGATE: "OPERATIONAL", CSMT: "OPERATIONAL", DADAR: "OPERATIONAL" },
    weatherCondition: "NORMAL", hotelPressureMultiplier: 0.9,
    restaurantPressureMultiplier: 0.8, travelTimeMultiplier: 0.9,
  },
};
