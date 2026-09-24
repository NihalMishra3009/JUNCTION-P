"""
JUNCTION Computer Vision Bridge - Transport Module
Handles emission to JSONL files, stdout, and local HTTP delivery to JUNCTION ingestion API.
"""

import json
import os
import sys
from typing import Dict, List, Optional, Any
import requests


class ObservationTransport:
    """
    Delivers serialized observations to files, stdout, or the JUNCTION HTTP ingestion endpoint.
    """

    def __init__(
        self,
        jsonl_path: Optional[str] = None,
        http_url: Optional[str] = None,
        emit_stdout: bool = False,
        timeout_seconds: float = 3.0,
    ):
        self.jsonl_path = jsonl_path
        self.http_url = http_url
        self.emit_stdout = emit_stdout
        self.timeout_seconds = timeout_seconds

        self.delivered_count = 0
        self.failed_count = 0
        self.jsonl_file = None

        if self.jsonl_path:
            os.makedirs(os.path.dirname(os.path.abspath(self.jsonl_path)), exist_ok=True)
            self.jsonl_file = open(self.jsonl_path, "a", encoding="utf-8")

    def close(self):
        """Flushes and closes file handles."""
        if self.jsonl_file:
            self.jsonl_file.close()
            self.jsonl_file = None

    def emit_observations(self, observations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Emits a batch of observations across configured transport channels.
        """
        if not observations:
            return {"delivered": 0, "failed": 0, "http_status": None}

        # 1. JSON Lines file emission
        if self.jsonl_file:
            for obs in observations:
                self.jsonl_file.write(json.dumps(obs) + "\n")
            self.jsonl_file.flush()

        # 2. Stdout emission
        if self.emit_stdout:
            for obs in observations:
                sys.stdout.write(json.dumps(obs) + "\n")
            sys.stdout.flush()

        # 3. HTTP Delivery to JUNCTION API
        http_status = None
        if self.http_url:
            try:
                response = requests.post(
                    self.http_url,
                    json={"observations": observations},
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
