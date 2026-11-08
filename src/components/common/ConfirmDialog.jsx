import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title = "Xác nhận thao tác",
  message = "Bạn có chắc chắn muốn tiếp tục thực hiện thao tác này?",
  confirmLabel = "Xóa",
  cancelLabel = "Hủy",
  confirmVariant = "danger",
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {confirmVariant === 'danger' && <AlertTriangle size={18} color="#C0392B" />}
            <span className="modal-title">{title}</span>
          </div>
          <button className="modal-close" onClick={onCancel} aria-label="Đóng" title="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '13.5px', color: '#292D32' }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`btn ${confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
