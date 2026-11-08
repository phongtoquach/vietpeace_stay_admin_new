import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BedDouble,
  CheckCircle,
  Edit2,
  Image as ImageIcon,
  Ruler,
  Trash2,
  Users,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { roomTypesApi } from '../../api/roomTypes.js';
import { formatDateVN, formatVND } from '../../data/entities.js';
import { useAdmin } from '../../context/AdminContext.jsx';

const DAY_LABELS = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  7: 'Chủ Nhật',
};

function displayValue(value) {
  return value === null || value === undefined || value === '' ? '—' : value;
}

function displayPrice(value) {
  return value === null || value === undefined ? '—' : formatVND(value);
}

function DetailField({ label, children, className = '' }) {
  return (
    <div className={className}>
      <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ marginTop: '3px', color: '#292D32', fontSize: '13px' }}>
        {children}
      </div>
    </div>
  );
}

export default function RoomTypeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useAdmin();
  const [roomType, setRoomType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Tăng để nạp lại sau khi "Thử lại" ở màn lỗi server.
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRoomType() {
      setLoading(true);
      setError(null);

      try {
        const payload = await roomTypesApi.getDetail(id);
        if (cancelled) return;
        setRoomType(payload.data);
        setSelectedImage(payload.data?.coverImageUrl || payload.data?.images?.[0]?.imageUrl || null);
      } catch (loadError) {
        if (!cancelled) {
          console.error('[RoomTypeDetailPage] Không tải được chi tiết loại phòng:', loadError);
          setError(loadError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRoomType();

    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const rateMap = useMemo(
    () => Object.fromEntries((roomType?.weekdayRates || []).map((rate) => [rate.dayOfWeek, rate.price])),
    [roomType]
  );

  const handleDelete = async () => {
    if (!roomType || deleting) return;

    setDeleting(true);
    try {
      await roomTypesApi.remove(roomType.id);
      showToast(`Đã xóa loại phòng "${roomType.name}".`);
      navigate('/admin/room-types');
    } catch (deleteError) {
      showToast(deleteError.message || 'Không thể xóa loại phòng.', 'error');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '30px' }}>Đang tải chi tiết loại phòng...</div>;
  }

  if (error || !roomType) {
    // 404 = backend xác nhận không tồn tại hoặc ngoài scope quản lý.
    if (error?.status === 404) {
      return (
        <div style={{ padding: '30px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Không tìm thấy loại phòng</h2>
          <p style={{ color: '#6B7280', margin: '8px 0 16px' }}>
            Loại phòng mã #{id} không tồn tại hoặc đã bị gỡ bỏ.
          </p>
          <Link to="/admin/room-types" className="btn btn-secondary">
            <ArrowLeft size={14} /> Quay lại danh sách
          </Link>
        </div>
      );
    }

    // Lỗi khác (500/network): không kết luận "không tồn tại", cho thử lại.
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Không tải được chi tiết loại phòng</h2>
        <p style={{ color: '#6B7280', margin: '8px 0 16px' }}>
          {error?.message || 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.'}
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Thử lại
          </button>
          <Link to="/admin/room-types" className="btn btn-secondary">
            <ArrowLeft size={14} /> Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  const images = roomType.images || [];
  const amenities = roomType.amenities || [];
  const displayedImage = selectedImage || roomType.coverImageUrl;

  return (
    <div>
      <PageHeader
        title={roomType.name}
        description={`Mã: ${roomType.code} · ${roomType.accommodationName || `Cơ sở #${roomType.accommodationId}`}`}
        breadcrumb={[
          { label: 'Loại phòng', path: '/admin/room-types' },
          { label: roomType.name },
        ]}
        actions={(
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link to="/admin/room-types" className="btn btn-secondary">
              <ArrowLeft size={14} /> Danh sách
            </Link>
            <Link to={`/admin/room-types/${roomType.id}/edit`} className="btn btn-primary">
              <Edit2 size={14} /> Chỉnh sửa
            </Link>
            <button
              type="button"
              className="btn btn-outline-danger"
              disabled={deleting}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 size={14} /> Xóa
            </button>
          </div>
        )}
      />

      <div className="admin-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div style={{ width: '300px', minHeight: '210px', backgroundColor: '#F3F4F6', position: 'relative' }}>
          {displayedImage ? (
            <img
              src={displayedImage}
              alt={roomType.name}
              style={{ width: '100%', height: '100%', minHeight: '210px', objectFit: 'cover' }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div style={{ minHeight: '210px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
              <ImageIcon size={28} />
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: '280px', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <StatusBadge status={roomType.statusLabel || roomType.status} />
            <span className="badge badge-neutral">{roomType.quantity} phòng</span>
            <span className="badge badge-neutral">Thứ tự {roomType.sortOrder}</span>
          </div>
          <h2 style={{ fontSize: '20px', marginBottom: '6px', color: '#292D32' }}>{roomType.name}</h2>
          <p style={{ color: '#4B5563', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {roomType.shortDescription || 'Chưa có mô tả ngắn.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #F3F4F6' }}>
            <div><Ruler size={14} color="#6B7280" /><div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>Diện tích</div><strong>{displayValue(roomType.areaSqm)}{roomType.areaSqm ? ' m²' : ''}</strong></div>
            <div><BedDouble size={14} color="#6B7280" /><div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>Loại giường</div><strong>{displayValue(roomType.bedDescription)}</strong></div>
            <div><Users size={14} color="#6B7280" /><div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>Sức chứa tối đa</div><strong>{roomType.maxOccupancy} khách</strong></div>
          </div>
        </div>
      </div>

      {images.length > 0 && (
        <div className="admin-card">
          <div className="admin-card-header"><div className="admin-card-title">Hình ảnh loại phòng ({images.length})</div></div>
          <div className="admin-card-body">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {images.map((image) => (
                <button
                  type="button"
                  key={image.id || image.imageUrl}
                  onClick={() => setSelectedImage(image.imageUrl)}
                  style={{ width: '88px', height: '62px', padding: 0, border: selectedImage === image.imageUrl ? '2px solid #D6A82C' : '1px solid #D9DDE2', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#F3F4F6' }}
                  title={image.caption || image.altText || roomType.name}
                >
                  <img src={image.imageUrl} alt={image.altText || roomType.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 1fr)', gap: '16px' }}>
        <div className="admin-card">
          <div className="admin-card-header"><div className="admin-card-title">Thông tin loại phòng</div></div>
          <div className="admin-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '18px' }}>
              <DetailField label="Mã loại phòng"><span className="code-badge">{roomType.code}</span></DetailField>
              <DetailField label="Cơ sở lưu trú"><Link to={`/admin/accommodations/${roomType.accommodationId}`} style={{ color: '#8C5A00', fontWeight: 600 }}>{roomType.accommodationName || `#${roomType.accommodationId}`}</Link></DetailField>
              <DetailField label="Số lượng phòng">{roomType.quantity} phòng</DetailField>
              <DetailField label="Phòng ngủ">{roomType.bedroomCount} phòng</DetailField>
              <DetailField label="Phòng tắm">{roomType.bathroomCount} phòng</DetailField>
              <DetailField label="Giá gốc / đêm"><strong className="tabular-nums">{displayPrice(roomType.basePrice)}</strong></DetailField>
              <DetailField label="Ngày tạo">{formatDateVN(roomType.createdAt)}</DetailField>
              <DetailField label="Cập nhật lần cuối">{formatDateVN(roomType.updatedAt)}</DetailField>
            </div>
            <div style={{ borderTop: '1px solid #F3F4F6', marginTop: '20px', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, marginBottom: '6px' }}>Mô tả chi tiết</h3>
              <p style={{ color: '#374151', fontSize: '13px', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{roomType.description || 'Chưa có mô tả chi tiết.'}</p>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header"><div className="admin-card-title">Sức chứa & phụ phí</div></div>
          <div className="admin-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <DetailField label="Tiêu chuẩn đi kèm">{roomType.includedAdults} người lớn · {roomType.includedChildren} trẻ em</DetailField>
              <DetailField label="Giới hạn người lớn">Tối đa {roomType.maxAdults} người</DetailField>
              <DetailField label="Giới hạn trẻ em">Tối đa {roomType.maxChildren} trẻ em</DetailField>
              <DetailField label="Tổng sức chứa"><strong>{roomType.maxOccupancy} khách</strong></DetailField>
              <DetailField label="Phụ phí người lớn thêm"><span className="tabular-nums">{displayPrice(roomType.extraAdultFee)} / người / đêm</span></DetailField>
              <DetailField label="Phụ phí trẻ em thêm"><span className="tabular-nums">{displayPrice(roomType.extraChildFee)} / trẻ / đêm</span></DetailField>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header"><div className="admin-card-title">Bảng giá theo ngày trong tuần</div><span className="badge badge-neutral">Giá gốc: {displayPrice(roomType.basePrice)}</span></div>
        <div className="table-responsive" style={{ border: 'none' }}>
          <table className="data-table">
            <thead><tr>{[1, 2, 3, 4, 5, 6, 7].map((day) => <th key={day} style={{ textAlign: 'right' }}>{DAY_LABELS[day]}</th>)}</tr></thead>
            <tbody><tr>{[1, 2, 3, 4, 5, 6, 7].map((day) => <td key={day} style={{ textAlign: 'right' }} className="tabular-nums">{displayPrice(rateMap[day])}</td>)}</tr></tbody>
          </table>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header"><div className="admin-card-title">Tiện nghi loại phòng ({amenities.length})</div></div>
        <div className="admin-card-body">
          {amenities.length === 0 ? <div style={{ color: '#6B7280', fontSize: '13px' }}>Chưa có tiện nghi nào được liên kết.</div> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {amenities.map((amenity) => (
                <div key={amenity.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '9px 12px', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '4px' }}>
                  <CheckCircle size={15} color="#287A4B" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div><div style={{ fontSize: '13px', fontWeight: 600 }}>{amenity.name}</div><div style={{ fontSize: '11px', color: '#6B7280' }}>{amenity.categoryName || amenity.categoryCode || 'Tiện nghi'}</div>{amenity.note && <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '3px' }}>{amenity.note}</div>}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Xóa loại phòng"
        message={`Bạn có chắc chắn muốn xóa loại phòng "${roomType.name}" không?`}
        confirmLabel="Xóa loại phòng"
        cancelLabel="Hủy"
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
