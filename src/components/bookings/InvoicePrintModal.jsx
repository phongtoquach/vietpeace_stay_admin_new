import { useEffect, useRef, useState } from 'react';
import { Printer, X, FileText, Receipt } from 'lucide-react';
import { formatVND, formatDateVN, formatDateTimeVN } from '../../data/mockData.js';
import {
  CATEGORY_META,
  COMPENSATION_MODE_META,
  PAYMENT_METHOD_META,
  SETTLEMENT_STATUS_META,
  resolveEvidenceImageUrl,
} from '../../api/checkoutSettlement.js';

export default function InvoicePrintModal({ isOpen, onClose, folio }) {
  const dialogRef = useRef(null);
  const [paperMode, setPaperMode] = useState('A4');

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

  const handleBackdropClick = (e) => {
    const dialog = dialogRef.current;
    if (!dialog || e.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const inside =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;
    if (!inside) {
      onClose?.();
    }
  };

  if (!folio) return null;

  const { booking, prepaidPayments = [], charges = [], summary, invoice, settledPayment } = folio;
  const activeCharges = charges.filter((c) => c.status === 'ACTIVE');
  const firstPrepaid = prepaidPayments.find((p) => ['SUCCESS', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(p.status));
  const statusMeta = SETTLEMENT_STATUS_META[invoice?.settlementStatus || 'DRAFT'] || SETTLEMENT_STATUS_META.DRAFT;
  const nonCompensationSubtotal =
    Number(summary.minibarTotal || 0) +
    Number(summary.extraServiceTotal || 0) +
    Number(summary.specialCleaningTotal || 0);

  return (
    <dialog
      ref={dialogRef}
      className="admin-native-dialog invoice-print-dialog"
      closedby="any"
      aria-labelledby="invoice-modal-title"
      onClose={onClose}
      onClick={handleBackdropClick}
    >
      <div className="fin-dialog-header no-print">
        <div>
          <h2 id="invoice-modal-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
            Hóa đơn Thanh toán &amp; Kết toán Trả phòng
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6B7280' }}>
            Mã hóa đơn: <strong>{invoice?.invoiceCode}</strong> · Đơn #{booking?.code}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className={`btn btn-sm ${paperMode === 'A4' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPaperMode('A4')}
          >
            <FileText size={13} /> Khổ A4
          </button>
          <button
            type="button"
            className={`btn btn-sm ${paperMode === 'K80' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPaperMode('K80')}
          >
            <Receipt size={13} /> Bill K80
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => window.print()}
          >
            <Printer size={13} /> In / Lưu PDF
          </button>
          <button
            type="button"
            className="row-action-btn"
            aria-label="Đóng hộp thoại hóa đơn"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="fin-dialog-body">
        <div className={`invoice-sheet mode-${paperMode}`}>
          {/* Top Brand & Property Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #292D32', paddingBottom: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: paperMode === 'K80' ? '14px' : '18px', fontWeight: 800, letterSpacing: '0.04em' }}>
              VIETPEACE STAY — HÓA ĐƠN THANH TOÁN
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>
              Cơ sở: {booking?.accommodation?.name}
            </div>
            {booking?.accommodation?.addressLine && (
              <div style={{ fontSize: '11.5px', color: '#4B5563' }}>
                Địa chỉ: {booking.accommodation.addressLine}
                {booking?.accommodation?.phone ? ` · ĐT: ${booking.accommodation.phone}` : ''}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: paperMode === 'K80' ? '1fr' : '1fr 1fr',
              gap: '6px 18px',
              fontSize: paperMode === 'K80' ? '11.5px' : '12.5px',
              marginBottom: '10px',
            }}
          >
            <div>
              <strong>Mã hóa đơn:</strong> {invoice?.invoiceCode}
            </div>
            <div>
              <strong>Mã đặt phòng:</strong> #{booking?.code}
            </div>
            <div>
              <strong>Khách hàng:</strong> {booking?.customer?.name}
              {booking?.customer?.guestName && booking.customer.guestName !== booking.customer.name
                ? ` (Khách ở: ${booking.customer.guestName})`
                : ''}
            </div>
            <div>
              <strong>Số điện thoại:</strong> {booking?.customer?.phone || '—'}
            </div>
            <div>
              <strong>Nhận phòng thực tế:</strong>{' '}
              {booking?.checkedInAt ? formatDateTimeVN(booking.checkedInAt) : formatDateVN(booking?.checkInDate)}
            </div>
            <div>
              <strong>Trả phòng thực tế:</strong>{' '}
              {booking?.checkedOutAt ? formatDateTimeVN(booking.checkedOutAt) : 'Chờ tất toán'}
            </div>
            <div>
              <strong>Thời gian lưu trú:</strong> {booking?.totalNights} đêm ({booking?.roomsCount} phòng)
            </div>
            <div>
              <strong>Nhân sự kết toán:</strong>{' '}
              {invoice?.settledByName || booking?.accommodation?.managerName || 'Quản lý cơ sở'}
            </div>
          </div>

          {/* Part I: Original Booking & Prepayment */}
          <div className="invoice-section-title">
            I. Chi phí đặt phòng (Đơn gốc &amp; Đã thanh toán trước)
          </div>
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Hạng mục phòng &amp; Lưu trú ban đầu</th>
                <th style={{ textAlign: 'right' }}>Thành tiền (VNĐ)</th>
              </tr>
            </thead>
            <tbody>
              {(booking?.items || []).map((item, idx) => (
                <tr key={item.id || idx}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.roomTypeName}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                      {item.adults} người lớn{item.children > 0 ? `, ${item.children} trẻ nhỏ` : ''} ·{' '}
                      Tiền phòng: {formatVND(item.roomSubtotal)}
                      {item.extraAdultTotal + item.extraChildTotal > 0
                        ? ` · Phụ thu khách thêm: ${formatVND(item.extraAdultTotal + item.extraChildTotal)}`
                        : ''}
                      {item.discountAmount > 0 ? ` · Giảm giá: -${formatVND(item.discountAmount)}` : ''}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                    {formatVND(item.totalAmount)}
                  </td>
                </tr>
              ))}
              {Number(booking?.pricing?.discountAmount || 0) > 0 && (
                <tr>
                  <td style={{ color: '#059669' }}>Ưu đãi / Mã khuyến mãi áp dụng trên đơn</td>
                  <td style={{ textAlign: 'right', color: '#059669' }} className="tabular-nums">
                    -{formatVND(booking.pricing.discountAmount)}
                  </td>
                </tr>
              )}
              {(Number(booking?.pricing?.taxAmount || 0) > 0 || Number(booking?.pricing?.serviceFee || 0) > 0) && (
                <tr>
                  <td>Thuế VAT &amp; Phí dịch vụ theo đơn đặt phòng gốc</td>
                  <td style={{ textAlign: 'right' }} className="tabular-nums">
                    {formatVND(Number(booking.pricing.taxAmount || 0) + Number(booking.pricing.serviceFee || 0))}
                  </td>
                </tr>
              )}
              <tr style={{ backgroundColor: '#F9FAFB', fontWeight: 700 }}>
                <td>TỔNG GIÁ TRỊ ĐẶT PHÒNG (A)</td>
                <td style={{ textAlign: 'right' }} className="tabular-nums">
                  {formatVND(summary?.bookingOriginalTotal)}
                </td>
              </tr>
              <tr>
                <td>
                  Đã thanh toán trước khi nhận phòng{' '}
                  {firstPrepaid ? `(${firstPrepaid.paymentMethod} · ${firstPrepaid.paymentCode})` : ''}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: '#166534' }} className="tabular-nums">
                  -{formatVND(summary?.prepaidAmount)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Part II: Incidental Charges */}
          <div className="invoice-section-title">
            II. Chi phí phát sinh &amp; Bồi thường trong quá trình lưu trú
          </div>
          <table className="invoice-table">
            <thead>
              <tr>
                <th style={{ width: '34px' }}>STT</th>
                <th>Hạng mục phát sinh</th>
                <th style={{ textAlign: 'center', width: '48px' }}>SL</th>
                <th style={{ textAlign: 'right' }}>Đơn giá</th>
                <th style={{ textAlign: 'right' }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {activeCharges.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#6B7280', padding: '12px' }}>
                    Không phát sinh chi phí thêm (Phòng đạt chuẩn bàn giao).
                  </td>
                </tr>
              ) : (
                activeCharges.map((ch, index) => {
                  const catMeta = CATEGORY_META[ch.category] || { shortLabel: ch.category };
                  return (
                    <tr key={ch.id || index}>
                      <td>{index + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          [{catMeta.shortLabel}] {ch.itemName}
                        </div>
                        {ch.category === 'DAMAGE_COMPENSATION' && (
                          <div style={{ fontSize: '11px', color: '#991B1B' }}>
                            {COMPENSATION_MODE_META[ch.compensationMode]?.label || ch.compensationMode} ·{' '}
                            Khấu hao áp dụng: {ch.depreciationPercent}% · Miễn VAT (0%)
                            {ch.adjustmentAmount > 0 ? ` · Giảm trừ thiện chí: -${formatVND(ch.adjustmentAmount)}` : ''}
                          </div>
                        )}
                        {ch.category !== 'DAMAGE_COMPENSATION' && !ch.isTaxInclusive && ch.taxAmount > 0 && (
                          <div style={{ fontSize: '11px', color: '#4B5563' }}>
                            Thuế VAT {ch.taxRate}%: +{formatVND(ch.taxAmount)}
                          </div>
                        )}
                        {ch.note && (
                          <div style={{ fontSize: '11px', color: '#4B5563' }}>Ghi chú: {ch.note}</div>
                        )}
                        {ch.evidenceImageUrl && paperMode === 'A4' && (
                          <div className="no-print" style={{ marginTop: '4px' }}>
                            <a
                              href={resolveEvidenceImageUrl(ch.evidenceImageUrl)}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: '11px', color: '#2563EB', textDecoration: 'underline' }}
                            >
                              Xem ảnh hiện trạng đính kèm
                            </a>
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }} className="tabular-nums">
                        {ch.quantity} {ch.unitLabel}
                      </td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">
                        {formatVND(ch.unitPrice)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                        {formatVND(ch.totalAmount)}
                      </td>
                    </tr>
                  );
                })
              )}
              {Number(summary?.specialCleaningTotal || 0) === 0 && (
                <tr>
                  <td>—</td>
                  <td colSpan={3} style={{ color: '#166534', fontSize: '12px' }}>
                    [Vệ sinh] Phí vệ sinh đặc biệt: Không áp dụng — Khách giữ gìn phòng đạt chuẩn
                  </td>
                  <td style={{ textAlign: 'right', color: '#166534' }} className="tabular-nums">
                    0 đ
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div
            style={{
              marginTop: '8px',
              padding: '8px 10px',
              backgroundColor: '#F9FAFB',
              borderRadius: '6px',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tổng dịch vụ phát sinh (Minibar, Xe/Dịch vụ, Vệ sinh):</span>
              <strong className="tabular-nums">{formatVND(nonCompensationSubtotal)}</strong>
            </div>
            {Number(summary?.incidentalTaxTotal || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Thuế VAT phần dịch vụ phát sinh:</span>
                <strong className="tabular-nums">{formatVND(summary.incidentalTaxTotal)}</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tổng bồi thường hư hỏng tài sản (Miễn VAT 0%):</span>
              <strong className="tabular-nums">{formatVND(summary?.compensationTotal || 0)}</strong>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid #D1D5DB',
                paddingTop: '4px',
                fontWeight: 700,
              }}
            >
              <span>TỔNG CHI PHÍ PHÁT SINH (B):</span>
              <span className="tabular-nums">{formatVND(summary?.incidentalGrandTotal || 0)}</span>
            </div>
          </div>

          {/* Part III: Final Settlement */}
          <div className="invoice-section-title">III. Tổng hợp kết toán cuối kỳ</div>
          <div
            style={{
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tổng chi phí toàn bộ kỳ lưu trú (A + B):</span>
              <strong className="tabular-nums">{formatVND(summary?.stayGrandTotal)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534' }}>
              <span>Trừ: Đã thanh toán trước khi đặt phòng:</span>
              <strong className="tabular-nums">-{formatVND(summary?.prepaidAmount)}</strong>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '2px solid #292D32',
                paddingTop: '6px',
                marginTop: '4px',
                fontSize: paperMode === 'K80' ? '13px' : '15px',
                fontWeight: 800,
              }}
            >
              <span>SỐ TIỀN THANH TOÁN KHI TRẢ PHÒNG:</span>
              <span className="tabular-nums">{formatVND(summary?.settlementDueAmount)}</span>
            </div>
          </div>

          <div
            style={{
              marginTop: '10px',
              padding: '8px 10px',
              border: '1px dashed #D1D5DB',
              borderRadius: '6px',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
            }}
          >
            <div>
              <strong>Hình thức thanh toán đợt 2:</strong>{' '}
              {settledPayment
                ? PAYMENT_METHOD_META[settledPayment.paymentMethod]?.label || settledPayment.paymentMethod
                : 'Chờ xác nhận kết toán'}
            </div>
            {settledPayment && (
              <div>
                <strong>Mã phiếu thu:</strong> {settledPayment.settlementCode}
                {settledPayment.providerRef ? ` · Mã đối soát: ${settledPayment.providerRef}` : ''}
                {settledPayment.paymentMethod === 'CASH' && settledPayment.cashReceived != null
                  ? ` · Khách đưa: ${formatVND(settledPayment.cashReceived)} · Tiền thừa: ${formatVND(settledPayment.cashChange || 0)}`
                  : ''}
              </div>
            )}
            <div>
              <strong>Trạng thái kết toán:</strong>{' '}
              <span style={{ fontWeight: 700, color: statusMeta.color }}>{statusMeta.label}</span>
              {invoice?.settledAt ? ` (${formatDateTimeVN(invoice.settledAt)})` : ''}
            </div>
            {invoice?.note && (
              <div>
                <strong>Ghi chú kết toán:</strong> {invoice.note}
              </div>
            )}
          </div>

          {/* Signature Block */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              textAlign: 'center',
              marginTop: '20px',
              paddingTop: '12px',
              fontSize: '12px',
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>Khách hàng xác nhận</div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>(Ký &amp; ghi rõ họ tên)</div>
              <div style={{ height: paperMode === 'K80' ? '32px' : '54px' }} />
              <div style={{ fontWeight: 600 }}>{booking?.customer?.name}</div>
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>Quản lý / Lễ tân lập phiếu</div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>(Ký &amp; xác nhận thu đủ)</div>
              <div style={{ height: paperMode === 'K80' ? '32px' : '54px' }} />
              <div style={{ fontWeight: 600 }}>
                {invoice?.settledByName || booking?.accommodation?.managerName || 'Đại diện VietPeace Stay'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fin-dialog-footer no-print">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Đóng
        </button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={14} /> In hóa đơn ({paperMode})
        </button>
      </div>
    </dialog>
  );
}
