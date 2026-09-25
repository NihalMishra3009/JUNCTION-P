import type { AlertRead, CaseIntelligence, CaseMarker, Entity, GraphResponse, LocationEvent } from "@/types/map";

const caseId = "CASE-BANDRA-001";

const locations = [
  { id: "BND-01", name: "Bandra, Mumbai · Incident site", latitude: 19.0607, longitude: 72.8362, type: "unknown" as const, importance: 1, entityIds: ["Ramesh", "Rajesh", "Nihal", "Guddu"] },
  { id: "DHR-01", name: "Dharavi, Mumbai · Ramesh detained", latitude: 19.0390, longitude: 72.8553, type: "unknown" as const, importance: 0.86, entityIds: ["Ramesh"] },
  { id: "MSR-01", name: "Mansarovar, Jaipur · Rajesh detained", latitude: 26.8500, longitude: 75.7600, type: "unknown" as const, importance: 0.82, entityIds: ["Rajesh"] },
  { id: "PNH-01", name: "Mumbai-Pune Highway · Creta theft report", latitude: 18.9890, longitude: 73.1170, type: "transit" as const, importance: 0.94, entityIds: ["Nihal", "Kaustubh", "CAR-CRETA-001"] },
  { id: "DEL-01", name: "Delhi · Nihal apprehended", latitude: 28.6139, longitude: 77.2090, type: "unknown" as const, importance: 0.92, entityIds: ["Nihal"] },
  { id: "BLR-01", name: "Bengal · Guddu detained", latitude: 22.5726, longitude: 88.3639, type: "unknown" as const, importance: 0.9, entityIds: ["Guddu"] },
  { id: "PUN-01", name: "Pune · Prior murder case reference", latitude: 18.5204, longitude: 73.8567, type: "unknown" as const, importance: 0.58, entityIds: ["Guddu"] },
];

const eventSpecs: Omit<LocationEvent, "caseId">[] = [
  { id: "EV-01", locationId: "BND-01", timestamp: "2026-09-01T22:10:00Z", type: "INCIDENT_REPORTED", entityIds: ["Ramesh", "Rajesh", "Nihal", "Guddu"], description: "Sexual assault reported in Bandra, Mumbai. Survivor identity is protected.", sourceIds: ["FIR-001", "MED-001"] },
  { id: "EV-02", locationId: "DHR-01", timestamp: "2026-09-02T08:30:00Z", type: "DETENTION", entityIds: ["Ramesh"], description: "Ramesh detained in Dharavi during the initial suspect operation.", sourceIds: ["CCTV-014", "WIT-002"] },
  { id: "EV-03", locationId: "MSR-01", timestamp: "2026-09-02T11:45:00Z", type: "DETENTION", entityIds: ["Rajesh"], description: "Rajesh detained in Mansarovar after identity and movement correlation.", sourceIds: ["TEL-009", "WIT-004"] },
  { id: "EV-04", locationId: "PNH-01", timestamp: "2026-09-02T16:20:00Z", type: "VEHICLE_THEFT", entityIds: ["Nihal", "Kaustubh", "CAR-CRETA-001"], description: "Kaustubh's Hyundai Creta, mock plate MH-01-TEST-001, reported stolen near the Mumbai-Pune Highway.", sourceIds: ["THEFT-001", "TOLL-022", "CCTV-031"] },
  { id: "EV-05", locationId: "DEL-01", timestamp: "2026-09-03T09:15:00Z", type: "APPREHENSION", entityIds: ["Nihal"], description: "Nihal apprehended in Delhi after the stolen vehicle crossed into the city.", sourceIds: ["DEL-CCTV-011", "VEH-REC-001"] },
  { id: "EV-06", locationId: "BLR-01", timestamp: "2026-09-03T13:40:00Z", type: "DETENTION_AND_DISCLOSURE", entityIds: ["Guddu", "UNKNOWN-01", "UNKNOWN-02"], description: "Guddu detained in Bengal and disclosed two additional involved members; identities and locations remain unknown.", sourceIds: ["STAT-004", "CASEFILE-019"] },
  { id: "EV-07", locationId: "PUN-01", timestamp: "2026-09-03T15:00:00Z", type: "BACKGROUND_RECORD", entityIds: ["Guddu"], description: "Prior Pune murder case and bail history identified for Guddu; relevance to the Bandra incident is unconfirmed.", sourceIds: ["COURT-017", "POLICE-ARCHIVE-008"] },
];

