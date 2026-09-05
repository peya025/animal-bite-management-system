import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clinicConfigApi } from '../../../services/clinicConfigApi';
import { ROUTES } from '../../../shared/config/routes';
import { Icon } from '../../../shared/components/ui/Icon';
import type { ClinicModuleConfig, FieldRuleValue } from '../../../types';
import '../../developer/styles/DeveloperDatabaseExplorer.css';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';

interface FieldConfig {
  key: keyof ClinicModuleConfig['field_rules'];
  label: string;
  description: string;
}

interface FieldSection {
  title: string;
  icon: string;
  description: string;
  fields: FieldConfig[];
}

const FIELD_SECTIONS: FieldSection[] = [
  {
    title: 'Patient Registration',
    icon: 'users',
    description: 'Basic patient information and demographics',
    fields: [
      { key: 'blood_type', label: 'Blood Type', description: 'Patient blood type (A+, B+, O+, etc.)' },
      { key: 'mother_maiden_name', label: 'Mother\'s Maiden Name', description: 'Mother\'s maiden name for identification' },
      { key: 'civil_status', label: 'Civil Status', description: 'Marital status (single, married, etc.)' },
      { key: 'spouse_name', label: 'Spouse Name', description: 'Name of spouse if married' },
    ],
  },
  {
    title: 'Address Information',
    icon: 'location',
    description: 'Patient address breakdown (PSGC codes)',
    fields: [
      { key: 'address_municipality', label: 'Municipality', description: 'Municipality/City where patient resides' },
      { key: 'address_barangay', label: 'Barangay', description: 'Barangay where patient resides' },
      { key: 'address_purok', label: 'Purok/Sitio', description: 'Purok or Sitio within barangay' },
      { key: 'province', label: 'Province', description: 'Province (default: Misamis Oriental)' },
    ],
  },
  {
    title: 'Socioeconomic Information',
    icon: 'info',
    description: 'Educational and employment details',
    fields: [
      { key: 'educational_attainment', label: 'Educational Attainment', description: 'Highest education level completed' },
      { key: 'employment_status', label: 'Employment Status', description: 'Current employment situation' },
      { key: 'family_member', label: 'Family Member', description: 'Number of family members or household size' },
    ],
  },
  {
    title: 'Government Programs',
    icon: 'shield',
    description: 'PhilHealth, 4Ps, and DSWD-NHTS membership',
    fields: [
      { key: 'philhealth_member', label: 'PhilHealth Member', description: 'Is patient a PhilHealth member? (Yes/No)' },
      { key: 'philhealth_status', label: 'PhilHealth Status', description: 'Member or Dependent status' },
      { key: 'philhealth_no', label: 'PhilHealth Number', description: 'PhilHealth membership number' },
      { key: 'philhealth_category', label: 'PhilHealth Category', description: 'PhilHealth membership category' },
      { key: 'fourps_member', label: '4Ps Member', description: 'Pantawid Pamilya (4Ps) beneficiary status' },
      { key: 'dswd_nhts', label: 'DSWD-NHTS', description: 'DSWD National Household Targeting System' },
    ],
  },
  {
    title: 'Bite Incident Intake',
    icon: 'warning',
    description: 'Initial bite incident information from mobile app',
    fields: [
      { key: 'bite_date', label: 'Bite Date', description: 'Date when bite incident occurred' },
      { key: 'bite_place', label: 'Bite Place', description: 'Location where bite happened' },
      { key: 'site_washed', label: 'Site Washed', description: 'Was wound washed before clinic visit?' },
      { key: 'exposure_type', label: 'Exposure Type', description: 'Type: Bite, Scratch, Lick, or Other' },
      { key: 'animal_type', label: 'Animal Type', description: 'Type of animal involved (dog, cat, etc.)' },
      { key: 'animal_status', label: 'Animal Status', description: 'Owned, Stray, or Unknown' },
      { key: 'animal_captured', label: 'Animal Captured', description: 'Was the animal captured/contained?' },
      { key: 'wound_location', label: 'Wound Location', description: 'Body part where wound is located' },
      { key: 'patient_description', label: 'Patient Description', description: 'Additional patient-provided details' },
    ],
  },
  {
    title: 'Triage & Assessment',
    icon: 'activity',
    description: 'Triage doctor assessment and classification',
    fields: [
      { key: 'exposure_category', label: 'Exposure Category', description: 'WHO Category I, II, or III classification' },
      { key: 'bite_site', label: 'Bite Site', description: 'Specific anatomical location of bite' },
      { key: 'animal_observation_status', label: 'Animal Observation', description: 'Animal status: Alive/Healthy, Sick, Dead, Unknown' },
      { key: 'treatment_given', label: 'Treatment Given', description: 'Initial treatment provided during triage' },
    ],
  },
  {
    title: 'Treatment & Vaccination',
    icon: 'medical',
    description: 'Vaccine administration and treatment details',
    fields: [
      { key: 'protocol_type', label: 'Protocol Type', description: 'Standard, Accelerated, or Modified protocol' },
      { key: 'route', label: 'Administration Route', description: 'IM (Intramuscular), SC (Subcutaneous), ID (Intradermal)' },
      { key: 'injection_site', label: 'Injection Site', description: 'Body site of injection (arm, thigh, etc.)' },
      { key: 'dosage_ml', label: 'Dosage (ml)', description: 'Vaccine dosage in milliliters' },
      { key: 'vaccine_brand', label: 'Vaccine Brand', description: 'Brand name of vaccine used' },
      { key: 'vaccine_generic', label: 'Vaccine Generic', description: 'Generic name of vaccine' },
      { key: 'batch_no', label: 'Batch Number', description: 'Vaccine batch/lot number' },
      { key: 'tt_status', label: 'Tetanus Toxoid Status', description: 'TT vaccination status and history' },
      { key: 'medication_given', label: 'Medication Given', description: 'Additional medications administered' },
      { key: 'adverse_reaction', label: 'Adverse Reaction', description: 'Any adverse reactions observed' },
      { key: 'cost_recovery', label: 'Cost Recovery', description: 'Financial information and cost recovery' },
    ],
  },
];

