import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../models/patient_account_profile.dart';
import '../models/clinic_faq.dart';
import '../services/faqs_repository.dart';
import '../services/api.dart';
import '../services/walkthrough_service.dart';
import '../widgets/learn_more_section.dart';
import '../widgets/menu/campaign_banner.dart';
import '../widgets/menu/announcement_carousel.dart';
import '../widgets/menu/guidelines_section.dart';
import '../widgets/menu/information_panels.dart';
import '../widgets/menu/menu_navigation.dart';
import '../widgets/menu/patient_action_button.dart';
import '../widgets/menu/quick_actions_section.dart';
import '../widgets/menu/schedule_section.dart';
import '../widgets/menu/search_header.dart';
import '../widgets/re_exposure_protocol_card.dart';
import '../widgets/vaccination/digital_vaccination_card.dart';
import '../widgets/walkthrough/app_walkthrough_sheet.dart';
import '../widgets/walkthrough/faq_sheet.dart';

class MenuView extends StatefulWidget {
  const MenuView({super.key, this.hasCompletedPEP});

  /// Optional override for testing or navigation with pre-computed PEP status.
  final bool? hasCompletedPEP;

  @override
  State<MenuView> createState() => _MenuViewState();
}

class _MenuViewState extends State<MenuView> {
  int _selectedIndex = 0;
  int _resourcesRefreshTrigger = 0;
  String? _userName;
  bool _hasCompletedPEP = false;

  final GlobalKey _guideButtonKey = GlobalKey();
  final _heroKey = GlobalKey<AnnouncementCarouselState>();
  final GlobalKey _scheduleKey = GlobalKey();
  final GlobalKey _quickActionsKey = GlobalKey();
  final GlobalKey _qrActionKey = GlobalKey();
  final GlobalKey _bookTabKey = GlobalKey();

  Map<int, GlobalKey> get _walkthroughTargets => {
    0: _guideButtonKey,
    1: _scheduleKey,
    2: _quickActionsKey,
    3: _qrActionKey,
    4: _bookTabKey,
  };

  bool _routeWalkthroughTriggered = false;

