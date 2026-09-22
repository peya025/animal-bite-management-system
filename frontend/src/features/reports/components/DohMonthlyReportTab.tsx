import { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { PrintOutlined, Refresh } from '@mui/icons-material';
import api from '../../../services/api';
import { silentPrintReport } from '../utils/silentPrint';

const currentYear = new Date().getFullYear();
const currentMonth = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

interface MonthlyRow {
  inclusive_dates: string;
  male: number;
  female: number;
  given_pep: number;
  cat_1: number;
  cat_2: number;
  cat_3: number;
  cat_total: number;
  completed_cat_1: number;
  completed_cat_2: number;
  completed_cat_3: number;
  completed_total: number;
  given_rig: number;
}

export interface PatientCase {
  case_number: string;
  patient_name: string;
  age: number | string;
  gender: string;
  bite_date: string;
  category: string;
  animal_type: string;
  animal_status: string;
  place_of_exposure: string;
  pep_given: string;
  rig_given: string;
  status: string;
}

interface MonthlyData {
  report_type: string;
  province: string;
  abtc: string;
  month: string;
  month_label: string;
  from?: string;
  to?: string;
  category?: string;
  male: number;
  female: number;
  given_pep: number;
  cat_1: number;
  cat_2: number;
  cat_3: number;
  total_cases: number;
  completed_cat_1: number;
  completed_cat_2: number;
  completed_cat_3: number;
  total_completed: number;
  given_rig: number;
  completion_rate: string;
  rows: MonthlyRow[];
  totals: MonthlyRow;
  patient_cases?: PatientCase[];
  prepared_by: string;
  prepared_designation: string;
  contact_no: string;
  noted_by: string;
  noted_designation: string;
  date_signed: string;
}

interface Props {
  filters?: { from: string; to: string; category: string };
}

export default function DohMonthlyReportTab({ filters }: Props) {
  const [month, setMonth] = useState<string>(filters?.from ? filters.from.slice(0, 7) : currentMonth);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<MonthlyData | null>(null);

  useEffect(() => {
    if (filters?.from) {
      setMonth(filters.from.slice(0, 7));
    }
  }, [filters?.from]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const activeMonth = filters?.from ? filters.from.slice(0, 7) : month;
      const response = await api.get<MonthlyData>('/reports/monthly', {
        params: {
          month: activeMonth,
          from: filters?.from,
          to: filters?.to,
          category: filters?.category || 'ALL',
        },
      });
      setReportData(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load Monthly Report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [month, filters?.from, filters?.to, filters?.category]);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const activeMonth = filters?.from ? filters.from.slice(0, 7) : month;
      await silentPrintReport('monthly', {
        month: activeMonth,
        from: filters?.from,
        to: filters?.to,
        category: filters?.category || 'ALL',
      });
    } catch (err: any) {
      setError(err.message || 'Printing failed');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* Action & Filter Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2.5,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            type="month"
            label="Month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 170 }}
          />

          <Button
            variant="outlined"
            size="small"
            startIcon={<Refresh />}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>

        <Button
          variant="contained"
          size="medium"
          startIcon={
            printing ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <PrintOutlined />
            )
          }
          disabled={loading || printing || !reportData}
          onClick={handlePrint}
          sx={{
            bgcolor: '#7c3aed',
            '&:hover': { bgcolor: '#6d28d9' },
            px: 2.5,
            fontWeight: 600,
            textTransform: 'none',
          }}
        >
          {printing ? 'Preparing Print...' : 'Print Monthly Report (Landscape)'}
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && !reportData ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : reportData ? (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: '#ffffff',
            color: '#000000',
            overflowX: 'auto',
          }}
        >
          {/* Top Banner matching Image 1 */}
          <Box
            sx={{
              bgcolor: '#c5b4e3',
              border: '2px solid #000000',
              p: 1.5,
              textAlign: 'center',
              mb: 1.5,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#000000', letterSpacing: 0.5 }}>
              National Rabies Prevention and Control Program
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#000000' }}>
              Department of Health
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, fontWeight: 700, fontSize: '0.85rem' }}>
            <div>PROVINCE: {reportData.province}</div>
            <div>ABTC: {reportData.abtc}</div>
            <div>FOR THE MONTH OF: {reportData.month_label.toUpperCase()}</div>
          </Box>

          {/* Table matching Image 1 */}
          <Box sx={{ overflowX: 'auto', mb: 3 }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.8rem',
                textAlign: 'center',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#d15fee', color: '#000000' }}>
                  <th rowSpan={2} style={{ border: '1px solid #000000', padding: '6px', minWidth: 100 }}>
                    INCLUSIVE DATES
                  </th>
                  <th colSpan={2} style={{ border: '1px solid #000000', padding: '6px' }}>
                    NO. OF CASES
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid #000000', padding: '6px', minWidth: 80 }}>
                    NO. GIVEN PEP
                  </th>
                  <th colSpan={4} style={{ border: '1px solid #000000', padding: '6px' }}>
                    NO. OF CASES CATEGORY
                  </th>
                  <th colSpan={4} style={{ border: '1px solid #000000', padding: '6px' }}>
                    NO. OF COMPLETED VACCINE CATEGORY
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid #000000', padding: '6px', minWidth: 80 }}>
                    NO GIVEN RIG
                  </th>
                </tr>
                <tr style={{ backgroundColor: '#d15fee', color: '#000000' }}>
                  <th style={{ border: '1px solid #000000', padding: '4px', minWidth: 40 }}>M</th>
                  <th style={{ border: '1px solid #000000', padding: '4px', minWidth: 40 }}>F</th>
                  <th style={{ border: '1px solid #000000', padding: '4px', minWidth: 45 }}>I</th>
                  <th style={{ border: '1px solid #000000', padding: '4px', minWidth: 45 }}>II</th>
                  <th style={{ border: '1px solid #000000', padding: '4px', minWidth: 45 }}>III</th>
                  <th style={{ border: '1px solid #000000', padding: '4px', minWidth: 50, fontWeight: 800 }}>TOTAL</th>
                  <th style={{ border: '1px solid #000000', padding: '4px', minWidth: 45 }}>I</th>
                  <th style={{ border: '1px solid #000000', padding: '4px', minWidth: 45 }}>II</th>
                  <th style={{ border: '1px solid #000000', padding: '4px', minWidth: 45 }}>III</th>
                  <th style={{ border: '1px solid #000000', padding: '4px', minWidth: 50, fontWeight: 800 }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {reportData.rows.length ? (
                  reportData.rows.map((row, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'left', fontWeight: 500 }}>
                        {row.inclusive_dates}
                      </td>
                      <td style={{ border: '1px solid #000000', padding: '6px' }}>{row.male}</td>
                      <td style={{ border: '1px solid #000000', padding: '6px' }}>{row.female}</td>
                      <td style={{ border: '1px solid #000000', padding: '6px', fontWeight: 700 }}>{row.given_pep}</td>
                      <td style={{ border: '1px solid #000000', padding: '6px' }}>{row.cat_1}</td>
                      <td style={{ border: '1px solid #000000', padding: '6px' }}>{row.cat_2}</td>
                      <td style={{ border: '1px solid #000000', padding: '6px' }}>{row.cat_3}</td>
                      <td style={{ border: '1px solid #000000', padding: '6px', fontWeight: 700 }}>{row.cat_total}</td>
                      <td style={{ border: '1px solid #000000', padding: '6px' }}>{row.completed_cat_1}</td>
                      <td style={{ border: '1px solid #000000', padding: '6px' }}>{row.completed_cat_2}</td>
                      <td style={{ border: '1px solid #000000', padding: '6px' }}>{row.completed_cat_3}</td>
                      <td style={{ border: '1px solid #000000', padding: '6px', fontWeight: 700 }}>{row.completed_total}</td>
                      <td style={{ border: '1px solid #000000', padding: '6px' }}>{row.given_rig}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={13} style={{ border: '1px solid #000000', padding: '16px', textAlign: 'center', color: '#64748b' }}>
                      No bite cases recorded for this month.
                    </td>
                  </tr>
                )}

                {/* TOTAL ROW */}
                <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 800 }}>
                  <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'left' }}>
                    {reportData.totals.inclusive_dates}
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '6px' }}>{reportData.totals.male}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px' }}>{reportData.totals.female}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px' }}>{reportData.totals.given_pep}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px' }}>{reportData.totals.cat_1}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px' }}>{reportData.totals.cat_2}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px' }}>{reportData.totals.cat_3}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px' }}>{reportData.totals.cat_total}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px' }}>{reportData.totals.completed_cat_1}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px' }}>{reportData.totals.completed_cat_2}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px' }}>{reportData.totals.completed_cat_3}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px' }}>{reportData.totals.completed_total}</td>
                  <td style={{ border: '1px solid #000000', padding: '6px' }}>{reportData.totals.given_rig}</td>
                </tr>
              </tbody>
            </table>
          </Box>

          {/* Patient Cases Breakdown Table */}
          {reportData.patient_cases && reportData.patient_cases.length > 0 && (
            <Box sx={{ mt: 3, mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>
                Matching Bite Exposure Incidents in this Monthly Reporting Period ({reportData.patient_cases.length} cases)
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 700 }}>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>Case No.</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>Patient</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>Age/Sex</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>Bite Date</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>Category</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>Animal</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>Exposure Place</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>PEP</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>RIG</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.patient_cases.map((pc, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', fontWeight: 600 }}>{pc.case_number}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>{pc.patient_name}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>{pc.age} / {pc.gender}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>{pc.bite_date}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px', fontWeight: 700 }}>Cat {pc.category}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>{pc.animal_type} ({pc.animal_status})</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>{pc.place_of_exposure}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>{pc.pep_given}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>{pc.rig_given}</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '5px 8px' }}>{pc.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Box>
          )}

          {/* Bottom Section: Prepared by, Completion Rate box, Noted by */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mt: 3, pt: 2, fontSize: '0.85rem' }}>
            <Box sx={{ width: '32%' }}>
              <div>PREPARED BY:</div>
              <Box sx={{ width: 220, borderBottom: '1px solid #000', mt: 4, mb: 0.5 }} />
              <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{reportData.prepared_by}</div>
              <div style={{ color: '#475569', fontSize: '0.8rem' }}>{reportData.prepared_designation}</div>
              <div style={{ marginTop: 6 }}>
                CONTACT NO: <strong>{reportData.contact_no}</strong>
              </div>
            </Box>

            <Box
              sx={{
                width: '32%',
                border: '1.5px solid #000',
                p: 2,
                textAlign: 'center',
                bgcolor: '#faf5ff',
                borderRadius: 1,
              }}
            >
              <div style={{ fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                COMPLETION RATE
              </div>
              <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: 6 }}>
                NO. OF COMPLETED VACCINE CATEGORY &divide; TOTAL NO. CASES CATEGORY
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6b21a8' }}>
                {reportData.completion_rate}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                ({reportData.totals.completed_total} completed / {reportData.totals.cat_total} total cases)
              </div>
            </Box>

            <Box sx={{ width: '32%', textAlign: 'left', pl: 2 }}>
              <div>NOTED BY:</div>
              <Box sx={{ width: 220, borderBottom: '1px solid #000', mt: 4, mb: 0.5 }} />
              <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{reportData.noted_by}</div>
              <div style={{ color: '#475569', fontSize: '0.8rem' }}>{reportData.noted_designation}</div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 2 }}>Date: {reportData.date_signed}</div>
            </Box>
          </Box>
        </Paper>
      ) : null}
    </Box>
  );
}
