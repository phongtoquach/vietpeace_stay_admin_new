import React from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function NotificationToast() {
  const { toasts, removeToast } = useAdmin();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-live="polite">
      {toasts.map((toast) => {
        let Icon = CheckCircle;
        let iconColor = '#287A4B';

        if (toast.type === 'error') {
          Icon = AlertCircle;
          iconColor = '#C0392B';
        } else if (toast.type === 'warning') {
          Icon = AlertCircle;
          iconColor = '#A66A00';
        } else if (toast.type === 'info') {
          Icon = Info;
          iconColor = '#1E6091';
        }

        return (
          <div key={toast.id} className={`toast toast-${toast.type || 'success'}`}>
            <Icon size={18} color={iconColor} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, color: '#292D32' }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ color: '#6B7280', padding: '2px', display: 'flex' }}
              aria-label="Dismiss toast"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
