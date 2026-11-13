import { apiFetch } from './client.js';

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null || val === '' || val === 'all' || val === 'ALL') {
      continue;
    }
    qs.set(key, String(val));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export function formatCompactVND(amount) {
  const value = Number(amount || 0);
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(2).replace('.', ',')} tỷ`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1).replace('.', ',')} tr`;
  }
  return new Intl.NumberFormat('vi-VN').format(Math.round(value)) + ' đ';
}

export const financialReportsApi = {
  async getOverview(params = {}) {
    const payload = await apiFetch(`/financial-reports/overview${buildQuery(params)}`);
    return payload?.data;
  },

  async getAccommodationDetail(accommodationId, params = {}) {
    const payload = await apiFetch(
      `/financial-reports/accommodations/${accommodationId}${buildQuery(params)}`,
    );
    return payload?.data;
  },

  async upsertMonthlyLedger(accommodationId, body) {
    const payload = await apiFetch(`/financial-reports/accommodations/${accommodationId}/ledger`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return payload?.data;
  },

  async updateOperatingProfile(accommodationId, body) {
    const payload = await apiFetch(`/financial-reports/accommodations/${accommodationId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return payload?.data;
  },

  async getBonusPreview(params = {}) {
    const payload = await apiFetch(`/financial-reports/bonus-preview${buildQuery(params)}`);
    return payload?.data;
  },

  async approveBonuses(body) {
    const payload = await apiFetch('/financial-reports/bonus-approve', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return payload?.data;
  },

  async sendWarningEmail(accommodationId, body) {
    const payload = await apiFetch(
      `/financial-reports/accommodations/${accommodationId}/send-warning-email`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
    return payload?.data;
  },

  async getPaymentsLedger(params = {}) {
    const payload = await apiFetch(`/financial-reports/payments-ledger${buildQuery(params)}`);
    return payload?.data;
  },
};
