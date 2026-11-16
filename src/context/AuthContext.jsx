import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_ADMIN_API_BASE_URL || 'http://localhost:3002/api/admin';

export function AuthProvider({ children }) {
    const { pathname, search } = useLocation();
    const currentUrl = pathname + search;
    const navigate = useNavigate();

    const [currentLoggedInUser, setCurrentLoggedInUser] = useState(null);
    const [isCheckingAuthen, setIsCheckingAuthen] = useState(true);
    const [authError, setAuthError] = useState(null);
    const hasCompletedInitialCheckRef = useRef(false);

    // Kiểm tra session hiện tại với Backend.
    // Khi silent = true (chuyển route khi đã có phiên), không bật full-screen loading để tránh nháy trang.
    const checkAuthen = useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
            setIsCheckingAuthen(true);
        }
        setAuthError(null);

        try {
            const api_response = await fetch(`${API_URL}/auth/loggedin-user`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include"
            });

            if (!api_response.ok) {
                if (api_response.status === 401) {
                    setCurrentLoggedInUser(null);
                    return false;
                }
                throw new Error(`Authentication API failed: ${api_response.status}`);
            }

            const response_data = await api_response.json();
            setCurrentLoggedInUser(response_data?.data?.userInfo || null);
            return Boolean(response_data?.data?.userInfo);
        } catch (error) {
            console.error("[AuthProvider - checkAuthen] failed:", error);
            if (!silent) {
                setAuthError(error);
            }
            return false;
        } finally {
            hasCompletedInitialCheckRef.current = true;
            setIsCheckingAuthen(false);
        }
    }, []);

    useEffect(() => {
        const isPublicAuthRoute =
            pathname === "/login" ||
            pathname === "/forgot-password" ||
            pathname === "/reset-password";

        if (!hasCompletedInitialCheckRef.current) {
            checkAuthen({ silent: false });
            return;
        }

        // Trên các route auth public sau khi đã kiểm tra lần đầu, không gọi lại liên tục
        if (isPublicAuthRoute) {
            return;
        }

        // Khi chuyển trang bên trong Admin Panel: làm mới ngầm quyền hạn/trạng thái từ server
        checkAuthen({ silent: true });
    }, [pathname, checkAuthen]);

    const logout = useCallback(async () => {
        try {
            const api_response = await fetch(`${API_URL}/auth/logout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include"
            });

            if (!api_response.ok && api_response.status !== 401) {
                throw new Error(`API /auth/logout failed: ${api_response.status}`);
            }
        } catch (error) {
            console.error("[AuthProvider - logout] failed:", error);
        } finally {
            try {
                if (localStorage.getItem('vietpeace_admin_remember_me') !== 'true') {
                    localStorage.removeItem('vietpeace_admin_remember_email');
                    if (typeof navigator !== 'undefined' && typeof navigator?.credentials?.preventSilentAccess === 'function') {
                        await navigator.credentials.preventSilentAccess().catch(() => {});
                    }
                }
            } catch {
                // Ignore storage/credential restrictions
            }
            setCurrentLoggedInUser(null);
            navigate("/login", { replace: true });
        }
    }, [navigate]);

    // Kiểm tra nhanh quyền hạn theo mã quyền (Dynamic RBAC)
    const hasPermission = useCallback((permissionKey) => {
        if (!currentLoggedInUser) return false;
        if (currentLoggedInUser.role === 'ADMIN') return true;
        return Boolean(currentLoggedInUser.permissions && currentLoggedInUser.permissions.includes(permissionKey));
    }, [currentLoggedInUser]);

    return (
        <AuthContext.Provider value={{
            currentLoggedInUser,
            setCurrentLoggedInUser,
            isCheckingAuthen,
            authError,
            currentUrl,
            isRouteUrlChanged: false,
            currentPathName: pathname,
            refreshAuth: checkAuthen,
            logout,
            hasPermission
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthContext;

export function useAuth() {
    return useContext(AuthContext);
}
