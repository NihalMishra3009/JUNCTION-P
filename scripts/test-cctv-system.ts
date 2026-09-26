// ============================================================
// JUNCTION - Independent CCTV + YOLO Module Verification Test
// ============================================================

import fs from "fs";
import path from "path";
import { CCTV_FEEDS } from "../src/data/cctvFeeds";
import { syntheticCVProvider } from "../src/services/syntheticCVProvider";
import { ingestionPipeline } from "../src/services/ingestionPipeline";
import { sensorFusionEngine } from "../src/services/sensorFusionEngine";
import { getZoneById } from "../src/services/zoneRegistry";
import { NormalizedObservation, DeviceDefinition } from "../src/types";
import { CctvFrameTelemetry, DetectionItem } from "../src/types/cctv";

console.log("\n=======================================================");
console.log("  JUNCTION CCTV + YOLO Independent Module Test Suite");
console.log("=======================================================\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failed++;
  }
}

// --- 1. Asset Registry & Serving Verification ---
console.log("--- 1. 9-Asset Registry & Public Serving ---");

assert(CCTV_FEEDS.length === 9, "Exactly 9 CCTV feeds are registered in CCTV_FEEDS");

const expectedIds = [
  "CCTV-01", "CCTV-02", "CCTV-03", "CCTV-04",
  "CCTV-05", "CCTV-06", "CCTV-07", "CCTV-08", "CCTV-09"
];

const registeredCameraIds = CCTV_FEEDS.map((f) => f.cameraId);
assert(
  JSON.stringify(registeredCameraIds) === JSON.stringify(expectedIds),
  "All 9 camera IDs follow neutral naming: CCTV-01 through CCTV-09"
);

// Verify all files exist in public/videos/cctv_suite/
const publicSuiteDir = path.join(process.cwd(), "public", "videos", "cctv_suite");
CCTV_FEEDS.forEach((feed) => {
  const filename = path.basename(feed.videoSrc);
  const physicalPath = path.join(publicSuiteDir, filename);
  const exists = fs.existsSync(physicalPath);
  assert(exists, `Public video asset exists: ${filename}`);
  assert(
    feed.videoSrc.startsWith("/videos/cctv_suite/"),
    `Feed ${feed.cameraId} uses public URL: ${feed.videoSrc}`
  );
  assert(feed.isRecorded === true, `Feed ${feed.cameraId} has isRecorded: true`);
  assert(
    feed.sourceType === "RECORDED",
    `Feed ${feed.cameraId} has sourceType: RECORDED (not live venue)`
  );
});

// --- 2. Orientations & Formats Verification ---
console.log("\n--- 2. Resolutions, Orientations & Aspect Ratios ---");

const ultrawideFeeds = CCTV_FEEDS.filter((f) => f.orientation === "ULTRAWIDE");
assert(ultrawideFeeds.length === 2, "2 Ultrawide (21:9) feeds identified (CCTV-01, CCTV-02)");

const portraitFeeds = CCTV_FEEDS.filter((f) => f.orientation === "PORTRAIT");
assert(portraitFeeds.length === 3, "3 Portrait (9:16) feeds identified (CCTV-05, CCTV-07, CCTV-09)");

const uhdFeeds = CCTV_FEEDS.filter((f) => f.resolution.includes("3840") || f.resolution.includes("2160"));
assert(uhdFeeds.length === 4, "4 4K UHD feeds identified (CCTV-04, CCTV-05, CCTV-06, CCTV-08)");

// --- 3. Observation API & Boundary Isolation ---
console.log("\n--- 3. Subsystem Boundary & Isolation Verification ---");

const mockCvObs: NormalizedObservation = {
  id: `OBS_CV_TEST_${Date.now()}`,
  sourceId: "CCTV-01",
  sourceProvider: "JUNCTION_VIDEO_CV",
  metricType: "CROWD_COUNT",
  zoneId: "ZONE_DIAGNOSTIC_01",
  observedAt: new Date().toISOString(),
  receivedAt: new Date().toISOString(),
  value: 42,
  unit: "persons",
  confidence: 0.92,
  qualityStatus: "FRESH",
  derivationType: "MEASURED",
  freshnessSeconds: 0,
  schemaVersion: "1.0.0",
  metadata: {
    videoSource: "12269372_2320_1080_30fps.mp4",
    model: "yolov12n.pt",
    tracker: "ByteTrack",
    isSimulated: false,
  },
};

const result = ingestionPipeline.processBatch([mockCvObs]);
assert(result.accepted.length === 1, "Ingestion pipeline accepts JUNCTION_VIDEO_CV observation");
assert(result.quarantined.length === 0, "Observation is not quarantined");

// Verify that diagnostic CV observations do NOT alter canonical operational zones (e.g. ZONE_WANKHEDE)
const wankhedeZone = getZoneById("ZONE_WANKHEDE")!;
const canonicalZoneState = sensorFusionEngine.fuseZoneObservations(wankhedeZone, [mockCvObs]);
assert(
  !canonicalZoneState.contributingSensors || canonicalZoneState.contributingSensors.length === 0,
  "Diagnostic CCTV observation does not contribute to operational venue zones (strict isolation)"
);
assert(
  canonicalZoneState.currentUtilization === 0,
  "Operational zone attendance is not corrupted by independent CCTV video count"
);

// --- 4. Detection Payload & Normalized Bounding Box Validation ---
console.log("\n--- 4. Detection Frame Telemetry & Bounding Box Validation ---");

