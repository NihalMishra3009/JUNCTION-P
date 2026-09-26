import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:latlong2/latlong.dart';
import '../models/map_destination.dart';
import '../models/types.dart';
import 'destination_route_screen.dart';
import '../services/maps_launcher.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/pill_badge.dart';
import '../widgets/motion_tap.dart';

class FoodScreen extends StatefulWidget {
  final AppState appState;

  const FoodScreen({super.key, required this.appState});

  @override
  State<FoodScreen> createState() => _FoodScreenState();
}

class _FoodScreenState extends State<FoodScreen> {
  final String _selectedZone = "ALL";
  final bool _onlyDeals = false;

  Color _waitColor(int waitTime) {
    if (waitTime > 30) return AppTheme.red;
    if (waitTime > 15) return AppTheme.orange;
    return AppTheme.green;
  }

  void _showRestaurantDetailModal(BuildContext context, Restaurant r) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _RestaurantDetailSheet(restaurant: r, appState: widget.appState),
    );
  }

  @override
  Widget build(BuildContext context) {
    var restaurants = [...widget.appState.restaurants];

    if (_selectedZone != "ALL") {
      restaurants = restaurants.where((r) => r.zone == _selectedZone).toList();
    }
    if (_onlyDeals) {
      restaurants = restaurants.where((r) => r.hasIncentive).toList();
    }

    restaurants.sort((a, b) => a.waitTime.compareTo(b.waitTime));

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 140),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "LOCAL DINING & SERVICES",
            style: AppTheme.metaText(fontSize: 12, color: AppTheme.inkMuted),
          ).animate().fadeIn(duration: 250.ms),
          const SizedBox(height: 6),
          Text(
            "Food & Services",
            style: AppTheme.displayFont(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.5,
            ),
          ).animate().fadeIn(duration: 300.ms, delay: 50.ms).slideY(begin: 0.08, end: 0),
          const SizedBox(height: 4),
          Text(
            "Tap any restaurant or café to view live photos, special menus, directions & match offers",
            style: AppTheme.bodyFont(fontSize: 13, color: AppTheme.inkMuted),
          ).animate().fadeIn(delay: 100.ms),
          const SizedBox(height: 16),



          ...List.generate(restaurants.length, (idx) {
            final r = restaurants[idx];
            PillVariant variant;
            if (r.pressureLevel == PressureLevel.CRITICAL) {
              variant = PillVariant.critical;
            } else if (r.pressureLevel == PressureLevel.HIGH) {
              variant = PillVariant.high;
            } else if (r.pressureLevel == PressureLevel.WATCH) {
              variant = PillVariant.watch;
            } else {
              variant = PillVariant.live;
            }

            return MotionTap(
              onTap: () => _showRestaurantDetailModal(context, r),
              scaleDown: 0.98,
              child: Container(
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: AppTheme.white,
                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  border: Border.all(
                    color: r.recommended ? AppTheme.yellow : AppTheme.neutral,
                    width: r.recommended ? 1.5 : 1.0,
                  ),
                  boxShadow: AppTheme.shadowSm,
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header Thumbnail + Meta
                      Stack(
                        children: [
                          if (r.imageUrl != null)
                            SizedBox(
                              height: 120,
                              width: double.infinity,
                              child: Image.network(
                                r.imageUrl!,
                                fit: BoxFit.cover,
                                errorBuilder: (ctx, err, stack) => Container(
                                  color: AppTheme.neutral,
                                  child: const Center(
                                    child: Icon(Icons.restaurant, color: AppTheme.inkMuted, size: 36),
                                  ),
                                ),
                              ),
                            )
                          else
                            Container(
                              height: 90,
                              color: AppTheme.neutral,
                              child: const Center(
                                child: Icon(Icons.restaurant, color: AppTheme.inkMuted, size: 36),
                              ),
                            ),
                          // Gradient overlay
                          Positioned.fill(
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [
                                    Colors.black.withValues(alpha: 0.2),
                                    Colors.black.withValues(alpha: 0.65),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          // Rating & Badge top row
                          Positioned(
                            top: 10,
                            left: 12,
                            right: 12,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.7),
                                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.star, color: AppTheme.yellow, size: 14),
                                      const SizedBox(width: 4),
                                      Text(
                                        "${r.rating} (${r.reviewsCount}+)",
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                PillBadge(
                                  text: r.pressureLevel.name,
                                  variant: variant,
                                  fontSize: 9,
                                ),
                              ],
                            ),
                          ),
                          // Restaurant Title & Cuisine on Image
                          Positioned(
                            bottom: 10,
                            left: 12,
                            right: 12,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        r.name,
                                        style: AppTheme.displayFont(
                                          fontSize: 18,
                                          fontWeight: FontWeight.w800,
                                          color: Colors.white,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    if (r.recommended)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppTheme.yellow,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          "FEATURED",
                                          style: AppTheme.metaText(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w900,
                                            color: AppTheme.ink,
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  "${r.cuisine} · ${r.zone.replaceAll('_', ' ')}",
                                  style: AppTheme.bodyFont(
                                    fontSize: 12,
                                    color: Colors.white.withValues(alpha: 0.9),
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      // Metrics Row
                      Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        "WAIT NOW",
                                        style: AppTheme.metaText(
                                          fontSize: 9,
                                          color: AppTheme.inkFaint,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        "${r.waitTime} min",
                                        style: AppTheme.displayFont(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w800,
                                          color: _waitColor(r.waitTime),
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
                                        "PREDICTED",
                                        style: AppTheme.metaText(
                                          fontSize: 9,
                                          color: AppTheme.inkFaint,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        "${r.predictedWaitTime} min",
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
                                        "TRANSIT",
                                        style: AppTheme.metaText(
                                          fontSize: 9,
                                          color: AppTheme.inkFaint,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        "${r.distanceFromVenue} min",
                                        style: AppTheme.displayFont(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: AppTheme.paper,
                                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                  ),
                                  child: const Icon(Icons.arrow_forward_ios, size: 12, color: AppTheme.inkMuted),
                                ),
                              ],
                            ),

                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            )
                .animate()
                .fadeIn(duration: 350.ms, delay: Duration(milliseconds: 100 + (idx * 50)))
                .slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic);
          }),

          const SizedBox(height: 20),
        ],
      ),
    );
  }


}

class _RestaurantDetailSheet extends StatefulWidget {
  final Restaurant restaurant;
  final AppState appState;

  const _RestaurantDetailSheet({required this.restaurant, required this.appState});

  @override
  State<_RestaurantDetailSheet> createState() => _RestaurantDetailSheetState();
}

class _RestaurantDetailSheetState extends State<_RestaurantDetailSheet> {
  bool _offerClaimed = false;

  @override
  Widget build(BuildContext context) {
    final r = widget.restaurant;

    return DraggableScrollableSheet(
      initialChildSize: 0.88,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: AppTheme.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              // Drag handle
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(
                    color: AppTheme.neutral,
                    borderRadius: BorderRadius.circular(2.5),
                  ),
                ),
              ),

              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                  children: [
                    // Hero Image
                    if (r.imageUrl != null)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        child: SizedBox(
                          height: 200,
                          width: double.infinity,
                          child: Image.network(
                            r.imageUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (ctx, err, stack) => Container(
                              color: AppTheme.neutral,
                              child: const Icon(Icons.restaurant, size: 50, color: AppTheme.inkMuted),
                            ),
                          ),
                        ),
                      ),
                    const SizedBox(height: 16),

                    // Name & Rating
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                r.name,
                                style: AppTheme.displayFont(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "${r.cuisine} · ${r.zone.replaceAll('_', ' ')}",
                                style: AppTheme.bodyFont(
                                  fontSize: 14,
                                  color: AppTheme.inkMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppTheme.yellowLight,
                            border: Border.all(color: AppTheme.yellow),
                            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.star, color: AppTheme.ink, size: 16),
                              const SizedBox(width: 4),
                              Text(
                                "${r.rating}",
                                style: AppTheme.displayFont(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Live Status Cards
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppTheme.paper,
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        border: Border.all(color: AppTheme.neutral),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildStatusItem("Current Wait", "${r.waitTime} min", Icons.timer_outlined, AppTheme.ink),
                          Container(width: 1, height: 32, color: AppTheme.neutral),
                          _buildStatusItem("Open Tables", "${r.availableTables} of ${r.capacity ~/ 4}", Icons.table_restaurant_outlined, AppTheme.green),
                          Container(width: 1, height: 32, color: AppTheme.neutral),
                          _buildStatusItem("Distance", "${r.distanceFromVenue} min", Icons.directions_walk, AppTheme.ink),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Location & Hours
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppTheme.white,
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        border: Border.all(color: AppTheme.neutral),
                      ),
                      child: Column(
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.location_on_outlined, size: 18, color: AppTheme.inkMuted),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  r.address,
                                  style: AppTheme.bodyFont(fontSize: 13, color: AppTheme.ink),
                                ),
                              ),
                            ],
                          ),
                          const Divider(height: 20, color: AppTheme.neutral),
                          Row(
                            children: [
                              const Icon(Icons.access_time, size: 18, color: AppTheme.inkMuted),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  "Hours: ${r.openingHours}",
                                  style: AppTheme.bodyFont(fontSize: 13, color: AppTheme.ink),
                                ),
                              ),
                            ],
                          ),
                          if (r.phone != null) ...[
                            const Divider(height: 20, color: AppTheme.neutral),
                            Row(
                              children: [
                                const Icon(Icons.phone_outlined, size: 18, color: AppTheme.inkMuted),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    r.phone!,
                                    style: AppTheme.bodyFont(fontSize: 13, color: AppTheme.ink),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Match Discount Voucher Banner
                    if (r.hasIncentive) ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: _offerClaimed ? AppTheme.greenBg : AppTheme.yellowLight,
                          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                          border: Border.all(
                            color: _offerClaimed ? AppTheme.green : AppTheme.yellow,
                            width: 1.5,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              _offerClaimed ? Icons.check_circle : Icons.local_offer_outlined,
                              color: _offerClaimed ? AppTheme.green : AppTheme.ink,
                              size: 24,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _offerClaimed ? "VOUCHER ACTIVE (SHOW AT BILLING)" : "EXCLUSIVE MATCH ATTENDEE DEAL",
                                    style: AppTheme.metaText(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      color: _offerClaimed ? AppTheme.green : AppTheme.ink,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    r.incentiveLabel ?? "Special Match Discount",
                                    style: AppTheme.displayFont(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  if (_offerClaimed)
                                    Text(
                                      "Code: JUNCTION-${r.id}-2026",
                                      style: AppTheme.metaText(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.ink),
                                    ),
                                ],
                              ),
                            ),
                            ElevatedButton(
                              onPressed: () {
                                setState(() {
                                  _offerClaimed = !_offerClaimed;
                                });
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _offerClaimed ? AppTheme.green : AppTheme.ink,
                                foregroundColor: AppTheme.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                ),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              ),
                              child: Text(
                                _offerClaimed ? "Applied" : "Claim",
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // Popular Dishes / Menu Highlights
                    Text(
                      "SIGNATURE MENU & SPECIALS",
                      style: AppTheme.metaText(fontSize: 11, color: AppTheme.inkMuted),
                    ),
                    const SizedBox(height: 10),

                    if (r.menuItems.isNotEmpty)
                      ...r.menuItems.map((item) => Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.white,
                              borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                              border: Border.all(color: AppTheme.neutral),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  margin: const EdgeInsets.only(top: 3, right: 10),
                                  padding: const EdgeInsets.all(3),
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                      color: item.isVeg ? Colors.green : Colors.red,
                                      width: 1.5,
                                    ),
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                  child: Container(
                                    width: 6,
                                    height: 6,
                                    decoration: BoxDecoration(
                                      color: item.isVeg ? Colors.green : Colors.red,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              item.name,
                                              style: AppTheme.displayFont(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                          ),
                                          Text(
                                            item.price,
                                            style: AppTheme.displayFont(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w800,
                                              color: AppTheme.ink,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        item.description,
                                        style: AppTheme.bodyFont(fontSize: 12, color: AppTheme.inkMuted),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ))
                    else
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppTheme.neutral,
                          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                        ),
                        child: const Center(
                          child: Text("Authentic regional dining selection available in-store."),
                        ),
                      ),
                  ],
                ),
              ),

              // Pinned Bottom Actions Bar with safe padding
              Container(
                padding: EdgeInsets.fromLTRB(
                  20,
                  12,
                  20,
                  MediaQuery.of(context).padding.bottom + 16,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 10,
                      offset: const Offset(0, -4),
                    ),
                  ],
                  border: const Border(
                    top: BorderSide(color: AppTheme.neutral),
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          final double? lat = r.latitude;
                          final double? lng = r.longitude;

                          if (lat == null || lng == null) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text("Restaurant location unavailable"),
                                backgroundColor: Colors.red,
                              ),
                            );
                            return;
                          }

                          final origin = MapDestination.wankhedeStadium;
                          assert(
                            lat != origin.location.latitude || lng != origin.location.longitude,
                            "Origin and Destination coordinates must be distinct!",
                          );

                          debugPrint("""
NAVIGATION REQUEST

Origin:
${origin.name}
${origin.location.latitude}, ${origin.location.longitude}

Destination:
${r.name}
$lat, $lng
""");

                          final mapDest = MapDestination(
                            id: r.id,
                            name: r.name,
                            address: r.address,
                            location: LatLng(lat, lng),
                            type: DestinationType.RESTAURANT,
                          );

                          Navigator.pop(context); // Close bottom modal
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => DestinationRouteScreen(
                                destination: mapDest,
                                origin: MapDestination.wankhedeStadium,
                                appState: widget.appState,
                              ),
                            ),
                          );
                        },
                        icon: const Icon(Icons.directions, size: 18),
                        label: const Text("Get Route"),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.ink,
                          side: const BorderSide(color: AppTheme.ink, width: 1.5),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () async {
                          final url = r.reservationUrl ?? r.websiteUrl;
                          if (url == null || url.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text("Table reservation link is not available for this restaurant."),
                              ),
                            );
                            return;
                          }
                          final opened = await MapsLauncherService.openExternalUrl(url);
                          if (context.mounted) {
                            if (opened) {
                              Navigator.pop(context);
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text("Unable to open restaurant reservation website."),
                                ),
                              );
                            }
                          }
                        },
                        icon: const Icon(Icons.table_restaurant, size: 18),
                        label: const Text("Reserve Table"),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.yellow,
                          foregroundColor: AppTheme.ink,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatusItem(String label, String value, IconData icon, Color valColor) {
    return Column(
      children: [
        Icon(icon, size: 18, color: AppTheme.inkMuted),
        const SizedBox(height: 4),
        Text(
          value,
          style: AppTheme.displayFont(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: valColor,
          ),
        ),
        Text(
          label,
          style: AppTheme.metaText(fontSize: 9, color: AppTheme.inkFaint),
        ),
      ],
    );
  }
}

