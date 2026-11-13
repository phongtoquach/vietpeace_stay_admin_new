import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { pricingApi } from '../../api/pricing';
import { Message, Modal, PricingHeader } from './PricingShared';
import { actionLabels, currency, shortDate, usePricingAccess, changeStatusLabel, pricingPath, weekdays } from './pricingUtils';

const statuses = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', ALL: 'Tất cả trạng thái' };
const time = value => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';

function ProposalChanges({ changes, count }) {
  return <><div className="pricing-scroll"><table><thead><tr><th>Loại phòng</th><th>Ngày</th><th>Giá trước → đề xuất</th><th>Còn bán trước → sau</th><th>Kết quả</th></tr></thead><tbody>{changes.map(c => <tr key={`${c.roomTypeId}:${c.date}`}><td>{c.roomName || `#${c.roomTypeId}`}</td><td>{shortDate(c.date)}</td><td>{currency(c.oldPrice)} → <strong>{currency(c.newPrice)}</strong></td><td>{c.oldAvailable} → {c.newAvailable}</td><td>{changeStatusLabel(c)}</td></tr>)}</tbody></table></div>{count > changes.length && <p className="pricing-muted">Hiển thị {changes.length}/{count} ô.</p>}</>;
}

export function ReviewDialog({ proposal, canReview, isManager = false, onClose, onSaved }) {
  const [checked, setChecked] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function review(decision) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await pricingApi.reviewProposal(proposal.id, decision, { versionToken: proposal.versionToken, approvalToken: checked?.approvalToken, reason });
      if (decision === 'preview') setChecked(result);
      else onSaved(decision === 'approve' ? 'Đã duyệt đề xuất và cập nhật giá.' : 'Đã từ chối đề xuất. Giá được giữ nguyên.');
    } catch (e) { setError(e.message); setChecked(null); }
    finally { setBusy(false); }
  }
  return <Modal title={`Đề xuất giá #${proposal.id}`} onClose={() => { if (!busy) onClose(); }} wide>
    <Message error={error} />
    <p><strong>{proposal.accommodationName}</strong> · {statuses[proposal.status]}</p>
    <p className="pricing-muted">{proposal.requestedByName} · {time(proposal.created_at)}</p>
    <p><strong>Thao tác:</strong> {actionLabels[proposal.payload.action] || proposal.payload.action}{proposal.payload.value !== '' && proposal.payload.value != null && ['fixed_price','increase_amount','decrease_amount','increase_percent','decrease_percent'].includes(proposal.payload.action) ? ` · ${proposal.payload.action.includes('percent') ? `${proposal.payload.value}%` : currency(proposal.payload.value)}` : ''}</p>
    <p className="pricing-proposal-reason"><strong>Lý do:</strong> {proposal.reason}</p>
    {isManager && <>
      <p><strong>{proposal.payload.action === 'weekday' ? 'Hiệu lực từ: ' : 'Khoảng đề xuất: '}</strong>{shortDate(proposal.payload.start)}{proposal.payload.action !== 'weekday' && ` → trước ${shortDate(proposal.payload.end)}`}</p>
      {proposal.payload.action === 'weekday' && <div className="pricing-scroll"><table><thead><tr>{weekdays.map(day => <th key={day}>{day}</th>)}</tr></thead><tbody><tr>{proposal.payload.prices.map((price, i) => <td key={i}>{currency(price)}</td>)}</tr></tbody></table><p className="pricing-muted">Lịch giá đề xuất tiếp tục có hiệu lực đến khi được thay thế bởi lịch mới.</p></div>}
      <p className="pricing-muted">Bảng dưới là bản xem trước tại thời điểm gửi đề xuất.</p>
    </>}
    {['increase_percent','decrease_percent','increase_amount','decrease_amount','period'].includes(proposal.payload.action) && <p className="pricing-muted">{(proposal.payload.conflictHandling ? proposal.payload.conflictHandling === 'replace' : proposal.payload.replaceDailyAdjustments === true || (proposal.payload.replaceDailyAdjustments === undefined && proposal.payload.skipOverrides === false)) ? 'Thay thế điều chỉnh theo ngày đã có.' : 'Giữ nguyên các ngày đã có điều chỉnh.'}</p>}
    <ProposalChanges changes={checked?.changes || proposal.changes} count={checked?.count || proposal.count} />
    {proposal.status !== 'PENDING' && <p className="pricing-muted">{proposal.reviewedByName} · {time(proposal.reviewed_at)}{proposal.review_reason && ` · ${proposal.review_reason}`}</p>}
    {proposal.status === 'PENDING' && <p className="pricing-muted">Giá chưa thay đổi. Đề xuất chỉ có hiệu lực khi admin phê duyệt.</p>}
    {isManager && proposal.status === 'REJECTED' && <p className="pricing-message error">Đề xuất bị từ chối, giá giữ nguyên. Bạn có thể tạo đề xuất mới sau khi xem lý do từ chối ở trên.</p>}
    {isManager && proposal.status === 'APPROVED' && <p className="pricing-message success">Admin đã duyệt và áp dụng giá. <Link to={pricingPath('/admin/pricing-history', proposal.accommodation_id)}>Xem lịch sử thay đổi</Link>{proposal.applied_batch_id && ` · Mã lịch sử: ${proposal.applied_batch_id}`}</p>}
    {(!canReview || proposal.status !== 'PENDING') && <footer><button className="btn btn-secondary" onClick={onClose}>Đóng</button></footer>}
    {canReview && proposal.status === 'PENDING' && <>
      <label>Lý do từ chối<textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={500} disabled={busy} placeholder="Nhập lý do nếu từ chối đề xuất" /></label>
      {checked && <p className="pricing-message success">Đã kiểm tra dữ liệu hiện tại. Xác nhận duyệt để áp dụng toàn bộ {checked.count} ô.</p>}
      <footer><button className="btn btn-secondary" disabled={busy} onClick={onClose}>Đóng</button><button className="btn btn-secondary" disabled={busy || reason.trim().length < 3} onClick={() => review('reject')}>Từ chối</button><button className="btn btn-primary" disabled={busy} onClick={() => review(checked ? 'approve' : 'preview')}>{busy ? 'Đang xử lý…' : checked ? 'Xác nhận duyệt và áp dụng' : 'Kiểm tra để duyệt'}</button></footer>
    </>}
  </Modal>;
}

