import React, { useState, useMemo } from 'react';

export interface CalendarEvent {
  date: string; // YYYY-MM-DD
  title: string;
  type: 'vaccine' | 'bite' | 'queue';
  time?: string;
  patientName?: string;
}

interface AdminCalendarCardProps {
  events?: CalendarEvent[];
  onSelectDate?: (dateStr: string) => void;
  selectedDate?: string;
}

export const AdminCalendarCard: React.FC<AdminCalendarCardProps> = ({
  events = [],
  onSelectDate,
  selectedDate: propSelectedDate,
}) => {
  const today = useMemo(() => new Date(), []);
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [internalSelectedDate, setInternalSelectedDate] = useState<string>(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const activeSelectedDate = propSelectedDate || internalSelectedDate;

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const handleTodayClick = () => {
    const newMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setCurrentMonthDate(newMonth);
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    setInternalSelectedDate(todayStr);
    onSelectDate?.(todayStr);
  };

  // Calendar Grid Calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      day: number;
      monthType: 'prev' | 'current' | 'next';
      dateStr: string;
      isToday: boolean;
      isSelected: boolean;
      events: CalendarEvent[];
    }> = [];

    // Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        monthType: 'prev',
        dateStr,
        isToday: false,
        isSelected: dateStr === activeSelectedDate,
        events: events.filter((e) => e.date === dateStr),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === d;

      days.push({
        day: d,
        monthType: 'current',
        dateStr,
        isToday,
        isSelected: dateStr === activeSelectedDate,
        events: events.filter((e) => e.date === dateStr),
      });
    }

    // Next month leading days (fill up to complete weeks)
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remainingCells; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        monthType: 'next',
        dateStr,
        isToday: false,
        isSelected: dateStr === activeSelectedDate,
        events: events.filter((e) => e.date === dateStr),
      });
    }

    return days;
  }, [year, month, today, activeSelectedDate, events]);

  const handleSelectDay = (dateStr: string) => {
    setInternalSelectedDate(dateStr);
    onSelectDate?.(dateStr);
  };

  // Selected date events
  const selectedDayEvents = useMemo(() => {
    return events.filter((e) => e.date === activeSelectedDate);
  }, [events, activeSelectedDate]);

  const formattedSelectedDate = useMemo(() => {
    try {
      const [y, m, d] = activeSelectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return activeSelectedDate;
    }
  }, [activeSelectedDate]);

  return (
    <div
      style={{
        background: 'var(--card-bg, #ffffff)',
        borderRadius: 16,
        border: '1px solid var(--card-border, #e5e7eb)',
        padding: '20px 22px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 380,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-h, #111827)',
                letterSpacing: '-0.2px',
              }}
            >
              {monthNames[month]} {year}
            </h3>
            <span style={{ fontSize: 11, color: 'var(--text-secondary, #6b7280)' }}>
              ABTC Clinical Schedule
            </span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={handleTodayClick}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 6,
              border: '1px solid var(--card-border, #e5e7eb)',
              background: 'var(--bg-secondary, #f9fafb)',
              color: 'var(--text, #374151)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Today
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous Month"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid var(--card-border, #e5e7eb)',
              background: 'var(--bg-secondary, #f9fafb)',
              color: 'var(--text, #374151)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next Month"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid var(--card-border, #e5e7eb)',
              background: 'var(--bg-secondary, #f9fafb)',
              color: 'var(--text, #374151)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          textAlign: 'center',
          gap: 4,
          marginBottom: 6,
        }}
      >
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w, idx) => (
          <span
            key={idx}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: idx === 0 || idx === 6 ? '#94a3b8' : 'var(--text-secondary, #6b7280)',
              padding: '2px 0',
              textTransform: 'uppercase',
            }}
          >
            {w}
          </span>
        ))}
      </div>

      {/* Calendar Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
          flex: 1,
        }}
      >
        {calendarDays.map((item, idx) => {
          const isSelected = item.isSelected;
          const isCurrentMonth = item.monthType === 'current';
          const hasEvents = item.events.length > 0;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectDay(item.dateStr)}
              style={{
                aspectRatio: '1',
                borderRadius: 8,
                border: item.isToday && !isSelected
                  ? '1.5px solid #10b981'
                  : isSelected
                  ? '1.5px solid #059669'
                  : '1px solid transparent',
                background: isSelected
                  ? '#10b981'
                  : item.isToday
                  ? 'rgba(16, 185, 129, 0.08)'
                  : 'transparent',
                color: isSelected
                  ? '#ffffff'
                  : isCurrentMonth
                  ? 'var(--text, #1f2937)'
                  : 'var(--text-secondary, #9ca3af)',
                opacity: isCurrentMonth ? 1 : 0.45,
                fontWeight: isSelected || item.isToday ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transition: 'all 0.15s ease-in-out',
                padding: 0,
              }}
            >
              <span>{item.day}</span>
              {hasEvents && (
                <div
                  style={{
                    display: 'flex',
                    gap: 2,
                    marginTop: 2,
                    position: 'absolute',
                    bottom: 3,
                  }}
                >
                  {item.events.slice(0, 3).map((ev, evIdx) => (
                    <span
                      key={evIdx}
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: isSelected
                          ? '#ffffff'
                          : ev.type === 'vaccine'
                          ? '#10b981'
                          : ev.type === 'bite'
                          ? '#ef4444'
                          : '#3b82f6',
                      }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Agenda Box */}
      <div
        style={{
          marginTop: 14,
          padding: '10px 12px',
          borderRadius: 10,
          background: 'var(--bg-secondary, #f8fafc)',
          border: '1px solid var(--card-border, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-h, #111827)' }}>
            {formattedSelectedDate}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 999,
              background: selectedDayEvents.length > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(156, 163, 175, 0.15)',
              color: selectedDayEvents.length > 0 ? '#059669' : '#6b7280',
            }}
          >
            {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'activity' : 'activities'}
          </span>
        </div>

        {selectedDayEvents.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 60, overflowY: 'auto' }}>
            {selectedDayEvents.map((ev, i) => (
              <div
                key={i}
                style={{
                  fontSize: 11,
                  color: 'var(--text, #374151)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: ev.type === 'vaccine' ? '#10b981' : ev.type === 'bite' ? '#ef4444' : '#3b82f6',
                  }}
                />
                <span style={{ fontWeight: 600 }}>{ev.time ? `${ev.time} · ` : ''}{ev.title}</span>
                {ev.patientName && <span style={{ color: 'var(--text-secondary, #6b7280)' }}>({ev.patientName})</span>}
              </div>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text-secondary, #94a3b8)', fontStyle: 'italic' }}>
            No scheduled vaccinations or appointments for this day.
          </span>
        )}
      </div>
    </div>
  );
};
