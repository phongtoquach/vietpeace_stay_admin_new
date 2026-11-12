import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { ArrowLeft, Send, StickyNote, UserCheck } from 'lucide-react';
import {
  fetchTicketDetail,
  fetchManagersOverview,
  assignTicket,
  transitionTicket,
  replyTicket,
} from '../../api/chatbot.js';

const STATUS_OPTIONS = {
  OPEN: 'Mới',
  ASSIGNED: 'Đã gán',
  IN_PROGRESS: 'Đang xử lý',
  WAITING_CUSTOMER: 'Chờ khách trả lời',
  RESOLVED: 'Đã xử lý',
  CLOSED: 'Đã đóng',
  CANCELLED: 'Đã hủy',
};

const CATEGORY_LABELS = {
  CANCEL_REFUND: 'Hủy + hoàn tiền',
  BOOKING_CHANGE: 'Đổi booking',
  PAYMENT_PROBLEM: 'Sự cố thanh toán',
  REFUND_REQUEST: 'Yêu cầu hoàn tiền',
  HUMAN_SUPPORT: 'Cần nhân viên',
  COMPLAINT: 'Khiếu nại',
  FEEDBACK: 'Góp ý',
};

// State machine T02: from -> to[]
const ALLOWED_TRANSITIONS = {
  OPEN: ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_CUSTOMER', 'RESOLVED'],
  WAITING_CUSTOMER: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: ['OPEN'],
  CANCELLED: [],
};

// Manager chỉ được các cặp (from->to) này (chatbot_admin_service.MANAGER_ALLOWED_TRANSITIONS)
const MANAGER_ALLOWED_TRANSITIONS = new Set([
  'ASSIGNED->IN_PROGRESS',
  'IN_PROGRESS->WAITING_CUSTOMER',
  'IN_PROGRESS->RESOLVED',
  'WAITING_CUSTOMER->RESOLVED',
  'RESOLVED->IN_PROGRESS',
]);

const REASON_REQUIRED_TARGETS = new Set(['CANCELLED', 'OPEN']);

const SENDER_LABELS = {
  CUSTOMER: 'Khách',
  GUEST: 'Khách (ẩn danh)',
  BOT: 'Chatbot',
  STAFF: 'Nhân viên',
  SYSTEM: 'Hệ thống',
};

