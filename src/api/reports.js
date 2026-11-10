import { apiFetch } from "./client";

function buildQuery(year, month, accommodationId) {
  const params = new URLSearchParams({ year: String(year) });
  if (month) {
    params.set("month", String(month));
  }
  if (accommodationId) {
    params.set("accommodationId", String(accommodationId));
  }
  return `?${params.toString()}`;
}

async function fetchReport(path, year, month, accommodationId) {
  const payload = await apiFetch(
    `${path}${buildQuery(year, month, accommodationId)}`,
  );
  return payload.data;
}

export const reportsApi = {
  getRevenue(year, month, accommodationId = null) {
    return fetchReport("/reports/revenue", year, month, accommodationId);
  },

  getBookings(year, month) {
    return fetchReport("/reports/bookings", year, month);
  },

  getOccupancy(year, month) {
    return fetchReport("/reports/occupancy", year, month);
  },

  async getMonthlyOrders(year, month, page = 1, limit = 10, accommodationId = null) {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      page: String(page),
      limit: String(limit),
    });
    if (accommodationId) {
      params.set("accommodationId", String(accommodationId));
    }
    const payload = await apiFetch(`/reports/orders?${params.toString()}`);
    return payload.data;
  },
};
