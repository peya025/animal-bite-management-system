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
  InputAdornment,
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
  CheckCircleOutlined as CheckCircleIcon,
  Close as ClearIcon,
  CloudUploadOutlined as CloudUploadIcon,
  DeleteOutlined as DeleteIcon,
  EditOutlined as EditIcon,
  ErrorOutlined as ErrorOutlineIcon,
  ImageOutlined as ImageIcon,
  Language as GlobeIcon,
  Link as LinkIcon,
  MovieOutlined as MovieIcon,
  OpenInNew as ExternalLinkIcon,
  PhoneIphone as PhoneIphoneIcon,
  PlayArrowRounded as PlayIcon,
  Refresh as RefreshIcon,
  StopRounded as StopIcon,
  VideocamOutlined as VideoIcon,
  VisibilityOutlined as PreviewIcon,
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
  video_path?: string | null;
  thumbnail_url: string | null;
  thumbnail_path?: string | null;
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
  if (trimmed.toLowerCase().includes('replace-with-')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname) && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

function detectResourceTypeFromUrl(rawUrl: string): ResourceType {
  const trimmed = rawUrl.trim().toLowerCase();
  if (!trimmed) return 'video';
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (
      host === 'youtu.be' ||
      host === 'www.youtu.be' ||
      host.endsWith('youtube.com') ||
      host.endsWith('vimeo.com') ||
      host.endsWith('dailymotion.com') ||
      path.endsWith('.mp4') ||
      path.endsWith('.webm') ||
      path.endsWith('.mov')
    ) {
      return 'video';
    }
    return 'link';
  } catch {
    if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be') || trimmed.includes('vimeo.com')) {
      return 'video';
    }
    return 'link';
  }
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.trim());
    return parsed.hostname || 'doh.gov.ph';
  } catch {
    return 'doh.gov.ph';
  }
}

export function extractYoutubeId(url: string): string | null {
  try {
    const trimmed = (url || '').trim();
    if (!trimmed) return null;
    const parsed = new URL(trimmed);
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
      return videoId;
    }
  } catch {
    // Ignore parse error
  }
  return null;
}

function resolveVideoThumbnail(url: string, thumbnailUrl?: string | null): string | null {
  const custom = (thumbnailUrl ?? '').trim();
  if (custom && isValidHttpsUrl(custom)) {
    return custom;
  }

  const videoId = extractYoutubeId(url);
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateForm(
  form: ResourceFormState,
  options?: {
    videoSource?: 'url' | 'upload';
    hasVideoFile?: boolean;
    hasExistingVideo?: boolean;
    videoFileSize?: number;
    thumbnailSource?: 'url' | 'upload';
    hasThumbnailFile?: boolean;
    thumbnailFileSize?: number;
  }
): Partial<Record<keyof ResourceFormState | 'video_file' | 'thumbnail_file', string>> {
  const errors: Partial<Record<keyof ResourceFormState | 'video_file' | 'thumbnail_file', string>> = {};

  if (form.type !== 'video' && form.type !== 'link') {
    errors.type = 'Resource type must be Video or Website Link.';
  }

  const trimmedTitle = form.title.trim();
  if (!trimmedTitle) {
    errors.title = 'Title is required.';
  } else if (trimmedTitle.length > 120) {
    errors.title = 'Title must not exceed 120 characters.';
  }

  if (form.subtitle.trim().length > 160) {
    errors.subtitle = 'Description must not exceed 160 characters.';
  }

  const isVideoUpload = form.type === 'video' && options?.videoSource === 'upload';

  if (isVideoUpload) {
    if (!options?.hasVideoFile && !options?.hasExistingVideo) {
      errors.video_file = 'Please choose a video file to upload (MP4, WebM, or MOV).';
    } else if (options?.hasVideoFile && options?.videoFileSize && options.videoFileSize > 100 * 1024 * 1024) {
      errors.video_file = 'Video file size must not exceed 100MB.';
    }
  } else {
    const trimmedUrl = form.url.trim();
    if (!trimmedUrl) {
      errors.url = 'HTTPS URL is required.';
    } else if (trimmedUrl.length > 500) {
      errors.url = 'HTTPS URL must not exceed 500 characters.';
    } else if (!isValidHttpsUrl(trimmedUrl)) {
      errors.url = 'Enter a valid URL starting with https:// (unsafe or http:// links are rejected).';
    }
  }

  if (form.type === 'video') {
    const isThumbUpload = options?.thumbnailSource === 'upload';
    if (isThumbUpload) {
      if (options?.hasThumbnailFile && options?.thumbnailFileSize && options.thumbnailFileSize > 5 * 1024 * 1024) {
        errors.thumbnail_file = 'Thumbnail image must not exceed 5MB.';
      }
    } else {
      const trimmedThumb = form.thumbnail_url.trim();
      if (trimmedThumb) {
        if (trimmedThumb.length > 500) {
          errors.thumbnail_url = 'Thumbnail URL must not exceed 500 characters.';
        } else if (!isValidHttpsUrl(trimmedThumb)) {
          errors.thumbnail_url = 'Thumbnail URL must be a valid https:// address.';
        }
      }
    }

    const trimmedDuration = form.duration_label.trim();
    if (trimmedDuration) {
      if (trimmedDuration.length > 10 || !/^\d{1,2}:[0-5]\d$/.test(trimmedDuration)) {
        errors.duration_label = 'Duration must be in m:ss or mm:ss format (for example, 3:45).';
      }
    }
  }

  if (Number.isNaN(Number(form.sort_order)) || form.sort_order < 0 || form.sort_order > 65535) {
    errors.sort_order = 'Display order must be between 0 and 65535.';
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
    backgroundColor: '#fef2f2',
  },
};

function FieldErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <Box
      id={id}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        mt: 0.5,
        color: '#dc2626',
        fontSize: '12px',
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 14, flexShrink: 0 }} aria-hidden="true" />
      <span>{message}</span>
    </Box>
  );
}

