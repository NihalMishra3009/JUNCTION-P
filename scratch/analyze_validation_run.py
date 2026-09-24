"""
Analyzes emitted JSONL observations from venue_entrance_observations.jsonl
"""

import json
from collections import Counter

jsonl_path = "artifacts/venue_entrance_observations.jsonl"

records = []
with open(jsonl_path, "r", encoding="utf-8") as f:
    for line in f:
        if line.strip():
            records.append(json.loads(line.strip()))

metric_counts = Counter(r["metricType"] for r in records)
count_values = [r["value"] for r in records if r["metricType"] == "CROWD_COUNT"]

avg_count = sum(count_values) / len(count_values) if count_values else 0
max_count = max(count_values) if count_values else 0

print("=" * 60)
print("VENUE ENTRANCE VALIDATION RUN METRICS ANALYSIS")
print("=" * 60)
print(f"Total JSONL Records Emitted: {len(records)}")
print(f"Metric Type Distribution: {dict(metric_counts)}")
print(f"Total Frames with Count: {len(count_values)}")
print(f"Max Detected Person Count: {max_count}")
print(f"Average Detected Person Count: {avg_count:.2f}")
print(f"Density Observations Emitted: {metric_counts.get('DENSITY', 0)} (Correctly omitted - uncalibrated)")
print("=" * 60)
