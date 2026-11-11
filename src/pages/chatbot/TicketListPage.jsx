import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { RotateCcw, Eye } from 'lucide-react';
import { fetchTickets } from '../../api/chatbot.js';

// Trạng thái khớp CHECK constraint dbo.tickets (workspace/state-machine.md).
const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Mới' },
  { value: 'ASSIGNED', label: 'Đã gán' },
  { value: 'IN_PROGRESS', label: 'Đang xử lý' },
  { value: 'WAITING_CUSTOMER', label: 'Chờ khách trả lời' },
  { value: 'RESOLVED', label: 'Đã xử lý' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const CATEGORY_OPTIONS = [
  { value: 'CANCEL_REFUND', label: 'Hủy + hoàn tiền' },
  { value: 'BOOKING_CHANGE', label: 'Đổi booking' },
  { value: 'PAYMENT_PROBLEM', label: 'Sự cố thanh toán' },
  { value: 'REFUND_REQUEST', label: 'Yêu cầu hoàn tiền' },
  { value: 'HUMAN_SUPPORT', label: 'Cần nhân viên' },
  { value: 'COMPLAINT', label: 'Khiếu nại' },
  { value: 'FEEDBACK', label: 'Góp ý' },
];

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));

export default function TicketListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || '';
  const categoryFilter = searchParams.get('category') || '';

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchTickets({ status: statusFilter, category: categoryFilter, limit: 100 })
      .then((payload) => {
        if (!cancelled) {
          setTickets(payload?.data?.tickets || []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
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
  }, [statusFilter, categoryFilter, reloadKey]);

  const setFilter = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const columns = [
    {
      accessor: 'ticket_code',
      header: 'Mã ticket',
      render: (row) => (
        <Link
          to={`/admin/chatbot/${row.id}`}
          style={{ fontWeight: 600, color: 'var(--color-primary, #2563eb)', textDecoration: 'none' }}
          title="Mở chi tiết ticket"
        >
          {row.ticket_code}
        </Link>
      ),
    },
    {
      accessor: 'category',
      header: 'Loại',
      render: (row) => CATEGORY_OPTIONS.find((o) => o.value === row.category)?.label || row.category,
    },
    {
      accessor: 'subject',
      header: 'Tiêu đề',
      render: (row) => (
        <span style={{ display: 'inline-block', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.subject}
        </span>
      ),
    },
    { accessor: 'accommodation_name', header: 'Cơ sở', render: (row) => row.accommodation_name || '— (admin queue)' },
    { accessor: 'booking_code', header: 'Booking', render: (row) => row.booking_code || '—' },
    { accessor: 'customer_name', header: 'Khách', render: (row) => row.customer_name || 'Khách vãng lai' },
    {
      accessor: 'status',
      header: 'Trạng thái',
      render: (row) => <StatusBadge status={row.status} label={STATUS_LABELS[row.status] || row.status} />,
    },
    { accessor: 'created_at', header: 'Tạo lúc', render: (row) => new Date(row.created_at).toLocaleString('vi-VN') },
    {
      accessor: 'actions',
      header: '',
      render: (row) => (
        <Link to={`/admin/chatbot/${row.id}`} className="row-action-btn" title="Xem chi tiết">
          <Eye size={14} />
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Hỗ trợ khách"
        description="Yêu cầu cần nhân viên xử lý từ chatbot website. Manager chỉ thấy ticket thuộc cơ sở mình phụ trách."
        actions={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
          >
            <RotateCcw size={14} /> Làm mới
          </button>
        }
      />

      <div className="filter-panel">
        <div className="filter-group">
          <label className="filter-label">Trạng thái</label>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setFilter('status', e.target.value)}
            aria-label="Lọc theo trạng thái"
          >
            <option value="">Tất cả</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Loại</label>
          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setFilter('category', e.target.value)}
            aria-label="Lọc theo loại"
          >
            <option value="">Tất cả</option>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', marginBottom: 16, borderRadius: 6,
          background: '#fdecea', border: '1px solid #f5c6cb', color: '#842029',
        }}>
          {error}
        </div>
      )}

      <div className="admin-card">
        <DataTable
          columns={columns}
          data={tickets}
          loading={loading}
          skeletonRows={5}
          emptyMessage="Không có ticket nào khớp bộ lọc."
        />
      </div>
    </>
  );
}
