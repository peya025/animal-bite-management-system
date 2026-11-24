import React from 'react';
import { FormField } from './FormField';
import { DuplicatePatientBanner } from './DuplicatePatientBanner';
import { SearchableSelect, createSelectChangeEvent } from '../../../../../shared/components';
import {
  PATIENT_SUFFIX_OPTIONS,
  normalizePatientSuffix,
  type DuplicatePatientMatch,
  type EnrolmentFormData,
} from '../../../types';
import { useClinicModuleConfig } from '../../../../../hooks/useClinicModuleConfig';

const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => ({
  value: t,
  label: t,
}));

const CIVIL_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'separated', label: 'Separated' },
  { value: 'annulled', label: 'Annulled' },
  { value: 'cohabitation', label: 'Co-Habitation' },
];

const PRIORITY_CATEGORY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'pregnant', label: 'Pregnant' },
  { value: 'senior', label: 'Senior Citizen' },
  { value: 'pwd', label: 'PWD' },
];

const emitSelectEvent = createSelectChangeEvent;

interface PatientInfoSectionProps {
  data: EnrolmentFormData;
  onChange: (key: keyof EnrolmentFormData) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onNoMiddleNameChange?: (checked: boolean) => void;
  errors?: Record<string, string>;
  showQueueFields?: boolean;
  duplicateMatches?: DuplicatePatientMatch[];
  hasExactDuplicate?: boolean;
  checkingDuplicates?: boolean;
  confirmedDifferentPerson?: boolean;
  onConfirmDifferentPersonChange?: (checked: boolean) => void;
  onSelectExistingPatient?: (patientId: number) => void;
  highlightDuplicateConfirmation?: boolean;
}

