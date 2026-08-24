import 'package:flutter/material.dart';

class GuidelinesSection extends StatelessWidget {
  const GuidelinesSection({super.key});

  // Exact matching teal color from illustration
  static const Color guideTealBg = Color(0xFF52B6B4);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'BITE CARE GUIDE',
          style: TextStyle(
            color: Color(0xFF9CA3AF),
            fontSize: 12,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 10),
        const IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: _GuideCard(
                  imagePath: 'assets/images/guide/guide_wash.png',
                  title: 'Wash',
                  description: '15 mins under running water',
                ),
              ),
              SizedBox(width: 10),
              Expanded(
                child: _GuideCard(
                  imagePath: 'assets/images/guide/guide_consult.png',
                  title: 'Consult',
                  description: 'Visit clinic immediately',
                ),
              ),
              SizedBox(width: 10),
              Expanded(
                child: _GuideCard(
                  imagePath: 'assets/images/guide/guide_vaccinate.png',
                  title: 'Vaccinate',
                  description: 'Complete rabies vaccine series',
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
  });

  final String imagePath;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    const cardRadius = BorderRadius.all(Radius.circular(16));

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: GuidelinesSection.guideTealBg,
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
          // 1. Prominent Aspect Ratio Illustration Box
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 6, 4, 0),
            child: AspectRatio(
              aspectRatio: 1.0,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.asset(
                  imagePath,
                  fit: BoxFit.cover,
                  alignment: Alignment.center,
                  errorBuilder: (context, error, stackTrace) => Container(
                    color: GuidelinesSection.guideTealBg,
                    child: const Icon(Icons.broken_image_rounded, color: Colors.white70),
                  ),
                ),
              ),
            ),
          ),

          // 2. Separation between Illustration & Text
          const SizedBox(height: 6),

          // 3. Text Zone with uniform padding and flex expansion
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.2,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    description,
                    style: const TextStyle(
                      color: Color(0xFFE6F7F6),
                      fontSize: 9.5,
                      fontWeight: FontWeight.w500,
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
    );
  }
}
