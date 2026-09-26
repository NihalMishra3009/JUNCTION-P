import 'package:flutter/material.dart';
import '../models/types.dart';
import '../theme/app_theme.dart';

class ZoneMetrics {
  final String id;
  final String name;
  final String location;
  final int pressure;
  final PressureLevel level;
  final Color color;
  final String trend;
  final String reason;
  final String recommendation;
  final double latitude;
  final double longitude;
  final double radiusMeters;

  const ZoneMetrics({
    required this.id,
    required this.name,
    required this.location,
    required this.pressure,
    required this.level,
    required this.color,
    required this.trend,
    required this.reason,
    required this.recommendation,
    required this.latitude,
    required this.longitude,
    required this.radiusMeters,
  });
}

class ScenarioIntelligenceService {
  /// Returns operational zone metrics based on the active scenario.
  static List<ZoneMetrics> getZoneMetrics(ScenarioId scenario) {
    switch (scenario) {
      case ScenarioId.POST_EVENT_SURGE:
        return [
          const ZoneMetrics(
            id: "ZONE_A",
            name: "ZONE A",
            location: "Churchgate / Exit",
            pressure: 94,
            level: PressureLevel.CRITICAL,
            color: AppTheme.red,
            trend: "▲ +18% (Peak Egress)",
            reason: "33,000 venue exit surge & 94% turnstile bottleneck at Churchgate.",
            recommendation: "Avoid Churchgate gates. Reroute via Dadar AC Express Shuttle.",
            latitude: 18.9322,
            longitude: 72.8264,
            radiusMeters: 950,
          ),
          const ZoneMetrics(
            id: "ZONE_B",
            name: "ZONE B",
            location: "CSMT / Marine Drive",
            pressure: 78,
            level: PressureLevel.HIGH,
            color: AppTheme.orange,
            trend: "▲ +12% (Redirection)",
            reason: "Pedestrian overflow spilling onto Marine Drive promenade.",
            recommendation: "Allow +15 mins buffer time for Central Line boarding.",
            latitude: 18.9400,
            longitude: 72.8353,
            radiusMeters: 850,
          ),
          const ZoneMetrics(
            id: "ZONE_C",
            name: "ZONE C",
            location: "Dadar Hub",
            pressure: 38,
            level: PressureLevel.NORMAL,
            color: AppTheme.green,
            trend: "▼ -40% (Flow Relief)",
            reason: "Dedicated express shuttle corridor operating with 60% free capacity.",
            recommendation: "★ JUNCTION RECOMMENDED corridor — lowest crowd pressure.",
            latitude: 19.0178,
            longitude: 72.8478,
            radiusMeters: 1200,
          ),
        ];

      case ScenarioId.TRANSPORT_DISRUPTION:
        return [
          const ZoneMetrics(
            id: "ZONE_A",
            name: "ZONE A",
            location: "Churchgate Station",
            pressure: 88,
            level: PressureLevel.CRITICAL,
            color: AppTheme.red,
            trend: "▲ Signal Failure",
            reason: "Western Railway line disruption causing severe platform backlog.",
            recommendation: "Western Railway suspended. Do not head to Churchgate.",
            latitude: 18.9322,
            longitude: 72.8264,
            radiusMeters: 1000,
          ),
          const ZoneMetrics(
            id: "ZONE_B",
            name: "ZONE B",
            location: "CSMT Central Terminal",
            pressure: 82,
            level: PressureLevel.HIGH,
            color: AppTheme.orange,
            trend: "▲ +24% (Overflow)",
            reason: "Heavy passenger migration from Western Line to Central Line.",
            recommendation: "Expect heavy queues at CSMT platform 1 & 2.",
            latitude: 18.9400,
            longitude: 72.8353,
            radiusMeters: 900,
          ),
          const ZoneMetrics(
            id: "ZONE_C",
            name: "ZONE C",
            location: "Dadar Hub",
            pressure: 46,
            level: PressureLevel.WATCH,
            color: AppTheme.yellow,
            trend: "► Stable Transit",
            reason: "Central & Harbour line feeder shuttles absorbing passenger volume.",
            recommendation: "★ JUNCTION RECOMMENDED alternate corridor via Dadar.",
            latitude: 19.0178,
            longitude: 72.8478,
            radiusMeters: 1100,
          ),
        ];

      case ScenarioId.HEAVY_RAIN:
        return [
          const ZoneMetrics(
            id: "ZONE_A",
            name: "ZONE A",
            location: "Subway & Underpass",
            pressure: 85,
            level: PressureLevel.HIGH,
            color: AppTheme.orange,
            trend: "▲ Waterlogging",
            reason: "Heavy monsoon rain causing urban waterlogging near Churchgate subways.",
            recommendation: "Avoid low-lying pedestrian tunnels. Use covered skywalks.",
            latitude: 18.9322,
            longitude: 72.8264,
            radiusMeters: 800,
          ),
          const ZoneMetrics(
            id: "ZONE_B",
            name: "ZONE B",
            location: "Marine Drive Road",
            pressure: 72,
            level: PressureLevel.HIGH,
            color: AppTheme.orange,
            trend: "▲ Road Slowdown",
            reason: "High tide & coastal road spray slowing vehicular transit.",
            recommendation: "Vehicular speed reduced by 35%. Use indoor rail links.",
            latitude: 18.9400,
            longitude: 72.8353,
            radiusMeters: 850,
          ),
          const ZoneMetrics(
            id: "ZONE_C",
            name: "ZONE C",
            location: "Dadar Covered Terminal",
            pressure: 42,
            level: PressureLevel.NORMAL,
            color: AppTheme.green,
            trend: "► Protected Flow",
            reason: "Fully covered elevated concourse and dry AC shuttle bays.",
            recommendation: "★ JUNCTION RECOMMENDED dry transit corridor.",
            latitude: 19.0178,
            longitude: 72.8478,
            radiusMeters: 1150,
          ),
        ];

      case ScenarioId.ACCOMMODATION_SATURATION:
        return [
          const ZoneMetrics(
            id: "ZONE_A",
            name: "ZONE A",
            location: "South Mumbai Hotels",
            pressure: 96,
            level: PressureLevel.CRITICAL,
            color: AppTheme.red,
            trend: "▲ 98% Occupancy",
            reason: "Hotel saturation in Nariman Point & Churchgate (2-4 rooms left).",
            recommendation: "South Mumbai hotels fully booked. Redirect to Zone C.",
            latitude: 18.9322,
            longitude: 72.8264,
            radiusMeters: 900,
          ),
          const ZoneMetrics(
            id: "ZONE_B",
            name: "ZONE B",
            location: "Marine Drive Hotels",
            pressure: 90,
            level: PressureLevel.CRITICAL,
            color: AppTheme.red,
            trend: "▲ 94% Occupancy",
            reason: "High surge pricing & minimal room availability.",
            recommendation: "Rates escalated 2.5x due to match demand.",
            latitude: 18.9400,
            longitude: 72.8353,
            radiusMeters: 850,
          ),
          const ZoneMetrics(
            id: "ZONE_C",
            name: "ZONE C",
            location: "Dadar Hotel Hub",
            pressure: 50,
            level: PressureLevel.NORMAL,
            color: AppTheme.green,
            trend: "► 100+ Usable Rooms",
            reason: "Partner hotels retaining guaranteed room blocks & standard rates.",
            recommendation: "★ JUNCTION RECOMMENDED — 60% lower rates & high availability.",
            latitude: 19.0178,
            longitude: 72.8478,
            radiusMeters: 1250,
          ),
        ];

      case ScenarioId.EVENT_DELAY:
        return [
          const ZoneMetrics(
            id: "ZONE_A",
            name: "ZONE A",
            location: "Stadium Perimeter",
            pressure: 75,
            level: PressureLevel.HIGH,
            color: AppTheme.orange,
            trend: "▲ +30m Gate Hold",
            reason: "Match start delayed by 30 minutes. Gate entry throttled.",
            recommendation: "Relax at nearby food zones before entering gates.",
            latitude: 18.9322,
            longitude: 72.8264,
            radiusMeters: 850,
          ),
          const ZoneMetrics(
            id: "ZONE_B",
            name: "ZONE B",
            location: "Fort / Kala Ghoda",
            pressure: 65,
            level: PressureLevel.WATCH,
            color: AppTheme.yellow,
            trend: "▲ Dining Surge",
            reason: "Attendees lingering at cafes due to delayed stadium gates.",
            recommendation: "Pre-book dining or visit Zone C for instant seating.",
            latitude: 18.9400,
            longitude: 72.8353,
            radiusMeters: 900,
          ),
          const ZoneMetrics(
            id: "ZONE_C",
            name: "ZONE C",
            location: "Dadar Express Hub",
            pressure: 35,
            level: PressureLevel.NORMAL,
            color: AppTheme.green,
            trend: "► Smooth Flow",
            reason: "Shuttle frequencies adjusted to match delayed exit schedule.",
            recommendation: "★ JUNCTION RECOMMENDED relaxed arrival window.",
            latitude: 19.0178,
            longitude: 72.8478,
            radiusMeters: 1200,
          ),
        ];

      case ScenarioId.NORMAL:
        return [
          const ZoneMetrics(
            id: "ZONE_A",
            name: "ZONE A",
            location: "Churchgate",
            pressure: 62,
            level: PressureLevel.WATCH,
            color: AppTheme.yellow,
            trend: "► Moderate Flow",
            reason: "Standard match day movement with baseline passenger queues.",
            recommendation: "Proceed with normal caution at station turnstiles.",
            latitude: 18.9322,
            longitude: 72.8264,
            radiusMeters: 750,
          ),
          const ZoneMetrics(
            id: "ZONE_B",
            name: "ZONE B",
            location: "CSMT / Fort",
            pressure: 48,
            level: PressureLevel.NORMAL,
            color: AppTheme.green,
            trend: "► Steady Flow",
            reason: "Smooth Central Line passenger flow with minor wait times.",
            recommendation: "Clear transit path available via Mahapalika Marg.",
            latitude: 18.9400,
            longitude: 72.8353,
            radiusMeters: 800,
          ),
          const ZoneMetrics(
            id: "ZONE_C",
            name: "ZONE C",
            location: "Dadar Hub",
            pressure: 30,
            level: PressureLevel.NORMAL,
            color: AppTheme.green,
            trend: "▼ -45% Crowd",
            reason: "Optimal capacity on dedicated express shuttle lanes.",
            recommendation: "★ JUNCTION RECOMMENDED route corridor.",
            latitude: 19.0178,
            longitude: 72.8478,
            radiusMeters: 1100,
          ),
        ];
    }
  }

