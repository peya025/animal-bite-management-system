// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/config/routes';
import { Alert, Box, Divider, Paper, Snackbar, Stack, TextField, Typography } from '@mui/material';
import api from '../../../services/api';
import AppButton from '../../../components/button';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import { useFormDraft } from '../../../shared/hooks/useFormDraft';
import DraftStatusBadge from '../../../shared/components/DraftStatusBadge';

export default function UserProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Draft persists name + phone changes. We intentionally never persist
  // password fields to avoid writing credentials to localStorage.
  const draft = useFormDraft('user-profile');

  const [form, setForm] = useState({ name: '', email: '', phone: '', current_password: '', password: '', password_confirmation: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);

  useEffect(() => {
    api.get('/me')
      .then(({ data }) => {
        const serverData = { name: data.name || '', email: data.email || '', phone: data.phone || '' };
        // Restore draft for name + phone only (not email which comes from server)
        const saved = draft.readDraft<{ name: string; phone: string }>();
        setForm(f => ({
          ...f,
          ...serverData,
          ...(saved ? { name: saved.name ?? serverData.name, phone: saved.phone ?? serverData.phone } : {}),
        }));
      })
      .catch(() => setMessage('Unable to load your profile.'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key: keyof typeof form, value: string) => {
    let cleanVal = value;
    if (key === 'phone') {
      cleanVal = value.replace(/\D/g, '').slice(0, 11);
    }
    setForm(f => {
      const next = { ...f, [key]: cleanVal };
      // Only draft non-sensitive fields
      if (key !== 'current_password' && key !== 'password' && key !== 'password_confirmation') {
        draft.saveDraft({ name: next.name, phone: next.phone });
      }
      return next;
    });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (form.phone && form.phone.length !== 11) {
      setMessage('Phone number must be exactly 11 digits.');
      return;
    }
    setConfirmSave(true);
  };

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { name, phone, current_password, password, password_confirmation } = form;
      const { data } = await api.put('/me', { name, phone, ...(password ? { current_password, password, password_confirmation } : {}) });
      localStorage.setItem('userData', JSON.stringify(data.user));
      setForm(f => ({ ...f, current_password: '', password: '', password_confirmation: '' }));
      draft.clearDraft();
      setShowSuccessModal(true);
    } catch {
      setMessage('Unable to update profile. Check your current password and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ px: 3, maxWidth: 720 }}>
      {user?.role === 'treatment' ? (
        <Box sx={{ mb: 3 }}>
          <Typography
            component="h1"
            sx={{
              fontFamily: 'Poppins',
              fontSize: '24px',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              color: 'var(--text-h, #111827)',
              mb: 0.5,
            }}
          >
            My Profile
          </Typography>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '8px',
              fontFamily: 'Poppins',
              fontSize: '13px',
            }}
          >
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#3b82f6',
                fontFamily: 'Poppins',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Dashboard
            </button>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>My Profile</span>
          </div>
        </Box>
      ) : (
        <>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>My profile</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Update your contact details and password.
          </Typography>
        </>
      )}
      <Paper component="form" onSubmit={submit} elevation={0} sx={{ p: 3, border: '1px solid #e5e7eb', borderRadius: 3 }}>
        <Stack spacing={2}>
          <TextField required label="Full name" value={form.name} onChange={e => set('name', e.target.value)} />
          <TextField disabled label="Email address" value={form.email} />
          <TextField
            label="Phone number"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            inputProps={{ maxLength: 11, pattern: '[0-9]*' }}
          />
          <Divider sx={{ my: 1 }}>
            <Typography sx={{ fontSize: 12, color: '#6b7280' }}>CHANGE PASSWORD (OPTIONAL)</Typography>
          </Divider>
          <TextField type="password" label="Current password" value={form.current_password} onChange={e => set('current_password', e.target.value)} />
          <TextField type="password" label="New password" helperText="At least 8 characters" value={form.password} onChange={e => set('password', e.target.value)} />
          <TextField type="password" label="Confirm new password" value={form.password_confirmation} onChange={e => set('password_confirmation', e.target.value)} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5 }}>
            <DraftStatusBadge status={draft.status} savedAt={draft.savedAt} style={{ marginRight: 'auto' }} />
            <AppButton type="submit" disabled={saving}>Save profile</AppButton>
          </Box>
        </Stack>
      </Paper>
      {confirmSave && (
        <ConfirmationDialog
          variant="confirm"
          title="Save profile"
          message="Save the changes to your profile?"
          confirmLabel="Yes, save changes"
          cancelLabel="Go back"
          onConfirm={() => { setConfirmSave(false); saveProfile(); }}
          onCancel={() => setConfirmSave(false)}
        />
      )}
      {showSuccessModal && (
        <ConfirmationDialog
          variant="success"
          title="Profile Updated Successfully"
          message="Your profile details and credentials have been updated."
          confirmLabel="Done"
          hideCancel
          onConfirm={() => setShowSuccessModal(false)}
        />
      )}
      <Snackbar open={!!message} autoHideDuration={4000} onClose={() => setMessage('')}>
        <Alert severity={message.includes('Unable') || message.includes('must be') ? 'error' : 'success'}>{message}</Alert>
      </Snackbar>
    </Box>
  );
}
