import { useAuth } from '../../context/AuthContext';
export function formatPricingValue(value, unit) {
  if (unit !== 'VNĐ' || !value) return value;
  const [integer, fraction] = String(value).split('.');
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fraction === undefined ? '' : `.${fraction}`);
}
export function parsePricingValue(value, unit) {
  const text = value.trim();
  if (unit === 'VNĐ' || /^\d{1,3}(,\d{3})+(\.\d*)?$/.test(text)) return text.replaceAll(',', '');
  return text.replace(',', '.');
}
export const currency = v => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
}).format(Number(v));
export const localToday = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());
export const addDays = (d, n) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);
export const startOfWeek = day => addDays(day, 1 - (new Date(day).getUTCDay() || 7));
export const shortDate = d => d?.slice(0, 10).split('-').reverse().join('/');
export function periodTimeStatus(period, today = localToday()) {
  return period.end_date <= today ? 'ended' : period.start_date > today ? 'upcoming' : 'ongoing';
}
export function periodScopeLabel(period) {
  const count=Number(period.propertyCount)||0;
  if(!count)return 'Chưa áp dụng';
  if(Number(period.totalPropertyCount)>0&&count===Number(period.totalPropertyCount))return 'Toàn bộ cơ sở';
  return `${count} cơ sở`;
}
export const periodTimeLabels = {
  upcoming: 'Sắp tới',
  ongoing: 'Đang trong kỳ giá',
  ended: 'Đã kết thúc'
};
export const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
export function adjustmentRoomScope(seed, bulk) {
  return !bulk && seed.roomIds?.length ? { roomIds: seed.roomIds, allRooms: false } : { allRooms: true };
}
export function weeklyPricesAt({ rooms, weekdays: rates = [], schedules = [] }, roomId, effectiveDate) {
  const room = rooms.find(r => r.id === roomId);
  return weekdays.map((_, i) => {
    const scheduled = schedules.filter(s => s.room_type_id === roomId && s.day_of_week === i + 1 && s.effective_from.slice(0, 10) <= effectiveDate)
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
    return scheduled?.price ?? rates.find(r => r.room_type_id === roomId && r.day_of_week === i + 1)?.price ?? room?.base_price ?? '';
  });
}
export function pricingPath(path, accommodationId) {
  const [pathname, search = ''] = path.split('?');
  const params = new URLSearchParams(search);
  if (accommodationId) params.set('accId', accommodationId);
  return pathname + (params.size ? `?${params}` : '');
}
export const types = {
  fixed_price: 'Đặt giá cố định',
  increase_percent: 'Tăng theo %',
  decrease_percent: 'Giảm theo %',
  increase_amount: 'Tăng số tiền',
  decrease_amount: 'Giảm số tiền'
};
export const sourceLabels = {
  base: 'Giá gốc',
  weekday: 'Giá theo thứ',
  period: 'Kỳ đặc biệt',
  override: 'Giá điều chỉnh theo ngày'
};
export const actionLabels = {
  remove_period: 'Gỡ kỳ giá đặc biệt',
  approve_price_proposal: 'Duyệt đề xuất giá',
  ...types,
  increase_percent: 'Điều chỉnh theo ngày · Tăng %',
  decrease_percent: 'Điều chỉnh theo ngày · Giảm %',
  increase_amount: 'Điều chỉnh theo ngày · Tăng số tiền',
  decrease_amount: 'Điều chỉnh theo ngày · Giảm số tiền',
  restore: 'Gỡ điều chỉnh theo ngày',
  close: 'Đóng bán',
  open: 'Mở bán',
  weekday: 'Thiết lập giá tuần',
  period: 'Cấu hình kỳ giá',
  create_period: 'Tạo kỳ dùng chung',
  update_period: 'Sửa kỳ dùng chung',
  archive_period: 'Xóa kỳ',
  create_room_rates: 'Giá loại phòng mới',
  update_room_rates: 'Sửa giá / số lượng loại phòng'
};
export function changeStatusLabel(change) {
  if(change.changeStatus==='kept_existing') return 'Giữ nguyên điều chỉnh đã có';
  if(change.changeStatus==='unchanged') return 'Không thay đổi';
  if(change.changeStatus==='changed') return 'Thay đổi';
  return change.oldPrice!==change.newPrice || change.oldSource!==change.newSource ? 'Thay đổi' : 'Không thay đổi';
}
export function auditChanges(log) {
  const before = JSON.parse(log.before_json || 'null'),
    after = JSON.parse(log.after_json || 'null');
  const labels = {
    price: 'Giá',
    base_price: 'Giá gốc',
    quantity: 'Số phòng',
    adjustment_type: 'Cách tính',
    adjustment_direction: 'Hướng điều chỉnh',
    adjustment_value: 'Điều chỉnh',
    priority: 'Ưu tiên',
    is_active: 'Áp dụng tại cơ sở',
    stop_sell: 'Đóng bán',
    start_date: 'Từ đêm',
    end_date: 'Trước ngày',
    effective_from: 'Hiệu lực từ',
    name: 'Tên',
    description: 'Mô tả',
    deleted_at: 'Lưu trữ',
    basePrice: 'Giá gốc',
    extraAdultFee: 'Phụ thu người lớn',
    extraChildFee: 'Phụ thu trẻ em'
  };
  const sections = {
    rooms: 'Loại phòng',
    weekdays: 'Giá tuần ban đầu',
    schedules: 'Lịch giá tuần',
    periodConfigs: 'Kỳ giá',
    overrides: 'Giá điều chỉnh theo ngày',
    saleControls: 'Trạng thái bán'
  };
  const names = new Map([...(before?.rooms || []), ...(after?.rooms || [])].map(r => [r.id, r.name]));
  const rows = [];
  function fields(a, b, context) {
    for (const [key, label] of Object.entries(labels)) {
      if (!(key in (a || {})) && !(key in (b || {}))) continue;
      if (JSON.stringify(a?.[key]) === JSON.stringify(b?.[key])) continue;
      const format = v => v == null ? '—' : key === 'adjustment_direction' ? v==='increase'?'Tăng giá':'Giảm giá' : key === 'adjustment_type' ? types[v] || v : typeof v === 'boolean' ? v ? 'Có' : 'Không' : String(v);
      rows.push({
        context,
        field: label,
        before: format(a?.[key]),
        after: format(b?.[key])
      });
    }
  }
  if (after?.rooms || before?.rooms) for (const [key, label] of Object.entries(sections)) {
    const identity = r => key === 'periodConfigs' ? `${r.id}:${r.room_type_id}` : String(r.id);
    const a = new Map((before?.[key] || []).map(r => [identity(r), r])),
      b = new Map((after?.[key] || []).map(r => [identity(r), r]));
    for (const id of new Set([...a.keys(), ...b.keys()])) {
      const r = b.get(id) || a.get(id);
      const context = [label, names.get(r.room_type_id || (key === 'rooms' ? r.id : null)), r.stay_date?.slice(0, 10), r.effective_from?.slice(0, 10), r.day_of_week ? weekdays[r.day_of_week - 1] : '', key === 'periodConfigs' ? r.name : ''].filter(Boolean).join(' · ');
      fields(a.get(id), b.get(id), context);
    }
  } else {
    const context = after?.name || `Loại phòng #${after?.roomTypeId || before?.roomTypeId || ''}`;
    fields(before, after, context);
    // Partial room updates omit weekdayRates when those rates were not edited.
    if (Array.isArray(after?.weekdayRates)) {
      const oldRates = new Map((before?.weekdayRates || []).map(r => [Number(r.dayOfWeek ?? r.day_of_week), r]));
      const newRates = new Map(after.weekdayRates.map(r => [Number(r.dayOfWeek ?? r.day_of_week), r]));
      for (const day of new Set([...oldRates.keys(), ...newRates.keys()])) {
        fields(oldRates.get(day), newRates.get(day), `${context} · ${weekdays[day - 1]}`);
      }
    }
  }
  return rows;
}
export function usePricingAccess() {
  const {
    currentLoggedInUser,
    hasPermission
  } = useAuth();
  return {
    isAdmin: currentLoggedInUser?.role === 'ADMIN',
    isManager: currentLoggedInUser?.role === 'ACCOMMODATION_MANAGER',
    canRead: hasPermission('pricing.read'),
    canWrite: hasPermission('pricing.write')
  };
}
