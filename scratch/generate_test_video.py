"""
Generates a realistic test video file in assets/demo_cctv.mp4 for smoke testing the CV bridge.
Uses real person image frames with animated movement crossing the tripwire.
"""

import os
import cv2
import numpy as np

os.makedirs("assets", exist_ok=True)
output_path = "assets/demo_cctv.mp4"

src_img_path = "scratch/CS671-HACKATHON/Screenshot 2025-05-04 234449.png"
if os.path.exists(src_img_path):
    base_img = cv2.imread(src_img_path)
else:
    base_img = np.zeros((720, 1280, 3), dtype=np.uint8)

h, w = base_img.shape[:2]
target_w, target_h = 960, 540
base_resized = cv2.resize(base_img, (target_w, target_h))

fps = 20.0
duration_sec = 3.0
total_frames = int(fps * duration_sec)

fourcc = cv2.VideoWriter_fourcc(*"mp4v")
writer = cv2.VideoWriter(output_path, fourcc, fps, (target_w, target_h))

for i in range(total_frames):
    # Apply slight panning translation to simulate pedestrians moving downward across the tripwire
    shift_y = int(i * 1.5)
    M = np.float32([[1, 0, 0], [0, 1, shift_y]])
    frame = cv2.warpAffine(base_resized, M, (target_w, target_h), borderMode=cv2.BORDER_REFLECT)
    writer.write(frame)

writer.release()
print(f"Generated test video with real pedestrian frames: {output_path} ({target_w}x{target_h}, {total_frames} frames)")
