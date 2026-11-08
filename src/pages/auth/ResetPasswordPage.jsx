import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Hotel, CheckCircle } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext.jsx';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const { showToast } = useAdmin();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải chứa ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }
    setError('');
    setCompleted(true);
    showToast('Mật khẩu tài khoản quản trị đã được cập nhật thành công.');
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
              BẢO MẬT TÀI KHOẢN
            </div>
          </div>
        </div>

        <h1 className="auth-title">Thiết lập mật khẩu mới</h1>
        <p className="auth-subtitle">
          Vui lòng thiết lập mật khẩu mạnh bao gồm chữ và số cho tài khoản quản trị của bạn.
        </p>

        {completed ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#EAF5EE',
                border: '1px solid #BAE2C8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: '#287A4B'
              }}
            >
              <CheckCircle size={24} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#292D32', marginBottom: '6px' }}>
              Đổi mật khẩu thành công
            </h3>
            <p style={{ fontSize: '12.5px', color: '#6B7280', marginBottom: '18px' }}>
              Thông tin xác thực của bạn đã được cập nhật. Bạn có thể đăng nhập vào cổng quản trị VietPeace Stay.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
              Đăng nhập ngay
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {error && (
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#FDF2F2',
                  border: '1px solid #F8B4B4',
                  borderRadius: '4px',
                  fontSize: '12.5px',
                  color: '#C0392B'
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="new-password">
                Mật khẩu mới <span className="required">*</span>
              </label>
              <input
                id="new-password"
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirm-password">
                Xác nhận mật khẩu mới <span className="required">*</span>
              </label>
              <input
                id="confirm-password"
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: '36px', fontSize: '13.5px', marginTop: '6px' }}
            >
              Cập nhật mật khẩu
            </button>

            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <Link to="/login" style={{ fontSize: '12.5px', color: '#6B7280', fontWeight: 500 }}>
                Hủy và quay lại Đăng nhập
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
