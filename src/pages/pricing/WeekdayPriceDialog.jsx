import { useState } from 'react';
import InlineValidatedForm, { FieldError } from '../../components/forms/ValidatedForm';
import { pricingApi } from '../../api/pricing';
import { Message, Modal } from './PricingShared';
import ManagerWeekdayPriceDialog from './ManagerWeekdayPriceDialog';
import PricingMoneyInput from './PricingMoneyInput';
import { addDays, currency, localToday, weekdays, weeklyPricesAt } from './pricingUtils';

// Editing the existing weekly baseline stays separate from bulk adjustments.
export default function WeekdayPriceDialog(props) {
  return props.isManager ? <ManagerWeekdayPriceDialog {...props} /> : <AdminWeekdayPriceDialog {...props} />;
}
function AdminWeekdayPriceDialog({ seed, rooms, weekdays: rates = [], schedules = [], accommodationId, onClose, onSaved }) {
  const roomIds = seed.roomIds || rooms.map(r => r.id);
  const singleRoom = roomIds.length === 1 ? roomIds[0] : null;
  const baseline = day => weeklyPricesAt({ rooms, weekdays: rates, schedules }, singleRoom, day);
  const [editedDays, setEditedDays] = useState([]);
  const [form, setForm] = useState(() => ({ prices: singleRoom ? baseline(seed.start || localToday()) : seed.prices || Array(7).fill(''), start: seed.start || localToday(), reason: '' }));
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const roomName = rooms.filter(room => roomIds.includes(room.id)).map(room => room.name).join(', ');
  const oldPrices = singleRoom && form.start ? baseline(form.start) : [];
  function update(key, value) {
    setForm(f => ({ ...f, [key]: value, ...(key === 'start' && value && singleRoom ? { prices: baseline(value).map((price, i) => editedDays.includes(i) ? f.prices[i] : price) } : {}) }));
    setPreview(null);
  }
  async function submit(e) {
    e.preventDefault(); if (busy) return;
    if (form.reason.trim().length < 3) { setError('Lý do phải có ít nhất 3 ký tự, không chỉ gồm khoảng trắng.'); return; }
    setBusy(true); setError('');
    const body = { ...form, action: 'weekday', accommodationId: Number(accommodationId), roomIds: seed.roomIds || rooms.map(r => r.id), end: addDays(form.start, 7) };
    try {
      if (preview) { const result = await pricingApi.apply({ ...body, previewToken: preview.previewToken }); onSaved(result.status === 'PENDING' ? `Đã gửi đề xuất giá tuần #${result.proposalId}. Giá giữ nguyên trong lúc chờ admin duyệt.` : 'Đã lưu lịch giá tuần.'); }
      else setPreview(await pricingApi.preview(body));
    } catch (e) { setError(e.message); setPreview(null); }
    finally { setBusy(false); }
  }
  return <Modal title="Sửa giá tuần" onClose={() => { if (!busy) onClose(); }} wide><InlineValidatedForm onSubmit={submit}><Message error={error} /><fieldset className="pricing-change-fields" disabled={busy}>
    <p className="pricing-weekly-room">Loại phòng: <strong>{roomName}</strong></p>
    <label>Hiệu lực từ<input name="start" type="date" required min={localToday()} value={form.start} onChange={e => update('start', e.target.value)} /></label>
    {singleRoom && <p className="pricing-muted">Giá được lấy theo lịch có hiệu lực tại ngày bạn chọn. Khi đổi ngày, các ô chưa chỉnh sửa sẽ được cập nhật theo lịch tương ứng.</p>}
    {singleRoom && <section className="pricing-weekly-old"><h3>Giá cũ</h3><p className="pricing-muted">Giá tuần hiện có tại ngày hiệu lực đã chọn · VNĐ/phòng/đêm.</p>
      <div className="pricing-scroll"><table aria-label="Giá tuần cũ" className="pricing-weekly-comparison"><thead><tr>{weekdays.map(day => <th key={day}>{day}</th>)}</tr></thead><tbody><tr>{weekdays.map((day, i) => <td key={day}>{oldPrices[i] == null ? '—' : currency(oldPrices[i])}</td>)}</tr></tbody></table></div>
    </section>}
    <section className="pricing-weekly-new"><h3>Giá mới</h3>
    <div className="pricing-week-inputs">{weekdays.map((day, i) => <label key={day}>{day}<FieldError name={`price-${i}`} /><PricingMoneyInput name={`price-${i}`} aria-label={`Giá mới ${day} (đ)`} required value={form.prices[i]} onValueChange={value => { setEditedDays(days => days.includes(i) ? days : [...days, i]); update('prices', form.prices.map((v, j) => j === i ? value : v)); }} /></label>)}</div>
    </section>
    <label>Lý do thay đổi<FieldError name="reason" /><textarea name="reason" required minLength={3} maxLength={500} value={form.reason} onChange={e => update('reason', e.target.value)} /></label>
    {preview && <p className="pricing-muted">Đã kiểm tra {preview.count} ô. Xác nhận để lưu lịch mới.</p>}
    </fieldset><footer><button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>Hủy</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Đang xử lý…' : preview ? 'Xác nhận lưu' : 'Xem trước'}</button></footer></InlineValidatedForm></Modal>;
}
