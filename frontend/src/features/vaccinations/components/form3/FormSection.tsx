import React from 'react';

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  showDivider?: boolean;
}

export function FormSection({ title, children, showDivider = true }: FormSectionProps) {
  return (
    <section style={{ marginBottom: showDivider ? 24 : 0 }}>
      <h3
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text, #111827)',
          margin: '0 0 16px 0',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>
      {children}
      {showDivider && (
        <hr
          style={{
            border: 'none',
            borderBottom: '1px solid var(--border-color, #e5e7eb)',
            margin: '24px 0 0 0',
          }}
        />
      )}
    </section>
  );
}
