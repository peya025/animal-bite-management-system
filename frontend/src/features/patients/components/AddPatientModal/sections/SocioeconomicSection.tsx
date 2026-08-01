import React from 'react';
import { FormField } from './FormField';
import type { EnrolmentFormData } from '../../../types';

interface SocioeconomicSectionProps {
  data: EnrolmentFormData;
  onChange: (key: keyof EnrolmentFormData) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export function SocioeconomicSection({ data, onChange }: SocioeconomicSectionProps) {
  return (
    <div className="fm-section">
      <p className="fm-section-title">Socioeconomic Information</p>
      <div className="fm-grid fm-grid--3" style={{ marginBottom: 14 }}>
        <FormField label="Educational Attainment">
          <select className="fm-select" value={data.educational_attainment} onChange={onChange('educational_attainment')}>
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
        <FormField label="Employment Status">
          <select className="fm-select" value={data.employment_status} onChange={onChange('employment_status')}>
            <option value="">— Select —</option>
            <option value="employed">Employed</option>
            <option value="unemployed">None/Unemployed</option>
            <option value="self_employed">Self-Employed</option>
            <option value="retired">Retired</option>
            <option value="student">Student</option>
          </select>
        </FormField>
        <FormField label="Family Member Position">
          <select className="fm-select" value={data.family_member} onChange={onChange('family_member')}>
            <option value="">— Select —</option>
            <option value="father">Father (Ama)</option>
            <option value="mother">Mother (Ina)</option>
            <option value="son">Son (Anak na Lalaki)</option>
            <option value="daughter">Daughter (Anak na Babae)</option>
            <option value="others">Others</option>
          </select>
        </FormField>
      </div>
    </div>
  );
}
