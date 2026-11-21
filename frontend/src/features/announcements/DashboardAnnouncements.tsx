import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import {
  CampaignOutlined,
  ChevronLeft,
  ChevronRight,
  Close,
  PriorityHigh,
  ScheduleOutlined,
  SettingsOutlined,
} from '@mui/icons-material';
import { getPublishedAnnouncements } from './publishedAnnouncements';
import type { Announcement } from './types';

interface DashboardAnnouncementsProps {
  canManage?: boolean;
  onManage?: () => void;
}

const AUTO_SCROLL_INTERVAL_MS = 4500;

const formatAnnouncementDate = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function DashboardAnnouncements({
  canManage = false,
  onManage,
}: DashboardAnnouncementsProps) {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [detailItem, setDetailItem] = useState<Announcement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getPublishedAnnouncements(controller.signal)
      .then((list) => {
        setItems(list);
        setActive(0);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);

  const count = items?.length ?? 0;
  const safeIndex = count > 0 ? Math.min(active, count - 1) : 0;
  const currentItem = items?.[safeIndex];

  // Automatically scroll through slides when there are multiple announcements
  useEffect(() => {
    if (count <= 1 || paused || detailItem) return;
    const timer = window.setInterval(() => {
      setActive((prev) => (prev + 1) % count);
    }, AUTO_SCROLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [count, paused, detailItem]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (count <= 1) return;
    setActive((prev) => (prev - 1 + count) % count);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (count <= 1) return;
    setActive((prev) => (prev + 1) % count);
  };

  const placeholder = failed
    ? 'Announcements could not be loaded.'
    : items === null
    ? 'Loading announcements…'
    : 'No announcements posted right now.';

  // Slim fallback bar when loading / error / empty
  if (!items || !currentItem) {
    return (
      <Box
        component="section"
        aria-labelledby="dashboard-announcements-heading"
        sx={{
          width: '100%',
          minHeight: 110,
          borderRadius: '18px',
          border: '1px solid var(--border-glow)',
          bgcolor: 'var(--card-bg-solid)',
          px: 2.25,
          py: 1.75,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
            }}
          >
            <CampaignOutlined sx={{ fontSize: 19 }} />
          </Box>
          <Box>
            <Typography
              component="h2"
              id="dashboard-announcements-heading"
              sx={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h)', lineHeight: 1.2 }}
            >
              Announcements
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
              {placeholder}
            </Typography>
          </Box>
        </Stack>
        {canManage && onManage && items !== null && !failed && (
          <Button
            size="small"
            variant="outlined"
            onClick={onManage}
            startIcon={<SettingsOutlined sx={{ fontSize: 15 }} />}
            sx={{
              textTransform: 'none',
              borderRadius: '10px',
              fontSize: 12,
              fontWeight: 600,
              borderColor: '#10b981',
              color: '#059669',
            }}
          >
            Post an announcement
          </Button>
        )}
      </Box>
    );
  }

  const isUrgentCurrent = Boolean(currentItem.is_urgent);

  return (
    <>
      <Box
        component="section"
        aria-roledescription={count > 1 ? 'carousel' : undefined}
        aria-label="Clinic announcements"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        sx={{
          position: 'relative',
          width: '100%',
          minHeight: { xs: 185, sm: 200, md: 212 },
          height: '100%',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 4px 18px rgba(15, 23, 42, 0.10)',
          border: '1px solid',
          borderColor: isUrgentCurrent ? 'rgba(245, 158, 11, 0.45)' : 'rgba(16, 185, 129, 0.28)',
          transition: 'border-color 0.3s ease',
        }}
      >
        {/* Horizontal Auto-Scrolling Slide Track */}
        <Box
          aria-live="polite"
          sx={{
            display: 'flex',
            width: '100%',
            height: '100%',
            transform: `translateX(-${safeIndex * 100}%)`,
            transition: 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: 'transform',
          }}
        >
          {items.map((slide, idx) => {
            const isUrgent = Boolean(slide.is_urgent);
            const fallbackGradient = isUrgent
              ? 'linear-gradient(125deg, #9a3412 0%, #d97706 55%, #f59e0b 100%)'
              : 'linear-gradient(125deg, #064e3b 0%, #047857 52%, #10b981 100%)';

            return (
              <Box
                key={slide.id}
                role="group"
                aria-roledescription={count > 1 ? 'slide' : undefined}
                aria-label={count > 1 ? `Announcement ${idx + 1} of ${count}` : slide.title}
                aria-hidden={idx !== safeIndex}
                onClick={() => setDetailItem(slide)}
                sx={{
                  position: 'relative',
                  flex: '0 0 100%',
                  width: '100%',
                  height: '100%',
                  minHeight: { xs: 185, sm: 200, md: 212 },
                  cursor: 'pointer',
                  background: fallbackGradient,
                  overflow: 'hidden',
                  '&:hover .banner-bg-img': {
                    transform: 'scale(1.03)',
                  },
                }}
              >
                {/* Full-bleed background picture */}
                {slide.image_url && (
                  <Box
                    component="img"
                    className="banner-bg-img"
                    src={slide.image_url}
                    alt={slide.title}
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      transition: 'transform 0.5s ease',
                      display: 'block',
                    }}
                  />
                )}

                {/* Scrim gradient overlay for readability */}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: slide.image_url
                      ? 'linear-gradient(95deg, rgba(15, 23, 42, 0.84) 0%, rgba(15, 23, 42, 0.58) 52%, rgba(15, 23, 42, 0.22) 100%), linear-gradient(180deg, rgba(15, 23, 42, 0.28) 0%, rgba(15, 23, 42, 0.08) 45%, rgba(15, 23, 42, 0.68) 100%)'
                      : 'radial-gradient(circle at 85% 20%, rgba(255, 255, 255, 0.14) 0%, transparent 55%)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Top-left badge & date */}
                <Stack
                  direction="row"
                  sx={{
                    position: 'absolute',
                    top: 12,
                    left: 14,
                    right: canManage ? 130 : 70,
                    zIndex: 2,
                    alignItems: 'center',
                    gap: 0.75,
                    flexWrap: 'wrap',
                  }}
                >
                  <Chip
                    size="small"
                    icon={
                      isUrgent ? (
                        <PriorityHigh sx={{ fontSize: 13, color: '#fff !important' }} />
                      ) : (
                        <CampaignOutlined sx={{ fontSize: 14, color: '#fff !important' }} />
                      )
                    }
                    label={isUrgent ? 'Important' : 'Announcement'}
                    sx={{
                      height: 23,
                      fontSize: 11,
                      fontWeight: 700,
                      bgcolor: isUrgent ? 'rgba(217, 119, 6, 0.92)' : 'rgba(16, 185, 129, 0.88)',
                      color: '#ffffff',
                      backdropFilter: 'blur(6px)',
                      px: 0.4,
                    }}
                  />
                  {slide.created_at && (
                    <Stack
                      direction="row"
                      sx={{
                        alignItems: 'center',
                        gap: 0.4,
                        px: 0.9,
                        py: 0.25,
                        borderRadius: '999px',
                        bgcolor: 'rgba(15, 23, 42, 0.48)',
                        backdropFilter: 'blur(6px)',
                        color: 'rgba(255, 255, 255, 0.92)',
                        fontSize: 10.5,
                        fontWeight: 500,
                      }}
                    >
                      <ScheduleOutlined sx={{ fontSize: 12 }} />
                      <span>{formatAnnouncementDate(slide.created_at)}</span>
                    </Stack>
                  )}
                </Stack>

                {/* Announcement Details Overlay */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: count > 1 ? 52 : 16,
                    right: count > 1 ? 52 : 16,
                    bottom: count > 1 ? 30 : 14,
                    zIndex: 2,
                  }}
                >
                  <Typography
                    component="h2"
                    id={idx === safeIndex ? 'dashboard-announcements-heading' : undefined}
                    sx={{
                      fontSize: { xs: 16, sm: 18 },
                      fontWeight: 800,
                      color: '#ffffff',
                      lineHeight: 1.2,
                      mb: 0.4,
                      textShadow: '0 2px 10px rgba(0, 0, 0, 0.4)',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {slide.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: 12.5,
                      color: 'rgba(255, 255, 255, 0.92)',
                      lineHeight: 1.4,
                      mb: 1,
                      textShadow: '0 1px 6px rgba(0, 0, 0, 0.4)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {slide.message}
                  </Typography>
                  <Button
                    size="small"
                    variant="contained"
                    tabIndex={idx === safeIndex ? 0 : -1}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailItem(slide);
                    }}
                    sx={{
                      textTransform: 'none',
                      fontSize: 11.5,
                      fontWeight: 700,
                      borderRadius: '999px',
                      px: 1.5,
                      py: 0.35,
                      minHeight: 0,
                      bgcolor: 'rgba(255, 255, 255, 0.94)',
                      color: '#0f172a',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
                      '&:hover': {
                        bgcolor: '#ffffff',
                      },
                    }}
                  >
                    Read details →
                  </Button>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Top-right Counter & Admin Manage */}
        <Stack
          direction="row"
          sx={{
            position: 'absolute',
            top: 12,
            right: 14,
            zIndex: 3,
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          {count > 1 && (
            <Box
              sx={{
                px: 0.9,
                py: 0.25,
                borderRadius: '999px',
                bgcolor: 'rgba(15, 23, 42, 0.5)',
                backdropFilter: 'blur(6px)',
                color: '#ffffff',
                fontSize: 10.5,
                fontWeight: 600,
              }}
            >
              {safeIndex + 1} / {count}
            </Box>
          )}
          {canManage && onManage && (
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onManage();
              }}
              startIcon={<SettingsOutlined sx={{ fontSize: 13 }} />}
              sx={{
                textTransform: 'none',
                fontSize: 11,
                fontWeight: 600,
                color: '#ffffff',
                bgcolor: 'rgba(15, 23, 42, 0.5)',
                backdropFilter: 'blur(6px)',
                borderRadius: '999px',
                px: 1.1,
                py: 0.2,
                minWidth: 'auto',
                '&:hover': {
                  bgcolor: 'rgba(15, 23, 42, 0.75)',
                },
              }}
            >
              Manage
            </Button>
          )}
        </Stack>

        {/* Floating Left & Right Circular Arrow Buttons */}
        {count > 1 && (
          <>
            <IconButton
              aria-label="Previous announcement"
              onClick={handlePrev}
              sx={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 3,
                width: 34,
                height: 34,
                bgcolor: 'rgba(255, 255, 255, 0.92)',
                color: '#0f172a',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.22)',
                '&:hover': {
                  bgcolor: '#ffffff',
                  transform: 'translateY(-50%) scale(1.06)',
                },
                transition: 'transform 0.15s ease, background-color 0.15s ease',
              }}
            >
              <ChevronLeft sx={{ fontSize: 21 }} />
            </IconButton>

            <IconButton
              aria-label="Next announcement"
              onClick={handleNext}
              sx={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 3,
                width: 34,
                height: 34,
                bgcolor: 'rgba(255, 255, 255, 0.92)',
                color: '#0f172a',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.22)',
                '&:hover': {
                  bgcolor: '#ffffff',
                  transform: 'translateY(-50%) scale(1.06)',
                },
                transition: 'transform 0.15s ease, background-color 0.15s ease',
              }}
            >
              <ChevronRight sx={{ fontSize: 21 }} />
            </IconButton>
          </>
        )}

        {/* Bottom-Center Pagination Dots */}
        {count > 1 && (
          <Stack
            direction="row"
            sx={{
              position: 'absolute',
              bottom: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 3,
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            {items.map((slide, idx) => {
              const isCurrent = idx === safeIndex;
              return (
                <Box
                  key={slide.id}
                  component="button"
                  type="button"
                  aria-label={`Show announcement ${idx + 1}`}
                  aria-current={isCurrent ? 'true' : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActive(idx);
                  }}
                  sx={{
                    p: 0,
                    width: isCurrent ? 18 : 8,
                    height: 8,
                    borderRadius: '999px',
                    border: '1.5px solid #ffffff',
                    bgcolor: isCurrent ? 'transparent' : 'rgba(255, 255, 255, 0.85)',
                    cursor: 'pointer',
                    transition: 'width 0.2s ease, background-color 0.2s ease',
                    '&:hover': {
                      bgcolor: '#ffffff',
                    },
                  }}
                />
              );
            })}
          </Stack>
        )}
      </Box>

      {/* ── Full Announcement Detail Dialog ── */}
      <Dialog
        open={Boolean(detailItem)}
        onClose={() => setDetailItem(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '18px',
              bgcolor: 'var(--card-bg-solid, #ffffff)',
              color: 'var(--text-h)',
            },
          },
        }}
      >
        {detailItem && (
          <>
            <DialogTitle
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 2,
                pb: 1,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
                  {detailItem.is_urgent ? (
                    <Chip
                      size="small"
                      label="Important Notice"
                      sx={{
                        height: 22,
                        fontSize: 11,
                        fontWeight: 700,
                        bgcolor: 'rgba(217, 119, 6, 0.14)',
                        color: '#b45309',
                      }}
                    />
                  ) : (
                    <Chip
                      size="small"
                      label="Clinic Announcement"
                      sx={{
                        height: 22,
                        fontSize: 11,
                        fontWeight: 600,
                        bgcolor: 'rgba(16, 185, 129, 0.12)',
                        color: '#047857',
                      }}
                    />
                  )}
                  {detailItem.created_at && (
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                      Posted {formatAnnouncementDate(detailItem.created_at)}
                    </Typography>
                  )}
                  {detailItem.expires_on && (
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                      · Valid until {formatAnnouncementDate(detailItem.expires_on)}
                    </Typography>
                  )}
                </Stack>
                <Typography component="span" sx={{ fontSize: 18, fontWeight: 700, color: 'var(--text-h)' }}>
                  {detailItem.title}
                </Typography>
              </Box>
              <IconButton
                size="small"
                aria-label="Close announcement"
                onClick={() => setDetailItem(null)}
                sx={{ color: 'var(--text-secondary)' }}
              >
                <Close fontSize="small" />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: 'var(--table-row-border, #e2e8f0)' }}>
              {detailItem.image_url && (
                <Box
                  component="img"
                  src={detailItem.image_url}
                  alt={detailItem.title}
                  sx={{
                    width: '100%',
                    maxHeight: 360,
                    objectFit: 'contain',
                    borderRadius: '12px',
                    mb: 2,
                    bgcolor: 'rgba(15, 23, 42, 0.04)',
                  }}
                />
              )}
              <Typography
                variant="body2"
                sx={{
                  color: 'var(--text-h)',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                  lineHeight: 1.7,
                  fontSize: 14,
                }}
              >
                {detailItem.message}
              </Typography>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 1.5 }}>
              <Button
                onClick={() => setDetailItem(null)}
                variant="contained"
                sx={{
                  textTransform: 'none',
                  borderRadius: '10px',
                  fontWeight: 600,
                  bgcolor: '#059669',
                  '&:hover': { bgcolor: '#047857' },
                }}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
