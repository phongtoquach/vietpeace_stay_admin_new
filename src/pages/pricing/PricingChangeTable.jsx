import { changeStatusLabel, currency, shortDate } from './pricingUtils';

export default function PricingChangeTable({ changes = [], count = changes.length }) {
  const visible = changes.slice(0, 80);
  return <><div className="pricing-scroll"><table><thead><tr><th>Loại phòng</th><th>Ngày</th><th>Giá trước → đề xuất</th><th>Kết quả</th></tr></thead><tbody>{visible.map(c => <tr key={`${c.roomTypeId}:${c.date}`}><td>{c.roomName || `#${c.roomTypeId}`}</td><td>{shortDate(c.date)}</td><td>{currency(c.oldPrice)} → <strong>{currency(c.newPrice)}</strong></td><td>{changeStatusLabel(c)}</td></tr>)}</tbody></table></div>{count > visible.length && <p className="pricing-muted">Hiển thị {visible.length}/{count} ô.</p>}</>;
}
