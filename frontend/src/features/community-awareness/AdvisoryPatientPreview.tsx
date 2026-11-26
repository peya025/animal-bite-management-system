import { Box, Chip, Paper, Typography } from '@mui/material';

export type AdvisoryType = 'routine_education' | 'community_awareness' | 'official_health_advisory';

export interface AdvisoryPreviewData {
  advisory_type?: AdvisoryType;
  state?: string;
  title: string;
  body: string;
  expires_on: string;
  source_authority?: string | null;
  source_reference?: string | null;
  source_issued_on?: string | null;
  source_geography_note?: string | null;
  scheduled_for?: string | null;
}

const TYPE_LABELS: Record<AdvisoryType, string> = {
  routine_education: 'Routine education',
  community_awareness: 'Community awareness',
  official_health_advisory: 'Official health advisory',
};

export function AdvisoryPatientPreview({ advisory }: { advisory: AdvisoryPreviewData }) {
  const type: AdvisoryType = advisory.advisory_type ?? 'community_awareness';
  const isOfficial = type === 'official_health_advisory';
  const isApproved = ['approved', 'scheduled', 'published'].includes(advisory.state ?? '');

  return (
    <Paper
      variant="outlined"
      aria-label="Patient mobile preview"
      sx={{ p: 2, my: 1.5, bgcolor: '#f8fafc', borderColor: '#cbd5e1' }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
          Patient preview · Community Bite Awareness
        </Typography>
        <Chip size="small" variant="outlined" label={TYPE_LABELS[type]} />
      </Box>

      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
        {advisory.title || '(Untitled advisory)'}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', color: '#475569', mb: 1 }}>
        Clinic community · Valid through {advisory.expires_on || '—'} (Manila) ·{' '}
        {isApproved ? 'Reviewed by clinic' : 'Pending independent clinical review'}
      </Typography>

      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: '#1e293b', mb: 1.5 }}>
        {advisory.body || '(No guidance text yet)'}
      </Typography>

      {isOfficial && (
        <Box sx={{ p: 1.25, mb: 1.5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: '#0f172a' }}>
            Official source attribution
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#334155' }}>
            Authority: {advisory.source_authority || 'Required'} · Issued: {advisory.source_issued_on || 'Required'}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#334155' }}>
            Reference: {advisory.source_reference || 'Required'}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: '#334155' }}>
            Geographical relevance: {advisory.source_geography_note || 'Required'}
          </Typography>
        </Box>
      )}

      <Typography variant="caption" sx={{ display: 'block', color: '#475569', borderTop: '1px solid #e2e8f0', pt: 1 }}>
        Facility-reviewed clinic guidance only. Reports of animal bites do not by themselves confirm rabies infection.
        Contact the clinic or seek medical care promptly if you were exposed.
      </Typography>
    </Paper>
  );
}
