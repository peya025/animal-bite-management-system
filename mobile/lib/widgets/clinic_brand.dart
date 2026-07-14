import 'package:flutter/material.dart';

import '../app/app_theme.dart';

class ClinicBrand extends StatelessWidget {
  const ClinicBrand({super.key, this.markSize = 160});

  final double markSize;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            'ANIMAL BITE CENTER',
            maxLines: 1,
            style: TextStyle(
              color: AppColors.primaryDark,
              fontSize: 27,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        const SizedBox(height: 28),
        Container(
          width: markSize,
          height: markSize,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.white,
            border: Border.all(color: AppColors.primaryDark, width: 5),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Icon(
                Icons.shield_outlined,
                size: markSize * 0.62,
                color: AppColors.primaryDark,
              ),
              Container(
                width: markSize * 0.28,
                height: markSize * 0.28,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.primary,
                ),
                child: Icon(
                  Icons.health_and_safety,
                  size: markSize * 0.18,
                  color: AppColors.white,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
