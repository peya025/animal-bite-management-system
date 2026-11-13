import React from 'react';
import SignatureImage from '../../../shared/components/SignatureImage';
import { formatDate } from '../utils/printHelpers';
import { deriveTreatmentCard, getStaffName, isRecordGiven } from '../utils/treatmentCardData';

export interface PrintableTreatmentRecord {
  dose_number?: number;
  period?: string;
  route?: string;
  injection_site?: string;
  dosage_ml?: string | number;
  dose_iu?: string | number;
  treatment_date?: string;
  scheduled_date?: string;
  vaccine_type?: string;
  vaccine_brand?: string;
  batch_number?: string;
  batch_no?: string;
  administered_by?: any;
  administeredBy?: any;
  professional_license_no?: string;
  signature?: string;
  treatment_id?: number | string;
  status?: string;
  outcome?: string;
  remarks?: string;
  voided_at?: string | null;
  medication_given?: string;
}

export interface PrintableFormRecord {
  clinic?: {
    name?: string;
    doh_accreditation_no?: string;
    philhealth_accreditation_no?: string;
    hospital_no?: string;
    province?: string;
    municipality?: string;
    address?: string;
    contact_number?: string;
    phone?: string;
    left_print_logo_url?: string | null;
    right_print_logo_url?: string | null;
    left_print_logo_path?: string | null;
    right_print_logo_path?: string | null;
  };
  logos?: {
    leftLogoUrl?: string | null;
    rightLogoUrl?: string | null;
  };
  patient?: {
    full_name?: string;
    age?: number | string;
    gender?: string;
    date_of_birth?: string;
    address?: string;
    philhealth_no?: string;
    philhealth_status?: string;
    hospital_no?: string;
    weight?: number | string;
  };
  bite?: {
    bite_date?: string;
    date_treatment_started?: string;
    bite_place?: string;
    exposure_category?: string;
    severity?: string;
    case_number?: string;
    referred_from?: string;
    mode_of_exposure?: string;
    body_part_exposed?: string;
    animal_type?: string;
    plan_type?: string;
  };
  cardDate?: string;
  registryNo?: string;
  hospitalNo?: string;
  referredBy?: string;
  exposureCategory?: string;
  modeOfExposure?: string;
  bodyPartExposed?: string;
  animalType?: string;
  animalTypeOthers?: string;
  pastBiteHistory?: boolean;
  pastBiteDates?: string;
  pastPepCompleted?: boolean;
  icd10Code?: string;
  placeOfExposure?: string;
  treatment_records?: PrintableTreatmentRecord[];
  prophylaxis_records?: PrintableTreatmentRecord[];
  latest_consultation?: any;
  consultation_history?: any[];
  doses?: PrintableTreatmentRecord[];
  selected_consultation_id?: number | null;
  appointments?: any[];
}

export interface PrintableFormProps {
  record?: PrintableFormRecord | null;
  mode?: 'filled' | 'blank';
}

