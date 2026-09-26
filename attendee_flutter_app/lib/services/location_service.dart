import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_compass/flutter_compass.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

class LocationService {
  static const LatLng defaultDemoLocation = LatLng(19.0178, 72.8478); // Dadar, Mumbai

  static bool _isDemoMode = false;
  static bool get isDemoMode => _isDemoMode;

  static final StreamController<LatLng> _locationStreamController =
      StreamController<LatLng>.broadcast();

  static Stream<LatLng> get locationStream => _locationStreamController.stream;

  static Future<void> requestInitialPermissions() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return;
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }
    } catch (e) {
      debugPrint('[LocationService] Initial permission request error: $e');
    }
  }

  static Future<LatLng?> getCurrentLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _isDemoMode = true;
        debugPrint('[LocationService] Location service disabled. Using demo origin.');
        return defaultDemoLocation;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          _isDemoMode = true;
          debugPrint('[LocationService] Location permission denied. Using demo origin.');
          return defaultDemoLocation;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        _isDemoMode = true;
        debugPrint('[LocationService] Location permission permanently denied. Using demo origin.');
        return defaultDemoLocation;
      }

      _isDemoMode = false;
      Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 6),
        ),
      );

      final current = LatLng(position.latitude, position.longitude);
      _locationStreamController.add(current);
      return current;
    } catch (e) {
      debugPrint('[LocationService] Exception getting location: $e. Fallback to demo origin.');
      _isDemoMode = true;
      return defaultDemoLocation;
    }
  }

  static StreamSubscription<Position>? _positionStreamSubscription;
  static StreamSubscription<CompassEvent>? _compassSubscription;

  static void startPositionTracking(Function(LatLng) onLocationChanged) {
    startPositionTrackingWithDetails((pos) {
      onLocationChanged(LatLng(pos.latitude, pos.longitude));
    });
  }

  static void startPositionTrackingWithDetails(Function(Position) onPositionChanged) {
    _positionStreamSubscription?.cancel();
    LocationSettings locationSettings = const LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 2,
    );

    _positionStreamSubscription = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen((Position position) {
      _isDemoMode = false;
      final loc = LatLng(position.latitude, position.longitude);
      _locationStreamController.add(loc);
      onPositionChanged(position);
    }, onError: (e) {
      debugPrint('[LocationService] Tracking error: $e');
    });
  }

  static void startCompassTracking(Function(double heading) onHeadingChanged) {
    _compassSubscription?.cancel();
    try {
      if (FlutterCompass.events != null) {
        _compassSubscription = FlutterCompass.events!.listen((CompassEvent event) {
          if (event.heading != null) {
            double h = event.heading!;
            if (h < 0) h += 360;
            onHeadingChanged(h);
          }
        }, onError: (e) {
          debugPrint('[LocationService] Compass error: $e');
        });
      }
    } catch (e) {
      debugPrint('[LocationService] Failed to listen to compass: $e');
    }
  }

  static void stopCompassTracking() {
    _compassSubscription?.cancel();
    _compassSubscription = null;
  }

  static void stopPositionTracking() {
    _positionStreamSubscription?.cancel();
    _positionStreamSubscription = null;
    stopCompassTracking();
  }
}
