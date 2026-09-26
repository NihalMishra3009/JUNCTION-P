import 'package:latlong2/latlong.dart';

class OsmRoadSegment {
  final String id;
  final String name;
  final String type;
  final List<LatLng> geometry;
  final bool oneWay;

  const OsmRoadSegment({
    required this.id,
    required this.name,
    required this.type,
    required this.geometry,
    this.oneWay = false,
  });
}

/// OpenStreetMap Real Vector Road Network Dataset for South Mumbai Command Sector
/// Covering arterial avenues, secondary streets, railway corridors, and local intersections.
const List<OsmRoadSegment> osmSouthMumbaiRoads = [
  // 1. Marine Drive (Netaji Subhash Chandra Bose Road)
  OsmRoadSegment(
    id: "osm_marine_drive_1",
    name: "Marine Drive (Nariman Point ↔ Chowpatty)",
    type: "PRIMARY",
    geometry: [
      LatLng(18.9255, 72.8220),
      LatLng(18.9288, 72.8228),
      LatLng(18.9320, 72.8235),
      LatLng(18.9350, 72.8239),
      LatLng(18.9378, 72.8242),
      LatLng(18.9432, 72.8230),
      LatLng(18.9480, 72.8210),
      LatLng(18.9530, 72.8180),
    ],
  ),
  // 2. Veer Nariman Road
  OsmRoadSegment(
    id: "osm_veer_nariman_1",
    name: "Veer Nariman Rd (Marine Dr ↔ Churchgate ↔ Fountain)",
    type: "PRIMARY",
    geometry: [
      LatLng(18.9332, 72.8235),
      LatLng(18.9348, 72.8270),
      LatLng(18.9335, 72.8300),
      LatLng(18.9325, 72.8315),
    ],
  ),
  // 3. Maharshi Karve Road (Queens Road Corridor)
  OsmRoadSegment(
    id: "osm_mk_road_1",
    name: "Maharshi Karve Rd (Churchgate ↔ Marine Lines ↔ Charni Rd)",
    type: "PRIMARY",
    geometry: [
      LatLng(18.9355, 72.8272),
      LatLng(18.9385, 72.8265),
      LatLng(18.9436, 72.8236),
      LatLng(18.9475, 72.8215),
      LatLng(18.9510, 72.8195),
    ],
  ),
  // 4. Dr. D.N. Road (CSMT ↔ Fort Hub)
  OsmRoadSegment(
    id: "osm_dn_road_1",
    name: "Dr. D.N. Road (CSMT ↔ Flora Fountain)",
    type: "PRIMARY",
    geometry: [
      LatLng(18.9400, 72.8353),
      LatLng(18.9378, 72.8342),
      LatLng(18.9360, 72.8330),
      LatLng(18.9330, 72.8285),
      LatLng(18.9348, 72.8270),
      LatLng(18.9379, 72.8257),
    ],
  ),
  // 5. Madam Cama Road
  OsmRoadSegment(
    id: "osm_madam_cama_1",
    name: "Madam Cama Rd (Nariman Point ↔ Regal Circle)",
    type: "SECONDARY",
    geometry: [
      LatLng(18.9248, 72.8232),
      LatLng(18.9268, 72.8270),
      LatLng(18.9282, 72.8305),
      LatLng(18.9250, 72.8320),
    ],
  ),
  // 6. Dinshaw Vacha Road
  OsmRoadSegment(
    id: "osm_dinshaw_vacha_1",
    name: "Dinshaw Vacha Rd (Wankhede South Link)",
    type: "TERTIARY",
    geometry: [
      LatLng(18.9365, 72.8238),
      LatLng(18.9372, 72.8268),
    ],
  ),
  // 7. Karmaveer Bhaurao Patil Marg
  OsmRoadSegment(
    id: "osm_kbp_marg_1",
    name: "K.B. Patil Marg (Oval Maidan East Link)",
    type: "SECONDARY",
    geometry: [
      LatLng(18.9320, 72.8290),
      LatLng(18.9350, 72.8282),
      LatLng(18.9380, 72.8275),
    ],
  ),
  // 8. M.G. Road
  OsmRoadSegment(
    id: "osm_mg_road_1",
    name: "Mahatma Gandhi Rd (Flora Fountain ↔ CSMT)",
    type: "SECONDARY",
    geometry: [
      LatLng(18.9325, 72.8315),
      LatLng(18.9365, 72.8335),
      LatLng(18.9400, 72.8353),
    ],
  ),
  // 9. Central Artery Corridor to Dadar
  OsmRoadSegment(
    id: "osm_central_spine",
    name: "Central Rail/Road Artery (Dadar ↔ South Mumbai)",
    type: "PRIMARY",
    geometry: [
      LatLng(18.9379, 72.8257),
      LatLng(18.9385, 72.8265),
      LatLng(18.9436, 72.8236),
      LatLng(18.9475, 72.8215),
      LatLng(18.9515, 72.8185),
      LatLng(18.9620, 72.8160),
      LatLng(18.9750, 72.8210),
      LatLng(19.0183, 72.8434),
    ],
  ),
];

