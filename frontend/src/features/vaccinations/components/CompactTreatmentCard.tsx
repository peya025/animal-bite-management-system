import React from 'react';
import { formatDate } from '../utils/printHelpers';
import { deriveTreatmentCard, getStaffName, isRecordGiven } from '../utils/treatmentCardData';
import type { PrintableFormRecord, PrintableTreatmentRecord } from './PrintableForm';

/**
 * Compact half-page (A5 landscape) Animal Bite Treatment Card.
 *
 * Carries the same information as the full PrintableForm (filled mode) in a
 * denser layout so two cards fit on one sheet of bond paper. Labels are
 * semi-bold and filled-in information is regular weight.
 */
export interface CompactTreatmentCardProps {
  record: PrintableFormRecord;
  /** Pre-fetched signature data URLs keyed by treatment_id (null = unavailable). */
  signatures?: Record<string, string | null>;
}

interface CardRow {
  key: string;
  period: React.ReactNode;
  rec?: PrintableTreatmentRecord;
  route: string;
  scheduledDate?: string;
}

const cellStyle: React.CSSProperties = {
  border: '0.75pt solid #000',
  padding: '1px 5px',
  verticalAlign: 'middle',
};

function Field({ label, value, span = 1 }: { label: string; value: React.ReactNode; span?: number }) {
  return (
    <div style={{ gridColumn: `span ${span}`, minWidth: 0, display: 'flex', gap: '4px', alignItems: 'baseline' }}>
      <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{label}:</span>
      <span style={{ fontWeight: 400, borderBottom: '0.5pt solid #000', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: '2px' }}>
        {value || '—'}
      </span>
    </div>
  );
}

