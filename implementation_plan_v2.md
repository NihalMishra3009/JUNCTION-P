# JUNCTION — Complete Sequential Implementation Plan v2

**Document type:** Master implementation plan — revised and expanded
**Project:** JUNCTION — Intelligent Crowd, Capacity, Mobility, Hospitality, and Operational Decision-Support Platform
**Baseline:** Existing Next.js 16 / React 19 / TypeScript prototype with Organizer, Attendee, and Partner portals
**Execution model:** One sequential implementation path with validation gates; not independent phases
**Primary rule:** Every step must leave the application runnable, typed, explainable, and reversible

---

## 1. Purpose and Scope

This plan evolves the existing JUNCTION prototype into a modular decision-support platform for mega-events. It explicitly includes:

1. Hardware-agnostic sensor and device emulation.
2. Computer-vision-compatible crowd observations without requiring live cameras in the MVP.
3. Data ingestion, validation, normalization, and provenance.
4. Zone-aware sensor fusion and real-time operational state.
5. Capacity, pressure, flow, bottleneck, hotspot, and cascade analysis.
6. Short-horizon forecasting using transparent algorithms first.
7. What-if simulation and explainable recommendations.
8. Human approval, action tracking, alerts, and feedback.
9. Hotels, restaurants, parking, pickup zones, and other hospitality/service partners as first-class domains.
10. Transport-to-venue-to-hospitality demand propagation.
11. Evaluation, privacy, confidence, failure handling, and future provider replacement.

The MVP must use simulated, curated, or recorded observations behind the same interfaces that future real providers will implement. Real CCTV, GTFS-RT, GPS, PMS, restaurant POS, and IoT integrations are future adapters—not reasons to redesign the intelligence layer.

---

## 2. Starting Point and Constraints

The current project already includes:

- Next.js App Router, React, and TypeScript.
- Organizer, Attendee, and Partner portals.
- Leaflet/OpenStreetMap map rendering.
- Existing event, resource, hotel, road, transport, alert, recommendation, and simulation data.
- Simulation and transport engines.
- Initial tiered zone definitions and zone-state fusion logic.
- Application-level state in `src/state/AppContext.tsx`.

Preserve the current UI and workflows unless a change is necessary and documented. Do not replace the application with a new stack.

Do not introduce Kafka, Redis, Kubernetes, microservices, a separate backend, or complex model training for the three-day MVP. Use modular TypeScript services and deterministic fixtures first.

Before starting new work, repeat:

```bash
npx tsc --noEmit
npm run build
```

Also perform a manual browser check of Organizer, Attendee, Partner, map rendering, simulation controls, alerts, recommendations, and route planning.

---

## 3. Product and Governance Principles

1. **AI recommends; authorized humans decide.** Recommendations never become completed actions automatically.
2. **No person-level identity.** Computer vision outputs aggregate operational observations only. Do not implement facial recognition or identity tracking.
3. **Provider independence.** Mock devices, recorded feeds, and future real providers must produce the same normalized observation contracts.
4. **Explicit semantics.** Distinguish raw, normalized, validated, fused, estimated, forecast, simulated, recommended, approved, executed, and completed states.
5. **Provenance everywhere.** Preserve source, device, timestamp, zone, quality, confidence, processing version, and derivation type.
6. **Explainability by default.** Every alert, forecast, recommendation, and simulated outcome must expose contributing factors and assumptions.
7. **Graceful degradation.** Missing, stale, conflicting, or unhealthy sensors must reduce confidence rather than silently producing false precision.
8. **Operational scope is bounded.** Model the event impact area and its connected network, not an unsupported claim to manage an entire city.
9. **Human-safe defaults.** High-impact actions require approval, clear expiry, rollback guidance, and an audit record.
10. **Progressive realism.** Start with synthetic observations, then add recorded data, then optional live adapters.

---

# 4. Complete Sequential Implementation Steps

## Step 1 — Freeze and document the baseline

### Work

- Record routes, components, services, state providers, data files, and package scripts.
- Record existing algorithms that must be preserved:
  - usable capacity calculation;
  - egress outflow calculation;
  - discrete cohort simulation;
  - network edge interpolation;
  - existing hotel/resource calculations.
