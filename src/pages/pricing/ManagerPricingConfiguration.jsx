import { useRef, useState } from 'react';
import { CalendarDays, CalendarRange, ArrowRight } from 'lucide-react';
import { addDays, currency, localToday, shortDate, startOfWeek, types, weekdays } from './pricingUtils';

export default function ManagerPricingConfiguration({ data, cellMap, start, canWrite, openDialog }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [proposalType, setProposalType] = useState('daily');
  const [selectionError, setSelectionError] = useState('');
  const selectionRef = useRef(null);
  const today = localToday();
  const dates = weekdays.map((_, i) => addDays(startOfWeek(start), i));
  const selected = data.rooms.filter(room => selectedIds.includes(room.id));
  const allSelected = data.rooms.length > 0 && selected.length === data.rooms.length;
  const configs = data.periodConfigs.filter(c => !c.deleted_at && c.room_type_id);
  function toggleRoom(id) {
    setSelectionError('');
    setSelectedIds(ids => ids.includes(id) ? ids.filter(value => value !== id) : ids.length < 50 ? [...ids, id] : ids);
  }
  function propose() {
    if (!canWrite) return;
    if (!selected.length) {
      setSelectionError('Bạn chưa chọn loại phòng. Hãy đánh dấu ít nhất một phòng trong bảng rồi bấm đề xuất.');
      selectionRef.current?.focus();
      selectionRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    setSelectionError('');
    openDialog({ action: proposalType === 'weekday' ? 'weekday' : 'increase_percent', roomIds: selected.map(room => room.id), start: today, end: addDays(today, 7) });
  }
  return <div className="manager-pricing">
    {canWrite && data.rooms.length > 0 && <div className="manager-pricing-options" role="group" aria-label="Chọn cách đề xuất giá">
      <button type="button" className={proposalType === 'daily' ? 'is-selected' : ''} aria-pressed={proposalType === 'daily'} onClick={() => setProposalType('daily')}><CalendarRange size={22} /><span><strong>Điều chỉnh theo ngày</strong><small>Tăng, giảm giá hoặc gỡ điều chỉnh trong khoảng ngày bạn chọn.</small></span><i aria-hidden="true" /></button>
      <button type="button" className={proposalType === 'weekday' ? 'is-selected' : ''} aria-pressed={proposalType === 'weekday'} onClick={() => setProposalType('weekday')}><CalendarDays size={22} /><span><strong>Thiết lập giá tuần</strong><small>Đề xuất giá từ thứ Hai đến Chủ nhật, có ngày bắt đầu hiệu lực.</small></span><i aria-hidden="true" /></button>
    </div>}
    <section className="pricing-section manager-pricing-rates">
      <div className="pricing-section-title"><div><h2>Giá tiêu chuẩn theo tuần</h2><p>Tuần {shortDate(dates[0])} – {shortDate(dates[6])} · Giá/phòng/đêm, chưa gồm phụ thu và thuế/phí.</p></div><span className="manager-pricing-room-count">{data.rooms.length} loại phòng</span></div>
      {canWrite && data.rooms.length > 0 && <div ref={selectionRef} tabIndex={-1} className="manager-pricing-selection-help"><p id="manager-pricing-selection-help" className="manager-pricing-table-help">Đánh dấu ô vuông bên trái tên phòng, sau đó bấm {proposalType === 'weekday' ? '“Đề xuất giá tuần”' : '“Đề xuất điều chỉnh”'}. Bạn có thể chọn tối đa 50 loại phòng.</p>{selectionError && <p className="manager-pricing-selection-error" role="alert">{selectionError}</p>}</div>}
      <div className="pricing-scroll"><table className="pricing-weekly-table manager-pricing-table"><thead><tr>{canWrite && <th className="manager-pricing-select"><input type="checkbox" aria-label="Chọn tất cả loại phòng" checked={allSelected} disabled={!data.rooms.length || data.rooms.length > 50} onChange={() => { setSelectionError(''); setSelectedIds(allSelected ? [] : data.rooms.map(room => room.id)); }} /></th>}<th>Loại phòng</th>{weekdays.map((day, i) => <th key={day} className={dates[i] === today ? 'is-today' : undefined} aria-current={dates[i] === today ? 'date' : undefined}>{day}<small><time dateTime={dates[i]}>{shortDate(dates[i]).slice(0, 5)}</time></small></th>)}</tr></thead><tbody>{data.rooms.map(room => <tr key={room.id} className={selectedIds.includes(room.id) ? 'is-selected' : undefined}>
        {canWrite && <td className="manager-pricing-select"><input type="checkbox" aria-label={`Chọn ${room.name}`} checked={selectedIds.includes(room.id)} disabled={!selectedIds.includes(room.id) && selectedIds.length >= 50} onChange={() => toggleRoom(room.id)} /></td>}
        <td className="manager-pricing-room"><strong>{room.name}</strong><small>{room.quantity} phòng · {room.status === 1 ? 'Đang kinh doanh' : 'Ngừng / nháp'}</small></td>
        {dates.map((day, i) => <td key={day} className={day === today ? 'is-today' : undefined}>{currency(cellMap.get(`${room.id}:${day}`)?.normal_price ?? data.weekdays.find(w => w.room_type_id === room.id && w.day_of_week === i + 1)?.price ?? room.base_price)}</td>)}
      </tr>)}</tbody></table></div>
      {!data.rooms.length && <div className="pricing-empty">Cơ sở chưa có loại phòng. Admin cần thiết lập loại phòng và giá ban đầu.</div>}
      {canWrite && data.rooms.length > 0 && <div className="manager-pricing-submit"><div><strong>{selected.length ? `Đã chọn ${selected.length} loại phòng` : 'Chưa chọn loại phòng'}</strong><p>{selected.length ? selected.map(room => room.name).join(' · ') : 'Đánh dấu các phòng bạn muốn đề xuất thay đổi giá.'}</p>{selected.length > 1 && proposalType === 'weekday' && <p>Chọn từng loại phòng và đối chiếu giá cũ trong form đề xuất.</p>}</div><button type="button" className="btn btn-primary" aria-describedby="manager-pricing-selection-help" onClick={propose}>{proposalType === 'weekday' ? 'Đề xuất giá tuần' : 'Đề xuất điều chỉnh'}<ArrowRight size={16} /></button></div>}
    </section>
    <details className="pricing-section manager-pricing-periods"><summary><span>Kỳ giá tại cơ sở</span><small>{configs.length ? `${new Set(configs.map(c => c.rate_period_id)).size} kỳ đã cấu hình` : 'Chưa có kỳ giá'}</small></summary>
      <p className="pricing-muted">Các kỳ đã được cấu hình tại cơ sở. Kỳ có ưu tiên cao hơn được áp dụng; không cộng dồn kỳ.</p>
      {configs.length ? <div className="pricing-scroll"><table><thead><tr><th>Kỳ giá</th><th>Loại phòng</th><th>Điều chỉnh</th><th>Ưu tiên</th><th>Trạng thái</th></tr></thead><tbody>{configs.map(config => <tr key={`${config.id}:${config.room_type_id}`}><td>{config.name}</td><td>{data.rooms.find(room => room.id === config.room_type_id)?.name}</td><td>{types[config.adjustment_type]} · {config.adjustment_type.includes('percent') ? `${config.adjustment_value}%` : currency(config.adjustment_value)}</td><td>{config.priority}</td><td>{config.end_date <= today ? 'Đã kết thúc' : config.is_active ? 'Đang áp dụng' : 'Chưa bật'}</td></tr>)}</tbody></table></div> : <div className="pricing-empty">Chưa áp dụng kỳ đặc biệt. Giá theo tuần vẫn được sử dụng.</div>}
    </details>
  </div>;
}
