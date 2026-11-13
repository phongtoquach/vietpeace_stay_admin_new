export function getInputError(input) {
  const label = input.dataset.validationLabel || 'Trường này';
  const raw = String(input.value ?? '');
  const value = input.type === 'password' ? raw : raw.trim();
  if (input.validity.badInput) return `${label}: vui lòng nhập giá trị hợp lệ.`;
  const required = input.required || input.dataset.validationRequired === 'true';
  if (required && (input.validity.valueMissing || !value)) {
    return input.tagName === 'SELECT' ? `Vui lòng chọn ${label.toLowerCase()}.` : `Vui lòng nhập ${label.toLowerCase()}.`;
  }
  if (!value) return '';
  if (input.minLength > 0 && value.length < input.minLength) return `${label} phải có ít nhất ${input.minLength} ký tự.`;
  if (input.maxLength > 0 && value.length > input.maxLength) return `${label} không được vượt quá ${input.maxLength} ký tự.`;
  if (input.validity.typeMismatch) return input.type === 'email' ? 'Vui lòng nhập địa chỉ email hợp lệ.' : `${label}: vui lòng nhập đúng định dạng.`;
  if (input.validity.rangeUnderflow) return `${label} phải từ ${input.min} trở lên.`;
  if (input.validity.rangeOverflow) return `${label} không được vượt quá ${input.max}.`;
  if (input.validity.stepMismatch) return `${label}: vui lòng nhập đúng định dạng số được yêu cầu.`;
  if (input.validity.patternMismatch) return `${label}: vui lòng nhập đúng định dạng được yêu cầu.`;
  if (!input.validity.valid) return `${label}: vui lòng kiểm tra lại giá trị đã nhập.`;
  return '';
}
