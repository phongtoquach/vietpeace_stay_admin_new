import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import { SimpleBarChart } from '../../components/common/Charts.jsx';
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
import { formatVND } from '../../data/mockData.js';
import { Download, BedDouble, Moon, Percent, Coins, TrendingUp } from 'lucide-react';

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export default function OccupancyReportPage() {
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
      .getOccupancy(year, month)
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
    totalRooms: 0,
    roomNights: 0,
    occupancy: 0,
    adr: 0,
    revpar: 0,
  };
  const properties = data?.properties || [];
  const monthlyChartData = (data?.monthly || []).map((entry) => ({
    month: `T${entry.month}`,
    occupancy: entry.occupancy,
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
      ['Tháng', 'Công suất (%)'],
      ...data.monthly.map((entry) => [`Tháng ${entry.month}`, entry.occupancy]),
      [],
      ['THEO CƠ SỞ'],
      ['Cơ sở', 'Tổng phòng', 'Room-nights', 'Công suất (%)', 'ADR (VNĐ)', 'RevPAR (VNĐ)'],
      ...data.properties.map((property) => [
        property.name,
        property.rooms,
        property.roomNights,
        property.occupancy,
        property.adr,
        property.revpar,
      ]),
    ];
    const content = rows.map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = month !== null
      ? `vietpeace_bao_cao_cong_suat_${year}-${String(month).padStart(2, '0')}.csv`
      : `vietpeace_bao_cao_cong_suat_${year}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    showToast(`Đã xuất báo cáo công suất ${month !== null ? `tháng ${month}/${year}` : `năm ${year}`}.`);
  };

  return (
    <div>
      <PageHeader
        title={isAdmin ? 'Công suất phòng & Hiệu suất khai thác' : 'Công suất phòng cơ sở'}
        description={
          isAdmin
            ? 'Tỷ lệ lấp đầy, ADR và RevPAR toàn hệ thống theo năm dương lịch.'
            : 'Tỷ lệ lấp đầy, ADR và RevPAR của các cơ sở bạn quản lý.'
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
            {error.message || 'Không thể tải báo cáo công suất.'}
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleRetry}>
            Thử lại
          </button>
        </div>
      )}

      <div className="stat-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Tổng số phòng</span>
            <span className="stat-card-value tabular-nums">
              {displayValue(periodTotals.totalRooms)}
            </span>
            <span className="stat-card-sub">
              {isAdmin ? 'Toàn hệ thống' : 'Cơ sở bạn quản lý'}
            </span>
          </div>
          <div className="stat-card-icon">
            <BedDouble size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Room-nights {periodLabel}</span>
            <span className="stat-card-value tabular-nums">
              {displayValue(periodTotals.roomNights)}
            </span>
            <span className="stat-card-sub">Số đêm phòng đã bán</span>
          </div>
          <div className="stat-card-icon">
            <Moon size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Công suất {periodLabel}</span>
            <span className="stat-card-value tabular-nums" style={{ color: '#287A4B' }}>
              {displayValue(`${periodTotals.occupancy}%`)}
            </span>
            <span className="stat-card-sub">Tỷ lệ lấp đầy trên tổng phòng</span>
          </div>
          <div className="stat-card-icon">
            <Percent size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">ADR</span>
            <span className="stat-card-value tabular-nums">
              {displayValue(formatVND(periodTotals.adr))}
            </span>
            <span className="stat-card-sub">Doanh thu bình quân mỗi room-night</span>
          </div>
          <div className="stat-card-icon">
            <Coins size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">RevPAR</span>
            <span className="stat-card-value tabular-nums">
              {displayValue(formatVND(periodTotals.revpar))}
            </span>
            <span className="stat-card-sub">Doanh thu trên mỗi phòng sẵn có</span>
          </div>
          <div className="stat-card-icon">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {month === null && (
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Tỷ lệ công suất phòng bình quân theo tháng (%)</div>
            <span style={{ fontSize: '11.5px', color: '#6B7280' }}>Năm {year}</span>
          </div>
          <div className="admin-card-body">
            {loading ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280' }}>
                Đang tải dữ liệu...
              </div>
            ) : (
              <SimpleBarChart data={monthlyChartData} valueKey="occupancy" unit="%" color="#60A5FA" />
            )}
          </div>
        </div>
      )}

      {month !== null && (
        <>
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title">
                Chi tiết công suất theo ngày — tháng {month}/{year}
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
                  valueKey="occupancy"
                  color="#60A5FA"
                  formatValue={(value) => `${value}%`}
                  formatAxis={(value) => `${Math.round(value * 10) / 10}%`}
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
              ? `Bảng xếp hạng công suất theo cơ sở — ${periodLabel}`
              : `Công suất theo cơ sở của bạn — ${periodLabel}`}
          </div>
        </div>
        <div className="table-responsive" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                {isAdmin && <th style={{ textAlign: 'center' }}>Hạng</th>}
                <th>Cơ sở</th>
                <th style={{ textAlign: 'center' }}>Tổng phòng</th>
                <th style={{ textAlign: 'center' }}>Room-nights</th>
                <th style={{ textAlign: 'center' }}>Công suất</th>
                <th style={{ textAlign: 'right' }}>ADR (VNĐ)</th>
                <th style={{ textAlign: 'right' }}>RevPAR (VNĐ)</th>
              </tr>
            </thead>
            <tbody>
              {properties.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
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
                      {property.rooms}
                    </td>
                    <td style={{ textAlign: 'center' }} className="tabular-nums">
                      {property.roomNights}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }} className="tabular-nums">
                      {property.occupancy}%
                    </td>
                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                      {formatVND(property.adr)}
                    </td>
                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                      {formatVND(property.revpar)}
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
