import 'package:latlong2/latlong.dart';
import 'types.dart';
import 'navigation_step.dart';
import 'multimodal_route.dart';

class RouteOption {
  final String id;
  final String name;
  final List<LatLng> geometry;
  final double distanceMeters;
  final int durationSeconds;
  final double crowdScore; // 0.0 (low) to 1.0 (critical)
  final double congestionScore;
  final double riskScore;
  final double junctionScore; // Weighted composite score (lower is better)
  final bool recommended;
  final List<NavigationStep> steps;
  final String summaryReason;
  final String typeTag; // FASTEST, BALANCED, LOW_CROWD, TRAIN, METRO, MULTIMODAL
  final RouteStrategy strategy;
  final TravelMode travelMode;
  final MultimodalRoute? multimodalRoute;

  const RouteOption({
    required this.id,
    required this.name,
    required this.geometry,
    required this.distanceMeters,
    required this.durationSeconds,
    required this.crowdScore,
    required this.congestionScore,
    required this.riskScore,
    required this.junctionScore,
    required this.recommended,
    required this.steps,
    required this.summaryReason,
    this.typeTag = 'BALANCED',
    this.strategy = RouteStrategy.balanced,
    this.travelMode = TravelMode.driving,
    this.multimodalRoute,
  });

  RouteOption copyWith({
    String? id,
    String? name,
    List<LatLng>? geometry,
    double? distanceMeters,
    int? durationSeconds,
    double? crowdScore,
    double? congestionScore,
    double? riskScore,
    double? junctionScore,
    bool? recommended,
    List<NavigationStep>? steps,
    String? summaryReason,
    String? typeTag,
    RouteStrategy? strategy,
    TravelMode? travelMode,
    MultimodalRoute? multimodalRoute,
  }) {
    return RouteOption(
      id: id ?? this.id,
      name: name ?? this.name,
      geometry: geometry ?? this.geometry,
      distanceMeters: distanceMeters ?? this.distanceMeters,
      durationSeconds: durationSeconds ?? this.durationSeconds,
      crowdScore: crowdScore ?? this.crowdScore,
      congestionScore: congestionScore ?? this.congestionScore,
      riskScore: riskScore ?? this.riskScore,
      junctionScore: junctionScore ?? this.junctionScore,
      recommended: recommended ?? this.recommended,
      steps: steps ?? this.steps,
      summaryReason: summaryReason ?? this.summaryReason,
      typeTag: typeTag ?? this.typeTag,
      strategy: strategy ?? this.strategy,
      travelMode: travelMode ?? this.travelMode,
      multimodalRoute: multimodalRoute ?? this.multimodalRoute,
    );
  }

  String get formattedDuration {
    final mins = (durationSeconds / 60).round();
    if (mins >= 60) {
      final hrs = mins ~/ 60;
      final remainingMins = mins % 60;
      return '${hrs}h ${remainingMins}m';
    }
    return '$mins min';
  }

  String get formattedDistance {
    if (distanceMeters >= 1000) {
      return '${(distanceMeters / 1000).toStringAsFixed(1)} km';
    }
    return '${distanceMeters.round()} m';
  }

  String get recommendationReason => summaryReason;
}
