import { useRef, useState } from 'react';
import { Box, Typography, Button, Stack, Alert } from '@mui/material';
import { CloudUploadOutlined, DeleteOutlined, HistoryEdu, Refresh } from '@mui/icons-material';
import SignatureImage from '../../../shared/components/SignatureImage';

export default function SignatureUpload({ staffName, userId, existingPath, value, removed, onChange }: {
  staffName: string;
  userId?: number;
  existingPath?: string;
  value?: string;
  removed?: boolean;
  onChange: (data: string, removed: boolean) => void;
}) {
  const [error, setError] = useState('');
  const revision = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const current = ++revision.current;
    setError('');
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setError('Choose a PNG or JPG image no larger than 2 MB.');
      return;
    }
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      if (revision.current === current) onChange(data, false);
    } catch {
      setError('Unable to read the image. Please try again.');
    }
  };

  const hasSignature = Boolean(value || (existingPath && !removed));

  return (
    <Box
      sx={{
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: 2.5,
        p: 2,
        bgcolor: 'var(--card-bg-subtle, #f8fafc)',
        transition: 'border-color 0.2s ease',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
        <HistoryEdu fontSize="small" sx={{ color: '#10b981' }} />
        <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary, #1e293b)' }}>
          Electronic Signature (Optional)
        </Typography>
      </Box>

      <Typography sx={{ fontSize: 12.5, color: 'var(--text-secondary, #64748b)', mb: 1.5, lineHeight: 1.4 }}>
        Signature for <strong>{staffName || 'this staff member'}</strong>. Upload an image supplied by them to confirm treatment records.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, gap: 1.5 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          aria-label="Upload optional signature"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <Button
          variant="outlined"
          size="small"
          startIcon={<CloudUploadOutlined />}
          onClick={() => fileInputRef.current?.click()}
          sx={{
            textTransform: 'none',
            fontFamily: "'Poppins', sans-serif",
            fontSize: 12.5,
            fontWeight: 500,
            borderRadius: 1.5,
            borderColor: '#cbd5e1',
            color: 'var(--text-primary, #334155)',
            bgcolor: '#ffffff',
            '&:hover': {
              borderColor: '#10b981',
              bgcolor: 'rgba(16, 185, 129, 0.04)',
            },
          }}
        >
          {hasSignature ? 'Change signature image' : 'Upload signature image'}
        </Button>

        <Typography sx={{ fontSize: 11.5, color: 'var(--text-muted, #94a3b8)' }}>
          PNG or JPG, up to 2 MB
        </Typography>
      </Box>

      {/* Preview Section */}
      <Box sx={{ mt: 1.5 }}>
        {value ? (
          <Box
            sx={{
              display: 'inline-flex',
              p: 1,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 2,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <img src={value} alt="New signature preview" style={{ maxWidth: 220, maxHeight: 80, objectFit: 'contain' }} />
          </Box>
        ) : existingPath && userId && !removed ? (
          <Box
            sx={{
              display: 'inline-flex',
              p: 1,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 2,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <SignatureImage endpoint={`/users/${userId}/signature?version=${encodeURIComponent(existingPath)}`} />
          </Box>
        ) : (
          <Typography sx={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
            {removed ? 'Signature will be removed for future use.' : 'No signature uploaded. You can save without one.'}
          </Typography>
        )}
      </Box>

      {/* Action buttons */}
      {hasSignature && (
        <Button
          type="button"
          size="small"
          color="error"
          startIcon={<DeleteOutlined fontSize="small" />}
          onClick={() => {
            revision.current++;
            onChange('', Boolean(existingPath));
          }}
          sx={{ mt: 1, textTransform: 'none', fontSize: 12, p: 0.5, minWidth: 0 }}
        >
          Remove signature
        </Button>
      )}

      {removed && (
        <Button
          type="button"
          size="small"
          color="primary"
          startIcon={<Refresh fontSize="small" />}
          onClick={() => onChange('', false)}
          sx={{ mt: 1, textTransform: 'none', fontSize: 12, p: 0.5, minWidth: 0 }}
        >
          Keep existing signature
        </Button>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1.5, py: 0, fontSize: 12 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