export const prototypeCase: CaseMarker = {
  caseId,
  title: "Bandra Incident · Coastal Link",
  priority: "HIGH",
  status: "ACTIVE",
  locationIds: locations.map((location) => location.id),
  entityIds: ["Ramesh", "Rajesh", "Nihal", "Guddu", "Kaustubh", "CAR-CRETA-001", "UNKNOWN-01", "UNKNOWN-02"],
  eventIds: eventSpecs.map((event) => event.id),
  locations: locations.map((location) => ({ ...location, caseId, timestamp: eventSpecs.find((event) => event.locationId === location.id)?.timestamp ?? "", eventIds: eventSpecs.filter((event) => event.locationId === location.id).map((event) => event.id), observationCount: 1, sourceCount: 2 })),
  events: eventSpecs.map((event) => ({ ...event, caseId })),
  lastActivity: "2026-09-03T15:00:00Z",
};

const puneCaseId = "CASE-PUNE-002";
const puneLocations = [
  { id: "PUN-BUD-01", name: "Budhwar Peth, Pune · Collision site", latitude: 18.5162, longitude: 73.8567, type: "unknown" as const, importance: 1, entityIds: ["Deepak", "Shrived", "Damodar"] },
  { id: "PUN-HOS-01", name: "Sassoon General Hospital, Pune · Victim care", latitude: 18.5204, longitude: 73.8567, type: "unknown" as const, importance: 0.82, entityIds: ["Shrived", "Damodar"] },
  { id: "PUN-HYD-01", name: "Hyderabad · Deepak hiding lead", latitude: 17.3850, longitude: 78.4867, type: "safehouse" as const, importance: 0.94, entityIds: ["Deepak"] },
];
const puneEventSpecs: Omit<LocationEvent, "caseId">[] = [
  { id: "PUN-EV-01", locationId: "PUN-BUD-01", timestamp: "2026-09-04T21:35:00Z", type: "HIT_AND_RUN_REPORTED", entityIds: ["Deepak", "Shrived", "Damodar"], description: "A hit-and-run was reported near Budhwar Peth, Pune. Deepak is identified as the driver in the working case narrative; victim condition requires confirmation.", sourceIds: ["FIR-PUN-001", "CCTV-PUN-014"] },
  { id: "PUN-EV-02", locationId: "PUN-HOS-01", timestamp: "2026-09-04T22:10:00Z", type: "VICTIM_MEDICAL_RESPONSE", entityIds: ["Shrived", "Damodar"], description: "Shrived and Damodar were moved for medical care after the collision; medical records remain pending in this prototype.", sourceIds: ["MED-PUN-001", "AMB-PUN-002"] },
  { id: "PUN-EV-03", locationId: "PUN-BUD-01", timestamp: "2026-09-05T08:20:00Z", type: "DRIVER_IDENTIFICATION", entityIds: ["Deepak"], description: "Deepak was identified as the driver to be investigated in connection with the hit-and-run; confirmation requires independent evidence.", sourceIds: ["WIT-PUN-003", "CCTV-PUN-019"] },
  { id: "PUN-EV-04", locationId: "PUN-HYD-01", timestamp: "2026-09-05T18:40:00Z", type: "HIDING_LOCATION_LEAD", entityIds: ["Deepak"], description: "A current lead places Deepak hiding in Hyderabad after the Pune hit-and-run; location and identity require immediate corroboration.", sourceIds: ["TEL-PUN-007", "WIT-PUN-006"] },
];

export const punePrototypeCase: CaseMarker = {
  caseId: puneCaseId,
  title: "Pune Hit-and-Run · Budhwar Peth",
  priority: "HIGH",
  status: "ACTIVE",
  locationIds: puneLocations.map((location) => location.id),
  entityIds: ["Deepak", "Shrived", "Damodar"],
  eventIds: puneEventSpecs.map((event) => event.id),
  locations: puneLocations.map((location) => ({ ...location, caseId: puneCaseId, timestamp: puneEventSpecs.find((event) => event.locationId === location.id)?.timestamp ?? "", eventIds: puneEventSpecs.filter((event) => event.locationId === location.id).map((event) => event.id), observationCount: 1, sourceCount: 2 })),
  events: puneEventSpecs.map((event) => ({ ...event, caseId: puneCaseId })),
  lastActivity: "2026-09-05T08:20:00Z",
};

