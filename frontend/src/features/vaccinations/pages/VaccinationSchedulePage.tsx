// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, InputLabel, MenuItem, Select, Snackbar, Stack, TextField, Typography } from '@mui/material';
import { CheckCircle, EventBusy, Schedule, Vaccines } from '@mui/icons-material';
import api from '../../../services/api';
import StatCard from '../../../components/common/StatCard';
import DataTable from '../../../components/ui/DataTable';
import type { Column } from '../../../components/ui/DataTable';
import TablePager from '../../../components/data-display/TablePager';
import AppButton from '../../../components/button';

type Status = 'scheduled' | 'completed' | 'missed' | 'rescheduled' | 'cancelled';
interface Vaccination { treatment_id: number; dose_number: number; scheduled_date: string; status: Status; vaccine_brand?: string; patient: { name: string; patient_number?: string }; bite_incident?: { case_number?: string }; }
interface Stats { completed: number; pending: number; today_count: number; overdue_count: number; }
const statusColor = { scheduled: 'info', completed: 'success', missed: 'error', rescheduled: 'warning', cancelled: 'default' } as const;

export default function VaccinationSchedulePage() {
  const [records, setRecords] = useState<Vaccination[]>([]); const [stats, setStats] = useState<Stats | null>(null); const [loading, setLoading] = useState(true); const [page, setPage] = useState(0); const [status, setStatus] = useState(''); const [rows, setRows] = useState(10); const [selected, setSelected] = useState<Vaccination | null>(null); const [brand, setBrand] = useState(''); const [batch, setBatch] = useState(''); const [site, setSite] = useState(''); const [notice, setNotice] = useState('');
  const role = JSON.parse(localStorage.getItem('userData') || '{}').role; const canAdminister = role === 'admin' || role === 'treatment';
  const load = useCallback(async () => { setLoading(true); try { const [list, summary] = await Promise.all([api.get('/vaccinations', { params: status ? { status } : {} }), api.get('/vaccinations/statistics')]); setRecords(list.data.data ?? []); setStats(summary.data); } catch { setNotice('Unable to load vaccination records.'); } finally { setLoading(false); } }, [status]);
  useEffect(() => { load(); }, [load]);
  const administer = async () => { if (!selected || !brand || !batch || !site) return; try { await api.post(`/vaccinations/${selected.treatment_id}/administer`, { vaccine_brand: brand, vaccine_batch_number: batch, injection_site: site }); setSelected(null); setBrand(''); setBatch(''); setSite(''); setNotice('Vaccination recorded successfully.'); load(); } catch { setNotice('Unable to record vaccination.'); } };
  const markMissed = async (record: Vaccination) => { try { await api.post(`/vaccinations/${record.treatment_id}/missed`); setNotice('Vaccination marked as missed.'); load(); } catch { setNotice('Unable to update vaccination status.'); } };
  const columns: Column<Vaccination>[] = [
    { key: 'patient', label: 'Patient', render: r => <Box><Typography sx={{ fontWeight: 600, fontSize: 13 }}>{r.patient.name}</Typography><Typography sx={{ fontSize: 12, color: '#6b7280' }}>{r.patient.patient_number || r.bite_incident?.case_number || '—'}</Typography></Box> },
    { key: 'dose', label: 'Dose', render: r => <Typography sx={{ fontSize: 13 }}>Day {r.dose_number}</Typography> },
    { key: 'date', label: 'Scheduled date', render: r => <Typography sx={{ fontSize: 13 }}>{new Date(`${r.scheduled_date}T00:00:00`).toLocaleDateString()}</Typography> },
    { key: 'status', label: 'Status', render: r => <Chip size="small" label={r.status} color={statusColor[r.status]} sx={{ textTransform: 'capitalize' }} /> },
    { key: 'actions', label: 'Actions', align: 'right', render: r => r.status === 'scheduled' && canAdminister ? <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}><AppButton style={{ minHeight: 30, padding: '5px 10px' }} onClick={() => setSelected(r)}>Administer</AppButton><AppButton variant="danger" style={{ minHeight: 30, padding: '5px 10px' }} onClick={() => markMissed(r)}>Missed</AppButton></Stack> : <Typography sx={{ fontSize: 12, color: '#6b7280' }}>{r.vaccine_brand || '—'}</Typography> },
  ];
  const visible = records.slice(page * rows, page * rows + rows);
  return <Box sx={{ px: 3 }}><Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}><Box><Typography variant="h5" sx={{ fontWeight: 700 }}>Vaccinations</Typography><Typography variant="body2" color="text.secondary">Track scheduled doses and record vaccine administration.</Typography></Box>{canAdminister && <AppButton onClick={() => window.location.href = '/vaccinations/record'}>Record vaccination</AppButton>}</Box>
    <Grid container spacing={2} sx={{ mb: 3 }}>{([{ label: 'Scheduled', value: stats?.pending, icon: <Schedule />, color: 'info' }, { label: 'Completed', value: stats?.completed, icon: <CheckCircle />, color: 'success' }, { label: 'Due Today', value: stats?.today_count, icon: <Vaccines />, color: 'warning' }, { label: 'Overdue', value: stats?.overdue_count, icon: <EventBusy />, color: 'error' }] as const).map(s => <Grid key={s.label} size={{ xs: 6, md: 3 }}><StatCard {...s} value={s.value ?? '—'} loading={!stats} /></Grid>)}</Grid>
    <Box><Box sx={{ mb: 2, maxWidth: 250 }}><FormControl fullWidth size="small"><InputLabel>Status</InputLabel><Select label="Status" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><MenuItem value="">All statuses</MenuItem>{['scheduled', 'completed', 'missed', 'rescheduled', 'cancelled'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</Select></FormControl></Box><DataTable columns={columns} rows={visible} loading={loading} rowsPerPage={rows} getRowKey={r => r.treatment_id} emptyTitle="No vaccination records" emptySubtitle="Vaccination schedules from bite cases will appear here." /><TablePager count={records.length} page={page} rowsPerPage={rows} onPageChange={setPage} onRowsPerPageChange={setRows} /></Box>
    <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth><DialogTitle>Record vaccination</DialogTitle><DialogContent><Typography variant="body2" sx={{ mb: 2 }}>{selected?.patient.name} · Day {selected?.dose_number}</Typography><Stack spacing={2} sx={{ pt: 1 }}><TextField required label="Vaccine brand" value={brand} onChange={e => setBrand(e.target.value)} /><TextField required label="Batch number" value={batch} onChange={e => setBatch(e.target.value)} /><TextField required label="Injection site" value={site} onChange={e => setSite(e.target.value)} /></Stack></DialogContent><DialogActions><AppButton variant="secondary" onClick={() => setSelected(null)}>Cancel</AppButton><AppButton disabled={!brand || !batch || !site} onClick={administer}>Save record</AppButton></DialogActions></Dialog>
    <Snackbar open={!!notice} autoHideDuration={4000} onClose={() => setNotice('')}><Alert severity={notice.includes('Unable') ? 'error' : 'success'} onClose={() => setNotice('')}>{notice}</Alert></Snackbar></Box>;
}
