import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  LayoutDashboard,
  CalendarCheck,
  Building2,
  MapPin,
  CircleDollarSign,
  Tag,
  Users,
  BarChart3,
  ShieldCheck,
  Settings,
  ChevronDown,
  ChevronRight,
  Hotel,
} from 'lucide-react';

export default function Sidebar() {
  const { isSidebarOpen, isMobileSidebarOpen, setIsMobileSidebarOpen, bookings } = useAdmin();
  const { currentLoggedInUser, hasPermission } = useAuth();
  const location = useLocation();

  const isAdmin = currentLoggedInUser?.role === 'ADMIN';
  const isManager = currentLoggedInUser?.role === 'ACCOMMODATION_MANAGER';

  // Kiểm tra quyền truy cập động theo Bảng phân quyền vai trò (RBAC Database)
  const canViewBookings = isAdmin || hasPermission('bookings.read') || hasPermission('bookings.update_status');
  const canViewOwnFacility = isAdmin || hasPermission('accommodations.read') || hasPermission('accommodations.update');
  const canViewRooms = isAdmin || hasPermission('rooms.read') || hasPermission('rooms.manage');
  const canViewAccommodationsGroup = canViewOwnFacility || canViewRooms;
  const canViewPricing = isAdmin || hasPermission('pricing.read') || hasPermission('pricing.update');
  const canViewPromotions = isAdmin || hasPermission('promotions.read') || hasPermission('promotions.manage');
  const canViewCustomers = isAdmin || hasPermission('customers.read') || hasPermission('customers.manage');
  const canViewReports = isAdmin || hasPermission('reports.view_all') || hasPermission('reports.export');

  // Expanded menu sections state
  const [expandedSections, setExpandedSections] = useState({
    bookings: true,
    accommodations: true,
    pricing: true,
    reports: false,
    users: false,
    settings: false,
  });

  // Count pending bookings for the badge
  const pendingCount = bookings.filter((b) => b.booking_status === 'Pending').length;

  // Auto-expand parents when child route matches
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/admin/bookings')) {
      setExpandedSections((prev) => ({ ...prev, bookings: true }));
    } else if (
      path.startsWith('/admin/accommodations') ||
      path.startsWith('/admin/room-types') ||
      path.startsWith('/admin/amenities')
    ) {
      setExpandedSections((prev) => ({ ...prev, accommodations: true }));
    } else if (
      path.startsWith('/admin/rate-periods') ||
      path.startsWith('/admin/room-rates') ||
      path.startsWith('/admin/room-availability')
    ) {
      setExpandedSections((prev) => ({ ...prev, pricing: true }));
    } else if (path.startsWith('/admin/reports')) {
      setExpandedSections((prev) => ({ ...prev, reports: true }));
    } else if (
      path.startsWith('/admin/users') ||
      path.startsWith('/admin/roles') ||
      path.startsWith('/admin/managers')
    ) {
      setExpandedSections((prev) => ({ ...prev, users: true }));
    } else if (path.startsWith('/admin/settings')) {
      setExpandedSections((prev) => ({ ...prev, settings: true }));
    }
  }, [location.pathname]);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const closeMobile = () => {
    setIsMobileSidebarOpen(false);
  };

  if (!isSidebarOpen) return null;

  return (
    <aside className={`sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon-box">
          <Hotel size={18} strokeWidth={2.2} />
        </div>
        <div className="brand-info">
          <span className="brand-name">VietPeace Stay</span>
          <span className="brand-badge">
            {isAdmin ? 'QUẢN TRỊ VIÊN' : 'QUẢN LÝ CƠ SỞ'}
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="sidebar-nav" aria-label="Menu điều hướng hệ thống">
        <div className="sidebar-group-title">Chính</div>

        {/* Dashboard */}
        <NavLink
          to="/admin/dashboard"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={closeMobile}
        >
          <LayoutDashboard size={16} className="sidebar-icon" />
          <span>Tổng quan</span>
        </NavLink>

        {/* Bookings Parent */}
        {canViewBookings && (
          <div>
            <button
              type="button"
              className={`sidebar-item-parent ${location.pathname.startsWith('/admin/bookings') ? 'active-parent' : ''}`}
              onClick={() => toggleSection('bookings')}
              aria-expanded={expandedSections.bookings}
            >
              <div className="sidebar-item-left">
                <CalendarCheck size={16} className="sidebar-icon" />
                <span>Đặt phòng</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {pendingCount > 0 && <span className="sidebar-badge">{pendingCount}</span>}
                {expandedSections.bookings ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            </button>

            {expandedSections.bookings && (
              <div className="sidebar-submenu">
                <NavLink
                  to="/admin/bookings"
                  end
                  className={({ isActive }) =>
                    `sidebar-sublink ${isActive && !location.search ? 'active' : ''}`
                  }
                  onClick={closeMobile}
                >
                  Tất cả đặt phòng
                </NavLink>
                <NavLink
                  to="/admin/bookings?status=Pending"
                  className={({ isActive }) =>
                    `sidebar-sublink ${location.search.includes('status=Pending') ? 'active' : ''}`
                  }
                  onClick={closeMobile}
                >
                  Đặt phòng chờ duyệt
                </NavLink>
                <NavLink
                  to="/admin/bookings?view=today"
                  className={({ isActive }) =>
                    `sidebar-sublink ${location.search.includes('view=today') ? 'active' : ''}`
                  }
                  onClick={closeMobile}
                >
                  Nhận / Trả phòng
                </NavLink>
              </div>
            )}
          </div>
        )}

        {(canViewAccommodationsGroup || isAdmin || canViewPricing || canViewPromotions || canViewCustomers) && (
          <div className="sidebar-group-title">Quản lý lưu trú</div>
        )}

        {/* Accommodations Parent */}
        {canViewAccommodationsGroup && (
          <div>
            <button
              type="button"
              className={`sidebar-item-parent ${
                location.pathname.startsWith('/admin/accommodations') ||
                location.pathname.startsWith('/admin/room-types') ||
                location.pathname.startsWith('/admin/amenities') ||
                location.pathname.startsWith('/admin/attractions')
                  ? 'active-parent'
                  : ''
              }`}
              onClick={() => toggleSection('accommodations')}
              aria-expanded={expandedSections.accommodations}
            >
              <div className="sidebar-item-left">
                <Building2 size={16} className="sidebar-icon" />
                <span>{isManager ? 'Cơ sở của tôi' : 'Cơ sở lưu trú'}</span>
              </div>
              {expandedSections.accommodations ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {expandedSections.accommodations && (
              <div className="sidebar-submenu">
                {canViewOwnFacility && (
                  <NavLink
                    to="/admin/accommodations"
                    className={({ isActive }) =>
                      `sidebar-sublink ${isActive && !location.pathname.includes('/room-types') ? 'active' : ''}`
                    }
                    onClick={closeMobile}
                  >
                    {isManager ? 'Thông tin cơ sở' : 'Tất cả cơ sở lưu trú'}
                  </NavLink>
                )}
                {canViewRooms && (
                  <>
                    <NavLink
                      to="/admin/room-types"
                      className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                      onClick={closeMobile}
                    >
                      Loại phòng
                    </NavLink>
                    <NavLink
                      to="/admin/amenities"
                      className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                      onClick={closeMobile}
                    >
                      Tiện nghi
                    </NavLink>
                  </>
                )}
                {isAdmin && (
                  <NavLink
                    to="/admin/attractions"
                    className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                    onClick={closeMobile}
                  >
                    Điểm tham quan
                  </NavLink>
                )}
              </div>
            )}
          </div>
        )}

        {/* Điểm đến du lịch (Chỉ Super Admin) */}
        {isAdmin && (
          <NavLink
            to="/admin/locations"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={closeMobile}
          >
            <MapPin size={16} className="sidebar-icon" />
            <span>Điểm đến</span>
          </NavLink>
        )}

        {/* Pricing & Availability */}
        {canViewPricing && (
          <div>
            <button
              type="button"
              className={`sidebar-item-parent ${
                location.pathname.startsWith('/admin/rate-periods') ||
                location.pathname.startsWith('/admin/room-rates') ||
                location.pathname.startsWith('/admin/room-availability')
                  ? 'active-parent'
                  : ''
              }`}
              onClick={() => toggleSection('pricing')}
              aria-expanded={expandedSections.pricing}
            >
              <div className="sidebar-item-left">
                <CircleDollarSign size={16} className="sidebar-icon" />
                <span>Giá & Phòng trống</span>
              </div>
              {expandedSections.pricing ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {expandedSections.pricing && (
              <div className="sidebar-submenu">
                <NavLink
                  to="/admin/rate-periods"
                  className={({ isActive }) =>
                    `sidebar-sublink ${isActive || location.pathname.startsWith('/admin/rate-periods') ? 'active' : ''}`
                  }
                  onClick={closeMobile}
                >
                  Kỳ giá đặc biệt
                </NavLink>
                <NavLink
                  to="/admin/room-rates"
                  className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                >
                  Bảng giá & Cấu hình giá
                </NavLink>
                <NavLink
                  to="/admin/room-availability"
                  className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                >
                  Tình trạng phòng trống
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* Promotions */}
        {canViewPromotions && (
          <NavLink
            to="/admin/promotions"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={closeMobile}
          >
            <Tag size={16} className="sidebar-icon" />
            <span>Khuyến mãi</span>
          </NavLink>
        )}

        {/* Customers */}
        {canViewCustomers && (
          <NavLink
            to="/admin/customers"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={closeMobile}
          >
            <Users size={16} className="sidebar-icon" />
            <span>Khách hàng</span>
          </NavLink>
        )}

        {(canViewReports || isAdmin) && (
          <div className="sidebar-group-title">Thống kê & Quản trị</div>
        )}

        {/* Reports */}
        {canViewReports && (
          <div>
            <button
              type="button"
              className={`sidebar-item-parent ${location.pathname.startsWith('/admin/reports') ? 'active-parent' : ''}`}
              onClick={() => toggleSection('reports')}
              aria-expanded={expandedSections.reports}
            >
              <div className="sidebar-item-left">
                <BarChart3 size={16} className="sidebar-icon" />
                <span>Báo cáo thống kê</span>
              </div>
              {expandedSections.reports ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {expandedSections.reports && (
              <div className="sidebar-submenu">
                <NavLink
                  to="/admin/reports/revenue"
                  className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                >
                  Báo cáo doanh thu
                </NavLink>
                <NavLink
                  to="/admin/reports/bookings"
                  className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                >
                  Báo cáo đặt phòng
                </NavLink>
                <NavLink
                  to="/admin/reports/occupancy"
                  className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                >
                  Công suất phòng
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* Admin Users & Roles (Chỉ Super Admin) */}
        {isAdmin && (
          <div>
            <button
              type="button"
              className={`sidebar-item-parent ${
                location.pathname.startsWith('/admin/users') ||
                location.pathname.startsWith('/admin/roles') ||
                location.pathname.startsWith('/admin/managers')
                  ? 'active-parent'
                  : ''
              }`}
              onClick={() => toggleSection('users')}
              aria-expanded={expandedSections.users}
            >
              <div className="sidebar-item-left">
                <ShieldCheck size={16} className="sidebar-icon" />
                <span>Người dùng & Phân quyền</span>
              </div>
              {expandedSections.users ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {expandedSections.users && (
              <div className="sidebar-submenu">
                <NavLink
                  to="/admin/roles"
                  className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                >
                  Phân công quản lý cơ sở
                </NavLink>
                <NavLink
                  to="/admin/managers"
                  className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                >
                  Danh sách Manager
                </NavLink>
                <NavLink
                  to="/admin/users"
                  className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                >
                  Tài khoản quản trị
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* Settings (Chỉ Super Admin) */}
        {isAdmin && (
          <div>
            <button
              type="button"
              className={`sidebar-item-parent ${location.pathname.startsWith('/admin/settings') ? 'active-parent' : ''}`}
              onClick={() => toggleSection('settings')}
              aria-expanded={expandedSections.settings}
            >
              <div className="sidebar-item-left">
                <Settings size={16} className="sidebar-icon" />
                <span>Cài đặt hệ thống</span>
              </div>
              {expandedSections.settings ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {expandedSections.settings && (
              <div className="sidebar-submenu">
                <NavLink
                  to="/admin/settings/general"
                  className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                >
                  Cài đặt chung
                </NavLink>
                <NavLink
                  to="/admin/settings/website"
                  className={({ isActive }) => `sidebar-sublink ${isActive ? 'active' : ''}`}
                  onClick={closeMobile}
                >
                  Cấu hình hiển thị
                </NavLink>
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
}
