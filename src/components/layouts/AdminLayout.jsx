import { useContext } from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';

import AuthContext from "../../context/AuthContext";
import { useAdmin } from '../../context/AdminContext.jsx';

import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import NotificationToast from '../common/NotificationToast.jsx';
import ForcePasswordChangeModal from '../common/ForcePasswordChangeModal.jsx';

export default function AdminLayout({ breadcrumbs = [] }) {
	const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useAdmin();
    const {
        currentLoggedInUser,
        isCheckingAuthen,
        authError,
        currentUrl,
        refreshAuth,
    } = useContext(AuthContext);

    if (isCheckingAuthen === true) {
        return (
            <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '14px' }}>
                <p>Đang kiểm tra đăng nhập...</p>
            </div>
        );
    }

    if (authError && !currentLoggedInUser) {
        return (
            <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backgroundColor: '#F3F4F6' }}>
                <div style={{ maxWidth: '420px', width: '100%', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                        Không thể xác minh đăng nhập
                    </h2>
                    <p style={{ fontSize: '13.5px', color: '#475569', marginBottom: '18px' }}>
                        Vui lòng kiểm tra kết nối máy chủ và thử lại.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => refreshAuth?.({ silent: false })}
                        >
                            Thử lại
                        </button>
                        <Link to="/login" className="btn btn-secondary">
                            Về trang đăng nhập
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!currentLoggedInUser) {
        return (
            <Navigate to="/login" replace state={{ from: currentUrl }} />
        );
    }

	return (
		<div className="app-container">
			{/* Mobile Backdrop */}
			{isMobileSidebarOpen && (
				<div onClick={() => setIsMobileSidebarOpen(false)}
				style={{
					position: 'fixed',
					inset: 0,
					backgroundColor: 'rgba(0,0,0,0.4)',
					zIndex: 42
				}}/>
			)}

			{/* Main Sidebar */}
			<Sidebar />

			{/* Layout Body */}
			<div className="main-layout">
				<Header breadcrumbItems={breadcrumbs} />
				<main className="content-body">
				<Outlet />
				</main>
				<NotificationToast />
			</div>

			{/* Modal bắt buộc đổi mật khẩu tạm ở lần đăng nhập đầu tiên */}
			<ForcePasswordChangeModal />
		</div>
	);
}
