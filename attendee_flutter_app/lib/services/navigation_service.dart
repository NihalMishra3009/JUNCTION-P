import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../models/map_destination.dart';
import '../models/route_option.dart';
import '../models/navigation_step.dart';
import '../models/types.dart';
import 'location_service.dart';
import 'routing_service.dart';

class NavigationService extends ChangeNotifier {
  static final NavigationService _instance = NavigationService._internal();
  factory NavigationService() => _instance;
  NavigationService._internal();

  bool _isNavigating = false;
  bool _isPreviewMode = false;
  TravelMode _travelMode = TravelMode.driving;

  MapDestination? _activeDestination;
  MapDestination? _activeOrigin;
  RouteOption? _activeRoute;
  List<RouteOption> _allRouteOptions = [];

  int _currentStepIndex = 0;
  LatLng? _currentPosition;
  double _currentHeading = 0.0;
  bool _isFollowing = true;

  double _remainingDistanceMeters = 0;
  int _remainingDurationSeconds = 0;
  bool _isDeviated = false;
  bool _hasArrived = false;
  String? _rerouteAlertMessage;

  bool get isNavigating => _isNavigating;
  bool get isPreviewMode => _isPreviewMode;
  TravelMode get travelMode => _travelMode;
  MapDestination? get activeDestination => _activeDestination;
  MapDestination? get activeOrigin => _activeOrigin;
  RouteOption? get activeRoute => _activeRoute;
  List<RouteOption> get allRouteOptions => _allRouteOptions;
  int get currentStepIndex => _currentStepIndex;
  LatLng? get currentPosition => _currentPosition;
  double get currentHeading => _currentHeading;
  bool get isFollowing => _isFollowing;
  double get remainingDistanceMeters => _remainingDistanceMeters;
  int get remainingDurationSeconds => _remainingDurationSeconds;
  bool get isDeviated => _isDeviated;
  bool get hasArrived => _hasArrived;
  String? get rerouteAlertMessage => _rerouteAlertMessage;

  NavigationStep? get currentStep {
    if (_activeRoute == null || _activeRoute!.steps.isEmpty) return null;
    if (_currentStepIndex >= _activeRoute!.steps.length) {
      return _activeRoute!.steps.last;
    }
    return _activeRoute!.steps[_currentStepIndex];
  }

  void setTravelMode(TravelMode mode) {
    _travelMode = mode;
    notifyListeners();
  }

  void setCameraFollowing(bool follow) {
    _isFollowing = follow;
    notifyListeners();
  }

  void startRoutePreview({
    required MapDestination destination,
    MapDestination? origin,
    required List<RouteOption> routes,
    RouteOption? selected,
    TravelMode mode = TravelMode.driving,
  }) {
    _activeDestination = destination;
    _activeOrigin = origin;
    _allRouteOptions = routes;
    _travelMode = mode;
    _activeRoute = selected ?? (routes.isNotEmpty ? (routes.firstWhere((r) => r.recommended, orElse: () => routes.first)) : null);
    _isPreviewMode = true;
    _isNavigating = false;
    _hasArrived = false;
    if (_activeRoute != null) {
      _remainingDistanceMeters = _activeRoute!.distanceMeters;
      _remainingDurationSeconds = _activeRoute!.durationSeconds;
    }
    notifyListeners();
  }

  void setAvailableRoutes(List<RouteOption> routes, {RouteOption? selected, MapDestination? destination, MapDestination? origin, TravelMode? mode}) {
    _allRouteOptions = routes;
    if (destination != null) _activeDestination = destination;
    if (origin != null) _activeOrigin = origin;
    if (mode != null) _travelMode = mode;
    if (routes.isNotEmpty) {
      _activeRoute = selected ?? routes.firstWhere((r) => r.recommended, orElse: () => routes.first);
      _remainingDistanceMeters = _activeRoute!.distanceMeters;
      _remainingDurationSeconds = _activeRoute!.durationSeconds;
    } else {
      _activeRoute = null;
    }
    notifyListeners();
  }

  void selectRoute(RouteOption route) {
    _activeRoute = route;
    _remainingDistanceMeters = route.distanceMeters;
    _remainingDurationSeconds = route.durationSeconds;
    _currentStepIndex = 0;
    notifyListeners();
  }

  double _compassHeading = 0.0;
  double _gpsCourse = 0.0;
  double _userSpeed = 0.0;

