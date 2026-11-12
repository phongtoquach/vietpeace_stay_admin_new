import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { Eye, Trash2, Search, RotateCcw } from 'lucide-react';
import { apiFetch } from '../../api/client.js';

export default function CustomerListPage() {
  // State dữ liệu Customer
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // State tìm kiếm, lọc và sắp xếp
const [searchTerm, setSearchTerm] = useState('');
const [statusFilter, setStatusFilter] = useState('');
const [sortField, setSortField] = useState('createdAt');
const [sortDirection, setSortDirection] = useState('desc');

  // Gọi API lấy danh sách Customer
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        setError('');

      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        search: searchTerm,
        sortField: sortField,
        sortDirection: sortDirection
      });

        const response = await apiFetch(
          `/customers?${params.toString()}`
        );

        setCustomers(response.data.items || []);
        setPagination(response.data.pagination);

      } catch (err) {
        console.error('Lỗi lấy danh sách Customer:', err);
        setError(err.message || 'Không thể tải danh sách khách hàng.');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [currentPage, pageSize, searchTerm, sortField, sortDirection]);

const totalItems = pagination.total;
const paginatedData = customers;

  const handleSort = (field, direction) => {
    setSortField(field);
    setSortDirection(direction);
  };

  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      sortable: true,
      width: '60px',
      render: (row) => <span className="code-badge">#{row.id}</span>
    },
    {
      header: 'Họ và tên',
      accessor: 'fullName',
      sortable: true,
      render: (row) => (
        <div>
          <Link
            to={`/admin/customers/${row.id}`}
            style={{ fontWeight: 600, color: '#292D32' }}
          >
            {row.fullName}
          </Link>
        </div>
      )
    },
    {
      header: 'Địa chỉ Email',
      accessor: 'email',
      sortable: true,
      render: (row) => <span>{row.email}</span>
    },
    {
      header: 'Số điện thoại',
      accessor: 'phoneNumber',
      sortable: true,
      render: (row) => <span className="tabular-nums">
        {row.phoneNumber || 'Chưa cập nhật'}</span>
    },
    {
      header: 'Số lượt đặt phòng',
      accessor: 'bookingCount',
      sortable: true,
      width: '140px',
      align: 'center',
      render: (row) => (
        <span className="tabular-nums" style={{ fontWeight: 600 }}>
          {row.bookingCount} lượt
        </span>
      )
    },
    {
      header: 'Trạng thái',
      accessor: 'status',
      sortable: true,
      width: '130px',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Thao tác',
      accessor: 'actions',
      width: '90px',
      align: 'center',
      render: (row) => (
        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
          <Link
            to={`/admin/customers/${row.id}`}
            className="row-action-btn"
            title="Xem hồ sơ"
          >
            <Eye size={13} />
          </Link>
        </div>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        title="Danh bạ khách hàng"
        description="Tra cứu hồ sơ khách hàng đã đăng ký và thông tin liên lạc."      />

      {loading && <p>Đang tải danh sách khách hàng...</p>}
      {error && (
        <p style={{ color: 'red' }}>
          {error}
        </p>
      )}

      <div className="filter-panel">
        <div className="filter-group filter-group-wide">
          <label className="filter-label">Tìm kiếm khách hàng</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="filter-input"
              style={{ width: '100%', paddingLeft: '28px' }}
              placeholder="Tìm theo tên, email hoặc số điện thoại..."              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '9px', color: '#6B7280' }} />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">Trạng thái tài khoản</label>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Active">Đang hoạt động</option>
            <option value="Inactive">Ngừng hoạt động</option>
          </select>
        </div>

        <div className="filter-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setCurrentPage(1);
            }}
          >
            <RotateCcw size={13} /> Đặt lại
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={paginatedData}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        emptyMessage="Không tìm thấy khách hàng nào phù hợp với yêu cầu tìm kiếm."
      />

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
