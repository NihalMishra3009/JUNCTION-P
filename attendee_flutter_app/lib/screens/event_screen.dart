import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/map_destination.dart';
import '../models/types.dart';
import '../services/crowd_routing_service.dart';
import '../services/location_service.dart';
import '../services/navigation_service.dart';
import '../services/routing_service.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/pill_badge.dart';
import '../widgets/motion_tap.dart';

class EventScreen extends StatelessWidget {
  final AppState appState;

  const EventScreen({super.key, required this.appState});

  Future<void> _makePhoneCall(String phoneNumber, BuildContext context) async {
    final Uri launchUri = Uri(
      scheme: 'tel',
      path: phoneNumber,
    );
    try {
      final launched = await launchUrl(launchUri, mode: LaunchMode.externalApplication);
      if (!launched) {
        await launchUrl(launchUri);
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Calling $phoneNumber..."),
            backgroundColor: AppTheme.ink,
          ),
        );
      }
    }
  }

  Future<void> _navigateToVenue(BuildContext context) async {
    const venueDest = MapDestination.wankhedeStadium;
    final userLoc = await LocationService.getCurrentLocation() ?? LocationService.defaultDemoLocation;

    final rawRoutes = await RoutingService.getRoutes(
      origin: userLoc,
      destination: venueDest.location,
    );

    final scoredRoutes = CrowdRoutingService.evaluateAndScoreRoutes(
      rawRoutes: rawRoutes,
      appState: appState,
    );

    if (scoredRoutes.isNotEmpty) {
      final bestRoute = scoredRoutes.firstWhere((r) => r.recommended, orElse: () => scoredRoutes.first);
      NavigationService().setAvailableRoutes(scoredRoutes, selected: bestRoute);
      NavigationService().startNavigation(bestRoute, userLoc);
      appState.setTabIndex(0); // Switch to Plan screen map
    }

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppTheme.ink,
          content: Text(
            "Navigating to Wankhede Stadium on JUNCTION map.",
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDelay = appState.activeScenario == ScenarioId.EVENT_DELAY;
    final event = appState.eventInfo;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 140),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "MATCH & VENUE GUIDE",
            style: AppTheme.metaText(fontSize: 12, color: AppTheme.inkMuted),
          ).animate().fadeIn(duration: 250.ms),
          const SizedBox(height: 6),
          Text(
            "Event Information",
            style: AppTheme.displayFont(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.5,
            ),
          ).animate().fadeIn(duration: 300.ms, delay: 50.ms).slideY(begin: 0.08, end: 0),
          const SizedBox(height: 16),

          // Main Event Card
          Container(
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
                    const PillBadge(
                      text: "● LIVE",
                      variant: PillVariant.live,
                      fontSize: 10,
                    ),
                    if (isDelay)
                      const PillBadge(
                        text: "DELAYED +30 MIN",
                        variant: PillVariant.critical,
                        fontSize: 10,
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  event.name,
                  style: AppTheme.displayFont(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  event.venue,
                  style: AppTheme.bodyFont(
                    fontSize: 13,
                    color: AppTheme.inkMuted,
                  ),
                ),
                const SizedBox(height: 16),

                // Directions Button
                MotionTap(
                  onTap: () => _navigateToVenue(context),
                  scaleDown: 0.96,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: AppTheme.yellow,
                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.yellow.withValues(alpha: 0.3),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.navigation, size: 16, color: AppTheme.ink),
                        const SizedBox(width: 8),
                        Text(
                          "GET DIRECTIONS TO VENUE",
                          style: AppTheme.displayFont(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Timetable Grid
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.paper,
                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "GATE OPEN",
                              style: AppTheme.metaText(
                                fontSize: 9,
                                color: AppTheme.inkFaint,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              isDelay ? "19:30" : "18:00",
                              style: AppTheme.displayFont(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "MATCH START",
                              style: AppTheme.metaText(
                                fontSize: 9,
                                color: AppTheme.inkFaint,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              isDelay ? "20:00" : "19:30",
                              style: AppTheme.displayFont(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: isDelay ? AppTheme.red : AppTheme.ink,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "EST END",
                              style: AppTheme.metaText(
                                fontSize: 9,
                                color: AppTheme.inkFaint,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              isDelay ? "23:00" : "22:30",
                              style: AppTheme.displayFont(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          )
              .animate()
              .fadeIn(duration: 350.ms, delay: 80.ms)
              .slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic),

          const SizedBox(height: 20),

          // Allocated Gate Card
          Container(
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
                Text(
                  "YOUR ALLOCATED GATE",
                  style: AppTheme.metaText(fontSize: 11, color: AppTheme.inkMuted),
                ),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppTheme.yellowLight,
                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                    border: Border.all(color: AppTheme.yellow),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.meeting_room, size: 20, color: AppTheme.ink),
                      const SizedBox(width: 10),
                      Text(
                        event.allocatedGate,
                        style: AppTheme.displayFont(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  "Arrive at least 30 minutes before match time. Expect security queue screening at peak arrival waves.",
                  style: AppTheme.bodyFont(
                    fontSize: 12,
                    color: AppTheme.inkMuted,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          )
              .animate()
              .fadeIn(duration: 350.ms, delay: 150.ms)
              .slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic),

          const SizedBox(height: 20),

          // Emergency Help Section
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.redBg,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
              border: Border.all(color: AppTheme.red.withValues(alpha: 0.3), width: 1.2),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "EMERGENCY & SUPPORT",
                      style: AppTheme.displayFont(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.4,
                        color: AppTheme.red,
                      ),
                    ),
                    const PillBadge(
                      text: "24/7 HELPLINE",
                      variant: PillVariant.critical,
                      fontSize: 9,
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  "Direct emergency contact lines for venue security, medical first responders, and local authorities.",
                  style: AppTheme.bodyFont(
                    fontSize: 12,
                    color: AppTheme.inkLight,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 14),
                _buildEmergencyButton(
                  context: context,
                  label: "POLICE (112 / 100)",
                  number: "112",
                  icon: Icons.local_police,
                ),
                const SizedBox(height: 8),
                _buildEmergencyButton(
                  context: context,
                  label: "FIRE & RESCUE (101)",
                  number: "101",
                  icon: Icons.local_fire_department,
                ),
                const SizedBox(height: 8),
                _buildEmergencyButton(
                  context: context,
                  label: "AMBULANCE & MEDICAL (102)",
                  number: "102",
                  icon: Icons.medical_services,
                ),
              ],
            ),
          )
              .animate()
              .fadeIn(duration: 350.ms, delay: 200.ms)
              .slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic),

          const SizedBox(height: 20),

          // Venue Guidelines
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.white,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
              border: Border.all(color: AppTheme.neutral, width: 1.0),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "VENUE POLICIES",
                  style: AppTheme.metaText(fontSize: 11, color: AppTheme.inkMuted),
                ),
                const SizedBox(height: 12),
                _buildPolicyItem(Icons.shopping_bag_outlined, "Bag Policy", "Only small handbags (under 30x30cm) permitted."),
                const SizedBox(height: 8),
                _buildPolicyItem(Icons.water_drop_outlined, "Water Bottles", "Sealed clear bottles allowed; refills inside."),
                const SizedBox(height: 8),
                _buildPolicyItem(Icons.confirmation_number_outlined, "Return Rail Pass", "Pre-purchase return transit tickets to avoid queues."),
              ],
            ),
          )
              .animate()
              .fadeIn(duration: 350.ms, delay: 250.ms)
              .slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic),

          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildEmergencyButton({
    required BuildContext context,
    required String label,
    required String number,
    required IconData icon,
  }) {
    return MotionTap(
      onTap: () => _makePhoneCall(number, context),
      scaleDown: 0.96,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppTheme.white,
          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
          border: Border.all(color: AppTheme.red.withValues(alpha: 0.4)),
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: AppTheme.red),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                label,
                style: AppTheme.displayFont(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.ink,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.red,
                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
              ),
              child: const Text(
                "CALL",
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 11,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPolicyItem(IconData icon, String title, String desc) {
    return MotionTap(
      onTap: () {},
      scaleDown: 0.98,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(5),
              decoration: BoxDecoration(
                color: AppTheme.paperDark,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 14, color: AppTheme.ink),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: RichText(
                text: TextSpan(
                  style: AppTheme.bodyFont(fontSize: 12, color: AppTheme.inkLight),
                  children: [
                    TextSpan(
                      text: "$title: ",
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    TextSpan(text: desc),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

