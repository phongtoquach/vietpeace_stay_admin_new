export function isImeComposing(event) {
  return Boolean(event?.nativeEvent?.isComposing || event?.keyCode === 229);
}

/** Return up to 2 uppercase initials for list and header avatars. */
export function getInitials(name, fallback = "KH") {
  const clean = String(name || "").trim();
  if (!clean) return fallback;
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
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

/** Format compact timestamp for sidebar conversation cards (HH:mm today, dd/MM otherwise). */
export function formatSidebarTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return formatShortClock(isoString);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export function isSameCalendarDay(aIso, bIso) {
  if (!aIso || !bIso) return false;
  const a = new Date(aIso);
  const b = new Date(bIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Return localized day separator heading ("Hôm nay", "Hôm qua", or dd/MM/yyyy). */
export function getDaySeparatorLabel(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameCalendarDay(d, today)) return "Hôm nay";
  if (isSameCalendarDay(d, yesterday)) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Group consecutive non-system messages from the same sender within 3 minutes on the same day. */
export function shouldGroupChatMessages(prevMsg, currMsg, getSenderKey) {
  if (!prevMsg || !currMsg) return false;
  if (prevMsg.senderType === "SYSTEM" || currMsg.senderType === "SYSTEM") return false;
  if ((prevMsg.visibility || "PUBLIC") !== (currMsg.visibility || "PUBLIC")) return false;
  if (getSenderKey(prevMsg) !== getSenderKey(currMsg)) return false;
  if (!isSameCalendarDay(prevMsg.createdAt, currMsg.createdAt)) return false;
  const prevMs = new Date(prevMsg.createdAt).getTime();
  const currMs = new Date(currMsg.createdAt).getTime();
  if (Number.isNaN(prevMs) || Number.isNaN(currMs)) return false;
  return Math.abs(currMs - prevMs) <= 3 * 60 * 1000;
}

/** Map raw conversation handlingMode/status enums to localized Vietnamese labels and chip tones. */
export function getHandlingModeMeta(handlingMode, status) {
  if (status === "RESOLVED") {
    return { tone: "resolved", shortLabel: "Đã đóng", fullLabel: "Đã đóng" };
  }
  switch (handlingMode) {
    case "WAITING_HUMAN":
      return { tone: "waiting_human", shortLabel: "Chờ tiếp nhận", fullLabel: "Đang chờ Quản lý" };
    case "HUMAN":
      return { tone: "human", shortLabel: "Quản lý", fullLabel: "Quản lý đang hỗ trợ" };
    case "AI":
    default:
      return { tone: "ai", shortLabel: "AI", fullLabel: "AI hỗ trợ" };
  }
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
