import { useRef, useLayoutEffect } from 'react';
import FormModal from '../../../components/forms/FormModal';
import type { GeneralTreatmentFormProps } from '../types/consultation.types';
import { useGeneralTreatmentForm } from '../hooks/useGeneralTreatmentForm';
import { ConsultationDialog } from '../styles/ConsultationDialog.styles';
import { FormField } from './FormField';
import {
  ConsultationErrors,
  advanceOnEnter,
  focusFirstError,
} from '../accessibility/consultationAccessibility';
import DraftStatusBadge from '../../../shared/components/DraftStatusBadge';

import ConsultationBanners from './sections/ConsultationBanners';
import PatientInfoSection from './sections/PatientInfoSection';
import ReferralSection from './sections/ReferralSection';
import VitalsConsultationSection from './sections/VitalsConsultationSection';
import NatureOfVisitSection from './sections/NatureOfVisitSection';
import ConsultationTypesSection from './sections/ConsultationTypesSection';
import ClinicalNotesSection from './sections/ClinicalNotesSection';
import TransferReferralSection from './sections/TransferReferralSection';
import PrescribedVaccineSection from './sections/PrescribedVaccineSection';
import ProphylaxisOrderSection from './sections/ProphylaxisOrderSection';
import ReExposureAssessmentSection from './sections/ReExposureAssessmentSection';
import ProviderFindingsSection from './sections/ProviderFindingsSection';
import ClinicalAddendumSection from './sections/ClinicalAddendumSection';
import ExposureAssessmentSection from './sections/ExposureAssessmentSection';
import DohTransferSlipModal from '../../vaccinations/components/DohTransferSlipModal';

