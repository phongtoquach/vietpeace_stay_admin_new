import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import FormInput from '../../components/forms/FormInput.jsx';
import FormSelect from '../../components/forms/FormSelect.jsx';
import FormTextarea from '../../components/forms/FormTextarea.jsx';
import { formatVND, formatDateVN } from '../../data/mockData.js';
import { Plus, Edit2, Trash2, X, Save, Tag } from 'lucide-react';

export default function PromotionsPage() {
  const { promotions, accommodations, addPromotion, updatePromotion, deletePromotion } = useAdmin();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    discount_type: 'Percentage',
    discount_value: 10,
    min_booking_amount: 1000000,
    max_discount: 500000,
    start_date: '2026-10-01',
    end_date: '2026-12-31',
    applicable_accommodations: [],
    usage_limit: 100,
    status: 'Active'
  });

  const handleOpenCreate = () => {
    setEditingPromo(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      discount_type: 'Percentage',
      discount_value: 15,
      min_booking_amount: 2000000,
      max_discount: 1000000,
      start_date: '2026-10-01',
      end_date: '2026-12-31',
      applicable_accommodations: [],
      usage_limit: 100,
      status: 'Active'
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (promo) => {
    setEditingPromo(promo);
    setFormData({
      name: promo.name,
      code: promo.code,
      description: promo.description,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      min_booking_amount: promo.min_booking_amount,
      max_discount: promo.max_discount,
      start_date: promo.start_date,
      end_date: promo.end_date,
      applicable_accommodations: promo.applicable_accommodations || [],
      usage_limit: promo.usage_limit || 100,
      status: promo.status
    });
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) return;

    const payload = {
      ...formData,
      discount_value: Number(formData.discount_value),
      min_booking_amount: Number(formData.min_booking_amount),
      max_discount: Number(formData.max_discount),
      usage_limit: Number(formData.usage_limit)
    };

    if (editingPromo) {
      updatePromotion(editingPromo.id, payload);
    } else {
      addPromotion(payload);
    }
    setModalOpen(false);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deletePromotion(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Khuyến mãi & Mã giảm giá"
        description="Cấu hình chiến dịch ưu đãi, mã giảm giá voucher, tỷ lệ chiết khấu và giá trị đơn đặt phòng tối thiểu áp dụng."
        actions={
          <button type="button" onClick={handleOpenCreate} className="btn btn-primary">
            <Plus size={15} /> Thêm chương trình khuyến mãi
          </button>
        }
      />

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>ID</th>
              <th>Tên chương trình</th>
              <th>Mã khuyến mãi</th>
              <th>Mức giảm giá</th>
              <th>Đơn tối thiểu / Giảm tối đa</th>
              <th>Thời gian hiệu lực</th>
              <th style={{ textAlign: 'center' }}>Lượt sử dụng</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: 'center', width: '90px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((promo) => (
              <tr key={promo.id}>
                <td className="code-badge">#{promo.id}</td>
                <td>
                  <div style={{ fontWeight: 600, color: '#292D32' }}>{promo.name}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>{promo.description}</div>
                </td>
                <td>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      backgroundColor: '#FFF5D6',
                      padding: '2px 7px',
                      borderRadius: '3px',
                      border: '1px solid #EED48C',
                      color: '#8C5A00',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {promo.code}
                  </span>
                </td>
                <td>
                  <strong style={{ color: '#287A4B' }}>
                    {promo.discount_type === 'Percentage'
                      ? `Giảm ${promo.discount_value}%`
                      : `Giảm ${formatVND(promo.discount_value)}`}
                  </strong>
                </td>
                <td style={{ fontSize: '12px' }} className="tabular-nums">
                  <div>Tối thiểu: {formatVND(promo.min_booking_amount)}</div>
                  <div style={{ color: '#6B7280' }}>Tối đa: {formatVND(promo.max_discount)}</div>
                </td>
                <td className="tabular-nums" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                  {formatDateVN(promo.start_date)} <br />
                  <span style={{ color: '#6B7280' }}>đến {formatDateVN(promo.end_date)}</span>
                </td>
                <td style={{ textAlign: 'center' }} className="tabular-nums">
                  <span style={{ fontWeight: 600 }}>{promo.times_used || 0}</span> / {promo.usage_limit}
                </td>
                <td>
                  <StatusBadge status={promo.status} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="row-action-btn"
                      title="Chỉnh sửa khuyến mãi"
                      onClick={() => handleOpenEdit(promo)}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      className="row-action-btn delete"
                      title="Xóa khuyến mãi"
                      onClick={() => setDeleteTarget(promo)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <span className="modal-title">
                {editingPromo ? `Chỉnh sửa khuyến mãi: ${editingPromo.code}` : 'Tạo chiến dịch khuyến mãi mới'}
              </span>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <FormInput
                      label="Tên chương trình khuyến mãi"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ví dụ: Ưu đãi mùa thu, Chào hè rực rỡ..."
                      required
                    />

                    <FormInput
                      label="Mã voucher khuyến mãi"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="Ví dụ: VIETPEACE2027"
                      required
                      helperText="Chỉ nhập ký tự in hoa và chữ số."
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <FormSelect
                      label="Hình thức giảm giá"
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                      options={[
                        { value: 'Percentage', label: 'Theo phần trăm (%)' },
                        { value: 'Fixed Amount', label: 'Số tiền cố định (VNĐ)' }
                      ]}
                      required
                    />

                    <FormInput
                      label={formData.discount_type === 'Percentage' ? 'Tỷ lệ giảm giá (%)' : 'Số tiền giảm giá (VNĐ)'}
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <FormInput
                      label="Giá trị đặt phòng tối thiểu (VNĐ)"
                      type="number"
                      step="50000"
                      value={formData.min_booking_amount}
                      onChange={(e) => setFormData({ ...formData, min_booking_amount: e.target.value })}
                    />

                    <FormInput
                      label="Mức giảm tối đa (VNĐ)"
                      type="number"
                      step="50000"
                      value={formData.max_discount}
                      onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <FormInput
                      label="Ngày bắt đầu hiệu lực"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />

                    <FormInput
                      label="Ngày kết thúc hiệu lực"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <FormInput
                      label="Giới hạn số lượt dùng"
                      type="number"
                      min="1"
                      value={formData.usage_limit}
                      onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                      required
                    />

                    <FormSelect
                      label="Trạng thái"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      options={[
                        { value: 'Active', label: 'Đang hoạt động' },
                        { value: 'Inactive', label: 'Ngừng hoạt động' }
                      ]}
                    />
                  </div>

                  <FormTextarea
                    label="Mô tả & Điều kiện áp dụng"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    placeholder="Điều kiện dành cho khách đặt phòng, ngày loại trừ hoặc lưu ý đặc biệt..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={14} /> {editingPromo ? 'Lưu thay đổi' : 'Tạo khuyến mãi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Xóa mã khuyến mãi"
        message={`Bạn có chắc chắn muốn ngừng kích hoạt và xóa khuyến mãi "${deleteTarget?.name}" (${deleteTarget?.code})?`}
        confirmLabel="Xác nhận xóa"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
