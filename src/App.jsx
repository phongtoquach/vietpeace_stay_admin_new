import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminProvider } from './context/AdminContext.jsx';

import AdminLayout from './components/layouts/AdminLayout.jsx';

// Auth Pages
import LoginPage from './pages/auth/LoginPage.jsx';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx';

// Dashboard
import DashboardPage from './pages/dashboard/DashboardPage.jsx';

// Accommodations
import AccommodationListPage from './pages/accommodations/AccommodationListPage.jsx';
import AccommodationFormPage from './pages/accommodations/AccommodationFormPage.jsx';
import AccommodationDetailPage from './pages/accommodations/AccommodationDetailPage.jsx';
import AttractionListPage from './pages/attractions/AttractionListPage.jsx';
import AttractionFormPage from './pages/attractions/AttractionFormPage.jsx';

// Room Types
import RoomTypeListPage from './pages/roomTypes/RoomTypeListPage.jsx';
import RoomTypeDetailPage from './pages/roomTypes/RoomTypeDetailPage.jsx';
import RoomTypeFormPage from './pages/roomTypes/RoomTypeFormPage.jsx';

// Locations
import LocationManagementPage from './pages/locations/LocationManagementPage.jsx';

// Amenities
import AmenitiesPage from './pages/amenities/AmenitiesPage.jsx';

// Bookings
import BookingListPage from './pages/bookings/BookingListPage.jsx';
import BookingDetailPage from './pages/bookings/BookingDetailPage.jsx';

// Pricing & Availability
import RatePeriodsPage from './pages/pricing/RatePeriodsPage.jsx';
import RatePeriodFormPage from './pages/pricing/RatePeriodFormPage.jsx';
import RoomRatesPage from './pages/pricing/RoomRatesPage.jsx';
import RoomAvailabilityPage from './pages/pricing/RoomAvailabilityPage.jsx';
import PricingWorkspace from './pages/pricing/PricingWorkspace.jsx';
import PricingProposalsPage from './pages/pricing/PricingProposalsPage.jsx';

// Promotions
import PromotionsPage from './pages/promotions/PromotionsPage.jsx';

// Customers
import CustomerListPage from './pages/customers/CustomerListPage.jsx';
import CustomerDetailPage from './pages/customers/CustomerDetailPage.jsx';

// Admin Users & Roles
import AdminUsersPage from './pages/users/AdminUsersPage.jsx';
import RolesPermissionsPage from './pages/users/RolesPermissionsPage.jsx';
import ManagersListPage from './pages/users/ManagersListPage.jsx';

// Reports
import RevenueReportPage from './pages/reports/RevenueReportPage.jsx';
import PropertyRevenueReportPage from './pages/reports/PropertyRevenueReportPage.jsx';
import BookingReportPage from './pages/reports/BookingReportPage.jsx';
import OccupancyReportPage from './pages/reports/OccupancyReportPage.jsx';

// Settings
import GeneralSettingsPage from './pages/settings/GeneralSettingsPage.jsx';
import WebsiteSettingsPage from './pages/settings/WebsiteSettingsPage.jsx';

function AdminOnlyRoute({ children }) {
	const { currentLoggedInUser } = useAuth();
	if (currentLoggedInUser && currentLoggedInUser.role !== 'ADMIN') {
		return <Navigate to="/admin/dashboard" replace />;
	}
	return children;
}

function PermissionRoute({ permission, children }) {
	const { currentLoggedInUser, hasPermission } = useAuth();
	const isAdmin = currentLoggedInUser?.role === 'ADMIN';
	if (!isAdmin && !hasPermission(permission)) {
		return <Navigate to="/admin/dashboard" replace />;
	}
	return children;
}

function CustomerAccessRoute({ children }) {
    const { currentLoggedInUser } = useAuth();

    const allowedRoles = ['ADMIN', 'ACCOMMODATION_MANAGER'];

    if (
        currentLoggedInUser &&
        !allowedRoles.includes(currentLoggedInUser.role)
    ) {
        return <Navigate to="/admin/dashboard" replace />;
    }

    return children;
}

