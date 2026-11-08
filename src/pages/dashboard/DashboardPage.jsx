import React from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import {
  RevenueLineChart,
  SimpleBarChart,
  DoughnutChart
} from '../../components/common/Charts.jsx';
import {
  formatVND,
  formatDateVN,
  MONTHLY_REVENUE_DATA,
  BOOKING_STATUS_STATS
} from '../../data/mockData.js';
import {
  CalendarCheck,
  Clock,
  LogOut as CheckOutIcon,
  AlertCircle,
  Users,
  Coins,
  BedDouble,
  CheckCircle2,
  Eye,
  Plus,
  ArrowRight
} from 'lucide-react';

export default function DashboardPage() {
  const { bookings, accommodations, customers } = useAdmin();

  // Calculate live summary stats from context
  const totalBookingsCount = bookings.length;
  const pendingBookingsCount = bookings.filter((b) => b.booking_status === 'Pending').length;
  const checkinsTodayCount = bookings.filter((b) => b.booking_status === 'Checked-in' || b.checkin_date === '2026-10-01').length;
  const checkoutsTodayCount = bookings.filter((b) => b.checkout_date === '2026-10-01').length;
  const totalCustomersCount = customers.length;
  const monthlyRevenue = bookings
    .filter((b) => b.payment_status === 'Paid')
    .reduce((acc, cur) => acc + cur.total_amount, 0);

  // Room status estimation across active properties
  const totalRoomsEstimate = 120;
  const occupiedRoomsEstimate = 88;
  const availableRoomsEstimate = totalRoomsEstimate - occupiedRoomsEstimate;

  const recentBookings = [...bookings].reverse().slice(0, 5);
  const upcomingCheckins = bookings.filter(
    (b) => b.booking_status === 'Confirmed' || b.booking_status === 'Checked-in'
  ).slice(0, 4);

  return (
    <div>
      <PageHeader
        title="Tổng quan hoạt động lưu trú"
        description="Thống kê công suất phòng, hiệu suất doanh thu và giám sát lượt khách đến trên toàn hệ thống VietPeace Stay."
        breadcrumb={[
          { label: 'Tổng quan' }
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/admin/bookings" className="btn btn-secondary btn-sm">
              Xem tất cả đặt phòng
            </Link>
            <Link to="/admin/accommodations/create" className="btn btn-primary btn-sm">
              <Plus size={14} /> Thêm cơ sở lưu trú
            </Link>
          </div>
        }
      />

      {/* Summary Stat Cards Grid */}
      <div className="stat-cards-grid">
        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Tổng đơn đặt phòng</span>
            <span className="stat-card-value tabular-nums">{totalBookingsCount}</span>
            <span className="stat-card-sub">Đơn đặt phòng toàn hệ thống</span>
          </div>
          <div className="stat-card-icon">
            <CalendarCheck size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Nhận phòng hôm nay</span>
            <span className="stat-card-value tabular-nums">{checkinsTodayCount}</span>
            <span className="stat-card-sub" style={{ color: '#287A4B' }}>Lượt khách dự kiến đến</span>
          </div>
          <div className="stat-card-icon" style={{ backgroundColor: '#EAF5EE', borderColor: '#BAE2C8', color: '#287A4B' }}>
            <Clock size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Trả phòng hôm nay</span>
            <span className="stat-card-value tabular-nums">{checkoutsTodayCount}</span>
            <span className="stat-card-sub">Lượt khách trả phòng</span>
          </div>
          <div className="stat-card-icon" style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', color: '#1E6091' }}>
            <CheckOutIcon size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Đặt phòng chờ duyệt</span>
            <span className="stat-card-value tabular-nums" style={{ color: '#A66A00' }}>{pendingBookingsCount}</span>
            <span className="stat-card-sub">Chờ xác nhận từ lễ tân</span>
          </div>
          <div className="stat-card-icon" style={{ backgroundColor: '#FEF8E7', borderColor: '#F8DF9E', color: '#A66A00' }}>
            <AlertCircle size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Tổng khách hàng</span>
            <span className="stat-card-value tabular-nums">{totalCustomersCount}</span>
            <span className="stat-card-sub">Hồ sơ khách đã đăng ký</span>
          </div>
          <div className="stat-card-icon">
            <Users size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Doanh thu tháng (VNĐ)</span>
            <span className="stat-card-value tabular-nums" style={{ fontSize: '16.5px' }}>
              {formatVND(monthlyRevenue)}
            </span>
            <span className="stat-card-sub">Doanh thu thực thu kỳ này</span>
          </div>
          <div className="stat-card-icon">
            <Coins size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Phòng đang có khách</span>
            <span className="stat-card-value tabular-nums">{occupiedRoomsEstimate}</span>
            <span className="stat-card-sub">73.3% công suất toàn chuỗi</span>
          </div>
          <div className="stat-card-icon" style={{ backgroundColor: '#FEF8E7', borderColor: '#F8DF9E', color: '#A66A00' }}>
            <BedDouble size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Phòng còn trống</span>
            <span className="stat-card-value tabular-nums">{availableRoomsEstimate}</span>
            <span className="stat-card-sub">Sẵn sàng nhận khách</span>
          </div>
          <div className="stat-card-icon" style={{ backgroundColor: '#EAF5EE', borderColor: '#BAE2C8', color: '#287A4B' }}>
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="charts-grid">
        {/* Monthly Revenue Chart */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Hiệu suất doanh thu hàng tháng (VNĐ)</div>
            <span style={{ fontSize: '11.5px', color: '#6B7280' }}>Thg 1 – Thg 9 2026</span>
          </div>
          <div className="admin-card-body">
            <RevenueLineChart data={MONTHLY_REVENUE_DATA} />
          </div>
        </div>

        {/* Booking Status Doughnut */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Phân bổ trạng thái đặt phòng</div>
            <span style={{ fontSize: '11.5px', color: '#6B7280' }}>Toàn bộ cơ sở lưu trú</span>
          </div>
          <div className="admin-card-body">
            <DoughnutChart data={BOOKING_STATUS_STATS} />
          </div>
        </div>
      </div>

      {/* Secondary Charts Row: Monthly Volume & Occupancy Rate */}
      <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Khối lượng đặt phòng hàng tháng</div>
            <span style={{ fontSize: '11.5px', color: '#6B7280' }}>Số đơn đã hoàn tất</span>
          </div>
          <div className="admin-card-body">
            <SimpleBarChart data={MONTHLY_REVENUE_DATA} valueKey="bookings" unit=" đơn" color="#F4C542" />
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Tỷ lệ công suất phòng bình quân (%)</div>
            <span style={{ fontSize: '11.5px', color: '#6B7280' }}>Tỷ lệ lấp đầy toàn chuỗi</span>
          </div>
          <div className="admin-card-body">
            <SimpleBarChart data={MONTHLY_REVENUE_DATA} valueKey="occupancy" unit="%" color="#60A5FA" />
          </div>
        </div>
      </div>

      {/* Tables Row: Recent Bookings & Upcoming Check-ins */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Recent Bookings Table */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Giao dịch đặt phòng gần đây</div>
            <Link to="/admin/bookings" style={{ fontSize: '12px', color: '#8C5A00', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Xem tất cả <ArrowRight size={12} />
            </Link>
          </div>
          <div className="table-responsive" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Cơ sở lưu trú</th>
                  <th>Thời gian</th>
                  <th style={{ textAlign: 'right' }}>Tổng tiền (VNĐ)</th>
                  <th>Trạng thái</th>
                  <th>Thanh toán</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link
                        to={`/admin/bookings/${b.id}`}
                        style={{ fontWeight: 600, color: '#292D32', textDecoration: 'underline' }}
                        className="tabular-nums"
                      >
                        {b.code}
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{b.customer_name}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>{b.customer_phone}</div>
                    </td>
                    <td style={{ maxWidth: '170px' }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={b.accommodation_name}>
                        {b.accommodation_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>{b.room_type_name}</div>
                    </td>
                    <td className="tabular-nums" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {formatDateVN(b.checkin_date)} <br />
                      <span style={{ color: '#6B7280' }}>đến {formatDateVN(b.checkout_date)}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                      {formatVND(b.total_amount)}
                    </td>
                    <td>
                      <StatusBadge status={b.booking_status} />
                    </td>
                    <td>
                      <StatusBadge status={b.payment_status} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Link
                        to={`/admin/bookings/${b.id}`}
                        className="row-action-btn"
                        title="Xem chi tiết đặt phòng"
                        aria-label={`Xem chi tiết đơn ${b.code}`}
                      >
                        <Eye size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Check-ins Section */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Khách sắp nhận phòng</div>
            <span className="badge badge-info">Lễ tân</span>
          </div>
          <div style={{ padding: '12px 16px' }}>
            {upcomingCheckins.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '10px 0',
                  borderBottom: '1px solid #F3F4F6',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#292D32' }}>
                    {item.customer_name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '2px' }}>
                    {item.accommodation_name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>
                    {item.room_type_name} · {item.adults_count} người lớn
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#287A4B' }} className="tabular-nums">
                    {formatDateVN(item.checkin_date)}
                  </div>
                  <span style={{ marginTop: '4px', display: 'inline-block' }}>
                    <StatusBadge status={item.booking_status} />
                  </span>
                </div>
              </div>
            ))}

            <div style={{ marginTop: '14px', textAlign: 'center' }}>
              <Link
                to="/admin/bookings?view=today"
                className="btn btn-secondary btn-sm"
                style={{ width: '100%' }}
              >
                Mở danh sách lễ tân trong ngày
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
