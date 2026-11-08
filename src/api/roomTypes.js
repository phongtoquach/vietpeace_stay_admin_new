import { apiFetch } from "./client";
import { buildImageUrl, buildQueryString } from "./accommodations.js";

/**
 * DTO DB -> dữ liệu UI.
 *
 * Khác biệt quan trọng so với mock cũ:
 * - DB dùng `bedDescription` (UI cũ gọi `bed_type`)
 * - DB dùng `areaSqm` (UI cũ gọi `room_size`)
 * - Ảnh bìa lấy từ room_type_images, cần nối origin backend
 * - DB không có cột "view" nên UI bỏ filter hướng nhìn
 */
export function mapRoomTypeSummary(item) {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    accommodationId: item.accommodationId,
    accommodationName: item.accommodationName || "",
    quantity: item.quantity,
    basePrice: item.basePrice,
    areaSqm: item.areaSqm,
    bedDescription: item.bedDescription || "",
    includedAdults: item.includedAdults,
    includedChildren: item.includedChildren,
    maxOccupancy: item.maxOccupancy,
    status: item.status,
    statusLabel: item.statusLabel || "",
    coverImageUrl: buildImageUrl(item.coverImageUrl),
    updatedAt: item.updatedAt || null,
  };
}

export function mapRoomTypeDetail(item) {
  const images = (item.images || []).map((image) => ({
    ...image,
    imageUrl: buildImageUrl(image.imageUrl),
  }));
  const cover = images.find((image) => image.isCover) || images[0] || null;

  return {
    ...item,
    images,
    coverImageUrl: cover?.imageUrl || null,
    galleryImageUrls: images
      .filter((image) => image !== cover)
      .map((image) => image.imageUrl),
    amenityIds: (item.amenities || []).map((amenity) => amenity.id),
    weekdayRates: item.weekdayRates || [],
  };
}

/* ============================================================
 * WRITE: form state (snake_case) -> payload API (camelCase)
 * ============================================================ */

// DB lưu đường dẫn tương đối /uploads/..., còn form giữ URL tuyệt đối
// (http://localhost:3002/uploads/...) để <img> tải được ảnh từ backend.
function toRelativeImageUrl(url) {
  if (!url) return null;
  const match = String(url).match(/^https?:\/\/[^/]+(\/uploads\/.+)$/);
  return match ? match[1] : String(url);
}

/**
 * Ảnh vừa chọn từ máy đang là data: (FileReader) hoặc blob:.
 * Những URL này chỉ sống trong tab hiện tại, gửi lên DB là ảnh chết.
 */
export function isLocalPreviewUrl(url) {
  return (
    typeof url === 'string' &&
    (url.startsWith('data:') || url.startsWith('blob:'))
  );
}

/**
 * Chuyển state của RoomTypeFormPage sang đúng shape backend validate.
 * Dùng chung cho cả POST và PUT.
 */
