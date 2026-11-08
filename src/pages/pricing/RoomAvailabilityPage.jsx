import React, { useState, useMemo } from 'react';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import { formatDateVN } from '../../data/mockData.js';
import { ChevronLeft, ChevronRight, Calendar, Search } from 'lucide-react';

export default function RoomAvailabilityPage() {
  const { accommodations, roomTypes } = useAdmin();

  const [selectedAccId, setSelectedAccId] = useState(accommodations[0]?.id || 1);
  const [startDateStr, setStartDateStr] = useState('2026-10-01');

  const vnDays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  // Compute 7 consecutive dates starting from startDateStr
  const dateColumns = useMemo(() => {
    const dates = [];
    const base = new Date(startDateStr);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = d.toISOString().substring(0, 10);
      const dayName = vnDays[d.getDay()];
      dates.push({ iso, dayName, dayNum: d.getDate() });
    }
    return dates;
  }, [startDateStr]);

  // Filter room types by selected accommodation
  const propertyRooms = useMemo(() => {
    return roomTypes.filter((r) => r.accommodation_id === Number(selectedAccId));
  }, [roomTypes, selectedAccId]);

  // Simulated inventory matrix
  const getAvailability = (roomId, dateStr) => {
    const hash = (roomId * 31 + dateStr.charCodeAt(dateStr.length - 1)) % 10;
    const total = 10;
    const booked = Math.min(total, hash);
    const available = total - booked;
    return { total, booked, available };
  };

  const handleShiftDate = (days) => {
    const current = new Date(startDateStr);
    current.setDate(current.getDate() + days);
    setStartDateStr(current.toISOString().substring(0, 10));
  };

  return (
    <div>
      <PageHeader
        title="Tình trạng phòng trống"
        description="Lưới theo dõi số lượng phòng trống theo từng ngày và từng loại phòng phục vụ công tác lễ tân và nhận đặt phòng."
        breadcrumb={[
          { label: 'Giá & Phòng trống' },
          { label: 'Tình trạng phòng trống' }
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleShiftDate(-7)}
              title="7 ngày trước"
            >
              <ChevronLeft size={14} /> Tuần trước
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setStartDateStr('2026-10-01')}
            >
              Hôm nay
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleShiftDate(7)}
              title="7 ngày tiếp theo"
            >
              Tuần sau <ChevronRight size={14} />
            </button>
          </div>
        }
      />

      {/* Filter toolbar */}
      <div className="filter-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
        <div className="filter-group">
          <label className="filter-label" htmlFor="avail-acc-select">Cơ sở lưu trú:</label>
          <select
            id="avail-acc-select"
            className="filter-select"
            value={selectedAccId}
            onChange={(e) => setSelectedAccId(Number(e.target.value))}
          >
            {accommodations.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="avail-date-input">Ngày bắt đầu:</label>
          <input
            id="avail-date-input"
            type="date"
            className="filter-input"
            value={startDateStr}
            onChange={(e) => setStartDateStr(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: 'auto', fontSize: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#EAF5EE', border: '1px solid #BAE2C8', borderRadius: '2px' }} />
            <span>Còn nhiều (&gt; 4)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#FEF8E7', border: '1px solid #F8DF9E', borderRadius: '2px' }} />
            <span>Sắp hết (1 - 3)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#FDF2F2', border: '1px solid #F8B4B4', borderRadius: '2px' }} />
            <span>Hết phòng (0)</span>
          </div>
        </div>
      </div>

      {/* Availability Grid */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table" style={{ textAlign: 'center' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', minWidth: '220px' }}>Loại phòng / Mã</th>
                {dateColumns.map((col) => (
                  <th key={col.iso} style={{ textAlign: 'center', minWidth: '105px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#292D32' }}>{col.dayName}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }} className="tabular-nums">
                      {formatDateVN(col.iso)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {propertyRooms.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', color: '#6B7280' }}>
                    Không có loại phòng nào thuộc cơ sở lưu trú này.
                  </td>
                </tr>
              ) : (
                propertyRooms.map((room) => (
                  <tr key={room.id}>
                    <td style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, color: '#292D32' }}>{room.name}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }} className="code-badge">
                        Mã: {room.code || 'N/A'} · Tối đa {room.max_occupancy || 2} khách
                      </div>
                    </td>
                    {dateColumns.map((col) => {
                      const avail = getAvailability(room.id, col.iso);
                      let cellBg = '#EAF5EE';
                      let cellColor = '#287A4B';
                      let statusLabel = `Còn ${avail.available}`;

                      if (avail.available === 0) {
                        cellBg = '#FDF2F2';
                        cellColor = '#C0392B';
                        statusLabel = 'Hết phòng';
                      } else if (avail.available <= 3) {
                        cellBg = '#FEF8E7';
                        cellColor = '#A66A00';
                      }

                      return (
                        <td
                          key={col.iso}
                          style={{
                            backgroundColor: cellBg,
                            borderLeft: '1px solid #E5E7EB',
                            padding: '12px 8px'
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '15px', color: cellColor }} className="tabular-nums">
                            {avail.available}
                          </div>
                          <div style={{ fontSize: '10.5px', color: cellColor, fontWeight: 500 }}>
                            {statusLabel}
                          </div>
                          <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }} className="tabular-nums">
                            {avail.booked} đã đặt
                          </div>
                        </td>
                      );
                    })}
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
