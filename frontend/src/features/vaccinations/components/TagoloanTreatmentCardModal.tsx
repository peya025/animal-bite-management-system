// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useSavedExposureCategory } from '../hooks/useSavedExposureCategory';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { printWhenReady } from '../../../components/print/printReady';
import api from '../../../services/api';
import { Icon } from '../../../shared/components/ui/Icon';
import { HugeiconsIcon } from '@hugeicons/react';
import { PrinterIcon } from '@hugeicons/core-free-icons';
import { getGlobalPrintLogos } from '../../../components/print';
import PrintableForm, { type PrintableFormRecord } from './PrintableForm';

interface Props {
  open: boolean;
  onClose: () => void;
  patientId: number | null;
  biteId?: number | null;
  onSaved?: () => void;
  initialExposureCategory?: 'I' | 'II' | 'III' | '';
}

export default function TagoloanTreatmentCardModal({ open, onClose, patientId, biteId }: Props) {
  const { clinic: authClinic } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState<any>(null);

  // Print Mode (Filled vs Blank)
  const [printMode, setPrintMode] = useState<'filled' | 'blank'>('filled');

  // Ref to always reset scroll to the top of the A4 form
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Form Field State
  const [registryNo, setRegistryNo] = useState('');
  const [hospitalNo, setHospitalNo] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const savedExposureCategory = useSavedExposureCategory(open, patientId, biteId);
  const exposureCategory = savedExposureCategory ?? cardData?.bite_incident?.exposure_category ?? cardData?.existing_card?.exposure_category ?? '';
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
  }, [open, patientId, biteId]);

  // Reset scroll to top whenever modal opens, data loads, or mode changes
  useEffect(() => {
    if (open && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [open, cardData, printMode]);

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
        setModeOfExposure(existing.mode_of_exposure || 'transdermal_bite');
        setBodyPartExposed(existing.body_part_exposed || 'other_parts');
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

  const handlePrint = () => {
    void printWhenReady(window);
  };

  if (!open) return null;

  const patient = cardData?.patient;
  const clinic = cardData?.clinic;
  const bite = cardData?.bite_incident;
  const records = cardData?.treatment_records || [];
  const globalLogos = getGlobalPrintLogos(clinic || authClinic);

  const printableRecord: PrintableFormRecord = {
    clinic,
    logos: globalLogos,
    patient,
    bite,
    cardDate,
    registryNo,
    hospitalNo,
    referredBy,
    exposureCategory,
    modeOfExposure,
    bodyPartExposed,
    animalType,
    animalTypeOthers,
    pastBiteHistory,
    pastBiteDates,
    pastPepCompleted,
    icd10Code,
    treatment_records: records,
  };

  return (
    <div
      className="tagoloan-modal-overlay"
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
          .no-print, button, .modal-footer {
            display: none !important;
          }
          .tagoloan-modal-overlay {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            backdrop-filter: none !important;
          }
          .tagoloan-modal-card {
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            border-radius: 0 !important;
            background: transparent !important;
          }
          .tagoloan-preview-scroll-area {
            overflow: visible !important;
            padding: 0 !important;
            background: transparent !important;
            height: auto !important;
          }
          .tagoloan-paper-container {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
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

      <div
        className="tagoloan-modal-card"
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '860px',
          height: 'calc(100dvh - 48px)',
          maxHeight: '940px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          boxSizing: 'border-box',
        }}
      >
        {/* Header Bar */}
        <div
          className="no-print"
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="activity" size={18} color="#059669" />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                Official Animal Bite Treatment Form
              </div>
              <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                Tagoloan RHU Official Animal Bite Treatment Center (DOH Accredited)
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: '#f1f5f9',
              border: 'none',
              color: '#475569',
              fontSize: '1.1rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '6px 10px',
              borderRadius: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Toolbar (Filled / Blank Mode Toggle) */}
        {!loading && (
          <div
            className="no-print"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 20px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              flexShrink: 0,
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Template:
              </span>
              <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '6px', padding: '2px' }}>
                <button
                  type="button"
                  onClick={() => setPrintMode('filled')}
                  style={{
                    padding: '4px 14px',
                    fontSize: '0.75rem',
                    fontWeight: printMode === 'filled' ? 700 : 500,
                    color: printMode === 'filled' ? '#0f172a' : '#64748b',
                    background: printMode === 'filled' ? '#ffffff' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    boxShadow: printMode === 'filled' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Filled (Default)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode('blank')}
                  style={{
                    padding: '4px 14px',
                    fontSize: '0.75rem',
                    fontWeight: printMode === 'blank' ? 700 : 500,
                    color: printMode === 'blank' ? '#0f172a' : '#64748b',
                    background: printMode === 'blank' ? '#ffffff' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    boxShadow: printMode === 'blank' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Blank Form
                </button>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              <span>Standard Single A4 Page Preview</span>
            </div>
          </div>
        )}

        {/* Content Area: Single Clean Scroll Container */}
        <div
          ref={scrollContainerRef}
          className="tagoloan-preview-scroll-area"
          style={{
            flex: 1,
            overflowY: 'auto',
            background: '#cbd5e1',
            padding: '24px 16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', color: '#475569', padding: '4rem', margin: 'auto' }}>
              <p style={{ fontWeight: 600 }}>Loading official treatment card...</p>
            </div>
          ) : (
            <div
              className="tagoloan-paper-container"
              style={{
                width: '100%',
                maxWidth: '794px', // Exact 210mm A4 width at 96 DPI
                background: '#ffffff',
                padding: '36px 40px', // Official 12mm page margin padding
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
                borderRadius: '4px',
                border: '1px solid #94a3b8',
                boxSizing: 'border-box',
                margin: '0 auto',
              }}
            >
              <PrintableForm record={printableRecord} mode={printMode} />
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div
          className="no-print modal-footer"
          style={{
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Tagoloan RHU Official Animal Bite Treatment Form • {printMode === 'filled' ? 'Filled Mode' : 'Blank Mode'}
          </span>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '0.45rem 1.25rem',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '0.45rem 1.5rem',
                borderRadius: '6px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
                fontSize: '0.875rem',
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
