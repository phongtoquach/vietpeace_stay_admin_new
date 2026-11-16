import { useState, useRef, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import AuthContext from '../../context/AuthContext';
import { useAdmin } from '../../context/AdminContext.jsx';
import { useAdminChat } from '../../chat/ChatContext.jsx';
import { formatCountdown } from '../../chat/chatUtils.js';

import Breadcrumb from '../common/Breadcrumb.jsx';
import {
  Menu,
  Bell,
  ChevronDown,
  User,
  KeyRound,
  LogOut,
  Building2,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
} from 'lucide-react';

const ADMIN_API_BASE_URL =
  import.meta.env.VITE_ADMIN_API_BASE_URL || 'http://localhost:3002/api/admin';
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export default function Header({ breadcrumbItems = [] }) {
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    showToast,
  } = useAdmin();

  const { currentLoggedInUser, setCurrentLoggedInUser, logout } = useContext(AuthContext);
  const {
    isAdmin: isChatAdmin,
    isManager,
    waitingCount,
    waitingConversations,
    internalUnread,
    reportsBadge,
    reportsSummary,
    pendingHandoffAlerts,
  } = useAdminChat();
  const isAdmin = currentLoggedInUser?.role === 'ADMIN' || isChatAdmin;
  const totalNotifs = waitingCount + internalUnread + (isAdmin ? reportsBadge : 0);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Modal Hồ sơ cá nhân & Đổi mật khẩu chủ động
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phoneNumber: '',
    personalEmail: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const onCustomerChatPage = location.pathname === '/admin/chat';

  useEffect(() => {
    if (!notificationsOpen || waitingCount === 0) return undefined;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [notificationsOpen, waitingCount]);

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

  const handleOpenProfileModal = () => {
    setDropdownOpen(false);
    setProfileForm({
      fullName: currentLoggedInUser?.fullName || '',
      phoneNumber: currentLoggedInUser?.phoneNumber || '',
      personalEmail: currentLoggedInUser?.personalEmail || '',
    });
    setProfileError('');
    setProfileModalOpen(true);
  };

  const handleProfileSaveSubmit = async (e) => {
    e.preventDefault();
    if (profileLoading) return;
    setProfileError('');

    const trimmedName = profileForm.fullName.trim();
    const trimmedPhone = profileForm.phoneNumber.trim();
    const trimmedPersonalEmail = profileForm.personalEmail.trim().toLowerCase();

    if (!trimmedName) {
      setProfileError('Vui lòng nhập họ và tên.');
      return;
    }
    if (!isAdmin && !trimmedPersonalEmail) {
      setProfileError('Tài khoản Quản lý cơ sở bắt buộc phải có email cá nhân.');
      return;
    }
    if (trimmedPersonalEmail && !EMAIL_REGEX.test(trimmedPersonalEmail)) {
      setProfileError('Email cá nhân không đúng định dạng.');
      return;
    }

    setProfileLoading(true);
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: trimmedName,
          phoneNumber: trimmedPhone,
          personalEmail: trimmedPersonalEmail,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        const errDetail =
          result?.errors?.personalEmail ||
          result?.errors?.phoneNumber ||
          result?.errors?.fullName ||
          result?.message ||
          'Không thể cập nhật hồ sơ cá nhân lúc này.';
        throw new Error(errDetail);
      }

      if (result?.data?.userInfo && typeof setCurrentLoggedInUser === 'function') {
        setCurrentLoggedInUser(result.data.userInfo);
      }

      setProfileModalOpen(false);
      showToast(result.message || 'Đã cập nhật hồ sơ cá nhân thành công!');
    } catch (err) {
      setProfileError(err.message || 'Lỗi khi cập nhật hồ sơ cá nhân.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleOpenPasswordModal = () => {
    setDropdownOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordError('');
    setPasswordModalOpen(true);
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (passwordLoading) return;
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }
    if (new TextEncoder().encode(newPassword).length > 72) {
      setPasswordError('Mật khẩu mới không được vượt quá 72 byte UTF-8.');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError('Mật khẩu mới phải khác mật khẩu hiện tại.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch(`${ADMIN_API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        const errDetail =
          result?.errors?.currentPassword ||
          result?.errors?.newPassword ||
          result?.errors?.confirmPassword ||
          result?.message ||
          'Không thể đổi mật khẩu lúc này.';
        throw new Error(errDetail);
      }

      if (typeof setCurrentLoggedInUser === 'function') {
        setCurrentLoggedInUser((prev) =>
          prev ? { ...prev, mustChangePassword: false } : prev
        );
      }

      try {
        if (
          localStorage.getItem('vietpeace_admin_remember_me') === 'true' &&
          currentLoggedInUser?.email &&
          typeof window.PasswordCredential === 'function' &&
          typeof navigator?.credentials?.store === 'function'
        ) {
          const updatedCredential = new window.PasswordCredential({
            id: currentLoggedInUser.email,
            password: newPassword,
            name:
              currentLoggedInUser.fullName ||
              currentLoggedInUser.displayName ||
              currentLoggedInUser.email,
          });
          await navigator.credentials.store(updatedCredential);
        } else if (typeof navigator?.credentials?.preventSilentAccess === 'function') {
          await navigator.credentials.preventSilentAccess().catch(() => {});
        }
      } catch {
        // Bỏ qua nếu trình duyệt không hỗ trợ Credential Management API
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordModalOpen(false);
      showToast(result.message || 'Đã cập nhật mật khẩu tài khoản thành công!');
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
                  onClick={handleOpenProfileModal}
                >
                  <User size={14} color="#6B7280" />
                  <span>Hồ sơ cá nhân</span>
                  {!currentLoggedInUser?.personalEmail && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '999px',
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                        border: '1px solid #FDE68A',
                      }}
                    >
                      Thêm Gmail
                    </span>
                  )}
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

          {/* Quick alert pill for Managers when off /admin/chat */}
          {isManager && waitingCount > 0 && !onCustomerChatPage && (
            <button
              type="button"
              className="header-chat-alert-pill"
              onClick={() => {
                const targetCid = waitingConversations[0]?.id || pendingHandoffAlerts[0]?.conversationId;
                navigate(targetCid ? `/admin/chat?convId=${targetCid}` : '/admin/chat');
              }}
              title="Khách hàng đang yêu cầu gặp Quản lý"
            >
              <AlertTriangle size={14} />
              <span>{waitingCount} khách chờ gặp Quản lý</span>
            </button>
          )}

          {/* Notifications (Đặt bên phải tên admin) */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button
              type="button"
              className={`header-notification-btn ${waitingCount > 0 ? 'has-urgent' : ''}`}
              onClick={() => {
                setNowMs(Date.now());
                setNotificationsOpen(!notificationsOpen);
              }}
              aria-label="Thông báo hệ thống"
              title="Thông báo hệ thống"
            >
              <Bell size={16} />
              {totalNotifs > 0 && (
                <span className={`notification-badge ${waitingCount > 0 ? 'notification-badge--urgent' : ''}`}>
                  {totalNotifs > 9 ? '9+' : totalNotifs}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div
                className="header-user-dropdown"
                style={{ width: '330px', right: 0 }}
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
                  <span className="badge badge-warning">{totalNotifs} Mới</span>
                </div>
                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  {totalNotifs === 0 ? (
                    <div style={{ padding: '14px', fontSize: '12px', color: '#6B7280', textAlign: 'center' }}>
                      Không có thông báo chat hoặc cảnh báo mới.
                    </div>
                  ) : (
                    <>
                      {(waitingConversations.length > 0 ? waitingConversations : pendingHandoffAlerts)
                        .slice(0, 5)
                        .map((item) => {
                          const cid = Number(item.id || item.conversationId);
                          const expiresAt = item.managerWaitExpiresAt || item.expiresAt || null;
                          const customerLabel = item.customerName || item.requesterName || 'Khách hàng';
                          return (
                            <button
                              key={cid}
                              type="button"
                              onClick={() => {
                                setNotificationsOpen(false);
                                navigate(cid ? `/admin/chat?convId=${cid}` : '/admin/chat');
                              }}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '10px 14px',
                                border: 'none',
                                borderBottom: '1px solid #F3F4F6',
                                background: '#FFFBEB',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: '8px',
                                }}
                              >
                                <span style={{ fontWeight: 700, color: '#92400E' }}>
                                  {customerLabel} · Yêu cầu gặp Quản lý
                                </span>
                                {expiresAt && (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      color: '#78350F',
                                      background: '#FDE68A',
                                      padding: '1px 6px',
                                      borderRadius: '999px',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {formatCountdown(expiresAt, nowMs)}
                                  </span>
                                )}
                              </div>
                              <div style={{ color: '#4B5563', marginTop: '3px', fontSize: '11.5px' }}>
                                <b>{item.accommodationName || 'Cơ sở'}</b>
                                {item.lastMessagePreview ? ` — ${item.lastMessagePreview}` : ''}
                              </div>
                            </button>
                          );
                        })}
                      {internalUnread > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setNotificationsOpen(false);
                            navigate('/admin/chat/internal');
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '10px 14px',
                            border: 'none',
                            borderBottom: '1px solid #F3F4F6',
                            background: '#FFFFFF',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#292D32' }}>
                            {internalUnread} tin nhắn Chat nội bộ chưa đọc
                          </div>
                          <div style={{ color: '#6B7280', marginTop: '2px' }}>
                            Nhấn để mở trao đổi với ban quản trị / đồng nghiệp.
                          </div>
                        </button>
                      )}
                      {isAdmin && reportsSummary?.pendingLowRatingsCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setNotificationsOpen(false);
                            navigate('/admin/chat/reports?tab=RATINGS');
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '10px 14px',
                            border: 'none',
                            borderBottom: '1px solid #F3F4F6',
                            background: '#FFF7ED',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#9A3412' }}>
                            {reportsSummary.pendingLowRatingsCount} đánh giá 1★-3★ chờ kiểm duyệt
                          </div>
                          <div style={{ color: '#6B7280', marginTop: '2px' }}>
                            Xem báo cáo chất lượng Quản lý & gửi nhắc nhở.
                          </div>
                        </button>
                      )}
                      {isAdmin && reportsSummary?.unreadMissedCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setNotificationsOpen(false);
                            navigate('/admin/chat/reports?tab=MISSED');
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '10px 14px',
                            border: 'none',
                            background: '#FFF1F2',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#9F1239' }}>
                            {reportsSummary.unreadMissedCount} yêu cầu Quản lý bỏ lỡ 5 phút
                          </div>
                          <div style={{ color: '#6B7280', marginTop: '2px' }}>
                            Xem ngay tại mục Báo cáo chat.
                          </div>
                        </button>
                      )}
                      {isAdmin &&
                        reportsBadge > 0 &&
                        !reportsSummary?.pendingLowRatingsCount &&
                        !reportsSummary?.unreadMissedCount && (
                          <button
                            type="button"
                            onClick={() => {
                              setNotificationsOpen(false);
                              navigate('/admin/chat/reports');
                            }}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '10px 14px',
                              border: 'none',
                              background: '#FFF1F2',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ fontWeight: 700, color: '#9F1239' }}>
                              {reportsBadge} cảnh báo CSKH / Quản lý bỏ lỡ 5 phút
                            </div>
                            <div style={{ color: '#6B7280', marginTop: '2px' }}>
                              Xem ngay tại mục Báo cáo chat.
                            </div>
                          </button>
                        )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MODAL: HỒ SƠ CÁ NHÂN */}
      {profileModalOpen && (
        <div className="modal-overlay" onClick={() => !profileLoading && setProfileModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '490px', borderRadius: '10px', overflow: 'hidden' }}
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
                onClick={() => !profileLoading && setProfileModalOpen(false)}
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

            <form onSubmit={handleProfileSaveSubmit} noValidate>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
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
                    padding: '12px 14px',
                    fontSize: '13px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginBottom: '16px',
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

                {!currentLoggedInUser?.personalEmail && (
                  <div
                    style={{
                      backgroundColor: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      marginBottom: '14px',
                      color: '#92400E',
                      fontSize: '12.5px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                    }}
                  >
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>
                      Tài khoản này chưa có Email cá nhân (Gmail). Hãy bổ sung Gmail cá nhân bên dưới để dùng khi quên mật khẩu và nhận lại email đăng nhập nội bộ.
                    </span>
                  </div>
                )}

                {profileError && (
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
                    {profileError}
                  </div>
                )}

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Họ và tên <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={15}
                      color="#94A3B8"
                      style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="text"
                      required
                      value={profileForm.fullName}
                      onChange={(e) => {
                        setProfileForm((prev) => ({ ...prev, fullName: e.target.value }));
                        if (profileError) setProfileError('');
                      }}
                      placeholder="Nhập họ và tên..."
                      className="filter-input"
                      style={{ width: '100%', height: '38px', paddingLeft: '34px', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Số điện thoại liên hệ
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone
                      size={15}
                      color="#94A3B8"
                      style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="tel"
                      value={profileForm.phoneNumber}
                      onChange={(e) => {
                        setProfileForm((prev) => ({ ...prev, phoneNumber: e.target.value }));
                        if (profileError) setProfileError('');
                      }}
                      placeholder="Ví dụ: 0901234567"
                      className="filter-input"
                      style={{ width: '100%', height: '38px', paddingLeft: '34px', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Email cá nhân (Gmail nhận khôi phục mật khẩu){!isAdmin && <span style={{ color: '#DC2626' }}> *</span>}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={15}
                      color="#94A3B8"
                      style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="email"
                      required={!isAdmin}
                      value={profileForm.personalEmail}
                      onChange={(e) => {
                        setProfileForm((prev) => ({ ...prev, personalEmail: e.target.value }));
                        if (profileError) setProfileError('');
                      }}
                      placeholder="vi-du@gmail.com"
                      className="filter-input"
                      style={{ width: '100%', height: '38px', paddingLeft: '34px', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748B', lineHeight: 1.45 }}>
                    Khi sử dụng chức năng Quên mật khẩu, hệ thống sẽ gửi lại email đăng nhập nội bộ và mật khẩu mới về địa chỉ này.
                  </p>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={profileLoading}
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
                      disabled={profileLoading}
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
                    className="btn btn-secondary"
                    disabled={profileLoading}
                    onClick={() => setProfileModalOpen(false)}
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={profileLoading}
                  >
                    {profileLoading ? 'Đang lưu...' : 'Lưu hồ sơ'}
                  </button>
                </div>
              </div>
            </form>
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

            <form onSubmit={handlePasswordChangeSubmit} noValidate>
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
                    Mật khẩu hiện tại:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={15}
                      color="#94A3B8"
                      style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      name="currentPassword"
                      autoComplete="current-password"
                      placeholder="Nhập mật khẩu hiện tại..."
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        if (passwordError) setPasswordError('');
                      }}
                      className="filter-input"
                      style={{ width: '100%', height: '38px', paddingLeft: '34px', paddingRight: '36px', fontSize: '13.5px', boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
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
                      title={showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

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
                      minLength={8}
                      name="newPassword"
                      autoComplete="new-password"
                      placeholder="Nhập mật khẩu mới..."
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (passwordError) setPasswordError('');
                      }}
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
                      name="confirmPassword"
                      autoComplete="new-password"
                      placeholder="Nhập lại mật khẩu mới..."
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (passwordError) setPasswordError('');
                      }}
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
