import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import FormInput from '../../components/forms/FormInput.jsx';
import FormTextarea from '../../components/forms/FormTextarea.jsx';
import ImageUpload from '../../components/forms/ImageUpload.jsx';
import { Save } from 'lucide-react';

export default function WebsiteSettingsPage() {
  const { websiteSettings, setWebsiteSettings, showToast } = useAdmin();

  const [formData, setFormData] = useState({ ...websiteSettings });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setWebsiteSettings(formData);
    showToast('Đã cập nhật cấu hình hiển thị website thành công.');
  };

  return (
    <div>
      <PageHeader
        title="Cấu hình hiển thị website"
        description="Thương hiệu cổng thông tin khách hàng trực tuyến, logo nhận diện, địa chỉ liên hệ và bản quyền chân trang."
        actions={
          <button type="button" onClick={handleSubmit} className="btn btn-primary">
            <Save size={14} /> Lưu cấu hình
          </button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="admin-card" style={{ maxWidth: '780px' }}>
          <div className="admin-card-header">
            <div className="admin-card-title">Hiển thị thương hiệu & Chân trang liên hệ</div>
          </div>
          <div className="admin-card-body">
            <div className="form-grid">
              <div className="col-span-full">
                <FormInput
                  label="Tiêu đề website hiển thị"
                  name="website_name"
                  value={formData.website_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="col-span-full">
                <ImageUpload
                  label="Tải lên Logo thương hiệu (PNG hoặc SVG)"
                  images={formData.logo_url ? [formData.logo_url] : []}
                  onChange={(imgs) => setFormData((prev) => ({ ...prev, logo_url: imgs[0] || '' }))}
                  multiple={false}
                  helperText="Khuyến nghị định dạng PNG nền trong suốt (tối thiểu 200x60px)."
                />
              </div>

              <div className="col-span-full">
                <FormTextarea
                  label="Thông tin liên hệ & Địa chỉ công khai"
                  name="contact_info"
                  value={formData.contact_info}
                  onChange={handleChange}
                  rows={2}
                />
              </div>

              <div className="col-span-full">
                <FormInput
                  label="Thông tin bản quyền chân trang (Footer)"
                  name="footer_text"
                  value={formData.footer_text}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
