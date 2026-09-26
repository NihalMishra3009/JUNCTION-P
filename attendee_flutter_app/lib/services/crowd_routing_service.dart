import 'package:latlong2/latlong.dart';
import '../models/route_option.dart';
import '../models/types.dart';
import '../state/app_state.dart';

class CrowdRoutingService {
  static const Distance _distance = Distance();

  // Known hotspot locations
  static const LatLng churchgateLoc = LatLng(18.9322, 72.8264);
  static const LatLng marineLinesLoc = LatLng(18.9438, 72.8236);
  static const LatLng dadarLoc = LatLng(19.0178, 72.8478);
  static const LatLng csmtLoc = LatLng(18.9401, 72.8351);
  static const LatLng venueLoc = LatLng(18.9389, 72.8258);

  /// Evaluates and scores raw routes according to JUNCTION crowd-aware rules.
  static List<RouteOption> evaluateAndScoreRoutes({
    required List<RouteOption> rawRoutes,
    required AppState appState,
  }) {
    if (rawRoutes.isEmpty) return [];

    final ScenarioId scenario = appState.activeScenario;
    final bool isRecApproved = appState.isRec1Approved;

    // Apply scenario duration modifiers (e.g. Heavy Rain, Exit Surge, Disruption)
    final List<RouteOption> modifiedRoutes = rawRoutes.map((r) {
      int dur = r.durationSeconds;
      if (scenario == ScenarioId.HEAVY_RAIN) {
        dur = (dur * 1.25).round(); // 25% rain slowdown
      } else if (scenario == ScenarioId.POST_EVENT_SURGE && r.geometry.any((pt) => _distance.as(LengthUnit.Meter, pt, churchgateLoc) < 800)) {
        dur = (dur * 1.35).round(); // 35% exit surge slowdown near Churchgate
      } else if (scenario == ScenarioId.TRANSPORT_DISRUPTION && r.geometry.any((pt) => _distance.as(LengthUnit.Meter, pt, churchgateLoc) < 800)) {
        dur = (dur * 1.40).round(); // 40% railway disruption delay
      }
      return r.copyWith(durationSeconds: dur);
    }).toList();

    // Find min & max duration for normalization
    int minDuration = modifiedRoutes.first.durationSeconds;
    int maxDuration = modifiedRoutes.first.durationSeconds;
    for (var r in modifiedRoutes) {
      if (r.durationSeconds < minDuration) minDuration = r.durationSeconds;
      if (r.durationSeconds > maxDuration) maxDuration = r.durationSeconds;
    }

    final List<RouteOption> scoredRoutes = [];

    for (int i = 0; i < modifiedRoutes.length; i++) {
      final route = modifiedRoutes[i];

      // 1. Travel Time Normalization (0.0 to 1.0)
      final double timeNorm = maxDuration == minDuration
          ? 0.3
          : (route.durationSeconds - minDuration) / (maxDuration - minDuration);

      // 2. Segment Crowd Pressure calculation
      final double crowdPressure = _calculateRouteCrowdPressure(route.geometry, scenario);

      // 3. Checkpoint Congestion
      final double checkpointCongestion = _calculateCheckpointCongestion(route.geometry, scenario);

      // 4. Station/Transport Pressure
      final double stationPressure = _calculateStationPressure(route.geometry, scenario, isRecApproved);

      // 5. Operational/Event Risk
      final double riskScore = _calculateOperationalRisk(scenario);

      // Weighted composite score (0.0 to 1.0) - Lower score is better
      double junctionScore = (0.35 * timeNorm) +
          (0.30 * crowdPressure) +
          (0.15 * checkpointCongestion) +
          (0.10 * stationPressure) +
          (0.10 * riskScore);

      // If organizer recommendation is active or route passes Dadar corridor, apply bonus
      if (isRecApproved && _isNearLocation(route.geometry, dadarLoc, 1500)) {
        junctionScore = (junctionScore - 0.20).clamp(0.0, 1.0);
      } else if (scenario == ScenarioId.POST_EVENT_SURGE && _isNearLocation(route.geometry, dadarLoc, 1500)) {
        junctionScore = (junctionScore - 0.15).clamp(0.0, 1.0);
      } else if (scenario == ScenarioId.TRANSPORT_DISRUPTION && _isNearLocation(route.geometry, dadarLoc, 1500)) {
        junctionScore = (junctionScore - 0.18).clamp(0.0, 1.0);
      }

      scoredRoutes.add(route.copyWith(
        crowdScore: crowdPressure,
        congestionScore: checkpointCongestion,
        riskScore: riskScore,
        junctionScore: junctionScore,
      ));
    }

    // Classify candidate routes into FASTEST, BALANCED, LOW CROWD, or TRANSIT options
    final List<RouteOption> classifiedRoutes = [];
    if (scoredRoutes.length >= 3 && scoredRoutes.every((r) => r.travelMode == TravelMode.driving || r.travelMode == TravelMode.walking)) {
      int fastestIdx = 0;
      int minDur = scoredRoutes[0].durationSeconds;
      for (int i = 1; i < scoredRoutes.length; i++) {
        if (scoredRoutes[i].durationSeconds < minDur) {
          minDur = scoredRoutes[i].durationSeconds;
          fastestIdx = i;
        }
      }

      int lowCrowdIdx = 0;
      double minCrowd = scoredRoutes[0].crowdScore;
      for (int i = 1; i < scoredRoutes.length; i++) {
        if (scoredRoutes[i].crowdScore < minCrowd && i != fastestIdx) {
          minCrowd = scoredRoutes[i].crowdScore;
          lowCrowdIdx = i;
        }
      }

      for (int i = 0; i < scoredRoutes.length; i++) {
        RouteStrategy strat;
        String typeTag;
        String name;

        if (i == fastestIdx) {
          strat = RouteStrategy.fastest;
          typeTag = 'FASTEST';
          name = scoredRoutes[i].travelMode == TravelMode.walking ? 'Fastest Direct Walk' : 'Direct Highway Link';
        } else if (i == lowCrowdIdx) {
          strat = RouteStrategy.lowCrowd;
          typeTag = 'LOW_CROWD';
          name = scoredRoutes[i].travelMode == TravelMode.walking ? 'Shaded Promenade Walk' : 'Eastern Bypass / Promenade';
        } else {
          strat = RouteStrategy.balanced;
          typeTag = 'BALANCED';
          name = scoredRoutes[i].travelMode == TravelMode.walking ? 'Pedestrian Skywalk Route' : 'Senapati Bapat / Dadar Corridor';
        }

        classifiedRoutes.add(scoredRoutes[i].copyWith(
          strategy: strat,
          typeTag: typeTag,
          name: name,
        ));
      }
    } else {
      for (int i = 0; i < scoredRoutes.length; i++) {
        final r = scoredRoutes[i];
        RouteStrategy strat = RouteStrategy.balanced;
        if (i == 0) strat = RouteStrategy.fastest;
        if (i == scoredRoutes.length - 1 && scoredRoutes.length > 2) strat = RouteStrategy.lowCrowd;

        classifiedRoutes.add(r.copyWith(
          strategy: strat,
          typeTag: r.typeTag.isNotEmpty ? r.typeTag : strat.displayName.replaceAll(' ', '_'),
        ));
      }
    }

    // Determine recommendation (lowest junctionScore wins!)
    double minJunctionScore = classifiedRoutes.first.junctionScore;
    int winnerIdx = 0;
    for (int i = 1; i < classifiedRoutes.length; i++) {
      if (classifiedRoutes[i].junctionScore < minJunctionScore) {
        minJunctionScore = classifiedRoutes[i].junctionScore;
        winnerIdx = i;
      }
    }

    final RouteOption fastestRoute = classifiedRoutes.firstWhere(
      (r) => r.strategy == RouteStrategy.fastest,
      orElse: () => classifiedRoutes.first,
    );

    final List<RouteOption> finalRoutes = [];
    for (int i = 0; i < classifiedRoutes.length; i++) {
      final r = classifiedRoutes[i];
      final isBest = i == winnerIdx;

      String explanation;
      if (isBest) {
        if (scenario == ScenarioId.POST_EVENT_SURGE) {
          if (r.travelMode == TravelMode.train || r.travelMode == TravelMode.metro || r.travelMode == TravelMode.multimodal) {
            explanation = '★ JUNCTION RECOMMENDS TRANSIT: Post-event exit surge active. Rail/Metro bypasses 94% Churchgate road bottleneck.';
          } else {
            explanation = '★ JUNCTION RECOMMENDS: Post-event exit surge active. Bypasses 94% Churchgate choke point via Dadar express corridor.';
          }
        } else if (scenario == ScenarioId.TRANSPORT_DISRUPTION) {
          if (r.travelMode == TravelMode.driving) {
            explanation = '★ JUNCTION RECOMMENDS ROAD: Western Railway disruption detected. Road route avoids railway platform backlog.';
          } else if (r.travelMode == TravelMode.metro) {
            explanation = '★ JUNCTION RECOMMENDS METRO: Western Railway disruption active. Metro line provides reliable transit alternative.';
          } else {
            explanation = '★ JUNCTION RECOMMENDS: Central Railway bypass route avoiding disrupted Western line.';
          }
        } else if (scenario == ScenarioId.HEAVY_RAIN) {
          if (r.travelMode == TravelMode.metro || r.travelMode == TravelMode.train) {
            explanation = '★ JUNCTION RECOMMENDS METRO/TRAIN: Heavy rain causing road waterlogging. Covered rail corridor reduces weather risk.';
          } else {
            explanation = '★ JUNCTION RECOMMENDS: Heavy rain detected. Route prioritizes covered skywalks and protected transit.';
          }
        } else if (r.strategy == RouteStrategy.balanced) {
          final crowdDiff = ((fastestRoute.crowdScore - r.crowdScore) * 100).round();
          explanation = '★ JUNCTION RECOMMENDS BALANCED: ${crowdDiff > 0 ? "$crowdDiff% lower crowd exposure" : "Optimal crowd balance"} with minimal travel-time increase.';
        } else if (r.strategy == RouteStrategy.lowCrowd) {
          explanation = '★ JUNCTION RECOMMENDS LOW CROWD: Bypasses high-pressure operational zones with lowest overall risk score.';
        } else {
          explanation = '★ JUNCTION RECOMMENDS FASTEST: Direct route with minimum travel time (${r.formattedDuration}) and safe congestion levels.';
        }
      } else {
        if (r.travelMode == TravelMode.train || r.travelMode == TravelMode.metro || r.travelMode == TravelMode.multimodal) {
          explanation = 'Transit route: Walk to station, train/metro journey, and final walking access.';
        } else if (r.strategy == RouteStrategy.fastest) {
          explanation = 'Shortest travel time (${r.formattedDuration}) but incurs higher bottleneck crowd pressure (${(r.crowdScore * 100).round()}%).';
        } else if (r.strategy == RouteStrategy.lowCrowd) {
          explanation = 'Minimizes crowd pressure (${(r.crowdScore * 100).round()}%), but requires longer travel distance (${r.formattedDistance}).';
        } else {
          explanation = 'Balanced arterial corridor with moderate traffic flow.';
        }
      }

      finalRoutes.add(r.copyWith(
        recommended: isBest,
        summaryReason: explanation,
      ));
    }

    finalRoutes.sort((a, b) {
      final order = {RouteStrategy.fastest: 0, RouteStrategy.balanced: 1, RouteStrategy.lowCrowd: 2};
      return (order[a.strategy] ?? 0).compareTo(order[b.strategy] ?? 0);
    });

    return finalRoutes;
  }

