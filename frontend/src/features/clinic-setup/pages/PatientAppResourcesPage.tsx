import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  AccountBalanceOutlined as BuildingIcon,
  DeleteOutlined as DeleteIcon,
  EditOutlined as EditIcon,
  Language as GlobeIcon,
  Link as LinkIcon,
  OpenInNew as ExternalLinkIcon,
  PlayArrowRounded as PlayIcon,
  Refresh as RefreshIcon,
  VideocamOutlined as VideoIcon,
} from '@mui/icons-material';
import api from '../../../services/api';
import { ROUTES } from '../../../shared/config/routes';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';

export type ResourceType = 'video' | 'link';

export interface ClinicResourceItem {
  id: number;
  clinic_id: number;
  type: ResourceType;
  title: string;
  subtitle: string | null;
  url: string;
  thumbnail_url: string | null;
  duration_label: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ResourceFormState {
  type: ResourceType;
  title: string;
  subtitle: string;
  url: string;
  thumbnail_url: string;
  duration_label: string;
  sort_order: number;
  is_active: boolean;
}

const INITIAL_FORM_STATE: ResourceFormState = {
  type: 'video',
  title: '',
  subtitle: '',
  url: '',
  thumbnail_url: '',
  duration_label: '',
  sort_order: 0,
  is_active: true,
};

function isValidHttpsUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith('https://')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname) && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.trim());
    return parsed.hostname || 'example.com';
  } catch {
    return 'example.com';
  }
}

function resolveVideoThumbnail(url: string, thumbnailUrl?: string | null): string | null {
  const custom = (thumbnailUrl ?? '').trim();
  if (custom && isValidHttpsUrl(custom)) {
    return custom;
  }

  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();
    let videoId: string | null = null;

    if (host === 'youtu.be' || host === 'www.youtu.be') {
      const seg = parsed.pathname.split('/').filter(Boolean)[0];
      if (seg) videoId = seg;
    } else if (host.endsWith('youtube.com')) {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v');
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/')[2] || null;
      }
    }

    if (videoId && /^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
  } catch {
    // Ignore parse error and fall back to gradient
  }

  return null;
}

function validateForm(form: ResourceFormState): Partial<Record<keyof ResourceFormState, string>> {
  const errors: Partial<Record<keyof ResourceFormState, string>> = {};

  if (form.type !== 'video' && form.type !== 'link') {
    errors.type = 'Resource type must be video or link.';
  }

  const trimmedTitle = form.title.trim();
  if (!trimmedTitle) {
    errors.title = 'Title is required.';
  } else if (trimmedTitle.length > 120) {
    errors.title = 'Title must not exceed 120 characters.';
  }

  if (form.subtitle.trim().length > 160) {
    errors.subtitle = 'Subtitle must not exceed 160 characters.';
  }

  const trimmedUrl = form.url.trim();
  if (!trimmedUrl) {
    errors.url = 'URL is required.';
  } else if (trimmedUrl.length > 500) {
    errors.url = 'URL must not exceed 500 characters.';
  } else if (!isValidHttpsUrl(trimmedUrl)) {
    errors.url = 'Enter a valid URL starting with https:// (http:// is not allowed).';
  }

  const trimmedThumb = form.thumbnail_url.trim();
  if (trimmedThumb) {
    if (trimmedThumb.length > 500) {
      errors.thumbnail_url = 'Thumbnail URL must not exceed 500 characters.';
    } else if (!isValidHttpsUrl(trimmedThumb)) {
      errors.thumbnail_url = 'Thumbnail URL must be a valid https:// address.';
    }
  }

  const trimmedDuration = form.duration_label.trim();
  if (trimmedDuration) {
    if (trimmedDuration.length > 10 || !/^\d{1,2}:[0-5]\d$/.test(trimmedDuration)) {
      errors.duration_label = 'Duration must be in m:ss or mm:ss format (for example, 3:45).';
    }
  }

  if (Number.isNaN(Number(form.sort_order)) || form.sort_order < 0 || form.sort_order > 65535) {
    errors.sort_order = 'Sort order must be between 0 and 65535.';
  }

  return errors;
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#ffffff',
    fontSize: '13.5px',
    borderRadius: '10px',
    '& fieldset': {
      borderColor: '#e5e7eb',
      borderWidth: '1px',
    },
    '&:hover fieldset': {
      borderColor: '#9ca3af',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#1D9E75',
      borderWidth: '1.5px',
    },
  },
  '& input:user-invalid': {
    borderColor: '#dc2626',
  },
};

