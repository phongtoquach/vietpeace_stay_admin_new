import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  UserCheck,
  Send,
  Sparkles,
  StickyNote,
  RotateCcw,
  CheckCircle2,
  Eye,
  History,
  Check,
  CheckCheck,
  Building2,
  AlertTriangle,
  Loader2,
  X,
  ArrowDown,
  Lock,
} from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { adminChatClient } from "./ChatClient";
import ChatNavigation from "./ChatNavigation";
import { useAdminChat } from "./ChatContext";
import {
  formatCountdown,
  formatFullDateTime,
  formatShortClock,
  formatSidebarTime,
  getAdminReceiptMeta,
  getDaySeparatorLabel,
  getHandlingModeMeta,
  getInitials,
  groupChatMessages,
  isImeComposing,
} from "./chatUtils";
import { makeClientMsgId } from "./InternalChatStore";
import "./chat.css";

function getConvMessageSenderKey(msg) {
  if (!msg) return "";
  if (msg.visibility === "STAFF") return `STAFF:${msg.senderUserId || msg.senderName || ""}`;
  return `${msg.senderType || ""}:${msg.senderUserId || ""}`;
}

function renderStaffCardSummary(msg) {
  const p = msg?.payload;
  if (!p) return null;
  if (p.kind === "PROPERTY_ATTACHMENT") {
    return (
      <div className="vps-adm-msg-card">
        <strong>Đính kèm cơ sở: {p.accommodationName}</strong>
        {p.checkin && p.checkout && (
          <small>
            Lưu trú: {p.checkin} → {p.checkout} {p.rooms ? `(${p.rooms} phòng)` : ""}
          </small>
        )}
      </div>
    );
  }
  if (p.kind === "ROOM_QUOTE") {
    return (
      <div className="vps-adm-msg-card">
        <strong>
          Báo giá {p.accommodation?.accommodationName} ({p.checkinDate} → {p.checkoutDate})
        </strong>
        {(p.options || []).slice(0, 3).map((opt, idx) => (
          <small key={idx}>
            • {opt.label}: {Math.round(opt.quote?.totalAmount || 0).toLocaleString("vi-VN")} ₫
          </small>
        ))}
      </div>
    );
  }
  if (p.kind === "VERIFIED_BOOKING_CONTEXT") {
    return (
      <div className="vps-adm-msg-card">
        <strong>
          Đơn đặt phòng #{p.bookingCode} ({p.status})
        </strong>
        <small>
          {p.accommodationName} · {p.checkInDate} → {p.checkOutDate}
        </small>
      </div>
    );
  }
  return null;
}

