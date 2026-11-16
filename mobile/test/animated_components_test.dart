import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:clinica_mobile/widgets/animated_components.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Animated Components Tests', () {
    testWidgets('LivePulseBadge renders correctly with label', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: LivePulseBadge(label: 'En Línea'),
          ),
        ),
      );

      expect(find.text('En Línea'), findsOneWidget);
      expect(find.byType(LivePulseBadge), findsOneWidget);
    });

    testWidgets('BouncyButton triggers onTap callback', (WidgetTester tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: BouncyButton(
              onTap: () {
                tapped = true;
              },
              child: const Text('Bouncy Tap'),
            ),
          ),
        ),
      );

      expect(find.text('Bouncy Tap'), findsOneWidget);
      await tester.tap(find.text('Bouncy Tap'));
      await tester.pumpAndSettle();

      expect(tapped, isTrue);
    });

    testWidgets('FadeSlideEntry animates child into view', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: FadeSlideEntry(
              delay: Duration.zero,
              child: Text('FadeSlide Child'),
            ),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 350));

      expect(find.text('FadeSlide Child'), findsOneWidget);
    });

    testWidgets('Shimmer placeholders render without errors', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                ShimmerDoctorCard(),
                ShimmerAppointmentCard(),
              ],
            ),
          ),
        ),
      );

      expect(find.byType(ShimmerDoctorCard), findsOneWidget);
      expect(find.byType(ShimmerAppointmentCard), findsOneWidget);
    });
  });
}