export default function GeneralTreatmentForm(props: GeneralTreatmentFormProps) {
  const { entry, onClose, readOnly = false, inline = false } = props;

  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const focusErrorsRef = useRef(false);

  const {
    formData,
    setFormData,
    saving,
    error,
    vaccineNames,
    vaccineStockMap,
    prophylaxisStock,
    tetanusBrands,
    atsBrands,
    hasExistingRecord,
    isEditing,
    setIsEditing,
    existingRecord,
    hasAdministeredVaccine,
    isReturningNewBite,
    requiresReExposureDecision,
    addendumNote,
    setAddendumNote,
    savingAddendum,
    addendumSuccess,
    treatmentPlan,
    setTreatmentPlan,
    patientReportedIntake,
    previousConsultations,
    isPendingTreatmentReassessment,
    pendingTreatmentSummary,
    checkedDiagnoses,
    fieldErrors,
    isCategory1,
    isFormDisabled,
    isNatureOfVisitAutomatic,
    shouldHideConsultationType,
    handleFieldChange,
    handleCheckboxChange,
    handleFieldBlur,
    toggleDiagnosis,
    handleClearDiagnoses,
    handlePrescribedVaccineChange,
    handleProphylaxisChange,
    handleReassessmentDecisionChange,
    handleSaveAddendum,
    handleSubmit,
    handleCancelEdit,
    draftStatus,
    draftSavedAt,
    // Referral state and handlers
    transferSlipOpen,
    setTransferSlipOpen,
    isReferralCompleted,
    handleToggleReferral,
    handleSelectFacility,
    handleSelectReason,
    handleOpenPrintSlip,
    handleSaveReferral,
    handleCompleteReferral,
  } = useGeneralTreatmentForm(props);

  const selectedIncident = entry?.incident || entry?.bite_incident || entry?.biteIncident;

  useLayoutEffect(() => {
    if (formRef.current && focusErrorsRef.current && Object.keys(fieldErrors).length) {
      focusErrorsRef.current = false;
      const fieldOrder = shouldHideConsultationType
        ? ['nature_of_visit', 'chief_complaints', 'transferred_to_facility', 'reassessment_decision', 'reassessment_notes', 'treatment_plan', 'exposure_category', 'tetanus_category', 'tetanus_passive', 'tetanus_vaccine', 'tetanus_last_dose']
        : ['nature_of_visit', 'consultation_types', 'chief_complaints', 'transferred_to_facility', 'reassessment_decision', 'reassessment_notes', 'treatment_plan', 'exposure_category', 'tetanus_category', 'tetanus_passive', 'tetanus_vaccine', 'tetanus_last_dose'];
      const firstKey = fieldOrder.find((key) => fieldErrors[key]);
      focusFirstError(formRef.current, firstKey, summaryRef.current);
    }
  }, [fieldErrors, shouldHideConsultationType]);

  if (!entry) return null;

  const handleFormSubmit = () => {
    focusErrorsRef.current = true;
    handleSubmit();
  };

  const handleDialogKeys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!saving) onClose();
    }
    if (event.key !== 'Tab') return;
    const items = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex="0"]') || []
    ).filter(
      (el) => !el.matches(':disabled') && el.tabIndex >= 0 && el.getClientRects().length > 0
    );
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const formBody = (
    <ConsultationErrors.Provider value={fieldErrors}>
      <form
        ref={formRef}
        className="registration-form"
        noValidate
        aria-label="Doctor consultation and treatment assessment"
        aria-busy={saving}
        onSubmit={(event) => event.preventDefault()}
        onKeyDown={(event) => advanceOnEnter(event, handleFormSubmit)}
      >
        <p className="registration-intro">
          <strong>Required fields are marked with *.</strong> Press Enter in a text field to move to the next field, or use Tab.
        </p>

        {error && (
          <p ref={summaryRef} tabIndex={-1} role="alert" className="registration-error">
            {error}
          </p>
        )}

        {/* Status & Clinical Lock Banners */}
        <ConsultationBanners
          isReturningNewBite={isReturningNewBite}
          hasAdministeredVaccine={hasAdministeredVaccine}
          hasExistingRecord={hasExistingRecord}
          isEditing={isEditing}
          readOnly={readOnly}
          onStartEdit={() => setIsEditing(true)}
          onCancelEdit={handleCancelEdit}
        />

        {/* PREVIOUS CONSULTATION HISTORY (Read-Only for Returning Patients) */}
        {previousConsultations.length > 0 && (
          <div
            className="fm-section"
            style={{
              backgroundColor: 'var(--bg-secondary, #f8fafc)',
              border: '1px solid #cbd5e1',
              borderLeft: '4px solid #d97706',
              borderRadius: 10,
              padding: '14px 16px',
              marginBottom: 18,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📋 Previous Consultation Record (Read-Only)</span>
                {isPendingTreatmentReassessment && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: '#fef3c7',
                    color: '#b45309',
                    border: '1px solid #fde68a',
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}>
                    Returned for Reassessment — Pending Administration
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11.5, color: '#64748b' }}>
                Preserved Medical History ({previousConsultations.length} consultation{previousConsultations.length > 1 ? 's' : ''})
              </span>
            </div>

            {previousConsultations.map((prev: any, idx: number) => (
              <div
                key={prev.treatment_id || idx}
                style={{
                  backgroundColor: 'var(--bg-primary, #ffffff)',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '12px 14px',
                  marginBottom: idx < previousConsultations.length - 1 ? 10 : 0,
                  fontSize: 12.5,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 14px', marginBottom: 8 }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: 11 }}>Previous Consultation Date:</span>
                    <div style={{ fontWeight: 600 }}>{prev.consultation_date || '—'} {prev.consultation_time ? `(${prev.consultation_time})` : ''}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: 11 }}>Original Exposure Category:</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Category {prev.exposure_category || '—'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: 11 }}>Previous Vital Signs:</span>
                    <div style={{ fontWeight: 500 }}>
                      BP: {prev.blood_pressure || '—'} • Temp: {prev.temperature ? `${prev.temperature}°C` : '—'} • Wt: {prev.weight ? `${prev.weight}kg` : '—'} • Ht: {prev.height ? `${prev.height}cm` : '—'}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: 11 }}>Attending Physician / Provider:</span>
                    <div style={{ fontWeight: 500 }}>{prev.provider_name || prev.attending_provider || '—'}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px 14px', borderTop: '1px dashed #e2e8f0', paddingTop: 8 }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: 11 }}>Previous Diagnosis & Assessment:</span>
                    <div style={{ fontWeight: 500 }}>{prev.diagnosis || prev.chief_complaints || '—'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: 11 }}>Previous Prescribed Treatment:</span>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>
                      {[
                        prev.prescribed_vaccine_type ? `PEP: ${prev.prescribed_vaccine_type}` : (prev.exposure_category === 'I' ? 'PEP: Not Indicated' : null),
                        prev.prescribed_tt ? `TT: ${prev.prescribed_tt}` : null,
                        prev.prescribed_ats ? `ATS: ${prev.prescribed_ats}` : null,
                        prev.prescribed_rig ? `ERIG: ${prev.prescribed_rig}` : null,
                      ].filter(Boolean).join(' • ') || prev.medication_treatment || 'No injection prescribed'}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: 11 }}>Administration Status:</span>
                    <div style={{ fontWeight: 600, color: hasAdministeredVaccine ? '#15803d' : '#b45309' }}>
                      {hasAdministeredVaccine
                        ? 'Administered'
                        : (pendingTreatmentSummary?.not_administered_reasons && Object.keys(pendingTreatmentSummary.not_administered_reasons).length > 0
                            ? `Not Administered (${Object.values(pendingTreatmentSummary.not_administered_reasons).join('; ')})`
                            : 'Pending / Not Administered (No doses given on previous visit)')}
                    </div>
                  </div>
                  {(prev.prophylaxis_orders?.notes || prev.reassessment_notes || prev.actions_taken || prev.referred_to) && (
                    <div>
                      <span style={{ color: '#64748b', fontSize: 11 }}>Previous Doctor Remarks / Referral:</span>
                      <div style={{ fontWeight: 500 }}>
                        {prev.referred_to ? `Referred to ${prev.referred_to}` : ''}
                        {prev.reason_for_referral ? ` (${prev.reason_for_referral})` : ''}
                        {(prev.reassessment_notes || prev.prophylaxis_orders?.notes || prev.actions_taken) ? ` · ${prev.reassessment_notes || prev.prophylaxis_orders?.notes || prev.actions_taken}` : ''}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SECTION 1: Patient Information */}
        <PatientInfoSection formData={formData} />

        {/* Patient-Reported Mobile Intake */}
        <ExposureAssessmentSection
          patientReportedIntake={patientReportedIntake}
        />

        {/* SECTION 2: CHU / RHU Personnel Only */}
        <ReferralSection
          formData={formData}
        />

        {/* SECTION 3: Consultation Details & Vitals */}
        <VitalsConsultationSection
          formData={formData}
          isFormDisabled={isFormDisabled}
          onFieldChange={handleFieldChange}
          onSetReferredBy={(val) => setFormData((prev) => ({ ...prev, referred_by: val }))}
        />

        {/* SECTION 4: Nature of Visit */}
        <NatureOfVisitSection
          natureOfVisit={formData.nature_of_visit}
          isFormDisabled={isFormDisabled}
          isAutomaticallySet={isNatureOfVisitAutomatic}
          error={fieldErrors.nature_of_visit}
          onChange={handleFieldChange('nature_of_visit')}
          onBlur={handleFieldBlur('nature_of_visit')}
        />

        {/* SECTION 5: Type of Consultation (Hidden in Doctor/Triage role view) */}
        {!shouldHideConsultationType && (
          <ConsultationTypesSection
            consultationTypes={formData.consultation_types}
            isFormDisabled={isFormDisabled}
            error={fieldErrors.consultation_types}
            onChange={handleCheckboxChange}
          />
        )}

        {/* SECTION 6: Clinical Notes (Chief Complaints + Diagnosis checklist) */}
        <ClinicalNotesSection
          formData={formData}
          isFormDisabled={isFormDisabled}
          checkedDiagnoses={checkedDiagnoses}
          fieldErrors={fieldErrors}
          onFieldChange={handleFieldChange}
          onFieldBlur={handleFieldBlur}
          onToggleDiagnosis={toggleDiagnosis}
          onClearDiagnoses={handleClearDiagnoses}
        />

        {/* TRANSFER OUT / REFERRAL SLIP: Directly below Doctor's Diagnosis */}
        <TransferReferralSection
          formData={formData}
          isFormDisabled={isFormDisabled}
          saving={saving}
          fieldErrors={fieldErrors}
          isReferralCompleted={isReferralCompleted}
          onFieldChange={handleFieldChange}
          onToggleReferral={handleToggleReferral}
          onSelectFacility={handleSelectFacility}
          onSelectReason={handleSelectReason}
          onPrintSlip={handleOpenPrintSlip}
          onSaveAndPrint={() => handleSaveReferral(true)}
          onCompleteReferral={handleCompleteReferral}
        />

        {/* SECTION 7: Doctor treatment decision follows the diagnosis */}
        <ReExposureAssessmentSection
          entry={entry}
          requiresReExposureDecision={requiresReExposureDecision}
          isFormDisabled={isFormDisabled}
          treatmentPlan={treatmentPlan}
          error={fieldErrors.treatment_plan}
          onUpdateTreatmentPlan={setTreatmentPlan}
        />

        {/* RETURNING PATIENT PENDING TREATMENT REASSESSMENT DECISION */}
        {(isPendingTreatmentReassessment || Boolean(formData.reassessment_decision)) && (
          <div
            className="fm-section"
            style={{
              backgroundColor: 'var(--bg-secondary, #fffbeb)',
              border: '1px solid #f59e0b',
              borderRadius: 10,
              padding: '14px 16px',
              marginBottom: 16,
            }}
          >
            <FormField
              id="field-reassessment_decision"
              label="Returning Patient Reassessment Decision (Pending Unadministered Treatment)"
              required={isPendingTreatmentReassessment}
              error={!!fieldErrors.reassessment_decision}
              errorText={fieldErrors.reassessment_decision}
            >
              <div
                role="radiogroup"
                aria-label="Returning Patient Reassessment Decision"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 6 }}
              >
                {[
                  {
                    value: 'continue' as const,
                    title: 'Continue Previous Prescription',
                    desc: 'Confirm the previous prescription for nurse administration today.',
                  },
                  {
                    value: 'modify' as const,
                    title: 'Modify Prescription',
                    desc: 'Adjust rabies PEP or tetanus orders below based on re-evaluation.',
                  },
                  {
                    value: 'discontinue' as const,
                    title: 'Discontinue Previous Orders',
                    desc: 'Cancel pending orders (e.g. animal remained healthy, exposure reclassified).',
                  },
                  {
                    value: 'no_injection_required' as const,
                    title: 'No Injection Required',
                    desc: 'Clinical evaluation confirms patient requires no injections today.',
                  },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      border: formData.reassessment_decision === opt.value ? '2px solid #d97706' : '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: 10,
                      backgroundColor: formData.reassessment_decision === opt.value ? '#fef3c7' : '#ffffff',
                      cursor: isFormDisabled ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="radio"
                        name="reassessment_decision"
                        value={opt.value}
                        checked={formData.reassessment_decision === opt.value}
                        onChange={() => handleReassessmentDecisionChange(opt.value)}
                        disabled={isFormDisabled}
                        style={{ accentColor: '#d97706' }}
                      />
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#92400e' }}>{opt.title}</span>
                    </div>
                    <span style={{ fontSize: 11.5, color: '#64748b', paddingLeft: 22 }}>{opt.desc}</span>
                  </label>
                ))}
              </div>
            </FormField>

            {['modify', 'discontinue', 'no_injection_required'].includes(formData.reassessment_decision || '') && (
              <div style={{ marginTop: 12 }}>
                <FormField
                  id="field-reassessment_notes"
                  label="Clinical Justification for Decision *"
                  required
                  error={!!fieldErrors.reassessment_notes}
                  errorText={fieldErrors.reassessment_notes}
                >
                  <textarea
                    className="fm-textarea"
                    rows={2}
                    value={formData.reassessment_notes || ''}
                    onChange={handleFieldChange('reassessment_notes')}
                    onBlur={handleFieldBlur('reassessment_notes')}
                    disabled={isFormDisabled}
                    placeholder="Document clinical reason (e.g. Biting dog confirmed rabies-free on Day 14; wound healed with no signs of infection; patient completed PEP elsewhere; etc.)"
                  />
                </FormField>
              </div>
            )}
          </div>
        )}

        {/* Exposure Category Selection (Immediately above Tetanus Prophylaxis Order) */}
        <div className="fm-section">
          <FormField
            id="field-exposure_category"
            label="Exposure Category"
            required
            error={!!fieldErrors.exposure_category}
            errorText={fieldErrors.exposure_category}
          >
            <div
              role="radiogroup"
              aria-label="Exposure Category"
              aria-required="true"
              className="fm-radio-group"
              style={{ display: 'flex', gap: 24 }}
            >
              {(['I', 'II', 'III'] as const).map(category => (
                <label key={category} className="fm-radio" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input
                    type="radio"
                    name="exposure_category"
                    value={category}
                    checked={formData.exposure_category === category}
                    onChange={handleFieldChange('exposure_category')}
                    disabled={isFormDisabled}
                  />
                  Category {category}
                </label>
              ))}
            </div>
          </FormField>
        </div>

        {/* Prophylaxis Order (Tetanus & RIG) */}
        <ProphylaxisOrderSection
          value={formData.prophylaxis_orders}
          stock={prophylaxisStock}
          tetanusBrands={tetanusBrands}
          atsBrands={atsBrands}
          disabled={isFormDisabled || formData.reassessment_decision === 'discontinue' || formData.reassessment_decision === 'no_injection_required'}
          errors={fieldErrors}
          onChange={handleProphylaxisChange}
        />

        {/* SECTION 8: Prescribed PEP Vaccine */}
        <PrescribedVaccineSection
          prescribedVaccineType={formData.prescribed_vaccine_type}
          medicationTreatment={formData.medication_treatment}
          isFormDisabled={isFormDisabled || formData.reassessment_decision === 'discontinue' || formData.reassessment_decision === 'no_injection_required'}
          vaccineNames={vaccineNames}
          vaccineStockMap={vaccineStockMap}
          isCategory1={isCategory1}
          onChange={handlePrescribedVaccineChange}
        />

        {/* SECTION 9: Provider Findings & Plan */}
        <ProviderFindingsSection
          formData={formData}
          isFormDisabled={isFormDisabled}
          onFieldChange={handleFieldChange}
        />

        {/* SECTION 10: Clinical Addendum & Progress Notes */}
        <ClinicalAddendumSection
          hasExistingRecord={hasExistingRecord}
          hasAdministeredVaccine={hasAdministeredVaccine}
          readOnly={readOnly}
          existingRecord={existingRecord}
          addendumNote={addendumNote}
          savingAddendum={savingAddendum}
          addendumSuccess={addendumSuccess}
          onAddendumNoteChange={setAddendumNote}
          onSaveAddendum={handleSaveAddendum}
        />

        {/* Form action buttons for inline mode */}
        {inline && (
          <div className="fm-footer" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color, #e5e7eb)' }}>
            <DraftStatusBadge status={draftStatus} savedAt={draftSavedAt} style={{ marginRight: 'auto' }} />
            {hasAdministeredVaccine ? (
              <span style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)', fontStyle: 'italic' }}>
                Vaccination administered — Form 2 locked. Use Clinical Addendum above for additional notes.
              </span>
            ) : hasExistingRecord && !isEditing ? (
              !readOnly && (
                <button
                  type="button"
                  className="fm-btn fm-btn--submit"
                  onClick={() => setIsEditing(true)}
                >
                  ✏️ Edit Record
                </button>
              )
            ) : (
              <>
                {hasExistingRecord && isEditing && (
                  <button
                    type="button"
                    className="fm-btn fm-btn--cancel"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Cancel Edit
                  </button>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    className="fm-btn fm-btn--submit"
                    onClick={handleFormSubmit}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : hasExistingRecord ? '✓ Save Changes' : '✓ Save Patient Record'}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </form>
    </ConsultationErrors.Provider>
  );

  const transferModalComponent = (
    <DohTransferSlipModal
      open={transferSlipOpen}
      onClose={() => setTransferSlipOpen(false)}
      patient={entry?.patient}
      incident={selectedIncident || entry?.incident || entry?.biteIncident}
      treatmentRecords={previousConsultations}
      transferredToFacility={formData.transferred_to_facility}
      transferReason={formData.transfer_reason}
      transferDate={formData.transfer_date}
      diagnosis={formData.diagnosis}
    />
  );

  // Inline mode: return content directly inside ConsultationDialog wrapper
  if (inline) {
    return (
      <ConsultationDialog ref={dialogRef}>
        {formBody}
        {transferModalComponent}
      </ConsultationDialog>
    );
  }

  // Modal mode: wrap in FormModal inside ConsultationDialog
  return (
    <ConsultationDialog ref={dialogRef} onKeyDown={handleDialogKeys}>
      <FormModal
        title="Individual Treatment"
        subtitle="Form 2 — General Consultation"
        onClose={onClose}
        maxWidth={920}
        footer={
          <>
            <DraftStatusBadge status={draftStatus} savedAt={draftSavedAt} style={{ marginRight: 'auto' }} />
            {hasAdministeredVaccine ? (
              <button className="fm-btn fm-btn--cancel" onClick={onClose} disabled={saving}>
                Close (Locked)
              </button>
            ) : hasExistingRecord && !isEditing ? (
              <>
                <button className="fm-btn fm-btn--cancel" onClick={onClose} disabled={saving}>
                  Close
                </button>
                {!readOnly && (
                  <button
                    type="button"
                    className="fm-btn fm-btn--submit"
                    onClick={() => setIsEditing(true)}
                  >
                    ✏️ Edit Record
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="fm-btn fm-btn--cancel"
                  onClick={() => {
                    if (hasExistingRecord && isEditing) {
                      handleCancelEdit();
                    } else {
                      onClose();
                    }
                  }}
                  disabled={saving}
                >
                  {hasExistingRecord && isEditing ? 'Cancel Edit' : 'Cancel'}
                </button>
                <button
                  type="button"
                  className="fm-btn fm-btn--submit"
                  onClick={handleFormSubmit}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : hasExistingRecord ? 'Save Changes' : 'Save Patient Record'}
                </button>
              </>
            )}
          </>
        }
      >
        {formBody}
      </FormModal>
      {transferModalComponent}
    </ConsultationDialog>
  );
}
