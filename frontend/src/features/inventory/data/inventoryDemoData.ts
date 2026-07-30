import type { InventoryItem } from '../types';

export interface ClinicInfo {
  clinic_id: number;
  name: string;
  province: string;
  municipality: string;
  office_name: string;
  phone: string;
  address: string;
  color: string;
}

export const DEMO_CLINICS: ClinicInfo[] = [
  {
    clinic_id: 1,
    name: 'Tagoloan Municipal Health Office',
    province: 'PROVINCE OF MISAMIS ORIENTAL',
    municipality: 'Municipality of Tagoloan',
    office_name: 'MUNICIPAL HEALTH OFFICE',
    phone: '(088) 590-4775',
    address: 'Poblacion, Tagoloan, Misamis Oriental',
    color: '#10b981',
  },
  {
    clinic_id: 2,
    name: 'Cagayan de Oro City Health Office',
    province: 'PROVINCE OF MISAMIS ORIENTAL',
    municipality: 'City of Cagayan de Oro',
    office_name: 'CITY HEALTH OFFICE - ANIMAL BITE CENTER',
    phone: '(088) 857-2244',
    address: 'Hayes St., Cagayan de Oro City',
    color: '#3b82f6',
  },
  {
    clinic_id: 3,
    name: 'El Salvador Animal Bite Treatment Center',
    province: 'PROVINCE OF MISAMIS ORIENTAL',
    municipality: 'City of El Salvador',
    office_name: 'CITY HEALTH OFFICE - ABTC UNIT',
    phone: '(088) 555-1234',
    address: 'Poblacion, El Salvador City',
    color: '#8b5cf6',
  },
  {
    clinic_id: 4,
    name: 'Gingoog District Health Office',
    province: 'PROVINCE OF MISAMIS ORIENTAL',
    municipality: 'City of Gingoog',
    office_name: 'GINGOOG DISTRICT HEALTH OFFICE',
    phone: '(088) 861-0987',
    address: 'National Highway, Gingoog City',
    color: '#f59e0b',
  },
];

export interface DemoTransaction {
  transaction_id: number;
  inventory_id: number;
  transaction_type: 'received' | 'used' | 'expired' | 'disposed' | 'adjusted' | 'transferred';
  quantity: number;
  transaction_date: string; // YYYY-MM-DD
  remarks: string | null;
  staff?: { name: string };
}

export interface DemoInventoryData {
  item: InventoryItem;
  transactions: DemoTransaction[];
}

