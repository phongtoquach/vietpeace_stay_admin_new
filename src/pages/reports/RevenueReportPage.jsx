import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import { RevenueLineChart } from '../../components/common/Charts.jsx';
import ReportYearSelect from '../../components/reports/ReportYearSelect.jsx';
import ReportMonthSelect from '../../components/reports/ReportMonthSelect.jsx';
import DailyTrendChart from '../../components/reports/DailyTrendChart.jsx';
import MonthlyOrdersTable from '../../components/reports/MonthlyOrdersTable.jsx';
import {
  buildReportPath,
  buildReportPeriodQuery,
  readReportPeriod,
  withReportPeriod,
} from '../../components/reports/reportPeriod.js';
import { reportsApi } from '../../api/reports.js';
import { formatVND } from '../../data/mockData.js';
import { Download, Calendar, Coins, ArrowUpRight } from 'lucide-react';

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export default function RevenueReportPage() {
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
      .getRevenue(year, month)
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
    revenue: 0,
    avgMonthlyRevenue: 0,
    bestMonth: null,
  };
  const properties = data?.properties || [];
  const monthly = data?.monthly || [];
  const chartData = monthly.map((entry) => ({
    month: `T${entry.month}`,
    revenue: entry.revenue,
  }));
  const displayValue = (value) => (loading ? '…' : value);
  const periodLabel = month !== null ? `tháng ${month}/${year}` : `năm ${year}`;
  const periodTotals = month !== null
    ? (data?.monthTotals || { revenue: 0, bookings: 0 })
    : totals;
  const monthRevenueShare = totals.revenue > 0
    ? Number(((periodTotals.revenue / totals.revenue) * 100).toFixed(1))
    : 0;
  const returnTo = buildReportPath(location.pathname, year, month);
  const propertyDetailQuery = buildReportPeriodQuery(year, month);

  const handleExportCSV = () => {
    if (!data) return;

    const periodText = month !== null ? `Tháng ${month}/${year}` : `Cả năm ${year}`;
    const rows = [
      ['KỲ BÁO CÁO', periodText],
      [],
      ['THEO THÁNG'],
      ['Tháng', 'Doanh thu (VNĐ)'],
      ...data.monthly.map((entry) => [`Tháng ${entry.month}`, entry.revenue]),
      [],
      ['THEO CƠ SỞ'],
      ['Cơ sở', 'Số đơn', 'Doanh thu (VNĐ)'],
      ...data.properties.map((property) => [
        property.name,
        property.bookings,
        property.revenue,
      ]),
    ];
    const content = rows.map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = month !== null
      ? `vietpeace_bao_cao_doanh_thu_${year}-${String(month).padStart(2, '0')}.csv`
      : `vietpeace_bao_cao_doanh_thu_${year}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    showToast(`Đã xuất báo cáo doanh thu ${month !== null ? `tháng ${month}/${year}` : `năm ${year}`}.`);
  };

  return (
    <div>
      <PageHeader
        title={isAdmin ? 'Báo cáo doanh thu & Tài chính' : 'Báo cáo doanh thu cơ sở'}
        description={
          isAdmin
            ? 'Doanh thu toàn hệ thống theo năm dương lịch, kèm bảng xếp hạng cơ sở.'
            : 'Doanh thu của các cơ sở bạn quản lý theo năm dương lịch.'
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
              <Download size={14} /> Xuất sổ cái CSV
            </button>
          </div>
        }
      />

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
            {error.message || 'Không thể tải báo cáo doanh thu.'}
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleRetry}>
            Thử lại
          </button>
        </div>
      )}

      <div className="stat-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Doanh thu {periodLabel}</span>
            <span className="stat-card-value tabular-nums" style={{ color: '#287A4B' }}>
              {displayValue(formatVND(periodTotals.revenue))}
            </span>
            <span className="stat-card-sub">
              {isAdmin ? 'Toàn hệ thống' : 'Cơ sở bạn quản lý'}
            </span>
          </div>
          <div className="stat-card-icon" style={{ backgroundColor: '#EAF5EE', borderColor: '#BAE2C8', color: '#287A4B' }}>
            <Coins size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">
              {month !== null ? 'Số đơn trong tháng' : 'Doanh thu bình quân mỗi tháng'}
            </span>
            <span className="stat-card-value tabular-nums">
              {month !== null
                ? displayValue(periodTotals.bookings)
                : displayValue(formatVND(totals.avgMonthlyRevenue))}
            </span>
            <span className="stat-card-sub">
              {month !== null ? 'Đơn có thanh toán trong tháng' : 'Trung bình 12 tháng dương lịch'}
            </span>
          </div>
          <div className="stat-card-icon">
            <ArrowUpRight size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">
              {month !== null ? 'Tỷ trọng trong doanh thu năm' : 'Tháng có doanh thu cao nhất'}
            </span>
            <span className="stat-card-value tabular-nums">
              {month !== null
                ? displayValue(`${monthRevenueShare}%`)
                : displayValue(totals.bestMonth ? `Tháng ${totals.bestMonth.month}` : '—')}
            </span>
            <span className="stat-card-sub" style={{ color: '#8C5A00' }}>
              {loading
                ? 'Đang tải dữ liệu'
                : month !== null
                  ? `Tổng năm: ${formatVND(totals.revenue)}`
                  : totals.bestMonth
                    ? formatVND(totals.bestMonth.revenue)
                    : `Chưa có dữ liệu năm ${year}`}
            </span>
          </div>
          <div className="stat-card-icon">
            <Calendar size={20} />
          </div>
        </div>
      </div>

      {month === null && (
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Biểu đồ xu hướng doanh thu (VNĐ)</div>
            <span style={{ fontSize: '11.5px', color: '#6B7280' }}>Năm {year}</span>
          </div>
          <div className="admin-card-body">
            {loading ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280' }}>
                Đang tải dữ liệu...
              </div>
            ) : (
              <RevenueLineChart data={chartData} year={year} />
            )}
          </div>
        </div>
      )}

      {month !== null && (
        <>
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title">
                Chi tiết doanh thu theo ngày — tháng {month}/{year}
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
                  valueKey="revenue"
                  color="#287A4B"
                  formatValue={formatVND}
                  formatAxis={(value) => `${Math.round(value / 1000000)} Tr`}
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
              ? `Bảng xếp hạng doanh thu theo cơ sở — ${periodLabel}`
              : `Doanh thu theo cơ sở của bạn — ${periodLabel}`}
          </div>
        </div>
        <div className="table-responsive" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                {isAdmin && <th style={{ textAlign: 'center' }}>Hạng</th>}
                <th>Cơ sở</th>
                <th style={{ textAlign: 'center' }}>Số đơn</th>
                <th style={{ textAlign: 'right' }}>Doanh thu (VNĐ)</th>
              </tr>
            </thead>
            <tbody>
              {properties.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 4 : 3}
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
                    <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                      {formatVND(property.revenue)}
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