  void startNavigation(RouteOption route, LatLng startPosition, {MapDestination? destination, MapDestination? origin, TravelMode? mode}) {
    _isNavigating = true;
    _isPreviewMode = false;
    _activeRoute = route;
    if (destination != null) _activeDestination = destination;
    if (origin != null) _activeOrigin = origin;
    if (mode != null) _travelMode = mode;

    _currentStepIndex = 0;
    _currentPosition = startPosition;
    _currentHeading = 0.0;
    _isFollowing = true;
    _hasArrived = false;
    _remainingDistanceMeters = route.distanceMeters;
    _remainingDurationSeconds = route.durationSeconds;
    _isDeviated = false;
    _rerouteAlertMessage = null;

    // Start live GPS tracking stream & compass orientation stream
    LocationService.startPositionTrackingWithDetails((Position pos) {
      updatePositionFromGPS(pos);
    });

    LocationService.startCompassTracking((double heading) {
      updateCompassHeading(heading);
    });

    notifyListeners();
  }

  void updateCompassHeading(double heading) {
    _compassHeading = heading;

    // Heading Priority:
    // If moving (> 0.4 m/s ~1.5 km/h), prefer GPS course.
    // If stationary or low speed (<= 0.4 m/s), use device compass magnetic heading directly!
    final targetHeading = (_userSpeed > 0.4 && _gpsCourse > 0)
        ? _gpsCourse
        : _compassHeading;

    _updateEffectiveHeading(targetHeading);
  }

  void _updateEffectiveHeading(double targetHeading) {
    if (targetHeading <= 0 && _compassHeading <= 0) return;

    final normalizedTarget = (targetHeading % 360 + 360) % 360;

    // Shortest angular difference (handles 359° -> 1° correctly without spinning backwards)
    double diff = (normalizedTarget - _currentHeading + 540) % 360 - 180;

    _currentHeading = (_currentHeading + 0.35 * diff) % 360;
    if (_currentHeading < 0) _currentHeading += 360;

    notifyListeners();
  }

  void stopNavigation() {
    _isNavigating = false;
    _isPreviewMode = true;
    _currentStepIndex = 0;
    _rerouteAlertMessage = null;
    LocationService.stopPositionTracking();
    notifyListeners();
  }

  void clearNavigation() {
    _isNavigating = false;
    _isPreviewMode = false;
    _activeDestination = null;
    _activeOrigin = null;
    _activeRoute = null;
    _allRouteOptions = [];
    _currentStepIndex = 0;
    _rerouteAlertMessage = null;
    _hasArrived = false;
    LocationService.stopPositionTracking();
    notifyListeners();
  }

  void clearRerouteAlert() {
    _rerouteAlertMessage = null;
    notifyListeners();
  }

  static const Distance _distanceCalc = Distance();

  void updatePositionFromGPS(Position pos) {
    final newPos = LatLng(pos.latitude, pos.longitude);
    _userSpeed = pos.speed;

    // Heading Priority: Update GPS course when user is moving (> 0.4 m/s)
    if (pos.speed > 0.4) {
      double rawHeading = pos.heading;
      if (rawHeading <= 0 && _currentPosition != null) {
        rawHeading = _calculateBearing(_currentPosition!, newPos);
      }
      if (rawHeading > 0) {
        _gpsCourse = rawHeading;
      }
      _updateEffectiveHeading(_gpsCourse > 0 ? _gpsCourse : _compassHeading);
    } else if (_compassHeading > 0) {
      _updateEffectiveHeading(_compassHeading);
    }

    _currentPosition = newPos;

    if (!_isNavigating || _activeRoute == null) {
      notifyListeners();
      return;
    }

    // 1. Calculate remaining distance to destination
    final LatLng destination = _activeRoute!.geometry.isNotEmpty
        ? _activeRoute!.geometry.last
        : (_activeDestination?.location ?? newPos);
    final double distToDest = _distanceCalc.as(LengthUnit.Meter, newPos, destination);
    _remainingDistanceMeters = distToDest;

    // Speed calculation based on travel mode
    final double speedMeterPerSec = _travelMode == TravelMode.walking ? 1.35 : 8.0;
    _remainingDurationSeconds = (distToDest / speedMeterPerSec).round();

    // 2. Arrival Detection
    if (distToDest < 25.0) {
      _hasArrived = true;
      _rerouteAlertMessage = "✓ YOU HAVE ARRIVED AT ${_activeDestination?.name.toUpperCase() ?? 'DESTINATION'}";
      notifyListeners();
      return;
    }

    // 3. Advance step index if user is close to next step location
    if (_currentStepIndex < _activeRoute!.steps.length - 1) {
      final nextStepLoc = _activeRoute!.steps[_currentStepIndex + 1].location;
      final distToStep = _distanceCalc.as(LengthUnit.Meter, newPos, nextStepLoc);
      if (distToStep < 30.0) {
        _currentStepIndex++;
      }
    }

    // 4. Off-route Deviation Check & Background Rerouting
    final double threshold = _travelMode == TravelMode.walking ? 30.0 : 45.0;
    final double minDistToPolyline = _minDistanceToGeometry(newPos, _activeRoute!.geometry);

    if (minDistToPolyline > threshold && !_isDeviated) {
      _isDeviated = true;
      _triggerAutomaticReroute(newPos);
    } else if (minDistToPolyline <= threshold / 2) {
      _isDeviated = false;
    }

    notifyListeners();
  }

