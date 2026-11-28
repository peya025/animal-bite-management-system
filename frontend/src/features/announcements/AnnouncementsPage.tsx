import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Dialog,
  DialogActions, DialogContent, DialogTitle, FormControlLabel, Paper, Stack,
  Switch, TextField, Typography,
} from '@mui/material';
import {
  Add as AddIcon, ArrowBack as ArrowBackIcon, DeleteOutlined as DeleteIcon, ExpandMore as ExpandMoreIcon,
  ImageOutlined as ImageIcon, VisibilityOutlined as VisibilityIcon,
} from '@mui/icons-material';
import axios from 'axios';
import api from '../../shared/services/api';
import type { Announcement } from './types';
import './announcements.css';

const emptyForm = { title: '', message: '', expires_on: '', is_urgent: false, is_published: false };
const editorPadding = { xs: 2, sm: 3 };
const sectionHeadingSx = { fontSize: 13, fontWeight: 700, mb: 1.5 };

export default function AnnouncementsPage({ onSaved }: { onSaved?: () => void }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
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
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
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
  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFormError('Choose a JPG, PNG, or WebP image up to 5 MB.');
      return;
    }
    setImage(file);
    setRemoveImage(false);
    setFormError('');
  };
  const closeEditor = () => {
    if (!saving) setOpen(false);
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
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true); setError(''); setSuccess('');
    try {
      await api.delete(`/announcements/${deleteTarget.id}`);
      setDeleteTarget(null);
      setExpandedId((prev) => (prev === deleteTarget.id ? null : prev));
      setSuccess('Announcement removed.');
      onSaved?.();
      await load();
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.message || 'Could not remove the announcement. Please try again.' : 'Could not remove the announcement.');
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  };
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const imageUrl = imagePreview || (!removeImage ? editing?.image_url : '') || '';
  const canSubmit = !saving && !!form.title.trim() && !!form.message.trim();
  return <Paper
    component="section"
    aria-labelledby="clinic-announcements-heading"
    elevation={0}
    sx={{
      border: '1px solid var(--border-glow, #e0eae3)',
      borderRadius: 2,
      p: { xs: 2, sm: 3 },
      bgcolor: 'var(--card-bg-solid, #fff)',
    }}
  >
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
      <Box>
        <Typography
          component="h2"
          id="clinic-announcements-heading"
          sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          Announcements{!loading && !error && ` (${items.length})`}
        </Typography>
        <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mt: 0.5 }} />
      </Box>
      <Button
        size="small"
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => start(null)}
        sx={{
          textTransform: 'none', fontWeight: 600, fontSize: '12.5px', color: '#059669', borderColor: '#10b981',
          '&:hover': { borderColor: '#059669', bgcolor: '#ecfdf5' },
        }}
      >
        Add announcement
      </Button>
    </Stack>
    <Typography sx={{ fontSize: '12.5px', color: 'text.secondary', mt: 1, mb: 2 }}>
      Share clinic updates on the public homepage.
    </Typography>

    {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
    {error && <Alert severity="error" action={<Button onClick={load}>Retry</Button>}>{error}</Alert>}
    {loading && <Typography variant="body2" role="status">Loading announcements…</Typography>}
    {!loading && !error && items.length === 0 && (
      <Typography variant="body2" color="text.secondary">No announcements yet.</Typography>
    )}
    {!loading && !error && items.map(item => {
      const isExpired = !!item.expires_on && item.expires_on < today;
      const status = isExpired ? 'Expired' : item.is_published ? 'Published' : 'Unpublished';

      return (
        <Accordion
          key={item.id}
          disableGutters
          elevation={0}
          expanded={expandedId === item.id}
          onChange={(_, expanded) => setExpandedId(expanded ? item.id : null)}
          sx={{
            border: '1px solid var(--input-border, #d7e3da)',
            borderRadius: '6px !important',
            bgcolor: 'transparent',
            mb: 0.75,
            '&:last-of-type': { mb: 0 },
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            id={`announcement-${item.id}-header`}
            aria-controls={`announcement-${item.id}-content`}
            sx={{
              minHeight: 44,
              px: 1.5,
              '& .MuiAccordionSummary-content': { my: 1, minWidth: 0, alignItems: 'center', gap: 1 },
            }}
          >
            <Typography component="span" variant="body2" sx={{ fontWeight: 500, flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
              {item.title}
            </Typography>
            <Typography component="span" variant="caption" color="text.secondary">{status}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1.5, pt: 0.5 }}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', mb: 1 }}>
              {item.message}
            </Typography>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 2, rowGap: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Posted by {item.author_name} · {new Date(item.created_at).toLocaleDateString('en-PH')}
                </Typography>
                {item.is_urgent && <Typography variant="caption" color="warning.dark">Important notice</Typography>}
                {item.expires_on && (
                  <Typography variant="caption" color="text.secondary">Expires after {item.expires_on} (Philippine time)</Typography>
                )}
              </Stack>
              {item.can_manage && (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <Button size="small" onClick={() => start(item)}>Manage</Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
                    onClick={() => setDeleteTarget(item)}
                    sx={{
                      color: '#dc2626',
                      borderColor: '#fca5a5',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        color: '#b91c1c',
                        borderColor: '#dc2626',
                        bgcolor: 'rgba(220, 38, 38, 0.08)',
                      },
                    }}
                  >
                    Remove
                  </Button>
                </Stack>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>
      );
    })}
    <Dialog
      open={open}
      onClose={closeEditor}
      fullWidth
      maxWidth="md"
      aria-labelledby="announcement-editor-title"
      aria-describedby="announcement-editor-description"
      slotProps={{ paper: { sx: { m: { xs: 1, sm: 3 }, width: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 48px)' } } } }}
    >
      <DialogTitle component="div" sx={{ px: editorPadding, py: 2, borderBottom: '1px solid var(--border-glow)' }}>
        <Typography component="h2" id="announcement-editor-title" sx={{ fontSize: { xs: 18, sm: 21 }, fontWeight: 700 }}>
          {preview ? 'Preview announcement' : editing ? 'Manage announcement' : 'Create announcement'}
        </Typography>
        <Typography id="announcement-editor-description" variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {preview ? 'How this announcement will appear on the public homepage.' : 'Post a clinic update or save it for later.'}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: editorPadding, py: 2 }}>
        {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
        {preview ? (
          <Box sx={{
            borderRadius: 2,
            overflow: 'hidden',
            '& .announcement-content': { p: editorPadding, gap: 2.5 },
            '& .announcement-content h2': { fontSize: { xs: 24, sm: 32 }, mb: 1.5 },
            '& .announcement-content p, & .announcement-urgent p': { fontSize: 14, mb: 0 },
            '& .announcement-eyebrow': { mb: 1 },
            '& .announcement-urgent': { px: editorPadding, overflowWrap: 'anywhere' },
          }}>
            {form.is_urgent && (
              <aside className="announcement-urgent">
                <strong>{'Important notice: ' + form.title}</strong>
                <p>{form.message}</p>
              </aside>
            )}
            <article className="announcement-content">
              <div className="announcement-copy">
                <span className="announcement-eyebrow">{form.is_urgent ? 'Important clinic notice' : 'Clinic announcement'}</span>
                <h2>{form.title}</h2>
                <p>{form.message}</p>
                {form.expires_on && (
                  <Box component="small" sx={{ display: 'block', mt: 1.5 }}>
                    Available through {new Date(form.expires_on + 'T00:00:00').toLocaleDateString('en-PH', { dateStyle: 'long' })}
                  </Box>
                )}
              </div>
              {imageUrl && <img src={imageUrl} alt={form.title} />}
            </article>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.6fr) minmax(0, 1fr)' }, gap: { xs: 2, md: 3 }, alignItems: 'start' }}>
            <Box component="section" aria-labelledby="announcement-content-heading">
              <Typography component="h3" id="announcement-content-heading" sx={sectionHeadingSx}>Content</Typography>
              <Stack spacing={2}>
                <TextField
                  label="Title" size="small" required disabled={saving} value={form.title}
                  onChange={event => setForm({ ...form, title: event.target.value })}
                  slotProps={{ htmlInput: { maxLength: 160 } }}
                />
                <TextField
                  label="Announcement message" size="small" required multiline minRows={4} maxRows={8} disabled={saving}
                  value={form.message} onChange={event => setForm({ ...form, message: event.target.value })}
                  helperText={`${form.message.length} / 1,500 characters`}
                  slotProps={{ htmlInput: { maxLength: 1500 }, formHelperText: { sx: { textAlign: 'right', mx: 0 } } }}
                />
                <Stack spacing={1.25} sx={{ border: '1px dashed var(--input-border)', borderRadius: 2, p: 1.5 }}>
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                    {imageUrl ? (
                      <Box component="img" src={imageUrl} alt="Selected announcement image" sx={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 1, flexShrink: 0 }} />
                    ) : <ImageIcon color="action" />}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Image (optional)</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere' }}>
                        {image?.name ?? 'JPG, PNG, or WebP · Up to 5 MB and 6000 × 6000 px'}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <input ref={fileInput} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={selectImage} />
                    <Button size="small" variant="outlined" disabled={saving} onClick={() => fileInput.current?.click()}>
                      {imageUrl ? 'Replace image' : 'Choose image'}
                    </Button>
                    {imageUrl && (
                      <Button size="small" color="error" disabled={saving} onClick={() => { setImage(null); setRemoveImage(true); }}>
                        Remove image
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Stack>
            </Box>
            <Box component="section" aria-labelledby="announcement-publishing-heading" sx={{ border: '1px solid var(--border-glow)', borderRadius: 2, p: 2 }}>
              <Typography component="h3" id="announcement-publishing-heading" sx={sectionHeadingSx}>Publishing</Typography>
              <Stack spacing={1.5}>
                <FormControlLabel
                  labelPlacement="start"
                  sx={{ m: 0, justifyContent: 'space-between', gap: 0.5 }}
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Publish on homepage</Typography>}
                  control={<Switch size="small" checked={form.is_published} disabled={saving} onChange={(_, checked) => setForm({ ...form, is_published: checked })} />}
                />
                <Box>
                  <FormControlLabel
                    labelPlacement="start"
                    sx={{ m: 0, width: '100%', justifyContent: 'space-between', gap: 0.5 }}
                    label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Important notice</Typography>}
                    control={<Switch size="small" checked={form.is_urgent} disabled={saving} onChange={(_, checked) => setForm({ ...form, is_urgent: checked })} />}
                  />
                  <Typography variant="caption" color="text.secondary">Also appears in a banner above the homepage carousel when published.</Typography>
                </Box>
                <TextField
                  label="Expiration date (optional)" type="date" size="small" fullWidth disabled={saving}
                  value={form.expires_on} onChange={event => setForm({ ...form, expires_on: event.target.value })}
                  slotProps={{ inputLabel: { shrink: true }, formHelperText: { sx: { mx: 0 } } }}
                  helperText="Visible through this date in Philippine time."
                />
              </Stack>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions disableSpacing sx={{ px: editorPadding, py: 1.5, gap: 1, borderTop: '1px solid var(--border-glow)' }}>
        <Button disabled={saving} color="inherit" onClick={closeEditor} sx={{ mr: { xs: 0, sm: 'auto' } }}>Cancel</Button>
        <Button startIcon={preview ? <ArrowBackIcon /> : <VisibilityIcon />} disabled={!canSubmit} onClick={() => setPreview(!preview)}>
          {preview ? 'Back to edit' : 'Preview'}
        </Button>
        <Button variant="contained" disabled={!canSubmit} onClick={save}>
          {saving ? 'Saving…' : form.is_published ? 'Save & publish' : 'Save unpublished'}
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog
      open={Boolean(deleteTarget)}
      onClose={() => { if (!deleting) setDeleteTarget(null); }}
      maxWidth="xs"
      fullWidth
      aria-labelledby="announcement-delete-title"
    >
      <DialogTitle id="announcement-delete-title" sx={{ fontWeight: 700, fontSize: 18 }}>
        Remove announcement?
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Are you sure you want to permanently remove <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button disabled={deleting} color="inherit" onClick={() => setDeleteTarget(null)}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={deleting}
          onClick={confirmDelete}
          sx={{
            background: '#dc2626 !important',
            backgroundColor: '#dc2626 !important',
            color: '#ffffff !important',
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: 'none',
            '&:hover': {
              background: '#b91c1c !important',
              backgroundColor: '#b91c1c !important',
            },
          }}
        >
          {deleting ? 'Removing…' : 'Remove'}
        </Button>
      </DialogActions>
    </Dialog>
  </Paper>;
}

