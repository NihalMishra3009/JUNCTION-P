import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:latlong2/latlong.dart';
import '../models/types.dart';
import '../models/multimodal_route.dart';
import '../models/navigation_step.dart';
import 'routing_service.dart';

class TransitRoutingService {
  static const Distance _distanceCalc = Distance();

  // Comprehensive Mumbai Transit Network ("JUNCTION DEMO TRANSIT")
  static final List<TransitStation> stations = [
    // Western Railway
    const TransitStation(id: 'churchgate', name: 'Churchgate Station', line: 'Western Railway', location: LatLng(18.9322, 72.8264), lineType: SegmentType.train, code: 'CCG'),
    const TransitStation(id: 'marine_lines', name: 'Marine Lines Station', line: 'Western Railway', location: LatLng(18.9447, 72.8242), lineType: SegmentType.train, code: 'MEL'),
    const TransitStation(id: 'charni_road', name: 'Charni Road Station', line: 'Western Railway', location: LatLng(18.9517, 72.8189), lineType: SegmentType.train, code: 'CYR'),
    const TransitStation(id: 'grant_road', name: 'Grant Road Station', line: 'Western Railway', location: LatLng(18.9634, 72.8160), lineType: SegmentType.train, code: 'GTR'),
    const TransitStation(id: 'mumbai_central', name: 'Mumbai Central Station', line: 'Western Railway', location: LatLng(18.9696, 72.8193), lineType: SegmentType.train, code: 'MMCT'),
    const TransitStation(id: 'dadar_wr', name: 'Dadar Station (Western)', line: 'Western Railway', location: LatLng(19.0178, 72.8478), lineType: SegmentType.train, code: 'DDR_W'),
    const TransitStation(id: 'bandra', name: 'Bandra Station', line: 'Western Railway', location: LatLng(19.0544, 72.8402), lineType: SegmentType.train, code: 'BA'),
    const TransitStation(id: 'andheri_wr', name: 'Andheri Station (Western)', line: 'Western Railway', location: LatLng(19.1197, 72.8464), lineType: SegmentType.train, code: 'ADH_W'),
    const TransitStation(id: 'borivali', name: 'Borivali Station', line: 'Western Railway', location: LatLng(19.2290, 72.8572), lineType: SegmentType.train, code: 'BVI'),

    // Central Railway
    const TransitStation(id: 'csmt', name: 'CSMT Station', line: 'Central Railway', location: LatLng(18.9400, 72.8353), lineType: SegmentType.train, code: 'CSMT'),
    const TransitStation(id: 'byculla', name: 'Byculla Station', line: 'Central Railway', location: LatLng(18.9774, 72.8331), lineType: SegmentType.train, code: 'BY'),
    const TransitStation(id: 'dadar_cr', name: 'Dadar Hub (Central)', line: 'Central Railway', location: LatLng(19.0185, 72.8435), lineType: SegmentType.train, code: 'DDR_C'),
    const TransitStation(id: 'kurla', name: 'Kurla Station', line: 'Central Railway', location: LatLng(19.0657, 72.8794), lineType: SegmentType.train, code: 'CLA'),
    const TransitStation(id: 'ghatkopar_cr', name: 'Ghatkopar Station', line: 'Central Railway', location: LatLng(19.0860, 72.9080), lineType: SegmentType.train, code: 'GC'),
    const TransitStation(id: 'thane', name: 'Thane Terminal', line: 'Central Railway', location: LatLng(19.1860, 72.9759), lineType: SegmentType.train, code: 'TNA'),

    // Mumbai Metro Line 1 & Line 3
    const TransitStation(id: 'ghatkopar_metro', name: 'Ghatkopar Metro Station', line: 'Metro Line 1', location: LatLng(19.0868, 72.9088), lineType: SegmentType.metro, code: 'M_GC'),
    const TransitStation(id: 'andheri_metro', name: 'Andheri Metro Station', line: 'Metro Line 1', location: LatLng(19.1198, 72.8470), lineType: SegmentType.metro, code: 'M_ADH'),
    const TransitStation(id: 'marol_naka', name: 'Marol Naka Metro', line: 'Metro Line 1', location: LatLng(19.1090, 72.8830), lineType: SegmentType.metro, code: 'M_MN'),
    const TransitStation(id: 'bkc_metro', name: 'BKC Metro Station', line: 'Metro Line 3 (Aqua)', location: LatLng(19.0650, 72.8680), lineType: SegmentType.metro, code: 'M_BKC'),
  ];

