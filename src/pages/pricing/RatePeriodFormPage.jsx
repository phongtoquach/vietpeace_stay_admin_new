import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import FormInput from '../../components/forms/FormInput.jsx';
import FormSelect from '../../components/forms/FormSelect.jsx';
import FormTextarea from '../../components/forms/FormTextarea.jsx';
import { formatDateVN } from '../../data/mockData.js';
import {
  Save,
  ArrowLeft,
  Calendar,
  AlertCircle,
  Info
} from 'lucide-react';

export default function RatePeriodFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { ratePeriods, addRatePeriod, updateRatePeriod } = useAdmin();

  // Initial State (No accommodation dependency)
  const [formData, setFormData] = useState({
    name: '',
    start_date: '2027-04-29',
    end_date: '2027-05-04',
    description: '',
    status: 'ACTIVE'
  });

  const [errors, setErrors] = useState({});
  const [isNotFound, setIsNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing record for Edit mode
  useEffect(() => {
    if (isEdit) {
      const existing = ratePeriods.find((p) => String(p.id) === String(id));
      if (existing) {
        setFormData({
          name: existing.name || '',
          start_date: existing.start_date || '',
          end_date: existing.end_date || '',
          description: existing.description || '',
          status: existing.status || 'ACTIVE'
        });
        setIsNotFound(false);
      } else {
        setIsNotFound(true);
      }
    }
  }, [id, isEdit, ratePeriods]);

  // Calculate duration in days
  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập tên kỳ giá đặc biệt.';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'Vui lòng chọn ngày bắt đầu.';
    }
    if (!formData.end_date) {
      newErrors.end_date = 'Vui lòng chọn ngày kết thúc.';
    }
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end <= start) {
        newErrors.end_date = 'Ngày kết thúc phải lớn hơn ngày bắt đầu.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const payload = {
      name: formData.name.trim(),
      start_date: formData.start_date,
      end_date: formData.end_date,
      description: formData.description.trim(),
      status: formData.status
    };

    let success = false;
    if (isEdit) {
      success = updateRatePeriod(id, payload);
    } else {
      const created = addRatePeriod(payload);
      success = Boolean(created);
    }

    setIsSubmitting(false);

    if (success) {
      navigate('/admin/rate-periods');
    }
  };

  // If record not found in Edit mode
  if (isEdit && isNotFound) {
    return (
      <div>
        <PageHeader
          title="Không tìm thấy kỳ giá"
          breadcrumb={[
            { label: 'Giá & Phòng trống', path: '/admin/room-rates' },
            { label: 'Kỳ giá đặc biệt', path: '/admin/rate-periods' },
            { label: 'Lỗi' }
          ]}
        />
        <div
          className="card"
          style={{
            padding: '36px 24px',
            textAlign: 'center',
            backgroundColor: '#FEF2F2',
            borderColor: '#FCA5A5'
          }}
        >
          <AlertCircle size={40} color="#DC2626" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#991B1B', marginBottom: '6px' }}>
            Không tìm thấy kỳ giá đặc biệt
          </h3>
          <p style={{ fontSize: '13px', color: '#B91C1C', marginBottom: '20px' }}>
            Kỳ giá đặc biệt với mã #{id} không tồn tại hoặc đã bị xóa khỏi hệ thống.
          </p>
          <Link to="/admin/rate-periods" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={15} />
            <span>Quay lại danh sách kỳ giá</span>
          </Link>
        </div>
      </div>
    );
  }

  const durationDays = calculateDays(formData.start_date, formData.end_date);

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Chỉnh sửa kỳ giá đặc biệt' : 'Thêm kỳ giá đặc biệt'}
        description={
          isEdit
            ? 'Cập nhật khoảng thời gian áp dụng, tên gọi và ghi chú chi tiết cho kỳ giá đặc biệt.'
            : 'Tạo mới một kỳ giá đặc biệt độc lập (mùa cao điểm, dịp lễ Tết, sự kiện) có thể tái sử dụng cho nhiều cơ sở lưu trú.'
        }
        breadcrumb={[
          { label: 'Giá & Phòng trống', path: '/admin/room-rates' },
          { label: 'Kỳ giá đặc biệt', path: '/admin/rate-periods' },
          { label: isEdit ? 'Chỉnh sửa' : 'Thêm mới' }
        ]}
        actions={
          <Link to="/admin/rate-periods" className="btn btn-secondary">
            <ArrowLeft size={15} /> <span>Quay lại</span>
          </Link>
        }
      />

      {/* Explanatory Info Card */}
      <div
        className="card"
        style={{
          marginBottom: '18px',
          backgroundColor: '#FFFDF5',
          borderColor: '#F7E396',
          padding: '12px 18px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <Info size={16} color="#8C5A00" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div style={{ fontSize: '12.5px', color: '#4B3800', lineHeight: 1.5 }}>
            <strong>Lưu ý:</strong> Kỳ giá đặc biệt được quản lý hoàn toàn độc lập với các cơ sở lưu trú. Sau khi tạo kỳ giá, bạn có thể thiết lập mức giá cụ thể cho từng loại phòng của các cơ sở lưu trú tại trang <strong>Cấu hình giá kỳ đặc biệt</strong>.
          </div>
        </div>
      </div>

      {/* Main Form Panel */}
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 28px' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Tên kỳ giá */}
            <FormInput
              label="Tên kỳ giá đặc biệt:"
              name="name"
              id="rate-period-name"
              required
              placeholder="VD: Dịp lễ 30/4 - 1/5 năm 2027, Mùa hè cao điểm, Tết Nguyên Đán..."
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
            />

            {/* Ngày bắt đầu và Ngày kết thúc */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <FormInput
                label="Ngày bắt đầu (start_date):"
                name="start_date"
                id="rate-period-start-date"
                type="date"
                required
                value={formData.start_date}
                onChange={handleChange}
                error={errors.start_date}
              />

              <FormInput
                label="Ngày kết thúc (end_date):"
                name="end_date"
                id="rate-period-end-date"
                type="date"
                required
                value={formData.end_date}
                onChange={handleChange}
                error={errors.end_date}
              />
            </div>

            {/* Duration preview box */}
            {formData.start_date && formData.end_date && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Calendar size={15} color="#0284C7" />
                <span>
                  Thời lượng dự kiến:{' '}
                  <strong style={{ color: '#0F172A' }}>{durationDays} ngày</strong>{' '}
                  (từ <strong>{formatDateVN(formData.start_date)}</strong> đến <strong>{formatDateVN(formData.end_date)}</strong>)
                </span>
              </div>
            )}

            {/* Mô tả / Ghi chú */}
            <FormTextarea
              label="Mô tả / Ghi chú chi tiết:"
              name="description"
              id="rate-period-description"
              placeholder="Nhập thông tin chi tiết về kỳ nghỉ lễ, đối tượng khách mục tiêu hoặc quy định đặt phòng..."
              value={formData.description}
              onChange={handleChange}
              rows={4}
            />

            {/* Trạng thái hoạt động */}
            <FormSelect
              label="Trạng thái hoạt động:"
              name="status"
              id="rate-period-status"
              value={formData.status}
              onChange={handleChange}
              placeholder={false}
              options={[
                { value: 'ACTIVE', label: 'Đang hoạt động (ACTIVE)' },
                { value: 'INACTIVE', label: 'Ngừng hoạt động (INACTIVE)' }
              ]}
              helperText="Kỳ giá ở trạng thái ngừng hoạt động sẽ không hiển thị trên giao diện đặt phòng công khai."
            />
          </div>

          {/* Form Actions Footer */}
          <div
            style={{
              marginTop: '28px',
              paddingTop: '20px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px'
            }}
          >
            <Link to="/admin/rate-periods" className="btn btn-secondary" style={{ padding: '8px 18px' }}>
              Hủy
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ padding: '8px 22px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={15} />
              <span>{isEdit ? 'Lưu thay đổi' : 'Lưu kỳ giá'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
