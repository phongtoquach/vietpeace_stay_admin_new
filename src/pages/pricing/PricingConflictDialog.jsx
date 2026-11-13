import { useState } from 'react';
import { Modal } from './PricingShared';
import { currency, shortDate } from './pricingUtils';

export default function PricingConflictDialog({ warning, busy, onBack, onChoose }) {
  const [page, setPage] = useState(0);
  const rows = warning.items.slice(page * 100, (page + 1) * 100);
  return <div onKeyDown={e => e.stopPropagation()}><Modal title="Có giá điều chỉnh theo ngày bị trùng" onClose={() => { if (!busy) onBack(); }} wide>
    <div className="pricing-conflict-notice" role="status">
      <strong>{warning.propertyCount} cơ sở đang có điều chỉnh giá trùng với khoảng ngày bạn chọn.</strong>
      <p>{warning.roomCount} loại phòng · {warning.dateCount} ngày · {warning.conflictCount} ô giá bị trùng.</p>
      {warning.refreshed && <p>Dữ liệu đã thay đổi từ lần kiểm tra trước. Vui lòng xem danh sách mới và chọn lại cách xử lý.</p>}
    </div>
    <div className="pricing-scroll pricing-conflict-table"><table><thead><tr><th>Cơ sở</th><th>Loại phòng</th><th>Ngày trùng</th><th>Giá đang áp dụng</th></tr></thead><tbody>{rows.map(row => <tr key={`${row.accommodationId}:${row.roomTypeId}:${row.start}:${row.price}`}><td>{row.accommodationName}</td><td>{row.roomName}</td><td>{shortDate(row.start)}{row.end !== row.start && ` – ${shortDate(row.end)}`}</td><td>{currency(row.price)}</td></tr>)}</tbody></table></div>
    {warning.items.length > 100 && <div className="pricing-conflict-pagination"><button type="button" className="btn btn-secondary btn-sm" disabled={busy || page === 0} onClick={() => setPage(p => p - 1)}>Trước</button><span>{page * 100 + 1}–{Math.min((page + 1) * 100, warning.items.length)}/{warning.items.length}</span><button type="button" className="btn btn-secondary btn-sm" disabled={busy || (page + 1) * 100 >= warning.items.length} onClick={() => setPage(p => p + 1)}>Sau</button></div>}
    <p className="pricing-muted">Giữ giá đã điều chỉnh: các ngày trùng giữ nguyên, các ngày còn lại áp dụng giá mới. Thay bằng giá mới: tính lại các ngày trùng theo thao tác vừa chọn, không cộng chồng giá cũ.</p>
    <p className="pricing-muted">Lựa chọn áp dụng chung cho danh sách trùng ở trên. Sau bước này, bạn vẫn được xem trước và xác nhận trước khi lưu.</p>
    <footer><button type="button" className="btn btn-secondary" disabled={busy} onClick={onBack}>Quay lại chỉnh sửa</button><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => onChoose('keep')}>Giữ giá đã điều chỉnh</button><button type="button" className="btn btn-primary" disabled={busy} onClick={() => onChoose('replace')}>{busy ? 'Đang kiểm tra…' : 'Thay bằng giá mới'}</button></footer>
  </Modal></div>;
}
