// @ts-nocheck
import { useState } from 'react';
import {
  Alert,
  Box,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import api from '../../../services/api';
import AppButton from '../../../components/button';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import { useFormDraft } from '../../../shared/hooks/useFormDraft';
import DraftStatusBadge from '../../../shared/components/DraftStatusBadge';

export default function UserCreatePage() {
  const draft = useFormDraft('create-user');

  const [form, setForm] = useState(() => {
    const saved = draft.readDraft<{ name: string; email: string; phone: string; role: string; password: string }>();
    return saved ?? { name: '', email: '', phone: '', role: 'registration', password: '' };
  });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmCreate, setConfirmCreate] = useState(false);

  // 23.1 — per-field error state (blur-first)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Tracks which fields the user has left (blurred) at least once
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const set = (key: keyof typeof form, value: string) => {
    let cleanVal = value;
    if (key === 'phone') {
      cleanVal = value.replace(/\D/g, '').slice(0, 11);
    }
    setForm(f => {
      const next = { ...f, [key]: cleanVal };
      draft.saveDraft(next);
      return next;
    });
    // 23.1 live recovery — clear error as soon as value becomes valid
    if (fieldErrors[key]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        if (key === 'name' && cleanVal.trim()) delete next.name;
        if (key === 'email' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanVal)) delete next.email;
        if (key === 'phone' && (cleanVal === '' || cleanVal.length === 11)) delete next.phone;
        if (key === 'role' && cleanVal) delete next.role;
        if (key === 'password' && cleanVal.length >= 8) delete next.password;
        return next;
      });
    }
  };

  /** 23.1 — Validate a single field on blur and show error immediately */
  const handleBlur = (key: keyof typeof form) => () => {
    setTouched(prev => ({ ...prev, [key]: true }));
    setFieldErrors(prev => {
      const next = { ...prev };
      switch (key) {
        case 'name':
          if (!form.name.trim()) next.name = 'Full name is required.';
          else delete next.name;
          break;
        case 'email':
          if (!form.email.trim()) next.email = 'Email address is required.';
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.';
          else delete next.email;
          break;
        case 'phone':
          if (form.phone && form.phone.length !== 11) next.phone = 'Phone number must be exactly 11 digits.';
          else delete next.phone;
          break;
        case 'role':
          if (!form.role) next.role = 'Please select a role.';
          else delete next.role;
          break;
        case 'password':
          if (!form.password) next.password = 'Password is required.';
          else if (form.password.length < 8) next.password = 'Password must be at least 8 characters.';
          else delete next.password;
          break;
        default:
          break;
      }
      return next;
    });
  };

  /** Validate all fields before submit */
  const validateAll = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Full name is required.';
    if (!form.email.trim()) next.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (form.phone && form.phone.length !== 11) next.phone = 'Phone number must be exactly 11 digits.';
    if (!form.role) next.role = 'Please select a role.';
    if (!form.password) next.password = 'Password is required.';
    else if (form.password.length < 8) next.password = 'Password must be at least 8 characters.';
    setFieldErrors(next);
    // Mark all fields touched so errors are visible
    setTouched({ name: true, email: true, phone: true, role: true, password: true });
    return Object.keys(next).length === 0;
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateAll()) return;
    setConfirmCreate(true);
  };

  const [createdUserName, setCreatedUserName] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const createUser = async () => {
    setSaving(true);
    try {
      await api.post('/users', form);
      const name = form.name;
      setCreatedUserName(name);
      setShowSuccessModal(true);
      setForm({ name: '', email: '', phone: '', role: 'registration', password: '' });
      draft.clearDraft();
      setFieldErrors({});
      setTouched({});
    } catch {
      setMessage('Unable to create user. Ensure all fields are valid and the email is unused.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ px: 3, maxWidth: 720 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>Add user</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Create a staff account for this clinic.
      </Typography>

      <Paper component="form" onSubmit={submit} elevation={0} sx={{ p: 3, border: '1px solid #e5e7eb', borderRadius: 3 }}>
        <Stack spacing={2.5}>

          {/* 23.2 — Row 1: Full name (left) + Email (right) */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Full name"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                onBlur={handleBlur('name')}
                error={!!fieldErrors.name}
                helperText={fieldErrors.name || ' '}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                type="email"
                label="Email address"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                onBlur={handleBlur('email')}
                error={!!fieldErrors.email}
                helperText={fieldErrors.email || ' '}
              />
            </Grid>
          </Grid>

          {/* 23.2 — Row 2: Phone (left) + Role (right) */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone number"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                onBlur={handleBlur('phone')}
                error={!!fieldErrors.phone}
                helperText={fieldErrors.phone || 'Optional — 11 digits (e.g. 09123456789)'}
                inputProps={{ maxLength: 11, pattern: '[0-9]*' }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl required fullWidth error={!!fieldErrors.role}>
                <InputLabel>Role</InputLabel>
                <Select
                  label="Role"
                  value={form.role}
                  onChange={e => set('role', e.target.value)}
                  onBlur={handleBlur('role')}
                >
                  <MenuItem value="admin">Administrator</MenuItem>
                  <MenuItem value="registration">Registration</MenuItem>
                  <MenuItem value="triage">Triage / Doctor</MenuItem>
                  <MenuItem value="treatment">Treatment</MenuItem>
                </Select>
                {fieldErrors.role && <FormHelperText>{fieldErrors.role}</FormHelperText>}
              </FormControl>
            </Grid>
          </Grid>

          {/* Row 3: Password — full width */}
          <TextField
            required
            fullWidth
            type="password"
            label="Temporary password"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            onBlur={handleBlur('password')}
            error={!!fieldErrors.password}
            helperText={fieldErrors.password || 'At least 8 characters'}
          />

          {/* 23.4 — Primary action in-line at the bottom of the form stack */}
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
            <DraftStatusBadge status={draft.status} savedAt={draft.savedAt} style={{ marginRight: 'auto' }} />
            <AppButton type="button" variant="secondary" onClick={() => window.location.href = '/users'}>
              Cancel
            </AppButton>
            <AppButton type="submit" disabled={saving}>
              Create user
            </AppButton>
          </Stack>

        </Stack>
      </Paper>

      {confirmCreate && (
        <ConfirmationDialog
          variant="confirm"
          title="Create user"
          message={<>Create an account for <strong>{form.name}</strong>?</>}
          confirmLabel="Yes, create user"
          cancelLabel="Go back"
          onConfirm={() => { setConfirmCreate(false); createUser(); }}
          onCancel={() => setConfirmCreate(false)}
        />
      )}

      {showSuccessModal && (
        <ConfirmationDialog
          variant="success"
          title="User Created Successfully"
          message={<>Account for <strong>{createdUserName || 'the user'}</strong> has been created successfully.</>}
          confirmLabel="View Users"
          cancelLabel="Add Another"
          onConfirm={() => { window.location.href = '/users'; }}
          onCancel={() => setShowSuccessModal(false)}
        />
      )}

      <Snackbar open={!!message} autoHideDuration={4000} onClose={() => setMessage('')}>
        <Alert severity={message.includes('Unable') || message.includes('must be') ? 'error' : 'success'}>
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
