import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { formatVND, formatDateVN, formatDateTimeVN } from '../../data/mockData.js';
import {
  ArrowLeft,
  Calendar,
  User,
  CreditCard,
  Building,
  CheckCircle,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  Printer
} from 'lucide-react';

export default function BookingDetailPage() {
  const { id } = useParams();
  const { bookings, updateBookingStatus, updatePaymentStatus } = useAdmin();

  const booking = bookings.find((b) => b.id === Number(id));

  if (!booking) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Không tìm thấy đơn đặt phòng</h2>
        <p style={{ color: '#6B7280', margin: '8px 0 16px' }}>Đơn đặt phòng mã #{id} không tồn tại hoặc đã bị xóa.</p>
        <Link to="/admin/bookings" className="btn btn-secondary">
          <ArrowLeft size={14} /> Quay lại danh sách đặt phòng
        </Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <PageHeader
        title={`Đơn đặt phòng: ${booking.code}`}
        description={`Khởi tạo ngày ${formatDateTimeVN(booking.created_at)} · Trạng thái: ${booking.booking_status}`}
        breadcrumb={[
          { label: 'Đặt phòng', path: '/admin/bookings' },
          { label: booking.code }
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/admin/bookings" className="btn btn-secondary">
              <ArrowLeft size={14} /> Danh sách
            </Link>
            <button type="button" onClick={handlePrint} className="btn btn-secondary">
              <Printer size={14} /> In phiếu đặt phòng
            </button>
            {booking.booking_status === 'Pending' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => updateBookingStatus(booking.id, 'Confirmed')}
              >
                Xác nhận đặt phòng
              </button>
            )}
            {booking.booking_status === 'Confirmed' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => updateBookingStatus(booking.id, 'Checked-in')}
              >
                Xác nhận nhận phòng
              </button>
            )}
            {booking.booking_status === 'Checked-in' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => updateBookingStatus(booking.id, 'Checked-out')}
              >
                Hoàn tất trả phòng
              </button>
            )}
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
          <StatusBadge status={booking.booking_status} />
          <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: '12px' }}>Trạng thái thanh toán:</span>
          <StatusBadge status={booking.payment_status} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>Cập nhật nhanh:</span>
          <select
            className="filter-select"
            value={booking.booking_status}
            onChange={(e) => updateBookingStatus(booking.id, e.target.value)}
          >
            <option value="Pending">Chờ xử lý (Pending)</option>
            <option value="Confirmed">Đã xác nhận (Confirmed)</option>
            <option value="Checked-in">Đã nhận phòng (Checked-in)</option>
            <option value="Checked-out">Đã trả phòng (Checked-out)</option>
            <option value="Cancelled">Đã hủy (Cancelled)</option>
          </select>
          <select
            className="filter-select"
            value={booking.payment_status}
            onChange={(e) => updatePaymentStatus(booking.id, e.target.value)}
          >
            <option value="Paid">Đã thanh toán (Paid)</option>
            <option value="Unpaid">Chưa thanh toán (Unpaid)</option>
            <option value="Refunded">Đã hoàn tiền (Refunded)</option>
          </select>
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
                      <span style={{ color: '#6B7280' }}>Loại phòng: </span>
                      <span>{booking.room_type_name}</span>
                    </div>
                    <div>
                      <span style={{ color: '#6B7280' }}>Quy mô đoàn: </span>
                      <span className="tabular-nums">
                        {booking.rooms_count} phòng · {booking.adults_count} người lớn
                        {booking.children_count > 0 && `, ${booking.children_count} trẻ em`}
                      </span>
                    </div>
                  </div>
                </div>
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
              <div className="admin-card-title">Chi tiết tính giá & Hóa đơn (VNĐ)</div>
              <span className="badge badge-neutral">Đã bao gồm VAT</span>
            </div>
            <div className="table-responsive" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Khoản mục</th>
                    <th style={{ textAlign: 'center' }}>Số lượng / Số đêm</th>
                    <th style={{ textAlign: 'right' }}>Đơn giá</th>
                    <th style={{ textAlign: 'right' }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600 }}>{booking.room_type_name}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>
                        Từ {formatDateVN(booking.checkin_date)} đến {formatDateVN(booking.checkout_date)} ({booking.nights} đêm)
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }} className="tabular-nums">
                      {booking.nights}
                    </td>
                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                      {formatVND(booking.room_price)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                      {formatVND(booking.room_price * booking.nights)}
                    </td>
                  </tr>

                  {booking.extra_charges > 0 && (
                    <tr>
                      <td>Phụ phí người phát sinh / Giường phụ</td>
                      <td style={{ textAlign: 'center' }}>1</td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">{formatVND(booking.extra_charges)}</td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">{formatVND(booking.extra_charges)}</td>
                    </tr>
                  )}

                  {booking.discount_amount > 0 && (
                    <tr style={{ color: '#287A4B' }}>
                      <td>Khuyến mãi áp dụng</td>
                      <td style={{ textAlign: 'center' }}>—</td>
                      <td style={{ textAlign: 'right' }}>—</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                        - {formatVND(booking.discount_amount)}
                      </td>
                    </tr>
                  )}

                  <tr>
                    <td colSpan={3} style={{ textAlign: 'right', color: '#6B7280', fontSize: '12px' }}>
                      Thuế & Phí dịch vụ (VAT 8% & Phí phục vụ 5%)
                    </td>
                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                      {formatVND(booking.tax_amount)}
                    </td>
                  </tr>

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

        {/* Right Column: Status Timeline & Payment Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Payment Info Card */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title">Quyết toán thanh toán</div>
              <StatusBadge status={booking.payment_status} />
            </div>
            <div className="admin-card-body" style={{ fontSize: '13px' }}>
              <div style={{ marginBottom: '10px' }}>
                <span style={{ color: '#6B7280', fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Phương thức thanh toán
                </span>
                <div style={{ fontWeight: 600, marginTop: '2px', color: '#292D32' }}>
                  {booking.payment_method || 'Chuyển khoản VietQR'}
                </div>
              </div>

              <div>
                <span style={{ color: '#6B7280', fontSize: '11.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Số tiền đã thu
                </span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#287A4B', marginTop: '2px' }} className="tabular-nums">
                  {booking.payment_status === 'Paid' ? formatVND(booking.total_amount) : '0 VNĐ'}
                </div>
              </div>
            </div>
          </div>

          {/* Status Timeline History */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title">Tiến trình lịch sử đặt phòng</div>
            </div>
            <div className="admin-card-body">
              <div style={{ position: 'relative', paddingLeft: '16px', borderLeft: '2px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(booking.history || []).map((step, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '-23px',
                        top: '2px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: '#F4C542',
                        border: '2px solid #FFFFFF'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: '#292D32' }}>
                        <StatusBadge status={step.status} />
                      </span>
                      <span style={{ fontSize: '11px', color: '#6B7280' }} className="tabular-nums">
                        {step.timestamp.substring(11, 16)}
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '2px' }}>
                      {step.note}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#9CA3AF' }} className="tabular-nums">
                      {formatDateVN(step.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
