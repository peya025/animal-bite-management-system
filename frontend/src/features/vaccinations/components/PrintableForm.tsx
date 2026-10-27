import React from 'react';
import SignatureImage from '../../../shared/components/SignatureImage';
import { formatDate, formatBodyPart, formatModeOfExposure } from '../utils/printHelpers';
import { getGlobalPrintLogos, resolveStorageUrl } from '../../../components/print';

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
  };
  bite?: {
    bite_date?: string;
    bite_place?: string;
    exposure_category?: string;
    severity?: string;
    case_number?: string;
    referred_from?: string;
    mode_of_exposure?: string;
    body_part_exposed?: string;
    animal_type?: string;
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
  treatment_records?: PrintableTreatmentRecord[];
  prophylaxis_records?: PrintableTreatmentRecord[];
  latest_consultation?: {
    prescribed_vaccine_type?: string | null;
    medication_treatment?: string | null;
    prophylaxis_orders?: {
      tetanus_category?: string | null;
      tetanus_vaccine?: string | null;
      tetanus_passive?: string | null;
      rig?: string | null;
      notes?: string | null;
    } | null;
    diagnosis?: string | null;
    remarks?: string | null;
  } | null;
  consultation_history?: any[];
  doses?: PrintableTreatmentRecord[];
  selected_consultation_id?: number | null;
}

export interface PrintableFormProps {
  record?: PrintableFormRecord | null;
  mode?: 'filled' | 'blank';
}

