import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import FormInput from '../../components/forms/FormInput.jsx';
import FormSelect from '../../components/forms/FormSelect.jsx';
import { Save } from 'lucide-react';

export default function GeneralSettingsPage() {
  const { generalSettings, setGeneralSettings, showToast } = useAdmin();

  const [formData, setFormData] = useState({ ...generalSettings });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setGeneralSettings(formData);
    showToast('Đã lưu cấu hình hệ thống chung thành công.');
  };

  return (
    <div>
      <PageHeader
        title="Cài đặt hệ thống chung"
        description="Cấu hình pháp nhân doanh nghiệp, tiền tệ hạch toán chính và múi giờ vận hành."
        actions={
          <button type="button" onClick={handleSubmit} className="btn btn-primary">
            <Save size={14} /> Lưu cài đặt
          </button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="admin-card" style={{ maxWidth: '780px' }}>
          <div className="admin-card-header">
            <div className="admin-card-title">Thông tin doanh nghiệp & Mặc định khu vực</div>
          </div>
          <div className="admin-card-body">
            <div className="form-grid">
              <FormInput
                label="Tên pháp nhân công ty"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                required
              />

              <FormInput
                label="Email tổng công ty"
                name="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={handleChange}
                required
              />

              <FormInput
                label="Hotline liên hệ trung tâm"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                required
              />

              <FormSelect
                label="Đơn vị tiền tệ chính"
                name="default_currency"
                value={formData.default_currency}
                onChange={handleChange}
                options={[
                  { value: 'VND (₫)', label: 'Việt Nam Đồng (VNĐ / ₫)' },
                  { value: 'USD ($)', label: 'Đô la Mỹ ($ / USD)' }
                ]}
              />

              <FormSelect
                label="Múi giờ vận hành hệ thống"
                name="time_zone"
                value={formData.time_zone}
                onChange={handleChange}
                options={[
                  { value: 'Asia/Ho_Chi_Minh (UTC+07:00)', label: 'Châu Á/Hồ Chí Minh (UTC+07:00)' },
                  { value: 'Asia/Bangkok (UTC+07:00)', label: 'Châu Á/Bangkok (UTC+07:00)' }
                ]}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
