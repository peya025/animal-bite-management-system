import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../app/app_theme.dart';

class FaqItemData {
  const FaqItemData({
    required this.category,
    required this.question,
    required this.answer,
  });

  final String category;
  final String question;
  final String answer;
}

const List<FaqItemData> kClinicFaqs = [
  FaqItemData(
    category: 'FIRST AID',
    question: 'What should I do immediately after an animal bite or scratch?',
    answer:
        'Wash the wound immediately and thoroughly under running water with soap for at least 15 minutes, then apply povidone-iodine or 70% alcohol. Do NOT apply garlic, vinegar, toothpaste, or cover the wound tightly.',
  ),
  FaqItemData(
    category: 'PEP SCHEDULE',
    question: 'What is the standard rabies vaccination (PEP) schedule?',
    answer:
        'Under the DOH 2-site intradermal (ID) regimen, primary Post-Exposure Prophylaxis consists of 3 clinic visits: Day 0 (first dose), Day 3, and Day 7. Completing all 3 doses on time is critical for full protection.',
  ),
  FaqItemData(
    category: 'MISSED DOSE',
    question: 'What happens if I miss my scheduled Day 3 or Day 7 dose?',
    answer:
        'Visit the clinic as soon as possible. Depending on how many days have elapsed and how many doses you already received, the clinic physician will either resume and shift your remaining schedule or restart the series.',
  ),
  FaqItemData(
    category: 'BOOSTER / RE-EXPOSURE',
    question: 'Do I need the full 3-dose series if I was already vaccinated before?',
    answer:
        'No. If you have a verified completed 3-dose primary PEP series on record, a new bite exposure only requires 2 booster doses (Day 0 and Day 3) without Rabies Immunoglobulin (RIG).',
  ),
  FaqItemData(
    category: 'ANIMAL OBSERVATION',
    question: 'Why do I need to observe the biting dog or cat for 14 days?',
    answer:
        'If a domestic dog or cat remains healthy and alive after 14 days of observation from the date of the bite, it was not shedding rabies virus in its saliva at the time of exposure. If the animal becomes sick, dies, or goes missing within 14 days, inform the clinic immediately.',
  ),
  FaqItemData(
    category: 'DIGITAL CARD & COVERAGE',
    question: 'How do I access my Digital Vaccination Card and PhilHealth coverage?',
    answer:
        'Once your patient profile is verified at the clinic, tap the center QR button on the bottom navigation bar to view your official Digital Vaccination Card. You can flip the card to inspect batch numbers or swipe left to view past vaccination history.',
  ),
];

Future<void> showFaqBottomSheet(
  BuildContext context, {
  VoidCallback? onStartWalkthrough,
  String? initialSearchQuery,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
      ),
      child: FaqBottomSheet(
        onStartWalkthrough: onStartWalkthrough,
        initialSearchQuery: initialSearchQuery,
      ),
    ),
  );
}

class FaqBottomSheet extends StatefulWidget {
  const FaqBottomSheet({
    super.key,
    this.onStartWalkthrough,
    this.initialSearchQuery,
  });

  final VoidCallback? onStartWalkthrough;
  final String? initialSearchQuery;

  @override
  State<FaqBottomSheet> createState() => _FaqBottomSheetState();
}

