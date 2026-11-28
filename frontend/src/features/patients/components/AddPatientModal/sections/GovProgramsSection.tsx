import React, { useState, useEffect } from 'react';
import { FormField } from './FormField';
import { SearchableSelect, createSelectChangeEvent } from '../../../../../shared/components';
import type { EnrolmentFormData } from '../../../types';
import { formatPWDNumber } from '../../../../../shared/utils';
import { useClinicModuleConfig } from '../../../../../hooks/useClinicModuleConfig';

const PHILHEALTH_STATUS_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'dependent', label: 'Dependent' },
];

const PHILHEALTH_CATEGORY_OPTIONS = [
  { value: 'fe_private', label: 'FE – Private' },
  { value: 'fe_government', label: 'FE – Government' },
  { value: 'ie', label: 'IE' },
  { value: 'others', label: 'Others' },
];

const FOURPS_CATEGORY_OPTIONS = [
  { value: 'Beneficiary', label: 'Beneficiary' },
  { value: 'Member of Beneficiary', label: 'Member of Beneficiary' },
];

const FOURPS_BENEFICIARY_OPTIONS = [
  { value: 'Mother', label: 'Mother' },
  { value: 'Father', label: 'Father' },
];

const FOURPS_RELATIONSHIP_OPTIONS = [
  { value: 'Daughter', label: 'Daughter' },
  { value: 'Son', label: 'Son' },
];