export const DEMO_INVENTORY_ITEMS: InventoryItem[] = [
  // ── Clinic 1: Tagoloan Municipal Health Office ──
  {
    inventory_id: 101,
    clinic_id: 1,
    vaccine_type: 'Verorab (Purified Rabies Vaccine 0.5ml)',
    batch_number: 'VR-2026-089A',
    current_quantity: 42,
    expiration_date: '2027-09-30',
    status: 'active',
    created_at: '2026-07-01T08:00:00Z',
    updated_at: '2026-07-29T10:00:00Z',
    transactions_count: 8,
  },
  {
    inventory_id: 102,
    clinic_id: 1,
    vaccine_type: 'Equirab (Equine Rabies Immunoglobulin 1000IU)',
    batch_number: 'EQ-2026-442B',
    current_quantity: 18,
    expiration_date: '2027-05-15',
    status: 'active',
    created_at: '2026-07-01T08:00:00Z',
    updated_at: '2026-07-28T14:30:00Z',
    transactions_count: 5,
  },
  {
    inventory_id: 103,
    clinic_id: 1,
    vaccine_type: 'Speeda (Purified Vero Cell Rabies Vaccine 0.5ml)',
    batch_number: 'SP-2026-118C',
    current_quantity: 65,
    expiration_date: '2028-01-20',
    status: 'active',
    created_at: '2026-07-05T08:00:00Z',
    updated_at: '2026-07-25T11:15:00Z',
    transactions_count: 6,
  },
  {
    inventory_id: 104,
    clinic_id: 1,
    vaccine_type: 'Rabipur (PCECV Rabies Vaccine 1IU)',
    batch_number: 'RP-2025-004X',
    current_quantity: 0,
    expiration_date: '2026-06-30',
    status: 'expired',
    created_at: '2026-06-01T08:00:00Z',
    updated_at: '2026-07-01T09:00:00Z',
    transactions_count: 4,
  },

  // ── Clinic 2: Cagayan de Oro City Health Office ──
  {
    inventory_id: 201,
    clinic_id: 2,
    vaccine_type: 'Verorab (Purified Rabies Vaccine 0.5ml)',
    batch_number: 'VR-2026-CDO1',
    current_quantity: 120,
    expiration_date: '2027-11-15',
    status: 'active',
    created_at: '2026-07-02T08:00:00Z',
    updated_at: '2026-07-29T16:00:00Z',
    transactions_count: 10,
  },
  {
    inventory_id: 202,
    clinic_id: 2,
    vaccine_type: 'Equirab (Equine Rabies Immunoglobulin 1000IU)',
    batch_number: 'EQ-2026-CDO2',
    current_quantity: 35,
    expiration_date: '2027-08-20',
    status: 'active',
    created_at: '2026-07-03T09:00:00Z',
    updated_at: '2026-07-27T11:00:00Z',
    transactions_count: 4,
  },

  // ── Clinic 3: El Salvador Animal Bite Treatment Center ──
  {
    inventory_id: 301,
    clinic_id: 3,
    vaccine_type: 'Speeda (Purified Vero Cell Rabies Vaccine 0.5ml)',
    batch_number: 'SP-2026-ELS1',
    current_quantity: 50,
    expiration_date: '2027-10-10',
    status: 'active',
    created_at: '2026-07-04T08:00:00Z',
    updated_at: '2026-07-28T09:30:00Z',
    transactions_count: 6,
  },
  {
    inventory_id: 302,
    clinic_id: 3,
    vaccine_type: 'ERIG Rabies Immunoglobulin 1000IU',
    batch_number: 'EG-2026-ELS2',
    current_quantity: 15,
    expiration_date: '2027-04-30',
    status: 'active',
    created_at: '2026-07-04T08:00:00Z',
    updated_at: '2026-07-26T14:20:00Z',
    transactions_count: 3,
  },

  // ── Clinic 4: Gingoog District Health Office ──
  {
    inventory_id: 401,
    clinic_id: 4,
    vaccine_type: 'Verorab (Purified Rabies Vaccine 0.5ml)',
    batch_number: 'VR-2026-GNG1',
    current_quantity: 90,
    expiration_date: '2028-02-28',
    status: 'active',
    created_at: '2026-07-06T08:00:00Z',
    updated_at: '2026-07-29T08:45:00Z',
    transactions_count: 7,
  },
];