export function toRoomTypeWritePayload(formData, weekdayRates) {
  const coverImage = formData.room_image || '';
  const galleryImages = (formData.supplementary_images || []).filter(Boolean);

  // Gộp ảnh bìa + ảnh phụ, bỏ trùng; ảnh đầu tiên trong danh sách là ảnh bìa.
  const imageUrls = [...new Set([coverImage, ...galleryImages].filter(Boolean))]
    .map(toRelativeImageUrl);

  // base_price rỗng phải gửi null để backend báo "Vui lòng nhập giá gốc",
  // thay vì gửi 0 và nhận lỗi "phải lớn hơn hoặc bằng 0.01".
  const rawBasePrice = Number(formData.base_price);
  const basePrice =
    Number.isFinite(rawBasePrice) && rawBasePrice > 0 ? rawBasePrice : null;

  // Backend bắt buộc đủ 7 ngày và price > 0.
  // Ngày nào chưa nhập thì lấy giá gốc làm mặc định.
  const weekdayRateItems = [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => {
    const value = Number(weekdayRates?.[dayOfWeek]);
    return { dayOfWeek, price: value > 0 ? value : (basePrice || 0) };
  });

  return {
    accommodationId: Number(formData.accommodation_id),
    code: String(formData.code || '').trim(),
    name: String(formData.name || '').trim(),
    shortDescription: formData.short_description || null,
    description: formData.description || null,
    quantity: Number(formData.quantity),
    basePrice,
    areaSqm: formData.room_size === '' ? null : Number(formData.room_size),
    bedDescription: formData.bed_type || null,
    bedroomCount: Number(formData.bedroom_count),
    bathroomCount: Number(formData.bathroom_count),
    includedAdults: Number(formData.included_adults),
    includedChildren: Number(formData.included_children),
    maxAdults: Number(formData.max_adults),
    maxChildren: Number(formData.max_children),
    maxOccupancy: Number(formData.max_occupancy),
    extraAdultFee: Number(formData.extra_adult_fee) || 0,
    extraChildFee: Number(formData.extra_child_fee) || 0,
    status: Number(formData.status),
    sortOrder: Number(formData.sort_order) || 0,

    // Backend nhận key "images" dạng [{ imageUrl, isCover, sortOrder }].
    // Chỉ được 1 ảnh isCover = true; ảnh đầu tiên giữ vai trò bìa.
    images: imageUrls.map((imageUrl, index) => ({
      imageUrl,
      isCover: index === 0,
      sortOrder: index,
    })),

    // Form giữ amenity_ids; backend cần [{ amenityId }].
    amenities: (formData.amenity_ids || []).map((amenityId) => ({
      amenityId: Number(amenityId),
    })),

    weekdayRates: weekdayRateItems,
  };
}

export const roomTypesApi = {
  /** Upload ảnh loại phòng; trả URL tuyệt đối để <img> hiển thị được. */
  async uploadImage(file) {
    const body = new FormData();
    body.append('file', file);

    const payload = await apiFetch('/uploads/room-types', {
      method: 'POST',
      body,
    });

    return buildImageUrl(payload.data.url);
  },

  /** Lấy danh sách loại phòng có filter/sort/pagination từ backend. */
  async getList(params = {}) {
    const queryString = buildQueryString(params);
    const payload = await apiFetch(`/room-types${queryString}`);
    const rawItems = payload.data?.items || [];

    return {
      ...payload,
      data: {
        ...payload.data,
        items: rawItems.map(mapRoomTypeSummary),
      },
    };
  },

  async getDetail(id) {
    const payload = await apiFetch(`/room-types/${id}`);
    return {
      ...payload,
      data: mapRoomTypeDetail(payload.data),
    };
  },

  async create(data) {
    console.group('[roomTypesApi.create]');
    try {
      console.log('[1] payload gửi lên:', data);
      const payload = await apiFetch('/room-types', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      console.log('[2] tạo xong:', {
        id: payload.data?.id,
        name: payload.data?.name,
      });
      return mapRoomTypeDetail(payload.data);
    } catch (error) {
      console.error('[3] lỗi tạo loại phòng:', {
        status: error.status,
        errorCode: error.errorCode,
        errors: error.errors,
      });
      throw error;
    } finally {
      console.groupEnd();
    }
  },

  async update(id, data) {
    console.group('[roomTypesApi.update]');
    try {
      console.log('[1] id + payload:', { id, payload: data });
      const payload = await apiFetch(`/room-types/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      console.log('[2] cập nhật xong:', {
        id: payload.data?.id,
        updatedAt: payload.data?.updatedAt,
      });
      return mapRoomTypeDetail(payload.data);
    } catch (error) {
      console.error('[3] lỗi cập nhật loại phòng:', {
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
    console.group('[roomTypesApi.remove]');
    try {
      console.log('[1] xóa mềm id:', id);
      const payload = await apiFetch(`/room-types/${id}`, {
        method: 'DELETE',
      });
      console.log('[2] phản hồi:', payload.data);
      return payload.data;
    } catch (error) {
      console.error('[3] lỗi xóa loại phòng:', {
        status: error.status,
        errorCode: error.errorCode,
      });
      throw error;
    } finally {
      console.groupEnd();
    }
  },
};
