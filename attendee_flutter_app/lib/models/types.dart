// ignore_for_file: constant_identifier_names
import 'package:flutter/material.dart';

enum ScenarioId {
  NORMAL,
  POST_EVENT_SURGE,
  TRANSPORT_DISRUPTION,
  HEAVY_RAIN,
  ACCOMMODATION_SATURATION,
  EVENT_DELAY,
}

extension ScenarioIdExtension on ScenarioId {
  String get displayName {
    switch (this) {
      case ScenarioId.NORMAL:
        return "Normal Operations";
      case ScenarioId.POST_EVENT_SURGE:
        return "Post-Event Exit Surge";
      case ScenarioId.TRANSPORT_DISRUPTION:
        return "Western Rail Disruption";
      case ScenarioId.HEAVY_RAIN:
        return "Monsoon / Heavy Rain";
      case ScenarioId.ACCOMMODATION_SATURATION:
        return "Hotel Saturation";
      case ScenarioId.EVENT_DELAY:
        return "Match Delay (+30m)";
    }
  }

  String get badgeLabel {
    switch (this) {
      case ScenarioId.NORMAL:
        return "NORMAL";
      case ScenarioId.POST_EVENT_SURGE:
        return "POST SURGE";
      case ScenarioId.TRANSPORT_DISRUPTION:
        return "RAIL DISRUPTION";
      case ScenarioId.HEAVY_RAIN:
        return "HEAVY RAIN";
      case ScenarioId.ACCOMMODATION_SATURATION:
        return "HOTEL SATURATION";
      case ScenarioId.EVENT_DELAY:
        return "+30 MIN DELAY";
    }
  }

  String get shortCode => badgeLabel;
}

enum RouteStrategy {
  fastest,
  balanced,
  lowCrowd,
}

extension RouteStrategyExtension on RouteStrategy {
  String get displayName {
    switch (this) {
      case RouteStrategy.fastest:
        return "FASTEST";
      case RouteStrategy.balanced:
        return "BALANCED";
      case RouteStrategy.lowCrowd:
        return "LOW CROWD";
    }
  }
}

enum PressureLevel {
  NORMAL,
  WATCH,
  HIGH,
  CRITICAL,
}

enum AlertSeverity {
  INFO,
  WATCH,
  HIGH,
  CRITICAL,
}

enum TravelMode {
  multimodal,
  walking,
  driving,
  train,
  metro,
}

extension TravelModeExtension on TravelMode {
  String get displayName {
    switch (this) {
      case TravelMode.multimodal:
        return "ALL";
      case TravelMode.walking:
        return "WALK";
      case TravelMode.driving:
        return "CAR";
      case TravelMode.train:
        return "TRANSIT";
      case TravelMode.metro:
        return "METRO";
    }
  }

  IconData get iconData {
    switch (this) {
      case TravelMode.multimodal:
        return Icons.public;
      case TravelMode.walking:
        return Icons.directions_walk;
      case TravelMode.driving:
        return Icons.directions_car;
      case TravelMode.train:
        return Icons.train;
      case TravelMode.metro:
        return Icons.subway;
    }
  }

  String get iconSymbol {
    switch (this) {
      case TravelMode.multimodal:
        return "🌐";
      case TravelMode.walking:
        return "🚶";
      case TravelMode.driving:
        return "🚗";
      case TravelMode.train:
        return "🚆";
      case TravelMode.metro:
        return "🚇";
    }
  }

  String get osrmProfile => this == TravelMode.walking ? "foot" : "car";
}

enum AlertCategory {
  CROWD,
  TRANSPORT,
  WEATHER,
  ACCOMMODATION,
  EVENT,
}

class EventInfo {
  final String id;
  final String name;
  final String venue;
  final String date;
  final String startTime;
  final String endTime;
  final int totalCapacity;
  final int ticketsSold;
  final String status;
  final String allocatedGate;

  const EventInfo({
    required this.id,
    required this.name,
    required this.venue,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.totalCapacity,
    required this.ticketsSold,
    required this.status,
    this.allocatedGate = "Gate 3 (South)",
  });
}

class RouteStep {
  final String from;
  final String to;
  final String mode; // RAIL, BUS, WALK, METRO
  final int duration;
  final String? lineName;
  final String? platform;
  final String? distance;
  final String? instruction;
  final List<String>? stops;
  final String? frequency;
  final String? crowdStatus;

  const RouteStep({
    required this.from,
    required this.to,
    required this.mode,
    required this.duration,
    this.lineName,
    this.platform,
    this.distance,
    this.instruction,
    this.stops,
    this.frequency,
    this.crowdStatus,
  });
}

class AttendeeRoute {
  final String id;
  final String type; // FASTEST, BALANCED, LOW_CROWD
  final String label;
  final int totalTime;
  final String crowdLevel; // HIGH, MEDIUM, LOW
  final String congestionLevel; // HIGH, LOW, NORMAL
  final int transfers;
  final int walkingTime;
  final String reliability; // HIGH, MEDIUM, LOW
  final bool recommended;
  final List<RouteStep> steps;
  final String explanation;
  final int score;

  const AttendeeRoute({
    required this.id,
    required this.type,
    required this.label,
    required this.totalTime,
    required this.crowdLevel,
    required this.congestionLevel,
    required this.transfers,
    required this.walkingTime,
    required this.reliability,
    required this.recommended,
    required this.steps,
    required this.explanation,
    required this.score,
  });
}

class HotelAmenity {
  final String icon;
  final String name;

