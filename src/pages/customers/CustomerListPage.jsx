import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { formatVND } from '../../data/mockData.js';
import { Eye, Trash2, Search, RotateCcw } from 'lucide-react';

export default function CustomerListPage() {
  const { customers, deleteCustomer } = useAdmin();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('total_spent');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filteredData = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        !searchTerm ||
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.city.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = !statusFilter || c.status === statusFilter;
      return matchSearch && matchStatus;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [customers, searchTerm, statusFilter, sortField, sortDirection]);

  const totalItems = filteredData.length;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleSort = (field, direction) => {
    setSortField(field);
    setSortDirection(direction);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteCustomer(deleteTarget.id);
      setDeleteTarget(null);
    }
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
      accessor: 'name',
      sortable: true,
      render: (row) => (
        <div>
          <Link
            to={`/admin/customers/${row.id}`}
            style={{ fontWeight: 600, color: '#292D32' }}
          >
            {row.name}
          </Link>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>
            {row.city}, {row.country}
          </div>
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
      accessor: 'phone',
      sortable: true,
      render: (row) => <span className="tabular-nums">{row.phone}</span>
    },
    {
      header: 'Số lượt đặt phòng',
      accessor: 'total_bookings',
      sortable: true,
      width: '140px',
      align: 'center',
      render: (row) => (
        <span className="tabular-nums" style={{ fontWeight: 600 }}>
          {row.total_bookings} lượt
        </span>
      )
    },
    {
      header: 'Tổng chi tiêu',
      accessor: 'total_spent',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span style={{ fontWeight: 600, color: '#287A4B' }} className="tabular-nums">
          {formatVND(row.total_spent)}
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
          <button
            type="button"
            className="row-action-btn delete"
            title="Xóa khách hàng"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        title="Danh bạ khách hàng"
        description="Tra cứu hồ sơ khách hàng đã đăng ký, lịch sử lưu trú, tổng chi tiêu tích lũy và thông tin liên lạc."
      />

      <div className="filter-panel">
        <div className="filter-group filter-group-wide">
          <label className="filter-label">Tìm kiếm khách hàng</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="filter-input"
              style={{ width: '100%', paddingLeft: '28px' }}
              placeholder="Tìm theo tên, email, số điện thoại, tỉnh/thành..."
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

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Xóa hồ sơ khách hàng"
        message={`Bạn có chắc chắn muốn xóa hồ sơ khách hàng "${deleteTarget?.name}"?`}
        confirmLabel="Xác nhận xóa"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