- Run typecheck, build, and any available tests.
- Perform manual browser validation.
- Record known defects separately from new work.

### Completion criteria

- Baseline report exists.
- Existing behavior is captured with screenshots or notes.
- No new implementation starts with an unexplained baseline failure.

## Step 2 — Establish the target directory structure

Create only directories that are needed, while retaining current files until replacements are validated:

```text
src/
  types/
    zone.ts
    observation.ts
    device.ts
    computerVision.ts
    transport.ts
    hospitality.ts
    partner.ts
    forecast.ts
    recommendation.ts
    audit.ts
  services/
    ingestion/
    normalization/
    sensors/
    cv/
    fusion/
    forecasting/
    capacity/
    hotspots/
    cascade/
    simulation/
    recommendations/
    alerts/
    hospitality/
    demand/
    partners/
    evaluation/
    audit/
  data/
    devices/
    cv/
    hospitality/
    scenarios/
    evaluation/
```

Do not move every existing file at once. Extract one stable contract or service at a time and keep compatibility wrappers where necessary.

## Step 3 — Define the canonical destination and resource model

Create a common resource abstraction for:

- venues and gates;
- zones and micro-locations;
- stations and transport hubs;
- roads and network edges;
- hotels;
- restaurants and food-service locations;
- parking facilities;
- pickup/drop-off zones;
- shuttle hubs;
- public facilities and emergency resources.

Every resource should support, where applicable:

```text
id
kind
name
location / geometry
parent_zone_id
connected_resource_ids
total_capacity
usable_capacity
current_utilization
available_capacity
predicted_demand
operating_status
pressure_level
confidence
source_metadata
```

Keep resource-specific extensions for hotel rooms, restaurant seating, queue length, transport capacity, and road throughput.

## Step 4 — Define observation, provenance, quality, and confidence contracts

Create shared contracts for every incoming observation:

```text
observation_id
provider_id
device_id or connector_id
observation_type
resource_id / zone_id
event_id
observed_at
ingested_at
value / payload
unit
quality_status
confidence
freshness_seconds
derivation_type
schema_version
```

Required enums should include:

- `measured | estimated | forecast | simulated | manually_entered`;
- `fresh | delayed | stale | invalid | conflicting`;
- `high | medium | low` confidence;
- source and processing version identifiers.

Define validation behavior for missing values, impossible values, timestamp drift, duplicate observations, conflicting providers, and stale data.

## Step 5 — Build the hardware-agnostic device abstraction

Create `DeviceDefinition`, `DeviceHealth`, and `DeviceObservationProfile` contracts. A device must describe:

- device ID and type;
- provider/vendor;
- zone/resource assignment;
- measurement interval;
- supported metrics;
- expected range;
- reliability score;
- health status;
- last-seen timestamp;
- calibration or simulation profile.

Support device types such as:

- pedestrian counter;
- CCTV/camera observation source;
- density sensor;
- gate counter;
- Bluetooth/Wi-Fi aggregate counter;
- transport occupancy feed;
- road speed/congestion feed;
- hotel availability feed;
- restaurant queue/availability feed;
- weather/environment feed.

The intelligence layer must consume normalized observations, never device-specific payloads.

## Step 6 — Implement realistic simulated hardware feeds

Build a simulator that generates observations from scenario parameters rather than random independent numbers. Include:

- baseline traffic;
- event opening surge;
- arrival peak;
- intermission or exit surge;
- transport delays;
- gate closure;
- road incident;
- rain/weather effect;
- restaurant demand spike;
- hotel demand and cancellation changes;
- sensor outage;
- sensor bias;
- delayed readings;
- conflicting readings;
- recovery after intervention.

Simulation parameters should include seed, interval, zone, device type, reliability, noise level, and failure schedule. Store the seed so a scenario is reproducible.

Completion criteria: changing the simulated provider or device configuration changes the input stream without requiring changes to fusion, forecasting, or recommendations.

## Step 7 — Add the computer-vision capability layer

Create a provider-neutral CV contract. The MVP does not need live neural inference; it must mimic the output of a future CV system correctly.

Support these observation types:

- person count;
- occupancy estimate;
- density estimate;
- inflow rate;
- outflow rate;
- direction distribution;
- queue length;
- queue waiting-time estimate;
- dwell-time estimate;
- movement anomaly;
- camera health and coverage quality.

