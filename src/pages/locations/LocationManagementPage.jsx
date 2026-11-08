import React, { useState, useMemo } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import LocationFormModal from './LocationFormModal.jsx';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  RotateCcw,
  Building
} from 'lucide-react';

// Hàm chuẩn hóa chuỗi: bỏ dấu tiếng Việt, chuyển chữ thường và đổi gạch nối '-' thành khoảng trắng
const normalizeText = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export default function LocationManagementPage() {
  const { locations, accommodations, addLocation, updateLocation, deleteLocation } = useAdmin();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [parentForChild, setParentForChild] = useState(null);

  // Delete Dialog State
  const [deleteTargetLocation, setDeleteTargetLocation] = useState(null);

  // Calculate accommodation count per location
  const accCountMap = useMemo(() => {
    const map = {};
    accommodations.forEach((acc) => {
      map[acc.location_id] = (map[acc.location_id] || 0) + 1;
    });
    return map;
  }, [accommodations]);

  const handleOpenCreateRoot = () => {
    setEditingLocation(null);
    setParentForChild(null);
    setModalOpen(true);
  };

  const handleOpenAddChild = (parentId) => {
    setEditingLocation(null);
    setParentForChild(parentId);
    setModalOpen(true);
  };

  const handleOpenEdit = (loc) => {
    setEditingLocation(loc);
    setParentForChild(null);
    setModalOpen(true);
  };

  const handleSaveModal = async (data) => {
    try {
      if (editingLocation) {
        await updateLocation(editingLocation.id, data);
      } else {
        await addLocation(data);
      }
      setModalOpen(false);
    } catch {
      // The context displays the API error and keeps the form open for correction.
    }
  };

  const confirmDelete = async () => {
    if (deleteTargetLocation) {
      const deleted = await deleteLocation(deleteTargetLocation.id);
      if (deleted) setDeleteTargetLocation(null);
    }
  };

  // Hiển thị bảng phẳng nhưng vẫn nhóm điểm đến con ngay dưới điểm đến gốc.
  const locationsForTable = useMemo(() => {
    const compareByName = (a, b) => (a.name || '').localeCompare(b.name || '', 'vi');
    const roots = locations.filter((location) => !location.parent_location_id).sort(compareByName);
    const ordered = [];
    const listedIds = new Set();

    roots.forEach((root) => {
      ordered.push({ ...root, depth: 0 });
      listedIds.add(root.id);

      locations
        .filter((location) => Number(location.parent_location_id) === Number(root.id))
        .sort(compareByName)
        .forEach((child) => {
          ordered.push({ ...child, depth: 1 });
          listedIds.add(child.id);
        });
    });

    locations
      .filter((location) => !listedIds.has(location.id))
      .sort(compareByName)
      .forEach((location) => ordered.push({ ...location, depth: 0 }));

    // Lọc theo từ khóa tìm kiếm và trạng thái
    return ordered.filter((loc) => {
      const normSearch = normalizeText(searchTerm);
      const matchSearch =
        !searchTerm ||
        normalizeText(loc.name).includes(normSearch) ||
        normalizeText(loc.code).includes(normSearch) ||
        normalizeText(loc.province_name).includes(normSearch);

      const matchStatus = !statusFilter || loc.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [locations, searchTerm, statusFilter]);

  return (
    <div>
      <PageHeader
        title="Quản lý điểm đến phân cấp"
        description="Hệ thống cơ sở dữ liệu địa lý đa cấp: Tỉnh/thành phố và các khu vực, điểm đến trực thuộc."
        actions={
          <button type="button" onClick={handleOpenCreateRoot} className="btn btn-primary">
            <Plus size={15} /> Thêm điểm đến
          </button>
        }
      />

      {/* Toolbar & Filters */}
      <div className="filter-panel">
        <div className="filter-group filter-group-wide">
          <label className="filter-label">Tìm kiếm tên điểm đến, tỉnh thành...</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="filter-input"
              style={{ width: '100%', paddingLeft: '28px' }}
              placeholder="Ví dụ: Đà Nẵng, Sa Pa, Cà Mau, Nha Trang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '9px', color: '#6B7280' }} />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">Trạng thái</label>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Active">Đang hoạt động</option>
            <option value="Inactive">Ngừng hoạt động</option>
          </select>
        </div>

        <div className="filter-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
            }}
          >
            <RotateCcw size={13} /> Đặt lại
          </button>
        </div>
      </div>

      {/* Bảng điểm đến phân cấp */}
      <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên điểm đến</th>
                <th>Tỉnh / Thành phố</th>
                <th style={{ textAlign: 'center' }}>Cơ sở lưu trú</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {locationsForTable.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>
                    Không tìm thấy điểm đến nào phù hợp.
                  </td>
                </tr>
              ) : (
                locationsForTable.map((loc) => {
                  const parent = locations.find((l) => l.id === loc.parent_location_id);
                  const count = accCountMap[loc.id] || 0;
                  return (
                    <tr
                      key={loc.id}
                      style={{
                        backgroundColor: loc.depth > 0 ? '#F9FAFB' : undefined
                      }}
                    >
                      <td className="code-badge">#{loc.id}</td>
                      <td style={{ fontWeight: loc.depth === 0 ? 600 : 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: `${loc.depth * 24}px` }}>
                          {loc.depth > 0 && (
                            <span style={{ color: '#9CA3AF', marginRight: '6px', fontSize: '13px', fontWeight: 400 }}>↳</span>
                          )}
                          <span>{loc.name}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500, color: '#374151' }}>
                          {loc.province_name || (parent ? parent.province_name || parent.name : loc.name)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="tabular-nums" style={{ fontWeight: 600 }}>
                          {count}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={loc.status} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="row-action-btn"
                            title="Thêm điểm đến con"
                            onClick={() => handleOpenAddChild(loc.id)}
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            type="button"
                            className="row-action-btn"
                            title="Chỉnh sửa điểm đến"
                            onClick={() => handleOpenEdit(loc)}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            className="row-action-btn delete"
                            title="Xóa điểm đến"
                            onClick={() => setDeleteTargetLocation(loc)}
                          >
                            <Trash2 size={12} />
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

      {/* Location Create/Edit Modal */}
      <LocationFormModal
        isOpen={modalOpen}
        locationToEdit={editingLocation}
        parentLocationIdForChild={parentForChild}
        locations={locations}
        onSave={handleSaveModal}
        onClose={() => setModalOpen(false)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetLocation)}
        title="Xóa điểm đến"
        message={`Bạn có chắc chắn muốn xóa "${deleteTargetLocation?.name}"? Bạn sẽ không thể xóa nếu điểm đến này có điểm đến con trực thuộc hoặc có cơ sở lưu trú liên kết.`}
        confirmLabel="Xác nhận xóa"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetLocation(null)}
      />
    </div>
  );
}
