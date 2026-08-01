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
    name: 'Tagoloan Animal Bite Treatment Center',
    province: 'PROVINCE OF MISAMIS ORIENTAL',
    municipality: 'Municipality of Tagoloan',
    office_name: 'MUNICIPAL HEALTH OFFICE',
    phone: '(088) 555-4778',
    address: 'Poblacion, Tagoloan, Misamis Oriental',
    color: '#10b981',
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
  // ── All Batches Belong Strictly to Tagoloan Animal Bite Treatment Center ──
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
  {
    inventory_id: 105,
    clinic_id: 1,
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
    inventory_id: 106,
    clinic_id: 1,
    vaccine_type: 'Verorab (Purified Rabies Vaccine 0.5ml)',
    batch_number: 'VR-2026-TAG2',
    current_quantity: 120,
    expiration_date: '2027-11-15',
    status: 'active',
    created_at: '2026-07-02T08:00:00Z',
    updated_at: '2026-07-29T16:00:00Z',
    transactions_count: 10,
  },
];

export const DEMO_TRANSACTIONS_MAP: Record<number, DemoTransaction[]> = {
  // ── Verorab (VR-2026-089A) ──
  101: [
    {
      transaction_id: 1,
      inventory_id: 101,
      transaction_type: 'received',
      quantity: 100,
      transaction_date: '2026-07-01',
      remarks: 'DOH Regional Office X - Central Supply Depot',
      staff: { name: 'Dr. Maria Santos' },
    },
    {
      transaction_id: 2,
      inventory_id: 101,
      transaction_type: 'used',
      quantity: 12,
      transaction_date: '2026-07-03',
      remarks: 'Tagoloan ABTC OPD Patients Day 0 Doses',
      staff: { name: 'Nurse Clara Reyes' },
    },
    {
      transaction_id: 3,
      inventory_id: 101,
      transaction_type: 'used',
      quantity: 15,
      transaction_date: '2026-07-07',
      remarks: 'Tagoloan ABTC OPD Patients Day 3 & Day 7 Boosters',
      staff: { name: 'Nurse Clara Reyes' },
    },
    {
      transaction_id: 4,
      inventory_id: 101,
      transaction_type: 'transferred',
      quantity: 10,
      transaction_date: '2026-07-10',
      remarks: 'Transferred to Barangay Health Center (Santa Cruz, Tagoloan)',
      staff: { name: 'Dr. Maria Santos' },
    },
    {
      transaction_id: 5,
      inventory_id: 101,
      transaction_type: 'used',
      quantity: 8,
      transaction_date: '2026-07-14',
      remarks: 'Category II & III Rabies Bite Exposure Doses',
      staff: { name: 'Nurse Clara Reyes' },
    },
    {
      transaction_id: 6,
      inventory_id: 101,
      transaction_type: 'used',
      quantity: 10,
      transaction_date: '2026-07-21',
      remarks: 'Routine Tagoloan ABTC Patient Administration',
      staff: { name: 'Nurse Clara Reyes' },
    },
    {
      transaction_id: 7,
      inventory_id: 101,
      transaction_type: 'expired',
      quantity: 3,
      transaction_date: '2026-07-25',
      remarks: 'Cold chain monitor alert - 3 vials discarded',
      staff: { name: 'Dr. Maria Santos' },
    },
    {
      transaction_id: 8,
      inventory_id: 101,
      transaction_type: 'used',
      quantity: 0,
      transaction_date: '2026-07-29',
      remarks: 'Monthly stock balance verified (42 vials remaining)',
      staff: { name: 'Dr. Maria Santos' },
    },
  ],

  // ── Equirab (EQ-2026-442B) ──
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
      remarks: 'Emergency Transfer to Tagoloan Extension Clinic',
      staff: { name: 'Dr. Maria Santos' },
    },
  ],

  // ── Speeda (SP-2026-118C) ──
  103: [
    {
      transaction_id: 20,
      inventory_id: 103,
      transaction_type: 'received',
      quantity: 80,
      transaction_date: '2026-07-05',
      remarks: 'Tagoloan LGU Supplemental Procurement',
      staff: { name: 'Dr. Maria Santos' },
    },
    {
      transaction_id: 21,
      inventory_id: 103,
      transaction_type: 'used',
      quantity: 15,
      transaction_date: '2026-07-15',
      remarks: 'Community Rabies Immunization Drive (Tagoloan)',
      staff: { name: 'Nurse Clara Reyes' },
    },
  ],

  // ── Rabipur (RP-2025-004X) ──
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
      remarks: 'Fully dispensed to Tagoloan ABTC patients',
      staff: { name: 'Nurse Clara Reyes' },
    },
  ],

  // ── Speeda (SP-2026-ELS1) ──
  105: [
    {
      transaction_id: 50,
      inventory_id: 105,
      transaction_type: 'received',
      quantity: 70,
      transaction_date: '2026-07-04',
      remarks: 'Tagoloan LGU Emergency Allocation',
      staff: { name: 'Dr. Maria Santos' },
    },
    {
      transaction_id: 51,
      inventory_id: 105,
      transaction_type: 'used',
      quantity: 20,
      transaction_date: '2026-07-18',
      remarks: 'Tagoloan ABTC Patient Vaccinations',
      staff: { name: 'Nurse Clara Reyes' },
    },
  ],

  // ── Verorab (VR-2026-TAG2) ──
  106: [
    {
      transaction_id: 60,
      inventory_id: 106,
      transaction_type: 'received',
      quantity: 150,
      transaction_date: '2026-07-02',
      remarks: 'Tagoloan ABTC Central Stock Supply',
      staff: { name: 'Dr. Maria Santos' },
    },
    {
      transaction_id: 61,
      inventory_id: 106,
      transaction_type: 'used',
      quantity: 30,
      transaction_date: '2026-07-15',
      remarks: 'OPD Rabies Exposure Doses (Tagoloan)',
      staff: { name: 'Nurse Clara Reyes' },
    },
  ],
};

