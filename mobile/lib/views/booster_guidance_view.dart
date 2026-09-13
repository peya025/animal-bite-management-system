import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../app/app_routes.dart';
import '../models/booking_draft.dart';
import '../widgets/vaccination/digital_vaccination_card.dart';

class BoosterGuidanceView extends StatelessWidget {
  const BoosterGuidanceView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F5),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: Color(0xFF1F2937), size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Booster Protocol Guidance',
          style: TextStyle(
            color: Color(0xFF111827),
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: Color(0xFFE5E7EB)),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 540),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
              children: [
                // Top Hero Notice Banner
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF065F46), Color(0xFF047857)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x1A059669),
                        blurRadius: 10,
                        offset: Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(
                              LucideIcons.shieldAlert,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'DOH RE-EXPOSURE PROTOCOL',
                                  style: TextStyle(
                                    color: Color(0xFF6EE7B7),
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                                Text(
                                  'Bitten Again After Prior Vaccines?',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Under DOH National Rabies Prevention & Control Program (NRPCP) clinical guidelines, patients who previously completed a full primary anti-rabies vaccination course require only a simplified 2-Dose Booster Regimen.',
                        style: TextStyle(
                          color: Color(0xFFE6F4EA),
                          fontSize: 12.5,
                          height: 1.45,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                const Text(
                  'CLINICAL PROTOCOL STEPS',
                  style: TextStyle(
                    color: Color(0xFF6B7280),
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 10),

                // Step 1: Immediate Wound Washing
                const _GuidanceStepCard(
                  stepNumber: '1',
                  icon: LucideIcons.droplets,
                  iconColor: Color(0xFF0284C7),
                  iconBg: Color(0xFFE0F2FE),
                  title: 'Immediate Wound Washing (15 Minutes)',
                  subtitle: 'Crucial first-line emergency defense',
                  content:
                      'Wash all bite or scratch wounds vigorously with clean running water and soap for a full 15 minutes. Apply povidone-iodine (Betadine) or 70% alcohol. Do NOT apply garlic, stones, or squeeze the wound.',
                ),
                const SizedBox(height: 12),

                // Step 2: Why Only 2 Doses Are Needed
                const _GuidanceStepCard(
                  stepNumber: '2',
                  icon: LucideIcons.syringe,
                  iconColor: Color(0xFF059669),
                  iconBg: Color(0xFFD1FAE5),
                  title: '2-Dose Booster Regimen (Day 0 & Day 3)',
                  subtitle: 'Rapid anamnestic immune memory response',
                  content:
                      'Because your body already developed rabies antibodies from past vaccination, your memory B-cells rapidly produce protective neutralizing antibodies. You ONLY need two booster doses: Day 0 (consultation day) and Day 3.',
                  tag: 'No Day 7 or Day 28 Required',
                ),
                const SizedBox(height: 12),

                // Step 3: RIG is Withheld
                const _GuidanceStepCard(
                  stepNumber: '3',
                  icon: LucideIcons.shieldCheck,
                  iconColor: Color(0xFFD97706),
                  iconBg: Color(0xFFFEF3C7),
                  title: 'Rabies Immunoglobulin (RIG) Withheld',
                  subtitle: 'Safe, pain-free infiltration exemption',
                  content:
                      'Patients with verified prior vaccination do NOT need Rabies Immunoglobulin (RIG / Equine/Human Serum) infiltration, even for Category III bites, sparing you unnecessary serum injections and costs.',
                  tag: 'RIG Infiltration Exempt',
                ),
                const SizedBox(height: 12),

                // Step 4: 24-Hour Consultation Window
                const _GuidanceStepCard(
                  stepNumber: '4',
                  icon: LucideIcons.clock,
                  iconColor: Color(0xFF7C3AED),
                  iconBg: Color(0xFFEDE9FE),
                  title: 'Consult Within 24 Hours',
                  subtitle: 'Visit Animal Bite Treatment Center promptly',
                  content:
                      'Present to the clinic as soon as possible after re-exposure so the nurse or physician can inspect the wound, verify your digital card records, and administer your Booster Day 0 dose.',
                ),
                const SizedBox(height: 20),

                // Past Vaccination Verification Card
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                  ),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.fileBadge, color: Color(0xFF059669), size: 22),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Verify Your Past Doses',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF111827),
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Check your official digital vaccination card to confirm your completed primary doses.',
                              style: TextStyle(
                                fontSize: 11,
                                color: Color(0xFF6B7280),
                                height: 1.35,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: () => showDigitalVaccinationCard(context),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF059669),
                          side: const BorderSide(color: Color(0xFFA7F3D0)),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('View Card', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // Eligibility note
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFDE68A), width: 0.8),
                  ),
                  child: const Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(LucideIcons.alertTriangle, size: 16, color: Color(0xFFD97706)),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Important Requirement: You must have completed all 3 primary doses (Day 0, Day 3, and Day 7). If any primary dose was missed, booster booking will be blocked and a full consultation is required.',
                          style: TextStyle(
                            color: Color(0xFF92400E),
                            fontSize: 11,
                            height: 1.4,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      bottomSheet: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFE5E7EB))),
        ),
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 540),
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context).pushNamed(
                    AppRoutes.booking,
                    arguments: BookingService.booster,
                  );
                },
                icon: const Icon(LucideIcons.calendarPlus, size: 18),
                label: const Text(
                  'Book 2-Dose Booster Appointment',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _GuidanceStepCard extends StatelessWidget {
  const _GuidanceStepCard({
    required this.stepNumber,
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.title,
    required this.subtitle,
    required this.content,
    this.tag,
  });

  final String stepNumber;
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String title;
  final String subtitle;
  final String content;
  final String? tag;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08000000),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                alignment: Alignment.center,
                child: Icon(icon, color: iconColor, size: 17),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF111827),
                      ),
                    ),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 10.5,
                        color: Colors.grey.shade600,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              if (tag != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: Text(
                    tag!,
                    style: const TextStyle(
                      color: Color(0xFF065F46),
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            content,
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFF374151),
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}
