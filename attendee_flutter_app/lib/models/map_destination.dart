// ignore_for_file: constant_identifier_names

import 'package:latlong2/latlong.dart';

enum DestinationType {
  VENUE,
  HOTEL,
  RESTAURANT,
  STATION,
  CHECKPOINT,
  OTHER,
}

class MapDestination {
  final String id;
  final String name;
  final String address;
  final LatLng location;
  final DestinationType type;

  const MapDestination({
    required this.id,
    required this.name,
    this.address = '',
    required this.location,
    required this.type,
  });

  static const MapDestination wankhedeStadium = MapDestination(
    id: 'venue_wankhede',
    name: 'Wankhede Stadium Gate 3',
    address: 'Churchgate, Mumbai, Maharashtra 400020',
    location: LatLng(18.9389, 72.8258),
    type: DestinationType.VENUE,
  );
}
