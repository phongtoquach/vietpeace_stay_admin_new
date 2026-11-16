import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Power, RotateCcw, Search, X } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import { formatVND } from '../../data/mockData.js';
import {
  CATEGORY_META,
  fetchIncidentalCatalog,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  getSuggestedDepreciationPercent,
} from '../../api/checkoutSettlement.js';

const INITIAL_FORM = {
  category: 'MINIBAR_FB',
  itemCode: '',
  itemName: '',
  unitLabel: 'Lon',
  unitPrice: '',
  taxRate: '0',
  isTaxInclusive: true,
  purchaseYear: String(new Date().getFullYear()),
  sortOrder: '0',
};

export default function IncidentalCatalogPage() {
  const { accommodations, fetchAccommodations, showToast } = useAdmin();
  const { currentLoggedInUser, hasPermission } = useAuth();
  const isAdmin = currentLoggedInUser?.role === 'ADMIN';
  const canWrite = isAdmin || hasPermission('bookings.write') || hasPermission('accommodations.write');
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchAccommodations?.();
  }, [fetchAccommodations]);

  const initialAccId =
    searchParams.get('accId') ||
    (currentLoggedInUser?.accommodationId ? String(currentLoggedInUser.accommodationId) : '');

  const [selectedAccId, setSelectedAccId] = useState(initialAccId);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const [items, setItems] = useState([]);
  const [accommodationInfo, setAccommodationInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  // Dialog states
  const dialogRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const effectiveAccId = useMemo(() => {
    if (!isAdmin && currentLoggedInUser?.accommodationId) {
      return String(currentLoggedInUser.accommodationId);
    }
    if (selectedAccId) return selectedAccId;
    if (accommodations.length > 0) return String(accommodations[0].id);
    return '';
  }, [isAdmin, currentLoggedInUser?.accommodationId, selectedAccId, accommodations]);

  const loadCatalog = useCallback(async () => {
    if (!effectiveAccId) return;
    setLoading(true);
    try {
      const data = await fetchIncidentalCatalog(effectiveAccId, {
        category: categoryFilter || undefined,
        includeInactive,
        q: searchTerm.trim() || undefined,
      });
      setAccommodationInfo(data?.accommodation || null);
      setItems(data?.items || []);
    } catch (error) {
      showToast?.(error?.message || 'Không tải được danh mục phát sinh.', 'error');
    } finally {
      setLoading(false);
    }
  }, [effectiveAccId, categoryFilter, includeInactive, searchTerm, showToast]);

  useEffect(() => {
    let cancelled = false;
    if (!effectiveAccId) return undefined;
    fetchIncidentalCatalog(effectiveAccId, {
      category: categoryFilter || undefined,
      includeInactive,
      q: searchTerm.trim() || undefined,
    })
      .then((data) => {
        if (cancelled) return;
        setAccommodationInfo(data?.accommodation || null);
        setItems(data?.items || []);
      })
      .catch((error) => {
        if (!cancelled) {
          showToast?.(error?.message || 'Không tải được danh mục phát sinh.', 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveAccId, categoryFilter, includeInactive, searchTerm, showToast]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (modalOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [modalOpen]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFieldErrors({});
    setForm({
      ...INITIAL_FORM,
      category: categoryFilter || 'MINIBAR_FB',
      unitLabel:
        categoryFilter === 'ROOM_ASSET'
          ? 'Chiếc'
          : categoryFilter === 'SPECIAL_CLEANING'
            ? 'Lần'
            : categoryFilter === 'EXTRA_SERVICE'
              ? 'Chuyến'
              : 'Lon',
    });
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFieldErrors({});
    setForm({
      category: item.category,
      itemCode: item.itemCode || '',
      itemName: item.itemName || '',
      unitLabel: item.unitLabel || '',
      unitPrice: String(item.unitPrice ?? 0),
      taxRate: String(item.taxRate ?? 0),
      isTaxInclusive: Boolean(item.isTaxInclusive),
      purchaseYear: item.purchaseYear ? String(item.purchaseYear) : String(new Date().getFullYear()),
      sortOrder: String(item.sortOrder ?? 0),
    });
    setModalOpen(true);
  };

  const validateField = (name, value) => {
    if (name === 'itemName' && !String(value || '').trim()) {
      return 'Tên hạng mục là bắt buộc.';
    }
    if (name === 'unitLabel' && !String(value || '').trim()) {
      return 'Đơn vị tính là bắt buộc.';
    }
    if (name === 'unitPrice') {
      const n = Number(value);
      if (value === '' || !Number.isFinite(n) || n < 0) {
        return 'Đơn giá phải là số >= 0.';
      }
    }
    if (name === 'purchaseYear' && form.category === 'ROOM_ASSET') {
      const y = Number(value);
      if (!Number.isInteger(y) || y < 1990 || y > 2100) {
        return 'Năm trang bị từ 1990 đến 2100.';
      }
    }
    return '';
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const errs = {};
    ['itemName', 'unitLabel', 'unitPrice', 'purchaseYear'].forEach((k) => {
      const msg = validateField(k, form[k]);
      if (msg) errs[k] = msg;
    });
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    const payload = {
      category: form.category,
      itemCode: form.itemCode.trim() || undefined,
      itemName: form.itemName.trim(),
      unitLabel: form.unitLabel.trim(),
      unitPrice: Number(form.unitPrice),
      taxRate: form.category === 'ROOM_ASSET' ? 0 : Number(form.taxRate || 0),
      isTaxInclusive: form.category === 'ROOM_ASSET' ? true : Boolean(form.isTaxInclusive),
      purchaseYear: form.category === 'ROOM_ASSET' ? Number(form.purchaseYear) : null,
      sortOrder: Number(form.sortOrder || 0),
    };

    setSubmitting(true);
    try {
      if (editingItem) {
        await updateCatalogItem(editingItem.id, payload);
        showToast?.('Đã cập nhật hạng mục danh mục.');
      } else {
        await createCatalogItem(effectiveAccId, payload);
        showToast?.('Đã thêm hạng mục mới vào danh mục cơ sở.');
      }
      setModalOpen(false);
      await loadCatalog();
    } catch (error) {
      showToast?.(error?.message || 'Không thể lưu hạng mục.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item) => {
    try {
      if (item.isActive) {
        await deleteCatalogItem(item.id);
        showToast?.(`Đã ngừng áp dụng "${item.itemName}".`);
      } else {
        await updateCatalogItem(item.id, { isActive: true });
        showToast?.(`Đã kích hoạt lại "${item.itemName}".`);
      }
      await loadCatalog();
    } catch (error) {
      showToast?.(error?.message || 'Không thể đổi trạng thái hạng mục.', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Danh mục Minibar, Dịch vụ & Tài sản Phòng"
        description={
          accommodationInfo
            ? `Cấu hình bảng giá phát sinh & định mức giá trị tài sản phòng cho: ${accommodationInfo.name}`
            : 'Cấu hình bảng giá dịch vụ phát sinh & danh mục tài sản phòng phục vụ kiểm phòng trả phòng.'
        }
        breadcrumb={[
          { label: 'Cơ sở lưu trú', path: '/admin/accommodations' },
          { label: 'Danh mục phát sinh & Tài sản' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={loadCatalog}>
              <RotateCcw size={13} /> Làm mới
            </button>
            {canWrite && effectiveAccId && (
              <button type="button" className="btn btn-primary btn-sm" onClick={openCreateModal}>
                <Plus size={14} /> Thêm hạng mục
              </button>
            )}
          </div>
        }
      />

      {/* Filter Panel */}
      <div className="filter-panel">
        {isAdmin && accommodations.length > 0 && (
          <div className="filter-group">
            <label htmlFor="cat-acc-select" className="filter-label">Cơ sở lưu trú:</label>
            <select
              id="cat-acc-select"
              className="filter-select"
              value={effectiveAccId}
              onChange={(e) => {
                setSelectedAccId(e.target.value);
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  if (e.target.value) next.set('accId', e.target.value);
                  return next;
                });
              }}
            >
              {accommodations.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label htmlFor="cat-filter-type" className="filter-label">Nhóm danh mục:</label>
          <select
            id="cat-filter-type"
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Tất cả nhóm (4)</option>
            <option value="MINIBAR_FB">Minibar &amp; Ẩm thực</option>
            <option value="EXTRA_SERVICE">Dịch vụ bổ sung</option>
            <option value="SPECIAL_CLEANING">Phí vệ sinh đặc biệt</option>
            <option value="ROOM_ASSET">Tài sản phòng (Bồi thường)</option>
          </select>
        </div>

        <div className="filter-group filter-group-wide">
          <label htmlFor="cat-search-q" className="filter-label">Tìm kiếm:</label>
          <div style={{ position: 'relative' }}>
            <input
              id="cat-search-q"
              type="text"
              className="filter-input"
              style={{ width: '100%', paddingLeft: '28px' }}
              placeholder="Tìm theo mã nội bộ hoặc tên hạng mục..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '9px', color: '#6B7280' }} />
          </div>
        </div>

        <div className="filter-group" style={{ justifyContent: 'flex-end' }}>
          <label htmlFor="cat-include-inactive" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer', marginBottom: '6px' }}>
            <input
              id="cat-include-inactive"
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            Hiện mục đã ngừng
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã nội bộ</th>
                <th>Tên hạng mục &amp; Nhóm</th>
                <th>Đơn vị</th>
                <th style={{ textAlign: 'right' }}>Đơn giá / Giá trị mới</th>
                <th>Thuế VAT</th>
                <th>Năm trang bị &amp; Khấu hao gợi ý</th>
                <th>Trạng thái</th>
                {canWrite && <th style={{ textAlign: 'center' }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canWrite ? 8 : 7} style={{ textAlign: 'center', padding: '20px', color: '#6B7280' }}>
                    Đang tải danh mục cơ sở...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 8 : 7} style={{ textAlign: 'center', padding: '20px', color: '#6B7280' }}>
                    Chưa có hạng mục nào khớp điều kiện lọc.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const meta = CATEGORY_META[item.category] || { shortLabel: item.category, bg: '#F3F4F6', color: '#374151' };
                  const isAsset = item.category === 'ROOM_ASSET';
                  const depPct = isAsset ? getSuggestedDepreciationPercent(item.purchaseYear) : null;

                  return (
                    <tr key={item.id} style={!item.isActive ? { opacity: 0.6 } : undefined}>
                      <td><code style={{ fontSize: '11.5px' }}>{item.itemCode}</code></td>
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
                          <span style={{ fontWeight: 600 }}>{item.itemName}</span>
                        </div>
                      </td>
                      <td>{item.unitLabel}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }} className="tabular-nums">
                        {formatVND(item.unitPrice)}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {isAsset
                          ? 'Miễn VAT (0%)'
                          : `${item.taxRate}% (${item.isTaxInclusive ? 'Đã gồm VAT' : 'Cộng thêm'})`}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {isAsset ? (
                          <span>
                            Năm {item.purchaseYear || '—'} ·{' '}
                            <strong style={{ color: '#991B1B' }}>Khấu hao gợi ý {depPct}%</strong>
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {item.isActive ? (
                          <span className="badge badge-success">Hoạt động</span>
                        ) : (
                          <span className="badge badge-secondary">Đã ngừng</span>
                        )}
                      </td>
                      {canWrite && (
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="row-action-btn"
                              title="Chỉnh sửa hạng mục"
                              onClick={() => openEditModal(item)}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              className="row-action-btn"
                              style={{ color: item.isActive ? '#B45309' : '#166534' }}
                              title={item.isActive ? 'Ngừng áp dụng' : 'Kích hoạt lại'}
                              onClick={() => handleToggleActive(item)}
                            >
                              <Power size={13} />
                            </button>
                          </div>
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

      {/* Native <dialog> Create / Edit Item */}
      <dialog
        ref={dialogRef}
        className="admin-native-dialog dialog-md"
        closedby="any"
        aria-labelledby="cat-dialog-title"
        onClose={() => {
          if (!submitting) setModalOpen(false);
        }}
      >
        <div className="fin-dialog-header">
          <h2 id="cat-dialog-title" style={{ margin: 0, fontSize: '15.5px', fontWeight: 700 }}>
            {editingItem ? 'Cập nhật hạng mục danh mục' : 'Thêm hạng mục mới vào cơ sở'}
          </h2>
          <button
            type="button"
            className="row-action-btn"
            aria-label="Đóng"
            disabled={submitting}
            onClick={() => setModalOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmitForm} noValidate>
          <div className="fin-dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label htmlFor="f-cat" className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>
                  Nhóm danh mục *
                </label>
                <select
                  id="f-cat"
                  name="category"
                  className="filter-input"
                  style={{ width: '100%' }}
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                >
                  <option value="MINIBAR_FB">Minibar &amp; Ẩm thực</option>
                  <option value="EXTRA_SERVICE">Dịch vụ bổ sung</option>
                  <option value="SPECIAL_CLEANING">Phí vệ sinh đặc biệt</option>
                  <option value="ROOM_ASSET">Tài sản phòng (Bồi thường)</option>
                </select>
              </div>
              <div>
                <label htmlFor="f-code" className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>
                  Mã nội bộ (tự sinh nếu bỏ trống)
                </label>
                <input
                  id="f-code"
                  name="itemCode"
                  type="text"
                  className="filter-input"
                  style={{ width: '100%', textTransform: 'uppercase' }}
                  placeholder="VD: MB_BIA_TIGER"
                  value={form.itemCode}
                  onChange={(e) => setForm((p) => ({ ...p, itemCode: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label htmlFor="f-name" className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>
                Tên hạng mục / Thiết bị *
              </label>
              <input
                id="f-name"
                name="itemName"
                type="text"
                className="filter-input"
                style={{ width: '100%' }}
                value={form.itemName}
                onBlur={(e) => setFieldErrors((p) => ({ ...p, itemName: validateField('itemName', e.target.value) }))}
                onChange={(e) => {
                  setForm((p) => ({ ...p, itemName: e.target.value }));
                  if (fieldErrors.itemName) setFieldErrors((p) => ({ ...p, itemName: '' }));
                }}
              />
              {fieldErrors.itemName && <div style={{ color: '#B91C1C', fontSize: '11.5px', marginTop: '3px' }}>{fieldErrors.itemName}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.7fr', gap: '10px' }}>
              <div>
                <label htmlFor="f-unit" className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>
                  Đơn vị tính *
                </label>
                <input
                  id="f-unit"
                  name="unitLabel"
                  type="text"
                  className="filter-input"
                  style={{ width: '100%' }}
                  placeholder="Lon / Chai / Chiếc..."
                  value={form.unitLabel}
                  onBlur={(e) => setFieldErrors((p) => ({ ...p, unitLabel: validateField('unitLabel', e.target.value) }))}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, unitLabel: e.target.value }));
                    if (fieldErrors.unitLabel) setFieldErrors((p) => ({ ...p, unitLabel: '' }));
                  }}
                />
                {fieldErrors.unitLabel && <div style={{ color: '#B91C1C', fontSize: '11.5px', marginTop: '3px' }}>{fieldErrors.unitLabel}</div>}
              </div>
              <div>
                <label htmlFor="f-price" className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>
                  {form.category === 'ROOM_ASSET' ? 'Giá niêm yết thay mới (VNĐ) *' : 'Đơn giá bán (VNĐ) *'}
                </label>
                <input
                  id="f-price"
                  name="unitPrice"
                  type="number"
                  min={0}
                  step={1000}
                  className="filter-input tabular-nums"
                  style={{ width: '100%' }}
                  value={form.unitPrice}
                  onBlur={(e) => setFieldErrors((p) => ({ ...p, unitPrice: validateField('unitPrice', e.target.value) }))}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, unitPrice: e.target.value }));
                    if (fieldErrors.unitPrice) setFieldErrors((p) => ({ ...p, unitPrice: '' }));
                  }}
                />
                {fieldErrors.unitPrice && <div style={{ color: '#B91C1C', fontSize: '11.5px', marginTop: '3px' }}>{fieldErrors.unitPrice}</div>}
              </div>
              <div>
                <label htmlFor="f-sort" className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>
                  Thứ tự
                </label>
                <input
                  id="f-sort"
                  name="sortOrder"
                  type="number"
                  className="filter-input tabular-nums"
                  style={{ width: '100%' }}
                  value={form.sortOrder}
                  onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
                />
              </div>
            </div>

            {form.category === 'ROOM_ASSET' ? (
              <div>
                <label htmlFor="f-year" className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>
                  Năm trang bị tài sản (để tính % khấu hao bồi thường)
                </label>
                <input
                  id="f-year"
                  name="purchaseYear"
                  type="number"
                  min={1990}
                  max={2100}
                  className="filter-input tabular-nums"
                  style={{ width: '100%' }}
                  value={form.purchaseYear}
                  onBlur={(e) => setFieldErrors((p) => ({ ...p, purchaseYear: validateField('purchaseYear', e.target.value) }))}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, purchaseYear: e.target.value }));
                    if (fieldErrors.purchaseYear) setFieldErrors((p) => ({ ...p, purchaseYear: '' }));
                  }}
                />
                {fieldErrors.purchaseYear && <div style={{ color: '#B91C1C', fontSize: '11.5px', marginTop: '3px' }}>{fieldErrors.purchaseYear}</div>}
                <div style={{ fontSize: '11.5px', color: '#4B5563', marginTop: '4px' }}>
                  Tỷ lệ gợi ý hiện tại: <strong>{getSuggestedDepreciationPercent(form.purchaseYear)}%</strong> giá niêm yết (Miễn VAT 0%).
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px', alignItems: 'center' }}>
                <div>
                  <label htmlFor="f-vat" className="filter-label" style={{ display: 'block', marginBottom: '4px' }}>
                    Thuế suất VAT (%)
                  </label>
                  <input
                    id="f-vat"
                    name="taxRate"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    className="filter-input tabular-nums"
                    style={{ width: '100%' }}
                    value={form.taxRate}
                    onChange={(e) => setForm((p) => ({ ...p, taxRate: e.target.value }))}
                  />
                </div>
                <label htmlFor="f-vat-inc" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer', marginTop: '18px' }}>
                  <input
                    id="f-vat-inc"
                    type="checkbox"
                    checked={form.isTaxInclusive}
                    onChange={(e) => setForm((p) => ({ ...p, isTaxInclusive: e.target.checked }))}
                  />
                  Đơn giá đã bao gồm VAT
                </label>
              </div>
            )}
          </div>

          <div className="fin-dialog-footer">
            <button type="button" className="btn btn-secondary" disabled={submitting} onClick={() => setModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : editingItem ? 'Lưu thay đổi' : 'Thêm vào danh mục'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