export default function App() {
	return (
		<AuthProvider>
			<AdminProvider>
				<Routes>
					{/* Public Auth Routes */}
					<Route path="/login" element={<LoginPage />} />
					<Route path="/forgot-password" element={<ForgotPasswordPage />} />
					<Route path="/reset-password" element={<ResetPasswordPage />} />

					{/* Admin Protected Routes */}
					<Route path="/admin" element={<AdminLayout />}>
						<Route index element={<Navigate to="/admin/dashboard" replace />} />
						<Route path="dashboard" element={<DashboardPage />} />

						{/* Bookings */}
						<Route path="bookings" element={<BookingListPage />} />
						<Route path="bookings/:id" element={<BookingDetailPage />} />

						{/* Accommodations */}
						<Route path="accommodations" element={<AccommodationListPage />} />
						<Route path="accommodations/create" element={<AccommodationFormPage />} />
						<Route path="accommodations/:id" element={<AccommodationDetailPage />} />
						<Route path="accommodations/:id/edit" element={<AccommodationFormPage />} />

						{/* Attractions */}
						<Route path="attractions" element={<AttractionListPage />} />
						<Route path="attractions/create" element={<AttractionFormPage />} />
						<Route path="attractions/:id/edit" element={<AttractionFormPage />} />

						{/* Room Types */}
						<Route path="room-types" element={<RoomTypeListPage />} />
						<Route path="room-types/create" element={<RoomTypeFormPage />} />
						<Route path="room-types/:id" element={<RoomTypeDetailPage />} />
						<Route path="room-types/:id/edit" element={<RoomTypeFormPage />} />

						{/* Locations */}
						<Route path="locations" element={<LocationManagementPage />} />

						{/* Amenities */}
						<Route path="amenities" element={<AmenitiesPage />} />

						{/* Pricing & Availability */}
						<Route path="rate-periods" element={<RatePeriodsPage />} />
						<Route path="rate-periods/create" element={<RatePeriodFormPage />} />
						<Route path="rate-periods/:id/edit" element={<RatePeriodFormPage />} />
						<Route path="room-rates" element={<RoomRatesPage />} />
						<Route path="room-availability" element={<RoomAvailabilityPage />} />
						<Route path="pricing-history" element={<PricingWorkspace mode="history" />} />
						<Route path="pricing-proposals" element={<PricingProposalsPage />} />

						{/* Promotions */}
						<Route path="promotions" element={<PromotionsPage />} />

						{/* Customers - ADMIN và ACCOMMODATION_MANAGER */}
						<Route
						path="customers"
						element={
						<CustomerAccessRoute>
							<CustomerListPage />
						</CustomerAccessRoute>
						}
						/>

						<Route
						path="customers/:id"
						element={
						<CustomerAccessRoute>
							<CustomerDetailPage />
						</CustomerAccessRoute>
						}
						/>

						{/* Users & Roles (Chỉ Super Admin) */}
						<Route path="users" element={<AdminOnlyRoute><AdminUsersPage /></AdminOnlyRoute>} />
						<Route path="roles" element={<AdminOnlyRoute><RolesPermissionsPage /></AdminOnlyRoute>} />
						<Route path="managers" element={<AdminOnlyRoute><ManagersListPage /></AdminOnlyRoute>} />

						{/* Reports */}
						<Route path="reports/revenue" element={<PermissionRoute permission="reports.view"><RevenueReportPage /></PermissionRoute>} />
						<Route path="reports/revenue/properties/:id" element={<PermissionRoute permission="reports.view"><PropertyRevenueReportPage /></PermissionRoute>} />
						<Route path="reports/bookings" element={<PermissionRoute permission="reports.view"><BookingReportPage /></PermissionRoute>} />
						<Route path="reports/occupancy" element={<PermissionRoute permission="reports.view"><OccupancyReportPage /></PermissionRoute>} />

						{/* Settings (Chỉ Super Admin) */}
						<Route path="settings/general" element={<AdminOnlyRoute><GeneralSettingsPage /></AdminOnlyRoute>} />
						<Route path="settings/website" element={<AdminOnlyRoute><WebsiteSettingsPage /></AdminOnlyRoute>} />
					</Route>

					{/* Fallback route */}
					<Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
				</Routes>
			</AdminProvider>
		</AuthProvider>
  );
}
