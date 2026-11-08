import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { formatVND } from '../../data/entities.js';
import { Plus, Edit2, Search, RotateCcw, Trash2 } from 'lucide-react';
import { roomTypesApi } from '../../api/roomTypes.js';
import { accommodationsApi } from '../../api/accommodations.js';
import { useAdmin } from '../../context/AdminContext.jsx';

const SEARCH_DEBOUNCE_MS = 400;

export default function RoomTypeListPage() {
  const { showToast } = useAdmin();

  // Giá trị ô tìm kiếm và giá trị đã debounce (dùng để gọi API).
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filter
  const [accommodationFilter, setAccommodationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Sort + phân trang server-side
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dữ liệu từ API
  const [rows, setRows] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dòng đang chờ xác nhận xóa + id đang gọi API xóa.
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Tăng biến này để ép effect tải lại danh sách sau khi xóa.
  const [reloadKey, setReloadKey] = useState(0);

  // Options cho dropdown lọc cơ sở lưu trú (lấy từ DB, không dùng mock).
  const [accommodationOptions, setAccommodationOptions] = useState([]);

  // Debounce ô tìm kiếm để không gọi API mỗi lần gõ phím.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Nạp danh sách cơ sở lưu trú cho dropdown.
  // Dùng chung API list với limit tối đa 100 (DB hiện có 72).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const payload = await accommodationsApi.getList({ page: 1, limit: 100 });
        if (cancelled) return;
        setAccommodationOptions(payload.data?.items || []);
      } catch (loadError) {
        if (cancelled) return;
        console.error('[RoomTypeListPage] Không tải được cơ sở lưu trú:', loadError);
        setAccommodationOptions([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Gọi API mỗi khi filter/sort/page đổi.
  useEffect(() => {
    let cancelled = false;

    async function loadRoomTypes() {
      console.group('[RoomTypeListPage] Tải loại phòng');
      console.log('[1] params:', {
        q: debouncedSearch || null,
        accommodationId: accommodationFilter || null,
        status: statusFilter || null,
        sortBy: sortField,
        sortDir: sortDirection,
        page: currentPage,
        limit: pageSize,
      });

      setLoading(true);
      setError(null);

      try {
        const payload = await roomTypesApi.getList({
          q: debouncedSearch || undefined,
          accommodationId: accommodationFilter || undefined,
          status: statusFilter !== '' ? statusFilter : undefined,
          sortBy: sortField,
          sortDir: sortDirection,
          page: currentPage,
          limit: pageSize,
        });

        if (cancelled) return;

        const items = payload.data?.items || [];
        const pagination = payload.data?.pagination || { total: 0 };

        setRows(items);
        setTotalItems(Number(pagination.total || 0));
        console.log('[2] kết quả:', {
          total: pagination.total,
          pageItems: items.length,
          firstId: items[0]?.id ?? null,
        });
      } catch (fetchError) {
        if (cancelled) return;
        console.error('[3] lỗi tải loại phòng:', fetchError);
        setRows([]);
        setTotalItems(0);
        setError(fetchError);
      } finally {
        if (!cancelled) setLoading(false);
        console.groupEnd();
      }
    }

    loadRoomTypes();

    return () => {
      cancelled = true;
    };
  }, [
    debouncedSearch,
    accommodationFilter,
    statusFilter,
    sortField,
    sortDirection,
    currentPage,
    pageSize,
    reloadKey,
  ]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setAccommodationFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const handleSort = (field, direction) => {
    setSortField(field);
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const handleConfirmDelete = async () => {
    const target = deleteTarget;
    if (!target || deletingId) return;

    // Đóng dialog ngay để tránh bấm xác nhận 2 lần.
    setDeleteTarget(null);
    setDeletingId(target.id);

    try {
      await roomTypesApi.remove(target.id);
      showToast(`Đã xóa loại phòng "${target.name}".`);

      // Vừa xóa dòng cuối của trang > 1 → lùi về trang trước.
      if (rows.length === 1 && currentPage > 1) {
        setCurrentPage((page) => Math.max(1, page - 1));
      } else {
        // Cùng trang nhưng vẫn phải gọi lại API để lấy total mới.
        setReloadKey((key) => key + 1);
      }
    } catch (deleteError) {
      showToast(deleteError.message || 'Không thể xóa loại phòng.', 'error');
      // Refetch để đồng bộ nếu bản ghi đã bị người khác xóa (404).
      setReloadKey((key) => key + 1);
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    {
      header: 'Mã',
      accessor: 'id',
      sortable: true,
      width: '60px',
      render: (row) => <span className="code-badge">#{row.id}</span>
    },
    {
      header: 'Hình ảnh',
      accessor: 'coverImageUrl',
      width: '80px',
      render: (row) => (
        <div style={{ width: '56px', height: '40px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #D9DDE2', backgroundColor: '#F3F4F6' }}>
          {row.coverImageUrl ? (
            <img
              src={row.coverImageUrl}
              alt={row.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '11px' }}>
              —
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Tên loại phòng',
      accessor: 'name',
      sortable: true,
      render: (row) => (
        <div>
          <Link
            to={`/admin/room-types/${row.id}`}
            style={{ fontWeight: 600, color: '#292D32' }}
          >
            {row.name}
          </Link>
          <div style={{ fontSize: '11px', color: '#6B7280' }} className="code-badge">
            Mã: {row.code} · Diện tích: {row.areaSqm ?? '—'} m²
          </div>
        </div>
      )
    },
    {
      header: 'Cơ sở lưu trú',
      accessor: 'accommodationId',
      sortable: true,
      render: (row) => (
        <Link
          to={`/admin/accommodations/${row.accommodationId}`}
          style={{ color: '#8C5A00', fontWeight: 500 }}
        >
          {row.accommodationName || `#${row.accommodationId}`}
        </Link>
      )
    },
    {
      header: 'Loại giường',
      accessor: 'bedDescription',
      sortable: true,
      render: (row) => (
        <span title={row.bedDescription}>{row.bedDescription || '—'}</span>
      )
    },
    {
      header: 'Sức chứa tối đa',
      accessor: 'maxOccupancy',
      sortable: true,
      width: '115px',
      align: 'center',
      render: (row) => <span className="tabular-nums">{row.maxOccupancy} khách</span>
    },
    {
      header: 'Giá gốc / đêm',
      accessor: 'basePrice',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span style={{ fontWeight: 600, color: '#292D32' }} className="tabular-nums">
          {formatVND(row.basePrice)}
        </span>
      )
    },
    {
      header: 'Trạng thái',
      accessor: 'status',
      sortable: true,
      width: '120px',
      render: (row) => <StatusBadge status={row.statusLabel} />
    },
    {
      header: 'Thao tác',
      accessor: 'actions',
      width: '100px',
      align: 'center',
      render: (row) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
          <Link
            to={`/admin/room-types/${row.id}/edit`}
            className="row-action-btn"
            title="Chỉnh sửa loại phòng"
          >
            <Edit2 size={13} />
          </Link>
          <button
            type="button"
            className="row-action-btn delete"
            title="Xóa loại phòng"
            aria-label={`Xóa ${row.name}`}
            disabled={deletingId === row.id}
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
        title="Quản lý loại phòng"
        description="Danh mục phân loại phòng lưu trú, cấu hình giường, sức chứa khách tối đa và giá gốc áp dụng."
        breadcrumb={[
          { label: 'Cơ sở lưu trú', path: '/admin/accommodations' },
          { label: 'Loại phòng' }
        ]}
        actions={
          <Link to="/admin/room-types/create" className="btn btn-primary">
            <Plus size={15} /> Thêm loại phòng
          </Link>
        }
      />

      {/* Filters */}
      <div className="filter-panel">
        <div className="filter-group filter-group-wide">
          <label className="filter-label" htmlFor="search-room-type">Tìm kiếm loại phòng:</label>
          <div style={{ position: 'relative' }}>
            <input
              id="search-room-type"
              type="text"
              className="filter-input"
              style={{ width: '100%', paddingLeft: '28px' }}
              placeholder="Tìm theo tên phòng, mã phòng, loại giường..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '9px', color: '#6B7280' }} />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-acc-select">Cơ sở lưu trú:</label>
          <select
            id="filter-acc-select"
            className="filter-select"
            value={accommodationFilter}
            onChange={(e) => {
              setAccommodationFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Tất cả cơ sở lưu trú</option>
            {accommodationOptions.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-status-select">Trạng thái:</label>
          <select
            id="filter-status-select"
            className="filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="0">Bản nháp</option>
            <option value="1">Đang hoạt động</option>
            <option value="2">Ngừng hoạt động</option>
          </select>
        </div>

        <div className="filter-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleResetFilters}
          >
            <RotateCcw size={13} /> Đặt lại lọc
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-card" style={{ borderColor: '#E53E3E', marginBottom: '12px' }}>
          <div className="admin-card-body" style={{ color: '#C53030', fontSize: '13px' }}>
            {error.message || 'Không thể tải danh sách loại phòng.'}
          </div>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        skeletonRows={pageSize}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        emptyMessage="Không tìm thấy loại phòng nào phù hợp với bộ lọc."
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

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Xóa loại phòng"
        message={`Bạn có chắc chắn muốn xóa loại phòng "${deleteTarget?.name}" không?`}
        confirmLabel="Xóa loại phòng"
        cancelLabel="Hủy"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
