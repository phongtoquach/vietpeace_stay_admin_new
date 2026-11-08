import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { formatDateVN } from '../../data/mockData.js';
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Search,
  DollarSign
} from 'lucide-react';

export default function RatePeriodsPage() {
  const { ratePeriods, deleteRatePeriod } = useAdmin();
  const navigate = useNavigate();

  const [deleteTarget, setDeleteTarget] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered Rate Periods
  const filteredPeriods = useMemo(() => {
    return ratePeriods.filter((period) => {
      const matchStatus = !statusFilter || period.status === statusFilter;
      const matchSearch =
        !searchQuery ||
        period.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (period.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [ratePeriods, statusFilter, searchQuery]);

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteRatePeriod(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  // Duration in days calculation
  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleGoToPricing = (period) => {
    navigate(`/admin/room-rates?tab=special&periodId=${period.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Quản lý kỳ giá đặc biệt"
        description="Thiết lập các kỳ giá đặc biệt độc lập (mùa cao điểm, dịp lễ Tết, sự kiện) có thể tái sử dụng cho nhiều cơ sở lưu trú."
        breadcrumb={[
          { label: 'Giá & Phòng trống', path: '/admin/room-rates' },
          { label: 'Kỳ giá đặc biệt' }
        ]}
        actions={
          <Link to="/admin/rate-periods/create" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} />
            <span>Thêm kỳ giá đặc biệt</span>
          </Link>
        }
      />

      {/* Explanatory Banner */}
      <div
        className="card"
        style={{
          marginBottom: '16px',
          backgroundColor: '#FFFDF5',
          borderColor: '#F7E396',
          padding: '14px 18px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: '#FDECB2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8C5A00',
              flexShrink: 0,
              marginTop: '2px'
            }}
          >
            <Calendar size={18} />
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.5, color: '#4B3800' }}>
            <strong>Đặc tính kỳ giá độc lập:</strong> Kỳ giá đặc biệt là khoảng thời gian cao điểm chung và hoàn toàn độc lập với cơ sở lưu trú. Cùng một kỳ giá có thể được sử dụng để cấu hình giá cho bất kỳ điểm đến và cơ sở lưu trú nào tại trang <strong>Cấu hình giá kỳ đặc biệt</strong>.
          </div>
        </div>
      </div>

      {/* Filter Panel (Styled according to existing admin panel design system) */}
      <div className="filter-panel">
        <div className="filter-group filter-group-wide" style={{ maxWidth: '420px' }}>
          <label className="filter-label" htmlFor="search-rate-period">
            Tìm kiếm kỳ giá:
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="search-rate-period"
              type="text"
              className="filter-input"
              style={{ width: '100%', paddingLeft: '32px' }}
              placeholder="Tìm theo tên kỳ giá đặc biệt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-status">
            Trạng thái:
          </label>
          <select
            id="filter-status"
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
            <option value="INACTIVE">Ngừng hoạt động (INACTIVE)</option>
          </select>
        </div>

        {(statusFilter || searchQuery) && (
          <div className="filter-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setStatusFilter('');
                setSearchQuery('');
              }}
            >
              Đặt lại lọc
            </button>
          </div>
        )}
      </div>

      {/* Rate Periods Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Tên kỳ giá đặc biệt</th>
                <th>Ngày bắt đầu</th>
                <th>Ngày kết thúc</th>
                <th>Thời lượng</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center', width: '220px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredPeriods.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                    Không tìm thấy kỳ giá đặc biệt nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredPeriods.map((period) => {
                  const days = calculateDays(period.start_date, period.end_date);

                  return (
                    <tr key={period.id}>
                      <td className="code-badge">#{period.id}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#292D32' }}>{period.name}</div>
                        {period.description && (
                          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                            {period.description}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                          Cập nhật: {period.updated_at ? formatDateVN(period.updated_at) : '—'}
                        </div>
                      </td>
                      <td className="tabular-nums" style={{ fontWeight: 500 }}>
                        {formatDateVN(period.start_date)}
                      </td>
                      <td className="tabular-nums" style={{ fontWeight: 500 }}>
                        {formatDateVN(period.end_date)}
                      </td>
                      <td>
                        <span className="badge badge-neutral">{days} ngày</span>
                      </td>
                      <td>
                        <StatusBadge status={period.status} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            title="Cấu hình giá các loại phòng cho kỳ này"
                            style={{
                              backgroundColor: '#FEF9C3',
                              borderColor: '#FDE047',
                              color: '#713F12',
                              fontWeight: 600,
                              fontSize: '11.5px',
                              padding: '4px 8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onClick={() => handleGoToPricing(period)}
                          >
                            <DollarSign size={13} />
                            <span>Cấu hình giá</span>
                          </button>
                          <Link
                            to={`/admin/rate-periods/${period.id}/edit`}
                            className="btn-action"
                            title="Chỉnh sửa kỳ giá"
                            aria-label={`Chỉnh sửa ${period.name}`}
                          >
                            <Edit2 size={14} />
                          </Link>
                          <button
                            type="button"
                            className="btn-action btn-action-danger"
                            title="Xóa kỳ giá"
                            onClick={() => setDeleteTarget(period)}
                            aria-label={`Xóa ${period.name}`}
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
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Xác nhận xóa kỳ giá đặc biệt"
        message={`Bạn có chắc chắn muốn xóa kỳ giá đặc biệt "${deleteTarget?.name}"? Mọi cấu hình giá phòng thuộc kỳ này sẽ bị xóa bỏ.`}
        confirmLabel="Xóa kỳ giá"
        cancelLabel="Hủy"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
