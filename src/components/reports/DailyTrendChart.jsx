import { useState } from 'react';

const DAY_TICKS = [0, 4, 9, 14, 19, 24];

export default function DailyTrendChart({
  data = [],
  valueKey,
  unit = '',
  color = '#287A4B',
  formatValue = (value) => `${value}${unit}`,
  formatAxis = (value) => Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 1 }),
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (data.length === 0) {
    return (
      <div style={{ color: '#6B7280', padding: '16px', textAlign: 'center' }}>
        Không có dữ liệu
      </div>
    );
  }

  const width = 600;
  const height = 220;
  const padding = { top: 24, right: 24, bottom: 34, left: 64 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const values = data.map((entry) => Number(entry[valueKey]) || 0);
  const maxVal = Math.max(...values, 1);
  const getX = (index) => padding.left + (index / Math.max(1, data.length - 1)) * chartWidth;
  const getY = (value) => padding.top + chartHeight - (value / maxVal) * chartHeight;
  const points = data
    .map((entry, index) => `${getX(index)},${getY(Number(entry[valueKey]) || 0)}`)
    .join(' ');
  const areaPoints = `${getX(0)},${padding.top + chartHeight} ${points} ${getX(data.length - 1)},${padding.top + chartHeight}`;
  const yTicks = [0, maxVal * 0.33, maxVal * 0.66, maxVal];
  const tickIndexes = Array.from(new Set([...DAY_TICKS, data.length - 1]))
    .filter((index) => index < data.length);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {hoveredIndex !== null && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            padding: '6px 10px',
            fontSize: '12px',
            color: '#292D32',
            pointerEvents: 'none',
            zIndex: 2,
            whiteSpace: 'nowrap',
          }}
        >
          <strong>Ngày {data[hoveredIndex].day}:</strong>{' '}
          {formatValue(data[hoveredIndex][valueKey])}
        </div>
      )}

      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {yTicks.map((tick, index) => {
          const y = getY(tick);
          return (
            <g key={index}>
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
                fontSize="10"
                fill="#6B7280"
              >
                {formatAxis(tick)}
              </text>
            </g>
          );
        })}

        <polygon points={areaPoints} fill={color} opacity="0.08" />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" />

        {data.map((entry, index) => (
          <g key={entry.day}>
            <circle
              cx={getX(index)}
              cy={getY(Number(entry[valueKey]) || 0)}
              r={hoveredIndex === index ? 4 : 2.5}
              fill={color}
            />
            <rect
              x={getX(index) - chartWidth / (data.length * 2)}
              y={padding.top}
              width={chartWidth / data.length}
              height={chartHeight}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          </g>
        ))}

        {tickIndexes.map((index) => (
          <text
            key={index}
            x={getX(index)}
            y={height - 12}
            textAnchor="middle"
            fontSize="10"
            fill="#6B7280"
          >
            {data[index].day}
          </text>
        ))}
      </svg>
    </div>
  );
}