  const HotelAmenity({required this.icon, required this.name});
}

class HotelRoomType {
  final String name;
  final String price;
  final String bedType;
  final String perks;
  final bool available;

  const HotelRoomType({
    required this.name,
    required this.price,
    required this.bedType,
    required this.perks,
    this.available = true,
  });
}

class Hotel {
  final String id;
  final String name;
  final String zone; // ZONE_A, ZONE_B, ZONE_C
  final int totalRooms;
  final int availableRooms;
  final int usableRooms;
  final int expectedCheckIns;
  final int expectedCheckOuts;
  final int travelTimeToVenue;
  final int pressure;
  final PressureLevel pressureLevel;
  final String transportConnectivity;
  final String eventDemand;
  final String source;
  final String priceRange;
  final String? imageUrl;
  final double rating;
  final int reviewsCount;
  final String address;
  final String shuttleInfo;
  final String phone;
  final String? bookingUrl;
  final double? latitude;
  final double? longitude;
  final String? googleMapsPlaceId;
  final List<HotelAmenity> amenities;
  final List<HotelRoomType> roomTypes;

  const Hotel({
    required this.id,
    required this.name,
    required this.zone,
    required this.totalRooms,
    required this.availableRooms,
    required this.usableRooms,
    required this.expectedCheckIns,
    required this.expectedCheckOuts,
    required this.travelTimeToVenue,
    required this.pressure,
    required this.pressureLevel,
    required this.transportConnectivity,
    required this.eventDemand,
    required this.source,
    required this.priceRange,
    this.imageUrl,
    this.rating = 4.5,
    this.reviewsCount = 850,
    this.address = "Mumbai, Maharashtra",
    this.shuttleInfo = "Direct Match Express Shuttle every 15 min",
    this.phone = "+91 22 6600 8800",
    this.bookingUrl,
    this.latitude,
    this.longitude,
    this.googleMapsPlaceId,
    this.amenities = const [],
    this.roomTypes = const [],
  });
}

class MenuItem {
  final String name;
  final String price;
  final String description;
  final bool isVeg;
  final bool isSpecial;

  const MenuItem({
    required this.name,
    required this.price,
    required this.description,
    this.isVeg = true,
    this.isSpecial = false,
  });
}

class Restaurant {
  final String id;
  final String name;
  final String cuisine;
  final String zone;
  final int capacity;
  final int currentOccupancy;
  final int availableTables;
  final int waitTime;
  final int predictedWaitTime;
  final int distanceFromVenue;
  final int pressure;
  final PressureLevel pressureLevel;
  final String source;
  final bool hasIncentive;
  final String? incentiveLabel;
  final bool recommended;
  final String? imageUrl;
  final double rating;
  final int reviewsCount;
  final String address;
  final String openingHours;
  final String? phone;
  final String? reservationUrl;
  final String? websiteUrl;
  final double? latitude;
  final double? longitude;
  final String? googleMapsPlaceId;
  final List<MenuItem> menuItems;

  const Restaurant({
    required this.id,
    required this.name,
    required this.cuisine,
    required this.zone,
    required this.capacity,
    required this.currentOccupancy,
    required this.availableTables,
    required this.waitTime,
    required this.predictedWaitTime,
    required this.distanceFromVenue,
    required this.pressure,
    required this.pressureLevel,
    required this.source,
    this.hasIncentive = false,
    this.incentiveLabel,
    this.recommended = false,
    this.imageUrl,
    this.rating = 4.5,
    this.reviewsCount = 1200,
    this.address = "Marine Lines / Fort, Mumbai",
    this.openingHours = "10:00 AM – 11:30 PM",
    this.phone = "+91 22 2204 5678",
    this.reservationUrl,
    this.websiteUrl,
    this.latitude,
    this.longitude,
    this.googleMapsPlaceId,
    this.menuItems = const [],
  });
}

class Alert {
  final String id;
  final AlertSeverity severity;
  final AlertCategory category;
  final String title;
  final String message;
  final String? resourceId;
  final String? actionLabel;
  final String? actionRoute;
  final String timestamp;

  const Alert({
    required this.id,
    required this.severity,
    required this.category,
    required this.title,
    required this.message,
    this.resourceId,
    this.actionLabel,
    this.actionRoute,
    required this.timestamp,
  });
}

enum AuthProvider {
  google,
  apple,
  email,
  guest,
}

class UserProfile {
  final String id;
  final String name;
  final String email;
  final String? avatarUrl;
  final String ticketCategory;
  final String seatNumber;
  final String preferredZone;
  final AuthProvider authProvider;
  final String? phone;

  const UserProfile({
    required this.id,
    required this.name,
    required this.email,
    this.avatarUrl,
    this.ticketCategory = "VIP North Stand",
    this.seatNumber = "Gate 3 · Block B · Row 12",
    this.preferredZone = "Zone C (Dadar)",
    this.authProvider = AuthProvider.google,
    this.phone,
  });

  UserProfile copyWith({
    String? id,
    String? name,
    String? email,
    String? avatarUrl,
    String? ticketCategory,
    String? seatNumber,
    String? preferredZone,
    AuthProvider? authProvider,
    String? phone,
  }) {
    return UserProfile(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      ticketCategory: ticketCategory ?? this.ticketCategory,
      seatNumber: seatNumber ?? this.seatNumber,
      preferredZone: preferredZone ?? this.preferredZone,
      authProvider: authProvider ?? this.authProvider,
      phone: phone ?? this.phone,
    );
  }
}
