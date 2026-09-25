# JUNCTION Computer Vision Bridge (`cv_bridge`)

A modular, hardware-agnostic Computer Vision bridge that connects frame-by-frame **YOLOv12 object detection** and **ByteTrack tracking** with the **JUNCTION** event operations platform.

---

## 1. Architecture Overview

```text
[ MP4 Video / RTSP CCTV Stream ]
              │
              ▼
    [ cv_bridge/inference.py ]
    ├── OpenCV Frame Reader
    ├── YOLOv12 Pedestrian Detector (Strictly Class 0 'person')
    ├── ByteTrack Persistent Tracking & Trajectory Trails
    └── Bounded Centroid Buffering (Max 30 frames)
              │
              ▼
    [ cv_bridge/metrics.py ]
    ├── Visible Person Count (Instantaneous & Peak)
    ├── Calibrated Spatial Density (people/m²)
    └── Virtual Tripwire (Inbound/Outbound Line Crossing)
              │
              ▼
    [ cv_bridge/observation_serializer.py ]
    └── NormalizedObservation (JUNCTION Canonical Schema v1.0.0)
              │
              ▼
    [ cv_bridge/transport.py ]
    ├── JSON Lines File Emission (.jsonl)
    └── HTTP POST → /api/observations (JUNCTION Next.js Ingestion Pipeline)
```

---

## 2. Privacy & Governance Principles

1. **Strictly Aggregate Telemetry:** Emits only macro metrics (`CROWD_COUNT`, `DENSITY`, `INFLOW_RATE`, `OUTFLOW_RATE`).
2. **Zero Facial Recognition:** All facial detection, facial embeddings, and biometric identification models (`yolov8m-face.pt`, `face_det_yolov8m.py`) are strictly prohibited and excluded.
3. **No Person-Level Tracking Storage:** Trajectory coordinates are kept only in a volatile 30-frame ring buffer for line-crossing math and discarded immediately.

---

## 3. Quick Start & CLI Usage

### Prerequisites
```bash
python -m pip install -r cv_bridge/requirements.txt
```

### Running Inference on a Video File
```bash
python -m cv_bridge.inference \
  --video ./public/videos/demo_cctv.mp4 \
  --zone-id ZONE_WANKHEDE \
  --camera-id DEV_CCTV_WANKHEDE_01 \
  --resource-id WANKHEDE_EXIT \
  --model ./models/yolo/yolov12n.pt \
  --output ./artifacts/annotated_cctv.mp4 \
  --emit-jsonl ./artifacts/cctv_observations.jsonl \
  --http-url http://localhost:3000/api/observations \
  --tripwire-y 320 \
  --calibrated-area 150.0 \
  --frame-stride 2
```

---

## 4. CLI Parameters

| Flag | Default | Description |
|---|---|---|
| `--video` | *(Required)* | Path to input `.mp4` video file |
| `--zone-id` | `ZONE_WANKHEDE` | Target JUNCTION operational zone |
| `--camera-id` | `DEV_CCTV_WANKHEDE_01` | Device/Camera ID identifier |
| `--resource-id` | `WANKHEDE_EXIT` | Physical venue gate/concourse resource |
| `--model` | `models/yolo/yolov12n.pt` | Path to YOLOv12 weights (or `JUNCTION_YOLO_MODEL` env) |
| `--output` | `None` | Path to export annotated MP4 video |
| `--emit-jsonl` | `None` | Path to write observation JSONL stream |
| `--http-url` | `None` | JUNCTION API endpoint for live ingestion |
| `--tripwire-y` | `None` | Y-coordinate pixel threshold for line-crossing |
| `--calibrated-area`| `None` | Calibrated ground area in $m^2$ for density |
| `--frame-stride` | `1` | Process every Nth frame (performance tuning) |
| `--device` | `cpu` | Inference hardware (`cpu` or `cuda`) |

---

## 5. Running Automated Unit Tests
```bash
pytest cv_bridge/tests -v
```
