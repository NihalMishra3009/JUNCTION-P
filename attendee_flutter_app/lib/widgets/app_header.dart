import 'package:flutter/material.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import 'pill_badge.dart';
import 'motion_tap.dart';
import 'profile_modal.dart';

class AppHeader extends StatelessWidget {
  final AppState appState;

  const AppHeader({super.key, required this.appState});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: const BoxDecoration(
        color: AppTheme.paper,
        border: Border(
          bottom: BorderSide(color: AppTheme.neutral, width: 1.0),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            Text(
              "JUNCTION",
              style: AppTheme.displayFont(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(width: 6),
            const PillBadge(
              text: "● LIVE",
              variant: PillVariant.live,
              fontSize: 9,
              padding: EdgeInsets.symmetric(horizontal: 5, vertical: 2),
            ),
            const Spacer(),
            // Manual Refresh Button (Top-Right)
            MotionTap(
              onTap: () {
                appState.syncWithBackend(showFeedback: true, context: context);
              },
              scaleDown: 0.90,
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: AppTheme.paper,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppTheme.neutral, width: 1.2),
                  boxShadow: AppTheme.shadowSm,
                ),
                alignment: Alignment.center,
                child: appState.isSyncing
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppTheme.yellow,
                        ),
                      )
                    : const Icon(
                        Icons.refresh_rounded,
                        size: 16,
                        color: AppTheme.ink,
                      ),
              ),
            ),
            const SizedBox(width: 8),
            // Attendee Profile Button
            MotionTap(
              onTap: () => ProfileModal.show(context, appState),
              scaleDown: 0.90,
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: AppTheme.ink,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppTheme.yellow, width: 1.5),
                  boxShadow: AppTheme.shadowSm,
                ),
                alignment: Alignment.center,
                child: Text(
                  (appState.currentUser?.name.isNotEmpty == true)
                      ? appState.currentUser!.name.substring(0, 1).toUpperCase()
                      : "A",
                  style: AppTheme.displayFont(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.yellow,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
