import 'package:flutter/material.dart';

import 'app/app.dart';
import 'services/mobile_api.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await MobileApi.instance.initialize();
  runApp(const AnimalCareApp());
}