export const DEMO_TRANSACTIONS_MAP: Record<number, DemoTransaction[]> = {
  // ── Verorab Transactions for July 2026 (Tagoloan) ──
  101: [
    {
      transaction_id: 1,
      inventory_id: 101,
      transaction_type: 'received',
      quantity: 100,
      transaction_date: '2026-07-01',
      remarks: 'DOH Regional Office X - Central Supply',
      staff: { name: 'Dr. Maria Santos' },
    },
    {
      transaction_id: 2,
      inventory_id: 101,
      transaction_type: 'used',
      quantity: 12,
      transaction_date: '2026-07-03',
      remarks: 'OPD Patients Day 0 Doses',
      staff: { name: 'Nurse Clara Reyes' },
    },
    {
      transaction_id: 3,
      inventory_id: 101,
      transaction_type: 'used',
      quantity: 15,
      transaction_date: '2026-07-07',
      remarks: 'OPD Patients Day 3 & Day 7 Boosters',
      staff: { name: 'Nurse Clara Reyes' },
    },
    {
      transaction_id: 4,
      inventory_id: 101,
      transaction_type: 'transferred',
      quantity: 10,
      transaction_date: '2026-07-10',
      remarks: 'Transferred to Barangay Health Center (Santa Cruz)',
      staff: { name: 'Dr. Maria Santos' },
    },
    {
      transaction_id: 5,
      inventory_id: 101,
      transaction_type: 'used',
      quantity: 8,
      transaction_date: '2026-07-14',
      remarks: 'Category II & III Bites Treatment',
      staff: { name: 'Nurse Clara Reyes' },
    },
    {
      transaction_id: 6,
      inventory_id: 101,
      transaction_type: 'used',
      quantity: 10,
      transaction_date: '2026-07-21',
      remarks: 'Routine ABTC Patient Administration',
      staff: { name: 'Nurse Clara Reyes' },
    },
    {
      transaction_id: 7,
      inventory_id: 101,
      transaction_type: 'expired',
      quantity: 3,
      transaction_date: '2026-07-25',
      remarks: 'Cold chain break - discarded 3 compromised vials',
      staff: { name: 'Dr. Maria Santos' },
    },
    {
      transaction_id: 8,
      inventory_id: 101,
      transaction_type: 'used',
      quantity: 0,
      transaction_date: '2026-07-29',
      remarks: 'End of month stock balance verified (42 vials)',
      staff: { name: 'Dr. Maria Santos' },
    },
  ],

  // ── Equirab Transactions ──
  102: [
    {
      transaction_id: 10,
      inventory_id: 102,
      transaction_type: 'received',
      quantity: 30,
      transaction_date: '2026-07-01',
      remarks: 'Provincial Health Office Allocation',
      staff: { name: 'Dr. Maria Santos' },
    },
    {
      transaction_id: 11,
      inventory_id: 102,
      transaction_type: 'used',
      quantity: 4,
      transaction_date: '2026-07-05',
      remarks: 'Category III Infiltration (Head/Neck Bite)',
      staff: { name: 'Nurse Clara Reyes' },
    },
    {
      transaction_id: 12,
      inventory_id: 102,
      transaction_type: 'used',
      quantity: 5,
      transaction_date: '2026-07-12',
      remarks: 'Severe Category III Rabies Exposure Cases',
      staff: { name: 'Nurse Clara Reyes' },
    },
    {
      transaction_id: 13,
      inventory_id: 102,
      transaction_type: 'transferred',
      quantity: 3,
      transaction_date: '2026-07-18',
      remarks: 'Emergency Transfer to Tagoloan District Hospital',
      staff: { name: 'Dr. Maria Santos' },
    },
  ],

  // ── Speeda Transactions ──
  103: [
    {
      transaction_id: 20,
      inventory_id: 103,
      transaction_type: 'received',
      quantity: 80,
      transaction_date: '2026-07-05',
      remarks: 'LGU Supplemental Procurement',
      staff: { name: 'Dr. Maria Santos' },
    },
    {
      transaction_id: 21,
      inventory_id: 103,
      transaction_type: 'used',
      quantity: 15,
      transaction_date: '2026-07-15',
      remarks: 'Community Rabies Immunization Drive',
      staff: { name: 'Nurse Clara Reyes' },
    },
  ],

  // ── Rabipur Transactions ──
  104: [
    {
      transaction_id: 30,
      inventory_id: 104,
      transaction_type: 'received',
      quantity: 25,
      transaction_date: '2026-06-01',
      remarks: 'DOH Batch Allocation',
      staff: { name: 'Dr. Maria Santos' },
    },
    {
      transaction_id: 31,
      inventory_id: 104,
      transaction_type: 'used',
      quantity: 25,
      transaction_date: '2026-06-28',
      remarks: 'Fully dispensed to patients',
      staff: { name: 'Nurse Clara Reyes' },
    },
  ],

  // ── Cagayan de Oro Transactions ──
  201: [
    {
      transaction_id: 2011,
      inventory_id: 201,
      transaction_type: 'received',
      quantity: 150,
      transaction_date: '2026-07-02',
      remarks: 'CDO City Health Central Stock',
      staff: { name: 'Dr. Roberto Cruz' },
    },
    {
      transaction_id: 2012,
      inventory_id: 201,
      transaction_type: 'used',
      quantity: 30,
      transaction_date: '2026-07-15',
      remarks: 'Citywide OPD Rabies Exposure Doses',
      staff: { name: 'Nurse Angela Lopez' },
    },
  ],

  // ── El Salvador Transactions ──
  301: [
    {
      transaction_id: 3011,
      inventory_id: 301,
      transaction_type: 'received',
      quantity: 70,
      transaction_date: '2026-07-04',
      remarks: 'LGU El Salvador Direct Allocation',
      staff: { name: 'Dr. Elena Vance' },
    },
    {
      transaction_id: 3012,
      inventory_id: 301,
      transaction_type: 'used',
      quantity: 20,
      transaction_date: '2026-07-18',
      remarks: 'ABTC Patient Vaccinations',
      staff: { name: 'Nurse Mark Torres' },
    },
  ],

  // ── Gingoog Transactions ──
  401: [
    {
      transaction_id: 4011,
      inventory_id: 401,
      transaction_type: 'received',
      quantity: 110,
      transaction_date: '2026-07-06',
      remarks: 'Provincial Health Office Allocation Gingoog',
      staff: { name: 'Dr. Samuel Tan' },
    },
    {
      transaction_id: 4012,
      inventory_id: 401,
      transaction_type: 'used',
      quantity: 20,
      transaction_date: '2026-07-20',
      remarks: 'District Clinic Patient Doses',
      staff: { name: 'Nurse Grace Lim' },
    },
  ],
};

