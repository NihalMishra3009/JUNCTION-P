import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../models/map_destination.dart';
import '../models/route_option.dart';
import '../models/types.dart';
import '../services/crowd_routing_service.dart';
import '../services/navigation_service.dart';
import '../services/routing_service.dart';
import '../services/transit_routing_service.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/motion_tap.dart';
import '../widgets/pill_badge.dart';
import '../widgets/route_transit_map.dart';
import '../widgets/travel_mode_selector.dart';

class DestinationRouteScreen extends StatefulWidget {
  final MapDestination destination;
  final MapDestination origin;
  final AppState appState;

  const DestinationRouteScreen({
    super.key,
    required this.destination,
    this.origin = MapDestination.wankhedeStadium,
    required this.appState,
  });

  @override
  State<DestinationRouteScreen> createState() => _DestinationRouteScreenState();
}

class _DestinationRouteScreenState extends State<DestinationRouteScreen> {
  final NavigationService _navService = NavigationService();

  List<RouteOption> _calculatedRoutes = [];
  RouteOption? _selectedRouteOption;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDestinationRoutes();
    _navService.addListener(_onNavServiceUpdated);
  }

  @override
  void dispose() {
    _navService.removeListener(_onNavServiceUpdated);
    super.dispose();
  }

  void _onNavServiceUpdated() {
    if (mounted) {
      setState(() {});
    }
  }

  TravelMode get _activeTravelMode => _navService.travelMode;

  void _onTravelModeChanged(TravelMode mode) {
    _navService.setTravelMode(mode);
    _loadDestinationRoutes(overrideMode: mode);
  }

  Future<void> _loadDestinationRoutes({TravelMode? overrideMode}) async {
    final mode = overrideMode ?? _activeTravelMode;
    setState(() => _isLoading = true);

    debugPrint("""
NAVIGATION REQUEST

Origin:
${widget.origin.name}
${widget.origin.location.latitude}, ${widget.origin.location.longitude}

Destination:
${widget.destination.name}
${widget.destination.location.latitude}, ${widget.destination.location.longitude}
""");

    assert(
      widget.origin.location.latitude != widget.destination.location.latitude ||
      widget.origin.location.longitude != widget.destination.location.longitude,
      "Origin and Destination coordinates must be distinct!",
    );

    final List<RouteOption> rawRoutes = [];

    if (mode == TravelMode.multimodal || mode == TravelMode.driving) {
      final roadRoutes = await RoutingService.getRoutes(
        origin: widget.origin.location,
        destination: widget.destination.location,
        mode: TravelMode.driving,
      );
      rawRoutes.addAll(roadRoutes);
    }

    if (mode == TravelMode.multimodal || mode == TravelMode.walking) {
      final walkRoutes = await RoutingService.getRoutes(
        origin: widget.origin.location,
        destination: widget.destination.location,
        mode: TravelMode.walking,
      );
      rawRoutes.addAll(walkRoutes);
    }

    if (mode == TravelMode.multimodal || mode == TravelMode.train || mode == TravelMode.metro) {
      final transitRoutes = await TransitRoutingService.findTransitRoutes(
        origin: widget.origin.location,
        destination: widget.destination.location,
        destinationName: widget.destination.name,
        scenario: widget.appState.activeScenario,
        preferredMode: mode,
      );
      for (var tr in transitRoutes) {
        rawRoutes.add(tr.toRouteOption());
      }
    }

    final scoredRoutes = CrowdRoutingService.evaluateAndScoreRoutes(
      rawRoutes: rawRoutes,
      appState: widget.appState,
    );

    if (mounted) {
      final best = scoredRoutes.isNotEmpty
          ? scoredRoutes.firstWhere((r) => r.recommended, orElse: () => scoredRoutes.first)
          : null;

      setState(() {
        _calculatedRoutes = scoredRoutes;
        _selectedRouteOption = best;
        _isLoading = false;
      });

      if (scoredRoutes.isNotEmpty) {
        _navService.startRoutePreview(
          destination: widget.destination,
          origin: widget.origin,
          routes: scoredRoutes,
          selected: best,
          mode: mode,
        );
      }
    }
  }

  void _startNavigation() {
    if (_selectedRouteOption == null) return;
    _navService.startNavigation(
      _selectedRouteOption!,
      widget.origin.location,
      destination: widget.destination,
      origin: widget.origin,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isNavigating = _navService.isNavigating;
    final activeStep = _navService.currentStep;
    final RouteOption? recRoute = _calculatedRoutes.isEmpty
        ? null
        : _calculatedRoutes.firstWhere(
            (r) => r.recommended,
            orElse: () => _calculatedRoutes.first,
          );
    final RouteOption? fastestRoute = _calculatedRoutes.isEmpty
        ? null
        : _calculatedRoutes.firstWhere(
            (r) => r.strategy == RouteStrategy.fastest,
            orElse: () => _calculatedRoutes.first,
          );
    final isUserOverriding = _selectedRouteOption != null &&
        recRoute != null &&
        _selectedRouteOption!.id != recRoute.id;

    return Scaffold(
      backgroundColor: AppTheme.paper,
      appBar: AppBar(
        backgroundColor: AppTheme.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.ink),
          onPressed: () {
            _navService.clearNavigation();
            Navigator.pop(context);
          },
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "ROUTE TO ${widget.destination.name.toUpperCase()}",
              style: AppTheme.displayFont(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: AppTheme.ink,
              ),
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              "${widget.origin.name} → ${widget.destination.name}",
              style: AppTheme.bodyFont(
                fontSize: 11,
                color: AppTheme.inkMuted,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 14),
            child: Center(
              child: PillBadge(
                text: widget.destination.type.name,
                variant: PillVariant.yellow,
                fontSize: 9,
              ),
            ),
          ),
        ],
      ),
      body: _isLoading
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(color: AppTheme.ink),
                  const SizedBox(height: 16),
                  Text(
                    "CALCULATING JUNCTION ROAD ROUTES...",
                    style: AppTheme.metaText(fontSize: 11, color: AppTheme.inkMuted),
                  ),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Travel Mode Selector Bar (Full Width Segmented Control)
                  Text(
                    "TRAVEL MODE",
                    style: AppTheme.metaText(fontSize: 11, color: AppTheme.inkMuted),
                  ),
                  const SizedBox(height: 6),
                  TravelModeSelector(
                    activeMode: _activeTravelMode,
                    onModeChanged: _onTravelModeChanged,
                  ),
                  const SizedBox(height: 12),

                  // Map Container with Map Legend Overlay
                  Stack(
                    children: [
                      Container(
                        height: isNavigating ? 360 : 300,
                        clipBehavior: Clip.antiAlias,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                          border: Border.all(color: AppTheme.neutralDark),
                          boxShadow: AppTheme.shadowSm,
                        ),
                        child: RouteTransitMap(
                          routeOptions: _calculatedRoutes,
                          selectedRoute: _selectedRouteOption,
                          height: isNavigating ? 360 : 300,
                          isInteractive: true,
                          destination: widget.destination,
                          onRouteSelected: (route) {
                            setState(() {
                              _selectedRouteOption = route;
                            });
                            _navService.selectRoute(route);
                          },
                          onStartNavigation: _startNavigation,
                        ),
                      ),

                      // Map Legend Overlay
                      Positioned(
                        top: 12,
                        right: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.92),
                            borderRadius: BorderRadius.circular(8),
                            boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(width: 10, height: 10, decoration: const BoxDecoration(color: Color(0x77EF4444), shape: BoxShape.circle)),
                              const SizedBox(width: 4),
                              const Text("Standard Base", style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.ink)),
                              const SizedBox(width: 8),
                              Container(width: 10, height: 10, decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle)),
                              const SizedBox(width: 4),
                              const Text("JUNCTION", style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.ink)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ).animate().fadeIn(duration: 300.ms),

                  const SizedBox(height: 16),

                  // Navigation Step Panel if active
                  if (isNavigating && activeStep != null) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.ink,
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.turn_left, color: AppTheme.yellow, size: 28),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  activeStep.instruction.toUpperCase(),
                                  style: AppTheme.displayFont(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                  ),
                                ),
                                Text(
                                  "${activeStep.distanceMeters.round()} m remaining",
                                  style: AppTheme.bodyFont(
                                    fontSize: 11,
                                    color: Colors.white70,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, color: Colors.white70),
                            onPressed: () => _navService.stopNavigation(),
                          ),
                        ],
                      ),
                    ).animate().fadeIn(duration: 250.ms),
                    const SizedBox(height: 16),
                  ],

                  // Override Banner
                  if (isUserOverriding) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppTheme.paperDark,
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        border: Border.all(color: AppTheme.neutralDark, width: 1.2),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.info_outline, size: 18, color: AppTheme.ink),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "${_selectedRouteOption!.strategy.displayName} SELECTED",
                                  style: AppTheme.displayFont(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: AppTheme.ink,
                                  ),
                                ),
                                Text(
                                  "JUNCTION recommends ${recRoute.strategy.displayName} because it avoids active crowd bottlenecks.",
                                  style: AppTheme.bodyFont(
                                    fontSize: 11,
                                    color: AppTheme.inkMuted,
                                    height: 1.3,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Route Cards List
                  Text(
                    "ROUTE STRATEGY OPTIONS (${_calculatedRoutes.length})",
                    style: AppTheme.metaText(fontSize: 11, color: AppTheme.inkMuted),
                  ),
                  const SizedBox(height: 10),

                  ...List.generate(_calculatedRoutes.length, (i) {
                    final r = _calculatedRoutes[i];
                    final isSelected = _selectedRouteOption?.id == r.id;

                    String strategyPurpose;
                    if (r.strategy == RouteStrategy.fastest) {
                      strategyPurpose = "Travel-time priority · Ignores JUNCTION crowd optimization";
                    } else if (r.strategy == RouteStrategy.balanced) {
                      strategyPurpose = "Optimal balance of travel time, crowd & operational risk";
                    } else {
                      strategyPurpose = "Minimum predicted crowd exposure priority";
                    }

                    final diffFromFastest = fastestRoute != null
                        ? ((r.durationSeconds - fastestRoute.durationSeconds) / 60).round()
                        : 0;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 14),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.white,
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        border: Border.all(
                          color: isSelected
                              ? AppTheme.green
                              : (r.recommended ? AppTheme.yellow : AppTheme.neutral),
                          width: isSelected || r.recommended ? 2.0 : 1.0,
                        ),
                        boxShadow: isSelected ? AppTheme.shadowSm : null,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Wrap(
                                  spacing: 6,
                                  runSpacing: 4,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  children: [
                                    if (r.recommended)
                                      const PillBadge(
                                        text: "★ JUNCTION RECOMMENDED",
                                        variant: PillVariant.yellow,
                                        fontSize: 9.5,
                                      )
                                    else
                                      PillBadge(
                                        text: r.strategy.displayName,
                                        variant: r.strategy == RouteStrategy.fastest
                                            ? PillVariant.predicted
                                            : PillVariant.simulated,
                                        fontSize: 9.5,
                                      ),
                                    if (isSelected)
                                      const PillBadge(
                                        text: "SELECTED",
                                        variant: PillVariant.live,
                                        fontSize: 9,
                                      ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                r.formattedDuration,
                                style: AppTheme.displayFont(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  color: AppTheme.ink,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            r.name,
                            style: AppTheme.displayFont(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            strategyPurpose,
                            style: AppTheme.bodyFont(
                              fontSize: 11.5,
                              color: AppTheme.inkMuted,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              Text(
                                r.formattedDistance,
                                style: AppTheme.bodyFont(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.ink),
                              ),
                              const Text(" · ", style: TextStyle(color: AppTheme.inkMuted)),
                              Text(
                                "Crowd: ${r.crowdScore > 0.7 ? "HIGH" : (r.crowdScore > 0.4 ? "MEDIUM" : "LOW")}",
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: r.crowdScore > 0.7 ? AppTheme.red : (r.crowdScore < 0.4 ? AppTheme.green : AppTheme.orange),
                                ),
                              ),
                              if (diffFromFastest > 0) ...[
                                const Text(" · ", style: TextStyle(color: AppTheme.inkMuted)),
                                Text(
                                  "$diffFromFastest min slower",
                                  style: AppTheme.bodyFont(fontSize: 11, color: AppTheme.inkMuted),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(
                            r.summaryReason,
                            style: AppTheme.bodyFont(fontSize: 11.5, color: AppTheme.inkLight, height: 1.3),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 14),
                          Row(
                            children: [
                              Expanded(
                                child: MotionTap(
                                  onTap: () {
                                    setState(() => _selectedRouteOption = r);
                                    _navService.selectRoute(r);
                                  },
                                  scaleDown: 0.96,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    decoration: BoxDecoration(
                                      color: isSelected ? AppTheme.ink : AppTheme.paper,
                                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      isSelected ? "SELECTED ROUTE" : "SELECT ROUTE",
                                      style: TextStyle(
                                        color: isSelected ? Colors.white : AppTheme.ink,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              if (isSelected && !isNavigating) ...[
                                const SizedBox(width: 8),
                                Expanded(
                                  child: MotionTap(
                                    onTap: _startNavigation,
                                    scaleDown: 0.96,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      decoration: BoxDecoration(
                                        color: AppTheme.yellow,
                                        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                      ),
                                      alignment: Alignment.center,
                                      child: const Text(
                                        "START NAVIGATION",
                                        style: TextStyle(
                                          color: AppTheme.ink,
                                          fontWeight: FontWeight.w800,
                                          fontSize: 11,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ).animate().fadeIn(duration: 250.ms, delay: Duration(milliseconds: 100 * i));
                  }),
                ],
              ),
            ),
    );
  }
}