export default function PricingProposalsPage() {
  const access = usePricingAccess();
  const [accommodations, setAccommodations] = useState(null);
  const [params, setParams] = useSearchParams();
  const requestedId = params.get('accId') || '';
  const accommodationId = access.isManager && accommodations ? String(accommodations.find(a => String(a.id) === requestedId)?.id || accommodations[0]?.id || '') : requestedId;
  function setAccommodationId(id) { setParams(previous => { const next = new URLSearchParams(previous); if (id) next.set('accId', id); else next.delete('accId'); return next; }); }
  const [status, setStatus] = useState('PENDING');
  const [refresh, setRefresh] = useState(0);
  const [cursor, setCursor] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState(null);
  const key = JSON.stringify([accommodationId, status, refresh]);
  const beforeId = cursor?.key === key ? cursor.id : '';
  const current = result?.key === key ? result : null;
  const loading = !(access.isManager && accommodations?.length === 0) && (pending || (!current && !error));
  useEffect(() => {
    if (access.isManager && accommodations && requestedId !== accommodationId) setParams(previous => {
      const next = new URLSearchParams(previous);
      if (accommodationId) next.set('accId', accommodationId); else next.delete('accId');
      return next;
    }, { replace: true });
  }, [access.isManager, accommodations, requestedId, accommodationId, setParams]);
  useEffect(() => {
    if (!access.canRead) return;
    const controller = new AbortController();
    pricingApi.bootstrap(controller.signal).then(b => setAccommodations(b.accommodations)).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [access.canRead, refresh]);
  useEffect(() => {
    if (!access.canRead || (access.isManager && (!accommodations || !accommodationId))) return;
    const controller = new AbortController();
    Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setPending(true); setError('');
      try {
        const data = await pricingApi.proposals({ accommodationId, status, beforeId }, controller.signal);
        if (!controller.signal.aborted) setResult(previous => ({ ...data, key, items: beforeId && previous?.key === key ? [...previous.items, ...data.items] : data.items }));
      } catch (e) { if (!controller.signal.aborted) setError(e.message); }
      finally { if (!controller.signal.aborted) setPending(false); }
    });
    return () => controller.abort();
  }, [access.canRead, access.isManager, accommodations, accommodationId, status, beforeId, key]);
  function reset() { setCursor(null); setError(''); setSuccess(''); }
  if (!access.canRead) return <Message error="Bạn chưa được cấp quyền xem giá." />;
  return <div className="pricing-page"><PricingHeader title="Đề xuất giá" /><Message error={error} success={success} />
    {access.isManager && <p className="pricing-muted">Các đề xuất bạn đã gửi tại cơ sở đang quản lý. Chờ duyệt hoặc từ chối đều giữ nguyên giá; chỉ admin duyệt mới áp dụng và ghi lịch sử.</p>}
    <div className="pricing-toolbar pricing-proposals-toolbar">
      {access.isManager ? <div><span className="pricing-muted">Cơ sở đang quản lý</span><strong className="pricing-property">{accommodations === null ? 'Đang tải cơ sở…' : accommodations.find(a => String(a.id) === accommodationId)?.name || 'Bạn chưa được phân công cơ sở nào.'}</strong></div> : <label>Cơ sở<select value={accommodationId} onChange={e => { reset(); setAccommodationId(e.target.value); }}><option value="">Tất cả cơ sở</option>{accommodations?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
      <label>Trạng thái<select value={status} onChange={e => { reset(); setStatus(e.target.value); }}>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label} ({current?.counts[value] ?? '…'})</option>)}</select></label>
      <button className="btn btn-secondary" disabled={loading} onClick={() => { reset(); setRefresh(n => n + 1); }}>Làm mới</button>
      {access.isManager && access.canWrite && accommodationId && <Link className="btn btn-primary" to={pricingPath('/admin/room-rates', accommodationId)}>Tạo đề xuất giá</Link>}
    </div>
    <div className="pricing-scroll" aria-busy={loading}><table><thead><tr><th>Cơ sở / Thao tác</th><th>Manager đề xuất</th><th>Lý do</th><th>Trạng thái</th><th>Thời gian gửi</th><th /></tr></thead><tbody>{current?.items.map(p => <tr key={p.id}><td><strong>{p.accommodationName}</strong><div className="pricing-muted">{actionLabels[p.payload.action] || p.payload.action} · {p.count} ô</div></td><td>{p.requestedByName}</td><td className="pricing-proposal-reason">{p.reason}</td><td><span className={`pricing-proposal-status pricing-proposal-status--${p.status.toLowerCase()}`}>{statuses[p.status]}</span></td><td>{time(p.created_at)}</td><td><button className="btn btn-secondary btn-sm" onClick={() => setSelected(p)}>{access.isAdmin && p.status === 'PENDING' ? 'Xem và duyệt' : 'Chi tiết'}</button></td></tr>)}</tbody></table>
      {loading && !(access.isManager && accommodations?.length === 0) && <div className="pricing-empty" role="status">Đang tải đề xuất…</div>}
      {!loading && !error && !current?.items.length && <div className="pricing-empty">Chưa có đề xuất trong phạm vi đã chọn.</div>}
    </div>
    {current?.hasMore && <button className="btn btn-secondary pricing-history-more" disabled={loading} onClick={() => setCursor({ key, id: String(current.items.at(-1).id) })}>Tải thêm</button>}
    {selected && <ReviewDialog proposal={selected} isManager={access.isManager} canReview={access.isAdmin && access.canWrite} onClose={() => setSelected(null)} onSaved={message => { setSelected(null); setSuccess(message); setCursor(null); setRefresh(n => n + 1); }} />}
  </div>;
}
