import { apiFetch } from "./client";

const API_ORIGIN = "http://localhost:3002";
/**
 * Backend trả URL tương đối như:
 * /uploads/accommodations/example.jpg
 *
 * Trình duyệt frontend chạy ở port 5175 sẽ hiểu URL này
 * là http://localhost:5175/uploads/...
 *
 * Vì file thật nằm ở backend port 3002,
 * cần chuyển thành URL tuyệt đối.
 */

export function buildImageUrl(imageUrl) {
  if (!imageUrl) {
    return null;
  }
  // Nếu sau này backend đã trả URL đầy đủ,
  // không nối domain lần nữa.
  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("data:") ||
    imageUrl.startsWith("blob:")
  ) {
    return imageUrl;
  }
  const normalizedPath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  return `${API_ORIGIN}${normalizedPath}`;
}

/**
 * Đổi một item từ DTO backend sang format mà UI accommodation hiện tại đang dùng.
 *
 * Backend dùng camelCase, còn một số component cũ đang dùng snake_case.
 * Adapter là lớp trung gian để hai phía không phải phụ thuộc trực tiếp vào nhau.
 */
export function mapAccommodationSummary(item) {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    slug: item.slug,

    type: item.type?.code || item.type?.name || "",

    statusValue: item.status,
    status: item.statusLabel || String(item.status ?? ""),
    statusLabel: item.statusLabel || "",

    // Quan trọng: URL ảnh phải trỏ tới backend port 3002.
    cover_image: buildImageUrl(item.coverImageUrl),

    location_id: item.location?.id ?? null,
    location: item.location || null,
    province: item.province || null,
    // UI cũ (FormPage) đọc `ward` như CHUỖI tên phường (mapping mục 5.1),
    // còn backend trả object { id, name }. Nếu giữ object, JSX
    // <option>{formData.ward}</option> sẽ ném lỗi
    // "Objects are not valid as a React child".
    ward: item.ward?.name || "",
    address: item.addressLine || "",
    star_rating: item.starRating ?? null,
    featured: Boolean(item.isFeatured),
    room_types_count: item.roomTypesCount ?? 0,
    amenities_count: item.amenitiesCount ?? 0,
    updatedAt: item.updatedAt || null,
  };
}

/**
 * Chuyển object params thành query string an toàn.
 * Mảng được gửi theo format CSV mà backend quy định, ví dụ status=1,2.
 */
