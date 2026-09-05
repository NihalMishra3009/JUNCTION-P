import { AttendeeRoute, ScenarioId } from "@/types";

export function getAttendeeRoutes(scenario: ScenarioId, redistApproved: boolean): AttendeeRoute[] {
  const isDisrupted = scenario === "TRANSPORT_DISRUPTION";
  const isSurge = scenario === "POST_EVENT_SURGE";
  const isRain = scenario === "HEAVY_RAIN";

  return [
    {
      id: "FASTEST", type: "FASTEST", label: "Fastest",
      totalTime: isDisrupted ? 38 : isSurge ? 42 : 24,
      crowdLevel: "HIGH", congestionLevel: isDisrupted ? "HIGH" : "HIGH",
      transfers: 1, walkingTime: 5, reliability: isDisrupted ? "LOW" : "HIGH",
      recommended: false,
      steps: [
        { from: "Harbour Line Area", to: "CSMT", mode: "RAIL", duration: 14 },
        { from: "CSMT", to: "Wankhede Stadium", mode: "WALK", duration: 10 },
      ],
      explanation: isDisrupted
        ? "Western Railway is disrupted. CSMT via Central line remains available but will be congested."
        : "Direct via CSMT but Churchgate and surrounding roads are heavily congested around match time.",
      score: 62,
    },
    {
      id: "BALANCED", type: "BALANCED", label: "Balanced",
      totalTime: isRain ? 38 : 31,
      crowdLevel: redistApproved ? "LOW" : "MEDIUM",
      congestionLevel: "LOW", transfers: 1,
      walkingTime: isRain ? 4 : 8, reliability: "HIGH",
      recommended: true,
      steps: [
        { from: "Harbour Line Area", to: "Dadar", mode: "RAIL", duration: 18 },
        { from: "Dadar", to: "Wankhede Stadium", mode: "BUS", duration: isRain ? 16 : 13 },
      ],
      explanation: redistApproved
        ? "Recommended by the event organizer. Churchgate currently has lower crowd pressure, but it creates a significant detour from your location at Harbour Line. Dadar provides the best overall balance — only 7 minutes longer than the fastest route, with noticeably lower crowd pressure."
        : "Churchgate currently has lower crowd pressure, but it creates a significant detour from your location at Harbour Line. Dadar provides the best overall balance — only 7 minutes longer than the fastest route, with noticeably lower crowd pressure.",
      score: redistApproved ? 91 : 87,
    },
    {
      id: "LOW_CROWD", type: "LOW_CROWD", label: "Low Crowd",
      totalTime: isDisrupted ? 62 : 48,
      crowdLevel: "LOW", congestionLevel: "LOW",
      transfers: 2, walkingTime: 12, reliability: "MEDIUM",
      recommended: false,
      steps: [
        { from: "Harbour Line Area", to: "Churchgate", mode: "RAIL", duration: 28 },
        { from: "Churchgate", to: "Marine Lines", mode: "WALK", duration: 8 },
        { from: "Marine Lines", to: "Wankhede Stadium", mode: "WALK", duration: 12 },
      ],
      explanation: "Lower crowd pressure via Churchgate but creates a significant detour from your current location — 24 minutes longer than the Balanced option. The time cost outweighs the crowd benefit for your origin.",
      score: 51,
    },
  ];
}
