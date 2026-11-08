import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import { RevenueLineChart } from '../../components/common/Charts.jsx';
import { formatVND, MONTHLY_REVENUE_DATA } from '../../data/mockData.js';
import { Download, Calendar, Coins, ArrowUpRight } from 'lucide-react';

export default function RevenueReportPage() {
  const { showToast } = useAdmin();

  const totalGross = MONTHLY_REVENUE_DATA.reduce((acc, c) => acc + c.revenue, 0);
  const avgMonthly = Math.round(totalGross / MONTHLY_REVENUE_DATA.length);

  const handleExportCSV = () => {
    const headers = "Tháng,Doanh thu (VNĐ),Số lượt đặt phòng,Tỷ lệ công suất (%)\n";
    const rows = MONTHLY_REVENUE_DATA.map(d => `${d.month} 2026,${d.revenue},${d.bookings},${d.occupancy}%`).join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vietpeace_bao_cao_doanh_thu_2026.csv`;
    a.click();
    showToast('Đã xuất báo cáo doanh thu tài chính sang file CSV.');
  };

  return (
    <div>
      <PageHeader
        title="Báo cáo doanh thu & Tài chính"
        description="Sổ cái kế toán và phân tích hiệu suất doanh thu phòng trên toàn chuỗi các cơ sở lưu trú tại Việt Nam."
        actions={
          <button type="button" onClick={handleExportCSV} className="btn btn-primary">
            <Download size={14} /> Xuất sổ cái CSV
          </button>
        }
      />

      {/* Summary KPI Cards */}
      <div className="stat-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Tổng doanh thu lũy kế từ đầu năm</span>
            <span className="stat-card-value tabular-nums" style={{ color: '#287A4B' }}>
              {formatVND(totalGross)}
            </span>
            <span className="stat-card-sub">+18.4% so với cùng kỳ 2025</span>
          </div>
          <div className="stat-card-icon" style={{ backgroundColor: '#EAF5EE', borderColor: '#BAE2C8', color: '#287A4B' }}>
            <Coins size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Doanh thu bình quân mỗi tháng</span>
            <span className="stat-card-value tabular-nums">
              {formatVND(avgMonthly)}
            </span>
            <span className="stat-card-sub">Tính trung bình trong 9 tháng hoạt động</span>
          </div>
          <div className="stat-card-icon">
            <ArrowUpRight size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Tháng có doanh thu cao nhất</span>
            <span className="stat-card-value tabular-nums">
              Tháng 7/2026
            </span>
            <span className="stat-card-sub" style={{ color: '#8C5A00' }}>
              {formatVND(890000000)} (Cao điểm mùa hè)
            </span>
          </div>
          <div className="stat-card-icon">
            <Calendar size={20} />
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-card-title">Biểu đồ xu hướng doanh thu (VNĐ)</div>
          <span style={{ fontSize: '11.5px', color: '#6B7280' }}>Tháng 1 – Tháng 9 năm 2026</span>
        </div>
        <div className="admin-card-body">
          <RevenueLineChart data={MONTHLY_REVENUE_DATA} />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-card-title">Bảng kê quyết toán doanh thu hàng tháng</div>
        </div>
        <div className="table-responsive" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Kỳ hạch toán</th>
                <th style={{ textAlign: 'center' }}>Số lượt đặt hoàn tất</th>
                <th style={{ textAlign: 'center' }}>Tỷ lệ công suất phòng</th>
                <th style={{ textAlign: 'right' }}>Giá bán phòng bình quân (ADR)</th>
                <th style={{ textAlign: 'right' }}>Tổng doanh thu (VNĐ)</th>
              </tr>
            </thead>
            <tbody>
              {MONTHLY_REVENUE_DATA.map((row) => (
                <tr key={row.month}>
                  <td style={{ fontWeight: 600 }}>Tháng {row.month.replace('Thg ', '')} / 2026</td>
                  <td style={{ textAlign: 'center' }} className="tabular-nums">
                    {row.bookings} lượt
                  </td>
                  <td style={{ textAlign: 'center' }} className="tabular-nums">
                    {row.occupancy}%
                  </td>
                  <td style={{ textAlign: 'right' }} className="tabular-nums">
                    {formatVND(Math.round(row.revenue / (row.bookings * 2.2)))}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#292D32' }} className="tabular-nums">
                    {formatVND(row.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
