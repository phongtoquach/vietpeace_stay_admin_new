import { useLayoutEffect, useRef, useState } from 'react';
import InlineValidatedForm, { FieldError } from '../../components/forms/ValidatedForm';
import { pricingApi } from '../../api/pricing';
import BulkPropertyScope from './BulkPropertyScope';
import PricingConflictDialog from './PricingConflictDialog';
import PeriodOverlapNotice from './PeriodOverlapNotice';
import { Message, Modal } from './PricingShared';
import { addDays, currency, localToday, shortDate, changeStatusLabel, formatPricingValue, parsePricingValue, adjustmentRoomScope } from './pricingUtils';

const actions = { increase_percent: 'Tăng theo %', decrease_percent: 'Giảm theo %', increase_amount: 'Tăng số tiền', decrease_amount: 'Giảm số tiền' };

export default function PriceAdjustmentDialog({ seed = {}, rooms = [], periods, accommodationId, accommodations, isManager, canBulkProperties, onClose, onSaved }) {
  const [operation, setOperation] = useState(!isManager && seed.action === 'period' ? `period:${seed.periodId}` : seed.action === 'restore' || (!isManager && seed.action === 'remove_period') ? seed.action : 'daily');
  const [adjustment, setAdjustment] = useState(actions[seed.action] ? seed.action : 'increase_percent');
  const [form, setForm] = useState({ start: seed.start || localToday(), end: seed.end || addDays(localToday(), 14), value: seed.action ? String(seed.value ?? '') : '', reason: '' });
  const [scope, setScope] = useState({ mode: 'single', single: 'all', ids: [] });
  const [removeId, setRemoveId] = useState(seed.action === 'remove_period' ? String(seed.periodId || '') : '');
  const [preview, setPreview] = useState(null);
  const [previewPayload, setPreviewPayload] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const bulk = Boolean(seed.bulk && canBulkProperties);
  const roomScope = adjustmentRoomScope(seed, bulk || (isManager && seed.bulk));
  const selectedRoomNames = rooms.filter(r => roomScope.roomIds?.includes(r.id)).map(r => r.name);
  const isPeriod = operation.startsWith('period:');
  const isDaily = operation === 'daily';
  const removing = operation === 'remove_period' || operation === 'restore';
  const period = isPeriod ? periods.find(p => String(p.id) === operation.slice(7)) : operation === 'remove_period' && removeId ? periods.find(p => String(p.id) === removeId) : null;
  const removingAllPeriods = operation === 'remove_period' && !removeId;
  const firstPeriodDay = periods.map(p => p.start_date).sort()[0];
  const lastPeriodDay = periods.map(p => p.end_date).sort().at(-1);
  const start = period?.start_date || (removingAllPeriods && firstPeriodDay ? firstPeriodDay < localToday() ? localToday() : firstPeriodDay : form.start);
  const end = period?.end_date || (removingAllPeriods && lastPeriodDay ? lastPeriodDay : form.end);
  const datesLocked = Boolean(period) || operation === 'remove_period';
  const unit = removing ? '' : (isDaily && adjustment.includes('percent')) || (isPeriod && Number(form.value) <= 100) ? '%' : 'VNĐ';
  const valueInput = useRef(null);
  const pendingCaret = useRef(null);
  const displayedValue = removing ? '' : formatPricingValue(form.value, unit);
  useLayoutEffect(() => {
    const input = valueInput.current;
    if (pendingCaret.current === null || document.activeElement !== input) return;
    let position = 0, digits = 0;
    while (position < displayedValue.length && digits < pendingCaret.current) {
      if (displayedValue[position] !== ',') digits++;
      position++;
    }
    input.setSelectionRange(position, position);
    pendingCaret.current = null;
  }, [displayedValue]);
  function changeValue(e) {
    const raw = parsePricingValue(e.target.value, unit);
    if (!/^\d*(\.\d{0,2})?$/.test(raw)) return;
    pendingCaret.current = parsePricingValue(e.target.value.slice(0, e.target.selectionStart), unit).length;
    update('value', raw);
  }
  function reset() { setPreview(null); setPreviewPayload(null); setConflict(null); setError(''); }
  function update(key, value) { setForm(f => ({ ...f, [key]: value })); reset(); }
  function receivePreview(result, payload) {
    if(result.needsConflictResolution) {
      setPreview(null);setPreviewPayload(null);setConflict({warning:result,payload});
    } else {
      setConflict(null);setPreview(result);setPreviewPayload(payload);
    }
  }
  async function chooseConflict(policy) {
    if(busy || !conflict)return;
    setBusy(true);setError('');
    const payload={...conflict.payload,conflictHandling:policy,conflictToken:conflict.warning.conflictToken};
    try {receivePreview(await pricingApi.preview(payload),payload);}
    catch(e) {reset();setError(e.message);}
    finally {setBusy(false);}
  }
  async function submit(e) {
    e.preventDefault();
    if (busy || conflict) return;
    if (form.reason.trim().length < 3) { setError('Lý do phải có ít nhất 3 ký tự, không chỉ gồm khoảng trắng.'); return; }
    setBusy(true); setError('');
    const payload = {
      action: isPeriod ? 'period' : isDaily ? adjustment : operation, start, end, ...roomScope,
      accommodationId: Number(accommodationId), reason: form.reason,
      ...(!removing ? { value: form.value } : {}),
      ...(!removing ? {conflictHandling:'ask'} : {}),
      ...(isPeriod ? { periodId: period?.id, catalogPeriod: true } : operation === 'remove_period' && removeId ? { periodId: Number(removeId) } : {}),
      ...(bulk ? { propertyScope: { mode: scope.mode === 'multiple' ? 'multiple' : scope.single === 'all' ? 'all' : 'single', ids: scope.mode === 'multiple' ? scope.ids : scope.single === 'all' ? [] : [Number(scope.single)] } } : {})
    };
    try {
      if (preview) {
        const result = await pricingApi.apply({ ...previewPayload, previewToken: preview.previewToken });
        onSaved(result.status === 'PENDING' ? `Đã gửi đề xuất #${result.proposalId}. Giá giữ nguyên trong lúc chờ admin duyệt.` : 'Đã áp dụng thay đổi cho các cơ sở đã chọn.');
      } else receivePreview(await pricingApi.preview(payload),payload);
    } catch (e) {reset();setError(e.message);}
    finally { setBusy(false); }
  }
  return <Modal title={isManager ? 'Đề xuất điều chỉnh giá' : bulk ? 'Cập nhật giá hàng loạt' : 'Điều chỉnh giá'} onClose={() => { if (!busy) onClose(); }} wide>
    <InlineValidatedForm onSubmit={submit}><Message error={error} />
      {isManager && <p className="pricing-muted">Giá chỉ thay đổi sau khi admin phê duyệt đề xuất.</p>}
      <fieldset className="pricing-change-fields" disabled={busy || Boolean(conflict)}>
        <div className={`pricing-form-grid ${isDaily ? 'pricing-daily-fields' : ''}`}>
          <label>Thao tác<select value={operation} onChange={e => { setOperation(e.target.value); reset(); }}>
            <option value="daily">Điều chỉnh giá theo ngày</option>
            {!isManager && <optgroup label="Kỳ giá đặc biệt">{periods.map(p => <option key={p.id} value={`period:${p.id}`} disabled={!p.adjustment_direction}>{p.name}{p.adjustment_direction ? p.adjustment_direction === 'increase' ? ' · Tăng giá' : ' · Giảm giá' : ' · Chưa chọn tăng/giảm'}</option>)}</optgroup>}
            {!isManager && <option value="remove_period">Gỡ kỳ giá đặc biệt</option>}<option value="restore">Gỡ điều chỉnh theo ngày</option>
          </select></label>
          {isDaily && <label>Cách điều chỉnh<select value={adjustment} onChange={e => { setAdjustment(e.target.value); reset(); }}>{Object.entries(actions).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
          <label>Giá trị<FieldError name="value" /><div className="pricing-value-input"><input ref={valueInput} type="text" inputMode="decimal" name="value" data-validation-label="Giá trị" pattern="([0-9]+|[0-9]{1,3}(,[0-9]{3})+)([.][0-9]{1,2})?" required={!removing} disabled={removing} value={displayedValue} onChange={changeValue} placeholder={removing ? 'Không cần nhập' : 'Nhập giá trị'} aria-describedby={isPeriod ? 'period-value-help' : undefined} />{unit && <span>{unit}</span>}</div></label>
        </div>
        {isPeriod && <p id="period-value-help" className="pricing-muted">{period?.adjustment_direction === 'decrease' ? 'Giảm giá' : 'Tăng giá'} · Giá trị đến 100 tính theo %, trên 100 tính theo VNĐ.</p>}
        {operation === 'remove_period' && <label>Kỳ cần gỡ<select value={removeId} onChange={e => { setRemoveId(e.target.value); reset(); }}><option value="">Tất cả kỳ đang áp dụng tại cơ sở đã chọn</option>{periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
        <div className={`pricing-form-grid ${datesLocked ? 'pricing-locked-dates' : ''}`}>
          <label>Từ ngày<FieldError name="start" /><input type="date" name="start" data-validation-label="Ngày bắt đầu" required disabled={datesLocked} min={localToday()} value={start} onChange={e => update('start', e.target.value)} /></label>
          <label>Đến trước ngày<FieldError name="end" /><input type="date" name="end" data-validation-label="Ngày kết thúc" required disabled={datesLocked} min={form.start ? addDays(form.start, 1) : undefined} value={end} onChange={e => update('end', e.target.value)} /></label>
        </div>
        {bulk && <BulkPropertyScope scope={scope} accommodations={accommodations} onChange={next => { setScope(next); reset(); }} />}
        <p className="pricing-room-scope-note">{roomScope.allRooms ? isManager ? 'Đề xuất áp dụng cho toàn bộ loại phòng hiện có tại cơ sở đang quản lý.' : 'Thay đổi sẽ áp dụng đồng nhất cho toàn bộ loại phòng hiện có tại các cơ sở bạn chọn.' : `Chỉ áp dụng cho: ${selectedRoomNames.join(', ') || `${roomScope.roomIds.length} loại phòng đã chọn`}.`}</p>
        {operation === 'remove_period' && <p className="pricing-muted">Gỡ toàn bộ cấu hình của kỳ đã chọn tại cơ sở. Bản xem trước sẽ hiển thị các ngày còn hiệu lực bị ảnh hưởng.</p>}
        {operation === 'restore' && <p className="pricing-muted">Gỡ điều chỉnh trong khoảng ngày đã chọn, trở về giá kỳ đặc biệt hoặc giá tuần đang áp dụng.</p>}
        <label>Lý do thay đổi<FieldError name="reason" /><textarea name="reason" data-validation-label="Lý do thay đổi" required minLength={3} maxLength={500} value={form.reason} onChange={e => update('reason', e.target.value)} placeholder="Nhập lý do điều chỉnh giá" /></label>
        {preview && <PeriodOverlapNotice overlaps={preview.periodOverlaps} periodName={period?.name} />}
        {preview && <section className="pricing-preview"><h3>Xem trước · {preview.propertyCount ? `${preview.propertyCount} cơ sở · ` : ''}{preview.count} ô</h3><p className="pricing-muted">{preview.changedCount ?? 0} ô thay đổi · {(preview.keptCount ?? 0) + (preview.unchangedCount ?? 0)} ô giữ nguyên</p><div className="pricing-scroll"><table><thead><tr><th>Cơ sở / Loại phòng</th><th>Ngày</th><th>Giá trước → sau</th><th>Kết quả</th></tr></thead><tbody>{preview.changes.slice(0, 80).map(c => <tr key={`${c.roomTypeId}:${c.date}`}><td>{c.accommodationName && <div className="pricing-muted">{c.accommodationName}</div>}{c.roomName || `#${c.roomTypeId}`}</td><td>{shortDate(c.date)}</td><td>{currency(c.oldPrice)} → <strong>{currency(c.newPrice)}</strong></td><td>{changeStatusLabel(c)}</td></tr>)}</tbody></table></div>{preview.count > 80 && <p className="pricing-muted">Hiển thị 80 ô đầu tiên; số lượng kết quả tính trên toàn bộ phạm vi đã chọn.</p>}</section>}
      </fieldset>
      <footer><button type="button" className="btn btn-secondary" disabled={busy || Boolean(conflict)} onClick={onClose}>Hủy</button><button className="btn btn-primary" disabled={busy || Boolean(conflict) || (bulk && scope.mode === 'multiple' && !scope.ids.length)}>{busy ? 'Đang xử lý…' : preview ? isManager ? 'Gửi đề xuất' : 'Xác nhận áp dụng' : 'Xem trước thay đổi'}</button></footer>
    </InlineValidatedForm>
    {conflict && <PricingConflictDialog key={conflict.warning.conflictToken} warning={conflict.warning} busy={busy} onBack={() => setConflict(null)} onChoose={chooseConflict} />}
  </Modal>;
}