export default function PrintableForm({ record, mode = 'filled' }: PrintableFormProps) {
  const isBlank = mode === 'blank';

  const clinic = record?.clinic;
  const logos = record?.logos;
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

  const globalLogos = getGlobalPrintLogos(clinic as any);
  const leftLogoUrl = resolveStorageUrl(logos?.leftLogoUrl || clinic?.left_print_logo_url, clinic?.left_print_logo_path) || globalLogos.leftLogoUrl;
  const rightLogoUrl = resolveStorageUrl(logos?.rightLogoUrl || clinic?.right_print_logo_url, clinic?.right_print_logo_path) || globalLogos.rightLogoUrl;

  const clinicName = (clinic?.name || 'TAGOLOAN').trim();
  const dohAccredNo = clinic?.doh_accreditation_no || '2022-10-037';
  const philhealthAccredNo = clinic?.philhealth_accreditation_no || 'B10034377';
  const philhealthPin = patient?.philhealth_no || '—';

  const resolvedProvince = (clinic?.province || '').trim();
  const resolvedMunicipality = (clinic?.municipality || '').trim();
  const resolvedAddress = (clinic?.address || '').trim();
  const resolvedPhone = (clinic?.contact_number || (clinic as any)?.phone || '').trim();

  const geoSubtitle = [resolvedProvince, resolvedMunicipality].filter(Boolean).join(' • ');
  const contactParts = [
    'Animal Bite Treatment Center',
    resolvedPhone ? `Tel. ${resolvedPhone}` : '',
    resolvedAddress,
  ].filter(Boolean);
  const facilitySubtitle = contactParts.length > 1
    ? contactParts.join(' | ')
    : dohAccredNo
    ? `Animal Bite Treatment Center | DOH Accred. No. ${dohAccredNo}`
    : 'Animal Bite Treatment Center';

  // Format Patient Sex
  const rawGender = (patient?.gender || '').toLowerCase();
  const formattedSex = rawGender === 'male' || rawGender === 'm'
    ? 'Male'
    : rawGender === 'female' || rawGender === 'f'
    ? 'Female'
    : rawGender
    ? String(patient?.gender)
    : '—';

  // Format PH Status
  const rawPhStatus = (patient?.philhealth_status || '').toLowerCase();
  const formattedPhStatus = rawPhStatus === 'member'
    ? 'Member'
    : rawPhStatus === 'dependent'
    ? 'Dependent'
    : rawPhStatus
    ? String(patient?.philhealth_status)
    : '—';

  // Format Exposure Category
  const severityFallback = bite?.severity === 'minor'
    ? 'I'
    : bite?.severity === 'moderate'
    ? 'II'
    : bite?.severity === 'severe'
    ? 'III'
    : '';
  const rawCat = record?.exposureCategory || (latestConsultation as any)?.exposure_category || bite?.exposure_category || severityFallback || '';
  const normalizedCat = rawCat.replace(/^category\s*/i, '').trim().toUpperCase();
  const isCat1 = normalizedCat === 'I';
  const formattedCat = normalizedCat
    ? `Category ${normalizedCat}`
    : '—';

  // Format Animal Type
  const animalType = record?.animalType || 'Dog';
  const animalOthers = record?.animalTypeOthers || '';
  const formattedAnimal = animalType === 'Others'
    ? (animalOthers ? `Others: ${animalOthers}` : 'Others')
    : (animalType || '—');

  // Format Past Bite History
  const hasPastBite = record?.pastBiteHistory;
  const biteDates = record?.pastBiteDates;
  const pepCompleted = record?.pastPepCompleted;
  let formattedPastBite = '—';
  if (hasPastBite === true) {
    const dateText = biteDates ? ` (Dates: ${formatDate(biteDates)})` : '';
    formattedPastBite = `Yes${dateText} / PEP completed: ${pepCompleted ? 'Yes' : 'No'}`;
  } else if (hasPastBite === false) {
    formattedPastBite = `No / PEP completed: ${pepCompleted ? 'Yes' : 'No'}`;
  }

  // Prescriptions from Doctor Form 2
  const pOrders = latestConsultation?.prophylaxis_orders || {};
  const tetCat = (pOrders.tetanus_category || '').toLowerCase();
  const orderedTtProduct = pOrders.tetanus_vaccine && pOrders.tetanus_vaccine !== 'none' ? pOrders.tetanus_vaccine : null;
  const orderedAtsProduct = pOrders.tetanus_passive && pOrders.tetanus_passive !== 'none' ? pOrders.tetanus_passive : null;
  const orderedRigProduct = pOrders.rig && pOrders.rig !== 'none' ? pOrders.rig : null;
  const isTtPrescribed = Boolean(orderedTtProduct && (tetCat === 'tt' || tetCat === 'ats_tt' || !tetCat));
  const isAtsPrescribed = Boolean(orderedAtsProduct && (tetCat === 'ats' || tetCat === 'ats_tt' || !tetCat));
  const isRigPrescribed = Boolean(orderedRigProduct);
  const prescribedRabiesProduct = !isCat1 && latestConsultation?.prescribed_vaccine_type && latestConsultation.prescribed_vaccine_type !== 'none'
    ? latestConsultation.prescribed_vaccine_type
    : null;

  const isRecordGiven = (r?: PrintableTreatmentRecord) =>
    Boolean(r && !r.voided_at && r.status !== 'cancelled' && r.outcome !== 'not_administered' && (r.status === 'completed' || Boolean(r.treatment_date)));

  const isRecordNotAdministered = (r?: PrintableTreatmentRecord) =>
    Boolean(r && !r.voided_at && (r.status === 'cancelled' || r.outcome === 'not_administered'));

  const findTtRecord = () =>
    records.find((r) => {
      if (r.voided_at) return false;
      const med = (r.medication_given || '').trim();
      const medUpper = med.toUpperCase();
      if (r.dose_number === 300 || r.period === 'TT') return true;
      if (['TT', 'TD', 'TDAP', 'DTAP'].includes(medUpper)) return true;
      if (orderedTtProduct && medUpper === orderedTtProduct.toUpperCase()) return true;
      if (/tetan|toxoid|tetav/i.test(med) && !/anti[- ]?tetanus|serum|\bATS\b/i.test(med)) return true;
      return false;
    });

  const findAtsRecord = () =>
    records.find((r) => {
      if (r.voided_at) return false;
      const med = (r.medication_given || '').trim();
      const medUpper = med.toUpperCase();
      if (r.dose_number === 400 || r.dose_number === 401 || r.period === 'ATS') return true;
      if (['ATS', 'TIG'].includes(medUpper)) return true;
      if (orderedAtsProduct && medUpper === orderedAtsProduct.toUpperCase()) return true;
      if (/anti[- ]?tetanus|tetanus serum|\bATS\b/i.test(med)) return true;
      return false;
    });

  const findRigRecord = () =>
    records.find(
      (r) =>
        !r.voided_at &&
        (r.dose_number === 200 ||
          r.dose_number === 201 ||
          (r.medication_given ? ['ERIG', 'HRIG', 'RIG'].includes(r.medication_given.toUpperCase()) : false) ||
          r.period === 'ERIG')
    );

  const d0Rec = records.find((r) => !r.voided_at && (r.dose_number === 0 || r.period === 'Day 0'));
  const d3Rec = records.find((r) => !r.voided_at && (r.dose_number === 3 || r.period === 'Day 3'));
  const d7Rec = records.find((r) => !r.voided_at && (r.dose_number === 7 || r.period === 'Day 7'));
  const rigRec = findRigRecord();
  const ttRec = findTtRecord();
  const atsRec = findAtsRecord();

  const rabiesAdministeredRecords = [d0Rec, d3Rec, d7Rec].filter((r): r is PrintableTreatmentRecord => isRecordGiven(r));
  const ttGiven = isRecordGiven(ttRec);
  const ttNotAdmin = isRecordNotAdministered(ttRec);
  const atsGiven = isRecordGiven(atsRec);
  const atsNotAdmin = isRecordNotAdministered(atsRec);
  const rigGiven = isRecordGiven(rigRec);
  const rigNotAdmin = isRecordNotAdministered(rigRec);

  const consultAdminStatus = (latestConsultation as any)?.administration_status;
  const isConsultUnadministered = consultAdminStatus === 'Not Administered' || (consultAdminStatus && String(consultAdminStatus).toLowerCase() === 'not_administered');
  const isConsultAdministered = consultAdminStatus === 'Administered' || (consultAdminStatus && String(consultAdminStatus).toLowerCase() === 'administered');
  const isConsultNoInj = consultAdminStatus === 'Completed Without Injection' || (!prescribedRabiesProduct && !isTtPrescribed && !isAtsPrescribed && isCat1);

  const antiRabiesStatusLabel = isConsultUnadministered && !isCat1
    ? (prescribedRabiesProduct ? 'Not Administered' : 'Not Prescribed')
    : rabiesAdministeredRecords.length > 0
    ? 'Administered'
    : isCat1
    ? 'Not Indicated'
    : prescribedRabiesProduct
    ? 'Prescribed – Pending Administration'
    : normalizedCat === 'II' || normalizedCat === 'III'
    ? 'Not Prescribed'
    : 'Not Indicated';

  const ttStatusLabel = isConsultUnadministered
    ? (isTtPrescribed ? 'Not Administered' : 'Not Prescribed')
    : ttGiven
    ? 'Administered'
    : ttNotAdmin
    ? 'Not Administered'
    : isTtPrescribed
    ? (isConsultAdministered ? 'Administered' : 'Prescribed – Pending Administration')
    : atsGiven
    ? 'Not Administered'
    : 'Not Prescribed';

  const atsStatusLabel = isConsultUnadministered
    ? (isAtsPrescribed ? 'Not Administered' : 'Not Prescribed')
    : atsGiven
    ? 'Administered'
    : atsNotAdmin
    ? 'Not Administered'
    : isAtsPrescribed
    ? (isConsultAdministered ? 'Administered' : 'Prescribed – Pending Administration')
    : ttGiven
    ? 'Not Administered'
    : 'Not Prescribed';

  const allAdministeredRecords: PrintableTreatmentRecord[] = [
    ...rabiesAdministeredRecords,
    ...(rigGiven && rigRec ? [rigRec] : []),
    ...(ttGiven && ttRec ? [ttRec] : []),
    ...(atsGiven && atsRec ? [atsRec] : []),
  ];

  const allNotAdministeredRecords: PrintableTreatmentRecord[] = [
    ...(rigNotAdmin && rigRec ? [rigRec] : []),
    ...(ttNotAdmin && ttRec ? [ttRec] : []),
    ...(atsNotAdmin && atsRec ? [atsRec] : []),
  ];

  const hasPendingOrders =
    (!isCat1 && Boolean(prescribedRabiesProduct) && rabiesAdministeredRecords.length === 0) ||
    (isTtPrescribed && !ttGiven && !ttNotAdmin) ||
    (isAtsPrescribed && !atsGiven && !atsNotAdmin) ||
    (isRigPrescribed && !rigGiven && !rigNotAdmin);

  const overallTreatmentStatus =
    isConsultUnadministered
      ? 'Not Administered'
      : isConsultNoInj
      ? 'No Injection Required'
      : isConsultAdministered
      ? 'Administered'
      : isCat1 && !isTtPrescribed && !isAtsPrescribed && allAdministeredRecords.length === 0 && allNotAdministeredRecords.length === 0
      ? 'No Injection Required'
      : hasPendingOrders
      ? 'Prescribed – Pending Administration'
      : allAdministeredRecords.length > 0
      ? 'Administered'
      : allNotAdministeredRecords.length > 0
      ? 'Not Administered'
      : 'No Injection Required';

  const getStaffDisplay = (r?: PrintableTreatmentRecord) => {
    if (!r) return '';
    const staff = r.administered_by || r.administeredBy;
    const name = typeof staff === 'object' ? staff?.name : r.administered_by || '';
    const lic = typeof staff === 'object' ? staff?.professional_license_no : r.professional_license_no || '';
    if (!name) return '';
    return lic ? `${name} (PRC: ${lic})` : String(name);
  };

  const administeredProductSummary = allAdministeredRecords.length > 0
    ? Array.from(
        new Set(
          allAdministeredRecords.map(
            (r) => r.vaccine_brand || r.vaccine_type || r.medication_given || 'Administered Vaccine'
          )
        )
      ).join(', ')
    : hasPendingOrders
    ? `Pending (${[prescribedRabiesProduct, isTtPrescribed ? orderedTtProduct : null, isAtsPrescribed ? orderedAtsProduct : null, isRigPrescribed ? orderedRigProduct : null].filter(Boolean).join(', ')})`
    : allNotAdministeredRecords.length > 0
    ? `Not Administered (${allNotAdministeredRecords.map((r) => r.medication_given).filter(Boolean).join(', ')})`
    : 'None (No Injection Required)';

  const administeredDateSummary = allAdministeredRecords.length > 0
    ? Array.from(
        new Set(
          allAdministeredRecords
            .map((r) => (r.treatment_date ? formatDate(r.treatment_date) : ''))
            .filter(Boolean)
        )
      ).join(', ')
    : hasPendingOrders
    ? 'Pending Administration'
    : 'N/A';

  const administeredDoseRouteSummary = allAdministeredRecords.length > 0
    ? allAdministeredRecords
        .map((r) => {
          const parts: string[] = [];
          if (r.dose_iu) parts.push(`${r.dose_iu} IU`);
          if (r.dosage_ml) parts.push(`${r.dosage_ml} mL`);
          if (r.route) parts.push(r.route.replaceAll('_', ' '));
          if (r.injection_site) parts.push(`(${r.injection_site})`);
          return parts.join(' ') || r.route || 'IM';
        })
        .join(' · ')
    : hasPendingOrders
    ? 'Pending Administration'
    : 'N/A';

  const administeredBySummary = allAdministeredRecords.length > 0
    ? Array.from(new Set(allAdministeredRecords.map((r) => getStaffDisplay(r) || 'Staff Nurse'))).join(', ')
    : allNotAdministeredRecords.length > 0
    ? Array.from(new Set(allNotAdministeredRecords.map((r) => getStaffDisplay(r) || 'Staff Nurse'))).join(', ')
    : 'N/A';

  const remarksSummary = (() => {
    const reasons = allNotAdministeredRecords
      .map((r) => (r.remarks ? `${r.medication_given}: ${r.remarks}` : `${r.medication_given}: Not administered`))
      .filter(Boolean);
    if (reasons.length > 0) return reasons.join(' | ');
    if (isCat1 && overallTreatmentStatus === 'No Injection Required') {
      return 'Category I exposure — Anti-rabies PEP not indicated; no injection required.';
    }
    if (hasPendingOrders) {
      return pOrders.notes
        ? `Prescribed — Pending nurse administration (${pOrders.notes})`
        : 'Prescribed by physician — Pending nurse administration.';
    }
    if (pOrders.notes) return pOrders.notes;
    return latestConsultation?.diagnosis || 'Administered as prescribed.';
  })();

  // Row definition for the unified vaccination table
  const unifiedRows = [
    {
      item: 'Day 0',
      rec: d0Rec,
      defaultRoute: 'IM',
      fallbackStatus: isCat1
        ? 'Not Indicated'
        : prescribedRabiesProduct
        ? `Prescribed (${prescribedRabiesProduct}) – Pending Administration`
        : '',
    },
    {
      item: 'Day 3',
      rec: d3Rec,
      defaultRoute: 'IM',
      fallbackStatus: isCat1 ? 'Not Indicated' : '',
    },
    {
      item: 'Day 7',
      rec: d7Rec,
      defaultRoute: 'IM',
      fallbackStatus: isCat1 ? 'Not Indicated' : '',
    },
    {
      item: 'ERIG',
      rec: rigRec,
      defaultRoute: 'Infiltration / IM',
      fallbackStatus: rigNotAdmin
        ? `Not Administered${rigRec?.remarks ? ` (${rigRec.remarks})` : ''}`
        : isRigPrescribed
        ? `Prescribed (${orderedRigProduct}) – Pending Administration`
        : isCat1 || normalizedCat === 'II'
        ? 'Not Indicated'
        : 'Not Prescribed',
    },
    {
      item: 'Tetanus vaccine',
      rec: ttRec,
      defaultRoute: 'IM',
      fallbackStatus: ttNotAdmin
        ? `Not Administered${ttRec?.remarks ? ` (${ttRec.remarks})` : ''}`
        : isTtPrescribed
        ? `Prescribed (${orderedTtProduct}) – Pending Administration`
        : atsGiven
        ? 'Not Administered'
        : 'Not Prescribed',
    },
    {
      item: 'ATS',
      rec: atsRec,
      defaultRoute: 'IM',
      fallbackStatus: atsNotAdmin
        ? `Not Administered${atsRec?.remarks ? ` (${atsRec.remarks})` : ''}`
        : isAtsPrescribed
        ? `Prescribed (${orderedAtsProduct}) – Pending Administration`
        : ttGiven
        ? 'Not Administered'
        : 'Not Prescribed',
    },
  ];

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
        color: '#111827',
        fontFamily: "'Inter', Arial, sans-serif",
        boxSizing: 'border-box',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <style>{`
        @page {
          size: A4;
          margin: 12mm;
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
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #ccc !important;
            padding: 6px 8px !important;
          }
          tr, section {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* 1. HEADER */}
      <section
        style={{
          marginBottom: '14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '6px',
          }}
        >
          {/* Left Seal */}
          <div style={{ width: '60px', height: '60px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {leftLogoUrl ? (
              <img
                src={leftLogoUrl}
                alt="Left Seal"
                style={{ maxHeight: '60px', maxWidth: '60px', width: 'auto', height: 'auto', objectFit: 'contain' }}
                onError={(e) => { (e.currentTarget as HTMLElement).style.visibility = 'hidden'; }}
              />
            ) : (
              <div style={{ width: '60px', height: '60px' }} />
            )}
          </div>

          {/* Center Details */}
          <div style={{ flex: 1, textAlign: 'center', padding: '0 8px' }}>
            <div style={{ fontSize: '8.5pt', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Republic of the Philippines{geoSubtitle ? ` • ${geoSubtitle}` : ' • Department of Health'}
            </div>
            <h1 style={{ fontSize: '13.5pt', fontWeight: 800, color: '#111827', margin: '2px 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>
              {clinicName}
            </h1>
            <div style={{ fontSize: '8.5pt', color: '#374151', lineHeight: 1.3 }}>
              {facilitySubtitle}
            </div>
          </div>

          {/* Right Seal */}
          <div style={{ width: '60px', height: '60px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {rightLogoUrl ? (
              <img
                src={rightLogoUrl}
                alt="Right Seal"
                style={{ maxHeight: '60px', maxWidth: '60px', width: 'auto', height: 'auto', objectFit: 'contain' }}
                onError={(e) => { (e.currentTarget as HTMLElement).style.visibility = 'hidden'; }}
              />
            ) : (
              <div style={{ width: '60px', height: '60px' }} />
            )}
          </div>
        </div>

        {/* Double Separator Line */}
        <div style={{ borderTop: '2px solid #000000', marginBottom: '2px' }} />
        <div style={{ borderTop: '1px solid #000000' }} />
      </section>

      {/* 2. REGISTRY BLOCK */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          columnGap: '24px',
          rowGap: '8px',
          paddingBottom: '16px',
          borderBottom: '1px solid #ccc',
          marginBottom: '16px',
        }}
      >
        {/* Date */}
        <div>
          <span style={{ display: 'block', fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '2px' }}>
            Date
          </span>
          <span style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 500 }}>
            {isBlank ? '________________________' : formatDate(record?.cardDate)}
          </span>
        </div>

        {/* Registry No */}
        <div>
          <span style={{ display: 'block', fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '2px' }}>
            Registry No.
          </span>
          <span style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 500 }}>
            {isBlank ? '________________________' : record?.registryNo || bite?.case_number || '—'}
          </span>
        </div>

        {/* Hospital No */}
        <div>
          <span style={{ display: 'block', fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '2px' }}>
            Hospital No.
          </span>
          <span style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 500 }}>
            {isBlank ? '________________________' : record?.hospitalNo || patient?.hospital_no || '—'}
          </span>
        </div>

        {/* Referred by */}
        <div>
          <span style={{ display: 'block', fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '2px' }}>
            Referred by
          </span>
          <span style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 500 }}>
            {isBlank ? '________________________' : record?.referredBy || bite?.referred_from || '—'}
          </span>
        </div>

        {/* PhilHealth Accred / PIN */}
        <div>
          <span style={{ display: 'block', fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '2px' }}>
            PhilHealth Accred / PIN
          </span>
          <span style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 500 }}>
            {isBlank ? '________________________' : `${philhealthAccredNo} / ${philhealthPin}`}
          </span>
        </div>

        {/* PH Status */}
        <div>
          <span style={{ display: 'block', fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '2px' }}>
            PH Status
          </span>
          <span style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 500 }}>
            {isBlank ? '☐ Member   ☐ Dependent' : formattedPhStatus}
          </span>
        </div>
      </section>

      {/* 3. PATIENT BLOCK */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 0.9fr 0.9fr 1.6fr',
          columnGap: '16px',
          rowGap: '8px',
          paddingBottom: '16px',
          borderBottom: '1px solid #ccc',
          marginBottom: '16px',
        }}
      >
        {/* Name */}
        <div>
          <span style={{ display: 'block', fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '2px' }}>
            Patient Name
          </span>
          <span style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 600 }}>
            {isBlank ? '________________________' : patient?.full_name || '—'}
          </span>
        </div>

        {/* Age / Sex */}
        <div>
          <span style={{ display: 'block', fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '2px' }}>
            Age / Sex
          </span>
          <span style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 500 }}>
            {isBlank ? 'Age: ___  Sex: ☐ M ☐ F' : `${patient?.age ?? '—'} / ${formattedSex}`}
          </span>
        </div>

        {/* DOB */}
        <div>
          <span style={{ display: 'block', fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '2px' }}>
            Date of Birth
          </span>
          <span style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 500 }}>
            {isBlank ? '____________________' : formatDate(patient?.date_of_birth)}
          </span>
        </div>

        {/* Address */}
        <div>
          <span style={{ display: 'block', fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '2px' }}>
            Address
          </span>
          <span style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 500 }}>
            {isBlank ? '________________________' : patient?.address || '—'}
          </span>
        </div>

        {/* Exposure Category */}
        <div>
          <span style={{ display: 'block', fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '2px' }}>
            Exposure Category
          </span>
          <span style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 500 }}>
            {isBlank ? '☐ Cat. I   ☐ Cat. II   ☐ Cat. III' : formattedCat}
          </span>
        </div>

        {/* Exposure Date */}
        <div>
          <span style={{ display: 'block', fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '2px' }}>
            Exposure Date
          </span>
          <span style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 500 }}>
            {isBlank ? '____________________' : formatDate(bite?.bite_date)}
          </span>
        </div>

        {/* Place of Exposure */}
        <div>
          <span style={{ display: 'block', fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '2px' }}>
            Place of Exposure
          </span>
          <span style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 500 }}>
            {isBlank ? '____________________' : bite?.bite_place || 'Tagoloan, Misamis Oriental'}
          </span>
        </div>

        {/* Treatment Start */}
        <div>
          <span style={{ display: 'block', fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '2px' }}>
            Treatment Start
          </span>
          <span style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 500 }}>
            {isBlank
              ? '____________________'
              : allAdministeredRecords.length > 0 && allAdministeredRecords[0]?.treatment_date
              ? formatDate(allAdministeredRecords[0].treatment_date)
              : hasPendingOrders
              ? 'Pending Administration'
              : overallTreatmentStatus === 'No Injection Required'
              ? 'No Injection Required'
              : 'Not Administered'}
          </span>
        </div>
      </section>

      {/* 4. EXPOSURE DETAILS */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          columnGap: '16px',
          paddingBottom: '16px',
          borderBottom: '1px solid #ccc',
          marginBottom: '16px',
        }}
      >
        {/* Mode of Exposure */}
        <div>
          <span style={{ display: 'block', fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '4px' }}>
            Mode of Exposure
          </span>
          {isBlank ? (
            <div style={{ fontSize: '9pt', color: '#374151', lineHeight: 1.4 }}>
              <div>☐ Lick, intact skin</div>
              <div>☐ Lick, broken skin</div>
              <div>☐ Scratch / abrasion</div>
              <div>☐ Transdermal bite</div>
              <div>☐ Raw meat contact</div>
            </div>
          ) : (
            <span style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 500 }}>
              {formatModeOfExposure(record?.modeOfExposure || bite?.mode_of_exposure)}
            </span>
          )}
        </div>

        {/* Body Part */}
        <div>
          <span style={{ display: 'block', fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '4px' }}>
            Body Part
          </span>
          <span style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 500 }}>
            {isBlank ? '________________________' : formatBodyPart(record?.bodyPartExposed || bite?.body_part_exposed)}
          </span>
        </div>

        {/* Type of Animal */}
        <div>
          <span style={{ display: 'block', fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '4px' }}>
            Type of Animal
          </span>
          {isBlank ? (
            <div style={{ fontSize: '9pt', color: '#374151', lineHeight: 1.5 }}>
              <div>☐ Dog</div>
              <div>☐ Cat</div>
              <div>☐ Others: ____________</div>
            </div>
          ) : (
            <span style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 500 }}>
              {formattedAnimal}
            </span>
          )}
        </div>

        {/* Past Bite History */}
        <div>
          <span style={{ display: 'block', fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: '4px' }}>
            Past Bite History
          </span>
          {isBlank ? (
            <div style={{ fontSize: '9pt', color: '#374151', lineHeight: 1.5 }}>
              <div>Bite history: ☐ Yes  ☐ No</div>
              <div>PEP completed: ☐ Yes  ☐ No</div>
            </div>
          ) : (
            <span style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 500 }}>
              {formattedPastBite}
            </span>
          )}
        </div>
      </section>

      {/* 5. TREATMENT / VACCINE ADMINISTRATION DETAILS */}
      <section
        style={{
          padding: '10px 12px',
          border: '1px solid #ccc',
          backgroundColor: '#fafafa',
          marginBottom: '14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #d1d5db',
            paddingBottom: '6px',
            marginBottom: '8px',
          }}
        >
          <span
            style={{
              fontSize: '9.5pt',
              fontWeight: 700,
              color: '#111827',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Treatment / Vaccine Administration Details
            {latestConsultation && consultationHistory.length > 1 && (
              <span style={{ fontSize: '8.5pt', fontWeight: 600, color: '#0284c7', marginLeft: '8px', textTransform: 'none' }}>
                (Assessment #{consultationHistory.indexOf(latestConsultation) + 1}: {(latestConsultation as any)?.is_returning_reassessment ? 'Doctor Reassessment' : 'Initial Consultation'})
              </span>
            )}
          </span>
          {!isBlank && (
            <span
              style={{
                fontSize: '9pt',
                fontWeight: 700,
                color:
                  overallTreatmentStatus === 'Administered'
                    ? '#047857'
                    : overallTreatmentStatus === 'No Injection Required'
                    ? '#1e40af'
                    : overallTreatmentStatus === 'Not Administered'
                    ? '#b45309'
                    : '#4b5563',
              }}
            >
              Treatment Status: {overallTreatmentStatus}
            </span>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            columnGap: '14px',
            rowGap: '8px',
            marginBottom: '8px',
          }}
        >
          <div>
            <span style={{ display: 'block', fontSize: '8.5pt', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Exposure Category
            </span>
            <span style={{ fontSize: '9.5pt', color: '#111827', fontWeight: 600 }}>
              {isBlank ? 'Cat. I / II / III' : formattedCat}
            </span>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '8.5pt', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Anti-Rabies Vaccine
            </span>
            <span style={{ fontSize: '9.5pt', color: '#111827', fontWeight: 600 }}>
              {isBlank ? '☐ Administered ☐ Not Indicated' : antiRabiesStatusLabel}
            </span>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '8.5pt', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
              TT (Tetanus Toxoid)
            </span>
            <span style={{ fontSize: '9.5pt', color: '#111827', fontWeight: 600 }}>
              {isBlank ? '☐ Administered ☐ Not Administered' : ttStatusLabel}
            </span>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '8.5pt', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
              ATS (Anti-Tetanus Serum)
            </span>
            <span style={{ fontSize: '9.5pt', color: '#111827', fontWeight: 600 }}>
              {isBlank ? '☐ Administered ☐ Not Administered' : atsStatusLabel}
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 0.9fr 1.1fr 1.1fr',
            columnGap: '14px',
            rowGap: '6px',
            paddingTop: '6px',
            borderTop: '1px dashed #d1d5db',
          }}
        >
          <div>
            <span style={{ display: 'block', fontSize: '8.5pt', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Vaccine / Medicine Name
            </span>
            <span style={{ fontSize: '9.5pt', color: '#111827', fontWeight: 500 }}>
              {isBlank ? '________________________' : administeredProductSummary}
            </span>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '8.5pt', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Date Administered
            </span>
            <span style={{ fontSize: '9.5pt', color: '#111827', fontWeight: 500 }}>
              {isBlank ? '________________' : administeredDateSummary}
            </span>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '8.5pt', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Dose / Route
            </span>
            <span style={{ fontSize: '9.5pt', color: '#111827', fontWeight: 500 }}>
              {isBlank ? '________________' : administeredDoseRouteSummary}
            </span>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '8.5pt', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Administered By
            </span>
            <span style={{ fontSize: '9.5pt', color: '#111827', fontWeight: 500 }}>
              {isBlank ? '________________' : administeredBySummary}
            </span>
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '2px' }}>
            <span style={{ fontSize: '8.5pt', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginRight: '6px' }}>
              Remarks:
            </span>
            <span style={{ fontSize: '9.5pt', color: '#111827', fontWeight: 500 }}>
              {isBlank ? '________________________________________________________________________' : remarksSummary}
            </span>
          </div>
        </div>

        {/* PREVIOUS vs RETURNING CONSULTATION BREAKDOWN */}
        {!isBlank && consultationHistory.length > 1 && (
          <div
            style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid #d1d5db',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '8px',
            }}
          >
            {consultationHistory.map((c: any, idx: number) => {
              const isReturningVisit = idx > 0 || Boolean(c.is_reassessment);
              const prescribedItems = [
                c.prescribed_vaccine_type ? `PEP: ${c.prescribed_vaccine_type}` : (c.exposure_category === 'I' ? 'Anti-Rabies: Not Indicated' : null),
                c.prescribed_tt ? `TT: ${c.prescribed_tt}` : null,
                c.prescribed_ats ? `ATS: ${c.prescribed_ats}` : null,
                c.prescribed_rig ? `ERIG: ${c.prescribed_rig}` : null,
              ].filter(Boolean).join(' · ') || 'No Injection Prescribed';

              const adminItems = Array.isArray(c.administered_items) && c.administered_items.length > 0
                ? c.administered_items.map((a: any) => `${a.medication} (${a.date ? formatDate(a.date) : '—'}${a.administered_by ? ` by ${a.administered_by}` : ''})`).join(', ')
                : null;

              const statusText =
                c.administration_status === 'administered'
                  ? `Administered${adminItems ? `: ${adminItems}` : ''}`
                  : c.administration_status === 'completed_without_injection'
                  ? 'Completed Without Injection'
                  : c.administration_status === 'not_administered'
                  ? `Not Administered${c.not_administered_reason ? ` (${c.not_administered_reason})` : ''}`
                  : 'Pending Treatment / Not Administered';

              return (
                <div
                  key={c.treatment_id || idx}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    padding: '6px 8px',
                    fontSize: '8.5pt',
                    lineHeight: 1.35,
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#111827', marginBottom: '2px', textTransform: 'uppercase' }}>
                    {isReturningVisit ? `Returning Consultation (Reassessment)` : `Previous Consultation`} — {c.consultation_date ? formatDate(c.consultation_date) : '—'}
                  </div>
                  <div>
                    <strong>Exposure Category:</strong> Category {c.exposure_category || '—'}
                    {isReturningVisit && (c.blood_pressure || c.temperature || c.weight) && (
                      <span> · <strong>Updated Vitals:</strong> BP {c.blood_pressure || '—'}, {c.temperature ? `${c.temperature}°C` : '—'}, {c.weight ? `${c.weight}kg` : '—'}</span>
                    )}
                  </div>
                  {c.reassessment_decision && (
                    <div>
                      <strong>Doctor Reassessment:</strong> {String(c.reassessment_decision).replace(/_/g, ' ')}
                      {c.reassessment_notes ? ` (${c.reassessment_notes})` : ''}
                    </div>
                  )}
                  <div>
                    <strong>Prescribed:</strong> {prescribedItems}
                  </div>
                  <div>
                    <strong>Administration Status:</strong> {statusText}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. VACCINATION RECORD (ONE MERGED TABLE) */}
      <section style={{ marginBottom: '16px' }}>
        <table
          style={{
            width: '100%',
            tableLayout: 'fixed',
            borderCollapse: 'collapse',
            fontSize: '10.5pt',
            border: '1px solid #ccc',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #ccc' }}>
              <th style={{ width: '14%', padding: '6px 8px', textAlign: 'left', fontSize: '9pt', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, border: '1px solid #ccc' }}>
                Item
              </th>
              <th style={{ width: '10%', padding: '6px 8px', textAlign: 'center', fontSize: '9pt', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, border: '1px solid #ccc' }}>
                Route
              </th>
              <th style={{ width: '16%', padding: '6px 8px', textAlign: 'center', fontSize: '9pt', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, border: '1px solid #ccc', whiteSpace: 'nowrap' }}>
                Date
              </th>
              <th style={{ width: '28%', padding: '6px 8px', textAlign: 'left', fontSize: '9pt', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, border: '1px solid #ccc' }}>
                Vaccine / Lot
              </th>
              <th style={{ width: '20%', padding: '6px 8px', textAlign: 'left', fontSize: '9pt', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, border: '1px solid #ccc' }}>
                Given by (Name + PRC)
              </th>
              <th style={{ width: '12%', padding: '6px 8px', textAlign: 'center', fontSize: '9pt', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, border: '1px solid #ccc' }}>
                Signature
              </th>
            </tr>
          </thead>
          <tbody>
            {unifiedRows.map((row) => {
              const rec = row.rec;
              const isGiven = isRecordGiven(rec);
              const isNotAdmin = isRecordNotAdministered(rec);
              const staff = rec?.administered_by || (rec as any)?.administeredBy;
              const staffName = typeof staff === 'object' ? staff?.name : rec?.administered_by || null;
              const staffLicense = typeof staff === 'object' ? staff?.professional_license_no : null;

              return (
                <tr key={row.item} style={{ height: '28px' }}>
                  {/* 1. Item */}
                  <td style={{ padding: '6px 8px', border: '1px solid #ccc', fontWeight: 600, color: '#111827' }}>
                    {row.item}
                  </td>

                  {/* 2. Route */}
                  <td style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {isBlank ? (
                      <span style={{ fontSize: '9pt', color: '#475569', whiteSpace: 'nowrap' }}>
                        {row.item === 'ATS' || row.item === 'Tetanus vaccine' ? '☐ IM' : '☐ ID  ☐ IM'}
                      </span>
                    ) : isGiven ? (
                      rec?.route ? rec.route.replaceAll('_', ' ') : 'IM'
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* 3. Date */}
                  <td style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {isBlank
                      ? ''
                      : isGiven && rec?.treatment_date
                      ? formatDate(rec.treatment_date)
                      : isNotAdmin && (rec?.scheduled_date || rec?.treatment_date)
                      ? formatDate(rec.scheduled_date || rec.treatment_date)
                      : '—'}
                  </td>

                  {/* 4. Vaccine / Lot */}
                  <td style={{ padding: '6px 8px', border: '1px solid #ccc' }}>
                    {isBlank ? (
                      ''
                    ) : isGiven ? (
                      <span>
                        {rec?.vaccine_type || rec?.vaccine_brand || rec?.medication_given || '—'}
                        {(rec?.batch_number || rec?.batch_no) && (
                          <span style={{ color: '#4b5563', fontSize: '9pt' }}>
                            {` · Lot: ${rec.batch_number || rec.batch_no}`}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span style={{ color: '#6b7280', fontSize: '9pt' }}>
                        {row.fallbackStatus || '—'}
                      </span>
                    )}
                  </td>

                  {/* 5. Given by */}
                  <td style={{ padding: '6px 8px', border: '1px solid #ccc' }}>
                    {isBlank ? (
                      ''
                    ) : isGiven ? (
                      <span>
                        {staffName || 'Staff Nurse'}
                        {staffLicense && (
                          <span style={{ color: '#4b5563', fontSize: '9pt' }}>
                            {` (PRC: ${staffLicense})`}
                          </span>
                        )}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* 6. Signature */}
                  <td style={{ padding: '4px 6px', border: '1px solid #ccc', textAlign: 'center', verticalAlign: 'middle' }}>
                    {isBlank ? (
                      ''
                    ) : isGiven && rec?.treatment_id ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '28px', overflow: 'hidden' }}>
                        <SignatureImage
                          endpoint={`/vaccination-records/${rec.treatment_id}/signature`}
                          style={{ maxHeight: '28px', maxWidth: '85px', objectFit: 'contain' }}
                          silentFallback={true}
                        />
                      </div>
                    ) : isGiven && rec?.signature ? (
                      <span style={{ fontSize: '9pt', color: '#374151' }}>Signed</span>
                    ) : (
                      ''
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* 6. FOOTER */}
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '9pt',
          color: '#6b7280',
          paddingTop: '8px',
        }}
      >
        <div>
          <span>ICD-10 Code: </span>
          <strong style={{ color: '#111827' }}>
            {isBlank ? '________________' : record?.icd10Code || 'Z20.3'}
          </strong>
        </div>
        <div>
          Tagoloan RHU Official Animal Bite Treatment Form
        </div>
      </footer>
    </div>
  );
}
