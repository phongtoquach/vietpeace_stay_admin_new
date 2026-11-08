import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { formatVND, formatDateVN } from '../../data/mockData.js';
import { Eye, Search, RotateCcw, Calendar, Check, XCircle } from 'lucide-react';

export default function BookingListPage() {
  const { bookings, accommodations, updateBookingStatus } = useAdmin();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL query filter support
  const initialStatus = searchParams.get('status') || '';
  const initialView = searchParams.get('view') || '';

  const [searchTerm, setSearchTerm] = useState('');
  const [accommodationFilter, setAccommodationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [paymentFilter, setPaymentFilter] = useState('');
  const [checkinDateFilter, setCheckinDateFilter] = useState('');
  const [checkoutDateFilter, setCheckoutDateFilter] = useState('');

  // Table state
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (initialStatus) {
      setStatusFilter(initialStatus);
    }
    if (initialView === 'today') {
      setCheckinDateFilter('2026-10-01');
    }
  }, [initialStatus, initialView]);

  const handleReset = () => {
    setSearchTerm('');
    setAccommodationFilter('');
    setStatusFilter('');
    setPaymentFilter('');
    setCheckinDateFilter('');
    setCheckoutDateFilter('');
    setSearchParams({});
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    return bookings.filter((b) => {
      const matchSearch =
        !searchTerm ||
        b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.customer_phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.customer_email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchAcc = !accommodationFilter || String(b.accommodation_id) === String(accommodationFilter);
      const matchStatus = !statusFilter || b.booking_status === statusFilter;
      const matchPayment = !paymentFilter || b.payment_status === paymentFilter;
      const matchCheckin = !checkinDateFilter || b.checkin_date >= checkinDateFilter;
      const matchCheckout = !checkoutDateFilter || b.checkout_date <= checkoutDateFilter;

      return matchSearch && matchAcc && matchStatus && matchPayment && matchCheckin && matchCheckout;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [bookings, searchTerm, accommodationFilter, statusFilter, paymentFilter, checkinDateFilter, checkoutDateFilter, sortField, sortDirection]);

  const totalItems = filteredData.length;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleSort = (field, direction) => {
    setSortField(field);
    setSortDirection(direction);
  };

  const columns = [
    {
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
    },
    {
      header: 'Khách hàng',
      accessor: 'customer_name',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.customer_name}</div>
          <div style={{ fontSize: '11px', color: '#6B7280' }} className="tabular-nums">
            {row.customer_phone}
          </div>
        </div>
      )
    },
    {
      header: 'Cơ sở lưu trú & Loại phòng',
      accessor: 'accommodation_name',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500, color: '#292D32' }}>{row.accommodation_name}</div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>{row.room_type_name}</div>
        </div>
      )
    },
    {
      header: 'Thời gian lưu trú',
      accessor: 'checkin_date',
      sortable: true,
      render: (row) => (
        <div className="tabular-nums" style={{ fontSize: '12px' }}>
          <div><strong>Đến:</strong> {formatDateVN(row.checkin_date)}</div>
          <div style={{ color: '#6B7280' }}><strong>Đi:</strong> {formatDateVN(row.checkout_date)} ({row.nights} đêm)</div>
        </div>
      )
    },
    {
      header: 'Số lượng',
      accessor: 'adults_count',
      width: '95px',
      render: (row) => (
        <span className="tabular-nums" style={{ fontSize: '12px' }}>
          {row.rooms_count} phòng · {row.adults_count} lớn {row.children_count > 0 ? `${row.children_count} nhỏ` : ''}
        </span>
      )
    },
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
      render: (row) => <StatusBadge status={row.booking_status} />
    },
    {
      header: 'Thanh toán',
      accessor: 'payment_status',
      sortable: true,
      render: (row) => <StatusBadge status={row.payment_status} />
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
          {row.booking_status === 'Pending' && (
            <button
              type="button"
              className="row-action-btn"
              style={{ color: '#287A4B', borderColor: '#BAE2C8' }}
              title="Xác nhận đặt phòng"
              onClick={() => updateBookingStatus(row.id, 'Confirmed')}
            >
              <Check size={13} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        title={initialView === 'today' ? "Lượt nhận phòng & Trả phòng hôm nay" : "Quản lý đặt phòng"}
        description="Lọc và xử lý danh sách đặt phòng, lịch trình khách đến, tổng thanh toán và quy trình duyệt phòng."
        breadcrumb={[
          { label: 'Đặt phòng' }
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'Pending' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setStatusFilter('Pending');
                setCurrentPage(1);
              }}
            >
              Chờ duyệt ({bookings.filter((b) => b.booking_status === 'Pending').length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'Confirmed' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setStatusFilter('Confirmed');
                setCurrentPage(1);
              }}
            >
              Đã xác nhận
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'Checked-in' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setStatusFilter('Checked-in');
                setCurrentPage(1);
              }}
            >
              Đang lưu trú
            </button>
          </div>
        }
      />

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

        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-booking-status">Trạng thái đặt phòng:</label>
          <select
            id="filter-booking-status"
            className="filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Confirmed">Đã xác nhận (Confirmed)</option>
            <option value="Pending">Chờ xử lý (Pending)</option>
            <option value="Checked-in">Đã nhận phòng (Checked-in)</option>
            <option value="Checked-out">Đã trả phòng (Checked-out)</option>
            <option value="Cancelled">Đã hủy (Cancelled)</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-booking-pay">Thanh toán:</label>
          <select
            id="filter-booking-pay"
            className="filter-select"
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Tất cả thanh toán</option>
            <option value="Paid">Đã thanh toán (Paid)</option>
            <option value="Unpaid">Chưa thanh toán (Unpaid)</option>
            <option value="Refunded">Đã hoàn tiền (Refunded)</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-from-checkin">Từ ngày nhận:</label>
          <input
            id="filter-from-checkin"
            type="date"
            className="filter-input"
            value={checkinDateFilter}
            onChange={(e) => {
              setCheckinDateFilter(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-to-checkout">Đến ngày trả:</label>
          <input
            id="filter-to-checkout"
            type="date"
            className="filter-input"
            value={checkoutDateFilter}
            onChange={(e) => {
              setCheckoutDateFilter(e.target.value);
              setCurrentPage(1);
            }}
          />
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
        data={paginatedData}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        emptyMessage="Không tìm thấy đơn đặt phòng nào phù hợp với bộ lọc."
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />
    </div>
  );
}
