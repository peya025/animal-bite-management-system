import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../services/api.dart';
import '../common/app_toast.dart';
import 'history_filters.dart';

enum HistoryStatus { completed, scheduled, missed }

class HistoryRecord {
  const HistoryRecord({
    required this.type,
    required this.title,
    required this.dateTime,
    required this.status,
    required this.icon,
    this.caseNumber,
    this.completedDoses,
    this.totalDoses = 4,
    this.doseLabel,
    this.patientId,
    this.patientName,
    this.relationship,
    this.appointmentId,
    this.scheduledDate,
    this.timeSlot,
    this.notes,
    this.intake,
    this.sortTimestamp,
    this.createdTimestamp,
  });

  final HistoryFilter type;
  final String title;
  final String dateTime;
  final HistoryStatus status;
  final IconData icon;
  final String? caseNumber;
  final int? completedDoses;
  final int totalDoses;
  final String? doseLabel;
  final int? patientId;
  final String? patientName;
  final String? relationship;
  final int? appointmentId;
  final String? scheduledDate;
  final String? timeSlot;
  final String? notes;
  final Map<String, dynamic>? intake;
  final int? sortTimestamp;
  final int? createdTimestamp;

  factory HistoryRecord.fromJson(Map<String, dynamic> json) {
    final typeStr = json['type'] as String? ?? 'appointments';
    final filterType = typeStr == 'vaccinations'
        ? HistoryFilter.vaccinations
        : HistoryFilter.appointments;

    final statusStr = json['status'] as String? ?? 'scheduled';
    final status = switch (statusStr) {
      'completed' => HistoryStatus.completed,
      'missed' => HistoryStatus.missed,
      _ => HistoryStatus.scheduled,
    };

    final icon = filterType == HistoryFilter.vaccinations
        ? (status == HistoryStatus.completed
            ? LucideIcons.syringe
            : LucideIcons.calendar)
        : (status == HistoryStatus.completed
            ? LucideIcons.contact
            : LucideIcons.calendarClock);

    int? apptId;
    if (json['appointment_id'] != null) {
      apptId = json['appointment_id'] is int
          ? json['appointment_id'] as int
          : int.tryParse(json['appointment_id'].toString());
    } else if (json['id'] != null && json['id'].toString().startsWith('app-')) {
      apptId = int.tryParse(json['id'].toString().replaceFirst('app-', ''));
    }

    final intakeRaw = json['intake'] as Map<String, dynamic>?;

    return HistoryRecord(
      type: filterType,
      title: json['title'] as String? ?? 'Record',
      dateTime: json['date_time'] as String? ?? '',
      status: status,
      icon: icon,
      caseNumber: json['case_number'] as String?,
      completedDoses: json['completed_doses'] as int?,
      totalDoses: json['total_doses'] as int? ?? 4,
      doseLabel: json['dose_label'] as String?,
      patientId: json['patient_id'] as int?,
      patientName: json['patient_name'] as String?,
      relationship: json['relationship'] as String? ?? 'self',
      appointmentId: apptId,
      scheduledDate: json['scheduled_date'] as String?,
      timeSlot: json['time_slot'] as String?,
      notes: json['notes'] as String?,
      intake: intakeRaw,
      sortTimestamp: json['sort_timestamp'] as int?,
      createdTimestamp: json['created_timestamp'] as int?,
    );
  }
}

class HistoryTimelineItem extends StatefulWidget {
  const HistoryTimelineItem({
    super.key,
    required this.record,
    required this.isLast,
    this.onTap,
    this.onIntakeUpdated,
  });

  final HistoryRecord record;
  final bool isLast;
  final VoidCallback? onTap;
  final VoidCallback? onIntakeUpdated;

  @override
  State<HistoryTimelineItem> createState() => _HistoryTimelineItemState();
}

class _HistoryTimelineItemState extends State<HistoryTimelineItem> {
  bool _isExpanded = false;

  HistoryRecord get record => widget.record;

