import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { Settings as SetupIcon, Vaccines as VaccineIcon } from '@mui/icons-material';
import VaccineTypesCatalog from '../components/VaccineTypesCatalog/VaccineTypesCatalog';

export default function VaccineTypeManagementPage() {
  return (
    <Box sx={{ px: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75, flexWrap: 'wrap' }}>
            <Typography component="h1" sx={{ fontWeight: 700, fontSize: '25px', lineHeight: 1.2, color: 'var(--text-h)' }}>
              Vaccine Type Setup
            </Typography>
            <Chip
              icon={<SetupIcon sx={{ fontSize: 16 }} />}
              label="Setup mode"
              size="small"
              sx={{
                height: 24,
                fontWeight: 700,
                fontSize: 11,
                bgcolor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
              }}
            />
          </Stack>
          <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 760 }}>
            Configure reusable vaccine rules once, then reuse them every time staff add stock. This screen is intentionally styled as a setup area so users recognize they are maintaining catalog rules rather than doing daily inventory work.
          </Typography>
        </Box>
      </Box>

      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 2,
          borderRadius: 3,
          border: '1px solid #dbeafe',
          bgcolor: '#f8fbff',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: '#dbeafe',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <VaccineIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a' }}>
                Flow A — Vaccine Type Management
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#475569', mt: 0.35 }}>
                Save shelf-life, open-vial discard, regimen coverage, and cold-chain guidance here. The Add Stock modal reads these rules live so staff do not need to remember them.
              </Typography>
            </Box>
          </Box>

          <Chip
            label="Infrequent configuration"
            sx={{
              alignSelf: { xs: 'flex-start', md: 'center' },
              fontWeight: 700,
              fontSize: 11,
              bgcolor: '#e0e7ff',
              color: '#4338ca',
              border: '1px solid #c7d2fe',
            }}
          />
        </Stack>
      </Paper>

      <VaccineTypesCatalog />
    </Box>
  );
}
