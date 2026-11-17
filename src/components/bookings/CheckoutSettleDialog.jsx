import { useEffect, useRef, useState } from 'react';
import {
  Banknote,
  QrCode,
  CreditCard,
  Globe,
  CheckCircle2,
  X,
  RefreshCw,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { formatVND } from '../../data/mockData.js';
import {
  settleBookingCheckout,
  createVnpaySettlementUrl,
} from '../../api/checkoutSettlement.js';

export default function CheckoutSettleDialog({
  isOpen,
  onClose,
  folio,
  onSettled,
  onRefreshFolio,
  showToast,
}) {
  const dialogRef = useRef(null);
  const cashInputRef = useRef(null);
  const dueAmount = Number(folio?.summary?.settlementDueAmount || 0);
  const hasDue = dueAmount > 0;

  const [paymentMethod, setPaymentMethod] = useState(
    hasDue
      ? (folio?.invoice?.settlementStatus === 'PENDING_PAYMENT' ? 'VNPAY' : 'CASH')
      : 'NO_EXTRA_CHARGE',
  );
  const [cashReceived, setCashReceived] = useState(String(Math.max(0, dueAmount)));
  const [providerRef, setProviderRef] = useState('');
  const [note, setNote] = useState('');
  const [guestConfirmed, setGuestConfirmed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [vnpaySession, setVnpaySession] = useState(null);

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

  if (!folio) return null;

  const { booking, summary, vietQr, settlementPayments = [] } = folio;
  const existingPendingVnpay =
    settlementPayments.find((p) => p.paymentMethod === 'VNPAY' && p.status === 'PENDING') || null;
  const cashReceivedNum = Number(cashReceived || 0);
  const cashChange = paymentMethod === 'CASH' && Number.isFinite(cashReceivedNum)
    ? Math.max(0, Math.round(cashReceivedNum - dueAmount))
    : 0;
  const isCashShort = paymentMethod === 'CASH' && dueAmount > 0 && (!Number.isFinite(cashReceivedNum) || cashReceivedNum < dueAmount);

  const handleConfirmDirectSettle = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (paymentMethod === 'VNPAY') {
      await handleCreateVnpay();
      return;
    }

    if (isCashShort) {
      setErrorMsg(`Tiền khách đưa phải lớn hơn hoặc bằng ${formatVND(dueAmount)}.`);
      cashInputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const updatedFolio = await settleBookingCheckout(booking.id, {
        paymentMethod: dueAmount <= 0 ? 'NO_EXTRA_CHARGE' : paymentMethod,
        cashReceived: paymentMethod === 'CASH' ? Math.round(cashReceivedNum) : undefined,
        providerRef: providerRef.trim() || undefined,
        guestConfirmed,
        note: note.trim() || undefined,
      });
      showToast?.('Kết toán hóa đơn & hoàn tất trả phòng thành công!');
      onSettled?.(updatedFolio, true);
    } catch (error) {
      setErrorMsg(error?.message || 'Không thể kết toán trả phòng.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateVnpay = async () => {
    setErrorMsg('');
    setSubmitting(true);
    try {
      const res = await createVnpaySettlementUrl(booking.id, {
        guestConfirmed,
        note: note.trim() || undefined,
      });
      setVnpaySession(res?.vnpaySession || null);
      if (res?.folio) {
        onRefreshFolio?.(res.folio);
      }
      showToast?.('Đã tạo mã QR / liên kết thanh toán VNPay cho phần phát sinh.');
    } catch (error) {
      setErrorMsg(error?.message || 'Không thể khởi tạo giao dịch VNPay.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckVnpayStatus = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const fresh = await onRefreshFolio?.();
      if (fresh?.invoice?.settlementStatus === 'SETTLED') {
        showToast?.('Khách hàng đã hoàn tất thanh toán phát sinh qua VNPay!');
        onSettled?.(fresh, true);
      } else {
        showToast?.('Giao dịch VNPay vẫn đang chờ khách hoàn tất.', 'info');
      }
    } catch (error) {
      setErrorMsg(error?.message || 'Không thể kiểm tra trạng thái VNPay.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyVnpay = () => {
    if (!vnpaySession?.vnpayUrl) return;
    navigator.clipboard?.writeText(vnpaySession.vnpayUrl);
    showToast?.('Đã sao chép liên kết thanh toán VNPay.');
  };

  return (
    <dialog
      ref={dialogRef}
      className="admin-native-dialog"
      closedby="closerequest"
      aria-labelledby="settle-dialog-title"
      onCancel={(e) => {
        if (submitting) {
          e.preventDefault();
          return;
        }
        onClose?.();
      }}
    >
      <div className="fin-dialog-header">
        <div>
          <h2 id="settle-dialog-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
            Kết toán Hóa đơn &amp; Hoàn tất Trả phòng
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6B7280' }}>
            Đơn #{booking?.code} · {booking?.customer?.name} · {booking?.accommodation?.name}
          </p>
        </div>
        <button
          type="button"
          className="row-action-btn"
          aria-label="Đóng"
          disabled={submitting}
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>

      <form noValidate onSubmit={handleConfirmDirectSettle} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
        <div className="fin-dialog-body">
          {errorMsg && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                marginBottom: '14px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#B91C1C',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              {errorMsg}
            </div>
          )}

          <div className="settle-dialog-grid">
            {/* Left: Financial Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ border: '1px solid #E5E7EB', borderRadius: '10px', padding: '14px', background: '#FAFBFD' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1F2937', marginBottom: '10px' }}>
                  Tóm tắt 3 phần đối trừ hóa đơn
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#4B5563' }}>1. Tiền phòng &amp; dịch vụ đơn gốc (A):</span>
                    <strong className="tabular-nums">{formatVND(summary?.bookingOriginalTotal)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369A1' }}>
                    <span>• Minibar &amp; Ẩm thực:</span>
                    <span className="tabular-nums">{formatVND(summary?.minibarTotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5B21B6' }}>
                    <span>• Dịch vụ bổ sung:</span>
                    <span className="tabular-nums">{formatVND(summary?.extraServiceTotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#92400E' }}>
                    <span>• Phí vệ sinh đặc biệt:</span>
                    <span className="tabular-nums">{formatVND(summary?.specialCleaningTotal)}</span>
                  </div>
                  {Number(summary?.incidentalTaxTotal || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4B5563' }}>
                      <span>• Thuế VAT phát sinh thêm:</span>
                      <span className="tabular-nums">{formatVND(summary?.incidentalTaxTotal)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#B91C1C' }}>
                    <span>• Bồi thường hư hỏng thiết bị (0% VAT):</span>
                    <span className="tabular-nums">{formatVND(summary?.compensationTotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #D1D5DB', paddingTop: '6px' }}>
                    <span style={{ fontWeight: 600 }}>2. Tổng phát sinh lưu trú (B):</span>
                    <strong className="tabular-nums">{formatVND(summary?.incidentalGrandTotal)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tổng giá trị cả kỳ lưu trú (A + B):</span>
                    <strong className="tabular-nums">{formatVND(summary?.stayGrandTotal)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534' }}>
                    <span>Trừ đã thanh toán trước khi nhận phòng:</span>
                    <strong className="tabular-nums">-{formatVND(summary?.prepaidAmount)}</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '2px solid #292D32',
                      paddingTop: '8px',
                      marginTop: '4px',
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '13.5px' }}>CẦN THU KHI TRẢ PHÒNG:</span>
                    <span
                      className="tabular-nums"
                      style={{
                        fontWeight: 800,
                        fontSize: '18px',
                        color: hasDue ? '#B45309' : '#166534',
                      }}
                    >
                      {formatVND(dueAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <label
                htmlFor="settle-guest-confirmed"
                style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}
              >
                <input
                  id="settle-guest-confirmed"
                  type="checkbox"
                  checked={guestConfirmed}
                  onChange={(e) => setGuestConfirmed(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span>Khách hàng đã trực tiếp kiểm tra bảng kê phát sinh và xác nhận số tiền kết toán.</span>
              </label>

              <div>
                <label htmlFor="settle-note" className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>
                  Ghi chú kết toán (Hiển thị trên hóa đơn nếu có)
                </label>
                <textarea
                  id="settle-note"
                  rows={2}
                  className="filter-input"
                  style={{ width: '100%' }}
                  placeholder="VD: Đã bàn giao đủ chìa khóa phòng, khách xác nhận minibar..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            {/* Right: Payment Method Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1F2937' }}>
                Chọn hình thức thanh toán phần chênh lệch
              </div>

              {!hasDue ? (
                <div
                  style={{
                    border: '2px solid #16A34A',
                    borderRadius: '10px',
                    padding: '14px',
                    backgroundColor: '#F0FDF4',
                    color: '#166534',
                    fontSize: '13px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                    <CheckCircle2 size={18} /> Không phát sinh chi phí thêm (0 đ)
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: '#15803D' }}>
                    Khách đã thanh toán đủ 100% giá trị đặt phòng từ trước và không có phụ thu / bồi thường thêm.
                    Bấm xác nhận để xuất hóa đơn hoàn chỉnh và đóng đơn trả phòng.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { id: 'CASH', label: 'Tiền mặt tại quầy', Icon: Banknote },
                      { id: 'BANK_TRANSFER', label: 'Chuyển khoản VietQR', Icon: QrCode },
                      { id: 'POS_CARD', label: 'Quẹt thẻ POS', Icon: CreditCard },
                      { id: 'VNPAY', label: 'Thanh toán VNPay Online', Icon: Globe },
                    ].map(({ id, label, Icon }) => {
                      const active = paymentMethod === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(id);
                            setErrorMsg('');
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: active ? '2px solid #292D32' : '1px solid #D1D5DB',
                            backgroundColor: active ? '#F3F4F6' : '#FFFFFF',
                            fontWeight: active ? 700 : 500,
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <Icon size={16} />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {paymentMethod === 'CASH' && (
                    <div style={{ border: '1px solid #E5E7EB', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label htmlFor="cash-received" className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>
                          Tiền mặt khách đưa (VNĐ)
                        </label>
                        <input
                          ref={cashInputRef}
                          id="cash-received"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          aria-invalid={isCashShort ? 'true' : undefined}
                          aria-describedby="cash-received-hint"
                          className="filter-input tabular-nums"
                          style={{ width: '100%', fontWeight: 700, fontSize: '15px' }}
                          value={cashReceived}
                          onChange={(e) => {
                            setCashReceived(e.target.value);
                            if (errorMsg) setErrorMsg('');
                          }}
                        />
                        <div
                          id="cash-received-hint"
                          className="tabular-nums"
                          style={{
                            fontSize: '11.5px',
                            marginTop: '4px',
                            color: isCashShort ? '#B91C1C' : '#0369A1',
                            fontWeight: 600,
                          }}
                        >
                          {isCashShort
                            ? `Còn thiếu ${formatVND(dueAmount - Math.max(0, Math.round(cashReceivedNum || 0)))} so với số cần thu`
                            : `= ${formatVND(Math.max(0, Math.round(cashReceivedNum || 0)))}`}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => setCashReceived(String(dueAmount))}
                          >
                            Đúng {formatVND(dueAmount)}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => setCashReceived(String(Math.ceil(dueAmount / 500000) * 500000))}
                          >
                            Làm tròn 500k
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => setCashReceived(String(dueAmount + 200000))}
                          >
                            +200k
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          backgroundColor: isCashShort ? '#FEF2F2' : '#F0FDF4',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                      >
                        <span>Tiền thối / trả lại khách:</span>
                        <strong className="tabular-nums" style={{ color: isCashShort ? '#B91C1C' : '#166534' }}>
                          {isCashShort ? 'Chưa đủ số tiền cần thu' : formatVND(cashChange)}
                        </strong>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'BANK_TRANSFER' && (
                    <div style={{ border: '1px solid #E5E7EB', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {vietQr?.imageUrl || vietQr?.qrDataUrl ? (
                          <img
                            src={vietQr.imageUrl || vietQr.qrDataUrl}
                            alt="Mã QR chuyển khoản VietQR"
                            style={{ width: '138px', height: '138px', objectFit: 'contain', border: '1px solid #E5E7EB', borderRadius: '8px', background: '#fff' }}
                            onError={(e) => {
                              if (vietQr?.qrDataUrl && e.currentTarget.src !== vietQr.qrDataUrl) {
                                e.currentTarget.src = vietQr.qrDataUrl;
                              }
                            }}
                          />
                        ) : null}
                        <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                          <div><strong>Ngân hàng:</strong> {vietQr?.bankName}</div>
                          <div><strong>Số TK:</strong> <span className="tabular-nums">{vietQr?.accountNo}</span></div>
                          <div><strong>Chủ TK:</strong> {vietQr?.accountName}</div>
                          <div><strong>Số tiền:</strong> <strong className="tabular-nums">{formatVND(dueAmount)}</strong></div>
                          <div><strong>Nội dung CK:</strong> <code>{vietQr?.transferContent}</code></div>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="bank-ref" className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>
                          Mã giao dịch ngân hàng (tùy chọn)
                        </label>
                        <input
                          id="bank-ref"
                          type="text"
                          className="filter-input"
                          style={{ width: '100%' }}
                          placeholder="VD: FT26320123456"
                          value={providerRef}
                          onChange={(e) => setProviderRef(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'POS_CARD' && (
                    <div style={{ border: '1px solid #E5E7EB', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <p style={{ margin: 0, fontSize: '12.5px', color: '#4B5563' }}>
                        Thực hiện quẹt thẻ số tiền <strong>{formatVND(dueAmount)}</strong> trên máy POS tại quầy, sau đó nhập mã chuẩn chi (Approval Code) nếu cần đối soát.
                      </p>
                      <div>
                        <label htmlFor="pos-ref" className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>
                          Mã chuẩn chi / Hóa đơn POS (tùy chọn)
                        </label>
                        <input
                          id="pos-ref"
                          type="text"
                          className="filter-input"
                          style={{ width: '100%' }}
                          placeholder="VD: POS-88412"
                          value={providerRef}
                          onChange={(e) => setProviderRef(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'VNPAY' && (
                    <div style={{ border: '1px solid #E5E7EB', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {!vnpaySession ? (
                        existingPendingVnpay ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div
                              style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                backgroundColor: '#FFFBEB',
                                border: '1px solid #FDE68A',
                                fontSize: '12px',
                                color: '#78350F',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                              }}
                            >
                              <div style={{ fontWeight: 700, color: '#92400E' }}>
                                Đang có giao dịch VNPay chờ khách thanh toán online
                              </div>
                              <div>
                                <strong>Mã lượt thu:</strong> <code>{existingPendingVnpay.settlementCode}</code>
                              </div>
                              {existingPendingVnpay.vnpTxnRef && (
                                <div>
                                  <strong>Mã tham chiếu VNPay:</strong> <code>{existingPendingVnpay.vnpTxnRef}</code>
                                </div>
                              )}
                              <div>
                                <strong>Số tiền:</strong>{' '}
                                <strong className="tabular-nums">{formatVND(existingPendingVnpay.amount)}</strong>
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                disabled={submitting}
                                onClick={handleCheckVnpayStatus}
                              >
                                <RefreshCw size={13} /> Kiểm tra đã thanh toán chưa
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                disabled={submitting}
                                onClick={handleCreateVnpay}
                              >
                                <Globe size={13} /> {submitting ? 'Đang khởi tạo...' : 'Tạo mã QR / link VNPay mới'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p style={{ margin: 0, fontSize: '12.5px', color: '#4B5563' }}>
                              Tạo mã QR / liên kết thanh toán VNPay cho số tiền phát sinh <strong>{formatVND(dueAmount)}</strong>.
                              Khách có thể quét trực tiếp hoặc tự thanh toán từ tài khoản <em>Đặt phòng của tôi</em> trên Website.
                            </p>
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={submitting}
                              onClick={handleCreateVnpay}
                            >
                              <Globe size={14} /> {submitting ? 'Đang khởi tạo...' : 'Tạo QR & Liên kết thanh toán VNPay'}
                            </button>
                          </>
                        )
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {vnpaySession.qrDataUrl && (
                              <img
                                src={vnpaySession.qrDataUrl}
                                alt="QR thanh toán VNPay phát sinh"
                                style={{ width: '132px', height: '132px', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                              />
                            )}
                            <div style={{ fontSize: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div><strong>Mã tham chiếu VNPay:</strong> <code>{vnpaySession.txnRef}</code></div>
                              <div><strong>Số tiền:</strong> <strong>{formatVND(vnpaySession.amount)}</strong></div>
                              <div style={{ color: '#B45309', fontWeight: 600 }}>
                                Trạng thái: Chờ khách thanh toán online
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            <a
                              href={vnpaySession.vnpayUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm btn-primary"
                            >
                              <ExternalLink size={13} /> Mở trang VNPay
                            </a>
                            <button type="button" className="btn btn-sm btn-secondary" onClick={handleCopyVnpay}>
                              <Copy size={13} /> Sao chép link
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              disabled={submitting}
                              onClick={handleCheckVnpayStatus}
                            >
                              <RefreshCw size={13} /> Kiểm tra đã thanh toán chưa
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="fin-dialog-footer">
          <button type="button" className="btn btn-secondary" disabled={submitting} onClick={onClose}>
            Đóng
          </button>
          {paymentMethod !== 'VNPAY' && (
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              <CheckCircle2 size={14} />{' '}
              {submitting
                ? 'Đang xử lý kết toán...'
                : !hasDue
                  ? 'Xác nhận tất toán 0đ & In hóa đơn'
                  : 'Xác nhận đã thu đủ & Hoàn tất trả phòng'}
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}