The conceptual pipeline is:

```text
image/video provider
  -> person detection/tracking provider
  -> aggregate counting
  -> density and flow calculation
  -> zone mapping
  -> CrowdObservation
```

The MVP implementation should use synthetic or recorded aggregate observations, not raw video. Add fields for:

```text
camera_id
location_id
people_count
inflow_rate
outflow_rate
density
queue_length
flow_direction
coverage_quality
confidence
```

Do not store facial embeddings, names, identity attributes, or person-level trajectories.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPUTER VISION REFERENCE REPOSITORY EVALUATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Potential reference repository:

https://github.com/codesensei-tushar/CS671-HACKATHON

This repository may be used as a reference or potential implementation
source for JUNCTION's computer-vision capabilities.

IMPORTANT:
The repository is not pre-approved for direct integration. Its actual
architecture, license, dependencies, model capabilities, inference
pipeline, outputs, performance, and compatibility must be inspected
before deciding whether to reuse, adapt, or reimplement any component.

The implementation agent must not assume that the repository provides
all required JUNCTION functionality.

────────────────────────────────────────────────────────────
REPOSITORY EVALUATION REQUIREMENTS
────────────────────────────────────────────────────────────

Inspect and document:

1. Repository structure and architecture.
2. Programming language and framework.
3. Computer-vision models and versions.
4. Detection capabilities.
5. Person-counting capabilities.
6. Object-tracking capabilities.
7. Density-estimation capabilities.
8. Flow and direction-estimation capabilities.
9. Queue or occupancy-estimation capabilities.
10. Input types:
    - Images
    - Uploaded videos
    - Webcam
    - RTSP or other live streams
11. Output formats and available metadata.
12. Confidence-score availability.
13. Processing latency and resource requirements, if measurable.
14. License and reuse restrictions.
15. Python and system dependencies.
16. Whether it can run as an independent CV service.
17. Whether its outputs can be normalized into JUNCTION's
    CrowdObservation contract.
18. Whether camera/source identifiers can be mapped to JUNCTION zones.
19. Whether the implementation is suitable for simulated hardware
    and future real hardware.
20. Security, privacy, and data-retention considerations.

Do not claim that a capability exists unless it is verified from the
repository's code, documentation, or an explicit test.

────────────────────────────────────────────────────────────
POSSIBLE INTEGRATION STRATEGIES
────────────────────────────────────────────────────────────

Evaluate the following options without selecting one automatically:

Option A:
Use the repository only as a conceptual reference.

Option B:
Reuse selected algorithms or utility functions, subject to license
compatibility and code-quality review.

Option C:
Wrap the repository behind a JUNCTION CV provider adapter.

Option D:
Run the repository as an independent CV processing service and
communicate through a documented contract.

Option E:
Reimplement the required capabilities using a different model or
pipeline while preserving the JUNCTION interface.

The final choice must depend on the repository audit, compatibility,
license, performance, maintainability, and project timeline.

────────────────────────────────────────────────────────────
REQUIRED JUNCTION CV ABSTRACTION
────────────────────────────────────────────────────────────

Regardless of the selected CV implementation, JUNCTION must not be
tightly coupled to a single computer-vision model or hardware vendor.

Create a stable internal abstraction for CV observations.

The abstraction should support, where available:

- Source and camera identification.
- Zone identification.
- Timestamp.
- People count.
- Density.
- Inflow rate.
- Outflow rate.
- Movement direction.
- Tracking or flow metadata.
- Confidence score.
- Model name and version.
- Processing latency.
- Data provenance.
- Data quality and source-health status.

The CV implementation must produce normalized observations that can
be consumed by JUNCTION's existing zone-state, sensor-fusion,
forecasting, cascade-analysis, simulation, and recommendation layers.

The CV provider must remain replaceable.

Do not allow model-specific output formats to spread throughout the
frontend, domain logic, or database layer.

## Step 8 — Implement ingestion and normalization adapters

Create adapter interfaces for:

- simulated devices;
- CSV/JSON replay;
- manual operator input;
- future CCTV/CV provider;
- future GTFS-RT or transport provider;
- future hotel/PMS provider;
- future restaurant/POS or queue provider.

