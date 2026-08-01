import React from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ label, required, children }: FormFieldProps) {
  return (
    <div className="fm-field">
      <label className="fm-label">
        {label}
        {required && <span>*</span>}
      </label>
      {children}
    </div>
  );
}