export function MobileCardLivePreview({
  form,
  allowPlaceholders = true,
  overrideThumbnailUrl,
  overrideVideoUrl,
}: {
  form: Pick<ResourceFormState, 'type' | 'title' | 'subtitle' | 'url' | 'thumbnail_url' | 'duration_label'>;
  allowPlaceholders?: boolean;
  overrideThumbnailUrl?: string | null;
  overrideVideoUrl?: string | null;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const activeVideoUrl = (overrideVideoUrl || form.url || '').trim();
  const youtubeId = useMemo(() => (activeVideoUrl ? extractYoutubeId(activeVideoUrl) : null), [activeVideoUrl]);

  useEffect(() => {
    setIsPlaying(false);
  }, [activeVideoUrl]);

  const hasRealTitle = form.title.trim().length > 0;
  const previewTitle =
    form.title.trim() ||
    (allowPlaceholders
      ? form.type === 'video'
        ? 'Orientation video title'
        : 'Official DOH resource link'
      : '');
  const previewSubtitle =
    form.subtitle.trim() ||
    (!hasRealTitle && allowPlaceholders && form.type === 'video'
      ? 'Short description shown under the title'
      : '');
  const previewDuration = form.duration_label?.trim() || '';
  const previewDomain = form.url.trim() ? extractDomain(form.url) : 'doh.gov.ph';
  const resolvedThumb = useMemo(
    () => overrideThumbnailUrl || (form.type === 'video' ? resolveVideoThumbnail(form.url, form.thumbnail_url) : null),
    [overrideThumbnailUrl, form.type, form.url, form.thumbnail_url]
  );
  const [thumbFailed, setThumbFailed] = useState(false);

  useEffect(() => {
    setThumbFailed(false);
  }, [resolvedThumb]);

  if (form.type === 'video') {
    const showImage = Boolean(resolvedThumb && !thumbFailed);
    const canPlay = Boolean(activeVideoUrl);

    return (
      <Box
        sx={{
          bgcolor: '#ffffff',
          borderRadius: '16px',
          border: '0.5px solid #e5e7eb',
          overflow: 'hidden',
          maxWidth: 360,
          mx: 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {/* Top Area: Either Inline Video Player or Thumbnail */}
        {isPlaying && canPlay ? (
          <Box
            sx={{
              position: 'relative',
              height: 180,
              bgcolor: '#000000',
              overflow: 'hidden',
            }}
          >
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setIsPlaying(false);
              }}
              aria-label="Close inline preview"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'rgba(0,0,0,0.65)',
                color: '#ffffff',
                zIndex: 10,
                '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' },
              }}
            >
              <ClearIcon sx={{ fontSize: 16 }} />
            </IconButton>

            {youtubeId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
                title={previewTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: '100%', height: '100%', border: 0 }}
              />
            ) : (
              <Box
                component="video"
                src={activeVideoUrl}
                controls
                autoPlay
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  bgcolor: '#000000',
                }}
              />
            )}
          </Box>
        ) : (
          <Box
            onClick={() => {
              if (canPlay) {
                setIsPlaying(true);
              }
            }}
            sx={{
              position: 'relative',
              height: 150,
              background: 'linear-gradient(135deg, #1D9E75 0%, #5cc7a5 100%)',
              overflow: 'hidden',
              cursor: canPlay ? 'pointer' : 'default',
            }}
          >
            {/* Decorative depth circles on fallback teal placeholder */}
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
                transition: 'transform 0.15s ease',
                '&:hover': {
                  transform: 'translate(-50%, -50%) scale(1.08)',
                },
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
        )}

        {/* Body */}
        <Box
          onClick={() => {
            if (canPlay) {
              setIsPlaying((prev) => !prev);
            }
          }}
          sx={{
            px: '14px',
            py: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            cursor: canPlay ? 'pointer' : 'default',
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
          <Tooltip title={isPlaying ? 'Stop playback' : canPlay ? 'Play video inline' : 'No video source'}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                bgcolor: isPlaying ? '#fee2e2' : '#e1f5ee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              {isPlaying ? (
                <StopIcon sx={{ fontSize: 18, color: '#dc2626' }} />
              ) : (
                <PlayIcon sx={{ fontSize: 18, color: '#1D9E75' }} />
              )}
            </Box>
          </Tooltip>
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

export interface PatientAppResourcesSectionProps {
  embedded?: boolean;
  refreshTrigger?: number;
}

