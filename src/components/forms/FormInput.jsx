import { useId } from 'react';
import { FieldError } from './ValidatedForm';

export default function FormInput({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  helperText,
  disabled = false,
  min,
  max,
  step,
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
      <input
        id={id || fieldName}
        name={fieldName}
        data-validation-required={required || undefined}
        data-validation-label={typeof label === 'string' ? label : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `validation-error-${fieldName}` : undefined}
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={`form-input ${error ? 'error' : ''}`}
        {...props}
      />
      {!error && helperText && <span className="form-helper-text">{helperText}</span>}
    </div>
  );
}