Every adapter must return the canonical observation contract. Add:

- schema validation;
- unit conversion;
- timestamp normalization;
- deduplication;
- source tagging;
- quality scoring;
- rejection and quarantine handling.

## Step 9 — Complete the zone hierarchy and spatial mapping

Support the hierarchy:

```text
CITY / EVENT REGION
  -> OPERATIONAL ZONE
    -> LOCATION
      -> MICRO-LOCATION / GATE / SENSOR AREA
```

Implement mappings from devices, CV regions, transport nodes, hotels, restaurants, roads, and pickup zones to the relevant zone. Include adjacency and directional relationships.

Do not rely on a single flat zone ID when a gate, station entrance, road segment, or restaurant queue requires more precise attribution.

## Step 10 — Implement sensor fusion and zone state

Fuse observations into a `ZoneState` using transparent rules:

1. discard invalid observations;
2. down-weight stale observations;
3. weight sources by reliability and confidence;
4. reconcile overlapping measurements;
5. preserve disagreement metrics;
6. calculate current occupancy, inflow, outflow, density, pressure, and confidence;
7. attach contributing observations and derivation metadata.

Use weighted aggregation for compatible metrics. For conflicting observations, retain the spread and lower confidence rather than hiding disagreement.

## Step 11 — Implement capacity and pressure algorithms

Define and test the following calculations:

### Capacity

- nominal capacity;
- usable capacity after safety, accessibility, operating, and event buffers;
- effective capacity after closures or reduced throughput;
- available capacity;
- capacity utilization.

### Pressure

Pressure should combine configurable factors such as:

```text
occupancy utilization
+ inflow versus outflow imbalance
+ queue growth
+ forecast demand
+ transport/road constraints
+ resource availability
+ confidence penalty
```

Use explicit thresholds and hysteresis so the system does not oscillate between states. Every pressure result must state the factors that drove it.

## Step 12 — Add flow conservation and network calculations

Preserve and extract the existing discrete cohort and egress logic. Add checks for:

- inflow minus outflow versus occupancy change;
- edge capacity;
- travel time;
- queue accumulation;
- spillback into adjacent zones;
- source/destination demand balance;
- conservation of simulated people or vehicle cohorts.

Flag impossible results such as negative occupancy, flow above configured maximum without an override, or unexplained mass creation/loss.

## Step 13 — Implement short-horizon forecasting

Start with explainable baselines:

1. persistence baseline;
2. moving average;
3. weighted recent trend;
4. event-schedule uplift;
5. scenario-specific surge curve;
6. transport delay and weather adjustment.

Forecast:

- occupancy;
- inflow/outflow;
- queue length;
- transport demand;
- hotel demand;
- restaurant demand;
- road congestion.

Every forecast must include horizon, baseline, assumptions, confidence, and error metrics when ground truth is available. Reserve XGBoost/LightGBM or other trained models for a later adapter with an offline evaluation requirement.

## Step 14 — Build hotspot detection

Detect hotspots using:

- pressure threshold crossing;
- pressure growth rate;
- queue growth rate;
- forecast threshold crossing;
- low available capacity;
- high inflow-to-outflow imbalance;
- spatial clustering of adjacent stressed zones;
- repeated alerts within a time window.

Return hotspot severity, expected onset, duration estimate, contributing factors, affected resources, and confidence.

## Step 15 — Build cascade and spillover analysis

Represent the event system as a directed graph of connected resources and zones. Model propagation such as:

```text
venue exit
  -> pedestrian corridor
  -> road segment
  -> station entrance
  -> train/platform capacity
  -> taxi/pickup zone
  -> restaurant demand
  -> hotel demand or late-arrival pressure
```

Use a transparent propagation model based on adjacency, transfer rates, travel times, capacity, and delays. Avoid claiming causal certainty; label outputs as estimated propagation or scenario projection.

## Step 16 — Create the hospitality domain model

Treat hospitality as a first-class operating domain, not merely a static list of hotels.

### Hotels

Model:

- room inventory;
- available rooms by category;
- check-in/check-out windows;
- booking and cancellation trend;
- distance and travel impedance to event zones;
- transport accessibility;
- event demand buffer;
- partner-confirmed availability;
- acceptance of redirected demand;
- alert preferences.

