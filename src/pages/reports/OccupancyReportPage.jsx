import React from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import { SimpleBarChart } from '../../components/common/Charts.jsx';
import { MONTHLY_REVENUE_DATA } from '../../data/mockData.js';
import { Download } from 'lucide-react';

export default function OccupancyReportPage() {
  const { accommodations, showToast } = useAdmin();

  const handleExportCSV = () => {
    const headers = "Tên cơ sở lưu trú,Loại hình,Tổng số phòng,Tỷ lệ công suất phòng,RevPAR (VNĐ)\n";
    const rows = [
      "VietPeace Danang Premier Beach Resort,Khu nghỉ dưỡng,45,86%,3200000",
      "VietPeace Heritage Boutique Hotel,Khách sạn,28,79%,1850000",
      "VietPeace Sapa Cloud Valley Eco-Homestay,Homestay,18,68%,1100000",
      "VietPeace Sunset Beach Villas & Resort,Khu nghỉ dưỡng,35,92%,4800000"
    ].join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vietpeace_bao_cao_cong_suat_phong_2026.csv`;
    a.click();
    showToast('Đã xuất chỉ số công suất phòng sang file CSV.');
  };

  const propertyOccupancyBreakdown = [
    { name: "VietPeace Danang Premier Beach Resort", type: "Khu nghỉ dưỡng", units: 45, occupancy: 86, revpar: 3200000 },
    { name: "VietPeace Heritage Boutique Hotel", type: "Khách sạn", units: 28, occupancy: 79, revpar: 1850000 },
    { name: "VietPeace Sapa Cloud Valley Eco-Homestay", type: "Homestay", units: 18, occupancy: 68, revpar: 1100000 },
    { name: "VietPeace Sunset Beach Villas & Resort", type: "Khu nghỉ dưỡng", units: 35, occupancy: 92, revpar: 4800000 }
  ];

  return (
    <div>
      <PageHeader
        title="Công suất phòng & Hiệu suất khai thác"
        description="Theo dõi tỷ lệ lấp đầy số đêm phòng, doanh thu trên mỗi phòng sẵn có (RevPAR) và tỷ lệ lấp đầy theo mùa vụ."
        actions={
          <button type="button" onClick={handleExportCSV} className="btn btn-primary">
            <Download size={14} /> Xuất báo cáo CSV
          </button>
        }
      />

      {/* Monthly Chart */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-card-title">Tỷ lệ công suất phòng bình quân theo tháng (%)</div>
          <span style={{ fontSize: '11.5px', color: '#6B7280' }}>Năm 2026</span>
        </div>
        <div className="admin-card-body">
          <SimpleBarChart data={MONTHLY_REVENUE_DATA} valueKey="occupancy" unit="%" color="#60A5FA" />
        </div>
      </div>

      {/* Property Breakdown Table */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-card-title">Hiệu suất công suất phòng theo từng cơ sở lưu trú</div>
        </div>
        <div className="table-responsive" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Cơ sở lưu trú</th>
                <th>Loại hình</th>
                <th style={{ textAlign: 'center' }}>Tổng số phòng</th>
                <th style={{ textAlign: 'center' }}>Tỷ lệ công suất</th>
                <th>Thang đo hiệu suất</th>
              </tr>
            </thead>
            <tbody>
              {propertyOccupancyBreakdown.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td>
                    <span className="badge badge-neutral">{item.type}</span>
                  </td>
                  <td style={{ textAlign: 'center' }} className="tabular-nums">
                    {item.units} phòng
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: item.occupancy >= 80 ? '#287A4B' : '#A66A00' }} className="tabular-nums">
                    {item.occupancy}%
                  </td>
                  <td style={{ width: '250px' }}>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${item.occupancy}%`,
                          height: '100%',
                          backgroundColor: item.occupancy >= 85 ? '#287A4B' : item.occupancy >= 75 ? '#F4C542' : '#A66A00'
                        }}
                      />
                    </div>
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
