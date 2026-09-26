import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../models/types.dart';
import '../data/mock_data.dart';
import '../services/scenario_intelligence_service.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/pill_badge.dart';
import '../widgets/motion_tap.dart';

class HomeScreen extends StatelessWidget {
  final AppState appState;

  const HomeScreen({super.key, required this.appState});

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return "GOOD MORNING";
    if (hour < 17) return "GOOD AFTERNOON";
    return "GOOD EVENING";
  }

  void _showZoneDetailsModal(BuildContext context, ZoneMetrics zone) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      backgroundColor: AppTheme.white,
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          zone.name,
                          style: AppTheme.displayFont(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.ink,
                          ),
                        ),
                        Text(
                          zone.location,
                          style: AppTheme.bodyFont(fontSize: 12, color: AppTheme.inkMuted),
                        ),
                      ],
                    ),
                    PillBadge(
                      text: "${zone.pressure}% PRESSURE",
                      variant: zone.pressure >= 85
                          ? PillVariant.critical
                          : (zone.pressure >= 70 ? PillVariant.high : PillVariant.live),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: zone.color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                    border: Border.all(color: zone.color, width: 1.0),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.analytics, color: zone.color, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          "Trend: ${zone.trend}",
                          style: AppTheme.displayFont(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.ink,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  "OPERATIONAL ANALYSIS",
                  style: AppTheme.metaText(fontSize: 10, color: AppTheme.inkFaint),
                ),
                const SizedBox(height: 4),
                Text(
                  zone.reason,
                  style: AppTheme.bodyFont(fontSize: 13, color: AppTheme.inkLight),
                ),
                const SizedBox(height: 14),
                Text(
                  "JUNCTION RECOMMENDATION",
                  style: AppTheme.metaText(fontSize: 10, color: AppTheme.inkFaint),
                ),
                const SizedBox(height: 4),
                Text(
                  zone.recommendation,
                  style: AppTheme.bodyFont(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.ink,
                  ),
                ),
                const SizedBox(height: 20),
                MotionTap(
                  onTap: () {
                    Navigator.pop(ctx);
                    appState.setTabIndex(0); // Go to Plan
                  },
                  scaleDown: 0.96,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: AppTheme.yellow,
                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      "VIEW ADAPTIVE ROUTES →",
                      style: AppTheme.displayFont(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final alerts = appState.alerts;
    final topAlert = alerts.isNotEmpty ? alerts.first : null;
    final hasRec = appState.hasAttendeeRecommendation;
    final scenario = appState.activeScenario;
    final eventInfo = MockData.getEventInfo(scenario);

    // Get dynamic zone metrics based on active scenario
    final zones = ScenarioIntelligenceService.getZoneMetrics(scenario);
    final zoneA = zones.firstWhere((z) => z.id == "ZONE_A");
    final zoneB = zones.firstWhere((z) => z.id == "ZONE_B");
    final zoneC = zones.firstWhere((z) => z.id == "ZONE_C");

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 140),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Greeting
          Text(
            _getGreeting(),
            style: AppTheme.metaText(fontSize: 12, color: AppTheme.inkMuted),
          ).animate().fadeIn(duration: 300.ms),
          const SizedBox(height: 8),

          // 1. EVENT HEADER CARD
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.white,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
              border: Border.all(color: AppTheme.neutral, width: 1.0),
              boxShadow: AppTheme.shadowSm,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    PillBadge(
                      text: scenario == ScenarioId.EVENT_DELAY ? "● DELAYED (+30M)" : "● LIVE",
                      variant: scenario == ScenarioId.EVENT_DELAY ? PillVariant.watch : PillVariant.live,
                      fontSize: 10,
                    ),
                    Text(
                      "33,000 Expected",
                      style: AppTheme.metaText(
                        fontSize: 10,
                        color: AppTheme.inkMuted,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  eventInfo.name,
                  style: AppTheme.displayFont(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  "${eventInfo.venue} · ${eventInfo.startTime} · ${eventInfo.allocatedGate}",
                  style: AppTheme.bodyFont(
                    fontSize: 13,
                    color: AppTheme.inkMuted,
                  ),
                ),
              ],
            ),
          )
              .animate()
              .fadeIn(duration: 400.ms, delay: 50.ms)
              .slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic),

          const SizedBox(height: 16),

          // 2. CROWD INTELLIGENCE MAP (PLACED DIRECTLY AFTER EVENT CARD AS REQUESTED)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.white,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
              border: Border.all(color: AppTheme.neutral, width: 1.0),
              boxShadow: AppTheme.shadowSm,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        "CROWD INTELLIGENCE MAP",
                        style: AppTheme.metaText(fontSize: 11, color: AppTheme.inkMuted),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const PillBadge(
                      text: "JUNCTION SIMULATION",
                      variant: PillVariant.yellow,
                      fontSize: 9,
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  "Operational Zone Pressure (${scenario.displayName})",
                  style: AppTheme.displayFont(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  "Tap any zone chip to inspect crowd pressure & tactical recommendations.",
                  style: AppTheme.bodyFont(fontSize: 12, color: AppTheme.inkMuted),
                ),
                const SizedBox(height: 12),

                // Interactive Leaflet Map Preview with Scenario-Based Circles
                Container(
                  height: 240,
                  width: double.infinity,
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                    border: Border.all(color: AppTheme.neutralDark, width: 1.0),
                  ),
                  child: FlutterMap(
                    options: const MapOptions(
                      initialCenter: LatLng(18.9600, 72.8300),
                      initialZoom: 11.8,
                      maxZoom: 18.0,
                      minZoom: 9.0,
                    ),
                    children: [
                      TileLayer(
                        urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        subdomains: const ['a', 'b', 'c'],
                        userAgentPackageName: 'com.junction.attendee.app',
                        maxZoom: 19,
                      ),

                      // Dynamic Circle Layer bound to active scenario state
                      CircleLayer(
                        circles: [
                          CircleMarker(
                            point: LatLng(zoneA.latitude, zoneA.longitude),
                            color: zoneA.color.withValues(alpha: 0.28),
                            borderColor: zoneA.color,
                            borderStrokeWidth: 2.5,
                            useRadiusInMeter: true,
                            radius: zoneA.radiusMeters,
                          ),
                          CircleMarker(
                            point: LatLng(zoneB.latitude, zoneB.longitude),
                            color: zoneB.color.withValues(alpha: 0.28),
                            borderColor: zoneB.color,
                            borderStrokeWidth: 2.5,
                            useRadiusInMeter: true,
                            radius: zoneB.radiusMeters,
                          ),
                          CircleMarker(
                            point: LatLng(zoneC.latitude, zoneC.longitude),
                            color: zoneC.color.withValues(alpha: 0.28),
                            borderColor: zoneC.color,
                            borderStrokeWidth: 2.5,
                            useRadiusInMeter: true,
                            radius: zoneC.radiusMeters,
                          ),
                        ],
                      ),

                      // Markers Layer
                      MarkerLayer(
                        markers: [
                          // Venue Marker
                          Marker(
                            point: const LatLng(18.9389, 72.8258),
                            width: 36,
                            height: 36,
                            child: Container(
                              decoration: const BoxDecoration(
                                color: AppTheme.red,
                                shape: BoxShape.circle,
                                boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 4)],
                              ),
                              child: const Icon(Icons.stadium, color: Colors.white, size: 20),
                            ),
                          ),
                          // Zone A Marker
                          Marker(
                            point: LatLng(zoneA.latitude, zoneA.longitude),
                            width: 30,
                            height: 30,
                            child: Container(
                              decoration: BoxDecoration(
                                color: zoneA.color,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              alignment: Alignment.center,
                              child: const Text("A", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                            ),
                          ),
                          // Zone B Marker
                          Marker(
                            point: LatLng(zoneB.latitude, zoneB.longitude),
                            width: 30,
                            height: 30,
                            child: Container(
                              decoration: BoxDecoration(
                                color: zoneB.color,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              alignment: Alignment.center,
                              child: Text("B", style: TextStyle(color: zoneB.color == AppTheme.yellow ? AppTheme.ink : Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                            ),
                          ),
                          // Zone C Marker
                          Marker(
                            point: LatLng(zoneC.latitude, zoneC.longitude),
                            width: 30,
                            height: 30,
                            child: Container(
                              decoration: BoxDecoration(
                                color: zoneC.color,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              alignment: Alignment.center,
                              child: const Text("C", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Dynamic Zone Chips Row
                Row(
                  children: [
                    Expanded(
                      child: _buildZoneChip(
                        context: context,
                        zone: zoneA,
                        onTap: () => _showZoneDetailsModal(context, zoneA),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildZoneChip(
                        context: context,
                        zone: zoneB,
                        onTap: () => _showZoneDetailsModal(context, zoneB),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildZoneChip(
                        context: context,
                        zone: zoneC,
                        onTap: () => _showZoneDetailsModal(context, zoneC),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          )
              .animate()
              .fadeIn(duration: 400.ms, delay: 100.ms)
              .slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic),

          const SizedBox(height: 16),

          // 3. ALERT / RECOMMENDATION BANNER
          if (topAlert != null || hasRec)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: hasRec ? AppTheme.yellowLight : AppTheme.redBg,
                borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                border: Border.all(
                  color: hasRec ? AppTheme.yellow : AppTheme.red.withValues(alpha: 0.3),
                  width: 1.2,
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: hasRec ? AppTheme.ink : AppTheme.red,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      hasRec ? "★" : "!",
                      style: const TextStyle(
                        color: AppTheme.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          hasRec
                              ? "ORGANIZER RECOMMENDATION"
                              : topAlert?.title.toUpperCase() ?? "ALERT",
                          style: AppTheme.displayFont(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.4,
                            color: hasRec ? AppTheme.ink : AppTheme.red,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          hasRec
                              ? appState.attendeeRecommendationMessage
                              : topAlert?.message ?? "",
                          style: AppTheme.bodyFont(
                            fontSize: 13,
                            color: AppTheme.inkLight,
                            height: 1.3,
                          ),
                        ),
                        const SizedBox(height: 10),
                        MotionTap(
                          onTap: () => appState.setTabIndex(0),
                          scaleDown: 0.94,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: AppTheme.yellow,
                              borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                            ),
                            child: Text(
                              "See Options →",
                              style: AppTheme.displayFont(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            )
                .animate()
                .fadeIn(duration: 400.ms, delay: 140.ms)
                .scaleXY(begin: 0.96, end: 1.0, curve: Curves.easeOutBack),

          // 4. YOUR JOURNEY CARD
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.white,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
              border: Border.all(color: AppTheme.neutral, width: 1.0),
              boxShadow: AppTheme.shadowSm,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "YOUR JOURNEY",
                      style: AppTheme.metaText(
                        fontSize: 11,
                        color: AppTheme.inkMuted,
                      ),
                    ),
                    if (appState.attendeeSelectedRouteId != null)
                      const PillBadge(
                        text: "ROUTE CONFIRMED",
                        variant: PillVariant.live,
                        fontSize: 9,
                      ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "FROM",
                            style: AppTheme.metaText(
                              fontSize: 10,
                              color: AppTheme.inkFaint,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            "Harbour Line Area",
                            style: AppTheme.displayFont(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 8),
                      child: Icon(Icons.arrow_forward, size: 16, color: AppTheme.inkMuted),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "TO",
                            style: AppTheme.metaText(
                              fontSize: 10,
                              color: AppTheme.inkFaint,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            "Wankhede Stadium",
                            style: AppTheme.displayFont(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppTheme.paper,
                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          appState.attendeeSelectedRouteId != null
                              ? "Active: ${appState.attendeeSelectedRouteId} Route"
                              : "Balanced Route · ★ Recommended",
                          style: AppTheme.bodyFont(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: AppTheme.inkLight,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        appState.attendeeSelectedRouteId == "FASTEST"
                            ? (scenario == ScenarioId.TRANSPORT_DISRUPTION ? "45 min" : "24 min")
                            : appState.attendeeSelectedRouteId == "LOW_CROWD"
                                ? "48 min"
                                : "31 min",
                        style: AppTheme.displayFont(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                MotionTap(
                  onTap: () => appState.setTabIndex(0),
                  scaleDown: 0.96,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: AppTheme.yellow,
                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.yellow.withValues(alpha: 0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      appState.attendeeSelectedRouteId != null
                          ? "CHANGE ROUTE"
                          : "VIEW JOURNEY OPTIONS",
                      style: AppTheme.displayFont(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          )
              .animate()
              .fadeIn(duration: 400.ms, delay: 180.ms)
              .slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic),

          const SizedBox(height: 24),

          // 5. QUICK ACTIONS GRID
          Text(
            "QUICK ACTIONS",
            style: AppTheme.metaText(fontSize: 11, color: AppTheme.inkMuted),
          ).animate().fadeIn(delay: 200.ms),
          const SizedBox(height: 10),

          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.8,
            children: [
              _buildQuickCard(
                icon: "◇",
                label: "Plan Journey",
                subtext: "Fastest & balanced routes",
                onTap: () => appState.setTabIndex(0),
                delay: 220,
              ),
              _buildQuickCard(
                icon: "◈",
                label: "Find Stay",
                subtext: "Usable hotel inventory",
                onTap: () => appState.setTabIndex(1),
                delay: 260,
              ),
              _buildQuickCard(
                icon: "◆",
                label: "Food & Dining",
                subtext: "Wait times & deals",
                onTap: () => appState.setTabIndex(3),
                delay: 300,
              ),
              _buildQuickCard(
                icon: "★",
                label: "Event Info",
                subtext: "Gate 3 & timetable",
                onTap: () => appState.setTabIndex(4),
                delay: 340,
              ),
            ],
          ),

          const SizedBox(height: 24),

          // 6. DESTINATION ALERTS LIST
          Text(
            "DESTINATION ALERTS",
            style: AppTheme.metaText(fontSize: 11, color: AppTheme.inkMuted),
          ).animate().fadeIn(delay: 380.ms),
          const SizedBox(height: 10),

          ...List.generate(alerts.length, (i) {
            final a = alerts[i];
            PillVariant variant;
            if (a.severity == AlertSeverity.CRITICAL) {
              variant = PillVariant.critical;
            } else if (a.severity == AlertSeverity.HIGH) {
              variant = PillVariant.high;
            } else {
              variant = PillVariant.watch;
            }

            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.white,
                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                border: Border.all(color: AppTheme.neutral, width: 1.0),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      PillBadge(
                        text: a.category.name,
                        variant: variant,
                        fontSize: 9,
                      ),
                      Text(
                        a.timestamp,
                        style: AppTheme.metaText(
                          fontSize: 10,
                          color: AppTheme.inkFaint,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    a.title,
                    style: AppTheme.displayFont(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    a.message,
                    style: AppTheme.bodyFont(
                      fontSize: 12,
                      color: AppTheme.inkMuted,
                    ),
                  ),
                  if (a.actionLabel != null) ...[
                    const SizedBox(height: 10),
                    MotionTap(
                      onTap: () {
                        if (a.actionRoute == "stay") {
                          appState.setTabIndex(1);
                        } else {
                          appState.setTabIndex(0);
                        }
                      },
                      scaleDown: 0.94,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: AppTheme.paper,
                          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                          border: Border.all(color: AppTheme.neutralDark),
                        ),
                        child: Text(
                          "${a.actionLabel} →",
                          style: AppTheme.displayFont(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            )
                .animate()
                .fadeIn(duration: 350.ms, delay: Duration(milliseconds: 400 + (i * 60)))
                .slideX(begin: 0.05, end: 0, curve: Curves.easeOutCubic);
          }),

          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildZoneChip({
    required BuildContext context,
    required ZoneMetrics zone,
    required VoidCallback onTap,
  }) {
    return MotionTap(
      onTap: onTap,
      scaleDown: 0.94,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppTheme.paper,
          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
          border: Border.all(color: zone.color, width: 1.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  zone.name,
                  style: AppTheme.displayFont(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.ink,
                  ),
                ),
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: zone.color,
                    shape: BoxShape.circle,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              zone.location,
              style: AppTheme.bodyFont(fontSize: 10, color: AppTheme.inkMuted),
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 6),
            Text(
              "${zone.pressure}% PRESSURE",
              style: AppTheme.displayFont(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: zone.color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickCard({
    required String icon,
    required String label,
    required String subtext,
    required VoidCallback onTap,
    required int delay,
  }) {
    return MotionTap(
      onTap: onTap,
      scaleDown: 0.94,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppTheme.white,
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          border: Border.all(color: AppTheme.neutral, width: 1.0),
          boxShadow: AppTheme.shadowSm,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  icon,
                  style: const TextStyle(
                    fontSize: 16,
                    color: AppTheme.ink,
                  ),
                ),
                const Icon(Icons.arrow_forward_ios, size: 10, color: AppTheme.inkFaint),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: AppTheme.displayFont(
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
            Text(
              subtext,
              style: AppTheme.bodyFont(
                fontSize: 10,
                color: AppTheme.inkMuted,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 300.ms, delay: Duration(milliseconds: delay));
  }
}
