/**
 * Offline synthetic investigation dataset (demo mode).
 *
 * Full multi-state National Intelligence Grid across India:
 * - Maharashtra & Western Hub: Mumbai, Pune, Nagpur, Kandivali, BKC, Malad
 * - Delhi NCR & Northern Axis: New Delhi, Gurgaon, Chandigarh, Srinagar, Lucknow
 * - Southern Tech & Maritime Corridor: Bengaluru, Hyderabad, Chennai, Kochi
 * - Eastern & North-East Gateway: Kolkata, Howrah, Patna, Bhubaneswar, Guwahati
 * - Central & Gujarat Transit: Ahmedabad, Surat, Jaipur, Bhopal, Raipur
 */
import type { CaseLocation, CaseMarker, LocationEvent } from "@/types/map";
import { prototypeCases } from "./prototypeCase";

type LocSpec = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: CaseLocation["type"];
  importance: number;
  entityIds: string[];
};

function loc(l: LocSpec): CaseLocation {
  return {
    id: l.id,
    caseId: "",
    name: l.name,
    latitude: l.lat,
    longitude: l.lon,
    type: l.type,
    importance: l.importance,
    timestamp: "",
    entityIds: l.entityIds,
    eventIds: [],
    observationCount: 0,
    sourceCount: 0,
  };
}

type CaseEventSpec = Omit<LocationEvent, "caseId" | "locationId" | "id"> & { locationId?: string; id?: string };

function buildCase(
  spec: {
    caseId: string;
    title: string;
    priority: string;
    status: string;
    locations: CaseLocation[];
    events: CaseEventSpec[];
  },
): CaseMarker {
  const locations = spec.locations.map((l) => ({ ...l, caseId: spec.caseId }));
  const events: LocationEvent[] = spec.events.map((e, i) => ({
    ...e,
    id: `${spec.caseId}-EVT-${String(i + 1).padStart(2, "0")}`,
    caseId: spec.caseId,
    locationId: e.locationId ?? locations[0]?.id ?? "",
  })).filter((e) => e.locationId);
  const byLoc = new Map<string, number>();
  const byLocSrc = new Map<string, Set<string>>();
  events.forEach((e) => {
    byLoc.set(e.locationId, (byLoc.get(e.locationId) ?? 0) + 1);
    e.sourceIds.forEach((s) => {
      if (!byLocSrc.has(e.locationId)) byLocSrc.set(e.locationId, new Set());
      byLocSrc.get(e.locationId)!.add(s);
    });
  });
  const withMeta = locations.map((l) => ({
    ...l,
    observationCount: byLoc.get(l.id) ?? 0,
    sourceCount: byLocSrc.get(l.id)?.size ?? 0,
    eventIds: events.filter((e) => e.locationId === l.id).map((e) => e.id),
    timestamp: events.filter((e) => e.locationId === l.id)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .map((e) => e.timestamp)[0] ?? "",
  }));
  const lastActivity = events
    .map((e) => e.timestamp)
    .sort()
    .slice(-1)[0] ?? "";
  const entityIds = [...new Set(withMeta.flatMap((l) => l.entityIds))];
  const locationIds = withMeta.map((l) => l.id);
  const eventIds = events.map((e) => e.id);
  return {
    caseId: spec.caseId,
    title: spec.title,
    priority: spec.priority,
    status: spec.status,
    locationIds,
    entityIds,
    eventIds,
    locations: withMeta,
    events,
    lastActivity,
  };
}

