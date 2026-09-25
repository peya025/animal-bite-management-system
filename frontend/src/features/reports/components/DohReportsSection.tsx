import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  PrintOutlined,
  VisibilityOutlined,
  Close,
  AssessmentOutlined,
} from '@mui/icons-material';

const currentYear = new Date().getFullYear();
const currentMonth = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
const currentQuarter = `${Math.ceil((new Date().getMonth() + 1) / 3)}${['st', 'nd', 'rd', 'th'][Math.ceil((new Date().getMonth() + 1) / 3) - 1]}`;

const formatDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getQuarterRange = () => {
  const now = new Date();
  const qMonth = Math.floor(now.getMonth() / 3) * 3;
  const start = new Date(now.getFullYear(), qMonth, 1);
  return {
    from: formatDate(start),
    to: formatDate(now),
  };
};

export default function DohReportsSection() {
  const { user } = useAuth();

  // Triage Doctor/Doctor ('triage'), Treatment Nurse/Nurse ('treatment'), and Registration Staff ('registration')
  // do not have access to DOH report cards. The entire section is omitted for these roles.
  const isRestrictedRole = user?.role === 'triage' || user?.role === 'treatment' || user?.role === 'registration';

  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter states
  const defaultQuarterDates = getQuarterRange();
  const [registryFrom, setRegistryFrom] = useState<string>(defaultQuarterDates.from);
  const [registryTo, setRegistryTo] = useState<string>(defaultQuarterDates.to);
  const [registryQuarter, setRegistryQuarter] = useState<string>(currentQuarter);
  const [registryYear, setRegistryYear] = useState<number>(currentYear);

  const [monthlyMonth, setMonthlyMonth] = useState<string>(currentMonth);

  const [cohortYear, setCohortYear] = useState<number>(currentYear);

  // Preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');

  const fetchPrintHtml = async (endpoint: string, params: Record<string, string | number>) => {
    const query = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
    const API_BASE =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      'http://localhost:8000/api';

    const url = `${API_BASE}/print/reports/${endpoint}?${query}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load print template (HTTP ${response.status})`);
    }

    return await response.text();
  };

  const handleSilentPrint = async (
    type: 'exposure-registry' | 'monthly' | 'cohort',
    params: Record<string, string | number>
  ) => {
    setErrorMsg(null);
    setLoadingType(type);

    try {
      const html = await fetchPrintHtml(type, params);

      // Create hidden iframe on the page to trigger browser print without opening a new tab
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc) {
        throw new Error('Unable to initialize printing frame');
      }

      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Print trigger failed', e);
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }
      }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate print document');
    } finally {
      setLoadingType(null);
    }
  };

  const handlePreview = async (
    title: string,
    type: 'exposure-registry' | 'monthly' | 'cohort',
    params: Record<string, string | number>
  ) => {
    setErrorMsg(null);
    setLoadingType(`prev-${type}`);

    try {
      const html = await fetchPrintHtml(type, params);
      setPreviewTitle(title);
      setPreviewHtml(html);
      setPreviewOpen(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load preview');
    } finally {
      setLoadingType(null);
    }
  };

  const printFromPreview = () => {
    const previewFrame = document.getElementById('doh-preview-iframe') as HTMLIFrameElement;
    if (previewFrame?.contentWindow) {
      previewFrame.contentWindow.focus();
      previewFrame.contentWindow.print();
    }
  };

  // Triage Doctor/Doctor and Treatment Nurse/Nurse roles see none of the DOH report cards — return nothing.
  if (isRestrictedRole) return null;

  return (
    <Box sx={{ mt: 3, mb: 4 }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentOutlined sx={{ color: '#059669' }} />
          Official DOH Rabies Program Reports
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Generate and print official Department of Health NRPCP forms. Clicking &quot;Print&quot; directly triggers your printer dialog without opening another tab.
        </Typography>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
          gap: 2.5,
        }}
      >
        {/* REPORT 1: Exposure Registry */}
        <Card
          variant="outlined"
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            borderColor: 'divider',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: '#9ca3af',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            },
          }}
        >
          <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Rabies Exposure Registry
              </Typography>
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  bgcolor: '#f3f4f6',
                  color: '#374151',
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                Weekly · Landscape
              </Box>
            </Box>

            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, minHeight: 40 }}>
              Weekly breakdown of human demographics, age groups (&lt;15, 15&gt;), Category I–III exposures, TCV &amp; RIG doses, and animal types (dog, cat, others).
            </Typography>

            <Divider sx={{ my: 1.5 }} />

            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="From"
                  type="date"
                  size="small"
                  fullWidth
                  value={registryFrom}
                  onChange={(e) => setRegistryFrom(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="To"
                  type="date"
                  size="small"
                  fullWidth
                  value={registryTo}
                  onChange={(e) => setRegistryTo(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  select
                  label="Quarter"
                  size="small"
                  fullWidth
                  value={registryQuarter}
                  onChange={(e) => setRegistryQuarter(e.target.value)}
                >
                  <MenuItem value="1st">1st Quarter</MenuItem>
                  <MenuItem value="2nd">2nd Quarter</MenuItem>
                  <MenuItem value="3rd">3rd Quarter</MenuItem>
                  <MenuItem value="4th">4th Quarter</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Year"
                  size="small"
                  fullWidth
                  value={registryYear}
                  onChange={(e) => setRegistryYear(Number(e.target.value))}
                >
                  {[currentYear, currentYear - 1, currentYear - 2, 2024, 2023].map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Stack>
          </CardContent>

          <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<VisibilityOutlined />}
              disabled={loadingType !== null}
              onClick={() =>
                handlePreview('Rabies Exposure Registry', 'exposure-registry', {
                  from: registryFrom,
                  to: registryTo,
                  quarter: registryQuarter,
                  year: registryYear,
                })
              }
              sx={{ flex: 1 }}
            >
              Preview
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={
                loadingType === 'exposure-registry' ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <PrintOutlined />
                )
              }
              disabled={loadingType !== null}
              onClick={() =>
                handleSilentPrint('exposure-registry', {
                  from: registryFrom,
                  to: registryTo,
                  quarter: registryQuarter,
                  year: registryYear,
                })
              }
              sx={{
                flex: 1.5,
                bgcolor: '#059669',
                '&:hover': { bgcolor: '#047857' },
              }}
            >
              Print Registry
            </Button>
          </Box>
        </Card>

        {/* REPORT 2: ABTC Monthly Report */}
        <Card
          variant="outlined"
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            borderColor: 'divider',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: '#9ca3af',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            },
          }}
        >
          <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                ABTC Monthly Report
              </Typography>
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  bgcolor: '#f3f4f6',
                  color: '#374151',
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                Monthly · Landscape
              </Box>
            </Box>

            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, minHeight: 40 }}>
              Official NRPCP monthly report summarizing cases by sex, exposure categories, completed vaccinations, RIG administered, and completion rate.
            </Typography>

            <Divider sx={{ my: 1.5 }} />

            <Stack spacing={1.5}>
              <TextField
                label="Select Month"
                type="month"
                size="small"
                fullWidth
                value={monthlyMonth}
                onChange={(e) => setMonthlyMonth(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          </CardContent>

          <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<VisibilityOutlined />}
              disabled={loadingType !== null}
              onClick={() =>
                handlePreview('ABTC Monthly Report', 'monthly', {
                  month: monthlyMonth,
                })
              }
              sx={{ flex: 1 }}
            >
              Preview
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={
                loadingType === 'monthly' ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <PrintOutlined />
                )
              }
              disabled={loadingType !== null}
              onClick={() =>
                handleSilentPrint('monthly', {
                  month: monthlyMonth,
                })
              }
              sx={{
                flex: 1.5,
                bgcolor: '#059669',
                '&:hover': { bgcolor: '#047857' },
              }}
            >
              Print Monthly
            </Button>
          </Box>
        </Card>

        {/* REPORT 3: Cohort Report */}
        <Card
          variant="outlined"
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            borderColor: 'divider',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: '#9ca3af',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            },
          }}
        >
          <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Cohort Report (Quarterly)
              </Typography>
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  bgcolor: '#f3f4f6',
                  color: '#374151',
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                Quarterly · Portrait
              </Box>
            </Box>

            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, minHeight: 40 }}>
              Quarterly cohort matrix evaluating PEP cases, completions, RIG administration, and percentage completion rates across Q1–Q4 and Annual Total.
            </Typography>

            <Divider sx={{ my: 1.5 }} />

            <Stack spacing={1.5}>
              <TextField
                select
                label="Calendar Year"
                size="small"
                fullWidth
                value={cohortYear}
                onChange={(e) => setCohortYear(Number(e.target.value))}
              >
                {[currentYear, currentYear - 1, currentYear - 2, 2024, 2023].map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </CardContent>

          <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<VisibilityOutlined />}
              disabled={loadingType !== null}
              onClick={() =>
                handlePreview('Cohort Report', 'cohort', {
                  year: cohortYear,
                })
              }
              sx={{ flex: 1 }}
            >
              Preview
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={
                loadingType === 'cohort' ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <PrintOutlined />
                )
              }
              disabled={loadingType !== null}
              onClick={() =>
                handleSilentPrint('cohort', {
                  year: cohortYear,
                })
              }
              sx={{
                flex: 1.5,
                bgcolor: '#059669',
                '&:hover': { bgcolor: '#047857' },
              }}
            >
              Print Cohort
            </Button>
          </Box>
        </Card>
      </Box>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              height: '90vh',
              maxHeight: '90vh',
              borderRadius: 2,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1.5,
            px: 2.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {previewTitle} &mdash; Print Preview
          </Typography>
          <IconButton size="small" onClick={() => setPreviewOpen(false)}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, flexGrow: 1, bgcolor: '#f8fafc' }}>
          <iframe
            id="doh-preview-iframe"
            title="DOH Report Preview"
            srcDoc={previewHtml}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#ffffff',
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setPreviewOpen(false)} color="inherit">
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintOutlined />}
            onClick={printFromPreview}
            sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
          >
            Print Form
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