  /// Finds useful stations near a given location filtered by direction, line type, and distance.
  static List<TransitStation> findNearestStations({
    required LatLng point,
    SegmentType? filterType,
    int maxLimit = 3,
  }) {
    final List<TransitStation> candidateList = stations.where((st) {
      if (filterType != null && st.lineType != filterType) return false;
      return true;
    }).toList();

    candidateList.sort((a, b) {
      final distA = _distanceCalc.as(LengthUnit.Meter, point, a.location);
      final distB = _distanceCalc.as(LengthUnit.Meter, point, b.location);
      return distA.compareTo(distB);
    });

    return candidateList.take(maxLimit).toList();
  }

  /// Calculates actual OSRM walking route from origin to a station.
  static Future<RouteSegment> calculateWalkingToStation({
    required LatLng origin,
    required TransitStation station,
  }) async {
    final routes = await RoutingService.getRoutes(
      origin: origin,
      destination: station.location,
      mode: TravelMode.walking,
    );

    final route = routes.first;
    return RouteSegment(
      id: 'walk_to_${station.id}',
      type: SegmentType.walk,
      name: 'Walk to ${station.name}',
      fromName: 'Current Location',
      toName: station.name,
      startLocation: origin,
      endLocation: station.location,
      geometry: route.geometry,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      steps: route.steps,
      instruction: 'Walk ${route.formattedDistance} (${route.formattedDuration}) to ${station.name}',
    );
  }

  /// Calculates actual OSRM walking route from a station to final destination.
  static Future<RouteSegment> calculateWalkingFromStation({
    required TransitStation station,
    required LatLng destination,
    required String destinationName,
  }) async {
    final routes = await RoutingService.getRoutes(
      origin: station.location,
      destination: destination,
      mode: TravelMode.walking,
    );

    final route = routes.first;
    return RouteSegment(
      id: 'walk_from_${station.id}',
      type: SegmentType.walk,
      name: 'Walk to $destinationName',
      fromName: station.name,
      toName: destinationName,
      startLocation: station.location,
      endLocation: destination,
      geometry: route.geometry,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      steps: route.steps,
      instruction: 'Walk ${route.formattedDistance} (${route.formattedDuration}) from ${station.name} to $destinationName',
    );
  }

  /// Calculates train journey between two rail stations.
  static Future<RouteSegment> calculateTrainJourney({
    required TransitStation originStation,
    required TransitStation destStation,
    required ScenarioId scenario,
  }) async {
    final double rawDistanceMeters = _distanceCalc.as(LengthUnit.Meter, originStation.location, destStation.location);
    // Average train speed 36 km/h (10 m/s) + 2 min per intermediate stop
    int baseDuration = (rawDistanceMeters / 10.0).round() + 180;

    // Apply scenario modifier
    if (scenario == ScenarioId.TRANSPORT_DISRUPTION && originStation.line.contains('Western')) {
      baseDuration = (baseDuration * 1.6).round(); // Heavy delay on Western Railway
    } else if (scenario == ScenarioId.POST_EVENT_SURGE) {
      baseDuration += 300; // Platform boarding delay
    }

    final List<LatLng> geom = _interpolateGeom(originStation.location, destStation.location, 15);

    return RouteSegment(
      id: 'train_${originStation.id}_${destStation.id}',
      type: SegmentType.train,
      name: '${originStation.line} Train',
      fromName: originStation.name,
      toName: destStation.name,
      startLocation: originStation.location,
      endLocation: destStation.location,
      geometry: geom,
      distanceMeters: rawDistanceMeters,
      durationSeconds: baseDuration,
      lineName: originStation.line,
      platform: originStation.line.contains('Western') ? 'Platform 1 / 2' : 'Platform 3',
      steps: [
        NavigationStep(
          instruction: 'Board ${originStation.line} train at ${originStation.name} towards ${destStation.name}',
          maneuver: 'board_train',
          distanceMeters: rawDistanceMeters,
          durationSeconds: baseDuration,
          location: originStation.location,
        ),
        NavigationStep(
          instruction: 'Alight from train at ${destStation.name}',
          maneuver: 'alight_train',
          distanceMeters: 0,
          durationSeconds: 0,
          location: destStation.location,
        ),
      ],
      instruction: 'Board ${originStation.line} train from ${originStation.name} to ${destStation.name}',
    );
  }