// 1. MAHARASHTRA & WEST COAST: OPERATION ORION TRADERS
const C001 = buildCase({
  caseId: "CASE-001",
  title: "Operation Orion Traders",
  priority: "HIGH",
  status: "OPEN",
  locations: [
    loc({ id: "C001-L01", name: "Mumbai CSMT", lat: 18.9401, lon: 72.8354, type: "transit", importance: 0.95, entityIds: ["N-4821", "P-2041", "V-2048", "L-3007"] }),
    loc({ id: "C001-L02", name: "Kandivali West", lat: 19.205, lon: 72.85, type: "safehouse", importance: 0.9, entityIds: ["N-4821", "V-2048"] }),
    loc({ id: "C001-L03", name: "Pune Hinjewadi", lat: 18.5913, lon: 73.7389, type: "contact", importance: 0.75, entityIds: ["N-7712", "P-2041"] }),
    loc({ id: "C001-L04", name: "Nagpur MIHAN Hub", lat: 21.0664, lon: 79.0558, type: "warehouse", importance: 0.7, entityIds: ["N-2210", "A-4200"] }),
    loc({ id: "C001-L05", name: "BKC Financial Center", lat: 19.066, lon: 72.866, type: "transfer", importance: 0.85, entityIds: ["A-4200", "A-0182"] }),
  ],
  events: [
    { id: "C001-E01", timestamp: "2026-08-14T09:00", type: "SIGHTING", entityIds: ["N-4821"], description: "Signals logged at Mumbai CSMT.", sourceIds: ["LOC"] },
    { id: "C001-E02", timestamp: "2026-08-14T11:50", type: "SURVEILLANCE", entityIds: ["P-2041"], description: "Suspect entered Pune Hinjewadi tech center.", sourceIds: ["SURV-01"] },
    { id: "C001-E03", timestamp: "2026-08-14T14:20", type: "MOVEMENT", entityIds: ["V-2048"], description: "Vehicle V-2048 departed Kandivali towards BKC.", sourceIds: ["SURV-02"] },
    { id: "C001-E04", timestamp: "2026-08-15T08:30", type: "TRANSFER", entityIds: ["A-4200"], description: "Cross-district escrow cleared via Nagpur MIHAN Hub.", sourceIds: ["TX"] },
  ].map((e) => ({
    ...e,
    locationId: e.description.includes("CSMT") ? "C001-L01"
      : e.description.includes("Kandivali") ? "C001-L02"
      : e.description.includes("Hinjewadi") ? "C001-L03"
      : e.description.includes("Nagpur") ? "C001-L04"
      : "C001-L05",
  })),
});

// 2. NORTHERN GRID: OPERATION NORTHERN CIPHER (Delhi - Punjab - Kashmir - UP)
const C101 = buildCase({
  caseId: "CASE-101",
  title: "Operation Northern Cipher",
  priority: "HIGH",
  status: "OPEN",
  locations: [
    loc({ id: "C101-L01", name: "New Delhi Central Hub", lat: 28.6429, lon: 77.2195, type: "safehouse", importance: 0.98, entityIds: ["N-1011", "P-8801", "O-9901"] }),
    loc({ id: "C101-L02", name: "Noida Cyber Zone", lat: 28.5355, lon: 77.3910, type: "contact", importance: 0.88, entityIds: ["N-1011", "A-8801"] }),
    loc({ id: "C101-L03", name: "Chandigarh IT Park", lat: 30.7258, lon: 76.8403, type: "warehouse", importance: 0.78, entityIds: ["P-8801", "V-3301"] }),
    loc({ id: "C101-L04", name: "Srinagar Dal Link", lat: 34.0837, lon: 74.7973, type: "safehouse", importance: 0.82, entityIds: ["N-5520", "P-8801"] }),
    loc({ id: "C101-L05", name: "Lucknow Gomti Corridor", lat: 26.8467, lon: 80.9462, type: "transit", importance: 0.74, entityIds: ["N-1011", "V-3301"] }),
  ],
  events: [
    { id: "C101-E01", timestamp: "2026-08-14T08:15", type: "SIGHTING", entityIds: ["P-8801"], description: "Person P-8801 detected at New Delhi Central Hub.", sourceIds: ["LOC"] },
    { id: "C101-E02", timestamp: "2026-08-14T12:45", type: "COMMUNICATION", entityIds: ["N-1011"], description: "Encrypted data exchange via Noida Cyber Zone.", sourceIds: ["SIGINT"] },
    { id: "C101-E03", timestamp: "2026-08-15T09:20", type: "MOVEMENT", entityIds: ["V-3301"], description: "Transit movement flagged between Chandigarh and Lucknow.", sourceIds: ["TOLL"] },
    { id: "C101-E04", timestamp: "2026-08-15T15:10", type: "SURVEILLANCE", entityIds: ["N-5520"], description: "High-frequency radio burst logged near Srinagar Dal Link.", sourceIds: ["RAD"] },
  ].map((e) => ({
    ...e,
    locationId: e.description.includes("Delhi") ? "C101-L01"
      : e.description.includes("Noida") ? "C101-L02"
      : e.description.includes("Chandigarh") ? "C101-L03"
      : e.description.includes("Srinagar") ? "C101-L04"
      : "C101-L05",
  })),
});