export default function PrintableForm({ record, mode = 'filled' }: PrintableFormProps) {
  const isBlank = mode === 'blank';

  const {
    clinicTitle, clinicSubtitle, dohAccredNo, philhealthAccredNo, philhealthPin,
    dateVal, registryNoVal, hospitalNoVal, referredByVal, formattedPhStatus,
    patientName, age, dob, address, formattedSex, formattedCat, exposureDate, placeOfExposure,
    chosenModes, chosenParts, animalLabel, hasPastBite, pastBiteDates, pepCompleted,
    d0Rec, d3Rec, d7Rec, d28Rec, b1Rec, b2Rec, rigRec, ttRec, atsRec,
    rigGiven, ttGiven, atsGiven, treatmentStartDate, apt3, apt7, apt28, rigCalculatedMl,
    hasD28, hasB1, hasB2, hasRig, hasTt, hasAts, icd10Code,
  } = deriveTreatmentCard(record);

  const renderSignature = (rec?: PrintableTreatmentRecord) => {
    if (!rec) return null;
    if (rec.treatment_id) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '18px', overflow: 'hidden' }}>
          <SignatureImage
            endpoint={`/vaccination-records/${rec.treatment_id}/signature`}
            style={{ maxHeight: '18px', maxWidth: '75px', objectFit: 'contain' }}
            silentFallback={true}
          />
        </div>
      );
    }
    if (rec.signature) {
      return <span style={{ fontSize: '7.5pt', color: '#111' }}>Signed</span>;
    }
    return null;
  };

  const renderTableRow = (period: string, rec?: PrintableTreatmentRecord, scheduledDate?: string) => {
    const isGiven = isRecordGiven(rec);
    const route = (rec?.route || '').toUpperCase();
    const fallbackRoute = (d0Rec?.route || 'IM').toUpperCase();

    return (
      <tr key={period} style={{ height: '21px' }}>
        <td style={{ border: '1px solid #000', padding: '2px 6px', fontWeight: 600 }}>{period}</td>
        <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
          {isBlank ? (
            <span>( ) ID &nbsp;&nbsp; ( ) IM</span>
          ) : isGiven ? (
            <span style={{ fontWeight: 400 }}>{route || 'IM'}</span>
          ) : (
            <span style={{ color: '#444' }}>{fallbackRoute}</span>
          )}
        </td>
        <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
          {!isBlank ? (
            isGiven && rec?.treatment_date ? (
              formatDate(rec.treatment_date)
            ) : scheduledDate ? (
              <span style={{ fontStyle: 'italic', color: '#222' }}>{formatDate(scheduledDate)}</span>
            ) : ''
          ) : ''}
        </td>
        <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
          {!isBlank && isGiven ? getStaffName(rec) : ''}
        </td>
        <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
          {!isBlank && isGiven ? renderSignature(rec) : ''}
        </td>
      </tr>
    );
  };

  const underlineStyle: React.CSSProperties = {
    borderBottom: '1px solid #000',
    display: 'inline-block',
    padding: '0 5px',
    fontWeight: 400,
    verticalAlign: 'bottom',
  };

  return (
    <div
      id="tagoloan-printable-form"
      className="printable-form-container"
      style={{
        width: '100%',
        maxWidth: '190mm',
        margin: '0 auto',
        padding: '0',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: "'Arial', 'Helvetica', sans-serif",
        fontSize: '8.5pt',
        lineHeight: 1.3,
        boxSizing: 'border-box',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <style>{`
        #tagoloan-printable-form {
          color: #000000 !important;
          font-family: Arial, Helvetica, sans-serif !important;
          font-size: 8.5pt !important;
          line-height: 1.3 !important;
        }
        /* Labels: semi-bold; filled-in information: regular weight */
        #tagoloan-printable-form strong,
        #tagoloan-printable-form th {
          font-weight: 600 !important;
        }
        @page {
          size: A4 portrait;
          margin: 10mm 12mm;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #tagoloan-printable-form,
          #tagoloan-printable-form * {
            visibility: visible !important;
          }
          #tagoloan-printable-form {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print, button, .modal-footer {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <h1
          style={{
            fontSize: '13pt',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: '0 0 2px 0',
            color: '#000000',
            fontFamily: "'Arial', 'Helvetica', sans-serif",
          }}
        >
          {clinicTitle}
        </h1>
        <div style={{ fontSize: '8pt', color: '#333333', fontWeight: 500 }}>
          {clinicSubtitle}
        </div>
      </div>

      {/* Row 1: Date & Registry No */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
        <div style={{ flex: 1 }}>
          <strong>Date:</strong>
          <span style={{ ...underlineStyle, minWidth: '140px' }}>
            {!isBlank && dateVal && dateVal !== '—' ? dateVal : '\u00A0'}
          </span>
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <strong>Registry No:</strong>
          <span style={{ ...underlineStyle, minWidth: '150px', textAlign: 'center' }}>
            {!isBlank && registryNoVal ? registryNoVal : '\u00A0'}
          </span>
        </div>
      </div>

      {/* Row 2: DOH Accreditation No & Hospital No */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
        <div style={{ flex: 1 }}>
          <strong>DOH Accreditation No:</strong>
          <span style={{ ...underlineStyle, minWidth: '120px' }}>
            {dohAccredNo}
          </span>
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <strong>Hospital No:</strong>
          <span style={{ ...underlineStyle, minWidth: '150px', textAlign: 'center' }}>
            {!isBlank && hospitalNoVal ? hospitalNoVal : '\u00A0'}
          </span>
        </div>
      </div>

      {/* Row 3: PhilHealth Accreditation No & Referred by */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
        <div style={{ flex: 1 }}>
          <strong>PhilHealth Accreditation No:</strong>
          <span style={{ ...underlineStyle, minWidth: '110px' }}>
            {philhealthAccredNo}
          </span>
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <strong>Referred by:</strong>
          <span style={{ ...underlineStyle, minWidth: '150px', textAlign: 'center' }}>
            {!isBlank && referredByVal ? referredByVal : '\u00A0'}
          </span>
        </div>
      </div>

      {/* Row 4: PhilHealth PIN & PhilHealth status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
        <div style={{ flex: 1 }}>
          <strong>PhilHealth PIN:</strong>
          <span style={{ ...underlineStyle, minWidth: '150px' }}>
            {!isBlank && philhealthPin && philhealthPin !== '—' ? philhealthPin : '\u00A0'}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          {isBlank ? (
            <div style={{ display: 'flex', gap: '14px', alignItems: 'baseline' }}>
              <span>( ) Member</span>
              <span>( ) Dependent</span>
            </div>
          ) : (
            <div>
              <strong>PhilHealth status:</strong>
              <span style={{ ...underlineStyle, minWidth: '85px', textAlign: 'center' }}>
                {formattedPhStatus}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Row 5: Patient Name & Age / Date of birth */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
        <div style={{ flex: 1, marginRight: '14px' }}>
          <strong>Patient name:</strong>
          <span style={{ ...underlineStyle, minWidth: '200px' }}>
            {!isBlank && patientName ? patientName : '\u00A0'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
          <div>
            <strong>Age:</strong>
            <span style={{ ...underlineStyle, minWidth: '35px', textAlign: 'center' }}>
              {!isBlank && age ? age : '\u00A0'}
            </span>
          </div>
          <div>
            <strong>Date of birth:</strong>
            <span style={{ ...underlineStyle, minWidth: '110px', textAlign: 'center' }}>
              {!isBlank && dob && dob !== '—' ? dob : '\u00A0'}
            </span>
          </div>
        </div>
      </div>

      {/* Row 6: Address & Sex */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
        <div style={{ flex: 1, marginRight: '14px' }}>
          <strong>Address:</strong>
          <span style={{ ...underlineStyle, minWidth: '240px' }}>
            {!isBlank && address ? address : '\u00A0'}
          </span>
        </div>
        <div>
          {isBlank ? (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
              <strong>Sex:</strong>
              <span>( ) Male</span>
              <span>( ) Female</span>
            </div>
          ) : (
            <div>
              <strong>Sex:</strong>
              <span style={{ ...underlineStyle, minWidth: '55px', textAlign: 'center' }}>
                {formattedSex}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Row 7: Exposure category & Date of exposure & Treatment started */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
          {isBlank ? (
            <span>
              <strong>Exposure:</strong>&nbsp; ( ) I&nbsp;&nbsp; ( ) II&nbsp;&nbsp; ( ) III
            </span>
          ) : (
            <div>
              <strong>Exposure category:</strong>
              <span style={{ ...underlineStyle, minWidth: '85px', textAlign: 'center' }}>
                {formattedCat}
              </span>
            </div>
          )}
          <div style={{ marginLeft: '10px' }}>
            <strong>Date of exposure:</strong>
            <span style={{ ...underlineStyle, minWidth: '95px', textAlign: 'center' }}>
              {!isBlank && exposureDate && exposureDate !== '—' ? exposureDate : '\u00A0'}
            </span>
          </div>
        </div>
        <div>
          <strong>Treatment started:</strong>
          <span style={{ ...underlineStyle, minWidth: '110px', textAlign: 'center' }}>
            {!isBlank && treatmentStartDate && treatmentStartDate !== '—' ? treatmentStartDate : '\u00A0'}
          </span>
        </div>
      </div>

      {/* Row 8: Place of exposure */}
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '4px' }}>
        <strong>Place of exposure:</strong>
        <span style={{ ...underlineStyle, minWidth: '260px' }}>
          {!isBlank && placeOfExposure ? placeOfExposure : '\u00A0'}
        </span>
      </div>

      {/* Horizontal Divider Line */}
      <div style={{ borderTop: '1.5px solid #000000', margin: '6px 0 8px 0' }} />

      {/* Exposure Details: Mode & Body Part */}
      {isBlank ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '12px', marginBottom: '6px', lineHeight: 1.35 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: '2px' }}>1. Mode of Animal Exposure</div>
            <div>( ) Nibbling/Licking of uncovered skin</div>
            <div>( ) Nibbling/Licking of wounded/broken skin</div>
            <div>( ) Scratch / Abrasion</div>
            <div>( ) Transdermal Bite</div>
            <div>( ) Handling / Ingestion of raw infected meat</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: '2px' }}>2. Body Part Affected / Exposed</div>
            <div>( ) Head and/or neck</div>
            <div>( ) other parts of the body</div>
            <div>( ) N / A if Ingestion mode</div>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '6px', lineHeight: 1.35 }}>
          {chosenModes.length > 0 && (
            <div style={{ marginBottom: '3px' }}>
              <strong>1. Mode of Animal Exposure:</strong> &nbsp;
              <span style={{ fontWeight: 400 }}>{chosenModes.join(', ')}</span>
            </div>
          )}
          {chosenParts.length > 0 && (
            <div style={{ marginBottom: '3px' }}>
              <strong>2. Body Part Affected / Exposed:</strong> &nbsp;
              <span style={{ fontWeight: 400 }}>{chosenParts.join(', ')}</span>
            </div>
          )}
        </div>
      )}

      {/* 3. Type of Animal */}
      <div style={{ marginBottom: '4px', lineHeight: 1.3 }}>
        <strong>3. Type of Animal:</strong> &nbsp;
        {isBlank ? (
          <span>
            ( ) Dog &nbsp;&nbsp;&nbsp;&nbsp; ( ) Others: <span style={{ ...underlineStyle, minWidth: '140px' }}>&nbsp;</span>
          </span>
        ) : (
          <span style={{ fontWeight: 400 }}>{animalLabel}</span>
        )}
      </div>

      {/* 4. Past History of animal bite */}
      <div style={{ marginBottom: '8px', lineHeight: 1.3 }}>
        <strong>4. Past history of animal bite:</strong> &nbsp;
        {isBlank ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
            <div>
              ( ) Yes &nbsp;&nbsp; ( ) No &nbsp;&nbsp;&nbsp;&nbsp; If yes, specify dates: <span style={{ ...underlineStyle, minWidth: '110px' }}>&nbsp;</span>
            </div>
            <div>
              Was PEP Immunization completed: &nbsp;&nbsp; ( ) Yes &nbsp;&nbsp; ( ) No
            </div>
          </div>
        ) : hasPastBite === true ? (
          <span style={{ fontWeight: 400 }}>
            Yes {pastBiteDates ? `(Dates: ${pastBiteDates})` : ''} — Was PEP Immunization completed: {pepCompleted ? 'Yes' : 'No'}
          </span>
        ) : (
          <span style={{ fontWeight: 400 }}>No</span>
        )}
      </div>

      {/* Vaccination Record Table + ICD 10 Code */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1.5px solid #000',
              fontSize: '8.5pt',
            }}
          >
            <thead>
              <tr>
                <th
                  colSpan={5}
                  style={{
                    border: '1px solid #000',
                    padding: '2px 6px',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '8.5pt',
                    backgroundColor: '#ffffff',
                  }}
                >
                  Period Exposure Vaccination Record
                </th>
              </tr>
              <tr style={{ backgroundColor: '#ffffff' }}>
                <th style={{ border: '1px solid #000', padding: '2px 6px', width: '22%', textAlign: 'left' }}>Period</th>
                <th style={{ border: '1px solid #000', padding: '2px 4px', width: '24%', textAlign: 'center' }}>Adm Route</th>
                <th style={{ border: '1px solid #000', padding: '2px 4px', width: '18%', textAlign: 'center' }}>Date</th>
                <th style={{ border: '1px solid #000', padding: '2px 4px', width: '18%', textAlign: 'center' }}>Given by</th>
                <th style={{ border: '1px solid #000', padding: '2px 4px', width: '18%', textAlign: 'center' }}>Signature</th>
              </tr>
            </thead>
            <tbody>
              {/* Day 0 */}
              {renderTableRow('Day 0', d0Rec)}

              {/* Day 3 */}
              {renderTableRow('Day 3', d3Rec, apt3?.appointment_date)}

              {/* Day 7 */}
              {renderTableRow('Day 7', d7Rec, apt7?.appointment_date)}

              {/* Day 28 - rendered if blank or chosen/prescribed/given */}
              {(isBlank || hasD28) && renderTableRow('Day 28', d28Rec, apt28?.appointment_date)}

              {/* Booster 1 - rendered if blank or chosen */}
              {(isBlank || hasB1) && renderTableRow('Booster 1', b1Rec)}

              {/* Booster 2 - rendered if blank or chosen */}
              {(isBlank || hasB2) && renderTableRow('Booster 2', b2Rec)}

              {/* ERIG - rendered if blank or chosen */}
              {(isBlank || hasRig) && (
                <tr style={{ height: '21px' }}>
                  <td style={{ border: '1px solid #000', padding: '2px 6px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {isBlank ? (
                      <span>ERIG _________ ml</span>
                    ) : (
                      <span>ERIG <span style={{ fontWeight: 400 }}>{rigRec?.dosage_ml || rigCalculatedMl ? `${rigRec?.dosage_ml || rigCalculatedMl} ml` : ''}</span></span>
                    )}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
                    {!isBlank && rigGiven ? (rigRec?.route === 'wound_infiltration' ? 'Wound Infiltration' : (rigRec?.route || 'Wound Infiltration')) : ''}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
                    {!isBlank && rigGiven && rigRec?.treatment_date ? formatDate(rigRec.treatment_date) : ''}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
                    {!isBlank && rigGiven ? getStaffName(rigRec) : ''}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
                    {!isBlank && rigGiven ? renderSignature(rigRec) : ''}
                  </td>
                </tr>
              )}

              {/* TT - rendered if blank or chosen */}
              {(isBlank || hasTt) && (
                <tr style={{ height: '21px' }}>
                  <td style={{ border: '1px solid #000', padding: '2px 6px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {isBlank || !ttRec?.dosage_ml ? 'TT' : (<>TT <span style={{ fontWeight: 400 }}>{ttRec.dosage_ml} ml</span></>)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
                    {!isBlank && ttGiven ? (ttRec?.route || 'IM') : ''}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
                    {!isBlank && ttGiven && ttRec?.treatment_date ? formatDate(ttRec.treatment_date) : ''}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
                    {!isBlank && ttGiven ? getStaffName(ttRec) : ''}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
                    {!isBlank && ttGiven ? renderSignature(ttRec) : ''}
                  </td>
                </tr>
              )}

              {/* ATS - rendered if blank or chosen */}
              {(isBlank || hasAts) && (
                <tr style={{ height: '21px' }}>
                  <td style={{ border: '1px solid #000', padding: '2px 6px', fontWeight: 600, whiteSpace: 'nowrap' }}>ATS</td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
                    {!isBlank && atsGiven ? (atsRec?.route || 'IM') : ''}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
                    {!isBlank && atsGiven && atsRec?.treatment_date ? formatDate(atsRec.treatment_date) : ''}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
                    {!isBlank && atsGiven ? getStaffName(atsRec) : ''}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
                    {!isBlank && atsGiven ? renderSignature(atsRec) : ''}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ICD 10 Code on the right */}
        <div style={{ width: '120px', textAlign: 'center', padding: '4px' }}>
          <div style={{ fontWeight: 600, fontSize: '9pt', marginBottom: '6px' }}>ICD 10 Code</div>
          <div
            style={{
              borderBottom: '1.5px solid #000',
              paddingBottom: '2px',
              fontWeight: 400,
              fontSize: '9.5pt',
              minHeight: '18px',
            }}
          >
            {!isBlank ? icd10Code : '\u00A0'}
          </div>
        </div>
      </div>
    </div>
  );
}
