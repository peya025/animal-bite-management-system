import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../app/app_theme.dart';
import '../../models/clinic_faq.dart';
import '../../services/faqs_repository.dart';

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
  List<FaqItemData> _faqs = [];
  bool _loading = true;
  bool _loadFailed = false;

  Future<void> _loadFaqs() async {
    setState(() {
      _loading = true;
      _loadFailed = false;
    });
    try {
      final items = await FaqsRepository.instance.fetchFaqs();
      if (mounted) {
        setState(() {
          _faqs = items;
          _expandedIndex = null;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _loadFailed = true;
          _loading = false;
        });
      }
    }
  }

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(
      text: widget.initialSearchQuery ?? '',
    );
    _loadFaqs();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<FaqItemData> get _filteredFaqs {
    final q = _searchController.text.trim().toLowerCase();
    if (q.isEmpty) return _faqs;
    return _faqs.where((item) {
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
                            'Answers from your clinic',
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Refresh FAQs',
                      onPressed: _loading ? null : _loadFaqs,
                      icon: const Icon(Icons.refresh, size: 20),
                    ),
                    IconButton(
                      tooltip: 'Close FAQs',
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
                        hintText:
                            'Search questions (e.g. missed dose, booster)...',
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

              if (_loading) const LinearProgressIndicator(),
              if (_loadFailed)
                TextButton(
                  onPressed: _loadFaqs,
                  child: const Text('Unable to load FAQs. Tap to retry.'),
                ),
              // Expandable FAQ List
              Flexible(
                child: faqs.isEmpty
                    ? Padding(
                        padding: const EdgeInsets.all(32),
                        child: Center(
                          child: Text(
                            _loading
                                ? 'Loading FAQs...'
                                : _loadFailed
                                ? 'Please retry to load clinic FAQs.'
                                : _faqs.isEmpty
                                ? 'No FAQs have been published yet.'
                                : 'No matching questions found.',
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
                                              if (item.category.isNotEmpty)
                                                Container(
                                                  padding:
                                                      const EdgeInsets.symmetric(
                                                        horizontal: 7,
                                                        vertical: 2,
                                                      ),
                                                  decoration: BoxDecoration(
                                                    color: const Color(
                                                      0xFFE1F5EE,
                                                    ),
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          5,
                                                        ),
                                                  ),
                                                  child: Text(
                                                    item.category,
                                                    style: const TextStyle(
                                                      fontSize: 9,
                                                      fontWeight:
                                                          FontWeight.w800,
                                                      color: Color(0xFF085041),
                                                      letterSpacing: 0.4,
                                                    ),
                                                  ),
                                                ),
                                              if (item.category.isNotEmpty)
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