### Restaurants and food service

Model:

- seating capacity;
- current occupancy;
- queue length;
- estimated wait time;
- reservation availability;
- opening hours;
- service throughput;
- dietary/service tags if provided;
- distance from event and transport nodes;
- demand forecast;
- ability to accept additional demand;
- partner-confirmed operating status.

### Other services

Keep the same common model extensible to parking, pharmacies, medical posts, restrooms, retail, and pickup operators.

## Step 17 — Implement hospitality demand propagation

Connect transport and crowd state to hospitality demand through explicit assumptions:

- expected arrival and exit cohorts;
- distance and travel time;
- time-of-day demand curves;
- venue release events;
- hotel check-in windows;
- restaurant opening hours;
- transport disruption;
- weather and waiting-time effects.

Calculate demand ranges rather than false precision. Example outputs:

- projected restaurant demand in the next 30 minutes;
- projected hotel search/availability pressure;
- likely overflow destinations;
- service locations with available capacity;
- confidence and assumptions.

## Step 18 — Build partner workflows

Partner portal capabilities should include:

- property-scoped access;
- availability updates;
- operating-status changes;
- capacity and queue updates;
- acceptance/rejection of redirected demand;
- alert subscriptions;
- response deadlines;
- action history;
- data freshness indicators.

A partner must never see another partner’s private operational data unless explicitly authorized. Organizer views should show aggregated and policy-compliant information.

## Step 19 — Implement what-if scenario definitions

Create scenario contracts for:

- gate closure/opening;
- route or road closure;
- transport delay;
- shuttle activation;
- visitor redistribution;
- capacity reduction;
- restaurant/hotel availability changes;
- weather deterioration;
- emergency or incident injection.

Each scenario must define baseline, intervention, affected resources, start time, duration, assumptions, and rollback/expiry.

## Step 20 — Integrate simulation with the intelligence pipeline

The simulation engine must produce the same normalized observations and state updates as the live/simulated ingestion path. Do not create a parallel logic path that bypasses fusion and forecasting.

Support comparison views:

- baseline without intervention;
- intervention scenario;
- delta in pressure;
- delta in queue length;
- delta in travel time;
- delta in hotel/restaurant demand;
- unintended spillover;
- confidence and limitations.

## Step 21 — Implement recommendation generation

Recommendations should be generated from explicit rules and scored by transparent criteria, such as:

- expected pressure reduction;
- time to effect;
- operational feasibility;
- resource cost;
- displacement risk;
- confidence;
- reversibility;
- stakeholder impact.

Possible actions include:

- open or redirect a gate;
- adjust messaging;
- recommend alternative routes;
- activate shuttle or pickup capacity;
- redistribute visitors;
- notify a hotel or restaurant partner;
- temporarily pause promotion of a saturated destination;
- request operator confirmation.

Do not produce a single opaque “best action.” Present alternatives, assumptions, expected impact, and trade-offs.

## Step 22 — Implement human approval and action lifecycle

Use explicit statuses:

```text
proposed
under_review
approved
rejected
scheduled
executing
completed
expired
rolled_back
failed
```

Capture approver, timestamp, reason, affected scope, expiry, execution evidence, and outcome. High-impact actions require approval. Low-impact informational recommendations may be displayed without approval but must still be auditable.

## Step 23 — Implement alerts and notification policy

Create alerts for:

- current pressure threshold;
- forecast threshold;
- rapid deterioration;
- sensor outage or stale data;
- conflicting observations;
- hospitality capacity shortage;
- transport disruption;
- partner response timeout;
- failed or expired action.

Add deduplication, cooldowns, escalation levels, acknowledgment, and resolution. An alert must explain why it was emitted and which data supported it.

## Step 24 — Add privacy, security, and data governance controls

Implement MVP-level safeguards:

- no facial recognition;
- no person-level identity storage;
- aggregate CV outputs only;
- role-based portal access;
- property-scoped partner access;
- source and retention metadata;
- audit logs for changes and approvals;
- safe handling of location and mobility data;
- explicit synthetic-data labeling;
- separation of demo data from real partner data.

Document what the MVP does not collect and what future integrations would require additional governance.

## Step 25 — Add evaluation fixtures and measurable acceptance tests

