import React from 'react';
import SignatureImage from '../../../shared/components/SignatureImage';
import { formatDate, formatBodyPart, formatModeOfExposure } from '../utils/printHelpers';

export interface PrintableTreatmentRecord {
  dose_number?: number;
  period?: string;
  route?: string;
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
  voided_at?: string | null;
  medication_given?: string;
}

export interface PrintableFormRecord {
  clinic?: {
    name?: string;
    doh_accreditation_no?: string;
    philhealth_accreditation_no?: string;
    hospital_no?: string;
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
  doses?: PrintableTreatmentRecord[];
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
  const records = record?.treatment_records || record?.doses || [];

  const clinicName = clinic?.name || 'TAGOLOAN ANIMAL BITE TREATMENT CENTER';
  const dohAccredNo = clinic?.doh_accreditation_no || '2022-10-037';
  const philhealthAccredNo = clinic?.philhealth_accreditation_no || 'B10034377';
  const philhealthPin = patient?.philhealth_no || '—';

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
  const rawCat = record?.exposureCategory || bite?.exposure_category || '';
  const formattedCat = rawCat
    ? rawCat.toUpperCase().startsWith('CAT')
      ? rawCat
      : `Category ${rawCat}`
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

  // Row definition for the unified vaccination table
  const unifiedRows = [
    {
      item: 'Day 0',
      rec: records.find((r) => !r.voided_at && (r.dose_number === 0 || r.period === 'Day 0')),
      defaultRoute: 'IM',
    },
    {
      item: 'Day 3',
      rec: records.find((r) => !r.voided_at && (r.dose_number === 3 || r.period === 'Day 3')),
      defaultRoute: 'IM',
    },
    {
      item: 'Day 7',
      rec: records.find((r) => !r.voided_at && (r.dose_number === 7 || r.period === 'Day 7')),
      defaultRoute: 'IM',
    },
    {
      item: 'ERIG',
      rec: records.find(
        (r) =>
          !r.voided_at &&
          (r.dose_number === 200 ||
            (r.medication_given ? ['ERIG', 'HRIG', 'RIG', 'TIG'].includes(r.medication_given.toUpperCase()) : false) ||
            r.period === 'ERIG')
      ),
      defaultRoute: 'Infiltration / IM',
    },
    {
      item: 'Tetanus vaccine',
      rec: records.find(
        (r) =>
          !r.voided_at &&
          (r.dose_number === 300 ||
            (r.medication_given ? ['TT', 'TD', 'TDAP', 'DTAP'].includes(r.medication_given.toUpperCase()) : false) ||
            r.period === 'TT' ||
            Boolean(r.medication_given?.toLowerCase().includes('tetanus')))
      ),
      defaultRoute: 'IM',
    },
    {
      item: 'ATS',
      rec: records.find(
        (r) =>
          !r.voided_at &&
          (r.dose_number === 400 ||
            r.medication_given === 'ATS' ||
            r.period === 'ATS' ||
            Boolean(r.medication_given?.toLowerCase().includes('anti-tetanus')))
      ),
      defaultRoute: 'IM',
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          paddingBottom: '8px',
          borderBottom: '1px solid #111827',
          marginBottom: '16px',
        }}
      >
        <div style={{ width: '48px', height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {logos?.leftLogoUrl ? (
            <img
              src={logos.leftLogoUrl}
              alt="Seal"
              style={{ maxHeight: '44px', maxWidth: '44px', objectFit: 'contain' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div style={{ width: '44px', height: '44px' }} />
          )}
        </div>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Republic of the Philippines • Department of Health
          </div>
          <h1 style={{ fontSize: '13pt', fontWeight: 700, color: '#111827', margin: '2px 0 0 0', lineHeight: 1.2 }}>
            {clinicName}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px', justifyContent: 'flex-end', flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              DOH Accred No.
            </div>
            <div style={{ fontSize: '10.5pt', color: '#111827', fontWeight: 600, marginTop: '1px' }}>
              {dohAccredNo}
            </div>
          </div>
          {logos?.rightLogoUrl && (
            <img
              src={logos.rightLogoUrl}
              alt="Logo"
              style={{ maxHeight: '44px', maxWidth: '44px', objectFit: 'contain' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
        </div>
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
            {isBlank ? '____________________' : formatDate(record?.cardDate)}
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

      {/* 5. VACCINATION RECORD (ONE MERGED TABLE) */}
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
              const isGiven = Boolean(rec && (rec.status === 'completed' || rec.treatment_date));
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
                      rec?.route || 'IM'
                    ) : (
                      ''
                    )}
                  </td>

                  {/* 3. Date */}
                  <td style={{ padding: '6px 8px', border: '1px solid #ccc', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {isBlank ? '' : isGiven && rec?.treatment_date ? formatDate(rec.treatment_date) : ''}
                  </td>

                  {/* 4. Vaccine / Lot */}
                  <td style={{ padding: '6px 8px', border: '1px solid #ccc' }}>
                    {isBlank ? (
                      ''
                    ) : isGiven ? (
                      <span>
                        {rec?.vaccine_type || rec?.vaccine_brand || '—'}
                        {(rec?.batch_number || rec?.batch_no) && (
                          <span style={{ color: '#4b5563', fontSize: '9pt' }}>
                            {` · Lot: ${rec.batch_number || rec.batch_no}`}
                          </span>
                        )}
                      </span>
                    ) : (
                      ''
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
                      ''
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
