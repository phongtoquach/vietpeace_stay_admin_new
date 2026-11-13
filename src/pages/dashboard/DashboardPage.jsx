import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import {
  RevenueLineChart,
  SimpleBarChart,
  DoughnutChart
} from '../../components/common/Charts.jsx';
import { formatVND, formatDateVN } from '../../data/mockData.js';
import { dashboardApi } from '../../api/dashboard.js';
import { financialReportsApi, formatCompactVND } from '../../api/financialReports.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  CalendarCheck,
  Clock,
  LogOut as CheckOutIcon,
  AlertCircle,
  BedDouble,
  Coins,
  Eye,
  ArrowRight,
  BarChart3,
  AlertTriangle
} from 'lucide-react';

const PAYMENT_STATUS_LABEL = {
  PENDING: 'Chờ thanh toán',
  PROCESSING: 'Đang xử lý',
  SUCCESS: 'Đã thanh toán',
  FAILED: 'Thất bại',
  CANCELLED: 'Đã hủy',
  REFUND_PENDING: 'Chờ hoàn tiền',
  REFUND_PROCESSING: 'Đang hoàn tiền',
  REFUNDED: 'Đã hoàn tiền',
  PARTIALLY_REFUNDED: 'Hoàn tiền một phần'
};

const EMPTY_STATS = {
  totalBookings: 0,
  pendingBookings: 0,
  checkinsToday: 0,
  checkoutsToday: 0,
  totalCustomers: 0,
  monthlyRevenue: 0,
  occupiedRooms: 0,
  totalRooms: 0,
  availableRooms: 0
};

