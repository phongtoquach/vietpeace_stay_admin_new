import React from 'react';

// Vietnamese translation map for statuses, enums, and roles
const STATUS_TRANSLATIONS = {
  // Statuses
  'active': 'Đang hoạt động',
  'inactive': 'Ngừng hoạt động',
  'pending': 'Chờ xử lý',
  'confirmed': 'Đã xác nhận',
  'checked-in': 'Đã nhận phòng',
  'checked-out': 'Đã trả phòng',
  'cancelled': 'Đã hủy',
  'completed': 'Hoàn thành',
  'draft': 'Bản nháp',
  'archived': 'Lưu trữ',
  'maintenance': 'Bảo trì',
  'available': 'Còn trống',
  'occupied': 'Đã có khách',
  'blocked': 'Tạm khóa',
  'paid': 'Đã thanh toán',
  'unpaid': 'Chưa thanh toán',
  'refunded': 'Đã hoàn tiền',
  'partially paid': 'Thanh toán một phần',
  'partial': 'Một phần',

  // Roles
  'super administrator': 'Quản trị viên cấp cao',
  'accommodation manager': 'Người quản lý cơ sở lưu trú',
  'front desk staff': 'Nhân viên lễ tân',
  'finance manager': 'Quản lý tài chính',
  'general manager': 'Tổng quản lý',

  // Property types
  'resort': 'Khu nghỉ dưỡng',
  'hotel': 'Khách sạn',
  'homestay': 'Homestay',
  'villa': 'Biệt thự',
  'boutique hotel': 'Khách sạn Boutique',

  // Discount types
  'percentage': 'Phần trăm (%)',
  'fixed amount': 'Số tiền cố định',
  'fixed': 'Cố định',

  // Location types
  'country': 'Quốc gia',
  'province / city': 'Tỉnh/thành',
  'ward / district': 'Phường/quận',
  'tourism area': 'Khu du lịch',

  // Customer tier
  'vip platinum': 'VIP Bạch kim',
  'gold member': 'Thành viên Vàng',
  'silver member': 'Thành viên Bạc',
  'standard': 'Tiêu chuẩn'
};

export default function StatusBadge({ status, type, label }) {
  if (!status && !label) return null;

  const raw = String(label || status || '');
  const val = raw.toLowerCase().trim();

  let badgeClass = 'badge-neutral';

  if (['active', 'confirmed', 'paid', 'completed', 'available', 'đang hoạt động', 'đã xác nhận', 'đã thanh toán', 'hoàn thành'].includes(val)) {
    badgeClass = 'badge-success';
  } else if (['pending', 'partial', 'partially paid', 'warning', 'in progress', 'chờ xử lý', 'thanh toán một phần'].includes(val)) {
    badgeClass = 'badge-warning';
  } else if (['cancelled', 'inactive', 'unpaid', 'danger', 'rejected', 'ngừng hoạt động', 'đã hủy', 'chưa thanh toán'].includes(val)) {
    badgeClass = 'badge-danger';
  } else if (['checked-in', 'checked-out', 'refunded', 'info', 'đã nhận phòng', 'đã trả phòng', 'đã hoàn tiền'].includes(val)) {
    badgeClass = 'badge-info';
  } else if (['resort', 'hotel', 'homestay', 'tiêu chuẩn', 'standard'].includes(val)) {
    badgeClass = 'badge-neutral';
  }

  const displayText = label || STATUS_TRANSLATIONS[val] || status;

  return <span className={`badge ${badgeClass}`}>{displayText}</span>;
}
