import { useEffect, useId, useRef, useState } from 'react';
import { X, Mail, AlertCircle } from 'lucide-react';
import { financialReportsApi } from '../../api/financialReports.js';
import { formatVND } from '../../data/mockData.js';

export default function FinancialWarningEmailModal({
  property,
  periodFilters,
  onClose,
  onSent,
  showToast,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const [sending, setSending] = useState(false);

  const defaultType = property?.net_profit_after_tax < 0
    ? 'NEGATIVE_PROFIT'
    : property?.total_net_revenue === 0
      ? 'ZERO_REVENUE'
      : 'LOW_PERFORMANCE';

  const [prevPropertyId, setPrevPropertyId] = useState(null);
  const [warningType, setWarningType] = useState(defaultType);
  const [adminNote, setAdminNote] = useState('');

  if ((property?.accommodation_id ?? null) !== prevPropertyId) {
    setPrevPropertyId(property?.accommodation_id ?? null);
    if (property) {
      setWarningType(defaultType);
      setAdminNote(
        `Đề nghị quản lý rà soát công suất phòng, tối ưu định phí vận hành (điện/nước/nhân sự) và gửi báo cáo giải trình phương án tăng doanh thu cho ${property.accommodation_name} trong 48 giờ tới.`,
      );
    }
  }

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return undefined;

    if (property && !dlg.open) {
      dlg.showModal();
    }

    const handleClose = () => {
      dlg.returnValue = '';
      onClose?.();
    };
    dlg.addEventListener('close', handleClose);
    return () => dlg.removeEventListener('close', handleClose);
  }, [property, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!property) return;
    setSending(true);
    try {
      const res = await financialReportsApi.sendWarningEmail(property.accommodation_id, {
        ...periodFilters,
        warningType,
        adminNote,
      });
      if (res?.deliverySuccess) {
        showToast?.(`Đã gửi Gmail cảnh báo tới ${property.manager_personal_email}.`);
      } else {
        showToast?.('Đã lưu lịch sử cảnh báo nhưng gửi SMTP thất bại.', 'error');
      }
      onSent?.();
      dialogRef.current?.close('sent');
    } catch (err) {
      showToast?.(err.message || 'Không thể gửi Gmail cảnh báo.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="admin-native-dialog dialog-md"
      aria-labelledby={titleId}
      closedby="any"
    >
      <div className="fin-dialog-header">
        <div>
          <h2 id={titleId} style={{ margin: 0, fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={18} style={{ color: '#DC2626' }} aria-hidden="true" />
            <span>Gửi Gmail Cảnh báo Hiệu suất Manager</span>
          </h2>
          {property && (
            <div style={{ fontSize: '12.5px', color: '#6B7280', marginTop: '4px' }}>
              {property.accommodation_name} · Người nhận: <strong>{property.manager_name}</strong> ({property.manager_personal_email})
            </div>
          )}
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => dialogRef.current?.close('cancel')}
          aria-label="Đóng hộp thoại gửi cảnh báo"
        >
          <X size={16} />
        </button>
      </div>

      {property && (
        <form onSubmit={handleSubmit}>
          <div className="fin-dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {property.is_new_manager_under_30_days && (
              <div style={{ padding: '10px 12px', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '8px', fontSize: '12.5px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <AlertCircle size={16} style={{ color: '#B45309', flexShrink: 0 }} />
                <span>
                  Lưu ý công bằng: Manager mới nhận bàn giao <strong>{property.days_since_assigned} ngày</strong> (&lt; 30 ngày).
                </span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Tổng Thu</div>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>{formatVND(property.total_net_revenue)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Tổng Chi OPEX</div>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>{formatVND(property.total_expenses)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Lợi nhuận Sau Thuế</div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: property.net_profit_after_tax < 0 ? '#DC2626' : '#92400E' }}>
                  {formatVND(property.net_profit_after_tax)}
                </div>
              </div>
            </div>

            <div className="fin-filter-item">
              <label htmlFor="warn-type-select">Phân loại cảnh báo</label>
              <select
                id="warn-type-select"
                className="filter-select"
                value={warningType}
                onChange={(e) => setWarningType(e.target.value)}
              >
                <option value="NEGATIVE_PROFIT">Cảnh báo Đỏ — Âm lợi nhuận / Thua lỗ</option>
                <option value="LOW_PERFORMANCE">Cảnh báo Vàng — Biên lợi nhuận mỏng (&lt; 5%)</option>
                <option value="ZERO_REVENUE">Cảnh báo Vàng — Chưa phát sinh doanh thu</option>
              </select>
            </div>

            <div className="fin-filter-item">
              <label htmlFor="warn-admin-note">Nội dung chỉ đạo &amp; yêu cầu giải trình gửi Gmail</label>
              <textarea
                id="warn-admin-note"
                rows={5}
                required
                className="form-input"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                style={{ resize: 'vertical', padding: '10px' }}
              />
            </div>
          </div>

          <div className="fin-dialog-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => dialogRef.current?.close('cancel')}
              autoFocus
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={sending || !adminNote.trim()}>
              <Mail size={15} /> {sending ? 'Đang gửi Gmail...' : 'Gửi Gmail Cảnh báo'}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