  void updatePosition(LatLng position) {
    _currentPosition = position;
    if (!_isNavigating || _activeRoute == null) {
      notifyListeners();
      return;
    }

    final LatLng destination = _activeRoute!.geometry.isNotEmpty
        ? _activeRoute!.geometry.last
        : (_activeDestination?.location ?? position);
    final double distToDest = _distanceCalc.as(LengthUnit.Meter, position, destination);
    _remainingDistanceMeters = distToDest;
    _remainingDurationSeconds = (distToDest / 8.0).round();

    if (_currentStepIndex < _activeRoute!.steps.length - 1) {
      final nextStepLoc = _activeRoute!.steps[_currentStepIndex + 1].location;
      final distToStep = _distanceCalc.as(LengthUnit.Meter, position, nextStepLoc);
      if (distToStep < 30) {
        _currentStepIndex++;
      }
    }

    final double minDistToPolyline = _minDistanceToGeometry(position, _activeRoute!.geometry);
    if (minDistToPolyline > 40.0 && !_isDeviated) {
      _isDeviated = true;
      _triggerAutomaticReroute(position);
    }

    notifyListeners();
  }

  Future<void> _triggerAutomaticReroute(LatLng currentPos) async {
    if (_activeDestination == null) return;
    try {
      final newRaw = await RoutingService.getRoutes(
        origin: currentPos,
        destination: _activeDestination!.location,
        mode: _travelMode,
      );
      if (newRaw.isNotEmpty) {
        final best = newRaw.firstWhere((r) => r.recommended, orElse: () => newRaw.first);
        _activeRoute = best;
        _allRouteOptions = newRaw;
        _currentStepIndex = 0;
        _isDeviated = false;
        _rerouteAlertMessage = "⚠ AUTOMATIC REROUTE: Recalculated optimal ${_travelMode.displayName} path from your current location.";
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[NavigationService] Rerouting error: $e');
    }
  }

  void triggerCrowdRerouteNotice(String message, RouteOption newRecommendedRoute) {
    if (_isNavigating) {
      _activeRoute = newRecommendedRoute;
      _rerouteAlertMessage = message;
      notifyListeners();
    }
  }

  double _minDistanceToGeometry(LatLng point, List<LatLng> geometry) {
    if (geometry.isEmpty) return 0;
    double minD = double.infinity;
    for (var pt in geometry) {
      final d = _distanceCalc.as(LengthUnit.Meter, point, pt);
      if (d < minD) minD = d;
    }
    return minD;
  }

  double _calculateBearing(LatLng start, LatLng end) {
    final double startLat = start.latitude * (math.pi / 180.0);
    final double startLng = start.longitude * (math.pi / 180.0);
    final double endLat = end.latitude * (math.pi / 180.0);
    final double endLng = end.longitude * (math.pi / 180.0);

    final double dLng = endLng - startLng;
    final double y = math.sin(dLng) * math.cos(endLat);
    final double x = math.cos(startLat) * math.sin(endLat) -
        math.sin(startLat) * math.cos(endLat) * math.cos(dLng);

    double bearing = math.atan2(y, x) * (180.0 / math.pi);
    return (bearing + 360.0) % 360.0;
  }
}
