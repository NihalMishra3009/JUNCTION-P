import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:latlong2/latlong.dart';
import '../models/map_destination.dart';
import '../models/route_option.dart';
import '../services/routing_service.dart';
import '../services/transit_routing_service.dart';
import '../services/crowd_routing_service.dart';
import '../services/navigation_service.dart';
import '../services/location_service.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../models/types.dart';
import '../widgets/pill_badge.dart';
import '../widgets/motion_tap.dart';
import '../widgets/route_transit_map.dart';
import '../widgets/travel_mode_selector.dart';

class PlanScreen extends StatefulWidget {
  final AppState appState;

  const PlanScreen({super.key, required this.appState});

  @override
  State<PlanScreen> createState() => _PlanScreenState();
}

class _PlanScreenState extends State<PlanScreen> {
  final NavigationService _navService = NavigationService();
  final ScrollController _mainScrollController = ScrollController();

  List<RouteOption> _calculatedRoutes = [];
  RouteOption? _selectedRouteOption;
  bool _isLoadingRoutes = true;
  LatLng _userOrigin = LocationService.defaultDemoLocation;

  MapDestination get activeDestination =>
      _navService.activeDestination ?? MapDestination.wankhedeStadium;

  MapDestination get activeOrigin =>
      _navService.activeOrigin ??
      MapDestination(
        id: 'user_origin',
        name: 'Current Location',
        location: _userOrigin,
        type: DestinationType.OTHER,
      );

  @override
  void initState() {
    super.initState();
    _loadRoutes();
    widget.appState.addListener(_onAppStateScenarioChanged);
    _navService.addListener(_onNavServiceUpdated);
  }

  @override
  void dispose() {
    widget.appState.removeListener(_onAppStateScenarioChanged);
    _navService.removeListener(_onNavServiceUpdated);
    _mainScrollController.dispose();
    super.dispose();
  }

  void _onAppStateScenarioChanged() {
    if (mounted) {
      _reEvaluateRoutes();
    }
  }

  void _onNavServiceUpdated() {
    if (mounted) {
      setState(() {
        if (_navService.allRouteOptions.isNotEmpty) {
          _calculatedRoutes = _navService.allRouteOptions;
        }
        if (_navService.activeRoute != null) {
          _selectedRouteOption = _navService.activeRoute;
        }
      });
    }
  }

  TravelMode get _activeTravelMode => _navService.travelMode;

  Future<List<RouteOption>> _fetchRawRoutesForMode(LatLng originLoc, MapDestination targetDest, TravelMode mode) async {
    final List<RouteOption> rawList = [];

    if (mode == TravelMode.multimodal || mode == TravelMode.driving) {
      final roadRoutes = await RoutingService.getRoutes(
        origin: originLoc,
        destination: targetDest.location,
        mode: TravelMode.driving,
      );
      rawList.addAll(roadRoutes);
    }

    if (mode == TravelMode.multimodal || mode == TravelMode.walking) {
      final walkRoutes = await RoutingService.getRoutes(
        origin: originLoc,
        destination: targetDest.location,
        mode: TravelMode.walking,
      );
      rawList.addAll(walkRoutes);
    }

    if (mode == TravelMode.multimodal || mode == TravelMode.train || mode == TravelMode.metro) {
      final transitRoutes = await TransitRoutingService.findTransitRoutes(
        origin: originLoc,
        destination: targetDest.location,
        destinationName: targetDest.name,
        scenario: widget.appState.activeScenario,
        preferredMode: mode,
      );
      for (var tr in transitRoutes) {
        rawList.add(tr.toRouteOption());
      }
    }

    return rawList;
  }

  void _onTravelModeChanged(TravelMode newMode) async {
    _navService.setTravelMode(newMode);
    setState(() {
      _isLoadingRoutes = true;
    });

    final targetDest = activeDestination;
    final originLoc = _navService.activeOrigin?.location ?? _userOrigin;

    final rawRoutes = await _fetchRawRoutesForMode(originLoc, targetDest, newMode);

    final scoredRoutes = CrowdRoutingService.evaluateAndScoreRoutes(
      rawRoutes: rawRoutes,
      appState: widget.appState,
    );

    if (mounted) {
      setState(() {
        _calculatedRoutes = scoredRoutes;
        _selectedRouteOption = scoredRoutes.firstWhere(
          (r) => r.recommended,
          orElse: () => scoredRoutes.isNotEmpty ? scoredRoutes.first : (rawRoutes.isNotEmpty ? rawRoutes.first : scoredRoutes.first),
        );
        _isLoadingRoutes = false;
      });

      _navService.setAvailableRoutes(
        scoredRoutes,
        selected: _selectedRouteOption,
        destination: targetDest,
        origin: activeOrigin,
        mode: newMode,
      );
    }
  }