  /// Calculates metro journey between metro stations.
  static Future<RouteSegment> calculateMetroJourney({
    required TransitStation originStation,
    required TransitStation destStation,
    required ScenarioId scenario,
  }) async {
    final double rawDistanceMeters = _distanceCalc.as(LengthUnit.Meter, originStation.location, destStation.location);
    int baseDuration = (rawDistanceMeters / 12.0).round() + 120;

    if (scenario == ScenarioId.HEAVY_RAIN) {
      baseDuration = (baseDuration * 1.05).round(); // Metro rain resistance
    }

    final List<LatLng> geom = _interpolateGeom(originStation.location, destStation.location, 12);

    return RouteSegment(
      id: 'metro_${originStation.id}_${destStation.id}',
      type: SegmentType.metro,
      name: '${originStation.line} Metro',
      fromName: originStation.name,
      toName: destStation.name,
      startLocation: originStation.location,
      endLocation: destStation.location,
      geometry: geom,
      distanceMeters: rawDistanceMeters,
      durationSeconds: baseDuration,
      lineName: originStation.line,
      platform: 'Platform A',
      steps: [
        NavigationStep(
          instruction: 'Board ${originStation.line} at ${originStation.name} towards ${destStation.name}',
          maneuver: 'board_metro',
          distanceMeters: rawDistanceMeters,
          durationSeconds: baseDuration,
          location: originStation.location,
        ),
        NavigationStep(
          instruction: 'Exit Metro at ${destStation.name}',
          maneuver: 'alight_metro',
          distanceMeters: 0,
          durationSeconds: 0,
          location: destStation.location,
        ),
      ],
      instruction: 'Take ${originStation.line} Metro from ${originStation.name} to ${destStation.name}',
    );
  }

  /// Calculates station-to-station interchange transfer.
  static Future<RouteSegment?> calculateTransfers({
    required TransitStation fromStation,
    required TransitStation toStation,
  }) async {
    if (fromStation.id == toStation.id) return null;
    final double dist = _distanceCalc.as(LengthUnit.Meter, fromStation.location, toStation.location);
    if (dist > 1500) return null; // Too far for inline transfer

    final int transferTime = (dist / 1.1).round() + 180; // Skywalk/concourse walk + 3 min buffer
    return RouteSegment(
      id: 'transfer_${fromStation.id}_${toStation.id}',
      type: SegmentType.walk,
      name: 'Interchange Skywalk Transfer',
      fromName: fromStation.name,
      toName: toStation.name,
      startLocation: fromStation.location,
      endLocation: toStation.location,
      geometry: [fromStation.location, toStation.location],
      distanceMeters: dist,
      durationSeconds: transferTime,
      steps: [
        NavigationStep(
          instruction: 'Interchange: Walk via skywalk from ${fromStation.name} to ${toStation.name}',
          maneuver: 'transfer',
          distanceMeters: dist,
          durationSeconds: transferTime,
          location: fromStation.location,
        ),
      ],
      instruction: 'Interchange transfer from ${fromStation.name} to ${toStation.name}',
    );
  }

