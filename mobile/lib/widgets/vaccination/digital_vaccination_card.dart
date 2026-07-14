import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

Future<void> showDigitalVaccinationCard(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => const DigitalVaccinationCardSheet(),
  );
}

class DigitalVaccinationCardSheet extends StatelessWidget {
  const DigitalVaccinationCardSheet({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        margin: const EdgeInsets.all(12),
        padding: const EdgeInsets.fromLTRB(18, 10, 18, 22),
        decoration: BoxDecoration(
          color: const Color(0xFFF5F8F7),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Center(
          heightFactor: 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 44,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFD1D8D6),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Digital vaccination card',
                            style: TextStyle(
                              color: AppColors.gray900,
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          SizedBox(height: 3),
                          Text(
                            'Present this card during your clinic visit.',
                            style: TextStyle(
                              color: AppColors.gray500,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Close',
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                const _VaccinationCard(),
                const SizedBox(height: 14),
                const Row(
                  children: [
                    Icon(
                      Icons.info_outline_rounded,
                      color: AppColors.gray500,
                      size: 17,
                    ),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Demo card only. Live vaccination records and scannable QR verification will be connected later.',
                        style: TextStyle(
                          color: AppColors.gray500,
                          fontSize: 11,
                          height: 1.35,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _VaccinationCard extends StatelessWidget {
  const _VaccinationCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFDCE5E2)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x17111827),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: AppColors.primaryDark,
            child: const Row(
              children: [
                Icon(Icons.health_and_safety_outlined, color: AppColors.white),
                SizedBox(width: 9),
                Expanded(
                  child: Text(
                    'ANIMAL BITE CENTER',
                    style: TextStyle(
                      color: AppColors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                _VerifiedBadge(),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'JUAN DELA CRUZ',
                        style: TextStyle(
                          color: AppColors.gray900,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Patient ID  P-2026-0042',
                        style: TextStyle(
                          color: AppColors.gray500,
                          fontSize: 11,
                        ),
                      ),
                      SizedBox(height: 18),
                      _CardDetail(
                        label: 'VACCINE',
                        value: 'Purified Vero Cell Rabies Vaccine',
                      ),
                      SizedBox(height: 11),
                      _CardDetail(
                        label: 'DOSE PROGRESS',
                        value: '2 of 4 doses',
                      ),
                      SizedBox(height: 11),
                      _CardDetail(
                        label: 'NEXT SCHEDULE',
                        value: 'March 17, 2026 - 10:00 AM',
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 14),
                const _DemoQrCode(),
              ],
            ),
          ),
          const _DoseProgress(),
        ],
      ),
    );
  }
}

class _VerifiedBadge extends StatelessWidget {
  const _VerifiedBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0x33FFFFFF),
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Row(
        children: [
          Icon(Icons.verified_rounded, color: AppColors.white, size: 13),
          SizedBox(width: 4),
          Text(
            'ACTIVE',
            style: TextStyle(
              color: AppColors.white,
              fontSize: 9,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _CardDetail extends StatelessWidget {
  const _CardDetail({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppColors.gray500,
            fontSize: 9,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            color: AppColors.gray700,
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _DemoQrCode extends StatelessWidget {
  const _DemoQrCode();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 104,
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: AppColors.white,
        border: Border.all(color: const Color(0xFFDCE5E2)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Column(
        children: [
          Icon(Icons.qr_code_2_rounded, color: Colors.black, size: 84),
          SizedBox(height: 4),
          Text(
            'DEMO QR',
            style: TextStyle(
              color: AppColors.gray500,
              fontSize: 8,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _DoseProgress extends StatelessWidget {
  const _DoseProgress();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
      color: const Color(0xFFF2F8F6),
      child: const Row(
        children: [
          _DoseStep(label: 'Day 0', complete: true),
          _DoseLine(complete: true),
          _DoseStep(label: 'Day 3', complete: true),
          _DoseLine(complete: false),
          _DoseStep(label: 'Day 7', complete: false),
          _DoseLine(complete: false),
          _DoseStep(label: 'Day 28', complete: false),
        ],
      ),
    );
  }
}

class _DoseStep extends StatelessWidget {
  const _DoseStep({required this.label, required this.complete});
  final String label;
  final bool complete;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            color: complete ? AppColors.primary : AppColors.white,
            shape: BoxShape.circle,
            border: Border.all(
              color: complete ? AppColors.primary : const Color(0xFFBBC8C5),
            ),
          ),
          child: complete
              ? const Icon(
                  Icons.check_rounded,
                  color: AppColors.white,
                  size: 14,
                )
              : null,
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(color: AppColors.gray500, fontSize: 8),
        ),
      ],
    );
  }
}

class _DoseLine extends StatelessWidget {
  const _DoseLine({required this.complete});
  final bool complete;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.only(bottom: 13),
        color: complete ? AppColors.primary : const Color(0xFFD3DCDA),
      ),
    );
  }
}
