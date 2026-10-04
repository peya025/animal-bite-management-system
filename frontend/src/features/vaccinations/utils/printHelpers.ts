/**
 * Print & formatting helpers for official Animal Bite Treatment forms.
 * Follows DOH standard formats: single date style ("03 Oct 2026"), title case formatting.
 */

export function formatDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  try {
    const raw = String(dateInput).trim();
    if (!raw) return '—';
    const d = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
    if (isNaN(d.getTime())) return raw;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return String(dateInput);
  }
}

export function formatBodyPart(raw?: string | null): string {
  if (!raw || !String(raw).trim()) return '—';
  const dictionary: Record<string, string> = {
    head_neck: 'Head & Neck',
    upper_extremities: 'Upper Extremities',
    lower_extremities: 'Lower Extremities',
    trunk: 'Trunk',
    multiple: 'Multiple',
    other_parts: 'Other parts',
    na: 'N/A',
    'n/a': 'N/A',
  };

  const parts = String(raw).split(',').map((p) => p.trim()).filter(Boolean);
  const formatted = parts.map((part) => {
    const lower = part.toLowerCase().replace(/[\s-]+/g, '_');
    if (dictionary[lower]) return dictionary[lower];
    return part.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  });

  return formatted.join(', ') || '—';
}

export function formatModeOfExposure(raw?: string | null): string {
  if (!raw || !String(raw).trim()) return '—';
  const dictionary: Record<string, string> = {
    nibbling_uncovered_skin: 'Nibbling / licking uncovered skin',
    nibbling_uncovered: 'Nibbling / licking uncovered skin',
    nibbling_broken_skin: 'Nibbling / licking wounded skin',
    nibbling_wounded: 'Nibbling / licking wounded skin',
    scratch_abrasion: 'Scratch / abrasion',
    scratch: 'Scratch / abrasion',
    transdermal_bite: 'Transdermal bite',
    bite: 'Transdermal bite',
    handling_ingestion_raw_meat: 'Handling / ingestion raw meat',
    handling_ingestion: 'Handling / ingestion raw meat',
  };
  const lower = String(raw).toLowerCase().trim().replace(/[\s-]+/g, '_');
  return dictionary[lower] || String(raw).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
