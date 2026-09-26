"""
JUNCTION Computer Vision Bridge - Transport Module
Handles emission to JSONL files, stdout, and local HTTP delivery to JUNCTION ingestion API,
including rich per-frame CCTV detection payloads for real-time browser overlays.
"""

import json
import os
import sys
from typing import Dict, List, Optional, Any
import requests


class ObservationTransport:
    """
    Delivers serialized observations and CCTV frame detections to files, stdout, or the JUNCTION HTTP ingestion endpoint.
    Uses persistent HTTP connection pooling for sub-millisecond local telemetry transport.
    """

    def __init__(
        self,
        jsonl_path: Optional[str] = None,
        http_url: Optional[str] = None,
        emit_stdout: bool = False,
        timeout_seconds: float = 2.0,
    ):
        self.jsonl_path = jsonl_path
        self.http_url = http_url
        self.emit_stdout = emit_stdout
        self.timeout_seconds = timeout_seconds

        self.delivered_count = 0
        self.failed_count = 0
        self.jsonl_file = None
        self.session = requests.Session()

        if self.jsonl_path:
            os.makedirs(os.path.dirname(os.path.abspath(self.jsonl_path)), exist_ok=True)
            self.jsonl_file = open(self.jsonl_path, "a", encoding="utf-8")

    def close(self):
        """Flushes and closes file handles and HTTP session."""
        if self.jsonl_file:
            self.jsonl_file.close()
            self.jsonl_file = None
        if self.session:
            self.session.close()

    def emit_observations(
        self,
        observations: List[Dict[str, Any]],
        cctv_frame: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Emits a batch of observations and optional CCTV detection frame across configured transport channels.
        """
        if not observations and not cctv_frame:
            return {"delivered": 0, "failed": 0, "http_status": None}

        # 1. JSON Lines file emission
        if self.jsonl_file and observations:
            for obs in observations:
                self.jsonl_file.write(json.dumps(obs) + "\n")
            self.jsonl_file.flush()

        # 2. Stdout emission
        if self.emit_stdout and observations:
            for obs in observations:
                sys.stdout.write(json.dumps(obs) + "\n")
            sys.stdout.flush()

        # 3. HTTP Delivery to JUNCTION API with connection reuse
        http_status = None
        if self.http_url:
            payload: Dict[str, Any] = {}
            if observations:
                payload["observations"] = observations
            if cctv_frame:
                payload["cctvFrame"] = cctv_frame

            try:
                response = self.session.post(
                    self.http_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=self.timeout_seconds,
                )
                http_status = response.status_code
                if response.status_code in (200, 201):
                    self.delivered_count += len(observations)
                else:
                    self.failed_count += len(observations)
            except Exception:
                self.failed_count += len(observations)
        else:
            self.delivered_count += len(observations)

        return {
            "delivered": len(observations) if (not self.http_url or http_status in (200, 201)) else 0,
            "failed": len(observations) if (self.http_url and http_status not in (200, 201)) else 0,
            "http_status": http_status,
        }
