import { createContext, useContext, useState } from 'react';
import { getInputError } from './validation';
import './validation.css';

const FieldErrorsContext = createContext({});

export function FieldError({ name, error }) {
  const errors = useContext(FieldErrorsContext);
  const message = error || errors[name];
  return message ? <span id={`validation-error-${name}`} className="field-validation-error" role="alert">{message}</span> : null;
}

export default function ValidatedForm({ onSubmit, onChange, children, ...props }) {
  const [errors, setErrors] = useState({});

  function validate(event) {
    event.preventDefault();
    const inputs = [...event.currentTarget.elements].filter(input => input.name && !input.disabled && input.willValidate);
    const nextErrors = {};
    for (const input of inputs) {
      const message = getInputError(input);
      if (message) nextErrors[input.name] = message;
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (message) input.setAttribute('aria-describedby', `validation-error-${input.name}`);
      else input.removeAttribute('aria-describedby');
    }
    setErrors(nextErrors);
    const firstInvalid = inputs.find(input => nextErrors[input.name]);
    if (firstInvalid) {
      firstInvalid.focus();
      requestAnimationFrame(() => {
        const message = document.getElementById(`validation-error-${firstInvalid.name}`);
        (message || firstInvalid).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      return;
    }
    onSubmit?.(event);
  }

  function clearError(event) {
    const input = event.target;
    if (input.name) {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
      setErrors(previous => {
        if (!previous[input.name]) return previous;
        const next = { ...previous };
        delete next[input.name];
        return next;
      });
    }
    onChange?.(event);
  }

  return <FieldErrorsContext.Provider value={errors}><form {...props} noValidate onSubmit={validate} onChange={clearError}>{children}</form></FieldErrorsContext.Provider>;
}
