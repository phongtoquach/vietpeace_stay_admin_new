import { apiFetch } from "./client";

/** Danh sách ticket — ADMIN thấy toàn bộ, MANAGER chỉ thấy đúng accommodation assignment (scope lọc ở backend). */
export function fetchTickets({ status = "", category = "", limit = 50 } = {}) {
  const searchParams = new URLSearchParams();
  if (status) searchParams.set("status", status);
  if (category) searchParams.set("category", category);
  searchParams.set("limit", String(limit));

  return apiFetch(`/chatbot/tickets?${searchParams.toString()}`);
}

/** Chi tiết ticket: ticket + messages (hội thoại) + booking_context tối thiểu. */
export function fetchTicketDetail(ticketId) {
  return apiFetch(`/chatbot/tickets/${ticketId}`);
}

/** Gán nhân viên (chỉ ADMIN; assignee phải có assignment đúng accommodation của ticket). */
export function assignTicket(ticketId, assigneeId) {
  return apiFetch(`/chatbot/tickets/${ticketId}/assign`, {
    method: "POST",
    body: JSON.stringify({ assigneeId }),
  });
}

/** Chuyển trạng thái theo state machine; CANCELLED/OPEN(reopen) bắt buộc reason. */
export function transitionTicket(ticketId, status, reason = null) {
  return apiFetch(`/chatbot/tickets/${ticketId}/status`, {
    method: "POST",
    body: JSON.stringify({ status, reason }),
  });
}

/** Phản hồi customer (isInternalNote=true => ghi chú nội bộ, khách không thấy). */
export function replyTicket(ticketId, content, isInternalNote = false) {
  return apiFetch(`/chatbot/tickets/${ticketId}/reply`, {
    method: "POST",
    body: JSON.stringify({ content, isInternalNote }),
  });
}

/** Danh sách cơ sở kèm manager — dùng để lọc nhân viên đủ phạm vi (T09A). */
export function fetchManagersOverview() {
  return apiFetch("/accommodations/managers-overview");
}
