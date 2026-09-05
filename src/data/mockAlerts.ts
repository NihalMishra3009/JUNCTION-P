import { Alert } from "@/types";

export const MOCK_ALERTS_BY_SCENARIO: Record<string, Alert[]> = {
  NORMAL: [
    {
      id: "A1", severity: "HIGH", category: "CROWD",
      title: "Churchgate pressure rising",
      message: "Churchgate Station is predicted to reach 94% capacity in approximately 25 minutes.",
      resourceId: "CHURCHGATE", actionLabel: "View Alternatives", actionRoute: "/attendee/plan",
      timestamp: "19:08",
    },
    {
      id: "A2", severity: "HIGH", category: "CROWD",
      title: "Taxi zone filling fast",
      message: "Wankhede taxi zone predicted to reach 91% in 30 minutes. Pre-book or use alternate exit.",
      resourceId: "TAXI_ZONE", actionLabel: "Route Options", actionRoute: "/attendee/plan",
      timestamp: "19:11",
    },
    {
      id: "A3", severity: "WATCH", category: "TRANSPORT",
      title: "Marine Lines approaching capacity",
      message: "Marine Lines platform becoming congested. Consider Churchgate or CSMT alternatives.",
      resourceId: "MARINE_LINES", actionLabel: "See Routes", actionRoute: "/attendee/plan",
      timestamp: "19:14",
    },
  ],
  POST_EVENT_SURGE: [
    {
      id: "A4", severity: "CRITICAL", category: "CROWD",
      title: "Critical congestion — Churchgate Station",
      message: "Churchgate at 94% capacity. Wankhede exit gates backing up. Immediate redistribution advised.",
      resourceId: "CHURCHGATE", actionLabel: "Emergency Routes", actionRoute: "/attendee/plan",
      timestamp: "22:32",
    },
    {
      id: "A5", severity: "CRITICAL", category: "CROWD",
      title: "Taxi zone at capacity",
      message: "All pickup positions occupied. Average wait 45 minutes. Use rail or walk to Marine Lines.",
      resourceId: "TAXI_ZONE", actionLabel: "Rail Options", actionRoute: "/attendee/plan",
      timestamp: "22:35",
    },
    {
      id: "A6", severity: "HIGH", category: "TRANSPORT",
      title: "Western Railway reduced service",
      message: "Churchgate terminus operating at reduced capacity. Longer dwell times expected.",
      resourceId: "CHURCHGATE", actionLabel: "CSMT Alternative", actionRoute: "/attendee/plan",
      timestamp: "22:30",
    },
  ],
  TRANSPORT_DISRUPTION: [
    {
      id: "A7", severity: "CRITICAL", category: "TRANSPORT",
      title: "Western Railway signal fault",
      message: "Churchgate line disrupted. Services suspended for 20-30 minutes. Use CSMT or taxis.",
      resourceId: "CHURCHGATE", actionLabel: "Alternate Routes", actionRoute: "/attendee/plan",
      timestamp: "19:22",
    },
    {
      id: "A8", severity: "HIGH", category: "CROWD",
      title: "Churchgate severely congested",
      message: "Station at 89% and rising. Disruption compounding crowd pressure.",
      resourceId: "CHURCHGATE", actionLabel: "View Options", actionRoute: "/attendee/plan",
      timestamp: "19:25",
    },
  ],
  HEAVY_RAIN: [
    {
      id: "A9", severity: "HIGH", category: "WEATHER",
      title: "Heavy rain — taxi demand spiking",
      message: "Monsoon conditions. Taxi zone at 87% and predicted to reach 97%. Book early or use rail.",
      resourceId: "TAXI_ZONE", actionLabel: "Rail Options", actionRoute: "/attendee/plan",
      timestamp: "19:05",
    },
    {
      id: "A10", severity: "WATCH", category: "WEATHER",
      title: "Reduced walking advisable",
      message: "Heavy rain reduces walking viability. Routes with minimum outdoor exposure recommended.",
      actionLabel: "Plan Journey", actionRoute: "/attendee/plan",
      timestamp: "19:07",
    },
  ],
  ACCOMMODATION_SATURATION: [
    {
      id: "A11", severity: "HIGH", category: "ACCOMMODATION",
      title: "Zone A & B hotels near full",
      message: "South Mumbai hotels at 88-91% occupancy. Zone C (Dadar) has 79 usable rooms available.",
      actionLabel: "Find Stay", actionRoute: "/attendee/stay",
      timestamp: "18:45",
    },
  ],
  EVENT_DELAY: [
    {
      id: "A12", severity: "WATCH", category: "EVENT",
      title: "Match delayed — 30 minutes",
      message: "Wankhede Stadium start time moved to 20:00. Recommended arrival time updated.",
      actionLabel: "Update Plan", actionRoute: "/attendee/plan",
      timestamp: "19:00",
    },
  ],
};