export default function TicketDetailPage() {
  const { id } = useParams();
  const { currentLoggedInUser } = useAuth();
  const isAdmin = currentLoggedInUser?.role === 'ADMIN';

  const [detail, setDetail] = useState(null);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  const [assigneeId, setAssigneeId] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState('');
  const [transitionReason, setTransitionReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchTicketDetail(id)
      .then((payload) => {
        if (!cancelled) {
          setDetail(payload?.data || null);
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
  }, [id]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  // Danh sách manager đủ phạm vi cho cơ sở của ticket (T09A) — chỉ admin cần
  useEffect(() => {
    if (!isAdmin || !detail?.ticket?.accommodation_id) {
      return;
    }
    fetchManagersOverview()
      .then((payload) => {
        const overview = Array.isArray(payload?.data)
          ? payload.data
          : payload?.data?.items || [];
        const list = overview
          .filter((item) => item.id === detail.ticket.accommodation_id)
          .map((item) => item.manager)
          .filter((mgr) => mgr && mgr.status === 1)
          .map((mgr) => ({ userId: mgr.userId, fullName: mgr.fullName }));
        setManagers(list);
      })
      .catch(() => setManagers([]));
  }, [isAdmin, detail?.ticket?.accommodation_id]);

  const ticket = detail?.ticket;
  const messages = detail?.messages || [];
  const booking = detail?.booking_context;

  const allowedTargets = (ALLOWED_TRANSITIONS[ticket?.status] || []).filter((to) => {
    if (isAdmin) {
      return true;
    }
    return MANAGER_ALLOWED_TRANSITIONS.has(`${ticket?.status}->${to}`);
  });

  const runAction = async (fn, successNotice) => {
    setBusy(true);
    setActionError(null);
    setActionNotice(null);
    try {
      await fn();
      setActionNotice(successNotice);
      load();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = () => {
    if (!assigneeId) {
      setActionError('Chọn nhân viên trước khi gán.');
      return;
    }
    runAction(
      () => assignTicket(id, assigneeId),
      'Đã gán nhân viên.',
    );
  };

  const handleTransition = () => {
    if (!transitionTarget) {
      setActionError('Chọn trạng thái đích trước khi chuyển.');
      return;
    }
    if (REASON_REQUIRED_TARGETS.has(transitionTarget) && !transitionReason.trim()) {
      setActionError('Bắt buộc ghi lý do cho chuyển trạng thái này.');
      return;
    }
    runAction(
      () => transitionTicket(id, transitionTarget, transitionReason.trim() || null),
      `Đã chuyển sang "${STATUS_OPTIONS[transitionTarget]}".`,
    );
  };

  const handleReply = () => {
    if (!replyText.trim()) {
      setActionError('Nhập nội dung phản hồi trước khi gửi.');
      return;
    }
    runAction(
      () => replyTicket(id, replyText.trim(), isInternalNote),
      isInternalNote ? 'Đã lưu ghi chú nội bộ.' : 'Đã gửi phản hồi cho khách.',
    );
    setReplyText('');
    setIsInternalNote(false);
  };

  if (loading) {
    return (
      <>
        <p>Đang tải ticket...</p>
      </>
    );
  }

  if (error || !ticket) {
    return (
      <>
        <div style={{
          padding: '10px 14px', marginBottom: 16, borderRadius: 6,
          background: '#fdecea', border: '1px solid #f5c6cb', color: '#842029',
        }}>
          {error || 'Không tìm thấy ticket.'}
        </div>
        <Link to="/admin/chatbot" className="btn btn-secondary btn-sm"><ArrowLeft size={14} /> Về danh sách</Link>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Ticket ${ticket.ticket_code}`}
        description={`${CATEGORY_LABELS[ticket.category] || ticket.category} — tạo ${new Date(ticket.created_at).toLocaleString('vi-VN')}`}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <StatusBadge status={ticket.status} label={STATUS_OPTIONS[ticket.status] || ticket.status} />
            <Link to="/admin/chatbot" className="btn btn-secondary btn-sm"><ArrowLeft size={14} /> Danh sách</Link>
          </div>
        }
      />

      {actionNotice && (
        <div style={{
          padding: '10px 14px', marginBottom: 12, borderRadius: 6,
          background: '#e8f5e9', border: '1px solid #a5d6a7', color: '#1b5e20',
        }}>
          {actionNotice}
        </div>
      )}
      {actionError && (
        <div style={{
          padding: '10px 14px', marginBottom: 12, borderRadius: 6,
          background: '#fdecea', border: '1px solid #f5c6cb', color: '#842029',
        }}>
          {actionError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
        {/* Cột trái: hội thoại + form phản hồi */}
        <div>
          <div className="admin-card" style={{ padding: 16 }}>
            <h3 style={{ marginBottom: 12 }}>Hội thoại</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 480, overflowY: 'auto' }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: ['CUSTOMER', 'GUEST'].includes(msg.sender_type) ? 'flex-start' : 'flex-end',
                    maxWidth: '80%',
                    background: msg.is_internal_note
                      ? '#fff7d6'
                      : ['CUSTOMER', 'GUEST'].includes(msg.sender_type)
                        ? '#f1f3f7'
                        : '#e7f0ff',
                    border: msg.is_internal_note ? '1px dashed #d4b106' : '1px solid #e3e6ea',
                    borderRadius: 8,
                    padding: '8px 12px',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                    {SENDER_LABELS[msg.sender_type] || msg.sender_type}
                    {msg.is_internal_note && ' • Ghi chú nội bộ'}
                    {' — '}
                    {new Date(msg.created_at).toLocaleString('vi-VN')}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                </div>
              ))}
              {messages.length === 0 && <p>Chưa có tin nhắn nào.</p>}
            </div>
          </div>

          {['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER'].includes(ticket.status) && (
            <div className="admin-card" style={{ padding: 16, marginTop: 16 }}>
              <h3 style={{ marginBottom: 12 }}>
                {isInternalNote ? <StickyNote size={16} style={{ marginRight: 6 }} /> : <Send size={16} style={{ marginRight: 6 }} />}
                Phản hồi khách
              </h3>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Nhập nội dung phản hồi cho khách..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                />
                Ghi chú nội bộ (khách không nhìn thấy)
              </label>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 10 }}
                onClick={handleReply}
                disabled={busy || !replyText.trim()}
              >
                <Send size={14} /> {isInternalNote ? 'Lưu ghi chú' : 'Gửi phản hồi'}
              </button>
            </div>
          )}
        </div>

        {/* Cột phải: thông tin ticket + booking context + thao tác */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="admin-card" style={{ padding: 16 }}>
            <h3 style={{ marginBottom: 12 }}>Thông tin ticket</h3>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '110px 1fr', rowGap: 8, fontSize: 14 }}>
              <dt>Mã</dt><dd style={{ margin: 0 }}>{ticket.ticket_code}</dd>
              <dt>Khách</dt><dd style={{ margin: 0 }}>{ticket.customer_name || 'Khách vãng lai'}</dd>
              <dt>Cơ sở</dt><dd style={{ margin: 0 }}>{ticket.accommodation_name || '— (admin queue)'}</dd>
              <dt>Nhân viên</dt>
              <dd style={{ margin: 0 }}>
                {ticket.assignee_name || 'Chưa gán'}
                {!isAdmin && !ticket.assignee_name && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>(Chỉ ADMIN gán nhân viên)</div>
                )}
              </dd>
              {ticket.reason && (<><dt>Lý do</dt><dd style={{ margin: 0 }}>{ticket.reason}</dd></>)}
            </dl>
          </div>

          {booking && (
            <div className="admin-card" style={{ padding: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Booking liên quan</h3>
              <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '110px 1fr', rowGap: 8, fontSize: 14 }}>
                <dt>Mã</dt>
                <dd style={{ margin: 0 }}>
                  <Link
                    to={`/admin/bookings/${ticket.booking_id}`}
                    style={{ fontWeight: 600, textDecoration: 'none' }}
                    title="Mở trang chi tiết booking"
                  >
                    {booking.booking_code}
                  </Link>
                </dd>
                <dt>Cơ sở</dt><dd style={{ margin: 0 }}>{booking.accommodation_name}</dd>
                <dt>Nhận phòng</dt><dd style={{ margin: 0 }}>{new Date(booking.check_in_date).toLocaleDateString('vi-VN')}</dd>
                <dt>Trả phòng</dt><dd style={{ margin: 0 }}>{new Date(booking.check_out_date).toLocaleDateString('vi-VN')}</dd>
                <dt>Trạng thái</dt><dd style={{ margin: 0 }}>{booking.booking_status}</dd>
                <dt>Tổng tiền</dt><dd style={{ margin: 0 }}>{Number(booking.total_amount).toLocaleString('vi-VN')} {booking.currency}</dd>
              </dl>
              <Link
                to={`/admin/bookings/${ticket.booking_id}`}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                Mở chi tiết booking
              </Link>
            </div>
          )}

          {isAdmin && (
            <div className="admin-card" style={{ padding: 16 }}>
              <h3 style={{ marginBottom: 12 }}><UserCheck size={16} style={{ marginRight: 6 }} /> Gán nhân viên</h3>
              {ticket.accommodation_id ? (
                <>
                  <select
                    className="form-input"
                    style={{ width: '100%' }}
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                  >
                    <option value="">— Chọn nhân viên phụ trách cơ sở này —</option>
                    {managers.map((mgr) => (
                      <option key={mgr.userId} value={mgr.userId}>{mgr.fullName}</option>
                    ))}
                  </select>
                  {managers.length === 0 && <p style={{ fontSize: 13, color: '#888', marginTop: 6 }}>Không có manager đang hoạt động cho cơ sở này.</p>}
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ marginTop: 10 }}
                    onClick={handleAssign}
                    disabled={busy || !assigneeId}
                  >
                    Gán ticket
                  </button>
                </>
              ) : (
                <p style={{ fontSize: 13, color: '#888' }}>
                  Ticket không có scope cơ sở (admin queue) — xử lý trực tiếp bằng chuyển trạng thái, không gán manager.
                </p>
              )}
            </div>
          )}

          {allowedTargets.length > 0 && (
            <div className="admin-card" style={{ padding: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Chuyển trạng thái</h3>
              <select
                className="form-input"
                style={{ width: '100%' }}
                value={transitionTarget}
                onChange={(e) => setTransitionTarget(e.target.value)}
              >
                <option value="">— Chọn trạng thái đích —</option>
                {allowedTargets.map((target) => (
                  <option key={target} value={target}>{STATUS_OPTIONS[target]}</option>
                ))}
              </select>
              {REASON_REQUIRED_TARGETS.has(transitionTarget) && (
                <textarea
                  className="form-input"
                  rows={2}
                  style={{ marginTop: 8 }}
                  placeholder="Lý do (bắt buộc)"
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                />
              )}
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 10 }}
                onClick={handleTransition}
                disabled={busy || !transitionTarget}
              >
                Xác nhận chuyển
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
