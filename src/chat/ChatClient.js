import { io } from "socket.io-client";

const ADMIN_API_BASE = (
  import.meta.env.VITE_ADMIN_API_BASE_URL || "http://localhost:3002/api/admin"
).replace(/\/+$/, "");
const BACKEND_BASE = (
  import.meta.env.VITE_BACKEND_APP_BASE_URL ||
  ADMIN_API_BASE.replace(/\/api\/admin\/?$/, "")
).replace(/\/+$/, "");
const ADMIN_CHAT_BASE = `${ADMIN_API_BASE}/chat`;

async function request(path, { method = "GET", body = null } = {}) {
  const opts = {
    method,
    credentials: "include",
    headers: {},
  };
  if (body !== null) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${ADMIN_CHAT_BASE}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const err = new Error(json.message || `Admin Chat API error (${res.status})`);
    err.statusCode = res.status;
    err.errorCode = json.errorCode || "ADMIN_CHAT_ERROR";
    err.data = json.data || null;
    throw err;
  }
  return json.data;
}

class AdminChatClient {
  constructor() {
    this.socket = null;
    this.connectingPromise = null;
  }

  getMe() {
    return request("/me");
  }

  getSocketTicket() {
    return request("/socket-ticket", { method: "POST", body: {} });
  }

  listConversations(params = {}) {
    const qs = new URLSearchParams();
    if (params.accommodationId) qs.set("accommodationId", String(params.accommodationId));
    if (params.status && params.status !== "ALL") qs.set("status", params.status);
    if (params.handlingMode && params.handlingMode !== "ALL") qs.set("handlingMode", params.handlingMode);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/conversations${suffix}`);
  }

  listSuperviseAccommodations() {
    return request("/conversation-accommodations");
  }

  getConversation(id) {
    return request(`/conversations/${id}`);
  }

  getMessages(id, { limit = 60, beforeSequence = null } = {}) {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (beforeSequence) qs.set("beforeSequence", String(beforeSequence));
    return request(`/conversations/${id}/messages?${qs.toString()}`);
  }

  sendReply(id, body) {
    return request(`/conversations/${id}/messages`, { method: "POST", body });
  }

  claimConversation(id) {
    return request(`/conversations/${id}/claim`, { method: "POST", body: {} });
  }

  addStaffNote(id, content) {
    return request(`/conversations/${id}/notes`, { method: "POST", body: { content } });
  }

  generateAiDraft(id) {
    return request(`/conversations/${id}/ai-drafts`, { method: "POST", body: {} });
  }

  returnToAi(id) {
    return request(`/conversations/${id}/return-to-ai`, { method: "POST", body: {} });
  }

  resolveConversation(id) {
    return request(`/conversations/${id}/resolve`, { method: "POST", body: {} });
  }

  markDelivered(id, sequence) {
    return request(`/conversations/${id}/delivered`, { method: "POST", body: { sequence } });
  }

  syncDeliveredAll() {
    return request("/conversations/delivered-sync", { method: "POST", body: {} });
  }

  markRead(id, sequence) {
    return request(`/conversations/${id}/read`, { method: "POST", body: { sequence } });
  }

  getAuditEvents(id) {
    return request(`/conversations/${id}/events`);
  }

  getSettings() {
    return request("/settings");
  }

  updateSettings(body) {
    return request("/settings", { method: "PUT", body });
  }

  // Internal Chat
  listInternalContacts() {
    return request("/internal/contacts");
  }

  listInternalThreads() {
    return request("/internal/threads");
  }

  openOrCreateInternalThread(targetUserId) {
    return request("/internal/threads", { method: "POST", body: { targetUserId } });
  }

  listInternalMessages(threadId, { limit = 60, beforeSequence = null } = {}) {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (beforeSequence) qs.set("beforeSequence", String(beforeSequence));
    return request(`/internal/threads/${threadId}/messages?${qs.toString()}`);
  }

  sendInternalMessage(threadId, body) {
    return request(`/internal/threads/${threadId}/messages`, { method: "POST", body });
  }

  markInternalDelivered(threadId, sequence) {
    return request(`/internal/threads/${threadId}/delivered`, { method: "POST", body: { sequence } });
  }

  syncInternalDeliveredAll() {
    return request("/internal/delivered-sync", { method: "POST", body: {} });
  }

  markInternalRead(threadId, sequence) {
    return request(`/internal/threads/${threadId}/read`, { method: "POST", body: { sequence } });
  }

  renameInternalThread(threadId, customName) {
    return request(`/internal/threads/${threadId}/rename`, {
      method: "PATCH",
      body: { customName },
    });
  }

  getInternalSummary() {
    return request("/internal/summary");
  }

  // Admin-only Chat Reports
  getReportsSummary() {
    return request("/reports/summary");
  }

  listMissedHandoffs({ unreadOnly = false } = {}) {
    return request(`/reports/missed-handoffs?unreadOnly=${unreadOnly ? "true" : "false"}`);
  }

  ackMissedHandoff(id) {
    return request(`/reports/missed-handoffs/${id}/ack`, { method: "POST", body: {} });
  }

  listRatings(status = "ALL") {
    return request(`/ratings?status=${encodeURIComponent(status)}`);
  }

  reviewRating(ratingId, { decision, reviewNote }) {
    return request(`/ratings/${ratingId}/review`, {
      method: "POST",
      body: { decision, reviewNote },
    });
  }

  sendWarningEmail(ratingId, { adminNote }) {
    return request(`/ratings/${ratingId}/warning-email`, {
      method: "POST",
      body: { adminNote },
    });
  }

  async connectSocket() {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }
    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = (async () => {
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      const { ticket } = await this.getSocketTicket();
      const socket = io(`${BACKEND_BASE}/chat`, {
        path: "/socket.io",
        withCredentials: true,
        transports: ["websocket", "polling"],
        auth: { ticket },
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 1200,
      });

      socket.on("connect_error", async (err) => {
        if (/TICKET|TOKEN|SESSION|401|403/i.test(String(err?.message || ""))) {
          try {
            const refreshed = await this.getSocketTicket();
            socket.auth = { ticket: refreshed.ticket };
          } catch {
            // let reconnect backoff handle
          }
        }
      });

      this.socket = socket;
      return socket;
    })();

    try {
      return await this.connectingPromise;
    } finally {
      this.connectingPromise = null;
    }
  }

  disconnectSocket() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const adminChatClient = new AdminChatClient();
