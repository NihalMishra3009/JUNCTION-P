"""
JUNCTION Computer Vision Bridge - Crowd Metrics Module
Calculates visible person counts, track centroids, directional line crossings (tripwire),
physical density, normalized bounding boxes, and ByteTrack movement trails.
"""

from typing import Dict, List, Optional, Tuple, Set, Any
from collections import defaultdict
import numpy as np


class TripwireConfig:
    def __init__(
        self,
        start_point: Tuple[int, int],
        end_point: Tuple[int, int],
        inbound_direction: str = "DOWN",  # "DOWN", "UP", "LEFT", "RIGHT"
        min_movement_pixels: float = 10.0,
    ):
        self.start_point = start_point
        self.end_point = end_point
        self.inbound_direction = inbound_direction
        self.min_movement_pixels = min_movement_pixels


def calculate_centroid(bbox: Tuple[float, float, float, float]) -> Tuple[int, int]:
    """
    Calculates integer (cx, cy) centroid from [x1, y1, x2, y2] bounding box.
    """
    x1, y1, x2, y2 = bbox
    cx = int(round((x1 + x2) / 2.0))
    cy = int(round((y1 + y2) / 2.0))
    return cx, cy


def ccw(A: Tuple[int, int], B: Tuple[int, int], C: Tuple[int, int]) -> bool:
    """
    Tests if points A, B, C are in counterclockwise order.
    """
    return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0])


def lines_intersect(
    p1: Tuple[int, int], p2: Tuple[int, int], q1: Tuple[int, int], q2: Tuple[int, int]
) -> bool:
    """
    Determines whether line segment p1->p2 intersects line segment q1->q2.
    """
    return ccw(p1, q1, q2) != ccw(p2, q1, q2) and ccw(p1, p2, q1) != ccw(p1, p2, q2)