export const prototypeCases: CaseMarker[] = [prototypeCase, punePrototypeCase];

export const prototypeEntities: Entity[] = [
  { id: "Ramesh", name: "Ramesh", type: "Person", risk: 88, confidence: 84, relationships: 3, lastActivity: "02 Sep 2026", aliases: [], locations: ["Dharavi, Mumbai"] },
  { id: "Rajesh", name: "Rajesh", type: "Person", risk: 82, confidence: 81, relationships: 3, lastActivity: "02 Sep 2026", aliases: [], locations: ["Mansarovar, Jaipur"] },
  { id: "Nihal", name: "Nihal", type: "Person", risk: 91, confidence: 89, relationships: 4, lastActivity: "03 Sep 2026", aliases: [], vehicles: ["CAR-CRETA-001"], locations: ["Delhi"] },
  { id: "Guddu", name: "Guddu", type: "Person", risk: 94, confidence: 87, relationships: 4, lastActivity: "03 Sep 2026", aliases: [], locations: ["Bengal", "Pune · prior case"] },
  { id: "Kaustubh", name: "Kaustubh", type: "Person", risk: 12, confidence: 78, relationships: 1, lastActivity: "02 Sep 2026", aliases: [], vehicles: ["CAR-CRETA-001"] },
  { id: "CAR-CRETA-001", name: "Hyundai Creta · MH-01-TEST-001", type: "Vehicle", risk: 46, confidence: 92, relationships: 2, lastActivity: "03 Sep 2026", aliases: [], locations: ["Mumbai-Pune Highway"] },
  { id: "UNKNOWN-01", name: "Unknown member 1", type: "Person", risk: 76, confidence: 42, relationships: 1, lastActivity: "Unknown", aliases: [] },
  { id: "UNKNOWN-02", name: "Unknown member 2", type: "Person", risk: 76, confidence: 42, relationships: 1, lastActivity: "Unknown", aliases: [] },
  { id: "Deepak", name: "Deepak", type: "Person", risk: 91, confidence: 76, relationships: 3, lastActivity: "05 Sep 2026", aliases: [], locations: ["Budhwar Peth, Pune", "Hyderabad · hiding lead"] },
  { id: "Shrived", name: "Shrived", type: "Person", risk: 8, confidence: 78, relationships: 1, lastActivity: "04 Sep 2026", aliases: [], locations: ["Budhwar Peth, Pune", "Sassoon General Hospital"] },
  { id: "Damodar", name: "Damodar", type: "Person", risk: 8, confidence: 78, relationships: 1, lastActivity: "04 Sep 2026", aliases: [], locations: ["Budhwar Peth, Pune", "Sassoon General Hospital"] },
];

export const prototypeGraph: GraphResponse = {
  nodes: prototypeEntities.map((entity) => ({ id: entity.id, type: entity.type.toUpperCase(), name: entity.name, properties: { risk: entity.risk, confidence: entity.confidence } })),
  edges: [
    { id: "REL-01", source: "Ramesh", target: "Rajesh", type: "ASSOCIATED_WITH", properties: { confidence: 0.62 } },
    { id: "REL-02", source: "Rajesh", target: "Nihal", type: "ASSOCIATED_WITH", properties: { confidence: 0.58 } },
    { id: "REL-03", source: "Nihal", target: "CAR-CRETA-001", type: "USED_AFTER_THEFT", properties: { confidence: 0.91 } },
    { id: "REL-04", source: "Kaustubh", target: "CAR-CRETA-001", type: "OWNS", properties: { confidence: 0.92 } },
    { id: "REL-05", source: "Guddu", target: "UNKNOWN-01", type: "DISCLOSED_INVOLVEMENT", properties: { confidence: 0.64 } },
    { id: "REL-06", source: "Guddu", target: "UNKNOWN-02", type: "DISCLOSED_INVOLVEMENT", properties: { confidence: 0.64 } },
    { id: "PUN-REL-01", source: "Deepak", target: "Shrived", type: "COLLISION_INVOLVEMENT", properties: { confidence: 0.72 } },
    { id: "PUN-REL-02", source: "Deepak", target: "Damodar", type: "COLLISION_INVOLVEMENT", properties: { confidence: 0.72 } },
  ],
};

