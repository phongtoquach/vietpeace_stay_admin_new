import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { formatVND, formatDateVN, formatDateTimeVN } from '../../data/mockData.js';
import { bookingsApi } from '../../api/bookings.js';
import {
  ArrowLeft,
  User,
  Building,
  Printer,
  Clock,
  Check,
  LogIn,
  LogOut
} from 'lucide-react';

export default function BookingDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { approveBooking, checkInBooking, checkOutBooking, showToast } = useAdmin();
  const fromReport = typeof location.state?.from === 'string'
    && location.state.from.startsWith('/admin/')
    ? location.state.from
    : null;
  const backTo = fromReport || '/admin/bookings';

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [approving, setApproving] = useState(false);
  const [stayLoading, setStayLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    bookingsApi.getDetail(id)
      .then((payload) => {
        if (!cancelled) {
          setBooking(payload.data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setBooking(null);
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
  }, [id, reloadKey]);

  if (loading) {
    return (
      <div className="admin-card" style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
        Đang tải chi tiết đặt phòng...
      </div>
    );
  }

  if (error) {
    const isNotFound = error.status === 404;

    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
          {isNotFound ? 'Không tìm thấy đơn đặt phòng' : 'Không tải được đơn đặt phòng'}
        </h2>
        <p style={{ color: '#6B7280', margin: '8px 0 16px' }}>
          {isNotFound
            ? `Đơn đặt phòng #${id} không tồn tại hoặc bạn không có quyền xem.`
            : error.message}
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          {!isNotFound && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setBooking(null);
                setError(null);
                setLoading(true);
                setReloadKey((key) => key + 1);
              }}
            >
              Thử lại
            </button>
          )}
          <Link to={backTo} className="btn btn-secondary">
            <ArrowLeft size={14} /> Quay lại
          </Link>
        </div>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  const handlePrint = () => {
    window.print();
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await approveBooking(booking.id);
      setBooking(null);
      setError(null);
      setLoading(true);
      setReloadKey((key) => key + 1);
    } catch (err) {
      if (err.status !== 401) {
        showToast(`Không duyệt được đơn: ${err.message}`, 'error');
      }
    } finally {
      setApproving(false);
    }
  };

  const reloadDetail = () => {
    setBooking(null);
    setError(null);
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const handleCheckIn = async () => {
    setStayLoading(true);
    try {
      await checkInBooking(booking.id);
      reloadDetail();
    } catch (err) {
      if (err.status !== 401) {
        showToast(`Không nhận phòng được: ${err.message}`, 'error');
      }
    } finally {
      setStayLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setStayLoading(true);
    try {
      await checkOutBooking(booking.id);
      reloadDetail();
    } catch (err) {
      if (err.status !== 401) {
        showToast(`Không trả phòng được: ${err.message}`, 'error');
      }
    } finally {
      setStayLoading(false);
    }
  };

  const badgeStatus = booking.operational_status === 'CHECKED_IN'
    ? 'checked-in'
    : booking.operational_status === 'CHECKED_OUT'
      ? 'checked-out'
      : booking.status;

  return (
    <div>
      <PageHeader
        title={`Đơn đặt phòng: ${booking.code}`}
        description={`Khởi tạo ngày ${booking.created_at ? formatDateTimeVN(booking.created_at) : '—'}`}
        breadcrumb={[
          { label: 'Đặt phòng', path: '/admin/bookings' },
          { label: booking.code }
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to={backTo} className="btn btn-secondary">
              <ArrowLeft size={14} /> {fromReport ? 'Quay lại' : 'Danh sách'}
            </Link>
            {booking.status === 'PENDING' && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={approving}
                onClick={handleApprove}
              >
                <Check size={14} /> {approving ? 'Đang duyệt...' : 'Xác nhận đặt phòng'}
              </button>
            )}
            {booking.status === 'CONFIRMED' && !booking.checked_in_at && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={stayLoading}
                onClick={handleCheckIn}
              >
                <LogIn size={14} /> {stayLoading ? 'Đang xử lý...' : 'Xác nhận nhận phòng'}
              </button>
            )}
            {booking.checked_in_at && !booking.checked_out_at && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={stayLoading}
                onClick={handleCheckOut}
              >
                <LogOut size={14} /> {stayLoading ? 'Đang xử lý...' : 'Hoàn tất trả phòng'}
              </button>
            )}
            <button type="button" onClick={handlePrint} className="btn btn-secondary">
              <Printer size={14} /> In phiếu đặt phòng
            </button>
          </div>
        }
      />

      {/* Status Summary Banner */}
      <div
        className="admin-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>Trạng thái đặt phòng:</span>
          <StatusBadge status={badgeStatus} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Left Column: Details & Pricing Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Guest & Property Information */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title">Thông tin kỳ lưu trú & Khách hàng</div>
            </div>
            <div className="admin-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Guest Details */}
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#292D32', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={15} color="#6B7280" /> Thông tin khách hàng đại diện
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: '#6B7280' }}>Họ và tên: </span>
                      <strong>{booking.customer_name}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280' }}>Số điện thoại: </span>
                      <span className="tabular-nums">{booking.customer_phone}</span>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280' }}>Địa chỉ email: </span>
                      <span>{booking.customer_email}</span>
                    </div>
                  </div>
                </div>

                {/* Accommodation Details */}
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#292D32', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building size={15} color="#6B7280" /> Thông tin cơ sở lưu trú
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: '#6B7280' }}>Cơ sở lưu trú: </span>
                      <strong>{booking.accommodation_name}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280' }}>Manager phụ trách: </span>
                      <strong>{booking.accommodation_manager_name || 'Chưa phân công'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280' }}>Địa chỉ: </span>
                      <span>{booking.accommodation_address || '—'}</span>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280' }}>Liên hệ: </span>
                      <span className="tabular-nums">
                        {booking.accommodation_phone || '—'}
                        {booking.accommodation_email ? ` · ${booking.accommodation_email}` : ''}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280' }}>Giờ nhận/trả phòng: </span>
                      <span className="tabular-nums">
                        {booking.accommodation_check_in_time || '—'} / {booking.accommodation_check_out_time || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stay summary */}
              <div
                style={{
                  marginTop: '16px',
                  padding: '10px 14px',
                  backgroundColor: '#FAFBFD',
                  border: '1px solid #E5E7EB',
                  borderRadius: '4px',
                  fontSize: '12.5px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '18px'
                }}
                className="tabular-nums"
              >
                <span>
                  <strong>Nhận phòng:</strong> {formatDateVN(booking.checkin_date)}
                </span>
                <span>
                  <strong>Trả phòng:</strong> {formatDateVN(booking.checkout_date)}
                </span>
                <span>
                  <strong>Thời gian:</strong> {booking.nights} đêm
                </span>
                <span>
                  <strong>Quy mô:</strong> {booking.rooms_count} phòng · {booking.adults_count} người lớn
                  {booking.children_count > 0 && `, ${booking.children_count} trẻ nhỏ`}
                </span>
              </div>

              {/* Special Requests */}
              {booking.special_requests && (
                <div style={{ marginTop: '16px', padding: '10px 14px', backgroundColor: '#FEFBE8', border: '1px solid #F8DF9E', borderRadius: '4px', fontSize: '12.5px' }}>
                  <strong>Yêu cầu đặc biệt của khách: </strong> {booking.special_requests}
                </div>
              )}
            </div>
          </div>

          {/* Pricing Calculation Breakdown */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title">Chi tiết phòng & Hóa đơn (VNĐ)</div>
              <span className="badge badge-neutral">{booking.currency}</span>
            </div>
            <div className="table-responsive" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Loại phòng</th>
                    <th style={{ textAlign: 'center' }}>Số khách</th>
                    <th style={{ textAlign: 'right' }}>Đơn giá / đêm</th>
                    <th style={{ textAlign: 'right' }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.room_type_name}</div>
                        {item.discount_amount > 0 && (
                          <div style={{ fontSize: '11px', color: '#287A4B' }}>
                            Giảm giá loại phòng: -{formatVND(item.discount_amount)}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }} className="tabular-nums">
                        {item.adults} người lớn{item.children > 0 ? ` · ${item.children} trẻ nhỏ` : ''}
                      </td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">
                        {formatVND(item.base_price)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                        {formatVND(item.room_subtotal)}
                      </td>
                    </tr>
                  ))}

                  <tr>
                    <td colSpan={3} style={{ textAlign: 'right', color: '#6B7280', fontSize: '12px' }}>
                      Tổng tiền phòng ({booking.nights} đêm)
                    </td>
                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                      {formatVND(booking.rooms_subtotal)}
                    </td>
                  </tr>

                  {booking.extra_guest_total > 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'right', color: '#6B7280', fontSize: '12px' }}>
                        Phụ thu khách phát sinh
                      </td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">
                        {formatVND(booking.extra_guest_total)}
                      </td>
                    </tr>
                  )}

                  {booking.room_discount_total > 0 && (
                    <tr style={{ color: '#287A4B' }}>
                      <td colSpan={3} style={{ textAlign: 'right', fontSize: '12px' }}>
                        Giảm giá loại phòng
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                        - {formatVND(booking.room_discount_total)}
                      </td>
                    </tr>
                  )}

                  {booking.discount_amount > 0 && (
                    <tr style={{ color: '#287A4B' }}>
                      <td colSpan={3} style={{ textAlign: 'right', fontSize: '12px' }}>
                        Khuyến mãi áp dụng
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                        - {formatVND(booking.discount_amount)}
                      </td>
                    </tr>
                  )}

                  {booking.tax_amount > 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'right', color: '#6B7280', fontSize: '12px' }}>
                        Thuế
                      </td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">
                        {formatVND(booking.tax_amount)}
                      </td>
                    </tr>
                  )}

                  {booking.service_fee > 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'right', color: '#6B7280', fontSize: '12px' }}>
                        Phí dịch vụ
                      </td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">
                        {formatVND(booking.service_fee)}
                      </td>
                    </tr>
                  )}

                  <tr style={{ backgroundColor: '#FAFBFD', fontSize: '15px' }}>
                    <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>
                      Tổng tiền thanh toán:
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#292D32' }} className="tabular-nums">
                      {formatVND(booking.total_amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Lifecycle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title">Mốc thời gian đặt phòng</div>
              <Clock size={15} color="#6B7280" />
            </div>
            <div className="admin-card-body" style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ color: '#6B7280', fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Tạo đơn
                </div>
                <div className="tabular-nums" style={{ fontWeight: 600, marginTop: '2px' }}>
                  {booking.created_at ? formatDateTimeVN(booking.created_at) : '—'}
                </div>
              </div>

              <div>
                <div style={{ color: '#6B7280', fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Xác nhận
                </div>
                <div className="tabular-nums" style={{ fontWeight: 600, marginTop: '2px' }}>
                  {booking.confirmed_at ? formatDateTimeVN(booking.confirmed_at) : '—'}
                </div>
              </div>

              <div>
                <div style={{ color: '#6B7280', fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Nhận phòng thực tế
                </div>
                <div className="tabular-nums" style={{ fontWeight: 600, marginTop: '2px' }}>
                  {booking.checked_in_at
                    ? `${formatDateTimeVN(booking.checked_in_at)} · ${booking.checked_in_by_name || 'Không xác định'}`
                    : '—'}
                </div>
              </div>

              <div>
                <div style={{ color: '#6B7280', fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Trả phòng thực tế
                </div>
                <div className="tabular-nums" style={{ fontWeight: 600, marginTop: '2px' }}>
                  {booking.checked_out_at
                    ? `${formatDateTimeVN(booking.checked_out_at)} · ${booking.checked_out_by_name || 'Không xác định'}`
                    : '—'}
                </div>
              </div>

              <div>
                <div style={{ color: '#6B7280', fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Hủy đơn
                </div>
                <div className="tabular-nums" style={{ fontWeight: 600, marginTop: '2px' }}>
                  {booking.cancelled_at ? formatDateTimeVN(booking.cancelled_at) : '—'}
                </div>
                {booking.cancellation_reason && (
                  <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '2px' }}>
                    Lý do: {booking.cancellation_reason}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
