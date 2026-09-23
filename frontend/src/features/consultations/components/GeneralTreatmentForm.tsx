import { useRef, useLayoutEffect } from 'react';
import FormModal from '../../../components/forms/FormModal';
import type { GeneralTreatmentFormProps } from '../types/consultation.types';
import { useGeneralTreatmentForm } from '../hooks/useGeneralTreatmentForm';
import { ConsultationDialog } from '../styles/ConsultationDialog.styles';
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
import PrescribedVaccineSection from './sections/PrescribedVaccineSection';
import ReExposureAssessmentSection from './sections/ReExposureAssessmentSection';
import ProviderFindingsSection from './sections/ProviderFindingsSection';
import ClinicalAddendumSection from './sections/ClinicalAddendumSection';
import ExposureAssessmentSection from './sections/ExposureAssessmentSection';

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
    newBiteData,
    setNewBiteData,
    patientReportedIntake,
    requiresIncidentConfirmation,
    clinicalAssessmentConfirmed,
    setClinicalAssessmentConfirmed,
    checkedDiagnoses,
    checkedHistory,
    fieldErrors,
    isFormDisabled,
    isNatureOfVisitAutomatic,
    shouldHideConsultationType,
    handleFieldChange,
    handleCheckboxChange,
    handleFieldBlur,
    toggleDiagnosis,
    handleClearDiagnoses,
    toggleHistory,
    handlePrescribedVaccineChange,
    handleSaveAddendum,
    handleSubmit,
    handleCancelEdit,
    draftStatus,
    draftSavedAt,
  } = useGeneralTreatmentForm(props);

  useLayoutEffect(() => {
    if (formRef.current && focusErrorsRef.current && Object.keys(fieldErrors).length) {
      focusErrorsRef.current = false;
      focusFirstError(formRef.current, summaryRef.current);
    }
  }, [fieldErrors]);

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

        {/* SECTION 1: Patient Information */}
        <PatientInfoSection formData={formData} />

        {/* SECTION 2: CHU / RHU Personnel Only */}
        <ExposureAssessmentSection
          patientReportedIntake={patientReportedIntake}
          data={newBiteData}
          disabled={isFormDisabled}
          required={requiresIncidentConfirmation}
          confirmed={clinicalAssessmentConfirmed}
          onChange={setNewBiteData}
          onConfirm={setClinicalAssessmentConfirmed}
        />

        {/* SECTION 2: CHU / RHU Personnel Only */}
        <ReferralSection
          formData={formData}
          isFormDisabled={isFormDisabled}
          checkedHistory={checkedHistory}
          onFieldChange={handleFieldChange}
          onSetReferredFrom={(val) => setFormData((prev) => ({ ...prev, referred_from: val }))}
          onToggleHistory={toggleHistory}
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

        {/* SECTION 7: Doctor treatment decision follows the diagnosis */}
        <ReExposureAssessmentSection
          entry={entry}
          requiresReExposureDecision={requiresReExposureDecision}
          isFormDisabled={isFormDisabled}
          treatmentPlan={treatmentPlan}
          onUpdateTreatmentPlan={setTreatmentPlan}
        />

        {/* SECTION 8: Prescribed PEP Vaccine (Doctor's Order & Live Inventory Badge) */}
        <PrescribedVaccineSection
          prescribedVaccineType={formData.prescribed_vaccine_type}
          medicationTreatment={formData.medication_treatment}
          isFormDisabled={isFormDisabled}
          vaccineNames={vaccineNames}
          vaccineStockMap={vaccineStockMap}
          onChange={handlePrescribedVaccineChange}
        />

        {/* SECTION 9: Provider & Laboratory Findings */}
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

        <div
          style={{
            fontSize: 11,
            color: 'var(--text-secondary, #94a3b8)',
            textAlign: 'right',
            borderTop: '1px solid var(--border-glow, #e2e8f0)',
            paddingTop: 12,
            marginTop: 24,
          }}
        >
          Clinic Information System | FORM 2 | Page 1
        </div>

        {/* Inline footer buttons */}
        {inline && (
          <div
            style={{
              marginTop: 28,
              paddingTop: 18,
              borderTop: '1px solid var(--border-glow, #e2e8f0)',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <DraftStatusBadge status={draftStatus} savedAt={draftSavedAt} style={{ marginRight: 'auto' }} />
            {hasAdministeredVaccine ? (
              <div
                style={{
                  fontSize: 12.5,
                  color: '#92400e',
                  fontWeight: 600,
                  backgroundColor: '#fef3c7',
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #fde68a',
                }}
              >
                🔒 Assessment Locked — Baseline diagnosis cannot be edited after vaccination
              </div>
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

  // Inline mode: return content directly inside ConsultationDialog wrapper
  if (inline) {
    return (
      <ConsultationDialog ref={dialogRef}>
        {formBody}
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
    </ConsultationDialog>
  );
}
