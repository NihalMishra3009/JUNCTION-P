"""
JUNCTION Computer Vision Bridge - Observation Serializer
Formats video inference metrics into canonical NormalizedObservation objects matching JUNCTION TypeScript contracts,
and serializes rich CCTV detection frame payloads for real-time browser canvas overlays.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
import uuid


class JunctionObservationSerializer:
    """
    Serializes computer-vision frame metrics into JUNCTION-compatible observations and CCTV frame telemetry.
    """

    def __init__(
        self,
        camera_id: str,
        zone_id: str,
        resource_id: Optional[str] = None,
        provider_name: str = "JUNCTION_VIDEO_CV",
        model_name: str = "yolov12n.pt",
        is_simulated: bool = False,
        video_source_name: str = "local_video_feed",
    ):
        self.camera_id = camera_id
        self.zone_id = zone_id
        self.resource_id = resource_id
        self.provider_name = provider_name
        self.model_name = model_name
        self.is_simulated = is_simulated
        self.video_source_name = video_source_name

    def serialize_cctv_frame_telemetry(
        self,
        frame_metrics: Dict[str, Any],
        frame_index: int,
        video_timestamp: Optional[float] = None,
        fps: float = 30.0,
        tripwire_y: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Produces a rich CCTV-specific detection frame payload for client-side bounding box / tracking overlay.
        """
        frame_w = frame_metrics.get("frame_width", 1920)
        frame_h = frame_metrics.get("frame_height", 1080)
        detections = frame_metrics.get("detections", [])

        norm_tripwire_y = None
        if tripwire_y is not None and frame_h > 0:
            norm_tripwire_y = round(tripwire_y / frame_h, 4)

        return {
            "cameraId": self.camera_id,
            "sourceProvider": "JUNCTION_VIDEO_CV",
            "videoTimestamp": video_timestamp if video_timestamp is not None else round(frame_index / max(1.0, fps), 3),
            "frameNumber": frame_index,
            "frameWidth": frame_w,
            "frameHeight": frame_h,
            "personCount": frame_metrics.get("person_count", len(detections)),
            "activeTracksCount": len(frame_metrics.get("active_track_ids", [])),
            "meanConfidence": frame_metrics.get("mean_confidence", 0.0),
            "inflow": frame_metrics.get("inflow_count"),
            "outflow": frame_metrics.get("outflow_count"),
            "tripwireY": tripwire_y,
            "tripwireNormalizedY": norm_tripwire_y,
            "detections": detections,
            "receivedAt": datetime.now(timezone.utc).isoformat(),
            "fps": fps,
        }

    def serialize_frame_observations(
        self,
        frame_metrics: Dict[str, Any],
        frame_index: int,
        timestamp_iso: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Produces a list of NormalizedObservation payloads for the frame metrics.
        Includes CROWD_COUNT, and conditionally DENSITY, INFLOW_RATE, OUTFLOW_RATE.
        """
        now_iso = timestamp_iso or datetime.now(timezone.utc).isoformat()
        observations: List[Dict[str, Any]] = []

        provenance = {
            "sourceMode": "VIDEO_CV",
            "videoSource": self.video_source_name,
            "model": self.model_name,
            "tracker": "ByteTrack",
            "isSimulated": self.is_simulated,
            "frameIndex": frame_index,
            "meanConfidence": frame_metrics.get("mean_confidence", 0.0),
            "activeTrackCount": len(frame_metrics.get("active_track_ids", [])),
            "calibratedAreaSqM": frame_metrics.get("calibrated_area_sq_m"),
            "tripwireConfigured": frame_metrics.get("tripwire_configured", False),
        }

        # 1. Primary CROWD_COUNT Observation
        person_count = frame_metrics["person_count"]
        count_obs_id = f"OBS_CV_COUNT_{self.camera_id}_{frame_index}_{uuid.uuid4().hex[:8]}"
        observations.append({
            "id": count_obs_id,
            "sourceId": self.camera_id,
            "sourceProvider": self.provider_name,
            "metricType": "CROWD_COUNT",
            "zoneId": self.zone_id,
            "resourceId": self.resource_id,
            "observedAt": now_iso,
            "receivedAt": now_iso,
            "value": person_count,
            "unit": "persons",
            "confidence": frame_metrics.get("mean_confidence", 0.85),
            "qualityStatus": "FRESH",
            "derivationType": "MEASURED" if not self.is_simulated else "SIMULATED",
            "freshnessSeconds": 0,
            "schemaVersion": "1.0.0",
            "metadata": {
                **provenance,
                "centroids": frame_metrics.get("centroids", []),
            },
        })

        # 2. DENSITY Observation (Only if physical area was calibrated)
        density_val = frame_metrics.get("density_people_per_sq_m")
        if density_val is not None:
            density_obs_id = f"OBS_CV_DENSITY_{self.camera_id}_{frame_index}_{uuid.uuid4().hex[:8]}"
            observations.append({
                "id": density_obs_id,
                "sourceId": self.camera_id,
                "sourceProvider": self.provider_name,
                "metricType": "DENSITY",
                "zoneId": self.zone_id,
                "resourceId": self.resource_id,
                "observedAt": now_iso,
                "receivedAt": now_iso,
                "value": density_val,
                "unit": "people/sqm",
                "confidence": frame_metrics.get("mean_confidence", 0.85),
                "qualityStatus": "FRESH",
                "derivationType": "MEASURED" if not self.is_simulated else "SIMULATED",
                "freshnessSeconds": 0,
                "schemaVersion": "1.0.0",
                "metadata": provenance,
            })

        # 3. Line-Crossing Inflow/Outflow (Only if tripwire was configured)
        inflow = frame_metrics.get("inflow_count")
        if inflow is not None:
            inflow_obs_id = f"OBS_CV_INFLOW_{self.camera_id}_{frame_index}_{uuid.uuid4().hex[:8]}"
            observations.append({
                "id": inflow_obs_id,
                "sourceId": self.camera_id,
                "sourceProvider": self.provider_name,
                "metricType": "INFLOW_RATE",
                "zoneId": self.zone_id,
                "resourceId": self.resource_id,
                "observedAt": now_iso,
                "receivedAt": now_iso,
                "value": inflow,
                "unit": "cumulative_persons",
                "confidence": 0.90,
                "qualityStatus": "FRESH",
                "derivationType": "MEASURED" if not self.is_simulated else "SIMULATED",
                "freshnessSeconds": 0,
                "schemaVersion": "1.0.0",
                "metadata": provenance,
            })

        outflow = frame_metrics.get("outflow_count")
        if outflow is not None:
            outflow_obs_id = f"OBS_CV_OUTFLOW_{self.camera_id}_{frame_index}_{uuid.uuid4().hex[:8]}"
            observations.append({
                "id": outflow_obs_id,
                "sourceId": self.camera_id,
                "sourceProvider": self.provider_name,
                "metricType": "OUTFLOW_RATE",
                "zoneId": self.zone_id,
                "resourceId": self.resource_id,
                "observedAt": now_iso,
                "receivedAt": now_iso,
                "value": outflow,
                "unit": "cumulative_persons",
                "confidence": 0.90,
                "qualityStatus": "FRESH",
                "derivationType": "MEASURED" if not self.is_simulated else "SIMULATED",
                "freshnessSeconds": 0,
                "schemaVersion": "1.0.0",
                "metadata": provenance,
            })

        return observations
