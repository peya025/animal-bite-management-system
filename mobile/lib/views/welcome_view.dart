import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../widgets/buttons/primary_action_button.dart';
import '../widgets/clinic_brand.dart';

class WelcomeView extends StatelessWidget {
  const WelcomeView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(28, 40, 28, 32),
          child: Column(
            children: [
              const Spacer(flex: 2),
              const ClinicBrand(markSize: 190),
              const Spacer(flex: 3),
              PrimaryActionButton(
                label: 'GET STARTED',
                onPressed: () => Navigator.of(context).pushNamed(
                  AppRoutes.login,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
