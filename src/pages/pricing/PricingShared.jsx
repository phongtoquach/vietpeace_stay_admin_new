import { NavLink, useSearchParams } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { pricingPath } from './pricingUtils';
import './pricing.css';
export function PricingHeader({
  title,
  children
}) {
  const [params] = useSearchParams();
  const path = target => target === '/admin/pricing-history' ? target : pricingPath(target, params.get('accId'));
  return <><div className="pricing-heading"><div><h1>{title}</h1></div>{children}</div><nav className="pricing-tabs" aria-label="Quản lý giá"><NavLink to={path('/admin/room-availability')}>Lịch giá & phòng trống</NavLink><NavLink to={path('/admin/room-rates')}>Thiết lập giá</NavLink><NavLink to={path('/admin/rate-periods')}>Kỳ giá đặc biệt</NavLink><NavLink to={path('/admin/pricing-history')}>Lịch sử thay đổi</NavLink><NavLink to={path('/admin/pricing-proposals')}>Đề xuất giá</NavLink></nav></>;
}
export function Message({
  error,
  success
}) {
  return <div aria-live="polite">{error && <div className="pricing-message error" role="alert">{error}</div>}{success && <div className="pricing-message success">{success}</div>}</div>;
}
export function Modal({
  title,
  onClose,
  children,
  wide = false
}) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('button')?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  function keys(e) {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Tab') {
      const items = [...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')];
      const first = items[0],
        last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }
  return <div className="pricing-overlay" onClick={e => {
    if (e.target === e.currentTarget) onClose();
  }}><section ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`pricing-dialog ${wide ? 'wide' : ''}`} onKeyDown={keys}><header><h2>{title}</h2><button className="btn btn-secondary" type="button" aria-label="Đóng" onClick={onClose}>✕</button></header>{children}</section></div>;
}
