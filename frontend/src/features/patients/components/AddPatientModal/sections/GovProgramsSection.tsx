import React from 'react';
import { FormField } from './FormField';
import type { EnrolmentFormData } from '../../../types';

interface GovProgramsSectionProps {
  data: EnrolmentFormData;
  onChange: (key: keyof EnrolmentFormData) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export function GovProgramsSection({ data, onChange }: GovProgramsSectionProps) {
  const handleHasMembershipChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const val = ev.target.value;
    onChange('has_membership')(ev);
    if (val === 'no') {
      // Clear all details in the section
      const clearKeys: (keyof EnrolmentFormData)[] = [
        'philhealth_member', 'philhealth_status', 'philhealth_no', 'philhealth_category',
        'fourps_member', 'fourps_category', 'fourps_relationship', 'registered_fourps_beneficiary',
        'dswd_nhts', 'other_membership', 'other_membership_no', 'other_membership_name'
      ];
      clearKeys.forEach(k => {
        const fakeEv = { target: { value: k === 'other_membership' ? 'none' : '' } } as any;
        onChange(k)(fakeEv);
      });
    }
  };

  const handleFourpsCategoryChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    const val = ev.target.value;
    onChange('fourps_category')(ev);
    if (val !== 'Member of Beneficiary') {
      const fakeEv = { target: { value: '' } } as any;
      onChange('fourps_relationship')(fakeEv);
      onChange('registered_fourps_beneficiary')(fakeEv);
    }
  };

  // Derive selected program value based on individual database columns
  let selectedProgram = '';
  if (data.philhealth_member === 'yes') {
    selectedProgram = 'philhealth';
  } else if (data.fourps_member === 'yes') {
    selectedProgram = 'fourps';
  } else if (data.dswd_nhts === 'yes') {
    selectedProgram = 'dswd_nhts';
  } else if (data.other_membership && data.other_membership !== 'none') {
    selectedProgram = data.other_membership;
  }

  const handleProgramSelectionChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    const val = ev.target.value;
    
    // Clear all program details first
    const clearVals = {
      philhealth_member: 'no',
      philhealth_status: '',
      philhealth_no: '',
      philhealth_category: '',
      fourps_member: 'no',
      fourps_category: '',
      fourps_relationship: '',
      registered_fourps_beneficiary: '',
      dswd_nhts: 'no',
      other_membership: 'none',
      other_membership_name: '',
      other_membership_no: '',
    };
    
    // Apply selected program values
    if (val === 'philhealth') {
      clearVals.philhealth_member = 'yes';
    } else if (val === 'fourps') {
      clearVals.fourps_member = 'yes';
    } else if (val === 'dswd_nhts') {
      clearVals.dswd_nhts = 'yes';
    } else if (val && val !== 'none') {
      clearVals.other_membership = val;
    }
    
    // Trigger onChange for each key
    Object.entries(clearVals).forEach(([k, v]) => {
      const fakeEv = { target: { value: v } } as any;
      onChange(k as keyof EnrolmentFormData)(fakeEv);
    });
  };

  return (
    <div className="fm-section">
      <p className="fm-section-title">II. Government Program Information</p>
      
      <FormField label="Any Government Program / Other Membership?">
        <div className="fm-radio-group">
          <label className="fm-radio">
            <input 
              type="radio" 
              name="has_membership" 
              value="yes" 
              checked={data.has_membership === 'yes'} 
              onChange={handleHasMembershipChange} 
            /> Yes
          </label>
          <label className="fm-radio">
            <input 
              type="radio" 
              name="has_membership" 
              value="no" 
              checked={data.has_membership === 'no'} 
              onChange={handleHasMembershipChange} 
            /> No
          </label>
        </div>
      </FormField>

      {data.has_membership === 'yes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
          <FormField label="Select Government Program / Membership">
            <select className="fm-select" value={selectedProgram} onChange={handleProgramSelectionChange}>
              <option value="">— Select —</option>
              <option value="philhealth">PhilHealth</option>
              <option value="fourps">4Ps (Pantawid Pamilyang Pilipino Program)</option>
              <option value="dswd_nhts">DSWD NHTS (National Household Targeting System)</option>
              <option value="senior_citizen">Senior Citizen</option>
              <option value="pwd">PWD (Person with Disability)</option>
              <option value="indigenous_member">Indigenous Member</option>
              <option value="others">Others</option>
            </select>
          </FormField>

          {/* Conditional sub-fields based on selection */}
          {selectedProgram === 'philhealth' && (
            <div className="fm-grid fm-grid--3">
              <FormField label="Status Type">
                <select className="fm-select" value={data.philhealth_status} onChange={onChange('philhealth_status')}>
                  <option value="">— Select —</option>
                  <option value="member">Member</option>
                  <option value="dependent">Dependent</option>
                </select>
              </FormField>
              <FormField label="PhilHealth No.">
                <input className="fm-input" value={data.philhealth_no} onChange={onChange('philhealth_no')} maxLength={14} placeholder="XX-XXXXXXXXX-X" />
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
            </div>
          )}

          {selectedProgram === 'fourps' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FormField label="4Ps Membership Category">
                <select className="fm-select" value={data.fourps_category || ''} onChange={handleFourpsCategoryChange}>
                  <option value="">— Select —</option>
                  <option value="Beneficiary">Beneficiary</option>
                  <option value="Member of Beneficiary">Member of Beneficiary</option>
                </select>
              </FormField>
              {data.fourps_category === 'Member of Beneficiary' && (
                <div className="fm-grid fm-grid--2">
                  <FormField label="Registered 4Ps Beneficiary">
                    <select className="fm-select" value={data.registered_fourps_beneficiary || ''} onChange={onChange('registered_fourps_beneficiary')}>
                      <option value="">— Select —</option>
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                    </select>
                  </FormField>
                  <FormField label="Relationship to Registered 4Ps Beneficiary">
                    <select className="fm-select" value={data.fourps_relationship || ''} onChange={onChange('fourps_relationship')}>
                      <option value="">— Select —</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Son">Son</option>
                    </select>
                  </FormField>
                </div>
              )}
            </div>
          )}

          {selectedProgram === 'others' && (
            <div className="fm-grid fm-grid--2">
              <FormField label="Specify Membership Name">
                <input 
                  className="fm-input" 
                  value={data.other_membership_name || ''} 
                  onChange={onChange('other_membership_name')} 
                  maxLength={50}
                  placeholder="Enter membership name (e.g. Solo Parent)" 
                />
              </FormField>
              <FormField label="Membership ID / Certificate No.">
                <input 
                  className="fm-input" 
                  value={data.other_membership_no || ''} 
                  onChange={onChange('other_membership_no')} 
                  maxLength={50}
                  placeholder="Enter ID number / details" 
                />
              </FormField>
            </div>
          )}

          {selectedProgram && selectedProgram !== 'philhealth' && selectedProgram !== 'fourps' && selectedProgram !== 'dswd_nhts' && selectedProgram !== 'others' && (
            <FormField label={
              selectedProgram === 'senior_citizen' ? 'Senior Citizen ID No.' :
              selectedProgram === 'pwd' ? 'PWD ID No.' :
              'Tribe / IP ID No.'
            }>
              <input 
                className="fm-input" 
                value={data.other_membership_no || ''} 
                onChange={onChange('other_membership_no')} 
                maxLength={
                  selectedProgram === 'senior_citizen' ? 20 :
                  selectedProgram === 'pwd' ? 19 :
                  30
                }
                placeholder="Enter ID number / details" 
              />
            </FormField>
          )}
        </div>
      )}
    </div>
  );
}
