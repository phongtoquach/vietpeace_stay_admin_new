import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { formatVND, formatDateVN } from '../../data/mockData.js';
import { ArrowLeft, User, Phone, Mail, MapPin, Calendar, CreditCard, Eye } from 'lucide-react';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const { customers, bookings } = useAdmin();

  const customer = customers.find((c) => c.id === Number(id));

  if (!customer) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Không tìm thấy thông tin khách hàng</h2>
        <Link to="/admin/customers" className="btn btn-secondary" style={{ marginTop: '12px' }}>
          <ArrowLeft size={14} /> Quay lại danh bạ khách hàng
        </Link>
      </div>
    );
  }

  // Find this customer's bookings
  const customerBookings = bookings.filter((b) => b.customer_id === customer.id);

  return (
    <div>
      <PageHeader
        title={`Khách hàng: ${customer.name}`}
        description={`Khách hàng thành viên từ ngày ${formatDateVN(customer.created_date)} · Mã định danh #${customer.id}`}
        actions={
          <Link to="/admin/customers" className="btn btn-secondary">
            <ArrowLeft size={14} /> Quay lại danh bạ
          </Link>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
        {/* Profile Card */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Hồ sơ khách hàng</div>
            <StatusBadge status={customer.status} />
          </div>
          <div className="admin-card-body" style={{ fontSize: '13px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                  Họ và tên
                </span>
                <div style={{ fontWeight: 600, fontSize: '15px', color: '#292D32' }}>
                  {customer.name}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                  Địa chỉ Email
                </span>
                <div style={{ color: '#292D32' }}>{customer.email}</div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                  Số điện thoại
                </span>
                <div style={{ color: '#292D32' }} className="tabular-nums">{customer.phone}</div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                  Tỉnh/thành cư trú
                </span>
                <div style={{ color: '#292D32' }}>
                  {customer.city}, {customer.country}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '10px' }}>
                <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                  Ghi chú nội bộ & Hạng thành viên
                </span>
                <div style={{ marginTop: '2px', color: '#4B5563' }}>
                  {customer.notes || 'Hồ sơ khách hàng tiêu chuẩn.'}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>Tổng lượt lưu trú</div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }} className="tabular-nums">
                    {customer.total_bookings} lượt
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>Tổng chi tiêu tích lũy</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#287A4B' }} className="tabular-nums">
                    {formatVND(customer.total_spent)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking History Table */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Lịch sử đặt phòng & Lưu trú ({customerBookings.length})</div>
          </div>
          <div className="table-responsive" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã đặt phòng</th>
                  <th>Cơ sở lưu trú</th>
                  <th>Thời gian lưu trú</th>
                  <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                  <th>Trạng thái đặt</th>
                  <th>Thanh toán</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {customerBookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#6B7280' }}>
                      Chưa có lịch sử đặt phòng nào cho khách hàng này.
                    </td>
                  </tr>
                ) : (
                  customerBookings.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link
                          to={`/admin/bookings/${b.id}`}
                          style={{ fontWeight: 600, color: '#292D32', textDecoration: 'underline' }}
                          className="code-badge"
                        >
                          {b.code}
                        </Link>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{b.accommodation_name}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>{b.room_type_name}</div>
                      </td>
                      <td className="tabular-nums" style={{ fontSize: '12px' }}>
                        {formatDateVN(b.checkin_date)} - {formatDateVN(b.checkout_date)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                        {formatVND(b.total_amount)}
                      </td>
                      <td>
                        <StatusBadge status={b.booking_status} />
                      </td>
                      <td>
                        <StatusBadge status={b.payment_status} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Link
                          to={`/admin/bookings/${b.id}`}
                          className="row-action-btn"
                          title="Xem chi tiết đơn đặt phòng"
                        >
                          <Eye size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
