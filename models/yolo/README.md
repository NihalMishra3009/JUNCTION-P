# YOLOv12 Object Detection Models for JUNCTION CCTV Module

This directory contains pre-trained YOLOv12 object detection checkpoints utilized by the JUNCTION Computer Vision Bridge (`cv_bridge/`) for person detection and crowd metrics analysis during demonstration and replay simulations.

## Model Files

| Model Filename | Architecture | Parameters | File Size | Recommended Usage |
|---|---|---|---|---|
| `yolov12n.pt` | YOLOv12 Nano | ~2.6M | ~5.5 MB | **Default:** Real-time CPU/GPU demo inference, turnstile counting |
| `yolov12m.pt` | YOLOv12 Medium | ~20.2M | ~39.8 MB | High-precision tracking and complex occluded crowd scenes |

## Origin & Lineage

- **Base Architecture:** YOLOv12 real-time object detector framework ([Ultralytics](https://github.com/ultralytics/ultralytics) / YOLOv12 open-source models).
- **Domain:** Generic COCO-trained weights; class 0 (`person`) is strictly filtered during inference.
- **Reference Repository:** Acquired via reference repository `CS671-HACKATHON` ([github.com/codesensei-tushar/CS671-HACKATHON](https://github.com/codesensei-tushar/CS671-HACKATHON)).
- **JUNCTION Integration:** JUNCTION does not train or claim authorship of the core YOLOv12 network weights. JUNCTION integrates these weights via `cv_bridge/inference.py` to extract spatial tracking telemetry, calculate line-crossing flux (inflow/outflow), estimate physical density, and serialize normalized telemetry for the JUNCTION platform.

## Configuration & Usage

The model path is configurable in `cv_bridge/inference.py` via:
1. CLI Argument: `--model models/yolo/yolov12n.pt`
2. Environment Variable: `JUNCTION_YOLO_MODEL=models/yolo/yolov12n.pt`
3. Default Fallback: `<PROJECT_ROOT>/models/yolo/yolov12n.pt`

For complete licensing, third-party attributions, and privacy governance, refer to [docs/third-party-models.md](../../docs/third-party-models.md).
