// @ts-nocheck
import { useState } from 'react';
import { Alert, Box, FormControl, InputLabel, MenuItem, Paper, Select, Snackbar, Stack, TextField, Typography } from '@mui/material';
import api from '../../../services/api';
import AppButton from '../../../components/button';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';

export default function UserCreatePage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'registration', password: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmCreate, setConfirmCreate] = useState(false);

  const set = (key: keyof typeof form, value: string) => {
    let cleanVal = value;
    if (key === 'phone') {
      cleanVal = value.replace(/\D/g, '').slice(0, 11);
    }
    setForm(f => ({ ...f, [key]: cleanVal }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (form.phone && form.phone.length !== 11) {
      setMessage('Phone number must be exactly 11 digits.');
      return;
    }
    setConfirmCreate(true);
  };

  const createUser = async () => {
    setSaving(true);
    try {
      await api.post('/users', form);
      setMessage('User created successfully.');
      setForm({ name: '', email: '', phone: '', role: 'registration', password: '' });
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
        <Stack spacing={2}>
          <TextField required label="Full name" value={form.name} onChange={e => set('name', e.target.value)} />
          <TextField required type="email" label="Email address" value={form.email} onChange={e => set('email', e.target.value)} />
          <TextField
            label="Phone number"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            inputProps={{ maxLength: 11, pattern: '[0-9]*' }}
          />
          <FormControl required>
            <InputLabel>Role</InputLabel>
            <Select label="Role" value={form.role} onChange={e => set('role', e.target.value)}>
              <MenuItem value="admin">Administrator</MenuItem>
              <MenuItem value="registration">Registration</MenuItem>
              <MenuItem value="triage">Triage / Doctor</MenuItem>
              <MenuItem value="treatment">Treatment</MenuItem>
            </Select>
          </FormControl>
          <TextField required type="password" helperText="At least 8 characters" label="Temporary password" value={form.password} onChange={e => set('password', e.target.value)} />
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <AppButton type="button" variant="secondary" onClick={() => window.location.href = '/users'}>Cancel</AppButton>
            <AppButton type="submit" disabled={saving}>Create user</AppButton>
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
      <Snackbar open={!!message} autoHideDuration={4000} onClose={() => setMessage('')}>
        <Alert severity={message.includes('Unable') || message.includes('must be') ? 'error' : 'success'}>{message}</Alert>
      </Snackbar>
    </Box>
  );
}
