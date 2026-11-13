import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import { SimpleBarChart, DoughnutChart } from '../../components/common/Charts.jsx';
import ReportYearSelect from '../../components/reports/ReportYearSelect.jsx';
import ReportMonthSelect from '../../components/reports/ReportMonthSelect.jsx';
import DailyTrendChart from '../../components/reports/DailyTrendChart.jsx';
import MonthlyOrdersTable from '../../components/reports/MonthlyOrdersTable.jsx';
import ReportSuiteTabs from '../../components/reports/ReportSuiteTabs.jsx';
import {
  buildReportPath,
  buildReportPeriodQuery,
  readReportPeriod,
  withReportPeriod,
} from '../../components/reports/reportPeriod.js';
import { reportsApi } from '../../api/reports.js';
import { Download, CalendarCheck, Clock, TrendingUp } from 'lucide-react';

const STATUS_META = {
  PENDING: { label: 'Chờ xử lý', color: '#A66A00' },
  PAYMENT_PROCESSING: { label: 'Đang thanh toán', color: '#1E6091' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#287A4B' },
  EXPIRED: { label: 'Hết hạn', color: '#9CA3AF' },
  CANCELLED: { label: 'Đã hủy', color: '#C0392B' },
  FAILED: { label: 'Thất bại', color: '#7F1D1D' },
};

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export default function BookingReportPage() {
  const { currentLoggedInUser } = useAuth();
  const { showToast } = useAdmin();
  const isAdmin = currentLoggedInUser?.role === 'ADMIN';
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialPeriod] = useState(() => readReportPeriod(searchParams));

  const [year, setYear] = useState(initialPeriod.year);
  const [month, setMonth] = useState(initialPeriod.month);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    reportsApi
      .getBookings(year, month)
      .then((result) => {
        if (!cancelled) {
          setData(result);
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
  }, [year, month, reloadKey]);

  const handleYearChange = (nextYear) => {
    if (nextYear === year) return;
    setLoading(true);
    setError(null);
    setYear(nextYear);
    setSearchParams(
      (prev) => withReportPeriod(prev, nextYear, month),
      { replace: true },
    );
  };

  const handleMonthChange = (nextMonth) => {
    if (nextMonth === month) return;
    setLoading(true);
    setError(null);
    setMonth(nextMonth);
    setSearchParams(
      (prev) => withReportPeriod(prev, year, nextMonth),
      { replace: true },
    );
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  };

  const totals = data?.totals || {
    totalBookings: 0,
    cancelledBookings: 0,
    cancelRate: 0,
    avgNights: 0,
    avgLeadDays: 0,
  };
  const properties = data?.properties || [];
  const monthlyChartData = (data?.monthly || []).map((entry) => ({
    month: `T${entry.month}`,
    bookings: entry.bookings,
  }));
  const statusChartData = (data?.statusDistribution || [])
    .filter((item) => item.count > 0)
    .map((item) => ({
      status: STATUS_META[item.status]?.label || item.status,
      count: item.count,
      color: STATUS_META[item.status]?.color || '#9CA3AF',
    }));
  const displayValue = (value) => (loading ? '…' : value);
  const periodLabel = month !== null ? `tháng ${month}/${year}` : `năm ${year}`;
  const returnTo = buildReportPath(location.pathname, year, month);
  const propertyDetailQuery = buildReportPeriodQuery(year, month);
  const periodTotals = month !== null ? (data?.monthTotals || totals) : totals;

  const handleExportCSV = () => {
    if (!data) return;

    const periodText = month !== null ? `Tháng ${month}/${year}` : `Cả năm ${year}`;
    const rows = [
      ['KỲ BÁO CÁO', periodText],
      [],
      ['THEO THÁNG'],
      ['Tháng', 'Số đơn'],
      ...data.monthly.map((entry) => [`Tháng ${entry.month}`, entry.bookings]),
      [],
      ['THEO TRẠNG THÁI'],
      ['Trạng thái', 'Số lượng'],
      ...data.statusDistribution.map((item) => [
        STATUS_META[item.status]?.label || item.status,
        item.count,
      ]),
      [],
      ['THEO CƠ SỞ'],
      ['Cơ sở', 'Tổng đơn', 'Đơn hủy', 'Tỷ lệ hủy (%)'],
      ...data.properties.map((property) => [
        property.name,
        property.bookings,
        property.cancelledBookings,
        property.cancelRate,
      ]),
    ];
    const content = rows.map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = month !== null
      ? `vietpeace_bao_cao_dat_phong_${year}-${String(month).padStart(2, '0')}.csv`
      : `vietpeace_bao_cao_dat_phong_${year}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    showToast(`Đã xuất báo cáo đặt phòng ${month !== null ? `tháng ${month}/${year}` : `năm ${year}`}.`);
  };

  return (
    <div>
      <PageHeader
        title={isAdmin ? 'Báo cáo số lượng & Kênh đặt phòng' : 'Báo cáo đặt phòng cơ sở'}
        description={
          isAdmin
            ? 'Số đơn, tỷ lệ hủy và thời gian đặt trước toàn hệ thống theo năm dương lịch.'
            : 'Số đơn, tỷ lệ hủy và thời gian đặt trước của các cơ sở bạn quản lý.'
        }
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <ReportYearSelect year={year} onChange={handleYearChange} />
            <ReportMonthSelect month={month} onChange={handleMonthChange} />
            <button
              type="button"
              onClick={handleExportCSV}
              className="btn btn-primary"
              disabled={!data || loading}
            >
              <Download size={14} /> Xuất báo cáo CSV
            </button>
          </div>
        }
      />

      <div className="fin-hub-nav">
        <ReportSuiteTabs />
      </div>

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
          }}
        >
          <span style={{ color: '#C0392B', fontSize: '13px' }}>
            {error.message || 'Không thể tải báo cáo đặt phòng.'}
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleRetry}>
            Thử lại
          </button>
        </div>
      )}

      <div className="stat-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Tổng đơn đặt phòng {periodLabel}</span>
            <span className="stat-card-value tabular-nums">
              {displayValue(periodTotals.totalBookings)}
            </span>
            <span className="stat-card-sub">
              {isAdmin ? 'Toàn hệ thống' : 'Cơ sở bạn quản lý'}
            </span>
          </div>
          <div className="stat-card-icon">
            <CalendarCheck size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Thời gian đặt trước trung bình</span>
            <span className="stat-card-value tabular-nums">
              {displayValue(`${periodTotals.avgLeadDays} ngày`)}
            </span>
            <span className="stat-card-sub">Khoảng cách từ khi đặt đến khi nhận phòng</span>
          </div>
          <div className="stat-card-icon">
            <Clock size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Thời gian lưu trú bình quân (ALOS)</span>
            <span className="stat-card-value tabular-nums">
              {displayValue(`${periodTotals.avgNights} đêm`)}
            </span>
            <span className="stat-card-sub">Thời gian lưu trú bình quân</span>
          </div>
          <div className="stat-card-icon">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Tỷ lệ hủy phòng {periodLabel}</span>
            <span className="stat-card-value tabular-nums" style={{ color: '#C0392B' }}>
              {displayValue(`${periodTotals.cancelRate}%`)}
            </span>
            <span className="stat-card-sub">
              {loading ? 'Đang tải dữ liệu' : `${periodTotals.cancelledBookings} đơn đã hủy`}
            </span>
          </div>
          <div className="stat-card-icon">
            <CalendarCheck size={20} />
          </div>
        </div>
      </div>

      <div className="charts-grid" style={month !== null ? { gridTemplateColumns: '1fr' } : undefined}>
        {month === null && (
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title">Khối lượng đặt phòng theo tháng</div>
            </div>
            <div className="admin-card-body">
              {loading ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280' }}>
                  Đang tải dữ liệu...
                </div>
              ) : (
                <SimpleBarChart data={monthlyChartData} valueKey="bookings" unit=" đơn" color="#F4C542" />
              )}
            </div>
          </div>
        )}

        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">
              Cơ cấu trạng thái đặt phòng {month !== null ? `— tháng ${month}/${year}` : `— năm ${year}`}
            </div>
          </div>
          <div className="admin-card-body">
            {loading ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280' }}>
                Đang tải dữ liệu...
              </div>
            ) : statusChartData.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280' }}>
                Chưa có đơn trong {periodLabel}.
              </div>
            ) : (
              <DoughnutChart data={statusChartData} />
            )}
          </div>
        </div>
      </div>

      {month !== null && (
        <>
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title">
                Chi tiết đơn đặt phòng theo ngày — tháng {month}/{year}
              </div>
            </div>
            <div className="admin-card-body">
              {loading ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280' }}>
                  Đang tải dữ liệu...
                </div>
              ) : (
                <DailyTrendChart
                  data={data?.daily || []}
                  valueKey="bookings"
                  unit=" đơn"
                  color="#F4C542"
                  formatValue={(value) => `${value} đơn`}
                  formatAxis={(value) => Math.round(value)}
                />
              )}
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title">
                Đơn đặt phòng trong tháng {month}/{year}
              </div>
            </div>
            <MonthlyOrdersTable key={`${year}-${month}`} year={year} month={month} />
          </div>
        </>
      )}

      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-card-title">
            {isAdmin
              ? `Bảng xếp hạng cơ sở theo số đơn — ${periodLabel}`
              : `Đặt phòng theo cơ sở của bạn — ${periodLabel}`}
          </div>
        </div>
        <div className="table-responsive" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                {isAdmin && <th style={{ textAlign: 'center' }}>Hạng</th>}
                <th>Cơ sở</th>
                <th style={{ textAlign: 'center' }}>Tổng đơn</th>
                <th style={{ textAlign: 'center' }}>Đơn hủy</th>
                <th style={{ textAlign: 'center' }}>Tỷ lệ hủy</th>
              </tr>
            </thead>
            <tbody>
              {properties.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 5 : 4}
                    style={{ textAlign: 'center', padding: '24px', color: '#6B7280' }}
                  >
                    Chưa có dữ liệu trong {periodLabel}.
                  </td>
                </tr>
              ) : (
                properties.map((property, index) => (
                  <tr key={property.id}>
                    {isAdmin && (
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        {index + 1}
                      </td>
                    )}
                    <td>
                      <Link
                        to={`/admin/reports/revenue/properties/${property.id}?${propertyDetailQuery}`}
                        state={{ from: returnTo }}
                        style={{
                          fontWeight: 600,
                          color: '#292D32',
                          textDecoration: 'underline',
                        }}
                        title="Xem chi tiết doanh thu cơ sở"
                      >
                        {property.name}
                      </Link>
                    </td>
                    <td style={{ textAlign: 'center' }} className="tabular-nums">
                      {property.bookings}
                    </td>
                    <td style={{ textAlign: 'center' }} className="tabular-nums">
                      {property.cancelledBookings}
                    </td>
                    <td style={{ textAlign: 'center' }} className="tabular-nums">
                      {property.cancelRate}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
