import 'package:flutter_test/flutter_test.dart';
import 'package:attendee_flutter_app/main.dart';

void main() {
  testWidgets('Attendee app launches and displays Junction header', (WidgetTester tester) async {
    await tester.pumpWidget(const AttendeeApp());
    expect(find.text('JUNCTION'), findsOneWidget);
    expect(find.text('GOOD MORNING'), findsNothing); // Or whatever greeting
  });
}
