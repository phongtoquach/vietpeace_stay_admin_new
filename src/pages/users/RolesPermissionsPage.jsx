import { useState, useEffect, useMemo } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { buildImageUrl } from '../../api/accommodations.js';
import {
  Building2,
  UserPlus,
  UserMinus,
  AlertCircle,
  CheckCircle2,
  Search,
  X,
  Check,
  Mail,
} from 'lucide-react';

const API_BASE = 'http://localhost:3002/api/admin';

async function loadOverview(signal) {
  const response = await fetch(`${API_BASE}/accommodations/managers-overview`, { credentials: 'include', signal });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải danh sách cơ sở.');
  return result.data.items || [];
}

// Hàm quy đổi địa phương / địa điểm con về Thành phố / Tỉnh lớn nhất
function getMajorCity(locationName) {
  if (!locationName) return '';
  const loc = locationName.trim();

  // Nhóm TP. Hồ Chí Minh: bao gồm TP. Hồ Chí Minh, Vũng Tàu, Bãi Trước, Bãi Sau, Thủ Đức
  if (
    loc === 'TP. Hồ Chí Minh' ||
    loc === 'Vũng Tàu' ||
    loc.includes('Vũng Tàu') ||
    loc.includes('Thủ Đức')
  ) {
    return 'TP. Hồ Chí Minh';
  }

  // Nhóm An Giang: bao gồm An Giang, Châu Đốc, Tri Tôn
  if (loc === 'An Giang' || loc === 'Châu Đốc' || loc === 'Tri Tôn') {
    return 'An Giang';
  }

  // Nhóm Đồng Tháp: bao gồm Sa Đéc, Cao Lãnh, Đồng Tháp
  if (loc === 'Đồng Tháp' || loc === 'Sa Đéc' || loc === 'Cao Lãnh') {
    return 'Đồng Tháp';
  }

  // Nhóm Phan Thiết: bao gồm Phan Thiết, Mũi Né
  if (loc === 'Phan Thiết' || loc === 'Mũi Né') {
    return 'Phan Thiết';
  }

  return loc;
}

