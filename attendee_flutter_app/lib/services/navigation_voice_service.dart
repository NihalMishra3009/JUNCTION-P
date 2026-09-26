import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:latlong2/latlong.dart';
import '../models/navigation_step.dart';
import '../models/types.dart';
import 'navigation_service.dart';

class NavigationVoiceService extends ChangeNotifier {
  static final NavigationVoiceService _instance = NavigationVoiceService._internal();
  factory NavigationVoiceService() => _instance;
  NavigationVoiceService._internal() {
    initialize();
    NavigationService().addListener(() {
      _processNavigationUpdate(NavigationService());
    });
  }

  final FlutterTts _tts = FlutterTts();
  final Distance _distanceCalc = const Distance();

  bool _isInitialized = false;
  bool _voiceEnabled = true;
  final double _speechRate = 0.48; // Natural speech speed
  final double _volume = 1.0;
  final double _pitch = 1.0;
  String _language = "en-US";

  // Guidance tracking state to prevent spam/duplicate announcements
  int _lastStepIndex = -1;
  final Set<String> _announcedThresholds = {};
  bool _wasNavigating = false;
  bool _wasDeviated = false;
  bool _wasArrived = false;
  String? _lastRerouteMsg;

  bool get isVoiceEnabled => _voiceEnabled;
  double get speechRate => _speechRate;
  double get volume => _volume;
  double get pitch => _pitch;
  String get language => _language;

  void toggleVoice() {
    _voiceEnabled = !_voiceEnabled;
    if (!_voiceEnabled) {
      stop();
    }
    notifyListeners();
  }

  Future<void> initialize() async {
    if (_isInitialized) return;
    try {
      // Try setting en-IN first, fallback to en-US
      try {
        final isAvailable = await _tts.isLanguageAvailable("en-IN");
        if (isAvailable == true) {
          await _tts.setLanguage("en-IN");
          _language = "en-IN";
        } else {
          await _tts.setLanguage("en-US");
          _language = "en-US";
        }
      } catch (_) {
        try {
          await _tts.setLanguage("en-US");
          _language = "en-US";
        } catch (err) {
          debugPrint('[NavigationVoiceService] setLanguage fallback notice: $err');
        }
      }

      await _tts.setSpeechRate(_speechRate);
      await _tts.setVolume(_volume);
      await _tts.setPitch(_pitch);
      await _tts.awaitSpeakCompletion(true);
      _isInitialized = true;
      debugPrint('[NavigationVoiceService] Native TTS initialized successfully (Language: $_language).');
    } catch (e) {
      debugPrint('[NavigationVoiceService] Native TTS initialization error: $e');
    }
  }

  Future<void> testVoice() async {
    if (!_isInitialized) {
      await initialize();
    }
    await speak("JUNCTION voice navigation is working.");
  }

  Future<void> speak(String text) async {
    if (!_voiceEnabled || text.trim().isEmpty) return;
    if (!_isInitialized) {
      await initialize();
    }
    try {
      await _tts.stop(); // Stop previous instruction before speaking new one
      final result = await _tts.speak(text);
      debugPrint('[NavigationVoiceService] Spoke: "$text" (result: $result)');
    } catch (e) {
      debugPrint('[NavigationVoiceService] Speech error: $e');
    }
  }

  Future<void> stop() async {
    try {
      await _tts.stop();
    } catch (e) {
      debugPrint('[NavigationVoiceService] Stop error: $e');
    }
  }

  Future<void> pause() async {
    try {
      await _tts.pause();
    } catch (e) {
      debugPrint('[NavigationVoiceService] Pause error: $e');
    }
  }

  Future<void> resume() async {
    try {
      if (_isInitialized) {
        _announceCurrentInstruction(NavigationService());
      }
    } catch (e) {
      debugPrint('[NavigationVoiceService] Resume error: $e');
    }
  }