  static double _calculateRouteCrowdPressure(List<LatLng> points, ScenarioId scenario) {
    if (points.isEmpty) return 0.5;

    double maxPressure = 0.2;
    double totalPressure = 0.0;

    for (var pt in points) {
      double ptPressure = 0.2;

      // Distance to Churchgate (choke point during post-event)
      final double distChurchgate = _distance.as(LengthUnit.Meter, pt, churchgateLoc);
      if (distChurchgate < 800) {
        ptPressure = (scenario == ScenarioId.POST_EVENT_SURGE)
            ? 0.94
            : (scenario == ScenarioId.TRANSPORT_DISRUPTION ? 0.90 : 0.65);
      }

      // Distance to Marine Lines
      final double distMarine = _distance.as(LengthUnit.Meter, pt, marineLinesLoc);
      if (distMarine < 800) {
        ptPressure = (scenario == ScenarioId.POST_EVENT_SURGE) ? 0.82 : 0.55;
      }

      // Distance to Dadar
      final double distDadar = _distance.as(LengthUnit.Meter, pt, dadarLoc);
      if (distDadar < 1200) {
        ptPressure = (scenario == ScenarioId.TRANSPORT_DISRUPTION) ? 0.45 : 0.35;
      }

      totalPressure += ptPressure;
      if (ptPressure > maxPressure) maxPressure = ptPressure;
    }

    final double avgPressure = totalPressure / points.length;
    return (0.6 * maxPressure + 0.4 * avgPressure).clamp(0.0, 1.0);
  }

