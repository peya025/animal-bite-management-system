import type { EnrolmentFormData, Patient, PatientMembership } from '../types';
import { INITIAL_ENROLMENT_DATA } from '../types';

type MembershipType = PatientMembership['membership_type'];
type RecordLike = Record<string, unknown>;

const UI_OTHER_KEY = 'others';

export function toRecord(value: unknown): RecordLike {
  return typeof value === 'object' && value !== null ? (value as RecordLike) : {};
}

export function firstNonEmpty<T = unknown>(...values: T[]): T | undefined {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return value;
  }
  return undefined;
}

function cleanString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function normalizeMembershipType(value: unknown): MembershipType | null {
  const text = cleanString(value);
  if (!text) return null;

  switch (text) {
    case 'philhealth':
    case 'fourps':
    case 'dswd_nhts':
    case 'senior_citizen':
    case 'pwd':
    case 'indigenous_member':
    case 'other':
      return text;
    case UI_OTHER_KEY:
      return 'other';
    default:
      return null;
  }
}

function parseMembershipList(value: unknown): string[] {
  const text = cleanString(value);
  if (!text) return [];

  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map(item => cleanString(item)).filter(Boolean) as string[];
      }
    } catch {
      return [];
    }
  }

  return [text];
}

function parseMembershipMap(value: unknown): Record<string, string> {
  const text = cleanString(value);
  if (!text || !text.startsWith('{')) return {};

  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.entries(parsed).reduce<Record<string, string>>((acc, [key, entry]) => {
      const cleaned = cleanString(entry);
      if (cleaned) acc[key] = cleaned;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function normalizeMembership(membership: RecordLike): PatientMembership | null {
  const membershipType = normalizeMembershipType(membership.membership_type ?? membership.type);
  if (!membershipType) return null;

  return {
    id: typeof membership.id === 'number' ? membership.id : undefined,
    membership_type: membershipType,
    is_active: membership.is_active !== false,
    status_value: cleanString(membership.status_value ?? membership.status),
    category: cleanString(membership.category),
    relationship_value: cleanString(membership.relationship_value ?? membership.relationship),
    registered_beneficiary: cleanString(membership.registered_beneficiary),
    membership_id_no: cleanString(membership.membership_id_no ?? membership.membership_id),
    membership_label: cleanString(membership.membership_label ?? membership.label),
    extra_value: cleanString(membership.extra_value ?? membership.extra),
  };
}

export function getPatientMemberships(patientLike: unknown): PatientMembership[] {
  const patient = toRecord(patientLike);
  const directMemberships = Array.isArray(patient.memberships)
    ? patient.memberships.map(item => normalizeMembership(toRecord(item))).filter(Boolean) as PatientMembership[]
    : [];

  if (directMemberships.length > 0) {
    return dedupeMemberships(directMemberships);
  }

  const details = toRecord(firstNonEmpty(patient.details));
  const memberships: PatientMembership[] = [];

  if (
    details.philhealth_member === 'yes'
    || cleanString(details.philhealth_status)
    || cleanString(details.philhealth_no)
    || cleanString(details.philhealth_category)
  ) {
    memberships.push({
      membership_type: 'philhealth',
      is_active: true,
      status_value: cleanString(details.philhealth_status),
      category: cleanString(details.philhealth_category),
      membership_id_no: cleanString(details.philhealth_no),
    });
  }

  if (
    details.fourps_member === 'yes'
    || cleanString(details.fourps_category)
    || cleanString(details.fourps_relationship)
    || cleanString(details.registered_fourps_beneficiary)
  ) {
    memberships.push({
      membership_type: 'fourps',
      is_active: true,
      status_value: cleanString(details.fourps_member) ?? 'yes',
      category: cleanString(details.fourps_category),
      relationship_value: cleanString(details.fourps_relationship),
      registered_beneficiary: cleanString(details.registered_fourps_beneficiary),
    });
  }

  if (details.dswd_nhts === 'yes') {
    memberships.push({
      membership_type: 'dswd_nhts',
      is_active: true,
      status_value: 'yes',
    });
  }

  const otherMemberships = parseMembershipList(details.other_membership);
  const otherNames = parseMembershipMap(details.other_membership_name);
  const otherNumbers = parseMembershipMap(details.other_membership_no);

  for (const rawType of otherMemberships) {
    const membershipType = normalizeMembershipType(rawType);

    if (membershipType === 'senior_citizen') {
      memberships.push({
        membership_type: 'senior_citizen',
        is_active: true,
        membership_id_no: cleanString(otherNumbers.senior_citizen),
      });
      continue;
    }

    if (membershipType === 'pwd') {
      memberships.push({
        membership_type: 'pwd',
        is_active: true,
        membership_id_no: cleanString(otherNumbers.pwd),
      });
      continue;
    }

    if (membershipType === 'indigenous_member') {
      memberships.push({
        membership_type: 'indigenous_member',
        is_active: true,
        extra_value: cleanString(otherNames.indigenous_member),
      });
      continue;
    }

    if (membershipType === 'other') {
      memberships.push({
        membership_type: 'other',
        is_active: true,
        membership_label: cleanString(otherNames.others ?? otherNames.other),
        membership_id_no: cleanString(otherNumbers.others ?? otherNumbers.other),
      });
      continue;
    }

    const customLabel = cleanString(rawType);
    if (customLabel && customLabel !== 'none') {
      memberships.push({
        membership_type: 'other',
        is_active: true,
        membership_label: customLabel,
        membership_id_no: cleanString(details.other_membership_no),
      });
    }
  }

  return dedupeMemberships(memberships);
}

function dedupeMemberships(memberships: PatientMembership[]): PatientMembership[] {
  const map = new Map<string, PatientMembership>();
  for (const membership of memberships) {
    map.set(membership.membership_type, membership);
  }
  return [...map.values()];
}

export function getMembershipByType(memberships: PatientMembership[], type: MembershipType): PatientMembership | undefined {
  return memberships.find(membership => membership.membership_type === type);
}

export function buildMembershipPayload(enrolment: EnrolmentFormData): PatientMembership[] {
  const memberships: PatientMembership[] = [];

  if (enrolment.philhealth_member === 'yes') {
    memberships.push({
      membership_type: 'philhealth',
      is_active: true,
      status_value: cleanString(enrolment.philhealth_status),
      category: cleanString(enrolment.philhealth_category),
      membership_id_no: cleanString(enrolment.philhealth_no),
    });
  }

  if (enrolment.fourps_member === 'yes') {
    memberships.push({
      membership_type: 'fourps',
      is_active: true,
      status_value: 'yes',
      category: cleanString(enrolment.fourps_category),
      relationship_value: cleanString(enrolment.fourps_relationship),
      registered_beneficiary: cleanString(enrolment.registered_fourps_beneficiary),
    });
  }

  if (enrolment.dswd_nhts === 'yes') {
    memberships.push({
      membership_type: 'dswd_nhts',
      is_active: true,
      status_value: 'yes',
    });
  }

  for (const membershipType of enrolment.other_memberships ?? []) {
    if (membershipType === 'senior_citizen') {
      memberships.push({
        membership_type: 'senior_citizen',
        is_active: true,
        membership_id_no: cleanString(enrolment.senior_citizen_id),
      });
      continue;
    }

    if (membershipType === 'pwd') {
      memberships.push({
        membership_type: 'pwd',
        is_active: true,
        membership_id_no: cleanString(enrolment.pwd_id),
      });
      continue;
    }

    if (membershipType === 'indigenous_member') {
      memberships.push({
        membership_type: 'indigenous_member',
        is_active: true,
        extra_value: cleanString(enrolment.indigenous_tribe),
      });
      continue;
    }

    if (membershipType === UI_OTHER_KEY) {
      memberships.push({
        membership_type: 'other',
        is_active: true,
        membership_label: cleanString(enrolment.other_membership_custom_name),
        membership_id_no: cleanString(enrolment.other_membership_custom_id),
      });
    }
  }

  return dedupeMemberships(memberships);
}

export function buildLegacyMembershipFields(enrolment: EnrolmentFormData) {
  const memberships = buildMembershipPayload(enrolment);
  const otherMemberships: string[] = [];
  const otherNames: Record<string, string> = {};
  const otherNumbers: Record<string, string> = {};

  let philhealthMember: string | null = 'no';
  let fourpsMember: string | null = 'no';
  let dswdNhts: string | null = 'no';
  let philhealthStatus: string | null = null;
  let philhealthNo: string | null = null;
  let philhealthCategory: string | null = null;
  let fourpsCategory: string | null = null;
  let fourpsRelationship: string | null = null;
  let registeredFourpsBeneficiary: string | null = null;

  for (const membership of memberships) {
    switch (membership.membership_type) {
      case 'philhealth':
        philhealthMember = 'yes';
        philhealthStatus = membership.status_value ?? null;
        philhealthNo = membership.membership_id_no ?? null;
        philhealthCategory = membership.category ?? null;
        break;
      case 'fourps':
        fourpsMember = 'yes';
        fourpsCategory = membership.category ?? null;
        fourpsRelationship = membership.relationship_value ?? null;
        registeredFourpsBeneficiary = membership.registered_beneficiary ?? null;
        break;
      case 'dswd_nhts':
        dswdNhts = 'yes';
        break;
      case 'senior_citizen':
        otherMemberships.push('senior_citizen');
        if (membership.membership_id_no) otherNumbers.senior_citizen = membership.membership_id_no;
        break;
      case 'pwd':
        otherMemberships.push('pwd');
        if (membership.membership_id_no) otherNumbers.pwd = membership.membership_id_no;
        break;
      case 'indigenous_member':
        otherMemberships.push('indigenous_member');
        if (membership.extra_value) otherNames.indigenous_member = membership.extra_value;
        break;
      case 'other':
        otherMemberships.push(UI_OTHER_KEY);
        if (membership.membership_label) otherNames[UI_OTHER_KEY] = membership.membership_label;
        if (membership.membership_id_no) otherNumbers[UI_OTHER_KEY] = membership.membership_id_no;
        break;
    }
  }

  return {
    memberships,
    philhealth_member: philhealthMember,
    philhealth_status: philhealthStatus,
    philhealth_no: philhealthNo,
    philhealth_category: philhealthCategory,
    fourps_member: fourpsMember,
    fourps_category: fourpsCategory,
    fourps_relationship: fourpsRelationship,
    registered_fourps_beneficiary: registeredFourpsBeneficiary,
    dswd_nhts: dswdNhts,
    has_membership: memberships.length > 0 ? 'yes' : 'no',
    other_membership: otherMemberships.length > 0 ? JSON.stringify(otherMemberships) : null,
    other_membership_name: Object.keys(otherNames).length > 0 ? JSON.stringify(otherNames) : null,
    other_membership_no: Object.keys(otherNumbers).length > 0 ? JSON.stringify(otherNumbers) : null,
  };
}

export function buildEnrolmentFromPatient(patientLike: Patient | RecordLike): EnrolmentFormData {
  const patient = toRecord(patientLike);
  const details = toRecord(firstNonEmpty(patient.details));
  const memberships = getPatientMemberships(patientLike);

  const philhealth = getMembershipByType(memberships, 'philhealth');
  const fourps = getMembershipByType(memberships, 'fourps');
  const senior = getMembershipByType(memberships, 'senior_citizen');
  const pwd = getMembershipByType(memberships, 'pwd');
  const indigenous = getMembershipByType(memberships, 'indigenous_member');
  const other = getMembershipByType(memberships, 'other');

  const dobRaw = cleanString(patient.date_of_birth);
  let formattedDob = '';
  if (dobRaw) {
    const date = new Date(dobRaw);
    if (!Number.isNaN(date.getTime())) {
      formattedDob = date.toISOString().split('T')[0];
    }
  }

  const otherMemberships = memberships
    .filter(membership => ['senior_citizen', 'pwd', 'indigenous_member', 'other'].includes(membership.membership_type))
    .map(membership => membership.membership_type === 'other' ? UI_OTHER_KEY : membership.membership_type);

  return {
    ...INITIAL_ENROLMENT_DATA,
    last_name: cleanString(patient.last_name) ?? '',
    first_name: cleanString(patient.first_name) ?? '',
    middle_name: cleanString(patient.middle_name) ?? '',
    suffix: cleanString(patient.suffix) ?? '',
    date_of_birth: formattedDob,
    sex: cleanString(patient.gender) ?? '',
    blood_type: cleanString(details.blood_type) ?? '',
    civil_status: cleanString(details.civil_status) ?? '',
    spouse_name: cleanString(details.spouse_name) ?? '',
    mother_maiden_name: cleanString(details.mother_maiden_name) ?? '',
    contact_number: cleanString(firstNonEmpty(patient.contact_number, patient.phone)) ?? '',
    email: cleanString(patient.email) ?? '',
    family_member: cleanString(details.family_member) ?? '',
    educational_attainment: cleanString(details.educational_attainment) ?? '',
    employment_status: cleanString(details.employment_status) ?? '',
    philhealth_member: philhealth ? 'yes' : (cleanString(details.philhealth_member) ?? ''),
    philhealth_status: cleanString(philhealth?.status_value ?? details.philhealth_status) ?? '',
    philhealth_no: cleanString(philhealth?.membership_id_no ?? details.philhealth_no) ?? '',
    philhealth_category: cleanString(philhealth?.category ?? details.philhealth_category) ?? '',
    fourps_member: fourps ? 'yes' : (cleanString(details.fourps_member) ?? ''),
    fourps_category: cleanString(fourps?.category ?? details.fourps_category) ?? '',
    fourps_relationship: cleanString(fourps?.relationship_value ?? details.fourps_relationship) ?? '',
    registered_fourps_beneficiary: cleanString(fourps?.registered_beneficiary ?? details.registered_fourps_beneficiary) ?? '',
    dswd_nhts: getMembershipByType(memberships, 'dswd_nhts') ? 'yes' : (cleanString(details.dswd_nhts) ?? ''),
    has_membership: memberships.length > 0 ? 'yes' : (cleanString(details.has_membership) ?? ''),
    other_membership: cleanString(details.other_membership) ?? '',
    other_membership_name: cleanString(details.other_membership_name) ?? '',
    other_membership_no: cleanString(details.other_membership_no) ?? '',
    emergency_contact_name: cleanString(firstNonEmpty(patient.emergency_contact_name, details.emergency_contact_name)) ?? '',
    emergency_contact_phone: cleanString(firstNonEmpty(patient.emergency_contact_number, patient.emergency_contact_phone, details.emergency_contact_phone)) ?? '',
    other_memberships: otherMemberships,
    senior_citizen_id: cleanString(senior?.membership_id_no) ?? '',
    pwd_id: cleanString(pwd?.membership_id_no) ?? '',
    indigenous_tribe: cleanString(indigenous?.extra_value) ?? '',
    other_membership_custom_name: cleanString(other?.membership_label) ?? '',
    other_membership_custom_id: cleanString(other?.membership_id_no) ?? '',
  };
}
