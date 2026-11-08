import { apiFetch } from "./client";

function logLookupError(name, error) {
  console.error(`[ERROR] ${name} thất bại:`, {
    message: error.message,
    status: error.status,
    errorCode: error.errorCode,
  });
}

export const lookupsApi = {
  /**
   * Lấy danh sách điểm đến thật từ bảng dbo.locations.
   * Dùng cho dropdown filter; form Thêm/Sửa sau này tái sử dụng.
   * Output: mảng [{ id, parentId, provinceId, name, slug, provinceName }]
   */
  async getLocations(params = {}) {
    // Chỉ gắn tham số có giá trị; gửi chuỗi rỗng sẽ thành ?q= và BE hiểu là filter rỗng.
    const search = new URLSearchParams();
    if (params.provinceId) search.set("provinceId", params.provinceId);
    if (params.parentId) search.set("parentId", params.parentId);
    if (params.q) search.set("q", params.q);
    const query = search.toString();

    // Lưu ý: prefix route là /lookup (số ít), không phải /lookups.
    const path = `/lookup/locations${query ? `?${query}` : ""}`;

    try {
      const payload = await apiFetch(path);
      return payload?.data?.items || [];
    } catch (error) {
      logLookupError("getLocations", error);
      throw error;
    }
  },

  /**
   * Lấy danh sách phường/xã theo tỉnh/thành.
   * BE bắt buộc phải có provinceId, thiếu sẽ trả 400 VALIDATION_ERROR.
   * Output: mảng [{ id, code, name, fullName, administrativeType }]
   */
  async getWards(provinceId) {
    if (!provinceId) return [];

    const path = `/lookup/wards?provinceId=${provinceId}`;

    try {
      const payload = await apiFetch(path);
      return payload?.data?.items || [];
    } catch (error) {
      logLookupError("getWards", error);
      throw error;
    }
  },

  /**
   * Lấy danh sách tiện nghi đang hoạt động.
   * scope: "accommodation" (mặc định) | "room" | "both"
   * Output: mảng [{ id, code, name, amenityScope, categoryCode, categoryName, iconKey, description, sortOrder }]
   */
  async getAmenities(scope = "accommodation") {
    const path = `/lookup/amenities?scope=${scope}`;

    try {
      const payload = await apiFetch(path);
      return payload?.data?.items || [];
    } catch (error) {
      logLookupError("getAmenities", error);
      throw error;
    }
  },

  /**
   * Lấy danh sách điểm tham quan thuộc một điểm đến.
   * BE bắt buộc phải có locationId.
   * includeInactive = true để vẫn thấy các điểm đã ngừng hoạt động
   * (cần cho trường hợp cơ sở lưu trú đã liên kết từ trước).
   * Output: mảng [{ id, name, addressLine, imageUrl, isActive, latitude, longitude }]
   */
  async getAttractions(locationId, includeInactive = false) {
    if (!locationId) return [];

    const path = `/lookup/attractions?locationId=${locationId}&includeInactive=${
      includeInactive ? "true" : "false"
    }`;

    try {
      const payload = await apiFetch(path);
      return payload?.data?.items || [];
    } catch (error) {
      logLookupError("getAttractions", error);
      throw error;
    }
  },
};