export default function ModuleConfigPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<ClinicModuleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['Bite Incident Intake']);

  // Form state
  const [triageEnabled, setTriageEnabled] = useState(true);
  const [fieldRules, setFieldRules] = useState<Record<string, FieldRuleValue>>({});

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await clinicConfigApi.getModuleConfig();
      setConfig(data);
      setTriageEnabled(data.triage_module_enabled);
      setFieldRules(data.field_rules);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load module configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updatedConfig = await clinicConfigApi.updateModuleConfig({
        triage_module_enabled: triageEnabled,
        field_rules: fieldRules as any,
      });

      setConfig(updatedConfig);
      setShowSuccessModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };


  const handleFieldRuleChange = (fieldKey: string, value: FieldRuleValue) => {
    setFieldRules((prev) => ({
      ...prev,
      [fieldKey]: value,
    }));
  };

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionTitle)
        ? prev.filter((s) => s !== sectionTitle)
        : [...prev, sectionTitle]
    );
  };

  const hasChanges = () => {
    if (!config) return false;
    if (config.triage_module_enabled !== triageEnabled) return true;

    return FIELD_SECTIONS.some((section) =>
      section.fields.some((field) => config.field_rules[field.key] !== fieldRules[field.key])
    );
  };

  const getFieldRuleBadge = (value: FieldRuleValue) => {
    const badges = {
      required: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', text: 'Required' },
      optional: { bg: '#e8f5ed', color: 'var(--primary)', border: '#d7ebdf', text: 'Optional' },
      hidden: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', text: 'Hidden' },
    };
    const badge = badges[value] || badges.optional;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          background: badge.bg,
          color: badge.color,
          border: `1px solid ${badge.border}`,
          fontSize: '0.7rem',
          padding: '0.15rem 0.45rem',
          borderRadius: '0.3rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
        }}
      >
        {badge.text}
      </span>
    );
  };

  const getSectionStats = (section: FieldSection) => {
    const required = section.fields.filter((f) => fieldRules[f.key] === 'required').length;
    const optional = section.fields.filter((f) => fieldRules[f.key] === 'optional').length;
    const hidden = section.fields.filter((f) => fieldRules[f.key] === 'hidden').length;
    return { required, optional, hidden, total: section.fields.length };
  };

  return (
    <div style={{ width: '100%', margin: 0, padding: 0 }}>
      <div className="sd-dash-header">
        <div>
          <h1>Module Configuration</h1>
          <p>Configure clinic modules and form field requirements across all modules</p>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13, color: '#9ca3af' }}>
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
            >Dashboard</button>
            <span>›</span>
            <button
              onClick={() => navigate(ROUTES.CLINIC_SETUP.ROOT)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#6b7280', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
            >Clinic Setup</button>
            <span>›</span>
            <span style={{ color: '#6b7280' }}>Module Configuration</span>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '14px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: '#991b1b',
            fontSize: '0.8125rem',
            fontWeight: 400,
          }}
        >
          <Icon name="warning" size={18} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          style={{
            background: '#e8f5ed',
            border: '1px solid #d7ebdf',
            borderRadius: '14px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: 'var(--primary)',
            fontSize: '0.8125rem',
            fontWeight: 400,
          }}
        >
          <Icon name="check" size={18} color="var(--primary)" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #10b981',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          ></div>
          <p style={{ color: '#6b7280', fontWeight: 400 }}>Loading configuration...</p>
        </div>
      ) : (
        <>
          {/* Triage Module Section */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e0eae3',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
              padding: '1.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '1rem',
                borderBottom: '1px solid #f0f7f2',
                marginBottom: '1rem',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--text-h)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.25rem',
                  }}
                >
                  <Icon name="settings" size={18} color="var(--primary)" />
                  Triage Module
                </div>
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: '#77877d',
                    fontWeight: 400,
                    margin: 0,
                  }}
                >
                  Enable or disable the triage assessment module in patient flow
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem',
                background: '#f8fafb',
                borderRadius: '10px',
                border: '1px solid #e8ede9',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                <div style={{ position: 'relative' }}>
                  <input
                    type="checkbox"
                    checked={triageEnabled}
                    onChange={(e) => setTriageEnabled(e.target.checked)}
                    style={{
                      width: '44px',
                      height: '24px',
                      appearance: 'none',
                      background: triageEnabled ? 'var(--primary)' : '#cbd5e1',
                      borderRadius: '12px',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      outline: 'none',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: triageEnabled ? '22px' : '2px',
                      width: '20px',
                      height: '20px',
                      background: '#ffffff',
                      borderRadius: '50%',
                      transition: 'left 0.2s',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#1e293b',
                    }}
                  >
                    {triageEnabled ? 'Triage Module Enabled' : 'Triage Module Disabled'}
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#64748b',
                      fontWeight: 400,
                    }}
                  >
                    {triageEnabled
                      ? 'Patient flow: Registration → Triage → Treatment'
                      : 'Patient flow: Registration → Treatment (triage skipped)'}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Field Rules Sections */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e0eae3',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
              padding: '1.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '1rem',
                borderBottom: '1px solid #f0f7f2',
                marginBottom: '1rem',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--text-h)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.25rem',
                  }}
                >
                  <Icon name="edit" size={18} color="var(--primary)" />
                  Form Field Rules by Module
                </div>
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: '#77877d',
                    fontWeight: 400,
                    margin: 0,
                  }}
                >
                  Configure visibility and requirement settings for all form fields across modules
                </p>
              </div>
            </div>

            {/* Sections */}
            {FIELD_SECTIONS.map((section) => {
              const isExpanded = expandedSections.includes(section.title);
              const stats = getSectionStats(section);

              return (
                <div
                  key={section.title}
                  style={{
                    marginBottom: '1rem',
                    border: '1px solid #e8ede9',
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.title)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem',
                      background: isExpanded ? '#f8fafb' : '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      <Icon name={section.icon as any} size={18} color="var(--primary)" />
                      <div style={{ textAlign: 'left' }}>
                        <div
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#1e293b',
                            marginBottom: '0.15rem',
                          }}
                        >
                          {section.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                          {section.description}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginRight: '0.5rem' }}>
                        {stats.required}R · {stats.optional}O · {stats.hidden}H
                      </div>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="2"
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>

                  {/* Section Fields */}
                  {isExpanded && (
                    <div style={{ padding: '0 1rem 1rem 1rem' }}>
                      {section.fields.map((field) => (
                        <div
                          key={field.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.65rem 0.75rem',
                            background: '#ffffff',
                            borderRadius: '8px',
                            border: '1px solid #f0f7f2',
                            marginBottom: '0.5rem',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: '0.8125rem',
                                fontWeight: 500,
                                color: '#1e293b',
                                marginBottom: '0.15rem',
                              }}
                            >
                              {field.label}
                            </div>
                            <div
                              style={{
                                fontSize: '0.7rem',
                                color: '#64748b',
                                fontWeight: 400,
                              }}
                            >
                              {field.description}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ marginRight: '0.5rem', minWidth: '70px' }}>
                              {getFieldRuleBadge(fieldRules[field.key] as FieldRuleValue)}
                            </div>
                            <select
                              className="db-explorer-input"
                              value={fieldRules[field.key] || 'optional'}
                              onChange={(e) =>
                                handleFieldRuleChange(field.key, e.target.value as FieldRuleValue)
                              }
                              style={{ minWidth: '120px' }}
                            >
                              <option value="required">Required</option>
                              <option value="optional">Optional</option>
                              <option value="hidden">Hidden</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div
            style={{
              marginTop: '1.5rem',
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              className="db-explorer-back-btn"
              onClick={loadConfig}
              disabled={saving || !hasChanges()}
              style={{
                opacity: saving || !hasChanges() ? 0.5 : 1,
                cursor: saving || !hasChanges() ? 'not-allowed' : 'pointer',
              }}
            >
              Reset Changes
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              style={{
                background: hasChanges() ? 'var(--primary)' : '#cbd5e1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.65rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: hasChanges() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? (
                <>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid #ffffff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite',
                    }}
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Icon name="check" size={16} color="#ffffff" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
          {/* Success Modal */}
          {showSuccessModal && (
            <ConfirmationDialog
              variant="success"
              title="Configuration Saved"
              message="Clinic module configurations and form field rules have been updated successfully."
              confirmLabel="OK"
              hideCancel
              onConfirm={() => setShowSuccessModal(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

