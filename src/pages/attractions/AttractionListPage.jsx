import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import resortDanangImg from '../../assets/images/resort_danang_1790825961463.jpg';
import {
  Plus,
  MapPin,
  Edit2,
  Trash2,
  Power,
  Search,
  Eye,
  AlertCircle,
  Building,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function AttractionListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLocationId = searchParams.get('locationId') || '';

  const {
    locations,
    attractions,
    accommodations,
    toggleAttractionStatus,
    deleteAttraction
  } = useAdmin();

  // State
  const [selectedLocationId, setSelectedLocationId] = useState(initialLocationId);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [blockedDeleteInfo, setBlockedDeleteInfo] = useState(null);
  const [viewDescriptionTarget, setViewDescriptionTarget] = useState(null);

  // Sync state if url changes
  useEffect(() => {
    const locId = searchParams.get('locationId');
    if (locId !== null && locId !== selectedLocationId) {
      setSelectedLocationId(locId);
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Handle location dropdown change
  const handleLocationChange = (e) => {
    const val = e.target.value;
    setSelectedLocationId(val);
    setCurrentPage(1);
    setSearchQuery('');
    setStatusFilter('ALL');
    if (val) {
      setSearchParams({ locationId: val });
    } else {
      setSearchParams({});
    }
  };

  // Structured location options for dropdown
  const locationOptions = useMemo(() => {
    const list = [];
    // Điểm đến gốc (Tỉnh / Thành phố: parent_location_id là null)
    const roots = locations.filter((l) => !l.parent_location_id);
    roots.forEach((root) => {
      list.push({ id: root.id, label: root.name, isParent: true });
      const children = locations.filter((l) => l.parent_location_id === root.id);
      children.forEach((child) => {
        list.push({ id: child.id, label: `↳ ${child.name}`, isParent: false });
        const grandChildren = locations.filter((l) => l.parent_location_id === child.id);
        grandChildren.forEach((gc) => {
          list.push({ id: gc.id, label: `    ↳ ${gc.name}`, isParent: false });
        });
      });
    });

    // Điểm đến còn lại (nếu có)
    const listedIds = new Set(list.map((item) => item.id));
    locations.forEach((loc) => {
      if (!listedIds.has(loc.id)) {
        list.push({ id: loc.id, label: loc.name, isParent: false });
      }
    });

    return list;
  }, [locations]);

  // Find all location IDs that belong to the selected location (including children/descendants)
  const relevantLocationIds = useMemo(() => {
    if (!selectedLocationId) return new Set();
    const targetId = Number(selectedLocationId);
    const set = new Set([targetId]);

    // Add children
    locations.forEach((loc) => {
      if (loc.parent_location_id === targetId) {
        set.add(loc.id);
        // Add grandchildren
        locations.forEach((gc) => {
          if (gc.parent_location_id === loc.id) {
            set.add(gc.id);
          }
        });
      }
    });

    return set;
  }, [selectedLocationId, locations]);

  // Selected location object
  const selectedLocationObj = useMemo(() => {
    if (!selectedLocationId) return null;
    return locations.find((l) => l.id === Number(selectedLocationId)) || null;
  }, [selectedLocationId, locations]);

  // Filter attractions based on selected location and filters
  const filteredAttractions = useMemo(() => {
    if (!selectedLocationId) return [];

    return attractions.filter((att) => {
      // Must match selected location or its descendants
      const matchesLocation = relevantLocationIds.has(Number(att.location_id));
      if (!matchesLocation) return false;

      // Status filter
      if (statusFilter === 'ACTIVE' && !att.is_active) return false;
      if (statusFilter === 'INACTIVE' && att.is_active) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = att.name.toLowerCase().includes(query);
        const matchesAddress = (att.address || '').toLowerCase().includes(query);
        const matchesDesc = (att.description || '').toLowerCase().includes(query);
        if (!matchesName && !matchesAddress && !matchesDesc) return false;
      }

      return true;
    });
  }, [attractions, selectedLocationId, relevantLocationIds, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredAttractions.length / itemsPerPage) || 1;
  const paginatedAttractions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAttractions.slice(start, start + itemsPerPage);
  }, [filteredAttractions, currentPage]);

  // Helper to get linked accommodations count
  const getLinkedAccommodations = (attractionId) => {
    return accommodations.filter((acc) =>
      (acc.attractions || []).some((a) => Number(a.attraction_id) === Number(attractionId))
    );
  };

  // Handle Delete Action
  const handleDeleteClick = (att) => {
    const linked = getLinkedAccommodations(att.id);
    if (linked.length > 0) {
      setBlockedDeleteInfo({
        attraction: att,
        linkedAccommodations: linked
      });
    } else {
      setDeleteTarget(att);
    }
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteAttraction(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="admin-page">
      <PageHeader
        title="Quản lý điểm tham quan"
        subtitle="Quản lý danh mục các danh lam thắng cảnh, di tích và điểm du lịch nổi bật theo từng điểm đến"
        breadcrumbs={[
          { label: 'Quản lý lưu trú' },
          { label: 'Cơ sở lưu trú', link: '/admin/accommodations' },
          { label: 'Điểm tham quan' }
        ]}
        actions={
          <Link
            to={
              selectedLocationId
                ? `/admin/attractions/create?locationId=${selectedLocationId}`
                : '/admin/attractions/create'
            }
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>Thêm điểm tham quan mới</span>
          </Link>
        }
      />

      {/* Location Filter Toolbar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 340px' }}>
              <label
                htmlFor="destination-select"
                style={{
                  fontWeight: 600,
                  fontSize: '13.5px',
                  color: '#292D32',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                <MapPin size={16} color="#287A4B" />
                Danh sách điểm đến:
              </label>
              <select
                id="destination-select"
                className="filter-select"
                style={{
                  flex: 1,
                  maxWidth: '420px',
                  fontWeight: selectedLocationId ? 600 : 400,
                  color: selectedLocationId ? '#292D32' : '#6B7280',
                  borderColor: selectedLocationId ? '#287A4B' : '#D9DDE2'
                }}
                value={selectedLocationId}
                onChange={handleLocationChange}
              >
                <option value="">-- Chọn điểm đến --</option>
                {locationOptions.map((opt) => (
                  <option
                    key={opt.id}
                    value={opt.id}
                    style={{ fontWeight: opt.isParent ? '600' : '400' }}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedLocationId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-success" style={{ fontSize: '12px', padding: '4px 10px' }}>
                  {filteredAttractions.length} điểm tham quan tìm thấy
                </span>
                {selectedLocationObj && (
                  <span style={{ fontSize: '12.5px', color: '#6B7280' }}>
                    Khu vực: <strong>{selectedLocationObj.name}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Sub-filters (Visible when location is selected) */}
          {selectedLocationId && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #E5E7EB'
              }}
            >
              <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '380px' }}>
                <input
                  type="text"
                  className="filter-input"
                  style={{ width: '100%', paddingLeft: '32px' }}
                  placeholder="Tìm kiếm theo tên hoặc địa chỉ..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '9px',
                    color: '#6B7280',
                    pointerEvents: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12.5px', color: '#4B5563', fontWeight: 500 }}>
                  Trạng thái:
                </label>
                <select
                  className="filter-select"
                  style={{ minWidth: '150px' }}
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Ngừng hoạt động</option>
                </select>
              </div>

              {(searchQuery || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setCurrentPage(1);
                  }}
                >
                  Đặt lại lọc
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {!selectedLocationId ? (
        /* Empty State before location is chosen */
        <div
          className="admin-card"
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            backgroundColor: '#F9FAFB',
            border: '2px dashed #D1D5DB'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#E5E7EB',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4B5563',
              marginBottom: '16px'
            }}
          >
            <MapPin size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '8px' }}>
            Vui lòng chọn một điểm đến
          </h3>
          <p style={{ color: '#6B7280', maxWidth: '480px', margin: '0 auto 20px', fontSize: '13.5px', lineHeight: 1.5 }}>
            Điểm tham quan được phân loại và quản lý theo từng điểm đến du lịch (tỉnh, thành phố hoặc khu vực danh thắng). Vui lòng chọn một điểm đến từ danh sách phía trên để tải và quản lý các điểm tham quan trực thuộc.
          </p>
          <div style={{ display: 'inline-flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                const firstOption = locationOptions.find((o) => !o.isParent) || locationOptions[0];
                if (firstOption) {
                  setSelectedLocationId(String(firstOption.id));
                  setSearchParams({ locationId: String(firstOption.id) });
                }
              }}
            >
              Chọn điểm đến mẫu
            </button>
          </div>
        </div>
      ) : (
        /* Table of Attractions for chosen location */
        <div className="admin-card">
          <div className="table-responsive" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Hình ảnh</th>
                  <th style={{ minWidth: '220px' }}>Tên điểm tham quan</th>
                  <th style={{ minWidth: '220px' }}>Địa chỉ</th>
                  <th style={{ minWidth: '280px' }}>Mô tả</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ width: '150px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttractions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '48px 16px', color: '#6B7280' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={28} color="#9CA3AF" />
                        <div style={{ fontWeight: 600, color: '#374151' }}>
                          Chưa có điểm tham quan nào cho điểm đến này.
                        </div>
                        <div style={{ fontSize: '12.5px' }}>
                          Bạn có thể thêm điểm tham quan mới cho <strong>{selectedLocationObj?.name}</strong> bằng nút bấm bên dưới.
                        </div>
                        <Link
                          to={`/admin/attractions/create?locationId=${selectedLocationId}`}
                          className="btn btn-primary btn-sm"
                          style={{ marginTop: '8px' }}
                        >
                          <Plus size={14} /> Thêm điểm tham quan mới
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedAttractions.map((att) => {
                    const linked = getLinkedAccommodations(att.id);
                    const rawImg = att.image_url || att.image;
                    const imageSrc = rawImg
                      ? (rawImg.startsWith("http") || rawImg.startsWith("data:") ? rawImg : "http://localhost:3002" + rawImg)
                      : resortDanangImg;

                    return (
                      <tr key={att.id} style={{ opacity: att.is_active ? 1 : 0.75 }}>
                        {/* Thumbnail Image */}
                        <td>
                          <div
                            style={{
                              width: '72px',
                              height: '52px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              backgroundColor: '#F3F4F6',
                              border: '1px solid #D9DDE2',
                              position: 'relative'
                            }}
                          >
                            <img
                              src={imageSrc}
                              alt={att.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = resortDanangImg;
                              }}
                              referrerPolicy="no-referrer"
                            />
                            {!rawImg && (
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: 'rgba(0,0,0,0.1)',
                                  color: '#fff',
                                  fontSize: '10px'
                                }}
                              >
                                Mặc định
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Name */}
                        <td>
                          <div style={{ fontWeight: 600, color: '#1F2937', fontSize: '13.5px' }}>
                            {att.name}
                          </div>
                          {linked.length > 0 && (
                            <div style={{ marginTop: '4px' }}>
                              <span
                                className="badge badge-neutral"
                                style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                title={linked.map((l) => l.name).join(', ')}
                              >
                                <Building size={11} /> {linked.length} cơ sở liên kết
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Address */}
                        <td>
                          <div style={{ fontSize: '12.5px', color: '#4B5563', lineHeight: 1.4 }}>
                            {att.address || '—'}
                          </div>
                        </td>

                        {/* Description (Truncated neatly with view modal trigger) */}
                        <td>
                          <div style={{ fontSize: '12.5px', color: '#4B5563', lineHeight: 1.45 }}>
                            {att.description ? (
                              <>
                                <span>
                                  {att.description.length > 110
                                    ? `${att.description.substring(0, 110)}...`
                                    : att.description}
                                </span>
                                {att.description.length > 110 && (
                                  <button
                                    type="button"
                                    onClick={() => setViewDescriptionTarget(att)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#287A4B',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      fontSize: '11.5px',
                                      marginLeft: '4px',
                                      textDecoration: 'underline'
                                    }}
                                  >
                                    Xem đầy đủ
                                  </button>
                                )}
                              </>
                            ) : (
                              <span style={{ color: '#9CA3AF' }}>Chưa có mô tả</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className={`badge ${att.is_active ? 'badge-success' : 'badge-danger'}`}
                            style={{ fontSize: '11px' }}
                          >
                            {att.is_active ? 'Hoạt động' : 'Ngừng hoạt động'}
                          </span>
                        </td>

                        {/* Action Icons */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {/* Edit */}
                            <Link
                              to={`/admin/attractions/${att.id}/edit`}
                              className="btn-action"
                              title="Chỉnh sửa điểm tham quan"
                              aria-label={`Chỉnh sửa ${att.name}`}
                            >
                              <Edit2 size={14} />
                            </Link>

                            {/* Enable / Disable */}
                            <button
                              type="button"
                              className={`btn-action ${att.is_active ? 'btn-action-warning' : 'btn-action-success'}`}
                              title={att.is_active ? 'Ngừng hoạt động' : 'Kích hoạt'}
                              aria-label={att.is_active ? `Ngừng hoạt động ${att.name}` : `Kích hoạt ${att.name}`}
                              style={{
                                color: att.is_active ? '#D97706' : '#16A34A',
                                backgroundColor: att.is_active ? '#FEF3C7' : '#DCFCE7'
                              }}
                              onClick={() => toggleAttractionStatus(att.id)}
                            >
                              <Power size={14} />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              className="btn-action btn-action-danger"
                              title="Xóa điểm tham quan"
                              aria-label={`Xóa ${att.name}`}
                              onClick={() => handleDeleteClick(att)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredAttractions.length > itemsPerPage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderTop: '1px solid #E5E7EB',
                fontSize: '13px'
              }}
            >
              <div style={{ color: '#6B7280' }}>
                Hiển thị {(currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, filteredAttractions.length)} trong tổng số{' '}
                {filteredAttractions.length} điểm tham quan
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <ChevronLeft size={14} /> Trước
                </button>
                <span style={{ padding: '0 8px', fontWeight: 600 }}>
                  Trang {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  Sau <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: View Full Description */}
      {viewDescriptionTarget && (
        <div className="modal-overlay" onClick={() => setViewDescriptionTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <span className="modal-title">Mô tả: {viewDescriptionTarget.name}</span>
              <button
                className="modal-close"
                onClick={() => setViewDescriptionTarget(null)}
                aria-label="Đóng"
                title="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: '#374151' }}>
                <p>{viewDescriptionTarget.description}</p>
                {viewDescriptionTarget.address && (
                  <p style={{ marginTop: '12px', fontSize: '12.5px', color: '#6B7280' }}>
                    <strong>Địa chỉ:</strong> {viewDescriptionTarget.address}
                  </p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewDescriptionTarget(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Xác nhận xóa điểm tham quan"
        message={`Bạn có chắc chắn muốn xóa điểm tham quan "${deleteTarget?.name}" không? Thao tác này không thể hoàn tác.`}
        confirmLabel="Xóa vĩnh viễn"
        cancelLabel="Hủy bỏ"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Modal: Blocked Deletion Notice (Relationship constraint) */}
      {blockedDeleteInfo && (
        <div className="modal-overlay" onClick={() => setBlockedDeleteInfo(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <span className="modal-title">Không thể xóa điểm tham quan</span>
              <button
                className="modal-close"
                onClick={() => setBlockedDeleteInfo(null)}
                aria-label="Đóng"
                title="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: '13.5px', lineHeight: 1.5, color: '#374151' }}>
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderRadius: '6px',
                    marginBottom: '14px',
                    color: '#92400E'
                  }}
                >
                  <strong>Cảnh báo ràng buộc quan hệ dữ liệu:</strong> Điểm tham quan "
                  {blockedDeleteInfo.attraction.name}" hiện đang được liên kết với{' '}
                  <strong>{blockedDeleteInfo.linkedAccommodations.length} cơ sở lưu trú</strong>.
                </div>
                <p style={{ marginBottom: '8px' }}>Danh sách cơ sở lưu trú đang liên kết:</p>
                <ul style={{ paddingLeft: '20px', marginBottom: '14px', color: '#4B5563' }}>
                  {blockedDeleteInfo.linkedAccommodations.map((acc) => (
                    <li key={acc.id} style={{ marginBottom: '4px' }}>
                      <strong>{acc.name}</strong> ({acc.code})
                    </li>
                  ))}
                </ul>
                <p style={{ color: '#6B7280', fontSize: '12.5px' }}>
                  Để bảo vệ toàn vẹn dữ liệu và tránh xóa nhầm liên kết của các khách sạn/resort, hệ thống không cho phép xóa điểm tham quan này. Bạn nên chọn <strong>"Ngừng hoạt động"</strong> để ẩn điểm tham quan khỏi danh mục mới nhưng vẫn bảo lưu lịch sử liên kết.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setBlockedDeleteInfo(null)}>
                Đóng
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (blockedDeleteInfo?.attraction) {
                    toggleAttractionStatus(blockedDeleteInfo.attraction.id);
                  }
                  setBlockedDeleteInfo(null);
                }}
              >
                Chuyển sang Ngừng hoạt động
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
