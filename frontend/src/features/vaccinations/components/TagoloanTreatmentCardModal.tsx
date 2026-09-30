// @ts-nocheck
import { useAuth } from '../../../shared/contexts/AuthContext';
import { printWhenReady } from '../../../components/print/printReady';
import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Icon } from '../../../shared/components/ui/Icon';
import { HugeiconsIcon } from '@hugeicons/react';
import { PrinterIcon } from '@hugeicons/core-free-icons';
import { getGlobalPrintLogos } from '../../../components/print';


interface Props {
  open: boolean;
  onClose: () => void;
  patientId: number | null;
  biteId?: number | null;
  onSaved?: () => void;
  initialExposureCategory?: 'I' | 'II' | 'III' | '';
}

export default function TagoloanTreatmentCardModal({ open, onClose, patientId, biteId, onSaved, initialExposureCategory = '' }: Props) {
  const { clinic: authClinic } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cardData, setCardData] = useState<any>(null);

  // Form State
  const [registryNo, setRegistryNo] = useState('');
  const [hospitalNo, setHospitalNo] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [exposureCategory, setExposureCategory] = useState<'I' | 'II' | 'III' | ''>(initialExposureCategory);
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
      // Reset to prop value first, then loadCardData will override if a saved card exists
      setExposureCategory(initialExposureCategory);
      loadCardData();
    }
  }, [open, patientId, biteId]);

  const loadCardData = async () => {
    setLoading(true);
    try {
      const episodeQuery = biteId ? `?bite_id=${biteId}` : '';
      const res = await api.get(`/tagoloan-treatment-cards/patient/${patientId}${episodeQuery}`);
      setCardData(res.data);

      const clinicRaw = localStorage.getItem('clinicData');
      const clinicHospitalNo = res.data?.clinic?.hospital_no 
        || (clinicRaw ? JSON.parse(clinicRaw)?.hospital_no : '') 
        || '';

      const existing = res.data.existing_card;
      if (existing) {
        setRegistryNo(existing.registry_no || '');
        setHospitalNo(existing.hospital_no || clinicHospitalNo || res.data.patient?.hospital_no || '');
        setReferredBy(existing.referred_by || res.data.bite_incident?.referred_from || '');
        setExposureCategory(existing.exposure_category || '');
        setModeOfExposure(existing.mode_of_exposure || 'transdermal_bite');
        setBodyPartExposed(existing.body_part_exposed || 'other_parts');
        // Normalize animal_type to 'Dog', 'Cat', or 'Others' regardless of case stored in DB
        const storedAnimal = (existing.animal_type || '').toLowerCase();
        if (storedAnimal === 'dog') {
          setAnimalType('Dog');
          setAnimalTypeOthers('');
        } else if (storedAnimal === 'cat') {
          setAnimalType('Cat');
          setAnimalTypeOthers('');
        } else if (storedAnimal) {
          setAnimalType('Others');
          setAnimalTypeOthers(existing.animal_type_others || existing.animal_type || '');
        } else {
          setAnimalType('Dog');
          setAnimalTypeOthers('');
        }
        setPastBiteHistory(Boolean(existing.past_bite_history));
        setPastBiteDates(existing.past_bite_dates || '');
        setPastPepCompleted(Boolean(existing.past_pep_completed));
        setIcd10Code(existing.icd10_code || 'Z20.3');
        if (existing.card_date) setCardDate(String(existing.card_date).slice(0, 10));
      } else {
        setHospitalNo(clinicHospitalNo || res.data?.patient?.hospital_no || '');
        setReferredBy(res.data.bite_incident?.referred_from || '');
        if (res.data.bite_incident?.case_number) setRegistryNo(res.data.bite_incident.case_number);
        if (res.data.bite_incident?.exposure_category) setExposureCategory(res.data.bite_incident.exposure_category);
        else if (initialExposureCategory) setExposureCategory(initialExposureCategory);
        if (res.data.bite_incident?.mode_of_exposure) setModeOfExposure(res.data.bite_incident.mode_of_exposure);
        if (res.data.bite_incident?.body_part_exposed) setBodyPartExposed(res.data.bite_incident.body_part_exposed);
        if (res.data.bite_incident?.animal_type) {
          const biteAnimal = (res.data.bite_incident.animal_type || '').toLowerCase();
          if (biteAnimal === 'dog') {
            setAnimalType('Dog');
            setAnimalTypeOthers('');
          } else if (biteAnimal === 'cat') {
            setAnimalType('Cat');
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
    if (!cardData?.form3_ready) {
      alert(cardData?.form3_block_reason || 'Form 3 is waiting for a Doctor-confirmed Form 2 treatment plan.');
      return;
    }
    // Validate: card date cannot be in the future
    if (cardDate && cardDate > new Date().toISOString().split('T')[0]) {
      alert('Card date cannot be a future date.');
      return;
    }
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
        animal_type_others: animalType === 'Others' ? animalTypeOthers : null,
        past_bite_history: pastBiteHistory,
        past_bite_dates: pastBiteDates,
        past_pep_completed: pastPepCompleted,
        icd10_code: icd10Code,
      });

      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to save treatment card', err);
      alert(err?.response?.data?.message || 'Failed to save the treatment card.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    void printWhenReady(window);
  };

  if (!open) return null;

  const patient = cardData?.patient;
  const clinic = cardData?.clinic;
  const bite = cardData?.bite_incident;
  const records = cardData?.treatment_records || [];

  // Map vaccination period rows (DOH NRPCP 3-Dose Primary Regimen + Boosters)
  const periods = [
    { period: 'Day 0', key: 'day0', doseNum: 0 },
    { period: 'Day 3', key: 'day3', doseNum: 3 },
    { period: 'Day 7', key: 'day7', doseNum: 7 },
    ...(records.some((r: any) => r.dose_number === 28) ? [{ period: 'Day 28', key: 'day28', doseNum: 28 }] : []),
    { period: 'Booster 1', key: 'booster1', doseNum: 100 },
    { period: 'Booster 2', key: 'booster2', doseNum: 101 },
    { period: 'ERIG', key: 'erig', doseNum: 200 },
    ...(records.some((record: any) => record.medication_given === 'HRIG' || record.dose_number === 201)
      ? [{ period: 'HRIG', key: 'hrig', doseNum: 201 }] : []),
    { period: 'TT', key: 'tt', doseNum: 300 },
    { period: 'ATS', key: 'ats', doseNum: 400 },
    ...(records.some((record: any) => record.medication_given === 'TIG' || record.dose_number === 401)
      ? [{ period: 'TIG', key: 'tig', doseNum: 401 }] : []),
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
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #tagoloan-card-print-area, #tagoloan-card-print-area * { visibility: visible; }
          #tagoloan-card-print-area {
            position: static !important;
            width: auto !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 0 !important;
            font-size: 11px !important;
            page-break-after: auto;
          }
          #tagoloan-card-print-area .treatment-card-table {
            table-layout: fixed;
            border-spacing: 0;
          }
          #tagoloan-card-print-area .treatment-card-table th,
          #tagoloan-card-print-area .treatment-card-table td {
            padding: 1px 2px !important;
            line-height: 1.1 !important;
            vertical-align: middle;
          }
          #tagoloan-card-print-area .treatment-card-table tbody tr {
            height: 20px;
          }
          #tagoloan-card-print-area .treatment-card-table input[type="checkbox"] {
            width: 8px !important;
            height: 8px !important;
            min-width: 0 !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            vertical-align: middle;
          }
          #tagoloan-card-print-area .treatment-card-table td > div {
            gap: 1px !important;
          }
          #tagoloan-card-print-area .treatment-card-table td > div:has(input[type="checkbox"]) {
            flex-wrap: nowrap !important;
          }
          #tagoloan-card-print-area .treatment-card-table label {
            font-size: 8px !important;
            line-height: 1 !important;
          }
          .no-print { display: none !important; }
          @page {
            size: legal portrait;
            margin: 0.35in;
          }
        }
      `}</style>

      <div
        style={{
          background: 'var(--card-bg-solid, #ffffff)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: 'min(920px, calc(100vw - 32px))',
          maxHeight: 'calc(100dvh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid var(--border-glow, #cbd5e1)',
          boxSizing: 'border-box',
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
            padding: '0.5rem 0.75rem',
            overflowY: 'auto',
            flex: 1,
            background: '#ffffff',
            color: '#1e293b',
            fontFamily: 'Arial, sans-serif',
            fontSize: '0.7rem',
          }}
        >
          {/* Visible Print Button inside content area */}
          {!loading && (
            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
              <button
                onClick={handlePrint}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
                  letterSpacing: '0.3px',
                }}
              >
                <HugeiconsIcon icon={PrinterIcon} size={16} />
                Print This Form
              </button>
            </div>
          )}
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--primary)', padding: '3rem' }}>
              Loading official Tagoloan treatment card...
            </p>
          ) : (
            <div>
              {/* Official Center Title with Global Print Logos */}
              {(() => {
                const globalLogos = getGlobalPrintLogos(authClinic);
                const leftLogo = globalLogos.leftLogoUrl;
                const rightLogo = globalLogos.rightLogoUrl;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', gap: '0.5rem' }}>
                    {leftLogo ? (
                      <img
                        key={leftLogo}
                        src={leftLogo}
                        alt="Left Seal"
                        style={{ width: '38px', height: '38px', objectFit: 'contain', flexShrink: 0 }}
                        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                      />
                    ) : (
                      <div style={{ width: '38px', height: '38px', flexShrink: 0 }} />
                    )}
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: '#64748b', lineHeight: 1 }}>
                        Republic of the Philippines • Department of Health
                      </div>
                      <h2 style={{ margin: '1px 0 0', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.3px', color: '#0f172a', lineHeight: 1.1 }}>
                        {clinic?.name || 'TAGOLOAN ANIMAL BITE TREATMENT CENTER'}
                      </h2>
                    </div>
                    {rightLogo ? (
                      <img
                        key={rightLogo}
                        src={rightLogo}
                        alt="Right Seal"
                        style={{ width: '38px', height: '38px', objectFit: 'contain', flexShrink: 0 }}
                        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                      />
                    ) : (
                      <div style={{ width: '38px', height: '38px', flexShrink: 0 }} />
                    )}
                  </div>
                );
              })()}

              {/* Top Form Header Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.2rem 1rem', fontSize: '0.6rem', marginBottom: '0.4rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.3rem', lineHeight: 1.4 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <strong style={{ minWidth: '85px', color: '#334155' }}>Date:</strong>
                  <input
                    type="date"
                    value={cardDate}
                    onChange={(e) => setCardDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    style={{ border: '1px solid #cbd5e1', padding: '2px 4px', borderRadius: '3px', fontSize: '0.6rem', flex: 1 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <strong style={{ minWidth: '85px', color: '#334155' }}>Registry No:</strong>
                  <input
                    type="text"
                    value={registryNo || '—'}
                    readOnly
                    title="Registry number is managed by Admin / System"
                    style={{ border: '1px solid #cbd5e1', padding: '2px 4px', borderRadius: '3px', flex: 1, backgroundColor: '#f8fafc', cursor: 'not-allowed', color: '#475569', fontWeight: 600, fontSize: '0.6rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <strong style={{ minWidth: '85px', color: '#334155' }}>DOH Accred:</strong>
                  <span style={{ color: '#1e293b', fontSize: '0.6rem', fontWeight: 500 }}>{clinic?.doh_accreditation_no || '2022-10-037'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <strong style={{ minWidth: '85px', color: '#334155' }}>Hospital No:</strong>
                  <input
                    type="text"
                    value={hospitalNo || ''}
                    placeholder="Not assigned"
                    readOnly
                    title="Hospital number is managed by Admin in Patient Profile"
                    style={{ border: '1px solid #cbd5e1', padding: '2px 4px', borderRadius: '3px', flex: 1, backgroundColor: '#f8fafc', cursor: 'not-allowed', color: '#475569', fontSize: '0.6rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <strong style={{ minWidth: '85px', color: '#334155' }}>PhilHealth Accred:</strong>
                  <span style={{ color: '#1e293b', fontSize: '0.6rem', fontWeight: 500 }}>{clinic?.philhealth_accreditation_no || 'B10034377'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <strong style={{ minWidth: '85px', color: '#334155' }}>Referred by:</strong>
                  <input
                    type="text"
                    value={referredBy}
                    onChange={(e) => setReferredBy(e.target.value)}
                    placeholder="Dr. Smith / RHU"
                    style={{ border: '1px solid #cbd5e1', padding: '2px 4px', borderRadius: '3px', flex: 1, fontSize: '0.6rem' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <strong style={{ minWidth: '85px', color: '#334155' }}>PhilHealth PIN:</strong>
                  <span style={{ color: '#1e293b', fontWeight: 600, fontSize: '0.6rem' }}>{patient?.philhealth_no || '—'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <strong style={{ minWidth: '85px', color: '#334155' }}>PH Status:</strong>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'default' }}>
                      <input type="radio" checked={patient?.philhealth_status === 'member'} readOnly style={{ margin: 0 }} /> Member
                    </label>
                    <label style={{ fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '2px', cursor: 'default' }}>
                      <input type="radio" checked={patient?.philhealth_status === 'dependent'} readOnly style={{ margin: 0 }} /> Dependent
                    </label>
                  </div>
                </div>
              </div>

              {/* Patient Profile Row */}
              <div style={{ background: '#f1f5f9', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '0.4rem', fontSize: '0.6rem', lineHeight: 1.4 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.6fr 1fr', gap: '0.2rem', marginBottom: '0.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <strong style={{ color: '#1e40af', minWidth: '85px' }}>Patient Name:</strong>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>{patient?.full_name || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <strong style={{ color: '#1e40af', minWidth: '35px' }}>Age:</strong>
                    <span style={{ color: '#0f172a' }}>{patient?.age ?? '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <strong style={{ color: '#1e40af', minWidth: '35px' }}>DOB:</strong>
                    <span style={{ color: '#0f172a' }}>{patient?.date_of_birth || '—'}</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.2rem', marginBottom: '0.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <strong style={{ color: '#1e40af', minWidth: '85px' }}>Address:</strong>
                    <span style={{ color: '#0f172a' }}>{patient?.address || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <strong style={{ color: '#1e40af', minWidth: '35px' }}>Sex:</strong>
                    <span style={{ color: '#0f172a' }}>
                      <input type="checkbox" checked={patient?.gender === 'male'} readOnly style={{ margin: '0 2px' }} /> Male
                      {' '}
                      <input type="checkbox" checked={patient?.gender === 'female'} readOnly style={{ margin: '0 2px 0 6px' }} /> Female
                    </span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <strong style={{ color: '#1e40af', minWidth: '85px' }}>Exposure Cat:</strong>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      {(['I', 'II', 'III'] as const).map((cat) => (
                        <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '2px', cursor: 'default' }}>
                          <input
                            type="radio"
                            name="exposure_cat"
                            checked={exposureCategory === cat}
                            onChange={() => setExposureCategory(cat)}
                            disabled
                            style={{ margin: 0 }}
                          /> {cat}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <strong style={{ color: '#1e40af', minWidth: '70px' }}>Exp. Date:</strong>
                    <span style={{ color: '#0f172a' }}>{bite?.bite_date || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <strong style={{ color: '#1e40af', minWidth: '70px' }}>Treat. Start:</strong>
                    <span style={{ color: '#0f172a' }}>{cardDate}</span>
                  </div>
                </div>
                <div style={{ marginTop: '0.2rem', display: 'flex', alignItems: 'center' }}>
                  <strong style={{ color: '#1e40af', minWidth: '85px' }}>Place of Exp:</strong>
                  <span style={{ color: '#0f172a' }}>{bite?.bite_place || 'Tagoloan, Misamis Oriental'}</span>
                </div>
              </div>

              {/* Checkbox Questions Sections (1, 2, 3, 4) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.45rem', fontSize: '0.6rem', lineHeight: 1.3 }}>
                {/* 1. Mode of Animal Exposure */}
                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.35rem' }}>
                  <strong style={{ display: 'block', marginBottom: '0.2rem', color: '#1e40af', fontSize: '0.65rem', fontWeight: 700 }}>1. Mode of Animal Exposure</strong>
                  {[
                    { key: 'nibbling_uncovered_skin', label: 'Nibbling/Licking uncovered skin' },
                    { key: 'nibbling_broken_skin', label: 'Nibbling/Licking wounded skin' },
                    { key: 'scratch_abrasion', label: 'Scratch / Abrasion' },
                    { key: 'transdermal_bite', label: 'Transdermal Bite' },
                    { key: 'handling_ingestion_raw_meat', label: 'Handling/Ingestion raw meat' },
                  ].map((opt) => (
                    <label key={opt.key} style={{ display: 'block', marginBottom: '0.15rem', cursor: 'default', color: '#334155' }}>
                      <input
                        type="radio"
                        name="mode_of_exposure"
                        checked={modeOfExposure === opt.key}
                        onChange={() => setModeOfExposure(opt.key)}
                        disabled
                        style={{ margin: '0 3px 0 0', verticalAlign: 'middle' }}
                      />{' '}
                      {opt.label}
                    </label>
                  ))}
                </div>

                {/* 2, 3, 4 Sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {/* 2. Body Part Affected */}
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.35rem' }}>
                    <strong style={{ display: 'block', marginBottom: '0.2rem', color: '#1e40af', fontSize: '0.65rem', fontWeight: 700 }}>2. Body Part Affected / Exposed</strong>
                    <input
                      type="text"
                      value={bodyPartExposed}
                      onChange={(e) => setBodyPartExposed(e.target.value)}
                      disabled
                      placeholder="e.g. Left hand, Right leg"
                      style={{
                        width: '100%',
                        padding: '3px 5px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '3px',
                        fontSize: '0.6rem',
                        marginBottom: '0.2rem',
                        backgroundColor: '#f8fafc',
                        color: '#334155',
                      }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                      {[
                        'Head & Neck',
                        'Upper Extremities',
                        'Lower Extremities',
                        'Trunk',
                        'Multiple',
                        'N/A',
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          disabled
                          onClick={() => setBodyPartExposed((prev) => (prev ? `${prev}, ${preset}` : preset))}
                          style={{
                            background: '#e0f2fe',
                            border: '1px solid #7dd3fc',
                            borderRadius: '3px',
                            padding: '2px 4px',
                            fontSize: '0.55rem',
                            color: '#0369a1',
                            cursor: 'not-allowed',
                            fontWeight: 500,
                          }}
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Type of Animal */}
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.35rem' }}>
                    <strong style={{ display: 'block', marginBottom: '0.2rem', color: '#1e40af', fontSize: '0.65rem', fontWeight: 700 }}>3. Type of Animal</strong>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'default', color: '#334155' }}>
                        <input
                          type="radio"
                          name="animal_type"
                          checked={animalType === 'Dog'}
                          onChange={() => {
                            setAnimalType('Dog');
                            setAnimalTypeOthers('');
                          }}
                          disabled
                          style={{ margin: 0 }}
                        /> Dog
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'default', color: '#334155' }}>
                        <input
                          type="radio"
                          name="animal_type"
                          checked={animalType === 'Cat'}
                          onChange={() => {
                            setAnimalType('Cat');
                            setAnimalTypeOthers('');
                          }}
                          disabled
                          style={{ margin: 0 }}
                        /> Cat
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'default', color: '#334155' }}>
                        <input
                          type="radio"
                          name="animal_type"
                          checked={animalType === 'Others'}
                          onChange={() => setAnimalType('Others')}
                          disabled
                          style={{ margin: 0 }}
                        /> Others:
                      </label>
                      {animalType === 'Others' && (
                        <input
                          type="text"
                          value={animalTypeOthers}
                          onChange={(e) => setAnimalTypeOthers(e.target.value)}
                          disabled
                          placeholder="Monkey, Bat, Rat"
                          style={{
                            border: '1px solid #cbd5e1',
                            padding: '3px 5px',
                            borderRadius: '3px',
                            fontSize: '0.6rem',
                            flex: 1,
                            minWidth: '80px',
                            backgroundColor: '#f8fafc',
                            color: '#334155',
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* 4. Past History */}
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.35rem' }}>
                    <strong style={{ display: 'block', marginBottom: '0.2rem', color: '#1e40af', fontSize: '0.65rem', fontWeight: 700 }}>4. Past animal bite history</strong>
                    <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.2rem' }}>
                      <label style={{ fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', color: '#334155' }}>
                        <input
                          type="radio"
                          name="past_history"
                          checked={pastBiteHistory === true}
                          onChange={() => setPastBiteHistory(true)}
                          style={{ margin: 0 }}
                        /> Yes
                      </label>
                      <label style={{ fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', color: '#334155' }}>
                        <input
                          type="radio"
                          name="past_history"
                          checked={pastBiteHistory === false}
                          onChange={() => setPastBiteHistory(false)}
                          style={{ margin: 0 }}
                        /> No
                      </label>
                    </div>
                    {pastBiteHistory && (
                      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', marginBottom: '0.2rem', fontSize: '0.6rem' }}>
                        <span style={{ color: '#475569' }}>Dates:</span>
                        <input
                          type="text"
                          value={pastBiteDates}
                          onChange={(e) => setPastBiteDates(e.target.value)}
                          placeholder="YYYY-MM-DD"
                          style={{ border: '1px solid #cbd5e1', padding: '2px 4px', borderRadius: '3px', fontSize: '0.6rem', flex: 1 }}
                        />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', fontSize: '0.6rem' }}>
                      <span style={{ color: '#475569' }}>PEP completed:</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', color: '#334155' }}>
                        <input
                          type="radio"
                          name="pep_comp"
                          checked={pastPepCompleted === true}
                          onChange={() => setPastPepCompleted(true)}
                          style={{ margin: 0 }}
                        /> Yes
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', color: '#334155' }}>
                        <input
                          type="radio"
                          name="pep_comp"
                          checked={pastPepCompleted === false}
                          onChange={() => setPastPepCompleted(false)}
                          style={{ margin: 0 }}
                        /> No
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Official Vaccination Grid Table */}
              <div style={{ marginBottom: '0.4rem' }}>
                <strong style={{ display: 'block', marginBottom: '0.25rem', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-h)', letterSpacing: '0.2px', fontWeight: 700 }}>
                  Period Exposure Vaccination Record
                </strong>
                
                {/* Primary Vaccination Series (DOH NRPCP 3-Dose Regimen) */}
                <div style={{ marginBottom: '0.3rem' }}>
                  <div style={{ background: '#dbeafe', padding: '0.15rem 0.3rem', borderRadius: '2px 2px 0 0', borderBottom: '1px solid #3b82f6' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#1e40af', letterSpacing: '0.2px' }}>
                      PRIMARY VACCINATION (3-Dose Regimen)
                    </span>
                  </div>
                  <table className="treatment-card-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.6rem', marginBottom: '0.15rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 600, width: '10%' }}>Period</th>
                        <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600, width: '10%' }}>Route</th>
                        <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600, width: '13%' }}>Date Given</th>
                        <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 600, width: '22%' }}>Vaccine Details</th>
                        <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 600, width: '25%' }}>Administered By</th>
                        <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600, width: '20%' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periods.filter(p => p.doseNum <= 28).map((item, idx) => {
                        const rec = records.find((r) => r.dose_number === item.doseNum);
                        const staff = rec?.administered_by || (rec as any)?.administeredBy;
                        const staffName = typeof staff === 'object' ? staff?.name : null;
                        const staffLicense = typeof staff === 'object' ? staff?.professional_license_no : null;
                        return (
                          <tr key={item.period} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ padding: '2px 3px', border: '1px solid #cbd5e1', fontWeight: 700, color: '#0f172a', fontSize: '0.6rem' }}>
                              {item.period}
                            </td>
                            <td style={{ padding: '2px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '0.55rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', flexWrap: 'wrap' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '1px', whiteSpace: 'nowrap' }}>
                                  <input type="checkbox" checked={rec?.route === 'ID'} readOnly style={{ margin: 0, width: '10px', height: '10px' }} /> ID
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '1px', whiteSpace: 'nowrap' }}>
                                  <input type="checkbox" checked={rec?.route === 'IM'} readOnly style={{ margin: 0, width: '10px', height: '10px' }} /> IM
                                </label>
                              </div>
                            </td>
                            <td style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600, fontSize: '0.55rem' }}>
                              {rec?.treatment_date ? new Date(rec.treatment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : rec?.scheduled_date || '—'}
                            </td>
                            <td style={{ padding: '2px 3px', border: '1px solid #cbd5e1', fontSize: '0.55rem', lineHeight: 1.2 }}>
                              {rec?.vaccine_type && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                  <span style={{ fontWeight: 600, color: '#0369a1' }}>{rec.vaccine_type}</span>
                                  {rec?.batch_number && (
                                    <span style={{ fontSize: '0.5rem', color: '#64748b' }}>Batch: {rec.batch_number}</span>
                                  )}
                                </div>
                              )}
                              {!rec?.vaccine_type && '—'}
                            </td>
                            <td style={{ padding: '2px 3px', border: '1px solid #cbd5e1', fontSize: '0.55rem', lineHeight: 1.2 }}>
                              {rec?.status === 'completed' || rec?.treatment_date ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                  <span style={{ fontWeight: 600 }}>{staffName || 'Nurse Staff'}</span>
                                  {staffLicense && (
                                    <span style={{ fontSize: '0.5rem', color: '#0369a1', fontWeight: 600 }}>
                                      PRC: {staffLicense}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.55rem' }}>Not administered</span>
                              )}
                            </td>
                            <td style={{ padding: '2px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '0.55rem' }}>
                              {rec?.status === 'completed' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                                  <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Done</span>
                                  <span style={{ fontSize: '0.5rem', color: '#64748b' }}>Signed</span>
                                </div>
                              ) : (
                                <span style={{ color: '#64748b' }}>{rec?.status || 'Scheduled'}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Booster Doses */}
                {periods.some(p => p.doseNum >= 100 && p.doseNum < 200 && records.find(r => r.dose_number === p.doseNum)) && (
                  <div style={{ marginBottom: '0.3rem' }}>
                    <div style={{ background: '#fef3c7', padding: '0.15rem 0.3rem', borderRadius: '2px 2px 0 0', borderBottom: '1px solid #f59e0b' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#92400e', letterSpacing: '0.2px' }}>
                        BOOSTER DOSES
                      </span>
                    </div>
                    <table className="treatment-card-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.6rem', marginBottom: '0.15rem' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                          <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 600, width: '10%' }}>Period</th>
                          <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600, width: '10%' }}>Route</th>
                          <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600, width: '13%' }}>Date Given</th>
                          <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 600, width: '22%' }}>Vaccine Details</th>
                          <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 600, width: '25%' }}>Administered By</th>
                          <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600, width: '20%' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periods.filter(p => p.doseNum >= 100 && p.doseNum < 200).map((item, idx) => {
                          const rec = records.find((r) => r.dose_number === item.doseNum);
                          if (!rec) return null;
                          const staff = rec?.administered_by || (rec as any)?.administeredBy;
                          const staffName = typeof staff === 'object' ? staff?.name : null;
                          const staffLicense = typeof staff === 'object' ? staff?.professional_license_no : null;
                          return (
                            <tr key={item.period} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fefce8' }}>
                              <td style={{ padding: '2px 3px', border: '1px solid #cbd5e1', fontWeight: 700, color: '#0f172a', fontSize: '0.6rem' }}>
                                {item.period}
                              </td>
                              <td style={{ padding: '2px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '0.55rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', flexWrap: 'wrap' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '1px', whiteSpace: 'nowrap' }}>
                                    <input type="checkbox" checked={rec?.route === 'ID'} readOnly style={{ margin: 0, width: '10px', height: '10px' }} /> ID
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '1px', whiteSpace: 'nowrap' }}>
                                    <input type="checkbox" checked={rec?.route === 'IM'} readOnly style={{ margin: 0, width: '10px', height: '10px' }} /> IM
                                  </label>
                                </div>
                              </td>
                              <td style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600, fontSize: '0.55rem' }}>
                                {rec?.treatment_date ? new Date(rec.treatment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : rec?.scheduled_date || '—'}
                              </td>
                              <td style={{ padding: '2px 3px', border: '1px solid #cbd5e1', fontSize: '0.55rem', lineHeight: 1.2 }}>
                                {rec?.vaccine_type && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                    <span style={{ fontWeight: 600, color: '#0369a1' }}>{rec.vaccine_type}</span>
                                    {rec?.batch_number && (
                                      <span style={{ fontSize: '0.5rem', color: '#64748b' }}>Batch: {rec.batch_number}</span>
                                    )}
                                  </div>
                                )}
                                {!rec?.vaccine_type && '—'}
                              </td>
                              <td style={{ padding: '2px 3px', border: '1px solid #cbd5e1', fontSize: '0.55rem', lineHeight: 1.2 }}>
                                {rec?.status === 'completed' || rec?.treatment_date ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                    <span style={{ fontWeight: 600 }}>{staffName || 'Nurse Staff'}</span>
                                    {staffLicense && (
                                      <span style={{ fontSize: '0.5rem', color: '#0369a1', fontWeight: 600 }}>
                                        PRC: {staffLicense}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '0.55rem' }}>Not administered</span>
                                )}
                              </td>
                              <td style={{ padding: '2px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '0.55rem' }}>
                                {rec?.status === 'completed' ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                                    <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Done</span>
                                    <span style={{ fontSize: '0.5rem', color: '#64748b' }}>Signed</span>
                                  </div>
                                ) : (
                                  <span style={{ color: '#64748b' }}>{rec?.status || 'Scheduled'}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Immunoglobulins & Other Biologics */}
                <div style={{ marginBottom: '0.15rem' }}>
                  <div style={{ background: '#fce7f3', padding: '0.15rem 0.3rem', borderRadius: '2px 2px 0 0', borderBottom: '1px solid #ec4899' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#831843', letterSpacing: '0.2px' }}>
                      IMMUNOGLOBULINS & OTHER BIOLOGICS
                    </span>
                  </div>
                  <table className="treatment-card-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.6rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 600, width: '16%' }}>Type</th>
                        <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600, width: '8%' }}>Dose</th>
                        <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600, width: '8%' }}>Route</th>
                        <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600, width: '12%' }}>Date</th>
                        <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 600, width: '22%' }}>Product Details</th>
                        <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 600, width: '22%' }}>Administered By</th>
                        <th style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600, width: '12%' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periods.filter(p => p.doseNum >= 200).map((item, idx) => {
                        const rec = records.find((r) => !r.voided_at && (r.dose_number === item.doseNum || (item.period === 'TT' ? ['TT', 'TD', 'TDAP', 'DTAP'].includes(r.medication_given?.toUpperCase()) : r.medication_given === item.period)));
                        const staff = rec?.administered_by || (rec as any)?.administeredBy;
                        const staffName = typeof staff === 'object' ? staff?.name : null;
                        const staffLicense = typeof staff === 'object' ? staff?.professional_license_no : null;
                        return (
                          <tr key={item.period} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fdf2f8' }}>
                            <td style={{ padding: '2px 3px', border: '1px solid #cbd5e1', fontWeight: 700, color: '#0f172a', fontSize: '0.55rem' }}>
                              {['ERIG', 'HRIG', 'TIG'].includes(item.period) && item.period}
                              {item.period === 'TT' && (rec?.medication_given || 'Tetanus vaccine')}
                              {item.period === 'ATS' && 'ATS (Anti-Tetanus)'}
                            </td>
                            <td style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600, color: '#be185d', fontSize: '0.55rem' }}>
                              {rec?.dosage_ml ? (
                                <span>{rec.dosage_ml} mL{rec.dose_iu ? ` / ${rec.dose_iu} IU` : ''}</span>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.5rem' }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '2px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '0.55rem' }}>
                              {rec?.route === 'wound_infiltration' && <span>Wound infiltration: {rec.injection_site}</span>}
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', flexWrap: 'wrap' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '1px', whiteSpace: 'nowrap' }}>
                                  <input type="checkbox" checked={rec?.route === 'ID'} readOnly style={{ margin: 0, width: '9px', height: '9px' }} /> ID
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '1px', whiteSpace: 'nowrap' }}>
                                  <input type="checkbox" checked={rec?.route === 'IM'} readOnly style={{ margin: 0, width: '9px', height: '9px' }} /> IM
                                </label>
                              </div>
                            </td>
                            <td style={{ padding: '2px 3px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 600, fontSize: '0.55rem' }}>
                              {rec?.treatment_date ? new Date(rec.treatment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : rec?.scheduled_date || '—'}
                            </td>
                            <td style={{ padding: '2px 3px', border: '1px solid #cbd5e1', fontSize: '0.55rem', lineHeight: 1.2 }}>
                              {(rec?.vaccine_type || rec?.vaccine_brand) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                  <span style={{ fontWeight: 600, color: '#0369a1' }}>{rec.vaccine_type || rec.vaccine_brand}</span>
                                  {(rec?.batch_number || rec?.batch_no) && (
                                    <span style={{ fontSize: '0.5rem', color: '#64748b' }}>Batch: {rec.batch_number || rec.batch_no}</span>
                                  )}
                                </div>
                              )}
                              {!(rec?.vaccine_type || rec?.vaccine_brand) && <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            <td style={{ padding: '2px 3px', border: '1px solid #cbd5e1', fontSize: '0.55rem', lineHeight: 1.2 }}>
                              {rec?.status === 'completed' || rec?.treatment_date ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                  <span style={{ fontWeight: 600 }}>{staffName || 'Nurse Staff'}</span>
                                  {staffLicense && (
                                    <span style={{ fontSize: '0.5rem', color: '#0369a1', fontWeight: 600 }}>
                                      PRC: {staffLicense}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.55rem' }}>Not administered</span>
                              )}
                            </td>
                            <td style={{ padding: '2px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '0.55rem' }}>
                              {rec?.status === 'completed' ? (
                                <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Done</span>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.5rem' }}>{rec?.status || 'N/A'}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer ICD 10 Code */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.35rem', fontSize: '0.6rem', marginTop: '0.25rem' }}>
                <strong>ICD 10 Code:</strong>
                <input
                  type="text"
                  value={icd10Code}
                  onChange={(e) => setIcd10Code(e.target.value)}
                  placeholder="Z20.3"
                  style={{ border: '1px solid #cbd5e1', padding: '2px 4px', borderRadius: '2px', fontWeight: 700, width: '80px', fontSize: '0.6rem' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div
          className="no-print"
          style={{
            background: 'var(--card-bg-solid, #f8fafc)',
            borderTop: '1px solid var(--border, #e2e8f0)',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #64748b)' }}>
            Tagoloan RHU Official Animal Bite Treatment Form
          </span>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={onClose}
              className="btn-action"
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.2s',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              style={{
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
                fontSize: '0.875rem',
                transition: 'all 0.2s',
                minWidth: '160px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <HugeiconsIcon icon={PrinterIcon} size={18} />
              Print Form
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
