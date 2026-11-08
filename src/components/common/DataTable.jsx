import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Inbox } from 'lucide-react';

export default function DataTable({
  columns = [],
  data = [],
  loading = false,          // true = đang chờ API, vẽ skeleton thay cho dữ liệu
  skeletonRows = 5,         // số dòng giả, nên bằng số dòng mỗi trang
  sortField,
  sortDirection,
  onSort,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  emptyMessage = "Không tìm thấy dữ liệu phù hợp.",
  emptyAction
}) {
  const handleSort = (field) => {
    if (!onSort) return;
    if (sortField === field) {
      onSort(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(field, 'asc');
    }
  };

  const isAllSelected = data.length > 0 && selectedRows.length === data.length;

  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            {onSelectAll && (
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  aria-label="Chọn tất cả các dòng"
                />
              </th>
            )}
            {columns.map((col, idx) => {
              const isSorted = sortField === col.accessor;
              return (
                <th
                  key={col.accessor || idx}
                  className={col.sortable ? 'sortable' : ''}
                  onClick={() => col.sortable && handleSort(col.accessor)}
                  style={{
                    width: col.width,
                    textAlign: col.align || 'left'
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
                      width: '100%'
                    }}
                  >
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span style={{ color: isSorted ? '#292D32' : '#9CA3AF' }}>
                        {isSorted ? (
                          sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                        ) : (
                          <ArrowUpDown size={12} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            // Vẫn render <tr>/<td> theo đúng số cột để bảng giữ kích thước,
            // tránh việc bảng biến mất rồi "nhảy" layout khi dữ liệu về.
            Array.from({ length: skeletonRows }).map((_, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`}>
                {onSelectAll && (
                  <td style={{ textAlign: 'center' }}>
                    <div className="skeleton-line skeleton-line-sm" />
                  </td>
                )}
                {columns.map((col, colIdx) => (
                  <td key={col.accessor || colIdx} style={{ textAlign: col.align || 'left' }}>
                    {/* Cột hẹp (width cố định) dùng thanh xám ngắn cho giống dữ liệu thật */}
                    <div className={`skeleton-line${col.width ? ' skeleton-line-sm' : ''}`} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (onSelectAll ? 1 : 0)}
                style={{ padding: '40px 16px', textAlign: 'center' }}
              >
                <div className="empty-state" style={{ padding: 0 }}>
                  <Inbox size={32} className="empty-state-icon" />
                  <div className="empty-state-title">{emptyMessage}</div>
                  <div className="empty-state-desc">Thử điều chỉnh từ khóa tìm kiếm hoặc tiêu chí lọc hiện tại.</div>
                  {emptyAction}
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => {
              const isSelected = selectedRows.includes(row.id);
              return (
                <tr key={row.id || rowIdx} style={{ backgroundColor: isSelected ? '#FEFBE8' : undefined }}>
                  {onSelectRow && (
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectRow(row.id)}
                        aria-label={`Chọn mục ${row.id}`}
                      />
                    </td>
                  )}
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.accessor || colIdx}
                      style={{
                        textAlign: col.align || 'left'
                      }}
                      className={col.className || ''}
                    >
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