export const prototypeAlerts: AlertRead[] = [
  { id: 1, case_id: caseId, profile_id: null, severity: "CRITICAL", status: "NEW", score: 94, title: "Two additional members disclosed", description: "Guddu identified two unknown members; identities and locations require corroboration.", source_ids: ["STAT-004"], confidence: 0.64, reviewed_by: null, reviewed_at: null, created_at: "2026-09-03T13:40:00Z" },
  { id: 2, case_id: caseId, profile_id: null, severity: "HIGH", status: "NEW", score: 89, title: "Stolen Creta linked to Delhi movement", description: "Kaustubh's vehicle was reported stolen near Mumbai-Pune Highway and recovered after Nihal reached Delhi.", source_ids: ["THEFT-001", "VEH-REC-001"], confidence: 0.91, reviewed_by: null, reviewed_at: null, created_at: "2026-09-03T09:15:00Z" },
  { id: 3, case_id: puneCaseId, profile_id: null, severity: "CRITICAL", status: "NEW", score: 90, title: "Pune hit-and-run requires corroboration", description: "Deepak is identified in the working narrative after Shrived and Damodar were hit near Budhwar Peth; verify driver identity and vehicle evidence.", source_ids: ["FIR-PUN-001", "CCTV-PUN-019"], confidence: 0.72, reviewed_by: null, reviewed_at: null, created_at: "2026-09-05T08:20:00Z" },
    { id: 4, case_id: puneCaseId, profile_id: null, severity: "HIGH", status: "NEW", score: 78, title: "Victim medical records pending", description: "Medical documentation for Shrived and Damodar is required to complete the incident record.", source_ids: ["MED-PUN-001"], confidence: 0.78, reviewed_by: null, reviewed_at: null, created_at: "2026-09-04T22:10:00Z" },
  { id: 5, case_id: puneCaseId, profile_id: null, severity: "CRITICAL", status: "NEW", score: 93, title: "Deepak hiding in Hyderabad", description: "A current lead places Deepak in Hyderabad after the Pune incident; corroborate the location before operational action.", source_ids: ["TEL-PUN-007", "WIT-PUN-006"], confidence: 0.76, reviewed_by: null, reviewed_at: null, created_at: "2026-09-05T18:40:00Z" },
];

const puneIntelligence: CaseIntelligence = {
  case_id: 2,
  evidence_fusion: {}, evidence: [],
  temporal_changes: puneEventSpecs.map((event) => ({ kind: event.type, source: event.entityIds[0], target: event.entityIds[1] ?? "", window: event.timestamp, before: 0, after: 1, score: 70, explanation: event.description })),
  anomalies: [
    { kind: "HIT_AND_RUN", entity_id: "Deepak", baseline: 0, observed: 1, deviation: 100, score: 90, timestamp: "2026-09-05T08:20:00Z", evidence: ["FIR and CCTV lead"], explanation: "The working case narrative links Deepak to a hit-and-run near Budhwar Peth; independent confirmation is pending." },
    { kind: "MEDICAL_RECORD_GAP", entity_id: "Shrived / Damodar", baseline: 0, observed: 1, deviation: 100, score: 78, timestamp: "2026-09-04T22:10:00Z", evidence: ["Hospital response record"], explanation: "Victim medical documentation is needed to complete the incident chronology." },
    { kind: "CROSS_CITY_MOVEMENT", entity_id: "Deepak", baseline: 0, observed: 1, deviation: 100, score: 93, timestamp: "2026-09-05T18:40:00Z", evidence: ["Telecom and witness lead"], explanation: "A current lead places Deepak in Hyderabad after the Pune incident; the hiding location is not independently confirmed." },
  ],
  potential_links: [{ source: "Deepak", target: "Shrived", score: 72, supporting_signals: ["Collision report", "CCTV lead"], contradictory_signals: ["Driver identity not independently confirmed"], evidence_ids: ["FIR-PUN-001"], confidence: 0.72, explanation: "Potential collision involvement requiring corroboration." }],
  link_decisions: {},
  evidence_gaps: [{ subject: "Deepak", known_evidence: ["Incident report", "CCTV lead", "Hyderabad location lead"], missing_evidence: ["Vehicle identity", "Independent driver confirmation", "Hyderabad location corroboration"], importance: 93, recommended_source: "CCTV + vehicle registry + telecom", window: "24-hour review", explanation: "Confirm the vehicle, driver and current Hyderabad location before operational action." }],
  network_dna: { density: 0.18, centralization: 0.58, community_count: 1, clustering: 0.1, bridge_dependence: "LOW", bridge_ratio: 0.1, temporal_volatility: 0.62, communication_activity: "LOW", transaction_anomaly: "LOW", evidence_coverage: 100, fragmentation: 0.28 },
  entity_priorities: [{ subject: "Deepak", priority: 90, factors: { incident_attribution: 92 }, explanation: ["Working driver attribution requires corroboration"] }, { subject: "Shrived", priority: 40, factors: { victim_record: 40 }, explanation: ["Complete medical and incident records"] }], relationship_priorities: [],
  recommendations: [{ kind: "LOCATION_CORROBORATION", subject: "Deepak · Hyderabad", priority: 93, info_gain: 92, reasoning: ["A current lead places Deepak in Hyderabad", "Confirm the location before operational action"], evidence_ids: ["TEL-PUN-007", "WIT-PUN-006"], entity_ids: ["Deepak"], recommended_data: "Telecom, CCTV and local verification", window: "24-hour review" }],
};


