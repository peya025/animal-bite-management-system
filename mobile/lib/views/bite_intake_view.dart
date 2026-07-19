import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../models/bite_intake_draft.dart';
import '../models/bite_intake_route_args.dart';
import '../services/mobile_api.dart';
import '../widgets/booking/date_selector.dart';
import '../widgets/buttons/primary_action_button.dart';
import '../widgets/common/app_page_header.dart';
import '../widgets/menu/menu_surface.dart';

class BiteIntakeView extends StatefulWidget {
  const BiteIntakeView({super.key, required this.args});

  final BiteIntakeRouteArgs args;

  @override
  State<BiteIntakeView> createState() => _BiteIntakeViewState();
}

class _BiteIntakeViewState extends State<BiteIntakeView> {
  final _formKey = GlobalKey<FormState>();
  final _biteDate = TextEditingController();
  final _bitePlace = TextEditingController();
  final _woundLocation = TextEditingController();
  final _description = TextEditingController();
  late DateTime _selectedBiteDate;
  String? _exposureType;
  String? _animalType;
  String? _animalStatus;
  bool? _siteWashed;
  bool _animalCaptured = false;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _selectedBiteDate = DateUtils.dateOnly(DateTime.now());
    _biteDate.text = _formatDate(_selectedBiteDate);
  }

  @override
  void dispose() {
    _biteDate.dispose();
    _bitePlace.dispose();
    _woundLocation.dispose();
    _description.dispose();
    super.dispose();
  }

  String _formatDate(DateTime date) => date.toIso8601String().split('T').first;

  String? _optional(TextEditingController controller) {
    final value = controller.text.trim();
    return value.isEmpty ? null : value;
  }

  Future<void> _chooseBiteDate() async {
    final today = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedBiteDate,
      firstDate: DateTime(today.year - 1),
      lastDate: DateTime(today.year, today.month, today.day),
    );
    if (date == null || !mounted) return;
    setState(() {
      _selectedBiteDate = date;
      _biteDate.text = _formatDate(date);
    });
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final today = DateUtils.dateOnly(DateTime.now());
    final incidentDate = DateUtils.dateOnly(_selectedBiteDate);
    if (incidentDate.isAfter(today)) {
      setState(() => _error = 'The incident date must be today or earlier.');
      return;
    }
    if (_siteWashed == null) {
      setState(() => _error = 'Please indicate whether the wound was washed.');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await MobileApi.instance.book(
        patient: widget.args.patient,
        booking: widget.args.booking,
        intake: BiteIntakeDraft(
          biteDate: _selectedBiteDate,
          siteWashed: _siteWashed!,
          exposureType: _exposureType!,
          animalType: _animalType!,
          animalStatus: _animalStatus!,
          animalCaptured: _animalCaptured,
          bitePlace: _optional(_bitePlace),
          woundLocation: _optional(_woundLocation),
          patientDescription: _optional(_description),
        ),
      );
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          icon: const Icon(Icons.assignment_turned_in_outlined, color: AppColors.primary),
          title: const Text('Consultation booked'),
          content: Text(
            '${widget.args.patient.name}\'s intake was sent to the clinic for review on ${DateSelector.formatDate(widget.args.booking.date)}.',
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Done'),
            ),
          ],
        ),
      );
      if (!mounted) return;
      Navigator.of(
        context,
      ).pushNamedAndRemoveUntil(AppRoutes.menu, (route) => false);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final patient = widget.args.patient;
    return Scaffold(
      backgroundColor: const Color(0xFFF5F8F7),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 32),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    AppPageHeader(
                      title: 'Bite incident intake',
                      subtitle: 'Patient-reported details for clinic review.',
                      onBack: () => Navigator.of(context).pop(),
                    ),
                    const SizedBox(height: 20),
                    if (_error case final message?) ...[
                      Text(message, style: const TextStyle(color: AppColors.error)),
                      const SizedBox(height: 12),
                    ],
                    MenuSurface(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const _SectionTitle('Patient'),
                          const SizedBox(height: 12),
                          _field(
                            'FIRST NAME',
                            initialValue: patient.firstName,
                            enabled: false,
                          ),
                          _field(
                            'LAST NAME',
                            initialValue: patient.lastName,
                            enabled: false,
                          ),
                          const Divider(height: 28),
                          const _SectionTitle('Incident'),
                          const SizedBox(height: 12),
                          _label('DATE OF INCIDENT *'),
                          TextFormField(
                            controller: _biteDate,
                            readOnly: true,
                            onTap: _chooseBiteDate,
                            decoration: InputDecoration(
                              suffixIcon: IconButton(
                                tooltip: 'Choose incident date',
                                onPressed: _chooseBiteDate,
                                icon: const Icon(Icons.event_outlined),
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          _dropdown(
                            label: 'TYPE OF EXPOSURE *',
                            value: _exposureType,
                            items: const {
                              'bite': 'Bite',
                              'scratch': 'Scratch',
                              'lick': 'Lick on skin or wound',
                              'other': 'Other',
                            },
                            onChanged: (value) => setState(() => _exposureType = value),
                          ),
                          _dropdown(
                            label: 'ANIMAL *',
                            value: _animalType,
                            items: const {'dog': 'Dog', 'cat': 'Cat', 'other': 'Other'},
                            onChanged: (value) => setState(() => _animalType = value),
                          ),
                          _dropdown(
                            label: 'ANIMAL STATUS *',
                            value: _animalStatus,
                            items: const {
                              'owned': 'Owned',
                              'stray': 'Stray',
                              'unknown': 'Unknown',
                            },
                            onChanged: (value) => setState(() => _animalStatus = value),
                          ),
                          _field('PLACE OF INCIDENT', controller: _bitePlace),
                          _field('WOUND LOCATION', controller: _woundLocation),
                          _label('WAS THE WOUND WASHED? *'),
                          SegmentedButton<bool>(
                            segments: const [
                              ButtonSegment(value: true, label: Text('Yes')),
                              ButtonSegment(value: false, label: Text('No')),
                            ],
                            selected: _siteWashed == null ? const {} : {_siteWashed!},
                            emptySelectionAllowed: true,
                            onSelectionChanged: _submitting
                                ? null
                                : (selection) => setState(
                                    () => _siteWashed = selection.firstOrNull,
                                  ),
                          ),
                          const SizedBox(height: 12),
                          SwitchListTile.adaptive(
                            contentPadding: EdgeInsets.zero,
                            title: const Text('Animal captured or available'),
                            value: _animalCaptured,
                            onChanged: _submitting
                                ? null
                                : (value) => setState(() => _animalCaptured = value),
                          ),
                          _label('PATIENT DESCRIPTION'),
                          TextFormField(
                            controller: _description,
                            minLines: 3,
                            maxLines: 5,
                            maxLength: 2000,
                            decoration: const InputDecoration(
                              hintText: 'Describe what happened and the visible wound.',
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    PrimaryActionButton(
                      label: 'SUBMIT INTAKE AND BOOK',
                      isLoading: _submitting,
                      onPressed: _submit,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(
    String label, {
    TextEditingController? controller,
    String? initialValue,
    bool enabled = true,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _label(label),
          TextFormField(
            controller: controller,
            initialValue: controller == null ? initialValue : null,
            enabled: enabled && !_submitting,
            textCapitalization: TextCapitalization.sentences,
          ),
        ],
      ),
    );
  }

  Widget _dropdown({
    required String label,
    required String? value,
    required Map<String, String> items,
    required ValueChanged<String?> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _label(label),
          DropdownButtonFormField<String>(
            initialValue: value,
            items: items.entries
                .map((item) => DropdownMenuItem(value: item.key, child: Text(item.value)))
                .toList(),
            onChanged: _submitting ? null : onChanged,
            validator: (selected) => selected == null ? '$label is required' : null,
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
          color: AppColors.gray700,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: AppColors.gray900,
        fontSize: 15,
        fontWeight: FontWeight.w800,
      ),
    );
  }
}