  /// Calculates total transit journey time including walk, wait, ride, transfer, and exit walk.
  static double calculateTotalJourneyTime(List<RouteSegment> segments, {int initialWaitSeconds = 240}) {
    double total = initialWaitSeconds.toDouble();
    for (var seg in segments) {
      total += seg.durationSeconds;
    }
    return total;
  }

  /// Evaluates station pressure and transit crowding based on scenario data.
  static Map<String, dynamic> calculateTransitCrowding({
    required List<TransitStation> routeStations,
    required ScenarioId scenario,
  }) {
    double maxStationPressure = 0.2;
    double maxTransitCrowding = 0.3;
    String pressureLabel = 'LOW';
    String crowdingLabel = 'LOW';

    for (var st in routeStations) {
      double stPress = 0.2;
      double trCrowd = 0.3;

      if (scenario == ScenarioId.POST_EVENT_SURGE) {
        if (st.id == 'churchgate') {
          stPress = 0.95;
          trCrowd = 0.90;
        } else if (st.id == 'csmt') {
          stPress = 0.78;
          trCrowd = 0.75;
        } else if (st.id.contains('dadar')) {
          stPress = 0.40;
          trCrowd = 0.45;
        }
      } else if (scenario == ScenarioId.TRANSPORT_DISRUPTION) {
        if (st.line.contains('Western')) {
          stPress = 0.90;
          trCrowd = 0.88;
        } else if (st.line.contains('Central')) {
          stPress = 0.75;
          trCrowd = 0.70;
        } else if (st.line.contains('Metro')) {
          stPress = 0.45;
          trCrowd = 0.50;
        }
      } else if (scenario == ScenarioId.HEAVY_RAIN) {
        stPress = 0.65;
        trCrowd = 0.60;
      }

      if (stPress > maxStationPressure) maxStationPressure = stPress;
      if (trCrowd > maxTransitCrowding) maxTransitCrowding = trCrowd;
    }

    if (maxStationPressure >= 0.85) {
      pressureLabel = 'CRITICAL';
    } else if (maxStationPressure >= 0.70) {
      pressureLabel = 'HIGH';
    } else if (maxStationPressure >= 0.45) {
      pressureLabel = 'MEDIUM';
    } else {
      pressureLabel = 'LOW';
    }

    if (maxTransitCrowding >= 0.80) {
      crowdingLabel = 'HIGH';
    } else if (maxTransitCrowding >= 0.50) {
      crowdingLabel = 'MEDIUM';
    } else {
      crowdingLabel = 'LOW';
    }

    return {
      'stationPressureScore': maxStationPressure,
      'transitCrowdingScore': maxTransitCrowding,
      'stationPressureLabel': pressureLabel,
      'transitCrowdingLabel': crowdingLabel,
    };
  }

  /// Calculates 5-factor JUNCTION Transit Composite Score (0.0 to 1.0, lower is better).
  /// Formula weights:
  /// - Travel Time (35%)
  /// - Walking Time (15%)
  /// - Station Pressure (20%)
  /// - Transit Crowding (20%)
  /// - Operational Risk (10%)
  static double calculateJunctionTransitScore({
    required double totalDurationSeconds,
    required double totalWalkingMeters,
    required double stationPressureScore,
    required double transitCrowdingScore,
    required ScenarioId scenario,
    required bool isWesternLine,
    double userPreferenceWeight = 0.0,
  }) {
    // 1. Time Norm (assumes baseline 30-45 min)
    final double timeNorm = (totalDurationSeconds / 3600.0).clamp(0.0, 1.0);

    // 2. Walking Norm (assumes baseline 1500m)
    double walkNorm = (totalWalkingMeters / 2500.0).clamp(0.0, 1.0);
    if (scenario == ScenarioId.HEAVY_RAIN) {
      walkNorm *= 1.5; // Rain walking exposure penalty
    }

    // 3. Operational Risk
    double opRisk = 0.2;
    if (scenario == ScenarioId.TRANSPORT_DISRUPTION && isWesternLine) {
      opRisk = 0.90; // High risk under Western disruption
    } else if (scenario == ScenarioId.POST_EVENT_SURGE) {
      opRisk = 0.60;
    }

    double compositeScore = (0.35 * timeNorm) +
        (0.15 * walkNorm) +
        (0.20 * stationPressureScore) +
        (0.20 * transitCrowdingScore) +
        (0.10 * opRisk);

    // Apply user preference discount if transit explicitly preferred
    if (userPreferenceWeight > 0.0) {
      compositeScore = (compositeScore - userPreferenceWeight).clamp(0.05, 1.0);
    }

    return compositeScore.clamp(0.0, 1.0);
  }

