import { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { PrintOutlined, Refresh } from '@mui/icons-material';
import api from '../../../services/api';
import { silentPrintReport } from '../utils/silentPrint';

const currentYear = new Date().getFullYear();

interface CategoryData {
  cases: number;
  given_pep: number;
  completed: number;
  given_rig: number;
  completion_rate: string;
}

interface QuarterGroup {
  cat_I: CategoryData;
  cat_II: CategoryData;
  cat_III: CategoryData;
  total: CategoryData;
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

interface CohortData {
  report_type: string;
  province: string;
  abtc: string;
  year: number;
  category?: string;
  quarters: {
    q1: QuarterGroup;
    q2: QuarterGroup;
    q3: QuarterGroup;
    q4: QuarterGroup;
    annual: QuarterGroup;
  };
  patient_cases?: PatientCase[];
  prepared_by: string;
  prepared_designation: string;
  noted_by: string;
  noted_designation: string;
  date_signed: string;
}

interface Props {
  filters?: { from: string; to: string; category: string };
}

export default function DohCohortReportTab({ filters }: Props) {
  const [year, setYear] = useState<number>(filters?.from ? Number(filters.from.slice(0, 4)) : currentYear);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<CohortData | null>(null);

  useEffect(() => {
    if (filters?.from) {
      const parsedYear = Number(filters.from.slice(0, 4));
      if (!isNaN(parsedYear) && parsedYear > 2000) {
        setYear(parsedYear);
      }
    }
  }, [filters?.from]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<CohortData>('/reports/cohort', {
        params: {
          year,
          category: filters?.category || 'ALL',
        },
      });
      setReportData(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load Cohort Report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year, filters?.category]);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      await silentPrintReport('cohort', {
        year,
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
            select
            size="small"
            label="Calendar Year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            sx={{ minWidth: 140 }}
          >
            {[currentYear, currentYear - 1, currentYear - 2, 2024, 2023].map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>

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
            bgcolor: '#059669',
            '&:hover': { bgcolor: '#047857' },
            px: 2.5,
            fontWeight: 600,
            textTransform: 'none',
          }}
        >
          {printing ? 'Preparing Print...' : 'Print Cohort Report (Portrait)'}
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
          {/* Metadata Block matching Image 3 */}
          <Box sx={{ mb: 2, fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.6 }}>
            <div>PROVINCE:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{reportData.province}</div>
            <div>ABTC:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{reportData.abtc}</div>
            <div>YEAR:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{reportData.year}</div>
          </Box>

          {/* Matrix Table matching Image 3 */}
          <Box sx={{ overflowX: 'auto', mb: 3 }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.75rem',
                textAlign: 'center',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 800 }}>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', minWidth: 120 }}>
                    INDICATORS
                  </th>
                  <th colSpan={4} style={{ border: '1px solid #000', padding: '6px' }}>1ST QUARTER</th>
                  <th colSpan={4} style={{ border: '1px solid #000', padding: '6px' }}>2ND QUARTER</th>
                  <th colSpan={4} style={{ border: '1px solid #000', padding: '6px' }}>3RD QUARTER</th>
                  <th colSpan={4} style={{ border: '1px solid #000', padding: '6px' }}>4TH QUARTER</th>
                  <th colSpan={4} style={{ border: '1px solid #000', padding: '6px' }}>TOTAL</th>
                </tr>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  {/* Q1 */}
                  <th style={{ border: '1px solid #000', padding: '4px' }}>CAT 1</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>CAT 2</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>CAT 3</th>
                  <th style={{ border: '1px solid #000', padding: '4px', fontWeight: 800 }}>TOTAL</th>
                  {/* Q2 */}
                  <th style={{ border: '1px solid #000', padding: '4px' }}>CAT 1</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>CAT 2</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>CAT 3</th>
                  <th style={{ border: '1px solid #000', padding: '4px', fontWeight: 800 }}>TOTAL</th>
                  {/* Q3 */}
                  <th style={{ border: '1px solid #000', padding: '4px' }}>CAT 1</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>CAT 2</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>CAT 3</th>
                  <th style={{ border: '1px solid #000', padding: '4px', fontWeight: 800 }}>TOTAL</th>
                  {/* Q4 */}
                  <th style={{ border: '1px solid #000', padding: '4px' }}>CAT 1</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>CAT 2</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>CAT 3</th>
                  <th style={{ border: '1px solid #000', padding: '4px', fontWeight: 800 }}>TOTAL</th>
                  {/* TOTAL */}
                  <th style={{ border: '1px solid #000', padding: '4px' }}>CAT 1</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>CAT 2</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>CAT 3</th>
                  <th style={{ border: '1px solid #000', padding: '4px', fontWeight: 800 }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. NO. OF CASES */}
                <tr>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', fontWeight: 700, backgroundColor: '#fafafa' }}>
                    NO. OF CASES
                  </td>
                  {/* Q1 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q1.cat_I.cases}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q1.cat_II.cases}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q1.cat_III.cases}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.q1.total.cases}</td>
                  {/* Q2 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q2.cat_I.cases}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q2.cat_II.cases}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q2.cat_III.cases}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.q2.total.cases}</td>
                  {/* Q3 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q3.cat_I.cases}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q3.cat_II.cases}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q3.cat_III.cases}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.q3.total.cases}</td>
                  {/* Q4 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q4.cat_I.cases}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q4.cat_II.cases}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q4.cat_III.cases}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.q4.total.cases}</td>
                  {/* TOTAL */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.annual.cat_I.cases}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.annual.cat_II.cases}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.annual.cat_III.cases}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.annual.total.cases}</td>
                </tr>

                {/* 2. NO. GIVEN PEP */}
                <tr>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', fontWeight: 700, backgroundColor: '#fafafa' }}>
                    NO. GIVEN PEP
                  </td>
                  {/* Q1 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q1.cat_I.given_pep}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q1.cat_II.given_pep}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q1.cat_III.given_pep}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.q1.total.given_pep}</td>
                  {/* Q2 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q2.cat_I.given_pep}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q2.cat_II.given_pep}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q2.cat_III.given_pep}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.q2.total.given_pep}</td>
                  {/* Q3 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q3.cat_I.given_pep}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q3.cat_II.given_pep}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q3.cat_III.given_pep}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.q3.total.given_pep}</td>
                  {/* Q4 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q4.cat_I.given_pep}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q4.cat_II.given_pep}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q4.cat_III.given_pep}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.q4.total.given_pep}</td>
                  {/* TOTAL */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.annual.cat_I.given_pep}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.annual.cat_II.given_pep}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.annual.cat_III.given_pep}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.annual.total.given_pep}</td>
                </tr>

                {/* 3. NO. COMPLETED */}
                <tr>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', fontWeight: 700, backgroundColor: '#fafafa' }}>
                    NO. COMPLETED
                  </td>
                  {/* Q1 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q1.cat_I.completed}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q1.cat_II.completed}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q1.cat_III.completed}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.q1.total.completed}</td>
                  {/* Q2 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q2.cat_I.completed}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q2.cat_II.completed}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q2.cat_III.completed}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.q2.total.completed}</td>
                  {/* Q3 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q3.cat_I.completed}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q3.cat_II.completed}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q3.cat_III.completed}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.q3.total.completed}</td>
                  {/* Q4 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q4.cat_I.completed}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q4.cat_II.completed}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q4.cat_III.completed}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.q4.total.completed}</td>
                  {/* TOTAL */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.annual.cat_I.completed}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.annual.cat_II.completed}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.annual.cat_III.completed}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.annual.total.completed}</td>
                </tr>

                {/* 4. NO. GIVEN RIG */}
                <tr>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', fontWeight: 700, backgroundColor: '#fafafa' }}>
                    NO. GIVEN RIG
                  </td>
                  {/* Q1 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q1.cat_I.given_rig}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q1.cat_II.given_rig}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q1.cat_III.given_rig}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.q1.total.given_rig}</td>
                  {/* Q2 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q2.cat_I.given_rig}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q2.cat_II.given_rig}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q2.cat_III.given_rig}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.q2.total.given_rig}</td>
                  {/* Q3 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q3.cat_I.given_rig}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q3.cat_II.given_rig}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q3.cat_III.given_rig}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.q3.total.given_rig}</td>
                  {/* Q4 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q4.cat_I.given_rig}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q4.cat_II.given_rig}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q4.cat_III.given_rig}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.q4.total.given_rig}</td>
                  {/* TOTAL */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.annual.cat_I.given_rig}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.annual.cat_II.given_rig}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.annual.cat_III.given_rig}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 800 }}>{reportData.quarters.annual.total.given_rig}</td>
                </tr>

                {/* 5. COMPLETION RATE (Yellow row matching Image 3) */}
                <tr style={{ backgroundColor: '#fef08a', fontWeight: 800 }}>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', fontWeight: 800 }}>
                    COMPLETION RATE
                  </td>
                  {/* Q1 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q1.cat_I.completion_rate}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q1.cat_II.completion_rate}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q1.cat_III.completion_rate}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q1.total.completion_rate}</td>
                  {/* Q2 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q2.cat_I.completion_rate}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q2.cat_II.completion_rate}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q2.cat_III.completion_rate}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q2.total.completion_rate}</td>
                  {/* Q3 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q3.cat_I.completion_rate}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q3.cat_II.completion_rate}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q3.cat_III.completion_rate}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q3.total.completion_rate}</td>
                  {/* Q4 */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q4.cat_I.completion_rate}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q4.cat_II.completion_rate}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q4.cat_III.completion_rate}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.q4.total.completion_rate}</td>
                  {/* TOTAL */}
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.annual.cat_I.completion_rate}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.annual.cat_II.completion_rate}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.annual.cat_III.completion_rate}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{reportData.quarters.annual.total.completion_rate}</td>
                </tr>
              </tbody>
            </table>
          </Box>

          {/* Patient Cases Breakdown Table */}
          {reportData.patient_cases && reportData.patient_cases.length > 0 && (
            <Box sx={{ mt: 3, mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>
                Matching Bite Exposure Cases in Calendar Year {reportData.year} ({reportData.patient_cases.length} cases)
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

          {/* Signatures matching Image 3 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, pt: 2, fontSize: '0.85rem' }}>
            <Box sx={{ width: '40%' }}>
              <div>Prepared by:</div>
              <div style={{ color: '#475569', fontSize: '0.8rem', marginTop: 4 }}>Name and Signature:</div>
              <Box sx={{ width: 220, borderBottom: '1px solid #000', mt: 3.5, mb: 0.5 }} />
              <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{reportData.prepared_by}</div>
              <div style={{ color: '#475569', fontSize: '0.8rem' }}>{reportData.prepared_designation}</div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 2 }}>Date: {reportData.date_signed}</div>
            </Box>

            <Box sx={{ width: '40%' }}>
              <div>NOTED:</div>
              <div style={{ color: '#475569', fontSize: '0.8rem', marginTop: 4 }}>Name and Signature:</div>
              <Box sx={{ width: 220, borderBottom: '1px solid #000', mt: 3.5, mb: 0.5 }} />
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
