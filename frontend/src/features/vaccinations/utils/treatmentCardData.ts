/**
 * Shared data derivation for the official Animal Bite Treatment Card.
 *
 * Used by both the full single-card layout (PrintableForm) and the compact
 * half-page layout (CompactTreatmentCard) so that dose / RIG / TT / ATS record
 * matching stays identical between the two print formats.
 */
import { formatDate } from './printHelpers';
import type { PrintableFormRecord, PrintableTreatmentRecord } from '../components/PrintableForm';

export const isRecordGiven = (r?: PrintableTreatmentRecord) =>
  Boolean(r && !r.voided_at && r.status !== 'cancelled' && r.outcome !== 'not_administered' && (r.status === 'completed' || Boolean(r.treatment_date)));

export const getStaffName = (rec?: PrintableTreatmentRecord) => {
  if (!rec) return '';
  const staff = rec.administered_by || (rec as any)?.administeredBy;
  if (typeof staff === 'object' && staff?.name) return staff.name;
  if (typeof staff === 'string' && staff) return staff;
  return 'Treatment Nurse';
};

export function deriveTreatmentCard(record?: PrintableFormRecord | null) {
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
  const selectedConsultationId = record?.selected_consultation_id;
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
  const formattedPhStatus = rawPhStatus === 'member'
    ? 'Member'
    : rawPhStatus === 'dependent'
    ? 'Dependent'
    : rawPhStatus
    ? (rawPhStatus.charAt(0).toUpperCase() + rawPhStatus.slice(1))
    : '—';

  // Patient Demographic
  const patientName = patient?.full_name?.trim() || '—';
  const age = patient?.age !== undefined && patient?.age !== null && patient?.age !== '' ? String(patient.age) : '—';
  const dob = formatDate(patient?.date_of_birth);
  const address = patient?.address || '—';

  const rawGender = (patient?.gender || '').toLowerCase();
  const formattedSex = rawGender === 'male' || rawGender === 'm' ? 'Male' : rawGender === 'female' || rawGender === 'f' ? 'Female' : '—';

  // Exposure Category
  const severityFallback = bite?.severity === 'minor' ? 'I' : bite?.severity === 'moderate' ? 'II' : bite?.severity === 'severe' ? 'III' : '';
  const rawCat = record?.exposureCategory || (latestConsultation as any)?.exposure_category || bite?.exposure_category || severityFallback || '';
  const normalizedCat = String(rawCat).replace(/^category\s*/i, '').trim().toUpperCase();
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
  const orderedRigProduct = String(pOrders.rig && pOrders.rig !== 'none' ? pOrders.rig : '').trim().toLowerCase();
  const orderedTtProduct = String(pOrders.tetanus_vaccine && pOrders.tetanus_vaccine !== 'none' ? pOrders.tetanus_vaccine : '').trim().toLowerCase();
  const orderedAtsProduct = String(pOrders.tetanus_passive && pOrders.tetanus_passive !== 'none' ? pOrders.tetanus_passive : '').trim().toLowerCase();

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
  const appointments: any[] = record?.appointments || [];
  const apt3 = appointments.find((a) => a.dose_number === 3 || a.notes?.toLowerCase().includes('day 3'));
  const apt7 = appointments.find((a) => a.dose_number === 7 || a.notes?.toLowerCase().includes('day 7'));
  const apt28 = appointments.find((a) => a.dose_number === 28 || a.notes?.toLowerCase().includes('day 28'));

  // Weight & RIG Dosage
  const patientWeight = Number(
    latestConsultation?.prophylaxis_orders?.rig_weight_kg ||
    latestConsultation?.weight ||
    patient?.weight ||
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
  const planType = String(bite?.plan_type || (bite as any)?.treatmentPlan?.plan_type || '').toLowerCase();
  const isBoosterPlan = planType.includes('booster');
  const hasD28 = isRecordGiven(d28Rec) || Boolean(apt28) || planType === 'full_pep_essen';
  const hasB1 = isRecordGiven(b1Rec) || isBoosterPlan;
  const hasB2 = isRecordGiven(b2Rec) || planType === 'two_dose_booster';
  const hasRig = rigGiven || Boolean(orderedRigProduct);
  const hasTt = ttGiven || Boolean(orderedTtProduct);
  const hasAts = atsGiven || Boolean(orderedAtsProduct);

  const icd10Code = record?.icd10Code || 'Z20.3';

  return {
    clinicTitle, clinicSubtitle, dohAccredNo, philhealthAccredNo, philhealthPin,
    dateVal, registryNoVal, hospitalNoVal, referredByVal, formattedPhStatus,
    patientName, age, dob, address, formattedSex, formattedCat, exposureDate, placeOfExposure,
    chosenModes, chosenParts, animalLabel, hasPastBite, pastBiteDates, pepCompleted,
    d0Rec, d3Rec, d7Rec, d28Rec, b1Rec, b2Rec, rigRec, ttRec, atsRec,
    rigGiven, ttGiven, atsGiven, treatmentStartDate, apt3, apt7, apt28, rigCalculatedMl,
    hasD28, hasB1, hasB2, hasRig, hasTt, hasAts, icd10Code,
  };
}

export type DerivedTreatmentCard = ReturnType<typeof deriveTreatmentCard>;

/**
 * Converts the `/tagoloan-treatment-cards/patient/{id}` API response into the
 * record shape consumed by the printable card layouts. Mirrors the field
 * defaults applied by TagoloanTreatmentCardModal when it loads a card.
 */
export function buildPrintableRecord(data: any, authClinic?: any, selectedTreatmentId?: number | null): PrintableFormRecord {
  const existing = data?.existing_card || null;
  const bite = data?.bite_incident || null;
  const patient = data?.patient || null;
  const clinic = { ...(authClinic || {}), ...(data?.clinic || {}) };
  const consultList: any[] = data?.consultation_history || data?.previous_consultations || [];
  const activeConsultation = (selectedTreatmentId
    ? consultList.find((c: any) => c.treatment_id === selectedTreatmentId)
    : null) || data?.latest_consultation || (consultList.length > 0 ? consultList[consultList.length - 1] : null);

  const storedAnimal = String((existing ? existing.animal_type : bite?.animal_type) || '').toLowerCase();
  let animalType = 'Dog';
  let animalTypeOthers = '';
  if (storedAnimal === 'cat') {
    animalType = 'Cat';
  } else if (storedAnimal && storedAnimal !== 'dog') {
    animalType = 'Others';
    animalTypeOthers = (existing ? existing.animal_type_others : bite?.animal_type_others) || storedAnimal;
  }

  const today = new Date().toISOString().split('T')[0];
  const cardDate = activeConsultation?.consultation_date
    ? String(activeConsultation.consultation_date).slice(0, 10)
    : existing?.card_date
    ? String(existing.card_date).slice(0, 10)
    : today;

  return {
    clinic,
    patient: {
      ...(patient || {}),
      weight: activeConsultation?.weight || activeConsultation?.prophylaxis_orders?.rig_weight_kg || patient?.weight,
    },
    bite: bite || undefined,
    cardDate,
    registryNo: existing?.registry_no || bite?.case_number || '',
    hospitalNo: existing?.hospital_no || clinic?.hospital_no || patient?.hospital_no || '',
    referredBy: existing?.referred_by || bite?.referred_from || '',
    exposureCategory: activeConsultation?.exposure_category || bite?.exposure_category || existing?.exposure_category || '',
    modeOfExposure: existing?.mode_of_exposure || bite?.mode_of_exposure || 'transdermal_bite',
    bodyPartExposed: existing?.body_part_exposed || bite?.body_part_exposed || 'other_parts',
    animalType,
    animalTypeOthers,
    pastBiteHistory: Boolean(existing?.past_bite_history),
    pastBiteDates: existing?.past_bite_dates || '',
    pastPepCompleted: Boolean(existing?.past_pep_completed),
    icd10Code: existing?.icd10_code || 'Z20.3',
    treatment_records: data?.treatment_records || [],
    prophylaxis_records: data?.prophylaxis_records || [],
    latest_consultation: activeConsultation,
    consultation_history: consultList,
    selected_consultation_id: activeConsultation?.treatment_id || selectedTreatmentId || null,
    appointments: data?.appointments || [],
  };
}
