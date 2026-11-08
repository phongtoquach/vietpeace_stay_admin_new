import React, { useState, useEffect, useMemo, useRef } from 'react';
import FormInput from '../../components/forms/FormInput.jsx';
import FormSelect from '../../components/forms/FormSelect.jsx';
import FormTextarea from '../../components/forms/FormTextarea.jsx';
import { X, Save, UploadCloud, Image as ImageIcon, Check } from 'lucide-react';

// Hàm phụ tạo slug tiếng Việt tự động
const generateSlug = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
};

export default function LocationFormModal({
  isOpen,
  locationToEdit,
  parentLocationIdForChild,
  locations = [],
  onSave,
  onClose
}) {
  const isEdit = Boolean(locationToEdit);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    parent_location_id: '',
    description: '',
    status: 'Active',
    image: ''
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');

  // Ngăn chặn chọn chính nó hoặc con cháu làm cha để tránh vòng lặp phân cấp
  const descendantIds = useMemo(() => {
    if (!locationToEdit) return new Set();
    const set = new Set([locationToEdit.id]);
    let added = true;
    while (added) {
      added = false;
      locations.forEach((loc) => {
        if (loc.parent_location_id && set.has(loc.parent_location_id) && !set.has(loc.id)) {
          set.add(loc.id);
          added = true;
        }
      });
    }
    return set;
  }, [locationToEdit, locations]);

  // Danh sách Tỉnh / Thành phố gốc (chỉ lấy các điểm đến cấp 1 không có parent_location_id)
  const rootProvinceOptions = useMemo(() => {
    return locations
      .filter((l) => !l.parent_location_id && !descendantIds.has(l.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'))
      .map((p) => ({
        value: p.id,
        label: p.name || 'Không có tên'
      }));
  }, [locations, descendantIds]);

  // Tên tỉnh/thành phố cha đã chọn
  const selectedProvinceName = useMemo(() => {
    if (!formData.parent_location_id) return '';
    const found = locations.find((l) => Number(l.id) === Number(formData.parent_location_id));
    return found ? found.name : '';
  }, [formData.parent_location_id, locations]);

  // Khởi tạo & đồng bộ form khi mở modal
  useEffect(() => {
    if (!isOpen) return;

    if (locationToEdit) {
      const existingImg = locationToEdit.image_url || locationToEdit.image || '';
      const fullImgUrl = existingImg
        ? (existingImg.startsWith('http') || existingImg.startsWith('data:')
            ? existingImg
            : `http://localhost:3002${existingImg}`)
        : null;

      setImagePreview(fullImgUrl);
      setFormData({
        name: locationToEdit.name || '',
        code: locationToEdit.code || locationToEdit.slug || '',
        parent_location_id: locationToEdit.parent_location_id ?? '',
        description: locationToEdit.description || locationToEdit.short_description || '',
        status: locationToEdit.status || (locationToEdit.is_active ? 'Active' : 'Inactive'),
        image: existingImg
      });
    } else if (parentLocationIdForChild) {
      // Khi nhấn nút "+ Thêm cấp con" từ một dòng trên bảng
      setImagePreview(null);
      const parentObj = locations.find((l) => l.id === Number(parentLocationIdForChild));
      // Nếu dòng được click là cấp con thì lấy tỉnh cha của nó, ngược lại lấy chính nó
      const targetParentId = parentObj && parentObj.parent_location_id ? parentObj.parent_location_id : parentLocationIdForChild;

      setFormData({
        name: '',
        code: '',
        parent_location_id: targetParentId,
        description: '',
        status: 'Active',
        image: ''
      });
    } else {
      // Thêm mới hoàn toàn từ nút "+ Thêm điểm đến"
      setImagePreview(null);
      setFormData({
        name: '',
        code: '',
        parent_location_id: '',
        description: '',
        status: 'Active',
        image: ''
      });
    }

    setError('');
  }, [locationToEdit, parentLocationIdForChild, isOpen, locations]);

  // Xử lý khi chọn file ảnh từ máy tính
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Kích thước ảnh tối đa là 5MB.');
        return;
      }
      setError('');
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

  const handleNameChange = (val) => {
    setFormData((prev) => {
      const autoCode = !isEdit && (!prev.code || prev.code === generateSlug(prev.name))
        ? generateSlug(val)
        : prev.code;
      return {
        ...prev,
        name: val,
        code: autoCode
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên điểm đến.');
      return;
    }
    if (!formData.code.trim()) {
      setError('Vui lòng nhập mã định danh điểm đến.');
      return;
    }

    setError('');

    const parentId = formData.parent_location_id ? Number(formData.parent_location_id) : null;
    let provId = null;
    if (parentId) {
      const parentObj = locations.find((l) => l.id === parentId);
      provId = parentObj?.province_id || parentObj?.id;
    }

    const payload = {
      ...formData,
      parent_location_id: parentId,
      province_id: provId
    };

    onSave(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <span className="modal-title">
            {isEdit ? `Chỉnh sửa điểm đến: ${locationToEdit.name}` : 'Thêm điểm đến phân cấp mới'}
          </span>
          <button className="modal-close" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#FDF2F2',
                  border: '1px solid #F8B4B4',
                  borderRadius: '4px',
                  fontSize: '12.5px',
                  color: '#C0392B',
                  marginBottom: '14px'
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <FormInput
                label="Tên điểm đến"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ví dụ: Bán đảo Sơn Trà, Châu Đốc, Tri Tôn..."
                required
              />

              <FormInput
                label="Mã định danh điểm đến (Slug / Code)"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ví dụ: DAD-ST hoặc da-nang"
                required
              />

              {/* Ô chọn duy nhất: Điểm đến cha (Cấp tỉnh / thành phố) */}
              <FormSelect
                label="Điểm đến cha (Cấp tỉnh / thành phố)"
                value={formData.parent_location_id}
                onChange={(e) => setFormData({ ...formData, parent_location_id: e.target.value })}
                placeholder="-- Không có (Điểm đến gốc / Cấp tỉnh, thành phố) --"
                options={rootProvinceOptions}
                helperText={
                  !formData.parent_location_id
                    ? "Nếu không chọn, điểm đến vừa nhập ở trên mặc định sẽ là Điểm đến gốc (Cấp Tỉnh / Thành phố)."
                    : `Điểm đến vừa nhập ở trên sẽ là cấp con trực thuộc ${selectedProvinceName}.`
                }
              />

              <FormSelect
                label="Trạng thái"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: 'Active', label: 'Đang hoạt động' },
                  { value: 'Inactive', label: 'Ngừng hoạt động' }
                ]}
              />

              <FormTextarea
                label="Mô tả & Điểm nổi bật du lịch"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Cảnh quan thiên nhiên, bãi biển, địa hình núi hoặc thông tin địa phương..."
              />

              {/* Mục Upload hình ảnh điểm đến */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <ImageIcon size={15} color="#4B5563" /> Hình ảnh điểm đến
                  </span>
                  {imagePreview && (
                    <span style={{ fontSize: '11.5px', color: '#16A34A', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Check size={13} /> Đã có ảnh
                    </span>
                  )}
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  style={{ display: 'none' }}
                />

                {imagePreview ? (
                  <div
                    style={{
                      position: 'relative',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#F9FAFB'
                    }}
                  >
                    <img
                      src={imagePreview}
                      alt="Ảnh điểm đến"
                      style={{
                        width: '100%',
                        height: '160px',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.opacity = '0.3';
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: '#FFFFFF',
                        borderTop: '1px solid #E5E7EB'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '12px', height: '28px', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <UploadCloud size={13} /> Thay đổi ảnh
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="btn btn-sm"
                        style={{
                          fontSize: '12px',
                          height: '28px',
                          padding: '0 10px',
                          color: '#DC2626',
                          backgroundColor: '#FEF2F2',
                          border: '1px solid #FCA5A5',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <X size={13} /> Gỡ ảnh
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #D1D5DB',
                      borderRadius: '8px',
                      padding: '22px 14px',
                      textAlign: 'center',
                      backgroundColor: '#FAFAFA',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#F4C542';
                      e.currentTarget.style.backgroundColor = '#FEFBE8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.backgroundColor = '#FAFAFA';
                    }}
                  >
                    <UploadCloud size={28} color="#9CA3AF" style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                      Nhấn để tải lên ảnh điểm đến
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '2px' }}>
                      PNG, JPG hoặc WEBP (Tối đa 5MB)
                    </div>
                  </div>
                )}
                <span className="form-helper-text" style={{ marginTop: '4px', display: 'block' }}>
                  Ảnh đại diện được lưu vào thư mục hệ thống và liên kết với cơ sở dữ liệu.
                </span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={14} /> {isEdit ? 'Lưu thay đổi' : 'Tạo điểm đến'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