// 3. SOUTHERN AXIS: OPERATION DECCAN TRIDENT (Karnataka - Telangana - Tamil Nadu - Kerala)
const C102 = buildCase({
  caseId: "CASE-102",
  title: "Operation Deccan Trident",
  priority: "HIGH",
  status: "OPEN",
  locations: [
    loc({ id: "C102-L01", name: "Bengaluru Tech Corridor", lat: 12.9716, lon: 77.5946, type: "safehouse", importance: 0.94, entityIds: ["P-4402", "O-3302", "N-7704"] }),
    loc({ id: "C102-L02", name: "Hyderabad HITEC City", lat: 17.4485, lon: 78.3741, type: "contact", importance: 0.9, entityIds: ["P-4402", "A-9904"] }),
    loc({ id: "C102-L03", name: "Chennai Port Terminal", lat: 13.0827, lon: 80.2907, type: "warehouse", importance: 0.86, entityIds: ["O-3302", "V-7711"] }),
    loc({ id: "C102-L04", name: "Kochi Marine Gateway", lat: 9.9678, lon: 76.2885, type: "transfer", importance: 0.8, entityIds: ["N-7704", "V-7711"] }),
  ],
  events: [
    { id: "C102-E01", timestamp: "2026-08-14T07:30", type: "SIGHTING", entityIds: ["P-4402"], description: "Primary entity active in Bengaluru Tech Corridor.", sourceIds: ["LOC"] },
    { id: "C102-E02", timestamp: "2026-08-14T14:15", type: "TRANSFER", entityIds: ["A-9904"], description: "Offshore transaction routed via Hyderabad HITEC City.", sourceIds: ["FIN"] },
    { id: "C102-E03", timestamp: "2026-08-15T11:00", type: "SURVEILLANCE", entityIds: ["O-3302"], description: "Cargo container inspection at Chennai Port Terminal.", sourceIds: ["CUSTOMS"] },
    { id: "C102-E04", timestamp: "2026-08-15T16:40", type: "MOVEMENT", entityIds: ["V-7711"], description: "Vessel transit handshake confirmed at Kochi Marine Gateway.", sourceIds: ["AIS"] },
  ].map((e) => ({
    ...e,
    locationId: e.description.includes("Bengaluru") ? "C102-L01"
      : e.description.includes("Hyderabad") ? "C102-L02"
      : e.description.includes("Chennai") ? "C102-L03"
      : "C102-L04",
  })),
});