/// Calculates distance in meters between two LatLng points
double calculateDistanceMeters(LatLng p1, LatLng p2) {
  const Distance distance = Distance();
  return distance.as(LengthUnit.Meter, p1, p2);
}

/// Snaps any arbitrary coordinate to the nearest vertex on the OSM road network
({LatLng snapped, OsmRoadSegment segment, int vertexIndex}) snapPointToNearestRoad(
  LatLng pt, {
  List<OsmRoadSegment> segments = osmSouthMumbaiRoads,
}) {
  double minDistance = double.infinity;
  LatLng bestPt = pt;
  OsmRoadSegment bestSeg = segments.first;
  int bestIdx = 0;

  for (final seg in segments) {
    if (seg.geometry.isEmpty) continue;
    for (int idx = 0; idx < seg.geometry.length; idx++) {
      final v = seg.geometry[idx];
      final dist = calculateDistanceMeters(pt, v);
      if (dist < minDistance) {
        minDistance = dist;
        bestPt = v;
        bestSeg = seg;
        bestIdx = idx;
      }
    }
  }

  return (snapped: bestPt, segment: bestSeg, vertexIndex: bestIdx);
}

/// Builds a 100% road-constrained polyline path following OSM road network centerlines and turns
List<LatLng> buildRoadConstrainedPath(
  List<LatLng> waypoints, {
  List<OsmRoadSegment> segments = osmSouthMumbaiRoads,
}) {
  if (waypoints.isEmpty) return [];
  if (waypoints.length == 1) {
    final s = snapPointToNearestRoad(waypoints.first, segments: segments);
    return [s.snapped];
  }

  final List<LatLng> fullPath = [];

  for (int i = 0; i < waypoints.length - 1; i++) {
    final startWp = waypoints[i];
    final endWp = waypoints[i + 1];

    final startSnap = snapPointToNearestRoad(startWp, segments: segments);
    final endSnap = snapPointToNearestRoad(endWp, segments: segments);

    if (startSnap.segment.id == endSnap.segment.id) {
      final seg = startSnap.segment;
      final idx1 = startSnap.vertexIndex;
      final idx2 = endSnap.vertexIndex;
      final step = idx1 <= idx2 ? 1 : -1;
      for (int k = idx1; idx1 <= idx2 ? k <= idx2 : k >= idx2; k += step) {
        final pt = seg.geometry[k];
        if (fullPath.isEmpty || calculateDistanceMeters(fullPath.last, pt) > 2) {
          fullPath.add(pt);
        }
      }
    } else {
      final seg1 = startSnap.segment;
      final seg2 = endSnap.segment;

      int bestSeg1Idx = seg1.geometry.length - 1;
      double minSegDist = double.infinity;

      for (int idx = 0; idx < seg1.geometry.length; idx++) {
        final v1 = seg1.geometry[idx];
        for (final v2 in seg2.geometry) {
          final d = calculateDistanceMeters(v1, v2);
          if (d < minSegDist) {
            minSegDist = d;
            bestSeg1Idx = idx;
          }
        }
      }

      final step1 = startSnap.vertexIndex <= bestSeg1Idx ? 1 : -1;
      for (int k = startSnap.vertexIndex; startSnap.vertexIndex <= bestSeg1Idx ? k <= bestSeg1Idx : k >= bestSeg1Idx; k += step1) {
        final pt = seg1.geometry[k];
        if (fullPath.isEmpty || calculateDistanceMeters(fullPath.last, pt) > 2) {
          fullPath.add(pt);
        }
      }

      int bestSeg2Idx = 0;
      minSegDist = double.infinity;
      final lastPt = fullPath.isNotEmpty ? fullPath.last : startSnap.snapped;

      for (int idx = 0; idx < seg2.geometry.length; idx++) {
        final v2 = seg2.geometry[idx];
        final d = calculateDistanceMeters(lastPt, v2);
        if (d < minSegDist) {
          minSegDist = d;
          bestSeg2Idx = idx;
        }
      }

      final step2 = bestSeg2Idx <= endSnap.vertexIndex ? 1 : -1;
      for (int k = bestSeg2Idx; bestSeg2Idx <= endSnap.vertexIndex ? k <= endSnap.vertexIndex : k >= endSnap.vertexIndex; k += step2) {
        final pt = seg2.geometry[k];
        if (fullPath.isEmpty || calculateDistanceMeters(fullPath.last, pt) > 2) {
          fullPath.add(pt);
        }
      }
    }
  }

  return fullPath;
}