export default function CompactTreatmentCard({ record, signatures = {} }: CompactTreatmentCardProps) {
  const c = deriveTreatmentCard(record);
  const fallbackRoute = (c.d0Rec?.route || 'IM').toUpperCase();
  const doseRoute = (rec?: PrintableTreatmentRecord) =>
    isRecordGiven(rec) ? ((rec?.route || 'IM').toUpperCase()) : fallbackRoute;

  const rows: CardRow[] = [
    { key: 'd0', period: 'Day 0', rec: c.d0Rec, route: doseRoute(c.d0Rec) },
    { key: 'd3', period: 'Day 3', rec: c.d3Rec, route: doseRoute(c.d3Rec), scheduledDate: c.apt3?.appointment_date },
    { key: 'd7', period: 'Day 7', rec: c.d7Rec, route: doseRoute(c.d7Rec), scheduledDate: c.apt7?.appointment_date },
  ];
  if (c.hasD28) rows.push({ key: 'd28', period: 'Day 28', rec: c.d28Rec, route: doseRoute(c.d28Rec), scheduledDate: c.apt28?.appointment_date });
  if (c.hasB1) rows.push({ key: 'b1', period: 'Booster 1', rec: c.b1Rec, route: doseRoute(c.b1Rec) });
  if (c.hasB2) rows.push({ key: 'b2', period: 'Booster 2', rec: c.b2Rec, route: doseRoute(c.b2Rec) });
  if (c.hasRig) {
    rows.push({
      key: 'rig',
      period: <>ERIG {c.rigCalculatedMl ? <span style={{ fontWeight: 400 }}>{c.rigCalculatedMl} ml</span> : null}</>,
      rec: c.rigRec,
      route: c.rigGiven ? (c.rigRec?.route === 'wound_infiltration' || !c.rigRec?.route ? 'Wound infiltration' : c.rigRec.route) : '',
    });
  }
  if (c.hasTt) {
    rows.push({
      key: 'tt',
      period: <>TT {c.ttRec?.dosage_ml ? <span style={{ fontWeight: 400 }}>{c.ttRec.dosage_ml} ml</span> : null}</>,
      rec: c.ttRec,
      route: c.ttGiven ? (c.ttRec?.route || 'IM') : '',
    });
  }
  if (c.hasAts) {
    rows.push({ key: 'ats', period: 'ATS', rec: c.atsRec, route: c.atsGiven ? (c.atsRec?.route || 'IM') : '' });
  }
  const hasScheduledRow = rows.some((r) => !isRecordGiven(r.rec) && r.scheduledDate);

  const pastBiteText = c.hasPastBite === true
    ? `Yes${c.pastBiteDates ? ` (${c.pastBiteDates})` : ''} · PEP completed: ${c.pepCompleted ? 'Yes' : 'No'}`
    : 'No';

  const renderGivenBy = (rec?: PrintableTreatmentRecord) => {
    if (!isRecordGiven(rec)) return null;
    const sig = rec?.treatment_id ? signatures[String(rec.treatment_id)] : null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
        <span style={{ whiteSpace: 'nowrap' }}>{getStaffName(rec)}</span>
        {sig ? (
          <img src={sig} alt="Signature" style={{ maxHeight: '14px', maxWidth: '60px', objectFit: 'contain' }} />
        ) : rec?.signature ? (
          <span style={{ fontSize: '7pt' }}>Signed</span>
        ) : null}
      </div>
    );
  };

  return (
    <div
      className="compact-treatment-card"
      style={{
        width: '100%',
        color: '#000',
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: '8pt',
        lineHeight: 1.35,
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1.2pt solid #000', paddingBottom: '2px', marginBottom: '4px' }}>
        <div>
          <span style={{ fontSize: '11pt', fontWeight: 800, letterSpacing: '0.4px' }}>{c.clinicTitle}</span>
          <span style={{ fontSize: '7.5pt', marginLeft: '6px' }}>{c.clinicSubtitle}</span>
        </div>
        <div style={{ fontSize: '7.5pt', whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: 600 }}>DOH Accred:</span> {c.dohAccredNo}
          &nbsp;&nbsp;
          <span style={{ fontWeight: 600 }}>PhilHealth Accred:</span> {c.philhealthAccredNo}
        </div>
      </div>

      {/* Card information */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', columnGap: '10px', rowGap: '3px', marginBottom: '5px' }}>
        <Field label="Date" value={c.dateVal} />
        <Field label="Registry No" value={c.registryNoVal} />
        <Field label="Hospital No" value={c.hospitalNoVal} />
        <Field label="ICD-10" value={c.icd10Code} />
      </div>

      {/* Patient & exposure information */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', columnGap: '10px', rowGap: '3px', marginBottom: '4px' }}>
        <Field label="Patient name" value={c.patientName} span={3} />
        <Field label="Age / Sex" value={`${c.age} / ${c.formattedSex}`} span={1} />
        <Field label="Date of birth" value={c.dob} span={2} />

        <Field label="Address" value={c.address} span={4} />
        <Field label="PhilHealth" value={`${c.formattedPhStatus}${c.philhealthPin && c.philhealthPin !== '—' ? ` · PIN ${c.philhealthPin}` : ''}`} span={2} />

        <Field label="Referred by" value={c.referredByVal} span={4} />
        <Field label="Exposure" value={c.formattedCat} span={2} />

        <Field label="Date of exposure" value={c.exposureDate} span={2} />
        <Field label="Place of exposure" value={c.placeOfExposure} span={2} />
        <Field label="Treatment started" value={c.treatmentStartDate} span={2} />
      </div>

      {/* Exposure details — chosen answers only */}
      <div style={{ marginBottom: '5px', display: 'flex', flexWrap: 'wrap', columnGap: '12px', rowGap: '1px' }}>
        {c.chosenModes.length > 0 && (
          <span><span style={{ fontWeight: 600 }}>Mode:</span> {c.chosenModes.join(', ')}</span>
        )}
        {c.chosenParts.length > 0 && (
          <span><span style={{ fontWeight: 600 }}>Body part:</span> {c.chosenParts.join(', ')}</span>
        )}
        <span><span style={{ fontWeight: 600 }}>Animal:</span> {c.animalLabel}</span>
        <span><span style={{ fontWeight: 600 }}>Past bite:</span> {pastBiteText}</span>
      </div>

      {/* Period Exposure Vaccination Record */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1pt solid #000', fontSize: '8pt' }}>
        <thead>
          <tr>
            <th colSpan={4} style={{ ...cellStyle, textAlign: 'center', fontWeight: 600 }}>Period Exposure Vaccination Record</th>
          </tr>
          <tr>
            <th style={{ ...cellStyle, width: '20%', textAlign: 'left', fontWeight: 600 }}>Period</th>
            <th style={{ ...cellStyle, width: '20%', textAlign: 'center', fontWeight: 600 }}>Adm Route</th>
            <th style={{ ...cellStyle, width: '18%', textAlign: 'center', fontWeight: 600 }}>Date</th>
            <th style={{ ...cellStyle, width: '42%', textAlign: 'center', fontWeight: 600 }}>Given by / Signature</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const given = isRecordGiven(row.rec);
            return (
              <tr key={row.key} style={{ height: '17px' }}>
                <td style={{ ...cellStyle, fontWeight: 600, whiteSpace: 'nowrap' }}>{row.period}</td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>{row.route}</td>
                <td style={{ ...cellStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {given && row.rec?.treatment_date
                    ? formatDate(row.rec.treatment_date)
                    : row.scheduledDate
                    ? <span style={{ fontStyle: 'italic' }}>{formatDate(row.scheduledDate)}*</span>
                    : ''}
                </td>
                <td style={{ ...cellStyle }}>{renderGivenBy(row.rec)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {hasScheduledRow && (
        <div style={{ fontSize: '6.5pt', marginTop: '2px', fontStyle: 'italic' }}>* Scheduled return date</div>
      )}
    </div>
  );
}