  void _processNavigationUpdate(NavigationService navService) {
    final isNav = navService.isNavigating;
    final activeRoute = navService.activeRoute;
    final dest = navService.activeDestination;
    final pos = navService.currentPosition;
    final stepIndex = navService.currentStepIndex;

    // 1. Navigation Started Transition
    if (isNav && !_wasNavigating) {
      _wasNavigating = true;
      _lastStepIndex = -1;
      _announcedThresholds.clear();
      _wasDeviated = false;
      _wasArrived = false;
      _lastRerouteMsg = null;

      final destName = dest?.name ?? "your destination";
      final durationMins = activeRoute != null ? (activeRoute.durationSeconds / 60).round() : 0;
      final timeStr = durationMins > 0 ? " Your route is approximately $durationMins minutes." : "";
      
      speak("Navigation started to $destName.$timeStr");
      return;
    }

    // 2. Navigation Stopped Transition
    if (!isNav && _wasNavigating) {
      _wasNavigating = false;
      _lastStepIndex = -1;
      _announcedThresholds.clear();
      stop();
      return;
    }

    if (!isNav || activeRoute == null || pos == null) return;

    // 3. Arrival Announcement
    if (navService.hasArrived && !_wasArrived) {
      _wasArrived = true;
      final destName = dest?.name ?? "your destination";
      speak("You have arrived at $destName.");
      return;
    }

    // 4. Reroute / Off-Route Announcements
    if (navService.isDeviated && !_wasDeviated) {
      _wasDeviated = true;
      speak("You are off route. Recalculating.");
      return;
    }

    if (!navService.isDeviated && _wasDeviated) {
      _wasDeviated = false;
      speak("A new route has been found.");
      _announcedThresholds.clear();
      _lastStepIndex = -1;
    }

    if (navService.rerouteAlertMessage != null && navService.rerouteAlertMessage != _lastRerouteMsg) {
      _lastRerouteMsg = navService.rerouteAlertMessage;
      if (_lastRerouteMsg!.contains('Crowd') || _lastRerouteMsg!.contains('JUNCTION')) {
        speak("Crowd conditions have changed. JUNCTION has updated your route.");
      }
    }

    // 5. Turn Approach & Distance Threshold Guidance
    final step = navService.currentStep;
    if (step == null) return;

    // If step changed, announce next maneuver
    if (stepIndex != _lastStepIndex) {
      _lastStepIndex = stepIndex;
      _announcedThresholds.clear();

      final stepInst = _formatManeuverText(step.maneuver);
      final distStr = formatVoiceDistance(step.distanceMeters);
      speak("$stepInst. Continue for $distStr.");
      return;
    }

    // Check distance to next maneuver location
    final distToManeuver = _distanceCalc.as(LengthUnit.Meter, pos, step.location);
    final isWalking = navService.travelMode == TravelMode.walking;

    // Define distance threshold triggers (meters)
    final thresholds = isWalking
        ? [200.0, 100.0, 50.0, 20.0]
        : [500.0, 200.0, 100.0, 30.0];

    for (final th in thresholds) {
      final key = "step_${stepIndex}_$th";
      if (distToManeuver <= th && !_announcedThresholds.contains(key)) {
        _announcedThresholds.add(key);

        if (th <= (isWalking ? 20.0 : 30.0)) {
          final action = _formatManeuverText(step.maneuver);
          speak(action);
        } else {
          final distFormatted = formatVoiceDistance(distToManeuver);
          final action = _formatManeuverText(step.maneuver);
          speak("In $distFormatted, $action.");
        }
        break;
      }
    }
  }

  void _announceCurrentInstruction(NavigationService navService) {
    if (!navService.isNavigating) return;
    final step = navService.currentStep;
    final pos = navService.currentPosition;
    if (step != null && pos != null) {
      final dist = _distanceCalc.as(LengthUnit.Meter, pos, step.location);
      final action = _formatManeuverText(step.maneuver);
      final distFormatted = formatVoiceDistance(dist);
      speak("In $distFormatted, $action.");
    }
  }

  void announceNextTurn() {
    _announceCurrentInstruction(NavigationService());
  }

  void announceReroute(String message) {
    speak(message);
  }

  void speakScenarioReroute() {
    speak("Crowd conditions have changed. JUNCTION has updated your route.");
  }

  void announceArrival(String destinationName) {
    speak("You have arrived at $destinationName.");
  }

  void announceDestination(String destinationName) {
    speak("Navigating to $destinationName.");
  }

  String buildVoiceInstruction(NavigationStep step, double distanceMeters) {
    final action = _formatManeuverText(step.maneuver);
    if (distanceMeters <= 30) {
      return action;
    }
    final distFormatted = formatVoiceDistance(distanceMeters);
    return "In $distFormatted, $action";
  }

  String formatVoiceDistance(double meters) {
    if (meters < 1000) {
      int roundedMeters = (meters / 10).round() * 10;
      if (roundedMeters < 10) roundedMeters = 10;
      return "$roundedMeters meters";
    } else {
      final km = (meters / 1000).toStringAsFixed(1);
      return "$km kilometers";
    }
  }

  String _formatManeuverText(String maneuver) {
    final m = maneuver.toLowerCase();
    if (m.contains('board_train')) return "Board the train towards your destination station";
    if (m.contains('alight_train')) return "Get off the train at your station";
    if (m.contains('board_metro')) return "Board the Metro line";
    if (m.contains('alight_metro')) return "Get off the Metro at your station";
    if (m.contains('transfer')) return "Walk via the interchange skywalk";
    if (m.contains('walk')) return "Walk towards the station";
    if (m.contains('depart')) return "Head towards your destination";
    if (m.contains('arrive')) return "Arrive at your destination";
    if (m.contains('sharp_left')) return "sharp left";
    if (m.contains('sharp_right')) return "sharp right";
    if (m.contains('slight_left')) return "keep left";
    if (m.contains('slight_right')) return "keep right";
    if (m.contains('turn_left') || m.contains('left')) return "turn left";
    if (m.contains('turn_right') || m.contains('right')) return "turn right";
    if (m.contains('uturn')) return "make a U-turn";
    if (m.contains('roundabout')) return "at the roundabout, take the exit";
    return "continue straight";
  }
}
