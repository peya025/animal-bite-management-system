import React, { useContext, useId } from 'react';
import { ConsultationErrors } from '../accessibility/consultationAccessibility';

interface FormFieldProps {
  id?: string;
  label: string;
  required?: boolean;
  error?: boolean;
  errorText?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

type ControlProps = React.HTMLProps<HTMLInputElement> & { children?: React.ReactNode };

export function FormField({ id, label, required, error, errorText, hint, className = '', children }: FormFieldProps) {
  const uid = useId();
  const errors = useContext(ConsultationErrors);
  const controls: React.ReactElement<ControlProps>[] = [];

  function collect(nodes: React.ReactNode) {
    React.Children.forEach(nodes, child => {
      if (!React.isValidElement<ControlProps>(child)) return;
      if (['input', 'select', 'textarea'].includes(String(child.type))) controls.push(child);
      else collect(child.props.children);
    });
  }
  collect(children);

  const first = controls[0];
  const rawId = id?.replace(/^field-/, '');
  const fieldKey = (rawId && errors[rawId] !== undefined)
    ? rawId
    : (first?.props.name || rawId);
  const message = errorText || (fieldKey ? errors[fieldKey] : undefined) || (rawId ? errors[rawId] : undefined);
  const invalid = Boolean(error || message);
  const isGroup = controls.length > 1;
  const labelId = uid + '-label';
  const controlId = first?.props.id || uid + '-input';
  const description = [hint ? uid + '-hint' : '', invalid && message ? uid + '-error' : ''].filter(Boolean).join(' ') || undefined;

  function decorate(nodes: React.ReactNode): React.ReactNode {
    return React.Children.map(nodes, child => {
      if (!React.isValidElement<ControlProps>(child)) return child;
      if (['input', 'select', 'textarea'].includes(String(child.type))) {
        return React.cloneElement(child, {
          id: child === first ? controlId : child.props.id,
          'aria-invalid': invalid || undefined,
          'aria-required': required && !isGroup || undefined,
          'aria-describedby': [child.props['aria-describedby'], description].filter(Boolean).join(' ') || undefined,
        });
      }
      return child.props.children ? React.cloneElement(child, {}, decorate(child.props.children)) : child;
    });
  }

  return (
    <div
      id={id}
      className={`fm-field ${invalid ? 'fm-field--error' : ''} ${className}`}
      role={isGroup ? (controls.every(control => control.props.type === 'radio') ? 'radiogroup' : 'group') : undefined}
      aria-labelledby={isGroup ? labelId : undefined}
      aria-required={isGroup && required ? true : undefined}
      style={invalid && isGroup ? { padding: '8px', border: '1.5px solid #ef4444', borderRadius: '8px', backgroundColor: '#fef2f2' } : undefined}
    >
      {isGroup ? (
        <span id={labelId} className="fm-label">
          {label}
          {required && <span aria-hidden="true">*</span>}
        </span>
      ) : (
        <label id={labelId} htmlFor={controlId} className="fm-label">
          {label}
          {required && <span aria-hidden="true">*</span>}
        </label>
      )}
      {decorate(children)}
      {hint && <span id={uid + '-hint'} className="registration-field-hint" style={{ fontFamily: "'Poppins', sans-serif" }}>{hint}</span>}
      {invalid && message && <span id={uid + '-error'} className="registration-field-error" style={{ fontFamily: "'Poppins', sans-serif" }}>{message}</span>}
    </div>
  );
}
