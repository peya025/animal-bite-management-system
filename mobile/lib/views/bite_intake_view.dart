// ignore_for_file: deprecated_member_use
import 'package:flutter/material.dart';

import '../app/app_routes.dart';
import '../app/app_theme.dart';
import '../models/bite_intake_draft.dart';
import '../models/bite_intake_route_args.dart';
import '../services/api.dart';
import '../services/psgc_service.dart';
import '../widgets/buttons/primary_action_button.dart';
import '../widgets/common/app_page_header.dart';
import '../widgets/menu/menu_surface.dart';

// ─── Form 3-aligned option sets ───────────────────────────────────────────────

const _exposureTypeOptions = <String, String>{
  'transdermal_bite': 'Transdermal bite',
  'scratch_abrasion': 'Scratch / abrasion',
  'nibbling_uncovered_skin': 'Nibbling / licking of uncovered skin',
  'nibbling_broken_skin': 'Nibbling / licking of wounded skin',
  'handling_ingestion_raw_meat': 'Handling / ingestion of raw infected meat',
};

const _bodyPartOptions = <String, String>{
  'head_neck': 'Head and/or neck',
  'other_parts': 'Other parts of the body',
  'na_ingestion': 'N/A — ingestion mode',
};

/// Standard anatomical wound locations used in animal bite treatment
const _woundLocationOptions = <String, String>{
  'face': 'Face',
  'head': 'Head',
  'neck': 'Neck',
  'upper_arm': 'Upper arm',
  'forearm': 'Forearm',
  'hand': 'Hand / fingers',
  'trunk': 'Trunk / torso',
  'thigh': 'Thigh',
  'leg': 'Leg / shin',
  'foot': 'Foot / toes',
  'multiple': 'Multiple sites',
  'other': 'Other',
};

const _animalStatusOptions = <String, String>{
  'owned': 'Owned',
  'stray': 'Stray',
  'unknown': 'Unknown',
};

// ─── View ─────────────────────────────────────────────────────────────────────

class BiteIntakeView extends StatefulWidget {
  const BiteIntakeView({super.key, required this.args});

  final BiteIntakeRouteArgs args;

  @override
  State<BiteIntakeView> createState() => _BiteIntakeViewState();
}

class _BiteIntakeViewState extends State<BiteIntakeView> {
  final _formKey = GlobalKey<FormState>();
  final _biteDate = TextEditingController();
  final _purokController = TextEditingController();
  final _animalTypeOthers = TextEditingController();
  final _description = TextEditingController();

  late DateTime _selectedBiteDate;

  // Address (place of incident)
  List<PsgcLocation> _municipalities = [];
  List<PsgcLocation> _barangays = [];
  String? _selectedMunicipalityCode;
  String? _selectedMunicipalityName;
  String? _selectedBarangayCode;
  String? _selectedBarangayName;
  bool _loadingMunicipalities = false;
  bool _loadingBarangays = false;

  // Incident
  String? _exposureType;
  String? _bodyPartExposed;
  String? _woundLocation;

  // Animal
  String _animalType = 'Dog';
  String? _animalStatus;