  @override
  void initState() {
    super.initState();
    if (widget.hasCompletedPEP != null) {
      _hasCompletedPEP = widget.hasCompletedPEP!;
    }
    _loadUser();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkAndShowWalkthrough();
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_routeWalkthroughTriggered) {
      _routeWalkthroughTriggered = true;
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args == 'walkthrough') {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _startWalkthrough();
        });
      }
    }
  }

  Future<void> _startWalkthrough() async {
    if (!mounted) return;
    _heroKey.currentState?.showWelcome();
    await WidgetsBinding.instance.endOfFrame;
    if (!mounted) return;
    await showAppWalkthrough(
      context,
      targetKeys: _walkthroughTargets,
      steps: kHomeWalkthroughSteps,
    );
  }

  Future<void> _openFaqs([String? initialQuery]) async {
    if (!mounted) return;
    await showFaqBottomSheet(
      context,
      onStartWalkthrough: () => showGuideMenuChooser(context),
      initialSearchQuery: initialQuery,
    );
  }

  Future<void> _checkAndShowWalkthrough() async {
    final shouldShow = await WalkthroughService.shouldShowWalkthrough();
    if (!shouldShow || !mounted) return;
    await _startWalkthrough();
  }

  Future<void> _refreshHome() async {
    if (mounted) {
      setState(() {
        _resourcesRefreshTrigger++;
      });
    }
    await _loadUser();
  }

  Future<void> _loadUser() async {
    try {
      final account = await api.account() as PatientAccountProfile;
      if (mounted) {
        final selfProfile = account.patients
            .where((p) => p.relationship.toLowerCase() == 'self')
            .firstOrNull;

        final resolvedName =
            selfProfile != null && selfProfile.name.trim().isNotEmpty
            ? selfProfile.name.trim()
            : account.name.trim();

        final hasCompleted = account.patients.any((p) => p.hasCompletedPrimary);

        setState(() {
          if (resolvedName.isNotEmpty) {
            _userName = resolvedName;
          }
          if (widget.hasCompletedPEP == null) {
            _hasCompletedPEP = hasCompleted;
          }
        });
      }
    } catch (_) {
      // Keep default fallback
    }
  }

  void _openPatientCard() {
    showDigitalVaccinationCard(context);
  }

  Future<void> _openSearch() async {
    final route = await showSearch<String?>(
      context: context,
      delegate: _HomeSearchDelegate(),
    );
    if (route == null || !mounted) return;
    if (route == '__walkthrough__') {
      await _startWalkthrough();
      return;
    }
    if (route.startsWith('__faq__')) {
      final query = route.substring('__faq__'.length);
      await _openFaqs(query.isEmpty ? null : query);
      return;
    }
    Navigator.of(context).pushNamed(route);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F5),
      body: SafeArea(
        bottom: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Column(
              children: [
                MenuSearchHeader(
                  userName: _userName,
                  onSearchPressed: _openSearch,
                  onNotificationsPressed: () =>
                      Navigator.of(context).pushNamed(AppRoutes.notifications),
                ),
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _refreshHome,
                    color: AppColors.primary,
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          AnnouncementCarousel(
                            key: _heroKey,
                            refreshTrigger: _resourcesRefreshTrigger,
                            welcome: CampaignBanner(
                              walkthroughButtonKey: _guideButtonKey,
                              onStartWalkthrough: _startWalkthrough,
                              onOpenFaq: _openFaqs,
                            ),
                          ),
                          const SizedBox(height: 20),
                          KeyedSubtree(
                            key: _scheduleKey,
                            child: ScheduleSection(
                              onOpenAppointments: () => Navigator.of(
                                context,
                              ).pushNamed(AppRoutes.appointments),
                            ),
                          ),
                          if (_hasCompletedPEP) ...[
                            const SizedBox(height: 12),
                            const ReExposureProtocolCard(),
                          ],
                          const SizedBox(height: 20),
                          KeyedSubtree(
                            key: _quickActionsKey,
                            child: QuickActionsSection(
                              onCalendar: () => Navigator.of(
                                context,
                              ).pushNamed(AppRoutes.calendar),
                              onProfile: () async {
                                await Navigator.of(
                                  context,
                                ).pushNamed(AppRoutes.settings);
                                if (mounted) _refreshHome();
                              },
                            ),
                          ),
                          const SizedBox(height: 20),
                          const GuidelinesSection(),
                          LearnMoreSection(
                            refreshTrigger: _resourcesRefreshTrigger,
                          ),
                          const SizedBox(height: 20),
                          const InformationPanels(),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: MenuNavigation(
        bookTabKey: _bookTabKey,
        selectedIndex: _selectedIndex,
        onSelected: (index) {
          final route = switch (index) {
            1 => AppRoutes.booking,
            2 => AppRoutes.history,
            3 => AppRoutes.settings,
            _ => null,
          };
          if (route != null) {
            Navigator.of(context).pushReplacementNamed(route);
            return;
          }
          setState(() => _selectedIndex = index);
        },
      ),
      floatingActionButton: KeyedSubtree(
        key: _qrActionKey,
        child: PatientActionButton(onPressed: _openPatientCard),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }
}

class _HomeSearchDelegate extends SearchDelegate<String?> {
  final Future<List<FaqItemData>> _faqs = FaqsRepository.instance.fetchFaqs();
  static const _items = [
    _HomeSearchItem(
      label: 'App guide walkthrough (5-step tour)',
      route: '__walkthrough__',
      icon: Icons.explore_outlined,
    ),
    _HomeSearchItem(
      label: 'Frequently Asked Questions (FAQs)',
      route: '__faq__',
      icon: Icons.help_outline_rounded,
    ),
    _HomeSearchItem(
      label: 'Schedule calendar by profile',
      route: AppRoutes.calendar,
      icon: Icons.calendar_month_rounded,
    ),
    _HomeSearchItem(
      label: 'Book an appointment',
      route: AppRoutes.booking,
      icon: Icons.edit_calendar_rounded,
    ),
    _HomeSearchItem(
      label: 'Booster guidance & re-exposure protocol',
      route: AppRoutes.boosterGuidance,
      icon: Icons.shield_outlined,
    ),
    _HomeSearchItem(
      label: 'Appointment list',
      route: AppRoutes.appointments,
      icon: Icons.event_note_outlined,
    ),
    _HomeSearchItem(
      label: 'Patient history',
      route: AppRoutes.history,
      icon: Icons.history_rounded,
    ),
    _HomeSearchItem(
      label: 'Notifications',
      route: AppRoutes.notifications,
      icon: Icons.notifications_none_rounded,
    ),
    _HomeSearchItem(
      label: 'Patient profiles and settings',
      route: AppRoutes.settings,
      icon: Icons.manage_accounts_outlined,
    ),
  ];

  @override
  String get searchFieldLabel => 'Search services, schedules, or FAQs';

  @override
  List<Widget> buildActions(BuildContext context) {
    return [
      if (query.isNotEmpty)
        IconButton(
          tooltip: 'Clear search',
          onPressed: () => query = '',
          icon: const Icon(Icons.close_rounded),
        ),
    ];
  }

  @override
  Widget buildLeading(BuildContext context) {
    return IconButton(
      tooltip: 'Close search',
      onPressed: () => close(context, null),
      icon: const Icon(Icons.arrow_back_rounded),
    );
  }

  @override
  Widget buildResults(BuildContext context) => _buildMatches(context);

  @override
  Widget buildSuggestions(BuildContext context) => _buildMatches(context);

  Widget _buildMatches(BuildContext context) {
    return FutureBuilder<List<FaqItemData>>(
      future: _faqs,
      builder: (context, snapshot) => Column(
        children: [
          if (snapshot.connectionState != ConnectionState.done)
            const LinearProgressIndicator(),
          if (snapshot.hasError)
            const Padding(
              padding: EdgeInsets.all(12),
              child: Text(
                'Unable to load clinic FAQs. Close and reopen search to retry.',
              ),
            ),
          Expanded(child: _buildLoadedMatches(context, snapshot.data ?? [])),
        ],
      ),
    );
  }

  Widget _buildLoadedMatches(BuildContext context, List<FaqItemData> faqs) {
    final normalized = query.trim().toLowerCase();
    final serviceMatches = normalized.isEmpty
        ? _items
        : _items
              .where((item) => item.label.toLowerCase().contains(normalized))
              .toList();

    final faqMatches = normalized.isEmpty
        ? faqs.take(4).toList()
        : faqs.where((faq) {
            return faq.question.toLowerCase().contains(normalized) ||
                faq.answer.toLowerCase().contains(normalized) ||
                faq.category.toLowerCase().contains(normalized);
          }).toList();

    if (serviceMatches.isEmpty && faqMatches.isEmpty) {
      return const Center(
        child: Text(
          'No matching service or FAQ found.',
          style: TextStyle(color: AppColors.gray600),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (serviceMatches.isNotEmpty) ...[
          const Padding(
            padding: EdgeInsets.only(left: 2, bottom: 8),
            child: Text(
              'SERVICES & NAVIGATION',
              style: TextStyle(
                color: Color(0xFF9CA3AF),
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
              ),
            ),
          ),
          for (var i = 0; i < serviceMatches.length; i++) ...[
            Material(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(10),
              child: ListTile(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                  side: const BorderSide(color: AppColors.border),
                ),
                leading: Icon(serviceMatches[i].icon, color: AppColors.primary),
                title: Text(
                  serviceMatches[i].label,
                  style: const TextStyle(
                    color: AppColors.gray900,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                trailing: const Icon(
                  Icons.chevron_right_rounded,
                  color: AppColors.gray500,
                ),
                onTap: () => close(context, serviceMatches[i].route),
              ),
            ),
            if (i < serviceMatches.length - 1) const SizedBox(height: 8),
          ],
          const SizedBox(height: 18),
        ],
        if (faqMatches.isNotEmpty) ...[
          const Padding(
            padding: EdgeInsets.only(left: 2, bottom: 8),
            child: Text(
              'FREQUENTLY ASKED QUESTIONS',
              style: TextStyle(
                color: Color(0xFF9CA3AF),
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
              ),
            ),
          ),
          for (var i = 0; i < faqMatches.length; i++) ...[
            Material(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(10),
              child: ExpansionTile(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                  side: const BorderSide(color: AppColors.border),
                ),
                collapsedShape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                  side: const BorderSide(color: AppColors.border),
                ),
                tilePadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 2,
                ),
                childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                leading: const Icon(
                  Icons.quiz_outlined,
                  size: 19,
                  color: AppColors.primary,
                ),
                title: Text(
                  faqMatches[i].question,
                  style: const TextStyle(
                    color: AppColors.gray900,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      faqMatches[i].answer,
                      style: const TextStyle(
                        color: AppColors.gray600,
                        fontSize: 12,
                        height: 1.45,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (i < faqMatches.length - 1) const SizedBox(height: 8),
          ],
        ],
      ],
    );
  }
}

class _HomeSearchItem {
  const _HomeSearchItem({
    required this.label,
    required this.route,
    required this.icon,
  });

  final String label;
  final String route;
  final IconData icon;
}
