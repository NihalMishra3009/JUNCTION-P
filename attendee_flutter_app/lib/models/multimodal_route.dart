import 'package:latlong2/latlong.dart';
import 'types.dart';
import 'navigation_step.dart';
import 'route_option.dart';

enum SegmentType {
  walk,
  train,
  metro,
  drive,
}

extension SegmentTypeExtension on SegmentType {
  String get displayName {
    switch (this) {
      case SegmentType.walk:
        return "WALK";
      case SegmentType.train:
        return "TRAIN";
      case SegmentType.metro:
        return "METRO";
      case SegmentType.drive:
        return "ROAD";
    }
  }

  String get iconSymbol {
    switch (this) {
      case SegmentType.walk:
        return "🚶";
      case SegmentType.train:
        return "🚆";
      case SegmentType.metro:
        return "🚇";
      case SegmentType.drive:
        return "🚗";
    }
  }
}

class TransitStation {
  final String id;
  final String name;
  final String line;
  final LatLng location;
  final SegmentType lineType;
  final String code;

  const TransitStation({
    required this.id,
    required this.name,
    required this.line,
    required this.location,
    required this.lineType,
    this.code = '',
  });
}

class RouteSegment {
  final String id;
  final SegmentType type;
  final String name;
  final String fromName;
  final String toName;
  final LatLng startLocation;
  final LatLng endLocation;
  final List<LatLng> geometry;
  final double distanceMeters;
  final int durationSeconds;
  final String? lineName;
  final String? platform;
  final List<NavigationStep> steps;
  final double crowdScore;
  final String instruction;

  const RouteSegment({
    required this.id,
    required this.type,
    required this.name,
    required this.fromName,
    required this.toName,
    required this.startLocation,
    required this.endLocation,
    required this.geometry,
    required this.distanceMeters,
    required this.durationSeconds,
    this.lineName,
    this.platform,
    required this.steps,
    this.crowdScore = 0.3,
    required this.instruction,
  });

  String get formattedDuration {
    final mins = (durationSeconds / 60).ceil();
    return '$mins min';
  }

  String get formattedDistance {
    if (distanceMeters >= 1000) {
      return '${(distanceMeters / 1000).toStringAsFixed(1)} km';
    }
    return '${distanceMeters.round()} m';
  }
}

class MultimodalRoute {
  final String id;
  final String title;
  final TravelMode mode;
  final double totalDurationSeconds;
  final double totalWalkingMeters;
  final double totalDistanceMeters;
  final List<RouteSegment> segments;
  final double crowdScore;
  final double operationalRisk;
  final double junctionScore;
  final bool isRecommended;
  final String stationPressure;
  final String transitCrowding;
  final String summaryReason;
  final List<LatLng> fullGeometry;
  final int transferCount;

  const MultimodalRoute({
    required this.id,
    required this.title,
    required this.mode,
    required this.totalDurationSeconds,
    required this.totalWalkingMeters,
    required this.totalDistanceMeters,
    required this.segments,
    required this.crowdScore,
    required this.operationalRisk,
    required this.junctionScore,
    required this.isRecommended,
    required this.stationPressure,
    required this.transitCrowding,
    required this.summaryReason,
    required this.fullGeometry,
    this.transferCount = 0,
  });

  RouteOption toRouteOption({RouteStrategy strategy = RouteStrategy.balanced}) {
    final List<NavigationStep> allSteps = [];
    for (var seg in segments) {
      allSteps.add(NavigationStep(
        instruction: seg.instruction,
        maneuver: seg.type == SegmentType.walk
            ? "walk"
            : (seg.type == SegmentType.train ? "train" : (seg.type == SegmentType.metro ? "metro" : "drive")),
        distanceMeters: seg.distanceMeters,
        durationSeconds: seg.durationSeconds,
        location: seg.startLocation,
      ));
      allSteps.addAll(seg.steps);
    }

    String tag = "MULTIMODAL";
    if (mode == TravelMode.train) tag = "TRAIN";
    if (mode == TravelMode.metro) tag = "METRO";
    if (mode == TravelMode.walking) tag = "WALK";
    if (mode == TravelMode.driving) tag = "ROAD";

    return RouteOption(
      id: id,
      name: title,
      geometry: fullGeometry.isNotEmpty
          ? fullGeometry
          : (segments.isNotEmpty ? [segments.first.startLocation, segments.last.endLocation] : []),
      distanceMeters: totalDistanceMeters,
      durationSeconds: totalDurationSeconds.round(),
      crowdScore: crowdScore,
      congestionScore: operationalRisk,
      riskScore: operationalRisk,
      junctionScore: junctionScore,
      recommended: isRecommended,
      steps: allSteps,
      summaryReason: summaryReason,
      typeTag: tag,
      strategy: strategy,
      travelMode: mode,
      multimodalRoute: this,
    );
  }
}
