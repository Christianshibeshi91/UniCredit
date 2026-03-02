import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:stitch_app/main.dart';
import 'package:stitch_app/services/app_state.dart';

void main() {
  testWidgets('App builds without exceptions', (WidgetTester tester) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => AppState(),
        child: const StitchApp(),
      ),
    );
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
