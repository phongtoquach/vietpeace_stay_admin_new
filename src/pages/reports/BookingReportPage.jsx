import React from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import { SimpleBarChart, DoughnutChart } from '../../components/common/Charts.jsx';
import { MONTHLY_REVENUE_DATA } from '../../data/mockData.js';
import { Download, CalendarCheck, Clock, TrendingUp } from 'lucide-react';

export default function BookingReportPage() {
  const { showToast } = useAdmin();

  const handleExportCSV = () => {
    const headers = "Tháng,Số lượng đặt phòng thành công,Tỷ lệ hủy phòng,Thời gian đặt trước bình quân\n";
    const rows = MONTHLY_REVENUE_DATA.map(d => `${d.month} 2026,${d.bookings},4.8%,14.2 ngày`).join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vietpeace_bao_cao_dat_phong_2026.csv`;
    a.click();
    showToast('Đã xuất báo cáo phân tích đặt phòng sang file CSV.');
  };

  const bookingSourceData = [
    { status: "Website trực tiếp", count: 142, color: "#F4C542" },
    { status: "Đại lý OTA (Agoda/Booking)", count: 98, color: "#1E6091" },
    { status: "Đối tác doanh nghiệp", count: 54, color: "#287A4B" },
    { status: "Khách vãng lai & Điện thoại", count: 32, color: "#A66A00" }
  ];

  return (
    <div>
      <PageHeader
        title="Báo cáo số lượng & Kênh đặt phòng"
        description="Phân tích tốc độ tăng trưởng đơn đặt phòng, các kênh phân phối khách hàng, thời gian đặt trước và tỷ lệ hủy phòng."
        actions={
          <button type="button" onClick={handleExportCSV} className="btn btn-primary">
            <Download size={14} /> Xuất báo cáo CSV
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="stat-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Tổng đơn đặt phòng từ đầu năm</span>
            <span className="stat-card-value tabular-nums">989</span>
            <span className="stat-card-sub">Toàn bộ cơ sở lưu trú chuỗi</span>
          </div>
          <div className="stat-card-icon">
            <CalendarCheck size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Thời gian đặt trước trung bình</span>
            <span className="stat-card-value tabular-nums">14.6 ngày</span>
            <span className="stat-card-sub">Khoảng cách từ khi đặt đến khi nhận</span>
          </div>
          <div className="stat-card-icon">
            <Clock size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Thời gian lưu trú bình quân (ALOS)</span>
            <span className="stat-card-value tabular-nums">2.8 đêm</span>
            <span className="stat-card-sub">Cao nhất tại Phú Quốc (3.6 đêm)</span>
          </div>
          <div className="stat-card-icon">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Tỷ lệ hủy phòng toàn hệ thống</span>
            <span className="stat-card-value tabular-nums" style={{ color: '#287A4B' }}>4.8%</span>
            <span className="stat-card-sub">Thấp hơn mức trung bình ngành</span>
          </div>
          <div className="stat-card-icon" style={{ backgroundColor: '#EAF5EE', borderColor: '#BAE2C8', color: '#287A4B' }}>
            <CalendarCheck size={20} />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Khối lượng đặt phòng hoàn tất theo tháng</div>
          </div>
          <div className="admin-card-body">
            <SimpleBarChart data={MONTHLY_REVENUE_DATA} valueKey="bookings" unit=" đơn" color="#F4C542" />
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Cơ cấu kênh phân phối đặt phòng</div>
          </div>
          <div className="admin-card-body">
            <DoughnutChart data={bookingSourceData} />
          </div>
        </div>
      </div>
    </div>
  );
}
