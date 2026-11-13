import { useId } from 'react';
import { FieldError } from './ValidatedForm';

export default function FormTextarea({
  label,
  id,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  helperText,
  rows = 3,
  disabled = false,
  className = '',
  ...props
}) {
  const generatedId = useId();
  const fieldName = name || id || generatedId;
  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={id || fieldName} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <FieldError name={fieldName} error={error} />
      <textarea
        id={id || fieldName}
        name={fieldName}
        data-validation-required={required || undefined}
        data-validation-label={typeof label === 'string' ? label : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `validation-error-${fieldName}` : undefined}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`form-textarea ${error ? 'error' : ''}`}
        {...props}
      />
      {!error && helperText && <span className="form-helper-text">{helperText}</span>}
    </div>
  );
}
