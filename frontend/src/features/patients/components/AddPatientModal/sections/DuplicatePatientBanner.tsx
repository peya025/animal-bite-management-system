import React from 'react';
import type { DuplicatePatientMatch } from '../../../types';

interface DuplicatePatientBannerProps {
  matches: DuplicatePatientMatch[];
  hasExactMatch: boolean;
  checking?: boolean;
  confirmedDifferentPerson: boolean;
  onConfirmDifferentPersonChange: (checked: boolean) => void;
  onSelectExistingPatient?: (patientId: number) => void;
  highlightConfirmation?: boolean;
}

const formatReadableDate = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getInitials = (firstName?: string | null, lastName?: string | null): string => {
  const first = (firstName || '').trim().charAt(0).toUpperCase();
  const last = (lastName || '').trim().charAt(0).toUpperCase();
  return `${first}${last}` || 'PT';
};

const formatAddress = (barangay?: string | null, municipality?: string | null): string => {
  const brgy = (barangay || '').trim();
  const mun = (municipality || '').trim();
  const formattedBrgy = brgy
    ? /^(brgy\.?|barangay)\b/i.test(brgy)
      ? `Brgy. ${brgy}`
      : `Brgy. ${brgy}`
    : '';
  return [formattedBrgy, mun].filter(Boolean).join(', ') || '—';
};

