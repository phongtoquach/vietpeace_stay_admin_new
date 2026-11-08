import { apiFetch } from "./client";

export const dashboardApi = {
  async getSummary() {
    const payload = await apiFetch("/dashboard/summary");
    return payload.data;
  },

  async getCharts() {
    const payload = await apiFetch("/dashboard/charts");
    return payload.data;
  },
};
