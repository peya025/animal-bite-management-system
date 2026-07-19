import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../widgets/buttons/primary_action_button.dart';
import '../widgets/clinic_brand.dart';

class WelcomeView extends StatefulWidget {
  const WelcomeView({super.key});

  @override
  State<WelcomeView> createState() => _WelcomeViewState();
}

class _WelcomeViewState extends State<WelcomeView> {
  static const _steps = [
    _OnboardingStep(
      asset: 'assets/images/onboarding/clinic-badge.png',
      title: 'Welcome to Animal Bite Center',
      description:
          'A patient companion for timely bite care, clinic visits, and vaccination guidance.',
      semanticLabel: 'Animal Bite Center shield and paw sticker',
    ),
    _OnboardingStep(
      asset: 'assets/images/onboarding/care-tools.png',
      title: 'Keep your care in one place',
      description:
          'Follow appointments, vaccination schedules, reminders, and your digital patient card.',
      semanticLabel: 'Mobile vaccination and clinic tools sticker',
    ),
    _OnboardingStep(
      asset: 'assets/images/onboarding/family-profile.png',
      title: 'Set up your patient profiles',
      description:
          'Create your own profile and add a child or dependent so you can book care for the right person.',
      semanticLabel: 'Parent and child patient profile sticker',
    ),
    _OnboardingStep(
      asset: 'assets/images/onboarding/book-appointment.png',
      title: 'Book the visit you need',
      description:
          'Choose a date for vaccination or consultation. We will keep follow-up visits organized for you.',
      semanticLabel: 'Vaccination and consultation calendar sticker',
    ),
  ];

  final PageController _pageController = PageController();
  int _selectedIndex = 0;

  bool get _isLastStep => _selectedIndex == _steps.length - 1;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _openLogin() {
    Navigator.of(context).pushNamed(AppRoutes.login);
  }

  Future<void> _next() async {
    if (_isLastStep) {
      _openLogin();
      return;
    }
    await _pageController.nextPage(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBFDFC),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(22, 20, 22, 22),
              child: Column(
                children: [
                  const Column(
                    children: [
                      ClinicBrand(showMark: false),
                      SizedBox(height: 3),
                      Text(
                        'TAGOLOAN, MISAMIS ORIENTAL',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: AppColors.gray500,
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Expanded(
                    child: PageView.builder(
                      controller: _pageController,
                      itemCount: _steps.length,
                      onPageChanged: (index) =>
                          setState(() => _selectedIndex = index),
                      itemBuilder: (context, index) =>
                          _OnboardingPage(step: _steps[index]),
                    ),
                  ),
                  const SizedBox(height: 12),
                  _ProgressDots(
                    count: _steps.length,
                    selectedIndex: _selectedIndex,
                  ),
                  const SizedBox(height: 20),
                  PrimaryActionButton(
                    label: _isLastStep ? 'GET STARTED' : 'NEXT',
                    onPressed: _next,
                  ),
                  const SizedBox(height: 4),
                  TextButton(
                    onPressed: _openLogin,
                    child: const Text('SKIP'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _OnboardingPage extends StatelessWidget {
  const _OnboardingPage({required this.step});

  final _OnboardingStep step;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxHeight < 490;
        final imageSize = compact ? 210.0 : 270.0;
        return Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Expanded(
              child: Center(
                child: Image.asset(
                  step.asset,
                  width: imageSize,
                  height: imageSize,
                  fit: BoxFit.contain,
                  cacheWidth: 720,
                  filterQuality: FilterQuality.medium,
                  semanticLabel: step.semanticLabel,
                ),
              ),
            ),
            SizedBox(height: compact ? 8 : 18),
            Text(
              step.title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.gray900,
                fontSize: 22,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 9),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 350),
              child: Text(
                step.description,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.gray500,
                  fontSize: 13,
                  height: 1.45,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _ProgressDots extends StatelessWidget {
  const _ProgressDots({required this.count, required this.selectedIndex});

  final int count;
  final int selectedIndex;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(
        count,
        (index) => AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          width: index == selectedIndex ? 24 : 8,
          height: 8,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            color: index == selectedIndex
                ? AppColors.primary
                : const Color(0xFFD8E1DE),
            borderRadius: BorderRadius.circular(4),
          ),
        ),
      ),
    );
  }
}

class _OnboardingStep {
  const _OnboardingStep({
    required this.asset,
    required this.title,
    required this.description,
    required this.semanticLabel,
  });

  final String asset;
  final String title;
  final String description;
  final String semanticLabel;
}