export default function ChatOperations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useAdmin() || {};
  const {
    isAdmin,
    isManager,
    conversations,
    upsertConversation,
    refreshConversations,
    convMessagesById,
    setConvMessagesById,
    appendConvMessage,
    activeConvId,
    setActiveConvId,
    customerTypingByConv,
    pendingHandoffAlerts,
    dismissHandoffAlert,
    waitingCount,
  } = useAdminChat();

  const [modeFilter, setModeFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [accomFilter, setAccomFilter] = useState("");
  const [superviseAccoms, setSuperviseAccoms] = useState([]);
  const [composerMode, setComposerMode] = useState("PUBLIC"); // 'PUBLIC' | 'STAFF_NOTE'
  const [draftText, setDraftText] = useState("");
  const [busyAction, setBusyAction] = useState(false);
  const [draftingAi, setDraftingAi] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditEvents, setAuditEvents] = useState([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const streamRef = useRef(null);
  const streamEndRef = useRef(null);
  const isNearBottomRef = useRef(true);

  // Admin supervise filter accommodations + initial mode
  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    async function loadSupervise() {
      await Promise.resolve();
      if (!alive) return;
      setComposerMode("STAFF_NOTE");
      try {
        const res = await adminChatClient.listSuperviseAccommodations();
        if (alive) setSuperviseAccoms(res.items || []);
      } catch {
        // ignore
      }
    }
    loadSupervise();
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  // Keep full unfiltered global list synchronized so waiting counters/banners stay accurate across tabs
  useEffect(() => {
    refreshConversations().catch(() => {});
  }, [refreshConversations]);

  // Support deep link /admin/chat?convId=... from header notifications
  const requestedConvId = Number(searchParams.get("convId") || 0);
  useEffect(() => {
    if (!requestedConvId) return undefined;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setModeFilter("ALL");
      setActiveConvId(requestedConvId);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("convId");
          return next;
        },
        { replace: true },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [requestedConvId, setActiveConvId, setSearchParams]);

  // 1-second timer when any waiting handoff exists
  useEffect(() => {
    if (!conversations.some((c) => c.handlingMode === "WAITING_HUMAN")) return undefined;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = conversations.filter((c) => {
      if (accomFilter && Number(c.accommodationId) !== Number(accomFilter)) return false;
      if (modeFilter === "RESOLVED" && c.status !== "RESOLVED") return false;
      if (modeFilter !== "ALL" && modeFilter !== "RESOLVED" && c.handlingMode !== modeFilter) return false;
      if (!q) return true;
      return (
        String(c.customerName || "").toLowerCase().includes(q) ||
        String(c.customerEmail || "").toLowerCase().includes(q) ||
        String(c.accommodationName || "").toLowerCase().includes(q) ||
        String(c.lastMessagePreview || "").toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      const aWaiting = a.handlingMode === "WAITING_HUMAN" && a.status === "OPEN" ? 0 : 1;
      const bWaiting = b.handlingMode === "WAITING_HUMAN" && b.status === "OPEN" ? 0 : 1;
      return aWaiting - bWaiting;
    });
  }, [conversations, accomFilter, modeFilter, searchTerm]);

  const selectedConv = useMemo(
    () => conversations.find((c) => Number(c.id) === Number(activeConvId)) || null,
    [conversations, activeConvId],
  );

  const selectedMessages = activeConvId ? convMessagesById[Number(activeConvId)] || [] : [];

  // Prefer active waiting handoff first if nothing is selected yet
  useEffect(() => {
    if (requestedConvId) return;
    if (!activeConvId && filteredConversations.length > 0) {
      const firstWaiting = filteredConversations.find((c) => c.handlingMode === "WAITING_HUMAN" && c.status === "OPEN");
      setActiveConvId((firstWaiting || filteredConversations[0]).id);
    }
  }, [requestedConvId, activeConvId, filteredConversations, setActiveConvId]);

  // Load selected conversation messages & join room & mark read (Manager ONLY!)
  useEffect(() => {
    if (!activeConvId) return;
    let alive = true;
    async function fetchMessages() {
      await Promise.resolve();
      if (!alive) return;
      setLoadingMsgs(true);
      setAuditOpen(false);
      isNearBottomRef.current = true;
      setShowScrollBottom(false);

      if (adminChatClient.socket?.connected) {
        adminChatClient.socket.emit("conversation:join", { conversationId: activeConvId });
      }

      try {
        const res = await adminChatClient.getMessages(activeConvId, { limit: 80 });
        if (!alive) return;
        const items = res.items || [];
        setConvMessagesById((prev) => ({ ...prev, [Number(activeConvId)]: items }));
        if (isManager && items.length > 0) {
          const maxPublicSeq = items
            .filter((m) => m.visibility === "PUBLIC")
            .reduce((mx, x) => Math.max(mx, Number(x.sequence || 0)), 0);
          if (maxPublicSeq > 0) {
            adminChatClient.markDelivered(activeConvId, maxPublicSeq).catch(() => {});
            adminChatClient.markRead(activeConvId, maxPublicSeq).catch(() => {});
            upsertConversation({ id: Number(activeConvId), unreadCount: 0 });
          }
        }
      } catch (err) {
        if (alive) showToast?.(err.message || "Không thể tải tin nhắn.", "error");
      } finally {
        if (alive) setLoadingMsgs(false);
      }
    }
    fetchMessages();

    return () => {
      alive = false;
    };
  }, [activeConvId, isManager, setConvMessagesById, showToast, upsertConversation]);

  useEffect(() => {
    if (isNearBottomRef.current) {
      streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedMessages.length]);

  function handleStreamScroll(e) {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distanceFromBottom <= 80;
    isNearBottomRef.current = near;
    setShowScrollBottom(!near && selectedMessages.length > 0);
  }

  function scrollToBottom() {
    isNearBottomRef.current = true;
    setShowScrollBottom(false);
    streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function handleSelectConversation(cid) {
    isNearBottomRef.current = true;
    setShowScrollBottom(false);
    setActiveConvId(cid);
  }

  async function handleClaim(cid) {
    setBusyAction(true);
    try {
      const updated = await adminChatClient.claimConversation(cid);
      upsertConversation(updated);
      dismissHandoffAlert(cid);
      handleSelectConversation(cid);
      setComposerMode("PUBLIC");
      showToast?.("Đã tiếp nhận khách hàng thành công.", "success");
    } catch (err) {
      showToast?.(err.message || "Không thể tiếp nhận yêu cầu.", "error");
    } finally {
      setBusyAction(false);
    }
  }

  async function handleAiDraft() {
    if (!selectedConv) return;
    setDraftingAi(true);
    try {
      const res = await adminChatClient.generateAiDraft(selectedConv.id);
      if (res?.draftText) {
        setDraftText(res.draftText);
        setComposerMode("PUBLIC");
        showToast?.("Đã tạo gợi ý phản hồi từ AI — kiểm tra trước khi gửi.", "info");
      }
    } catch (err) {
      showToast?.(err.message || "Không thể tạo gợi ý AI lúc này.", "error");
    } finally {
      setDraftingAi(false);
    }
  }

  async function handleReturnToAi() {
    if (!selectedConv) return;
    setBusyAction(true);
    try {
      const updated = await adminChatClient.returnToAi(selectedConv.id);
      upsertConversation(updated);
      showToast?.("Đã chuyển cuộc trò chuyện lại cho Trợ lý AI.", "success");
    } catch (err) {
      showToast?.(err.message || "Không thể trả hội thoại về AI.", "error");
    } finally {
      setBusyAction(false);
    }
  }

  async function handleResolve() {
    if (!selectedConv) return;
    setBusyAction(true);
    try {
      const updated = await adminChatClient.resolveConversation(selectedConv.id);
      upsertConversation(updated);
      showToast?.("Đã đánh dấu hoàn tất hội thoại.", "success");
    } catch (err) {
      showToast?.(err.message || "Không thể đóng hội thoại.", "error");
    } finally {
      setBusyAction(false);
    }
  }

  async function handleLoadAudit() {
    if (!selectedConv) return;
    setAuditOpen((o) => !o);
    if (!auditOpen) {
      try {
        const res = await adminChatClient.getAuditEvents(selectedConv.id);
        setAuditEvents(res.items || []);
      } catch (err) {
        showToast?.(err.message || "Không tải được nhật ký sự kiện.", "error");
      }
    }
  }

  async function handleSendSubmit(e) {
    e.preventDefault();
    if (!selectedConv) return;
    const clean = draftText.trim();
    if (!clean) return;
    setDraftText("");
    isNearBottomRef.current = true;
    setShowScrollBottom(false);

    if (composerMode === "STAFF_NOTE") {
      try {
        const note = await adminChatClient.addStaffNote(selectedConv.id, clean);
        appendConvMessage(selectedConv.id, note);
      } catch (err) {
        showToast?.(err.message || "Không thể lưu ghi chú nội bộ.", "error");
      }
      return;
    }

    const clientMessageId = makeClientMsgId();
    appendConvMessage(selectedConv.id, {
      id: `temp-${clientMessageId}`,
      conversationId: selectedConv.id,
      sequence: Number.MAX_SAFE_INTEGER - Math.floor(Math.random() * 1000),
      senderType: "MANAGER",
      visibility: "PUBLIC",
      content: clean,
      clientMessageId,
      createdAt: new Date().toISOString(),
      localStatus: "sending",
    });

    try {
      const res = await adminChatClient.sendReply(selectedConv.id, {
        content: clean,
        clientMessageId,
      });
      if (res?.message) appendConvMessage(selectedConv.id, res.message);
      if (res?.conversation) upsertConversation(res.conversation);
    } catch (err) {
      setConvMessagesById((prev) => ({
        ...prev,
        [Number(selectedConv.id)]: (prev[Number(selectedConv.id)] || []).map((m) =>
          m.clientMessageId === clientMessageId ? { ...m, localStatus: "failed" } : m,
        ),
      }));
      showToast?.(err.message || "Không thể gửi tin nhắn tới khách hàng.", "error");
    }
  }

  function handleComposerKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      if (isImeComposing(e)) return;
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  // Last outgoing Manager PUBLIC message to display receipt badge
  const lastManagerMsgIdx = (() => {
    for (let i = selectedMessages.length - 1; i >= 0; i--) {
      if (selectedMessages[i].senderType === "MANAGER" && selectedMessages[i].visibility === "PUBLIC") {
        return i;
      }
    }
    return -1;
  })();

  const canSendPublicReply =
    isManager && selectedConv && selectedConv.status === "OPEN" && selectedConv.handlingMode === "HUMAN";
  const selectedModeMeta = selectedConv
    ? getHandlingModeMeta(selectedConv.handlingMode, selectedConv.status)
    : null;
  const hasManagerHeaderButtons =
    isManager &&
    selectedConv &&
    selectedConv.status === "OPEN" &&
    (selectedConv.handlingMode === "WAITING_HUMAN" || selectedConv.handlingMode === "HUMAN");

  return (
    <div className="vps-admin-chat-page vps-admin-chat-page--split">
      <div className="vps-admin-chat-topbar">
        <div className="vps-admin-chat-heading">
          <h1 className="page-title">Trung tâm Tư vấn Khách hàng</h1>
          {isAdmin && (
            <span className="vps-role-hint-pill vps-role-hint-pill--admin">
              <Eye size={12} aria-hidden="true" />
              Giám sát Read-Only
            </span>
          )}
        </div>
        <ChatNavigation />
      </div>

      {/* Urgent Manager 5-min Handoff Alert Strip */}
      {isManager && pendingHandoffAlerts.length > 0 && (
        <div className="vps-urgent-banner" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <div className="vps-urgent-text">
            <strong>
              {waitingCount > 1
                ? `Yêu cầu gặp Quản lý (${waitingCount} khách đang chờ):`
                : "Yêu cầu gặp Quản lý mới:"}
            </strong>{" "}
            {pendingHandoffAlerts[0].requesterName || "Khách hàng"} đang chờ tại{" "}
            <b>{pendingHandoffAlerts[0].accommodationName}</b>
            {pendingHandoffAlerts[0].expiresAt ? (
              <>
                {" · Còn "}
                <span className="vps-urgent-countdown">
                  {formatCountdown(pendingHandoffAlerts[0].expiresAt, nowMs)}
                </span>
              </>
            ) : (
              " (vui lòng tiếp nhận trong 5 phút)"
            )}
          </div>
          <div className="vps-urgent-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setModeFilter("ALL");
                handleSelectConversation(pendingHandoffAlerts[0].conversationId);
              }}
            >
              Xem
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busyAction}
              onClick={() => handleClaim(pendingHandoffAlerts[0].conversationId)}
            >
              Tiếp nhận ngay
            </button>
          </div>
          <button
            type="button"
            className="vps-dismiss-btn"
            aria-label="Ẩn thông báo"
            onClick={() => dismissHandoffAlert(pendingHandoffAlerts[0].conversationId)}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Split Workspace */}
      <div className="vps-chat-workspace">
        {/* Left List Pane */}
        <aside className="vps-chat-sidebar" aria-label="Danh sách cuộc trò chuyện">
          <div className="vps-sidebar-filters">
            <div className="vps-search-box">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                placeholder="Tìm tên khách, email, cơ sở…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Tìm cuộc trò chuyện"
              />
            </div>

            {isAdmin && superviseAccoms.length > 0 && (
              <select
                className="vps-accom-select"
                value={accomFilter}
                onChange={(e) => setAccomFilter(e.target.value)}
                aria-label="Lọc theo cơ sở"
              >
                <option value="">Tất cả cơ sở lưu trú</option>
                {superviseAccoms.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accommodationName || a.name || `Cơ sở #${a.id}`} ({Number(a.conversationCount ?? a.totalConversations ?? 0)})
                  </option>
                ))}
              </select>
            )}

            <div className="vps-filter-pills vps-filter-pills--scroll" role="group" aria-label="Lọc trạng thái">
              {[
                { key: "ALL", label: "Tất cả", title: "Tất cả hội thoại" },
                { key: "WAITING_HUMAN", label: "Chờ", count: waitingCount, title: "Đang chờ Quản lý tiếp nhận" },
                { key: "HUMAN", label: "Đang chat", title: "Quản lý đang hỗ trợ trực tiếp" },
                { key: "AI", label: "AI", title: "Trợ lý AI đang hỗ trợ" },
                { key: "RESOLVED", label: "Đã đóng", title: "Hội thoại đã hoàn tất" },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  title={p.title}
                  className={`vps-filter-pill ${modeFilter === p.key ? "active" : ""} ${
                    p.key === "WAITING_HUMAN" && waitingCount > 0 ? "has-waiting" : ""
                  }`}
                  onClick={() => setModeFilter(p.key)}
                >
                  <span>{p.label}</span>
                  {p.count > 0 && <span className="vps-pill-count">{p.count}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="vps-thread-list">
            {filteredConversations.length === 0 ? (
              <div className="vps-empty-pane">Chưa có hội thoại nào khớp bộ lọc.</div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = Number(c.id) === Number(activeConvId);
                const modeMeta = getHandlingModeMeta(c.handlingMode, c.status);
                const unreadNum = Number(c.unreadCount || 0);
                const hasUnread = unreadNum > 0 && !isSelected;
                const timeLabel = formatSidebarTime(c.lastMessageAt || c.updatedAt || c.createdAt);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`vps-thread-item ${isSelected ? "active" : ""} ${
                      c.handlingMode === "WAITING_HUMAN" && c.status === "OPEN" ? "waiting" : ""
                    } ${hasUnread ? "is-unread" : ""}`}
                    onClick={() => handleSelectConversation(c.id)}
                  >
                    <div className={`vps-thread-avatar vps-thread-avatar--${modeMeta.tone}`} aria-hidden="true">
                      {getInitials(c.customerName, "KH")}
                    </div>
                    <div className="vps-thread-content">
                      <div className="vps-thread-item-head">
                        <strong className="vps-ellipsis">{c.customerName || "Khách hàng"}</strong>
                        {timeLabel && <span className="vps-thread-time">{timeLabel}</span>}
                      </div>
                      <div className="vps-thread-item-sub">
                        <span className="vps-thread-sub-left" title={c.accommodationName}>
                          <Building2 size={12} aria-hidden="true" />
                          <span className="vps-ellipsis">{c.accommodationName}</span>
                        </span>
                        <span className="vps-thread-sub-badges">
                          {hasUnread && (
                            <span className="vps-unread-dot" aria-label={`${unreadNum} tin chưa đọc`}>
                              {unreadNum}
                            </span>
                          )}
                          <span className={`vps-mode-chip vps-mode-chip--${modeMeta.tone}`}>
                            {c.handlingMode === "WAITING_HUMAN" && c.status === "OPEN"
                              ? `Chờ ${formatCountdown(c.managerWaitExpiresAt, nowMs)}`
                              : modeMeta.shortLabel}
                          </span>
                        </span>
                      </div>
                      <div className="vps-thread-item-preview">{c.lastMessagePreview || "…"}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Conversation Detail */}
        <section className="vps-chat-main">
          {!selectedConv ? (
            <div className="vps-empty-pane">Chọn một cuộc trò chuyện bên trái để xem chi tiết.</div>
          ) : (
            <>
              <header className="vps-main-header">
                <div className="vps-main-identity">
                  <div
                    className={`vps-thread-avatar vps-main-avatar vps-thread-avatar--${selectedModeMeta.tone}`}
                    aria-hidden="true"
                  >
                    {getInitials(selectedConv.customerName, "KH")}
                  </div>
                  <div className="vps-main-identity-text">
                    <div className="vps-main-title-row">
                      <h2 className="vps-ellipsis">{selectedConv.customerName || "Khách hàng"}</h2>
                    </div>
                    <div
                      className="vps-main-meta"
                      title={[
                        selectedConv.accommodationName,
                        selectedConv.customerEmail,
                        selectedConv.assignedManagerName ? `Phụ trách: ${selectedConv.assignedManagerName}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    >
                      <span>{selectedConv.accommodationName}</span>
                      {selectedConv.customerEmail && <span> · {selectedConv.customerEmail}</span>}
                      {selectedConv.assignedManagerName && (
                        <span> · Phụ trách: {selectedConv.assignedManagerName}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="vps-main-actions">
                  {isManager && selectedConv.handlingMode === "WAITING_HUMAN" && selectedConv.status === "OPEN" && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busyAction}
                      onClick={() => handleClaim(selectedConv.id)}
                    >
                      <UserCheck size={15} aria-hidden="true" />
                      <span>Tiếp nhận ngay ({formatCountdown(selectedConv.managerWaitExpiresAt, nowMs)})</span>
                    </button>
                  )}

                  {isManager && selectedConv.handlingMode === "HUMAN" && selectedConv.status === "OPEN" && (
                    <>
                      <button
                        type="button"
                        className="vps-btn-outline"
                        disabled={busyAction}
                        onClick={handleReturnToAi}
                      >
                        <RotateCcw size={14} aria-hidden="true" />
                        <span>Trả lại AI</span>
                      </button>
                      <button
                        type="button"
                        className="vps-btn-success"
                        disabled={busyAction}
                        onClick={handleResolve}
                      >
                        <CheckCircle2 size={14} aria-hidden="true" />
                        <span>Hoàn tất</span>
                      </button>
                    </>
                  )}

                  {hasManagerHeaderButtons && <span className="vps-action-divider" aria-hidden="true" />}

                  <button
                    type="button"
                    className={`vps-btn-icon ${auditOpen ? "is-open" : ""}`}
                    aria-label="Nhật ký sự kiện"
                    aria-expanded={auditOpen}
                    title="Nhật ký sự kiện hội thoại"
                    onClick={handleLoadAudit}
                  >
                    <History size={15} aria-hidden="true" />
                  </button>
                </div>
              </header>

              {isAdmin && (
                <div className="vps-supervise-bar">
                  <Eye size={14} aria-hidden="true" />
                  <span>
                    Chế độ Giám sát Admin (Read-Only): Không gửi tin trực tiếp ra khách hàng và không làm
                    lệch trạng thái Đã nhận / Đã xem phía Quản lý.
                  </span>
                </div>
              )}

              {auditOpen && (
                <div className="vps-audit-drawer">
                  <div className="vps-audit-head">
                    <strong>Nhật ký sự kiện hội thoại</strong>
                    <button type="button" className="vps-audit-close" onClick={() => setAuditOpen(false)}>
                      Đóng
                    </button>
                  </div>
                  <div className="vps-audit-list">
                    {auditEvents.map((ev) => (
                      <div key={ev.id} className="vps-audit-row">
                        <span>
                          <b>{ev.eventType}</b> · {ev.actorKey}
                        </span>
                        <small>{formatFullDateTime(ev.createdAt)}</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="vps-stream-shell">
                <div className="vps-main-stream" ref={streamRef} onScroll={handleStreamScroll}>
                  {loadingMsgs && selectedMessages.length === 0 ? (
                    <div className="vps-empty-pane">
                      <Loader2 size={20} className="vps-adm-spin" /> Đang tải lịch sử hội thoại…
                    </div>
                  ) : (
                    groupChatMessages(selectedMessages, getConvMessageSenderKey).map((entry) => {
                      if (entry.type === "SYSTEM") {
                        return (
                          <Fragment key={entry.key}>
                            {entry.showDaySep && (
                              <div className="vps-adm-day-sep" role="separator">
                                <span>{getDaySeparatorLabel(entry.msg.createdAt)}</span>
                              </div>
                            )}
                            <div className="vps-adm-system">
                              <span>{entry.msg.content}</span>
                            </div>
                          </Fragment>
                        );
                      }

                      const firstMsg = entry.firstMsg;
                      const lastMsg = entry.lastMsg;
                      const isStaffNote = firstMsg.visibility === "STAFF";
                      const isManagerMsg = firstMsg.senderType === "MANAGER";
                      const isCustomerMsg = firstMsg.senderType === "CUSTOMER" || firstMsg.senderType === "GUEST";
                      const isAiMsg = !isStaffNote && !isManagerMsg && !isCustomerMsg;

                      const showReceipt = !isStaffNote && isManagerMsg && entry.lastIndex === lastManagerMsgIdx;
                      const receipt = showReceipt
                        ? getAdminReceiptMeta(lastMsg, selectedConv.counterpartyDelivery, "Khách hàng")
                        : null;

                      return (
                        <Fragment key={entry.key}>
                          {entry.showDaySep && (
                            <div className="vps-adm-day-sep" role="separator">
                              <span>{getDaySeparatorLabel(firstMsg.createdAt)}</span>
                            </div>
                          )}

                          <div
                            className={`vps-adm-msg ${isManagerMsg ? "out" : isCustomerMsg ? "in" : "bot"} ${
                              isStaffNote ? "staff-note" : ""
                            }`}
                          >
                            <div className="vps-adm-msg-meta">
                              {isStaffNote ? (
                                <span className="vps-adm-note-badge">
                                  <Lock size={10} aria-hidden="true" />
                                  Ghi chú nội bộ · Khách không thấy
                                </span>
                              ) : isAiMsg ? (
                                <span className="vps-adm-ai-badge">
                                  <Sparkles size={10} aria-hidden="true" />
                                  Trợ lý AI
                                </span>
                              ) : (
                                <strong>
                                  {isManagerMsg ? "Quản lý cơ sở" : selectedConv.customerName || "Khách hàng"}
                                </strong>
                              )}
                              <span>{formatShortClock(firstMsg.createdAt)}</span>
                            </div>
                            <div className="vps-adm-msg-bubble">
                              {entry.items.map((item, itemIdx) => (
                                <div
                                  key={item.id || item.clientMessageId || itemIdx}
                                  className="vps-adm-msg-part"
                                  title={formatFullDateTime(item.createdAt)}
                                >
                                  {item.content && <div className="vps-adm-msg-text">{item.content}</div>}
                                  {renderStaffCardSummary(item)}
                                </div>
                              ))}
                            </div>
                            {receipt && (
                              <div
                                className={`vps-adm-receipt vps-adm-receipt--${receipt.state.toLowerCase()}`}
                                title={receipt.tooltip}
                              >
                                {receipt.state === "READ" || receipt.state === "DELIVERED" ? (
                                  <CheckCheck size={12} aria-hidden="true" />
                                ) : (
                                  <Check size={12} aria-hidden="true" />
                                )}
                                <span>{receipt.label}</span>
                              </div>
                            )}
                          </div>
                        </Fragment>
                      );
                    })
                  )}

                  {customerTypingByConv[Number(selectedConv.id)] && (
                    <div className="vps-adm-typing">
                      {customerTypingByConv[Number(selectedConv.id)]} đang soạn tin nhắn…
                    </div>
                  )}

                  <div ref={streamEndRef} />
                </div>

                {showScrollBottom && (
                  <button
                    type="button"
                    className="vps-scroll-bottom-btn"
                    onClick={scrollToBottom}
                  >
                    <ArrowDown size={14} aria-hidden="true" />
                    <span>Tin mới nhất</span>
                  </button>
                )}
              </div>

              {/* Unified Composer Card */}
              <form className="vps-adm-composer-wrap" onSubmit={handleSendSubmit}>
                <div className={`vps-composer-card ${composerMode === "STAFF_NOTE" ? "is-note-mode" : ""}`}>
                  <div className="vps-composer-toolbar">
                    <div className="vps-composer-modes">
                      {isManager && (
                        <button
                          type="button"
                          className={`vps-mode-switch ${composerMode === "PUBLIC" ? "active" : ""}`}
                          onClick={() => setComposerMode("PUBLIC")}
                        >
                          <UserCheck size={13} aria-hidden="true" />
                          <span>Trả lời khách hàng</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className={`vps-mode-switch ${composerMode === "STAFF_NOTE" ? "active note" : ""}`}
                        onClick={() => setComposerMode("STAFF_NOTE")}
                      >
                        <StickyNote size={13} aria-hidden="true" />
                        <span>Ghi chú nội bộ</span>
                      </button>
                    </div>

                    {isManager && canSendPublicReply && composerMode === "PUBLIC" && (
                      <button
                        type="button"
                        className="vps-ai-draft-btn"
                        disabled={busyAction || draftingAi}
                        onClick={handleAiDraft}
                        title="Nhờ AI gợi ý câu trả lời dựa trên lịch sử hội thoại"
                      >
                        {draftingAi ? (
                          <Loader2 size={13} className="vps-adm-spin" aria-hidden="true" />
                        ) : (
                          <Sparkles size={13} aria-hidden="true" />
                        )}
                        <span>{draftingAi ? "Đang gợi ý…" : "Gợi ý AI"}</span>
                      </button>
                    )}
                  </div>

                  <div className="vps-composer-row">
                    <textarea
                      rows={1}
                      className="vps-adm-textarea"
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      disabled={composerMode === "PUBLIC" && !canSendPublicReply}
                      placeholder={
                        composerMode === "STAFF_NOTE"
                          ? "Nhập ghi chú nội bộ cho Admin & Quản lý (khách hàng không thấy)…"
                          : canSendPublicReply
                            ? "Nhập tin nhắn gửi tới khách hàng… (Enter gửi, Shift+Enter xuống dòng)"
                            : selectedConv.handlingMode === "WAITING_HUMAN"
                              ? "Nhấn 'Tiếp nhận ngay' ở góc trên để bắt đầu trả lời khách hàng."
                              : "Hội thoại hiện đang ở chế độ AI hoặc đã đóng — chỉ có thể thêm ghi chú nội bộ."
                      }
                      aria-label={
                        composerMode === "STAFF_NOTE"
                          ? "Nội dung ghi chú nội bộ"
                          : "Nội dung phản hồi khách hàng"
                      }
                    />
                    <button
                      type="submit"
                      className={`btn ${
                        composerMode === "STAFF_NOTE" ? "vps-send-btn--note" : "btn-primary"
                      } vps-send-btn`}
                      disabled={!draftText.trim() || (composerMode === "PUBLIC" && !canSendPublicReply)}
                    >
                      {composerMode === "STAFF_NOTE" ? (
                        <Lock size={14} aria-hidden="true" />
                      ) : (
                        <Send size={15} aria-hidden="true" />
                      )}
                      <span>{composerMode === "STAFF_NOTE" ? "Lưu ghi chú" : "Gửi"}</span>
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
