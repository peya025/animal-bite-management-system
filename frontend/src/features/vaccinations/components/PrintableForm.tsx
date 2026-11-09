import React from 'react';
import SignatureImage from '../../../shared/components/SignatureImage';
import { formatDate } from '../utils/printHelpers';

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

  const clinic = record?.clinic;
  const patient = record?.patient;
  const bite = record?.bite;
  const baseRecords = record?.treatment_records || record?.doses || [];
  const extraProphylaxis = record?.prophylaxis_records || [];
  const records: PrintableTreatmentRecord[] = [...baseRecords];
  extraProphylaxis.forEach((pr) => {
    if (!records.some((r) => (r.treatment_id && pr.treatment_id && r.treatment_id === pr.treatment_id) || r === pr)) {
      records.push(pr);
    }
  });

  const consultationHistory = Array.isArray(record?.consultation_history) ? record!.consultation_history! : [];
  const selectedConsultationId = (record as any)?.selected_consultation_id;
  const targetedConsultation = selectedConsultationId
    ? consultationHistory.find((c: any) => c.treatment_id === selectedConsultationId)
    : null;
  const latestConsultation = targetedConsultation || record?.latest_consultation || (consultationHistory.length > 0 ? consultationHistory[consultationHistory.length - 1] : null);

  // Clinic Accreditation details
  const clinicTitle = clinic?.name ? clinic.name.toUpperCase() : 'ABCARE';
  const clinicSubtitle = 'Official Animal Bite Treatment Form · Tagoloan RHU (DOH Accredited)';
  const dohAccredNo = clinic?.doh_accreditation_no || '2022-10-037';
  const philhealthAccredNo = clinic?.philhealth_accreditation_no || 'B10034377';
  const philhealthPin = patient?.philhealth_no || '—';

  // Dates & Registries
  const dateVal = formatDate(record?.cardDate || latestConsultation?.consultation_date || bite?.bite_date);
  const registryNoVal = record?.registryNo || bite?.case_number || '—';
  const hospitalNoVal = record?.hospitalNo || patient?.hospital_no || clinic?.hospital_no || '—';
  const referredByVal = record?.referredBy || bite?.referred_from || '—';

  // PhilHealth Status
  const rawPhStatus = (patient?.philhealth_status || '').toLowerCase();
  const isMember = rawPhStatus === 'member';
  const isDependent = rawPhStatus === 'dependent';
  const formattedPhStatus = isMember ? 'Member' : isDependent ? 'Dependent' : rawPhStatus ? (rawPhStatus.charAt(0).toUpperCase() + rawPhStatus.slice(1)) : '—';

  // Patient Demographic
  const patientName = patient?.full_name || '—';
  const age = patient?.age !== undefined && patient?.age !== null && patient?.age !== '' ? String(patient.age) : '—';
  const dob = formatDate(patient?.date_of_birth);
  const address = patient?.address || '—';

  const rawGender = (patient?.gender || '').toLowerCase();
  const isMale = rawGender === 'male' || rawGender === 'm';
  const isFemale = rawGender === 'female' || rawGender === 'f';
  const formattedSex = isMale ? 'Male' : isFemale ? 'Female' : '—';

  // Exposure Category
  const severityFallback = bite?.severity === 'minor' ? 'I' : bite?.severity === 'moderate' ? 'II' : bite?.severity === 'severe' ? 'III' : '';
  const rawCat = record?.exposureCategory || (latestConsultation as any)?.exposure_category || bite?.exposure_category || severityFallback || '';
  const normalizedCat = rawCat.replace(/^category\s*/i, '').trim().toUpperCase();
  const formattedCat = normalizedCat ? `Category ${normalizedCat}` : '—';

  const exposureDate = formatDate(bite?.bite_date);
  const placeOfExposure = bite?.bite_place || record?.placeOfExposure || '—';

  // Mode of Animal Exposure
  const rawMode = (record?.modeOfExposure || bite?.mode_of_exposure || '').toLowerCase();
  const isMode = (type: string) => {
    if (type === 'nibbling_uncovered') return rawMode.includes('uncovered') || rawMode.includes('nibbling');
    if (type === 'nibbling_wounded') return rawMode.includes('broken') || rawMode.includes('wounded');
    if (type === 'scratch_abrasion') return rawMode.includes('scratch') || rawMode.includes('abrasion');
    if (type === 'transdermal_bite') return rawMode.includes('transdermal') || rawMode.includes('bite');
    if (type === 'handling_ingestion') return rawMode.includes('ingestion') || rawMode.includes('handling') || rawMode.includes('meat');
    return false;
  };

  const chosenModes: string[] = [];
  if (isMode('nibbling_uncovered')) chosenModes.push('Nibbling/Licking of uncovered skin');
  if (isMode('nibbling_wounded')) chosenModes.push('Nibbling/Licking of wounded/broken skin');
  if (isMode('scratch_abrasion')) chosenModes.push('Scratch / Abrasion');
  if (isMode('transdermal_bite')) chosenModes.push('Transdermal Bite');
  if (isMode('handling_ingestion')) chosenModes.push('Handling / Ingestion of raw infected meat');

  // Body Part Affected Exposed
  const rawPart = (record?.bodyPartExposed || bite?.body_part_exposed || '').toLowerCase();
  const isBodyPart = (type: string) => {
    if (type === 'head_neck') return rawPart.includes('head') || rawPart.includes('neck');
    if (type === 'other_parts') {
      return rawPart.includes('upper') || rawPart.includes('lower') || rawPart.includes('extremities')
        || rawPart.includes('trunk') || rawPart.includes('torso') || rawPart.includes('other')
        || rawPart.includes('multiple') || rawPart.includes('site') || (!rawPart.includes('head') && !rawPart.includes('neck') && !rawPart.includes('na') && rawPart.length > 0);
    }
    if (type === 'na_ingestion') return rawPart.includes('na') || rawPart.includes('ingestion');
    return false;
  };

  const chosenParts: string[] = [];
  if (isBodyPart('head_neck')) chosenParts.push('Head and/or neck');
  if (isBodyPart('other_parts')) chosenParts.push('Other parts of the body');
  if (isBodyPart('na_ingestion')) chosenParts.push('N / A if Ingestion mode');

  // Animal Type
  const animal = (record?.animalType || bite?.animal_type || 'Dog').toLowerCase();
  const isDog = animal === 'dog' || animal === 'canine';
  const animalLabel = isDog ? 'Dog' : `Others: ${record?.animalTypeOthers || record?.animalType || 'unknown'}`;

  // Past History
  const hasPastBite = record?.pastBiteHistory;
  const pastBiteDates = record?.pastBiteDates ? formatDate(record.pastBiteDates) : '';
  const pepCompleted = record?.pastPepCompleted;

  // Prescriptions from Form 2
  const pOrders = latestConsultation?.prophylaxis_orders || {};
  const orderedRigProduct = (pOrders.rig && pOrders.rig !== 'none' ? pOrders.rig : '').trim().toLowerCase();
  const orderedTtProduct = (pOrders.tetanus_vaccine && pOrders.tetanus_vaccine !== 'none' ? pOrders.tetanus_vaccine : '').trim().toLowerCase();
  const orderedAtsProduct = (pOrders.tetanus_passive && pOrders.tetanus_passive !== 'none' ? pOrders.tetanus_passive : '').trim().toLowerCase();

  const isRecordGiven = (r?: PrintableTreatmentRecord) =>
    Boolean(r && !r.voided_at && r.status !== 'cancelled' && r.outcome !== 'not_administered' && (r.status === 'completed' || Boolean(r.treatment_date)));

  // Dose lookups
  const d0Rec = records.find((r) => !r.voided_at && (r.dose_number === 0 || r.period === 'Day 0'));
  const d3Rec = records.find((r) => !r.voided_at && (r.dose_number === 3 || r.period === 'Day 3'));
  const d7Rec = records.find((r) => !r.voided_at && (r.dose_number === 7 || r.period === 'Day 7'));
  const d28Rec = records.find((r) => !r.voided_at && (r.dose_number === 28 || r.period === 'Day 28' || r.dose_number === 14 || r.period === 'Day 14' || r.dose_number === 30 || r.period === 'Day 30'));
  const b1Rec = records.find((r) => !r.voided_at && (r.dose_number === 90 || r.dose_number === 100 || r.period === 'Booster 1' || (r.route && (r as any).appointment_type === 'booster')));
  const b2Rec = records.find((r) => !r.voided_at && (r.dose_number === 365 || r.dose_number === 101 || r.period === 'Booster 2'));

  // Comprehensive RIG lookup: matches dose_number, period, route, brand, or prescribed order
  const rigRec = records.find((r) => {
    if (r.voided_at) return false;
    if (r.dose_number === 200 || r.dose_number === 201 || r.period === 'ERIG') return true;
    if (r.route === 'wound_infiltration') return true;
    const med = (r.medication_given || r.vaccine_brand || '').trim().toLowerCase();
    if (['erig', 'hrig', 'rig'].includes(med)) return true;
    if (/erig|hrig|rig|rabies.*globulin|immuno|equirab|kamrab|berirab/i.test(med)) return true;
    if (orderedRigProduct && med === orderedRigProduct) return true;
    return false;
  });

  // Comprehensive TT lookup
  const ttRec = records.find((r) => {
    if (r.voided_at) return false;
    if (r.dose_number === 300 || r.period === 'TT') return true;
    const med = (r.medication_given || r.vaccine_brand || '').trim().toLowerCase();
    if (['tt', 'td', 'tdap', 'dtap'].includes(med)) return true;
    if (/tetan|toxoid|tetav/i.test(med) && !/anti[- ]?tetanus|serum|\bats\b/i.test(med)) return true;
    if (orderedTtProduct && med === orderedTtProduct) return true;
    return false;
  });

  // Comprehensive ATS lookup
  const atsRec = records.find((r) => {
    if (r.voided_at) return false;
    if (r.dose_number === 400 || r.dose_number === 401 || r.period === 'ATS') return true;
    const med = (r.medication_given || r.vaccine_brand || '').trim().toLowerCase();
    if (['ats', 'tig'].includes(med)) return true;
    if (/anti[- ]?tetanus|tetanus serum|\bats\b/i.test(med)) return true;
    if (orderedAtsProduct && med === orderedAtsProduct) return true;
    return false;
  });

  const rigGiven = isRecordGiven(rigRec);
  const ttGiven = isRecordGiven(ttRec);
  const atsGiven = isRecordGiven(atsRec);

  const allGiven = [d0Rec, d3Rec, d7Rec, d28Rec, b1Rec, b2Rec, rigRec, ttRec, atsRec].filter((r): r is PrintableTreatmentRecord => isRecordGiven(r));
  const treatmentStartDate = allGiven.length > 0 && allGiven[0]?.treatment_date
    ? formatDate(allGiven[0].treatment_date)
    : bite?.date_treatment_started
    ? formatDate(bite.date_treatment_started)
    : '';

  // Appointments lookup for future scheduled doses
  const appointments: any[] = (record as any)?.appointments || [];
  const apt3 = appointments.find((a) => a.dose_number === 3 || a.notes?.toLowerCase().includes('day 3'));
  const apt7 = appointments.find((a) => a.dose_number === 7 || a.notes?.toLowerCase().includes('day 7'));
  const apt28 = appointments.find((a) => a.dose_number === 28 || a.notes?.toLowerCase().includes('day 28'));

  // Weight & RIG Dosage
  const patientWeight = Number(
    latestConsultation?.prophylaxis_orders?.rig_weight_kg ||
    latestConsultation?.weight ||
    patient?.weight ||
    record?.patient?.weight ||
    (record as any)?.patient_reported_intake?.referral_weight ||
    0
  );

  let rigCalculatedMl = '';
  if (rigRec?.dosage_ml) {
    rigCalculatedMl = String(rigRec.dosage_ml);
  } else if (patientWeight > 0) {
    rigCalculatedMl = (patientWeight * 40 / 200).toFixed(1);
  }

  // Treatment plan determinations for omitting unchosen rows in Filled mode
  const planType = (bite?.plan_type || (bite as any)?.treatmentPlan?.plan_type || '').toLowerCase();
  const isBoosterPlan = planType.includes('booster');
  const hasD28 = isRecordGiven(d28Rec) || Boolean(apt28) || planType === 'full_pep_essen';
  const hasB1 = isRecordGiven(b1Rec) || isBoosterPlan;
  const hasB2 = isRecordGiven(b2Rec) || planType === 'two_dose_booster';
  const hasRig = isRecordGiven(rigRec) || Boolean(orderedRigProduct && orderedRigProduct !== 'none');
  const hasTt = isRecordGiven(ttRec) || Boolean(orderedTtProduct && orderedTtProduct !== 'none');
  const hasAts = isRecordGiven(atsRec) || Boolean(orderedAtsProduct && orderedAtsProduct !== 'none');

  const getStaffName = (rec?: PrintableTreatmentRecord) => {
    if (!rec) return '';
    const staff = rec.administered_by || (rec as any)?.administeredBy;
    if (typeof staff === 'object' && staff?.name) return staff.name;
    if (typeof staff === 'string' && staff) return staff;
    return 'Treatment Nurse';
  };

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
            <span style={{ fontWeight: 600 }}>{route || 'IM'}</span>
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
    fontWeight: 600,
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
            <div style={{ fontWeight: 700, marginBottom: '2px' }}>1. Mode of Animal Exposure</div>
            <div>( ) Nibbling/Licking of uncovered skin</div>
            <div>( ) Nibbling/Licking of wounded/broken skin</div>
            <div>( ) Scratch / Abrasion</div>
            <div>( ) Transdermal Bite</div>
            <div>( ) Handling / Ingestion of raw infected meat</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: '2px' }}>2. Body Part Affected / Exposed</div>
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
              <span style={{ fontWeight: 600 }}>{chosenModes.join(', ')}</span>
            </div>
          )}
          {chosenParts.length > 0 && (
            <div style={{ marginBottom: '3px' }}>
              <strong>2. Body Part Affected / Exposed:</strong> &nbsp;
              <span style={{ fontWeight: 600 }}>{chosenParts.join(', ')}</span>
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
          <span style={{ fontWeight: 600 }}>{animalLabel}</span>
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
          <span style={{ fontWeight: 600 }}>
            Yes {pastBiteDates ? `(Dates: ${pastBiteDates})` : ''} — Was PEP Immunization completed: {pepCompleted ? 'Yes' : 'No'}
          </span>
        ) : (
          <span style={{ fontWeight: 600 }}>No</span>
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
                    fontWeight: 700,
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
                      <span>ERIG {rigRec?.dosage_ml || rigCalculatedMl ? `${rigRec?.dosage_ml || rigCalculatedMl} ml` : ''}</span>
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
                    {isBlank ? 'TT' : (ttRec?.dosage_ml ? `TT ${ttRec.dosage_ml} ml` : 'TT')}
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
          <div style={{ fontWeight: 700, fontSize: '9pt', marginBottom: '6px' }}>ICD 10 Code</div>
          <div
            style={{
              borderBottom: '1.5px solid #000',
              paddingBottom: '2px',
              fontWeight: 700,
              fontSize: '9.5pt',
              minHeight: '18px',
            }}
          >
            {!isBlank ? (record?.icd10Code || 'Z20.3') : '\u00A0'}
          </div>
        </div>
      </div>
    </div>
  );
}
