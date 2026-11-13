import { useState } from 'react';
import InlineValidatedForm, { FieldError } from '../../components/forms/ValidatedForm';
import { pricingApi } from '../../api/pricing';
import { Message, Modal } from './PricingShared';
import PricingChangeTable from './PricingChangeTable';
import PricingMoneyInput from './PricingMoneyInput';
import { addDays, currency, localToday, weekdays, weeklyPricesAt } from './pricingUtils';

export default function ManagerWeekdayPriceDialog({ seed, rooms, weekdays: rates = [], schedules = [], accommodationId, onClose, onSaved }) {
  const candidates = rooms.filter(room => !seed.roomIds || seed.roomIds.includes(room.id));
  const [roomId, setRoomId] = useState(candidates[0]?.id ?? '');
  const [editedDays, setEditedDays] = useState([]);
  const baseline = (id, day) => weeklyPricesAt({ rooms, weekdays: rates, schedules }, id, day);
  const [form, setForm] = useState(() => ({ start: seed.start || localToday(), prices: baseline(candidates[0]?.id, seed.start || localToday()), reason: '' }));
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const oldPrices = baseline(roomId, form.start);
  function resetPreview() { setPreview(null); setError(''); }
  function changeRoom(value) {
    const id = Number(value);
    setRoomId(id);
    setEditedDays([]);
    setForm(previous => ({ ...previous, prices: baseline(id, previous.start) }));
    resetPreview();
  }
  function changeStart(value) {
    setForm(previous => ({ ...previous, start: value, prices: value ? baseline(roomId, value).map((price, i) => editedDays.includes(i) ? previous.prices[i] : price) : previous.prices }));
    resetPreview();
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (!candidates.some(room => room.id === roomId)) { setError('Vui lòng chọn loại phòng muốn thay đổi giá.'); return; }
    if (form.reason.trim().length < 3) { setError('Lý do phải có ít nhất 3 ký tự, không chỉ gồm khoảng trắng.'); return; }
    const body = { ...form, action: 'weekday', accommodationId: Number(accommodationId), roomIds: [roomId], end: addDays(form.start, 7) };
    setBusy(true); setError('');
    try {
      if (preview) {
        const result = await pricingApi.apply({ ...body, previewToken: preview.previewToken });
        onSaved(`Đã gửi đề xuất giá tuần #${result.proposalId}. Giá giữ nguyên trong lúc chờ admin duyệt.`);
      } else setPreview(await pricingApi.preview(body));
    } catch (e) { setError(e.message); setPreview(null); }
    finally { setBusy(false); }
  }
  return <Modal title="Đề xuất giá tuần" onClose={() => { if (!busy) onClose(); }} wide>
    <InlineValidatedForm onSubmit={submit}><Message error={error} />
      <fieldset className="pricing-change-fields" disabled={busy}>
        <p className="pricing-muted">Giá giữ nguyên khi chờ duyệt hoặc bị từ chối. Chỉ admin duyệt mới áp dụng lịch giá và ghi lịch sử.</p>
        <div className="pricing-form-grid">
          <label>Loại phòng<FieldError name="roomId" /><select name="roomId" required value={roomId} onChange={e => changeRoom(e.target.value)}>{!candidates.length && <option value="">Không có loại phòng được chọn</option>}{candidates.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
          <label>Hiệu lực từ<FieldError name="start" /><input name="start" type="date" required min={localToday()} value={form.start} onChange={e => changeStart(e.target.value)} /></label>
        </div>
        <section className="pricing-weekly-old"><h3>Giá cũ</h3><p className="pricing-muted">Giá tuần hiện có tại ngày hiệu lực đã chọn · VNĐ/phòng/đêm.</p>
          <div className="pricing-scroll"><table aria-label="Giá tuần cũ" className="pricing-weekly-comparison"><thead><tr>{weekdays.map(day => <th key={day}>{day}</th>)}</tr></thead><tbody><tr>{oldPrices.map((price, i) => <td key={i}>{price === '' ? '—' : currency(price)}</td>)}</tr></tbody></table></div>
        </section>
        <section className="pricing-weekly-new"><h3>Giá mới đề xuất</h3><p className="pricing-muted">Nhập giá mới cho loại phòng đang chọn. Đổi loại phòng sẽ tải lại các ô giá theo phòng đó.</p>
          <div className="pricing-week-inputs">{weekdays.map((day, i) => <label key={day}>{day}<FieldError name={`price-${i}`} /><PricingMoneyInput name={`price-${i}`} aria-label={`Giá mới ${day} (đ)`} required value={form.prices[i]} onValueChange={value => {
            setEditedDays(days => days.includes(i) ? days : [...days, i]);
            setForm(previous => ({ ...previous, prices: previous.prices.map((price, j) => i === j ? value : price) }));
            resetPreview();
          }} /></label>)}</div>
        </section>
        <label>Lý do thay đổi<FieldError name="reason" /><textarea name="reason" required minLength={3} maxLength={500} value={form.reason} onChange={e => { setForm(previous => ({ ...previous, reason: e.target.value })); resetPreview(); }} /></label>
        {preview && <section className="pricing-preview"><h3>Xem trước · {candidates.find(room => room.id === roomId)?.name}</h3><p className="pricing-muted">{preview.count} ô trong 7 ngày đầu từ ngày hiệu lực. Kỳ giá và điều chỉnh theo ngày vẫn được ưu tiên theo quy tắc hiện hành.</p><PricingChangeTable changes={preview.changes} count={preview.count} /></section>}
      </fieldset>
      <footer><button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>Hủy</button><button className="btn btn-primary" disabled={busy || !candidates.length}>{busy ? 'Đang xử lý…' : preview ? 'Gửi đề xuất cho phòng này' : 'Xem trước'}</button></footer>
    </InlineValidatedForm>
  </Modal>;
}