  Future<void> _loadRoutes({TravelMode? overrideMode}) async {
    final mode = overrideMode ?? _activeTravelMode;
    setState(() {
      _isLoadingRoutes = true;
    });

    final loc = await LocationService.getCurrentLocation();
    if (loc != null) {
      _userOrigin = loc;
    }

    final targetDest = activeDestination;
    final originLoc = _navService.activeOrigin?.location ?? _userOrigin;

    final rawRoutes = await _fetchRawRoutesForMode(originLoc, targetDest, mode);

    final scoredRoutes = CrowdRoutingService.evaluateAndScoreRoutes(
      rawRoutes: rawRoutes,
      appState: widget.appState,
    );

    if (mounted) {
      setState(() {
        _calculatedRoutes = scoredRoutes;
        _selectedRouteOption = scoredRoutes.firstWhere(
          (r) => r.recommended,
          orElse: () => scoredRoutes.isNotEmpty ? scoredRoutes.first : (rawRoutes.isNotEmpty ? rawRoutes.first : scoredRoutes.first),
        );
        _isLoadingRoutes = false;
      });

      _navService.setAvailableRoutes(
        scoredRoutes,
        selected: _selectedRouteOption,
        destination: targetDest,
        origin: activeOrigin,
        mode: mode,
      );
    }
  }

  void _reEvaluateRoutes() {
    if (_calculatedRoutes.isEmpty) return;

    final scoredRoutes = CrowdRoutingService.evaluateAndScoreRoutes(
      rawRoutes: _calculatedRoutes,
      appState: widget.appState,
    );

    setState(() {
      _calculatedRoutes = scoredRoutes;
      if (_selectedRouteOption != null) {
        final match = scoredRoutes.firstWhere(
          (r) => r.id == _selectedRouteOption!.id,
          orElse: () => scoredRoutes.first,
        );
        _selectedRouteOption = match;
      }
    });

    _navService.setAvailableRoutes(scoredRoutes, selected: _selectedRouteOption);
  }

