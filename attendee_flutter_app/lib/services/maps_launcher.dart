import 'package:flutter/foundation.dart';
import 'package:url_launcher/url_launcher.dart';

class MapsLauncherService {
  /// Destination resolution priority:
  /// 1. Place ID (destination=NAME, ADDRESS & destination_place_id=PLACE_ID)
  /// 2. Latitude,Longitude (destination=LAT,LNG)
  /// 3. Hotel/Restaurant Name + Address (destination=NAME, ADDRESS)
  static Future<bool> openDirections({
    required String destination,
    double? latitude,
    double? longitude,
    String? placeId,
    String? travelMode,
    bool startNavigation = true,
  }) async {
    String destinationParam = destination;

    final Map<String, String> queryParams = {
      'api': '1',
    };

    if (placeId != null && placeId.isNotEmpty) {
      queryParams['destination'] = destination;
      queryParams['destination_place_id'] = placeId;
    } else if (latitude != null && longitude != null) {
      queryParams['destination'] = '$latitude,$longitude';
    } else {
      queryParams['destination'] = destinationParam;
    }

    if (startNavigation) {
      queryParams['dir_action'] = 'navigate';
    }

    if (travelMode != null && travelMode.isNotEmpty) {
      final normalizedMode = travelMode.toLowerCase();
      if (normalizedMode.contains('walk')) {
        queryParams['travelmode'] = 'walking';
      } else if (normalizedMode.contains('bus') ||
          normalizedMode.contains('rail') ||
          normalizedMode.contains('train') ||
          normalizedMode.contains('metro') ||
          normalizedMode.contains('transit')) {
        queryParams['travelmode'] = 'transit';
      } else if (normalizedMode.contains('drive') ||
          normalizedMode.contains('shuttle') ||
          normalizedMode.contains('car')) {
        queryParams['travelmode'] = 'driving';
      }
    }

    final Uri uri = Uri.https('www.google.com', '/maps/dir/', queryParams);
    debugPrint('Opening Google Maps: $uri');

    try {
      final bool canLaunch = await canLaunchUrl(uri);
      if (canLaunch) {
        final bool launched = await launchUrl(
          uri,
          mode: LaunchMode.externalApplication,
        );
        if (launched) return true;
      }

      return await launchUrl(
        uri,
        mode: LaunchMode.platformDefault,
      );
    } catch (e) {
      debugPrint("Error launching Google Maps directions: $e");
      return false;
    }
  }

  /// Opens an official external URL (e.g. hotel booking website or restaurant reservation website)
  static Future<bool> openExternalUrl(String url) async {
    if (url.isEmpty) return false;
    debugPrint('Opening external website: $url');
    try {
      final Uri? uri = Uri.tryParse(url.startsWith('http') ? url : 'https://$url');
      if (uri == null) return false;

      final bool canLaunch = await canLaunchUrl(uri);
      if (canLaunch) {
        final bool launched = await launchUrl(
          uri,
          mode: LaunchMode.externalApplication,
        );
        if (launched) return true;
      }

      return await launchUrl(
        uri,
        mode: LaunchMode.platformDefault,
      );
    } catch (e) {
      debugPrint("Error launching external URL: $e");
      return false;
    }
  }
}

/// Backward compatibility alias for MapsLauncher
typedef MapsLauncher = MapsLauncherService;
