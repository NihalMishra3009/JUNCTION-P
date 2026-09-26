import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../models/map_destination.dart';
import '../models/route_option.dart';
import '../models/multimodal_route.dart';
import '../services/navigation_service.dart';
import '../services/navigation_voice_service.dart';
import '../services/location_service.dart';
import '../theme/app_theme.dart';
import 'motion_tap.dart';

class RouteTransitMap extends StatefulWidget {
  final List<RouteOption> routeOptions;
  final RouteOption? selectedRoute;
  final double height;
  final bool isInteractive;
  final MapDestination? destination;
  final LatLng? destinationLoc;
  final String? destinationName;
  final ValueChanged<RouteOption>? onRouteSelected;
  final VoidCallback? onStartNavigation;

  const RouteTransitMap({
    super.key,
    required this.routeOptions,
    this.selectedRoute,
    this.height = 320,
    this.isInteractive = true,
    this.destination,
    this.destinationLoc,
    this.destinationName,
    this.onRouteSelected,
    this.onStartNavigation,
  });

  LatLng get actualDestinationLoc =>
      destination?.location ?? destinationLoc ?? MapDestination.wankhedeStadium.location;

  String get actualDestinationName =>
      destination?.name ?? destinationName ?? MapDestination.wankhedeStadium.name;

  @override
  State<RouteTransitMap> createState() => _RouteTransitMapState();
}

class _RouteTransitMapState extends State<RouteTransitMap> with TickerProviderStateMixin {
  static const double previewZoom = 13.8;
  static const double navigationZoom = 17.5;

  late final MapController _mapController;
  final NavigationService _navService = NavigationService();

  LatLng _userPosition = LocationService.defaultDemoLocation;
  bool _showCrowdOverlay = true;
  bool _autoFollowUser = false;
  bool _wasNavigating = false;
  AnimationController? _cameraAnimController;

  @override
  void initState() {
    super.initState();
    _mapController = MapController();
    _initLocationTracking();

    _navService.addListener(_onNavStateChanged);
  }

  @override
  void dispose() {
    _cameraAnimController?.dispose();
    _navService.removeListener(_onNavStateChanged);
    super.dispose();
  }

  void _animatedMove(LatLng destCenter, double destZoom) {
    _cameraAnimController?.dispose();

    final camera = _mapController.camera;
    final latTween = Tween<double>(begin: camera.center.latitude, end: destCenter.latitude);
    final lngTween = Tween<double>(begin: camera.center.longitude, end: destCenter.longitude);
    final zoomTween = Tween<double>(begin: camera.zoom, end: destZoom);

    final controller = AnimationController(
      duration: const Duration(milliseconds: 750),
      vsync: this,
    );
    _cameraAnimController = controller;

    final Animation<double> animation = CurvedAnimation(
      parent: controller,
      curve: Curves.fastOutSlowIn,
    );

    controller.addListener(() {
      _mapController.move(
        LatLng(latTween.evaluate(animation), lngTween.evaluate(animation)),
        zoomTween.evaluate(animation),
      );
    });

    controller.forward().then((_) {
      if (_cameraAnimController == controller) {
        _cameraAnimController = null;
      }
      controller.dispose();
    });
  }

  void _onNavStateChanged() {
    if (mounted) {
      final isNav = _navService.isNavigating;
      setState(() {});

      if (isNav && !_wasNavigating) {
        _autoFollowUser = true;
        final startPos = _navService.currentPosition ?? _userPosition;
        _animatedMove(startPos, navigationZoom);
      } else if (isNav && _autoFollowUser && _navService.currentPosition != null) {
        _mapController.move(_navService.currentPosition!, navigationZoom);
      }
      _wasNavigating = isNav;
    }
  }

  Future<void> _initLocationTracking() async {
    final loc = await LocationService.getCurrentLocation();
    if (loc != null && mounted) {
      setState(() {
        _userPosition = loc;
      });
      _navService.updatePosition(loc);
    }

    LocationService.startPositionTracking((newPos) {
      if (mounted) {
        setState(() {
          _userPosition = newPos;
        });
        _navService.updatePosition(newPos);
      }
    });
  }

