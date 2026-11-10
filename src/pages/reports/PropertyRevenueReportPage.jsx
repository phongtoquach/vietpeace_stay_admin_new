import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import { RevenueLineChart } from '../../components/common/Charts.jsx';
import ReportYearSelect from '../../components/reports/ReportYearSelect.jsx';
import ReportMonthSelect from '../../components/reports/ReportMonthSelect.jsx';
import DailyTrendChart from '../../components/reports/DailyTrendChart.jsx';
import MonthlyOrdersTable from '../../components/reports/MonthlyOrdersTable.jsx';
import {
  buildReportPath,
  readReportPeriod,
  withReportPeriod,
} from '../../components/reports/reportPeriod.js';
import { reportsApi } from '../../api/reports.js';
import { formatVND } from '../../data/mockData.js';
import { ArrowLeft, Calendar, Coins, ArrowUpRight } from 'lucide-react';

export default function PropertyRevenueReportPage() {
  const { id } = useParams();
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
      .getRevenue(year, month, id)
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
  }, [year, month, id, reloadKey]);

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
  const periodTotals = month !== null
    ? (data?.monthTotals || { revenue: 0, bookings: 0 })
    : totals;
  const chartData = (data?.monthly || []).map((entry) => ({
    month: `T${entry.month}`,
    revenue: entry.revenue,
  }));
  const periodLabel = month !== null ? `tháng ${month}/${year}` : `năm ${year}`;
  const monthRevenueShare = totals.revenue > 0
    ? Number(((periodTotals.revenue / totals.revenue) * 100).toFixed(1))
    : 0;
  const accommodationName = data?.accommodation?.name;
  const displayValue = (value) => (loading ? '…' : value);
  const fromReport = typeof location.state?.from === 'string'
    && location.state.from.startsWith('/admin/')
    ? location.state.from
    : null;
  const backTo = fromReport || buildReportPath('/admin/reports/revenue', year, month);
  const backLabel = fromReport?.startsWith('/admin/reports/bookings')
    ? 'Báo cáo đặt phòng'
    : fromReport?.startsWith('/admin/reports/occupancy')
      ? 'Công suất phòng'
      : 'Báo cáo doanh thu';

  return (
    <div>
      <PageHeader
        title={accommodationName || 'Chi tiết doanh thu cơ sở'}
        description={
          accommodationName
            ? `Chi tiết doanh thu của ${accommodationName} theo năm dương lịch.`
            : 'Chi tiết doanh thu của cơ sở theo năm dương lịch.'
        }
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <Link to={backTo} className="btn btn-secondary">
              <ArrowLeft size={14} /> {backLabel}
            </Link>
            <ReportYearSelect year={year} onChange={handleYearChange} />
            <ReportMonthSelect month={month} onChange={handleMonthChange} />
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
            {error.message || 'Không thể tải chi tiết doanh thu cơ sở.'}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {error.status !== 404 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleRetry}
              >
                Thử lại
              </button>
            )}
            <Link
              to={backTo}
              className="btn btn-secondary btn-sm"
            >
              Quay lại
            </Link>
          </div>
        </div>
      )}

      {loading && !data && !error && (
        <div
          className="admin-card"
          style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}
        >
          Đang tải chi tiết doanh thu cơ sở...
        </div>
      )}

      {data && (
        <>
          <div
            className="stat-cards-grid"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
          >
            <div className="stat-card">
              <div className="stat-card-left">
                <span className="stat-card-title">Doanh thu {periodLabel}</span>
                <span
                  className="stat-card-value tabular-nums"
                  style={{ color: '#287A4B' }}
                >
                  {displayValue(formatVND(periodTotals.revenue))}
                </span>
                <span className="stat-card-sub">
                  {accommodationName || 'Cơ sở đang giám sát'}
                </span>
              </div>
              <div
                className="stat-card-icon"
                style={{
                  backgroundColor: '#EAF5EE',
                  borderColor: '#BAE2C8',
                  color: '#287A4B',
                }}
              >
                <Coins size={20} />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-left">
                <span className="stat-card-title">
                  {month !== null
                    ? 'Số đơn trong tháng'
                    : 'Doanh thu bình quân mỗi tháng'}
                </span>
                <span className="stat-card-value tabular-nums">
                  {month !== null
                    ? displayValue(periodTotals.bookings)
                    : displayValue(formatVND(totals.avgMonthlyRevenue))}
                </span>
                <span className="stat-card-sub">
                  {month !== null
                    ? 'Đơn có thanh toán trong tháng'
                    : 'Trung bình 12 tháng dương lịch'}
                </span>
              </div>
              <div className="stat-card-icon">
                <ArrowUpRight size={20} />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-left">
                <span className="stat-card-title">
                  {month !== null
                    ? 'Tỷ trọng trong doanh thu năm'
                    : 'Tháng có doanh thu cao nhất'}
                </span>
                <span className="stat-card-value tabular-nums">
                  {month !== null
                    ? displayValue(`${monthRevenueShare}%`)
                    : displayValue(
                        totals.bestMonth ? `Tháng ${totals.bestMonth.month}` : '—',
                      )}
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

          {month === null ? (
            <div className="admin-card">
              <div className="admin-card-header">
                <div className="admin-card-title">
                  Biểu đồ doanh thu theo tháng (VNĐ)
                </div>
                <span style={{ fontSize: '11.5px', color: '#6B7280' }}>
                  Năm {year}
                </span>
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
          ) : (
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
                      data={data.daily || []}
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
                    Đơn đặt phòng của cơ sở — tháng {month}/{year}
                  </div>
                </div>
                <MonthlyOrdersTable
                  key={`${id}-${year}-${month}`}
                  year={year}
                  month={month}
                  accommodationId={id}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