  @override
  Widget build(BuildContext context) {
    final iconColors = switch (record.status) {
      HistoryStatus.completed => (
        bg: const Color(0xFFE1F5EE),
        icon: const Color(0xFF1D9E75),
      ),
      HistoryStatus.scheduled => (
        bg: const Color(0xFFEFF6FF),
        icon: const Color(0xFF3B82F6),
      ),
      HistoryStatus.missed => (
        bg: const Color(0xFFFEF2F2),
        icon: const Color(0xFFEF4444),
      ),
    };

    final cardBorderColor = switch (record.status) {
      HistoryStatus.completed => const Color(0xFFE5E7EB),
      HistoryStatus.scheduled => const Color(0xFFBFDBFE),
      HistoryStatus.missed => const Color(0xFFFECACA),
    };

    final hasIntakeOrAppointment = record.intake != null ||
        (record.type == HistoryFilter.appointments && record.appointmentId != null);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left column (36px fixed width) with Icon Box + Connector Line
            SizedBox(
              width: 36,
              child: Column(
                children: [
                  // Icon box (36x36, 12px radius)
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: iconColors.bg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    alignment: Alignment.center,
                    child: Icon(
                      record.icon,
                      color: iconColors.icon,
                      size: 17,
                    ),
                  ),

                  // Vertical connecting line
                  if (!widget.isLast)
                    Expanded(
                      child: Container(
                        width: 1.5,
                        margin: const EdgeInsets.symmetric(vertical: 3),
                        color: const Color(0xFFE5E7EB),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 10),

            // Right column (Card with details)
            Expanded(
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: widget.onTap,
                  borderRadius: BorderRadius.circular(18),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 13,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: cardBorderColor,
                        width: 0.8,
                      ),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x06111827),
                          blurRadius: 8,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (record.patientName != null &&
                            record.patientName!.isNotEmpty) ...[
                          ProfileRecipientBadge(
                            name: record.patientName!,
                            relationship: record.relationship,
                          ),
                          const SizedBox(height: 6),
                        ],
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Text(
                                record.title,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF111827),
                                  height: 1.2,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            _TimelineStatusBadge(status: record.status),
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text(
                          record.dateTime,
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF9CA3AF),
                            height: 1.5,
                          ),
                        ),
                        if (record.caseNumber != null) ...[
                          const SizedBox(height: 5),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE1F5EE),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text(
                                  '# ',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF1D9E75),
                                  ),
                                ),
                                Text(
                                  record.caseNumber!,
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF085041),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        if (record.doseLabel != null &&
                            record.completedDoses != null) ...[
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF9FAFB),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      'Dose progress',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: Color(0xFF9CA3AF),
                                      ),
                                    ),
                                    Text(
                                      record.doseLabel!,
                                      style: const TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w500,
                                        color: Color(0xFF6B7280),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 5),
                                Row(
                                  children: [
                                    for (int i = 0;
                                        i < record.totalDoses;
                                        i++) ...[
                                      Expanded(
                                        child: Container(
                                          height: 4,
                                          decoration: BoxDecoration(
                                            color: i < record.completedDoses!
                                                ? const Color(0xFF1D9E75)
                                                : const Color(0xFFE5E7EB),
                                            borderRadius:
                                                BorderRadius.circular(2),
                                          ),
                                        ),
                                      ),
                                      if (i != record.totalDoses - 1)
                                        const SizedBox(width: 3),
                                    ],
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],

                        // Accordion for Bite Intake & Personal Details (Space-saving)
                        if (hasIntakeOrAppointment) ...[
                          const SizedBox(height: 10),
                          _buildAccordionSection(),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAccordionSection() {
    final intake = record.intake ?? const <String, dynamic>{};
    final canEdit = record.status == HistoryStatus.scheduled &&
        record.appointmentId != null;

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 0.8),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Accordion Header Bar (Compact / Space Saving)
          InkWell(
            onTap: () => setState(() => _isExpanded = !_isExpanded),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              child: Row(
                children: [
                  Icon(
                    LucideIcons.fileSpreadsheet,
                    size: 14,
                    color: _isExpanded
                        ? const Color(0xFF1D9E75)
                        : const Color(0xFF4B5563),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Bite intake & patient details',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: _isExpanded
                            ? const Color(0xFF1D9E75)
                            : const Color(0xFF374151),
                      ),
                    ),
                  ),
                  if (canEdit && !_isExpanded)
                    Container(
                      margin: const EdgeInsets.only(right: 6),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE1F5EE),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'Editable',
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0F766E),
                        ),
                      ),
                    ),
                  Icon(
                    _isExpanded
                        ? LucideIcons.chevronUp
                        : LucideIcons.chevronDown,
                    size: 14,
                    color: const Color(0xFF6B7280),
                  ),
                ],
              ),
            ),
          ),

          // Expanded Content
          if (_isExpanded) ...[
            const Divider(height: 1, color: Color(0xFFE5E7EB)),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _infoRow(
                    'Patient',
                    '${record.patientName ?? "Patient"} (${record.relationship?.toUpperCase() ?? "SELF"})',
                  ),
                  if (record.scheduledDate != null || record.dateTime.isNotEmpty)
                    _infoRow(
                      'Scheduled for',
                      record.scheduledDate != null
                          ? '${record.scheduledDate} · ${record.timeSlot == "afternoon" ? "1:00 PM (Afternoon)" : "9:00 AM (Morning)"}'
                          : record.dateTime,
                    ),
                  if (intake.isNotEmpty) ...[
                    _infoRow(
                      'Exposure date',
                      _formatDate(intake['date_of_exposure']?.toString()),
                    ),
                    if (intake['time_of_exposure'] != null &&
                        intake['time_of_exposure'].toString().isNotEmpty)
                      _infoRow(
                        'Time of exposure',
                        intake['time_of_exposure'].toString(),
                      ),
                    _infoRow(
                      'Place of exposure',
                      intake['place_of_exposure']?.toString() ?? 'Not specified',
                    ),
                    _infoRow(
                      'Exposure mode',
                      _formatExposureMode(
                        intake['reported_mode_of_exposure']?.toString(),
                      ),
                    ),
                    _infoRow(
                      'Animal involved',
                      '${_formatSpecies(intake["animal_species"]?.toString())} · ${_formatOwnership(intake["animal_ownership"]?.toString())}',
                    ),
                    _infoRow(
                      'Body part exposed',
                      '${_formatBodyPart(intake["body_part_group"]?.toString())}${intake["body_part_detail"] != null && intake["body_part_detail"].toString().isNotEmpty ? " (${intake["body_part_detail"]})" : ""}',
                    ),
                    _infoRow(
                      'Wound washed',
                      intake['site_washed'] == true
                          ? 'Yes (Washed with soap & water)'
                          : 'No',
                    ),
                    if (intake['past_bite_history'] != null)
                      _infoRow(
                        'Past bite history',
                        intake['past_bite_history'] == 'yes'
                            ? 'Yes (Prior exposure)'
                            : 'None reported',
                      ),
                    if (intake['incident_narrative'] != null &&
                        intake['incident_narrative'].toString().trim().isNotEmpty)
                      _infoRow(
                        'Narrative',
                        intake['incident_narrative'].toString().trim(),
                      ),
                  ] else ...[
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 4),
                      child: Text(
                        'No detailed bite intake form attached to this appointment.',
                        style: TextStyle(
                          fontSize: 11,
                          color: Color(0xFF6B7280),
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ),
                  ],

                  // Edit button inside accordion
                  if (canEdit) ...[
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      height: 36,
                      child: OutlinedButton.icon(
                        onPressed: () => _openEditIntakeSheet(context),
                        icon: const Icon(
                          LucideIcons.pencil,
                          size: 13,
                          color: Color(0xFF1D9E75),
                        ),
                        label: const Text(
                          'Edit bite intake details',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF1D9E75),
                          ),
                        ),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: Colors.white,
                          side: const BorderSide(
                            color: Color(0xFF1D9E75),
                            width: 1,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                color: Color(0xFF6B7280),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 11,
                color: Color(0xFF1F2937),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String? raw) {
    if (raw == null || raw.isEmpty) return 'Not recorded';
    try {
      final dt = DateTime.parse(raw);
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
    } catch (_) {
      return raw;
    }
  }

  String _formatExposureMode(String? raw) {
    return switch (raw?.toLowerCase()) {
      'bite' => 'Bite',
      'scratch' || 'scratch_abrasion' => 'Scratch / Abrasion',
      'non_bite' => 'Non-bite exposure',
      _ => raw ?? 'Not specified',
    };
  }

  String _formatSpecies(String? raw) {
    return switch (raw?.toLowerCase()) {
      'dog' => 'Dog',
      'cat' => 'Cat',
      'other' => 'Other animal',
      _ => raw ?? 'Animal',
    };
  }

  String _formatOwnership(String? raw) {
    return switch (raw?.toLowerCase()) {
      'owned' => 'Owned pet',
      'stray' => 'Stray animal',
      _ => raw ?? 'Unknown status',
    };
  }

  String _formatBodyPart(String? raw) {
    return switch (raw?.toLowerCase()) {
      'lower_extremities' => 'Lower extremities (leg or foot)',
      'upper_extremities' => 'Upper extremities (arm or hand)',
      'head_neck' => 'Head and neck',
      'trunk_torso' => 'Trunk or torso',
      'multiple_sites' => 'Multiple sites',
      _ => raw ?? 'Not specified',
    };
  }

  Future<void> _openEditIntakeSheet(BuildContext context) async {
    final updated = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => _EditBiteIntakeSheet(record: record),
    );

    if (updated == true && mounted) {
      widget.onIntakeUpdated?.call();
    }
  }
}

