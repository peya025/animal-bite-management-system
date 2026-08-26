import 'package:flutter/material.dart';
import '../../app/app_theme.dart';
import '../../l10n/app_localizations.dart';

class GuidelinesSection extends StatelessWidget {
  const GuidelinesSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.tr('guide_section_title'),
          style: const TextStyle(
            color: Color(0xFF9CA3AF),
            fontSize: 12,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 8),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: _GuideCard(
                  imagePath: 'assets/images/guide/guide_wash.png',
                  title: context.tr('guide_wash_title'),
                  description: context.tr('guide_wash_desc'),
                  stepNumber: '1',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _GuideCard(
                  imagePath: 'assets/images/guide/guide_consult.png',
                  title: context.tr('guide_consult_title'),
                  description: context.tr('guide_consult_desc'),
                  stepNumber: '2',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _GuideCard(
                  imagePath: 'assets/images/guide/guide_vaccinate.png',
                  title: context.tr('guide_vaccinate_title'),
                  description: context.tr('guide_vaccinate_desc'),
                  stepNumber: '3',
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _GuideCard extends StatelessWidget {
  const _GuideCard({
    required this.imagePath,
    required this.title,
    required this.description,
    required this.stepNumber,
  });

  final String imagePath;
  final String title;
  final String description;
  final String stepNumber;

  @override
  Widget build(BuildContext context) {
    const cardRadius = BorderRadius.all(Radius.circular(16));

    return Semantics(
      label: 'Step $stepNumber: $title. $description',
      container: true,
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: AppColors.guideTeal,
          borderRadius: cardRadius,
          boxShadow: const [
            BoxShadow(
              color: Color(0x14085041),
              blurRadius: 8,
              offset: Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Prominent Aspect Ratio Illustration Box with isolated ClipRRect
            Padding(
              padding: const EdgeInsets.fromLTRB(6, 6, 6, 0),
              child: AspectRatio(
                aspectRatio: 1.0,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.asset(
                    imagePath,
                    fit: BoxFit.cover,
                    alignment: Alignment.center,
                    semanticLabel: '$title illustration',
                    errorBuilder: (context, error, stackTrace) => Container(
                      color: AppColors.guideTeal,
                      child: const Icon(
                        Icons.broken_image_rounded,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
            ),

            // 2. Vertical separation
            const SizedBox(height: 6),

            // 3. Text Zone with crisp white typography
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.2,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      description,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.92),
                        fontSize: 11.0,
                        fontWeight: FontWeight.w600,
                        height: 1.25,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