class CrowdMetricsEngine:
    """
    Calculates frame-by-frame crowd dynamics from YOLO + ByteTrack tracker outputs.
    """

    def __init__(
        self,
        calibrated_area_sq_m: Optional[float] = None,
        tripwire: Optional[TripwireConfig] = None,
        max_track_history: int = 30,
    ):
        self.calibrated_area_sq_m = calibrated_area_sq_m if (calibrated_area_sq_m and calibrated_area_sq_m > 0) else None
        self.tripwire = tripwire
        self.max_track_history = max_track_history

        # State tracking
        self.track_history: Dict[int, List[Tuple[int, int]]] = defaultdict(list)
        self.total_inflow: int = 0
        self.total_outflow: int = 0
        self.crossed_tracks: Set[int] = set()  # Prevent duplicate counting per track

    def reset(self):
        """Resets state for a new video stream."""
        self.track_history.clear()
        self.total_inflow = 0
        self.total_outflow = 0
        self.crossed_tracks.clear()

    def process_frame_tracks(
        self,
        detected_boxes: List[Tuple[float, float, float, float]],
        track_ids: Optional[List[int]] = None,
        confidences: Optional[List[float]] = None,
        frame_width: int = 1920,
        frame_height: int = 1080,
    ) -> Dict[str, Any]:
        """
        Processes detections for the current frame and generates rich normalized telemetry.
        """
        person_count = max(0, len(detected_boxes))
        mean_confidence = float(np.mean(confidences)) if confidences and len(confidences) > 0 else 0.0

        # Physical density (strictly requires positive area calibration)
        density_sq_m: Optional[float] = None
        if self.calibrated_area_sq_m is not None:
            density_sq_m = round(person_count / self.calibrated_area_sq_m, 3)

        fw = max(1.0, float(frame_width))
        fh = max(1.0, float(frame_height))

        active_track_ids: List[int] = []
        centroids: List[Tuple[int, int]] = []
        detections: List[Dict[str, Any]] = []

        for i, box in enumerate(detected_boxes):
            x1, y1, x2, y2 = box
            conf = confidences[i] if confidences and i < len(confidences) else 0.0
            tid = track_ids[i] if track_ids and i < len(track_ids) else None
            if tid is not None:
                active_track_ids.append(tid)

            cx, cy = calculate_centroid(box)
            centroids.append((cx, cy))

            # Update bounded history for this track ID if valid
            history: List[Tuple[int, int]] = []
            if tid is not None:
                hist = self.track_history[tid]
                hist.append((cx, cy))
                if len(hist) > self.max_track_history:
                    hist.pop(0)
                history = hist

                # Line crossing tripwire evaluation
                if self.tripwire is not None and tid not in self.crossed_tracks and len(history) >= 2:
                    p_prev = history[-2]
                    p_curr = history[-1]

                    # Verify movement distance threshold
                    dx = p_curr[0] - p_prev[0]
                    dy = p_curr[1] - p_prev[1]
                    dist = (dx ** 2 + dy ** 2) ** 0.5

                    if dist >= self.tripwire.min_movement_pixels:
                        if lines_intersect(
                            p_prev, p_curr, self.tripwire.start_point, self.tripwire.end_point
                        ):
                            # Determine crossing direction relative to tripwire configuration
                            is_inbound = False
                            if self.tripwire.inbound_direction == "DOWN":
                                is_inbound = dy > 0
                            elif self.tripwire.inbound_direction == "UP":
                                is_inbound = dy < 0
                            elif self.tripwire.inbound_direction == "RIGHT":
                                is_inbound = dx > 0
                            elif self.tripwire.inbound_direction == "LEFT":
                                is_inbound = dx < 0

                            if is_inbound:
                                self.total_inflow += 1
                            else:
                                self.total_outflow += 1

                            self.crossed_tracks.add(tid)

            # Normalized bounding box [0, 1] for canvas alignment
            norm_x = max(0.0, min(1.0, round(x1 / fw, 5)))
            norm_y = max(0.0, min(1.0, round(y1 / fh, 5)))
            norm_w = max(0.0, min(1.0 - norm_x, round((x2 - x1) / fw, 5)))
            norm_h = max(0.0, min(1.0 - norm_y, round((y2 - y1) / fh, 5)))

            # Normalized centroid [0, 1]
            norm_cx = max(0.0, min(1.0, round(cx / fw, 5)))
            norm_cy = max(0.0, min(1.0, round(cy / fh, 5)))

            # Subtle trajectory trail (normalized coordinates of recent positions)
            trail_points = [
                {
                    "x": max(0.0, min(1.0, round(pt[0] / fw, 5))),
                    "y": max(0.0, min(1.0, round(pt[1] / fh, 5))),
                }
                for pt in history[-6:]
            ]

            detections.append({
                "trackId": tid,
                "classId": 0,
                "className": "person",
                "confidence": round(conf, 3),
                "bbox": {
                    "x": norm_x,
                    "y": norm_y,
                    "width": norm_w,
                    "height": norm_h,
                    "pixelX1": int(round(x1)),
                    "pixelY1": int(round(y1)),
                    "pixelX2": int(round(x2)),
                    "pixelY2": int(round(y2)),
                },
                "centroid": {
                    "x": norm_cx,
                    "y": norm_cy,
                    "pixelX": cx,
                    "pixelY": cy,
                },
                "trail": trail_points,
            })

        inflow_count = self.total_inflow if self.tripwire is not None else None
        outflow_count = self.total_outflow if self.tripwire is not None else None

        return {
            "person_count": person_count,
            "mean_confidence": round(mean_confidence, 3),
            "density_people_per_sq_m": density_sq_m,
            "inflow_count": inflow_count,
            "outflow_count": outflow_count,
            "active_track_ids": active_track_ids,
            "centroids": centroids,
            "calibrated_area_sq_m": self.calibrated_area_sq_m,
            "tripwire_configured": self.tripwire is not None,
            "detections": detections,
            "frame_width": int(frame_width),
            "frame_height": int(frame_height),
        }
