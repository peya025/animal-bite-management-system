import 'package:flutter/material.dart';

import '../../app/app_theme.dart';

class CampaignBanner extends StatelessWidget {
  const CampaignBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 180,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Stack(
        children: [
          Positioned(
            left: -38,
            top: 0,
            bottom: 0,
            width: 230,
            child: Image.asset(
              'assets/images/anti_rabies_health_worker.png',
              fit: BoxFit.cover,
              alignment: Alignment.centerLeft,
            ),
          ),
          const Positioned(
            top: 10,
            right: 16,
            child: Text(
              'TAGOLOAN, MISAMIS ORIENTAL',
              style: TextStyle(fontSize: 9, color: AppColors.primaryDark),
            ),
          ),
          Positioned(
            left: 178,
            right: 14,
            top: 44,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'MARCH',
                  style: TextStyle(
                    color: AppColors.white,
                    fontSize: 30,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const Text(
                  'Anti-Rabies Month',
                  style: TextStyle(color: AppColors.white, fontSize: 16),
                ),
                const SizedBox(height: 30),
                FilledButton.icon(
                  onPressed: () {},
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.white,
                    foregroundColor: AppColors.gray700,
                    minimumSize: const Size(0, 36),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                  ),
                  iconAlignment: IconAlignment.end,
                  icon: const Icon(Icons.arrow_forward, size: 17),
                  label: const Text(
                    'Patient Workflow',
                    style: TextStyle(fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
