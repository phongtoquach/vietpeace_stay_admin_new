import { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import {
  Users,
  Shield,
  Building2,
  AlertTriangle,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Search,
  X,
  Save,
} from 'lucide-react';

const API_BASE = 'http://localhost:3002/api/admin';

export default function AdminUsersPage() {
  const { showToast } = useAdmin();
  const { currentLoggedInUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Thống kê tổng quan hệ thống
  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    adminCount: 0,
    managerCount: 0,
    inactiveCount: 0,
    pendingPasswordCount: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal: Chỉnh sửa tài khoản
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phoneNumber: '',
    status: 1,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Dialog: Khóa / Mở khóa
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  // Dialog: Xóa tài khoản
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Lấy số liệu thống kê toàn sàn
  const fetchSummaryStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`, { credentials: 'include' });
      const result = await res.json();
      if (result.success) {
        const items = result.data.items || [];
        setSummaryStats({
          total: items.length,
          adminCount: items.filter((u) => u.role === 'ADMIN').length,
          managerCount: items.filter((u) => u.role === 'ACCOMMODATION_MANAGER').length,
          inactiveCount: items.filter((u) => u.status === 2).length,
          pendingPasswordCount: items.filter((u) => u.mustChangePassword).length,
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải summary stats:', err);
    }
  };

  // Fetch danh sách người dùng từ Backend theo bộ lọc
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter !== '') params.append('status', statusFilter);

      const res = await fetch(`${API_BASE}/users?${params.toString()}`, {
        credentials: 'include',
      });
      const result = await res.json();
      if (result.success) {
        const items = result.data.items || [];
        setUsers(items);

        // Cập nhật lại số liệu nếu không áp dụng bộ lọc nào
        if (!searchTerm.trim() && !roleFilter && statusFilter === '') {
          setSummaryStats({
            total: items.length,
            adminCount: items.filter((u) => u.role === 'ADMIN').length,
            managerCount: items.filter((u) => u.role === 'ACCOMMODATION_MANAGER').length,
            inactiveCount: items.filter((u) => u.status === 2).length,
            pendingPasswordCount: items.filter((u) => u.mustChangePassword).length,
          });
        }
      } else {
        showToast(result.message || 'Không thể tải danh sách tài khoản.', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi tải users:', err);
      showToast('Lỗi mạng khi tải danh sách người dùng.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryStats();
  }, []);

  // Lọc khi thay đổi tiêu chí
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, roleFilter, statusFilter]);

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName || '',
      phoneNumber: user.phoneNumber || '',
      status: user.status,
    });
    setEditError('');
    setEditModalOpen(true);
  };

  // Submit sửa thông tin
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!editForm.fullName.trim()) {
      setEditError('Họ và tên không được để trống.');
      return;
    }

    setEditLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingUser.role === 'ADMIN'
          ? { fullName: editForm.fullName, phoneNumber: editForm.phoneNumber }
          : editForm),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Không thể cập nhật tài khoản.');
      }

      showToast(`Cập nhật thông tin tài khoản "${editForm.fullName}" thành công!`);
      setEditModalOpen(false);
      fetchUsers();
      fetchSummaryStats();
    } catch (err) {
      setEditError(err.message || 'Lỗi khi cập nhật tài khoản.');
    } finally {
      setEditLoading(false);
    }
  };

  // Xác nhận Khóa / Mở khóa
  const handleToggleConfirm = async () => {
    if (!toggleTarget || toggleTarget.role === 'ADMIN') return;

    setToggleLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/${toggleTarget.id}/status`, {
        method: 'PATCH',
        credentials: 'include',
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Không thể cập nhật trạng thái tài khoản.');
      }

      showToast(result.message);
      setToggleTarget(null);
      fetchUsers();
      fetchSummaryStats();
    } catch (err) {
      showToast(err.message || 'Lỗi khi cập nhật trạng thái.', 'error');
    } finally {
      setToggleLoading(false);
    }
  };

  // Xác nhận Xóa tài khoản
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Không thể xóa tài khoản.');
      }

      showToast(result.message);
      setDeleteTarget(null);
      fetchUsers();
      fetchSummaryStats();
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa tài khoản.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Tài khoản nhân sự quản trị"
      />

      {/* 4 THẺ THỐNG KÊ NHANH TRÊN ĐẦU TRANG */}
      <div
        className="stat-cards-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
          width: '100%',
          marginBottom: '18px',
        }}
      >
        {/* Card 1: Tổng số tài khoản */}
        <div
          className="stat-card"
          onClick={() => {
            setRoleFilter('');
            setStatusFilter('');
            setSearchTerm('');
          }}
          style={{
            cursor: 'pointer',
            borderColor: !roleFilter && statusFilter === '' && !searchTerm ? 'var(--color-primary-yellow-hover, #D6A82C)' : undefined,
            boxShadow: !roleFilter && statusFilter === '' && !searchTerm ? '0 0 0 1px var(--color-primary-yellow-hover, #D6A82C)' : undefined,
            transition: 'all 0.15s ease-in-out',
          }}
          title="Bấm để xem tất cả tài khoản"
        >
          <div className="stat-card-left">
            <span className="stat-card-title">Tổng nhân sự quản trị</span>
            <span className="stat-card-value tabular-nums">{summaryStats.total}</span>
            <span className="stat-card-sub">Toàn bộ tài khoản có quyền truy cập</span>
          </div>
          <div
            className="stat-card-icon"
            style={{ backgroundColor: '#F3F4F6', borderColor: '#D9DDE2', color: '#292D32' }}
          >
            <Users size={20} />
          </div>
        </div>

        {/* Card 2: Quản trị viên ADMIN */}
        <div
          className="stat-card"
          onClick={() => setRoleFilter(roleFilter === 'ADMIN' ? '' : 'ADMIN')}
          style={{
            cursor: 'pointer',
            borderColor: roleFilter === 'ADMIN' ? 'var(--color-primary-yellow-hover, #D6A82C)' : undefined,
            backgroundColor: roleFilter === 'ADMIN' ? '#FFFDF5' : undefined,
            boxShadow: roleFilter === 'ADMIN' ? '0 0 0 1px var(--color-primary-yellow-hover, #D6A82C)' : undefined,
            transition: 'all 0.15s ease-in-out',
          }}
          title="Bấm để lọc danh sách Quản trị viên (ADMIN)"
        >
          <div className="stat-card-left">
            <span className="stat-card-title">Quản trị viên (ADMIN)</span>
            <span className="stat-card-value tabular-nums" style={{ color: '#78350F' }}>
              {summaryStats.adminCount}
            </span>
            <span className="stat-card-sub" style={{ color: '#92400E' }}>
              Toàn quyền quản trị hệ thống
            </span>
          </div>
          <div
            className="stat-card-icon"
            style={{
              backgroundColor: 'var(--color-pale-yellow, #FFF5D6)',
              borderColor: '#FDE68A',
              color: '#B45309',
            }}
          >
            <Shield size={20} />
          </div>
        </div>

        {/* Card 3: Quản lý cơ sở MANAGER */}
        <div
          className="stat-card"
          onClick={() => setRoleFilter(roleFilter === 'ACCOMMODATION_MANAGER' ? '' : 'ACCOMMODATION_MANAGER')}
          style={{
            cursor: 'pointer',
            borderColor: roleFilter === 'ACCOMMODATION_MANAGER' ? '#0284C7' : undefined,
            backgroundColor: roleFilter === 'ACCOMMODATION_MANAGER' ? '#F0F9FF' : undefined,
            boxShadow: roleFilter === 'ACCOMMODATION_MANAGER' ? '0 0 0 1px #0284C7' : undefined,
            transition: 'all 0.15s ease-in-out',
          }}
          title="Bấm để lọc danh sách Quản lý cơ sở (MANAGER)"
        >
          <div className="stat-card-left">
            <span className="stat-card-title">Quản lý cơ sở (MANAGER)</span>
            <span className="stat-card-value tabular-nums" style={{ color: '#0369A1' }}>
              {summaryStats.managerCount}
            </span>
            <span className="stat-card-sub" style={{ color: '#0284C7' }}>
              Phụ trách khách sạn / homestay
            </span>
          </div>
          <div
            className="stat-card-icon"
            style={{ backgroundColor: '#E0F2FE', borderColor: '#BAE6FD', color: '#0284C7' }}
          >
            <Building2 size={20} />
          </div>
        </div>

        {/* Card 4: Tài khoản cần chú ý */}
        <div
          className="stat-card"
          onClick={() => setStatusFilter(statusFilter === 'attention' ? '' : 'attention')}
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'attention' ? '#EF4444' : undefined,
            backgroundColor: statusFilter === 'attention' ? '#FEF2F2' : undefined,
            boxShadow: statusFilter === 'attention' ? '0 0 0 1px #EF4444' : undefined,
            transition: 'all 0.15s ease-in-out',
          }}
          title="Bấm để lọc tài khoản cần chú ý (tạm khóa hoặc chờ đổi mật khẩu)"
        >
          <div className="stat-card-left">
            <span className="stat-card-title">Tài khoản cần chú ý</span>
            <span className="stat-card-value tabular-nums" style={{ color: '#DC2626' }}>
              {summaryStats.inactiveCount + summaryStats.pendingPasswordCount}
            </span>
            <span className="stat-card-sub" style={{ color: '#B91C1C' }}>
              {summaryStats.inactiveCount} tạm khóa • {summaryStats.pendingPasswordCount} chờ đổi pass
            </span>
          </div>
          <div
            className="stat-card-icon"
            style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}
          >
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* Bộ lọc tìm kiếm & trạng thái (Trải đều 100% toàn trang) */}
      <div
        className="filter-panel"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 2fr) minmax(180px, 1fr) minmax(180px, 1fr)',
          gap: '14px',
          alignItems: 'center',
          marginBottom: '16px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Tìm kiếm */}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            placeholder="Tìm theo họ tên, email, SĐT, cơ sở..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
            style={{
              width: '100%',
              height: '38px',
              paddingLeft: '34px',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '11px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-secondary-text, #6B7280)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Lọc theo Vai trò */}
        <div style={{ width: '100%' }}>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
            style={{ width: '100%', height: '38px', fontSize: '13px', boxSizing: 'border-box' }}
          >
            <option value="">Tất cả vai trò ({summaryStats.total})</option>
            <option value="ADMIN">Quản trị viên (ADMIN) ({summaryStats.adminCount})</option>
            <option value="ACCOMMODATION_MANAGER">Quản lý cơ sở (MANAGER) ({summaryStats.managerCount})</option>
          </select>
        </div>

        {/* Lọc theo Trạng thái */}
        <div style={{ width: '100%' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
            style={{ width: '100%', height: '38px', fontSize: '13px', boxSizing: 'border-box' }}
          >
            <option value="">Tất cả trạng thái ({summaryStats.total})</option>
            <option value="1">Đang hoạt động ({summaryStats.total - summaryStats.inactiveCount})</option>
            <option value="2">Tạm khóa ({summaryStats.inactiveCount})</option>
            <option value="pending_password">Chờ đổi mật khẩu ({summaryStats.pendingPasswordCount})</option>
            <option value="attention">
              Cần chú ý ({summaryStats.inactiveCount + summaryStats.pendingPasswordCount})
            </option>
          </select>
        </div>
      </div>

      {/* Bảng dữ liệu người dùng */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>STT</th>
              <th>Họ và tên</th>
              <th>Email nội bộ / Đăng nhập</th>
              <th>Số điện thoại</th>
              <th>Vai trò quản trị</th>
              <th>Cơ sở phụ trách</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: 'center', width: '130px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                  Đang tải danh sách tài khoản...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  Không tìm thấy tài khoản quản trị nào phù hợp.
                </td>
              </tr>
            ) : (
              users.map((user, idx) => {
                const isSelf = user.id === currentLoggedInUser?.id;
                const isAdmin = user.role === 'ADMIN';

                return (
                  <tr key={user.id}>
                    <td style={{ textAlign: 'center', color: '#6b7280' }}>{idx + 1}</td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13.5px' }}>
                          {user.fullName} {isSelf && <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600 }}>(Bạn)</span>}
                        </div>
                        {user.personalEmail && (
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            Gmail: <span style={{ color: '#0284c7' }}>{user.personalEmail}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {!isAdmin && (!user.accommodation || user.email?.startsWith('mgr.pool.')) ? (
                        <span style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                          Chưa cấp (Chờ phân công)
                        </span>
                      ) : (
                        <code style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 600 }}>
                          {user.email}
                        </code>
                      )}
                    </td>
                    <td>{user.phoneNumber || <span style={{ color: '#9ca3af' }}>—</span>}</td>
                    <td>
                      {isAdmin ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: 'var(--color-pale-yellow, #FFF5D6)',
                            color: '#78350F',
                            border: '1px solid #FDE68A',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <Shield size={12} color="#B45309" /> Quản trị viên (ADMIN)
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: '#E0F2FE',
                            color: '#0369A1',
                            border: '1px solid #BAE6FD',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <Building2 size={12} color="#0284C7" /> Quản lý cơ sở
                        </span>
                      )}
                    </td>
                    <td>
                      {user.accommodation ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>
                            {user.accommodation.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            Mã: <code style={{ color: '#1E6091' }}>{user.accommodation.code}</code>
                          </div>
                        </div>
                      ) : isAdmin ? (
                        <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                          Toàn hệ thống
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#b45309', fontStyle: 'italic' }}>
                          Chưa gán cơ sở
                        </span>
                      )}
                    </td>
                    <td>
                      <div>
                        {user.status === 1 ? (
                          <span
                            style={{
                              backgroundColor: 'var(--color-success-bg, #EAF5EE)',
                              color: 'var(--color-success, #287A4B)',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              display: 'inline-block',
                            }}
                          >
                            Đang hoạt động
                          </span>
                        ) : (
                          <span
                            style={{
                              backgroundColor: 'var(--color-danger-bg, #FDF2F2)',
                              color: 'var(--color-danger, #C0392B)',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              display: 'inline-block',
                            }}
                          >
                            Tạm khóa
                          </span>
                        )}

                        {user.mustChangePassword && (
                          <div style={{ marginTop: '3px' }}>
                            <span
                              style={{
                                fontSize: '10.5px',
                                color: '#b45309',
                                backgroundColor: '#fef3c7',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                fontWeight: 500,
                              }}
                            >
                              Mật khẩu tạm
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        {/* Nút sửa */}
                        <button
                          type="button"
                          className="row-action-btn"
                          title="Chỉnh sửa thông tin"
                          onClick={() => handleOpenEdit(user)}
                        >
                          <Edit2 size={13} />
                        </button>

                        {/* Khóa / Mở khóa chỉ áp dụng cho Manager */}
                        {!isAdmin && (
                        <button
                          type="button"
                          className="row-action-btn"
                          title={isSelf ? 'Không thể tự khóa tài khoản của mình' : user.status === 1 ? 'Tạm khóa tài khoản' : 'Mở khóa tài khoản'}
                          disabled={isSelf}
                          onClick={() => setToggleTarget(user)}
                          style={{ color: user.status === 1 ? '#D97706' : '#16A34A', opacity: isSelf ? 0.35 : 1 }}
                        >
                          {user.status === 1 ? <Lock size={13} /> : <Unlock size={13} />}
                        </button>
                        )}

                        {/* Nút Xóa: Chỉ áp dụng cho Quản lý cơ sở (MANAGER), tài khoản Quản trị viên (ADMIN) là cố định không thể xóa */}
                        {!isAdmin && (
                          <button
                            type="button"
                            className="row-action-btn delete"
                            title="Xóa tài khoản Quản lý"
                            onClick={() => setDeleteTarget(user)}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* MODAL: CHỈNH SỬA THÔNG TIN TÀI KHOẢN */}
      {editModalOpen && editingUser && (
        <div className="modal-overlay" onClick={() => !editLoading && setEditModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Chỉnh sửa tài khoản: {editingUser.fullName}</span>
              <button
                type="button"
                className="modal-close"
                onClick={() => !editLoading && setEditModalOpen(false)}
                aria-label="Đóng"
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {editError && (
                  <div
                    style={{
                      backgroundColor: 'var(--color-danger-bg, #FDF2F2)',
                      border: '1px solid #FCA5A5',
                      borderRadius: 'var(--radius-sm, 4px)',
                      padding: '10px 14px',
                      marginBottom: '14px',
                      color: 'var(--color-danger, #C0392B)',
                      fontSize: '13px',
                    }}
                  >
                    {editError}
                  </div>
                )}

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Email nội bộ (Đăng nhập):
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editingUser.email}
                    className="filter-input"
                    style={{ width: '100%', height: '36px', fontSize: '13.5px', backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                  />
                  <small style={{ color: '#64748b', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                    Email nội bộ được định danh tự động theo mã cơ sở, không thể thay đổi.
                  </small>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Họ và tên: <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="filter-input"
                    style={{ width: '100%', height: '36px', fontSize: '13.5px' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Số điện thoại liên hệ:
                  </label>
                  <input
                    type="text"
                    placeholder="0912 345 678"
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                    className="filter-input"
                    style={{ width: '100%', height: '36px', fontSize: '13.5px' }}
                  />
                </div>

                {editingUser.role !== 'ADMIN' && (
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Trạng thái tài khoản:
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: Number(e.target.value) })}
                    className="filter-select"
                    style={{ width: '100%', height: '36px', fontSize: '13.5px' }}
                    disabled={editingUser.id === currentLoggedInUser?.id}
                  >
                    <option value={1}>Đang hoạt động (ACTIVE)</option>
                    <option value={2}>Tạm khóa (INACTIVE)</option>
                  </select>
                  {editingUser.id === currentLoggedInUser?.id && (
                    <small style={{ color: '#64748b', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                      Bạn không thể tự khóa tài khoản của chính mình.
                    </small>
                  )}
                </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditModalOpen(false)}
                  disabled={editLoading}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={editLoading}>
                  <Save size={14} /> {editLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG: KHÓA / MỞ KHÓA TÀI KHOẢN */}
      {toggleTarget && toggleTarget.role !== 'ADMIN' && (
        <ConfirmDialog
          isOpen={Boolean(toggleTarget)}
          title={toggleTarget.status === 1 ? 'Khóa tài khoản quản trị' : 'Mở khóa tài khoản'}
          message={
            toggleTarget.status === 1
              ? `Bạn có chắc chắn muốn tạm khóa tài khoản "${toggleTarget.fullName}"? Ngay sau khi khóa, phiên làm việc của người này sẽ bị chấm dứt và không thể đăng nhập vào hệ thống.`
              : `Bạn có chắc chắn muốn mở khóa và kích hoạt lại tài khoản "${toggleTarget.fullName}"?`
          }
          confirmLabel={
            toggleLoading
              ? 'Đang xử lý...'
              : toggleTarget.status === 1
              ? 'Tạm khóa ngay'
              : 'Kích hoạt lại'
          }
          confirmVariant={toggleTarget.status === 1 ? 'danger' : 'primary'}
          onConfirm={handleToggleConfirm}
          onCancel={() => setToggleTarget(null)}
        />
      )}

      {/* CONFIRM DIALOG: XÓA TÀI KHOẢN */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          title="Xóa tài khoản quản trị"
          message={`Bạn có chắc chắn muốn xóa tài khoản của "${deleteTarget.fullName}" (${deleteTarget.email})? Nếu tài khoản đã có dữ liệu ràng buộc trong hệ thống, hệ thống sẽ tự động chuyển sang trạng thái Tạm khóa an toàn.`}
          confirmLabel={deleteLoading ? 'Đang xóa...' : 'Xác nhận xóa'}
          confirmVariant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
