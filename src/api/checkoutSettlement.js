import { apiFetch } from './client.js';

const API_BASE =
  import.meta.env.VITE_ADMIN_API_BASE_URL || 'http://localhost:3002/api/admin';
export const BACKEND_ORIGIN = API_BASE.replace(/\/api\/admin\/?$/, '');

export function resolveEvidenceImageUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${BACKEND_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const CATEGORY_META = {
  MINIBAR_FB: { label: 'Minibar & Ẩm thực', shortLabel: 'Minibar', bg: '#E0F2FE', color: '#0369A1' },
  EXTRA_SERVICE: { label: 'Dịch vụ bổ sung', shortLabel: 'Dịch vụ', bg: '#EDE9FE', color: '#5B21B6' },
  SPECIAL_CLEANING: { label: 'Phí vệ sinh đặc biệt', shortLabel: 'Vệ sinh', bg: '#FEF3C7', color: '#92400E' },
  DAMAGE_COMPENSATION: { label: 'Bồi thường hư hỏng tài sản', shortLabel: 'Bồi thường', bg: '#FEE2E2', color: '#B91C1C' },
  ROOM_ASSET: { label: 'Tài sản phòng (Bồi thường)', shortLabel: 'Tài sản', bg: '#FEE2E2', color: '#B91C1C' },
};

export const COMPENSATION_MODE_META = {
  NONE: { label: 'Không áp dụng' },
  REPAIR: { label: 'Mức 1 · Sửa chữa / Thay linh kiện thực tế' },
  DEPRECIATED_REPLACE: { label: 'Mức 2 · Thay mới có tính khấu hao theo tuổi tài sản' },
  FULL_REPLACE: { label: 'Mức 3 · Đền 100% giá trị niêm yết' },
};

export const PAYMENT_METHOD_META = {
  NO_EXTRA_CHARGE: { label: 'Không phát sinh thêm (0 đ)' },
  CASH: { label: 'Tiền mặt tại quầy' },
  BANK_TRANSFER: { label: 'Chuyển khoản VietQR' },
  POS_CARD: { label: 'Quẹt thẻ POS' },
  VNPAY: { label: 'Cổng thanh toán VNPay' },
};

export const SETTLEMENT_STATUS_META = {
  DRAFT: { label: 'Đang lập bảng kê', bg: '#F3F4F6', color: '#374151' },
  PENDING_PAYMENT: { label: 'Chờ khách thanh toán VNPay', bg: '#FEF3C7', color: '#92400E' },
  SETTLED: { label: 'Đã tất toán đủ', bg: '#DCFCE7', color: '#166534' },
};

export function getSuggestedDepreciationPercent(
  purchaseYear,
  referenceYear = new Date().getFullYear(),
) {
  if (!purchaseYear) return 100;
  const age = Math.max(0, Number(referenceYear) - Number(purchaseYear));
  if (age < 1) return 100;
  if (age <= 2) return 75;
  if (age <= 4) return 55;
  return 35;
}

export async function uploadCheckoutEvidenceImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiFetch('/uploads/checkout-evidence', {
    method: 'POST',
    body: formData,
  });
  return res?.data?.url || '';
}

export async function fetchIncidentalCatalog(accommodationId, params = {}) {
  const sp = new URLSearchParams();
  if (params.category) sp.set('category', params.category);
  if (params.includeInactive) sp.set('includeInactive', 'true');
  if (params.q) sp.set('q', params.q);
  const qs = sp.toString();
  const res = await apiFetch(
    `/accommodations/${accommodationId}/incidental-catalog${qs ? `?${qs}` : ''}`,
  );
  return res?.data || { accommodation: null, items: [] };
}

export async function createCatalogItem(accommodationId, payload) {
  const res = await apiFetch(`/accommodations/${accommodationId}/incidental-catalog`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res?.data;
}

export async function updateCatalogItem(itemId, payload) {
  const res = await apiFetch(`/incidental-catalog/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res?.data;
}

export async function deleteCatalogItem(itemId) {
  const res = await apiFetch(`/incidental-catalog/${itemId}`, {
    method: 'DELETE',
  });
  return res?.data;
}

export async function fetchBookingCheckoutFolio(bookingId, params = {}) {
  const sp = new URLSearchParams();
  if (params.includeVoided) sp.set('includeVoided', 'true');
  const qs = sp.toString();
  const res = await apiFetch(`/bookings/${bookingId}/checkout-folio${qs ? `?${qs}` : ''}`);
  return res?.data;
}

export async function addIncidentalCharge(bookingId, payload) {
  const res = await apiFetch(`/bookings/${bookingId}/incidental-charges`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res?.data;
}

export async function updateIncidentalCharge(bookingId, chargeId, payload) {
  const res = await apiFetch(`/bookings/${bookingId}/incidental-charges/${chargeId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return res?.data;
}

export async function voidIncidentalCharge(bookingId, chargeId) {
  const res = await apiFetch(`/bookings/${bookingId}/incidental-charges/${chargeId}`, {
    method: 'DELETE',
  });
  return res?.data;
}

export async function settleBookingCheckout(bookingId, payload) {
  const res = await apiFetch(`/bookings/${bookingId}/checkout-settle`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res?.data;
}

export async function createVnpaySettlementUrl(bookingId, payload = {}) {
  const res = await apiFetch(`/bookings/${bookingId}/checkout-settle/vnpay-url`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res?.data;
}