const emitSelectEvent = createSelectChangeEvent;

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
  const { isFieldVisible, isFieldRequired, isSectionEnabled } = useClinicModuleConfig();

  if (!isSectionEnabled('gov_programs_section_enabled')) {
    return null;
  }

  const availablePrograms = PROGRAM_OPTIONS.filter(opt => {
    if (opt.value === 'philhealth') return isFieldVisible('philhealth_member');
    if (opt.value === 'fourps') return isFieldVisible('fourps_member');
    if (opt.value === 'dswd_nhts') return isFieldVisible('dswd_nhts');
    return true;
  });
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
      <h3 className="fm-section-title">II. Government Program Information</h3>
      
      {/* ── Yes / No Segmented Pill Choices ── */}
      <FormField label="Any Government Program / Other Membership?">
        <div className="fm-segmented-group" style={{ marginTop: 4 }}>
          <label className={`fm-segmented-option ${isYes ? 'fm-segmented-option--selected' : ''}`}>
            <input
              type="radio"
              name="has_membership"
              value="yes"
              checked={isYes}
              onChange={handleHasMembershipChange}
            />
            Yes
          </label>
          <label className={`fm-segmented-option ${isNo ? 'fm-segmented-option--selected' : ''}`}>
            <input
              type="radio"
              name="has_membership"
              value="no"
              checked={isNo}
              onChange={handleHasMembershipChange}
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <FormField label={`Membership ${rows.length > 1 ? `#${index + 1}` : ''}`}>
                      <SearchableSelect
                        name={`membership-${index}`}
                        value={selectedProgram}
                        placeholder="— Select Government Program / Membership —"
                        searchPlaceholder="Search program..."
                        options={availablePrograms.map((opt) => {
                          const isAlreadyChosen = otherSelected.includes(opt.value);
                          return {
                            value: opt.value,
                            label: `${opt.label}${isAlreadyChosen ? ' (Already added)' : ''}`,
                            disabled: isAlreadyChosen,
                          };
                        })}
                        onChange={(val) => handleProgramSelectChange(index, val)}
                        style={{ fontWeight: selectedProgram ? 600 : 400 }}
                      />
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
                  <div className="registration-program-card" style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div className="fm-grid fm-grid--2">
                        {isFieldVisible('philhealth_status') && (
                          <FormField label="Status Type" required={isFieldRequired('philhealth_status')}>
                            <SearchableSelect
                              name="philhealth_status"
                              value={data.philhealth_status}
                              options={PHILHEALTH_STATUS_OPTIONS}
                              placeholder="— Select —"
                              searchPlaceholder="Search status type..."
                              onChange={(val) => onChange('philhealth_status')(emitSelectEvent('philhealth_status', val))}
                            />
                          </FormField>
                        )}
                        {isFieldVisible('philhealth_no') && (
                          <FormField
                            id="field-philhealth_no"
                            label="PhilHealth No."
                            required={isFieldRequired('philhealth_no')}
                            error={!!errors.philhealth_no}
                            errorText={errors.philhealth_no}
                          >
                            <input
                              className="fm-input"
                              name="philhealth_no" value={data.philhealth_no}
                              onChange={onChange('philhealth_no')}
                              maxLength={14}
                              placeholder="XX-XXXXXXXXX-X"
                              style={errors.philhealth_no ? { borderColor: '#ef4444' } : undefined}
                            />
                          </FormField>
                        )}
                      </div>
                      {isFieldVisible('philhealth_category') && (
                        <FormField label="Category" required={isFieldRequired('philhealth_category')}>
                          <SearchableSelect
                            name="philhealth_category"
                            value={data.philhealth_category}
                            options={PHILHEALTH_CATEGORY_OPTIONS}
                            placeholder="— Select —"
                            searchPlaceholder="Search category..."
                            onChange={(val) => onChange('philhealth_category')(emitSelectEvent('philhealth_category', val))}
                          />
                        </FormField>
                      )}
                    </div>
                  </div>
                )}

                {selectedProgram === 'fourps' && (
                  <div className="registration-program-card" style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <FormField label="4Ps Membership Category">
                        <SearchableSelect
                          name="fourps_category"
                          value={data.fourps_category || ''}
                          options={FOURPS_CATEGORY_OPTIONS}
                          placeholder="— Select —"
                          searchPlaceholder="Search 4Ps category..."
                          onChange={(val) => handleFourpsCategoryChange(emitSelectEvent('fourps_category', val))}
                        />
                      </FormField>
                      {data.fourps_category === 'Member of Beneficiary' && (
                        <div className="fm-grid fm-grid--2">
                          <FormField label="Registered 4Ps Beneficiary">
                            <SearchableSelect
                              name="registered_fourps_beneficiary"
                              value={data.registered_fourps_beneficiary || ''}
                              options={FOURPS_BENEFICIARY_OPTIONS}
                              placeholder="— Select —"
                              searchPlaceholder="Search beneficiary..."
                              onChange={(val) => onChange('registered_fourps_beneficiary')(emitSelectEvent('registered_fourps_beneficiary', val))}
                            />
                          </FormField>
                          <FormField label="Relationship to Registered 4Ps Beneficiary">
                            <SearchableSelect
                              name="fourps_relationship"
                              value={data.fourps_relationship || ''}
                              options={FOURPS_RELATIONSHIP_OPTIONS}
                              placeholder="— Select —"
                              searchPlaceholder="Search relationship..."
                              onChange={(val) => onChange('fourps_relationship')(emitSelectEvent('fourps_relationship', val))}
                            />
                          </FormField>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedProgram === 'dswd_nhts' && (
                  <div className="registration-program-card" style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 13, color: '#065f46', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>✓</span> Enrolled under DSWD NHTS (National Household Targeting System)
                  </div>
                )}

                {selectedProgram === 'senior_citizen' && (
                  <div className="registration-program-card" style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
                    <FormField label="Senior Citizen ID No.">
                      <input
                        className="fm-input"
                        name="senior_citizen_id" value={data.senior_citizen_id}
                        onChange={onChange('senior_citizen_id')}
                        maxLength={20}
                        placeholder="Enter Senior Citizen ID number"
                      />
                    </FormField>
                  </div>
                )}

                {selectedProgram === 'pwd' && (
                  <div className="registration-program-card" style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
                    <FormField
                      id="field-pwd_id"
                      label="PWD ID No."
                      error={!!errors.pwd_id || !!errors.other_membership_no}
                      errorText={errors.pwd_id || errors.other_membership_no}
                    >
                      <input
                        className="fm-input"
                        name="pwd_id" value={data.pwd_id}
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
                  <div className="registration-program-card" style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
                    <FormField label="Tribe / Ethnicity">
                      <input
                        className="fm-input"
                        name="indigenous_tribe" value={data.indigenous_tribe}
                        onChange={onChange('indigenous_tribe')}
                        maxLength={50}
                        placeholder="Enter tribe or ethnicity (e.g. Higaonon)"
                      />
                    </FormField>
                  </div>
                )}

                {selectedProgram === 'others' && (
                  <div className="registration-program-card" style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
                    <div className="fm-grid fm-grid--2">
                      <FormField label="Specify Membership Name">
                        <input
                          className="fm-input"
                          name="other_membership_custom_name" value={data.other_membership_custom_name}
                          onChange={onChange('other_membership_custom_name')}
                          maxLength={50}
                          placeholder="e.g. Solo Parent, Farmer's Association"
                        />
                      </FormField>
                      <FormField label="Membership ID / Certificate No.">
                        <input
                          className="fm-input"
                          name="other_membership_custom_id" value={data.other_membership_custom_id}
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




