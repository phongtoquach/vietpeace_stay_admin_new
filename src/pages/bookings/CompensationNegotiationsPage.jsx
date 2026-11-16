import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  RotateCcw,
  Eye,
  ShieldCheck,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import CompensationReviewDialog from '../../components/bookings/CompensationReviewDialog.jsx';
import { useAdmin } from '../../context/AdminContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAdminChat } from '../../chat/ChatContext.jsx';
import { formatVND, formatDateTimeVN } from '../../data/mockData.js';
import {
  NEGOTIATION_STATUS_META,
  fetchCompensationNegotiations,
  fetchCompensationNegotiationDetail,
  acknowledgeCompensationNegotiation,
} from '../../api/checkoutSettlement.js';

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ Admin duyệt' },
  { key: 'APPROVED', label: 'Đã duyệt đúng đề xuất' },
  { key: 'PARTIALLY_APPROVED', label: 'Duyệt điều chỉnh mức' },
  { key: 'REJECTED', label: 'Từ chối · Giữ nguyên' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

export default function CompensationNegotiationsPage() {
  const { showToast, accommodations, fetchAccommodations } = useAdmin();
  const { currentLoggedInUser, hasPermission } = useAuth();
  const { compensationRefreshTick, refreshCompensationSummary } = useAdminChat();

  const isAdmin = currentLoggedInUser?.role === 'ADMIN';
  const canWriteBookings =
    isAdmin || hasPermission('bookings.write') || hasPermission('bookings.update_status');

  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get('focus');

  const [statusFilter, setStatusFilter] = useState(isAdmin ? 'PENDING' : 'ALL');
  const [accommodationFilter, setAccommodationFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [data, setData] = useState({
    items: [],
    counts: { ALL: 0, PENDING: 0, APPROVED: 0, PARTIALLY_APPROVED: 0, REJECTED: 0, CANCELLED: 0 },
    pagination: { page: 1, limit: 15, total: 0, totalPages: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [selectedNegotiation, setSelectedNegotiation] = useState(null);

  useEffect(() => {
    fetchAccommodations({ page: 1, limit: 100 }).catch(() => {});
  }, [fetchAccommodations]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCompensationNegotiations({
        status: statusFilter,
        accommodationId: accommodationFilter || undefined,
        q: searchTerm.trim() || undefined,
        page,
        limit: pageSize,
      });
      setData(res);
    } catch (error) {
      showToast?.(error?.message || 'Không thể tải danh sách phiếu thương lượng.', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, accommodationFilter, searchTerm, page, pageSize, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadList();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadList, compensationRefreshTick]);

  // Open focused negotiation from Bell notification (?focus=<id>)
  useEffect(() => {
    if (!focusId) return;
    let cancelled = false;
    fetchCompensationNegotiationDetail(focusId)
      .then((detail) => {
        if (!cancelled && detail) {
          setSelectedNegotiation(detail);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [focusId]);

  const closeFocusModal = () => {
    setSelectedNegotiation(null);
    if (focusId) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('focus');
        return next;
      }, { replace: true });
    }
  };

  const handleQuickAcknowledge = async (item) => {
    try {
      await acknowledgeCompensationNegotiation(item.id);
      showToast?.(`Đã xác nhận tiếp nhận kết quả phiếu #${item.negotiationCode}.`);
      await Promise.all([loadList(), refreshCompensationSummary().catch(() => {})]);
    } catch (error) {
      showToast?.(error?.message || 'Không thể cập nhật xác nhận.', 'error');
    }
  };

  const items = data.items || [];
  const counts = data.counts || {};
  const pagination = data.pagination || { page: 1, limit: pageSize, total: 0, totalPages: 0 };

  return (
    <div>
      <PageHeader
        title="Thương lượng Giảm Bồi thường Thiết bị"
        description={
          isAdmin
            ? 'Kiểm tra ý kiến khách hàng và ảnh chụp hư hao từ các cơ sở; xác nhận mức giảm phù hợp hoặc từ chối giữ nguyên mức bồi thường.'
            : 'Theo dõi các phiếu đề xuất thương lượng giảm bồi thường đã gửi lên Admin và kết quả phản hồi khi làm thủ tục trả phòng.'
        }
        breadcrumb={[
          { label: 'Trả phòng', path: '/admin/bookings?stayStatus=checkout' },
          { label: 'Thương lượng bồi thường' },
        ]}
        actions={
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              loadList();
              refreshCompensationSummary().catch(() => {});
            }}
          >
            <RotateCcw size={13} /> Làm mới
          </button>
        }
      />

      {/* Status Filter Tabs */}
      <div className="folio-tab-bar" style={{ marginBottom: '12px' }}>
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.key;
          const cnt = Number(counts[tab.key] || 0);
          return (
            <button
              key={tab.key}
              type="button"
              className={`folio-tab-btn ${active ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
            >
              <span>{tab.label}</span>
              <span
                className="tabular-nums"
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '1px 7px',
                  borderRadius: '999px',
                  backgroundColor: active ? 'rgba(255,255,255,0.2)' : '#F3F4F6',
                  color: active ? '#FFFFFF' : '#374151',
                }}
              >
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <search>
        <div className="filter-panel">
          <div className="filter-group filter-group-wide">
            <label className="filter-label" htmlFor="search-neg-input">
              Tìm kiếm phiếu thương lượng:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="search-neg-input"
                type="search"
                className="filter-input"
                style={{ width: '100%', paddingLeft: '28px' }}
                placeholder="Mã phiếu (NEG-...), mã đơn phòng, tên khách, thiết bị..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
              <Search size={14} style={{ position: 'absolute', left: '8px', top: '9px', color: '#6B7280' }} />
            </div>
          </div>

          {accommodations.length > 1 && (
            <div className="filter-group">
              <label className="filter-label" htmlFor="filter-neg-acc">
                Cơ sở lưu trú:
              </label>
              <select
                id="filter-neg-acc"
                className="filter-select"
                value={accommodationFilter}
                onChange={(e) => {
                  setAccommodationFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả cơ sở</option>
                {accommodations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchTerm('');
                setAccommodationFilter('');
                setStatusFilter('ALL');
                setPage(1);
              }}
            >
              <RotateCcw size={13} /> Đặt lại lọc
            </button>
          </div>
        </div>
      </search>

      {/* Table */}
      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã phiếu &amp; Đơn</th>
                <th>Cơ sở &amp; Khách hàng</th>
                <th>Thiết bị hư hỏng</th>
                <th style={{ textAlign: 'right' }}>Mức hiện tại → Xin giảm</th>
                <th>Ý kiến khách &amp; Ảnh</th>
                <th>Trạng thái &amp; Kết quả</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#6B7280' }}>
                    Đang tải danh sách phiếu thương lượng...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '28px', color: '#6B7280' }}>
                    Chưa có phiếu đề xuất thương lượng nào trong bộ lọc này.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const meta = NEGOTIATION_STATUS_META[item.status] || NEGOTIATION_STATUS_META.PENDING;
                  const unreadDecision =
                    !isAdmin &&
                    ['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'].includes(item.status) &&
                    !item.managerAckAt;

                  return (
                    <tr
                      key={item.id}
                      style={
                        unreadDecision
                          ? { backgroundColor: '#FFFBEB' }
                          : item.status === 'PENDING' && item.isUrgent
                            ? { backgroundColor: '#FFF5F5' }
                            : undefined
                      }
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span className="code-badge">{item.negotiationCode}</span>
                          {item.status === 'PENDING' && item.isUrgent && (
                            <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <AlertTriangle size={11} /> Khẩn
                            </span>
                          )}
                        </div>
                        <div style={{ marginTop: '4px', fontSize: '12px' }}>
                          Đơn:{' '}
                          <Link
                            to={`/admin/bookings/${item.bookingId}`}
                            style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'underline' }}
                          >
                            #{item.bookingCode}
                          </Link>
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                          {formatDateTimeVN(item.createdAt)}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, fontSize: '12.5px' }}>{item.accommodationName}</div>
                        <div style={{ fontSize: '12px', color: '#1F2937', marginTop: '2px' }}>{item.customerName}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }} className="tabular-nums">
                          {item.customerPhone} · Đề xuất: {item.requestedByName}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, fontSize: '12.5px' }}>{item.itemName}</div>
                        <div style={{ fontSize: '11.5px', color: '#6B7280' }} className="tabular-nums">
                          SL: {item.quantity} · Giá gốc: {formatVND(item.unitPrice)} ({item.depreciationPercent}%)
                        </div>
                      </td>

                      <td style={{ textAlign: 'right' }} className="tabular-nums">
                        <div style={{ fontSize: '12px', color: '#4B5563' }}>
                          Hiện tại: <strong>{formatVND(item.previousFinalAmount)}</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: '#B45309', fontWeight: 700 }}>
                          Xin giảm: -{formatVND(item.requestedExtraReduction)}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#166534', fontWeight: 600 }}>
                          Đề nghị còn: {formatVND(item.proposedFinalAmount)}
                        </div>
                      </td>

                      <td style={{ maxWidth: '240px', fontSize: '12px' }}>
                        <div
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            color: '#374151',
                          }}
                          title={item.guestOpinion}
                        >
                          {item.guestOpinion}
                        </div>
                        <div style={{ marginTop: '4px', fontSize: '11px', color: '#2563EB', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ImageIcon size={12} /> {item.evidenceImages?.length || 0} ảnh bằng chứng
                        </div>
                      </td>

                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            backgroundColor: meta.bg,
                            color: meta.color,
                            border: `1px solid ${meta.border}`,
                          }}
                        >
                          {meta.label}
                        </span>
                        {item.status !== 'PENDING' && item.status !== 'CANCELLED' && (
                          <div style={{ fontSize: '11.5px', marginTop: '4px', color: '#1F2937' }} className="tabular-nums">
                            {item.status === 'REJECTED'
                              ? `Giữ nguyên: ${formatVND(item.finalApprovedAmount)}`
                              : `Duyệt giảm ${formatVND(item.approvedExtraReduction)} → Còn ${formatVND(item.finalApprovedAmount)}`}
                          </div>
                        )}
                        {unreadDecision && (
                          <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: 700, color: '#B45309' }}>
                            • Kết quả mới chưa xác nhận
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${isAdmin && item.status === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setSelectedNegotiation(item)}
                          >
                            {isAdmin && item.status === 'PENDING' ? (
                              <>
                                <ShieldCheck size={13} /> Kiểm tra &amp; Duyệt
                              </>
                            ) : item.status === 'PENDING' ? (
                              <>
                                <Clock size={13} /> Xem phiếu
                              </>
                            ) : (
                              <>
                                <Eye size={13} /> Chi tiết
                              </>
                            )}
                          </button>

                          {unreadDecision && (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleQuickAcknowledge(item)}
                            >
                              <CheckCircle2 size={13} /> Đã xem
                            </button>
                          )}
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

      <Pagination
        currentPage={pagination.page}
        pageSize={pageSize}
        totalItems={pagination.total}
        onPageChange={(nextPage) => setPage(nextPage)}
        onPageSizeChange={(nextSize) => {
          setPageSize(nextSize);
          setPage(1);
        }}
      />

      {selectedNegotiation && (
        <CompensationReviewDialog
          key={selectedNegotiation.id}
          isOpen={Boolean(selectedNegotiation)}
          onClose={closeFocusModal}
          negotiation={selectedNegotiation}
          isAdmin={isAdmin}
          canWriteBookings={canWriteBookings}
          showToast={showToast}
          onUpdated={async () => {
            closeFocusModal();
            await Promise.all([loadList(), refreshCompensationSummary().catch(() => {})]);
          }}
        />
      )}
    </div>
  );
}
