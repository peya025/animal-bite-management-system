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
const currentQuarterNum = Math.ceil((new Date().getMonth() + 1) / 3);
const currentQuarter = `${currentQuarterNum}${['st', 'nd', 'rd', 'th'][currentQuarterNum - 1]}`;

const formatDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getQuarterRange = (qNum: number = currentQuarterNum, yr: number = currentYear) => {
  const startMonth = (qNum - 1) * 3;
  const start = new Date(yr, startMonth, 1);
  const end = new Date(yr, startMonth + 3, 0);
  return {
    from: formatDate(start),
    to: formatDate(end),
  };
};

interface RegistryRow {
  inclusive_dates: string;
  start_date: string;
  end_date: string;
  human_population: number;
  male: number;
  female: number;
  total: number;
  age_below_15: number;
  age_15_above: number;
  age_total: number;
  cat_1: number;
  cat_2: number;
  cat_3: number;
  cat_total: number;
  cat_percentage: string;
  no_hr: number;
  tcv: number;
  hrig: number;
  erig: number;
  dog: number;
  cat: number;
  others: number;
  animal_total: number;
  pct_tcv: string;
  pct_erig: string;
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

interface RegistryData {
  report_type: string;
  clinic: string;
  municipality: string;
  province: string;
  quarter: string;
  year: number;
  from: string;
  to: string;
  category?: string;
  data: RegistryRow[];
  totals: RegistryRow;
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

export default function DohExposureRegistryTab({ filters }: Props) {
  const defaultDates = getQuarterRange();
  const [from, setFrom] = useState(filters?.from || defaultDates.from);
  const [to, setTo] = useState(filters?.to || defaultDates.to);
  const [quarter, setQuarter] = useState(currentQuarter);
  const [year, setYear] = useState(currentYear);

  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<RegistryData | null>(null);

  // Sync with parent filters when changed
  useEffect(() => {
    if (filters?.from && filters?.to) {
      setFrom(filters.from);
      setTo(filters.to);
    }
  }, [filters?.from, filters?.to]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const activeFrom = filters?.from || from;
      const activeTo = filters?.to || to;
      const activeCategory = filters?.category || 'ALL';
      const response = await api.get<RegistryData>('/reports/exposure-registry', {
        params: {
          from: activeFrom,
          to: activeTo,
          quarter,
          year,
          category: activeCategory,
        },
      });
      setReportData(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load Rabies Exposure Registry data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [from, to, quarter, year, filters?.category, filters?.from, filters?.to]);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const activeFrom = filters?.from || from;
      const activeTo = filters?.to || to;
      const activeCategory = filters?.category || 'ALL';
      await silentPrintReport('exposure-registry', {
        from: activeFrom,
        to: activeTo,
        quarter,
        year,
        category: activeCategory,
      });
    } catch (err: any) {
      setError(err.message || 'Printing failed');
    } finally {
      setPrinting(false);
    }
  };

  const handleQuarterChange = (qVal: string) => {
    setQuarter(qVal);
    const qNum = parseInt(qVal, 10) || 1;
    const range = getQuarterRange(qNum, year);
    setFrom(range.from);
    setTo(range.to);
  };

  const handleYearChange = (yrVal: number) => {
    setYear(yrVal);
    const qNum = parseInt(quarter, 10) || 1;
    const range = getQuarterRange(qNum, yrVal);
    setFrom(range.from);
    setTo(range.to);
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* Action and Filter Bar */}
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
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            select
            size="small"
            label="Quarter"
            value={quarter}
            onChange={(e) => handleQuarterChange(e.target.value)}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="1st">1st Quarter</MenuItem>
            <MenuItem value="2nd">2nd Quarter</MenuItem>
            <MenuItem value="3rd">3rd Quarter</MenuItem>
            <MenuItem value="4th">4th Quarter</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            label="Year"
            value={year}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            sx={{ minWidth: 105 }}
          >
            {[currentYear, currentYear - 1, currentYear - 2, 2024, 2023].map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            size="small"
            type="date"
            label="From"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 145 }}
          />