Create replayable scenarios with expected outcomes. Measure:

- observation validation rate;
- freshness and stale-data detection;
- fusion stability;
- pressure classification agreement with fixture labels;
- forecast error by horizon;
- hotspot detection precision/recall on synthetic labels;
- conservation error in flow simulation;
- recommendation feasibility checks;
- alert deduplication rate;
- partner scope isolation;
- action audit completeness.

Every algorithm should have normal, boundary, missing-data, conflicting-data, and failure tests.

## Step 26 — Add failure injection and graceful degradation

Test:

- device outage;
- delayed provider;
- malformed payload;
- conflicting sensors;
- missing zone mapping;
- route closure;
- hotel/restaurant partner unavailable;
- forecast service unavailable;
- simulation instability;
- stale map data.

The UI should visibly communicate degraded confidence and unavailable capabilities. It must not present stale or simulated values as live measured facts.

## Step 27 — Integrate organizer, attendee, and partner experiences

### Organizer

Show current state, forecast, hotspots, cascades, hospitality pressure, recommendations, approval workflow, and audit history.

### Attendee

Show route alternatives, transport conditions, destination pressure, food/service options, accommodation options, travel timing, and clear alerts. The attendee chooses the final option.

### Partner

Show only authorized property data, update controls, demand indicators, alerts, and response workflows.

Reuse existing presentation components wherever possible and avoid moving domain logic into pages.

## Step 28 — Improve map and visualization contracts

Keep Leaflet as the working baseline. Add visualization layers for:

- zone pressure;
- flow direction;
- forecast hotspots;
- transport nodes;
- roads and spillback;
- hotels and restaurants;
- sensor health;
- simulated versus measured data;
- confidence and uncertainty.

Design the map layer behind a renderer-neutral contract so CesiumJS/Google Photorealistic 3D Tiles can be introduced later without changing domain services. Do not make Cesium a prerequisite for the MVP.

## Step 29 — Add observability and audit diagnostics

Log structured events for:

- ingestion;
- validation rejection;
- fusion update;
- forecast generation;
- hotspot detection;
- scenario execution;
- recommendation creation;
- approval and action changes;
- partner updates;
- degraded-mode entry and exit.

Include correlation IDs and processing versions. Avoid logging sensitive raw video or unnecessary personal data.

## Step 30 — Optimize state and rendering performance

Profile before optimizing. Prioritize:

- selective `AppContext` subscriptions;
- memoized derived state;
- bounded observation history;
- throttled map updates;
- incremental simulation updates;
- lazy loading of heavy map or chart components;
- avoiding unnecessary re-rendering of all portals.

Do not introduce a new state library unless profiling demonstrates a concrete need.

## Step 31 — Add external-provider adapter contracts

Document adapter boundaries for future:

- CCTV/CV inference providers;
- GTFS-RT and transit feeds;
- taxi or pickup feeds;
- road traffic APIs;
- weather providers;
- hotel PMS/channel managers;
- restaurant reservation/POS/queue providers;
- event ticketing and attendance systems.

Each adapter must map into the canonical contracts and must not bypass validation, provenance, privacy, or fusion services.

## Step 32 — Perform end-to-end scenario validation

Run at least these complete demonstrations:

1. Event arrival surge → gate pressure → transport demand.
2. Venue exit surge → road congestion → station pressure → pickup demand.
3. Gate closure → rerouting → adjacent-zone spillover.
4. Transport delay → late arrival → restaurant demand shift.
5. Restaurant saturation → alternative service recommendations.
6. Hotel availability reduction → demand redistribution.
7. Sensor outage → confidence reduction → degraded alert.
8. Approved intervention → simulated improvement → post-action feedback.

Each demo must show data source, current state, forecast, cascade, recommendation, human decision, and measured/simulated outcome.

## Step 33 — Complete security, accessibility, and operational review

Verify:

- portal access boundaries;
- keyboard and screen-reader basics;
- color-independent pressure indicators;
- readable alert severity and uncertainty;
- no hidden automatic intervention;
- clear distinction between live, simulated, estimated, and forecast values;
- safe error handling;
- no sensitive data in client-visible logs.

## Step 34 — Final build, documentation, and handoff

Run:

```bash
npx tsc --noEmit
npm run build
```