  /// Returns active alerts for the current scenario.
  static List<Alert> getScenarioAlerts(ScenarioId scenario) {
    final timestamp = "Just now";
    switch (scenario) {
      case ScenarioId.POST_EVENT_SURGE:
        return [
          Alert(
            id: "ALT_SURGE_1",
            severity: AlertSeverity.CRITICAL,
            category: AlertCategory.CROWD,
            title: "Post-Match Exit Surge Warning",
            message: "Churchgate Station is at 94% capacity. Organizers strongly recommend taking the Dadar Express Shuttle.",
            timestamp: timestamp,
            actionLabel: "View Dadar Route",
            actionRoute: "plan",
          ),
          Alert(
            id: "ALT_SURGE_2",
            severity: AlertSeverity.HIGH,
            category: AlertCategory.TRANSPORT,
            title: "Dedicated Shuttle Lanes Active",
            message: "BEST AC Electric Shuttles are operating every 3 minutes from Dadar TT Circle to Gate 3.",
            timestamp: timestamp,
            actionLabel: "Shuttle Schedule",
            actionRoute: "plan",
          ),
        ];

      case ScenarioId.TRANSPORT_DISRUPTION:
        return [
          Alert(
            id: "ALT_DISRUPT_1",
            severity: AlertSeverity.CRITICAL,
            category: AlertCategory.TRANSPORT,
            title: "Western Railway Disruption Alert",
            message: "Signal delay between Bandra and Churchgate. Western Line local trains delayed by 25+ minutes.",
            timestamp: timestamp,
            actionLabel: "Use Central Line",
            actionRoute: "plan",
          ),
          Alert(
            id: "ALT_DISRUPT_2",
            severity: AlertSeverity.HIGH,
            category: AlertCategory.CROWD,
            title: "CSMT Platform Backlog",
            message: "Passengers rerouting to Central Line. Platform 1 & 2 congested.",
            timestamp: timestamp,
          ),
        ];

      case ScenarioId.HEAVY_RAIN:
        return [
          Alert(
            id: "ALT_RAIN_1",
            severity: AlertSeverity.HIGH,
            category: AlertCategory.WEATHER,
            title: "Heavy Monsoon Rain Advisory",
            message: "Waterlogging reported near Churchgate subway. Use covered FOB skywalks or Dadar AC shuttles.",
            timestamp: timestamp,
            actionLabel: "See Dry Route",
            actionRoute: "plan",
          ),
        ];

      case ScenarioId.ACCOMMODATION_SATURATION:
        return [
          Alert(
            id: "ALT_HOTEL_1",
            severity: AlertSeverity.CRITICAL,
            category: AlertCategory.ACCOMMODATION,
            title: "South Mumbai Hotel Saturation",
            message: "Zone A hotels have fewer than 5 rooms available. JUNCTION has unlocked guaranteed room blocks in Zone C (Dadar).",
            timestamp: timestamp,
            actionLabel: "Book Zone C Hotel",
            actionRoute: "stay",
          ),
        ];

      case ScenarioId.EVENT_DELAY:
        return [
          Alert(
            id: "ALT_DELAY_1",
            severity: AlertSeverity.WATCH,
            category: AlertCategory.EVENT,
            title: "Match Start Delayed (+30 Mins)",
            message: "Toss delayed by 30 minutes due to ground preparation. Gates remain open with controlled entry.",
            timestamp: timestamp,
            actionLabel: "Explore Nearby Dining",
            actionRoute: "food",
          ),
        ];

      case ScenarioId.NORMAL:
        return [
          Alert(
            id: "ALT_NORM_1",
            severity: AlertSeverity.INFO,
            category: AlertCategory.CROWD,
            title: "Normal Operations Active",
            message: "Match egress flow operating smoothly. All transit corridors open.",
            timestamp: timestamp,
            actionLabel: "Plan Journey",
            actionRoute: "plan",
          ),
        ];
    }
  }
}