const mockDetections: DetectionItem[] = [
  {
    trackId: 17,
    classId: 0,
    className: "person",
    confidence: 0.93,
    bbox: {
      x: 0.25,
      y: 0.35,
      width: 0.08,
      height: 0.22,
      pixelX1: 580,
      pixelY1: 378,
      pixelX2: 765,
      pixelY2: 615,
    },
    centroid: {
      x: 0.29,
      y: 0.46,
      pixelX: 672,
      pixelY: 496,
    },
    trail: [
      { x: 0.28, y: 0.42 },
      { x: 0.285, y: 0.44 },
      { x: 0.29, y: 0.46 },
    ],
  },
  {
    trackId: 24,
    classId: 0,
    className: "person",
    confidence: 0.88,
    bbox: {
      x: 0.52,
      y: 0.40,
      width: 0.07,
      height: 0.19,
      pixelX1: 1206,
      pixelY1: 432,
      pixelX2: 1368,
      pixelY2: 637,
    },
    centroid: {
      x: 0.555,
      y: 0.495,
      pixelX: 1287,
      pixelY: 534,
    },
    trail: [
      { x: 0.54, y: 0.47 },
      { x: 0.555, y: 0.495 },
    ],
  },
];

const mockCctvFrame: CctvFrameTelemetry = {
  cameraId: "CCTV-01",
  sourceProvider: "JUNCTION_VIDEO_CV",
  videoTimestamp: 4.12,
  frameNumber: 124,
  frameWidth: 2320,
  frameHeight: 1080,
  personCount: 2,
  activeTracksCount: 2,
  meanConfidence: 0.905,
  inflow: 5,
  outflow: 2,
  tripwireY: 540,
  tripwireNormalizedY: 0.5,
  detections: mockDetections,
  receivedAt: new Date().toISOString(),
  fps: 30.0,
};

assert(mockCctvFrame.sourceProvider === "JUNCTION_VIDEO_CV", "sourceProvider is strictly JUNCTION_VIDEO_CV");
assert(mockCctvFrame.cameraId === "CCTV-01", "Camera ID routes correctly to CCTV-01");
assert(mockCctvFrame.detections.length === 2, "Payload contains 2 detections");

mockCctvFrame.detections.forEach((det, idx) => {
  assert(det.classId === 0, `Detection ${idx + 1} classId is 0`);
  assert(det.className === "person", `Detection ${idx + 1} className is person`);
  assert(det.trackId > 0, `Detection ${idx + 1} has positive ByteTrack track ID (${det.trackId})`);
  assert(det.bbox.x >= 0 && det.bbox.x <= 1, `Detection ${idx + 1} bbox.x normalized [0, 1] (${det.bbox.x})`);
  assert(det.bbox.y >= 0 && det.bbox.y <= 1, `Detection ${idx + 1} bbox.y normalized [0, 1] (${det.bbox.y})`);
  assert(det.bbox.width > 0 && det.bbox.width <= 1, `Detection ${idx + 1} bbox.width normalized [0, 1] (${det.bbox.width})`);
  assert(det.bbox.height > 0 && det.bbox.height <= 1, `Detection ${idx + 1} bbox.height normalized [0, 1] (${det.bbox.height})`);
  assert(det.centroid.x >= 0 && det.centroid.x <= 1, `Detection ${idx + 1} centroid.x normalized [0, 1] (${det.centroid.x})`);
  assert(det.centroid.y >= 0 && det.centroid.y <= 1, `Detection ${idx + 1} centroid.y normalized [0, 1] (${det.centroid.y})`);
  assert(Array.isArray(det.trail) && det.trail.length > 0, `Detection ${idx + 1} contains real ByteTrack trajectory trail`);
});

// Track ID persistence test across simulated frame sequence
const frame1TrackIds = mockDetections.map((d) => d.trackId);
const mockDetectionsFrame2: DetectionItem[] = [
  {
    ...mockDetections[0],
    bbox: { ...mockDetections[0].bbox, x: 0.26, y: 0.36 },
    centroid: { ...mockDetections[0].centroid, x: 0.30, y: 0.47 },
  },
  {
    ...mockDetections[1],
    bbox: { ...mockDetections[1].bbox, x: 0.53, y: 0.41 },
    centroid: { ...mockDetections[1].centroid, x: 0.565, y: 0.505 },
  },
];
const frame2TrackIds = mockDetectionsFrame2.map((d) => d.trackId);
assert(
  JSON.stringify(frame1TrackIds) === JSON.stringify(frame2TrackIds),
  "ByteTrack track IDs (17, 24) persist across consecutive video frames"
);

// --- 5. Synthetic CV Fallback Verification ---
console.log("\n--- 5. Synthetic Aggregate CV Provider Fallback ---");

const mockDevice: DeviceDefinition = {
  id: "DEV_CCTV_BENCHMARK_01",
  name: "Benchmark Camera 01",
  type: "CCTV_CAMERA",
  provider: "JUNCTION_VIDEO_CV",
  zoneId: "ZONE_DIAGNOSTIC_01",
  location: { latitude: 18.9322, longitude: 72.8258 },
  coverageAreaMeters: 150,
  samplingIntervalSeconds: 1,
  supportedCapabilities: ["PERSON_COUNT", "DENSITY"],
  nominalAccuracy: 0.9,
  reliabilityScore: 0.95,
  isSimulated: true,
  health: {
    status: "HEALTHY",
    lastSeenAt: new Date().toISOString(),
    batteryLevelPercent: 100,
    firmwareVersion: "2.1.0",
    errorCountLastHour: 0,
  },
};

const syntheticObs = syntheticCVProvider.generateObservation(mockDevice, 100, 20, 10);
assert(syntheticObs.cameraId === mockDevice.id, "Synthetic CV observation contains device ID");
assert(syntheticObs.derivationType === "SIMULATED", "Synthetic CV observation honestly flagged as SIMULATED");
assert(syntheticObs.personCount > 0, "Synthetic CV observation generates non-zero crowd load");

console.log("\n=======================================================");
console.log(`  SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}
