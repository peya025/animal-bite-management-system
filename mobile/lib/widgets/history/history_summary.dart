import 'package:flutter/material.dart';

class ActiveCaseBanner extends StatelessWidget {
  const ActiveCaseBanner({
    super.key,
    required this.caseNumber,
    required this.nextDoseText,
    required this.dueBadgeText,
    required this.onTap,
  });

  final String caseNumber;
  final String nextDoseText;
  final String dueBadgeText;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          decoration: BoxDecoration(
            color: const Color(0xFFE1F5EE),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: const Color(0xFFBBF7D0),
              width: 0.5,
            ),
          ),
          child: Row(
            children: [
              // Pulsing Dot (Outer ring + Inner dot)
              SizedBox(
                width: 12,
                height: 12,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Color(0x331D9E75),
                      ),
                    ),
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Color(0xFF1D9E75),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),

              // Center: Case Title & Next dose subtitle
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '$caseNumber · Active',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF085041),
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      nextDoseText,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF1D9E75),
                        height: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),

              // Right column: Due badge & chevron
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 7,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: const Color(0xFFBBF7D0),
                        width: 0.5,
                      ),
                    ),
                    child: Text(
                      dueBadgeText,
                      style: const TextStyle(
                        fontSize: 10,
                        color: Color(0xFF085041),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Icon(
                    Icons.chevron_right,
                    size: 16,
                    color: Color(0xFF1D9E75),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