class _EditBiteIntakeSheet extends StatefulWidget {
  const _EditBiteIntakeSheet({required this.record});

  final HistoryRecord record;

  @override
  State<_EditBiteIntakeSheet> createState() => _EditBiteIntakeSheetState();
}

class _EditBiteIntakeSheetState extends State<_EditBiteIntakeSheet> {
  late DateTime _exposureDate;
  late String _exposureType;
  late String _animalSpecies;
  late String _animalOwnership;
  late String _bodyPartGroup;
  late TextEditingController _detailController;
  late TextEditingController _placeController;
  late TextEditingController _narrativeController;
  late bool _siteWashed;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final intake = widget.record.intake ?? const <String, dynamic>{};

    try {
      _exposureDate = intake['date_of_exposure'] != null
          ? DateTime.parse(intake['date_of_exposure'].toString())
          : DateTime.now();
    } catch (_) {
      _exposureDate = DateTime.now();
    }

    _exposureType = intake['reported_mode_of_exposure']?.toString() ?? 'bite';
    if (!['bite', 'scratch_abrasion', 'scratch', 'non_bite'].contains(_exposureType)) {
      _exposureType = 'bite';
    }

    _animalSpecies = intake['animal_species']?.toString() ?? 'dog';
    if (!['dog', 'cat', 'other'].contains(_animalSpecies)) {
      _animalSpecies = 'dog';
    }