const STATUS_META = {
  PENDING: { label: 'Chờ xử lý', color: '#A66A00' },
  PAYMENT_PROCESSING: { label: 'Đang thanh toán', color: '#1E6091' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#287A4B' },
  EXPIRED: { label: 'Hết hạn', color: '#9CA3AF' },
  CANCELLED: { label: 'Đã hủy', color: '#C0392B' },
  FAILED: { label: 'Thất bại', color: '#7F1D1D' }
};

export default function DashboardPage() {
  const { currentLoggedInUser, hasPermission } = useAuth();
  const isAdmin = currentLoggedInUser?.role === 'ADMIN';
  const canViewReports = isAdmin || hasPermission('reports.view');

  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [finOverview, setFinOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const currentYear = new Date().getFullYear();

    Promise.all([
      dashboardApi.getSummary(),
      dashboardApi.getCharts(),
      canViewReports
        ? financialReportsApi.getOverview({ year: currentYear, periodType: 'YEAR' }).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([summaryData, chartsData, finData]) => {
        if (!cancelled) {
          setSummary(summaryData);
          setCharts(chartsData);
          setFinOverview(finData);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey, canViewReports]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  };

  const stats = summary?.stats || EMPTY_STATS;
  const recentBookings = summary?.recentBookings || [];
  const upcomingCheckins = summary?.upcomingCheckins || [];
  const occupancyRate = stats.totalRooms > 0
    ? ((stats.occupiedRooms / stats.totalRooms) * 100).toFixed(1)
    : '0.0';

  const monthLabels = Array.from({ length: 12 }, (_, index) => `Thg ${index + 1}`);
  const revenueChartData = charts
    ? monthLabels.map((label, index) => ({ month: label, revenue: charts.monthlyRevenue[index] || 0 }))
    : [];
  const volumeChartData = charts
    ? monthLabels.map((label, index) => ({ month: label, bookings: charts.monthlyBookings[index] || 0 }))
    : [];
  const occupancyChartData = charts
    ? monthLabels.map((label, index) => ({ month: label, occupancy: charts.monthlyOccupancy[index] || 0 }))
    : [];

  const statusTotal = (charts?.statusDistribution || [])
    .reduce((acc, item) => acc + item.count, 0);
  const statusChartData = (charts?.statusDistribution || [])
    .filter((item) => item.count > 0)
    .map((item) => ({
      status: STATUS_META[item.status]?.label || item.status,
      count: item.count,
      percentage: statusTotal > 0 ? Math.round((item.count / statusTotal) * 100) : 0,
      color: STATUS_META[item.status]?.color || '#9CA3AF'
    }));

  const hasRevenueData = Boolean(charts?.monthlyRevenue.some((value) => value > 0));
  const hasVolumeData = Boolean(charts?.monthlyBookings.some((value) => value > 0));
  const hasOccupancyData = Boolean(charts?.monthlyOccupancy.some((value) => value > 0));

  const displayValue = (value) => (loading ? '…' : value);

  const finSummary = finOverview?.summary || null;
  const activeFinYear = finOverview?.period?.year || new Date().getFullYear();

  return (
    <div className="dashboard-modern">
      <PageHeader title="Tổng quan hoạt động kinh doanh" />

      {error && (
        <div
          className="admin-card"
          style={{
            padding: '12px 16px',
            marginBottom: '12px',
            borderColor: '#F0C0C0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <span style={{ fontSize: '13px', color: '#B42318' }}>
            Không tải được dữ liệu tổng quan: {error.message}
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleRetry}>
            Thử lại
          </button>
        </div>
      )}

      {/* 4 Hero KPI Cards (1 hàng cân đối, tối giản) */}
      <section className="dash-kpi-grid" aria-label="Chỉ số tổng quan chính">
        <div className="dash-kpi-card">
          <div className="dash-kpi-head">
            <span className="dash-kpi-label">
              {canViewReports && finSummary ? `Tổng nguồn thu ${activeFinYear}` : 'Doanh thu kỳ này'}
            </span>
            <span className="dash-kpi-icon" style={{ background: '#EFF6FF', color: '#0284C7' }}>
              <Coins size={17} />
            </span>
          </div>
          <div className="dash-kpi-value tabular-nums" style={{ color: '#0369A1' }}>
            {loading
              ? '…'
              : canViewReports && finSummary
                ? formatCompactVND(finSummary.totalNetRevenue)
                : formatCompactVND(stats.monthlyRevenue)}
          </div>
          <div className="dash-kpi-sub">
            {canViewReports && finSummary ? (
              <>
                LN sau thuế{' '}
                <strong style={{ color: finSummary.totalNetProfitAfterTax < 0 ? '#DC2626' : '#15803D' }}>
                  {formatCompactVND(finSummary.totalNetProfitAfterTax)}
                </strong>
                {' · '}
                OPEX {formatCompactVND(finSummary.totalOperatingExpenses)}
              </>
            ) : (
              `Thực thu: ${formatVND(stats.monthlyRevenue)}`
            )}
          </div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-head">
            <span className="dash-kpi-label">Tổng đơn đặt phòng</span>
            <span className="dash-kpi-icon" style={{ background: '#FFFBEB', color: '#B45309' }}>
              <CalendarCheck size={17} />
            </span>
          </div>
          <div className="dash-kpi-value tabular-nums">{displayValue(stats.totalBookings)}</div>
          <div className="dash-kpi-sub">
            {displayValue(stats.totalCustomers)} khách hàng đã đặt · {displayValue(stats.pendingBookings)} chờ duyệt
          </div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-head">
            <span className="dash-kpi-label">Công suất phòng hôm nay</span>
            <span className="dash-kpi-icon" style={{ background: '#ECFDF5', color: '#15803D' }}>
              <BedDouble size={17} />
            </span>
          </div>
          <div>
            <div className="dash-kpi-value tabular-nums" style={{ color: '#15803D' }}>
              {loading ? '…' : `${occupancyRate}%`}
            </div>
            <div className="dash-progress-track" aria-hidden="true">
              <div
                className="dash-progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, Number(occupancyRate) || 0))}%` }}
              />
            </div>
          </div>
          <div className="dash-kpi-sub">
            {displayValue(stats.occupiedRooms)} có khách · {displayValue(stats.availableRooms)} trống / {displayValue(stats.totalRooms)} phòng
          </div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-head">
            <span className="dash-kpi-label">
              {canViewReports && finSummary ? `Sức khỏe cơ sở (${activeFinYear})` : 'Vận hành trong ngày'}
            </span>
            <span
              className="dash-kpi-icon"
              style={
                canViewReports && finSummary?.warningCount > 0
                  ? { background: '#FEF2F2', color: '#DC2626' }
                  : { background: '#F0FDF4', color: '#15803D' }
              }
            >
              <AlertTriangle size={17} />
            </span>
          </div>
          <div
            className="dash-kpi-value tabular-nums"
            style={{
              fontSize: canViewReports && finSummary ? '20px' : '22px',
              color: canViewReports && finSummary?.warningCount > 0 ? '#DC2626' : '#111827',
            }}
          >
            {loading
              ? '…'
              : canViewReports && finSummary
                ? `${finSummary.negativeCount} âm · ${finSummary.lowOrZeroCount} lãi mỏng`
                : `${stats.checkinsToday + stats.checkoutsToday} lượt`}
          </div>
          <div className="dash-kpi-sub">
            {canViewReports && finSummary ? (
              <>
                {finSummary.profitableCount}/{finSummary.propertyCount} cơ sở có lãi · Quỹ thưởng {formatCompactVND(finSummary.estimatedTopBonusPool)}
              </>
            ) : (
              `Nhận phòng ${stats.checkinsToday} · Trả phòng ${stats.checkoutsToday}`
            )}
          </div>
        </div>
      </section>

      {/* Thanh Vận hành hôm nay & Truy cập nhanh Báo cáo (1 dòng gọn) */}
      <section className="dash-ops-strip" aria-label="Vận hành hôm nay và Báo cáo nhanh">
        <div className="dash-ops-group">
          <span className="dash-ops-chip">
            <Clock size={13} style={{ color: '#16A34A' }} />
            <span>Nhận phòng hôm nay:</span>
            <strong className="tabular-nums">{displayValue(stats.checkinsToday)}</strong>
          </span>
          <span className="dash-ops-chip">
            <CheckOutIcon size={13} style={{ color: '#0284C7' }} />
            <span>Trả phòng hôm nay:</span>
            <strong className="tabular-nums">{displayValue(stats.checkoutsToday)}</strong>
          </span>
          <Link to="/admin/bookings?status=PENDING" className="dash-ops-chip" style={{ textDecoration: 'none' }}>
            <AlertCircle size={13} style={{ color: stats.pendingBookings > 0 ? '#D97706' : '#6B7280' }} />
            <span>Chờ duyệt:</span>
            <strong className="tabular-nums" style={{ color: stats.pendingBookings > 0 ? '#B45309' : '#111827' }}>
              {displayValue(stats.pendingBookings)}
            </strong>
          </Link>
        </div>

        {canViewReports && (
          <nav className="dash-ops-group" aria-label="Báo cáo chuyên sâu">
            <Link to="/admin/reports/revenue" className="dash-ops-link primary">
              <BarChart3 size={13} /> Thu – Chi (P&amp;L) <ArrowRight size={12} />
            </Link>
            {isAdmin && (
              <Link to="/admin/reports/revenue?tab=bonus" className="dash-ops-link">
                Top 3 &amp; Cảnh báo
              </Link>
            )}
            <Link to="/admin/reports/revenue?tab=tet" className="dash-ops-link">
              Lương T13
            </Link>
            <Link to="/admin/reports/bookings" className="dash-ops-link">
              Đặt phòng
            </Link>
            <Link to="/admin/reports/occupancy" className="dash-ops-link">
              Công suất phòng
            </Link>
          </nav>
        )}
      </section>

      {/* Primary Analytics Charts Row */}
      <div className="charts-grid">
        {/* Monthly Revenue Chart */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Hiệu suất doanh thu hàng tháng (VNĐ)</div>
            <span style={{ fontSize: '11.5px', color: '#6B7280' }}>Thg 1 – Thg 12 {charts?.year || ''}</span>
          </div>
          <div className="admin-card-body">
            {loading ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280' }}>Đang tải dữ liệu...</div>
            ) : (
              <RevenueLineChart data={hasRevenueData ? revenueChartData : []} year={charts?.year} />
            )}
          </div>
        </div>

        {/* Booking Status Doughnut */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Phân bổ trạng thái đặt phòng</div>
            <span style={{ fontSize: '11.5px', color: '#6B7280' }}>Trong phạm vi quản lý</span>
          </div>
          <div className="admin-card-body">
            {loading ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280' }}>Đang tải dữ liệu...</div>
            ) : statusChartData.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280' }}>Chưa có dữ liệu trạng thái.</div>
            ) : (
              <DoughnutChart data={statusChartData} />
            )}
          </div>
        </div>
      </div>

      {/* Secondary Charts Row: Monthly Volume & Occupancy Rate */}
      <div className="dash-charts-half">
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Khối lượng đặt phòng hàng tháng</div>
            <span style={{ fontSize: '11.5px', color: '#6B7280' }}>Số đơn theo tháng</span>
          </div>
          <div className="admin-card-body">
            {loading ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280' }}>Đang tải dữ liệu...</div>
            ) : (
              <SimpleBarChart data={hasVolumeData ? volumeChartData : []} valueKey="bookings" unit=" đơn" color="#F4C542" />
            )}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Tỷ lệ công suất phòng bình quân (%)</div>
            <span style={{ fontSize: '11.5px', color: '#6B7280' }}>Tỷ lệ lấp đầy</span>
          </div>
          <div className="admin-card-body">
            {loading ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280' }}>Đang tải dữ liệu...</div>
            ) : (
              <SimpleBarChart data={hasOccupancyData ? occupancyChartData : []} valueKey="occupancy" unit="%" color="#60A5FA" />
            )}
          </div>
        </div>
      </div>

      {/* Tables Row: Recent Bookings & Upcoming Check-ins */}
      <div className="dash-tables-split">
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
                {loading && (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px 16px', textAlign: 'center', color: '#6B7280' }}>
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                )}
                {!loading && recentBookings.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px 16px', textAlign: 'center', color: '#6B7280' }}>
                      Chưa có đơn đặt phòng nào.
                    </td>
                  </tr>
                )}
                {!loading && recentBookings.map((b) => (
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
                      <div style={{ fontWeight: 500 }}>{b.customerName}</div>
                    </td>
                    <td style={{ maxWidth: '170px' }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={b.accommodationName}>
                        {b.accommodationName}
                      </div>
                    </td>
                    <td className="tabular-nums" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {formatDateVN(b.checkInDate)} <br />
                      <span style={{ color: '#6B7280' }}>đến {formatDateVN(b.checkOutDate)}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                      {formatVND(b.totalAmount)}
                    </td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td style={{ fontSize: '12px', color: '#6B7280' }}>
                      {PAYMENT_STATUS_LABEL[b.paymentStatus] || '—'}
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
            {loading && (
              <div style={{ padding: '16px 0', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                Đang tải dữ liệu...
              </div>
            )}

            {!loading && upcomingCheckins.length === 0 && (
              <div style={{ padding: '16px 0', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                Chưa có khách sắp nhận phòng.
              </div>
            )}

            {!loading && upcomingCheckins.map((item) => (
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
                    {item.customerName}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '2px' }}>
                    {item.accommodationName}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>
                    {item.roomTypeNames.join(', ') || '—'} · {item.adultsCount} người lớn
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#287A4B' }} className="tabular-nums">
                    {formatDateVN(item.checkInDate)}
                  </div>
                  <span style={{ marginTop: '4px', display: 'inline-block' }}>
                    <StatusBadge status="confirmed" />
                  </span>
                </div>
              </div>
            ))}

            <div style={{ marginTop: '14px', textAlign: 'center' }}>
              <Link
                to="/admin/bookings?stayStatus=checkin"
                className="btn btn-secondary btn-sm"
                style={{ width: '100%' }}
              >
                Mở danh sách nhận phòng
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
