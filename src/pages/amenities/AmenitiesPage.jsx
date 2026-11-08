import React, { useState, useMemo, useEffect } from 'react';
import { apiFetch } from '../../api/client.js';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import FormInput from '../../components/forms/FormInput.jsx';
import FormSelect from '../../components/forms/FormSelect.jsx';
import FormTextarea from '../../components/forms/FormTextarea.jsx';
import { Plus, Edit2, Trash2, Sparkles, X, Save, Search, RotateCcw, Star } from 'lucide-react';

export default function AmenitiesPage() {
  const { showToast } = useAdmin();

  const [amenities, setAmenities] = useState([]);
  const [amenityCategories, setAmenityCategories] = useState([]);

  // Load amenities and categories from API
  useEffect(() => {
      let isMounted = true;

      const loadAmenities = async () => {
          try {
              const [amenitiesResponse, categoriesResponse] = await Promise.all([
                  apiFetch('/amenities'),
                  apiFetch('/amenities/categories')
              ]);

              if (!isMounted) return;

              const amenitiesList =
                  amenitiesResponse?.data?.amenitiesList || [];

              const categoriesList =
                  categoriesResponse?.data?.categoriesList || [];

              setAmenities(
                  amenitiesList.map((item) => ({
                      ...item,
                      category: item.category_code,
                      icon: item.icon_key || 'Sparkles',
                      status: item.is_active ? 'Active' : 'Inactive',
                      usage_count: Number(item.usage_count) || 0
                  }))
              );

              setAmenityCategories(categoriesList);

          } catch (error) {
              console.error('Load amenities error:', error);

              if (isMounted) {
                  showToast(
                      'Không thể tải dữ liệu tiện nghi từ máy chủ.',
                      'error'
                  );
              }
          }
      };

      loadAmenities();

      return () => {
          isMounted = false;
      };
  }, []);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [nameError, setNameError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [scopeError, setScopeError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    amenity_scope: '',
    icon: 'Sparkles',
    description: '',
    status: 'Active'
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setNameError('');
    setCategoryError('');
    setScopeError('');

    setFormData({
        name: '',
        category: '',
        amenity_scope: '',
        icon: 'Sparkles',
        description: '',
        status: 'Active'
    });

    setModalOpen(true);
};

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setNameError('');
    setCategoryError('');
    setScopeError('');

    setFormData({
      name: item.name,
      category: item.category_code || item.category || '',
      amenity_scope: item.amenity_scope || '',
      icon: item.icon || 'Sparkles',
      description: item.description || '',
      status: item.status || 'Active'
    });
    setModalOpen(true);
  };

  const addAmenity = async (data) => {
    try {
        const response = await apiFetch('/amenities', {
            method: 'POST',
            body: JSON.stringify({
                name: data.name,
                category_code: data.category_code || data.category,
                icon_key: data.icon_key || data.icon || null,
                description: data.description || '',
                amenity_scope: data.amenity_scope || 'both'
            })
        });

        if (!response?.success) {
            throw new Error(response?.message || 'Thêm tiện nghi thất bại.');
        }

        const listResponse = await apiFetch('/amenities');
        const amenitiesList = listResponse?.data?.amenitiesList || [];

        setAmenities(
            amenitiesList.map((item) => ({
                ...item,
                category: item.category_code,
                icon: item.icon_key || 'Sparkles',
                status: item.is_active ? 'Active' : 'Inactive',
                usage_count: Number(item.usage_count) || 0
            }))
        );

        showToast('Thêm tiện nghi thành công.', 'success');
        return true;

    } catch (error) {
        console.error('Add amenity error:', error);
        showToast(error.message || 'Không thể thêm tiện nghi.', 'error');
        return false;
    }
};

const updateAmenity = async (id, data) => {
    try {
        const response = await apiFetch(`/amenities/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: data.name,
                category_code: data.category_code || data.category,
                amenity_scope: data.amenity_scope,
                icon_key: data.icon_key || data.icon || null,
                description: data.description || '',
                is_active:
                    data.is_active !== undefined
                        ? Boolean(data.is_active)
                        : data.status !== undefined
                            ? data.status === 'Active'
                            : undefined
            })
        });

        if (!response?.success) {
            throw new Error(response?.message || 'Cập nhật tiện nghi thất bại.');
        }

        const listResponse = await apiFetch('/amenities');
        const amenitiesList = listResponse?.data?.amenitiesList || [];

        setAmenities(
            amenitiesList.map((item) => ({
                ...item,
                category: item.category_code,
                icon: item.icon_key || 'Sparkles',
                status: item.is_active ? 'Active' : 'Inactive',
                usage_count: Number(item.usage_count) || 0
            }))
        );

        showToast('Cập nhật tiện nghi thành công.', 'success');
        return true;

    } catch (error) {
        console.error('Update amenity error:', error);
        showToast(error.message || 'Không thể cập nhật tiện nghi.', 'error');
        return false;
    }
};

const toggleAmenityStatus = async (id, isActive) => {
    try {
        const response = await apiFetch(`/amenities/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({
                is_active: isActive
            })
        });

        if (!response?.success) {
            throw new Error(response?.message || 'Không thể cập nhật trạng thái.');
        }

        const listResponse = await apiFetch('/amenities');
        const amenitiesList = listResponse?.data?.amenitiesList || [];

        setAmenities(
            amenitiesList.map((item) => ({
                ...item,
                category: item.category_code,
                icon: item.icon_key || 'Sparkles',
                status: item.is_active ? 'Active' : 'Inactive',
                usage_count: Number(item.usage_count) || 0
            }))
        );

        showToast(
            isActive
                ? 'Đã bật tiện nghi thành công.'
                : 'Đã tắt tiện nghi thành công.',
            'success'
        );

        return true;

    } catch (error) {
        console.error('toggleAmenityStatus error:', error);
        showToast(error.message || 'Không thể cập nhật trạng thái tiện nghi.', 'error');
        return false;
    }
};