export const prototypeIntelligence: CaseIntelligence = {
  case_id: 1,
  evidence_fusion: {}, evidence: [],
  temporal_changes: eventSpecs.map((event) => ({ kind: event.type, source: event.entityIds[0], target: event.entityIds[1] ?? "", window: event.timestamp, before: 0, after: 1, score: 70, explanation: event.description })),
  anomalies: [
    { kind: "UNKNOWN_MEMBERS", entity_id: "Guddu", baseline: 0, observed: 2, deviation: 100, score: 94, timestamp: "2026-09-03T13:40:00Z", evidence: ["Guddu disclosure statement"], explanation: "Two additional members were disclosed but remain unverified." },
    { kind: "VEHICLE_MOVEMENT", entity_id: "Nihal", baseline: 0, observed: 1, deviation: 100, score: 89, timestamp: "2026-09-03T09:15:00Z", evidence: ["Vehicle recovery and highway records"], explanation: "A stolen vehicle connects the Mumbai origin point to Delhi apprehension." },
  ],
  potential_links: [{ source: "Guddu", target: "UNKNOWN-01", score: 64, supporting_signals: ["Disclosure statement"], contradictory_signals: ["No independent confirmation"], evidence_ids: ["STAT-004"], confidence: 0.64, explanation: "Potential involvement disclosed by Guddu; requires corroboration." }],
  link_decisions: {},
  evidence_gaps: [{ subject: "UNKNOWN-01 / UNKNOWN-02", known_evidence: ["Guddu disclosure"], missing_evidence: ["Identity, location and independent corroboration"], importance: 94, recommended_source: "CDR + CCTV", window: "72-hour review", explanation: "Resolve the two unknown members before treating their involvement as confirmed." }],
  network_dna: { density: 0.32, centralization: 0.68, community_count: 3, clustering: 0.2, bridge_dependence: "HIGH", bridge_ratio: 0.4, temporal_volatility: 0.76, communication_activity: "MEDIUM", transaction_anomaly: "LOW", evidence_coverage: 100, fragmentation: 0.54 },
  entity_priorities: [{ subject: "Guddu", priority: 94, factors: { disclosure: 100, prior_case_context: 82 }, explanation: ["Disclosed two unknown members", "Prior Pune murder case requires verification"] }, { subject: "Nihal", priority: 89, factors: { vehicle_movement: 92 }, explanation: ["Cross-state movement linked to stolen vehicle"] }], relationship_priorities: [],
  recommendations: [{ kind: "IDENTITY_RESOLUTION", subject: "UNKNOWN-01 / UNKNOWN-02", priority: 94, info_gain: 91, reasoning: ["Guddu disclosure is currently the only direct lead", "Unknown members may explain coordination and escape support"], evidence_ids: ["STAT-004"], entity_ids: ["Guddu", "UNKNOWN-01", "UNKNOWN-02"], recommended_data: "CDR, CCTV and corroborating witness statements", window: "72-hour review" }],
};

export const prototypeIntelligenceByCase: Record<string, CaseIntelligence> = {
  [caseId]: prototypeIntelligence,
  [puneCaseId]: puneIntelligence,
};
