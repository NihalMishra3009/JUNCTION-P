import 'package:flutter/material.dart';
import '../models/types.dart';
import '../data/mock_data.dart';
import '../services/backend_scenario_sync_service.dart';

class AppState extends ChangeNotifier {
  ScenarioId _activeScenario = ScenarioId.NORMAL;
  int _currentTabIndex = 2; // Default to Home in the center (Plan=0, Stay=1, Home=2, Food=3, Event=4)
  String? _attendeeSelectedRouteId;
  bool _isRec1Approved = false; // "Encourage visitors toward Dadar"
  bool _hasAttendeeRecommendation = false;
  String _attendeeRecommendationMessage =
      "Organizer recommendation: Dadar Station route has lower predicted crowd pressure.";

  bool _isSyncing = false;
  int _lastScenarioVersion = 0;

  UserProfile? _currentUser;

  final List<String> _closedLoopEvents = [];

  AppState() {
    _initBackendSync();
  }

  void _initBackendSync() {
    syncWithBackend();
    BackendScenarioSyncService().startLiveSync((update) {
      _applyScenarioUpdate(update);
    });
  }

  Future<bool> syncWithBackend({bool showFeedback = false, BuildContext? context}) async {
    _isSyncing = true;
    notifyListeners();

    try {
      final update = await BackendScenarioSyncService().fetchActiveScenario();
      _isSyncing = false;

      if (update != null) {
        _applyScenarioUpdate(update);

        if (showFeedback && context != null && context.mounted) {
          ScaffoldMessenger.of(context).clearSnackBars();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("Backend synced: ${_activeScenario.displayName} (v${update.scenarioVersion})"),
              duration: const Duration(seconds: 2),
              behavior: SnackBarBehavior.floating,
              backgroundColor: const Color(0xFF10B981),
            ),
          );
        }
        return true;
      } else {
        notifyListeners();
        if (showFeedback && context != null && context.mounted) {
          ScaffoldMessenger.of(context).clearSnackBars();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Couldn't refresh. Showing last available data."),
              duration: Duration(seconds: 3),
              behavior: SnackBarBehavior.floating,
              backgroundColor: Color(0xFFEF4444),
            ),
          );
        }
        return false;
      }
    } catch (e) {
      _isSyncing = false;
      notifyListeners();
      if (showFeedback && context != null && context.mounted) {
        ScaffoldMessenger.of(context).clearSnackBars();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Couldn't refresh. Showing last available data."),
            duration: Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
            backgroundColor: Color(0xFFEF4444),
          ),
        );
      }
      return false;
    }
  }

  bool _applyScenarioUpdate(BackendScenarioUpdate update) {
    bool changed = false;
    if (update.activeScenario != _activeScenario) {
      _activeScenario = update.activeScenario;
      _attendeeSelectedRouteId = null;
      changed = true;

      if (_activeScenario == ScenarioId.POST_EVENT_SURGE) {
        _hasAttendeeRecommendation = true;
        _attendeeRecommendationMessage =
            "Post-match exit surge active: Churchgate at 94% pressure. Dadar route recommended with dedicated shuttle connection.";
      } else if (_activeScenario == ScenarioId.TRANSPORT_DISRUPTION) {
        _hasAttendeeRecommendation = true;
        _attendeeRecommendationMessage =
            "Western Railway disruption reported. Dadar or CSMT alternate corridors active.";
      } else {
        _hasAttendeeRecommendation = _isRec1Approved;
      }
      _addClosedLoopEvent("Synced active scenario from backend: ${_activeScenario.displayName}");
    }

    if (update.isRec1Approved != _isRec1Approved) {
      _isRec1Approved = update.isRec1Approved;
      _hasAttendeeRecommendation = _isRec1Approved;
      changed = true;
      if (_isRec1Approved) {
        _attendeeRecommendationMessage =
            "Organizer recommendation active: Visitors redirected toward Dadar to reduce Churchgate choke point.";
      }
    }

    if (update.scenarioVersion != _lastScenarioVersion) {
      _lastScenarioVersion = update.scenarioVersion;
      changed = true;
    }

    if (changed) {
      notifyListeners();
    }
    return changed;
  }

  ScenarioId get activeScenario => _activeScenario;
  int get currentTabIndex => _currentTabIndex;
  String? get attendeeSelectedRouteId => _attendeeSelectedRouteId;
  bool get isRec1Approved => _isRec1Approved;
  bool get hasAttendeeRecommendation => _hasAttendeeRecommendation;
  bool get isSyncing => _isSyncing;
  int get lastScenarioVersion => _lastScenarioVersion;
  String get attendeeRecommendationMessage => _attendeeRecommendationMessage;
  List<String> get closedLoopEvents => List.unmodifiable(_closedLoopEvents);

  UserProfile? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;

  EventInfo get eventInfo => MockData.eventInfo;
  List<AttendeeRoute> get routes =>
      MockData.getAttendeeRoutes(_activeScenario, _isRec1Approved);
  List<Hotel> get hotels => MockData.getHotels(_activeScenario);
  List<Restaurant> get restaurants => MockData.getRestaurants(_activeScenario);
  List<Alert> get alerts => MockData.getAlerts(_activeScenario);

  void loginWithGoogle({
    String? name,
    String? email,
    String? zone,
    String? ticketType,
  }) {
    _currentUser = UserProfile(
      id: "usr_google_${DateTime.now().millisecondsSinceEpoch}",
      name: name?.trim().isNotEmpty == true ? name!.trim() : "Aarav Sharma",
      email: email?.trim().isNotEmpty == true ? email!.trim() : "aarav.sharma@gmail.com",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      ticketCategory: ticketType ?? "VIP Grandstand · Gate 3",
      seatNumber: "Block B · Row 8 · Seat 24",
      preferredZone: zone ?? "Zone C (Dadar - Recommended)",
      authProvider: AuthProvider.google,
      phone: "+91 98201 44520",
    );
    _addClosedLoopEvent("Attendee authenticated via Google Sign-In (${_currentUser!.name}).");
    notifyListeners();
  }

  void loginWithApple({
    String? name,
    String? email,
    String? zone,
    String? ticketType,
  }) {
    _currentUser = UserProfile(
      id: "usr_apple_${DateTime.now().millisecondsSinceEpoch}",
      name: name?.trim().isNotEmpty == true ? name!.trim() : "Rohan Varma",
      email: email?.trim().isNotEmpty == true ? email!.trim() : "rohan.v@icloud.com",
      ticketCategory: ticketType ?? "Pavilion Club · Gate 1",
      seatNumber: "Club Tier 1 · Seat 14",
      preferredZone: zone ?? "Zone C (Dadar - Recommended)",
      authProvider: AuthProvider.apple,
      phone: "+91 98190 77312",
    );
    _addClosedLoopEvent("Attendee authenticated via Apple Sign-In (${_currentUser!.name}).");
    notifyListeners();
  }

  void loginWithEmail({
    required String name,
    required String email,
    String? zone,
    String? ticketType,
  }) {
    _currentUser = UserProfile(
      id: "usr_${DateTime.now().millisecondsSinceEpoch}",
      name: name.trim().isEmpty ? "Junction Attendee" : name.trim(),
      email: email.trim().isEmpty ? "attendee@junction.in" : email.trim(),
      preferredZone: zone ?? "Zone C (Dadar)",
      ticketCategory: ticketType ?? "General East Stand",
      seatNumber: "Gate 4 · Bay 12",
      authProvider: AuthProvider.email,
    );
    _addClosedLoopEvent("Attendee authenticated via Email.");
    notifyListeners();
  }

  void loginAsGuest() {
    _currentUser = const UserProfile(
      id: "usr_guest_demo",
      name: "Guest Visitor",
      email: "guest@junction.in",
      ticketCategory: "General Admission",
      seatNumber: "Gate 3 Entrance",
      preferredZone: "Zone C (Dadar)",
      authProvider: AuthProvider.guest,
    );
    _addClosedLoopEvent("Attendee entered as Guest.");
    notifyListeners();
  }

  void updateProfile({
    required String name,
    required String email,
    required String preferredZone,
    required String ticketCategory,
    String? phone,
  }) {
    if (_currentUser != null) {
      _currentUser = _currentUser!.copyWith(
        name: name,
        email: email,
        preferredZone: preferredZone,
        ticketCategory: ticketCategory,
        phone: phone,
      );
      _addClosedLoopEvent("Attendee updated profile & destination preferences.");
      notifyListeners();
    }
  }

  void logout() {
    _currentUser = null;
    _attendeeSelectedRouteId = null;
    _addClosedLoopEvent("Attendee signed out.");
    notifyListeners();
  }

  void setTabIndex(int index) {
    if (_currentTabIndex != index) {
      _currentTabIndex = index;
      notifyListeners();
    }
  }

  void setScenario(ScenarioId scenario) {
    _activeScenario = scenario;
    _attendeeSelectedRouteId = null;

    if (scenario == ScenarioId.POST_EVENT_SURGE) {
      _hasAttendeeRecommendation = true;
      _attendeeRecommendationMessage =
          "Post-match exit surge active: Churchgate at 94% pressure. Dadar route recommended with dedicated shuttle connection.";
    } else if (scenario == ScenarioId.TRANSPORT_DISRUPTION) {
      _hasAttendeeRecommendation = true;
      _attendeeRecommendationMessage =
          "Western Railway disruption reported. Dadar or CSMT alternate corridors active.";
    } else {
      _hasAttendeeRecommendation = _isRec1Approved;
    }

    _addClosedLoopEvent("Scenario changed to ${scenario.displayName}");
    notifyListeners();
  }

  void toggleOrganizerRecommendation(bool approved) {
    _isRec1Approved = approved;
    _hasAttendeeRecommendation = approved;
    if (approved) {
      _attendeeRecommendationMessage =
          "Organizer recommendation active: Visitors redirected toward Dadar to reduce Churchgate choke point.";
      _addClosedLoopEvent(
          "Organizer broadcasted Dadar redistribution recommendation to attendees.");
    } else {
      _addClosedLoopEvent("Organizer cleared active redistribution.");
    }
    notifyListeners();
  }

  void selectAttendeeRoute(String routeId) {
    _attendeeSelectedRouteId = routeId;
    _addClosedLoopEvent(
        "Attendee selected [$routeId] route. Destination digital twin state updated: Demand -1 from Churchgate, +1 to Dadar corridor.");
    notifyListeners();
  }

  void clearAttendeeRoute() {
    _attendeeSelectedRouteId = null;
    notifyListeners();
  }

  void _addClosedLoopEvent(String log) {
    final now = DateTime.now();
    final timeStr =
        "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}";
    _closedLoopEvents.insert(0, "[$timeStr] $log");
    if (_closedLoopEvents.length > 20) {
      _closedLoopEvents.removeLast();
    }
  }
}
