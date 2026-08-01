import React from 'react';
import { FormField } from './FormField';
import type { EnrolmentFormData } from '../../../types';

interface GovProgramsSectionProps {
  data: EnrolmentFormData;
  onChange: (key: keyof EnrolmentFormData) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export function GovProgramsSection({ data, onChange }: GovProgramsSectionProps) {
  return (
    <div className="fm-section">
      <p className="fm-section-title">II. Government Program Information</p>
      <div className="fm-grid fm-grid--2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="PhilHealth Member?">
            <div className="fm-radio-group">
              <label className="fm-radio">
                <input type="radio" name="ph_m" value="yes" checked={data.philhealth_member === 'yes'} onChange={onChange('philhealth_member')} /> Yes
              </label>
              <label className="fm-radio">
                <input type="radio" name="ph_m" value="no" checked={data.philhealth_member === 'no'} onChange={onChange('philhealth_member')} /> No
              </label>
            </div>
          </FormField>
          {data.philhealth_member === 'yes' && (
            <>
              <FormField label="Status Type">
                <div className="fm-radio-group">
                  <label className="fm-radio">
                    <input type="radio" name="ph_s" value="member" checked={data.philhealth_status === 'member'} onChange={onChange('philhealth_status')} /> Member
                  </label>
                  <label className="fm-radio">
                    <input type="radio" name="ph_s" value="dependent" checked={data.philhealth_status === 'dependent'} onChange={onChange('philhealth_status')} /> Dependent
                  </label>
                </div>
              </FormField>
              <FormField label="PhilHealth No.">
                <input className="fm-input" value={data.philhealth_no} onChange={onChange('philhealth_no')} placeholder="XX-XXXXXXXXX-X" />
              </FormField>
              <FormField label="Category">
                <select className="fm-select" value={data.philhealth_category} onChange={onChange('philhealth_category')}>
                  <option value="">— Select —</option>
                  <option value="fe_private">FE – Private</option>
                  <option value="fe_government">FE – Government</option>
                  <option value="ie">IE</option>
                  <option value="others">Others</option>
                </select>
              </FormField>
            </>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="4Ps Member?">
            <div className="fm-radio-group">
              <label className="fm-radio">
                <input type="radio" name="fourps" value="yes" checked={data.fourps_member === 'yes'} onChange={onChange('fourps_member')} /> Yes
              </label>
              <label className="fm-radio">
                <input type="radio" name="fourps" value="no" checked={data.fourps_member === 'no'} onChange={onChange('fourps_member')} /> No
              </label>
            </div>
          </FormField>
          <FormField label="DSWD NHTS?">
            <div className="fm-radio-group">
              <label className="fm-radio">
                <input type="radio" name="dswd" value="yes" checked={data.dswd_nhts === 'yes'} onChange={onChange('dswd_nhts')} /> Yes
              </label>
              <label className="fm-radio">
                <input type="radio" name="dswd" value="no" checked={data.dswd_nhts === 'no'} onChange={onChange('dswd_nhts')} /> No
              </label>
            </div>
          </FormField>
        </div>
      </div>
    </div>
  );
}
