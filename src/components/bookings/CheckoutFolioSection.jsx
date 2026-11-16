import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  Coffee,
  Car,
  Sparkles,
  ShieldAlert,
  Plus,
  Trash2,
  Upload,
  Printer,
  CheckCircle2,
  Receipt,
  Image as ImageIcon,
  MessageSquarePlus,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { formatVND, formatDateTimeVN } from '../../data/mockData.js';
import { useAdminChat } from '../../chat/ChatContext.jsx';
import {
  CATEGORY_META,
  COMPENSATION_MODE_META,
  SETTLEMENT_STATUS_META,
  NEGOTIATION_STATUS_META,
  fetchBookingCheckoutFolio,
  fetchIncidentalCatalog,
  addIncidentalCharge,
  updateIncidentalCharge,
  voidIncidentalCharge,
  uploadCheckoutEvidenceImage,
  acknowledgeCompensationNegotiation,
  resolveEvidenceImageUrl,
  getSuggestedDepreciationPercent,
} from '../../api/checkoutSettlement.js';
import CheckoutSettleDialog from './CheckoutSettleDialog.jsx';
import InvoicePrintModal from './InvoicePrintModal.jsx';
import CompensationNegotiationDialog from './CompensationNegotiationDialog.jsx';
import CompensationReviewDialog from './CompensationReviewDialog.jsx';

