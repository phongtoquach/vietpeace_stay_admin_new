import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildReportPeriodQuery } from './reportPeriod.js';
import { reportsApi } from '../../api/reports.js';
import { formatVND, formatDateVN } from '../../data/mockData.js';

const PAGE_SIZE = 10;

const BOOKING_STATUS_LABEL = {
  PENDING: 'Chờ xử lý',
  PAYMENT_PROCESSING: 'Đang thanh toán',
  CONFIRMED: 'Đã xác nhận',
  EXPIRED: 'Hết hạn',
  CANCELLED: 'Đã hủy',
  FAILED: 'Thất bại',
};

const PAYMENT_STATUS_LABEL = {
  PENDING: 'Chờ thanh toán',
  PROCESSING: 'Đang xử lý',
  SUCCESS: 'Đã thanh toán',
  FAILED: 'Thất bại',
  CANCELLED: 'Đã hủy',
  REFUND_PENDING: 'Chờ hoàn tiền',
  REFUND_PROCESSING: 'Đang hoàn tiền',
  REFUNDED: 'Đã hoàn tiền',
  PARTIALLY_REFUNDED: 'Hoàn tiền một phần',
};

export default function MonthlyOrdersTable({ year, month, accommodationId = null }) {
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;
  const periodQuery = buildReportPeriodQuery(year, month);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    reportsApi
      .getMonthlyOrders(year, month, page, PAGE_SIZE, accommodationId)
      .then((result) => {
        if (!cancelled) {
          setItems(result.items);
          setPagination(result.pagination);
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
  }, [year, month, accommodationId, page, reloadKey]);

  const handlePageChange = (nextPage) => {
    if (nextPage === page) return;
    setLoading(true);
    setError(null);
    setPage(nextPage);
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="table-responsive" style={{ border: 'none' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Mã đơn</th>
            <th>Khách</th>
            <th>Cơ sở</th>
            <th>Thời gian</th>
            <th style={{ textAlign: 'right' }}>Tổng tiền</th>
            <th>Trạng thái</th>
            <th>Thanh toán</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#6B7280' }}>
                Đang tải danh sách đơn...
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#C0392B' }}>
                {error.message || 'Không thể tải danh sách đơn.'}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ marginLeft: '8px' }}
                  onClick={handleRetry}
                >
                  Thử lại
                </button>
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#6B7280' }}>
                Chưa có đơn trong tháng.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link
                    to={`/admin/bookings/${item.id}`}
                    state={{ from: returnTo }}
                    className="code-badge"
                    style={{
                      fontWeight: 600,
                      color: '#292D32',
                      textDecoration: 'underline',
                    }}
                    title="Xem chi tiết đặt phòng"
                  >
                    {item.code}
                  </Link>
                </td>
                <td>{item.customerName}</td>
                <td>
                  {item.accommodationId && !accommodationId ? (
                    <Link
                      to={`/admin/reports/revenue/properties/${item.accommodationId}?${periodQuery}`}
                      state={{ from: returnTo }}
                      style={{
                        fontWeight: 600,
                        color: '#292D32',
                        textDecoration: 'underline',
                      }}
                      title="Xem chi tiết doanh thu cơ sở"
                    >
                      {item.accommodationName}
                    </Link>
                  ) : (
                    item.accommodationName
                  )}
                </td>
                <td className="tabular-nums">
                  {formatDateVN(item.checkInDate)} – {formatDateVN(item.checkOutDate)}
                </td>
                <td style={{ textAlign: 'right' }} className="tabular-nums">
                  {formatVND(item.totalAmount)}
                </td>
                <td>{BOOKING_STATUS_LABEL[item.status] || item.status}</td>
                <td>
                  {item.paymentStatus
                    ? PAYMENT_STATUS_LABEL[item.paymentStatus] || item.paymentStatus
                    : '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 4px 2px',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '12px', color: '#6B7280' }}>
          Tổng {pagination.total} đơn
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={loading || page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            Trước
          </button>
          <span style={{ fontSize: '12px', color: '#292D32' }}>
            Trang {page}/{Math.max(1, pagination.totalPages)}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={loading || page >= pagination.totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
