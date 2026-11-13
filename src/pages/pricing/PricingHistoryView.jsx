import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { pricingApi } from '../../api/pricing';
import { PricingHeader, Message } from './PricingShared';
import { usePricingAccess, localToday, actionLabels, auditChanges } from './pricingUtils';

export function HistoryFilters({ accommodations, accommodationId, onProperty, range, onRange, start, end, onDates, counts, onRefresh, loading }) {
  const presets = [['all', 'Tất cả thời gian'], ['today', 'Hôm nay'], ['week', '1 tuần'], ['month', '1 tháng'], ['custom', 'Tùy chọn ngày']];
  return <div className="pricing-toolbar pricing-history-toolbar">
    <label>Cơ sở<select value={accommodationId} onChange={e => onProperty(e.target.value)}>
      <option value="">Tất cả cơ sở</option>
      {accommodations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select></label>
    <label>Thời gian<select value={range} onChange={e => onRange(e.target.value)}>
      {presets.map(([value, label]) => <option key={value} value={value}>
        {label}{value !== 'custom' ? ` (${counts?.[value] == null ? '…' : Number(counts[value]).toLocaleString('vi-VN')})` : ''}
      </option>)}
    </select></label>
    <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>Làm mới</button>
    {range === 'custom' && <div className="pricing-history-dates">
      <label>Từ ngày<input type="date" value={start} max={end || undefined} onChange={e => onDates(e.target.value, end)} /></label>
      <label>Đến ngày<input type="date" value={end} min={start || undefined} onChange={e => onDates(start, e.target.value)} /></label>
      <p className="pricing-muted">Bao gồm cả ngày bắt đầu và kết thúc. Chọn cùng một ngày để xem ngày cụ thể.</p>
    </div>}
  </div>;
}

function AuditDetails({ log }) {
  const rows = auditChanges(log);
  return <details><summary>Chi tiết {rows.length} thay đổi</summary><div className="pricing-scroll"><table><thead><tr><th>Phạm vi</th><th>Nội dung</th><th>Trước</th><th>Sau</th></tr></thead><tbody>{rows.map((r, i) => <tr key={i}><td>{r.context}</td><td>{r.field}</td><td>{r.before}</td><td>{r.after}</td></tr>)}</tbody></table></div>{!rows.length && <p>Không thay đổi giá trị nghiệp vụ.</p>}</details>;
}

export default function PricingHistoryView() {
  const access = usePricingAccess();
  const [params, setParams] = useSearchParams();
  const accommodationId = params.get('accId') || '';
  const [accommodations, setAccommodations] = useState([]);
  const [range, setRange] = useState('all');
  const [start, setStart] = useState(localToday);
  const [end, setEnd] = useState(localToday);
  const [refresh, setRefresh] = useState(0);
  const [cursor, setCursor] = useState(null);
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const key = JSON.stringify([accommodationId, range, start, end, refresh]);
  const beforeId = cursor?.key === key ? cursor.id : '';
  const current = result?.key === key ? result : null;
  const invalidDates = range === 'custom' && (!start || !end || start > end);
  const loading = !invalidDates && (pending || (!current && !error));

  useEffect(() => {
    if (!access.canRead) return;
    const controller = new AbortController();
    pricingApi.bootstrap(controller.signal).then(b => setAccommodations(b.accommodations)).catch(e => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => controller.abort();
  }, [access.canRead]);

  useEffect(() => {
    if (!access.canRead || invalidDates) return;
    const controller = new AbortController();
    Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setPending(true);
      setError('');
      try {
        const data = await pricingApi.history({ accommodationId, range, ...(range === 'custom' ? { start, end } : {}), beforeId, includeSummary: 'true' }, controller.signal);
        if (!controller.signal.aborted) setResult(previous => ({ ...data, key, items: beforeId && previous?.key === key ? [...previous.items, ...data.items] : data.items }));
      } catch (e) {
        if (!controller.signal.aborted) setError(e.message);
      } finally {
        if (!controller.signal.aborted) setPending(false);
      }
    });
    return () => controller.abort();
  }, [access.canRead, accommodationId, range, start, end, beforeId, key, invalidDates]);

  function reset() { setCursor(null); setError(''); }
  if (!access.canRead) return <Message error="Bạn chưa được cấp quyền xem giá." />;
  return <div className="pricing-page"><PricingHeader title="Lịch sử thay đổi" /><Message error={error || (invalidDates ? 'Vui lòng chọn khoảng ngày hợp lệ.' : '')} />
    <HistoryFilters accommodations={accommodations} accommodationId={accommodationId} onProperty={value => {
      reset();
      setParams(p => { if (value) p.set('accId', value); else p.delete('accId'); return p; });
    }} range={range} onRange={value => { reset(); setRange(value); }} start={start} end={end} onDates={(a, b) => { reset(); setStart(a); setEnd(b); }}
      counts={current?.counts} loading={loading} onRefresh={() => { reset(); setRefresh(n => n + 1); }} />
    <section className="pricing-section" aria-busy={loading}>
      {current?.items.map(log => <article className="pricing-log pricing-history-log" key={log.id}>
        <header><div><strong>{actionLabels[log.action] || log.action}</strong><div className="pricing-history-property">{log.accommodationName || (log.accommodation_id ? `Cơ sở #${log.accommodation_id}` : 'Kỳ giá dùng chung')}</div></div><time dateTime={log.created_at}>{new Date(log.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time></header>
        <p>{log.reason}</p><p className="pricing-muted">Người thay đổi: {log.actorName} · Mã: {log.batch_id}</p><AuditDetails log={log} />
      </article>)}
      {loading && <div className="pricing-empty" role="status">Đang tải lịch sử…</div>}
      {!loading && !error && !invalidDates && current && !current.items.length && <div className="pricing-empty">Không có thay đổi trong phạm vi đã chọn.</div>}
      {current?.hasMore && <button className="btn btn-secondary pricing-history-more" disabled={loading} onClick={() => setCursor({ key, id: String(current.items.at(-1).id) })}>Tải thêm</button>}
    </section>
  </div>;
}