  void _recenterMap() {
    final active = widget.selectedRoute ?? (_navService.activeRoute) ?? (widget.routeOptions.isNotEmpty ? widget.routeOptions.first : null);
    if (_navService.isNavigating && _navService.currentPosition != null) {
      _animatedMove(_navService.currentPosition!, navigationZoom);
      setState(() {
        _autoFollowUser = true;
      });
    } else if (active != null && active.geometry.isNotEmpty) {
      final bounds = LatLngBounds.fromPoints([
        _userPosition,
        widget.actualDestinationLoc,
        ...active.geometry,
      ]);
      _mapController.fitCamera(
        CameraFit.bounds(
          bounds: bounds,
          padding: const EdgeInsets.all(40),
        ),
      );
      setState(() {
        _autoFollowUser = false;
      });
    }
  }

  void _zoomIn() {
    _mapController.move(_mapController.camera.center, _mapController.camera.zoom + 0.6);
  }

  void _zoomOut() {
    _mapController.move(_mapController.camera.center, _mapController.camera.zoom - 0.6);
  }

  List<Polyline> _buildSegmentPolylines(RouteOption route) {
    final List<Polyline> list = [];
    if (route.multimodalRoute != null && route.multimodalRoute!.segments.isNotEmpty) {
      for (var seg in route.multimodalRoute!.segments) {
        Color c = const Color(0xFF10B981);
        double width = 6.0;
        if (seg.type == SegmentType.walk) {
          c = const Color(0xFF3B82F6);
          width = 4.5;
        } else if (seg.type == SegmentType.train) {
          c = const Color(0xFF8B5CF6);
          width = 7.5;
        } else if (seg.type == SegmentType.metro) {
          c = const Color(0xFF06B6D4);
          width = 7.5;
        }

        if (seg.geometry.isNotEmpty) {
          list.add(Polyline(
            points: seg.geometry,
            color: c.withValues(alpha: 0.35),
            strokeWidth: width + 4.0,
          ));
          list.add(Polyline(
            points: seg.geometry,
            color: c,
            strokeWidth: width,
          ));
        }
      }
    } else {
      list.add(Polyline(
        points: route.geometry,
        color: route.recommended ? const Color(0x5510B981) : const Color(0x55F59E0B),
        strokeWidth: 10.0,
      ));
      list.add(Polyline(
        points: route.geometry,
        color: route.recommended
            ? const Color(0xFF10B981)
            : (route.typeTag == 'FASTEST' ? const Color(0xFF3B82F6) : const Color(0xFFF59E0B)),
        strokeWidth: 6.0,
      ));
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final activeRoute = widget.selectedRoute ?? _navService.activeRoute ?? (widget.routeOptions.isNotEmpty ? widget.routeOptions.first : null);
    final isNavigating = _navService.isNavigating;
    final currentStep = _navService.currentStep;

    return Container(
      height: widget.height,
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        border: Border.all(color: AppTheme.neutralDark, width: 1.2),
        boxShadow: AppTheme.shadowMd,
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          // 1. FlutterMap (Leaflet OpenStreetMap Layer)
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: activeRoute != null && activeRoute.geometry.isNotEmpty
                  ? activeRoute.geometry[activeRoute.geometry.length ~/ 2]
                  : widget.actualDestinationLoc,
              initialZoom: previewZoom,
              minZoom: 9.5,
              maxZoom: 18.5,
              interactionOptions: InteractionOptions(
                flags: widget.isInteractive ? InteractiveFlag.all : InteractiveFlag.none,
              ),
              onPositionChanged: (pos, hasGesture) {
                if (hasGesture && _autoFollowUser) {
                  setState(() {
                    _autoFollowUser = false;
                  });
                }
              },
            ),
            children: [
              // Tile Layer: Standard OpenStreetMap Tiles
              TileLayer(
                urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                subdomains: const ['a', 'b', 'c'],
                userAgentPackageName: 'com.junction.attendee.app',
                maxZoom: 19,
              ),

              // Crowd Overlay Zones (if enabled)
              if (_showCrowdOverlay)
                CircleLayer(
                  circles: [
                    // Churchgate choke point
                    CircleMarker(
                      point: const LatLng(18.9322, 72.8264),
                      color: AppTheme.red.withValues(alpha: 0.22),
                      borderStrokeWidth: 1.5,
                      borderColor: AppTheme.red.withValues(alpha: 0.6),
                      useRadiusInMeter: true,
                      radius: 650,
                    ),
                    // Marine Lines zone
                    CircleMarker(
                      point: const LatLng(18.9438, 72.8236),
                      color: AppTheme.yellow.withValues(alpha: 0.18),
                      borderStrokeWidth: 1.2,
                      borderColor: AppTheme.yellow.withValues(alpha: 0.5),
                      useRadiusInMeter: true,
                      radius: 500,
                    ),
                    // Dadar redistribution corridor
                    CircleMarker(
                      point: const LatLng(19.0178, 72.8478),
                      color: AppTheme.green.withValues(alpha: 0.18),
                      borderStrokeWidth: 1.2,
                      borderColor: AppTheme.green.withValues(alpha: 0.5),
                      useRadiusInMeter: true,
                      radius: 800,
                    ),
                  ],
                ),

              // Polylines Layer for Standard Base Route and Selected JUNCTION Route
              PolylineLayer(
                polylines: [
                  // 1. Draw Standard Baseline Route Base (Light Transparent Red Polyline)
                  for (var route in widget.routeOptions)
                    if (route.typeTag == 'FASTEST' || route.id != activeRoute?.id)
                      Polyline(
                        points: route.geometry,
                        color: const Color(0x77EF4444), // Muted Light Transparent Red for Standard Baseline
                        strokeWidth: 4.5,
                      ),

                  // 2. Active Route: Multi-Segment or Road Polyline Rendering
                  if (activeRoute != null && activeRoute.geometry.isNotEmpty) ...[
                    if (isNavigating) ...[
                      // Completed Polyline Portion (Muted Slate Grey behind user)
                      if (_completedGeometry(activeRoute.geometry).isNotEmpty)
                        Polyline(
                          points: _completedGeometry(activeRoute.geometry),
                          color: const Color(0x6664748B),
                          strokeWidth: 4.5,
                        ),
                      // Remaining Polyline Portion
                      if (_remainingGeometry(activeRoute.geometry).isNotEmpty) ...[
                        Polyline(
                          points: _remainingGeometry(activeRoute.geometry),
                          color: const Color(0x5510B981),
                          strokeWidth: 10.0,
                        ),
                        Polyline(
                          points: _remainingGeometry(activeRoute.geometry),
                          color: const Color(0xFF10B981),
                          strokeWidth: 6.0,
                        ),
                      ],
                    ] else ...[
                      // Multi-segment preview or full route preview
                      ..._buildSegmentPolylines(activeRoute),
                    ],
                  ],
                ],
              ),

              // Markers Layer: Current Location & Dynamic Destination Marker
              MarkerLayer(
                markers: [
                  // User GPS Current Location Marker / Rotating Triangular Chevron Arrow
                  Marker(
                    point: _navService.currentPosition ?? _userPosition,
                    width: isNavigating ? 48 : 44,
                    height: isNavigating ? 48 : 44,
                    child: isNavigating
                        ? Transform.rotate(
                            angle: (_navService.currentHeading * (3.141592653589793 / 180.0)),
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                // Pulsing navigation halo
                                Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: AppTheme.yellow.withValues(alpha: 0.35),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: AppTheme.yellow, width: 1.5),
                                  ),
                                ),
                                // Triangular Chevron Navigation Arrow
                                CustomPaint(
                                  size: const Size(24, 26),
                                  painter: _ChevronArrowPainter(),
                                ),
                              ],
                            ),
                          )
                        : Stack(
                            alignment: Alignment.center,
                            children: [
                              Container(
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF3B82F6).withValues(alpha: 0.25),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              Container(
                                width: 18,
                                height: 18,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF2563EB),
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 2.5),
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Colors.black38,
                                      blurRadius: 4,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                  ),

                  // Destination Pin (Hotel, Restaurant, or Venue)
                  Marker(
                    point: widget.actualDestinationLoc,
                    width: 150,
                    height: 54,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.yellow,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: AppTheme.ink, width: 1.2),
                            boxShadow: const [
                              BoxShadow(
                                color: Colors.black26,
                                blurRadius: 4,
                              ),
                            ],
                          ),
                          child: Text(
                            widget.destination?.type == DestinationType.RESTAURANT
                                ? "🍽 ${widget.actualDestinationName}"
                                : (widget.destination?.type == DestinationType.HOTEL
                                    ? "🏨 ${widget.actualDestinationName}"
                                    : "📍 ${widget.actualDestinationName}"),
                            style: const TextStyle(
                              color: AppTheme.ink,
                              fontSize: 9.5,
                              fontWeight: FontWeight.w900,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: AppTheme.ink,
                            shape: BoxShape.circle,
                            border: Border.all(color: AppTheme.yellow, width: 2),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),

          // 2. Map Legend Overlay (Standard = Light Red, JUNCTION = Green)
          if (!isNavigating)
            Positioned(
              top: 10,
              right: 10,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.92),
                  borderRadius: BorderRadius.circular(6),
                  boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppTheme.red, shape: BoxShape.circle)),
                    const SizedBox(width: 4),
                    const Text("Standard", style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.ink)),
                    const SizedBox(width: 6),
                    Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppTheme.green, shape: BoxShape.circle)),
                    const SizedBox(width: 4),
                    const Text("JUNCTION", style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.ink)),
                  ],
                ),
              ),
            ),

          // 3. Top Banner Overlay: Active Navigation Turn-by-Turn Card or Route Header
          Positioned(
            top: 10,
            left: 10,
            right: 10,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (isNavigating && currentStep != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.ink.withValues(alpha: 0.95),
                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                      border: Border.all(color: AppTheme.yellow, width: 1.5),
                      boxShadow: AppTheme.shadowMd,
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppTheme.yellow,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            _getManeuverIcon(currentStep.maneuver),
                            size: 24,
                            color: AppTheme.ink,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                currentStep.instruction.toUpperCase(),
                                style: AppTheme.displayFont(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                  color: AppTheme.white,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                "in ${_formatDistance(currentStep.distanceMeters)}",
                                style: AppTheme.metaText(
                                  fontSize: 11,
                                  color: AppTheme.yellow,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (LocationService.isDemoMode)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.amber.shade900,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              "DEMO MODE",
                              style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                            ),
                          ),
                      ],
                    ),
                  )
                else
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.ink.withValues(alpha: 0.92),
                          borderRadius: BorderRadius.circular(AppTheme.radiusXs),
                          boxShadow: AppTheme.shadowSm,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.map_rounded, size: 12, color: AppTheme.yellow),
                            const SizedBox(width: 4),
                            Text(
                              "JUNCTION MAP",
                              style: AppTheme.metaText(fontSize: 8.5, color: AppTheme.white),
                            ),
                          ],
                        ),
                      ),
                      MotionTap(
                        onTap: () {
                          setState(() {
                            _showCrowdOverlay = !_showCrowdOverlay;
                          });
                        },
                        scaleDown: 0.94,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: _showCrowdOverlay ? AppTheme.yellow : AppTheme.ink.withValues(alpha: 0.92),
                            borderRadius: BorderRadius.circular(AppTheme.radiusXs),
                            border: Border.all(color: AppTheme.ink, width: 1.0),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.alt_route_rounded,
                                size: 11,
                                color: _showCrowdOverlay ? AppTheme.ink : AppTheme.white,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                _showCrowdOverlay ? "CROWD ZONES ON" : "CROWD ZONES OFF",
                                style: TextStyle(
                                  fontSize: 8.5,
                                  fontWeight: FontWeight.bold,
                                  color: _showCrowdOverlay ? AppTheme.ink : AppTheme.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),

                // Dynamic Reroute Alert Message (if any)
                if (_navService.rerouteAlertMessage != null) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.red.withValues(alpha: 0.95),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 14),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            _navService.rerouteAlertMessage!,
                            style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: Colors.white, size: 12),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          onPressed: () => _navService.clearRerouteAlert(),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),

          // 3. Map Controls (Zoom / Recenter)
          if (widget.isInteractive)
            Positioned(
              right: 10,
              bottom: isNavigating ? 70 : 45,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildControlBtn(Icons.add, _zoomIn),
                  const SizedBox(height: 5),
                  _buildControlBtn(Icons.remove, _zoomOut),
                  const SizedBox(height: 5),
                  _buildControlBtn(
                    _autoFollowUser ? Icons.gps_fixed : Icons.center_focus_strong_outlined,
                    _recenterMap,
                    isActive: _autoFollowUser,
                  ),
                ],
              ),
            ),

          // 4. Bottom Active Navigation Bar / Action Panel
          if (isNavigating)
            Positioned(
              left: 10,
              right: 10,
              bottom: 10,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: AppTheme.ink.withValues(alpha: 0.95),
                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  border: Border.all(color: AppTheme.green, width: 1.2),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _formatDistance(_navService.remainingDistanceMeters),
                                style: AppTheme.displayFont(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w900,
                                  color: AppTheme.green,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                "${(_navService.remainingDurationSeconds / 60).ceil()} mins remaining",
                                style: AppTheme.metaText(fontSize: 10, color: Colors.white70),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 4),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              MotionTap(
                                onTap: () {
                                  NavigationVoiceService().testVoice();
                                },
                                scaleDown: 0.92,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppTheme.paperDark,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: AppTheme.yellow, width: 1.0),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.campaign_rounded, size: 11, color: AppTheme.yellow),
                                      const SizedBox(width: 2),
                                      Text(
                                        "TEST VOICE",
                                        style: AppTheme.displayFont(
                                          fontSize: 8,
                                          fontWeight: FontWeight.w900,
                                          color: AppTheme.yellow,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 4),
                              MotionTap(
                                onTap: () {
                                  final vs = NavigationVoiceService();
                                  vs.toggleVoice();
                                  setState(() {});
                                },
                                scaleDown: 0.92,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: NavigationVoiceService().isVoiceEnabled ? AppTheme.yellow : AppTheme.paperDark,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: AppTheme.ink, width: 1.0),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        NavigationVoiceService().isVoiceEnabled ? Icons.volume_up_rounded : Icons.volume_off_rounded,
                                        size: 11,
                                        color: AppTheme.ink,
                                      ),
                                      const SizedBox(width: 2),
                                      Text(
                                        NavigationVoiceService().isVoiceEnabled ? "Voice" : "Muted",
                                        style: AppTheme.displayFont(
                                          fontSize: 8.5,
                                          fontWeight: FontWeight.w900,
                                          color: AppTheme.ink,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 4),
                              MotionTap(
                                onTap: () => _navService.stopNavigation(),
                                scaleDown: 0.92,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: AppTheme.red,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    "END",
                                    style: AppTheme.displayFont(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w900,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      activeRoute?.summaryReason ?? "✓ JUNCTION crowd-monitored path",
                      style: const TextStyle(color: AppTheme.green, fontSize: 9.5, fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            )
          else if (widget.onStartNavigation != null && activeRoute != null)
            Positioned(
              left: 10,
              right: 10,
              bottom: 10,
              child: MotionTap(
                onTap: widget.onStartNavigation,
                scaleDown: 0.96,
                child: Container(
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppTheme.yellow,
                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                    border: Border.all(color: AppTheme.ink, width: 1.2),
                    boxShadow: AppTheme.shadowSm,
                  ),
                  alignment: Alignment.center,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.navigation_rounded, size: 16, color: AppTheme.ink),
                      const SizedBox(width: 6),
                      Text(
                        "START NAVIGATION",
                        style: AppTheme.displayFont(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          color: AppTheme.ink,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  IconData _getManeuverIcon(String maneuver) {
    if (maneuver.contains('depart')) return Icons.my_location_rounded;
    if (maneuver.contains('arrive')) return Icons.flag_rounded;
    if (maneuver.contains('turn_left') || maneuver.contains('left')) return Icons.turn_left_rounded;
    if (maneuver.contains('turn_right') || maneuver.contains('right')) return Icons.turn_right_rounded;
    if (maneuver.contains('slight_left')) return Icons.turn_slight_left_rounded;
    if (maneuver.contains('slight_right')) return Icons.turn_slight_right_rounded;
    if (maneuver.contains('sharp_left')) return Icons.turn_sharp_left_rounded;
    if (maneuver.contains('sharp_right')) return Icons.turn_sharp_right_rounded;
    if (maneuver.contains('uturn')) return Icons.u_turn_left_rounded;
    if (maneuver.contains('roundabout')) return Icons.roundabout_left_rounded;
    return Icons.straight_rounded;
  }

  List<LatLng> _completedGeometry(List<LatLng> full) {
    if (full.isEmpty) return [];
    final curPos = _navService.currentPosition ?? _userPosition;
    final nearestIdx = _findNearestPolylineIndex(curPos, full);
    if (nearestIdx <= 0) return [];
    return full.sublist(0, nearestIdx + 1);
  }

  List<LatLng> _remainingGeometry(List<LatLng> full) {
    if (full.isEmpty) return [];
    final curPos = _navService.currentPosition ?? _userPosition;
    final nearestIdx = _findNearestPolylineIndex(curPos, full);
    return full.sublist(nearestIdx);
  }

  int _findNearestPolylineIndex(LatLng userPos, List<LatLng> points) {
    if (points.isEmpty) return 0;
    const distanceCalc = Distance();
    int minIndex = 0;
    double minDistance = double.infinity;
    for (int i = 0; i < points.length; i++) {
      final dist = distanceCalc.as(LengthUnit.Meter, userPos, points[i]);
      if (dist < minDistance) {
        minDistance = dist;
        minIndex = i;
      }
    }
    return minIndex;
  }

  String _formatDistance(double meters) {
    if (meters < 1000) {
      return "${meters.round()} m";
    }
    return "${(meters / 1000).toStringAsFixed(1)} km";
  }

  Widget _buildControlBtn(IconData icon, VoidCallback onTap, {bool isActive = false}) {
    return MotionTap(
      onTap: onTap,
      scaleDown: 0.92,
      child: Container(
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          color: isActive ? AppTheme.yellow : AppTheme.white,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppTheme.neutralDark, width: 0.8),
          boxShadow: const [
            BoxShadow(
              color: Colors.black26,
              blurRadius: 3,
              offset: Offset(0, 1),
            ),
          ],
        ),
        alignment: Alignment.center,
        child: Icon(icon, size: 15, color: AppTheme.ink),
      ),
    );
  }
}

class _ChevronArrowPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppTheme.ink
      ..style = PaintingStyle.fill;

    final borderPaint = Paint()
      ..color = AppTheme.yellow
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;

    final path = ui.Path();
    // Triangular chevron pointing UP (0 degrees = North)
    path.moveTo(size.width / 2, 0); // Tip
    path.lineTo(size.width, size.height); // Bottom right
    path.lineTo(size.width / 2, size.height * 0.72); // Inner notch
    path.lineTo(0, size.height); // Bottom left
    path.close();

    canvas.drawPath(path, paint);
    canvas.drawPath(path, borderPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