// 4. EASTERN & NORTH-EAST: OPERATION EASTERN SENTINEL (Bengal - Bihar - Odisha - Assam)
const C103 = buildCase({
  caseId: "CASE-103",
  title: "Operation Eastern Sentinel",
  priority: "MEDIUM",
  status: "OPEN",
  locations: [
    loc({ id: "C103-L01", name: "Kolkata Salt Lake", lat: 22.5726, lon: 88.3639, type: "safehouse", importance: 0.92, entityIds: ["P-6601", "N-8812", "O-5501"] }),
    loc({ id: "C103-L02", name: "Howrah Railway Yard", lat: 22.5839, lon: 88.3426, type: "transit", importance: 0.84, entityIds: ["V-5502", "P-6601"] }),
    loc({ id: "C103-L03", name: "Patna Ganga Terminal", lat: 25.6022, lon: 85.1374, type: "contact", importance: 0.76, entityIds: ["N-8812"] }),
    loc({ id: "C103-L04", name: "Bhubaneswar Coastal Cell", lat: 20.2961, lon: 85.8245, type: "warehouse", importance: 0.72, entityIds: ["A-5501"] }),
    loc({ id: "C103-L05", name: "Guwahati Brahmaputra Outpost", lat: 26.1445, lon: 91.7362, type: "safehouse", importance: 0.8, entityIds: ["P-6601", "N-9911"] }),
  ],
  events: [
    { id: "C103-E01", timestamp: "2026-08-14T10:00", type: "SIGHTING", entityIds: ["P-6601"], description: "Entity located at Kolkata Salt Lake.", sourceIds: ["LOC"] },
    { id: "C103-E02", timestamp: "2026-08-14T15:30", type: "MOVEMENT", entityIds: ["V-5502"], description: "Freight consignment tracked at Howrah Railway Yard.", sourceIds: ["RAIL"] },
    { id: "C103-E03", timestamp: "2026-08-15T08:45", type: "COMMUNICATION", entityIds: ["N-8812"], description: "Phone relay handshake at Patna Ganga Terminal.", sourceIds: ["CDR"] },
    { id: "C103-E04", timestamp: "2026-08-15T14:20", type: "SURVEILLANCE", entityIds: ["N-9911"], description: "Secure node detection near Guwahati Brahmaputra Outpost.", sourceIds: ["SIG"] },
  ].map((e) => ({
    ...e,
    locationId: e.description.includes("Kolkata") ? "C103-L01"
      : e.description.includes("Howrah") ? "C103-L02"
      : e.description.includes("Patna") ? "C103-L03"
      : e.description.includes("Bhubaneswar") ? "C103-L04"
      : "C103-L05",
  })),
});

// 5. WESTERN & GUJARAT-RAJASTHAN: OPERATION WESTERN FALCON (Gujarat - Rajasthan - MP)
const C104 = buildCase({
  caseId: "CASE-104",
  title: "Operation Western Falcon",
  priority: "MEDIUM",
  status: "OPEN",
  locations: [
    loc({ id: "C104-L01", name: "Ahmedabad GIFT City", lat: 23.1610, lon: 72.6840, type: "transfer", importance: 0.9, entityIds: ["P-3310", "A-7700", "O-2201"] }),
    loc({ id: "C104-L02", name: "Surat Diamond Park", lat: 21.1702, lon: 72.8311, type: "warehouse", importance: 0.82, entityIds: ["P-3310", "V-8802"] }),
    loc({ id: "C104-L03", name: "Jaipur Amber Corridor", lat: 26.9124, lon: 75.7873, type: "contact", importance: 0.78, entityIds: ["N-3341", "P-3310"] }),
    loc({ id: "C104-L04", name: "Bhopal Central Hub", lat: 23.2599, lon: 77.4126, type: "transit", importance: 0.75, entityIds: ["V-8802", "N-3341"] }),
    loc({ id: "C104-L05", name: "Raipur Nexus", lat: 21.2514, lon: 81.6296, type: "safehouse", importance: 0.68, entityIds: ["A-7700"] }),
  ],
  events: [
    { id: "C104-E01", timestamp: "2026-08-14T08:50", type: "TRANSFER", entityIds: ["A-7700"], description: "High-value clearing transaction at Ahmedabad GIFT City.", sourceIds: ["TX"] },
    { id: "C104-E02", timestamp: "2026-08-14T13:20", type: "SIGHTING", entityIds: ["P-3310"], description: "Suspect monitored at Surat Diamond Park.", sourceIds: ["SURV-01"] },
    { id: "C104-E03", timestamp: "2026-08-15T10:15", type: "MOVEMENT", entityIds: ["V-8802"], description: "Vehicle transit tracked between Jaipur and Bhopal.", sourceIds: ["TOLL"] },
  ].map((e) => ({
    ...e,
    locationId: e.description.includes("Ahmedabad") ? "C104-L01"
      : e.description.includes("Surat") ? "C104-L02"
      : e.description.includes("Jaipur") ? "C104-L03"
      : e.description.includes("Bhopal") ? "C104-L04"
      : "C104-L05",
  })),
});

// Real cases are loaded from the backend or the Intake workflow.
export const offlineCaseMarkers: CaseMarker[] = prototypeCases;

export const casePriorityRank: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
