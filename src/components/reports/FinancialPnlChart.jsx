import { useState } from 'react';
import { formatCompactVND } from '../../api/financialReports.js';
import { formatVND } from '../../data/mockData.js';

const EXPENSE_ITEMS = [
  { key: 'staff_payroll_cost', label: 'Quỹ lương nhân viên cơ sở', color: '#0284C7' },
  { key: 'manager_salary_cost', label: 'Lương cơ bản Manager', color: '#2563EB' },
  { key: 'asset_depreciation_cost', label: 'Hao mòn & Khấu hao tài sản', color: '#7C3AED' },
  { key: 'electricity_cost', label: 'Tiền điện vận hành', color: '#F59E0B' },
  { key: 'maintenance_repair_cost', label: 'Bảo trì sửa chữa & Vật tư', color: '#D97706' },
  { key: 'water_cost', label: 'Tiền nước sinh hoạt & hồ bơi', color: '#06B6D4' },
  { key: 'other_operating_cost', label: 'Chi phí vận hành khác', color: '#475569' },
  { key: 'internet_fuel_cost', label: 'Internet & Năng lượng dự phòng', color: '#10B981' },
];

export default function FinancialPnlChart({
  monthlySeries = [],
  expenseBreakdown = {},
  totalOperatingExpenses = 0,
  periodLabel = '',
}) {
  const [hoveredMonth, setHoveredMonth] = useState(null);

  const visibleSeries = monthlySeries.filter(
    (m) => m.totalRevenue > 0 || m.totalExpenses > 0 || m.netProfitAfterTax !== 0,
  );
  const seriesToRender = visibleSeries.length > 0 ? visibleSeries : monthlySeries;

  const maxAbsVal = Math.max(
    1,
    ...seriesToRender.flatMap((m) => [
      Math.abs(m.totalRevenue || 0),
      Math.abs(m.totalExpenses || 0),
      Math.abs(m.netProfitAfterTax || 0),
    ]),
  );

  const svgWidth = Math.max(540, seriesToRender.length * 64 + 64);
  const svgHeight = 250;
  const padLeft = 58;
  const padRight = 16;
  const padTop = 20;
  const padBottom = 32;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;
  const stepW = seriesToRender.length > 0 ? chartW / seriesToRender.length : chartW;
  const barW = Math.min(14, Math.max(7, stepW * 0.2));

  const ticks = [0, 0.33, 0.66, 1].map((ratio) => ({
    y: padTop + chartH * (1 - ratio),
    value: Math.round(maxAbsVal * ratio),
  }));

  const hovered = hoveredMonth
    ? seriesToRender.find((m) => m.month === hoveredMonth)
    : null;

  return (
    <div className="fin-chart-split">
      {/* Left: Grouped Monthly Revenue / OPEX / Profit Bar Chart */}
      <div className="admin-card" style={{ marginBottom: 0 }}>
        <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div className="admin-card-title">Biểu đồ đối sánh Thu – Chi – Lợi nhuận Sau Thuế</div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
              Di chuột vào từng tháng để xem chi tiết ({periodLabel})
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', fontWeight: 600 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0369A1' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#0284C7' }} />
              Tổng Thu
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#B45309' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#F59E0B' }} />
              Tổng Chi
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#15803D' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#16A34A' }} />
              LN Sau Thuế
            </span>
          </div>
        </div>

        <div className="admin-card-body" style={{ position: 'relative' }}>
          {hovered && (
            <div
              style={{
                background: '#0F172A',
                color: '#F8FAFC',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                marginBottom: '10px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '14px',
                alignItems: 'center',
              }}
            >
              <strong>{hovered.label}:</strong>
              <span>Thu ròng: <strong style={{ color: '#38BDF8' }}>{formatVND(hovered.totalRevenue)}</strong></span>
              <span>Chi OPEX: <strong style={{ color: '#FBBF24' }}>{formatVND(hovered.totalExpenses)}</strong></span>
              <span>
                LN Sau Thuế:{' '}
                <strong style={{ color: hovered.netProfitAfterTax < 0 ? '#FCA5A5' : '#4ADE80' }}>
                  {formatVND(hovered.netProfitAfterTax)}
                </strong>
              </span>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ width: '100%', minWidth: '520px', height: 'auto', display: 'block' }}
              role="img"
              aria-label={`Biểu đồ đối sánh Thu Chi Lợi nhuận ${periodLabel}`}
            >
              {ticks.map((t, idx) => (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    x2={svgWidth - padRight}
                    y1={t.y}
                    y2={t.y}
                    stroke="#E5E7EB"
                    strokeDasharray={idx === 0 ? undefined : '3 3'}
                  />
                  <text
                    x={padLeft - 8}
                    y={t.y + 4}
                    textAnchor="end"
                    fontSize="10.5"
                    fill="#6B7280"
                  >
                    {t.value === 0 ? '0 đ' : formatCompactVND(t.value)}
                  </text>
                </g>
              ))}

              {seriesToRender.map((item, idx) => {
                const centerX = padLeft + idx * stepW + stepW / 2;
                const revH = (Math.abs(item.totalRevenue || 0) / maxAbsVal) * chartH;
                const expH = (Math.abs(item.totalExpenses || 0) / maxAbsVal) * chartH;
                const profH = (Math.abs(item.netProfitAfterTax || 0) / maxAbsVal) * chartH;
                const profColor = (item.netProfitAfterTax || 0) < 0 ? '#DC2626' : '#16A34A';
                const isActive = hoveredMonth === item.month;

                return (
                  <g
                    key={item.month}
                    onMouseEnter={() => setHoveredMonth(item.month)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {isActive && (
                      <rect
                        x={padLeft + idx * stepW + 2}
                        y={padTop - 4}
                        width={stepW - 4}
                        height={chartH + 8}
                        rx={6}
                        fill="#F3F4F6"
                      />
                    )}
                    <rect
                      x={centerX - barW * 1.65}
                      y={padTop + chartH - revH}
                      width={barW}
                      height={Math.max(2, revH)}
                      rx={3}
                      fill="#0284C7"
                    />
                    <rect
                      x={centerX - barW * 0.5}
                      y={padTop + chartH - expH}
                      width={barW}
                      height={Math.max(2, expH)}
                      rx={3}
                      fill="#F59E0B"
                    />
                    <rect
                      x={centerX + barW * 0.65}
                      y={padTop + chartH - profH}
                      width={barW}
                      height={Math.max(2, profH)}
                      rx={3}
                      fill={profColor}
                    />
                    <text
                      x={centerX}
                      y={svgHeight - 10}
                      textAnchor="middle"
                      fontSize="11.5"
                      fontWeight={isActive ? '700' : '500'}
                      fill={isActive ? '#111827' : '#4B5563'}
                    >
                      {item.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Right: OPEX Structure Share */}
      <div className="admin-card" style={{ marginBottom: 0 }}>
        <div className="admin-card-header">
          <div className="admin-card-title">Cơ cấu các khoản chi</div>
          <span style={{ fontWeight: 700, fontSize: '13px', color: '#B45309' }} className="tabular-nums">
            {formatCompactVND(totalOperatingExpenses)}
          </span>
        </div>
        <div className="admin-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {EXPENSE_ITEMS.map((item) => {
            const val = Number(expenseBreakdown?.[item.key] || 0);
            const pct = totalOperatingExpenses > 0
              ? Math.min(100, Number(((val / totalOperatingExpenses) * 100).toFixed(1)))
              : 0;
            return (
              <div key={item.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#374151', fontWeight: 600 }}>{item.label}</span>
                  <span style={{ color: '#111827', fontWeight: 700 }} className="tabular-nums">
                    {formatCompactVND(val)} <span style={{ color: '#6B7280', fontWeight: 500 }}>({pct}%)</span>
                  </span>
                </div>
                <div style={{ height: '7px', background: '#F3F4F6', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: item.color,
                      borderRadius: '999px',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