export function PatientAppResourcesSection({
  embedded = false,
  refreshTrigger = 0,
}: PatientAppResourcesSectionProps) {
  const [resources, setResources] = useState<ClinicResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);

  const [quickUrl, setQuickUrl] = useState('');
  const [quickUrlError, setQuickUrlError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClinicResourceItem | null>(null);
  const [form, setForm] = useState<ResourceFormState>(INITIAL_FORM_STATE);
  const [typeManuallyChosen, setTypeManuallyChosen] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof ResourceFormState, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [videoSource, setVideoSource] = useState<'url' | 'upload'>('url');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoFileError, setVideoFileError] = useState<string | null>(null);

  const [thumbnailSource, setThumbnailSource] = useState<'url' | 'upload'>('url');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  const [removeThumbnail, setRemoveThumbnail] = useState<boolean>(false);

  const [previewItem, setPreviewItem] = useState<ClinicResourceItem | null>(null);
  const [showSectionPreview, setShowSectionPreview] = useState(true);

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

  const validationErrors = useMemo(
    () =>
      validateForm(form, {
        videoSource,
        hasVideoFile: Boolean(videoFile),
        hasExistingVideo: Boolean(editingItem?.video_path),
        videoFileSize: videoFile?.size,
        thumbnailSource,
        hasThumbnailFile: Boolean(thumbnailFile),
        thumbnailFileSize: thumbnailFile?.size,
      }),
    [form, videoSource, videoFile, editingItem, thumbnailSource, thumbnailFile]
  );

  const activeResources = useMemo(
    () => resources.filter((item) => Boolean(item.is_active)),
    [resources]
  );

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await api.get('/setup/clinic-resources');
      const items: ClinicResourceItem[] = Array.isArray(response.data?.data) ? response.data.data : [];
      setResources(items);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to load patient app resources.';
      setLoadError(message);
      setSnackbar({
        open: true,
        message,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchResources();
  }, [fetchResources, refreshTrigger]);

  useEffect(() => {
    return () => {
      if (thumbnailPreviewUrl) {
        URL.revokeObjectURL(thumbnailPreviewUrl);
      }
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [thumbnailPreviewUrl, videoPreviewUrl]);

  const handleVideoFileChange = (file: File | null) => {
    setVideoFile(file);
    setVideoFileError(null);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setVideoFileError('Video file size exceeds 100MB.');
      return;
    }

    const objUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(objUrl);

    try {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.onloadedmetadata = () => {
        const durationSec = Math.round(tempVideo.duration);
        if (!Number.isNaN(durationSec) && durationSec > 0 && !form.duration_label) {
          const mins = Math.floor(durationSec / 60);
          const secs = durationSec % 60;
          setForm((prev) => ({ ...prev, duration_label: `${mins}:${secs < 10 ? '0' : ''}${secs}` }));
        }
      };
      tempVideo.src = objUrl;
    } catch {
      // Ignore if metadata extraction is not supported
    }
  };

  const handleThumbnailFileChange = (file: File | null) => {
    setThumbnailFile(file);
    setRemoveThumbnail(false);
    if (thumbnailPreviewUrl) {
      URL.revokeObjectURL(thumbnailPreviewUrl);
    }
    if (file) {
      setThumbnailPreviewUrl(URL.createObjectURL(file));
    } else {
      setThumbnailPreviewUrl(null);
    }
  };

  const handleOpenCreate = (prefillUrl?: string) => {
    const trimmedUrl = (prefillUrl ?? '').trim();
    if (trimmedUrl && !isValidHttpsUrl(trimmedUrl)) {
      setQuickUrlError('Enter a valid URL starting with https:// before adding.');
      return;
    }
    setQuickUrlError(null);

    const nextOrder =
      resources.length > 0 ? Math.max(...resources.map((r) => Number(r.sort_order) || 0)) + 1 : 0;
    const detectedType: ResourceType = trimmedUrl ? detectResourceTypeFromUrl(trimmedUrl) : 'video';

    setEditingItem(null);
    setTypeManuallyChosen(false);
    setVideoSource('url');
    setVideoFile(null);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
    setVideoFileError(null);
    setThumbnailSource('url');
    setThumbnailFile(null);
    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    setThumbnailPreviewUrl(null);
    setRemoveThumbnail(false);

    setForm({
      ...INITIAL_FORM_STATE,
      type: detectedType,
      url: trimmedUrl,
      sort_order: nextOrder,
    });
    setTouched(trimmedUrl ? { url: true } : {});
    setSubmitAttempted(false);
    setServerError(null);
    setDialogOpen(true);
    if (trimmedUrl) {
      setQuickUrl('');
    }
  };

  const handleOpenEdit = (item: ClinicResourceItem) => {
    setEditingItem(item);
    setTypeManuallyChosen(true);
    const isUploadedVid = Boolean(item.video_path || (item.url && item.url.includes('/api/storage/')));
    const isUploadedThumb = Boolean(item.thumbnail_path || (item.thumbnail_url && item.thumbnail_url.includes('/api/storage/')));

    setVideoSource(isUploadedVid ? 'upload' : 'url');
    setVideoFile(null);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
    setVideoFileError(null);
    setThumbnailSource(isUploadedThumb ? 'upload' : 'url');
    setThumbnailFile(null);
    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    setThumbnailPreviewUrl(null);
    setRemoveThumbnail(false);

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
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
    setDialogOpen(false);
  };

  const markTouched = (field: keyof ResourceFormState) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const showFieldError = (field: keyof ResourceFormState | 'video_file' | 'thumbnail_file'): string | undefined => {
    if (!touched[field as keyof ResourceFormState] && !submitAttempted) return undefined;
    return validationErrors[field];
  };

  const handleUrlInputChange = (nextUrl: string) => {
    setForm((prev) => {
      const updated: ResourceFormState = { ...prev, url: nextUrl };
      if (!editingItem && !typeManuallyChosen && nextUrl.trim().startsWith('https://')) {
        updated.type = detectResourceTypeFromUrl(nextUrl);
      }
      return updated;
    });
  };

  const handleSave = async () => {
    setSubmitAttempted(true);
    setServerError(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      const isVideoUpload = form.type === 'video' && videoSource === 'upload';
      const isThumbUpload = form.type === 'video' && thumbnailSource === 'upload';

      if (isVideoUpload || isThumbUpload || videoFile || thumbnailFile || removeThumbnail) {
        const formData = new FormData();
        formData.append('type', form.type);
        formData.append('title', form.title.trim());
        if (form.subtitle.trim()) formData.append('subtitle', form.subtitle.trim());
        if (!isVideoUpload && form.url.trim()) {
          formData.append('url', form.url.trim());
        }
        if (form.type === 'video' && form.duration_label.trim()) {
          formData.append('duration_label', form.duration_label.trim());
        }
        formData.append('sort_order', String(Number(form.sort_order) || 0));
        formData.append('is_active', form.is_active ? '1' : '0');

        if (videoFile) {
          formData.append('video_file', videoFile);
        } else if (!isVideoUpload && editingItem?.video_path) {
          formData.append('remove_video_file', '1');
        }

        if (thumbnailFile) {
          formData.append('thumbnail_file', thumbnailFile);
        } else if (removeThumbnail) {
          formData.append('remove_thumbnail', '1');
        } else if (!isThumbUpload && form.type === 'video') {
          if (form.thumbnail_url.trim()) {
            formData.append('thumbnail_url', form.thumbnail_url.trim());
          }
          if (editingItem?.thumbnail_path) {
            formData.append('remove_thumbnail_file', '1');
          }
        }

        if (editingItem) {
          formData.append('_method', 'PUT');
          await api.post(`/setup/clinic-resources/${editingItem.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } else {
          await api.post('/setup/clinic-resources', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      } else {
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
        } else {
          await api.post('/setup/clinic-resources', payload);
        }
      }

      setSnackbar({
        open: true,
        message: editingItem ? 'Resource updated successfully.' : 'Resource added successfully.',
        severity: 'success',
      });

      setDialogOpen(false);
      await fetchResources();
    } catch (err: any) {
      const fieldErrors = err?.response?.data?.errors;
      const validationErrorsList =
        fieldErrors && typeof fieldErrors === 'object'
          ? Object.values(fieldErrors).flat().filter(Boolean).join(' ')
          : null;
      const apiMessage =
        validationErrorsList ||
        err?.response?.data?.message ||
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
        message: nextActive
          ? 'Resource published to the patient mobile Home screen.'
          : 'Resource hidden from the patient mobile Home screen.',
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
      setSnackbar({
        open: true,
        message: 'Display order updated.',
        severity: 'success',
      });
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to save display order.',
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
      if (previewItem?.id === deleteTarget.id) {
        setPreviewItem(null);
      }
      setSnackbar({
        open: true,
        message: 'Resource deleted successfully.',
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
    <>
      <Paper
        elevation={0}
        sx={{
          border: embedded ? '1px solid var(--border-glow, #e0eae3)' : '0.5px solid #e5e7eb',
          borderRadius: embedded ? 2 : '14px',
          p: embedded ? 3 : 0,
          bgcolor: 'var(--card-bg-solid, #fff)',
          overflow: 'hidden',
        }}
      >
        {embedded && (
          <>
            <Typography
              sx={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#277a4b',
                mb: 0.5,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              PATIENT APP RESOURCES
            </Typography>
            <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mb: 2.5 }} />
          </>
        )}

        {/* Section Header */}
        <Box
          sx={{
            px: embedded ? 0 : 2.5,
            py: embedded ? 0 : 2,
            pb: embedded ? 2 : 2,
            borderBottom: '0.5px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box>
            <Typography
              id="patient-resources-table-caption"
              sx={{ fontSize: 15, fontWeight: 700, color: '#111827' }}
            >
              Patient App Resources (Mobile &ldquo;Learn More&rdquo;)
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#6b7280', mt: 0.25 }}>
              Add orientation videos or website links displayed in the patient mobile app under{' '}
              <strong>Home &rarr; Learn More</strong>, below Bite Care Guide and above Clinic Information.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              label={`${activeResources.length} published`}
              sx={{
                bgcolor: '#e1f5ee',
                color: '#1D9E75',
                fontWeight: 600,
                fontSize: '11.5px',
                height: 26,
              }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<PhoneIphoneIcon sx={{ fontSize: 16 }} />}
              onClick={() => setShowSectionPreview((prev) => !prev)}
              sx={{
                textTransform: 'none',
                borderColor: '#e5e7eb',
                color: '#374151',
                borderRadius: '10px',
                px: 1.5,
                py: 0.65,
                fontSize: '12.5px',
                fontWeight: 500,
                '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' },
              }}
            >
              {showSectionPreview ? 'Hide Mobile Preview' : 'Show Mobile Preview'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
              onClick={() => void fetchResources()}
              disabled={loading}
              sx={{
                textTransform: 'none',
                borderColor: '#e5e7eb',
                color: '#374151',
                borderRadius: '10px',
                px: 1.5,
                py: 0.65,
                fontSize: '12.5px',
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
              onClick={() => handleOpenCreate()}
              sx={{
                textTransform: 'none',
                bgcolor: '#1D9E75',
                color: '#ffffff',
                borderRadius: '10px',
                px: 2,
                py: 0.7,
                fontSize: '12.5px',
                fontWeight: 600,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#17825f', boxShadow: 'none' },
              }}
            >
              Add Resource
            </Button>
          </Box>
        </Box>

        {/* Quick Paste URL Bar */}
        <Box
          sx={{
            px: embedded ? 0 : 2.5,
            py: 2,
            borderBottom: '0.5px solid #e5e7eb',
            bgcolor: embedded ? 'transparent' : '#f9fafb',
          }}
        >
          <Typography
            component="label"
            htmlFor="quick-resource-url-input"
            sx={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', mb: 0.5 }}
          >
            Quick Add by URL
          </Typography>
          <Typography id="quick-resource-url-hint" sx={{ fontSize: 11.5, color: '#6b7280', mb: 1 }}>
            Paste a video or website https:// URL to pre-fill a new resource and automatically detect its type.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.25, flexWrap: { xs: 'wrap', sm: 'nowrap' }, alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 220 }}>
              <TextField
                id="quick-resource-url-input"
                type="url"
                size="small"
                fullWidth
                placeholder="https://www.youtube.com/watch?v=... or https://doh.gov.ph/..."
                value={quickUrl}
                onChange={(e) => {
                  setQuickUrl(e.target.value);
                  if (quickUrlError) setQuickUrlError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleOpenCreate(quickUrl);
                  }
                }}
                error={Boolean(quickUrlError)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon sx={{ fontSize: 17, color: '#9ca3af' }} />
                      </InputAdornment>
                    ),
                  },
                  htmlInput: {
                    'aria-describedby': 'quick-resource-url-hint',
                    'aria-errormessage': quickUrlError ? 'quick-resource-url-error' : undefined,
                    'aria-invalid': Boolean(quickUrlError),
                  },
                }}
                sx={fieldSx}
              />
              <FieldErrorText id="quick-resource-url-error" message={quickUrlError ?? undefined} />
            </Box>
            <Button
              variant="outlined"
              onClick={() => handleOpenCreate(quickUrl)}
              startIcon={<AddIcon />}
              sx={{
                textTransform: 'none',
                borderColor: '#1D9E75',
                color: '#1D9E75',
                borderRadius: '10px',
                px: 2,
                py: 0.9,
                fontWeight: 600,
                fontSize: '13px',
                whiteSpace: 'nowrap',
                '&:hover': { borderColor: '#17825f', bgcolor: '#ecfdf5' },
              }}
            >
              Paste &amp; Configure
            </Button>
          </Box>
        </Box>

        {loadError && !loading && (
          <Box sx={{ px: embedded ? 0 : 2.5, pt: 2 }}>
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => void fetchResources()}>
                  Retry
                </Button>
              }
              sx={{ borderRadius: '10px' }}
            >
              {loadError}
            </Alert>
          </Box>
        )}

        {/* Content: Table + Optional Live Mobile Section Preview */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns:
              showSectionPreview && !loading
                ? { xs: '1fr', lg: 'minmax(0, 1.45fr) 360px' }
                : '1fr',
            gap: embedded ? 2.5 : 0,
            pt: embedded ? 2 : 0,
            alignItems: 'start',
          }}
        >
          {/* Left: Resources List / Table */}
          <Box sx={{ minWidth: 0 }}>
            {loading ? (
              <Box sx={{ py: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5 }}>
                <CircularProgress size={22} sx={{ color: '#1D9E75' }} />
                <Typography sx={{ fontSize: 13, color: '#6b7280' }}>Loading resources...</Typography>
              </Box>
            ) : resources.length === 0 ? (
              <Box
                sx={{
                  py: 5,
                  px: 3,
                  textAlign: 'center',
                  border: embedded ? '1px dashed #d1d5db' : 'none',
                  borderRadius: embedded ? '12px' : 0,
                  bgcolor: '#f9fafb',
                }}
              >
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                  No patient resources configured yet
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: '#6b7280', mt: 0.5, maxWidth: 440, mx: 'auto' }}>
                  When no active resources exist, the Learn More section is automatically hidden on the patient Home
                  screen without leaving an empty gap.
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenCreate()}
                  sx={{
                    mt: 2,
                    textTransform: 'none',
                    bgcolor: '#1D9E75',
                    borderRadius: '10px',
                    boxShadow: 'none',
                    '&:hover': { bgcolor: '#17825f', boxShadow: 'none' },
                  }}
                >
                  Add First Resource
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
                  border: embedded ? '1px solid #e5e7eb' : 'none',
                  borderRadius: embedded ? '12px' : 0,
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
                      <th style={{ width: 120 }}>Type</th>
                      <th>Title &amp; Description</th>
                      <th>HTTPS URL</th>
                      <th style={{ width: 135 }}>Status</th>
                      <th style={{ width: 130 }}>Display Order</th>
                      <th style={{ width: 130, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map((item, index) => {
                      const isSelectedPreview = previewItem?.id === item.id;
                      return (
                        <tr
                          key={item.id}
                          style={{
                            backgroundColor: isSelectedPreview ? '#f0fdf4' : '#ffffff',
                          }}
                        >
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
                              label={item.type === 'video' ? 'Video' : 'Website Link'}
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
                          <th
                            scope="row"
                            style={{
                              fontWeight: 600,
                              color: '#111827',
                              background: isSelectedPreview ? '#f0fdf4' : '#ffffff',
                            }}
                          >
                            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                              {item.title}
                            </Typography>
                            {item.subtitle && (
                              <Typography sx={{ fontSize: '11.5px', color: '#6b7280', mt: 0.2 }}>
                                {item.subtitle}
                              </Typography>
                            )}
                            {item.type === 'video' && item.duration_label && (
                              <Typography sx={{ fontSize: '11px', color: '#1D9E75', fontWeight: 500, mt: 0.2 }}>
                                Duration: {item.duration_label}
                              </Typography>
                            )}
                          </th>
                          <td>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxWidth: 240 }}>
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
                              {(item.video_path || item.thumbnail_path) && (
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                  {item.video_path && (
                                    <Chip
                                      size="small"
                                      label="Uploaded Video"
                                      icon={<MovieIcon style={{ fontSize: 12 }} />}
                                      sx={{ height: 18, fontSize: '10px', bgcolor: '#ecfdf5', color: '#047857' }}
                                    />
                                  )}
                                  {item.thumbnail_path && (
                                    <Chip
                                      size="small"
                                      label="Custom Thumb"
                                      icon={<ImageIcon style={{ fontSize: 12 }} />}
                                      sx={{ height: 18, fontSize: '10px', bgcolor: '#f0fdf4', color: '#047857' }}
                                    />
                                  )}
                                </Box>
                              )}
                            </Box>
                          </td>
                          <td>
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
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
                              <Chip
                                size="small"
                                label={item.is_active ? 'Active' : 'Hidden'}
                                sx={{
                                  height: 20,
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  bgcolor: item.is_active ? '#ecfdf5' : '#f3f4f6',
                                  color: item.is_active ? '#047857' : '#6b7280',
                                }}
                              />
                            </Box>
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
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                              <Tooltip title="Preview on mobile">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setShowSectionPreview(true);
                                    setPreviewItem((prev) => (prev?.id === item.id ? null : item));
                                  }}
                                  aria-label={`Preview ${item.title} on mobile`}
                                  sx={{ color: isSelectedPreview ? '#1D9E75' : '#6b7280' }}
                                >
                                  <PreviewIcon sx={{ fontSize: 17 }} />
                                </IconButton>
                              </Tooltip>
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
                      );
                    })}
                  </tbody>
                </Box>
              </Box>
            )}
          </Box>

          {/* Right: Live Mobile Home -> Learn More Preview Panel */}
          {showSectionPreview && !loading && (
            <Box
              sx={{
                bgcolor: '#f4f6f5',
                border: '1px solid #e5e7eb',
                borderRadius: '14px',
                p: 2,
                mx: { xs: embedded ? 0 : 2.5, lg: 0 },
                mb: { xs: embedded ? 0 : 2.5, lg: 0 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                <Typography
                  sx={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#374151',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  {previewItem ? 'Selected Resource Preview' : 'Mobile Home → Learn More Preview'}
                </Typography>
                {previewItem && (
                  <Button
                    size="small"
                    onClick={() => setPreviewItem(null)}
                    sx={{ fontSize: '11px', textTransform: 'none', color: '#1D9E75', minWidth: 0, p: 0 }}
                  >
                    Show all active
                  </Button>
                )}
              </Box>

              {previewItem ? (
                <Box>
                  <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: '11px', fontWeight: 500, color: '#9ca3af', letterSpacing: '0.06em' }}>
                      LEARN MORE
                    </Typography>
                    <Chip
                      size="small"
                      label={previewItem.is_active ? 'Active' : 'Hidden'}
                      sx={{
                        height: 18,
                        fontSize: '10px',
                        bgcolor: previewItem.is_active ? '#e1f5ee' : '#e5e7eb',
                        color: previewItem.is_active ? '#1D9E75' : '#4b5563',
                      }}
                    />
                  </Box>
                  <MobileCardLivePreview
                    allowPlaceholders={false}
                    form={{
                      type: previewItem.type,
                      title: previewItem.title,
                      subtitle: previewItem.subtitle ?? '',
                      url: previewItem.url,
                      thumbnail_url: previewItem.thumbnail_url ?? '',
                      duration_label: previewItem.duration_label ?? '',
                    }}
                  />
                </Box>
              ) : activeResources.length === 0 ? (
                <Box
                  sx={{
                    py: 3.5,
                    px: 2,
                    textAlign: 'center',
                    bgcolor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px dashed #d1d5db',
                  }}
                >
                  <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: '#374151' }}>
                    Learn More section is hidden
                  </Typography>
                  <Typography sx={{ fontSize: '11.5px', color: '#6b7280', mt: 0.5 }}>
                    No active resources are published. Add or enable a resource to display it between Bite Care Guide
                    and Clinic Information.
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: '11px', fontWeight: 500, color: '#9ca3af', letterSpacing: '0.06em' }}>
                      LEARN MORE
                    </Typography>
                    {activeResources.length > 2 && (
                      <Typography sx={{ fontSize: '11px', fontWeight: 500, color: '#1D9E75' }}>
                        See all
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeResources.map((item) => (
                      <MobileCardLivePreview
                        key={item.id}
                        allowPlaceholders={false}
                        form={{
                          type: item.type,
                          title: item.title,
                          subtitle: item.subtitle ?? '',
                          url: item.url,
                          thumbnail_url: item.thumbnail_url ?? '',
                          duration_label: item.duration_label ?? '',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
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
          {editingItem ? 'Edit Resource' : 'Add Resource'}
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
                <Typography
                  component="label"
                  htmlFor="resource-type"
                  sx={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', mb: 0.5 }}
                >
                  Resource Type *
                </Typography>
                <Select
                  id="resource-type"
                  fullWidth
                  size="small"
                  value={form.type}
                  onChange={(e) => {
                    setTypeManuallyChosen(true);
                    setForm((prev) => ({ ...prev, type: e.target.value as ResourceType }));
                    markTouched('type');
                  }}
                  sx={{
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    bgcolor: '#ffffff',
                  }}
                >
                  <MenuItem value="video">Video</MenuItem>
                  <MenuItem value="link">Website Link</MenuItem>
                </Select>
              </Box>

              {form.type === 'video' ? (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography
                      component="label"
                      sx={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block' }}
                    >
                      Video Source *
                    </Typography>
                    <Box sx={{ display: 'flex', bgcolor: '#f3f4f6', p: 0.5, borderRadius: '8px', gap: 0.5 }}>
                      <Button
                        size="small"
                        onClick={() => {
                          setVideoSource('url');
                          markTouched('url');
                        }}
                        startIcon={<LinkIcon sx={{ fontSize: 14 }} />}
                        sx={{
                          py: 0.3,
                          px: 1,
                          fontSize: '11.5px',
                          fontWeight: videoSource === 'url' ? 600 : 500,
                          color: videoSource === 'url' ? '#111827' : '#6b7280',
                          bgcolor: videoSource === 'url' ? '#ffffff' : 'transparent',
                          boxShadow: videoSource === 'url' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                          borderRadius: '6px',
                          textTransform: 'none',
                          minWidth: 0,
                        }}
                      >
                        Paste URL
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setVideoSource('upload');
                        }}
                        startIcon={<CloudUploadIcon sx={{ fontSize: 14 }} />}
                        sx={{
                          py: 0.3,
                          px: 1,
                          fontSize: '11.5px',
                          fontWeight: videoSource === 'upload' ? 600 : 500,
                          color: videoSource === 'upload' ? '#111827' : '#6b7280',
                          bgcolor: videoSource === 'upload' ? '#ffffff' : 'transparent',
                          boxShadow: videoSource === 'upload' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                          borderRadius: '6px',
                          textTransform: 'none',
                          minWidth: 0,
                        }}
                      >
                        Upload File
                      </Button>
                    </Box>
                  </Box>

                  {videoSource === 'url' ? (
                    <>
                      <Typography id="resource-url-hint" sx={{ fontSize: 11.5, color: '#6b7280', mb: 0.5 }}>
                        Must start with https:// (for example, YouTube, Vimeo, or direct MP4 link)
                      </Typography>
                      <TextField
                        id="resource-url"
                        type="url"
                        fullWidth
                        size="small"
                        required
                        placeholder="https://"
                        value={form.url}
                        onChange={(e) => handleUrlInputChange(e.target.value)}
                        onBlur={() => markTouched('url')}
                        error={Boolean(showFieldError('url'))}
                        slotProps={{
                          htmlInput: {
                            maxLength: 500,
                            pattern: 'https://.*',
                            'aria-describedby': 'resource-url-hint',
                            'aria-errormessage': showFieldError('url') ? 'resource-url-error' : undefined,
                            'aria-invalid': Boolean(showFieldError('url')),
                          },
                        }}
                        sx={fieldSx}
                      />
                      <FieldErrorText id="resource-url-error" message={showFieldError('url')} />
                    </>
                  ) : (
                    <Box>
                      <input
                        id="video-file-input"
                        type="file"
                        hidden
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          handleVideoFileChange(file);
                        }}
                      />
                      {videoFile ? (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1.5,
                            border: '1px solid #1D9E75',
                            borderRadius: '10px',
                            bgcolor: '#f0fdf4',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                            <MovieIcon sx={{ color: '#1D9E75', fontSize: 24, flexShrink: 0 }} />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {videoFile.name}
                              </Typography>
                              <Typography sx={{ fontSize: '11px', color: '#6b7280' }}>
                                {formatFileSize(videoFile.size)} · Ready to upload
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            <Button
                              component="label"
                              htmlFor="video-file-input"
                              size="small"
                              sx={{ textTransform: 'none', fontSize: '12px', color: '#1D9E75', minWidth: 0, px: 1 }}
                            >
                              Change
                            </Button>
                            <IconButton
                              size="small"
                              onClick={() => handleVideoFileChange(null)}
                              sx={{ color: '#6b7280' }}
                            >
                              <ClearIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Box>
                        </Box>
                      ) : editingItem?.video_path ? (
                        <Box
                          sx={{
                            p: 1.5,
                            border: '1px solid #d1d5db',
                            borderRadius: '10px',
                            bgcolor: '#f9fafb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                            <CheckCircleIcon sx={{ color: '#1D9E75', fontSize: 20, flexShrink: 0 }} />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: '#374151' }}>
                                Existing video stored on clinic server
                              </Typography>
                              <Typography sx={{ fontSize: '11px', color: '#6b7280' }}>
                                Select a new file to replace it, or leave as is.
                              </Typography>
                            </Box>
                          </Box>
                          <Button
                            component="label"
                            htmlFor="video-file-input"
                            variant="outlined"
                            size="small"
                            startIcon={<CloudUploadIcon sx={{ fontSize: 14 }} />}
                            sx={{
                              textTransform: 'none',
                              fontSize: '11.5px',
                              borderColor: '#d1d5db',
                              color: '#374151',
                              borderRadius: '8px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Replace Video
                          </Button>
                        </Box>
                      ) : (
                        <Box
                          component="label"
                          htmlFor="video-file-input"
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1.5px dashed #cbd5e1',
                            borderRadius: '10px',
                            py: 2.5,
                            px: 2,
                            bgcolor: '#f9fafb',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: '#1D9E75',
                              bgcolor: '#f0fdf4',
                            },
                          }}
                        >
                          <CloudUploadIcon sx={{ fontSize: 28, color: '#1D9E75', mb: 0.5 }} />
                          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                            Click to upload video file
                          </Typography>
                          <Typography sx={{ fontSize: '11.5px', color: '#6b7280', mt: 0.25 }}>
                            MP4, WebM, or QuickTime (MOV) · Max 100MB
                          </Typography>
                        </Box>
                      )}
                      <FieldErrorText id="resource-video-file-error" message={videoFileError || showFieldError('video_file')} />
                    </Box>
                  )}
                </Box>
              ) : (
                <Box>
                  <Typography
                    component="label"
                    htmlFor="resource-url"
                    sx={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block' }}
                  >
                    HTTPS URL *
                  </Typography>
                  <Typography id="resource-url-hint" sx={{ fontSize: 11.5, color: '#6b7280', mb: 0.5 }}>
                    Must start with https:// (for example, https://doh.gov.ph/...)
                  </Typography>
                  <TextField
                    id="resource-url"
                    type="url"
                    fullWidth
                    size="small"
                    required
                    placeholder="https://"
                    value={form.url}
                    onChange={(e) => handleUrlInputChange(e.target.value)}
                    onBlur={() => markTouched('url')}
                    error={Boolean(showFieldError('url'))}
                    slotProps={{
                      htmlInput: {
                        maxLength: 500,
                        pattern: 'https://.*',
                        'aria-describedby': 'resource-url-hint',
                        'aria-errormessage': showFieldError('url') ? 'resource-url-error' : undefined,
                        'aria-invalid': Boolean(showFieldError('url')),
                      },
                    }}
                    sx={fieldSx}
                  />
                  <FieldErrorText id="resource-url-error" message={showFieldError('url')} />
                </Box>
              )}

              <Box>
                <Typography
                  component="label"
                  htmlFor="resource-title"
                  sx={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block' }}
                >
                  Title *
                </Typography>
                <Typography id="resource-title-hint" sx={{ fontSize: 11.5, color: '#6b7280', mb: 0.5 }}>
                  Required — maximum 120 characters
                </Typography>
                <TextField
                  id="resource-title"
                  fullWidth
                  size="small"
                  required
                  placeholder={
                    form.type === 'video'
                      ? 'e.g. What to expect at your first ABTC visit'
                      : 'e.g. DOH Rabies Prevention Program'
                  }
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  onBlur={() => markTouched('title')}
                  error={Boolean(showFieldError('title'))}
                  slotProps={{
                    htmlInput: {
                      maxLength: 120,
                      'aria-describedby': 'resource-title-hint',
                      'aria-errormessage': showFieldError('title') ? 'resource-title-error' : undefined,
                      'aria-invalid': Boolean(showFieldError('title')),
                    },
                  }}
                  sx={fieldSx}
                />
                <FieldErrorText id="resource-title-error" message={showFieldError('title')} />
              </Box>

              <Box>
                <Typography
                  component="label"
                  htmlFor="resource-subtitle"
                  sx={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block' }}
                >
                  Description (optional)
                </Typography>
                <Typography id="resource-subtitle-hint" sx={{ fontSize: 11.5, color: '#6b7280', mb: 0.5 }}>
                  Optional short description shown below the title (maximum 160 characters)
                </Typography>
                <TextField
                  id="resource-subtitle"
                  fullWidth
                  size="small"
                  placeholder="Optional description..."
                  value={form.subtitle}
                  onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                  onBlur={() => markTouched('subtitle')}
                  error={Boolean(showFieldError('subtitle'))}
                  slotProps={{
                    htmlInput: {
                      maxLength: 160,
                      'aria-describedby': 'resource-subtitle-hint',
                      'aria-errormessage': showFieldError('subtitle') ? 'resource-subtitle-error' : undefined,
                      'aria-invalid': Boolean(showFieldError('subtitle')),
                    },
                  }}
                  sx={fieldSx}
                />
                <FieldErrorText id="resource-subtitle-error" message={showFieldError('subtitle')} />
              </Box>

              {form.type === 'video' && (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 140px' },
                    gap: 1.5,
                    alignItems: 'start',
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                      <Typography
                        component="label"
                        sx={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block' }}
                      >
                        Thumbnail Image
                      </Typography>
                      <Box sx={{ display: 'flex', bgcolor: '#f3f4f6', p: 0.5, borderRadius: '8px', gap: 0.5 }}>
                        <Button
                          size="small"
                          onClick={() => setThumbnailSource('url')}
                          startIcon={<LinkIcon sx={{ fontSize: 13 }} />}
                          sx={{
                            py: 0.2,
                            px: 0.8,
                            fontSize: '11px',
                            fontWeight: thumbnailSource === 'url' ? 600 : 500,
                            color: thumbnailSource === 'url' ? '#111827' : '#6b7280',
                            bgcolor: thumbnailSource === 'url' ? '#ffffff' : 'transparent',
                            boxShadow: thumbnailSource === 'url' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                            borderRadius: '6px',
                            textTransform: 'none',
                            minWidth: 0,
                          }}
                        >
                          Auto / URL
                        </Button>
                        <Button
                          size="small"
                          onClick={() => setThumbnailSource('upload')}
                          startIcon={<ImageIcon sx={{ fontSize: 13 }} />}
                          sx={{
                            py: 0.2,
                            px: 0.8,
                            fontSize: '11px',
                            fontWeight: thumbnailSource === 'upload' ? 600 : 500,
                            color: thumbnailSource === 'upload' ? '#111827' : '#6b7280',
                            bgcolor: thumbnailSource === 'upload' ? '#ffffff' : 'transparent',
                            boxShadow: thumbnailSource === 'upload' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                            borderRadius: '6px',
                            textTransform: 'none',
                            minWidth: 0,
                          }}
                        >
                          Upload File
                        </Button>
                      </Box>
                    </Box>

                    {thumbnailSource === 'url' ? (
                      <>
                        <Typography id="resource-thumbnail-hint" sx={{ fontSize: 11.5, color: '#6b7280', mb: 0.5 }}>
                          https:// image URL. Leave blank to auto-detect YouTube thumbnail.
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
                          slotProps={{
                            htmlInput: {
                              maxLength: 500,
                              pattern: 'https://.*',
                              'aria-describedby': 'resource-thumbnail-hint',
                              'aria-errormessage': showFieldError('thumbnail_url')
                                ? 'resource-thumbnail-error'
                                : undefined,
                              'aria-invalid': Boolean(showFieldError('thumbnail_url')),
                            },
                          }}
                          sx={fieldSx}
                        />
                        <FieldErrorText id="resource-thumbnail-error" message={showFieldError('thumbnail_url')} />
                      </>
                    ) : (
                      <Box>
                        <input
                          id="thumb-file-input"
                          type="file"
                          hidden
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            handleThumbnailFileChange(file);
                          }}
                        />
                        {thumbnailFile || thumbnailPreviewUrl ? (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              p: 1,
                              border: '1px solid #1D9E75',
                              borderRadius: '10px',
                              bgcolor: '#f0fdf4',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                              {thumbnailPreviewUrl && (
                                <Box
                                  component="img"
                                  src={thumbnailPreviewUrl}
                                  alt=""
                                  sx={{ width: 44, height: 32, borderRadius: '6px', objectFit: 'cover' }}
                                />
                              )}
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {thumbnailFile ? thumbnailFile.name : 'Custom thumbnail'}
                                </Typography>
                                {thumbnailFile && (
                                  <Typography sx={{ fontSize: '11px', color: '#6b7280' }}>
                                    {formatFileSize(thumbnailFile.size)}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => {
                                handleThumbnailFileChange(null);
                                setRemoveThumbnail(true);
                              }}
                              sx={{ color: '#6b7280' }}
                            >
                              <ClearIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Box>
                        ) : editingItem?.thumbnail_path && !removeThumbnail ? (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              p: 1,
                              border: '1px solid #d1d5db',
                              borderRadius: '10px',
                              bgcolor: '#f9fafb',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                              {editingItem.thumbnail_url && (
                                <Box
                                  component="img"
                                  src={editingItem.thumbnail_url}
                                  alt=""
                                  sx={{ width: 44, height: 32, borderRadius: '6px', objectFit: 'cover' }}
                                />
                              )}
                              <Typography sx={{ fontSize: '11.5px', color: '#374151' }}>
                                Uploaded thumbnail on server
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Button
                                component="label"
                                htmlFor="thumb-file-input"
                                size="small"
                                sx={{ textTransform: 'none', fontSize: '11.5px', color: '#1D9E75' }}
                              >
                                Change
                              </Button>
                              <IconButton
                                size="small"
                                onClick={() => setRemoveThumbnail(true)}
                                sx={{ color: '#6b7280' }}
                              >
                                <ClearIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Box>
                          </Box>
                        ) : (
                          <Box
                            component="label"
                            htmlFor="thumb-file-input"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 1,
                              border: '1.5px dashed #cbd5e1',
                              borderRadius: '10px',
                              py: 1.5,
                              px: 1.5,
                              bgcolor: '#f9fafb',
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'all 0.2s',
                              '&:hover': {
                                borderColor: '#1D9E75',
                                bgcolor: '#f0fdf4',
                              },
                            }}
                          >
                            <ImageIcon sx={{ fontSize: 20, color: '#1D9E75' }} />
                            <Box>
                              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                                Choose thumbnail image
                              </Typography>
                              <Typography sx={{ fontSize: '10.5px', color: '#6b7280' }}>
                                JPG, PNG, WebP · Max 5MB
                              </Typography>
                            </Box>
                          </Box>
                        )}
                        <FieldErrorText id="resource-thumbnail-file-error" message={showFieldError('thumbnail_file')} />
                      </Box>
                    )}
                  </Box>

                  <Box>
                    <Typography
                      component="label"
                      htmlFor="resource-duration"
                      sx={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block' }}
                    >
                      Duration Label
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
                      slotProps={{
                        htmlInput: {
                          maxLength: 10,
                          pattern: '\\d{1,2}:[0-5]\\d',
                          'aria-describedby': 'resource-duration-hint',
                          'aria-errormessage': showFieldError('duration_label')
                            ? 'resource-duration-error'
                            : undefined,
                          'aria-invalid': Boolean(showFieldError('duration_label')),
                        },
                      }}
                      sx={fieldSx}
                    />
                    <FieldErrorText id="resource-duration-error" message={showFieldError('duration_label')} />
                  </Box>
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, pt: 0.5 }}>
                <Box sx={{ width: 140 }}>
                  <Typography
                    component="label"
                    htmlFor="resource-sort-order"
                    sx={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', mb: 0.5 }}
                  >
                    Display Order
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
                    slotProps={{
                      htmlInput: {
                        min: 0,
                        max: 65535,
                        'aria-errormessage': showFieldError('sort_order') ? 'resource-sort-order-error' : undefined,
                        'aria-invalid': Boolean(showFieldError('sort_order')),
                      },
                    }}
                    sx={fieldSx}
                  />
                  <FieldErrorText id="resource-sort-order-error" message={showFieldError('sort_order')} />
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
                      Active Status (Published)
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
                Mobile App Live Preview
              </Typography>

              <Box
                sx={{
                  mb: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  maxWidth: 360,
                  mx: 'auto',
                }}
              >
                <Typography sx={{ fontSize: '11px', fontWeight: 500, color: '#9ca3af', letterSpacing: '0.06em' }}>
                  LEARN MORE
                </Typography>
              </Box>

              <MobileCardLivePreview
                form={form}
                overrideThumbnailUrl={
                  thumbnailPreviewUrl ||
                  (form.type === 'video' && thumbnailSource === 'upload' && !removeThumbnail && editingItem?.thumbnail_path
                    ? editingItem.thumbnail_url
                    : null)
                }
                overrideVideoUrl={
                  videoPreviewUrl ||
                  (form.type === 'video' && !videoFile && editingItem?.video_path ? editingItem.url : null)
                }
              />

              <Typography sx={{ fontSize: '11.5px', color: '#6b7280', mt: 1.75, lineHeight: 1.45 }}>
                Click or tap this preview card anytime to test inline playback. In the mobile app, patients can play it directly in their feed (YouTube style) or tap fullscreen.
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
            {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Resource'}
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
    </>
  );
}

export default function PatientAppResourcesPage() {
  return (
    <Box sx={{ px: { xs: 1, sm: 3 }, pb: 5, maxWidth: 1240, mx: 'auto' }}>
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
            Patient App Resources
          </Typography>
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mt: 0.25 }}>
            <Box
              component={RouterLink}
              to={ROUTES.DASHBOARD}
              sx={{ color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}
            >
              Dashboard
            </Box>
            {' / '}
            <Box
              component={RouterLink}
              to={ROUTES.CLINIC_SETUP.INFO}
              sx={{ color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}
            >
              Clinic Information
            </Box>
            {' / Patient App Resources'}
          </Typography>
        </Box>
      </Box>

      <PatientAppResourcesSection embedded={false} />
    </Box>
  );
}
