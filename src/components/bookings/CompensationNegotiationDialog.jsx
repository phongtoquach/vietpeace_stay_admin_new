import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, X, Trash2, AlertCircle, Send, ExternalLink } from 'lucide-react';
import { formatVND } from '../../data/mockData.js';
import {
  COMPENSATION_MODE_META,
  createCompensationNegotiation,
  uploadCheckoutEvidenceImage,
  resolveEvidenceImageUrl,
} from '../../api/checkoutSettlement.js';

const MAX_IMAGES = 5;

export default function CompensationNegotiationDialog({
  isOpen,
  onClose,
  bookingId,
  charge,
  onSubmitted,
  showToast,
}) {
  const dialogRef = useRef(null);
  const fileInputRef = useRef(null);
  const reductionInputRef = useRef(null);
  const opinionInputRef = useRef(null);

  const grossAmount = useMemo(() => {
    if (!charge) return 0;
    const qty = Number(charge.quantity || 1);
    const unitPrice = Number(charge.unitPrice || 0);
    const depPct = Number(charge.depreciationPercent ?? 100);
    return Math.round(qty * unitPrice * (depPct / 100));
  }, [charge]);

  const currentPayable = useMemo(() => {
    if (!charge) return 0;
    return Math.max(0, Number(charge.totalAmount ?? (grossAmount - Number(charge.adjustmentAmount || 0))));
  }, [charge, grossAmount]);

  const defaultReduction = useMemo(() => {
    if (currentPayable <= 0) return '';
    return String(Math.min(currentPayable, Math.max(50000, Math.round((currentPayable * 0.2) / 10000) * 10000)));
  }, [currentPayable]);

  const [requestedExtraReduction, setRequestedExtraReduction] = useState(defaultReduction);
  const [proposedFinalInput, setProposedFinalInput] = useState(() =>
    defaultReduction !== '' ? String(Math.max(0, currentPayable - Number(defaultReduction))) : '',
  );
  const [guestOpinion, setGuestOpinion] = useState('');
  const [managerNote, setManagerNote] = useState('');
  const [evidenceImages, setEvidenceImages] = useState(() =>
    charge?.evidenceImageUrl && /^\/uploads\/checkout_evidence\//i.test(charge.evidenceImageUrl)
      ? [charge.evidenceImageUrl]
      : [],
  );
  const [isUrgent, setIsUrgent] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  if (!charge) return null;

  const parsedReduction = requestedExtraReduction === '' ? NaN : Math.round(Number(requestedExtraReduction));
  const reductionNum = Number.isFinite(parsedReduction) ? Math.max(0, parsedReduction) : 0;
  const proposedFinalNum = Math.max(0, currentPayable - reductionNum);
  const reductionPct = currentPayable > 0 && reductionNum > 0 ? Math.round((reductionNum / currentPayable) * 100) : 0;
  const isReductionOverLimit = Number.isFinite(parsedReduction) && parsedReduction > currentPayable;

  const handleReductionChange = (rawVal) => {
    setRequestedExtraReduction(rawVal);
    if (errorMsg || fieldErrors.reduction) {
      setErrorMsg('');
      setFieldErrors((prev) => ({ ...prev, reduction: false }));
    }
    if (rawVal === '') {
      setProposedFinalInput('');
      return;
    }
    const num = Math.round(Number(rawVal));
    if (Number.isFinite(num)) {
      setProposedFinalInput(String(Math.max(0, currentPayable - Math.max(0, num))));
    }
  };

  const handleProposedFinalChange = (rawVal) => {
    setProposedFinalInput(rawVal);
    if (errorMsg || fieldErrors.reduction) {
      setErrorMsg('');
      setFieldErrors((prev) => ({ ...prev, reduction: false }));
    }
    if (rawVal === '') {
      setRequestedExtraReduction('');
      return;
    }
    const num = Math.round(Number(rawVal));
    if (Number.isFinite(num)) {
      setRequestedExtraReduction(String(currentPayable - Math.max(0, num)));
    }
  };

  const applySuggestedReduction = (amount) => {
    const safeVal = Math.max(1, Math.min(currentPayable, Math.round(amount)));
    setRequestedExtraReduction(String(safeVal));
    setProposedFinalInput(String(Math.max(0, currentPayable - safeVal)));
    setErrorMsg('');
    setFieldErrors((prev) => ({ ...prev, reduction: false }));
  };

  const handleUploadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const remaining = MAX_IMAGES - evidenceImages.length;
    if (remaining <= 0) {
      showToast?.(`Chỉ được đính kèm tối đa ${MAX_IMAGES} ảnh bằng chứng.`, 'error');
      return;
    }
    const batch = files.slice(0, remaining);
    setUploading(true);
    setErrorMsg('');
    try {
      const uploadedUrls = [];
      for (const file of batch) {
        const url = await uploadCheckoutEvidenceImage(file);
        if (url) uploadedUrls.push(url);
      }
      setEvidenceImages((prev) => {
        const next = [...prev];
        for (const u of uploadedUrls) {
          if (!next.includes(u) && next.length < MAX_IMAGES) {
            next.push(u);
          }
        }
        return next;
      });
      if (uploadedUrls.length > 0) {
        showToast?.(`Đã tải lên ${uploadedUrls.length} ảnh bằng chứng hư hao.`);
      }
    } catch (error) {
      setErrorMsg(error?.message || 'Không thể tải ảnh bằng chứng lên.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!Number.isFinite(parsedReduction) || parsedReduction <= 0) {
      setFieldErrors({ reduction: true });
      setErrorMsg('Số tiền xin giảm thêm phải lớn hơn 0 đ.');
      reductionInputRef.current?.focus();
      return;
    }
    if (parsedReduction > currentPayable) {
      setFieldErrors({ reduction: true });
      setErrorMsg(`Số tiền xin giảm (${formatVND(parsedReduction)}) không được vượt quá mức đang yêu cầu đền (${formatVND(currentPayable)}).`);
      reductionInputRef.current?.focus();
      return;
    }
    const trimmedOpinion = guestOpinion.trim();
    if (trimmedOpinion.length < 5) {
      setFieldErrors({ opinion: true });
      setErrorMsg('Vui lòng ghi rõ ý kiến / lý do xin giảm của khách hàng (tối thiểu 5 ký tự).');
      opinionInputRef.current?.focus();
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = await createCompensationNegotiation(bookingId, {
        chargeId: charge.id,
        requestedExtraReduction: parsedReduction,
        guestOpinion: trimmedOpinion,
        managerNote: managerNote.trim() || undefined,
        evidenceImages,
        isUrgent,
      });
      showToast?.('Đã gửi phiếu đề xuất thương lượng bồi thường lên Admin!');
      onSubmitted?.(result);
    } catch (error) {
      setErrorMsg(error?.message || 'Không thể gửi phiếu đề xuất thương lượng.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="admin-native-dialog dialog-md"
      closedby="closerequest"
      aria-labelledby="neg-dialog-title"
      onCancel={(e) => {
        if (submitting || uploading) {
          e.preventDefault();
          return;
        }
        onClose?.();
      }}
    >
      <div className="fin-dialog-header">
        <div>
          <h2 id="neg-dialog-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
            Phiếu Đề xuất Thương lượng Giảm Bồi thường (Gửi Admin)
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6B7280' }}>
            Thiết bị: <strong>{charge.itemName}</strong> · Mức đang yêu cầu đền:{' '}
            <strong className="tabular-nums" style={{ color: '#B91C1C' }}>
              {formatVND(currentPayable)}
            </strong>
          </p>
        </div>
        <button
          type="button"
          className="row-action-btn"
          aria-label="Đóng hộp thoại đề xuất thương lượng"
          disabled={submitting || uploading}
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>

      <form noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
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

          {/* Baseline Summary Box */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '12.5px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '10px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Giá niêm yết &amp; Khấu hao</div>
              <div className="tabular-nums" style={{ fontWeight: 700, color: '#0F172A' }}>
                {formatVND(charge.unitPrice)} × {charge.quantity} ({charge.depreciationPercent}%)
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                {COMPENSATION_MODE_META[charge.compensationMode]?.label || charge.compensationMode}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Đã giảm thiện chí trước đó</div>
              <div className="tabular-nums" style={{ fontWeight: 700, color: '#0369A1' }}>
                -{formatVND(charge.adjustmentAmount || 0)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Đang yêu cầu khách đền</div>
              <div className="tabular-nums" style={{ fontWeight: 800, fontSize: '14px', color: '#B91C1C' }}>
                {formatVND(currentPayable)}
              </div>
            </div>
          </div>

          {/* 2-way synced reduction & proposed final */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            <div>
              <label htmlFor="neg-extra-reduction" className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>
                Số tiền xin giảm thêm (VNĐ) *
              </label>
              <input
                ref={reductionInputRef}
                id="neg-extra-reduction"
                name="requestedExtraReduction"
                type="number"
                inputMode="numeric"
                min={1}
                max={currentPayable}
                step={1}
                required
                autoFocus
                aria-invalid={fieldErrors.reduction || isReductionOverLimit ? 'true' : undefined}
                aria-describedby="neg-extra-reduction-hint"
                className="filter-input tabular-nums"
                style={{ width: '100%', fontWeight: 700 }}
                value={requestedExtraReduction}
                onChange={(e) => handleReductionChange(e.target.value)}
              />
              <div
                id="neg-extra-reduction-hint"
                className="tabular-nums"
                style={{
                  fontSize: '11.5px',
                  marginTop: '4px',
                  color: isReductionOverLimit ? '#B91C1C' : '#0369A1',
                  fontWeight: 600,
                }}
              >
                {isReductionOverLimit
                  ? `Vượt quá mức tối đa ${formatVND(currentPayable)}`
                  : reductionNum > 0
                    ? `= ${formatVND(reductionNum)} (giảm ~${reductionPct}%)`
                    : `Tối đa ${formatVND(currentPayable)}`}
              </div>
            </div>

            <div>
              <label htmlFor="neg-proposed-final" className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>
                Mức đền khách mong muốn đóng (VNĐ)
              </label>
              <input
                id="neg-proposed-final"
                name="proposedFinalAmount"
                type="number"
                inputMode="numeric"
                min={0}
                max={Math.max(0, currentPayable - 1)}
                step={1}
                aria-describedby="neg-proposed-final-hint"
                className="filter-input tabular-nums"
                style={{ width: '100%', fontWeight: 700, color: '#166534' }}
                value={proposedFinalInput}
                onChange={(e) => handleProposedFinalChange(e.target.value)}
              />
              <div
                id="neg-proposed-final-hint"
                className="tabular-nums"
                style={{ fontSize: '11.5px', marginTop: '4px', color: '#15803D', fontWeight: 600 }}
              >
                {proposedFinalInput !== ''
                  ? `= ${formatVND(proposedFinalNum)} khách đóng cuối cùng`
                  : 'Nhập số tiền khách sẵn sàng thanh toán'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11.5px', color: '#6B7280', fontWeight: 600 }}>
              Gợi ý nhanh mức xin giảm:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '6px' }}>
              {[0.15, 0.25, 0.35, 0.5].map((ratio) => {
                const suggested = Math.max(
                  10000,
                  Math.min(currentPayable, Math.round((currentPayable * ratio) / 10000) * 10000),
                );
                const isSelected = reductionNum === suggested;
                return (
                  <button
                    key={ratio}
                    type="button"
                    aria-pressed={isSelected}
                    className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1px',
                      padding: '6px 8px',
                      lineHeight: 1.25,
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => applySuggestedReduction(suggested)}
                  >
                    <span style={{ fontWeight: 700 }}>-{Math.round(ratio * 100)}%</span>
                    <span className="tabular-nums" style={{ fontSize: '11px', opacity: 0.9 }}>
                      {formatVND(suggested)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guest Opinion */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
              <label htmlFor="neg-guest-opinion" className="filter-label" style={{ margin: 0 }}>
                Ý kiến &amp; lý do xin giảm của khách hàng *
              </label>
              <span className="tabular-nums" style={{ fontSize: '11px', color: '#64748B' }}>
                {guestOpinion.trim().length}/1000 (tối thiểu 5 ký tự)
              </span>
            </div>
            <textarea
              ref={opinionInputRef}
              id="neg-guest-opinion"
              name="guestOpinion"
              rows={3}
              required
              minLength={5}
              maxLength={1000}
              aria-invalid={fieldErrors.opinion ? 'true' : undefined}
              aria-describedby="neg-guest-opinion-hint"
              className="filter-input"
              style={{ width: '100%', resize: 'vertical' }}
              placeholder="VD: Khách trình bày khi dọn bàn vô tình làm nứt góc dưới TV, màn hình vẫn hiển thị và dùng bình thường, khách xin giảm còn 3.500.000đ..."
              value={guestOpinion}
              onChange={(e) => {
                setGuestOpinion(e.target.value);
                if (fieldErrors.opinion || errorMsg) {
                  setFieldErrors((prev) => ({ ...prev, opinion: false }));
                  setErrorMsg('');
                }
              }}
            />
            <div id="neg-guest-opinion-hint" style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>
              Ghi nhận trung thực giải trình và thiện chí của khách để Admin cân nhắc mức giảm.
            </div>
          </div>

          {/* Manager Assessment */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
              <label htmlFor="neg-manager-note" className="filter-label" style={{ margin: 0 }}>
                Đánh giá thực tế &amp; đề xuất của Manager cơ sở
              </label>
              <span className="tabular-nums" style={{ fontSize: '11px', color: '#64748B' }}>
                {managerNote.trim().length}/1000
              </span>
            </div>
            <textarea
              id="neg-manager-note"
              name="managerNote"
              rows={2}
              maxLength={1000}
              className="filter-input"
              style={{ width: '100%', resize: 'vertical' }}
              placeholder="VD: Đã kiểm tra thực tế tại phòng 204, vết nứt dài khoảng 4cm ở viền, đã báo kỹ thuật kiểm tra chi phí thay..."
              value={managerNote}
              onChange={(e) => setManagerNote(e.target.value)}
            />
          </div>

          {/* Multi-Image Evidence Upload */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span className="filter-label" style={{ margin: 0 }}>
                Hình ảnh hư hao thực tế gửi Admin ({evidenceImages.length}/{MAX_IMAGES})
              </span>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={uploading || submitting || evidenceImages.length >= MAX_IMAGES}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={13} /> {uploading ? 'Đang tải ảnh...' : 'Tải ảnh hư hỏng lên'}
              </button>
              <input
                ref={fileInputRef}
                id="neg-evidence-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                tabIndex={-1}
                aria-hidden="true"
                disabled={uploading || submitting || evidenceImages.length >= MAX_IMAGES}
                className="visually-hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  handleUploadFiles(files);
                  e.target.value = '';
                }}
              />
            </div>

            {evidenceImages.length === 0 ? (
              <div
                style={{
                  border: '1px dashed #CBD5E1',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#64748B',
                  backgroundColor: '#FAFBFD',
                }}
              >
                Chưa có ảnh đính kèm. Khuyến nghị tải ảnh chụp rõ góc hư hỏng của thiết bị (JPG/PNG/WEBP, tối đa 5MB/ảnh) để Admin duyệt nhanh.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: '8px' }}>
                {evidenceImages.map((url, idx) => (
                  <div
                    key={url}
                    style={{
                      position: 'relative',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#F8FAFC',
                    }}
                  >
                    <a
                      href={resolveEvidenceImageUrl(url)}
                      target="_blank"
                      rel="noreferrer"
                      title="Mở ảnh kích thước gốc"
                      style={{ display: 'block' }}
                    >
                      <img
                        src={resolveEvidenceImageUrl(url)}
                        alt={`Hiện trạng hư hỏng ${charge.itemName} số ${idx + 1}`}
                        width={160}
                        height={110}
                        style={{ width: '100%', height: '82px', objectFit: 'cover', display: 'block' }}
                      />
                    </a>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px', fontSize: '11px' }}>
                      <a
                        href={resolveEvidenceImageUrl(url)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#2563EB', display: 'inline-flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}
                      >
                        <ExternalLink size={11} /> Xem
                      </a>
                      <button
                        type="button"
                        className="row-action-btn"
                        aria-label={`Xóa ảnh bằng chứng số ${idx + 1}`}
                        style={{ color: '#B91C1C', padding: '2px 4px' }}
                        onClick={() => setEvidenceImages((prev) => prev.filter((item) => item !== url))}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Urgent Flag */}
          <label
            htmlFor="neg-is-urgent"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12.5px',
              padding: '8px 10px',
              borderRadius: '8px',
              backgroundColor: isUrgent ? '#FFFBEB' : '#F8FAFC',
              border: isUrgent ? '1px solid #FDE68A' : '1px solid #E2E8F0',
              cursor: 'pointer',
            }}
          >
            <input
              id="neg-is-urgent"
              name="isUrgent"
              type="checkbox"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
            />
            <span>
              <strong>Khẩn cấp:</strong> Khách hàng đang chờ làm thủ tục trả phòng tại quầy (ưu tiên báo Admin xử lý ngay).
            </span>
          </label>
        </div>

        <div className="fin-dialog-footer">
          <button type="button" className="btn btn-secondary" disabled={submitting || uploading} onClick={onClose}>
            Hủy bỏ
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting || uploading}>
            <Send size={14} />{' '}
            {submitting
              ? 'Đang gửi lên Admin...'
              : `Gửi đề xuất giảm ${reductionNum > 0 ? formatVND(reductionNum) : ''}`}
          </button>
        </div>
      </form>
    </dialog>
  );
}
