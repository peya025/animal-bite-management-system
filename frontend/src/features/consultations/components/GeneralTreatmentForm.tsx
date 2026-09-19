import { Box } from '@mui/material';
import FormModal from '../../../components/forms/FormModal';
import type { GeneralTreatmentFormProps } from '../types/consultation.types';
import { useGeneralTreatmentForm } from '../hooks/useGeneralTreatmentForm';

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

export default function GeneralTreatmentForm(props: GeneralTreatmentFormProps) {
  const { entry, onClose, readOnly = false, inline = false } = props;

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
  } = useGeneralTreatmentForm(props);

  if (!entry) return null;

  const formContent = (
    <div style={{ padding: inline ? '0' : '24px 32px' }}>
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
          color: '#9ca3af',
          textAlign: 'right',
          borderTop: '1px solid #e5e7eb',
          paddingTop: 12,
        }}
      >
        Clinic Information System | FORM 2 | Page 1
      </div>

      {/* Inline footer buttons */}
      {inline && (
        <div
          style={{
            marginTop: 32,
            paddingTop: 20,
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {error && (
            <p style={{ flex: 1, fontSize: 13, color: '#ef4444', margin: 0 }}>
              {error}
            </p>
          )}

          {hasAdministeredVaccine ? (
            <Box
              sx={{
                fontSize: 12.5,
                color: '#92400e',
                fontWeight: 600,
                bgcolor: '#fef3c7',
                px: 2,
                py: 0.75,
                borderRadius: 1.5,
              }}
            >
              🔒 Assessment Locked — Baseline diagnosis cannot be edited after vaccination
            </Box>
          ) : hasExistingRecord && !isEditing ? (
            !readOnly && (
              <button
                type="button"
                className="fm-btn"
                onClick={() => setIsEditing(true)}
                style={{
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
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
                  Cancel
                </button>
              )}
              {!readOnly && (
                <button
                  className="fm-btn fm-btn--submit"
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : hasExistingRecord ? '✓ Save Changes' : '✓ Save Record'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );

  // Inline mode: return content directly without Dialog wrapper
  if (inline) return formContent;

  // Modal mode: wrap in FormModal
  return (
    <FormModal
      title="Individual Treatment"
      subtitle="Form 2 — General Consultation"
      onClose={onClose}
      maxWidth={950}
      footer={
        <>
          {error && (
            <p style={{ flex: 1, fontSize: 13, color: '#ef4444', margin: 0, alignSelf: 'center' }}>
              {error}
            </p>
          )}
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
                  style={{ backgroundColor: '#10b981' }}
                >
                  ✏️ Edit Record
                </button>
              )}
            </>
          ) : (
            <>
              <button
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
              <button className="fm-btn fm-btn--submit" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : hasExistingRecord ? 'Save Changes' : 'Save Patient Record'}
              </button>
            </>
          )}
        </>
      }
    >
      {formContent}
    </FormModal>
  );
}
