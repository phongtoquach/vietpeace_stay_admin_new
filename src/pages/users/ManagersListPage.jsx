import React, { useState, useEffect, useMemo } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import {
  Users,
  UserPlus,
  UserCheck,
  Clock,
  Building2,
  Mail,
  Phone,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Save,
} from 'lucide-react';

const API_BASE = 'http://localhost:3002/api/admin';

export default function ManagersListPage() {
  const { showToast } = useAdmin();

  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Bộ lọc tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState(''); // '' | 'assigned' | 'unassigned'

  // Modal: Thêm Manager mới
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    fullName: '',
    personalEmail: '',
    phoneNumber: '',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Modal: Chỉnh sửa thông tin Manager
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    personalEmail: '',
    phoneNumber: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Dialog: Xóa Manager
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchManagers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/users?role=ACCOMMODATION_MANAGER`, {
        credentials: 'include',
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Không thể tải danh sách Manager.');
      }

      setManagers(result.data?.items || []);
    } catch (err) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  // Số liệu thống kê
  const stats = useMemo(() => {
    const total = managers.length;
    const assigned = managers.filter((m) => Boolean(m.accommodation)).length;
    const unassigned = total - assigned;
    return { total, assigned, unassigned };
  }, [managers]);

  // Danh sách đã lọc
  const filteredManagers = useMemo(() => {
    return managers.filter((m) => {
      if (assignmentFilter === 'assigned' && !m.accommodation) return false;
      if (assignmentFilter === 'unassigned' && m.accommodation) return false;

      if (searchTerm.trim()) {
        const kw = searchTerm.toLowerCase().trim();
        const matchName = m.fullName?.toLowerCase().includes(kw);
        const matchGmail = m.personalEmail?.toLowerCase().includes(kw);
        const matchPhone = m.phoneNumber?.toLowerCase().includes(kw);
        const matchAccom = m.accommodation?.name?.toLowerCase().includes(kw) || m.accommodation?.code?.toLowerCase().includes(kw);
        const matchInternal = m.email?.toLowerCase().includes(kw);
        if (!matchName && !matchGmail && !matchPhone && !matchAccom && !matchInternal) {
          return false;
        }
      }

      return true;
    });
  }, [managers, searchTerm, assignmentFilter]);

  // Mở modal thêm Manager
  const handleOpenAdd = () => {
    setAddForm({ fullName: '', personalEmail: '', phoneNumber: '' });
    setAddError('');
    setAddModalOpen(true);
  };

  // Submit thêm Manager mới
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddLoading(true);

    try {
      const res = await fetch(`${API_BASE}/users/managers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(addForm),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Không thể thêm Manager.');
      }

      showToast('Đã thêm Manager mới vào danh sách thành công!');
      setAddModalOpen(false);
      fetchManagers();
    } catch (err) {
      setAddError(err.message || 'Lỗi khi thêm Manager.');
    } finally {
      setAddLoading(false);
    }
  };

  // Mở modal chỉnh sửa Manager
  const handleOpenEdit = (manager) => {
    setEditTarget(manager);
    setEditForm({
      fullName: manager.fullName || '',
      personalEmail: manager.personalEmail || '',
      phoneNumber: manager.phoneNumber || '',
    });
    setEditError('');
    setEditModalOpen(true);
  };

  // Submit chỉnh sửa Manager
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;

    setEditError('');
    setEditLoading(true);

    try {
      const res = await fetch(`${API_BASE}/users/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: editForm.fullName,
          personalEmail: editForm.personalEmail,
          phoneNumber: editForm.phoneNumber,
          status: editTarget.status,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Không thể cập nhật thông tin Manager.');
      }

      showToast('Đã cập nhật thông tin Manager thành công!');
      setEditModalOpen(false);
      fetchManagers();
    } catch (err) {
      setEditError(err.message || 'Lỗi khi cập nhật thông tin Manager.');
    } finally {
      setEditLoading(false);
    }
  };

  // Xác nhận xóa Manager
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
        throw new Error(result.message || 'Không thể xóa Manager.');
      }

      showToast(result.message || 'Đã xóa Manager khỏi danh sách.');
      setDeleteTarget(null);
      fetchManagers();
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa Manager.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Danh sách Manager"
        subtitle="Quản lý thông tin nhân sự Manager (Email, Số điện thoại) để phục vụ phân công cơ sở lưu trú"
      />

      {/* Thẻ KPI Thống kê */}
      <div
        className="stat-cards-grid"
        style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}
      >
        <div
          className="stat-card"
          onClick={() => setAssignmentFilter('')}
          style={{
            cursor: 'pointer',
            borderColor: assignmentFilter === '' ? '#D6A82C' : undefined,
            boxShadow: assignmentFilter === '' ? '0 0 0 1px #D6A82C' : undefined,
          }}
        >
          <div className="stat-card-left">
            <span className="stat-card-title">Tổng số Manager</span>
            <span className="stat-card-value tabular-nums">{stats.total}</span>
            <span className="stat-card-sub">Toàn bộ nhân sự quản lý cơ sở</span>
          </div>
          <div className="stat-card-icon">
            <Users size={20} />
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => setAssignmentFilter('unassigned')}
          style={{
            cursor: 'pointer',
            borderColor: assignmentFilter === 'unassigned' ? '#16A34A' : undefined,
            boxShadow: assignmentFilter === 'unassigned' ? '0 0 0 1px #16A34A' : undefined,
          }}
        >
          <div className="stat-card-left">
            <span className="stat-card-title">Chưa phân công</span>
            <span className="stat-card-value tabular-nums" style={{ color: '#16A34A' }}>
              {stats.unassigned}
            </span>
            <span className="stat-card-sub" style={{ color: '#15803D' }}>
              Sẵn sàng chọn khi phân công cơ sở
            </span>
          </div>
          <div
            className="stat-card-icon"
            style={{ backgroundColor: '#DCFCE7', borderColor: '#BBF7D0', color: '#15803D' }}
          >
            <Clock size={20} />
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => setAssignmentFilter('assigned')}
          style={{
            cursor: 'pointer',
            borderColor: assignmentFilter === 'assigned' ? '#0284C7' : undefined,
            boxShadow: assignmentFilter === 'assigned' ? '0 0 0 1px #0284C7' : undefined,
          }}
        >
          <div className="stat-card-left">
            <span className="stat-card-title">Đã phân công cơ sở</span>
            <span className="stat-card-value tabular-nums" style={{ color: '#0284C7' }}>
              {stats.assigned}
            </span>
            <span className="stat-card-sub" style={{ color: '#0369A1' }}>
              Đang phụ trách cơ sở lưu trú
            </span>
          </div>
          <div
            className="stat-card-icon"
            style={{ backgroundColor: '#E0F2FE', borderColor: '#BAE6FD', color: '#0369A1' }}
          >
            <UserCheck size={20} />
          </div>
        </div>
      </div>

      {/* Thanh công cụ tìm kiếm, lọc & Thêm Manager */}
      <div
        className="filter-panel"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 220px auto',
          gap: '12px',
          alignItems: 'center',
          width: '100%',
          boxSizing: 'border-box',
          marginBottom: '16px',
        }}
      >
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '11px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-muted-text, #8C939E)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            className="filter-input"
            placeholder="Tìm theo tên Manager, Gmail cá nhân, số điện thoại, cơ sở..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '34px', boxSizing: 'border-box' }}
          />
        </div>

        <select
          className="filter-select"
          value={assignmentFilter}
          onChange={(e) => setAssignmentFilter(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box' }}
        >
          <option value="">Tất cả trạng thái ({stats.total})</option>
          <option value="unassigned">Chưa phân công ({stats.unassigned})</option>
          <option value="assigned">Đã phân công ({stats.assigned})</option>
        </select>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenAdd}
          style={{ height: '38px', padding: '0 16px', whiteSpace: 'nowrap' }}
        >
          <UserPlus size={15} /> Thêm Manager
        </button>
      </div>

      {/* Bảng danh sách Manager */}
      <div className="data-table-container">
        {error && (
          <div style={{ padding: '16px', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
              <th>Họ và tên Manager</th>
              <th>Email cá nhân (Gmail)</th>
              <th>Số điện thoại</th>
              <th>Trạng thái phân công</th>
              <th>Tài khoản nội bộ được cấp</th>
              <th style={{ width: '110px', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--color-secondary-text)' }}>
                  Đang tải danh sách Manager...
                </td>
              </tr>
            ) : filteredManagers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--color-secondary-text)' }}>
                  Chưa có Manager nào phù hợp. Hãy bấm <strong>"Thêm Manager"</strong> để tạo mới.
                </td>
              </tr>
            ) : (
              filteredManagers.map((manager, idx) => {
                const isAssigned = Boolean(manager.accommodation);
                return (
                  <tr key={manager.id}>
                    <td style={{ textAlign: 'center', color: 'var(--color-secondary-text)' }} className="tabular-nums">
                      {idx + 1}
                    </td>

                    {/* Họ và tên */}
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-primary-text)', fontSize: '13.5px' }}>
                        {manager.fullName}
                      </div>
                      {manager.createdAt && (
                        <div style={{ fontSize: '11.5px', color: 'var(--color-secondary-text)', marginTop: '2px' }}>
                          Ngày thêm: {manager.createdAt}
                        </div>
                      )}
                    </td>

                    {/* Email cá nhân */}
                    <td>
                      {manager.personalEmail ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369A1', fontWeight: 500, fontSize: '13px' }}>
                          <Mail size={13} />
                          <span>{manager.personalEmail}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-muted-text)', fontStyle: 'italic' }}>Chưa cập nhật</span>
                      )}
                    </td>

                    {/* Số điện thoại */}
                    <td className="tabular-nums">
                      {manager.phoneNumber ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          <Phone size={13} color="var(--color-secondary-text)" />
                          <span>{manager.phoneNumber}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-muted-text)', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>

                    {/* Trạng thái phân công */}
                    <td>
                      {isAssigned ? (
                        <div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 9px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: '#E0F2FE',
                              color: '#0369A1',
                              border: '1px solid #BAE6FD',
                            }}
                          >
                            <Building2 size={12} /> {manager.accommodation.name}
                          </span>
                          <div style={{ fontSize: '11.5px', color: 'var(--color-secondary-text)', marginTop: '3px' }}>
                            Mã cơ sở: {manager.accommodation.code}
                          </div>
                        </div>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: '#DCFCE7',
                            color: '#15803D',
                            border: '1px solid #BBF7D0',
                          }}
                        >
                          Chưa phân công
                        </span>
                      )}
                    </td>

                    {/* Tài khoản nội bộ */}
                    <td>
                      {isAssigned && manager.email && !manager.email.startsWith('mgr.pool.') ? (
                        <code
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 600,
                            color: '#78350F',
                            backgroundColor: '#FFF5D6',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            border: '1px solid #FDE68A',
                          }}
                        >
                          {manager.email}
                        </code>
                      ) : (
                        <span style={{ fontSize: '12.5px', color: 'var(--color-muted-text)', fontStyle: 'italic' }}>
                          Cấp tự động khi phân công
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="row-action-btn"
                          title="Chỉnh sửa thông tin Manager"
                          onClick={() => handleOpenEdit(manager)}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="row-action-btn delete"
                          title="Xóa Manager"
                          onClick={() => setDeleteTarget(manager)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: THÊM MANAGER MỚI */}
      {addModalOpen && (
        <div className="modal-overlay" onClick={() => !addLoading && setAddModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} color="var(--color-primary-yellow-hover, #D6A82C)" />
                <span className="modal-title">Thêm Manager mới vào danh sách</span>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => !addLoading && setAddModalOpen(false)}
                aria-label="Đóng"
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                {addError && (
                  <div
                    style={{
                      backgroundColor: 'var(--color-danger-bg, #FDF2F2)',
                      border: '1px solid #FCA5A5',
                      borderRadius: 'var(--radius-sm, 4px)',
                      padding: '10px 14px',
                      marginBottom: '14px',
                      color: 'var(--color-danger, #C0392B)',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{addError}</span>
                  </div>
                )}

                <div
                  style={{
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderRadius: '4px',
                    padding: '10px 12px',
                    marginBottom: '16px',
                    fontSize: '12.5px',
                    color: '#78350F',
                    lineHeight: 1.5,
                  }}
                >
                  Thêm hồ sơ Manager vào danh sách. Khi bạn thực hiện <strong>Phân công quản lý cơ sở</strong>, tên và email của Manager này sẽ xuất hiện trong danh sách chọn để hệ thống tự động cấp tài khoản & gửi mật khẩu.
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Họ và tên Manager: <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn Hoàng"
                    value={addForm.fullName}
                    onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                    className="filter-input"
                    style={{ width: '100%', height: '38px', fontSize: '13.5px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Địa chỉ Email cá nhân: <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Ví dụ: hoangnv.manager@gmail.com"
                    value={addForm.personalEmail}
                    onChange={(e) => setAddForm({ ...addForm, personalEmail: e.target.value })}
                    className="filter-input"
                    style={{ width: '100%', height: '38px', fontSize: '13.5px', boxSizing: 'border-box' }}
                  />
                  <small style={{ color: 'var(--color-secondary-text, #6B7280)', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                    Tài khoản và mật khẩu sẽ được gửi tự động về địa chỉ email này khi Manager được phân công cơ sở.
                  </small>
                </div>

                <div style={{ marginBottom: '6px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Số điện thoại liên hệ:
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 0912 345 678"
                    value={addForm.phoneNumber}
                    onChange={(e) => setAddForm({ ...addForm, phoneNumber: e.target.value })}
                    className="filter-input"
                    style={{ width: '100%', height: '38px', fontSize: '13.5px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAddModalOpen(false)}
                  disabled={addLoading}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                  <UserPlus size={14} /> {addLoading ? 'Đang lưu...' : 'Thêm vào danh sách'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHỈNH SỬA THÔNG TIN MANAGER */}
      {editModalOpen && editTarget && (
        <div className="modal-overlay" onClick={() => !editLoading && setEditModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="var(--color-primary-yellow-hover, #D6A82C)" />
                <span className="modal-title">Chỉnh sửa thông tin Manager</span>
              </div>
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
                    Họ và tên Manager: <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="filter-input"
                    style={{ width: '100%', height: '38px', fontSize: '13.5px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Địa chỉ Email cá nhân: <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.personalEmail}
                    onChange={(e) => setEditForm({ ...editForm, personalEmail: e.target.value })}
                    className="filter-input"
                    style={{ width: '100%', height: '38px', fontSize: '13.5px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '6px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    Số điện thoại liên hệ:
                  </label>
                  <input
                    type="text"
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                    className="filter-input"
                    style={{ width: '100%', height: '38px', fontSize: '13.5px', boxSizing: 'border-box' }}
                  />
                </div>
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

      {/* CONFIRM DIALOG: XÓA MANAGER */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          title="Xóa Manager khỏi danh sách"
          message={`Bạn có chắc chắn muốn xóa Manager "${deleteTarget.fullName}" khỏi hệ thống?${
            deleteTarget.accommodation
              ? ` Lưu ý: Người này đang phụ trách cơ sở "${deleteTarget.accommodation.name}", việc xóa sẽ đồng thời gỡ quyền quản lý tại cơ sở đó.`
              : ''
          }`}
          confirmLabel={deleteLoading ? 'Đang xóa...' : 'Xác nhận xóa'}
          confirmVariant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

