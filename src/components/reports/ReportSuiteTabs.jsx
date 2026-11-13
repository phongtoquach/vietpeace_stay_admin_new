import { Link, useLocation } from 'react-router-dom';
import { BarChart3, CalendarCheck, BedDouble } from 'lucide-react';

export default function ReportSuiteTabs() {
  const { pathname } = useLocation();
  const isRevenue = pathname.startsWith('/admin/reports/revenue');
  const isBookings = pathname.startsWith('/admin/reports/bookings');
  const isOccupancy = pathname.startsWith('/admin/reports/occupancy');

  return (
    <nav className="fin-hub-pills" aria-label="Nhóm báo cáo phân tích">
      <Link to="/admin/reports/revenue" className={`fin-hub-pill ${isRevenue ? 'active' : ''}`}>
        <BarChart3 size={15} aria-hidden="true" />
        <span>Tài chính &amp; P&amp;L</span>
      </Link>
      <Link to="/admin/reports/bookings" className={`fin-hub-pill ${isBookings ? 'active' : ''}`}>
        <CalendarCheck size={15} aria-hidden="true" />
        <span>Đặt phòng</span>
      </Link>
      <Link to="/admin/reports/occupancy" className={`fin-hub-pill ${isOccupancy ? 'active' : ''}`}>
        <BedDouble size={15} aria-hidden="true" />
        <span>Công suất phòng</span>
      </Link>
    </nav>
  );
}
