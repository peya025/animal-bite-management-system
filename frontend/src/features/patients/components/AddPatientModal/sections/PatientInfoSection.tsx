import React from 'react';
import { FormField } from './FormField';
import type { EnrolmentFormData } from '../../../types';

interface PatientInfoSectionProps {
  data: EnrolmentFormData;
  onChange: (key: keyof EnrolmentFormData) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  errors?: Record<string, string>;
  showQueueFields?: boolean;
}

export function PatientInfoSection({ data, onChange, errors = {}, showQueueFields = false }: PatientInfoSectionProps) {
  return (
    <div className="fm-section">
      <p className="fm-section-title">I. Patient Information</p>

      <div className="fm-grid fm-grid--4" style={{ marginBottom: 14 }}>
        <FormField id="field-last_name" label="Last Name" required error={!!errors.last_name} errorText={errors.last_name}>
          <input className="fm-input" value={data.last_name} onChange={onChange('last_name')} placeholder="Dela Cruz" style={errors.last_name ? { borderColor: '#ef4444' } : undefined} />
        </FormField>
        <FormField id="field-first_name" label="First Name" required error={!!errors.first_name} errorText={errors.first_name}>
          <input className="fm-input" value={data.first_name} onChange={onChange('first_name')} placeholder="Juan" style={errors.first_name ? { borderColor: '#ef4444' } : undefined} />
        </FormField>
        <FormField label="Middle Name">
          <input className="fm-input" value={data.middle_name} onChange={onChange('middle_name')} placeholder="Santos" />
        </FormField>
        <FormField label="Suffix">
          <input className="fm-input" value={data.suffix} onChange={onChange('suffix')} placeholder="Jr." />
        </FormField>
      </div>

      <div className="fm-grid fm-grid--3" style={{ marginBottom: 14 }}>
        <FormField id="field-sex" label="Sex (Kasarian)" required error={!!errors.sex} errorText={errors.sex}>
          <div className="fm-radio-group" style={{ paddingTop: 4 }}>
            <label className="fm-radio">
              <input type="radio" name="sex" value="female" checked={data.sex === 'female'} onChange={onChange('sex')} /> Female
            </label>
            <label className="fm-radio">
              <input type="radio" name="sex" value="male" checked={data.sex === 'male'} onChange={onChange('sex')} /> Male
            </label>
          </div>
        </FormField>
        <FormField id="field-date_of_birth" label="Date of Birth" required error={!!errors.date_of_birth} errorText={errors.date_of_birth}>
          <input className="fm-input" type="date" value={data.date_of_birth} onChange={onChange('date_of_birth')} style={errors.date_of_birth ? { borderColor: '#ef4444' } : undefined} />
        </FormField>
        <FormField label="Blood Type">
          <select className="fm-select" value={data.blood_type} onChange={onChange('blood_type')}>
            <option value="">— Select —</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="fm-grid fm-grid--2" style={{ marginBottom: 14 }}>
        <FormField label="Mother's Maiden Name">
          <input className="fm-input" value={data.mother_maiden_name} onChange={onChange('mother_maiden_name')} placeholder="Last, First Middle" />
        </FormField>
        <FormField label="Civil Status">
          <select className="fm-select" value={data.civil_status} onChange={onChange('civil_status')}>
            <option value="">— Select —</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="widowed">Widowed</option>
            <option value="separated">Separated</option>
            <option value="annulled">Annulled</option>
            <option value="cohabitation">Co-Habitation</option>
          </select>
        </FormField>
      </div>

      {showQueueFields && (
        <div className="fm-grid fm-grid--4" style={{ marginBottom: 14 }}>
          <FormField id="field-visit_type" label="Visit Type" required error={!!errors.visit_type} errorText={errors.visit_type}>
            <select className="fm-select" value={data.visit_type} onChange={onChange('visit_type')} style={errors.visit_type ? { borderColor: '#ef4444' } : undefined}>
              <option value="new_case">New Case</option>
              <option value="follow_up">Follow Up</option>
            </select>
          </FormField>
          <FormField id="field-follow_up_date" label="Follow-up Date" required={data.visit_type === 'follow_up'} error={!!errors.follow_up_date} errorText={errors.follow_up_date}>
            <input className="fm-input" type="date" value={data.follow_up_date} onChange={onChange('follow_up_date')} disabled={data.visit_type !== 'follow_up'} style={errors.follow_up_date ? { borderColor: '#ef4444' } : undefined} />
          </FormField>
          <FormField id="field-queue_priority_group" label="Queue Category" required error={!!errors.queue_priority_group} errorText={errors.queue_priority_group}>
            <select className="fm-select" value={data.queue_priority_group} onChange={onChange('queue_priority_group')} style={errors.queue_priority_group ? { borderColor: '#ef4444' } : undefined}>
              <option value="normal">Normal</option>
              <option value="pregnant">Pregnant</option>
              <option value="senior">Senior Citizen</option>
              <option value="pwd">PWD</option>
            </select>
          </FormField>
          <FormField id="field-queue_priority_level" label="Priority" required error={!!errors.queue_priority_level} errorText={errors.queue_priority_level}>
            <select
              className="fm-select"
              value={data.queue_priority_level}
              onChange={onChange('queue_priority_level')}
              disabled={data.queue_priority_group !== 'normal'}
              style={errors.queue_priority_level ? { borderColor: '#ef4444' } : undefined}
            >
              <option value="normal">Normal</option>
              <option value="priority">Priority</option>
            </select>
          </FormField>
        </div>
      )}

      {data.civil_status === 'married' && (
        <div style={{ marginBottom: 14 }}>
          <FormField label="Spouse's Name">
            <input className="fm-input" value={data.spouse_name} onChange={onChange('spouse_name')} />
          </FormField>
        </div>
      )}
    </div>
  );
}
