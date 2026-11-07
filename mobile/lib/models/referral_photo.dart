import 'dart:convert';
import 'dart:typed_data';

class ReferralPhoto {
  static const maxBytes = 2 * 1024 * 1024;
  static const sizeError = 'The referral photo must be 2 MB or smaller.';

  static String encode(Uint8List bytes) {
    if (bytes.length > maxBytes) throw const FormatException(sizeError);
    final isJpeg =
        bytes.length >= 3 &&
        bytes[0] == 0xff &&
        bytes[1] == 0xd8 &&
        bytes[2] == 0xff;
    final isPng =
        bytes.length >= 8 &&
        bytes.take(8).join(',') == '137,80,78,71,13,10,26,10';
    if (!isJpeg && !isPng) {
      throw const FormatException('Please choose a JPG or PNG photo.');
    }
    return 'data:image/${isJpeg ? 'jpeg' : 'png'};base64,${base64Encode(bytes)}';
  }
}
