import 'package:latlong2/latlong.dart';

class NavigationStep {
  final String instruction;
  final String maneuver; // depart, straight, left, right, slight_left, slight_right, sharp_left, sharp_right, uturn, roundabout, arrive
  final double distanceMeters;
  final int durationSeconds;
  final LatLng location;

  const NavigationStep({
    required this.instruction,
    required this.maneuver,
    required this.distanceMeters,
    required this.durationSeconds,
    required this.location,
  });
}
