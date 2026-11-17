import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { formatVND, formatDateTimeVN } from '../../data/mockData.js';
import {
  COMPENSATION_MODE_META,
  NEGOTIATION_STATUS_META,
  reviewCompensationNegotiation,
  acknowledgeCompensationNegotiation,
  cancelCompensationNegotiation,
  resolveEvidenceImageUrl,
} from '../../api/checkoutSettlement.js';

export default function CompensationReviewDialog({
  isOpen,
  onClose,
  negotiation,
  isAdmin = false,
  canWriteBookings = false,
  onUpdated,
  showToast,
}) {
  const dialogRef = useRef(null);
  const approvedInputRef = useRef(null);
  const adminNoteRef = useRef(null);
  const [decision, setDecision] = useState('APPROVE');
  const [approvedExtraReduction, setApprovedExtraReduction] = useState(
    negotiation ? String(negotiation.requestedExtraReduction || 0) : '',
  );
  const [adminDecisionNote, setAdminDecisionNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  if (!negotiation) return null;

  const statusMeta = NEGOTIATION_STATUS_META[negotiation.status] || NEGOTIATION_STATUS_META.PENDING;
  const isPending = negotiation.status === 'PENDING';
  const canAdminReview = isAdmin && isPending;
  const canManagerAck =
    !isAdmin &&
    ['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'].includes(negotiation.status) &&
    !negotiation.managerAckAt;
  const canCancel = canWriteBookings && isPending;

  const currentPayable = Number(negotiation.previousFinalAmount || 0);
  const requestedReduction = Number(negotiation.requestedExtraReduction || 0);
  const parsedApproved = approvedExtraReduction === '' ? NaN : Math.round(Number(approvedExtraReduction));
  const approvedNum = Number.isFinite(parsedApproved) ? Math.max(0, parsedApproved) : 0;
  const approvedPct = currentPayable > 0 && approvedNum > 0 ? Math.round((approvedNum / currentPayable) * 100) : 0;
  const previewFinalAmount =
    decision === 'REJECT' ? currentPayable : Math.max(0, currentPayable - approvedNum);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (decision === 'APPROVE') {
      if (!Number.isFinite(parsedApproved) || parsedApproved <= 0) {
        setFieldErrors({ approved: true });
        setErrorMsg('Số tiền Admin xác nhận giảm phải lớn hơn 0 đ. Nếu không đồng ý giảm, hãy chọn Từ chối.');
        approvedInputRef.current?.focus();
        return;
      }
      if (parsedApproved > currentPayable) {
        setFieldErrors({ approved: true });
        setErrorMsg(`Số tiền giảm không được vượt quá mức đang yêu cầu đền (${formatVND(currentPayable)}).`);
        approvedInputRef.current?.focus();
        return;
      }
    }

    const trimmedNote = adminDecisionNote.trim();
    if (trimmedNote.length < 3) {
      setFieldErrors({ note: true });
      setErrorMsg('Vui lòng nhập ghi chú phản hồi kết quả gửi về cho Manager (tối thiểu 3 ký tự).');
      adminNoteRef.current?.focus();
      return;
    }

    setFieldErrors({});
    setBusy(true);
    try {
      const res = await reviewCompensationNegotiation(negotiation.id, {
        decision,
        approvedExtraReduction: decision === 'APPROVE' ? parsedApproved : 0,
        adminDecisionNote: trimmedNote,
        versionToken: negotiation.versionToken,
      });
      showToast?.(
        decision === 'REJECT'
          ? 'Đã từ chối đề xuất và giữ nguyên mức giá đền.'
          : `Đã xác nhận giảm ${formatVND(approvedNum)} và thông báo về cho Manager.`,
      );
      onUpdated?.(res);
    } catch (error) {
      setErrorMsg(error?.message || 'Không thể lưu kết quả thẩm định.');
    } finally {
      setBusy(false);
    }
  };

  const handleAcknowledge = async () => {
    setBusy(true);
    setErrorMsg('');
    try {
      const res = await acknowledgeCompensationNegotiation(negotiation.id);
      showToast?.('Đã xác nhận tiếp nhận kết quả từ Admin.');
      onUpdated?.(res);
    } catch (error) {
      setErrorMsg(error?.message || 'Không thể cập nhật xác nhận.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    setErrorMsg('');
    try {
      const res = await cancelCompensationNegotiation(negotiation.id);
      showToast?.('Đã hủy phiếu đề xuất thương lượng.', 'info');
      onUpdated?.(res);
    } catch (error) {
      setErrorMsg(error?.message || 'Không thể hủy phiếu thương lượng.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="admin-native-dialog dialog-md"
      closedby="closerequest"
      aria-labelledby="rev-dialog-title"
      onCancel={(e) => {
        if (busy) {
          e.preventDefault();
          return;
        }
        onClose?.();
      }}
    >
      <div className="fin-dialog-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 id="rev-dialog-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
              Phiếu Thương lượng #{negotiation.negotiationCode}
            </h2>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '2px 9px',
                borderRadius: '999px',
                backgroundColor: statusMeta.bg,
                color: statusMeta.color,
                border: `1px solid ${statusMeta.border}`,
              }}
            >
              {statusMeta.label}
            </span>
            {negotiation.isUrgent && isPending && (
              <span className="badge badge-danger">Khẩn · Khách đang chờ quầy</span>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>
            {negotiation.accommodationName} · Đơn{' '}
            <Link
              to={`/admin/bookings/${negotiation.bookingId}`}
              style={{ color: '#2563EB', fontWeight: 600 }}
              onClick={onClose}
            >
              #{negotiation.bookingCode}
            </Link>{' '}
            · Khách: <strong>{negotiation.customerName}</strong> ({negotiation.customerPhone})
          </p>
        </div>

        <button
          type="button"
          className="row-action-btn"
          aria-label="Đóng hộp thoại chi tiết thương lượng"
          disabled={busy}
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>

      <div className="fin-dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {errorMsg && (
          <div
            role="alert"
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#B91C1C',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Asset & Financial Comparison */}
        <div
          style={{
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            padding: '12px 14px',
            backgroundColor: '#FAFBFD',
            fontSize: '12.5px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#111827', marginBottom: '8px' }}>
            {negotiation.itemName} (SL: {negotiation.quantity})
          </div>
          <div style={{ fontSize: '11.5px', color: '#6B7280', marginBottom: '10px' }}>
            {COMPENSATION_MODE_META[negotiation.compensationMode]?.label || negotiation.compensationMode} ·{' '}
            Đơn giá niêm yết: {formatVND(negotiation.unitPrice)} · Khấu hao áp dụng: {negotiation.depreciationPercent}%
            {negotiation.previousAdjustmentAmount > 0
              ? ` · Đã giảm thiện chí trước đó: -${formatVND(negotiation.previousAdjustmentAmount)}`
              : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
            <div style={{ padding: '8px 10px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>Mức đền trước thương lượng</div>
              <div className="tabular-nums" style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>
                {formatVND(currentPayable)}
              </div>
            </div>
            <div style={{ padding: '8px 10px', backgroundColor: '#FFFBEB', borderRadius: '8px', border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: '11px', color: '#92400E' }}>Khách xin giảm thêm</div>
              <div className="tabular-nums" style={{ fontWeight: 700, fontSize: '14px', color: '#B45309' }}>
                -{formatVND(requestedReduction)}
              </div>
            </div>
            <div style={{ padding: '8px 10px', backgroundColor: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: '11px', color: '#166534' }}>Khách đề nghị đóng còn</div>
              <div className="tabular-nums" style={{ fontWeight: 700, fontSize: '14px', color: '#15803D' }}>
                {formatVND(negotiation.proposedFinalAmount)}
              </div>
            </div>
          </div>
        </div>

        {/* Guest & Manager Notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', fontSize: '12.5px' }}>
          <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
              Ý kiến của khách hàng
            </div>
            <div style={{ color: '#1F2937', whiteSpace: 'pre-wrap' }}>{negotiation.guestOpinion}</div>
          </div>

          <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: '4px' }}>
              Đánh giá của Manager cơ sở ({negotiation.requestedByName || 'Quản lý'} · {formatDateTimeVN(negotiation.createdAt)})
            </div>
            <div style={{ color: '#1F2937', whiteSpace: 'pre-wrap' }}>
              {negotiation.managerNote || 'Không có ghi chú bổ sung.'}
            </div>
          </div>
        </div>

        {/* Evidence Photos */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
            Hình ảnh bằng chứng hư hao ({negotiation.evidenceImages?.length || 0} ảnh)
          </div>
          {!negotiation.evidenceImages?.length ? (
            <div style={{ fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}>
              Manager không đính kèm ảnh chụp thiết bị trên phiếu này.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
              {negotiation.evidenceImages.map((url, idx) => (
                <a
                  key={url}
                  href={resolveEvidenceImageUrl(url)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'block',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    textDecoration: 'none',
                    backgroundColor: '#F9FAFB',
                  }}
                >
                  <img
                    src={resolveEvidenceImageUrl(url)}
                    alt={`Bằng chứng hư hỏng ${negotiation.itemName} ảnh ${idx + 1}`}
                    width={180}
                    height={120}
                    style={{ width: '100%', height: '92px', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{ padding: '4px 6px', fontSize: '11px', color: '#2563EB', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <ExternalLink size={11} /> Ảnh {idx + 1} (Phóng to)
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Admin Review Form OR Resolved Result */}
        {canAdminReview ? (
          <form
            id="admin-review-negotiation-form"
            noValidate
            onSubmit={handleSubmitReview}
            style={{
              border: '1px solid #CBD5E1',
              borderRadius: '10px',
              padding: '14px',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                Quyết định thẩm định của Admin
              </legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <label
                  htmlFor="rev-decision-approve"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: decision === 'APPROVE' ? '2px solid #16A34A' : '1px solid #D1D5DB',
                    backgroundColor: decision === 'APPROVE' ? '#F0FDF4' : '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    fontWeight: decision === 'APPROVE' ? 700 : 500,
                  }}
                >
                  <input
                    id="rev-decision-approve"
                    type="radio"
                    name="adminDecision"
                    value="APPROVE"
                    checked={decision === 'APPROVE'}
                    onChange={() => setDecision('APPROVE')}
                  />
                  <CheckCircle2 size={16} color="#16A34A" />
                  <span>Xác nhận cho phép giảm</span>
                </label>

                <label
                  htmlFor="rev-decision-reject"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: decision === 'REJECT' ? '2px solid #DC2626' : '1px solid #D1D5DB',
                    backgroundColor: decision === 'REJECT' ? '#FEF2F2' : '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    fontWeight: decision === 'REJECT' ? 700 : 500,
                  }}
                >
                  <input
                    id="rev-decision-reject"
                    type="radio"
                    name="adminDecision"
                    value="REJECT"
                    checked={decision === 'REJECT'}
                    onChange={() => setDecision('REJECT')}
                  />
                  <XCircle size={16} color="#DC2626" />
                  <span>Từ chối · Giữ nguyên giá đền</span>
                </label>
              </div>
            </fieldset>

            {decision === 'APPROVE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', alignItems: 'start' }}>
                  <div>
                    <label htmlFor="rev-approved-amount" className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>
                      Số tiền Admin xác nhận giảm thêm (VNĐ) *
                    </label>
                    <input
                      ref={approvedInputRef}
                      id="rev-approved-amount"
                      name="approvedExtraReduction"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={currentPayable}
                      step={1}
                      required
                      autoFocus
                      aria-invalid={fieldErrors.approved ? 'true' : undefined}
                      aria-describedby="rev-approved-amount-hint"
                      className="filter-input tabular-nums"
                      style={{ width: '100%', fontWeight: 700 }}
                      value={approvedExtraReduction}
                      onChange={(e) => {
                        setApprovedExtraReduction(e.target.value);
                        if (fieldErrors.approved || errorMsg) {
                          setFieldErrors((prev) => ({ ...prev, approved: false }));
                          setErrorMsg('');
                        }
                      }}
                    />
                    <div
                      id="rev-approved-amount-hint"
                      className="tabular-nums"
                      style={{
                        fontSize: '11.5px',
                        marginTop: '4px',
                        color: approvedNum > currentPayable ? '#B91C1C' : '#0369A1',
                        fontWeight: 600,
                      }}
                    >
                      {approvedNum > currentPayable
                        ? `Vượt quá mức tối đa ${formatVND(currentPayable)}`
                        : approvedNum > 0
                          ? `= ${formatVND(approvedNum)} (giảm ~${approvedPct}%)`
                          : `Tối đa ${formatVND(currentPayable)}`}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      fontSize: '12.5px',
                      color: '#065F46',
                      marginTop: '20px',
                    }}
                  >
                    Mức đền chốt sau duyệt:{' '}
                    <strong className="tabular-nums" style={{ fontSize: '14px' }}>
                      {formatVND(previewFinalAmount)}
                    </strong>
                    {approvedNum > 0 && approvedNum !== requestedReduction && (
                      <div style={{ fontSize: '11px', color: '#0369A1', marginTop: '2px' }}>
                        (Điều chỉnh khác mức Manager đề xuất {formatVND(requestedReduction)})
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => {
                      setApprovedExtraReduction(String(requestedReduction));
                      setFieldErrors((prev) => ({ ...prev, approved: false }));
                      setErrorMsg('');
                    }}
                  >
                    Đúng mức đề xuất ({formatVND(requestedReduction)})
                  </button>
                  {requestedReduction >= 100000 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => {
                        setApprovedExtraReduction(
                          String(Math.max(10000, Math.round((requestedReduction * 0.5) / 10000) * 10000)),
                        );
                        setFieldErrors((prev) => ({ ...prev, approved: false }));
                        setErrorMsg('');
                      }}
                    >
                      Giảm 50% đề xuất
                    </button>
                  )}
                </div>
              </div>
            )}

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                <label htmlFor="rev-admin-note" className="filter-label" style={{ margin: 0 }}>
                  Phản hồi của Admin gửi về Manager *
                </label>
                <span className="tabular-nums" style={{ fontSize: '11px', color: '#64748B' }}>
                  {adminDecisionNote.trim().length}/1000 (tối thiểu 3 ký tự)
                </span>
              </div>
              <textarea
                ref={adminNoteRef}
                id="rev-admin-note"
                name="adminDecisionNote"
                rows={2}
                required
                minLength={3}
                maxLength={1000}
                aria-invalid={fieldErrors.note ? 'true' : undefined}
                className="filter-input"
                style={{ width: '100%', resize: 'vertical' }}
                placeholder={
                  decision === 'REJECT'
                    ? 'VD: Qua ảnh kiểm tra thấy tấm nền TV đã vỡ hoàn toàn phải thay mới, giữ nguyên mức đền theo khấu hao.'
                    : 'VD: Xem ảnh thấy vết nứt nhẹ ở vỏ ngoài, đồng ý hỗ trợ giảm 1.000.000đ cho khách hợp tác.'
                }
                value={adminDecisionNote}
                onChange={(e) => {
                  setAdminDecisionNote(e.target.value);
                  if (fieldErrors.note || errorMsg) {
                    setFieldErrors((prev) => ({ ...prev, note: false }));
                    setErrorMsg('');
                  }
                }}
              />
            </div>
          </form>
        ) : (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: `1px solid ${statusMeta.border}`,
              backgroundColor: statusMeta.bg,
              color: statusMeta.color,
              fontSize: '12.5px',
            }}
          >
            {isPending ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} />
                <span>
                  Phiếu đề xuất đang chờ Quản trị viên cấp cao (Admin) kiểm tra hình ảnh và xác nhận kết quả.
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                  <ShieldCheck size={16} />
                  <span>
                    Kết quả từ Admin ({negotiation.reviewedByName || 'Quản trị viên'} ·{' '}
                    {negotiation.reviewedAt ? formatDateTimeVN(negotiation.reviewedAt) : '—'})
                  </span>
                </div>
                {negotiation.status !== 'CANCELLED' && (
                  <div className="tabular-nums">
                    • Mức giảm được duyệt: <strong>{formatVND(negotiation.approvedExtraReduction || 0)}</strong> ·{' '}
                    Mức bồi thường chốt cuối cùng: <strong>{formatVND(negotiation.finalApprovedAmount)}</strong>
                  </div>
                )}
                {negotiation.adminDecisionNote && (
                  <div>• Phản hồi của Admin: {negotiation.adminDecisionNote}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fin-dialog-footer" style={{ justifyContent: 'space-between' }}>
        <div>
          {canCancel && (
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={handleCancel}>
              Hủy yêu cầu thương lượng
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>
            Đóng
          </button>
          {canManagerAck && (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={handleAcknowledge}>
              <CheckCircle2 size={14} /> Đã tiếp nhận kết quả
            </button>
          )}
          {canAdminReview && (
            <button
              type="submit"
              form="admin-review-negotiation-form"
              className="btn btn-primary"
              disabled={busy}
            >
              {busy
                ? 'Đang lưu...'
                : decision === 'REJECT'
                  ? `Từ chối & Giữ nguyên ${formatVND(currentPayable)}`
                  : `Xác nhận giảm ${approvedNum > 0 ? formatVND(approvedNum) : ''}`}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
