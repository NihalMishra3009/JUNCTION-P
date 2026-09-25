"""
JUNCTION Computer Vision Bridge - Real YOLOv12 + ByteTrack Inference Pipeline
Reads video frames, performs YOLOv12 person detection, tracks trajectories with ByteTrack,
calculates crowd metrics, annotates video, and transports observations to JUNCTION.
"""

import argparse
import os
import sys
import time
from typing import Optional

import cv2
import numpy as np
from ultralytics import YOLO

from cv_bridge.metrics import CrowdMetricsEngine, TripwireConfig
from cv_bridge.observation_serializer import JunctionObservationSerializer
from cv_bridge.transport import ObservationTransport
from cv_bridge.yolo_compat import apply_yolov12_compat_patch

# Apply architecture compatibility patch for dual-conv YOLOv12 checkpoints
apply_yolov12_compat_patch()


def resolve_model_path(model_arg: Optional[str] = None) -> str:
    """
    Resolves YOLOv12 model path with strict fallback order:
    1. Explicit model_arg passed via CLI or function parameter
    2. Environment variable 'JUNCTION_YOLO_MODEL'
    3. Documented default path: <PROJECT_ROOT>/models/yolo/yolov12n.pt
    """
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    default_model = os.path.join(project_root, "models", "yolo", "yolov12n.pt")

    if model_arg and model_arg.strip():
        candidate = os.path.abspath(model_arg) if not os.path.isabs(model_arg) else model_arg
        source = f"explicit argument ('{model_arg}')"
    elif os.environ.get("JUNCTION_YOLO_MODEL"):
        env_val = os.environ["JUNCTION_YOLO_MODEL"].strip()
        candidate = os.path.abspath(env_val) if not os.path.isabs(env_val) else env_val
        source = f"environment variable JUNCTION_YOLO_MODEL ('{env_val}')"
    else:
        candidate = default_model
        source = f"default path ('models/yolo/yolov12n.pt')"

    if not os.path.exists(candidate):
        raise FileNotFoundError(
            f"YOLO model weights not found at '{candidate}' (selected via {source}).\n"
            f"Please place 'yolov12n.pt' or 'yolov12m.pt' into 'models/yolo/' or specify a valid model via --model."
        )

    print(f"[*] Resolved YOLO model: '{os.path.basename(candidate)}' ({source}) -> {candidate}")
    return candidate