  static double _calculateCheckpointCongestion(List<LatLng> points, ScenarioId scenario) {
    final bool nearVenue = _isNearLocation(points, venueLoc, 600);
    if (!nearVenue) return 0.2;

    switch (scenario) {
      case ScenarioId.POST_EVENT_SURGE:
        return 0.88;
      case ScenarioId.EVENT_DELAY:
        return 0.75;
      case ScenarioId.TRANSPORT_DISRUPTION:
        return 0.65;
      default:
        return 0.35;
    }
  }

  static double _calculateStationPressure(List<LatLng> points, ScenarioId scenario, bool isRecApproved) {
    final bool nearChurchgate = _isNearLocation(points, churchgateLoc, 700);
    final bool nearDadar = _isNearLocation(points, dadarLoc, 1000);

    if (nearChurchgate) {
      if (scenario == ScenarioId.POST_EVENT_SURGE) return 0.95;
      if (scenario == ScenarioId.TRANSPORT_DISRUPTION) return 0.90;
      return 0.60;
    }

    if (nearDadar) {
      if (isRecApproved) return 0.25;
      if (scenario == ScenarioId.TRANSPORT_DISRUPTION) return 0.45;
      return 0.35;
    }

    return 0.20;
  }

  static double _calculateOperationalRisk(ScenarioId scenario) {
    switch (scenario) {
      case ScenarioId.HEAVY_RAIN:
        return 0.85;
      case ScenarioId.TRANSPORT_DISRUPTION:
        return 0.75;
      case ScenarioId.POST_EVENT_SURGE:
        return 0.70;
      case ScenarioId.ACCOMMODATION_SATURATION:
        return 0.50;
      case ScenarioId.EVENT_DELAY:
        return 0.40;
      case ScenarioId.NORMAL:
        return 0.15;
    }
  }

  static bool _isNearLocation(List<LatLng> points, LatLng target, double thresholdMeters) {
    for (var pt in points) {
      if (_distance.as(LengthUnit.Meter, pt, target) <= thresholdMeters) {
        return true;
      }
    }
    return false;
  }
}