          <TextField
            size="small"
            type="date"
            label="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 145 }}
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
            bgcolor: '#0284c7',
            '&:hover': { bgcolor: '#0369a1' },
            px: 2.5,
            fontWeight: 600,
            textTransform: 'none',
          }}
        >
          {printing ? 'Preparing Print...' : 'Print Registry (Landscape)'}
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
          {/* Header Block matching Image 2 & 4 */}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="body2" sx={{ textTransform: 'uppercase', color: '#475569', letterSpacing: 0.5 }}>
              Department of Health &bull; National Rabies Prevention and Control Program
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: 0.5, mt: 0.5 }}>
              RABIES EXPOSURE REGISTRY
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, fontSize: '0.85rem' }}>
            <Box>
              <strong>Name of Animal Bite Treatment Center:</strong> {reportData.clinic}
              <br />
              <span style={{ color: '#475569' }}>{reportData.municipality}, {reportData.province}</span>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <strong>QUARTER:</strong> {reportData.quarter}
              <br />
              <strong>YEAR:</strong> {reportData.year}
            </Box>
          </Box>

          {/* DOH Table */}
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
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th rowSpan={2} style={{ border: '1px solid #cbd5e1', padding: '6px 4px', minWidth: 80 }}>Inclusive Dates</th>
                  <th rowSpan={2} style={{ border: '1px solid #cbd5e1', padding: '6px 4px', minWidth: 70 }}>Human Popn</th>
                  <th rowSpan={2} style={{ border: '1px solid #cbd5e1', padding: '6px 4px' }}>Male</th>
                  <th rowSpan={2} style={{ border: '1px solid #cbd5e1', padding: '6px 4px' }}>Female</th>
                  <th rowSpan={2} style={{ border: '1px solid #cbd5e1', padding: '6px 4px', fontWeight: 800 }}>Total</th>
                  <th colSpan={3} style={{ border: '1px solid #cbd5e1', padding: '4px' }}>Age</th>
                  <th colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '4px' }}>Bite Category</th>
                  <th rowSpan={2} style={{ border: '1px solid #cbd5e1', padding: '6px 4px' }}>No. HR</th>
                  <th rowSpan={2} style={{ border: '1px solid #cbd5e1', padding: '6px 4px' }}>TCV</th>
                  <th rowSpan={2} style={{ border: '1px solid #cbd5e1', padding: '6px 4px' }}>HRIG</th>
                  <th rowSpan={2} style={{ border: '1px solid #cbd5e1', padding: '6px 4px' }}>ERIG</th>
                  <th colSpan={4} style={{ border: '1px solid #cbd5e1', padding: '4px' }}>Animal Type</th>
                  <th rowSpan={2} style={{ border: '1px solid #cbd5e1', padding: '6px 4px' }}>%TCV</th>
                  <th rowSpan={2} style={{ border: '1px solid #cbd5e1', padding: '6px 4px' }}>%ERIG</th>
                </tr>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>&lt;15</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>15&gt;</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>Total</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>Cat I</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>Cat II</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>Cat III</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>Total</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>%</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>Dog</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>Cat</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>Others</th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {reportData.data.length ? (
                  reportData.data.map((row, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px', textAlign: 'left', fontWeight: 500 }}>
                        {row.inclusive_dates}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.human_population.toLocaleString()}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.male}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.female}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px', fontWeight: 700 }}>{row.total}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.age_below_15}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.age_15_above}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.age_total}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.cat_1}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.cat_2}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.cat_3}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.cat_total}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.cat_percentage}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.no_hr}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.tcv}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.hrig}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.erig}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.dog}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.cat}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.others}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.animal_total}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.pct_tcv}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '5px 4px' }}>{row.pct_erig}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={23} style={{ border: '1px solid #cbd5e1', padding: '16px', textAlign: 'center', color: '#64748b' }}>
                      No bite cases recorded for this period.
                    </td>
                  </tr>
                )}

                {/* TOTAL ROW */}
                <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 700 }}>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px', textAlign: 'left' }}>
                    {reportData.totals.inclusive_dates}
                  </td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>
                    {reportData.totals.human_population.toLocaleString()}
                  </td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>{reportData.totals.male}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>{reportData.totals.female}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px', fontWeight: 800 }}>{reportData.totals.total}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>{reportData.totals.age_below_15}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>{reportData.totals.age_15_above}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>{reportData.totals.age_total}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>{reportData.totals.cat_1}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>{reportData.totals.cat_2}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>{reportData.totals.cat_3}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>{reportData.totals.cat_total}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>{reportData.totals.cat_percentage}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>{reportData.totals.no_hr}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>{reportData.totals.tcv}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>{reportData.totals.hrig}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>{reportData.totals.erig}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>{reportData.totals.dog}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>{reportData.totals.cat}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>{reportData.totals.others}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px' }}>{reportData.totals.animal_total}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px', fontWeight: 800 }}>{reportData.totals.pct_tcv}</td>
                  <td style={{ border: '1px solid #94a3b8', padding: '6px 4px', fontWeight: 800 }}>{reportData.totals.pct_erig}</td>
                </tr>
              </tbody>
            </table>
          </Box>
          {/* Patient Cases Breakdown Table */}
          {reportData.patient_cases && reportData.patient_cases.length > 0 && (
            <Box sx={{ mt: 3, mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>
                Matching Bite Exposure Incidents in this Reporting Period ({reportData.patient_cases.length} cases)
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

          {/* Signatures Footer */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, pt: 2, fontSize: '0.85rem' }}>
            <Box sx={{ width: '40%' }}>
              <div>Prepared by:</div>
              <Box sx={{ width: 220, borderBottom: '1px solid #000', mt: 4, mb: 0.5 }} />
              <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{reportData.prepared_by}</div>
              <div style={{ color: '#475569', fontSize: '0.8rem' }}>{reportData.prepared_designation}</div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 2 }}>Date: {reportData.date_signed}</div>
            </Box>

            <Box sx={{ width: '40%' }}>
              <div>NOTED:</div>
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