def run_pipeline(
    video_path: str,
    zone_id: str,
    camera_id: str,
    resource_id: Optional[str] = None,
    model_path: Optional[str] = None,
    output_video_path: Optional[str] = None,
    emit_jsonl_path: Optional[str] = None,
    http_url: Optional[str] = None,
    conf_threshold: float = 0.3,
    device: str = "cpu",
    frame_stride: int = 1,
    max_frames: Optional[int] = None,
    calibrated_area_sq_m: Optional[float] = None,
    tripwire_y: Optional[int] = None,
    emit_stdout: bool = False,
) -> dict:
    """
    Executes frame-by-frame computer-vision inference on the input video.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Input video file not found: {video_path}")

    resolved_model_path = resolve_model_path(model_path)

    print(f"[*] Initializing YOLOv12 detector from '{resolved_model_path}' on device '{device}'...")
    model = YOLO(resolved_model_path)
    model.to(device)

    # Configure tripwire if Y coordinate provided
    tripwire_config = None
    if tripwire_y is not None:
        # Tripwire horizontally across frame
        tripwire_config = TripwireConfig(
            start_point=(0, tripwire_y),
            end_point=(1920, tripwire_y),
            inbound_direction="DOWN",
            min_movement_pixels=8.0,
        )

    metrics_engine = CrowdMetricsEngine(
        calibrated_area_sq_m=calibrated_area_sq_m,
        tripwire=tripwire_config,
        max_track_history=30,
    )

    serializer = JunctionObservationSerializer(
        camera_id=camera_id,
        zone_id=zone_id,
        resource_id=resource_id,
        provider_name="YOLOv12-ByteTrack-Bridge",
        model_name=os.path.basename(resolved_model_path),
        is_simulated=False,
        video_source_name=os.path.basename(video_path),
    )

    transport = ObservationTransport(
        jsonl_path=emit_jsonl_path,
        http_url=http_url,
        emit_stdout=emit_stdout,
    )

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"OpenCV failed to open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if tripwire_config:
        tripwire_config.end_point = (width, tripwire_y)

    writer = None
    if output_video_path:
        os.makedirs(os.path.dirname(os.path.abspath(output_video_path)), exist_ok=True)
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(output_video_path, fourcc, fps / max(1, frame_stride), (width, height))

    frames_processed = 0
    frames_with_detections = 0
    max_visible_count = 0
    all_seen_track_ids = set()
    total_observations_emitted = 0
    start_time = time.time()

    print(f"[*] Starting inference on '{video_path}' ({width}x{height} @ {fps:.1f} FPS, {total_video_frames} total frames)...")

    frame_idx = 0
    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if max_frames and frames_processed >= max_frames:
                break

            frame_idx += 1
            if frame_idx % frame_stride != 0:
                continue

            frames_processed += 1

            # Run Ultralytics YOLO with ByteTrack persistence (filtered strictly to class 0 'person')
            results = model.track(
                source=frame,
                persist=True,
                conf=conf_threshold,
                classes=[0],  # COCO class 0 = person
                tracker="bytetrack.yaml",
                verbose=False,
            )[0]

            detected_boxes = []
            track_ids = []
            confidences = []

            if results.boxes is not None and len(results.boxes) > 0:
                frames_with_detections += 1
                for box in results.boxes:
                    coords = box.xyxy[0].cpu().numpy().tolist()
                    conf = float(box.conf[0].cpu().item())
                    tid = int(box.id[0].cpu().item()) if box.id is not None else None

                    detected_boxes.append(tuple(coords))
                    confidences.append(conf)
                    if tid is not None:
                        track_ids.append(tid)
                        all_seen_track_ids.add(tid)

            # Compute crowd metrics
            frame_metrics = metrics_engine.process_frame_tracks(
                detected_boxes=detected_boxes,
                track_ids=track_ids if len(track_ids) == len(detected_boxes) else None,
                confidences=confidences,
            )

            current_count = frame_metrics["person_count"]
            if current_count > max_visible_count:
                max_visible_count = current_count

            # Serialize and transmit observations
            observations = serializer.serialize_frame_observations(
                frame_metrics=frame_metrics,
                frame_index=frame_idx,
            )

            transport.emit_observations(observations)
            total_observations_emitted += len(observations)

            # Annotate Frame if output video is requested
            if writer:
                annotated = frame.copy()

                # 1. Draw Tripwire line if configured
                if tripwire_config:
                    cv2.line(
                        annotated,
                        tripwire_config.start_point,
                        tripwire_config.end_point,
                        (0, 165, 255),
                        2,
                    )
                    cv2.putText(
                        annotated,
                        "TRIPWIRE (Inbound/Outbound)",
                        (tripwire_config.start_point[0] + 10, tripwire_config.start_point[1] - 8),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        (0, 165, 255),
                        1,
                    )

                # 2. Draw detections, IDs, and centroids
                for i, box in enumerate(detected_boxes):
                    x1, y1, x2, y2 = map(int, box)
                    tid_label = f"ID:{track_ids[i]}" if i < len(track_ids) else "Person"
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(
                        annotated,
                        tid_label,
                        (x1, max(15, y1 - 6)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        (0, 255, 0),
                        1,
                    )
                    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                    cv2.circle(annotated, (cx, cy), 4, (0, 0, 255), -1)

                # 3. HUD Overlay
                overlay_text = f"JUNCTION CCTV | Frame: {frame_idx} | People: {current_count} | Max: {max_visible_count}"
                if frame_metrics.get("inflow_count") is not None:
                    overlay_text += f" | Inflow: {frame_metrics['inflow_count']} | Outflow: {frame_metrics['outflow_count']}"
                if frame_metrics.get("density_people_per_sq_m") is not None:
                    overlay_text += f" | Density: {frame_metrics['density_people_per_sq_m']} p/m2"

                cv2.rectangle(annotated, (0, 0), (width, 35), (20, 20, 20), -1)
                cv2.putText(
                    annotated,
                    overlay_text,
                    (12, 24),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.55,
                    (255, 255, 255),
                    2,
                )

                writer.write(annotated)

            if frames_processed % 30 == 0:
                print(f"[*] Processed {frames_processed} frames (Current count: {current_count}, Peak: {max_visible_count})...")

    finally:
        cap.release()
        if writer:
            writer.release()
        transport.close()

    elapsed = time.time() - start_time
    fps_measured = frames_processed / max(0.001, elapsed)

    summary = {
        "frames_processed": frames_processed,
        "frames_with_detections": frames_with_detections,
        "max_visible_person_count": max_visible_count,
        "unique_track_ids_count": len(all_seen_track_ids),
        "total_observations_emitted": total_observations_emitted,
        "total_observations_delivered": transport.delivered_count,
        "total_observations_failed": transport.failed_count,
        "elapsed_seconds": round(elapsed, 2),
        "measured_fps": round(fps_measured, 1),
        "annotated_video_created": output_video_path is not None and os.path.exists(output_video_path),
    }

    print("\n" + "=" * 70)
    print("JUNCTION CCTV INFERENCE PIPELINE SUMMARY")
    print("=" * 70)
    for k, v in summary.items():
        print(f"  • {k}: {v}")
    print("=" * 70 + "\n")

    return summary


def main():
    parser = argparse.ArgumentParser(description="JUNCTION YOLOv12 + ByteTrack CCTV Bridge")
    parser.add_argument("--video", required=True, help="Path to input video file (.mp4, .avi, etc.)")
    parser.add_argument("--zone-id", default="ZONE_WANKHEDE", help="JUNCTION zone ID")
    parser.add_argument("--camera-id", default="DEV_CCTV_WANKHEDE_01", help="CCTV camera ID")
    parser.add_argument("--resource-id", default="WANKHEDE_EXIT", help="Resource ID")
    parser.add_argument("--model", default=None, help="Path to YOLO weights (defaults to models/yolo/yolov12n.pt or JUNCTION_YOLO_MODEL env)")
    parser.add_argument("--output", default=None, help="Path to output annotated MP4 video")
    parser.add_argument("--emit-jsonl", default=None, help="Path to write JSONL observations")
    parser.add_argument("--http-url", default=None, help="JUNCTION observation API URL")
    parser.add_argument("--conf", type=float, default=0.3, help="Confidence threshold")
    parser.add_argument("--device", default="cpu", help="Inference device ('cpu' or 'cuda')")
    parser.add_argument("--frame-stride", type=int, default=1, help="Process every Nth frame")
    parser.add_argument("--max-frames", type=int, default=None, help="Max frames to process")
    parser.add_argument("--calibrated-area", type=float, default=None, help="Calibrated area in m2")
    parser.add_argument("--tripwire-y", type=int, default=None, help="Y pixel coord for horizontal tripwire")
    parser.add_argument("--emit-stdout", action="store_true", help="Print JSONL to stdout")

    args = parser.parse_args()

    run_pipeline(
        video_path=args.video,
        zone_id=args.zone_id,
        camera_id=args.camera_id,
        resource_id=args.resource_id,
        model_path=args.model,
        output_video_path=args.output,
        emit_jsonl_path=args.emit_jsonl,
        http_url=args.http_url,
        conf_threshold=args.conf,
        device=args.device,
        frame_stride=args.frame_stride,
        max_frames=args.max_frames,
        calibrated_area_sq_m=args.calibrated_area,
        tripwire_y=args.tripwire_y,
        emit_stdout=args.emit_stdout,
    )


if __name__ == "__main__":
    main()
