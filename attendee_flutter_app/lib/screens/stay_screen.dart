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
import '../widgets/pressure_bar.dart';
import '../widgets/motion_tap.dart';

class StayScreen extends StatefulWidget {
  final AppState appState;

  const StayScreen({super.key, required this.appState});

  @override
  State<StayScreen> createState() => _StayScreenState();
}

class _StayScreenState extends State<StayScreen> {
  String _selectedZoneFilter = "ALL";

  Color _pressureColor(int pressure) {
    if (pressure >= 85) return AppTheme.red;
    if (pressure >= 70) return AppTheme.orange;
    return AppTheme.green;
  }

  void _showHotelDetailModal(BuildContext context, Hotel hotel) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _HotelDetailSheet(hotel: hotel, appState: widget.appState),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hotels = widget.appState.hotels;
    final zoneA = hotels.where((h) => h.zone == "ZONE_A").toList();
    final zoneB = hotels.where((h) => h.zone == "ZONE_B").toList();
    final zoneC = hotels.where((h) => h.zone == "ZONE_C").toList();

    final zoneARooms = zoneA.fold(0, (sum, h) => sum + h.usableRooms);
    final zoneBRooms = zoneB.fold(0, (sum, h) => sum + h.usableRooms);
    final zoneCRooms = zoneC.fold(0, (sum, h) => sum + h.usableRooms);

    final zoneAPressure = (zoneA.fold(0, (sum, h) => sum + h.pressure) / (zoneA.isEmpty ? 1 : zoneA.length)).round();
    final zoneBPressure = (zoneB.fold(0, (sum, h) => sum + h.pressure) / (zoneB.isEmpty ? 1 : zoneB.length)).round();
    final zoneCPressure = (zoneC.fold(0, (sum, h) => sum + h.pressure) / (zoneC.isEmpty ? 1 : zoneC.length)).round();

