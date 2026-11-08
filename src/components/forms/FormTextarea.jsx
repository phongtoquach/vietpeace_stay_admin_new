import React from 'react';

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
  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={id || name} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <textarea
        id={id || name}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`form-textarea ${error ? 'error' : ''}`}
        {...props}
      />
      {error && <span className="form-error-text">{error}</span>}
      {!error && helperText && <span className="form-helper-text">{helperText}</span>}
    </div>
  );
}