const handleSave = async (e) => {
    e.preventDefault();

    let hasError = false;

    // Kiểm tra tên tiện nghi
    if (!formData.name.trim()) {
        setNameError('Yêu cầu nhập tiện nghi');
        hasError = true;
    } else {
        setNameError('');
    }

    // Kiểm tra nhóm tiện nghi
    if (!formData.category) {
        setCategoryError('Yêu cầu chọn nhóm tiện nghi');
        hasError = true;
    } else {
        setCategoryError('');
    }

    // Kiểm tra phạm vi áp dụng
    if (!formData.amenity_scope) {
        setScopeError('Yêu cầu chọn phạm vi áp dụng');
        hasError = true;
    } else {
        setScopeError('');
    }

    // Nếu có lỗi thì không lưu
    if (hasError) return;

    // Giữ nguyên xử lý thêm và chỉnh sửa
    if (editingItem) {
        const success = await updateAmenity(editingItem.id, formData);
        if (success) setModalOpen(false);
    } else {
        const success = await addAmenity(formData);
        if (success) setModalOpen(false);
    }
};

const handleToggleStatus = async (item) => {
    const nextStatus = !item.is_active;

    await toggleAmenityStatus(item.id, nextStatus);
};

const handleToggleFeatured = async (item) => {
    const nextFeatured = !item.is_featured;

    try {
        const response = await apiFetch(`/amenities/${item.id}/featured`, {
            method: 'PATCH',
            body: JSON.stringify({
                is_featured: nextFeatured
            })
        });

        if (!response?.success) {
            throw new Error(
                response?.message || 'Không thể cập nhật tiện nghi nổi bật.'
            );
        }

        const listResponse = await apiFetch('/amenities');
        const amenitiesList = listResponse?.data?.amenitiesList || [];

        setAmenities(
            amenitiesList.map((item) => ({
                ...item,
                category: item.category_code,
                icon: item.icon_key || 'Sparkles',
                status: item.is_active ? 'Active' : 'Inactive',
                usage_count: Number(item.usage_count) || 0
            }))
        );

        showToast(
            nextFeatured
                ? 'Đã đánh dấu tiện nghi nổi bật.'
                : 'Đã bỏ đánh dấu tiện nghi nổi bật.',
            'success'
        );
    } catch (error) {
        console.error('Toggle featured error:', error);
        showToast(error.message || 'Không thể cập nhật tiện nghi nổi bật.', 'error');
    }
};


  const filteredAmenities = useMemo(() => {
    return amenities.filter((item) => {
        const keyword = searchTerm.trim().toLowerCase();

        const name = (item.name || '').toLowerCase();
        const description = (item.description || '').toLowerCase();

        // Lọc theo tên và mô tả
        const matchSearch =
            !keyword ||
            name.includes(keyword) ||
            description.includes(keyword);

        // Lọc theo nhóm tiện nghi
        const matchCat =
            !categoryFilter || item.category === categoryFilter;

        // Lọc theo phạm vi áp dụng
        const matchScope =
            !scopeFilter ||
            item.amenity_scope === scopeFilter ||
            item.amenity_scope === 'both';

        return matchSearch && matchCat && matchScope;
    })
    // Sắp xếp ID từ lớn đến bé
        .sort((a, b) => Number(b.id) - Number(a.id));
}, [amenities, searchTerm, categoryFilter, scopeFilter]);


  return (
    <div>
      <PageHeader
        title="Quản lý tiện nghi & Dịch vụ"
        description="Danh mục các dịch vụ chăm sóc khách hàng, trang thiết bị trong phòng, tiện ích chăm sóc sức khỏe và ẩm thực."
        actions={
          <button type="button" onClick={handleOpenCreate} className="btn btn-primary">
            <Plus size={15} /> Thêm tiện nghi
          </button>
        }
      />

      {/* Filter Toolbar */}
      <div className="filter-panel amenities-filter-panel">
        <div className="filter-group filter-group-wide">
          <label className="filter-label">Tìm kiếm tiện nghi</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="filter-input"
              style={{ width: '100%', paddingLeft: '28px' }}
              placeholder="Tìm theo tên tiện nghi hoặc mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '9px', color: '#6B7280' }} />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">Nhóm tiện nghi</label>
          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Tất cả các nhóm</option>
            {amenityCategories.map((category) => (
            <option key={category.code} value={category.code}>
            {category.name}
            </option>
        ))}
          </select>
        </div>

        <div className="filter-group">
            <label className="filter-label">Phạm vi áp dụng</label>

            <select
                className="filter-select"
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value)}
            >
                <option value="">Tất cả phạm vi</option>
                <option value="accommodation">Cơ sở lưu trú</option>
                <option value="room">Phòng</option>
            </select>
        </div>

        <div className="filter-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('');
              setScopeFilter('');
            }}
          >
            <RotateCcw size={13} /> Đặt lại
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table
            className="data-table amenities-table"
            style={{
                width: '100%',
                tableLayout: 'fixed'
            }}
        >
            <colgroup>
                <col style={{ width: '19%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '16%' }} />
            </colgroup>

            <thead>
              <tr>
                <th>Tên tiện nghi</th>
                <th>Nhóm tiện nghi</th>
                <th>Phạm vi áp dụng</th>
                <th>
                    <div className="amenity-description-content">
                        Mô tả chi tiết
                    </div>
                </th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
          <tbody>
            {filteredAmenities.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>
                  Không tìm thấy tiện nghi nào phù hợp với bộ lọc tìm kiếm.
                </td>
              </tr>
            ) : (
            filteredAmenities.map((item) => (
                <tr key={item.id}>
                    {/* ID */}

                    {/* Tên tiện nghi */}
                    <td style={{ fontWeight: 600, color: '#292D32' }}>
                        {item.name}
                    </td>

                    {/* Nhóm tiện nghi */}
                    <td>
                        <span className="badge badge-neutral">
                            {amenityCategories.find(
                                (category) => category.code === item.category
                            )?.name || item.category}
                        </span>
                    </td>

                    {/* Phạm vi áp dụng */}
                    <td>
                        <span className="badge badge-neutral">
                            {{
                                accommodation: 'Cơ sở lưu trú',
                                room: 'Phòng',
                                both: 'Cả 2'
                            }[item.amenity_scope] || 'Chưa xác định'}
                        </span>
                    </td>

                    {/* Mô tả chi tiết */}
                    <td>
                        <div className="amenity-description-content">
                            {item.description || ''}
                        </div>
                    </td>

                    {/* Trạng thái */}
                    <td>
                        <StatusBadge status={item.status} />
                    </td>

                    {/* Thao tác */}
                    <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center' }}>

                            {/* Nút chỉnh sửa */}
                            <button
                                type="button"
                                className="row-action-btn"
                                title="Chỉnh sửa tiện nghi"
                                onClick={() => handleOpenEdit(item)}
                            >
                                <Edit2 size={13} />
                            </button>

                            {/* Nút đánh dấu nổi bật */}
                            <button
                                type="button"
                                className={`row-action-btn amenity-featured-btn ${
                                    item.is_featured ? 'is-featured' : ''
                                }`}
                                title={item.is_featured ? 'Bỏ đánh dấu nổi bật' : 'Đánh dấu nổi bật'}
                                onClick={() => handleToggleFeatured(item)}
                                aria-label={item.is_featured ? 'Bỏ đánh dấu nổi bật' : 'Đánh dấu nổi bật'}
                                aria-pressed={Boolean(item.is_featured)}
                            >
                                <Star
                                    size={14}
                                    fill={item.is_featured ? 'currentColor' : 'none'}
                                />
                            </button>

                            {/* Nút ON/OFF */}
                            <button
                                type="button"
                                className={`amenity-toggle ${item.is_active ? 'is-on' : 'is-off'}`}
                                title={item.is_active ? 'Tắt tiện nghi' : 'Bật tiện nghi'}
                                onClick={() => handleToggleStatus(item)}
                                aria-label={item.is_active ? 'Tắt tiện nghi' : 'Bật tiện nghi'}
                                aria-pressed={Boolean(item.is_active)}
                            >
                                <span className="toggle-label">
                                    {item.is_active ? 'ON' : 'OFF'}
                                </span>

                                <span className="toggle-circle"></span>
                            </button>

                        </div>
                    </td>
                </tr>
            ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {editingItem ? `Chỉnh sửa tiện nghi: ${editingItem.name}` : 'Thêm tiện nghi hoặc dịch vụ mới'}
              </span>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <FormInput
                  label="Tên tiện nghi"
                  value={formData.name}
                  onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });

                  if (e.target.value.trim()) {
                  setNameError('');
                }
                }}
                  placeholder="Ví dụ: Bể bơi vô cực hướng biển, Bữa sáng buffet..."
                />

                {nameError && (
                    <p style={{
                        color: '#DC2626',
                        fontSize: '12px',
                        marginTop: '-10px',
                        marginBottom: '0'
                    }}>
                        {nameError}
                    </p>
                  )}

                  <FormSelect
                    label="Nhóm tiện nghi"
                    value={formData.category}
                    onChange={(e) => {
                        setFormData({
                            ...formData,
                            category: e.target.value
                        });

                        if (e.target.value) {
                            setCategoryError('');
                        }
                    }}
                    options={amenityCategories.map((category) => ({
                        value: category.code,
                        label: category.name
                    }))}
                    placeholder="Select option..."
                />

                {categoryError && (
                    <p style={{
                        color: '#DC2626',
                        fontSize: '12px',
                        marginTop: '-10px',
                        marginBottom: '0'
                    }}>
                        {categoryError}
                    </p>
                )}

                  <FormSelect
                    label="Phạm vi áp dụng"
                    value={formData.amenity_scope}
                    onChange={(e) => {
                        setFormData({
                            ...formData,
                            amenity_scope: e.target.value
                        });

                        if (e.target.value) {
                            setScopeError('');
                        }
                    }}
                    options={[
                        { value: 'accommodation', label: 'Cơ sở lưu trú' },
                        { value: 'room', label: 'Phòng' },
                        { value: 'both', label: 'Cả 2' }
                    ]}
                    placeholder="Select option..."
                />
                {scopeError && (
                      <p style={{
                          color: '#DC2626',
                          fontSize: '12px',
                          marginTop: '-10px',
                          marginBottom: '0'
                      }}>
                          {scopeError}
                      </p>
                  )}

                  <FormSelect
                    label="Trạng thái"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    options={[
                      { value: 'Active', label: 'Đang hoạt động' },
                      { value: 'Inactive', label: 'Ngừng hoạt động' }
                    ]}
                  />

                  <FormInput
                      label="Icon Key"
                      value={formData.icon}
                      onChange={(e) =>
                          setFormData({
                              ...formData,
                              icon: e.target.value
                          })
                      }
                      placeholder="Ví dụ: Wifi, Sparkles, Car, Waves..."
                  />

                  <FormTextarea
                    label="Mô tả chi tiết"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Mô tả các thông số kỹ thuật, quy định phục vụ và tiêu chuẩn chất lượng..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={14} /> {editingItem ? 'Lưu thay đổi' : 'Thêm tiện nghi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
