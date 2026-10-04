/**
 * Utility functions for Bite Cases Dashboard
 */

import type { LocationSummary, CaseSummary } from '../pages/BiteCaseRiskDashboard';

/**
 * Export locations data to CSV including all columns
 */
export function exportLocationsToCsv(locations: LocationSummary[], filename = 'bite-cases-locations.csv') {
  if (!locations || locations.length === 0) {
    alert('No data available to export');
    return;
  }

  // CSV Headers - ALL columns
  const headers = [
    'Location',
    'Level',
    'Risk Score',
    'Risk Level',
    'Priority Level',
    'Total Cases',
    'Category I',
    'Category II',
    'Category III',
    'Dog Bites',
    'Cat Bites',
    'Other Animal Bites',
    'PEP Compliance (%)',
    'Overdue Doses',
    'Trend',
    'Trend Difference',
    'Last Incident Date',
    'Days Since Last Incident',
  ];

  // Convert data to CSV rows
  const rows = locations.map((loc) => {
    const animalDog = loc.animal_types?.dog || 0;
    const animalCat = loc.animal_types?.cat || 0;
    const animalOther = loc.animal_types?.other || 0;

    return [
      escapeCsvField(loc.location),
      escapeCsvField(loc.location_level || ''),
      loc.risk_score,
      loc.risk_level,
      '', // Priority level will be computed if needed
      loc.total_cases,
      loc.cat_1,
      loc.cat_2,
      loc.cat_3,
      animalDog,
      animalCat,
      animalOther,
      loc.pep_compliance,
      loc.overdue_doses,
      loc.trend,
      loc.trend_diff || '',
      loc.last_incident || '',
      loc.last_incident_days_ago !== null ? loc.last_incident_days_ago : '',
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  // Create and download file
  downloadCsvFile(csvContent, filename);
}

/**
 * Export cases data to CSV
 */
export function exportCasesToCsv(cases: CaseSummary[], filename = 'bite-cases.csv') {
  if (!cases || cases.length === 0) {
    alert('No data available to export');
    return;
  }

  const headers = [
    'Case Number',
    'Patient Name',
    'Patient ID',
    'Bite Date',
    'Location',
    'Category',
    'Animal Type',
    'Status',
    'Is Overdue',
    'Days Overdue',
    'Overdue Dose',
  ];

  const rows = cases.map((c) => [
    escapeCsvField(c.case_number),
    escapeCsvField(c.patient_name),
    c.patient_id || '',
    c.bite_date || '',
    escapeCsvField(c.location),
    c.category,
    escapeCsvField(c.animal_type),
    c.status,
    c.is_overdue ? 'Yes' : 'No',
    c.days_overdue || '',
    escapeCsvField(c.overdue_dose || ''),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  downloadCsvFile(csvContent, filename);
}

/**
 * Escape CSV field to handle commas, quotes, and newlines
 */
function escapeCsvField(field: string | number): string {
  if (typeof field === 'number') return field.toString();
  if (!field) return '';
  
  const stringField = field.toString();
  
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  
  return stringField;
}

/**
 * Download CSV file
 */
function downloadCsvFile(content: string, filename: string) {
  // Add BOM for proper Excel UTF-8 handling
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Column visibility management
 */
export type ColumnKey = 'cat_3' | 'cat_2' | 'cat_1' | 'animal' | 'trend' | 'risk_score';

export const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  cat_3: false,
  cat_2: false,
  cat_1: false,
  animal: false,
  trend: false,
  risk_score: false,
};

const STORAGE_KEY = 'bite_cases_location_columns';

export function getStoredColumnVisibility(): Record<ColumnKey, boolean> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_VISIBLE_COLUMNS, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Failed to load column visibility:', error);
  }
  return DEFAULT_VISIBLE_COLUMNS;
}

export function saveColumnVisibility(columns: Record<ColumnKey, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  } catch (error) {
    console.error('Failed to save column visibility:', error);
  }
}

/**
 * Format days ago text accessibly
 */
export function formatDaysAgo(days: number | null): string {
  if (days === null || days === undefined) return '—';
  const absDays = Math.abs(days);
  if (absDays === 0) return 'Today';
  if (absDays === 1) return 'Yesterday';
  return `${absDays} days ago`;
}

/**
 * Format animal summary accessibly
 */
export function formatAnimalSummary(types?: Record<string, number>): string {
  if (!types) return 'None';
  const parts: string[] = [];
  if (types.dog) parts.push(`${types.dog} Dog${types.dog > 1 ? 's' : ''}`);
  if (types.cat) parts.push(`${types.cat} Cat${types.cat > 1 ? 's' : ''}`);
  if (types.other) parts.push(`${types.other} Other animal${types.other > 1 ? 's' : ''}`);
  return parts.join(', ') || 'None';
}

/**
 * Get accessible label for sort direction
 */
export function getSortAriaLabel(column: string, direction: 'asc' | 'desc' | false): string {
  if (!direction) return `Sort by ${column}`;
  return `Sorted by ${column} ${direction === 'asc' ? 'ascending' : 'descending'}`;
}
