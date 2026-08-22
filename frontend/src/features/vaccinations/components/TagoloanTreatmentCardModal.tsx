// @ts-nocheck
import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Icon } from '../../../shared/components/ui/Icon';

interface Props {
  open: boolean;
  onClose: () => void;
  patientId: number | null;
  onSaved?: () => void;
}

export default function TagoloanTreatmentCardModal({ open, onClose, patientId, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cardData, setCardData] = useState<any>(null);

  // Form State
  const [registryNo, setRegistryNo] = useState('');
  const [hospitalNo, setHospitalNo] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [exposureCategory, setExposureCategory] = useState<'I' | 'II' | 'III' | ''>('II');
  const [modeOfExposure, setModeOfExposure] = useState<string>('transdermal_bite');
  const [bodyPartExposed, setBodyPartExposed] = useState<string>('other_parts');
  const [animalType, setAnimalType] = useState('Dog');
  const [animalTypeOthers, setAnimalTypeOthers] = useState('');
  const [pastBiteHistory, setPastBiteHistory] = useState(false);
  const [pastBiteDates, setPastBiteDates] = useState('');
  const [pastPepCompleted, setPastPepCompleted] = useState(false);
  const [icd10Code, setIcd10Code] = useState('Z20.3');
  const [cardDate, setCardDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (open && patientId) {
      loadCardData();
    }
  }, [open, patientId]);

  const loadCardData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tagoloan-treatment-cards/patient/${patientId}`);
      setCardData(res.data);

      const existing = res.data.existing_card;
      if (existing) {
        setRegistryNo(existing.registry_no || '');
        setHospitalNo(existing.hospital_no || res.data.patient?.hospital_no || '');
        setReferredBy(existing.referred_by || res.data.bite_incident?.referred_from || '');
        setExposureCategory(existing.exposure_category || 'II');
        setModeOfExposure(existing.mode_of_exposure || 'transdermal_bite');
        setBodyPartExposed(existing.body_part_exposed || 'other_parts');
        setAnimalType(existing.animal_type || 'Dog');
        setAnimalTypeOthers(existing.animal_type_others || '');
        setPastBiteHistory(Boolean(existing.past_bite_history));
        setPastBiteDates(existing.past_bite_dates || '');
        setPastPepCompleted(Boolean(existing.past_pep_completed));
        setIcd10Code(existing.icd10_code || 'Z20.3');
        if (existing.card_date) setCardDate(existing.card_date);
      } else {
        setHospitalNo(res.data.patient?.hospital_no || '');
        setReferredBy(res.data.bite_incident?.referred_from || '');
        if (res.data.bite_incident?.case_number) setRegistryNo(res.data.bite_incident.case_number);
        if (res.data.bite_incident?.mode_of_exposure) setModeOfExposure(res.data.bite_incident.mode_of_exposure);
        if (res.data.bite_incident?.body_part_exposed) setBodyPartExposed(res.data.bite_incident.body_part_exposed);
        if (res.data.bite_incident?.animal_type) {
          if (res.data.bite_incident.animal_type === 'Dog') {
            setAnimalType('Dog');
            setAnimalTypeOthers('');
          } else {
            setAnimalType('Others');
            setAnimalTypeOthers(res.data.bite_incident.animal_type_others || res.data.bite_incident.animal_type);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load treatment card data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/tagoloan-treatment-cards', {
        patient_id: patientId,
        bite_id: cardData?.bite_incident?.bite_id || null,
        card_date: cardDate,
        registry_no: registryNo,
        hospital_no: hospitalNo,
        referred_by: referredBy,
        exposure_category: exposureCategory || null,
        mode_of_exposure: modeOfExposure || null,
        body_part_exposed: bodyPartExposed || null,
        animal_type: animalType,
        animal_type_others: animalTypeOthers,
        past_bite_history: pastBiteHistory,
        past_bite_dates: pastBiteDates,
        past_pep_completed: pastPepCompleted,
        icd10_code: icd10Code,
      });

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save treatment card', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!open) return null;

  const patient = cardData?.patient;
  const clinic = cardData?.clinic;
  const bite = cardData?.bite_incident;
  const records = cardData?.treatment_records || [];

  // Map 9 vaccination period rows
  const periods = [
    { period: 'Day 0', key: 'day0', doseNum: 0 },
    { period: 'Day 3', key: 'day3', doseNum: 3 },
    { period: 'Day 7', key: 'day7', doseNum: 7 },
    { period: 'Day 28', key: 'day28', doseNum: 28 },
    { period: 'Booster 1', key: 'booster1', doseNum: 100 },
    { period: 'Booster 2', key: 'booster2', doseNum: 101 },
    { period: 'ERIG', key: 'erig', doseNum: 200 },
    { period: 'TT', key: 'tt', doseNum: 300 },
    { period: 'ATS', key: 'ats', doseNum: 400 },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #tagoloan-card-print-area, #tagoloan-card-print-area * { visibility: visible; }
          #tagoloan-card-print-area { position: absolute; left: 0; top: 0; width: 100%; font-size: 11px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
        }}
      >
        {/* Header Bar */}
        <div
          className="no-print"
          style={{
            background: 'var(--primary)',
            color: '#ffffff',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Icon name="activity" size={22} color="#ffffff" />
            <span style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.3px' }}>
              Tagoloan Animal Bite Treatment Center Record Card
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handlePrint}
              style={{
                background: '#ffffff',
                color: 'var(--primary)',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              🖨️ Print Form
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '1.25rem',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Form Content Area */}
        <div
          id="tagoloan-card-print-area"
          style={{
            padding: '1.75rem 2rem',
            overflowY: 'auto',
            flex: 1,
            color: '#1e293b',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--primary)', padding: '3rem' }}>
              Loading official Tagoloan treatment card...
            </p>
          ) : (
            <div>
              {/* Official Center Title */}
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, letterSpacing: '0.5px', color: '#0f172a' }}>
                  {clinic?.name || 'TAGOLOAN ANIMAL BITE TREATMENT CENTER'}
                </h2>
              </div>

              {/* Top Form Header Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px stroke #e2e8f0', pb: '0.75rem' }}>
                <div>
                  <strong>Date:</strong>{' '}
                  <input
                    type="date"
                    value={cardDate}
                    onChange={(e) => setCardDate(e.target.value)}
                    style={{ border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <strong>Registry No:</strong>{' '}
                  <input
                    type="text"
                    value={registryNo}
                    onChange={(e) => setRegistryNo(e.target.value)}
                    placeholder="e.g. REG-2026-001"
                    style={{ border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', width: '60%' }}
                  />
                </div>

                <div>
                  <strong>DOH Accreditation No:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>{clinic?.doh_accreditation_no || '2022-10-037'}</span>
                </div>
                <div>
                  <strong>Hospital No:</strong>{' '}
                  <input
                    type="text"
                    value={hospitalNo}
                    onChange={(e) => setHospitalNo(e.target.value)}
                    placeholder="e.g. HOSP-9923"
                    style={{ border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', width: '60%' }}
                  />
                </div>

                <div>
                  <strong>PhilHealth Accreditation No:</strong>{' '}
                  <span style={{ textDecoration: 'underline' }}>{clinic?.philhealth_accreditation_no || 'B10034377'}</span>
                </div>
                <div>
                  <strong>Referred by:</strong>{' '}
                  <input
                    type="text"
                    value={referredBy}
                    onChange={(e) => setReferredBy(e.target.value)}
                    placeholder="Dr. Smith / Tagoloan RHU"
                    style={{ border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', width: '60%' }}
                  />
                </div>

                <div>
                  <strong>PhilHealth Identification Number (PIN):</strong>{' '}
                  <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{patient?.philhealth_no || '—'}</span>
                </div>
                <div>
                  <strong>PhilHealth Status:</strong>{' '}
                  <label style={{ marginRight: '1rem' }}>
                    <input type="radio" checked={patient?.philhealth_status === 'member'} readOnly /> ( ) Member
                  </label>
                  <label>
                    <input type="radio" checked={patient?.philhealth_status === 'dependent'} readOnly /> ( ) Dependent
                  </label>
                </div>
              </div>

              {/* Patient Profile Row */}
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <div><strong>Patient Name:</strong> {patient?.full_name || '—'}</div>
                  <div><strong>Age:</strong> {patient?.age ?? '—'}</div>
                  <div><strong>Date of Birth:</strong> {patient?.date_of_birth || '—'}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <div><strong>Address:</strong> {patient?.address || '—'}</div>
                  <div><strong>Sex:</strong> ({patient?.gender === 'male' ? '✓' : ' '}) Male ({patient?.gender === 'female' ? '✓' : ' '}) Female</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <strong>Exposure Category:</strong>{' '}
                    {(['I', 'II', 'III'] as const).map((cat) => (
                      <label key={cat} style={{ marginRight: '0.5rem' }}>
                        <input
                          type="radio"
                          name="exposure_cat"
                          checked={exposureCategory === cat}
                          onChange={() => setExposureCategory(cat)}
                        /> ({cat})
                      </label>
                    ))}
                  </div>
                  <div><strong>Date of Exposure:</strong> {bite?.bite_date || '—'}</div>
                  <div><strong>Date Treatment Started:</strong> {cardDate}</div>
                </div>
                <div style={{ marginTop: '0.35rem' }}>
                  <strong>Place of Exposure:</strong> {bite?.bite_place || 'Tagoloan, Misamis Oriental'}
                </div>
              </div>

              {/* Checkbox Questions Sections (1, 2, 3, 4) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem', fontSize: '0.8125rem' }}>
                {/* 1. Mode of Animal Exposure */}
                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem' }}>
                  <strong style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--primary)' }}>1. Mode of Animal Exposure</strong>
                  {[
                    { key: 'nibbling_uncovered_skin', label: 'Nibbling/Licking of uncovered skin' },
                    { key: 'nibbling_broken_skin', label: 'Nibbling/Licking of wounded/broken skin' },
                    { key: 'scratch_abrasion', label: 'Scratch / Abrasion' },
                    { key: 'transdermal_bite', label: 'Transdermal Bite' },
                    { key: 'handling_ingestion_raw_meat', label: 'Handling / Ingestion of raw infected meat' },
                  ].map((opt) => (
                    <label key={opt.key} style={{ display: 'block', marginBottom: '0.25rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="mode_of_exposure"
                        checked={modeOfExposure === opt.key}
                        onChange={() => setModeOfExposure(opt.key)}
                      />{' '}
                      ( ) {opt.label}
                    </label>
                  ))}
                </div>

                {/* 2, 3, 4 Sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* 2. Body Part Affected */}
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem' }}>
                    <strong style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--primary)' }}>2. Body Part Affected Exposed</strong>
                    <label style={{ display: 'block', marginBottom: '0.2rem' }}>
                      <input
                        type="radio"
                        name="body_part"
                        checked={bodyPartExposed === 'head_neck'}
                        onChange={() => setBodyPartExposed('head_neck')}
                      /> ( ) Head and/or neck
                    </label>
                    <label style={{ display: 'block', marginBottom: '0.2rem' }}>
                      <input
                        type="radio"
                        name="body_part"
                        checked={bodyPartExposed === 'other_parts'}
                        onChange={() => setBodyPartExposed('other_parts')}
                      /> ( ) Other parts of the body
                    </label>
                    <label style={{ display: 'block' }}>
                      <input
                        type="radio"
                        name="body_part"
                        checked={bodyPartExposed === 'na_ingestion'}
                        onChange={() => setBodyPartExposed('na_ingestion')}
                      /> ( ) N / A if Ingestion mode
                    </label>
                  </div>

                  {/* 3. Type of Animal */}
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem' }}>
                    <strong style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--primary)' }}>3. Type of Animal</strong>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <label>
                        <input
                          type="radio"
                          name="animal_type"
                          checked={animalType === 'Dog'}
                          onChange={() => setAnimalType('Dog')}
                        /> ( ) Dog
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <input
                          type="radio"
                          name="animal_type"
                          checked={animalType !== 'Dog'}
                          onChange={() => setAnimalType('Others')}
                        /> ( ) Others:
                        <input
                          type="text"
                          value={animalTypeOthers}
                          onChange={(e) => setAnimalTypeOthers(e.target.value)}
                          placeholder="Cat, etc."
                          style={{ border: '1px solid #cbd5e1', padding: '1px 4px', borderRadius: '4px', fontSize: '0.8rem' }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* 4. Past History */}
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem' }}>
                    <strong style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--primary)' }}>4. Past History of animal bite</strong>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.35rem' }}>
                      <label>
                        <input
                          type="radio"
                          name="past_history"
                          checked={pastBiteHistory === true}
                          onChange={() => setPastBiteHistory(true)}
                        /> ( ) Yes
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="past_history"
                          checked={pastBiteHistory === false}
                          onChange={() => setPastBiteHistory(false)}
                        /> ( ) No
                      </label>
                    </div>
                    {pastBiteHistory && (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span>If yes, specify dates:</span>
                        <input
                          type="text"
                          value={pastBiteDates}
                          onChange={(e) => setPastBiteDates(e.target.value)}
                          placeholder="YYYY-MM-DD"
                          style={{ border: '1px solid #cbd5e1', padding: '1px 4px', borderRadius: '4px', fontSize: '0.8rem' }}
                        />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span>Was PEP Immunization completed:</span>
                      <label style={{ marginLeft: '0.5rem' }}>
                        <input
                          type="radio"
                          name="pep_comp"
                          checked={pastPepCompleted === true}
                          onChange={() => setPastPepCompleted(true)}
                        /> ( ) Yes
                      </label>
                      <label style={{ marginLeft: '0.5rem' }}>
                        <input
                          type="radio"
                          name="pep_comp"
                          checked={pastPepCompleted === false}
                          onChange={() => setPastPepCompleted(false)}
                        /> ( ) No
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Official Vaccination Grid Table */}
              <div style={{ marginBottom: '1.25rem' }}>
                <strong style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'center', fontSize: '0.95rem', color: 'var(--text-h)' }}>
                  Period Exposure Vaccination Record
                </strong>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 600 }}>Period</th>
                      <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600 }}>Adm Route</th>
                      <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 600 }}>Given by</th>
                      <th style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600 }}>Signature / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((item, idx) => {
                      const rec = records.find((r) => r.dose_number === item.doseNum);
                      return (
                        <tr key={item.period} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                          <td style={{ padding: '6px', border: '1px solid #cbd5e1', fontWeight: 600 }}>
                            {item.period === 'ERIG' ? (
                              <span>ERIG {rec?.dosage_ml ? <u style={{ color: 'var(--primary)', fontWeight: 700 }}>{rec.dosage_ml}</u> : '_________________'} ml</span>
                            ) : item.period === 'TT' ? (
                              <span>TT (Tetanus Toxoid)</span>
                            ) : item.period === 'ATS' ? (
                              <span>ATS (Anti-Tetanus Serum)</span>
                            ) : (
                              item.period
                            )}
                          </td>
                          <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                            ({rec?.route === 'ID' ? '✓' : ' '}) ID &nbsp;&nbsp; ({rec?.route === 'IM' ? '✓' : ' '}) IM
                          </td>
                          <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                            {rec?.treatment_date ? new Date(rec.treatment_date).toLocaleDateString() : rec?.scheduled_date || '—'}
                          </td>
                          <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>
                            {rec?.administered_by?.name || (rec?.status === 'completed' ? 'Nurse Staff' : '—')}
                          </td>
                          <td style={{ padding: '6px', border: '1px solid #cbd5e1', textAlign: 'center', color: rec?.status === 'completed' ? 'var(--primary)' : '#64748b' }}>
                            {rec?.status === 'completed' ? '✓ Signed' : rec?.status || 'Scheduled'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer ICD 10 Code */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                <strong>ICD 10 Code:</strong>
                <input
                  type="text"
                  value={icd10Code}
                  onChange={(e) => setIcd10Code(e.target.value)}
                  placeholder="e.g. Z20.3"
                  style={{ border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontWeight: 700, width: '120px' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div
          className="no-print"
          style={{
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Tagoloan RHU Official Animal Bite Treatment Form (3NF Compliant Schema)
          </span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(23, 101, 58, 0.3)',
              }}
            >
              {saving ? 'Saving Card...' : 'Save Tagoloan Card'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