    _animalOwnership = intake['animal_ownership']?.toString() ?? 'owned';
    if (!['owned', 'stray'].contains(_animalOwnership)) {
      _animalOwnership = 'owned';
    }

    _bodyPartGroup = intake['body_part_group']?.toString() ?? 'lower_extremities';
    _detailController = TextEditingController(
      text: intake['body_part_detail']?.toString() ?? '',
    );
    _placeController = TextEditingController(
      text: intake['place_of_exposure']?.toString() ?? '',
    );
    _narrativeController = TextEditingController(
      text: intake['incident_narrative']?.toString() ?? '',
    );
    _siteWashed = intake['site_washed'] == true;
  }

  @override
  void dispose() {
    _detailController.dispose();
    _placeController.dispose();
    _narrativeController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _exposureDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF1D9E75),
              onPrimary: Colors.white,
              onSurface: Color(0xFF111827),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _exposureDate = picked);
    }
  }

  Future<void> _save() async {
    if (_isSaving) return;
    final apptId = widget.record.appointmentId;
    if (apptId == null) return;

    setState(() => _isSaving = true);
    try {
      final payload = {
        'date_of_exposure': _exposureDate.toIso8601String().split('T').first,
        'reported_mode_of_exposure': _exposureType,
        'animal_species': _animalSpecies,
        'animal_ownership': _animalOwnership,
        'body_part_group': _bodyPartGroup,
        'body_part_detail': _detailController.text.trim(),
        'place_of_exposure': _placeController.text.trim(),
        'site_washed': _siteWashed,
        'incident_narrative': _narrativeController.text.trim(),
      };

      await api.updateAppointmentIntake(
        appointmentId: apptId,
        intake: payload,
      );

      if (!mounted) return;
      AppToast.success(context, 'Bite intake updated successfully');
      Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        AppToast.error(context, e.toString());
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);

    return Container(
      constraints: BoxConstraints(
        maxHeight: media.size.height * 0.88,
      ),
      padding: EdgeInsets.only(bottom: media.viewInsets.bottom),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 16, 14),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE1F5EE),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    LucideIcons.filePenLine,
                    size: 18,
                    color: Color(0xFF1D9E75),
                  ),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Edit Bite Intake',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF111827),
                        ),
                      ),
                      Text(
                        'Update your incident details before consultation',
                        style: TextStyle(
                          fontSize: 11,
                          color: Color(0xFF6B7280),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  icon: const Icon(LucideIcons.x, size: 20),
                  color: const Color(0xFF6B7280),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE5E7EB)),

          // Scrollable Form
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Exposure Date Picker
                  _label('Date of Exposure / Incident *'),
                  InkWell(
                    onTap: _pickDate,
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        border: Border.all(color: const Color(0xFFD1D5DB)),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            LucideIcons.calendar,
                            size: 16,
                            color: Color(0xFF1D9E75),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _exposureDate.toIso8601String().split('T').first,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF111827),
                            ),
                          ),
                          const Spacer(),
                          const Text(
                            'Change',
                            style: TextStyle(
                              fontSize: 11.5,
                              color: Color(0xFF1D9E75),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Exposure Mode
                  _label('Mode of Exposure *'),
                  Wrap(
                    spacing: 8,
                    children: [
                      _choiceChip('Bite', 'bite', _exposureType, (val) {
                        setState(() => _exposureType = val);
                      }),
                      _choiceChip('Scratch / Abrasion', 'scratch_abrasion', _exposureType, (val) {
                        setState(() => _exposureType = val);
                      }),
                      _choiceChip('Non-bite', 'non_bite', _exposureType, (val) {
                        setState(() => _exposureType = val);
                      }),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Animal Species
                  _label('Animal Species *'),
                  Wrap(
                    spacing: 8,
                    children: [
                      _choiceChip('Dog', 'dog', _animalSpecies, (val) {
                        setState(() => _animalSpecies = val);
                      }),
                      _choiceChip('Cat', 'cat', _animalSpecies, (val) {
                        setState(() => _animalSpecies = val);
                      }),
                      _choiceChip('Other', 'other', _animalSpecies, (val) {
                        setState(() => _animalSpecies = val);
                      }),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Animal Ownership
                  _label('Animal Ownership / Status *'),
                  Wrap(
                    spacing: 8,
                    children: [
                      _choiceChip('Owned pet', 'owned', _animalOwnership, (val) {
                        setState(() => _animalOwnership = val);
                      }),
                      _choiceChip('Stray animal', 'stray', _animalOwnership, (val) {
                        setState(() => _animalOwnership = val);
                      }),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Body Part Group
                  _label('Body Part Exposed *'),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFD1D5DB)),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        isExpanded: true,
                        value: _bodyPartGroup,
                        items: const [
                          DropdownMenuItem(
                            value: 'lower_extremities',
                            child: Text('Lower extremities (leg / foot)'),
                          ),
                          DropdownMenuItem(
                            value: 'upper_extremities',
                            child: Text('Upper extremities (arm / hand)'),
                          ),
                          DropdownMenuItem(
                            value: 'head_neck',
                            child: Text('Head and neck'),
                          ),
                          DropdownMenuItem(
                            value: 'trunk_torso',
                            child: Text('Trunk or torso'),
                          ),
                          DropdownMenuItem(
                            value: 'multiple_sites',
                            child: Text('Multiple sites'),
                          ),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _bodyPartGroup = val);
                          }
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Specific Wound Detail
                  _label('Specific Wound Location (Optional)'),
                  TextField(
                    controller: _detailController,
                    decoration: InputDecoration(
                      hintText: 'e.g. Right calf, left palm, back of thigh',
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Place of Exposure
                  _label('Place of Exposure / Incident Location'),
                  TextField(
                    controller: _placeController,
                    decoration: InputDecoration(
                      hintText: 'e.g. Barangay Poblacion, Tagoloan',
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Site Washed
                  _label('Was the wound washed with soap and running water?'),
                  Row(
                    children: [
                      _choiceChip('Yes, washed', true, _siteWashed, (val) {
                        setState(() => _siteWashed = true);
                      }),
                      const SizedBox(width: 8),
                      _choiceChip('No', false, _siteWashed, (val) {
                        setState(() => _siteWashed = false);
                      }),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Incident Narrative
                  _label('Incident Description / Additional Notes'),
                  TextField(
                    controller: _narrativeController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Describe how the incident occurred...',
                      contentPadding: const EdgeInsets.all(12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Footer Action
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 16),
            child: SizedBox(
              height: 48,
              child: FilledButton(
                onPressed: _isSaving ? null : _save,
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF1D9E75),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isSaving
                    ? const SizedBox.square(
                        dimension: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Save Changes',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _label(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: Color(0xFF374151),
        ),
      ),
    );
  }

  Widget _choiceChip<T>(
    String label,
    T value,
    T selectedValue,
    ValueChanged<T> onSelected,
  ) {
    final isSelected = value == selectedValue;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onSelected(value),
      selectedColor: const Color(0xFFE1F5EE),
      backgroundColor: Colors.white,
      labelStyle: TextStyle(
        fontSize: 11.5,
        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
        color: isSelected ? const Color(0xFF0F766E) : const Color(0xFF4B5563),
      ),
      side: BorderSide(
        color: isSelected ? const Color(0xFF1D9E75) : const Color(0xFFD1D5DB),
        width: isSelected ? 1.2 : 0.8,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
      ),
    );
  }
}

class ProfileRecipientBadge extends StatelessWidget {
  const ProfileRecipientBadge({
    super.key,
    required this.name,
    this.relationship = 'self',
    this.isCompact = false,
  });

  final String name;
  final String? relationship;
  final bool isCompact;

  @override
  Widget build(BuildContext context) {
    final rel = (relationship ?? 'self').toLowerCase();
    final isSelf = rel == 'self';

    final relLabel = switch (rel) {
      'self' => 'Self',
      'child' => 'Child',
      'spouse' => 'Spouse',
      'parent' => 'Parent',
      'sibling' => 'Sibling',
      _ => 'Dependent',
    };

    final (bgColor, borderColor, textColor, icon) = switch (rel) {
      'self' => (
        const Color(0xFFE6F7F2),
        const Color(0xFFB8E4DB),
        const Color(0xFF0F766E),
        Icons.person_rounded,
      ),
      'child' => (
        const Color(0xFFEEF2FF),
        const Color(0xFFC7D2FE),
        const Color(0xFF4338CA),
        Icons.child_care_rounded,
      ),
      'spouse' => (
        const Color(0xFFFDF2F8),
        const Color(0xFFFBCFE8),
        const Color(0xFFBE185D),
        Icons.favorite_rounded,
      ),
      _ => (
        const Color(0xFFF3F4F6),
        const Color(0xFFE5E7EB),
        const Color(0xFF374151),
        Icons.group_rounded,
      ),
    };

    final displayName = isSelf ? '$name (Self)' : '$name ($relLabel)';

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isCompact ? 6 : 8,
        vertical: isCompact ? 2 : 3.5,
      ),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor, width: 0.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: isCompact ? 11 : 12, color: textColor),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              displayName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: textColor,
                fontSize: isCompact ? 9.5 : 10.5,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.1,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TimelineStatusBadge extends StatelessWidget {
  const _TimelineStatusBadge({required this.status});

  final HistoryStatus status;

  @override
  Widget build(BuildContext context) {
    final style = switch (status) {
      HistoryStatus.completed => (
        bg: const Color(0xFFE1F5EE),
        text: const Color(0xFF085041),
        label: 'Completed',
      ),
      HistoryStatus.scheduled => (
        bg: const Color(0xFFEFF6FF),
        text: const Color(0xFF1D4ED8),
        label: 'Scheduled',
      ),
      HistoryStatus.missed => (
        bg: const Color(0xFFFEF2F2),
        text: const Color(0xFFB91C1C),
        label: 'Missed',
      ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: style.bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        style.label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w500,
          color: style.text,
        ),
      ),
    );
  }
}
