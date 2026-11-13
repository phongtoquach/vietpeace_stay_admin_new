import { shortDate } from './pricingUtils';

export default function PeriodOverlapNotice({ overlaps = [], periodName }) {
  if (!overlaps.length) return null;
  return <section className="pricing-preview" aria-label="Kỳ giá trùng thời gian">
    <h3>Kỳ giá trùng thời gian</h3>
    <p>Kỳ <strong>{periodName}</strong> sẽ được ưu tiên hơn các kỳ dưới đây trong những ngày trùng. Các kỳ cũ vẫn được giữ và tiếp tục áp dụng ở những ngày còn lại.</p>
    <div className="pricing-scroll"><table><thead><tr><th>Cơ sở / Loại phòng</th><th>Kỳ đang áp dụng</th><th>Ngày trùng</th></tr></thead><tbody>{overlaps.map(row => <tr key={`${row.accommodationId || ''}:${row.roomTypeId}:${row.previousPeriodId}:${row.start}`}>
      <td>{row.accommodationName && <div className="pricing-muted">{row.accommodationName}</div>}{row.roomName}</td>
      <td>{row.previousPeriodName}</td><td>{shortDate(row.start)}{row.end !== row.start && ` – ${shortDate(row.end)}`}</td>
    </tr>)}</tbody></table></div>
    <p className="pricing-muted">Các ngày giữ giá điều chỉnh theo ngày vẫn giữ nguyên theo lựa chọn xử lý trùng của bạn. Chỉ lưu sau khi bạn xác nhận áp dụng.</p>
  </section>;
}
