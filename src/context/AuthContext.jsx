import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const AuthContext = createContext();

const API_URL = "http://localhost:3002/api/admin";

export function AuthProvider({ children }) {

    console.log("[AuthProvider] Vừa vào hàm provider : AuthProvider !");

    const { pathname, search } = useLocation();
    //console.log("[AuthProvider] pathname la : " + pathname);
    //console.log("[AuthProvider] cac URL param (search) la : " + search);
    const currentUrl = pathname + search;
    console.log("[AuthProvider] currentUrl la : " + currentUrl);

    const navigate = useNavigate();

    const [currentLoggedInUser, setCurrentLoggedInUser] = useState(null);

    // Phân biệt:
    // true  = đang gọi API kiểm tra authentication
    // false = đã kiểm tra xong
    const [isCheckingAuthen, setIsCheckingAuthen] = useState(true);

    // Lưu lỗi khi không thể kiểm tra authentication
    const [authError, setAuthError] = useState(null);

    const refRouteUrl = useRef(currentUrl);
    console.log("[AuthProvider] Value hiện tại của biến useRef refRouteUrl : " + refRouteUrl.current);

    const isRouteUrlChanged = (currentUrl !== refRouteUrl.current) ? true : false;
    console.log("[AuthProvider] Value cua bien isRouteUrlChanged : ", isRouteUrlChanged);

    if (isRouteUrlChanged) {
        console.log("[AuthProvider] Update value hiện tại của biến useRef refRouteUrl thành : " + currentUrl);
        refRouteUrl.current = currentUrl;
    }

    console.log("[AuthProvider] Value hiện tại của biến useState currentLoggedInUser : ");
    console.log(currentLoggedInUser);

    // function test1() {
    //     console.log("[AuthProvider] await - Đang chạy test1() !");
    // }

    // Hàm kiểm tra token JWT hiện tại với Backend
    const checkAuthen = useCallback(async () => {
        console.log("[AuthProvider - checkAuthen] setIsCheckingAuthen(true) !");
        setIsCheckingAuthen(true);
        console.log("[AuthProvider - checkAuthen] setAuthError(null) !");
        setAuthError(null);

        //await test1();
        //console.log("[AuthProvider - checkAuthen] Chạy các code sau await test1() !");

        console.log("[AuthProvider - checkAuthen] đây là trước dòng await fetch() !");
        try {
            const api_response = await fetch(`${API_URL}/auth/loggedin-user`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include"
            });
            console.log("[AuthProvider - checkAuthen] Response cua API /auth/loggedin-user : ", api_response);

            if (!api_response.ok) {
                // status code 401 xác nhận session đăng nhập của user không tồn tại
                if (api_response.status === 401) {
                    console.log("[AuthProvider - checkAuthen] status code cua response cua API /auth/loggedin-user la 401 ! setCurrentLoggedInUser(null) va return false !");
                    setCurrentLoggedInUser(null);
                    return false;
                }

                // Các lỗi HTTP khác, ví dụ 500
                // không đồng nghĩa user đã logout
                throw new Error( `Authentication API failed: ${api_response.status}` );
            }
            
            const response_data = await api_response.json();
            console.log("[AuthProvider - checkAuthen] API response OK và Login Session còn tồn tại ! Data của response_data : ", response_data);
            console.log("[AuthProvider - checkAuthen] setCurrentLoggedInUser(response_data.data.userInfo) va return true !");
            setCurrentLoggedInUser(response_data.data.userInfo);

            return true;
        }
        catch (error) {
            console.error("[AuthProvider - checkAuthen - catch] checkAuthen() failed:", error);

            // Network error / server error:
            // không nên tự động kết luận user đã logout.
            setAuthError(error);

            throw error;
        } finally {
            console.log("[AuthProvider - checkAuthen - finally] setIsCheckingAuthen(false) !");
            setIsCheckingAuthen(false);
        }

    }, []);


    // useEffect() for test
    useEffect(() => {
        console.log("[AuthProvider] đang chạy useEffect() của AuthProvider !");
            
        // hàm cleanup
        return () => {
            console.log("[AuthProvider] đang chạy hàm cleanup của useEffect() !");
        };
    });


    // Gọi checkAuthen() trong useEffect()
    useEffect(() => {
        console.log("[AuthProvider] đang chạy useEffect() gọi hàm checkAuthen() !");

        checkAuthen();

        console.log("[AuthProvider] Chạy các code đồng bộ bên ngoài, phía sau dòng gọi hàm checkAuthen() !");

        // hàm cleanup
        return () => {
            console.log("[AuthProvider] đang chạy hàm cleanup của useEffect() gọi hàm checkAuthen() !");
        };

    }, [currentUrl, checkAuthen]);


    // Hàm logout customer
    const logout = useCallback(async () => { 
        console.log("[AuthProvider - logout] Đang chạy hàm logout() !");
        
        try {
            const api_response = await fetch(`${API_URL}/auth/logout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include"
            });
            console.log("[AuthProvider - logout] Response cua API /auth/logout : ", api_response);

            if (!api_response.ok) {
                // status code 401 xác nhận session đăng nhập của user không tồn tại
                if (api_response.status === 401) {
                    console.log("[AuthProvider - logout] status code cua response cua API /auth/logout la 401 ! chuyển qua route trang Login !");
                    setCurrentLoggedInUser(null);
                    navigate("/login");
                    return false;
                }
                else {
                    throw new Error(`API /auth/logout failed: ${api_response.status}`);
                }
            }
            
            const response_data = await api_response.json();
            console.log("[AuthProvider - logout] Logout thanh cong ! Chuyen den route /login ! Data của response_data : ", response_data);

            setCurrentLoggedInUser(null);
            navigate("/login");
            
            // console.log("[AuthProvider - logout] current_url : " + current_url);
            // if (current_url !== "/") {
            //     console.log("[AuthProvider - logout] Dang o route khac trang Home ! Chuyen qua route trang Home !");
            //     navigate("/");
            // }
            // else {
            //     console.log("[AuthProvider - logout] Dang o ngay route trang Home ! setCurrentLoggedInUser(null) !");
            //     setCurrentLoggedInUser(null);
            // }
        }
        catch (error) {
            console.error("[AuthProvider - logout - catch] logout() failed:", error);
            throw error;
        }
    }, []);

    

    // Kiểm tra nhanh quyền hạn theo mã quyền (Dynamic RBAC)
    const hasPermission = useCallback((permissionKey) => {
        if (!currentLoggedInUser) return false;
        if (currentLoggedInUser.role === 'ADMIN') return true; // Super Admin luôn có toàn quyền
        return Boolean(currentLoggedInUser.permissions && currentLoggedInUser.permissions.includes(permissionKey));
    }, [currentLoggedInUser]);

    return (
        <AuthContext.Provider value={{
            currentLoggedInUser,
            setCurrentLoggedInUser,
            isCheckingAuthen,
            authError,
            currentUrl,
            isRouteUrlChanged,
            currentPathName: pathname,
            logout,
            hasPermission
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthContext;

export function useAuth() {
    return useContext(AuthContext);
}