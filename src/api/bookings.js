import { apiFetch } from "./client";

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

/** Chuyển DTO list của backend sang shape snake_case mà UI booking đang dùng. */
export function mapBookingSummary(item) {
  return {
    id: item.id,
    code: item.code,
    status: item.status,
    customer_name: item.customerName,
    customer_phone: item.customerPhone,
    customer_email: item.customerEmail,
    accommodation_id: item.accommodationId,
    accommodation_name: item.accommodationName,
    manager_name: item.managerName,
    room_type_name: (item.roomTypeNames || []).join(", ") || "—",
    checkin_date: item.checkInDate,
    checkout_date: item.checkOutDate,
    nights: item.totalNights,
    rooms_count: item.roomsCount,
    adults_count: item.adultsCount,
    children_count: item.childrenCount,
    total_amount: item.totalAmount,
    created_at: item.createdAt,
    checked_in_at: item.checkedInAt,
    checked_out_at: item.checkedOutAt,
    operational_status: item.operationalStatus,
  };
}

/** Chuyển DTO detail của backend sang shape snake_case của trang chi tiết. */
export function mapBookingDetail(item) {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    code: item.code,
    status: item.status,
    customer_name: item.customer?.name,
    customer_phone: item.customer?.phone,
    customer_email: item.customer?.email,
    accommodation_id: item.accommodation?.id,
    accommodation_name: item.accommodation?.name,
    accommodation_manager_name: item.accommodation?.managerName,
    accommodation_phone: item.accommodation?.phone,
    accommodation_email: item.accommodation?.email,
    accommodation_address: item.accommodation?.addressLine,
    accommodation_check_in_time: item.accommodation?.checkInTime,
    accommodation_check_out_time: item.accommodation?.checkOutTime,
    checkin_date: item.stay?.checkInDate,
    checkout_date: item.stay?.checkOutDate,
    nights: item.stay?.totalNights,
    rooms_count: item.stay?.roomsCount,
    adults_count: item.stay?.adultsCount,
    children_count: item.stay?.childrenCount,
    checked_in_at: item.stay?.checkedInAt,
    checked_out_at: item.stay?.checkedOutAt,
    checked_in_by_name: item.stay?.checkedInByName,
    checked_out_by_name: item.stay?.checkedOutByName,
    operational_status: item.stay?.operationalStatus,
    rooms_subtotal: item.pricing?.roomsSubtotal ?? 0,
    extra_guest_total: item.pricing?.extraGuestTotal ?? 0,
    room_discount_total: item.pricing?.roomDiscountTotal ?? 0,
    discount_amount: item.pricing?.discountAmount ?? 0,
    tax_amount: item.pricing?.taxAmount ?? 0,
    service_fee: item.pricing?.serviceFee ?? 0,
    total_amount: item.pricing?.totalAmount ?? 0,
    currency: item.pricing?.currency || "VND",
    special_requests: item.specialRequests,
    created_at: item.lifecycle?.createdAt,
    confirmed_at: item.lifecycle?.confirmedAt,
    cancelled_at: item.lifecycle?.cancelledAt,
    cancellation_reason: item.lifecycle?.cancellationReason,
    items: (item.items || []).map((row) => ({
      id: row.id,
      room_type_id: row.roomTypeId,
      room_type_name: row.roomTypeName,
      adults: row.adults,
      children: row.children,
      base_price: row.basePrice,
      room_subtotal: row.roomSubtotal,
      extra_adult_total: row.extraAdultTotal,
      extra_child_total: row.extraChildTotal,
      discount_amount: row.discountAmount,
      total_amount: row.totalAmount,
    })),
  };
}

export const bookingsApi = {
  async getList(params = {}) {
    const { signal, ...queryParams } = params;
    const payload = await apiFetch(`/bookings${buildQueryString(queryParams)}`, {
      signal,
    });

    return {
      ...payload,
      data: {
        ...payload.data,
        items: (payload.data?.items || []).map(mapBookingSummary),
      },
    };
  },

  async getDetail(id) {
    if (!id) {
      throw new Error("Thiếu booking id.");
    }

    const payload = await apiFetch(`/bookings/${id}`);
    return {
      ...payload,
      data: mapBookingDetail(payload.data),
    };
  },

  async approve(id) {
    if (!id) {
      throw new Error("Thiếu booking id.");
    }

    const payload = await apiFetch(`/bookings/${id}/approve`, {
      method: "PATCH",
    });
    return payload.data;
  },

  async checkIn(id) {
    if (!id) {
      throw new Error("Thiếu booking id.");
    }

    const payload = await apiFetch(`/bookings/${id}/check-in`, {
      method: "PATCH",
    });
    return payload.data;
  },

  async checkOut(id) {
    if (!id) {
      throw new Error("Thiếu booking id.");
    }

    const payload = await apiFetch(`/bookings/${id}/check-out`, {
      method: "PATCH",
    });
    return payload.data;
  },

  async updateDates(id, { checkinDate, checkoutDate }) {
    if (!id) {
      throw new Error("Thiếu booking id.");
    }

    const payload = await apiFetch(`/bookings/${id}/dates`, {
      method: "PATCH",
      body: JSON.stringify({ checkinDate, checkoutDate }),
    });
    return payload.data;
  },

  async updateContact(id, { contactName, contactEmail, contactPhone }) {
    if (!id) {
      throw new Error("Thiếu booking id.");
    }

    const payload = await apiFetch(`/bookings/${id}/contact`, {
      method: "PATCH",
      body: JSON.stringify({ contactName, contactEmail, contactPhone }),
    });
    return payload.data;
  },
};
