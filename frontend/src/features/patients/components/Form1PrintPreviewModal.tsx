import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Icon } from '../../../shared/components/ui/Icon';
import type { Patient } from '../types';

interface Form1PrintPreviewModalProps {
  open: boolean;
  patient: Patient | null;
  onClose: () => void;
}

export default function Form1PrintPreviewModal({
  open,
  patient,
  onClose,
}: Form1PrintPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !patient) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('authToken') || '';
    const patientId = patient.patient_id || patient.id;
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
    
    // Normalize print endpoint to API base URL (CORS enabled)
    const printUrl = `${API_BASE}/print/patient/${patientId}/enrolment?token=${token}`;

    fetch(printUrl, {
      headers: {
        Accept: 'text/html',
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async res => {
        if (!res.ok) {
          throw new Error(`Failed to load print template (HTTP ${res.status})`);
        }
        return res.text();
      })
      .then(html => {
        if (isMounted) {
          setHtmlContent(html);
          setLoading(false);

          // Automatically trigger print dialog as soon as template finishes rendering
          setTimeout(() => {
            if (iframeRef.current && iframeRef.current.contentWindow) {
              try {
                iframeRef.current.contentWindow.focus();
                iframeRef.current.contentWindow.print();
              } catch (e) {
                console.warn('Auto-print trigger error:', e);
              }
            }
          }, 400);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.message || 'Unable to fetch print document.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, patient]);

  if (!open || !patient) return null;

  const handleManualPrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch (err) {
        console.error('Manual print trigger failed:', err);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            height: '92vh',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          },
        },
      }}
    >
      {/* ── Modal Header ── */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          px: 3,
          py: 2,
          borderBottom: '1px solid #e5e7eb',
          bgcolor: '#fafafa',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
            }}
          >
            <Icon name="print" size={20} color="#059669" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>
              Print Preview — DOH iCLINICSYS Patient Enrolment Record (Form 1)
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 12, color: '#6b7280' }}>
              Document loaded. Opening print dialog automatically…
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#6b7280' }}>
          <Icon name="trash" size={16} />
        </IconButton>
      </DialogTitle>

      {/* ── Document Preview Frame ── */}
      <DialogContent sx={{ p: 0, flex: 1, bgcolor: '#525659', position: 'relative', overflow: 'hidden' }}>
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              bgcolor: '#ffffff',
              zIndex: 10,
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={36} sx={{ color: '#059669', mb: 1.5 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                Rendering DOH Form 1 Enrolment Record & Opening Printer…
              </Typography>
            </Box>
          </Box>
        )}

        {error && (
          <Box sx={{ p: 3 }}>
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          </Box>
        )}

        {!error && (
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            title="DOH Form 1 Enrolment Record Preview"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#ffffff',
            }}
          />
        )}
      </DialogContent>

      {/* ── Modal Footer Controls ── */}
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid #e5e7eb',
          bgcolor: '#fafafa',
          justify: 'space-between',
        }}
      >
        <Typography variant="body2" sx={{ fontSize: 12, color: '#6b7280' }}>
          Patient: <strong>{patient.last_name}, {patient.first_name}</strong> (#{patient.patient_number || patient.patient_id})
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            onClick={onClose}
            sx={{
              color: '#374151',
              borderColor: '#d1d5db',
              textTransform: 'none',
              fontWeight: 600,
              px: 2.5,
            }}
            variant="outlined"
          >
            Close Preview
          </Button>

          <Button
            onClick={handleManualPrint}
            variant="contained"
            disabled={loading || !!error}
            startIcon={<Icon name="print" size={16} color="#ffffff" />}
            sx={{
              bgcolor: '#059669',
              fontWeight: 600,
              textTransform: 'none',
              px: 3,
              '&:hover': { bgcolor: '#047857' },
            }}
          >
            Re-print Document
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
