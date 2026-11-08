import React, { useEffect, useState } from 'react';
import { accommodationsApi } from '../../api/accommodations.js';
import { roomTypesApi } from '../../api/roomTypes.js';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
// Helper định dạng dùng chung, không phụ thuộc dữ liệu mock.
// (formatDateVN đã bỏ — chỉ section rate_periods mock từng dùng.)
import { formatVND } from '../../data/entities.js';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Star,
  Plus,
  CheckCircle,
  Calendar
} from 'lucide-react';

export default function AccommodationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    currentUser,
    showToast
  } = useAdmin();

  // Role từ server session — ẩn nút Xóa cho non-ADMIN chỉ là UX,
  // backend DELETE đã có requireRole("ADMIN") thực thi quyền thật.
  const isAdmin = currentUser?.role === 'ADMIN';

  const [accommodation, setAccommodation] = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState(null);

  // Tăng để nạp lại chi tiết sau khi "Thử lại" ở màn lỗi server.
  const [reloadKey, setReloadKey] = useState(0);

  const [activeTab, setActiveTab] = useState('general');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [featuredUpdating, setFeaturedUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAccommodationDetail() {
      setDetailLoading(true);
      setDetailError(null);

      try {
        const payload = await accommodationsApi.getDetail(id);

        if (cancelled) return;

        setAccommodation(payload.data);
      } catch (error) {
        if (!cancelled) {
          console.error('[ERROR] Tải detail thất bại:', error);
          setDetailError(error);
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    loadAccommodationDetail();

    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const [roomPricingState, setRoomPricingState] = useState({
    accommodationId: null,
    byRoom: {},
    error: null
  });

  // DTO chi tiết cơ sở chỉ trả minPrice, còn giá gốc và bảng giá 7 ngày
  // nằm trong DTO chi tiết của từng room type.
  useEffect(() => {
    const roomTypes = accommodation?.room_types || [];

    if (roomTypes.length === 0) {
      return undefined;
    }

    const accommodationId = accommodation.id;
    let cancelled = false;

    Promise.all(
      roomTypes.map(async (room) => {
        try {
          const payload = await roomTypesApi.getDetail(room.id);
          const rateMap = {};
          (payload.data?.weekdayRates || []).forEach((rate) => {
            rateMap[rate.dayOfWeek] = rate.price;
          });
          return {
            roomId: room.id,
            basePrice: payload.data?.basePrice ?? null,
            rateMap
          };
        } catch (error) {
          console.error(
            `[ERROR] Tải giá của loại phòng #${room.id} thất bại:`,
            error
          );
          return { roomId: room.id, basePrice: null, rateMap: null };
        }
      })
    ).then((results) => {
      if (cancelled) return;

      const byRoom = {};
      let failedCount = 0;

      results.forEach(({ roomId, basePrice, rateMap }) => {
        if (rateMap) {
          byRoom[roomId] = { basePrice, rateMap };
        } else {
          failedCount += 1;
        }
      });

      setRoomPricingState({
        accommodationId,
        byRoom,
        error:
          failedCount > 0
            ? `${failedCount}/${roomTypes.length} loại phòng không tải được bảng giá.`
            : null
      });
    });

    return () => {
      cancelled = true;
    };
  }, [accommodation]);

  if (detailLoading) {
    return <div style={{ padding: '30px' }}>Đang tải chi tiết...</div>;
  }

  if (detailError || !accommodation) {
    // 404 = backend xác nhận không tồn tại hoặc ngoài scope quản lý.
    if (detailError?.status === 404) {
      return (
        <div style={{ padding: '30px', textAlign: 'center' }}>
          <h2>Không tìm thấy cơ sở lưu trú</h2>
          <p>
            Cơ sở lưu trú có mã #{id} không tồn tại hoặc đã bị gỡ bỏ.
          </p>
          <Link to="/admin/accommodations" className="btn btn-secondary">
            <ArrowLeft size={14} /> Quay lại danh sách
          </Link>
        </div>
      );
    }

    // Các lỗi khác (500/network): không kết luận "không tồn tại",
    // cho người dùng thử lại thay vì hiện màn nhầm như bản ghi đã mất.
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <h2>Không tải được chi tiết cơ sở lưu trú</h2>
        <p style={{ color: '#6B7280' }}>
          {detailError?.message || 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.'}
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Thử lại
          </button>
          <Link to="/admin/accommodations" className="btn btn-secondary">
            <ArrowLeft size={14} /> Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  // Tên điểm đến lấy trực tiếp từ DTO detail (location: { id, name }).
  // Trước đây tra `locations` mock bằng `accommodation.location_id` — field này
  // không tồn tại trong adapter detail nên luôn rơi về "Việt Nam".
  const locationDisplay = accommodation.location?.name || '—';

  // DTO detail trả type dạng object { id, code, name }; nối chuỗi trực tiếp
  // sẽ ra "[object Object]" nên đọc .name trước, fallback .code.
  const typeLabel = accommodation.type?.name || accommodation.type?.code || '—';

  // Detail API đã trả đầy đủ các mảng quan hệ.
  // Không lấy từ context mock vì context chỉ chứa dữ liệu khởi tạo cũ.
  const propertyRoomTypes = accommodation.room_types || [];
  const propertyAmenities = accommodation.amenities || [];
  const propertyAttractions = accommodation.attractions || [];

  const roomPricingReady = roomPricingState.accommodationId === accommodation.id;
  const roomPricingByRoomType = roomPricingReady ? roomPricingState.byRoom : {};
  const weekdayRatesError = roomPricingReady ? roomPricingState.error : null;
  const weekdayRatesLoading = propertyRoomTypes.length > 0 && !roomPricingReady;

  const basePriceForRoom = (roomId) => {
    if (weekdayRatesLoading) return 'Đang tải...';
    const basePrice = roomPricingByRoomType[roomId]?.basePrice;
    return basePrice === undefined || basePrice === null
      ? '—'
      : formatVND(basePrice);
  };

  // Địa chỉ đầy đủ = số nhà/đường + phường/xã + tỉnh/thành.
  // DTO detail đã có ward.name và province.name từ backend;
  // ward có thể null (LEFT JOIN wards) nên phải filter phần rỗng,
  // tránh nối chuỗi thô tạo ra "undefined".
  const fullAddress = [
    accommodation.address,
    accommodation.ward?.name,
    accommodation.province?.name
  ]
    .filter(Boolean)
    .join(', ');

  // Chỉ vẽ sao khi có số hợp lệ 1..5. NULL/undefined = chưa xếp hạng → 0 sao,
  // trước đây `star_rating || 5` biến NULL thành 5 sao giả trên UI.
  const parsedStarCount = Number(accommodation.star_rating);
  const starCount =
    Number.isFinite(parsedStarCount) && parsedStarCount > 0
      ? Math.min(Math.round(parsedStarCount), 5)
      : 0;

  const handleDeleteAccommodation = async () => {
    if (deleting) return;

    setDeleting(true);
    try {
      await accommodationsApi.remove(accommodation.id);
      showToast('Đã xóa cơ sở lưu trú.');
      navigate('/admin/accommodations');
    } catch (error) {
      showToast(
        error.errorCode === 'INVALID_STATE'
          ? 'Không thể xóa cơ sở lưu trú vì còn loại phòng đang hoạt động.'
          : error.message || 'Không thể xóa cơ sở lưu trú.',
        'error'
      );
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleFeaturedToggle = async () => {
    if (featuredUpdating) return;

    const nextFeatured = !accommodation.featured;
    setFeaturedUpdating(true);
    try {
      const result = await accommodationsApi.updateFeatured(
        accommodation.id,
        nextFeatured
      );
      setAccommodation((prev) => ({
        ...prev,
        featured: result.isFeatured
      }));
      showToast(result.isFeatured ? 'Đã bật nổi bật.' : 'Đã tắt nổi bật.');
    } catch (error) {
      showToast(error.message || 'Không thể cập nhật nổi bật.', 'error');
    } finally {
      setFeaturedUpdating(false);
    }
  };


  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title={accommodation.name}
        description={`${typeLabel} · Mã: ${accommodation.code} · ${locationDisplay}`}
        breadcrumb={[
          { label: 'Cơ sở lưu trú', path: '/admin/accommodations' },
          { label: accommodation.name }
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/admin/accommodations" className="btn btn-secondary">
              <ArrowLeft size={14} /> Danh sách
            </Link>
            <Link to={`/admin/accommodations/${accommodation.id}/edit`} className="btn btn-primary">
              <Edit2 size={14} /> Chỉnh sửa cơ sở
            </Link>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-outline-danger"
                disabled={deleting}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 size={14} /> Xóa
              </button>
            )}
          </div>
        }
      />

      {/* Top Property Hero Card */}
      <div
        className="admin-card"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ width: '280px', minHeight: '160px', position: 'relative', backgroundColor: '#F3F4F6' }}>
          <img
            src={accommodation.cover_image}
            alt={accommodation.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            referrerPolicy="no-referrer"
          />
        </div>

        <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <StatusBadge
                status={
                  accommodation.type?.code ||
                  accommodation.type?.name ||
                  accommodation.type ||
                  ""
                }
              />
              {/* accommodation.status là số 0/1/2; StatusBadge không dịch số.
                  DTO đã có statusLabel ("Đang hoạt động"…) nên truyền nhãn chữ,
                  vẫn fallback về số nếu statusLabel rỗng. */}
              <StatusBadge status={accommodation.statusLabel || accommodation.status} />
              {accommodation.featured && <span className="badge badge-warning">Nổi bật</span>}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={featuredUpdating}
                onClick={handleFeaturedToggle}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <Star
                  size={13}
                  fill={accommodation.featured ? '#F4C542' : 'none'}
                  color={accommodation.featured ? '#F4C542' : '#6B7280'}
                />
                {accommodation.featured ? 'Tắt nổi bật' : 'Bật nổi bật'}
              </button>
              {/* starCount = 0 (NULL/không hợp lệ) thì không render khối sao nào. */}
              {starCount > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#F4C542', marginLeft: 'auto' }}>
                  {Array.from({ length: starCount }).map((_, i) => (
                    <Star key={i} size={14} fill="#F4C542" />
                  ))}
                </div>
              )}
            </div>

            <p style={{ fontSize: '13px', color: '#4B5563', marginBottom: '12px' }}>
              {accommodation.short_description}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px',
              paddingTop: '10px',
              borderTop: '1px solid #F3F4F6',
              fontSize: '12px',
              color: '#6B7280'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} color="#6B7280" />
              {/* Ghép đủ 3 cấp địa chỉ; nếu tất cả đều rỗng thì hiện "—" */}
              <span style={{ color: '#292D32' }}>{fullAddress || '—'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} color="#6B7280" />
              <span style={{ color: '#292D32' }}>{accommodation.phone || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} color="#6B7280" />
              <span style={{ color: '#292D32' }}>{accommodation.email || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="#6B7280" />
              <span style={{ color: '#292D32' }}>
                {/* DTO detail dùng camelCase (checkInTime/checkOutTime);
                    bản cũ đọc snake_case của mock nên luôn hiện trống. */}
                Nhận phòng: {accommodation.checkInTime || '—'} / Trả phòng: {accommodation.checkOutTime || '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs" style={{ marginBottom: '16px' }}>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          Thông tin chung
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'roomTypes' ? 'active' : ''}`}
          onClick={() => setActiveTab('roomTypes')}
        >
          Loại phòng ({propertyRoomTypes.length})
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'amenities' ? 'active' : ''}`}
          onClick={() => setActiveTab('amenities')}
        >
          Tiện nghi ({propertyAmenities.length})
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'attractions' ? 'active' : ''}`}
          onClick={() => setActiveTab('attractions')}
        >
          Điểm tham quan ({propertyAttractions.length})
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'images' ? 'active' : ''}`}
          onClick={() => setActiveTab('images')}
        >
          Hình ảnh ({accommodation.images?.length || 0})
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'pricing' ? 'active' : ''}`}
          onClick={() => setActiveTab('pricing')}
        >
          Bảng giá & Kỳ giá đặc biệt
        </button>
      </div>

      {/* Tab 1: General Info */}
      {activeTab === 'general' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Chi tiết cơ sở lưu trú</div>
          </div>
          <div className="admin-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '11.5px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                  Mã cơ sở lưu trú
                </span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#292D32' }} className="code-badge">
                  {accommodation.code}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                  Điểm đến trực thuộc
                </span>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#292D32' }}>
                  {locationDisplay}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                  Tọa độ GPS
                </span>
                <div style={{ fontSize: '14px', color: '#292D32' }} className="tabular-nums">
                  Vĩ độ: {accommodation.latitude || '—'} · Kinh độ: {accommodation.longitude || '—'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                  Website chính thức
                </span>
                <div>
                  {accommodation.website ? (
                    <a
                      href={accommodation.website}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#8C5A00', textDecoration: 'underline', fontSize: '13px' }}
                    >
                      {accommodation.website}
                    </a>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
            </div>

            {/* Người quản lý đang được gán (accommodation_managers + users).
                DTO detail trả manager = null khi chưa gán; hasManager chỉ
                đúng khi tài khoản manager còn hoạt động (R7). */}
            <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#292D32', marginBottom: '10px' }}>
                Người quản lý đang phụ trách
              </h3>
              {accommodation.manager ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11.5px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                      Họ tên Manager
                    </span>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#292D32', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {accommodation.manager.fullName || '—'}
                      {!accommodation.manager.isActive && (
                        <span className="badge badge-warning" style={{ fontSize: '10.5px' }}>
                          Tài khoản tạm khóa
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11.5px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                      Email hệ thống
                    </span>
                    <div style={{ fontSize: '14px', color: '#292D32' }}>
                      {accommodation.manager.internalEmail || '—'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11.5px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                      Email cá nhân
                    </span>
                    <div style={{ fontSize: '14px', color: '#292D32' }}>
                      {accommodation.manager.personalEmail || '—'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11.5px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                      Điện thoại
                    </span>
                    <div style={{ fontSize: '14px', color: '#292D32' }}>
                      {accommodation.manager.phoneNumber || '—'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11.5px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                      Nhận bàn giao ngày
                    </span>
                    <div style={{ fontSize: '14px', color: '#292D32' }} className="tabular-nums">
                      {accommodation.manager.assignedAt || '—'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#6B7280' }}>
                  Cơ sở chưa có người quản lý được gán.
                  {isAdmin && (
                    <>
                      {' '}Gán Manager tại{' '}
                      <Link to="/admin/roles" style={{ color: '#8C5A00', textDecoration: 'underline' }}>
                        Phân quyền &amp; Quản lý
                      </Link>
                      . Cơ sở chưa có Manager đang hoạt động không thể chuyển sang
                      trạng thái Đang hoạt động.
                    </>
                  )}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#292D32', marginBottom: '6px' }}>
                Mô tả chi tiết cơ sở lưu trú
              </h3>
              <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#374151', whiteSpace: 'pre-line' }}>
                {accommodation.full_description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Room Types */}
      {activeTab === 'roomTypes' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Danh sách loại phòng trực thuộc</div>
            <Link
              to={`/admin/room-types/create?accommodation_id=${accommodation.id}`}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} /> Thêm loại phòng
            </Link>
          </div>

          <div className="table-responsive" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hình ảnh</th>
                  <th>Tên loại phòng</th>
                  <th>Giường & Diện tích</th>
                  <th>Sức chứa</th>
                  <th style={{ textAlign: 'right' }}>Giá gốc / đêm</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {propertyRoomTypes.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#6B7280' }}>
                      Cơ sở lưu trú này chưa có loại phòng nào được thiết lập.
                    </td>
                  </tr>
                ) : (
                  propertyRoomTypes.map((room) => (
                    <tr key={room.id}>
                      <td style={{ width: '60px' }}>
                        <div style={{ width: '48px', height: '36px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #D9DDE2', backgroundColor: '#F3F4F6' }}>
                          <img
                            src={room.room_image}
                            alt={room.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#292D32' }}>{room.name}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }} className="code-badge">
                          Mã: {room.code}
                        </div>
                      </td>
                      <td>
                        <div>{room.bed_type}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }} className="tabular-nums">
                          {room.room_size === null || room.room_size === undefined
                            ? 'Diện tích: —'
                            : `Diện tích: ${room.room_size} m²`}
                        </div>
                      </td>
                      <td className="tabular-nums" style={{ fontSize: '12px' }}>
                        {room.included_adults} người lớn, {room.included_children} trẻ em <br />
                        <span style={{ color: '#6B7280', fontSize: '11px' }}>Tối đa: {room.max_occupancy} khách</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#292D32' }} className="tabular-nums">
                        {basePriceForRoom(room.id)}
                      </td>
                      <td>
                        <StatusBadge status={room.statusLabel} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Link
                            to={`/admin/room-types/${room.id}/edit`}
                            className="row-action-btn"
                            title="Chỉnh sửa loại phòng"
                          >
                            <Edit2 size={13} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Amenities */}
      {activeTab === 'amenities' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Tiện nghi cơ sở lưu trú đang cung cấp</div>
            <Link to={`/admin/accommodations/${accommodation.id}/edit`} className="btn btn-secondary btn-sm">
              <Edit2 size={13} /> Chỉnh sửa tiện nghi
            </Link>
          </div>
          <div className="admin-card-body">
            {propertyAmenities.length === 0 ? (
              <div style={{ color: '#6B7280' }}>Chưa chọn tiện nghi nào cho cơ sở này.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                {propertyAmenities.map((am) => (
                  <div
                    key={am.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      backgroundColor: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '4px'
                    }}
                  >
                    <CheckCircle size={15} color="#287A4B" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#292D32' }}>
                        {am.name}
                        {am.isChargeable && (
                          <span
                            style={{
                              marginLeft: '6px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              color: '#B45309',
                              backgroundColor: '#FEF3C7',
                              padding: '1px 6px',
                              borderRadius: '999px'
                            }}
                          >
                            Có thu phí
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>{am.category}</div>
                      {am.note && (
                        <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '3px' }}>
                          {am.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Attractions */}
      {activeTab === 'attractions' && (
        <div className="admin-card">
          <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div className="admin-card-title">Điểm tham quan du lịch lân cận ({propertyAttractions.length})</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                Danh sách các điểm danh thắng, bãi biển, di tích gắn liền với vị trí của {accommodation.name}.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link
                // Adapter detail không có field location_id phẳng; location là
                // object { id, name }. Trước đây template đọc location_id
                // undefined nên URL thành ?locationId=undefined.
                to={`/admin/attractions${
                  accommodation.location?.id
                    ? `?locationId=${accommodation.location.id}`
                    : ''
                }`}
                className="btn btn-secondary btn-sm"
              >
                Quản lý điểm tham quan khu vực
              </Link>
              <Link
                to={`/admin/accommodations/${accommodation.id}/edit`}
                className="btn btn-primary btn-sm"
              >
                <Edit2 size={13} /> Chỉnh sửa liên kết
              </Link>
            </div>
          </div>
          <div className="admin-card-body">
            {propertyAttractions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#6B7280' }}>
                <div style={{ fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Chưa có điểm tham quan nào được liên kết với cơ sở này.
                </div>
                <div style={{ fontSize: '13px', marginBottom: '14px' }}>
                  Bạn có thể liên kết các điểm danh lam thắng cảnh xung quanh để tăng sức hút cho khách đặt phòng.
                </div>
                <Link
                  to={`/admin/accommodations/${accommodation.id}/edit`}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={13} /> Thêm điểm tham quan lân cận
                </Link>
              </div>
            ) : (
              <div className="table-responsive" style={{ border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Hình ảnh</th>
                      <th>Tên điểm tham quan</th>
                      <th>Địa chỉ</th>
                      <th style={{ width: '130px' }}>Khoảng cách</th>
                      <th>Ghi chú hành trình & di chuyển</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {propertyAttractions.map((item) => {
                      const att = item;
                      const thumbnail = att?.image || accommodation.cover_image;

                      return (
                        <tr key={item.attraction_id}>
                          <td>
                            <div
                              style={{
                                width: '64px',
                                height: '46px',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                border: '1px solid #D9DDE2',
                                backgroundColor: '#F3F4F6'
                              }}
                            >
                              <img
                                src={thumbnail}
                                alt={att?.name || 'Điểm tham quan'}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#1F2937' }}>
                              {att ? att.name : `Điểm tham quan #${item.attraction_id}`}
                            </div>
                            {att && (
                              <Link
                                to={`/admin/attractions/${att.id}/edit`}
                                style={{ fontSize: '11.5px', color: '#287A4B', textDecoration: 'underline' }}
                              >
                                Xem chi tiết điểm tham quan
                              </Link>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: '12.5px', color: '#4B5563' }}>
                              {att?.address || '—'}
                            </div>
                          </td>
                          <td>
                            <span
                              className="badge badge-neutral tabular-nums"
                              style={{ fontWeight: 600, fontSize: '12px' }}
                            >
                              {item.distance} {item.distance_unit || 'km'}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '12.5px', color: '#4B5563' }}>
                              {item.notes || '—'}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className={`badge ${att?.is_active ? 'badge-success' : 'badge-danger'}`}
                              style={{ fontSize: '11px' }}
                            >
                              {att?.is_active ? 'Hoạt động' : 'Ngừng HĐ'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Images */}
      {activeTab === 'images' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Thư viện ảnh cơ sở lưu trú</div>
            <Link to={`/admin/accommodations/${accommodation.id}/edit`} className="btn btn-secondary btn-sm">
              <Plus size={13} /> Tải thêm ảnh
            </Link>
          </div>
          <div className="admin-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
              {(accommodation.gallery_images || []).map((imgSrc, idx) => (
                <div
                  key={idx}
                  style={{
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid #D9DDE2',
                    backgroundColor: '#F3F4F6'
                  }}
                >
                  <img
                    src={imgSrc}
                    alt={`${accommodation.name} ${idx + 1}`}
                    style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }}
                    referrerPolicy="no-referrer"
                  />
                  <div style={{ padding: '6px 10px', fontSize: '11px', color: '#6B7280', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{idx === 0 ? 'Ảnh bìa chính' : `Ảnh thư viện ${idx + 1}`}</span>
                    <span>JPEG</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Pricing & Rate Periods */}
      {activeTab === 'pricing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section "Kỳ giá đặc biệt (rate_periods)" đã gỡ bỏ: nó lọc trên
              mock INITIAL_RATE_PERIODS vốn không có field accommodation_id
              nên bảng luôn rỗng, và các nút bên trong trỏ sang trang mock.
              Khi module pricing có API thật sẽ dựng lại section này. */}

          {/* 7-Day Weekday Rates for Room Types */}
          <div className="admin-card">
            <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div className="admin-card-title">Bảng giá 7 ngày trong tuần (room_weekday_rates)</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  Bảng giá từng ngày trong tuần (1 = Thứ Hai ... 7 = Chủ Nhật) cho các loại phòng của cơ sở này.
                </div>
              </div>
              <Link to={`/admin/room-rates?accId=${accommodation.id}`} className="btn btn-secondary btn-sm">
                Mở ma trận chỉnh sửa giá
              </Link>
            </div>
            {weekdayRatesLoading && (
              <div style={{ padding: '0 16px 8px', fontSize: '12px', color: '#6B7280' }}>
                Đang tải bảng giá 7 ngày...
              </div>
            )}
            {weekdayRatesError && (
              <div style={{ padding: '0 16px 8px', fontSize: '12px', color: '#B91C1C' }}>
                {weekdayRatesError}
              </div>
            )}
            <div className="table-responsive" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Loại phòng</th>
                    <th style={{ textAlign: 'right' }}>Thứ 2 (1)</th>
                    <th style={{ textAlign: 'right' }}>Thứ 3 (2)</th>
                    <th style={{ textAlign: 'right' }}>Thứ 4 (3)</th>
                    <th style={{ textAlign: 'right' }}>Thứ 5 (4)</th>
                    <th style={{ textAlign: 'right' }}>Thứ 6 (5)</th>
                    <th style={{ textAlign: 'right' }}>Thứ 7 (6)</th>
                    <th style={{ textAlign: 'right' }}>Chủ Nhật (7)</th>
                  </tr>
                </thead>
                <tbody>
                  {propertyRoomTypes.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#6B7280' }}>
                        Chưa có loại phòng nào được tạo cho cơ sở lưu trú này.
                      </td>
                    </tr>
                  ) : (
                    propertyRoomTypes.map((room) => {
                      const rateMap = roomPricingByRoomType[room.id]?.rateMap || {};
                      const renderRate = (dayOfWeek) => (
                        rateMap[dayOfWeek] === undefined || rateMap[dayOfWeek] === null
                          ? '—'
                          : formatVND(rateMap[dayOfWeek])
                      );
                      return (
                        <tr key={room.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{room.name}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>Mã: {room.code}</div>
                          </td>
                          <td style={{ textAlign: 'right' }} className="tabular-nums">
                            {renderRate(1)}
                          </td>
                          <td style={{ textAlign: 'right' }} className="tabular-nums">
                            {renderRate(2)}
                          </td>
                          <td style={{ textAlign: 'right' }} className="tabular-nums">
                            {renderRate(3)}
                          </td>
                          <td style={{ textAlign: 'right' }} className="tabular-nums">
                            {renderRate(4)}
                          </td>
                          <td style={{ textAlign: 'right' }} className="tabular-nums">
                            {renderRate(5)}
                          </td>
                          <td style={{ textAlign: 'right' }} className="tabular-nums">
                            {renderRate(6)}
                          </td>
                          <td style={{ textAlign: 'right' }} className="tabular-nums">
                            {renderRate(7)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Delete Accommodation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Xác nhận xóa cơ sở lưu trú"
        message={`Bạn có chắc chắn muốn xóa cơ sở lưu trú "${accommodation.name}" không?`}
        confirmLabel="Xóa cơ sở lưu trú"
        confirmVariant="danger"
        onConfirm={handleDeleteAccommodation}
        onCancel={() => setDeleteDialogOpen(false)}
      />


    </div>
  );
}