  // Wound care
  bool? _siteWashed;
  bool _animalCaptured = false;

  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _selectedBiteDate = DateUtils.dateOnly(DateTime.now());
    _biteDate.text = _formatDate(_selectedBiteDate);
    _loadMunicipalities();
  }

  @override
  void dispose() {
    _biteDate.dispose();
    _purokController.dispose();
    _animalTypeOthers.dispose();
    _description.dispose();
    super.dispose();
  }

  String _formatDate(DateTime date) => date.toIso8601String().split('T').first;

  String? _optional(TextEditingController c) {
    final v = c.text.trim();
    return v.isEmpty ? null : v;
  }

  Future<void> _loadMunicipalities() async {
    setState(() => _loadingMunicipalities = true);
    try {
      final list = await api.locationMunicipalities() as List<PsgcLocation>;
      if (mounted) setState(() => _municipalities = list);
    } catch (_) {
      // If API unavailable, user can still type free-text via purok field
    } finally {
      if (mounted) setState(() => _loadingMunicipalities = false);
    }
  }

  Future<void> _loadBarangays(String municipalityCode) async {
    setState(() {
      _loadingBarangays = true;
      _barangays = [];
      _selectedBarangayCode = null;
      _selectedBarangayName = null;
    });
    try {
      final list = await api.locationBarangays(municipalityCode: municipalityCode) as List<PsgcLocation>;
      if (mounted) setState(() => _barangays = list);
    } catch (_) {}
    finally {
      if (mounted) setState(() => _loadingBarangays = false);
    }
  }

  /// Builds the formatted place string from selected address fields
  String? _buildBitePlace() {
    final parts = [
      ?_optional(_purokController),
      ?_selectedBarangayName,
      ?_selectedMunicipalityName,
    ];
    return parts.isEmpty ? null : parts.join(', ');
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
    if (_submitting) return;
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final today = DateUtils.dateOnly(DateTime.now());
    if (DateUtils.dateOnly(_selectedBiteDate).isAfter(today)) {
      setState(() => _error = 'The incident date must be today or earlier.');
      return;
    }
    if (_siteWashed == null) {
      setState(() => _error = 'Please indicate whether the wound was washed.');
      return;
    }
    if (_exposureType == null) {
      setState(() => _error = 'Please select the mode of exposure.');
      return;
    }
    if (_animalStatus == null) {
      setState(() => _error = 'Please select the animal status.');
      return;
    }

    final resolvedAnimalType = _animalType == 'Others' && _animalTypeOthers.text.trim().isNotEmpty
        ? _animalTypeOthers.text.trim()
        : _animalType;

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      await api.book(
        patient: widget.args.patient,
        booking: widget.args.booking,
        intake: BiteIntakeDraft(
          biteDate: _selectedBiteDate,
          siteWashed: _siteWashed!,
          exposureType: _exposureType!,
          animalType: resolvedAnimalType,
          animalTypeOthers: _animalType == 'Others' ? _optional(_animalTypeOthers) : null,
          animalStatus: _animalStatus!,
          animalCaptured: _animalCaptured,
          bitePlace: _buildBitePlace(),
          woundLocation: _woundLocation,
          bodyPartExposed: _bodyPartExposed,
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
            '${widget.args.patient.name}\'s intake was sent to the clinic for review.',
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
      Navigator.of(context).pushNamedAndRemoveUntil(AppRoutes.menu, (route) => false);
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
                      subtitle: 'Patient-reported details — reviewed by clinic nurse.',
                      onBack: () => Navigator.of(context).pop(),
                    ),
                    const SizedBox(height: 20),

                    // Error banner
                    if (_error case final msg?) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFFCA5A5)),
                        ),
                        child: Text(msg, style: const TextStyle(color: AppColors.error, fontSize: 13)),
                      ),
                      const SizedBox(height: 12),
                    ],

                    // ── Patient (read-only) ───────────────────────────────
                    MenuSurface(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _sectionHeader(Icons.person_outline_rounded, 'Patient'),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(child: _readField('First name', patient.firstName)),
                              const SizedBox(width: 12),
                              Expanded(child: _readField('Last name', patient.lastName)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // ── Incident details ─────────────────────────────────
                    MenuSurface(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _sectionHeader(Icons.event_outlined, 'Incident details'),
                          const SizedBox(height: 12),

                          // Date of incident
                          _label('Date of incident *'),
                          TextFormField(
                            controller: _biteDate,
                            readOnly: true,
                            onTap: _submitting ? null : _chooseBiteDate,
                            decoration: InputDecoration(
                              suffixIcon: IconButton(
                                tooltip: 'Choose incident date',
                                onPressed: _submitting ? null : _chooseBiteDate,
                                icon: const Icon(Icons.event_outlined),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // ── Place of Incident (PSGC) ──────────────────
                          _label('Place of incident'),
                          const SizedBox(height: 4),

                          // Municipality
                          _label('Municipality *'),
                          _municipalities.isEmpty && !_loadingMunicipalities
                              // Fallback: just use purok free text if API unavailable
                              ? TextFormField(
                                  controller: _purokController,
                                  enabled: !_submitting,
                                  decoration: const InputDecoration(hintText: 'e.g. Barangay 5, Tagoloan'),
                                  textCapitalization: TextCapitalization.words,
                                )
                              : DropdownButtonFormField<String>(
                                  initialValue: _selectedMunicipalityCode,
                                  hint: Text(_loadingMunicipalities ? 'Loading...' : 'Select municipality'),
                                  items: _municipalities
                                      .map((m) => DropdownMenuItem(value: m.code, child: Text(m.name, style: const TextStyle(fontSize: 13))))
                                      .toList(),
                                  onChanged: _submitting || _loadingMunicipalities
                                      ? null
                                      : (code) {
                                          setState(() {
                                            _selectedMunicipalityCode = code;
                                            _selectedMunicipalityName = _municipalities.firstWhere((m) => m.code == code).name;
                                            _selectedBarangayCode = null;
                                            _selectedBarangayName = null;
                                          });
                                          if (code != null) _loadBarangays(code);
                                        },
                                ),
                          const SizedBox(height: 10),

                          // Barangay
                          if (_municipalities.isNotEmpty) ...[
                            _label('Barangay'),
                            DropdownButtonFormField<String>(
                              initialValue: _selectedBarangayCode,
                              hint: Text(
                                _loadingBarangays
                                    ? 'Loading barangays...'
                                    : _selectedMunicipalityCode == null
                                        ? 'Select municipality first'
                                        : 'Select barangay',
                              ),
                              items: _barangays
                                  .map((b) => DropdownMenuItem(value: b.code, child: Text(b.name, style: const TextStyle(fontSize: 13))))
                                  .toList(),
                              onChanged: _submitting || _loadingBarangays || _selectedMunicipalityCode == null
                                  ? null
                                  : (code) {
                                      setState(() {
                                        _selectedBarangayCode = code;
                                        _selectedBarangayName = _barangays.firstWhere((b) => b.code == code).name;
                                      });
                                    },
                            ),
                            const SizedBox(height: 10),
                          ],

                          // Purok / street
                          _label('Purok / Zone / Street'),
                          TextFormField(
                            controller: _purokController,
                            enabled: !_submitting,
                            decoration: const InputDecoration(hintText: 'e.g. Purok 3, Rizal St.'),
                            textCapitalization: TextCapitalization.words,
                          ),
                          const SizedBox(height: 14),

                          // Mode of exposure
                          _label('Mode of exposure *'),
                          ..._exposureTypeOptions.entries.map((opt) => RadioListTile<String>(
                            value: opt.key,
                            groupValue: _exposureType,
                            title: Text(opt.value, style: const TextStyle(fontSize: 13)),
                            contentPadding: EdgeInsets.zero,
                            visualDensity: VisualDensity.compact,
                            activeColor: AppColors.primary,
                            onChanged: _submitting ? null : (v) => setState(() => _exposureType = v),
                          )),
                          const SizedBox(height: 14),

                          // Body part
                          _label('Body part affected'),
                          ..._bodyPartOptions.entries.map((opt) => RadioListTile<String>(
                            value: opt.key,
                            groupValue: _bodyPartExposed,
                            title: Text(opt.value, style: const TextStyle(fontSize: 13)),
                            contentPadding: EdgeInsets.zero,
                            visualDensity: VisualDensity.compact,
                            activeColor: AppColors.primary,
                            onChanged: _submitting ? null : (v) => setState(() => _bodyPartExposed = v),
                          )),
                          const SizedBox(height: 14),

                          // Wound location — dropdown
                          _label('Wound location'),
                          DropdownButtonFormField<String>(
                            initialValue: _woundLocation,
                            hint: const Text('Select wound location'),
                            items: _woundLocationOptions.entries
                                .map((e) => DropdownMenuItem(
                                      value: e.key,
                                      child: Text(e.value, style: const TextStyle(fontSize: 13)),
                                    ))
                                .toList(),
                            onChanged: _submitting ? null : (v) => setState(() => _woundLocation = v),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // ── Animal ────────────────────────────────────────────
                    MenuSurface(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _sectionHeader(Icons.pets_rounded, 'Animal'),
                          const SizedBox(height: 12),

                          _label('Type of animal *'),
                          Row(
                            children: [
                              Expanded(
                                child: RadioListTile<String>(
                                  value: 'Dog',
                                  groupValue: _animalType,
                                  title: const Text('Dog', style: TextStyle(fontSize: 13)),
                                  contentPadding: EdgeInsets.zero,
                                  visualDensity: VisualDensity.compact,
                                  activeColor: AppColors.primary,
                                  onChanged: _submitting ? null : (v) => setState(() => _animalType = v!),
                                ),
                              ),
                              Expanded(
                                child: RadioListTile<String>(
                                  value: 'Others',
                                  groupValue: _animalType,
                                  title: const Text('Others', style: TextStyle(fontSize: 13)),
                                  contentPadding: EdgeInsets.zero,
                                  visualDensity: VisualDensity.compact,
                                  activeColor: AppColors.primary,
                                  onChanged: _submitting ? null : (v) => setState(() => _animalType = v!),
                                ),
                              ),
                            ],
                          ),
                          if (_animalType == 'Others') ...[
                            const SizedBox(height: 6),
                            TextFormField(
                              controller: _animalTypeOthers,
                              enabled: !_submitting,
                              decoration: const InputDecoration(hintText: 'e.g. Cat, monkey, bat...'),
                              textCapitalization: TextCapitalization.sentences,
                            ),
                          ],
                          const SizedBox(height: 14),

                          _label('Animal status *'),
                          DropdownButtonFormField<String>(
                            initialValue: _animalStatus,
                            hint: const Text('Select status'),
                            items: _animalStatusOptions.entries
                                .map((e) => DropdownMenuItem(
                                      value: e.key,
                                      child: Text(e.value, style: const TextStyle(fontSize: 13)),
                                    ))
                                .toList(),
                            onChanged: _submitting ? null : (v) => setState(() => _animalStatus = v),
                            validator: (v) => v == null ? 'Animal status is required' : null,
                          ),
                          const SizedBox(height: 8),

                          SwitchListTile.adaptive(
                            contentPadding: EdgeInsets.zero,
                            title: const Text('Animal captured or available', style: TextStyle(fontSize: 13)),
                            value: _animalCaptured,
                            activeThumbColor: AppColors.primary,
                            onChanged: _submitting ? null : (v) => setState(() => _animalCaptured = v),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // ── Wound care ────────────────────────────────────────
                    MenuSurface(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _sectionHeader(Icons.health_and_safety_outlined, 'Wound care'),
                          const SizedBox(height: 12),

                          _label('Was the wound washed? *'),
                          SegmentedButton<bool>(
                            segments: const [
                              ButtonSegment(value: true, label: Text('Yes')),
                              ButtonSegment(value: false, label: Text('No')),
                            ],
                            selected: _siteWashed == null ? const {} : {_siteWashed!},
                            emptySelectionAllowed: true,
                            onSelectionChanged: _submitting
                                ? null
                                : (sel) => setState(() => _siteWashed = sel.firstOrNull),
                          ),
                          const SizedBox(height: 14),

                          _label('Patient description'),
                          TextFormField(
                            controller: _description,
                            enabled: !_submitting,
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
                    const SizedBox(height: 20),

                    PrimaryActionButton(
                      label: 'Submit intake and book',
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

  // ─── Helpers ────────────────────────────────────────────────────────────────

  Widget _sectionHeader(IconData icon, String title) {
    return Row(
      children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            color: const Color(0xFFE1F5EE),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 16, color: AppColors.primary),
        ),
        const SizedBox(width: 10),
        Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF111827))),
      ],
    );
  }

  Widget _label(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(
      text,
      style: const TextStyle(color: AppColors.gray700, fontSize: 12, fontWeight: FontWeight.w600),
    ),
  );

  Widget _readField(String label, String? value) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _label(label),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: const Color(0xFFF9FAFB),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFFE5E7EB)),
          ),
          child: Text(value ?? '—', style: const TextStyle(fontSize: 13, color: Color(0xFF374151))),
        ),
      ],
    ),
  );
}
