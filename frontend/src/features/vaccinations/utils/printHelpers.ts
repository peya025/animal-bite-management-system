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
    head_neck: 'Head and neck',
    upper_extremities: 'Upper extremities (arm or hand)',
    lower_extremities: 'Lower extremities (leg or foot)',
    trunk_torso: 'Trunk or torso',
    trunk: 'Trunk or torso',
    multiple_sites: 'Multiple sites',
    multiple: 'Multiple sites',
    na_ingestion: 'Not applicable for ingestion or handling',
    other_parts: 'Other parts',
    na: 'Not applicable for ingestion or handling',
    'n/a': 'Not applicable for ingestion or handling',
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
    nibbling_uncovered_skin: 'Saliva or licking on intact skin',
    nibbling_uncovered: 'Saliva or licking on intact skin',
    nibbling_broken_skin: 'Saliva or licking on broken skin',
    nibbling_wounded: 'Saliva or licking on broken skin',
    scratch_abrasion: 'Scratch or abrasion',
    scratch: 'Scratch or abrasion',
    transdermal_bite: 'Transdermal bite',
    bite: 'Transdermal bite',
    handling_ingestion_raw_meat: 'Handling or ingestion of raw animal tissue',
    handling_ingestion: 'Handling or ingestion of raw animal tissue',
    unsure: 'Unsure',
    lick: 'Saliva or licking on intact skin',
  };
  const lower = String(raw).toLowerCase().trim().replace(/[\s-]+/g, '_');
  return dictionary[lower] || String(raw).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
