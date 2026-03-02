import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stitch_app/screens/convert_gift_card_screen.dart';

void main() {
  testWidgets('Convert screen builds without exceptions',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: ConvertGiftCardScreen()));
    expect(find.byType(ConvertGiftCardScreen), findsOneWidget);
  });
}
