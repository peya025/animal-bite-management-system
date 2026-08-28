import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../app/app_theme.dart';
import '../../services/mobile_api.dart';

class InformationPanels extends StatefulWidget {
  const InformationPanels({super.key});

  @override
  State<InformationPanels> createState() => _InformationPanelsState();
}

class _InformationPanelsState extends State<InformationPanels> {
  Map<String, dynamic>? _summary;

  @override
  void initState() {
    super.initState();
    _loadSummary();
  }

  Future<void> _loadSummary() async {
    try {
      final res = await MobileApi.instance.scheduleSummary();
      if (mounted) {
        setState(() {
          _summary = res;
        });
      }
    } catch (_) {}
  }

  static const _dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  static const _shortDayNames = [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
  ];

  // Helper to format days range e.g. "Tue – Fri • 8:00 AM – 5:00 PM"
  String _formatWorkingDaysSummary() {
    if (_summary == null) return 'Tue – Fri • 8:00 AM – 5:00 PM';
    final openDays = (_summary!['open_days_of_week'] as List?)?.cast<int>() ?? [2, 3, 4, 5];
    if (openDays.isEmpty) return 'Temporary closed for walk-ins';

    // Get time from first open day
    final schedules = _summary!['schedules'];
    String openTime = '8:00 AM';
    String closeTime = '5:00 PM';

    if (schedules is Map && openDays.isNotEmpty) {
      final firstDaySched = schedules[openDays.first.toString()];
      if (firstDaySched is Map) {
        openTime = firstDaySched['open_time_label'] ?? openTime;
        closeTime = firstDaySched['close_time_label'] ?? closeTime;
      }
    } else if (schedules is List && openDays.isNotEmpty) {
      for (var s in schedules) {
        if (s is Map && s['day_of_week'] == openDays.first) {
          openTime = s['open_time_label'] ?? openTime;
          closeTime = s['close_time_label'] ?? closeTime;
          break;
        }
      }
    }

    if (openDays.length == 1) {
      return '${_shortDayNames[openDays.first]} • $openTime – $closeTime';
    }

    // Check if contiguous
    final sorted = List<int>.from(openDays)..sort();
    bool isConsecutive = true;
    for (int i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] - sorted[i] != 1) {
        isConsecutive = false;
        break;
      }
    }

    if (isConsecutive) {
      return '${_shortDayNames[sorted.first]} – ${_shortDayNames[sorted.last]} • $openTime – $closeTime';
    }

    return '${sorted.map((d) => _shortDayNames[d]).join(', ')} • $openTime – $closeTime';
  }

  bool _isCurrentlyOpen() {
    if (_summary == null) return true;
    final now = DateTime.now();
    final dow = now.weekday == 7 ? 0 : now.weekday;
    final openDays = (_summary!['open_days_of_week'] as List?)?.cast<int>() ?? [2, 3, 4, 5];

    final dateKey = "${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
    final exceptions = _summary!['exceptions'];
    if (exceptions is Map && exceptions.containsKey(dateKey)) {
      final exc = exceptions[dateKey];
      if (exc is Map && exc['is_open'] == false) return false;
      if (exc is bool && !exc) return false;
    }

    return openDays.contains(dow);
  }

  void _showOperatingScheduleModal() {
    final openDays = (_summary?['open_days_of_week'] as List?)?.cast<int>() ?? [2, 3, 4, 5];
    final schedules = _summary?['schedules'];
    final urgentPolicy = _summary?['urgent_policy'] as Map<String, dynamic>?;
    final isOpenToday = _isCurrentlyOpen();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 38,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(LucideIcons.calendarClock, color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Clinic Operating Schedule',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF111827)),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                              color: isOpenToday ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            isOpenToday ? 'Open Today' : 'Closed Today',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isOpenToday ? const Color(0xFF047857) : const Color(0xFFB91C1C),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(LucideIcons.x, size: 20, color: Color(0xFF9CA3AF)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Divider(height: 1),
            const SizedBox(height: 12),
            const Text(
              'WEEKLY SCHEDULE',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF6B7280), letterSpacing: 0.5),
            ),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFB),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Column(
                children: List.generate(7, (index) {
                  // Sunday=0, Monday=1, ..., Saturday=6
                  final dayIndex = index; // 0=Sun..6=Sat
                  final isOpen = openDays.contains(dayIndex);
                  
                  String hours = 'Closed';
                  if (isOpen) {
                    if (schedules is Map && schedules.containsKey(dayIndex.toString())) {
                      final s = schedules[dayIndex.toString()];
                      if (s is Map) {
                        hours = '${s['open_time_label'] ?? '8:00 AM'} – ${s['close_time_label'] ?? '5:00 PM'}';
                      }
                    } else {
                      hours = '8:00 AM – 5:00 PM';
                    }
                  }

                  final isToday = (DateTime.now().weekday == 7 ? 0 : DateTime.now().weekday) == dayIndex;

                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isToday ? AppColors.primary.withValues(alpha: 0.08) : Colors.transparent,
                      border: index < 6 ? const Border(bottom: BorderSide(color: Color(0xFFF3F4F6))) : null,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Text(
                              _dayNames[dayIndex],
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: isToday ? FontWeight.w700 : FontWeight.w500,
                                color: isToday ? AppColors.primaryDark : const Color(0xFF1F2937),
                              ),
                            ),
                            if (isToday) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: AppColors.primary,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  'TODAY',
                                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.white),
                                ),
                              ),
                            ],
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isOpen ? const Color(0xFFECFDF5) : const Color(0xFFF3F4F6),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            hours,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isOpen ? const Color(0xFF065F46) : const Color(0xFF9CA3AF),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ),
            ),
            const SizedBox(height: 16),
            if (urgentPolicy != null && (urgentPolicy['instructions']?.toString().isNotEmpty == true || urgentPolicy['facility_name']?.toString().isNotEmpty == true)) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(LucideIcons.alertTriangle, size: 18, color: Color(0xFFD97706)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Emergency & After-Hours Bites',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF92400E)),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            urgentPolicy['instructions']?.toString().isNotEmpty == true
                                ? urgentPolicy['instructions'].toString()
                                : 'For severe bleeding or deep Category III wounds outside clinic hours, proceed immediately to the nearest Emergency Room.',
                            style: const TextStyle(fontSize: 11, color: Color(0xFFB45309), height: 1.3),
                          ),
                          if (urgentPolicy['facility_name']?.toString().isNotEmpty == true) ...[
                            const SizedBox(height: 4),
                            Text(
                              'Referral Center: ${urgentPolicy['facility_name']} ${urgentPolicy['facility_contact'] ?? ''}',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF78350F)),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 0,
                ),
                child: const Text('Got it', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showClinicInfoModal() {
    final clinicInfo = _summary?['clinic_info'] as Map<String, dynamic>?;
    final clinicName = clinicInfo?['name'] ?? 'Tagoloan Animal Bite Treatment Center';
    final address = clinicInfo?['address'] ?? 'Poblacion, Tagoloan, Misamis Oriental';
    final phone = clinicInfo?['phone'] ?? '09123456789';
    final email = clinicInfo?['email'] ?? 'info@animalbitecenter.com';
    final dohNo = clinicInfo?['doh_accreditation_no'] ?? '2022-10-037';
    final philhealthNo = clinicInfo?['philhealth_accreditation_no'] ?? 'B10034377';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 38,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0284C7).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(LucideIcons.hospital, color: Color(0xFF0284C7), size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        clinicName,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF111827)),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Accredited Animal Bite Treatment Center',
                        style: TextStyle(fontSize: 11, color: Color(0xFF6B7280)),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(LucideIcons.x, size: 20, color: Color(0xFF9CA3AF)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Divider(height: 1),
            const SizedBox(height: 12),
            _infoItem(LucideIcons.mapPin, 'Location / Address', address),
            const SizedBox(height: 10),
            _infoItem(LucideIcons.phoneCall, 'Official Hotline', phone),
            const SizedBox(height: 10),
            _infoItem(LucideIcons.mail, 'Official Email', email),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: _infoItem(LucideIcons.award, 'DOH Accreditation', dohNo)),
                const SizedBox(width: 8),
                Expanded(child: _infoItem(LucideIcons.shieldCheck, 'PhilHealth ABTC', philhealthNo)),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 0,
                ),
                child: const Text('Close', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoItem(IconData icon, String title, String value) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: const Color(0xFF4B5563)),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: Color(0xFF6B7280))),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final workingDaysText = _formatWorkingDaysSummary();
    final isOpen = _isCurrentlyOpen();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'CLINIC INFORMATION',
              style: TextStyle(
                color: Color(0xFF9CA3AF),
                fontSize: 12,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
              decoration: BoxDecoration(
                color: isOpen ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isOpen ? const Color(0xFFA7F3D0) : const Color(0xFFFECACA)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: isOpen ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    isOpen ? 'Open Today' : 'Closed Today',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: isOpen ? const Color(0xFF047857) : const Color(0xFFB91C1C),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Panel 1: Working Hours & Schedule (Interactive)
            Expanded(
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: _showOperatingScheduleModal,
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    height: 140,
                    padding: const EdgeInsets.all(13),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.grey.shade200, width: 0.5),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(
                                LucideIcons.clock,
                                color: AppColors.primary,
                                size: 18,
                              ),
                            ),
                            const Icon(
                              LucideIcons.chevronRight,
                              color: Color(0xFFD1D5DB),
                              size: 16,
                            ),
                          ],
                        ),
                        const Spacer(),
                        const Text(
                          'Working hours',
                          style: TextStyle(
                            color: Color(0xFF111827),
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          workingDaysText,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Color(0xFF6B7280),
                            fontSize: 11,
                            fontWeight: FontWeight.w400,
                            height: 1.25,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            // Panel 2: Clinic & Hotlines (Interactive)
            Expanded(
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: _showClinicInfoModal,
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    height: 140,
                    padding: const EdgeInsets.all(13),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.grey.shade200, width: 0.5),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Icon(
                              LucideIcons.hospital,
                              color: Color(0xFF0284C7),
                              size: 22,
                            ),
                            Icon(
                              LucideIcons.chevronRight,
                              color: Color(0xFFD1D5DB),
                              size: 16,
                            ),
                          ],
                        ),
                        Spacer(),
                        Text(
                          'Clinic Directory',
                          style: TextStyle(
                            color: Color(0xFF111827),
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        SizedBox(height: 3),
                        Text(
                          'Hotline, address & DOH accreditation details',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: Color(0xFF6B7280),
                            fontSize: 11,
                            fontWeight: FontWeight.w400,
                            height: 1.25,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
