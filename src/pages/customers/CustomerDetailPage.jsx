
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { apiFetch } from '../../api/client.js';
import { formatVND, formatDateVN } from '../../data/mockData.js';
import { ArrowLeft, Eye } from 'lucide-react';

export default function CustomerDetailPage() {
  const { id } = useParams();

  // Khởi tạo State
  const [customer, setCustomer] = useState(null);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Lấy thông tin chi tiết khách hàng từ API
  useEffect(() => {
    let isMounted = true;

    async function fetchCustomerDetail() {
      try {
        setLoading(true);
        setError('');

        const response = await apiFetch(`/customers/${id}`);

        if (isMounted) {
          setCustomer(response.data.customer);
          setCustomerBookings(response.data.bookings || []);
        }
      } catch (err) {
        console.error('Lỗi lấy chi tiết khách hàng:', err);

        if (isMounted) {
          setError(err.message || 'Không thể tải thông tin khách hàng.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (id) {
      fetchCustomerDetail();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Đang tải dữ liệu
  if (loading) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        Đang tải thông tin khách hàng...
      </div>
    );
  }

  // Có lỗi khi lấy dữ liệu
  if (error) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
          Không thể tải thông tin khách hàng
        </h2>

        <p style={{ color: '#DC2626', marginTop: '10px' }}>
          {error}
        </p>

        <Link
          to="/admin/customers"
          className="btn btn-secondary"
          style={{ marginTop: '12px' }}
        >
          <ArrowLeft size={14} /> Quay lại danh bạ khách hàng
        </Link>
      </div>
    );
  }

  // Không tìm thấy khách hàng
  if (!customer) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
          Không tìm thấy thông tin khách hàng
        </h2>

        <Link
          to="/admin/customers"
          className="btn btn-secondary"
          style={{ marginTop: '12px' }}
        >
          <ArrowLeft size={14} /> Quay lại danh bạ khách hàng
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <PageHeader
        title={`Khách hàng: ${customer.fullName}`}
        description={`Khách hàng từ ngày ${formatDateVN(customer.createdAt)} · Mã định danh ${customer.id}`}
        actions={
          <Link to="/admin/customers" className="btn btn-secondary">
            <ArrowLeft size={14} /> Quay lại danh bạ
          </Link>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '16px'
        }}
      >
        {/* Hồ sơ khách hàng */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">Hồ sơ khách hàng</div>
            <StatusBadge status={customer.status} />
          </div>

          <div className="admin-card-body" style={{ fontSize: '13px' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {/* Họ và tên */}
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    fontWeight: 600
                  }}
                >
                  Họ và tên
                </span>

                <div
                  style={{
                    fontWeight: 600,
                    fontSize: '15px',
                    color: '#292D32'
                  }}
                >
                  {customer.fullName}
                </div>
              </div>

              {/* Tên hiển thị */}
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    fontWeight: 600
                  }}
                >
                  Tên hiển thị
                </span>

                <div style={{ color: '#292D32' }}>
                  {customer.displayName || 'Chưa cập nhật'}
                </div>
              </div>

              {/* Email */}
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    fontWeight: 600
                  }}
                >
                  Địa chỉ Email
                </span>

                <div style={{ color: '#292D32' }}>
                  {customer.email}
                </div>
              </div>

              {/* Số điện thoại */}
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    fontWeight: 600
                  }}
                >
                  Số điện thoại
                </span>

                <div
                  style={{ color: '#292D32' }}
                  className="tabular-nums"
                >
                  {customer.phoneNumber || 'Chưa cập nhật'}
                </div>
              </div>

              {/* Thống kê khách hàng */}
              <div
                style={{
                  borderTop: '1px solid #F3F4F6',
                  paddingTop: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>
                    Tổng lượt đặt phòng
                  </div>

                  <div
                    style={{ fontSize: '16px', fontWeight: 700 }}
                    className="tabular-nums"
                  >
                    {customer.totalBookings} lượt
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>
                    Tổng chi tiêu tích lũy
                  </div>

                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#287A4B'
                    }}
                    className="tabular-nums"
                  >
                    {formatVND(customer.totalSpent)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lịch sử đặt phòng */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-title">
              Lịch sử đặt phòng & Lưu trú ({customerBookings.length})
            </div>
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
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {customerBookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: 'center',
                        padding: '24px',
                        color: '#6B7280'
                      }}
                    >
                      Chưa có lịch sử đặt phòng nào cho khách hàng này.
                    </td>
                  </tr>
                ) : (
                  customerBookings.map((b) => (
                    <tr key={b.id}>
                      {/* Mã đặt phòng */}
                      <td>
                        <Link
                          to={`/admin/bookings/${b.id}`}
                          style={{
                            fontWeight: 600,
                            color: '#292D32',
                            textDecoration: 'underline'
                          }}
                          className="code-badge"
                        >
                          {b.bookingCode}
                        </Link>
                      </td>

                      {/* Cơ sở lưu trú và loại phòng */}
                      <td>
                        <div style={{ fontWeight: 500 }}>
                          {b.accommodationName}
                        </div>

                        <div style={{ fontSize: '11px', color: '#6B7280' }}>
                          {b.roomTypeNames || 'Chưa có thông tin phòng'}
                        </div>
                      </td>

                      {/* Thời gian lưu trú */}
                      <td
                        className="tabular-nums"
                        style={{ fontSize: '12px' }}
                      >
                        {formatDateVN(b.checkInDate)} - {formatDateVN(b.checkOutDate)}
                      </td>

                      {/* Tổng tiền */}
                      <td
                        style={{ textAlign: 'right', fontWeight: 600 }}
                        className="tabular-nums"
                      >
                        {formatVND(b.totalAmount)}
                      </td>

                      {/* Trạng thái đặt phòng */}
                      <td>
                        <StatusBadge status={b.status} />
                      </td>

                      {/* Xem chi tiết booking */}
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
