import React from 'react';
import { FormField } from './FormField';
import { DuplicatePatientBanner } from './DuplicatePatientBanner';
import type { DuplicatePatientMatch, EnrolmentFormData } from '../../../types';

interface PatientInfoSectionProps {
  data: EnrolmentFormData;
  onChange: (key: keyof EnrolmentFormData) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
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
  return (
    <div className="fm-section">
      <h3 className="fm-section-title">I. Patient Information</h3>
      <div className="registration-patient-grid">
        {/* Row 1 & Row 2: Last Name | First Name, Middle Name | Suffix */}
        <div className="fm-grid fm-grid--4" style={{ marginBottom: 14 }}>
          <FormField id="field-last_name" label="Last Name" required error={!!errors.last_name} errorText={errors.last_name}>
            <input className="fm-input" name="last_name" value={data.last_name} onChange={onChange('last_name')} placeholder="Dela Cruz" style={errors.last_name ? { borderColor: '#ef4444' } : undefined} />
          </FormField>
          <FormField id="field-first_name" label="First Name" required error={!!errors.first_name} errorText={errors.first_name}>
            <input className="fm-input" name="first_name" value={data.first_name} onChange={onChange('first_name')} placeholder="Juan" style={errors.first_name ? { borderColor: '#ef4444' } : undefined} />
          </FormField>
          <FormField label="Middle Name">
            <input className="fm-input" name="middle_name" value={data.middle_name} onChange={onChange('middle_name')} placeholder="Santos" />
          </FormField>
          <FormField label="Suffix">
            <input className="fm-input" name="suffix" value={data.suffix} onChange={onChange('suffix')} placeholder="Jr." />
          </FormField>
        </div>

        {/* Row 3: Sex (Kasarian) segmented cubes | Date of Birth */}
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

        {/* Row 4: Blood Type | Mother's Maiden Name */}
        <div className="fm-grid fm-grid--2" style={{ marginBottom: 14 }}>
          <FormField label="Blood Type">
            <select className="fm-select" name="blood_type" value={data.blood_type} onChange={onChange('blood_type')}>
              <option value="">— Select —</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Mother's Maiden Name">
            <input className="fm-input" name="mother_maiden_name" value={data.mother_maiden_name} onChange={onChange('mother_maiden_name')} placeholder="Last, First Middle" />
          </FormField>
        </div>

        {/* Row 5: Civil Status | Priority Category */}
        <div className="fm-grid fm-grid--2" style={{ marginBottom: 14 }}>
          <FormField label="Civil Status">
            <select className="fm-select" name="civil_status" value={data.civil_status} onChange={onChange('civil_status')}>
              <option value="">— Select —</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="widowed">Widowed</option>
              <option value="separated">Separated</option>
              <option value="annulled">Annulled</option>
              <option value="cohabitation">Co-Habitation</option>
            </select>
          </FormField>

          {showQueueFields && (
            <FormField id="field-queue_priority_group" label="Priority Category" required error={!!errors.queue_priority_group} errorText={errors.queue_priority_group}>
              <select className="fm-select" name="queue_priority_group" value={data.queue_priority_group} onChange={onChange('queue_priority_group')} style={errors.queue_priority_group ? { borderColor: '#ef4444' } : undefined}>
                <option value="normal">Normal</option>
                <option value="pregnant">Pregnant</option>
                <option value="senior">Senior Citizen</option>
                <option value="pwd">PWD</option>
              </select>
            </FormField>
          )}
        </div>

        {data.civil_status === 'married' && (
          <div className="registration-conditional" style={{ marginBottom: 14 }}>
            <FormField label="Spouse's Name">
              <input className="fm-input" name="spouse_name" value={data.spouse_name} onChange={onChange('spouse_name')} />
            </FormField>
          </div>
        )}
      </div>
    </div>
  );
}