class _FaqBottomSheetState extends State<FaqBottomSheet> {
  late final TextEditingController _searchController;
  int? _expandedIndex = 0;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(
      text: widget.initialSearchQuery ?? '',
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<FaqItemData> get _filteredFaqs {
    final q = _searchController.text.trim().toLowerCase();
    if (q.isEmpty) return kClinicFaqs;
    return kClinicFaqs.where((item) {
      return item.question.toLowerCase().contains(q) ||
          item.answer.toLowerCase().contains(q) ||
          item.category.toLowerCase().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final faqs = _filteredFaqs;

    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFFF4F6F5),
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 12),
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFD1D5DB),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 14, 14, 10),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE1F5EE),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      alignment: Alignment.center,
                      child: const Icon(
                        LucideIcons.helpCircle,
                        color: AppColors.primary,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Frequently Asked Questions',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF111827),
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Bite first aid, PEP schedules, boosters & app guide',
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(LucideIcons.x, size: 18),
                    ),
                  ],
                ),
              ),

              // Search bar + Walkthrough shortcut banner
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: Column(
                  children: [
                    TextField(
                      controller: _searchController,
                      onChanged: (_) => setState(() => _expandedIndex = 0),
                      decoration: InputDecoration(
                        hintText: 'Search questions (e.g. missed dose, booster)...',
                        prefixIcon: const Icon(
                          LucideIcons.search,
                          size: 17,
                          color: Color(0xFF6B7280),
                        ),
                        suffixIcon: _searchController.text.isNotEmpty
                            ? IconButton(
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() {});
                                },
                                icon: const Icon(LucideIcons.x, size: 16),
                              )
                            : null,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 11,
                        ),
                      ),
                    ),
                    if (widget.onStartWalkthrough != null) ...[
                      const SizedBox(height: 10),
                      Material(
                        color: const Color(0xFFE3F5EE),
                        borderRadius: BorderRadius.circular(12),
                        child: InkWell(
                          onTap: () {
                            Navigator.of(context).pop();
                            widget.onStartWalkthrough?.call();
                          },
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 10,
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  LucideIcons.compass,
                                  size: 17,
                                  color: Color(0xFF085041),
                                ),
                                const SizedBox(width: 10),
                                const Expanded(
                                  child: Text(
                                    'New to ABTCare? Launch the 5-step interactive Guide Walkthrough',
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF085041),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 9,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary,
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                  child: const Text(
                                    'Start Tour',
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Expandable FAQ List
              Flexible(
                child: faqs.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.all(32),
                        child: Center(
                          child: Text(
                            'No matching questions found.',
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ),
                      )
                    : ListView.separated(
                        shrinkWrap: true,
                        padding: const EdgeInsets.fromLTRB(18, 2, 18, 22),
                        itemCount: faqs.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final item = faqs[index];
                          final isExpanded = _expandedIndex == index;
                          return Material(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            child: InkWell(
                              onTap: () {
                                setState(() {
                                  _expandedIndex = isExpanded ? null : index;
                                });
                              },
                              borderRadius: BorderRadius.circular(14),
                              child: Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                    color: isExpanded
                                        ? const Color(0xFF1D9E75)
                                        : const Color(0xFFE5E7EB),
                                    width: isExpanded ? 1 : 0.6,
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                  horizontal: 7,
                                                  vertical: 2,
                                                ),
                                                decoration: BoxDecoration(
                                                  color:
                                                      const Color(0xFFE1F5EE),
                                                  borderRadius:
                                                      BorderRadius.circular(5),
                                                ),
                                                child: Text(
                                                  item.category,
                                                  style: const TextStyle(
                                                    fontSize: 9,
                                                    fontWeight: FontWeight.w800,
                                                    color: Color(0xFF085041),
                                                    letterSpacing: 0.4,
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(height: 6),
                                              Text(
                                                item.question,
                                                style: const TextStyle(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.w700,
                                                  color: Color(0xFF111827),
                                                  height: 1.3,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Icon(
                                          isExpanded
                                              ? LucideIcons.chevronUp
                                              : LucideIcons.chevronDown,
                                          size: 17,
                                          color: const Color(0xFF6B7280),
                                        ),
                                      ],
                                    ),
                                    if (isExpanded) ...[
                                      const SizedBox(height: 10),
                                      const Divider(
                                        height: 1,
                                        color: Color(0xFFF3F4F6),
                                      ),
                                      const SizedBox(height: 10),
                                      Text(
                                        item.answer,
                                        style: const TextStyle(
                                          fontSize: 12.5,
                                          color: Color(0xFF4B5563),
                                          height: 1.45,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
