import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/referral_photo.dart';
import 'package:mobile/models/bite_intake_draft.dart';

void main() {
  final png = base64Decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
  );
  test('encodes the photo bytes, not a filename', () {
    final value = ReferralPhoto.encode(png);
    expect(value, startsWith('data:image/png;base64,'));
    expect(Uri.parse(value).data!.contentAsBytes(), png);
    final draft = BiteIntakeDraft(
      schemaVersion: '1',
      dateOfExposure: DateTime(2026, 11, 7),
      reportedModeOfExposure: 'bite',
      animalSpecies: 'dog',
      animalOwnership: 'owned',
      referralDocumentPhoto: value,
    );
    expect(draft.toJson()['referral_document_photo'], value);
  });
  test('accepts 2 MB and rejects one byte above the limit', () {
    final bytes = Uint8List(ReferralPhoto.maxBytes)
      ..setRange(0, png.length, png);
    expect(ReferralPhoto.encode(bytes), startsWith('data:image/png;base64,'));
    expect(
      () => ReferralPhoto.encode(Uint8List(ReferralPhoto.maxBytes + 1)),
      throwsFormatException,
    );
  });
  test('rejects unsupported and empty files', () {
    expect(() => ReferralPhoto.encode(Uint8List(0)), throwsFormatException);
    expect(
      () => ReferralPhoto.encode(Uint8List.fromList(utf8.encode('fake.jpg'))),
      throwsFormatException,
    );
  });
}
