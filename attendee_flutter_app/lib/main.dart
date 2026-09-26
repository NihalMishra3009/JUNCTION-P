import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'services/location_service.dart';
import 'services/navigation_voice_service.dart';
import 'state/app_state.dart';
import 'theme/app_theme.dart';
import 'screens/splash_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      statusBarBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFFF6F5F1),
      systemNavigationBarIconBrightness: Brightness.dark,
      systemNavigationBarDividerColor: Color(0xFFF6F5F1),
    ),
  );
  runApp(const AttendeeApp());
}

class AttendeeApp extends StatefulWidget {
  const AttendeeApp({super.key});

  @override
  State<AttendeeApp> createState() => _AttendeeAppState();
}

class _AttendeeAppState extends State<AttendeeApp> {
  final AppState _appState = AppState();

  @override
  void initState() {
    super.initState();
    _appState.addListener(_onStateChange);
    LocationService.requestInitialPermissions();
    NavigationVoiceService(); // Start listening to navigation updates
  }

  @override
  void dispose() {
    _appState.removeListener(_onStateChange);
    _appState.dispose();
    super.dispose();
  }

  void _onStateChange() {
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Junction Attendee',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: SplashScreen(appState: _appState),
    );
  }
}
