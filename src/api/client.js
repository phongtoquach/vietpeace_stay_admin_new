// API admin dùng chung cho toàn bộ Admin Panel.
const API_BASE = "http://localhost:3002/api/admin";

export async function apiFetch(path, options = {}) {
  const requestUrl = `${API_BASE}${path}`;

  const response = await fetch(requestUrl, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (response.status === 401) {
    const error = new Error("UNAUTHENTICATED");
    error.status = 401;
    error.errorCode = payload?.errorCode;

    // Chỉ chuyển hướng khi KHÔNG ở trang login, tránh vòng lặp reload
    // nếu một API nào đó lỡ được gọi từ chính trang login.
    if (!window.location.pathname.startsWith("/login")) {
      window.location.assign("/login");
    }

    // Vẫn throw để caller dừng xử lý ngay,
    // không set state bằng dữ liệu rỗng trong lúc trang sắp reload.
    throw error;
  }

  if (!response.ok) {
    const error = new Error(payload?.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.errorCode = payload?.errorCode;
    error.errors = payload?.errors;
    throw error;
  }

  return payload;
}