  void _startInAppNavigation() {
    if (_selectedRouteOption == null) return;

    final dest = activeDestination;
    final orig = activeOrigin;

    _navService.startNavigation(
      _selectedRouteOption!,
      orig.location,
      destination: dest,
      origin: orig,
    );
    widget.appState.selectAttendeeRoute(_selectedRouteOption!.id);

    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.only(left: 20, right: 20, bottom: 84),
        backgroundColor: AppTheme.ink,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        content: Row(
          children: [
            const Icon(Icons.navigation_rounded, color: AppTheme.yellow, size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                "Started turn-by-turn navigation to ${dest.name}.",
                style: AppTheme.displayFont(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _resetToVenueNavigation() {
    _navService.clearNavigation();
    _loadRoutes();
  }

  @override
  Widget build(BuildContext context) {
    final isRecApproved = widget.appState.isRec1Approved;
    final isNavigating = _navService.isNavigating;
    final RouteOption? recRoute = _calculatedRoutes.isEmpty
        ? null
        : _calculatedRoutes.firstWhere(
            (r) => r.recommended,
            orElse: () => _calculatedRoutes.first,
          );
    final isUserOverriding = _selectedRouteOption != null &&
        recRoute != null &&
        _selectedRouteOption!.id != recRoute.id;

    final RouteOption fastestRoute = _calculatedRoutes.isEmpty
        ? const RouteOption(
            id: 'fastest',
            name: 'Fastest Route',
            geometry: [],
            distanceMeters: 0,
            durationSeconds: 0,
            crowdScore: 0,
            congestionScore: 0,
            riskScore: 0,
            junctionScore: 0,
            recommended: false,
            steps: [],
            summaryReason: '',
          )
        : _calculatedRoutes.firstWhere(
            (r) => r.strategy == RouteStrategy.fastest,
            orElse: () => _calculatedRoutes.first,
          );

    return _isLoadingRoutes && _calculatedRoutes.isEmpty
        ? Center(
            child: Padding(
              padding: const EdgeInsets.only(top: 100),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(color: AppTheme.ink),
                  const SizedBox(height: 16),
                  Text(
                    "CALCULATING MULTIMODAL ROUTES...",
                    style: AppTheme.metaText(fontSize: 11, color: AppTheme.inkMuted),
                  ),
                ],
              ),
            ),
          )
        : SingleChildScrollView(
            controller: _mainScrollController,
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 140),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  "PLAN YOUR JOURNEY",
                  style: AppTheme.metaText(fontSize: 12, color: AppTheme.inkMuted),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Row(
                children: [
                  if (_navService.activeDestination != null &&
                      _navService.activeDestination?.id != MapDestination.wankhedeStadium.id)
                    MotionTap(
                      onTap: _resetToVenueNavigation,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppTheme.ink,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          "RESET TO VENUE",
                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                    ),
                  if (LocationService.isDemoMode) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppTheme.yellowLight,
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: AppTheme.yellow),
                      ),
                      child: const Text(
                        "DEMO ORIGIN",
                        style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.ink),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ).animate().fadeIn(duration: 250.ms),
          const SizedBox(height: 8),

          // Origin / Destination Box
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.white,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
              border: Border.all(color: AppTheme.neutral, width: 1.0),
              boxShadow: AppTheme.shadowSm,
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppTheme.ink,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "ORIGIN",
                            style: AppTheme.metaText(fontSize: 9, color: AppTheme.inkFaint),
                          ),
                          Text(
                            activeOrigin.name,
                            style: AppTheme.displayFont(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Padding(
                  padding: EdgeInsets.only(left: 3.5),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: SizedBox(
                      height: 16,
                      child: VerticalDivider(
                        color: AppTheme.neutralDark,
                        thickness: 1.5,
                      ),
                    ),
                  ),
                ),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppTheme.yellow,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "DESTINATION",
                            style: AppTheme.metaText(fontSize: 9, color: AppTheme.inkFaint),
                          ),
                          Text(
                            activeDestination.name,
                            style: AppTheme.displayFont(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          )
              .animate()
              .fadeIn(duration: 350.ms, delay: 50.ms)
              .slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic),

          const SizedBox(height: 16),

          // Active Recommendation Notice
          if (isRecApproved)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.yellowLight,
                borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                border: Border.all(color: AppTheme.yellow, width: 1.0),
              ),
              child: Row(
                children: [
                  const Text("◆", style: TextStyle(fontSize: 14, color: AppTheme.ink)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "ORGANIZER RECOMMENDATION ACTIVE",
                          style: AppTheme.displayFont(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Text(
                          "Dadar Station corridor with AC Event Shuttle is recommended due to Churchgate capacity limits.",
                          style: AppTheme.bodyFont(
                            fontSize: 12,
                            color: AppTheme.inkLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          // Travel Mode Selector Bar (ALL | WALK | CAR | TRANSIT)
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "TRAVEL MODE",
                style: AppTheme.metaText(fontSize: 11, color: AppTheme.inkMuted),
              ),
              const SizedBox(height: 6),
              TravelModeSelector(
                activeMode: _activeTravelMode,
                onModeChanged: _onTravelModeChanged,
              ),
            ],
          ).animate().fadeIn(duration: 300.ms, delay: 100.ms),
          const SizedBox(height: 12),

          // Main Interactive Destination-Aware Map Component
          RouteTransitMap(
            routeOptions: _calculatedRoutes,
            selectedRoute: _selectedRouteOption,
            height: isNavigating ? 380 : 280,
            isInteractive: true,
            destination: activeDestination,
            onRouteSelected: (route) {
              setState(() {
                _selectedRouteOption = route;
              });
              _navService.selectRoute(route);
            },
            onStartNavigation: _startInAppNavigation,
          )
              .animate()
              .fadeIn(duration: 400.ms, delay: 150.ms)
              .slideY(begin: 0.05, end: 0, curve: Curves.easeOutCubic),

          const SizedBox(height: 18),

          // User Override Warning Notice (If user selects a non-recommended route)
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
                          "JUNCTION recommends ${recRoute.strategy.displayName} because it has lower predicted crowd exposure and lower operational risk under the active scenario.",
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
            ).animate().fadeIn(duration: 250.ms),
            const SizedBox(height: 18),
          ],

          // JUNCTION Data-Driven Recommendation Card
          if (_calculatedRoutes.isNotEmpty && recRoute != null) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.greenBg,
                borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                border: Border.all(color: AppTheme.green.withValues(alpha: 0.4), width: 1.5),
                boxShadow: AppTheme.shadowSm,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            const Icon(Icons.stars_rounded, size: 18, color: AppTheme.green),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                "★ JUNCTION RECOMMENDS ${recRoute.strategy.displayName}",
                                style: AppTheme.displayFont(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                  color: AppTheme.green,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        "${recRoute.formattedDuration} · ${recRoute.formattedDistance}",
                        style: AppTheme.displayFont(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.ink,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Operational Decision Reason:",
                    style: AppTheme.displayFont(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.ink,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    recRoute.summaryReason,
                    style: AppTheme.bodyFont(
                      fontSize: 12,
                      color: AppTheme.inkLight,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            )
                .animate()
                .fadeIn(duration: 350.ms, delay: 200.ms)
                .slideY(begin: 0.04, end: 0, curve: Curves.easeOutCubic),
            const SizedBox(height: 18),
          ],

          // CARDS FOR ALL 3 ROUTE STRATEGIES (FASTEST, BALANCED, LOW CROWD)
          Text(
            "AVAILABLE ROUTE STRATEGIES (${_calculatedRoutes.length})",
            style: AppTheme.metaText(fontSize: 11, color: AppTheme.inkMuted),
          ),
          const SizedBox(height: 10),

          ...List.generate(_calculatedRoutes.length, (index) {
            final r = _calculatedRoutes[index];
            final isSelected = _selectedRouteOption?.id == r.id;

            String strategyPurpose;
            if (r.strategy == RouteStrategy.fastest) {
              strategyPurpose = "Travel-time priority · Ignores JUNCTION crowd optimization";
            } else if (r.strategy == RouteStrategy.balanced) {
              strategyPurpose = "Optimal balance of travel time, crowd & operational risk";
            } else {
              strategyPurpose = "Minimum predicted crowd exposure priority";
            }

            final diffFromFastest = ((r.durationSeconds - fastestRoute.durationSeconds) / 60).round();
            final crowdReduction = ((fastestRoute.crowdScore - r.crowdScore) * 100).round();

            return MotionTap(
              onTap: () {
                setState(() {
                  _selectedRouteOption = r;
                });
                _navService.selectRoute(r);
              },
              scaleDown: 0.97,
              child: Container(
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
                  boxShadow: AppTheme.shadowSm,
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
                        fontWeight: FontWeight.w500,
                        color: AppTheme.inkMuted,
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Context line
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
                        if (crowdReduction > 0) ...[
                          const Text(" · ", style: TextStyle(color: AppTheme.inkMuted)),
                          Text(
                            "$crowdReduction% lower crowd",
                            style: AppTheme.bodyFont(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.green),
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
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            isSelected ? "✓ Active Route Choice" : "Tap to select strategy",
                            style: AppTheme.metaText(
                              fontSize: 9.5,
                              color: isSelected ? AppTheme.green : AppTheme.inkMuted,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        MotionTap(
                          onTap: () {
                            setState(() {
                              _selectedRouteOption = r;
                            });
                            _navService.selectRoute(r);
                            _startInAppNavigation();
                          },
                          scaleDown: 0.94,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: isSelected ? AppTheme.green : AppTheme.yellow,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: AppTheme.ink, width: 1.0),
                            ),
                            child: Text(
                              isSelected ? "START NAVIGATION" : "USE THIS ROUTE",
                              style: AppTheme.displayFont(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                color: isSelected ? Colors.white : AppTheme.ink,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            )
                .animate()
                .fadeIn(duration: 300.ms, delay: (100 + index * 60).ms)
                .slideY(begin: 0.06, end: 0, curve: Curves.easeOutCubic);
          }),
        ],
      ),
    );
  }
}