export default function RolesPermissionsPage() {
  const { showToast } = useAdmin();

  const [accommodations, setAccommodations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'UNASSIGNED' | 'ASSIGNED'

  // Modal assign manager
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAccom, setSelectedAccom] = useState(null);
  const [unassignedManagers, setUnassignedManagers] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [assignForm, setAssignForm] = useState({
    managerId: '',
    fullName: '',
    personalEmail: '',
    phoneNumber: '',
  });
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccessData, setAssignSuccessData] = useState(null);
  const [assignError, setAssignError] = useState('');
  const [createManager, setCreateManager] = useState(false);
  const [replacementTarget, setReplacementTarget] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [resendFeedback, setResendFeedback] = useState(null);

  // Confirm Revoke Dialog
  const [revokeTarget, setRevokeTarget] = useState(null);

  // Fetch danh sách cơ sở & manager từ Backend
  const fetchOverview = async () => {
    setLoading(true);
    setOverviewError('');
    try {
      setAccommodations(await loadOverview());
    } catch (err) {
      console.error('Lỗi tải overview:', err);
      setOverviewError(err.message);
      showToast('Lỗi mạng khi tải danh sách cơ sở.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch danh sách các Manager chưa được phân công từ Danh sách Manager
  const fetchUnassignedManagers = async () => {
    setLoadingManagers(true);
    try {
      const res = await fetch(`${API_BASE}/users?role=ACCOMMODATION_MANAGER`, {
        credentials: 'include',
      });
      const result = await res.json();
      if (res.ok && result.success) {
        const items = result.data?.items || [];
        const available = items.filter((m) => !m.accommodation && m.status === 1);
        setUnassignedManagers(available);
        return available;
      }
      throw new Error(result.message || 'Không thể tải danh sách Manager.');
    } catch (err) {
      console.error('Lỗi tải danh sách Manager:', err);
      setAssignError(err.message || 'Không thể tải danh sách Manager. Vui lòng thử lại.');
      return null;
    } finally {
      setLoadingManagers(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadOverview(controller.signal)
      .then((items) => { if (!controller.signal.aborted) setAccommodations(items); })
      .catch((error) => { if (!controller.signal.aborted) setOverviewError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const handleOpenAssign = async (accom, replacing = false) => {
    setSelectedAccom(accom);
    setAssignForm({ managerId: '', fullName: '', personalEmail: '', phoneNumber: '' });
    setAssignError('');
    setAssignSuccessData(null);
    setReplacementTarget(replacing ? accom : null);
    setCreateManager(false);
    setResendFeedback(null);
    setAssignModalOpen(true);
    const available = await fetchUnassignedManagers();
    if (available) setCreateManager(available.length === 0);
  };

  const handleSelectManager = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      setAssignForm({ managerId: '', fullName: '', personalEmail: '', phoneNumber: '' });
      return;
    }

    const found = unassignedManagers.find((m) => String(m.id) === String(selectedId));
    if (found) {
      setAssignForm({
        managerId: found.id,
        fullName: found.fullName || '',
        personalEmail: found.personalEmail || '',
        phoneNumber: found.phoneNumber || '',
      });
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setAssignError('');

    if ((!createManager && !assignForm.managerId) || (createManager && !assignForm.fullName.trim())) {
      setAssignError(createManager ? 'Vui lòng nhập họ tên Manager mới.' : 'Vui lòng chọn một người quản lý từ danh sách.');
      return;
    }

    if (!assignForm.personalEmail.trim() || !assignForm.personalEmail.includes('@')) {
      setAssignError('Manager được chọn chưa có địa chỉ Gmail cá nhân hợp lệ.');
      return;
    }

    setAssignLoading(true);
    try {
      const payload = createManager
        ? { fullName: assignForm.fullName, personalEmail: assignForm.personalEmail, phoneNumber: assignForm.phoneNumber }
        : { managerId: assignForm.managerId };
      if (replacementTarget) payload.expectedManagerId = replacementTarget.manager.userId;
      const res = await fetch(`${API_BASE}/accommodations/${selectedAccom.id}/${replacementTarget ? 'managers' : 'assign-manager'}`, {
        method: replacementTarget ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Không thể phân công quản lý.');
      }

      setAssignSuccessData(result.data);
      showToast(result.message, result.data.emailSent ? 'success' : 'warning');
      fetchOverview();
      fetchUnassignedManagers();
    } catch (err) {
      setAssignError(err.message || 'Lỗi khi phân công quản lý.');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRevokeConfirm = () => {
    if (!revokeTarget) return;
    const target = revokeTarget;
    setRevokeTarget(null);
    handleOpenAssign(target, true);
  };

  const handleResend = async (accom, userId, inModal = false) => {
    if (resendingId !== null) return;
    setResendingId(accom.id);
    setResendFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/accommodations/${accom.id}/resend-manager-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ expectedManagerId: userId }),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Không thể gửi lại thông tin bàn giao.');
      }

      if (inModal) {
        setAssignSuccessData(result.data);
        setResendFeedback({ message: result.message, error: false });
      }
      showToast(result.message);
    } catch (err) {
      if (inModal) setResendFeedback({ message: err.message, error: true });
      showToast(err.message || 'Không thể gửi lại email.', 'error');
    } finally {
      setResendingId(null);
    }
  };

  // Danh sách Thành phố / Tỉnh cấp cao nhất (đã gộp các điểm con theo chuẩn)
  const uniqueCities = Array.from(
    new Set(accommodations.map((a) => getMajorCity(a.locationName)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'vi'));

  // Đếm số lượng cơ sở lưu trú theo từng thành phố lớn
  const cityCounts = useMemo(() => {
    const map = {};
    accommodations.forEach((a) => {
      const city = getMajorCity(a.locationName);
      if (city) {
        map[city] = (map[city] || 0) + 1;
      }
    });
    return map;
  }, [accommodations]);

  // Đếm số lượng cơ sở lưu trú theo trạng thái phân công (tự động điều chỉnh theo thành phố nếu đang lọc thành phố)
  const statusCounts = useMemo(() => {
    const list = cityFilter
      ? accommodations.filter((a) => getMajorCity(a.locationName) === cityFilter)
      : accommodations;
    return {
      total: list.length,
      unassigned: list.filter((a) => !a.manager).length,
      assigned: list.filter((a) => Boolean(a.manager)).length,
    };
  }, [accommodations, cityFilter]);

  const filteredAccommodations = accommodations.filter((a) => {
    // 1. Lọc theo trạng thái phân công (mặc định ALL = tất cả cơ sở)
    const hasManager = Boolean(a.manager);
    if (statusFilter === 'UNASSIGNED' && hasManager) return false;
    if (statusFilter === 'ASSIGNED' && !hasManager) return false;

    // 2. Lọc theo Thành phố lớn (nếu không chọn thì mặc định là tất cả cơ sở)
    if (cityFilter && getMajorCity(a.locationName) !== cityFilter) return false;

    // 3. Lọc theo từ khóa tìm kiếm (hỗ trợ tên cơ sở, mã, người quản lý, email, địa điểm con lẫn thành phố lớn)
    if (!searchTerm.trim()) return true;

    const q = searchTerm.toLowerCase().trim();
    const majorCity = getMajorCity(a.locationName).toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      (a.locationName && a.locationName.toLowerCase().includes(q)) ||
      majorCity.includes(q) ||
      (a.manager?.fullName && a.manager.fullName.toLowerCase().includes(q)) ||
      (a.manager?.internalEmail && a.manager.internalEmail.toLowerCase().includes(q)) ||
      (a.manager?.personalEmail && a.manager.personalEmail.toLowerCase().includes(q))
    );
  }).sort((a, b) => Number(Boolean(a.manager)) - Number(Boolean(b.manager)));

  return (
    <div>
      <PageHeader
        title="Phân quyền & Bàn giao Cơ sở lưu trú"
      />
      {overviewError && (
        <div role="alert" style={{ marginBottom: '16px', padding: '12px', color: '#C0392B', background: '#FDF2F2' }}>
          {overviewError}{' '}
          <button type="button" className="btn btn-sm btn-secondary" onClick={fetchOverview}>Thử lại</button>
        </div>
      )}

      {/* THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC DÀN ĐỀU */}
      <div
        className="filter-panel"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 2fr) minmax(180px, 1fr) minmax(180px, 1fr)',
          gap: '12px',
          width: '100%',
          boxSizing: 'border-box',
          marginBottom: '16px',
        }}
      >
        {/* Ô 1: Tìm kiếm theo từ khóa */}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            placeholder="Tìm kiếm cơ sở, mã, người quản lý, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
            style={{
              width: '100%',
              height: '38px',
              paddingLeft: '34px',
              paddingRight: searchTerm ? '32px' : '12px',
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
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              title="Xóa từ khóa tìm kiếm"
              aria-label="Xóa từ khóa tìm kiếm"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#9CA3AF',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Ô 2: Bộ lọc theo Thành phố (Mặc định không chọn = Tất cả cơ sở) */}
        <div style={{ width: '100%' }}>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="filter-select"
            style={{
              width: '100%',
              height: '38px',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          >
            <option value="">Tất cả thành phố ({accommodations.length})</option>
            {uniqueCities.map((city) => (
              <option key={city} value={city}>
                {city} ({cityCounts[city] || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Ô 3: Bộ lọc theo Trạng thái phân công */}
        <div style={{ width: '100%' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
            style={{
              width: '100%',
              height: '38px',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          >
            <option value="ALL">Tất cả trạng thái ({statusCounts.total})</option>
            <option value="UNASSIGNED">Chưa có quản lý ({statusCounts.unassigned})</option>
            <option value="ASSIGNED">Đã phân công quản lý ({statusCounts.assigned})</option>
          </select>
        </div>
      </div>

      {/* Bảng danh sách cơ sở lưu trú */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>STT</th>
              <th>Cơ sở lưu trú</th>
              <th>Địa điểm</th>
              <th>Người quản lý (Manager)</th>
              <th>Tài khoản đăng nhập nội bộ</th>
              <th>Gmail nhận mật khẩu</th>
              <th style={{ textAlign: 'center', width: '160px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                  Đang tải danh sách cơ sở lưu trú...
                </td>
              </tr>
            ) : filteredAccommodations.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <div>Không tìm thấy cơ sở lưu trú nào phù hợp với điều kiện tìm kiếm.</div>
                  {(searchTerm || cityFilter || statusFilter !== 'ALL') && (
                    <div style={{ marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '12px', padding: '5px 14px' }}
                        onClick={() => {
                          setSearchTerm('');
                          setCityFilter('');
                          setStatusFilter('ALL');
                        }}
                      >
                        Xóa bộ lọc để xem tất cả ({accommodations.length} cơ sở)
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              filteredAccommodations.map((item, idx) => {
                const hasManager = Boolean(item.manager);
                return (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center', color: '#6b7280' }}>{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {item.coverImageUrl ? (
                          <>
                            <img
                              src={buildImageUrl(item.coverImageUrl)}
                              alt={item.name}
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '6px',
                                objectFit: 'cover',
                                border: '1px solid #E2E8F0',
                                backgroundColor: '#F8FAFC',
                                flexShrink: 0,
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                  e.currentTarget.nextElementSibling.style.display = 'flex';
                                }
                              }}
                            />
                            <div
                              style={{
                                display: 'none',
                                width: '42px',
                                height: '42px',
                                borderRadius: '6px',
                                backgroundColor: '#f1f5f9',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#94a3b8',
                                border: '1px solid #E2E8F0',
                                flexShrink: 0,
                              }}
                            >
                              <Building2 size={20} />
                            </div>
                          </>
                        ) : (
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '6px',
                              backgroundColor: '#f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#94a3b8',
                              border: '1px solid #E2E8F0',
                              flexShrink: 0,
                            }}
                          >
                            <Building2 size={20} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13.5px' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            Mã: <code style={{ color: '#1e6091', fontWeight: 600 }}>{item.code}</code> | {item.typeName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: '#334155' }}>{item.locationName}</span>
                    </td>
                    <td>
                      {hasManager ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13.5px' }}>
                            {item.manager.fullName}
                          </div>
                          {item.manager.mustChangePassword && (
                            <span
                              style={{
                                fontSize: '11px',
                                color: '#b45309',
                                backgroundColor: '#fef3c7',
                                padding: '1px 6px',
                                borderRadius: '3px',
                                fontWeight: 500,
                              }}
                            >
                              Mật khẩu tạm (Chờ đổi)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: '12px',
                            color: '#64748b',
                            backgroundColor: '#f1f5f9',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontStyle: 'italic',
                          }}
                        >
                          Chưa có quản lý
                        </span>
                      )}
                    </td>
                    <td>
                      {hasManager ? (
                        <code style={{ fontSize: '12.5px', color: '#0284c7' }}>
                          {item.manager.internalEmail}
                        </code>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>—</span>
                      )}
                    </td>
                    <td>
                      {hasManager ? (
                        <span style={{ fontSize: '12.5px', color: '#475569' }}>
                          {item.manager.personalEmail || '—'}
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {hasManager ? (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {item.manager.canResendCredentials && (
                            <button type="button" className="btn btn-sm btn-secondary"
                              disabled={resendingId !== null}
                              onClick={() => handleResend(item, item.manager.userId)}>
                              <Mail size={13} /> {resendingId === item.id ? 'Đang gửi...' : 'Gửi lại bàn giao'}
                            </button>
                          )}
                        <button
                          type="button"
                          onClick={() => setRevokeTarget(item)}
                          className="btn btn-sm btn-secondary"
                          style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                          title="Thu hồi quyền quản lý của người này"
                        >
                          <UserMinus size={13} /> Gỡ quyền
                        </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenAssign(item)}
                          className="btn btn-sm btn-primary"
                          style={{ fontSize: '12px' }}
                        >
                          <UserPlus size={13} /> Phân công Quản lý
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL PHÂN CÔNG QUẢN LÝ CHO CƠ SỞ (Được CSS đồng bộ theo thiết kế giao diện) */}
      {assignModalOpen && (
        <div className="modal-overlay" onClick={() => !assignLoading && resendingId === null && setAssignModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '540px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} color="var(--color-primary-yellow-hover, #D6A82C)" />
                <span className="modal-title">{replacementTarget ? 'Chọn Manager thay thế' : 'Phân công Quản lý Cơ sở lưu trú'}</span>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => !assignLoading && resendingId === null && setAssignModalOpen(false)}
                disabled={assignLoading || resendingId !== null}
                aria-label="Đóng"
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {assignSuccessData ? (
                <div>
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '16px 0 20px',
                      color: 'var(--color-success, #287A4B)',
                    }}
                  >
                    <CheckCircle2 size={46} style={{ margin: '0 auto 10px', color: 'var(--color-success, #287A4B)' }} />
                    <h4 style={{ margin: '0 0 6px', fontSize: '16px', color: 'var(--color-success, #287A4B)', fontWeight: 700 }}>
                      {replacementTarget ? 'Đã thay thế quản lý thành công!' : 'Phân công quản lý thành công!'}
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-secondary-text, #6B7280)' }}>
                      {assignSuccessData.emailSent
                        ? 'Máy chủ email đã chấp nhận thư bàn giao. Nếu chưa thấy thư, hãy kiểm tra thư rác hoặc gửi lại.'
                        : 'Đã cấp tài khoản nhưng chưa gửi được email. Bạn có thể gửi lại sau khi kiểm tra cấu hình SMTP.'}
                    </p>
                  </div>

                  <div
                    style={{
                      backgroundColor: 'var(--color-main-bg, #F3F4F6)',
                      border: '1px solid var(--color-border, #D9DDE2)',
                      borderRadius: 'var(--radius-sm, 4px)',
                      padding: '14px 16px',
                      marginBottom: '16px',
                      fontSize: '13px',
                    }}
                  >
                    <p style={{ margin: '5px 0' }}>
                      <strong>Người quản lý:</strong> {assignSuccessData.fullName}
                    </p>
                    <p style={{ margin: '5px 0' }}>
                      <strong>Cơ sở phụ trách:</strong> {assignSuccessData.accommodationName}
                    </p>
                    <p style={{ margin: '5px 0' }}>
                      <strong>Gmail nhận thông tin:</strong>{' '}
                      <span style={{ color: 'var(--color-info, #1E6091)', fontWeight: 500 }}>
                        {assignSuccessData.personalEmail}
                      </span>
                    </p>
                  </div>
                  {resendFeedback && (
                    <p role="status" style={{ color: resendFeedback.error ? '#C0392B' : '#287A4B', fontSize: '13px' }}>
                      {resendFeedback.message}
                    </p>
                  )}
                  <p style={{ fontSize: '12px', color: '#6B7280' }}>
                    Có thể gửi lại cùng tài khoản và mật khẩu tạm trong 7 ngày, trước khi Manager đổi mật khẩu.
                  </p>
                </div>
              ) : (
                <form id="assign-manager-form" onSubmit={handleAssignSubmit}>
                  {/* Banner cơ sở được chọn */}
                  <div
                    style={{
                      backgroundColor: 'var(--color-pale-yellow, #FFF5D6)',
                      border: '1px solid #FDE68A',
                      borderRadius: 'var(--radius-sm, 4px)',
                      padding: '12px 14px',
                      marginBottom: '16px',
                      fontSize: '13px',
                      color: '#78350F',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Building2 size={16} color="#B45309" />
                    <span>
                      <strong>Cơ sở được chỉ định:</strong> {selectedAccom?.name}{' '}
                      <span style={{ opacity: 0.85 }}>({selectedAccom?.code})</span>
                    </span>
                  </div>

                  {replacementTarget && (
                    <p role="status" style={{ padding: '10px 12px', background: '#FFF5D6', color: '#78350F', fontSize: '13px' }}>
                      Manager hiện tại: <strong>{replacementTarget.manager.fullName}</strong>. Quyền của người này chỉ được thu hồi khi người thay thế được phân công thành công. Hủy sẽ giữ nguyên quản lý cũ.
                    </p>
                  )}

                  {assignError && (
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
                      <span>{assignError}</span>
                    </div>
                  )}

                  <div style={{ marginBottom: '14px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: 'var(--color-primary-text, #292D32)',
                      }}
                    >
                      Họ và tên người quản lý: <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    {!createManager ? <select
                      required
                      disabled={loadingManagers || assignLoading}
                      value={assignForm.managerId}
                      onChange={handleSelectManager}
                      className="filter-select"
                      style={{ width: '100%', height: '38px', fontSize: '13.5px', boxSizing: 'border-box' }}
                    >
                      <option value="">
                        {loadingManagers
                          ? '-- Đang tải danh sách Manager... --'
                          : unassignedManagers.length === 0
                          ? '-- Hiện không có Manager nào chưa được phân công --'
                          : '-- Chọn Manager chưa được phân công --'}
                      </option>
                      {unassignedManagers.map((mgr) => (
                        <option key={mgr.id} value={mgr.id}>
                          {mgr.fullName} {mgr.personalEmail ? `(${mgr.personalEmail})` : ''}
                        </option>
                      ))}
                    </select> : (
                      <input type="text" required maxLength={255} className="form-input"
                        placeholder="Nhập họ và tên Manager mới" value={assignForm.fullName}
                        disabled={assignLoading}
                        onChange={(e) => setAssignForm((prev) => ({ ...prev, fullName: e.target.value }))} />
                    )}
                    {!loadingManagers && unassignedManagers.length === 0 && (
                      <small style={{ color: '#B45309', fontSize: '12px', display: 'block', marginTop: '6px' }}>
                        Chưa có Manager chưa phân công. Điền thông tin để tạo Manager mới và bàn giao tại đây.
                      </small>
                    )}
                    {!loadingManagers && unassignedManagers.length > 0 && (
                      <button type="button" className="btn btn-sm btn-secondary" disabled={assignLoading}
                        style={{ marginTop: '8px' }} onClick={() => {
                          setCreateManager((prev) => !prev);
                          setAssignForm({ managerId: '', fullName: '', personalEmail: '', phoneNumber: '' });
                          setAssignError('');
                        }}>
                        {createManager ? 'Chọn Manager có sẵn' : 'Thêm Manager mới'}
                      </button>
                    )}
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: 'var(--color-primary-text, #292D32)',
                      }}
                    >
                      Địa chỉ email cá nhân: <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      readOnly={!createManager}
                      disabled={assignLoading}
                      maxLength={255}
                      onChange={(e) => setAssignForm((prev) => ({ ...prev, personalEmail: e.target.value }))}
                      placeholder={createManager ? 'Nhập email cá nhân nhận bàn giao' : 'Tự động điền khi chọn người quản lý'}
                      value={assignForm.personalEmail}
                      className="filter-input"
                      style={{
                        width: '100%',
                        height: '38px',
                        fontSize: '13.5px',
                        backgroundColor: '#F8FAFC',
                        color: '#0369A1',
                        fontWeight: 600,
                        cursor: createManager ? 'text' : 'default',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: 'var(--color-primary-text, #292D32)',
                      }}
                    >
                      Số điện thoại liên hệ:
                    </label>
                    <input
                      type="text"
                      readOnly={!createManager}
                      disabled={assignLoading}
                      maxLength={20}
                      onChange={(e) => setAssignForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder={createManager ? 'Nhập số điện thoại liên hệ' : 'Tự động điền theo hồ sơ Manager'}
                      value={assignForm.phoneNumber}
                      className="filter-input"
                      style={{
                        width: '100%',
                        height: '38px',
                        fontSize: '13.5px',
                        backgroundColor: '#F8FAFC',
                        color: '#334155',
                        cursor: createManager ? 'text' : 'default',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              {assignSuccessData ? (
                <>
                <button type="button" className="btn btn-secondary" disabled={resendingId !== null}
                  onClick={() => handleResend(selectedAccom, assignSuccessData.userId, true)}>
                  <Mail size={14} /> {resendingId !== null ? 'Đang gửi lại...' : 'Gửi lại tài khoản & mật khẩu'}
                </button>
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="btn btn-primary"
                  disabled={resendingId !== null}
                >
                  <Check size={14} /> Hoàn tất
                </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setAssignModalOpen(false)}
                    className="btn btn-secondary"
                    disabled={assignLoading}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    form="assign-manager-form"
                    disabled={assignLoading || loadingManagers}
                    className="btn btn-primary"
                  >
                    {assignLoading ? 'Đang bàn giao & gửi mail...' : replacementTarget ? 'Thu hồi & Bàn giao người thay thế' : 'Tạo tài khoản & Bàn giao'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG THU HỒI QUYỀN */}
      {revokeTarget && (
        <ConfirmDialog
          isOpen={Boolean(revokeTarget)}
          title="Thu hồi quyền Quản lý cơ sở"
          message={`Bạn muốn thu hồi quyền của "${revokeTarget.manager?.fullName}" tại "${revokeTarget.name}"? Bước tiếp theo bắt buộc chọn hoặc thêm Manager thay thế. Quyền cũ được giữ nguyên cho đến khi hoàn tất bàn giao.`}
          confirmLabel="Tiếp tục chọn người thay thế"
          confirmVariant="danger"
          onConfirm={handleRevokeConfirm}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </div>
  );
}