export function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    // Không gửi filter rỗng để URL gọn và backend nhận được NULL đúng nghĩa.
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        searchParams.set(key, value.join(","));
      }
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export const accommodationsApi = {
  async uploadImage(file) {
    const body = new FormData();
    body.append("file", file);
    const payload = await apiFetch("/uploads/accommodations", {
      method: "POST",
      body,
    });
    // ImageUpload cần URL tuyệt đối vì frontend chạy port 5175,
    // còn file tĩnh được backend phục vụ ở port 3002.
    return buildImageUrl(payload.data.url);
  },
  /** Lấy danh sách, filter, sort và pagination từ backend. */
  async getList(params = {}) {
    const { signal, ...queryParams } = params;
    const queryString = buildQueryString(queryParams);
    const path = `/accommodations${queryString}`;

    try {
      const payload = await apiFetch(path, { signal });

      const rawItems = payload.data?.items || [];
      const mappedItems = rawItems.map(mapAccommodationSummary);

      return {
        ...payload,
        data: {
          ...payload.data,
          items: mappedItems,
        },
      };
    } catch (error) {
      console.error("[ERROR] getList thất bại:", {
        message: error.message,
        status: error.status,
        errorCode: error.errorCode,
      });
      throw error;
    }
  },

  /** Cập nhật một accommodation theo id (PUT). */
  async update(id, data) {
    try {
      const payload = await apiFetch(`/accommodations/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      return payload.data;
    } catch (error) {
      console.error("[ERROR] Cập nhật thất bại:", {
        message: error.message,
        status: error.status,
        errorCode: error.errorCode,
        errors: error.errors,
      });
      throw error;
    }
  },

  async updateFeatured(id, isFeatured) {
    console.group('[accommodationsApi.updateFeatured]');
    try {
      console.log('[1] id + isFeatured:', { id, isFeatured });
      const payload = await apiFetch(`/accommodations/${id}/featured`, {
        method: 'PATCH',
        body: JSON.stringify({ isFeatured }),
      });
      console.log('[2] phản hồi:', payload.data);
      return payload.data;
    } catch (error) {
      console.error('[3] lỗi đổi nổi bật:', {
        status: error.status,
        errorCode: error.errorCode,
        errors: error.errors,
      });
      throw error;
    } finally {
      console.groupEnd();
    }
  },

  async remove(id) {
    console.group('[accommodationsApi.remove]');
    try {
      console.log('[1] xóa mềm id:', id);
      const payload = await apiFetch(`/accommodations/${id}`, {
        method: 'DELETE',
      });
      console.log('[2] phản hồi:', payload.data);
      return payload.data;
    } catch (error) {
      console.error('[3] lỗi xóa cơ sở lưu trú:', {
        status: error.status,
        errorCode: error.errorCode,
        errors: error.errors,
      });
      throw error;
    } finally {
      console.groupEnd();
    }
  },

  /** Tạo mới một accommodation (POST) — trả về DTO detail vừa tạo. */
  async create(data) {
    try {
      const payload = await apiFetch(`/accommodations`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return payload.data;
    } catch (error) {
      // Lỗi 400/409 mang theo error.errors ({ code: "..." }) để form gắn vào đúng ô input
      console.error("[ERROR] Tạo mới thất bại:", {
        message: error.message,
        status: error.status,
        errorCode: error.errorCode,
        errors: error.errors,
      });
      throw error; // ném lại để handleSubmit gọi setErrors
    }
  },

  async getDetail(id) {
    if (!id) {
      console.error("[ERROR] Thiếu accommodation id.");
      throw new Error("Thiếu accommodation id.");
    }

    const path = `/accommodations/${id}`;

    try {
      const payload = await apiFetch(path);
      const mappedData = mapAccommodationDetail(payload.data);

      return {
        ...payload,
        data: mappedData,
      };
    } catch (error) {
      console.error("[ERROR] getDetail thất bại:", {
        message: error.message,
        status: error.status,
        errorCode: error.errorCode,
      });
      throw error;
    }
  },
};

/**
 * Chuyển DTO detail từ backend sang format mà DetailPage hiện tại đang dùng.
 *
 * Input:
 *   accommodation detail theo camelCase từ backend
 *
 * Output:
 *   object có thêm các field tương thích với UI cũ,
 *   ví dụ cover_image, address, star_rating.
 */

export function mapAccommodationDetail(item) {
  if (!item) {
    return null;
  }
  return {
    ...item,
    cover_image: buildImageUrl(item.coverImageUrl),
    address: item.addressLine || "",
    star_rating: item.starRating ?? null,
    featured: Boolean(item.isFeatured),
    short_description: item.shortDescription || "",
    full_description: item.description || "",
    images: (item.images || []).map((image) => ({
      ...image,
      imageUrl: buildImageUrl(image.imageUrl),
    })),
    // Giữ thêm gallery_images để tab Hình ảnh cũ có thể render đúng dữ liệu API.
    gallery_images: (item.images || []).map((image) =>
      buildImageUrl(image.imageUrl),
    ),
    amenities: (item.amenities || []).map((amenity) => ({
      ...amenity,
      // Alias phục vụ component cũ đang đọc category.
      category: amenity.categoryName || amenity.categoryCode || "",
    })),
    attractions: (item.attractions || []).map((attraction) => ({
      ...attraction,
      // Alias phục vụ bảng cũ; giá trị gốc camelCase vẫn được giữ nguyên.
      attraction_id: attraction.attractionId,
      distance: attraction.distanceMeters,
      distance_unit: "m",
      notes: attraction.note || "",
      image: buildImageUrl(attraction.imageUrl),
      address: attraction.addressLine || "",
      is_active: attraction.isActive,
    })),
    room_types: (item.roomTypes || []).map((room) => ({
      ...room,
      base_price: room.minPrice ?? null,
      cover_image: buildImageUrl(room.coverImageUrl),
      // Tên field tương thích với bảng room type cũ.
      room_image: buildImageUrl(room.coverImageUrl),
      // Manager nhập số lượng và loại giường trong một ô text.
      bed_type: room.bedDescription || "—",
      room_size: room.areaSqm ?? null,
      included_adults: room.includedAdults ?? 0,
      included_children: room.includedChildren ?? 0,
      max_occupancy: room.maxOccupancy ?? "—",
      statusLabel:
        room.statusLabel ||
        ({ 0: "Bản nháp", 1: "Đang hoạt động", 2: "Ngừng hoạt động" }[
          room.status
        ] || "Không xác định"),
      accommodation_id: item.id,
    })),
  };
}
