import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import axios from 'axios';
import api from '../../shared/services/api';
import type { Announcement } from './types';
import './announcements.css';

const emptyForm = { title: '', message: '', expires_on: '', is_urgent: false, is_published: false };
export default function AnnouncementsPage({ onSaved }: { onSaved?: () => void }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try { setItems((await api.get<Announcement[]>('/announcements')).data); }
    catch { setError('Announcements could not be loaded. Please try again.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!image) { setImagePreview(''); return; }
    const url = URL.createObjectURL(image); setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  const start = (item: Announcement | null) => {
    setEditing(item); setForm(item ? { title: item.title, message: item.message, expires_on: item.expires_on || '', is_urgent: item.is_urgent, is_published: !!item.is_published } : emptyForm);
    setImage(null); setRemoveImage(false); setPreview(false); setFormError(''); setOpen(true);
  };
  const save = async () => {
    setSaving(true); setFormError(''); setSuccess('');
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : value));
    data.append('remove_image', removeImage ? '1' : '0');
    if (image) data.append('image', image);
    try {
      await api.post(editing ? `/announcements/${editing.id}` : '/announcements', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setOpen(false); setSuccess(form.is_published ? 'Announcement saved. Active posts are now visible on the homepage.' : 'Announcement saved as unpublished.');
      onSaved?.();
      await load();
    } catch (err) {
      setFormError(axios.isAxiosError(err) ? err.response?.data?.message || 'Could not save the announcement. Please try again.' : 'Could not save the announcement.');
    } finally { setSaving(false); }
  };
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const expired = (item: Announcement) => !!item.expires_on && item.expires_on < today;
  const imageUrl = imagePreview || (!removeImage ? editing?.image_url : '') || '';
  return <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 3 } }}>
    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 3 }}>
      <Box><Typography variant="h5" sx={{ fontWeight: 700 }}>Announcements</Typography><Typography color="text.secondary">Share clinic updates on the public homepage.</Typography></Box>
      <Button variant="contained" onClick={() => start(null)}>Create announcement</Button>
    </Stack>
    <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", mb: 3 }}>
      <Chip label={`${items.filter(item => item.is_published && !expired(item)).length} active`} color="success" variant="outlined" />
      <Chip label={`${items.filter(item => !item.is_published).length} unpublished`} variant="outlined" />
      <Chip label={`${items.filter(expired).length} expired`} variant="outlined" />
    </Stack>
    {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
    {error && <Alert severity="error" action={<Button onClick={load}>Retry</Button>}>{error}</Alert>}
    {loading ? <Typography role="status">Loading announcements…</Typography> : !error && items.length === 0 ? <Card variant="outlined"><CardContent><Typography variant="h6">Your first clinic update starts here</Typography><Typography color="text.secondary">Create a notice, add an optional image, and preview it before publishing.</Typography></CardContent></Card> :
      <Stack spacing={2}>{items.map(item => <Card key={item.id} variant="outlined"><CardContent>
        <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2, alignItems: "flex-start" }}>
          <Box sx={{ minWidth: 0 }}><Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>{item.title}</Typography>
            <Typography variant="body2" color="text.secondary">Posted by {item.author_name} · {new Date(item.created_at).toLocaleDateString('en-PH')}</Typography></Box>
          {item.can_manage && <Button onClick={() => start(item)}>Manage</Button>}
        </Stack>
        <Typography sx={{ my: 2, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.message}</Typography>
        <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}><Chip size="small" label={expired(item) ? 'Expired' : item.is_published ? 'Published' : 'Unpublished'} />
          {item.is_urgent && <Chip size="small" color="warning" label="Important notice" />}
          {item.expires_on && <Typography variant="caption">Expires after {item.expires_on} (Philippine time)</Typography>}
        </Stack>
      </CardContent></Card>)}</Stack>}
    <Dialog open={open} onClose={() => { if (!saving) setOpen(false); }} fullWidth maxWidth="md">
      <DialogTitle>{preview ? 'Preview announcement' : editing ? 'Manage announcement' : 'Create announcement'}</DialogTitle>
      <DialogContent>
        {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
        {preview ? <article className="announcement-content" style={{ borderRadius: 16 }}>
          <div className="announcement-copy"><span className="announcement-eyebrow">{form.is_urgent ? 'Important clinic notice' : 'Clinic announcement'}</span><h2>{form.title}</h2><p>{form.message}</p></div>
          {imageUrl && <img src={imageUrl} alt={form.title} />}
        </article> : <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} slotProps={{ htmlInput: { maxLength: 160 } }} />
          <TextField label="Announcement message" required multiline minRows={4} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} slotProps={{ htmlInput: { maxLength: 1500 } }} helperText="Include the important details in text so everyone can read them." />
          <TextField label="Expiration date (optional)" type="date" value={form.expires_on} onChange={e => setForm({ ...form, expires_on: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} helperText="Visible through this date in Philippine time, then automatically hidden." />
          <Button component="label" variant="outlined">{imageUrl ? 'Replace image' : 'Upload image (optional)'}<input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={e => {
            const file = e.target.files?.[0]; if (!file) return;
            if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setFormError('Choose a JPG, PNG, or WebP image up to 5 MB.'); return; }
            setImage(file); setRemoveImage(false); setFormError('');
          }} /></Button>
          <Typography variant="caption">JPG, PNG or WebP · Up to 5 MB and 6000 × 6000 pixels</Typography>
          {imageUrl && <Box><Box component="img" src={imageUrl} alt="Announcement preview" sx={{ maxWidth: '100%', maxHeight: 220, display: 'block' }} /><Button onClick={() => { setImage(null); setRemoveImage(true); }}>Remove image</Button></Box>}
          <FormControlLabel control={<Switch checked={form.is_urgent} onChange={(_, checked) => setForm({ ...form, is_urgent: checked })} />} label="Important notice — also show a banner above the hero" />
          <FormControlLabel control={<Switch checked={form.is_published} onChange={(_, checked) => setForm({ ...form, is_published: checked })} />} label="Publish on homepage (turn off to unpublish)" />
        </Stack>}
      </DialogContent>
      <DialogActions><Button disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
        <Button disabled={saving || !form.title.trim() || !form.message.trim()} onClick={() => setPreview(!preview)}>{preview ? 'Back to edit' : 'Preview'}</Button>
        <Button variant="contained" disabled={saving || !form.title.trim() || !form.message.trim()} onClick={save}>{saving ? 'Saving…' : form.is_published ? 'Save & publish' : 'Save unpublished'}</Button>
      </DialogActions>
    </Dialog>
  </Box>;
}

