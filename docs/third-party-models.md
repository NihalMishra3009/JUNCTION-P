# Third-Party Models, Dependencies, and Attributions

This document records the provenance, licensing, and governance of third-party machine learning models and computer vision components integrated into JUNCTION.

---

## 1. YOLOv12 Object Detection Model

### Overview
JUNCTION integrates pre-trained YOLOv12 weights for the standalone Computer Vision Demonstration and Replay module (`/organizer/cctv-demo` and `cv_bridge/`).

> **Attribution Note:** The YOLOv12 model architecture and neural network weights were not developed, trained, or fine-tuned from scratch by the JUNCTION engineering team. JUNCTION utilizes existing pre-trained weights for demonstration and replay analysis.

### Lineage & Sources
* **Model Checkpoints:** `yolov12n.pt` (Nano, ~5.5 MB), `yolov12m.pt` (Medium, ~39.8 MB)
* **Framework:** [Ultralytics](https://github.com/ultralytics/ultralytics) Python runtime
* **Reference Source:** [CS671-HACKATHON Repository](https://github.com/codesensei-tushar/CS671-HACKATHON) (IIT Mandi Hackathon) by `@codesensei-tushar`
* **Object Filter:** Strictly class 0 (`person`) bounding box detection

### JUNCTION Implementation Scope
JUNCTION's original engineering contribution encompasses:
1. **Python Computer Vision Bridge (`cv_bridge/`):** Frame decoding, inference lifecycle, and graceful fallback handling.
2. **ByteTrack Integration:** Persistent spatial tracking across video frames without storing biometric or facial signatures.
3. **Crowd Flux & Spatial Metrics Engine (`cv_bridge/metrics.py`):** Bidirectional tripwire vector intersection (inbound/outbound crossing counts), calibrated area physical density ($p/\text{m}^2$), and queue dynamics.
4. **Normalized Telemetry Serialization (`cv_bridge/observation_serializer.py`):** Formatting CV detections into JUNCTION's `NormalizedObservation` JSON schema.
5. **Transport Gateway (`cv_bridge/transport.py`):** JSONL streaming and HTTP REST delivery to the `/api/observations` endpoint.

---

## 2. ByteTrack Multi-Object Tracker

* **Purpose:** Provides consistent track ID assignment across video frames to compute movement vectors and tripwire crossings.
* **Licensing:** MIT License / Open source multi-object tracking algorithm.
* **Integration:** Invoked via Ultralytics tracker configuration (`bytetrack.yaml`).

---

## 3. Licensing & Redistribution

* **Ultralytics YOLO:** AGPL-3.0 License / Enterprise licensing options.
* **JUNCTION Usage Scope:** Research, academic hackathon, operational simulation, and demonstration replay.
* **Disclaimer:** For commercial venue deployment, ensure compliance with Ultralytics AGPL-3.0 licensing or acquire appropriate enterprise commercial licensing.

---

## 4. Privacy Governance & Operational Isolation

### Privacy Governance
* **Non-Identifiable Spatial Telemetry:** All CV inference extracts only head/body bounding boxes, centroids, and movement vectors.
* **Biometric Exclusion:** Facial recognition, identity re-identification, age/gender profiling, and personal tracking are **strictly excluded** from the codebase and architecture.

### Decoupling from Main Operational Map
* The CCTV module is explicitly labeled as **Demonstration & Replay**.
* Telemetry generated from non-venue sample videos does **not** automatically overwrite or distort live operational zone states on the main Organizer Dashboard (`/organizer`).
* The main operational intelligence system operates independently on simulated location-specific hardware streams and zone fusion logic.
