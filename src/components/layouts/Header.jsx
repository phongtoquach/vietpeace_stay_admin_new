import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import AuthContext from '../../context/AuthContext';
import { useAdmin } from '../../context/AdminContext.jsx';

import Breadcrumb from '../common/Breadcrumb.jsx';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User,
  KeyRound,
  LogOut,
  Building2,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
} from 'lucide-react';

export default function Header({ breadcrumbItems = [] }) {
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    showToast,
  } = useAdmin();

  const { currentLoggedInUser, logout } = useContext(AuthContext);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Hồ sơ cá nhân & Đổi mật khẩu chủ động
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    navigate(`/admin/accommodations?search=${encodeURIComponent(searchTerm)}`);
  };

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsSidebarOpen(!isSidebarOpen);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleOpenPasswordModal = () => {
    setDropdownOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordError('');
    setPasswordModalOpen(true);
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setPasswordLoading(true);
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

      setPasswordModalOpen(false);
      showToast('Đã cập nhật mật khẩu tài khoản thành công!');
    } catch (err) {
      setPasswordError(err.message || 'Lỗi khi đổi mật khẩu.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const displayName =
    currentLoggedInUser?.fullName ||
    currentLoggedInUser?.displayName ||
    'Quản trị viên';

  const isAdmin = currentLoggedInUser?.role === 'ADMIN';

  return (
    <>
      <header className="top-header">
        <div className="header-left">
          <button
            type="button"
            className="header-toggle-btn"
            onClick={toggleSidebar}
            aria-label="Thu gọn hoặc mở rộng thanh điều hướng"
            title="Thanh điều hướng"
          >
            <Menu size={16} />
          </button>

          <Breadcrumb items={breadcrumbItems} />
        </div>

        <div className="header-right">
          {/* Quick Search */}
          <form onSubmit={handleSearchSubmit} className="header-search">
            <Search size={14} className="header-search-icon" />
            <input
              type="search"
              placeholder="Tìm cơ sở lưu trú, đặt phòng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>

          {/* Notifications */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button
              type="button"
              className="header-notification-btn"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="Thông báo hệ thống"
              title="Thông báo hệ thống"
            >
              <Bell size={16} />
              <span className="notification-badge" />
            </button>

            {notificationsOpen && (
              <div
                className="header-user-dropdown"
                style={{ width: '290px', right: 0 }}
              >
                <div
                  style={{
                    padding: '8px 14px',
                    fontWeight: 600,
                    fontSize: '12.5px',
                    borderBottom: '1px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>Thông báo hệ thống</span>
                  <span className="badge badge-warning">2 Chưa đọc</span>
                </div>
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  <div
                    style={{
                      padding: '8px 14px',
                      borderBottom: '1px solid #F3F4F6',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#292D32' }}>
                      Đơn đặt phòng mới chờ xử lý
                    </div>
                    <div style={{ color: '#6B7280', marginTop: '2px' }}>
                      Khách hàng Lê Hoàng Long vừa đặt Biệt thự có hồ bơi (Phú Quốc).
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#9CA3AF', marginTop: '3px' }}>
                      30 phút trước
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '8px 14px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#292D32' }}>
                      Nhận phòng thành công
                    </div>
                    <div style={{ color: '#6B7280', marginTop: '2px' }}>
                      Trần Thị Mai đã nhận phòng 302 (Hanoi Heritage).
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#9CA3AF', marginTop: '3px' }}>
                      2 giờ trước
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="header-user-menu" ref={dropdownRef}>
            <button
              type="button"
              className="header-user-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-expanded={dropdownOpen}
              aria-label="Menu tài khoản"
            >
              {currentLoggedInUser?.avatarUrl ? (
                <img
                  src={currentLoggedInUser.avatarUrl}
                  alt={displayName}
                  className="header-user-avatar"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="header-user-avatar">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="header-user-name">{displayName}</span>
              <ChevronDown size={14} color="#6B7280" />
            </button>

            {dropdownOpen && (
              <div className="header-user-dropdown" style={{ minWidth: '250px' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#111827' }}>
                    {displayName}
                  </div>
                  {currentLoggedInUser?.email && (
                    <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '2px', wordBreak: 'break-all' }}>
                      {currentLoggedInUser.email}
                    </div>
                  )}
                  <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: isAdmin ? '#FEF3C7' : '#E0F2FE',
                        color: isAdmin ? '#92400E' : '#0369A1',
                        border: isAdmin ? '1px solid #FDE68A' : '1px solid #BAE6FD',
                      }}
                    >
                      <ShieldCheck size={11} />
                      {isAdmin ? 'Quản trị viên cấp cao' : 'Quản lý cơ sở'}
                    </span>
                  </div>
                  {currentLoggedInUser?.accommodationName && (
                    <div
                      style={{
                        marginTop: '6px',
                        fontSize: '11.5px',
                        color: '#78350F',
                        backgroundColor: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontWeight: 600,
                      }}
                    >
                      <Building2 size={12} style={{ flexShrink: 0, color: '#D97706' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentLoggedInUser.accommodationName}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="header-user-dropdown-item"
                  onClick={() => {
                    setDropdownOpen(false);
                    setProfileModalOpen(true);
                  }}
                >
                  <User size={14} color="#6B7280" />
                  <span>Hồ sơ cá nhân</span>
                </button>

                <button
                  type="button"
                  className="header-user-dropdown-item"
                  onClick={handleOpenPasswordModal}
                >
                  <KeyRound size={14} color="#6B7280" />
                  <span>Đổi mật khẩu</span>
                </button>

                <div className="header-user-dropdown-divider" />

                <button
                  type="button"
                  className="header-user-dropdown-item"
                  style={{ color: '#C0392B' }}
                  onClick={handleLogout}
                >
                  <LogOut size={14} color="#C0392B" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MODAL: HỒ SƠ CÁ NHÂN */}
      {profileModalOpen && (
        <div className="modal-overlay" onClick={() => setProfileModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '460px', borderRadius: '10px', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #78350F 0%, #B45309 50%, #D97706 100%)',
                color: '#ffffff',
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={20} color="#FEF3C7" />
                <span style={{ fontSize: '16px', fontWeight: 700 }}>Hồ sơ tài khoản cá nhân</span>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FEF3C7',
                  cursor: 'pointer',
                  display: 'flex',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: '#FFF5D6',
                    border: '2px solid #F4C542',
                    color: '#78350F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '16px', color: '#111827', fontWeight: 700 }}>
                    {displayName}
                  </h4>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      backgroundColor: isAdmin ? '#FEF3C7' : '#E0F2FE',
                      color: isAdmin ? '#92400E' : '#0369A1',
                    }}
                  >
                    <ShieldCheck size={12} />
                    {isAdmin ? 'Quản trị viên cấp cao (ADMIN)' : 'Quản lý cơ sở (ACCOMMODATION_MANAGER)'}
                  </span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  fontSize: '13px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '12px' }}>
                    Tài khoản đăng nhập nội bộ:
                  </span>
                  <strong style={{ color: '#0F172A', fontFamily: 'monospace', fontSize: '13.5px' }}>
                    {currentLoggedInUser?.email || '—'}
                  </strong>
                </div>

                {currentLoggedInUser?.personalEmail && (
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '12px' }}>
                      Gmail cá nhân (Nhận thông báo):
                    </span>
                    <strong style={{ color: '#0284C7' }}>{currentLoggedInUser.personalEmail}</strong>
                  </div>
                )}

                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '12px' }}>
                    Phạm vi quản lý:
                  </span>
                  <strong style={{ color: '#78350F' }}>
                    {isAdmin
                      ? 'Toàn bộ hệ thống VietPeace Stay'
                      : currentLoggedInUser?.accommodationName || 'Cơ sở lưu trú được chỉ định'}
                  </strong>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setProfileModalOpen(false);
                  handleOpenPasswordModal();
                }}
              >
                <KeyRound size={14} /> Đổi mật khẩu
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {isAdmin && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setProfileModalOpen(false);
                      navigate('/admin/users');
                    }}
                  >
                    Quản lý người dùng
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setProfileModalOpen(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ĐỔI MẬT KHẨU TÀI KHOẢN */}
      {passwordModalOpen && (
        <div className="modal-overlay" onClick={() => !passwordLoading && setPasswordModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '440px', borderRadius: '10px', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #78350F 0%, #B45309 50%, #D97706 100%)',
                color: '#ffffff',
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <KeyRound size={20} color="#FEF3C7" />
                <span style={{ fontSize: '16px', fontWeight: 700 }}>Đổi mật khẩu tài khoản</span>
              </div>
              <button
                type="button"
                onClick={() => !passwordLoading && setPasswordModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FEF3C7',
                  cursor: 'pointer',
                  display: 'flex',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePasswordChangeSubmit}>
              <div className="modal-body" style={{ padding: '20px' }}>
                {passwordError && (
                  <div
                    style={{
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      marginBottom: '14px',
                      color: '#B91C1C',
                      fontSize: '13px',
                    }}
                  >
                    {passwordError}
                  </div>
                )}

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Mật khẩu mới (tối thiểu 8 ký tự):
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={15}
                      color="#94A3B8"
                      style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Nhập mật khẩu mới..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="filter-input"
                      style={{ width: '100%', height: '38px', paddingLeft: '34px', paddingRight: '36px', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#64748B',
                        cursor: 'pointer',
                        display: 'flex',
                        padding: '4px',
                      }}
                      title={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '6px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Xác nhận lại mật khẩu mới:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={15}
                      color="#94A3B8"
                      style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Nhập lại mật khẩu mới..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="filter-input"
                      style={{ width: '100%', height: '38px', paddingLeft: '34px', paddingRight: '36px', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#64748B',
                        cursor: 'pointer',
                        display: 'flex',
                        padding: '4px',
                      }}
                      title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '12px 20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPasswordModalOpen(false)}
                  disabled={passwordLoading}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
                  {passwordLoading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
