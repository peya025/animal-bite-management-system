import React from 'react';
import { FormField } from './FormField';
import type { EnrolmentFormData } from '../../../types';
import { useClinicModuleConfig } from '../../../../../hooks/useClinicModuleConfig';

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
            <select
              className="fm-select"
              name="educational_attainment"
              value={data.educational_attainment}
              onChange={onChange('educational_attainment')}
              style={errors.educational_attainment ? { borderColor: '#ef4444' } : undefined}
            >
              <option value="">— Select —</option>
              <option value="no_formal">No Formal Education</option>
              <option value="elementary">Elementary</option>
              <option value="high_school">High School</option>
              <option value="vocational">Vocational</option>
              <option value="college">College</option>
              <option value="post_graduate">Post Graduate</option>
              <option value="student">Student</option>
              <option value="unknown">Unknown</option>
            </select>
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
            <select
              className="fm-select"
              name="employment_status"
              value={data.employment_status}
              onChange={onChange('employment_status')}
              style={errors.employment_status ? { borderColor: '#ef4444' } : undefined}
            >
              <option value="">— Select —</option>
              <option value="employed">Employed</option>
              <option value="unemployed">None/Unemployed</option>
              <option value="self_employed">Self-Employed</option>
              <option value="retired">Retired</option>
              <option value="student">Student</option>
            </select>
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
            <select
              className="fm-select"
              name="family_member"
              value={data.family_member}
              onChange={onChange('family_member')}
              style={errors.family_member ? { borderColor: '#ef4444' } : undefined}
            >
              <option value="">— Select —</option>
              <option value="father">Father (Ama)</option>
              <option value="mother">Mother (Ina)</option>
              <option value="son">Son (Anak na Lalaki)</option>
              <option value="daughter">Daughter (Anak na Babae)</option>
              <option value="others">Others</option>
            </select>
          </FormField>
        )}
      </div>
    </div>
  );
}