    List<Hotel> displayHotels = [...zoneC, ...zoneB, ...zoneA];
    if (_selectedZoneFilter != "ALL") {
      displayHotels = displayHotels.where((h) => h.zone == _selectedZoneFilter).toList();
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 140),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "ACCOMMODATION CAPACITY",
            style: AppTheme.metaText(fontSize: 12, color: AppTheme.inkMuted),
          ).animate().fadeIn(duration: 250.ms),
          const SizedBox(height: 6),
          Text(
            "Find Match Stays",
            style: AppTheme.displayFont(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.5,
            ),
          ).animate().fadeIn(duration: 300.ms, delay: 50.ms).slideY(begin: 0.08, end: 0),
          const SizedBox(height: 4),
          Text(
            "Tap any hotel to explore live room inventory, photos, match shuttle & rates",
            style: AppTheme.bodyFont(fontSize: 13, color: AppTheme.inkMuted),
          ).animate().fadeIn(delay: 100.ms),
          const SizedBox(height: 16),

          // Zone Comparison Carousel / Cards
          Row(
            children: [
              Expanded(
                child: _buildZoneCard(
                  name: "Zone A",
                  subtitle: "South Mumbai",
                  rooms: zoneARooms,
                  pressure: zoneAPressure,
                  travelTime: 12,
                  isRecommended: false,
                  isSelected: _selectedZoneFilter == "ZONE_A",
                  onTap: () {
                    setState(() {
                      _selectedZoneFilter = _selectedZoneFilter == "ZONE_A" ? "ALL" : "ZONE_A";
                    });
                  },
                  delay: 80,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildZoneCard(
                  name: "Zone B",
                  subtitle: "Marine Drive",
                  rooms: zoneBRooms,
                  pressure: zoneBPressure,
                  travelTime: 18,
                  isRecommended: false,
                  isSelected: _selectedZoneFilter == "ZONE_B",
                  onTap: () {
                    setState(() {
                      _selectedZoneFilter = _selectedZoneFilter == "ZONE_B" ? "ALL" : "ZONE_B";
                    });
                  },
                  delay: 130,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildZoneCard(
                  name: "Zone C",
                  subtitle: "Dadar Hub",
                  rooms: zoneCRooms,
                  pressure: zoneCPressure,
                  travelTime: 22,
                  isRecommended: true,
                  isSelected: _selectedZoneFilter == "ZONE_C",
                  onTap: () {
                    setState(() {
                      _selectedZoneFilter = _selectedZoneFilter == "ZONE_C" ? "ALL" : "ZONE_C";
                    });
                  },
                  delay: 180,
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Hotel List Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "PARTICIPATING PROPERTIES (${displayHotels.length})",
                style: AppTheme.metaText(fontSize: 11, color: AppTheme.inkMuted),
              ),
              if (_selectedZoneFilter != "ALL")
                GestureDetector(
                  onTap: () => setState(() => _selectedZoneFilter = "ALL"),
                  child: const Text(
                    "Show All",
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.ink,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                )
              else
                const PillBadge(
                  text: "ZONE C RECOMMENDED",
                  variant: PillVariant.yellow,
                  fontSize: 9,
                ),
            ],
          ).animate().fadeIn(delay: 200.ms),
          const SizedBox(height: 12),

          ...List.generate(displayHotels.length, (idx) {
            final h = displayHotels[idx];
            final isZoneC = h.zone == "ZONE_C";

            return MotionTap(
              onTap: () => _showHotelDetailModal(context, h),
              scaleDown: 0.98,
              child: Container(
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: AppTheme.white,
                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  border: Border.all(
                    color: isZoneC ? AppTheme.yellow : AppTheme.neutral,
                    width: isZoneC ? 1.5 : 1.0,
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
                          if (h.imageUrl != null)
                            SizedBox(
                              height: 130,
                              width: double.infinity,
                              child: Image.network(
                                h.imageUrl!,
                                fit: BoxFit.cover,
                                errorBuilder: (ctx, err, stack) => Container(
                                  color: AppTheme.neutral,
                                  child: const Center(
                                    child: Icon(Icons.hotel, color: AppTheme.inkMuted, size: 36),
                                  ),
                                ),
                              ),
                            )
                          else
                            Container(
                              height: 90,
                              color: AppTheme.neutral,
                              child: const Center(
                                child: Icon(Icons.hotel, color: AppTheme.inkMuted, size: 36),
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
                                    Colors.black.withValues(alpha: 0.15),
                                    Colors.black.withValues(alpha: 0.70),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          // Top Badges
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
                                        "${h.rating} (${h.reviewsCount}+)",
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Flexible(
                                  child: PillBadge(
                                    text: h.zone.replaceAll("_", " "),
                                    variant: isZoneC
                                        ? PillVariant.live
                                        : h.pressureLevel == PressureLevel.WATCH
                                            ? PillVariant.watch
                                            : PillVariant.critical,
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Hotel Name & Price on Thumbnail
                          Positioned(
                            bottom: 10,
                            left: 12,
                            right: 12,
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        h.name,
                                        style: AppTheme.displayFont(
                                          fontSize: 17,
                                          fontWeight: FontWeight.w800,
                                          color: Colors.white,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        h.address,
                                        style: AppTheme.bodyFont(
                                          fontSize: 11,
                                          color: Colors.white.withValues(alpha: 0.9),
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: isZoneC ? AppTheme.yellow : Colors.white,
                                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                  ),
                                  child: Text(
                                    h.priceRange.split('–').first.trim(),
                                    style: AppTheme.displayFont(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                      color: AppTheme.ink,
                                    ),
                                  ),
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
                                        "USABLE ROOMS",
                                        style: AppTheme.metaText(
                                          fontSize: 9,
                                          color: AppTheme.inkFaint,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        "${h.usableRooms}",
                                        style: AppTheme.displayFont(
                                          fontSize: 17,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                      Text(
                                        "of ${h.availableRooms} open",
                                        style: AppTheme.bodyFont(
                                          fontSize: 10,
                                          color: AppTheme.inkMuted,
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
                                        "TO VENUE",
                                        style: AppTheme.metaText(
                                          fontSize: 9,
                                          color: AppTheme.inkFaint,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        "${h.travelTimeToVenue} min",
                                        style: AppTheme.displayFont(
                                          fontSize: 17,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                      Text(
                                        "direct transit",
                                        style: AppTheme.bodyFont(
                                          fontSize: 10,
                                          color: AppTheme.inkMuted,
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
                                        "PRESSURE",
                                        style: AppTheme.metaText(
                                          fontSize: 9,
                                          color: AppTheme.inkFaint,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        "${h.pressure}%",
                                        style: AppTheme.displayFont(
                                          fontSize: 17,
                                          fontWeight: FontWeight.w800,
                                          color: _pressureColor(h.pressure),
                                        ),
                                      ),
                                      Text(
                                        h.pressureLevel.name,
                                        style: AppTheme.bodyFont(
                                          fontSize: 10,
                                          color: _pressureColor(h.pressure),
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

                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppTheme.paper,
                                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.directions_bus_filled, size: 14, color: AppTheme.inkMuted),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      h.shuttleInfo,
                                      style: AppTheme.bodyFont(fontSize: 11, color: AppTheme.inkLight),
                                      overflow: TextOverflow.ellipsis,
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
                ),
              ),
            )
                .animate()
                .fadeIn(duration: 350.ms, delay: Duration(milliseconds: 100 + (idx * 50)))
                .slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic);
          }),

          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildZoneCard({
    required String name,
    required String subtitle,
    required int rooms,
    required int pressure,
    required int travelTime,
    required bool isRecommended,
    required bool isSelected,
    required VoidCallback onTap,
    required int delay,
  }) {
    return MotionTap(
      onTap: onTap,
      scaleDown: 0.94,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.ink : (isRecommended ? AppTheme.yellowLight : AppTheme.white),
          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
          border: Border.all(
            color: isSelected ? AppTheme.ink : (isRecommended ? AppTheme.yellow : AppTheme.neutral),
            width: isRecommended || isSelected ? 1.5 : 1.0,
          ),
          boxShadow: AppTheme.shadowSm,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  name,
                  style: AppTheme.displayFont(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: isSelected ? Colors.white : AppTheme.ink,
                  ),
                ),
                if (isRecommended && !isSelected)
                  const Text("★", style: TextStyle(fontSize: 12, color: AppTheme.ink)),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              "$rooms usable",
              style: AppTheme.displayFont(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: isSelected ? Colors.white : AppTheme.ink,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              "$pressure% pressure",
              style: AppTheme.bodyFont(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: isSelected ? AppTheme.yellowLight : _pressureColor(pressure),
              ),
            ),
            Text(
              "$travelTime m to venue",
              style: AppTheme.bodyFont(
                fontSize: 10,
                color: isSelected ? Colors.white70 : AppTheme.inkMuted,
              ),
            ),
            const SizedBox(height: 6),
            PressureBar(percentage: pressure, height: 4),
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 350.ms, delay: Duration(milliseconds: delay))
        .scaleXY(begin: 0.92, end: 1.0, curve: Curves.easeOutBack);
  }
}

class _HotelDetailSheet extends StatefulWidget {
  final Hotel hotel;
  final AppState appState;

  const _HotelDetailSheet({required this.hotel, required this.appState});

  @override
  State<_HotelDetailSheet> createState() => _HotelDetailSheetState();
}

class _HotelDetailSheetState extends State<_HotelDetailSheet> {
  int _selectedRoomIndex = 0;

  IconData _getAmenityIcon(String name) {
    final lower = name.toLowerCase();
    if (lower.contains("sea") || lower.contains("view")) return Icons.wb_sunny_outlined;
    if (lower.contains("pool")) return Icons.pool_outlined;
    if (lower.contains("dining") || lower.contains("resto") || lower.contains("buffet")) return Icons.restaurant_outlined;
    if (lower.contains("valet") || lower.contains("parking") || lower.contains("car")) return Icons.local_parking_outlined;
    if (lower.contains("lounge") || lower.contains("bar")) return Icons.local_bar_outlined;
    if (lower.contains("spa") || lower.contains("massage")) return Icons.spa_outlined;
    if (lower.contains("wi-fi") || lower.contains("wifi")) return Icons.wifi;
    if (lower.contains("shuttle") || lower.contains("pickup") || lower.contains("taxi")) return Icons.airport_shuttle_outlined;
    if (lower.contains("station") || lower.contains("train")) return Icons.train_outlined;
    if (lower.contains("fitness") || lower.contains("gym")) return Icons.fitness_center_outlined;
    if (lower.contains("pass") || lower.contains("off") || lower.contains("discount")) return Icons.local_offer_outlined;
    if (lower.contains("room") || lower.contains("service") || lower.contains("concierge")) return Icons.room_service_outlined;
    return Icons.check_circle_outline;
  }

  @override
  Widget build(BuildContext context) {
    final h = widget.hotel;
    final isZoneC = h.zone == "ZONE_C";

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
                    if (h.imageUrl != null)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        child: SizedBox(
                          height: 210,
                          width: double.infinity,
                          child: Image.network(
                            h.imageUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (ctx, err, stack) => Container(
                              color: AppTheme.neutral,
                              child: const Icon(Icons.hotel, size: 50, color: AppTheme.inkMuted),
                            ),
                          ),
                        ),
                      ),
                    const SizedBox(height: 16),

                    // Title & Rating
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                h.name,
                                style: AppTheme.displayFont(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "${h.zone.replaceAll('_', ' ')} · ${h.address}",
                                style: AppTheme.bodyFont(
                                  fontSize: 13,
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
                                "${h.rating}",
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

                    // Real-Time Capacity & Pressure Bar
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.paper,
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        border: Border.all(color: AppTheme.neutral),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _buildMetricItem("Usable Rooms", "${h.usableRooms}", "of ${h.availableRooms} avail", AppTheme.ink),
                              Container(width: 1, height: 36, color: AppTheme.neutral),
                              _buildMetricItem("Venue Transit", "${h.travelTimeToVenue} min", "Direct shuttle", AppTheme.green),
                              Container(width: 1, height: 36, color: AppTheme.neutral),
                              _buildMetricItem("Occupancy", "${h.pressure}%", h.pressureLevel.name, isZoneC ? AppTheme.green : AppTheme.red),
                            ],
                          ),
                          const SizedBox(height: 12),
                          PressureBar(percentage: h.pressure, height: 6),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Match Day Transit & Shuttle Badge
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isZoneC ? AppTheme.yellowLight : AppTheme.white,
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        border: Border.all(
                          color: isZoneC ? AppTheme.yellow : AppTheme.neutral,
                          width: 1.2,
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.airport_shuttle, size: 24, color: AppTheme.ink),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "MATCH DAY CONNECTIVITY",
                                  style: AppTheme.metaText(fontSize: 10, fontWeight: FontWeight.w800),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  h.shuttleInfo,
                                  style: AppTheme.displayFont(fontSize: 13, fontWeight: FontWeight.w700),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Hotel Amenities
                    Text(
                      "PROPERTY HIGHLIGHTS & AMENITIES",
                      style: AppTheme.metaText(fontSize: 11, color: AppTheme.inkMuted),
                    ),
                    const SizedBox(height: 10),

                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: h.amenities.map((a) {
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppTheme.white,
                            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                            border: Border.all(color: AppTheme.neutral),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(4),
                                decoration: const BoxDecoration(
                                  color: AppTheme.paperDark,
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(_getAmenityIcon(a.name), size: 14, color: AppTheme.ink),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                a.name,
                                style: AppTheme.bodyFont(fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),

                    // Room Selection Options
                    Text(
                      "AVAILABLE ROOM TYPES FOR MATCH NIGHT",
                      style: AppTheme.metaText(fontSize: 11, color: AppTheme.inkMuted),
                    ),
                    const SizedBox(height: 10),

                    ...List.generate(h.roomTypes.length, (idx) {
                      final room = h.roomTypes[idx];
                      final isSelected = _selectedRoomIndex == idx;

                      return GestureDetector(
                        onTap: () => setState(() => _selectedRoomIndex = idx),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: isSelected ? AppTheme.paper : AppTheme.white,
                            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                            border: Border.all(
                              color: isSelected ? AppTheme.ink : AppTheme.neutral,
                              width: isSelected ? 1.5 : 1.0,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                                color: isSelected ? AppTheme.ink : AppTheme.inkMuted,
                                size: 20,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          room.name,
                                          style: AppTheme.displayFont(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                        Text(
                                          room.price,
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
                                      "${room.bedType} · ${room.perks}",
                                      style: AppTheme.bodyFont(fontSize: 12, color: AppTheme.inkMuted),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              ),

              // Pinned Bottom Actions Bar
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
                          final double lat = h.latitude ?? 18.9272;
                          final double lng = h.longitude ?? 72.8205;
                          final mapDest = MapDestination(
                            id: h.id,
                            name: h.name,
                            address: h.address,
                            location: LatLng(lat, lng),
                            type: DestinationType.HOTEL,
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
                        label: const Text("Transit Route"),
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
                          final url = h.bookingUrl;
                          if (url == null || url.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text("Official booking link unavailable for this simulated property."),
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
                                  content: Text("Unable to open hotel booking website."),
                                ),
                              );
                            }
                          }
                        },
                        icon: const Icon(Icons.open_in_new_rounded, size: 18),
                        label: const Text("Book Room"),
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

  Widget _buildMetricItem(String label, String value, String subtext, Color valColor) {
    return Column(
      children: [
        Text(
          value,
          style: AppTheme.displayFont(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: valColor,
          ),
        ),
        Text(
          label,
          style: AppTheme.metaText(fontSize: 10, color: AppTheme.ink),
        ),
        Text(
          subtext,
          style: AppTheme.bodyFont(fontSize: 9, color: AppTheme.inkMuted),
        ),
      ],
    );
  }
}