export default function CheckoutFolioSection({
  ref,
  bookingId,
  accommodationId,
  isAdmin: isAdminProp = false,
  canWriteBookings = false,
  initialOpenSettle = false,
  initialOpenInvoice = false,
  onSettlementCompleted,
  showToast,
}) {
  const {
    isAdmin: isChatAdmin,
    compensationRefreshTick,
    refreshCompensationSummary,
  } = useAdminChat();
  const isAdmin = Boolean(isAdminProp || isChatAdmin);

  const [folio, setFolio] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [includeVoided, setIncludeVoided] = useState(false);

  const [activeTab, setActiveTab] = useState('MINIBAR_FB');
  const [quickQtyMap, setQuickQtyMap] = useState({});

  // Custom / Service / Cleaning / Compensation form states
  const [customMinibar, setCustomMinibar] = useState({ itemName: '', unitLabel: 'Phần', quantity: 1, unitPrice: '', note: '' });
  const [serviceForm, setServiceForm] = useState({ catalogItemId: '', itemName: '', unitLabel: 'Chuyến', quantity: 1, unitPrice: '', note: '' });
  const [cleaningEnabled, setCleaningEnabled] = useState(false);
  const [cleaningForm, setCleaningForm] = useState({ catalogItemId: '', itemName: 'Vệ sinh tăng cường sau tiệc nhẹ', unitPrice: '250000', note: '', evidenceImageUrl: '' });
  const [damageForm, setDamageForm] = useState({
    catalogItemId: '',
    itemName: '',
    unitLabel: 'Chiếc',
    quantity: 1,
    unitPrice: '',
    compensationMode: 'DEPRECIATED_REPLACE',
    depreciationPercent: 75,
    adjustmentAmount: 0,
    note: '',
    evidenceImageUrl: '',
  });

  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [negotiatingCharge, setNegotiatingCharge] = useState(null);
  const [reviewingNegotiation, setReviewingNegotiation] = useState(null);
  const consumedInitialFlagRef = useRef(false);

  useImperativeHandle(ref, () => ({
    openSettle: () => {
      if (folio?.permissions?.canSettle) {
        setSettleModalOpen(true);
      } else if (folio?.permissions?.hasPendingNegotiation) {
        showToast?.(
          'Đơn đang có phiếu thương lượng bồi thường chờ Admin xác nhận. Vui lòng đợi Admin phản hồi hoặc hủy yêu cầu trước khi kết toán.',
          'warning',
        );
      }
    },
    openInvoice: () => {
      if (folio) {
        setInvoiceModalOpen(true);
      }
    },
  }), [folio, showToast]);

  const reloadData = useCallback(async (voidedFlag = includeVoided) => {
    if (!bookingId) return null;
    try {
      const [folioData, catalogData] = await Promise.all([
        fetchBookingCheckoutFolio(bookingId, { includeVoided: voidedFlag }),
        accommodationId ? fetchIncidentalCatalog(accommodationId) : Promise.resolve({ items: [] }),
      ]);
      setFolio(folioData);
      setCatalog(catalogData?.items || []);
      return folioData;
    } catch (error) {
      showToast?.(error?.message || 'Không tải được bảng kê phát sinh.', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [bookingId, accommodationId, includeVoided, showToast]);

  useEffect(() => {
    let cancelled = false;
    if (!bookingId) return undefined;
    Promise.all([
      fetchBookingCheckoutFolio(bookingId, { includeVoided }),
      accommodationId ? fetchIncidentalCatalog(accommodationId) : Promise.resolve({ items: [] }),
    ])
      .then(([folioData, catalogData]) => {
        if (cancelled) return;
        setFolio(folioData);
        setCatalog(catalogData?.items || []);
        if (!consumedInitialFlagRef.current) {
          if (initialOpenSettle && folioData?.permissions?.canSettle) {
            setSettleModalOpen(true);
            consumedInitialFlagRef.current = true;
          } else if (initialOpenInvoice) {
            setInvoiceModalOpen(true);
            consumedInitialFlagRef.current = true;
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          showToast?.(error?.message || 'Không tải được bảng kê phát sinh.', 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookingId, accommodationId, includeVoided, initialOpenSettle, initialOpenInvoice, showToast]);

  useEffect(() => {
    if (!bookingId || !compensationRefreshTick) return undefined;
    let cancelled = false;
    fetchBookingCheckoutFolio(bookingId, { includeVoided })
      .then((folioData) => {
        if (!cancelled && folioData) {
          setFolio(folioData);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [compensationRefreshTick, bookingId, includeVoided]);

  const minibarCatalog = useMemo(() => catalog.filter((c) => c.category === 'MINIBAR_FB'), [catalog]);
  const serviceCatalog = useMemo(() => catalog.filter((c) => c.category === 'EXTRA_SERVICE'), [catalog]);
  const cleaningCatalog = useMemo(() => catalog.filter((c) => c.category === 'SPECIAL_CLEANING'), [catalog]);
  const assetCatalog = useMemo(() => catalog.filter((c) => c.category === 'ROOM_ASSET'), [catalog]);

  const handleUploadEvidence = async (file, onUploaded) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadCheckoutEvidenceImage(file);
      onUploaded(url);
      showToast?.('Đã tải ảnh hiện trạng đính kèm lên hệ thống.');
    } catch (error) {
      showToast?.(error?.message || 'Lỗi tải ảnh hiện trạng.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleQuickAddMinibar = async (item) => {
    const qty = Math.max(1, Number(quickQtyMap[item.id] || 1));
    setSaving(true);
    try {
      const updated = await addIncidentalCharge(bookingId, {
        catalogItemId: item.id,
        category: 'MINIBAR_FB',
        quantity: qty,
      });
      setFolio(updated);
      setQuickQtyMap((prev) => ({ ...prev, [item.id]: 1 }));
      showToast?.(`Đã thêm ${qty} ${item.unitLabel} ${item.itemName}.`);
    } catch (error) {
      showToast?.(error?.message || 'Không thể thêm khoản minibar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomMinibar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await addIncidentalCharge(bookingId, {
        category: 'MINIBAR_FB',
        itemName: customMinibar.itemName,
        unitLabel: customMinibar.unitLabel || 'Phần',
        quantity: Number(customMinibar.quantity || 1),
        unitPrice: Number(customMinibar.unitPrice || 0),
        note: customMinibar.note || 'Bổ sung ẩm thực tại phòng',
      });
      setFolio(updated);
      setCustomMinibar({ itemName: '', unitLabel: 'Phần', quantity: 1, unitPrice: '', note: '' });
      showToast?.('Đã thêm mục minibar / đồ ăn ngoài danh mục.');
    } catch (error) {
      showToast?.(error?.message || 'Không thể thêm mục minibar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await addIncidentalCharge(bookingId, {
        catalogItemId: serviceForm.catalogItemId ? Number(serviceForm.catalogItemId) : undefined,
        category: 'EXTRA_SERVICE',
        itemName: serviceForm.itemName,
        unitLabel: serviceForm.unitLabel || 'Lần',
        quantity: Number(serviceForm.quantity || 1),
        unitPrice: Number(serviceForm.unitPrice || 0),
        note: serviceForm.note || undefined,
      });
      setFolio(updated);
      setServiceForm({ catalogItemId: '', itemName: '', unitLabel: 'Chuyến', quantity: 1, unitPrice: '', note: '' });
      showToast?.('Đã ghi nhận dịch vụ bổ sung.');
    } catch (error) {
      showToast?.(error?.message || 'Không thể ghi nhận dịch vụ bổ sung.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCleaning = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await addIncidentalCharge(bookingId, {
        catalogItemId: cleaningForm.catalogItemId ? Number(cleaningForm.catalogItemId) : undefined,
        category: 'SPECIAL_CLEANING',
        itemName: cleaningForm.itemName,
        unitLabel: 'Lần',
        quantity: 1,
        unitPrice: Number(cleaningForm.unitPrice || 0),
        note: cleaningForm.note,
        evidenceImageUrl: cleaningForm.evidenceImageUrl || undefined,
      });
      setFolio(updated);
      setCleaningForm({ catalogItemId: '', itemName: 'Vệ sinh tăng cường sau tiệc nhẹ', unitPrice: '250000', note: '', evidenceImageUrl: '' });
      setCleaningEnabled(false);
      showToast?.('Đã ghi nhận phí vệ sinh đặc biệt.');
    } catch (error) {
      showToast?.(error?.message || 'Không thể ghi nhận phí vệ sinh.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedAsset = useMemo(
    () => assetCatalog.find((a) => String(a.id) === String(damageForm.catalogItemId)) || null,
    [assetCatalog, damageForm.catalogItemId],
  );

  const damageGrossPreview = useMemo(() => {
    const qty = Math.max(1, Number(damageForm.quantity || 1));
    const unitPrice = Number(damageForm.unitPrice || 0);
    const pct =
      damageForm.compensationMode === 'FULL_REPLACE' || damageForm.compensationMode === 'REPAIR'
        ? 100
        : Number(damageForm.depreciationPercent ?? 100);
    return Math.round(qty * unitPrice * (pct / 100));
  }, [damageForm]);

  const managerDirectCap = useMemo(() => {
    const limitCfg = folio?.permissions?.managerDirectAdjustmentLimit || { maxAmountVnd: 500000, maxPercent: 15 };
    return Math.min(
      Number(limitCfg.maxAmountVnd || 500000),
      Math.round((damageGrossPreview * Number(limitCfg.maxPercent || 15)) / 100),
    );
  }, [damageGrossPreview, folio]);

  const damagePreviewAmount = useMemo(() => {
    const adj = Math.max(0, Number(damageForm.adjustmentAmount || 0));
    return Math.max(0, damageGrossPreview - adj);
  }, [damageGrossPreview, damageForm.adjustmentAmount]);

  const exceedsManagerCap =
    !isAdmin && Number(damageForm.adjustmentAmount || 0) > 0 && Number(damageForm.adjustmentAmount || 0) > managerDirectCap;

  const handleSelectAsset = (assetId) => {
    const found = assetCatalog.find((a) => String(a.id) === String(assetId));
    if (!found) {
      setDamageForm((prev) => ({ ...prev, catalogItemId: '' }));
      return;
    }
    const suggestedPct = getSuggestedDepreciationPercent(found.purchaseYear);
    setDamageForm((prev) => ({
      ...prev,
      catalogItemId: String(found.id),
      itemName: found.itemName,
      unitLabel: found.unitLabel || 'Chiếc',
      unitPrice: String(found.unitPrice),
      depreciationPercent:
        prev.compensationMode === 'DEPRECIATED_REPLACE' ? suggestedPct : 100,
    }));
  };

  const handleAddDamage = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await addIncidentalCharge(bookingId, {
        catalogItemId: damageForm.catalogItemId ? Number(damageForm.catalogItemId) : undefined,
        category: 'DAMAGE_COMPENSATION',
        itemName: damageForm.itemName,
        unitLabel: damageForm.unitLabel || 'Chiếc',
        quantity: Number(damageForm.quantity || 1),
        unitPrice: Number(damageForm.unitPrice || 0),
        compensationMode: damageForm.compensationMode,
        depreciationPercent:
          damageForm.compensationMode === 'DEPRECIATED_REPLACE'
            ? Number(damageForm.depreciationPercent)
            : 100,
        adjustmentAmount: Number(damageForm.adjustmentAmount || 0),
        note: damageForm.note,
        evidenceImageUrl: damageForm.evidenceImageUrl || undefined,
      });
      setFolio(updated);
      setDamageForm({
        catalogItemId: '',
        itemName: '',
        unitLabel: 'Chiếc',
        quantity: 1,
        unitPrice: '',
        compensationMode: 'DEPRECIATED_REPLACE',
        depreciationPercent: 75,
        adjustmentAmount: 0,
        note: '',
        evidenceImageUrl: '',
      });
      showToast?.('Đã ghi nhận khoản bồi thường thiết bị.');
    } catch (error) {
      showToast?.(error?.message || 'Không thể ghi nhận bồi thường.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustQuantity = async (charge, delta) => {
    const nextQty = Number(charge.quantity) + delta;
    if (nextQty < 1) return;
    setSaving(true);
    try {
      const updated = await updateIncidentalCharge(bookingId, charge.id, { quantity: nextQty });
      setFolio(updated);
    } catch (error) {
      showToast?.(error?.message || 'Không thể cập nhật số lượng.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleVoidCharge = async (charge) => {
    setSaving(true);
    try {
      const updated = await voidIncidentalCharge(bookingId, charge.id);
      setFolio(updated);
      showToast?.(`Đã hủy mục "${charge.itemName}" khỏi bảng kê.`);
    } catch (error) {
      showToast?.(error?.message || 'Không thể hủy khoản phát sinh.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !folio) {
    return (
      <div className="admin-card">
        <div className="admin-card-body" style={{ fontSize: '13px', color: '#6B7280' }}>
          Đang tải bảng kê lưu trú &amp; phát sinh trả phòng...
        </div>
      </div>
    );
  }

  if (!folio) return null;

  const { summary, invoice, charges = [], negotiations = [], permissions = {} } = folio;
  const canEdit = Boolean(canWriteBookings && permissions.canModifyCharges);
  const canSettle = Boolean(canWriteBookings && permissions.canSettle);
  const hasPendingNegotiation = Boolean(permissions.hasPendingNegotiation);
  const pendingNegotiations = negotiations.filter((n) => n.status === 'PENDING');
  const unackDecisions = negotiations.filter(
    (n) => ['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'].includes(n.status) && !n.managerAckAt,
  );
  const settlementMeta =
    SETTLEMENT_STATUS_META[invoice?.settlementStatus || 'DRAFT'] || SETTLEMENT_STATUS_META.DRAFT;
  const activeCharges = charges.filter((c) => c.status === 'ACTIVE');

  const handleAckDecision = async (neg) => {
    try {
      await acknowledgeCompensationNegotiation(neg.id);
      showToast?.(`Đã xác nhận tiếp nhận kết quả phiếu #${neg.negotiationCode}.`);
      await Promise.all([reloadData(includeVoided), refreshCompensationSummary().catch(() => {})]);
    } catch (error) {
      showToast?.(error?.message || 'Không thể xác nhận thông báo.', 'error');
    }
  };

  return (
    <div className="admin-card" id="checkout-folio-panel">
      <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="admin-card-title">
            Bảng kê Phát sinh Lưu trú &amp; Kết toán Trả phòng (Stay Folio)
          </div>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: '999px',
              backgroundColor: settlementMeta.bg,
              color: settlementMeta.color,
            }}
          >
            {settlementMeta.label}
          </span>
          {invoice?.invoiceCode && (
            <span className="code-badge" style={{ fontSize: '11.5px' }}>
              {invoice.invoiceCode}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => setInvoiceModalOpen(true)}
          >
            <Printer size={13} />{' '}
            {invoice?.settlementStatus === 'SETTLED' ? 'Xem & In lại Hóa đơn' : 'Xem nháp Hóa đơn'}
          </button>

          {canSettle && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setSettleModalOpen(true)}
            >
              <Receipt size={13} /> Kết toán &amp; Trả phòng
            </button>
          )}
          {!canSettle && canWriteBookings && hasPendingNegotiation && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => pendingNegotiations[0] && setReviewingNegotiation(pendingNegotiations[0])}
              title="Đang chờ Admin xác nhận phiếu thương lượng bồi thường"
            >
              <Clock size={13} /> Chờ Admin duyệt thương lượng ({pendingNegotiations.length})
            </button>
          )}
        </div>
      </div>

      <div className="admin-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Live 3-part Summary Strip */}
        <div className="folio-summary-strip">
          <div>
            <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
              1. Đơn gốc &amp; Đã cọc
            </div>
            <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>
              {formatVND(summary?.bookingOriginalTotal)}
            </div>
            <div className="tabular-nums" style={{ fontSize: '11.5px', color: '#166534' }}>
              Đã trả trước: {formatVND(summary?.prepaidAmount)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
              2. Tổng phát sinh (B)
            </div>
            <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 700, color: '#B45309', marginTop: '2px' }}>
              {formatVND(summary?.incidentalGrandTotal)}
            </div>
            <div style={{ fontSize: '11.5px', color: '#6B7280' }}>
              {activeCharges.length} mục đã ghi nhận
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Tổng toàn kỳ (A + B)
            </div>
            <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>
              {formatVND(summary?.stayGrandTotal)}
            </div>
            <div className="tabular-nums" style={{ fontSize: '11.5px', color: '#6B7280' }}>
              Bồi thường: {formatVND(summary?.compensationTotal)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Cần thu khi trả phòng
            </div>
            <div
              className="tabular-nums"
              style={{
                fontSize: '17px',
                fontWeight: 800,
                color:
                  invoice?.settlementStatus !== 'SETTLED' && Number(summary?.settlementDueAmount || 0) > 0
                    ? '#B91C1C'
                    : '#166534',
                marginTop: '2px',
              }}
            >
              {formatVND(summary?.settlementDueAmount)}
            </div>
            <div style={{ fontSize: '11.5px', color: '#166534' }}>
              {invoice?.settlementStatus === 'SETTLED'
                ? `Đã tất toán (${formatVND(summary?.settlementPaidAmount)})`
                : 'Sẵn sàng kết toán'}
            </div>
          </div>
        </div>

        {/* Add Charge Workspace (only editable while checked in & not checked out) */}
        {canEdit && (
          <div style={{ border: '1px solid #E5E7EB', borderRadius: '10px', padding: '14px', backgroundColor: '#FAFBFD' }}>
            <div className="folio-tab-bar">
              {[
                { key: 'MINIBAR_FB', label: '1. Minibar & Ẩm thực', Icon: Coffee },
                { key: 'EXTRA_SERVICE', label: '2. Xe & Dịch vụ thêm', Icon: Car },
                { key: 'SPECIAL_CLEANING', label: '3. Phí vệ sinh đặc biệt', Icon: Sparkles },
                { key: 'DAMAGE_COMPENSATION', label: '4. Bồi thường thiết bị', Icon: ShieldAlert },
              ].map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  className={`folio-tab-btn ${activeTab === key ? 'active' : ''}`}
                  onClick={() => setActiveTab(key)}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {/* Tab 1: Minibar & F&B */}
            {activeTab === 'MINIBAR_FB' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="folio-catalog-grid">
                  {minibarCatalog.map((item) => {
                    const qty = quickQtyMap[item.id] || 1;
                    return (
                      <div key={item.id} className="folio-quick-card">
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1F2937' }}>{item.itemName}</div>
                          <div className="tabular-nums" style={{ fontSize: '12px', color: '#0369A1', fontWeight: 600 }}>
                            {formatVND(item.unitPrice)} / {item.unitLabel}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            aria-label={`Số lượng ${item.itemName}`}
                            min={1}
                            max={999}
                            value={qty}
                            onChange={(e) =>
                              setQuickQtyMap((prev) => ({
                                ...prev,
                                [item.id]: Math.max(1, Number(e.target.value || 1)),
                              }))
                            }
                            className="filter-input tabular-nums"
                            style={{ width: '60px', padding: '4px 8px' }}
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            style={{ flex: 1 }}
                            disabled={saving}
                            onClick={() => handleQuickAddMinibar(item)}
                          >
                            <Plus size={13} /> Thêm
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form
                  onSubmit={handleAddCustomMinibar}
                  style={{
                    borderTop: '1px dashed #D1D5DB',
                    paddingTop: '12px',
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1.2fr auto',
                    gap: '8px',
                    alignItems: 'end',
                  }}
                >
                  <div>
                    <label htmlFor="mb-custom-name" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                      Hoặc nhập món ngoài danh mục
                    </label>
                    <input
                      id="mb-custom-name"
                      type="text"
                      required
                      className="filter-input"
                      style={{ width: '100%' }}
                      placeholder="VD: Đĩa trái cây tươi / Hải sản"
                      value={customMinibar.itemName}
                      onChange={(e) => setCustomMinibar((p) => ({ ...p, itemName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="mb-custom-unit" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                      Đơn vị
                    </label>
                    <input
                      id="mb-custom-unit"
                      type="text"
                      className="filter-input"
                      style={{ width: '100%' }}
                      value={customMinibar.unitLabel}
                      onChange={(e) => setCustomMinibar((p) => ({ ...p, unitLabel: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="mb-custom-qty" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                      SL
                    </label>
                    <input
                      id="mb-custom-qty"
                      type="number"
                      min={1}
                      required
                      className="filter-input tabular-nums"
                      style={{ width: '100%' }}
                      value={customMinibar.quantity}
                      onChange={(e) => setCustomMinibar((p) => ({ ...p, quantity: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="mb-custom-price" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                      Đơn giá (VNĐ)
                    </label>
                    <input
                      id="mb-custom-price"
                      type="number"
                      min={0}
                      step={1000}
                      required
                      className="filter-input tabular-nums"
                      style={{ width: '100%' }}
                      placeholder="120000"
                      value={customMinibar.unitPrice}
                      onChange={(e) => setCustomMinibar((p) => ({ ...p, unitPrice: e.target.value }))}
                    />
                  </div>
                  <button type="submit" className="btn btn-sm btn-secondary" disabled={saving}>
                    <Plus size={13} /> Thêm món
                  </button>
                </form>
              </div>
            )}

            {/* Tab 2: Extra Services */}
            {activeTab === 'EXTRA_SERVICE' && (
              <form onSubmit={handleAddService} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 0.8fr 0.7fr 1fr', gap: '8px', alignItems: 'end' }}>
                  <div>
                    <label htmlFor="svc-catalog" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                      Chọn dịch vụ niêm yết
                    </label>
                    <select
                      id="svc-catalog"
                      className="filter-input"
                      style={{ width: '100%' }}
                      value={serviceForm.catalogItemId}
                      onChange={(e) => {
                        const found = serviceCatalog.find((s) => String(s.id) === e.target.value);
                        if (found) {
                          setServiceForm((p) => ({
                            ...p,
                            catalogItemId: String(found.id),
                            itemName: found.itemName,
                            unitLabel: found.unitLabel,
                            unitPrice: String(found.unitPrice),
                          }));
                        } else {
                          setServiceForm((p) => ({ ...p, catalogItemId: '' }));
                        }
                      }}
                    >
                      <option value="">-- Nhập dịch vụ thỏa thuận riêng --</option>
                      {serviceCatalog.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.itemName} ({formatVND(item.unitPrice)}/{item.unitLabel})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="svc-name" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                      Tên dịch vụ hiển thị trên hóa đơn
                    </label>
                    <input
                      id="svc-name"
                      type="text"
                      required
                      className="filter-input"
                      style={{ width: '100%' }}
                      placeholder="VD: Xe đưa đón sân bay / Thuê xe máy"
                      value={serviceForm.itemName}
                      onChange={(e) => setServiceForm((p) => ({ ...p, itemName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="svc-unit" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                      Đơn vị
                    </label>
                    <input
                      id="svc-unit"
                      type="text"
                      className="filter-input"
                      style={{ width: '100%' }}
                      value={serviceForm.unitLabel}
                      onChange={(e) => setServiceForm((p) => ({ ...p, unitLabel: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="svc-qty" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                      SL
                    </label>
                    <input
                      id="svc-qty"
                      type="number"
                      min={1}
                      required
                      className="filter-input tabular-nums"
                      style={{ width: '100%' }}
                      value={serviceForm.quantity}
                      onChange={(e) => setServiceForm((p) => ({ ...p, quantity: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="svc-price" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                      Đơn giá (VNĐ)
                    </label>
                    <input
                      id="svc-price"
                      type="number"
                      min={0}
                      step={1000}
                      required
                      className="filter-input tabular-nums"
                      style={{ width: '100%' }}
                      value={serviceForm.unitPrice}
                      onChange={(e) => setServiceForm((p) => ({ ...p, unitPrice: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    id="svc-note"
                    type="text"
                    className="filter-input"
                    style={{ flex: 1 }}
                    placeholder="Ghi chú (bắt buộc nếu nhập dịch vụ ngoài danh mục, VD: Đón chuyến VN214 lúc 14h)"
                    value={serviceForm.note}
                    onChange={(e) => setServiceForm((p) => ({ ...p, note: e.target.value }))}
                  />
                  <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
                    <Plus size={13} /> Thêm dịch vụ
                  </button>
                </div>
              </form>
            )}

            {/* Tab 3: Special Cleaning */}
            {activeTab === 'SPECIAL_CLEANING' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: cleaningEnabled ? '#FEF3C7' : '#ECFDF5',
                    border: cleaningEnabled ? '1px solid #F59E0B' : '1px solid #A7F3D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ fontSize: '12.5px', color: cleaningEnabled ? '#92400E' : '#065F46' }}>
                    <strong>Nguyên tắc công bằng:</strong> Phí vệ sinh mặc định = <strong>0 đ</strong>.
                    {cleaningEnabled
                      ? ' Đang bật ghi nhận phụ phí vệ sinh đặc biệt (bắt buộc nêu lý do rõ ràng & đính kèm ảnh).'
                      : ' Nếu khách giữ phòng sạch sẽ đạt chuẩn sau lưu trú, giữ nguyên TẮT.'}
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm ${cleaningEnabled ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => setCleaningEnabled((v) => !v)}
                  >
                    {cleaningEnabled ? 'Tắt phụ phí (Giữ 0 đ)' : 'Bật tính phí vệ sinh đặc biệt'}
                  </button>
                </div>

                {cleaningEnabled && (
                  <form onSubmit={handleAddCleaning} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1fr', gap: '8px' }}>
                      <div>
                        <label htmlFor="cln-preset" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                          Khung mức vệ sinh đề xuất
                        </label>
                        <select
                          id="cln-preset"
                          className="filter-input"
                          style={{ width: '100%' }}
                          value={cleaningForm.catalogItemId}
                          onChange={(e) => {
                            const found = cleaningCatalog.find((c) => String(c.id) === e.target.value);
                            if (found) {
                              setCleaningForm((p) => ({
                                ...p,
                                catalogItemId: String(found.id),
                                itemName: found.itemName,
                                unitPrice: String(found.unitPrice),
                              }));
                            } else {
                              setCleaningForm((p) => ({ ...p, catalogItemId: '' }));
                            }
                          }}
                        >
                          <option value="">-- Tùy chỉnh mức phí --</option>
                          {cleaningCatalog.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.itemName} ({formatVND(item.unitPrice)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="cln-name" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                          Mô tả hạng mục vệ sinh
                        </label>
                        <input
                          id="cln-name"
                          type="text"
                          required
                          className="filter-input"
                          style={{ width: '100%' }}
                          value={cleaningForm.itemName}
                          onChange={(e) => setCleaningForm((p) => ({ ...p, itemName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label htmlFor="cln-price" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                          Mức phí (VNĐ)
                        </label>
                        <input
                          id="cln-price"
                          type="number"
                          min={10000}
                          step={10000}
                          required
                          className="filter-input tabular-nums"
                          style={{ width: '100%' }}
                          value={cleaningForm.unitPrice}
                          onChange={(e) => setCleaningForm((p) => ({ ...p, unitPrice: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                      <div>
                        <label htmlFor="cln-note" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                          Lý do cụ thể (Bắt buộc) *
                        </label>
                        <input
                          id="cln-note"
                          type="text"
                          required
                          minLength={3}
                          className="filter-input"
                          style={{ width: '100%' }}
                          placeholder="VD: Phòng tổ chức tiệc đổ rượu vang ra thảm và mùi hải sản nặng"
                          value={cleaningForm.note}
                          onChange={(e) => setCleaningForm((p) => ({ ...p, note: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label htmlFor="cln-photo" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                          Ảnh hiện trạng phòng
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                            <Upload size={13} /> {uploadingImage ? 'Đang tải...' : 'Tải ảnh'}
                            <input
                              id="cln-photo"
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              style={{ display: 'none' }}
                              disabled={uploadingImage}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = '';
                                handleUploadEvidence(f, (url) =>
                                  setCleaningForm((p) => ({ ...p, evidenceImageUrl: url })),
                                );
                              }}
                            />
                          </label>
                          {cleaningForm.evidenceImageUrl && (
                            <span style={{ fontSize: '11.5px', color: '#166534' }}>Đã đính kèm ✓</span>
                          )}
                        </div>
                      </div>
                      <button type="submit" className="btn btn-sm btn-primary" disabled={saving || uploadingImage}>
                        <Plus size={13} /> Áp dụng phí vệ sinh
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Tab 4: Asset Damage Compensation */}
            {activeTab === 'DAMAGE_COMPENSATION' && (
              <form onSubmit={handleAddDamage} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', color: '#4B5563', padding: '8px 10px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px' }}>
                  <strong>Quy chuẩn bồi thường tài sản khách sạn (VAT 0%):</strong> Thiết bị giá trị lớn hư hỏng nặng áp dụng khấu hao theo năm trang bị{' '}
                  (<strong>&lt;1 năm: 100%</strong> · <strong>1–2 năm: 75%</strong> · <strong>3–4 năm: 55%</strong> · <strong>≥5 năm: 35%</strong>).
                  {!isAdmin && (
                    <div style={{ marginTop: '4px', color: '#92400E' }}>
                      <strong>Phân quyền thương lượng:</strong> Quản lý cơ sở được giảm trừ thiện chí trực tiếp tối đa{' '}
                      <strong>500.000 đ (và ≤ 15%)</strong>. Nếu khách xin giảm sâu hơn, hãy ghi nhận khoản bồi thường theo mức chuẩn rồi bấm{' '}
                      <strong>&quot;Thương lượng giảm (Admin)&quot;</strong> ở danh sách bên dưới để gửi kèm ảnh hiện trạng lên Admin duyệt.
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1fr 0.7fr', gap: '8px', alignItems: 'end' }}>
                  <div>
                    <label htmlFor="dmg-asset" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                      Chọn tài sản / thiết bị phòng
                    </label>
                    <select
                      id="dmg-asset"
                      className="filter-input"
                      style={{ width: '100%' }}
                      value={damageForm.catalogItemId}
                      onChange={(e) => handleSelectAsset(e.target.value)}
                    >
                      <option value="">-- Nhập thiết bị / vật dụng khác --</option>
                      {assetCatalog.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.itemName} ({formatVND(asset.unitPrice)}{asset.purchaseYear ? ` · ${asset.purchaseYear}` : ''})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="dmg-name" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                      Tên thiết bị hư hỏng / mất mát *
                    </label>
                    <input
                      id="dmg-name"
                      type="text"
                      required
                      className="filter-input"
                      style={{ width: '100%' }}
                      placeholder="VD: Smart TV 43 inch Samsung"
                      value={damageForm.itemName}
                      onChange={(e) => setDamageForm((p) => ({ ...p, itemName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="dmg-mode" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                      Mức độ xử lý
                    </label>
                    <select
                      id="dmg-mode"
                      className="filter-input"
                      style={{ width: '100%' }}
                      value={damageForm.compensationMode}
                      onChange={(e) => {
                        const mode = e.target.value;
                        const suggested = selectedAsset
                          ? getSuggestedDepreciationPercent(selectedAsset.purchaseYear)
                          : 75;
                        setDamageForm((p) => ({
                          ...p,
                          compensationMode: mode,
                          depreciationPercent: mode === 'DEPRECIATED_REPLACE' ? suggested : 100,
                        }));
                      }}
                    >
                      <option value="REPAIR">Mức 1 · Sửa chữa / Linh kiện</option>
                      <option value="DEPRECIATED_REPLACE">Mức 2 · Thay mới có khấu hao</option>
                      <option value="FULL_REPLACE">Mức 3 · Mất mát / Đền 100%</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="dmg-qty" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                      SL
                    </label>
                    <input
                      id="dmg-qty"
                      type="number"
                      min={1}
                      required
                      className="filter-input tabular-nums"
                      style={{ width: '100%' }}
                      value={damageForm.quantity}
                      onChange={(e) => setDamageForm((p) => ({ ...p, quantity: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 1fr 1.2fr', gap: '8px', alignItems: 'end' }}>
                  <div>
                    <label htmlFor="dmg-price" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                      {damageForm.compensationMode === 'REPAIR' ? 'Chi phí sửa chữa (VNĐ) *' : 'Giá niêm yết thay mới (VNĐ) *'}
                    </label>
                    <input
                      id="dmg-price"
                      type="number"
                      min={0}
                      step={10000}
                      required
                      className="filter-input tabular-nums"
                      style={{ width: '100%' }}
                      value={damageForm.unitPrice}
                      onChange={(e) => setDamageForm((p) => ({ ...p, unitPrice: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="dmg-dep" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                      % Giá trị đền {selectedAsset?.purchaseYear ? `(Mua ${selectedAsset.purchaseYear})` : ''}
                    </label>
                    <input
                      id="dmg-dep"
                      type="number"
                      min={0}
                      max={100}
                      disabled={damageForm.compensationMode !== 'DEPRECIATED_REPLACE'}
                      className="filter-input tabular-nums"
                      style={{ width: '100%' }}
                      value={damageForm.compensationMode === 'DEPRECIATED_REPLACE' ? damageForm.depreciationPercent : 100}
                      onChange={(e) => setDamageForm((p) => ({ ...p, depreciationPercent: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="dmg-adj" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                      Giảm trừ thiện chí tại quầy (VNĐ){!isAdmin ? ` · Tối đa ${formatVND(managerDirectCap)}` : ''}
                    </label>
                    <input
                      id="dmg-adj"
                      type="number"
                      min={0}
                      step={10000}
                      aria-invalid={exceedsManagerCap ? 'true' : undefined}
                      className="filter-input tabular-nums"
                      style={{
                        width: '100%',
                        borderColor: exceedsManagerCap ? '#DC2626' : undefined,
                      }}
                      value={damageForm.adjustmentAmount}
                      onChange={(e) => setDamageForm((p) => ({ ...p, adjustmentAmount: e.target.value }))}
                    />
                    {exceedsManagerCap && (
                      <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '3px' }}>
                        Vượt hạn mức Quản lý ({formatVND(managerDirectCap)}). Hãy giảm về 0đ rồi gửi Phiếu thương lượng lên Admin!
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '7px 10px', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#991B1B', fontSize: '12.5px' }}>
                    Tạm tính bồi thường: <strong className="tabular-nums">{formatVND(damagePreviewAmount)}</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                  <div>
                    <label htmlFor="dmg-note" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                      Biên bản hiện trạng hư hỏng (Bắt buộc) *
                    </label>
                    <input
                      id="dmg-note"
                      type="text"
                      required
                      minLength={3}
                      className="filter-input"
                      style={{ width: '100%' }}
                      placeholder="VD: Vỡ tấm nền màn hình Smart TV góc phải khi kiểm tra phòng 204"
                      value={damageForm.note}
                      onChange={(e) => setDamageForm((p) => ({ ...p, note: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="dmg-photo" className="filter-label" style={{ display: 'block', marginBottom: '3px' }}>
                      Ảnh bằng chứng hư hỏng
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                        <Upload size={13} /> {uploadingImage ? 'Đang tải...' : 'Tải ảnh'}
                        <input
                          id="dmg-photo"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          style={{ display: 'none' }}
                          disabled={uploadingImage}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            handleUploadEvidence(f, (url) =>
                              setDamageForm((p) => ({ ...p, evidenceImageUrl: url })),
                            );
                          }}
                        />
                      </label>
                      {damageForm.evidenceImageUrl && (
                        <span style={{ fontSize: '11.5px', color: '#166534' }}>Đã đính kèm ✓</span>
                      )}
                    </div>
                  </div>
                  <button type="submit" className="btn btn-sm btn-primary" disabled={saving || uploadingImage || exceedsManagerCap}>
                    <Plus size={13} /> Ghi nhận bồi thường
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Active Negotiation Alert Banners */}
        {pendingNegotiations.length > 0 && (
          <div
            role="status"
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              fontSize: '12.5px',
              color: '#92400E',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, color: '#D97706' }} />
              <div>
                {isAdmin ? (
                  <>
                    <strong>Có {pendingNegotiations.length} phiếu thương lượng giảm bồi thường đang chờ Admin kiểm tra &amp; xác nhận.</strong>{' '}
                    Kiểm tra ý kiến khách và ảnh hư hao để chốt mức giảm hoặc từ chối.
                  </>
                ) : (
                  <>
                    <strong>Đang chờ Admin phản hồi {pendingNegotiations.length} phiếu thương lượng bồi thường.</strong>{' '}
                    Kết toán trả phòng tạm khóa để đảm bảo xuất đúng hóa đơn sau khi Admin chốt giá (hoặc hủy phiếu nếu khách thanh toán mức gốc ngay).
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setReviewingNegotiation(pendingNegotiations[0])}
            >
              {isAdmin ? (
                <>
                  <ShieldCheck size={13} /> Kiểm tra &amp; Xác nhận ngay
                </>
              ) : (
                <>
                  <Eye size={13} /> Xem phiếu đang chờ
                </>
              )}
            </button>
          </div>
        )}

        {!isAdmin && unackDecisions.length > 0 && (
          <div
            role="status"
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: unackDecisions[0].status === 'REJECTED' ? '#FEF2F2' : '#ECFDF5',
              border: unackDecisions[0].status === 'REJECTED' ? '1px solid #FECACA' : '1px solid #10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              fontSize: '12.5px',
              color: unackDecisions[0].status === 'REJECTED' ? '#991B1B' : '#065F46',
            }}
          >
            <div>
              <strong>
                Admin {unackDecisions[0].reviewedByName || ''} đã phản hồi phiếu #{unackDecisions[0].negotiationCode} ({unackDecisions[0].itemName}):
              </strong>{' '}
              {unackDecisions[0].status === 'REJECTED'
                ? `Từ chối giảm, giữ nguyên mức đền ${formatVND(unackDecisions[0].finalApprovedAmount)}.`
                : `Xác nhận giảm ${formatVND(unackDecisions[0].approvedExtraReduction)} → Mức đền mới: ${formatVND(unackDecisions[0].finalApprovedAmount)}.`}
              {unackDecisions[0].adminDecisionNote ? ` (${unackDecisions[0].adminDecisionNote})` : ''}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setReviewingNegotiation(unackDecisions[0])}
              >
                <Eye size={13} /> Xem chi tiết
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => handleAckDecision(unackDecisions[0])}
              >
                <CheckCircle2 size={13} /> Đã nhận thông báo
              </button>
            </div>
          </div>
        )}

        {/* Itemized Charges Table */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#292D32' }}>
              Danh sách các khoản phát sinh đã ghi nhận
            </h3>
            <label htmlFor="toggle-voided-charges" style={{ fontSize: '12px', color: '#6B7280', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                id="toggle-voided-charges"
                type="checkbox"
                checked={includeVoided}
                onChange={(e) => setIncludeVoided(e.target.checked)}
              />
              Hiển thị mục đã hủy (Audit)
            </label>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nhóm &amp; Hạng mục</th>
                  <th style={{ textAlign: 'center' }}>SL</th>
                  <th style={{ textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ textAlign: 'right' }}>Khấu hao / Giảm trừ</th>
                  <th style={{ textAlign: 'right' }}>Thành tiền</th>
                  <th>Ghi chú &amp; Minh chứng</th>
                  {canEdit && <th style={{ textAlign: 'center' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {charges.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6} style={{ textAlign: 'center', color: '#6B7280', padding: '16px' }}>
                      Chưa ghi nhận khoản phát sinh nào. Nếu khách không dùng minibar/dịch vụ và phòng sạch sẽ, tổng phát sinh là 0 đ.
                    </td>
                  </tr>
                ) : (
                  charges.map((ch) => {
                    const meta = CATEGORY_META[ch.category] || { shortLabel: ch.category, bg: '#F3F4F6', color: '#374151' };
                    const isVoided = ch.status !== 'ACTIVE';
                    const chargeNegotiations = negotiations.filter((n) => Number(n.chargeId) === Number(ch.id));
                    const pendingNeg = chargeNegotiations.find((n) => n.status === 'PENDING') || null;
                    const latestNeg = chargeNegotiations[0] || null;
                    const latestNegMeta = latestNeg
                      ? NEGOTIATION_STATUS_META[latestNeg.status] || NEGOTIATION_STATUS_META.PENDING
                      : null;
                    const hasAdminRuling = chargeNegotiations.some((n) =>
                      ['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'].includes(n.status),
                    );
                    const rowFinancialLocked = Boolean(pendingNeg) || (!isAdmin && hasAdminRuling);

                    return (
                      <tr key={ch.id} style={isVoided ? { opacity: 0.55, textDecoration: 'line-through' } : undefined}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '999px',
                                backgroundColor: meta.bg,
                                color: meta.color,
                              }}
                            >
                              {meta.shortLabel}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '13px' }}>{ch.itemName}</span>
                            {isVoided && <span className="badge badge-danger">Đã hủy</span>}
                          </div>
                          {ch.category === 'DAMAGE_COMPENSATION' && (
                            <div style={{ fontSize: '11px', color: '#991B1B', marginTop: '2px' }}>
                              {COMPENSATION_MODE_META[ch.compensationMode]?.label || ch.compensationMode}
                            </div>
                          )}
                          {latestNeg && latestNegMeta && (
                            <div style={{ marginTop: '4px' }}>
                              <button
                                type="button"
                                onClick={() => setReviewingNegotiation(latestNeg)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  backgroundColor: latestNegMeta.bg,
                                  color: latestNegMeta.color,
                                  border: `1px solid ${latestNegMeta.border}`,
                                  cursor: 'pointer',
                                }}
                              >
                                {latestNegMeta.label}
                                {latestNeg.status === 'PENDING'
                                  ? ` (-${formatVND(latestNeg.requestedExtraReduction)})`
                                  : latestNeg.status === 'REJECTED'
                                    ? ''
                                    : ` (-${formatVND(latestNeg.approvedExtraReduction)})`}
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }} className="tabular-nums">
                          {canEdit && !isVoided && ch.category !== 'SPECIAL_CLEANING' && !rowFinancialLocked ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                className="row-action-btn"
                                disabled={saving || ch.quantity <= 1}
                                onClick={() => handleAdjustQuantity(ch, -1)}
                              >
                                -
                              </button>
                              <span style={{ minWidth: '24px', fontWeight: 600 }}>{ch.quantity}</span>
                              <button
                                type="button"
                                className="row-action-btn"
                                disabled={saving}
                                onClick={() => handleAdjustQuantity(ch, 1)}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <span>{ch.quantity} {ch.unitLabel}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }} className="tabular-nums">
                          {formatVND(ch.unitPrice)}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '12px' }} className="tabular-nums">
                          {ch.category === 'DAMAGE_COMPENSATION' ? `${ch.depreciationPercent}%` : '100%'}
                          {ch.adjustmentAmount > 0 ? ` · -${formatVND(ch.adjustmentAmount)}` : ''}
                          {ch.taxAmount > 0 ? ` · VAT +${formatVND(ch.taxAmount)}` : ''}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }} className="tabular-nums">
                          {formatVND(ch.totalAmount)}
                        </td>
                        <td style={{ fontSize: '12px', maxWidth: '260px' }}>
                          {ch.note && <div style={{ color: '#374151' }}>{ch.note}</div>}
                          {ch.evidenceImageUrl && (
                            <a
                              href={resolveEvidenceImageUrl(ch.evidenceImageUrl)}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#2563EB', marginTop: '3px', textDecoration: 'underline' }}
                            >
                              <ImageIcon size={12} /> Xem ảnh hiện trạng
                            </a>
                          )}
                          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                            {ch.createdByName || 'Quản lý'} · {ch.createdAt ? formatDateTimeVN(ch.createdAt) : ''}
                          </div>
                        </td>
                        {canEdit && (
                          <td style={{ textAlign: 'center' }}>
                            {!isVoided && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {ch.category === 'DAMAGE_COMPENSATION' && (
                                  pendingNeg ? (
                                    <button
                                      type="button"
                                      className={`btn btn-sm ${isAdmin ? 'btn-primary' : 'btn-secondary'}`}
                                      onClick={() => setReviewingNegotiation(pendingNeg)}
                                    >
                                      {isAdmin ? (
                                        <>
                                          <ShieldCheck size={12} /> Duyệt giảm
                                        </>
                                      ) : (
                                        <>
                                          <Clock size={12} /> Chờ duyệt
                                        </>
                                      )}
                                    </button>
                                  ) : Number(ch.totalAmount || 0) > 0 ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-secondary"
                                      title="Lập phiếu đề xuất thương lượng giảm bồi thường gửi Admin"
                                      onClick={() => setNegotiatingCharge(ch)}
                                    >
                                      <MessageSquarePlus size={12} /> Thương lượng giảm
                                    </button>
                                  ) : null
                                )}
                                {!rowFinancialLocked && (
                                  <button
                                    type="button"
                                    className="row-action-btn"
                                    style={{ color: '#B91C1C', borderColor: '#FECACA' }}
                                    title="Hủy mục phát sinh này"
                                    aria-label={`Hủy mục ${ch.itemName}`}
                                    disabled={saving}
                                    onClick={() => handleVoidCharge(ch)}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compensation Negotiation History List */}
        {negotiations.length > 0 && (
          <div style={{ border: '1px solid #E5E7EB', borderRadius: '10px', padding: '12px 14px', backgroundColor: '#FAFBFD' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1F2937', marginBottom: '8px' }}>
              Lịch sử Phiếu thương lượng giảm bồi thường ({negotiations.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {negotiations.map((neg) => {
                const negMeta = NEGOTIATION_STATUS_META[neg.status] || NEGOTIATION_STATUS_META.PENDING;
                return (
                  <div
                    key={neg.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span className="code-badge">{neg.negotiationCode}</span>
                        <strong>{neg.itemName}</strong>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '1px 7px',
                            borderRadius: '999px',
                            backgroundColor: negMeta.bg,
                            color: negMeta.color,
                            border: `1px solid ${negMeta.border}`,
                          }}
                        >
                          {negMeta.label}
                        </span>
                      </div>
                      <div style={{ color: '#4B5563', marginTop: '4px' }} className="tabular-nums">
                        Mức trước: {formatVND(neg.previousFinalAmount)} · Xin giảm:{' '}
                        <strong>-{formatVND(neg.requestedExtraReduction)}</strong> ·{' '}
                        {neg.status === 'PENDING'
                          ? `Đề nghị còn: ${formatVND(neg.proposedFinalAmount)}`
                          : neg.status === 'CANCELLED'
                            ? 'Đã hủy'
                            : `Admin chốt: ${formatVND(neg.finalApprovedAmount)}`}
                        {neg.evidenceImages?.length > 0 ? ` · ${neg.evidenceImages.length} ảnh bằng chứng` : ''}
                      </div>
                      <div style={{ color: '#6B7280', marginTop: '2px' }}>
                        Ý kiến khách: {neg.guestOpinion}
                      </div>
                      {neg.adminDecisionNote && (
                        <div style={{ color: '#1F2937', marginTop: '2px' }}>
                          <strong>Phản hồi Admin:</strong> {neg.adminDecisionNote}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`btn btn-sm ${isAdmin && neg.status === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setReviewingNegotiation(neg)}
                    >
                      {isAdmin && neg.status === 'PENDING' ? 'Kiểm tra & Duyệt' : 'Xem chi tiết'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Confirmation if Settled */}
        {invoice?.settlementStatus === 'SETTLED' && folio.settledPayment && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: '12.5px',
              color: '#065F46',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>
                Đã tất toán hóa đơn <strong>{invoice.invoiceCode}</strong> ({folio.settledPayment.settlementCode})
                {folio.settledPayment.paidAt ? ` lúc ${formatDateTimeVN(folio.settledPayment.paidAt)}` : ''}
                {invoice.settledByName ? ` · Thực hiện bởi ${invoice.settledByName}` : ''}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setInvoiceModalOpen(true)}
            >
              <Printer size={13} /> In Hóa đơn chính thức
            </button>
          </div>
        )}
      </div>

      {/* Native Settle Dialog */}
      {settleModalOpen && (
        <CheckoutSettleDialog
          isOpen={settleModalOpen}
          onClose={() => setSettleModalOpen(false)}
          folio={folio}
          showToast={showToast}
          onRefreshFolio={async (nextFolio) => {
            if (nextFolio) {
              setFolio(nextFolio);
              return nextFolio;
            }
            return reloadData(includeVoided);
          }}
          onSettled={(updatedFolio, openPrint) => {
            setFolio(updatedFolio);
            setSettleModalOpen(false);
            if (openPrint) {
              setInvoiceModalOpen(true);
            }
            onSettlementCompleted?.(updatedFolio);
          }}
        />
      )}

      {/* Native Printable Invoice Dialog */}
      {invoiceModalOpen && (
        <InvoicePrintModal
          isOpen={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          folio={folio}
        />
      )}

      {/* Manager Proposal Dialog for Compensation Negotiation */}
      {negotiatingCharge && (
        <CompensationNegotiationDialog
          key={negotiatingCharge.id}
          isOpen={Boolean(negotiatingCharge)}
          onClose={() => setNegotiatingCharge(null)}
          bookingId={bookingId}
          charge={negotiatingCharge}
          showToast={showToast}
          onSubmitted={async (res) => {
            setNegotiatingCharge(null);
            if (res?.folio) {
              setFolio(res.folio);
            } else {
              await reloadData(includeVoided);
            }
            refreshCompensationSummary().catch(() => {});
          }}
        />
      )}

      {/* Admin Review / Negotiation Detail Dialog */}
      {reviewingNegotiation && (
        <CompensationReviewDialog
          key={reviewingNegotiation.id}
          isOpen={Boolean(reviewingNegotiation)}
          onClose={() => setReviewingNegotiation(null)}
          negotiation={reviewingNegotiation}
          isAdmin={isAdmin}
          canWriteBookings={canWriteBookings}
          showToast={showToast}
          onUpdated={async (res) => {
            setReviewingNegotiation(null);
            if (res?.folio) {
              setFolio(res.folio);
            } else {
              await reloadData(includeVoided);
            }
            refreshCompensationSummary().catch(() => {});
          }}
        />
      )}
    </div>
  );
}
