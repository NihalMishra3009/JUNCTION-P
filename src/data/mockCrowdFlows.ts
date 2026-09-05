import { CrowdFlow, ScenarioId } from "@/types";
import { STATIC_RESOURCES } from "./mockResources";

const COORDS = STATIC_RESOURCES.reduce((acc, r) => {
  acc[r.id] = r.location;
  return acc;
}, {} as Record<string, { latitude: number; longitude: number }>);

export function getCrowdFlows(scenario: ScenarioId, redistributionApplied = false): CrowdFlow[] {
  const isPostSurge = scenario === "POST_EVENT_SURGE";
  const isRain = scenario === "HEAVY_RAIN";
  const isDisruption = scenario === "TRANSPORT_DISRUPTION";

  if (isPostSurge) {
    // OUTBOUND EGRESS FLOWS (Stadium dispersal outward)
    let churchgateVol = 14200;
    let dadarVol = 1800;
    if (redistributionApplied) {
      churchgateVol = 13000;
      dadarVol = 3000;
    }

    const flows: CrowdFlow[] = [
      {
        id: "FLOW_EXIT_CHURCHGATE",
        fromId: "WANKHEDE_EXIT",
        toId: "CHURCHGATE",
        fromCoord: COORDS.WANKHEDE_EXIT,
        toCoord: COORDS.CHURCHGATE,
        direction: "OUTBOUND",
        volume: churchgateVol,
        pressure: redistributionApplied ? 76 : 97,
        corridorName: "Exit Gates → Churchgate Concourse",
      },
      {
        id: "FLOW_EXIT_TAXI",
        fromId: "WANKHEDE_EXIT",
        toId: "TAXI_ZONE",
        fromCoord: COORDS.WANKHEDE_EXIT,
        toCoord: COORDS.TAXI_ZONE,
        direction: "OUTBOUND",
        volume: 6800,
        pressure: 97,
        corridorName: "Exit Gates → South Taxi Kerbside",
      },
      {
        id: "FLOW_EXIT_MARINE_LINES",
        fromId: "WANKHEDE_EXIT",
        toId: "MARINE_LINES",
        fromCoord: COORDS.WANKHEDE_EXIT,
        toCoord: COORDS.MARINE_LINES,
        direction: "OUTBOUND",
        volume: 5200,
        pressure: 77,
        corridorName: "Exit Gates → Marine Lines Platform",
      },
      {
        id: "FLOW_EXIT_CSMT",
        fromId: "WANKHEDE_EXIT",
        toId: "CSMT",
        fromCoord: COORDS.WANKHEDE_EXIT,
        toCoord: COORDS.CSMT,
        direction: "OUTBOUND",
        volume: 4600,
        pressure: 88,
        corridorName: "Exit Gates → Fort / CSMT Terminal",
      },
    ];

    if (redistributionApplied) {
      flows.push({
        id: "FLOW_EXIT_DADAR_SHUTTLE",
        fromId: "WANKHEDE_EXIT",
        toId: "DADAR",
        fromCoord: COORDS.WANKHEDE_EXIT,
        toCoord: COORDS.DADAR,
        direction: "OUTBOUND",
        volume: dadarVol,
        pressure: 69,
        corridorName: "Exit Gates → Dadar Express Shuttle",
      });
    }

    return flows;
  }

  // INBOUND INFLOWS (Pre-Event / Normal / Weather / Disruption)
  let cgPressure = 84;
  let csmtPressure = 63;
  let taxiPressure = 67;

  if (isDisruption) {
    cgPressure = 97;
    csmtPressure = 91;
    taxiPressure = 94;
  } else if (isRain) {
    cgPressure = 88;
    taxiPressure = 97;
  }

  return [
    {
      id: "FLOW_IN_CHURCHGATE",
      fromId: "CHURCHGATE",
      toId: "WANKHEDE",
      fromCoord: COORDS.CHURCHGATE,
      toCoord: COORDS.WANKHEDE,
      direction: "INBOUND",
      volume: isDisruption ? 4800 : 9600,
      pressure: cgPressure,
      corridorName: "Churchgate Inflow → Stadium Gates",
    },
    {
      id: "FLOW_IN_CSMT",
      fromId: "CSMT",
      toId: "WANKHEDE",
      fromCoord: COORDS.CSMT,
      toCoord: COORDS.WANKHEDE,
      direction: "INBOUND",
      volume: 7800,
      pressure: csmtPressure,
      corridorName: "CSMT Terminal → Stadium Gates",
    },
    {
      id: "FLOW_IN_DADAR",
      fromId: "DADAR",
      toId: "WANKHEDE",
      fromCoord: COORDS.DADAR,
      toCoord: COORDS.WANKHEDE,
      direction: "INBOUND",
      volume: 5400,
      pressure: 62,
      corridorName: "Dadar Transit Artery → Stadium Gates",
    },
    {
      id: "FLOW_IN_MARINE_LINES",
      fromId: "MARINE_LINES",
      toId: "WANKHEDE",
      fromCoord: COORDS.MARINE_LINES,
      toCoord: COORDS.WANKHEDE,
      direction: "INBOUND",
      volume: 4200,
      pressure: 51,
      corridorName: "Marine Lines → Stadium North Gates",
    },
    {
      id: "FLOW_IN_TAXI",
      fromId: "TAXI_ZONE",
      toId: "WANKHEDE",
      fromCoord: COORDS.TAXI_ZONE,
      toCoord: COORDS.WANKHEDE,
      direction: "INBOUND",
      volume: 3100,
      pressure: taxiPressure,
      corridorName: "Taxi Kerb → Stadium South Gates",
    },
  ];
}
