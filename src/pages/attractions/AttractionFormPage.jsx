import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import FormInput from '../../components/forms/FormInput.jsx';
import FormSelect from '../../components/forms/FormSelect.jsx';
import FormTextarea from '../../components/forms/FormTextarea.jsx';
import resortDanangImg from '../../assets/images/resort_danang_1790825961463.jpg';
import hotelHanoiImg from '../../assets/images/hotel_hanoi_1790825973601.jpg';
import resortPhuquocImg from '../../assets/images/resort_phuquoc_1790825997319.jpg';
import {
  Save,
  ArrowLeft,
  MapPin,
  Image as ImageIcon,
  UploadCloud,
  X,
  AlertCircle,
  Building,
  Check
} from 'lucide-react';

export default function AttractionFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationIdParam = searchParams.get('locationId') || '';

  const {
    locations,
    attractions,
    accommodations,
    addAttraction,
    updateAttraction
  } = useAdmin();

  const fileInputRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    location_id: locationIdParam,
    name: '',
    address: '',
    description: '',
    image: '',
    is_active: true
  });

  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing data in Edit mode
  useEffect(() => {
    if (isEdit) {
      const existing = attractions.find((a) => String(a.id) === String(id));
      if (existing) {
        setFormData({
          location_id: String(existing.location_id || ''),
          name: existing.name || '',
          address: existing.address || '',
          description: existing.description || '',
          image: existing.image || '',
          is_active: existing.is_active !== undefined ? Boolean(existing.is_active) : true
        });
        setImagePreview(existing.image || null);
        setIsNotFound(false);
      } else {
        setIsNotFound(true);
      }
    } else if (locationIdParam) {
      setFormData((prev) => ({
        ...prev,
        location_id: String(locationIdParam)
      }));
    }
  }, [id, isEdit, attractions, locationIdParam]);

  // Hierarchical location options
  const locationOptions = useMemo(() => {
    const list = [];
    const roots = locations.filter((l) => !l.parent_location_id);
    roots.forEach((root) => {
      list.push({ value: String(root.id), label: root.name });
      const children = locations.filter((l) => l.parent_location_id === root.id);
      children.forEach((child) => {
        list.push({ value: String(child.id), label: `  ↳ ${child.name}` });
        const grandChildren = locations.filter((l) => l.parent_location_id === child.id);
        grandChildren.forEach((gc) => {
          list.push({ value: String(gc.id), label: `      ↳ ${gc.name}` });
        });
      });
    });

    const listedIds = new Set(list.map((item) => String(item.value)));
    locations.forEach((loc) => {
      if (!listedIds.has(String(loc.id))) {
        list.push({ value: String(loc.id), label: loc.name });
      }
    });

    return list;
  }, [locations]);

  // Linked accommodations for warning info
  const linkedAccommodations = useMemo(() => {
    if (!isEdit) return [];
    return accommodations.filter((acc) =>
      (acc.attractions || []).some((a) => Number(a.attraction_id) === Number(id))
    );
  }, [isEdit, id, accommodations]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Image upload handling
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, image: 'Kích thước ảnh tối đa là 5MB.' }));
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target.result;
        setImagePreview(result);
        setFormData((prev) => ({ ...prev, image: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, image: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectPresetImage = (imgSrc) => {
    setImagePreview(imgSrc);
    setFormData((prev) => ({ ...prev, image: imgSrc }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.location_id) {
      newErrors.location_id = 'Vui lòng chọn điểm đến sở hữu điểm tham quan này.';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập tên điểm tham quan.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        location_id: Number(formData.location_id),
        name: formData.name.trim(),
        address: formData.address.trim(),
        description: formData.description.trim(),
        image: formData.image || imagePreview || '',
        is_active: Boolean(formData.is_active)
      };

      if (isEdit) {
        updateAttraction(id, payload);
      } else {
        addAttraction(payload);
      }

      navigate(`/admin/attractions?locationId=${formData.location_id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isNotFound) {
    return (
      <div className="admin-page">
        <PageHeader
          title="Không tìm thấy điểm tham quan"
          breadcrumbs={[
            { label: 'Quản lý lưu trú' },
            { label: 'Điểm tham quan', link: '/admin/attractions' },
            { label: 'Lỗi' }
          ]}
        />
        <div className="admin-card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={36} color="#DC2626" style={{ margin: '0 auto 12px' }} />
          <h3>Điểm tham quan không tồn tại hoặc đã bị xóa.</h3>
          <p style={{ color: '#6B7280', marginTop: '6px' }}>
            ID #{id} không có trong cơ sở dữ liệu hiện tại.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: '16px' }}
            onClick={() => navigate('/admin/attractions')}
          >
            Quay lại danh sách điểm tham quan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <PageHeader
        title={isEdit ? `Chỉnh sửa điểm tham quan: ${formData.name || '...'}` : 'Thêm điểm tham quan mới'}
        subtitle={
          isEdit
            ? 'Cập nhật thông tin chi tiết, địa chỉ, mô tả và hình ảnh của điểm tham quan'
            : 'Đăng ký điểm tham quan du lịch mới vào cơ sở dữ liệu theo điểm đến'
        }
        breadcrumbs={[
          { label: 'Quản lý lưu trú' },
          { label: 'Điểm tham quan', link: `/admin/attractions${formData.location_id ? `?locationId=${formData.location_id}` : ''}` },
          { label: isEdit ? 'Chỉnh sửa' : 'Thêm mới' }
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link
              to={`/admin/attractions${formData.location_id ? `?locationId=${formData.location_id}` : ''}`}
              className="btn btn-secondary"
            >
              <ArrowLeft size={14} /> Quay lại
            </Link>
            <button
              type="button"
              className="btn btn-primary"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              <Save size={14} /> {isEdit ? 'Lưu thay đổi' : 'Tạo điểm tham quan'}
            </button>
          </div>
        }
      />

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
          {/* Main Info Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-card">
              <div className="admin-card-header">
                <div className="admin-card-title">Thông tin cơ bản điểm tham quan</div>
              </div>
              <div className="admin-card-body">
                <div className="form-grid">
                  <div style={{ gridColumn: 'span 2' }}>
                    <FormSelect
                      label="Điểm đến (Tỉnh / Thành phố / Khu du lịch)"
                      name="location_id"
                      value={formData.location_id}
                      onChange={handleChange}
                      options={[
                        { value: '', label: '-- Chọn điểm đến sở hữu điểm tham quan --' },
                        ...locationOptions
                      ]}
                      required
                      error={errors.location_id}
                      helperText="Điểm tham quan thuộc quản lý của điểm đến này. Các cơ sở lưu trú tại đây có thể liên kết sau đó."
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <FormInput
                      label="Tên điểm tham quan"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="VD: Chùa Linh Ứng Bãi Bụt, Đỉnh Bàn Cờ, Hồ Hoàn Kiếm..."
                      required
                      error={errors.name}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <FormInput
                      label="Địa chỉ chi tiết"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="VD: Bãi Bụt, Bán đảo Sơn Trà, TP. Đà Nẵng"
                      helperText="Địa chỉ thực tế hoặc hướng dẫn định vị điểm tham quan."
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <FormTextarea
                      label="Mô tả điểm tham quan"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={5}
                      placeholder="Giới thiệu nét đặc sắc, lịch sử, cảnh quan hoặc trải nghiệm nổi bật của điểm đến này..."
                      helperText="Mô tả sẽ hiển thị cho khách du lịch và giúp gợi ý các hành trình khám phá lân cận."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Linked Accommodations info if editing */}
            {isEdit && linkedAccommodations.length > 0 && (
              <div className="admin-card">
                <div className="admin-card-header">
                  <div className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building size={16} color="#287A4B" />
                    Cơ sở lưu trú đang liên kết ({linkedAccommodations.length})
                  </div>
                </div>
                <div className="admin-card-body">
                  <p style={{ fontSize: '13px', color: '#4B5563', marginBottom: '12px' }}>
                    Điểm tham quan này hiện đang được hiển thị trong mục "Điểm tham quan lân cận" của các cơ sở lưu trú sau:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                    {linkedAccommodations.map((acc) => (
                      <div
                        key={acc.id}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #E5E7EB',
                          borderRadius: '6px',
                          backgroundColor: '#F9FAFB'
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#1F2937' }}>
                          {acc.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                          Mã: {acc.code} · Loại: {acc.type}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Image & Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Status Card */}
            <div className="admin-card">
              <div className="admin-card-header">
                <div className="admin-card-title">Trạng thái vận hành</div>
              </div>
              <div className="admin-card-body">
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    style={{ width: '16px', height: '16px', accentColor: '#287A4B' }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#1F2937' }}>
                      Đang hoạt động (Hiển thị)
                    </span>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6B7280' }}>
                      Khi tắt, điểm tham quan sẽ bị ẩn khỏi danh sách gợi ý mới nhưng dữ liệu vẫn được bảo toàn.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Single Image Upload Card */}
            <div className="admin-card">
              <div className="admin-card-header">
                <div className="admin-card-title">Hình ảnh đại diện</div>
              </div>
              <div className="admin-card-body">
                {imagePreview ? (
                  <div style={{ position: 'relative', marginBottom: '14px' }}>
                    <div
                      style={{
                        width: '100%',
                        height: '180px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid #D9DDE2',
                        backgroundColor: '#F3F4F6'
                      }}
                    >
                      <img
                        src={imagePreview}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      title="Gỡ ảnh"
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        color: '#fff',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={15} />
                    </button>
                    <div style={{ fontSize: '11.5px', color: '#16A34A', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={12} /> Đã chọn ảnh
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #D1D5DB',
                      borderRadius: '6px',
                      padding: '24px 16px',
                      textAlign: 'center',
                      backgroundColor: '#F9FAFB',
                      cursor: 'pointer',
                      marginBottom: '14px'
                    }}
                  >
                    <UploadCloud size={32} color="#9CA3AF" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                      Tải lên hình ảnh
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '2px' }}>
                      PNG, JPG hoặc WEBP (Tối đa 5MB)
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon size={13} /> {imagePreview ? 'Thay đổi ảnh' : 'Chọn tệp ảnh'}
                  </button>
                </div>

                {/* Preset image suggestions */}
                <div style={{ marginTop: '16px', borderTop: '1px solid #E5E7EB', paddingTop: '12px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#6B7280', marginBottom: '8px' }}>
                    Hoặc chọn ảnh phong cảnh mẫu:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {[
                      { img: resortDanangImg, label: 'Đà Nẵng' },
                      { img: hotelHanoiImg, label: 'Hà Nội' },
                      { img: resortPhuquocImg, label: 'Phú Quốc' }
                    ].map((sample, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => handleSelectPresetImage(sample.img)}
                        style={{
                          border: imagePreview === sample.img ? '2px solid #287A4B' : '1px solid #D1D5DB',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          padding: 0,
                          cursor: 'pointer',
                          background: 'none'
                        }}
                      >
                        <img
                          src={sample.img}
                          alt={sample.label}
                          style={{ width: '100%', height: '42px', objectFit: 'cover', display: 'block' }}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {errors.image && (
                  <p className="form-error" style={{ marginTop: '6px' }}>
                    {errors.image}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Actions card */}
            <div className="admin-card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={isSubmitting}
                >
                  <Save size={14} /> {isEdit ? 'Lưu thay đổi' : 'Tạo điểm tham quan'}
                </button>
                <Link
                  to={`/admin/attractions${formData.location_id ? `?locationId=${formData.location_id}` : ''}`}
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Hủy bỏ
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
