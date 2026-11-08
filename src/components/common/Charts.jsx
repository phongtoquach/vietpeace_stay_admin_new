import React, { useState } from 'react';
import { formatVND } from '../../data/mockData.js';

const STATUS_LABELS = {
  'Confirmed': 'Đã xác nhận',
  'Checked-in': 'Đã nhận phòng',
  'Pending': 'Chờ xử lý',
  'Checked-out': 'Đã trả phòng',
  'Cancelled': 'Đã hủy'
};

const MONTH_LABELS = {
  'Jan': 'Thg 1',
  'Feb': 'Thg 2',
  'Mar': 'Thg 3',
  'Apr': 'Thg 4',
  'May': 'Thg 5',
  'Jun': 'Thg 6',
  'Jul': 'Thg 7',
  'Aug': 'Thg 8',
  'Sep': 'Thg 9',
  'Oct': 'Thg 10',
  'Nov': 'Thg 11',
  'Dec': 'Thg 12'
};

// SVG Line Chart for Monthly Revenue
export function RevenueLineChart({ data = [] }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (data.length === 0) return <div style={{ color: '#6B7280', padding: '16px', textAlign: 'center' }}>Không có dữ liệu</div>;

  const height = 220;
  const width = 600;
  const padding = { top: 20, right: 30, bottom: 35, left: 70 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d.revenue), 1000000000);
  const minVal = 0;

  const getX = (idx) => padding.left + (idx / (data.length - 1)) * chartWidth;
  const getY = (val) => padding.top + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;

  const points = data.map((d, i) => `${getX(i)},${getY(d.revenue)}`).join(' ');
  const areaPoints = `${getX(0)},${padding.top + chartHeight} ${points} ${getX(data.length - 1)},${padding.top + chartHeight}`;

  const yTicks = [0, maxVal * 0.33, maxVal * 0.66, maxVal];

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Horizontal grid lines */}
        {yTicks.map((tick, i) => {
          const y = getY(tick);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#E5E7EB"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#6B7280"
                className="tabular-nums"
              >
                {Math.round(tick / 1000000)} Tr
              </text>
            </g>
          );
        })}

        {/* Fill area */}
        <polygon points={areaPoints} fill="rgba(244, 197, 66, 0.18)" />

        {/* Line */}
        <polyline
          fill="none"
          stroke="#D6A82C"
          strokeWidth="2.5"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((d, i) => {
          const cx = getX(i);
          const cy = getY(d.revenue);
          const isHovered = hoveredIndex === i;
          const displayMonth = MONTH_LABELS[d.month] || d.month;
          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 6 : 4}
                fill={isHovered ? "#292D32" : "#F4C542"}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              {/* X label */}
              <text
                x={cx}
                y={height - 10}
                textAnchor="middle"
                fontSize="11.5"
                fill={isHovered ? "#292D32" : "#6B7280"}
                fontWeight={isHovered ? "600" : "normal"}
              >
                {displayMonth}
              </text>
            </g>
          );
        })}
      </svg>

      {hoveredIndex !== null && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '16px',
            backgroundColor: '#292D32',
            color: '#FFFFFF',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
          }}
        >
          <strong>{MONTH_LABELS[data[hoveredIndex].month] || data[hoveredIndex].month} 2026:</strong>{' '}
          <span className="tabular-nums">{formatVND(data[hoveredIndex].revenue)}</span>
        </div>
      )}
    </div>
  );
}

// SVG Bar Chart for Monthly Bookings or Occupancy
export function SimpleBarChart({ data = [], valueKey = 'bookings', unit = '', color = '#F4C542' }) {
  const [hovered, setHovered] = useState(null);

  if (data.length === 0) return <div style={{ color: '#6B7280', padding: '16px', textAlign: 'center' }}>Không có dữ liệu</div>;

  const height = 220;
  const width = 500;
  const padding = { top: 20, right: 20, bottom: 35, left: 45 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d[valueKey]), 10);
  const barWidth = Math.min(32, (chartWidth / data.length) * 0.65);

  const getY = (val) => padding.top + chartHeight - (val / maxVal) * chartHeight;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
          const val = Math.round(maxVal * p);
          const y = getY(val);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#E5E7EB"
                strokeDasharray="3 3"
              />
              <text x={padding.left - 6} y={y + 4} textAnchor="end" fontSize="10.5" fill="#6B7280" className="tabular-nums">
                {val}{unit}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const val = d[valueKey];
          const barHeight = (val / maxVal) * chartHeight;
          const x = padding.left + (i + 0.5) * (chartWidth / data.length) - barWidth / 2;
          const y = padding.top + chartHeight - barHeight;
          const isHovered = hovered === i;
          const displayMonth = MONTH_LABELS[d.month] || d.month;

          return (
            <g
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={isHovered ? '#292D32' : color}
                rx="2"
              />
              <text
                x={x + barWidth / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize="11"
                fill={isHovered ? '#292D32' : '#6B7280'}
                fontWeight={isHovered ? '600' : 'normal'}
              >
                {displayMonth}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered !== null && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '12px',
            backgroundColor: '#292D32',
            color: '#FFFFFF',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11.5px'
          }}
        >
          {MONTH_LABELS[data[hovered].month] || data[hovered].month}: <strong className="tabular-nums">{data[hovered][valueKey]}{unit}</strong>
        </div>
      )}
    </div>
  );
}

// SVG Doughnut Chart for Booking Statuses
export function DoughnutChart({ data = [] }) {
  const [hovered, setHovered] = useState(null);

  const total = data.reduce((acc, cur) => acc + cur.count, 0);
  const size = 180;
  const center = size / 2;
  const radius = 65;
  const strokeWidth = 26;

  let currentAngle = 0;

  const arcs = data.map((item, idx) => {
    const angle = total === 0 ? 0 : (item.count / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle += angle;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;
    const pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;

    return { ...item, pathData, idx };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {arcs.map((arc) => (
            <path
              key={arc.status}
              d={arc.pathData}
              fill="none"
              stroke={hovered === arc.idx ? '#1F2937' : arc.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              onMouseEnter={() => setHovered(arc.idx)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer', transition: 'stroke 0.15s' }}
            />
          ))}
        </svg>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontSize: '11px', color: '#6B7280' }}>Tổng cộng</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#292D32' }} className="tabular-nums">
            {total}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '140px' }}>
        {data.map((item, idx) => (
          <div
            key={item.status}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              padding: '2px 4px',
              borderRadius: '3px',
              backgroundColor: hovered === idx ? '#F3F4F6' : 'transparent',
              cursor: 'pointer'
            }}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '2px',
                  backgroundColor: item.color
                }}
              />
              <span style={{ color: '#292D32' }}>{STATUS_LABELS[item.status] || item.status}</span>
            </div>
            <span style={{ fontWeight: '600', color: '#292D32' }} className="tabular-nums">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
