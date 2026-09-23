# JUNCTION — Architecture Decision Log

This document records the architectural baseline, accepted decisions, and pending decisions for the JUNCTION platform in accordance with `implementation_plan_v2.md` and the Decision-Making Governance rules.

---

## 1. Architectural Baseline & Accepted Decisions

### ADR-001: Modular Monolith Architecture for MVP
- **Status:** APPROVED
- **Context:** The application must balance rapid iteration and clean separation of concerns without introducing unnecessary operational overhead (e.g. distributed microservices, Redis clusters, Kafka) for local development and initial deployment.
- **Decision:** Maintain a modular monolith with clear domain boundaries (`domain/`, `services/`, `types/`, `data/`, `app/`). The codebase can evolve into independently deployable services in the future.
- **Affected Modules:** Global repository structure, `src/app/`, `src/services/`, `src/types/`.

### ADR-002: Hardware-Agnostic Sensor & Device Abstraction
- **Status:** APPROVED
- **Context:** Real-world crowd monitoring relies on diverse hardware (CCTV cameras, turnstiles, Wi-Fi/Bluetooth sniffers, pedestrian infrared counters, mobility feeds) with different sampling rates, protocols, and failure modes.
- **Decision:** All sensors and physical/virtual devices must implement a standard `DeviceDefinition` and output normalized `Observation` payloads. The intelligence and analytics layer never consumes vendor-specific raw payloads.
- **Affected Modules:** `src/types/device.ts`, `src/types/observation.ts`, future ingestion adapters.

### ADR-003: Normalized Observation Contracts & Explicit Provenance
- **Status:** APPROVED
- **Context:** Data originates from heterogeneous sources (live sensors, partner reports, manual entries, simulation models, forecasts) with varying reliability and freshness.
- **Decision:** Every observation must carry standardized metadata: source identifier, device ID, timestamp, freshness seconds, derivation type (`MEASURED`, `ESTIMATED`, `FORECAST`, `SIMULATED`, `MANUAL`), quality status (`FRESH`, `STALE`, `DELAYED`, `CONFLICTING`, `INVALID`), and numerical confidence (0.0 to 1.0).
- **Affected Modules:** `src/types/observation.ts`, `src/types/index.ts`.

### ADR-004: Aggregate Computer Vision Without Personal Identification
- **Status:** APPROVED
- **Context:** Mega-event crowd safety requires density and flow estimation, but person-level tracking or facial recognition introduces severe privacy, ethical, and legal compliance risks.
- **Decision:** CV capabilities are restricted to aggregate spatial metrics: person counts, density estimates (people/m²), directional flow rates (inflow/outflow), queue lengths, dwell times, and anomaly indicators. No facial embeddings, biometric markers, or individual trajectories will be stored or processed.
- **Affected Modules:** `src/types/computerVision.ts`.

### ADR-005: Human-in-the-Loop Operational Recommendation Lifecycle
- **Status:** APPROVED
- **Context:** Autonomous redirection of massive crowds or unplanned gate closures can trigger severe safety incidents and panic.
- **Decision:** AI and simulation engines generate explainable recommendations (`proposed`). Consequential interventions require explicit human authorization (`approved`, `rejected`, `modified`). The system never executes autonomous mass redirection. An audit trail logs every human decision.
- **Affected Modules:** `src/types/recommendation.ts`, `src/types/audit.ts`, `src/state/AppContext.tsx`.

### ADR-006: Hotels and Restaurants as First-Class Operational Domains
- **Status:** APPROVED
- **Context:** Event pressure cascades outward from stadium bowls into surrounding transit hubs, roads, restaurants, and accommodation corridors.
- **Decision:** Hospitality resources (Hotels, Dining/Food Services) are modeled as first-class entities with room inventories, seating capacities, queue states, wait times, and partner-scoped update workflows, not static map pins.
- **Affected Modules:** `src/types/hospitality.ts`, `src/types/index.ts`, `src/app/partner/`.

### ADR-007: Simulated Hardware and Observations Using Production Contracts
- **Status:** APPROVED
- **Context:** Real IoT feeds and live CCTV streams are not available during local MVP development.
- **Decision:** Synthetic and scenario-driven data generators will output through the exact same normalized contracts (`Observation`, `CVObservation`) that future physical adapters will use.
- **Affected Modules:** `src/types/observation.ts`, `src/data/`, future sensor simulation service.

### ADR-008: Future Geospatial Visualization Roadmap (CesiumJS / 3D Tiles)
- **Status:** APPROVED
- **Context:** High-fidelity 3D visualization (Google Photorealistic 3D Tiles / CesiumJS) provides superior spatial awareness for multi-level venues.
- **Decision:** Keep Leaflet/OpenStreetMap as the stable working baseline for the MVP. Structure map layer view-models to be renderer-neutral so CesiumJS can be plugged in without changing domain or algorithm layers.
- **Affected Modules:** `src/components/organizer/map/`, `src/types/`.

### ADR-009: Preserve Existing Prototype via Incremental Seams
- **Status:** APPROVED
- **Context:** The prototype already has functioning organizer, attendee, and partner portals. A mass rewrite risks introducing breaking regressions.
- **Decision:** Evolve the codebase strictly additively. New domain type contracts will be created in modular files and re-exported backwards-compatibly via `src/types/index.ts`.
- **Affected Modules:** `src/types/index.ts`.

---

## 2. Pending Decisions Requiring User Approval

### ADR-010: Synthetic Aggregate Computer Vision Provider for MVP (Resolves PENDING-001)
- **Status:** APPROVED / RESOLVED
- **Context:** Following the read-only audit of `CS671-HACKATHON`, the repository lacks an API, has no open-source license, relies on heavy PyTorch/Gradio dependencies, includes non-compliant face detection, and omits key metrics (inflow/outflow, queue lengths, physical density).
- **Decision:**
  - Implement a synthetic aggregate CV provider for the JUNCTION MVP in TypeScript against the established `AggregateCVObservation` contract.
  - Keep the CV interface strictly hardware- and model-agnostic.
  - Treat `CS671-HACKATHON` purely as a conceptual technical reference. Do not copy, integrate, or link its code or dependencies.
  - Prohibit face detection and individual tracking in accordance with ADR-004.
  - Preserve a modular adapter boundary so a real CV microservice (e.g. YOLO/ByteTrack REST pipeline) can replace the synthetic provider in the future without changing downstream consumers.
- **Affected Modules:** `src/types/computerVision.ts`, future `src/services/cv/`.

### PENDING-002: Primary Persistence Strategy
- **Status:** PENDING USER APPROVAL
- **Issue:** Selection of database engine (e.g. SQLite/Prisma vs. PostgreSQL/Supabase) for durable storage of audit logs, partner updates, and historical observations beyond in-memory state.
- **Current MVP Approach:** In-memory state and deterministic scenario fixtures.
