"""
Unit tests for cv_bridge.metrics
"""

import pytest
from cv_bridge.metrics import (
    CrowdMetricsEngine,
    TripwireConfig,
    calculate_centroid,
    lines_intersect,
)


def test_calculate_centroid():
    bbox = (100.0, 200.0, 200.0, 400.0)
    cx, cy = calculate_centroid(bbox)
    assert cx == 150
    assert cy == 300


def test_lines_intersect():
    # Crossing vertical line with horizontal movement
    p1 = (100, 200)
    p2 = (100, 400)
    q1 = (50, 300)
    q2 = (150, 300)
    assert lines_intersect(p1, p2, q1, q2) is True

    # Parallel non-intersecting lines
    p3 = (50, 100)
    p4 = (150, 100)
    assert lines_intersect(p1, p2, p3, p4) is False


def test_empty_detection_frame():
    engine = CrowdMetricsEngine()
    result = engine.process_frame_tracks(detected_boxes=[], track_ids=[], confidences=[])
    assert result["person_count"] == 0
    assert result["mean_confidence"] == 0.0
    assert result["density_people_per_sq_m"] is None
    assert result["inflow_count"] is None
    assert result["outflow_count"] is None


def test_single_and_multiple_detections():
    engine = CrowdMetricsEngine(calibrated_area_sq_m=100.0)
    boxes = [(10, 10, 50, 50), (60, 60, 100, 100)]
    confidences = [0.90, 0.80]
    track_ids = [1, 2]

    result = engine.process_frame_tracks(boxes, track_ids, confidences)
    assert result["person_count"] == 2
    assert result["mean_confidence"] == 0.85
    assert result["density_people_per_sq_m"] == 0.02  # 2 / 100
    assert len(result["centroids"]) == 2


def test_density_with_zero_and_negative_area():
    engine_zero = CrowdMetricsEngine(calibrated_area_sq_m=0.0)
    assert engine_zero.calibrated_area_sq_m is None
    result = engine_zero.process_frame_tracks([(10, 10, 50, 50)])
    assert result["density_people_per_sq_m"] is None

    engine_neg = CrowdMetricsEngine(calibrated_area_sq_m=-50.0)
    assert engine_neg.calibrated_area_sq_m is None
    result_neg = engine_neg.process_frame_tracks([(10, 10, 50, 50)])
    assert result_neg["density_people_per_sq_m"] is None


def test_tripwire_line_crossing_and_duplicate_prevention():
    # Horizontal tripwire at y = 300
    tripwire = TripwireConfig(
        start_point=(0, 300),
        end_point=(600, 300),
        inbound_direction="DOWN",
        min_movement_pixels=10.0,
    )
    engine = CrowdMetricsEngine(tripwire=tripwire)

    # Frame 1: Person at y = 280 (above line)
    box_f1 = [(100, 260, 140, 300)]  # centroid y = 280
    engine.process_frame_tracks(box_f1, track_ids=[101], confidences=[0.95])
    assert engine.total_inflow == 0

    # Frame 2: Person moves to y = 320 (crosses line downward)
    box_f2 = [(100, 300, 140, 340)]  # centroid y = 320
    res_f2 = engine.process_frame_tracks(box_f2, track_ids=[101], confidences=[0.95])
    assert res_f2["inflow_count"] == 1
    assert engine.total_inflow == 1

    # Frame 3: Same person moves further down (should NOT double count)
    box_f3 = [(100, 330, 140, 370)]  # centroid y = 350
    res_f3 = engine.process_frame_tracks(box_f3, track_ids=[101], confidences=[0.95])
    assert res_f3["inflow_count"] == 1
    assert engine.total_inflow == 1


def test_missing_track_ids_handling():
    engine = CrowdMetricsEngine()
    boxes = [(10, 10, 50, 50), (100, 100, 150, 150)]
    # No track IDs provided
    result = engine.process_frame_tracks(boxes, track_ids=None, confidences=[0.88, 0.92])
    assert result["person_count"] == 2
    assert len(result["centroids"]) == 2
    assert result["active_track_ids"] == []
