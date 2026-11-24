import React from 'react';
import { FormField } from './FormField';
import { SearchableSelect, createSelectChangeEvent } from '../../../../../shared/components';
import type { EnrolmentFormData } from '../../../types';
import { useClinicModuleConfig } from '../../../../../hooks/useClinicModuleConfig';

const EDUCATIONAL_ATTAINMENT_OPTIONS = [
  { value: 'no_formal', label: 'No Formal Education' },
  { value: 'elementary', label: 'Elementary' },
  { value: 'high_school', label: 'High School' },
  { value: 'vocational', label: 'Vocational' },
  { value: 'college', label: 'College' },
  { value: 'post_graduate', label: 'Post Graduate' },
  { value: 'student', label: 'Student' },
  { value: 'unknown', label: 'Unknown' },
];

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'employed', label: 'Employed' },
  { value: 'unemployed', label: 'None/Unemployed' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'retired', label: 'Retired' },
  { value: 'student', label: 'Student' },
];

const FAMILY_MEMBER_OPTIONS = [
  { value: 'father', label: 'Father (Ama)' },
  { value: 'mother', label: 'Mother (Ina)' },
  { value: 'son', label: 'Son (Anak na Lalaki)' },
  { value: 'daughter', label: 'Daughter (Anak na Babae)' },
  { value: 'others', label: 'Others' },
];

const emitSelectEvent = createSelectChangeEvent;

interface SocioeconomicSectionProps {
  data: EnrolmentFormData;
  onChange: (key: keyof EnrolmentFormData) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  errors?: Record<string, string>;
}

export function SocioeconomicSection({ data, onChange, errors = {} }: SocioeconomicSectionProps) {
  const { isFieldVisible, isFieldRequired, isSectionEnabled } = useClinicModuleConfig();

  if (!isSectionEnabled('socioeconomic_section_enabled')) {
    return null;
  }

  const showEducation = isFieldVisible('educational_attainment');
  const showEmployment = isFieldVisible('employment_status');
  const showFamily = isFieldVisible('family_member');

  if (!showEducation && !showEmployment && !showFamily) {
    return null;
  }

  return (
    <div className="fm-section">
      <h3 className="fm-section-title">Socioeconomic Information</h3>
      <div className="fm-grid fm-grid--3" style={{ marginBottom: 14 }}>
        {showEducation && (
          <FormField
            id="field-educational_attainment"
            label="Educational Attainment"
            required={isFieldRequired('educational_attainment')}
            error={!!errors.educational_attainment}
            errorText={errors.educational_attainment}
          >
            <SearchableSelect
              name="educational_attainment"
              value={data.educational_attainment}
              options={EDUCATIONAL_ATTAINMENT_OPTIONS}
              placeholder="— Select —"
              searchPlaceholder="Search education..."
              onChange={(val) => onChange('educational_attainment')(emitSelectEvent('educational_attainment', val))}
            />
          </FormField>
        )}

        {showEmployment && (
          <FormField
            id="field-employment_status"
            label="Employment Status"
            required={isFieldRequired('employment_status')}
            error={!!errors.employment_status}
            errorText={errors.employment_status}
          >
            <SearchableSelect
              name="employment_status"
              value={data.employment_status}
              options={EMPLOYMENT_STATUS_OPTIONS}
              placeholder="— Select —"
              searchPlaceholder="Search employment status..."
              onChange={(val) => onChange('employment_status')(emitSelectEvent('employment_status', val))}
            />
          </FormField>
        )}

        {showFamily && (
          <FormField
            id="field-family_member"
            label="Family Member Position"
            required={isFieldRequired('family_member')}
            error={!!errors.family_member}
            errorText={errors.family_member}
          >
            <SearchableSelect
              name="family_member"
              value={data.family_member}
              options={FAMILY_MEMBER_OPTIONS}
              placeholder="— Select —"
              searchPlaceholder="Search family position..."
              onChange={(val) => onChange('family_member')(emitSelectEvent('family_member', val))}
            />
          </FormField>
        )}
      </div>
    </div>
  );
}
