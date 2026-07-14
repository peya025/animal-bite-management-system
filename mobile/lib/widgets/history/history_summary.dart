import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class HistorySummary extends StatelessWidget {
  const HistorySummary({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primaryDark,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Row(
        children: [
          _SummaryItem(value: '3', label: 'Visits'),
          _Divider(),
          _SummaryItem(value: '2', label: 'Vaccinations'),
          _Divider(),
          _SummaryItem(value: '1', label: 'Active case'),
        ],
      ),
    );
  }
}

class _SummaryItem extends StatelessWidget {
  const _SummaryItem({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(
              color: AppColors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFFCBE9E5), fontSize: 10),
          ),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) {
    return Container(width: 1, height: 36, color: const Color(0x44FFFFFF));
  }
}
