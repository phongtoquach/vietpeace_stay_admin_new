export function isImeComposing(event) {
  return Boolean(event?.nativeEvent?.isComposing || event?.keyCode === 229);
}

export function formatFullDateTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatShortClock(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function formatCountdown(isoString, nowMs) {
  if (!isoString) return "00:00";
  const target = new Date(isoString).getTime();
  const s = Number.isNaN(target) ? 0 : Math.max(0, Math.ceil((target - nowMs) / 1000));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function getAdminReceiptMeta(msg, delivery, counterpartyLabel = "Người nhận") {
  if (!msg) return null;
  if (msg.localStatus === "sending") {
    return { state: "SENDING", label: "Đang gửi…", tooltip: "Đang gửi lên hệ thống…" };
  }
  if (msg.localStatus === "failed") {
    return { state: "FAILED", label: "Gửi thất bại", tooltip: "Gửi tin nhắn thất bại." };
  }
  const seq = Number(msg.sequence || 0);
  const readSeq = Number(delivery?.readSequence || 0);
  const delivSeq = Number(delivery?.deliveredSequence || 0);
  if (seq > 0 && readSeq >= seq) {
    return {
      state: "READ",
      label: "Đã xem",
      tooltip: delivery?.readAt
        ? `${counterpartyLabel} đã xem lúc ${formatFullDateTime(delivery.readAt)}`
        : `${counterpartyLabel} đã xem`,
    };
  }
  if (seq > 0 && delivSeq >= seq) {
    return {
      state: "DELIVERED",
      label: "Đã nhận",
      tooltip: delivery?.deliveredAt
        ? `${counterpartyLabel} đã nhận lúc ${formatFullDateTime(delivery.deliveredAt)}`
        : `${counterpartyLabel} đã nhận`,
    };
  }
  return {
    state: "SENT",
    label: "Đã gửi",
    tooltip: msg.createdAt ? `Đã gửi lúc ${formatFullDateTime(msg.createdAt)}` : "Đã gửi",
  };
}