export function PatientInfoSection({
  data,
  onChange,
  onNoMiddleNameChange,
  errors = {},
  showQueueFields = false,
  duplicateMatches = [],
  hasExactDuplicate = false,
  checkingDuplicates = false,
  confirmedDifferentPerson = false,
  onConfirmDifferentPersonChange = () => {},
  onSelectExistingPatient,
  highlightDuplicateConfirmation = false,
}: PatientInfoSectionProps) {
  const { isFieldVisible, isFieldRequired, isSectionEnabled } = useClinicModuleConfig();
  const regSectionEnabled = isSectionEnabled('patient_registration_enabled');

  return (
    <div className="fm-section">
      <h3 className="fm-section-title">I. Patient Information</h3>
      <div className="registration-patient-grid">
        {/* Row 1 & Row 2: Last Name | First Name, Middle Name | Suffix (Locked Identity Invariants) */}
        <div className="fm-grid fm-grid--4" style={{ marginBottom: 14 }}>
          <FormField id="field-last_name" label="Last Name" required error={!!errors.last_name} errorText={errors.last_name}>
            <input className="fm-input" name="last_name" value={data.last_name} onChange={onChange('last_name')} placeholder="Dela Cruz" style={errors.last_name ? { borderColor: '#ef4444' } : undefined} />
          </FormField>
          <FormField id="field-first_name" label="First Name" required error={!!errors.first_name} errorText={errors.first_name}>
            <input className="fm-input" name="first_name" value={data.first_name} onChange={onChange('first_name')} placeholder="Juan" style={errors.first_name ? { borderColor: '#ef4444' } : undefined} />
          </FormField>
          <div className="registration-field-stack">
            <FormField
              id="field-middle_name"
              label="Middle Name"
              required={!data.no_middle_name}
              error={!!errors.middle_name}
              errorText={errors.middle_name}
            >
              <input
                className="fm-input"
                name="middle_name"
                value={data.no_middle_name ? '' : data.middle_name}
                onChange={onChange('middle_name')}
                placeholder={data.no_middle_name ? 'No Middle Name' : 'Santos'}
                disabled={Boolean(data.no_middle_name)}
                style={errors.middle_name ? { borderColor: '#ef4444' } : undefined}
              />
            </FormField>
            <label
              className={`registration-circle-check${data.no_middle_name ? ' registration-circle-check--checked' : ''}`}
            >
              <input
                type="checkbox"
                name="no_middle_name"
                checked={Boolean(data.no_middle_name)}
                onChange={(e) => onNoMiddleNameChange?.(e.target.checked)}
              />
              <span>No Middle Name</span>
            </label>
          </div>
          <FormField id="field-suffix" label="Suffix" error={!!errors.suffix} errorText={errors.suffix}>
            {(() => {
              const suffixValue = normalizePatientSuffix(data.suffix);
              const hasLegacySuffix =
                suffixValue !== '' &&
                !(PATIENT_SUFFIX_OPTIONS as readonly string[]).includes(suffixValue);
              const suffixOptions = [
                { value: '', label: 'None' },
                ...PATIENT_SUFFIX_OPTIONS.map((opt) => ({ value: opt, label: opt })),
                ...(hasLegacySuffix ? [{ value: suffixValue, label: suffixValue }] : []),
              ];
              return (
                <SearchableSelect
                  name="suffix"
                  value={suffixValue}
                  options={suffixOptions}
                  onChange={(val) => onChange('suffix')(emitSelectEvent('suffix', val))}
                  searchPlaceholder="Search suffix..."
                />
              );
            })()}
          </FormField>
        </div>

        {/* Row 3: Sex (Kasarian) segmented cubes | Date of Birth (Locked Identity Invariants) */}
        <div className="fm-grid fm-grid--2" style={{ marginBottom: 14 }}>
          <FormField id="field-sex" label="Sex (Kasarian)" required error={!!errors.sex} errorText={errors.sex}>
            <div
              className="fm-segmented-group"
              style={
                errors.sex
                  ? {
                      border: '1.5px solid #ef4444',
                      boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.15)',
                    }
                  : undefined
              }
            >
              {([
                { value: 'female', label: 'Female' },
                { value: 'male', label: 'Male' },
              ] as const).map((opt) => {
                const isSelected = data.sex === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`fm-segmented-option ${isSelected ? 'fm-segmented-option--selected' : ''}`}
                    style={errors.sex && !isSelected ? { color: '#991b1b' } : undefined}
                  >
                    <input
                      type="radio"
                      name="sex"
                      value={opt.value}
                      checked={isSelected}
                      onChange={onChange('sex')}
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </FormField>

          <FormField id="field-date_of_birth" label="Date of Birth" required error={!!errors.date_of_birth} errorText={errors.date_of_birth}>
            <input
              className="fm-input"
              type="date"
              name="date_of_birth"
              id="date_of_birth"
              min="1900-01-01"
              max={new Date().toISOString().split('T')[0]}
              value={data.date_of_birth}
              onChange={(e) => {
                let val = e.target.value;
                if (val) {
                  const parts = val.split('-');
                  if (parts.length > 0 && parts[0].length > 4) {
                    parts[0] = parts[0].slice(0, 4);
                    val = parts.join('-');
                  }
                }
                const customEv = { ...e, target: { ...e.target, value: val, name: 'date_of_birth' } } as any;
                onChange('date_of_birth')(customEv);
              }}
              onInput={(e) => {
                const target = e.currentTarget;
                if (target.value) {
                  const parts = target.value.split('-');
                  if (parts.length > 0 && parts[0].length > 4) {
                    parts[0] = parts[0].slice(0, 4);
                    target.value = parts.join('-');
                    const customEv = { target: { value: target.value, name: 'date_of_birth' } } as any;
                    onChange('date_of_birth')(customEv);
                  }
                }
              }}
              style={errors.date_of_birth ? { borderColor: '#ef4444' } : undefined}
            />
          </FormField>
        </div>

        {/* Full-Width Inline Duplicate / Homonym Disambiguation Banner */}
        <DuplicatePatientBanner
          matches={duplicateMatches}
          hasExactMatch={hasExactDuplicate}
          checking={checkingDuplicates}
          confirmedDifferentPerson={confirmedDifferentPerson}
          onConfirmDifferentPersonChange={onConfirmDifferentPersonChange}
          onSelectExistingPatient={onSelectExistingPatient}
          highlightConfirmation={highlightDuplicateConfirmation}
        />

        {/* Row 4: Blood Type (RF1) | Mother's Maiden Name */}
        {regSectionEnabled && (isFieldVisible('blood_type') || isFieldVisible('mother_maiden_name')) && (
          <div className="fm-grid fm-grid--2" style={{ marginBottom: 14 }}>
            {isFieldVisible('blood_type') && (
              <FormField
                id="field-blood_type"
                label="Blood Type"
                required={isFieldRequired('blood_type')}
                error={!!errors.blood_type}
                errorText={errors.blood_type}
              >
                <SearchableSelect
                  name="blood_type"
                  value={data.blood_type}
                  options={BLOOD_TYPE_OPTIONS}
                  placeholder="— Select —"
                  searchPlaceholder="Search blood type..."
                  onChange={(val) => onChange('blood_type')(emitSelectEvent('blood_type', val))}
                />
              </FormField>
            )}
            {isFieldVisible('mother_maiden_name') && (
              <FormField
                id="field-mother_maiden_name"
                label="Mother's Maiden Name"
                required={isFieldRequired('mother_maiden_name')}
                error={!!errors.mother_maiden_name}
                errorText={errors.mother_maiden_name}
              >
                <input
                  className="fm-input"
                  name="mother_maiden_name"
                  value={data.mother_maiden_name}
                  onChange={onChange('mother_maiden_name')}
                  placeholder="Last, First Middle"
                  style={errors.mother_maiden_name ? { borderColor: '#ef4444' } : undefined}
                />
              </FormField>
            )}
          </div>
        )}

        {/* Row 5: Civil Status | Priority Category */}
        <div className="fm-grid fm-grid--2" style={{ marginBottom: 14 }}>
          {regSectionEnabled && isFieldVisible('civil_status') && (
            <FormField
              id="field-civil_status"
              label="Civil Status"
              required={isFieldRequired('civil_status')}
              error={!!errors.civil_status}
              errorText={errors.civil_status}
            >
              <SearchableSelect
                name="civil_status"
                value={data.civil_status}
                options={CIVIL_STATUS_OPTIONS}
                placeholder="— Select —"
                searchPlaceholder="Search civil status..."
                onChange={(val) => onChange('civil_status')(emitSelectEvent('civil_status', val))}
              />
            </FormField>
          )}

          {showQueueFields && (() => {
            const isMale = data.sex === 'male';
            const priorityOptions = isMale
              ? PRIORITY_CATEGORY_OPTIONS.filter((opt) => opt.value !== 'pregnant')
              : PRIORITY_CATEGORY_OPTIONS;
            const priorityValue =
              isMale && data.queue_priority_group === 'pregnant'
                ? 'normal'
                : data.queue_priority_group;
            return (
              <FormField id="field-queue_priority_group" label="Priority Category" required error={!!errors.queue_priority_group} errorText={errors.queue_priority_group}>
                <SearchableSelect
                  name="queue_priority_group"
                  value={priorityValue}
                  options={priorityOptions}
                  searchPlaceholder="Search priority category..."
                  onChange={(val) => onChange('queue_priority_group')(emitSelectEvent('queue_priority_group', val))}
                />
              </FormField>
            );
          })()}
        </div>

        {/* Conditional Spouse Name (CF1) */}
        {regSectionEnabled && data.civil_status === 'married' && isFieldVisible('spouse_name') && (
          <div className="registration-conditional" style={{ marginBottom: 14 }}>
            <FormField
              id="field-spouse_name"
              label="Spouse's Name"
              required={isFieldRequired('spouse_name')}
              error={!!errors.spouse_name}
              errorText={errors.spouse_name}
            >
              <input
                className="fm-input"
                name="spouse_name"
                value={data.spouse_name}
                onChange={onChange('spouse_name')}
                style={errors.spouse_name ? { borderColor: '#ef4444' } : undefined}
              />
            </FormField>
          </div>
        )}
      </div>
    </div>
  );
}