function MobileCardLivePreview({ form }: { form: ResourceFormState }) {
  const previewTitle = form.title.trim() || (form.type === 'video' ? 'Orientation video title' : 'Official DOH resource link');
  const previewSubtitle = form.subtitle.trim() || 'Short description shown under the title';
  const previewDuration = form.duration_label.trim();
  const previewDomain = form.url.trim() ? extractDomain(form.url) : 'doh.gov.ph';
  const resolvedThumb = useMemo(
    () => (form.type === 'video' ? resolveVideoThumbnail(form.url, form.thumbnail_url) : null),
    [form.type, form.url, form.thumbnail_url]
  );
  const [thumbFailed, setThumbFailed] = useState(false);

  useEffect(() => {
    setThumbFailed(false);
  }, [resolvedThumb]);

  if (form.type === 'video') {
    const showImage = Boolean(resolvedThumb && !thumbFailed);
    return (
      <Box
        sx={{
          bgcolor: '#ffffff',
          borderRadius: '16px',
          border: '0.5px solid #e5e7eb',
          overflow: 'hidden',
          maxWidth: 360,
          mx: 'auto',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            height: 150,
            background: 'linear-gradient(135deg, #1D9E75 0%, #5cc7a5 100%)',
            overflow: 'hidden',
          }}
        >
          {/* Decorative depth circles on fallback gradient */}
          <Box
            sx={{
              position: 'absolute',
              width: 140,
              height: 140,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.10)',
              top: -36,
              right: -28,
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              width: 96,
              height: 96,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.08)',
              bottom: -24,
              left: -18,
            }}
          />

          {showImage && (
            <Box
              component="img"
              src={resolvedThumb!}
              alt=""
              onError={() => setThumbFailed(true)}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}

          {/* Top-left orientation video tag */}
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.6,
              px: 1.25,
              py: 0.4,
              borderRadius: '20px',
              bgcolor: 'rgba(0,0,0,0.28)',
              color: '#ffffff',
            }}
          >
            <VideoIcon sx={{ fontSize: 14, color: '#ffffff' }} />
            <Typography sx={{ fontSize: '11px', fontWeight: 500, color: '#ffffff', lineHeight: 1.2 }}>
              Orientation video
            </Typography>
          </Box>

          {/* Center play button */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 52,
              height: 52,
              borderRadius: '50%',
              bgcolor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.16)',
            }}
          >
            <PlayIcon sx={{ fontSize: 28, color: '#1D9E75' }} />
          </Box>

          {/* Bottom-right duration chip */}
          {previewDuration && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 10,
                right: 10,
                px: 1,
                py: 0.25,
                borderRadius: '6px',
                bgcolor: 'rgba(0,0,0,0.45)',
                color: '#ffffff',
              }}
            >
              <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#ffffff', lineHeight: 1.3 }}>
                {previewDuration}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Body */}
        <Box
          sx={{
            px: '14px',
            py: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#111827',
                lineHeight: 1.35,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {previewTitle}
            </Typography>
            {previewSubtitle && (
              <Typography
                sx={{
                  fontSize: '11px',
                  color: '#9ca3af',
                  mt: 0.25,
                  lineHeight: 1.35,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {previewSubtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '8px',
              bgcolor: '#e1f5ee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ExternalLinkIcon sx={{ fontSize: 16, color: '#1D9E75' }} />
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        bgcolor: '#ffffff',
        borderRadius: '14px',
        border: '0.5px solid #e5e7eb',
        px: '14px',
        py: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        maxWidth: 360,
        mx: 'auto',
      }}
    >
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: '11px',
          bgcolor: '#eff6ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <BuildingIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#111827',
            lineHeight: 1.35,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {previewTitle}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.35 }}>
          <GlobeIcon sx={{ fontSize: 12, color: '#9ca3af' }} />
          <Typography
            sx={{
              fontSize: '11px',
              color: '#9ca3af',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {previewDomain}
          </Typography>
        </Box>
      </Box>
      <ExternalLinkIcon sx={{ fontSize: 16, color: '#9ca3af', flexShrink: 0 }} />
    </Box>
  );
}

export default function PatientAppResourcesPage() {
  const [resources, setResources] = useState<ClinicResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClinicResourceItem | null>(null);
  const [form, setForm] = useState<ResourceFormState>(INITIAL_FORM_STATE);
  const [touched, setTouched] = useState<Partial<Record<keyof ResourceFormState, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ClinicResourceItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const validationErrors = useMemo(() => validateForm(form), [form]);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/setup/clinic-resources');
      const items: ClinicResourceItem[] = Array.isArray(response.data?.data) ? response.data.data : [];
      setResources(items);
    } catch {
      setSnackbar({
        open: true,
        message: 'Unable to load patient app resources.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchResources();
  }, [fetchResources]);

  const handleOpenCreate = () => {
    const nextOrder =
      resources.length > 0 ? Math.max(...resources.map((r) => Number(r.sort_order) || 0)) + 1 : 0;
    setEditingItem(null);
    setForm({
      ...INITIAL_FORM_STATE,
      sort_order: nextOrder,
    });
    setTouched({});
    setSubmitAttempted(false);
    setServerError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: ClinicResourceItem) => {
    setEditingItem(item);
    setForm({
      type: item.type,
      title: item.title ?? '',
      subtitle: item.subtitle ?? '',
      url: item.url ?? '',
      thumbnail_url: item.thumbnail_url ?? '',
      duration_label: item.duration_label ?? '',
      sort_order: Number(item.sort_order) || 0,
      is_active: Boolean(item.is_active),
    });
    setTouched({});
    setSubmitAttempted(false);
    setServerError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const markTouched = (field: keyof ResourceFormState) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const showFieldError = (field: keyof ResourceFormState): string | undefined => {
    if (!touched[field] && !submitAttempted) return undefined;
    return validationErrors[field];
  };

  const handleSave = async () => {
    setSubmitAttempted(true);
    setServerError(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type: form.type,
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        url: form.url.trim(),
        thumbnail_url: form.type === 'video' ? form.thumbnail_url.trim() || null : null,
        duration_label: form.type === 'video' ? form.duration_label.trim() || null : null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      };

      if (editingItem) {
        await api.put(`/setup/clinic-resources/${editingItem.id}`, payload);
        setSnackbar({
          open: true,
          message: 'Resource updated.',
          severity: 'success',
        });
      } else {
        await api.post('/setup/clinic-resources', payload);
        setSnackbar({
          open: true,
          message: 'Resource added.',
          severity: 'success',
        });
      }

      setDialogOpen(false);
      await fetchResources();
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ||
        Object.values(err?.response?.data?.errors || {})
          .flat()
          .join(' ') ||
        'Unable to save resource. Please check the fields and try again.';
      setServerError(String(apiMessage));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: ClinicResourceItem) => {
    const nextActive = !item.is_active;
    setResources((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, is_active: nextActive } : row))
    );

    try {
      await api.patch(`/setup/clinic-resources/${item.id}`, {
        is_active: nextActive,
      });
      setSnackbar({
        open: true,
        message: nextActive ? 'Resource enabled on patient Home screen.' : 'Resource hidden from patient Home screen.',
        severity: 'success',
      });
    } catch {
      setResources((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, is_active: item.is_active } : row))
      );
      setSnackbar({
        open: true,
        message: 'Failed to update active status.',
        severity: 'error',
      });
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= resources.length || reordering) return;

    const updated = [...resources];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    const normalized = updated.map((item, idx) => ({
      ...item,
      sort_order: idx,
    }));

    setResources(normalized);
    setReordering(true);

    try {
      const response = await api.put('/setup/clinic-resources/reorder', {
        ordered_ids: normalized.map((item) => item.id),
      });
      if (Array.isArray(response.data?.data)) {
        setResources(response.data.data);
      }
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to save sort order.',
        severity: 'error',
      });
      await fetchResources();
    } finally {
      setReordering(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/setup/clinic-resources/${deleteTarget.id}`);
      setSnackbar({
        open: true,
        message: 'Resource deleted.',
        severity: 'success',
      });
      setDeleteTarget(null);
      await fetchResources();
    } catch {
      setSnackbar({
        open: true,
        message: 'Unable to delete resource.',
        severity: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ px: { xs: 1, sm: 3 }, pb: 5, maxWidth: 1240, mx: 'auto' }}>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography component="h1" sx={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>
            Patient app resources
          </Typography>
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 0.25 }}>
            <Box
              component={RouterLink}
              to={ROUTES.DASHBOARD}
              sx={{ color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}
            >
              Dashboard
            </Box>
            {' / Clinic Setup / Patient app resources'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon sx={{ fontSize: 17 }} />}
            onClick={() => void fetchResources()}
            disabled={loading}
            sx={{
              textTransform: 'none',
              borderColor: '#e5e7eb',
              color: '#374151',
              borderRadius: '10px',
              px: 1.75,
              py: 0.8,
              fontWeight: 500,
              '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' },
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={handleOpenCreate}
            sx={{
              textTransform: 'none',
              bgcolor: '#1D9E75',
              color: '#ffffff',
              borderRadius: '10px',
              px: 2,
              py: 0.85,
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': { bgcolor: '#17825f', boxShadow: 'none' },
            }}
          >
            Add resource
          </Button>
        </Box>
      </Box>

      {/* Main Card */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: '#ffffff',
          border: '0.5px solid #e5e7eb',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: '0.5px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box>
            <Typography id="patient-resources-table-caption" sx={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
              Learn more section links
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#6b7280', mt: 0.25 }}>
              Configure orientation videos and official DOH reference links shown below the Bite care guide on the patient Home screen.
            </Typography>
          </Box>
          <Chip
            size="small"
            label={`${resources.filter((r) => r.is_active).length} active`}
            sx={{
              bgcolor: '#e1f5ee',
              color: '#1D9E75',
              fontWeight: 600,
              fontSize: '11.5px',
              height: 24,
            }}
          />
        </Box>

        {loading ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={22} sx={{ color: '#1D9E75' }} />
            <Typography sx={{ fontSize: 13, color: '#6b7280' }}>Loading resources...</Typography>
          </Box>
        ) : resources.length === 0 ? (
          <Box sx={{ py: 6, px: 3, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
              No patient resources configured
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#6b7280', mt: 0.5, maxWidth: 440, mx: 'auto' }}>
              When no active resources exist, the Learn more section is automatically hidden on the patient Home screen without leaving an empty gap.
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              sx={{
                mt: 2,
                textTransform: 'none',
                bgcolor: '#1D9E75',
                borderRadius: '10px',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#17825f', boxShadow: 'none' },
              }}
            >
              Add first resource
            </Button>
          </Box>
        ) : (
          <Box
            tabIndex={0}
            role="region"
            aria-labelledby="patient-resources-table-caption"
            sx={{
              overflowX: 'auto',
              maxInlineSize: '100%',
              containerType: 'inline-size',
            }}
          >
            <Box
              component="table"
              sx={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                textAlign: 'left',
                fontSize: '13px',
                '& thead th': {
                  position: 'sticky',
                  insetBlockStart: 0,
                  zIndex: 1,
                  bgcolor: '#f9fafb',
                  color: '#6b7280',
                  fontWeight: 600,
                  fontSize: '11.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  px: 2,
                  py: 1.4,
                  borderBottom: '0.5px solid #e5e7eb',
                },
                '& tbody td, & tbody th': {
                  px: 2,
                  py: 1.5,
                  borderBottom: '0.5px solid #f3f4f6',
                  verticalAlign: 'middle',
                },
                '& tbody tr:last-of-type td, & tbody tr:last-of-type th': {
                  borderBottom: 'none',
                },
              }}
            >
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Type</th>
                  <th>Title</th>
                  <th>URL</th>
                  <th style={{ width: 110 }}>Active</th>
                  <th style={{ width: 140 }}>Sort order</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      <Chip
                        size="small"
                        icon={
                          item.type === 'video' ? (
                            <VideoIcon sx={{ fontSize: '14px !important', color: '#1D9E75 !important' }} />
                          ) : (
                            <LinkIcon sx={{ fontSize: '14px !important', color: '#3b82f6 !important' }} />
                          )
                        }
                        label={item.type === 'video' ? 'Video' : 'Link'}
                        sx={{
                          height: 24,
                          fontSize: '11.5px',
                          fontWeight: 600,
                          bgcolor: item.type === 'video' ? '#e1f5ee' : '#eff6ff',
                          color: item.type === 'video' ? '#1D9E75' : '#3b82f6',
                          borderRadius: '8px',
                        }}
                      />
                    </td>
                    <th scope="row" style={{ fontWeight: 600, color: '#111827', background: '#ffffff' }}>
                      <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                        {item.title}
                      </Typography>
                      {item.subtitle && (
                        <Typography sx={{ fontSize: '11.5px', color: '#9ca3af', mt: 0.2 }}>
                          {item.subtitle}
                        </Typography>
                      )}
                      {item.type === 'video' && item.duration_label && (
                        <Typography sx={{ fontSize: '11px', color: '#6b7280', mt: 0.2 }}>
                          Duration: {item.duration_label}
                        </Typography>
                      )}
                    </th>
                    <td>
                      <Box
                        component="a"
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          color: '#1D9E75',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          maxWidth: 280,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '12.5px',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.url}</span>
                        <ExternalLinkIcon sx={{ fontSize: 13, flexShrink: 0 }} />
                      </Box>
                    </td>
                    <td>
                      <Switch
                        size="small"
                        checked={Boolean(item.is_active)}
                        onChange={() => void handleToggleActive(item)}
                        slotProps={{ input: { 'aria-label': `Toggle active state for ${item.title}` } }}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#1D9E75',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#1D9E75',
                          },
                        }}
                      />
                    </td>
                    <td>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography
                          sx={{
                            fontSize: '12.5px',
                            fontWeight: 600,
                            color: '#374151',
                            minWidth: 22,
                          }}
                        >
                          {item.sort_order}
                        </Typography>
                        <Tooltip title="Move up">
                          <span>
                            <IconButton
                              size="small"
                              disabled={index === 0 || reordering}
                              onClick={() => void handleMove(index, -1)}
                              aria-label={`Move ${item.title} up`}
                            >
                              <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Move down">
                          <span>
                            <IconButton
                              size="small"
                              disabled={index === resources.length - 1 || reordering}
                              onClick={() => void handleMove(index, 1)}
                              aria-label={`Move ${item.title} down`}
                            >
                              <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <Tooltip title="Edit resource">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(item)}
                            aria-label={`Edit ${item.title}`}
                            sx={{ color: '#374151' }}
                          >
                            <EditIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete resource">
                          <IconButton
                            size="small"
                            onClick={() => setDeleteTarget(item)}
                            aria-label={`Delete ${item.title}`}
                            sx={{ color: '#dc2626' }}
                          >
                            <DeleteIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Add / Edit Resource Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              border: '0.5px solid #e5e7eb',
              boxShadow: '0 16px 40px rgba(0,0,0,0.08)',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: 17, fontWeight: 700, color: '#111827', pb: 1 }}>
          {editingItem ? 'Edit resource' : 'Add resource'}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#e5e7eb', py: 2.5 }}>
          {serverError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '10px', fontSize: '12.5px' }}>
              {serverError}
            </Alert>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.15fr 0.85fr' },
              gap: 3,
              alignItems: 'start',
            }}
          >
            {/* Left column: Form Controls */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography component="label" htmlFor="resource-type" sx={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', mb: 0.5 }}>
                  Type *
                </Typography>
                <Select
                  id="resource-type"
                  fullWidth
                  size="small"
                  value={form.type}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, type: e.target.value as ResourceType }));
                    markTouched('type');
                  }}
                  sx={{
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    bgcolor: '#ffffff',
                  }}
                >
                  <MenuItem value="video">Orientation video (video preview card)</MenuItem>
                  <MenuItem value="link">Official outside link (DOH link card)</MenuItem>
                </Select>
              </Box>

              <Box>
                <Typography component="label" htmlFor="resource-title" sx={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block' }}>
                  Title *
                </Typography>
                <Typography id="resource-title-hint" sx={{ fontSize: 11.5, color: '#6b7280', mb: 0.5 }}>
                  Maximum 120 characters
                </Typography>
                <TextField
                  id="resource-title"
                  fullWidth
                  size="small"
                  required
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  onBlur={() => markTouched('title')}
                  error={Boolean(showFieldError('title'))}
                  helperText={showFieldError('title')}
                  slotProps={{
                    htmlInput: {
                      maxLength: 120,
                      'aria-describedby': 'resource-title-hint',
                      'aria-invalid': Boolean(showFieldError('title')),
                    },
                  }}
                  sx={fieldSx}
                />
              </Box>

              <Box>
                <Typography component="label" htmlFor="resource-subtitle" sx={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block' }}>
                  Subtitle
                </Typography>
                <Typography id="resource-subtitle-hint" sx={{ fontSize: 11.5, color: '#6b7280', mb: 0.5 }}>
                  Optional short line below the title (maximum 160 characters)
                </Typography>
                <TextField
                  id="resource-subtitle"
                  fullWidth
                  size="small"
                  value={form.subtitle}
                  onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                  onBlur={() => markTouched('subtitle')}
                  error={Boolean(showFieldError('subtitle'))}
                  helperText={showFieldError('subtitle')}
                  slotProps={{
                    htmlInput: {
                      maxLength: 160,
                      'aria-describedby': 'resource-subtitle-hint',
                      'aria-invalid': Boolean(showFieldError('subtitle')),
                    },
                  }}
                  sx={fieldSx}
                />
              </Box>

              <Box>
                <Typography component="label" htmlFor="resource-url" sx={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block' }}>
                  Destination URL *
                </Typography>
                <Typography id="resource-url-hint" sx={{ fontSize: 11.5, color: '#6b7280', mb: 0.5 }}>
                  Must start with https:// (for example, https://www.youtube.com/watch?v=... or https://doh.gov.ph/...)
                </Typography>
                <TextField
                  id="resource-url"
                  type="url"
                  fullWidth
                  size="small"
                  required
                  placeholder="https://"
                  value={form.url}
                  onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
                  onBlur={() => markTouched('url')}
                  error={Boolean(showFieldError('url'))}
                  helperText={showFieldError('url')}
                  slotProps={{
                    htmlInput: {
                      maxLength: 500,
                      pattern: 'https://.*',
                      'aria-describedby': 'resource-url-hint',
                      'aria-invalid': Boolean(showFieldError('url')),
                    },
                  }}
                  sx={fieldSx}
                />
              </Box>

              {form.type === 'video' && (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 140px' },
                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Typography component="label" htmlFor="resource-thumbnail" sx={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block' }}>
                      Thumbnail URL (optional)
                    </Typography>
                    <Typography id="resource-thumbnail-hint" sx={{ fontSize: 11.5, color: '#6b7280', mb: 0.5 }}>
                      https:// image URL. Leave blank to auto-detect YouTube thumbnail or use teal gradient.
                    </Typography>
                    <TextField
                      id="resource-thumbnail"
                      type="url"
                      fullWidth
                      size="small"
                      placeholder="https://"
                      value={form.thumbnail_url}
                      onChange={(e) => setForm((prev) => ({ ...prev, thumbnail_url: e.target.value }))}
                      onBlur={() => markTouched('thumbnail_url')}
                      error={Boolean(showFieldError('thumbnail_url'))}
                      helperText={showFieldError('thumbnail_url')}
                      slotProps={{
                        htmlInput: {
                          maxLength: 500,
                          pattern: 'https://.*',
                          'aria-describedby': 'resource-thumbnail-hint',
                          'aria-invalid': Boolean(showFieldError('thumbnail_url')),
                        },
                      }}
                      sx={fieldSx}
                    />
                  </Box>

                  <Box>
                    <Typography component="label" htmlFor="resource-duration" sx={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block' }}>
                      Duration
                    </Typography>
                    <Typography id="resource-duration-hint" sx={{ fontSize: 11.5, color: '#6b7280', mb: 0.5 }}>
                      Format m:ss (e.g. 3:45)
                    </Typography>
                    <TextField
                      id="resource-duration"
                      fullWidth
                      size="small"
                      placeholder="3:45"
                      value={form.duration_label}
                      onChange={(e) => setForm((prev) => ({ ...prev, duration_label: e.target.value }))}
                      onBlur={() => markTouched('duration_label')}
                      error={Boolean(showFieldError('duration_label'))}
                      helperText={showFieldError('duration_label')}
                      slotProps={{
                        htmlInput: {
                          maxLength: 10,
                          pattern: '\\d{1,2}:[0-5]\\d',
                          'aria-describedby': 'resource-duration-hint',
                          'aria-invalid': Boolean(showFieldError('duration_label')),
                        },
                      }}
                      sx={fieldSx}
                    />
                  </Box>
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, pt: 0.5 }}>
                <Box sx={{ width: 130 }}>
                  <Typography component="label" htmlFor="resource-sort-order" sx={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', mb: 0.5 }}>
                    Sort order
                  </Typography>
                  <TextField
                    id="resource-sort-order"
                    type="number"
                    size="small"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, sort_order: Math.max(0, parseInt(e.target.value || '0', 10)) }))
                    }
                    onBlur={() => markTouched('sort_order')}
                    error={Boolean(showFieldError('sort_order'))}
                    helperText={showFieldError('sort_order')}
                    slotProps={{ htmlInput: { min: 0, max: 65535 } }}
                    sx={fieldSx}
                  />
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={form.is_active}
                      onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#1D9E75' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#1D9E75' },
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                      Active in patient app
                    </Typography>
                  }
                />
              </Box>
            </Box>

            {/* Right column: Live Mobile Card Preview */}
            <Box
              sx={{
                bgcolor: '#f4f6f5',
                border: '0.5px solid #e5e7eb',
                borderRadius: '14px',
                p: 2.25,
              }}
            >
              <Typography
                sx={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#6b7280',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  mb: 1.5,
                }}
              >
                Mobile app live preview
              </Typography>

              <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 360, mx: 'auto' }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 500, color: '#9ca3af', letterSpacing: '0.06em' }}>
                  LEARN MORE
                </Typography>
              </Box>

              <MobileCardLivePreview form={form} />

              <Typography sx={{ fontSize: '11.5px', color: '#6b7280', mt: 1.75, lineHeight: 1.45 }}>
                Tapping this card in the mobile app opens the destination URL externally in the patient&apos;s browser or YouTube app.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={handleCloseDialog}
            disabled={saving}
            sx={{
              textTransform: 'none',
              color: '#4b5563',
              borderRadius: '10px',
              fontWeight: 500,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            disabled={saving}
            sx={{
              textTransform: 'none',
              bgcolor: '#1D9E75',
              color: '#ffffff',
              borderRadius: '10px',
              px: 2.5,
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': { bgcolor: '#17825f', boxShadow: 'none' },
            }}
          >
            {saving ? 'Saving...' : editingItem ? 'Save changes' : 'Add resource'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmationDialog
          title="Delete Resource"
          message={`Are you sure you want to delete "${deleteTarget.title}"? This will remove it from the patient Home screen.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          isLoading={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: '10px' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
