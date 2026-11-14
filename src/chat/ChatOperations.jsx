import { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { adminChatClient } from "./ChatClient";
import ChatNavigation from "./ChatNavigation";
import { useAdminChat } from "./ChatContext";
import {
  formatCountdown,
  formatFullDateTime,
  formatShortClock,
  getAdminReceiptMeta,
  isImeComposing,
} from "./chatUtils";
import { makeClientMsgId } from "./InternalChatStore";
import "./chat.css";

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
  } = useAdminChat();

  const [modeFilter, setModeFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [accomFilter, setAccomFilter] = useState("");
  const [superviseAccoms, setSuperviseAccoms] = useState([]);
  const [composerMode, setComposerMode] = useState("PUBLIC"); // 'PUBLIC' | 'STAFF_NOTE'
  const [draftText, setDraftText] = useState("");
  const [busyAction, setBusyAction] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditEvents, setAuditEvents] = useState([]);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const streamEndRef = useRef(null);

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

  // Refetch filtered list on filter change
  useEffect(() => {
    refreshConversations({
      accommodationId: accomFilter || null,
      handlingMode: modeFilter === "RESOLVED" ? "ALL" : modeFilter,
      status: modeFilter === "RESOLVED" ? "RESOLVED" : "ALL",
    }).catch(() => {});
  }, [accomFilter, modeFilter, refreshConversations]);

  // 1-second timer when any waiting handoff exists
  useEffect(() => {
    if (!conversations.some((c) => c.handlingMode === "WAITING_HUMAN")) return undefined;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return conversations.filter((c) => {
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
  }, [conversations, accomFilter, modeFilter, searchTerm]);

  const selectedConv = useMemo(
    () => conversations.find((c) => Number(c.id) === Number(activeConvId)) || null,
    [conversations, activeConvId],
  );

  const selectedMessages = activeConvId ? convMessagesById[Number(activeConvId)] || [] : [];

  // Select first conversation by default if none active
  useEffect(() => {
    if (!activeConvId && filteredConversations.length > 0) {
      setActiveConvId(filteredConversations[0].id);
    }
  }, [activeConvId, filteredConversations, setActiveConvId]);

  // Load selected conversation messages & join room & mark read (Manager ONLY!)
  useEffect(() => {
    if (!activeConvId) return;
    let alive = true;
    async function fetchMessages() {
      await Promise.resolve();
      if (!alive) return;
      setLoadingMsgs(true);
      setAuditOpen(false);

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
  }, [activeConvId, isManager, setConvMessagesById, showToast]);

  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedMessages.length]);

  async function handleClaim(cid) {
    setBusyAction(true);
    try {
      const updated = await adminChatClient.claimConversation(cid);
      upsertConversation(updated);
      dismissHandoffAlert(cid);
      setActiveConvId(cid);
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
    setBusyAction(true);
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
      setBusyAction(false);
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

  return (
    <div className="vps-admin-chat-page">
      <div className="vps-admin-chat-topbar">
        <div>
          <h1 className="page-title" style={{ marginBottom: "4px" }}>
            Trung tâm Tư vấn Khách hàng
          </h1>
          <p className="page-subtitle">
            {isAdmin
              ? "Chế độ Super Admin Giám sát (Read-Only): theo dõi chất lượng phản hồi các cơ sở & ghi chú nội bộ."
              : "Tiếp nhận yêu cầu gặp Quản lý trong 5 phút và hỗ trợ trực tiếp khách lưu trú tại cơ sở của bạn."}
          </p>
        </div>
        <ChatNavigation />
      </div>

      {/* Urgent Manager 5-min Handoff Alert Strip */}
      {isManager && pendingHandoffAlerts.length > 0 && (
        <div className="vps-urgent-banner" role="alert">
          <AlertTriangle size={18} />
          <div className="vps-urgent-text">
            <strong>Yêu cầu gặp Quản lý mới:</strong>{" "}
            {pendingHandoffAlerts[0].requesterName || "Khách hàng"} đang chờ tại{" "}
            <b>{pendingHandoffAlerts[0].accommodationName}</b> (vui lòng tiếp nhận trong 5 phút).
          </div>
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={busyAction}
            onClick={() => handleClaim(pendingHandoffAlerts[0].conversationId)}
          >
            Tiếp nhận ngay
          </button>
          <button
            type="button"
            className="vps-dismiss-btn"
            aria-label="Ẩn thông báo"
            onClick={() => dismissHandoffAlert(pendingHandoffAlerts[0].conversationId)}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Split Workspace */}
      <div className="vps-chat-workspace">
        {/* Left List Pane */}
        <aside className="vps-chat-sidebar">
          <div className="vps-sidebar-filters">
            <div className="vps-search-box">
              <Search size={15} />
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
                    {a.name} ({a.totalConversations})
                  </option>
                ))}
              </select>
            )}

            <div className="vps-filter-pills">
              {[
                { key: "ALL", label: "Tất cả" },
                { key: "WAITING_HUMAN", label: "Chờ tiếp nhận" },
                { key: "HUMAN", label: "Đang xử lý" },
                { key: "AI", label: "AI hỗ trợ" },
                { key: "RESOLVED", label: "Đã đóng" },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`vps-filter-pill ${modeFilter === p.key ? "active" : ""}`}
                  onClick={() => setModeFilter(p.key)}
                >
                  {p.label}
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
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`vps-thread-item ${isSelected ? "active" : ""} ${
                      c.handlingMode === "WAITING_HUMAN" ? "waiting" : ""
                    }`}
                    onClick={() => setActiveConvId(c.id)}
                  >
                    <div className="vps-thread-item-head">
                      <strong>{c.customerName || "Khách hàng"}</strong>
                      <span className={`vps-mode-chip vps-mode-chip--${c.handlingMode.toLowerCase()}`}>
                        {c.handlingMode === "WAITING_HUMAN"
                          ? `Chờ ${formatCountdown(c.managerWaitExpiresAt, nowMs)}`
                          : c.handlingMode === "HUMAN"
                            ? "Quản lý"
                            : c.status === "RESOLVED"
                              ? "Đã đóng"
                              : "AI"}
                      </span>
                    </div>
                    <div className="vps-thread-item-sub">
                      <Building2 size={12} />
                      <span>{c.accommodationName}</span>
                    </div>
                    <div className="vps-thread-item-preview">{c.lastMessagePreview || "…"}</div>
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
                <div>
                  <div className="vps-main-title-row">
                    <h2>{selectedConv.customerName || "Khách hàng"}</h2>
                    <span className={`vps-mode-chip vps-mode-chip--${selectedConv.handlingMode.toLowerCase()}`}>
                      {selectedConv.handlingMode}
                    </span>
                    {selectedConv.status === "RESOLVED" && (
                      <span className="vps-mode-chip vps-mode-chip--resolved">RESOLVED</span>
                    )}
                  </div>
                  <div className="vps-main-meta">
                    <span>{selectedConv.accommodationName}</span>
                    {selectedConv.customerEmail && <span> · {selectedConv.customerEmail}</span>}
                    {selectedConv.assignedManagerName && (
                      <span> · Phụ trách: {selectedConv.assignedManagerName}</span>
                    )}
                  </div>
                </div>

                <div className="vps-main-actions">
                  {isManager && selectedConv.handlingMode === "WAITING_HUMAN" && selectedConv.status === "OPEN" && (
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      disabled={busyAction}
                      onClick={() => handleClaim(selectedConv.id)}
                    >
                      <UserCheck size={15} />
                      <span>Tiếp nhận ngay ({formatCountdown(selectedConv.managerWaitExpiresAt, nowMs)})</span>
                    </button>
                  )}

                  {isManager && selectedConv.handlingMode === "HUMAN" && selectedConv.status === "OPEN" && (
                    <>
                      <button
                        type="button"
                        className="vps-btn-outline"
                        disabled={busyAction}
                        onClick={handleAiDraft}
                      >
                        <Sparkles size={14} />
                        <span>Gợi ý AI</span>
                      </button>
                      <button
                        type="button"
                        className="vps-btn-outline"
                        disabled={busyAction}
                        onClick={handleReturnToAi}
                      >
                        <RotateCcw size={14} />
                        <span>Trả lại AI</span>
                      </button>
                      <button
                        type="button"
                        className="vps-btn-success"
                        disabled={busyAction}
                        onClick={handleResolve}
                      >
                        <CheckCircle2 size={14} />
                        <span>Hoàn tất</span>
                      </button>
                    </>
                  )}

                  <button type="button" className="vps-btn-outline" onClick={handleLoadAudit}>
                    <History size={14} />
                    <span>Nhật ký</span>
                  </button>
                </div>
              </header>

              {isAdmin && (
                <div className="vps-supervise-bar">
                  <Eye size={14} />
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
                    <button type="button" onClick={() => setAuditOpen(false)}>
                      Đóng
                    </button>
                  </div>
                  <div className="vps-audit-list">
                    {auditEvents.map((ev) => (
                      <div key={ev.id} className="vps-audit-row">
                        <b>{ev.eventType}</b>
                        <span>{ev.actorKey}</span>
                        <small>{formatFullDateTime(ev.createdAt)}</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="vps-main-stream">
                {loadingMsgs && selectedMessages.length === 0 ? (
                  <div className="vps-empty-pane">
                    <Loader2 size={20} className="vps-adm-spin" /> Đang tải lịch sử hội thoại…
                  </div>
                ) : (
                  selectedMessages.map((msg, idx) => {
                    const isStaffNote = msg.visibility === "STAFF";
                    const isManagerMsg = msg.senderType === "MANAGER";
                    const isCustomerMsg = msg.senderType === "CUSTOMER" || msg.senderType === "GUEST";
                    const isSystem = msg.senderType === "SYSTEM";

                    if (isSystem) {
                      return (
                        <div key={msg.id || idx} className="vps-adm-system">
                          <span>{msg.content}</span>
                        </div>
                      );
                    }

                    const showReceipt = !isStaffNote && isManagerMsg && idx === lastManagerMsgIdx;
                    const receipt = showReceipt
                      ? getAdminReceiptMeta(msg, selectedConv.counterpartyDelivery, "Khách hàng")
                      : null;

                    return (
                      <div
                        key={msg.id || msg.clientMessageId || idx}
                        className={`vps-adm-msg ${isManagerMsg ? "out" : isCustomerMsg ? "in" : "bot"} ${
                          isStaffNote ? "staff-note" : ""
                        }`}
                      >
                        <div className="vps-adm-msg-meta">
                          <strong>
                            {isStaffNote
                              ? "Ghi chú nội bộ (Khách không thấy)"
                              : isManagerMsg
                                ? "Quản lý cơ sở"
                                : isCustomerMsg
                                  ? selectedConv.customerName || "Khách hàng"
                                  : "Trợ lý AI"}
                          </strong>
                          <span>{formatShortClock(msg.createdAt)}</span>
                        </div>
                        <div className="vps-adm-msg-bubble">
                          <div>{msg.content}</div>
                          {renderStaffCardSummary(msg)}
                        </div>
                        {receipt && (
                          <div
                            className={`vps-adm-receipt vps-adm-receipt--${receipt.state.toLowerCase()}`}
                            title={receipt.tooltip}
                          >
                            {receipt.state === "READ" || receipt.state === "DELIVERED" ? (
                              <CheckCheck size={12} />
                            ) : (
                              <Check size={12} />
                            )}
                            <span>{receipt.label}</span>
                          </div>
                        )}
                      </div>
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

              {/* Composer */}
              <form className="vps-adm-composer-wrap" onSubmit={handleSendSubmit}>
                <div className="vps-composer-modes">
                  {isManager && (
                    <button
                      type="button"
                      className={`vps-mode-switch ${composerMode === "PUBLIC" ? "active" : ""}`}
                      onClick={() => setComposerMode("PUBLIC")}
                    >
                      <UserCheck size={13} /> Trả lời khách hàng
                    </button>
                  )}
                  <button
                    type="button"
                    className={`vps-mode-switch ${composerMode === "STAFF_NOTE" ? "active note" : ""}`}
                    onClick={() => setComposerMode("STAFF_NOTE")}
                  >
                    <StickyNote size={13} /> Ghi chú nội bộ (STAFF)
                  </button>
                </div>

                <div className="vps-composer-row">
                  <textarea
                    rows={2}
                    className="vps-adm-textarea"
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    disabled={composerMode === "PUBLIC" && !canSendPublicReply}
                    placeholder={
                      composerMode === "STAFF_NOTE"
                        ? "Nhập ghi chú nội bộ cho Admin & Quản lý (khách hàng không thấy)…"
                        : canSendPublicReply
                          ? "Nhập tin nhắn gửi tới khách hàng… (Enter để gửi)"
                          : selectedConv.handlingMode === "WAITING_HUMAN"
                            ? "Nhấn 'Tiếp nhận ngay' ở góc trên để bắt đầu trả lời khách hàng."
                            : "Hội thoại hiện đang ở chế độ AI hoặc đã đóng — chỉ có thể thêm ghi chú nội bộ."
                    }
                    aria-label="Nội dung phản hồi"
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!draftText.trim() || (composerMode === "PUBLIC" && !canSendPublicReply)}
                  >
                    <Send size={16} />
                    <span>Gửi</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