export const DuplicatePatientBanner: React.FC<DuplicatePatientBannerProps> = ({
  matches,
  hasExactMatch,
  checking = false,
  confirmedDifferentPerson,
  onConfirmDifferentPersonChange,
  onSelectExistingPatient,
  highlightConfirmation = false,
}) => {
  if (matches.length === 0 && !checking) {
    return null;
  }

  if (matches.length === 0 && checking) {
    return (
      <div
        aria-live="polite"
        style={{
          gridColumn: '1 / -1',
          padding: '10px 14px',
          borderRadius: 10,
          background: 'var(--bg-secondary, #f8fafc)',
          border: '1px solid var(--border-color, #e2e8f0)',
          fontSize: 12.5,
          color: 'var(--text-secondary, #64748b)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>Checking clinic registry for existing patient records...</span>
      </div>
    );
  }

  const hasHighMatch = matches.some((m) => m.match_tier === 'high');
  const primaryTier: 'exact' | 'high' | 'homonym' = hasExactMatch
    ? 'exact'
    : hasHighMatch
      ? 'high'
      : 'homonym';

  const accent =
    primaryTier === 'exact'
      ? {
          stripe: '#ef4444',
          iconBg: '#fef2f2',
          iconColor: '#dc2626',
          title: 'Possible duplicate patient found',
          subtitle:
            matches.length === 1
              ? '1 existing record matches this name and birthdate. Verify with the patient first.'
              : `${matches.length} existing records match this name. Verify with the patient first.`,
        }
      : primaryTier === 'high'
        ? {
            stripe: '#f59e0b',
            iconBg: '#fef3c7',
            iconColor: '#d97706',
            title: 'Possible duplicate patient found',
            subtitle:
              matches.length === 1
                ? '1 existing record matches this name. Verify with the patient first.'
                : `${matches.length} existing records match this name. Verify with the patient first.`,
          }
        : {
            stripe: '#f59e0b',
            iconBg: '#fef3c7',
            iconColor: '#d97706',
            title: 'Possible duplicate patient found',
            subtitle:
              matches.length === 1
                ? '1 existing record shares this name. Verify with the patient first.'
                : `${matches.length} existing records share this name. Verify with the patient first.`,
          };

  return (
    <div
      role="region"
      aria-label="Duplicate patient check results"
      style={{
        gridColumn: '1 / -1',
        background: 'var(--card-bg-solid, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderLeft: `4px solid ${accent.stripe}`,
        borderRadius: 12,
        padding: '20px 22px',
        boxShadow: highlightConfirmation
          ? '0 0 0 3px rgba(239, 68, 68, 0.2)'
          : '0 1px 3px rgba(15, 23, 42, 0.04)',
        transition: 'box-shadow 0.2s ease',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: accent.iconBg,
              color: accent.iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--text-h, #0f172a)',
                lineHeight: 1.3,
              }}
            >
              {accent.title}
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-secondary, #64748b)',
                marginTop: 2,
                lineHeight: 1.4,
              }}
            >
              {accent.subtitle}
            </div>
          </div>
        </div>

        {checking && (
          <span
            style={{
              fontSize: 11.5,
              color: 'var(--text-secondary, #64748b)',
              whiteSpace: 'nowrap',
              fontWeight: 500,
            }}
          >
            Updating...
          </span>
        )}
      </div>

      {/* Match Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {matches.map((match) => {
          const initials = getInitials(match.first_name, match.last_name);
          const sourceLabel = match.has_mobile_account ? 'Mobile account' : 'Walk-in';
          const dobDisplay = match.date_of_birth
            ? `${formatReadableDate(match.date_of_birth)}${typeof match.age === 'number' ? ` (${match.age} yrs)` : ''}`
            : 'Not recorded';

          return (
            <div
              key={match.patient_id}
              style={{
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: 12,
                background: 'var(--card-bg-solid, #ffffff)',
                overflow: 'hidden',
              }}
            >
              {/* Card Top Identity Row */}
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--border-color, #f1f5f9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: '#d1fae5',
                      color: '#065f46',
                      fontSize: 13.5,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--text-h, #0f172a)',
                        lineHeight: 1.3,
                      }}
                    >
                      {match.full_name}
                    </div>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: 'var(--text-secondary, #64748b)',
                        marginTop: 2,
                      }}
                    >
                      {match.patient_number} · {sourceLabel}
                    </div>
                  </div>
                </div>

                {/* Clinical Status Pill */}
                {match.has_completed_primary ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 12px',
                      borderRadius: 999,
                      background: '#ecfdf5',
                      color: '#047857',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    PEP completed
                  </span>
                ) : match.active_episodes_count > 0 ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 12px',
                      borderRadius: 999,
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="m18 2 4 4" />
                      <path d="m17 7 3-3" />
                      <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
                      <path d="m9 11 4 4" />
                      <path d="m5 19-3 3" />
                      <path d="m14 4 6 6" />
                    </svg>
                    Active PEP case
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 12px',
                      borderRadius: 999,
                      background: '#f1f5f9',
                      color: '#475569',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Registered record
                  </span>
                )}
              </div>

              {/* Card Middle 2x2 Details Grid */}
              <div
                style={{
                  padding: '14px 18px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '14px 24px',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 3 }}>
                    Date of birth
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-h, #0f172a)' }}>
                    {dobDisplay}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 3 }}>
                    Sex
                  </div>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: 'var(--text-h, #0f172a)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {match.gender || '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 3 }}>
                    Address
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-h, #0f172a)' }}>
                    {formatAddress(match.address_barangay, match.address_municipality)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 3 }}>
                    Last visit
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-h, #0f172a)' }}>
                    {match.last_visit_date ? formatReadableDate(match.last_visit_date) : 'No visit yet'}
                  </div>
                </div>

                {match.mother_maiden_name && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 3 }}>
                      Mother’s maiden name
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-h, #0f172a)' }}>
                      {match.mother_maiden_name}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Bottom Action Bar */}
              {onSelectExistingPatient && (
                <div
                  style={{
                    padding: '12px 18px',
                    background: 'var(--bg-secondary, #f8fafc)',
                    borderTop: '1px solid var(--border-color, #f1f5f9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12.5,
                      color: 'var(--text-secondary, #64748b)',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    Same person? Reuse this record.
                  </span>

                  <button
                    type="button"
                    onClick={() => onSelectExistingPatient(match.patient_id)}
                    style={{
                      minHeight: 38,
                      height: 38,
                      padding: '0 16px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      background: 'var(--card-bg-solid, #ffffff)',
                      color: 'var(--text-h, #0f172a)',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'background-color 0.15s ease, border-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.borderColor = '#94a3b8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--card-bg-solid, #ffffff)';
                      e.currentTarget.style.borderColor = 'var(--border-color, #cbd5e1)';
                    }}
                  >
                    <span>Use existing record</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* OR Divider */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '16px 0',
        }}
      >
        <div style={{ flex: 1, height: 1, background: 'var(--border-color, #e2e8f0)' }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#94a3b8',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          OR
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border-color, #e2e8f0)' }} />
      </div>

      {/* Confirmation Card */}
      <label
        style={{
          padding: '14px 16px',
          borderRadius: 10,
          background: highlightConfirmation ? '#fef2f2' : 'var(--card-bg-solid, #ffffff)',
          border: highlightConfirmation
            ? '1.5px solid #ef4444'
            : '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          cursor: 'pointer',
          transition: 'border-color 0.15s ease, background-color 0.15s ease',
        }}
      >
        <input
          type="checkbox"
          checked={confirmedDifferentPerson}
          onChange={(e) => onConfirmDifferentPersonChange(e.target.checked)}
          style={{
            width: 18,
            height: 18,
            marginTop: 2,
            accentColor: '#047857',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />
        <div>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: 'var(--text-h, #0f172a)',
              lineHeight: 1.35,
            }}
          >
            This is a different patient. Register as new.
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: 'var(--text-secondary, #64748b)',
              marginTop: 2,
              lineHeight: 1.4,
            }}
          >
            I verified birthdate, middle name, barangay, and mother’s maiden name with the patient.
          </div>
        </div>
      </label>
    </div>
  );
};
