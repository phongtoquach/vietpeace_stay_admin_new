import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Hotel, ArrowLeft, MailCheck } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext.jsx';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useAdmin();

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    showToast('Đã tạo liên kết khôi phục mật khẩu.');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-icon-box" style={{ width: '38px', height: '38px' }}>
            <Hotel size={22} strokeWidth={2.2} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#292D32' }}>
              VietPeace Stay
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280' }}>
              KHÔI PHỤC TÀI KHOẢN
            </div>
          </div>
        </div>

        <h1 className="auth-title">Khôi phục mật khẩu</h1>
        <p className="auth-subtitle">
          Nhập địa chỉ email công việc đã đăng ký để nhận liên kết thiết lập lại mật khẩu.
        </p>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#FFF5D6',
                border: '1px solid #F4C542',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: '#8C5A00'
              }}
            >
              <MailCheck size={24} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#292D32', marginBottom: '6px' }}>
              Đã gửi liên kết khôi phục
            </h3>
            <p style={{ fontSize: '12.5px', color: '#6B7280', marginBottom: '18px' }}>
              Mã xác thực bảo mật đã được gửi đến hòm thư <strong>{email}</strong>. Bạn có thể chuyển thẳng đến trang đặt lại mật khẩu để tiếp tục.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link to="/reset-password" className="btn btn-primary" style={{ width: '100%' }}>
                Tiếp tục đến trang đặt lại mật khẩu
              </Link>
              <Link to="/login" className="btn btn-secondary" style={{ width: '100%' }}>
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="forgot-email">
                Địa chỉ Email công việc <span className="required">*</span>
              </label>
              <input
                id="forgot-email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ten@vietpeacestay.vn"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: '36px', fontSize: '13.5px', marginTop: '6px' }}
            >
              Gửi liên kết khôi phục
            </button>

            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  color: '#6B7280',
                  fontWeight: 500
                }}
              >
                <ArrowLeft size={14} /> Quay lại đăng nhập
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
