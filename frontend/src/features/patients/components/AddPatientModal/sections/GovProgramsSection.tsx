import React, { useState, useEffect } from 'react';
import { FormField } from './FormField';
import type { EnrolmentFormData } from '../../../types';
import { formatPWDNumber } from '../../../../../shared/utils';

interface GovProgramsSectionProps {
  data: EnrolmentFormData;
  onChange: (key: keyof EnrolmentFormData) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onDirectChange: (key: keyof EnrolmentFormData, value: any) => void;
  errors?: Record<string, string>;
}

const PROGRAM_OPTIONS = [
  { value: 'philhealth', label: 'PhilHealth' },
  { value: 'fourps', label: '4Ps (Pantawid Pamilyang Pilipino Program)' },
  { value: 'dswd_nhts', label: 'DSWD NHTS (National Household Targeting System)' },
  { value: 'senior_citizen', label: 'Senior Citizen' },
  { value: 'pwd', label: 'PWD (Person with Disability)' },
  { value: 'indigenous_member', label: 'Indigenous Member (IP)' },
  { value: 'others', label: 'Others (Specify)' },
];

export function GovProgramsSection({ data, onChange, onDirectChange, errors = {} }: GovProgramsSectionProps) {
  // Derive current list of selected programs from data
  const getSelectedListFromData = (): string[] => {
    const list: string[] = [];
    if (data.philhealth_member === 'yes') list.push('philhealth');
    if (data.fourps_member === 'yes') list.push('fourps');
    if (data.dswd_nhts === 'yes') list.push('dswd_nhts');
    (data.other_memberships ?? []).forEach(m => {
      if (m && !list.includes(m)) list.push(m);
    });
    return list;
  };

  // Local state to keep track of active dropdown rows (including pending blank rows)
  const [rows, setRows] = useState<string[]>(() => {
    const existing = getSelectedListFromData();
    return existing.length > 0 ? existing : [''];
  });

  // Sync rows when data changes externally (e.g. edit modal loading)
  useEffect(() => {
    const existing = getSelectedListFromData();
    if (existing.length > 0) {
      setRows(existing);
    }
  }, [data.philhealth_member, data.fourps_member, data.dswd_nhts, data.other_memberships]);

  // Handle Yes / No toggle
  const handleHasMembershipChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const val = ev.target.value;
    onDirectChange('has_membership', val);

    if (val === 'no') {
      // Clear all membership data
      onDirectChange('philhealth_member', 'no');
      onDirectChange('philhealth_status', '');
      onDirectChange('philhealth_no', '');
      onDirectChange('philhealth_category', '');
      onDirectChange('fourps_member', 'no');
      onDirectChange('fourps_category', '');
      onDirectChange('fourps_relationship', '');
      onDirectChange('registered_fourps_beneficiary', '');
      onDirectChange('dswd_nhts', 'no');
      onDirectChange('other_membership', '');
      onDirectChange('other_memberships', []);
      onDirectChange('senior_citizen_id', '');
      onDirectChange('pwd_id', '');
      onDirectChange('indigenous_tribe', '');
      onDirectChange('other_membership_custom_name', '');
      onDirectChange('other_membership_custom_id', '');
      setRows(['']);
    } else {
      // If switching to yes and no rows exist, ensure at least one row
      if (rows.length === 0 || (rows.length === 1 && !rows[0])) {
        setRows(['']);
      }
    }
  };

  // Clear specific program data when unselected or changed
  const clearProgramData = (program: string) => {
    if (program === 'philhealth') {
      onDirectChange('philhealth_member', 'no');
      onDirectChange('philhealth_status', '');
      onDirectChange('philhealth_no', '');
      onDirectChange('philhealth_category', '');
    } else if (program === 'fourps') {
      onDirectChange('fourps_member', 'no');
      onDirectChange('fourps_category', '');
      onDirectChange('fourps_relationship', '');
      onDirectChange('registered_fourps_beneficiary', '');
    } else if (program === 'dswd_nhts') {
      onDirectChange('dswd_nhts', 'no');
    } else if (program === 'senior_citizen') {
      const remaining = (data.other_memberships ?? []).filter(m => m !== 'senior_citizen');
      onDirectChange('other_memberships', remaining);
      onDirectChange('senior_citizen_id', '');
    } else if (program === 'pwd') {
      const remaining = (data.other_memberships ?? []).filter(m => m !== 'pwd');
      onDirectChange('other_memberships', remaining);
      onDirectChange('pwd_id', '');
    } else if (program === 'indigenous_member') {
      const remaining = (data.other_memberships ?? []).filter(m => m !== 'indigenous_member');
      onDirectChange('other_memberships', remaining);
      onDirectChange('indigenous_tribe', '');
    } else if (program === 'others') {
      const remaining = (data.other_memberships ?? []).filter(m => m !== 'others');
      onDirectChange('other_memberships', remaining);
      onDirectChange('other_membership_custom_name', '');
      onDirectChange('other_membership_custom_id', '');
    }
  };

  // Apply specific program activation when selected
  const activateProgramData = (program: string) => {
    if (program === 'philhealth') {
      onDirectChange('philhealth_member', 'yes');
    } else if (program === 'fourps') {
      onDirectChange('fourps_member', 'yes');
    } else if (program === 'dswd_nhts') {
      onDirectChange('dswd_nhts', 'yes');
    } else if (['senior_citizen', 'pwd', 'indigenous_member', 'others'].includes(program)) {
      const current = data.other_memberships ?? [];
      if (!current.includes(program)) {
        onDirectChange('other_memberships', [...current, program]);
      }
    }
  };

  // Handle changing dropdown selection for row `index`
  const handleProgramSelectChange = (index: number, newProg: string) => {
    const oldProg = rows[index];
    if (oldProg && oldProg !== newProg) {
      clearProgramData(oldProg);
    }
    if (newProg) {
      activateProgramData(newProg);
    }

    const updatedRows = [...rows];
    updatedRows[index] = newProg;
    setRows(updatedRows);
  };

  // Add another membership row
  const handleAddRow = () => {
    setRows(prev => [...prev, '']);
  };

  // Remove a membership row
  const handleRemoveRow = (index: number) => {
    const progToRemove = rows[index];
    if (progToRemove) {
      clearProgramData(progToRemove);
    }
    const updatedRows = rows.filter((_, i) => i !== index);
    setRows(updatedRows.length > 0 ? updatedRows : ['']);

    // If all removed, keep a blank row
    if (updatedRows.filter(Boolean).length === 0) {
      setRows(['']);
    }
  };

  const handleFourpsCategoryChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
    const val = ev.target.value;
    onChange('fourps_category')(ev);
    if (val !== 'Member of Beneficiary') {
      onDirectChange('fourps_relationship', '');
      onDirectChange('registered_fourps_beneficiary', '');
    }
  };

  const isYes = data.has_membership === 'yes' || (data.has_membership !== 'no' && rows.some(Boolean));
  const isNo = data.has_membership === 'no';
  const activeCount = rows.filter(Boolean).length;
  const canAddMore = rows.length < PROGRAM_OPTIONS.length && !rows.includes('');

  return (
    <div className="fm-section">
      <p className="fm-section-title">II. Government Program Information</p>
      
      {/* ── Yes / No Radio Choices ── */}
      <FormField label="Any Government Program / Other Membership?">
        <div className="fm-radio-group" style={{ display: 'flex', gap: 20, marginTop: 4 }}>
          <label className="fm-radio" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13.5 }}>
            <input 
              type="radio" 
              name="has_membership" 
              value="yes" 
              checked={isYes} 
              onChange={handleHasMembershipChange} 
              style={{ accentColor: '#10b981', cursor: 'pointer' }}
            /> 
            Yes
          </label>
          <label className="fm-radio" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13.5 }}>
            <input 
              type="radio" 
              name="has_membership" 
              value="no" 
              checked={isNo} 
              onChange={handleHasMembershipChange} 
              style={{ accentColor: '#10b981', cursor: 'pointer' }}
            /> 
            No
          </label>
        </div>
      </FormField>

      {/* ── If Yes: Dynamic Membership Dropdowns & Subfields ── */}
      {isYes && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          {/* Two-Column Grid for Membership Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
            gap: 16,
            alignItems: 'start'
          }}>
            {rows.map((selectedProgram, index) => {
              // Options that are already selected in other rows
              const otherSelected = rows.filter((p, i) => i !== index && Boolean(p));

              return (
                <div 
                  key={`membership-row-${index}`} 
                  style={{ 
                    border: '1.5px solid #d1fae5', 
                    borderRadius: 10, 
                    padding: 16, 
                    background: '#f9fdfa',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                {/* Header row with Program Dropdown + Remove button */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <FormField label={`Membership ${rows.length > 1 ? `#${index + 1}` : ''}`}>
                      <select 
                        className="fm-select" 
                        value={selectedProgram} 
                        onChange={(e) => handleProgramSelectChange(index, e.target.value)}
                        style={{ fontWeight: selectedProgram ? 600 : 400 }}
                      >
                        <option value="">— Select Government Program / Membership —</option>
                        {PROGRAM_OPTIONS.map(opt => {
                          const isAlreadyChosen = otherSelected.includes(opt.value);
                          return (
                            <option 
                              key={opt.value} 
                              value={opt.value}
                              disabled={isAlreadyChosen}
                            >
                              {opt.label} {isAlreadyChosen ? '(Already added)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </FormField>
                  </div>

                  {/* Remove Button */}
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      title="Remove this membership"
                      style={{
                        marginTop: 24,
                        padding: '7px 12px',
                        borderRadius: 6,
                        border: '1px solid #fecaca',
                        background: '#fff',
                        color: '#dc2626',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      Remove
                    </button>
                  )}
                </div>

                {/* ── Sub-fields conditional on selectedProgram ── */}
                {selectedProgram === 'philhealth' && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div className="fm-grid fm-grid--2">
                        <FormField label="Status Type">
                          <select className="fm-select" value={data.philhealth_status} onChange={onChange('philhealth_status')}>
                            <option value="">— Select —</option>
                            <option value="member">Member</option>
                            <option value="dependent">Dependent</option>
                          </select>
                        </FormField>
                        <FormField
                          id="field-philhealth_no"
                          label="PhilHealth No."
                          error={!!errors.philhealth_no}
                          errorText={errors.philhealth_no}
                        >
                          <input
                            className="fm-input"
                            value={data.philhealth_no}
                            onChange={onChange('philhealth_no')}
                            maxLength={14}
                            placeholder="XX-XXXXXXXXX-X"
                            style={errors.philhealth_no ? { borderColor: '#ef4444' } : undefined}
                          />
                        </FormField>
                      </div>
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
                  </div>
                )}

                {selectedProgram === 'fourps' && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                  </div>
                )}

                {selectedProgram === 'dswd_nhts' && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 13, color: '#065f46', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>✓</span> Enrolled under DSWD NHTS (National Household Targeting System)
                  </div>
                )}

                {selectedProgram === 'senior_citizen' && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
                    <FormField label="Senior Citizen ID No.">
                      <input
                        className="fm-input"
                        value={data.senior_citizen_id}
                        onChange={onChange('senior_citizen_id')}
                        maxLength={20}
                        placeholder="Enter Senior Citizen ID number"
                      />
                    </FormField>
                  </div>
                )}

                {selectedProgram === 'pwd' && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
                    <FormField
                      id="field-pwd_id"
                      label="PWD ID No."
                      error={!!errors.pwd_id || !!errors.other_membership_no}
                      errorText={errors.pwd_id || errors.other_membership_no}
                    >
                      <input
                        className="fm-input"
                        value={data.pwd_id}
                        onChange={e => {
                          const formatted = formatPWDNumber(e.target.value);
                          onDirectChange('pwd_id', formatted);
                        }}
                        maxLength={23}
                        placeholder="XX-XXXX-XXXXXXXXXX-XXXXX"
                        style={(errors.pwd_id || errors.other_membership_no) ? { borderColor: '#ef4444' } : undefined}
                      />
                    </FormField>
                  </div>
                )}

                {selectedProgram === 'indigenous_member' && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
                    <FormField label="Tribe / Ethnicity">
                      <input
                        className="fm-input"
                        value={data.indigenous_tribe}
                        onChange={onChange('indigenous_tribe')}
                        maxLength={50}
                        placeholder="Enter tribe or ethnicity (e.g. Higaonon)"
                      />
                    </FormField>
                  </div>
                )}

                {selectedProgram === 'others' && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
                    <div className="fm-grid fm-grid--2">
                      <FormField label="Specify Membership Name">
                        <input
                          className="fm-input"
                          value={data.other_membership_custom_name}
                          onChange={onChange('other_membership_custom_name')}
                          maxLength={50}
                          placeholder="e.g. Solo Parent, Farmer's Association"
                        />
                      </FormField>
                      <FormField label="Membership ID / Certificate No.">
                        <input
                          className="fm-input"
                          value={data.other_membership_custom_id}
                          onChange={onChange('other_membership_custom_id')}
                          maxLength={50}
                          placeholder="Enter ID number / details"
                        />
                      </FormField>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>

          {/* ── Button to Add Next / Another Membership ── */}
          {canAddMore && (
            <button
              type="button"
              onClick={handleAddRow}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 16px',
                border: '1.5px dashed #10b981',
                borderRadius: 8,
                background: '#f0fdf4',
                color: '#047857',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#d1fae5'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f0fdf4'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              + Add Another Membership
            </button>
          )}

          {/* ── Selected summary badge ── */}
          {activeCount > 0 && (
            <div style={{ marginTop: 4, padding: '8px 14px', background: '#d1fae5', borderRadius: 8, fontSize: 12.5, color: '#065f46', fontWeight: 600 }}>
              ✓ Total memberships selected ({activeCount}): {[
                data.philhealth_member === 'yes' && 'PhilHealth',
                data.fourps_member === 'yes' && '4Ps',
                data.dswd_nhts === 'yes' && 'DSWD NHTS',
                (data.other_memberships ?? []).includes('senior_citizen') && 'Senior Citizen',
                (data.other_memberships ?? []).includes('pwd') && 'PWD',
                (data.other_memberships ?? []).includes('indigenous_member') && 'Indigenous Member',
                (data.other_memberships ?? []).includes('others') && (data.other_membership_custom_name || 'Others'),
              ].filter(Boolean).join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}