Document:

- architecture and service boundaries;
- contracts and schemas;
- simulated hardware profiles;
- CV observation model;
- algorithm formulas and assumptions;
- hospitality and partner workflows;
- scenario catalog;
- known limitations;
- future provider integration instructions;
- test results;
- demo script.

The final handoff must identify which features are:

- implemented and tested in the MVP;
- simulated behind production-compatible interfaces;
- partially implemented;
- future integration work.

---

# 5. Explicit Algorithm Inventory

The following algorithms are required as named, testable modules—not informal logic hidden in components:

1. **Observation validation:** schema, range, timestamp, freshness, duplication, and source checks.
2. **Reliability weighting:** provider/device reliability combined with observation confidence and freshness.
3. **Sensor fusion:** weighted aggregation with disagreement and uncertainty preservation.
4. **Usable capacity:** nominal capacity reduced by safety, operating, access, closure, and demand buffers.
5. **Pressure index:** utilization, imbalance, queue growth, forecast demand, network constraints, and confidence penalty.
6. **Flow conservation:** occupancy change versus inflow/outflow and cohort movement.
7. **Queue accumulation:** arrival rate, service rate, queue capacity, and spillover.
8. **Trend estimation:** recent slope, smoothing, and event-relative change.
9. **Short-horizon forecast:** persistence, moving average, event curve, transport/weather adjustments.
10. **Hotspot detection:** threshold crossing, growth rate, adjacency, duration, and recurrence.
11. **Cascade propagation:** graph-based transfer of demand and pressure across connected resources.
12. **Scenario simulation:** baseline/intervention comparison with deterministic seeds.
13. **Recommendation impact estimation:** expected reduction, time to effect, feasibility, cost, displacement, and reversibility.
14. **Hospitality demand allocation:** time, distance, capacity, opening hours, and transport accessibility.
15. **Alert deduplication and escalation:** fingerprint, cooldown, severity, acknowledgment, and timeout.
16. **Confidence degradation:** stale, conflicting, missing, or low-quality observations reduce confidence explicitly.

Each module requires unit tests, fixture tests, and explainable output metadata.

---

# 6. MVP Versus Future Scope

| Capability | Three-day MVP | Future extension |
|---|---|---|
| Crowd sensing | Simulated/recorded aggregate observations | Live CCTV/CV inference |
| Hardware | Configurable virtual devices | Real IoT and vendor integrations |
| Forecasting | Deterministic baselines and scenario curves | Trained XGBoost/LightGBM/time-series models |
| Transport | Existing simulation plus normalized mock feeds | GTFS-RT, GPS, road APIs |
| Hotels | Availability, capacity, demand estimates, partner updates | PMS/channel-manager integration |
| Restaurants | Capacity, queue, wait-time, demand, alternatives | POS/reservation/queue integrations |
| Storage | Existing app state and fixture files | Durable event store/time-series database |
| Map | Leaflet and renderer-neutral layers | Cesium/3D tiles and advanced GIS |
| Alerts | In-app alerts and audit records | SMS, email, WhatsApp, control-room integrations |
| ML | Interfaces and synthetic CV-compatible outputs | Model training, calibration, drift monitoring |

The MVP must not pretend that simulated observations are live external data. The interface and UI must label the source and derivation type.

---

# 7. Definition of Done

JUNCTION is ready for the next development milestone when:

- Existing portals continue to work.
- Typecheck and production build pass.
- Sensor and CV-compatible observations flow through one normalized pipeline.
- Hardware simulation supports reproducible, non-random scenarios and failure injection.
- Zone state includes utilization, flow, pressure, forecast, confidence, and provenance.
- Forecasting, hotspot, cascade, and simulation outputs are explainable.
- Hotels and restaurants are first-class resources with demand and capacity behavior.
- Partner updates are property-scoped and auditable.
- Recommendations require human review for consequential actions.
- Alerts handle stale, conflicting, and degraded data.
- Evaluation fixtures cover normal and failure cases.
- The demo distinguishes measured, estimated, forecast, and simulated values.
- Documentation states current limitations and future adapter boundaries.

**Implementation rule:** Do not advance past a step merely because the code compiles. Advance only when its behavior, data semantics, and failure handling have been validated.
