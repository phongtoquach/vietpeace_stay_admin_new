import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { formatVND, formatDateVN, formatDateTimeVN } from '../../data/mockData.js';
import { Eye, Search, RotateCcw, Check, LogIn, LogOut } from 'lucide-react';

// Giá trị status lấy đúng theo CHECK constraint của bảng dbo.bookings.
const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'PAYMENT_PROCESSING', label: 'Đang thanh toán' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'EXPIRED', label: 'Hết hạn' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'FAILED', label: 'Thất bại' },
  { value: 'checkedin', label: 'Đã nhận phòng' },
  { value: 'checkedout', label: 'Đã trả phòng' },
];

// Cột UI → field sort mà backend chấp nhận.
const SORT_FIELD_MAP = {
  code: 'code',
  checkin_date: 'checkInDate',
  checkout_date: 'checkOutDate',
  total_amount: 'totalAmount',
  booking_status: 'status',
  created_at: 'createdAt',
};

export default function BookingListPage() {
  const {
    bookings,
    bookingsLoading,
    bookingsError,
    bookingsPagination,
    fetchBookings,
    approveBooking,
    checkInBooking,
    checkOutBooking,
    showToast,
    accommodations,
    fetchAccommodations,
  } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter = (searchParams.get('status') || '').toUpperCase();
  const stayStatus = searchParams.get('stayStatus') || '';
  const isStayMode = stayStatus === 'checkin' || stayStatus === 'checkout';
  const isStayFilter = stayStatus === 'checkedin' || stayStatus === 'checkedout';

  const [searchTerm, setSearchTerm] = useState('');
  const [accommodationFilter, setAccommodationFilter] = useState('');

  // null = dùng sort mặc định theo chế độ (createdAt desc hoặc ngày nhận/trả asc).
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);
  const [approvingId, setApprovingId] = useState(null);
  const [stayAction, setStayAction] = useState(null);
  const [stayOverrides, setStayOverrides] = useState({});
  const [confirmAction, setConfirmAction] = useState(null);

  const defaultSortField = stayStatus === 'checkin'
    ? 'checkin_date'
    : stayStatus === 'checkout'
      ? 'checkout_date'
      : 'created_at';
  const defaultSortDirection = isStayMode ? 'asc' : 'desc';
  const activeSortField = sortField || defaultSortField;
  const activeSortDirection = sortDirection || defaultSortDirection;

  const today = new Date();
  const todayLabel = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const updateStatusFilter = (value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('status');
      next.delete('stayStatus');
      if (value === 'checkin' || value === 'checkout' || value === 'checkedin' || value === 'checkedout') {
        next.set('stayStatus', value);
      } else if (value) {
        next.set('status', value);
      }
      return next;
    }, { replace: true });
    setCurrentPage(1);
  };

  // Nạp danh sách cơ sở lưu trú cho bộ lọc (backend tự scope theo tài khoản).
  useEffect(() => {
    fetchAccommodations({ page: 1, limit: 100 }).catch(() => {});
  }, [fetchAccommodations]);

  // Debounce để không bắn request mỗi lần gõ phím.
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBookings({
        page: currentPage,
        limit: pageSize,
        q: searchTerm,
        status: statusFilter,
        stayStatus,
        accommodationId: accommodationFilter,
        sortBy: SORT_FIELD_MAP[activeSortField],
        sortDir: activeSortDirection,
      }).catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, [
    fetchBookings,
    reloadKey,
    currentPage,
    pageSize,
    searchTerm,
    statusFilter,
    stayStatus,
    accommodationFilter,
    activeSortField,
    activeSortDirection,
  ]);

  const handleReset = () => {
    setSearchTerm('');
    setAccommodationFilter('');
    setSearchParams({});
    setSortField(null);
    setSortDirection(null);
    setCurrentPage(1);
  };

  const handleSort = (field, direction) => {
    setSortField(field);
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const handleStayAction = async (bookingId, type) => {
    setStayAction({ id: bookingId, type });
    try {
      const result = type === 'checkin'
        ? await checkInBooking(bookingId)
        : await checkOutBooking(bookingId);

      // Cập nhật tại chỗ để dòng không biến mất ngay; chỉ rời danh sách khi bấm Làm mới.
      setStayOverrides((prev) => ({
        ...prev,
        [bookingId]: {
          checked_in_at: result.checkedInAt ?? prev[bookingId]?.checked_in_at ?? null,
          checked_out_at: result.checkedOutAt ?? null,
          operational_status: result.operationalStatus,
        },
      }));
    } catch (error) {
      if (error.status !== 401) {
        showToast(`Không thực hiện được: ${error.message}`, 'error');
      }
    } finally {
      setStayAction(null);
    }
  };

  const handleConfirmStayAction = () => {
    if (!confirmAction) {
      return;
    }

    const { row, type } = confirmAction;
    setConfirmAction(null);
    handleStayAction(row.id, type);
  };

  const handleApprove = async (bookingId) => {
    setApprovingId(bookingId);
    try {
      await approveBooking(bookingId);
      setReloadKey((key) => key + 1);
    } catch (error) {
      if (error.status !== 401) {
        showToast(`Không duyệt được đơn: ${error.message}`, 'error');
      }
    } finally {
      setApprovingId(null);
    }
  };

  const codeColumn = {
    header: 'Mã đơn',
    accessor: 'code',
    sortable: true,
    render: (row) => (
      <Link
        to={`/admin/bookings/${row.id}`}
        style={{ fontWeight: 600, color: '#292D32', textDecoration: 'underline' }}
        className="code-badge"
      >
        {row.code}
      </Link>
    )
  };

  const customerColumn = {
    header: 'Khách hàng',
    accessor: 'customer_name',
    render: (row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{row.customer_name}</div>
        <div style={{ fontSize: '11px', color: '#6B7280' }} className="tabular-nums">
          {row.customer_phone}
        </div>
      </div>
    )
  };

  const accommodationColumn = {
    header: 'Cơ sở lưu trú & Loại phòng',
    accessor: 'accommodation_name',
    render: (row) => (
      <div>
        <div style={{ fontWeight: 500, color: '#292D32' }}>{row.accommodation_name}</div>
        <div style={{ fontSize: '11px', color: '#6B7280' }}>Manager: {row.manager_name || 'Chưa phân công'}</div>
        <div style={{ fontSize: '11px', color: '#6B7280' }}>{row.room_type_name}</div>
      </div>
    )
  };

  const periodColumn = {
    header: 'Kỳ lưu trú',
    accessor: 'checkin_date',
    sortable: true,
    render: (row) => (
      <div className="tabular-nums" style={{ fontSize: '12px' }}>
        <div><strong>Nhận:</strong> {formatDateVN(row.checkin_date)}</div>
        <div style={{ color: '#6B7280' }}><strong>Trả:</strong> {formatDateVN(row.checkout_date)} ({row.nights} đêm)</div>
      </div>
    )
  };

  const quantityColumn = {
    header: 'Số lượng',
    accessor: 'adults_count',
    width: '95px',
    render: (row) => (
      <span className="tabular-nums" style={{ fontSize: '12px' }}>
        {row.rooms_count} phòng · {row.adults_count} người lớn {row.children_count > 0 ? `${row.children_count} trẻ nhỏ` : ''}
      </span>
    )
  };

  const genericColumns = [
    codeColumn,
    customerColumn,
    accommodationColumn,
    periodColumn,
    quantityColumn,
    {
      header: 'Tổng tiền (VNĐ)',
      accessor: 'total_amount',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span style={{ fontWeight: 600, color: '#292D32' }} className="tabular-nums">
          {formatVND(row.total_amount)}
        </span>
      )
    },
    {
      header: 'Trạng thái',
      accessor: 'booking_status',
      sortable: true,
      render: (row) => {
        const badgeStatus = isStayFilter
          ? stayStatus === 'checkedout'
            ? 'checked-out'
            : 'checked-in'
          : isStayMode
            ? row.operational_status === 'CHECKED_IN'
              ? 'checked-in'
              : row.operational_status === 'CHECKED_OUT'
                ? 'checked-out'
                : row.status
            : row.status;
        return <StatusBadge status={badgeStatus} />;
      }
    },
    {
      header: 'Ngày tạo',
      accessor: 'created_at',
      sortable: true,
      render: (row) => (
        <span style={{ fontSize: '11px', color: '#6B7280' }} className="tabular-nums">
          {formatDateVN(row.created_at)}
        </span>
      )
    },
    {
      header: 'Thao tác',
      accessor: 'actions',
      align: 'center',
      width: '100px',
      render: (row) => (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Link
            to={`/admin/bookings/${row.id}`}
            className="row-action-btn"
            title="Xem chi tiết đơn"
          >
            <Eye size={13} />
          </Link>
          {row.status === 'PENDING' && (
            <button
              type="button"
              className="row-action-btn"
              style={{ color: '#287A4B', borderColor: '#BAE2C8' }}
              title="Xác nhận đặt phòng"
              disabled={approvingId === row.id}
              onClick={() => handleApprove(row.id)}
            >
              <Check size={13} />
            </button>
          )}
        </div>
      )
    }
  ];

  const checkinColumns = [
    codeColumn,
    customerColumn,
    accommodationColumn,
    periodColumn,
    quantityColumn,
    {
      header: 'Yêu cầu đặc biệt',
      accessor: 'special_requests',
      width: '170px',
      render: (row) => (
        row.special_requests ? (
          <div
            style={{ fontSize: '11.5px', color: '#6B7280', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            title={row.special_requests}
          >
            {row.special_requests}
          </div>
        ) : (
          <span style={{ color: '#9CA3AF' }}>—</span>
        )
      )
    },
    {
      header: 'Trạng thái',
      accessor: 'operational_status',
      render: (row) => (
        row.checked_in_at
          ? <span className="badge badge-info">Đã nhận phòng lúc {formatDateTimeVN(row.checked_in_at)}</span>
          : <span className="badge badge-warning">Chờ nhận phòng</span>
      )
    },
    {
      header: 'Thao tác',
      accessor: 'actions',
      align: 'center',
      width: '150px',
      render: (row) => {
        const isDone = Boolean(row.checked_in_at);
        const isBusy = stayAction?.id === row.id && stayAction?.type === 'checkin';

        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Link
              to={`/admin/bookings/${row.id}`}
              className="row-action-btn"
              title="Xem chi tiết đơn"
            >
              <Eye size={13} />
            </Link>
            <button
              type="button"
              className={`btn btn-sm ${isDone ? 'btn-secondary' : 'btn-primary'}`}
              disabled={isDone || isBusy}
              onClick={() => setConfirmAction({ row, type: 'checkin' })}
            >
              <LogIn size={13} /> {isDone ? 'Đã xong' : isBusy ? 'Đang xử lý...' : 'Nhận phòng'}
            </button>
          </div>
        );
      }
    }
  ];

  const checkoutColumns = [
    codeColumn,
    customerColumn,
    accommodationColumn,
    periodColumn,
    {
      header: 'Nhận thực tế',
      accessor: 'checked_in_at',
      render: (row) => (
        <span className="tabular-nums" style={{ fontSize: '12px' }}>
          {row.checked_in_at ? formatDateTimeVN(row.checked_in_at) : '—'}
        </span>
      )
    },
    quantityColumn,
    {
      header: 'Trạng thái',
      accessor: 'operational_status',
      render: (row) => (
        row.checked_out_at
          ? <span className="badge badge-info">Đã trả phòng lúc {formatDateTimeVN(row.checked_out_at)}</span>
          : <span className="badge badge-success">Đang lưu trú</span>
      )
    },
    {
      header: 'Thao tác',
      accessor: 'actions',
      align: 'center',
      width: '150px',
      render: (row) => {
        const isDone = Boolean(row.checked_out_at);
        const isBusy = stayAction?.id === row.id && stayAction?.type === 'checkout';

        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Link
              to={`/admin/bookings/${row.id}`}
              className="row-action-btn"
              title="Xem chi tiết đơn"
            >
              <Eye size={13} />
            </Link>
            <button
              type="button"
              className={`btn btn-sm ${isDone ? 'btn-secondary' : 'btn-primary'}`}
              disabled={isDone || isBusy}
              onClick={() => setConfirmAction({ row, type: 'checkout' })}
            >
              <LogOut size={13} /> {isDone ? 'Đã xong' : isBusy ? 'Đang xử lý...' : 'Trả phòng'}
            </button>
          </div>
        );
      }
    }
  ];

  const columns = isStayMode
    ? (stayStatus === 'checkin' ? checkinColumns : checkoutColumns)
    : genericColumns;

  const tableData = isStayMode
    ? bookings.map((row) => ({ ...row, ...(stayOverrides[row.id] || {}) }))
    : bookings;

  const pageTitle = stayStatus === 'checkin'
    ? `Nhận phòng hôm nay (${todayLabel})`
    : stayStatus === 'checkout'
      ? `Trả phòng hôm nay (${todayLabel})`
      : statusFilter === 'PENDING'
        ? 'Đặt phòng chờ duyệt'
        : 'Quản lý đặt phòng';

  const pageDescription = stayStatus === 'checkin'
    ? 'Danh sách khách đủ điều kiện nhận phòng hôm nay. Xác nhận khi khách đã đến nhận phòng.'
    : stayStatus === 'checkout'
      ? 'Danh sách khách đang lưu trú. Xác nhận khi khách hoàn tất trả phòng.'
      : 'Lọc và xử lý danh sách đặt phòng, lịch trình khách đến, tổng thanh toán và quy trình duyệt phòng.';

  const emptyMessage = stayStatus === 'checkin'
    ? 'Hôm nay không có khách chờ nhận phòng.'
    : stayStatus === 'checkout'
      ? 'Hiện không có khách đang lưu trú để trả phòng.'
      : 'Không tìm thấy đơn đặt phòng nào phù hợp với bộ lọc.';

  const confirmMessage = confirmAction
    ? `Đơn ${confirmAction.row.code} · ${confirmAction.row.customer_name} · ${confirmAction.row.accommodation_name} · ${formatDateVN(confirmAction.row.checkin_date)} → ${formatDateVN(confirmAction.row.checkout_date)}. Hệ thống sẽ ghi nhận thời điểm thực tế.`
    : '';

  return (
    <div>
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        breadcrumb={[
          { label: 'Đặt phòng' },
          ...(isStayMode
            ? [{ label: stayStatus === 'checkin' ? 'Nhận phòng' : 'Trả phòng' }]
            : [])
        ]}
        actions={isStayMode ? (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setStayOverrides({});
              setReloadKey((key) => key + 1);
            }}
          >
            <RotateCcw size={13} /> Làm mới
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                updateStatusFilter('PENDING');
              }}
            >
              Chờ duyệt
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'CONFIRMED' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                updateStatusFilter('CONFIRMED');
              }}
            >
              Đã xác nhận
            </button>
          </div>
        )}
      />

      {bookingsError && (
        <div
          className="admin-card"
          style={{
            padding: '12px 16px',
            marginBottom: '12px',
            borderColor: '#F0C0C0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <span style={{ fontSize: '13px', color: '#B42318' }}>
            Không tải được danh sách đặt phòng: {bookingsError.message}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Filter Panel */}
      <div className="filter-panel">
        <div className="filter-group filter-group-wide">
          <label className="filter-label" htmlFor="search-booking">Tìm kiếm đặt phòng:</label>
          <div style={{ position: 'relative' }}>
            <input
              id="search-booking"
              type="text"
              className="filter-input"
              style={{ width: '100%', paddingLeft: '28px' }}
              placeholder="Tìm theo mã đơn, họ tên khách, số điện thoại..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '9px', color: '#6B7280' }} />
          </div>
        </div>

        {(!isStayMode || accommodations.length > 1) && (
          <div className="filter-group">
            <label className="filter-label" htmlFor="filter-booking-acc">Cơ sở lưu trú:</label>
            <select
              id="filter-booking-acc"
              className="filter-select"
              value={accommodationFilter}
              onChange={(e) => {
                setAccommodationFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Tất cả cơ sở lưu trú</option>
              {accommodations.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-booking-status">Trạng thái đặt phòng:</label>
          <select
            id="filter-booking-status"
            className="filter-select"
            value={stayStatus || statusFilter}
            onChange={(e) => {
              updateStatusFilter(e.target.value);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleReset}
          >
            <RotateCcw size={13} /> Đặt lại lọc
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={tableData}
        loading={bookingsLoading}
        skeletonRows={Math.min(pageSize, 5)}
        sortField={activeSortField}
        sortDirection={activeSortDirection}
        onSort={handleSort}
        emptyMessage={emptyMessage}
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={bookingsPagination.total}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        title={confirmAction?.type === 'checkin' ? 'Xác nhận nhận phòng?' : 'Xác nhận trả phòng?'}
        message={confirmMessage}
        confirmLabel={confirmAction?.type === 'checkin' ? 'Nhận phòng' : 'Trả phòng'}
        confirmVariant="primary"
        onConfirm={handleConfirmStayAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
