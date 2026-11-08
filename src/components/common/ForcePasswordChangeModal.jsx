import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { KeyRound, ShieldAlert, CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react';

export default function ForcePasswordChangeModal() {
  const { currentLoggedInUser, setCurrentLoggedInUser, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!currentLoggedInUser?.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3002/api/admin/auth/change-initial-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không thể đổi mật khẩu lúc này.');
      }

      setSuccess(true);
      setTimeout(() => {
        // Cập nhật state currentLoggedInUser để đóng modal
        setCurrentLoggedInUser((prev) => ({
          ...prev,
          mustChangePassword: false,
        }));
      }, 1500);
    } catch (err) {
      setError(err.message || 'Đã có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header - Dải màu nhận diện thương hiệu VietPeace Stay */}
        <div
          style={{
            background: 'linear-gradient(135deg, #78350F 0%, #B45309 50%, #D97706 100%)',
            color: '#ffffff',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <KeyRound size={22} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.2px' }}>
              Đổi mật khẩu lần đầu
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#FEF3C7', opacity: 0.95 }}>
              Bắt buộc kích hoạt tài khoản quản trị VietPeace Stay
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {success ? (
            /* Thông báo đổi mật khẩu thành công - Chuẩn thương hiệu */
            <div
              style={{
                textAlign: 'center',
                padding: '20px 8px',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#EAF5EE',
                  border: '2px solid #A7F3D0',
                  color: '#287A4B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle2 size={36} color="#287A4B" />
              </div>
              <h4 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#1E293B' }}>
                Đổi mật khẩu thành công!
              </h4>
              <p style={{ margin: '0 0 18px', fontSize: '13.5px', color: '#64748B', lineHeight: 1.5 }}>
                Mật khẩu mới đã được kích hoạt an toàn.<br />Hệ thống đang chuyển bạn vào bảng điều khiển quản trị...
              </p>
              <div
                style={{
                  width: '120px',
                  height: '4px',
                  backgroundColor: '#FFF5D6',
                  borderRadius: '2px',
                  margin: '0 auto',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#F4C542',
                    borderRadius: '2px',
                  }}
                />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '20px',
                }}
              >
                <ShieldAlert size={18} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0, fontSize: '13px', color: '#92400e', lineHeight: 1.5 }}>
                  Bạn đang đăng nhập bằng <strong>mật khẩu tạm thời</strong>. Để bảo vệ dữ liệu cơ sở lưu trú, bạn bắt buộc phải thiết lập mật khẩu mới trước khi tiếp tục.
                </p>
              </div>

              {error && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    marginBottom: '16px',
                    color: '#b91c1c',
                    fontSize: '13px',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Ô Mật khẩu mới với icon mắt ẩn/hiện */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    color: '#374151',
                  }}
                >
                  Mật khẩu mới (tối thiểu 8 ký tự): <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    className="form-control"
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 38px',
                      fontSize: '14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  <Lock
                    size={16}
                    color="#9ca3af"
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#6B7280',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={showNewPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                    aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Ô Xác nhận mật khẩu mới với icon mắt ẩn/hiện */}
              <div style={{ marginBottom: '22px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    color: '#374151',
                  }}
                >
                  Xác nhận lại mật khẩu mới: <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới..."
                    className="form-control"
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 38px',
                      fontSize: '14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  <Lock
                    size={16}
                    color="#9ca3af"
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#6B7280',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                    aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Nút bấm chuẩn nhận diện thương hiệu VietPeace Stay */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={logout}
                  className="btn btn-secondary"
                  style={{ fontSize: '13px', padding: '9px 18px' }}
                >
                  Đăng xuất
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    fontSize: '13.5px',
                    padding: '9px 22px',
                    backgroundColor: '#F4C542',
                    borderColor: '#D6A82C',
                    color: '#24220A',
                    fontWeight: 600,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  {loading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
