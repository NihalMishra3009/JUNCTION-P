"""
Unit tests for cv_bridge.observation_serializer
"""

import pytest
from datetime import datetime
from cv_bridge.observation_serializer import JunctionObservationSerializer


def test_serializer_basic_crowd_count():
    serializer = JunctionObservationSerializer(
        camera_id="DEV_CCTV_TEST_01",
        zone_id="ZONE_WANKHEDE",
        resource_id="WANKHEDE_EXIT",
        model_name="yolov12n.pt",
        is_simulated=False,
    )

    metrics = {
        "person_count": 14,
        "mean_confidence": 0.89,
        "density_people_per_sq_m": None,
        "inflow_count": None,
        "outflow_count": None,
        "active_track_ids": [1, 2, 3],
        "centroids": [(100, 200), (300, 400)],
    }

    obs_list = serializer.serialize_frame_observations(metrics, frame_index=42)
    assert len(obs_list) == 1
    obs = obs_list[0]

    assert obs["sourceId"] == "DEV_CCTV_TEST_01"
    assert obs["zoneId"] == "ZONE_WANKHEDE"
    assert obs["resourceId"] == "WANKHEDE_EXIT"
    assert obs["metricType"] == "CROWD_COUNT"
    assert obs["value"] == 14
    assert obs["unit"] == "persons"
    assert obs["confidence"] == 0.89
    assert obs["qualityStatus"] == "FRESH"
    assert obs["derivationType"] == "MEASURED"
    assert obs["schemaVersion"] == "1.0.0"

    # Verify timestamp format
    dt = datetime.fromisoformat(obs["observedAt"])
    assert dt is not None

    # Verify provenance metadata
    metadata = obs["metadata"]
    assert metadata["sourceMode"] == "VIDEO_CV"
    assert metadata["model"] == "yolov12n.pt"
    assert metadata["isSimulated"] is False
    assert metadata["frameIndex"] == 42


def test_serializer_with_calibrated_density_and_tripwire():
    serializer = JunctionObservationSerializer(
        camera_id="DEV_CCTV_TEST_02",
        zone_id="ZONE_CHURCHGATE",
        resource_id="CHURCHGATE",
    )

    metrics = {
        "person_count": 20,
        "mean_confidence": 0.94,
        "density_people_per_sq_m": 0.133,
        "inflow_count": 45,
        "outflow_count": 12,
        "active_track_ids": [1, 2],
        "centroids": [(50, 50)],
        "calibrated_area_sq_m": 150.0,
        "tripwire_configured": True,
    }

    obs_list = serializer.serialize_frame_observations(metrics, frame_index=100)
    assert len(obs_list) == 4  # COUNT, DENSITY, INFLOW, OUTFLOW

    types = [o["metricType"] for o in obs_list]
    assert "CROWD_COUNT" in types
    assert "DENSITY" in types
    assert "INFLOW_RATE" in types
    assert "OUTFLOW_RATE" in types

    density_obs = next(o for o in obs_list if o["metricType"] == "DENSITY")
    assert density_obs["value"] == 0.133
    assert density_obs["unit"] == "people/sqm"

    inflow_obs = next(o for o in obs_list if o["metricType"] == "INFLOW_RATE")
    assert inflow_obs["value"] == 45

    outflow_obs = next(o for o in obs_list if o["metricType"] == "OUTFLOW_RATE")
    assert outflow_obs["value"] == 12