  /// Finds and constructs valid Multimodal Transit Routes between origin and destination.
  static Future<List<MultimodalRoute>> findTransitRoutes({
    required LatLng origin,
    required LatLng destination,
    required String destinationName,
    required ScenarioId scenario,
    TravelMode preferredMode = TravelMode.multimodal,
    double userPreferenceWeight = 0.0,
  }) async {
    final double totalDirectDistance = _distanceCalc.as(LengthUnit.Meter, origin, destination);

    // Section 6 & 25 check: If destination is very close (< 1.2 km walk to restaurant/place),
    // transit is not useful. Do not fabricate fake train routes for short walks!
    if (totalDirectDistance < 1200) {
      debugPrint('[TransitRoutingService] Direct distance ${totalDirectDistance.round()}m is too short for transit. Skipping transit generation.');
      return [];
    }

    final List<MultimodalRoute> results = [];

    // Option A: Western Railway Corridor (e.g., Churchgate / Marine Lines -> Dadar WR / Andheri WR / Borivali)
    final originStationsWR = findNearestStations(point: origin, filterType: SegmentType.train);
    final destStationsWR = findNearestStations(point: destination, filterType: SegmentType.train);

    if (originStationsWR.isNotEmpty && destStationsWR.isNotEmpty) {
      final originSt = originStationsWR.first;
      final destSt = destStationsWR.first;

      try {
        final walkToSeg = await calculateWalkingToStation(origin: origin, station: originSt);
        final trainSeg = await calculateTrainJourney(originStation: originSt, destStation: destSt, scenario: scenario);
        final walkFromSeg = await calculateWalkingFromStation(station: destSt, destination: destination, destinationName: destinationName);

        final List<RouteSegment> segments = [walkToSeg, trainSeg, walkFromSeg];
        final List<LatLng> fullGeom = [
          ...walkToSeg.geometry,
          ...trainSeg.geometry,
          ...walkFromSeg.geometry,
        ];

        final double totalWalkMeters = walkToSeg.distanceMeters + walkFromSeg.distanceMeters;
        final double totalDistMeters = totalWalkMeters + trainSeg.distanceMeters;
        final double totalDurationSecs = calculateTotalJourneyTime(segments, initialWaitSeconds: 240);

        final crowdingData = calculateTransitCrowding(routeStations: [originSt, destSt], scenario: scenario);
        final double stationPressureScore = crowdingData['stationPressureScore'] as double;
        final double transitCrowdingScore = crowdingData['transitCrowdingScore'] as double;

        final double jScore = calculateJunctionTransitScore(
          totalDurationSeconds: totalDurationSecs,
          totalWalkingMeters: totalWalkMeters,
          stationPressureScore: stationPressureScore,
          transitCrowdingScore: transitCrowdingScore,
          scenario: scenario,
          isWesternLine: originSt.line.contains('Western'),
          userPreferenceWeight: userPreferenceWeight,
        );

        String summary = 'Walk ${(walkToSeg.distanceMeters / 1000).toStringAsFixed(1)}k to ${originSt.name} → Train to ${destSt.name} → Walk to $destinationName.';
        if (scenario == ScenarioId.TRANSPORT_DISRUPTION && originSt.line.contains('Western')) {
          summary += ' (Warning: Western Line delays expected)';
        }

        results.add(MultimodalRoute(
          id: 'transit_wr_${originSt.id}_${destSt.id}',
          title: '🚆 ${originSt.line} + Walk',
          mode: TravelMode.train,
          totalDurationSeconds: totalDurationSecs,
          totalWalkingMeters: totalWalkMeters,
          totalDistanceMeters: totalDistMeters,
          segments: segments,
          crowdScore: transitCrowdingScore,
          operationalRisk: stationPressureScore,
          junctionScore: jScore,
          isRecommended: false,
          stationPressure: crowdingData['stationPressureLabel'] as String,
          transitCrowding: crowdingData['transitCrowdingLabel'] as String,
          summaryReason: summary,
          fullGeometry: fullGeom,
          transferCount: 0,
        ));
      } catch (e) {
        debugPrint('[TransitRoutingService] WR Route calc error: $e');
      }
    }

    // Option B: Central Railway Corridor (e.g. via Dadar Hub or CSMT)
    final originStationsCR = findNearestStations(point: origin, filterType: SegmentType.train)
        .where((s) => s.line.contains('Central') || s.id == 'csmt' || s.id.contains('dadar'))
        .toList();
    final destStationsCR = findNearestStations(point: destination, filterType: SegmentType.train)
        .where((s) => s.line.contains('Central') || s.id == 'csmt' || s.id.contains('dadar'))
        .toList();

    if (originStationsCR.isNotEmpty && destStationsCR.isNotEmpty) {
      final originSt = originStationsCR.first;
      final destSt = destStationsCR.first;

      if (originSt.id != destSt.id) {
        try {
          final walkToSeg = await calculateWalkingToStation(origin: origin, station: originSt);
          final trainSeg = await calculateTrainJourney(originStation: originSt, destStation: destSt, scenario: scenario);
          final walkFromSeg = await calculateWalkingFromStation(station: destSt, destination: destination, destinationName: destinationName);

          final List<RouteSegment> segments = [walkToSeg, trainSeg, walkFromSeg];
          final List<LatLng> fullGeom = [
            ...walkToSeg.geometry,
            ...trainSeg.geometry,
            ...walkFromSeg.geometry,
          ];

          final double totalWalkMeters = walkToSeg.distanceMeters + walkFromSeg.distanceMeters;
          final double totalDistMeters = totalWalkMeters + trainSeg.distanceMeters;
          final double totalDurationSecs = calculateTotalJourneyTime(segments, initialWaitSeconds: 180);

          final crowdingData = calculateTransitCrowding(routeStations: [originSt, destSt], scenario: scenario);
          final double stationPressureScore = crowdingData['stationPressureScore'] as double;
          final double transitCrowdingScore = crowdingData['transitCrowdingScore'] as double;

          final double jScore = calculateJunctionTransitScore(
            totalDurationSeconds: totalDurationSecs,
            totalWalkingMeters: totalWalkMeters,
            stationPressureScore: stationPressureScore,
            transitCrowdingScore: transitCrowdingScore,
            scenario: scenario,
            isWesternLine: false,
            userPreferenceWeight: userPreferenceWeight,
          );

          results.add(MultimodalRoute(
            id: 'transit_cr_${originSt.id}_${destSt.id}',
            title: '🚆 Central Line Bypass + Walk',
            mode: TravelMode.train,
            totalDurationSeconds: totalDurationSecs,
            totalWalkingMeters: totalWalkMeters,
            totalDistanceMeters: totalDistMeters,
            segments: segments,
            crowdScore: transitCrowdingScore,
            operationalRisk: stationPressureScore,
            junctionScore: jScore,
            isRecommended: false,
            stationPressure: crowdingData['stationPressureLabel'] as String,
            transitCrowding: crowdingData['transitCrowdingLabel'] as String,
            summaryReason: 'Central Line route avoiding Western Railway congestion.',
            fullGeometry: fullGeom,
            transferCount: 0,
          ));
        } catch (e) {
          debugPrint('[TransitRoutingService] CR Route calc error: $e');
        }
      }
    }

    // Option C: Mumbai Metro Corridor (Metro Line 1 / Line 3)
    final originMetro = findNearestStations(point: origin, filterType: SegmentType.metro);
    final destMetro = findNearestStations(point: destination, filterType: SegmentType.metro);

    if (originMetro.isNotEmpty && destMetro.isNotEmpty) {
      final originSt = originMetro.first;
      final destSt = destMetro.first;

      try {
        final walkToSeg = await calculateWalkingToStation(origin: origin, station: originSt);
        final metroSeg = await calculateMetroJourney(originStation: originSt, destStation: destSt, scenario: scenario);
        final walkFromSeg = await calculateWalkingFromStation(station: destSt, destination: destination, destinationName: destinationName);

        final List<RouteSegment> segments = [walkToSeg, metroSeg, walkFromSeg];
        final List<LatLng> fullGeom = [
          ...walkToSeg.geometry,
          ...metroSeg.geometry,
          ...walkFromSeg.geometry,
        ];

        final double totalWalkMeters = walkToSeg.distanceMeters + walkFromSeg.distanceMeters;
        final double totalDistMeters = totalWalkMeters + metroSeg.distanceMeters;
        final double totalDurationSecs = calculateTotalJourneyTime(segments, initialWaitSeconds: 180);

        final crowdingData = calculateTransitCrowding(routeStations: [originSt, destSt], scenario: scenario);
        final double stationPressureScore = crowdingData['stationPressureScore'] as double;
        final double transitCrowdingScore = crowdingData['transitCrowdingScore'] as double;

        final double jScore = calculateJunctionTransitScore(
          totalDurationSeconds: totalDurationSecs,
          totalWalkingMeters: totalWalkMeters,
          stationPressureScore: stationPressureScore,
          transitCrowdingScore: transitCrowdingScore,
          scenario: scenario,
          isWesternLine: false,
          userPreferenceWeight: userPreferenceWeight,
        );

        results.add(MultimodalRoute(
          id: 'transit_metro_${originSt.id}_${destSt.id}',
          title: '🚇 ${originSt.line} + Walk',
          mode: TravelMode.metro,
          totalDurationSeconds: totalDurationSecs,
          totalWalkingMeters: totalWalkMeters,
          totalDistanceMeters: totalDistMeters,
          segments: segments,
          crowdScore: transitCrowdingScore,
          operationalRisk: stationPressureScore,
          junctionScore: jScore,
          isRecommended: false,
          stationPressure: crowdingData['stationPressureLabel'] as String,
          transitCrowding: crowdingData['transitCrowdingLabel'] as String,
          summaryReason: 'Covered Metro corridor with predictable travel times.',
          fullGeometry: fullGeom,
          transferCount: 0,
        ));
      } catch (e) {
        debugPrint('[TransitRoutingService] Metro Route calc error: $e');
      }
    }

    return results;
  }

  static List<LatLng> _interpolateGeom(LatLng from, LatLng to, int steps) {
    final List<LatLng> points = [];
    for (int i = 0; i <= steps; i++) {
      final double t = i / steps.toDouble();
      final double lat = from.latitude + (to.latitude - from.latitude) * t;
      final double lng = from.longitude + (to.longitude - from.longitude) * t;
      // Add slight curved arc for rail aesthetic
      final double arcOffset = math.sin(t * math.pi) * 0.003;
      points.add(LatLng(lat + arcOffset, lng + (arcOffset * 0.5)));
    }
    return points;
  }
}
