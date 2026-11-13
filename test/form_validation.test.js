import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getInputError } from '../src/components/forms/validation.js';

function field(overrides = {}) {
  return { tagName: 'INPUT', type: 'text', value: '', required: false, dataset: { validationLabel: 'Họ và tên' }, validity: { valid: true }, minLength: -1, maxLength: -1, ...overrides };
}
test('required and whitespace-only names produce an inline message', () => {
  assert.match(getInputError(field({ required: true, value: '  ' })), /Vui lòng nhập họ và tên/);
});
test('required shared fields work without enabling browser validation popups', () => {
  assert.match(getInputError(field({ dataset: { validationLabel: 'Tên điểm đến', validationRequired: 'true' } })), /tên điểm đến/);
});
test('missing selections ask the user to choose a value', () => {
  assert.match(getInputError(field({ tagName: 'SELECT', required: true })), /Vui lòng chọn/);
});
test('optional empty fields and numeric zero remain valid', () => {
  assert.equal(getInputError(field()), '');
  assert.equal(getInputError(field({ required: true, value: '0' })), '');
});
test('short reasons and long values retain their length checks', () => {
  assert.match(getInputError(field({ value: ' a ', minLength: 3 })), /ít nhất 3 ký tự/);
  assert.match(getInputError(field({ value: 'abcd', maxLength: 3 })), /vượt quá 3 ký tự/);
});
test('email format errors have a Vietnamese message', () => {
  assert.match(getInputError(field({ type: 'email', value: 'invalid', validity: { valid: false, typeMismatch: true } })), /email hợp lệ/);
});
test('range and pattern checks cannot be bypassed by noValidate', () => {
  assert.match(getInputError(field({ type: 'number', value: '-1', min: '0', validity: { valid: false, rangeUnderflow: true } })), /từ 0/);
  assert.match(getInputError(field({ value: 'invalid', validity: { valid: false, patternMismatch: true } })), /định dạng/);
});
test('password length counts the original characters', () => {
  assert.equal(getInputError(field({ type: 'password', value: ' 123456 ', minLength: 8 })), '');
});
