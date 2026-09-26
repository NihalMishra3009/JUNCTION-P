import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/types.dart';

class BackendScenarioUpdate {
  final ScenarioId activeScenario;
  final bool isRec1Approved;
  final int scenarioVersion;
  final String timestamp;

  BackendScenarioUpdate({
    required this.activeScenario,
    required this.isRec1Approved,
    required this.scenarioVersion,
    required this.timestamp,
  });
}

class BackendScenarioSyncService {
  static final BackendScenarioSyncService _instance = BackendScenarioSyncService._internal();
  factory BackendScenarioSyncService() => _instance;
  BackendScenarioSyncService._internal();

  // Potential backend host URLs for Physical Android Device, Emulator, Desktop, LAN
  final List<String> _candidateBaseUrls = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.90.169:3000",
    "http://10.0.2.2:3000",
    "http://192.168.137.84:3000",
  ];

  String? _workingBaseUrl;
  String? _lastError;
  Timer? _pollingTimer;

  String? get workingBaseUrl => _workingBaseUrl;
  String? get lastError => _lastError;

  List<String> get _resolvedCandidateUrls {
    final List<String> urls = [];

    // 1. Prioritize cached working base URL if already established
    if (_workingBaseUrl != null) {
      urls.add(_workingBaseUrl!);
    }

    // 2. Default Next.js Backend URLs (Port 3000)
    if (!urls.contains("http://localhost:3000")) urls.add("http://localhost:3000");
    if (!urls.contains("http://127.0.0.1:3000")) urls.add("http://127.0.0.1:3000");
    if (!urls.contains("http://192.168.90.169:3000")) urls.add("http://192.168.90.169:3000");

    // 3. Web origin fallback if running on Web
    if (kIsWeb) {
      try {
        final uri = Uri.base;
        if (uri.scheme.startsWith('http')) {
          final sameHostBackend = "${uri.scheme}://${uri.host}:3000";
          if (!urls.contains(sameHostBackend)) {
            urls.add(sameHostBackend);
          }
          if (uri.port == 3000 && !urls.contains(uri.origin)) {
            urls.add(uri.origin);
          }
        }
      } catch (_) {}
    }

    for (final u in _candidateBaseUrls) {
      if (!urls.contains(u)) {
        urls.add(u);
      }
    }
    return urls;
  }

  /// Attempts to fetch current active scenario from JUNCTION unified backend API
  Future<BackendScenarioUpdate?> fetchActiveScenario() async {
    final urlsToTry = _resolvedCandidateUrls;

    for (final baseUrl in urlsToTry) {
      try {
        final uri = Uri.parse("$baseUrl/api/scenarios");
        final response = await http.get(uri).timeout(const Duration(seconds: 2));

        if (response.statusCode == 200) {
          try {
            final json = jsonDecode(response.body);

            if (json is Map<String, dynamic> && json["success"] == true && json["activeScenario"] != null) {
              _workingBaseUrl = baseUrl; // Cache working host URL
              _lastError = null;
              final rawScenarioStr = json["activeScenario"].toString();
              final isRec1Approved = json["isRec1Approved"] == true;
              final scenarioVersion = json["scenarioVersion"] is int ? json["scenarioVersion"] as int : 1;
              final timestamp = json["timestamp"]?.toString() ?? DateTime.now().toIso8601String();

              ScenarioId parsedScenario = ScenarioId.NORMAL;
              for (final s in ScenarioId.values) {
                if (s.name.toUpperCase() == rawScenarioStr.toUpperCase()) {
                  parsedScenario = s;
                  break;
                }
              }

              if (kDebugMode) {
                debugPrint("BackendScenarioSyncService: Synced activeScenario=$parsedScenario (v$scenarioVersion) from $baseUrl");
              }

              return BackendScenarioUpdate(
                activeScenario: parsedScenario,
                isRec1Approved: isRec1Approved,
                scenarioVersion: scenarioVersion,
                timestamp: timestamp,
              );
            }
          } catch (e) {
            _lastError = "JSON parse error from $baseUrl: $e";
            if (kDebugMode) {
              debugPrint("BackendScenarioSyncService: Error parsing JSON from $baseUrl: $e");
            }
          }
        } else {
          _lastError = "HTTP ${response.statusCode} from $baseUrl";
        }
      } catch (e) {
        _lastError = "$baseUrl unreachable ($e)";
        if (kDebugMode) {
          debugPrint("BackendScenarioSyncService: Failed candidate $baseUrl: $e");
        }
      }
    }
    return null;
  }

  /// Starts live background polling (every 3 seconds) for real-time scenario sync
  void startLiveSync(void Function(BackendScenarioUpdate update) onUpdate) {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 3), (timer) async {
      final update = await fetchActiveScenario();
      if (update != null) {
        onUpdate(update);
      }
    });
  }

  void stopLiveSync() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }
}
