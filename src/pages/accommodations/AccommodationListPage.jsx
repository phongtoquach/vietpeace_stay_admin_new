import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import { lookupsApi } from '../../api/lookups.js';
import { accommodationsApi } from '../../api/accommodations.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { Plus, Edit2, Trash2, Search, RotateCcw, Star } from 'lucide-react';

// Whitelist các cột thực sự bấm sort được trên UI (khớp `accessor` của columns).
// Dùng để chặn URL rác kiểu ?sortBy=abc — URL do người dùng sửa tay được, không tin.
const SORTABLE_FIELDS = [
  'id',
  'cover_image',
  'name',
  'type',
  'location_id',
  'room_types_count',
  'star_rating',
  'status'
];

// Khớp `pageSizeOptions` mặc định của Pagination để URL không khôi phục cỡ trang lạ.
const ALLOWED_PAGE_SIZES = [5, 10, 20, 50];

export default function AccommodationListPage() {
  const {
    accommodations,
    fetchAccommodations,
    accommodationsLoading,
    accommodationsError,
    accommodationsPagination,
    currentUser,
    showToast
  } = useAdmin();

  // Role do backend trả qua /auth/loggedin-user (server-side session),
  // KHÔNG phải state client tự đoán. Backend vẫn là nơi thực thi quyền:
  // POST/DELETE accommodation đã có requireRole("ADMIN") nên ẩn nút ở đây
  // chỉ là UX, không phải lớp bảo vệ.
  const isAdmin = currentUser?.role === 'ADMIN';



  const [searchParams, setSearchParams] = useSearchParams();

  // Filters state
  // Mỗi useState nhận MỘT HÀM khởi tạo: hàm chỉ chạy ở lần render đầu tiên.
  // Nhờ vậy khi F5, state được dựng lại từ query string thay vì giá trị mặc định.
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
  const searchInputRef = useRef(null);
  const searchWasFocusedRef = useRef(false);
  const searchFocusTimerRef = useRef(null);
  // Từ khóa "chờ" (dùng để gọi API) cũng khôi phục từ URL,
  // để lần fetch đầu tiên sau F5 dùng đúng từ khóa cũ.
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(
    () => searchParams.get('search') || ''
  );
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get('typeId') || '');
  const [locationFilter, setLocationFilter] = useState(
    () => searchParams.get('locationId') || ''
  );
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '');
  const [featuredFilter, setFeaturedFilter] = useState(
    () => searchParams.get('isFeatured') || ''
  );

  // Table state
  const [sortField, setSortField] = useState(() => {
    const value = searchParams.get('sortBy');
    return SORTABLE_FIELDS.includes(value) ? value : 'id';
  });
  const [sortDirection, setSortDirection] = useState(() =>
    searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc'
  );
  // parseInt('abc') trả NaN → Number.isInteger(NaN) = false → rơi về mặc định.
  const [currentPage, setCurrentPage] = useState(() => {
    const page = Number.parseInt(searchParams.get('page'), 10);
    return Number.isInteger(page) && page >= 1 ? page : 1;
  });
  // limit lạ (ví dụ ?limit=9999) bị kẹp về 10 để khớp dropdown của Pagination.
  const [pageSize, setPageSize] = useState(() => {
    const size = Number.parseInt(searchParams.get('limit'), 10);
    return ALLOWED_PAGE_SIZES.includes(size) ? size : 10;
  });
  const [selectedIds, setSelectedIds] = useState([]);

  // Danh sách điểm đến cho dropdown, lấy từ bảng dbo.locations thật.
  // Không dùng `locations` của context vì đó vẫn là dữ liệu mock,
  // id mock không khớp id thật nên filter sẽ gửi sai locationId.
  const [locations, setLocations] = useState([]);

  // Context vẫn khởi tạo `accommodations` bằng mock (các trang khác còn dùng),
  // nên lần render đầu tiên bảng sẽ lóe dữ liệu mock trước khi request thật chạy.
  // Cờ này giữ skeleton cho tới khi request đầu tiên kết thúc, list không bao giờ
  // hiển thị dữ liệu giả; nếu request lỗi thì thôi chặn để hiện bảng rỗng + lỗi.
  const [firstLoadSettled, setFirstLoadSettled] = useState(false);

  // Confirm delete dialog
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Tăng để ép effect tải lại danh sách sau khi đổi nổi bật.
  const [reloadKey, setReloadKey] = useState(0);
  const [featuredUpdatingId, setFeaturedUpdatingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLocations() {
      try {
        const items = await lookupsApi.getLocations();
        if (cancelled) return;
        setLocations(items);
      } catch (error) {
        if (!cancelled) {
          console.error('[ERROR] Không tải được điểm đến:', error);
        }
      }
    }

    loadLocations();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Hủy timer cũ nếu người dùng tiếp tục gõ trước 300ms.
    const timerId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [searchTerm]);

  useLayoutEffect(() => {
    if (!searchWasFocusedRef.current) return;
    const input = searchInputRef.current;
    if (!input) return;
    input.focus();
    const cursor = input.value.length;
    input.setSelectionRange(cursor, cursor);
  });

  useEffect(() => () => window.clearTimeout(searchFocusTimerRef.current), []);

  // Đồng bộ state -> URL. Nhờ effect này, F5 luôn dựng lại được màn hình.
  // Ghi bằng debouncedSearchTerm (không phải searchTerm) để không ghi URL mỗi phím gõ.
  useEffect(() => {
    // Không điều hướng route khi người dùng đang gõ: navigation làm input bị remount.
    if (document.activeElement === searchInputRef.current) return;
    // Chỉ đưa lên URL các giá trị KHÁC mặc định → URL ngắn, dễ đọc.
    const nextParams = {};
    if (debouncedSearchTerm) nextParams.search = debouncedSearchTerm;
    if (typeFilter) nextParams.typeId = typeFilter;
    if (locationFilter) nextParams.locationId = locationFilter;
    if (statusFilter) nextParams.status = statusFilter;
    if (featuredFilter) nextParams.isFeatured = featuredFilter;
    if (sortField !== 'id') nextParams.sortBy = sortField;
    if (sortDirection !== 'asc') nextParams.sortDir = sortDirection;
    if (currentPage > 1) nextParams.page = String(currentPage);
    if (pageSize !== 10) nextParams.limit = String(pageSize);

    // Thứ tự key cố định vì object dựng theo cùng một thứ tự mỗi lần,
    // nên so sánh chuỗi là đủ để biết URL có thay đổi thật hay không.
    const nextQuery = new URLSearchParams(nextParams).toString();
    const currentQuery = searchParams.toString();

    // Chốt chặn vòng lặp: setSearchParams làm searchParams đổi -> effect chạy lại.
    // Lần chạy thứ hai thấy chuỗi giống hệt thì dừng, không ghi nữa.
    if (nextQuery === currentQuery) return;

    // replace: true -> thay entry hiện tại thay vì đẩy thêm entry mới.
    // Mục đích: bấm Back không phải "lùi từng lần lọc", mà về trang trước đó.
    setSearchParams(nextParams, { replace: true });
  }, [
    debouncedSearchTerm,
    typeFilter,
    locationFilter,
    statusFilter,
    featuredFilter,
    sortField,
    sortDirection,
    currentPage,
    pageSize,
    searchParams,
    setSearchParams
  ]);

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();
    async function loadAccommodations() {
      // Backend chịu trách nhiệm filter, sort và pagination trên toàn bộ dữ liệu.
      const requestParams = {
        q: debouncedSearchTerm || undefined,
        typeId: typeFilter || undefined,
        locationId: locationFilter || undefined,
        status: statusFilter || undefined,
        isFeatured: featuredFilter || undefined,
        sortBy: sortField,
        sortDir: sortDirection,
        page: currentPage,
        limit: pageSize
      };
      try {
        await fetchAccommodations({ ...requestParams, signal: abortController.signal });
      } catch (error) {
        if (!cancelled) {
          console.error(
            '[ERROR] Tải danh sách thất bại:',
            error
          );
        }
      } finally {
        // Đánh dấu đã có kết quả thật (kể cả lỗi) để bỏ chặn skeleton.
        if (!cancelled) {
          setFirstLoadSettled(true);
        }
      }
    }
    loadAccommodations();
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [
    fetchAccommodations,
    debouncedSearchTerm,
    typeFilter,
    locationFilter,
    statusFilter,
    featuredFilter,
    sortField,
    sortDirection,
    currentPage,
    pageSize,
    reloadKey
  ]);

  // Backend đã filter, sort và paginate toàn bộ dữ liệu.
  // Frontend chỉ render trang hiện tại, không lọc lại lần thứ hai.
  // Dữ liệu đã được backend phân trang sẵn.
  // Không dùng slice() lần nữa vì sẽ cắt nhầm trang hiện tại.
  const paginatedData = accommodations;

  const totalItems = accommodationsPagination.total;

  const handleResetFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
    setLocationFilter('');
    setStatusFilter('');
    setFeaturedFilter('');
    setCurrentPage(1);
    setSearchParams({});
  };

  const handleSort = (field, direction) => {
    setSortField(field);
    setSortDirection(direction);
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(paginatedData.map((d) => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const confirmDelete = async () => {
    const targetId = deleteTargetId;
    if (!targetId || deletingId) return;

    setDeleteTargetId(null);
    setDeletingId(targetId);

    try {
      await accommodationsApi.remove(targetId);
      showToast('Đã xóa cơ sở lưu trú.');

      // Xóa dòng cuối của trang > 1 thì lùi trang, tránh trang trống.
      if (accommodations.length === 1 && currentPage > 1) {
        setCurrentPage((page) => Math.max(1, page - 1));
      } else {
        setReloadKey((key) => key + 1);
      }
    } catch (error) {
      showToast(
        error.errorCode === 'INVALID_STATE'
          ? 'Không thể xóa cơ sở lưu trú vì còn loại phòng đang hoạt động.'
          : error.message || 'Không thể xóa cơ sở lưu trú.',
        'error'
      );
      setReloadKey((key) => key + 1);
    } finally {
      setDeletingId(null);
    }
  };

  const handleFeaturedToggle = async (row) => {
    if (featuredUpdatingId) return;

    const nextFeatured = !row.featured;
    setFeaturedUpdatingId(row.id);
    try {
      await accommodationsApi.updateFeatured(row.id, nextFeatured);
      showToast(nextFeatured ? 'Đã bật nổi bật.' : 'Đã tắt nổi bật.');
      setReloadKey((key) => key + 1);
    } catch (error) {
      showToast(error.message || 'Không thể cập nhật nổi bật.', 'error');
    } finally {
      setFeaturedUpdatingId(null);
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
      header: 'Ảnh bìa',
      accessor: 'cover_image',
      width: '80px',
      render: (row) => (
        <div style={{ width: '60px', height: '42px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #D9DDE2', backgroundColor: '#F3F4F6' }}>
          <img
            src={row.cover_image}
            alt={row.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            referrerPolicy="no-referrer"
            onError={(event) => {
              console.error(
                '[AccommodationListPage] Ảnh tải thất bại:',
                {
                  id: row.id,
                  name: row.name,
                  src: row.cover_image,
                  currentSrc: event.currentTarget.currentSrc
                }
              );
            }}
          />

        </div>
      )
    },
    {
      header: 'Tên cơ sở lưu trú',
      accessor: 'name',
      sortable: true,
      render: (row) => (
        <div>
          <Link
            to={`/admin/accommodations/${row.id}`}
            style={{ fontWeight: 600, color: '#292D32' }}
          >
            {row.name}
          </Link>
          <div style={{ fontSize: '11px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <span className="code-badge">{row.code}</span>
            <span>·</span>
            <span>{row.address}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Loại hình',
      accessor: 'type',
      sortable: true,
      width: '120px',
      render: (row) => <StatusBadge status={row.type} />
    },
    {
      header: 'Điểm đến',
      accessor: 'location_id',
      sortable: true,
      // DTO list trả location: { id, name }; adapter giữ nguyên object này.
      // Đọc thẳng tên từ API, không tra map mock nên không còn rơi về "Việt Nam".
      render: (row) => <span>{row.location?.name || '—'}</span>
    },
    {
      header: 'Loại phòng',
      accessor: 'room_types_count',
      sortable: true,
      width: '110px',
      align: 'center',
      render: (row) => (
        <span className="tabular-nums" style={{ fontWeight: 600 }}>
          {row.room_types_count || 0} loại
        </span>
      )
    },
    {
      header: 'Hạng sao',
      accessor: 'star_rating',
      sortable: true,
      width: '100px',
      render: (row) => {
        // star_rating NULL = chưa xếp hạng, không phải 0 sao.
        // Nếu không tách nhánh, chuỗi `${null}.0` sẽ render thành ".0".
        if (row.star_rating === null || row.star_rating === undefined) {
          return <span style={{ color: '#6B7280' }}>—</span>;
        }

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#F4C542' }}>
            <Star size={13} fill="#F4C542" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#292D32' }}>
              {row.star_rating}.0
            </span>
          </div>
        );
      }
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
      width: '115px',
      align: 'center',
      render: (row) => (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Link
            to={`/admin/accommodations/${row.id}/edit`}
            className="row-action-btn"
            title="Chỉnh sửa cơ sở lưu trú"
            aria-label={`Chỉnh sửa ${row.name}`}
          >
            <Edit2 size={13} />
          </Link>
          <button
            type="button"
            className="row-action-btn"
            title={row.featured ? 'Tắt nổi bật' : 'Bật nổi bật'}
            aria-label={`${row.featured ? 'Tắt' : 'Bật'} nổi bật ${row.name}`}
            disabled={featuredUpdatingId === row.id}
            onClick={() => handleFeaturedToggle(row)}
            style={{ color: row.featured ? '#F4C542' : '#6B7280' }}
          >
            <Star size={13} fill={row.featured ? '#F4C542' : 'none'} />
          </button>
          {isAdmin && (
            <button
              type="button"
              className="row-action-btn delete"
              title="Xóa cơ sở lưu trú"
              disabled={deletingId === row.id}
              onClick={() => setDeleteTargetId(row.id)}
              aria-label={`Xóa ${row.name}`}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        title="Quản lý cơ sở lưu trú"
        description="Quản lý danh sách khách sạn, khu nghỉ dưỡng và homestay trực thuộc hệ thống VietPeace Stay."
        breadcrumb={[
          { label: 'Cơ sở lưu trú' }
        ]}
        actions={
          isAdmin ? (
            <Link to="/admin/accommodations/create" className="btn btn-primary">
              <Plus size={15} /> Thêm cơ sở lưu trú
            </Link>
          ) : null
        }
      />

      {/* Filter Panel */}
      <div className="filter-panel">
        <div className="filter-group filter-group-wide">
          <label className="filter-label" htmlFor="search-acc">Từ khóa tìm kiếm:</label>
          <div style={{ position: 'relative' }}>
            <input
              ref={searchInputRef}
              onFocus={() => {
                searchWasFocusedRef.current = true;
              }}
              onBlur={(e) => {
                // Nếu blur không chuyển sang một control khác, coi đây là blur do rerender.
                const nextTarget = e.relatedTarget;
                if (!nextTarget || !nextTarget.matches?.('input, select, textarea, button, a')) {
                  searchWasFocusedRef.current = true;
                  window.requestAnimationFrame(() => searchInputRef.current?.focus());
                }
              }}
              autoFocus={searchWasFocusedRef.current}
              id="search-acc"
              type="text"
              className="filter-input"
              style={{ width: '100%', paddingLeft: '28px' }}
              placeholder="Tìm theo tên cơ sở, mã, địa chỉ..."
              defaultValue={searchTerm}
              onChange={(e) => {
                // Giữ trạng thái focus qua các render do debounce, URL và API.
                searchWasFocusedRef.current = true;
                window.clearTimeout(searchFocusTimerRef.current);
                searchFocusTimerRef.current = window.setTimeout(() => {
                  searchWasFocusedRef.current = false;
                }, 1200);
                setSearchTerm(e.target.value);
                setCurrentPage(1);
                // Giành lại focus sau khi React hoàn tất commit state update.
                window.requestAnimationFrame(() => {
                  const input = searchInputRef.current;
                  if (input) {
                    input.focus();
                    input.setSelectionRange(input.value.length, input.value.length);
                  }
                });
              }}
            />
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '9px', color: '#6B7280' }} />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-type">Loại hình lưu trú:</label>
          <select
            id="filter-type"
            className="filter-select"
            value={typeFilter}
            onChange={(e) => {
              const value = e.target.value;
              setTypeFilter(value);
              setCurrentPage(1);
            }}
          >
            <option value="">Tất cả loại hình</option>
            <option value="1">Khách sạn (Hotel)</option>
            <option value="2">Khu nghỉ dưỡng (Resort)</option>
            <option value="3">Homestay</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-loc">Điểm đến:</label>
          <select
            id="filter-loc"
            className="filter-select"
            value={locationFilter}
            onChange={(e) => {
              const value = e.target.value;
              setLocationFilter(value);
              setCurrentPage(1);
            }}
          >
            <option value="">Tất cả điểm đến</option>
            {locations.map((loc) => (
              // Hiển thị đúng name trong DB; bảng locations không có cột type
              // nên bỏ các nhãn ★ / lọc Country của dữ liệu mock cũ.
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-status">Trạng thái:</label>
          <select
            id="filter-status"
            className="filter-select"
            value={statusFilter}
            onChange={(e) => {
              const value = e.target.value;
              setStatusFilter(value);
              setCurrentPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="0">Bản nháp</option>
            <option value="1">Đang hoạt động</option>
            <option value="2">Ngừng hoạt động</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-featured">Nổi bật:</label>
          <select
            id="filter-featured"
            className="filter-select"
            value={featuredFilter}
            onChange={(e) => {
              const value = e.target.value;
              setFeaturedFilter(value);
              setCurrentPage(1);
            }}
          >
            <option value="">Tất cả</option>
            <option value="true">Chỉ cơ sở nổi bật</option>
            <option value="false">Cơ sở tiêu chuẩn</option>
          </select>
        </div>

        <div className="filter-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleResetFilters}
            title="Đặt lại bộ lọc"
          >
            <RotateCcw size={13} /> Đặt lại lọc
          </button>
        </div>
      </div>

      {/* Lỗi tải list: trước đây accommodationsError không bao giờ được render,
          nên fetch thất bại (500/mạng) bị hiểu nhầm là "không có dữ liệu".
          Banner chỉ xuất hiện khi có lỗi; fetchAccommodations tự clear lỗi
          ở đầu mỗi lần fetch lại (AdminContext). */}
      {accommodationsError && !accommodationsLoading && (
        <div className="admin-card" style={{ borderColor: '#E53E3E', marginBottom: '12px' }}>
          <div className="admin-card-body" style={{ color: '#C53030', fontSize: '13px' }}>
            {accommodationsError.message || 'Không thể tải danh sách cơ sở lưu trú.'}
          </div>
        </div>
      )}

      {/* Chỉ còn MỘT quyết định render: DataTable tự vẽ skeleton khi loading,
          nên không còn hai chữ "Đang tải" chồng nhau và header bảng không mất. */}
      <DataTable
        columns={columns}
        data={paginatedData}
        loading={accommodationsLoading || (!firstLoadSettled && !accommodationsError)}
        skeletonRows={pageSize}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        selectedRows={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        emptyMessage="Không tìm thấy cơ sở lưu trú nào."
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        pageSizeOptions={ALLOWED_PAGE_SIZES}
        onPageChange={(page) => {
          setCurrentPage(page);
        }}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Xác nhận xóa cơ sở lưu trú"
        message="Bạn có chắc chắn muốn xóa cơ sở lưu trú này không?"
        confirmLabel="Xóa cơ sở lưu trú"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
