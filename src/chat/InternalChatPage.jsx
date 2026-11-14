import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  Search,
  Edit3,
  Archive,
  Check,
  CheckCheck,
  Building2,
  ShieldCheck,
  MessageSquarePlus,
  Loader2,
} from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { adminChatClient } from "./ChatClient";
import ChatNavigation from "./ChatNavigation";
import { useAdminChat } from "./ChatContext";
import { formatShortClock, getAdminReceiptMeta, isImeComposing } from "./chatUtils";
import {
  fetchInternalDirectory,
  loadThreadHistory,
  makeClientMsgId,
  startOrOpenPeerThread,
} from "./InternalChatStore";
import "./chat.css";

export default function InternalChatPage() {
  const { showToast } = useAdmin() || {};
  const {
    chatMe,
    internalThreads,
    setInternalThreads,
    upsertInternalThread,
    internalMessagesById,
    setInternalMessagesById,
    appendInternalMessage,
    activeThreadId,
    setActiveThreadId,
  } = useAdminChat();

  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [draftText, setDraftText] = useState("");
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [customNameInput, setCustomNameInput] = useState("");

  const streamEndRef = useRef(null);

  useEffect(() => {
    fetchInternalDirectory()
      .then(({ contacts: cList, threads: tList }) => {
        setContacts(cList);
        if (tList.length > 0) setInternalThreads(tList);
      })
      .catch(() => {});
  }, [setInternalThreads]);

  const selectedThread = useMemo(
    () => internalThreads.find((t) => Number(t.id) === Number(activeThreadId)) || null,
    [internalThreads, activeThreadId],
  );

  useEffect(() => {
    if (!activeThreadId && internalThreads.length > 0) {
      setActiveThreadId(internalThreads[0].id);
    }
  }, [activeThreadId, internalThreads, setActiveThreadId]);

  useEffect(() => {
    if (!activeThreadId) return;
    let alive = true;
    async function load() {
      await Promise.resolve();
      if (!alive) return;
      setLoadingMsgs(true);
      setRenaming(false);

      if (adminChatClient.socket?.connected) {
        adminChatClient.socket.emit("internal:join", { threadId: activeThreadId });
      }

      try {
        const items = await loadThreadHistory(activeThreadId);
        if (!alive) return;
        setInternalMessagesById((prev) => ({ ...prev, [Number(activeThreadId)]: items }));
        const maxSeq = items.reduce((mx, m) => Math.max(mx, Number(m.sequence || 0)), 0);
        if (maxSeq > 0) {
          adminChatClient.markInternalDelivered(activeThreadId, maxSeq).catch(() => {});
          adminChatClient.markInternalRead(activeThreadId, maxSeq).catch(() => {});
          setInternalThreads((prev) =>
            prev.map((t) => (Number(t.id) === Number(activeThreadId) ? { ...t, unreadCount: 0 } : t)),
          );
        }
      } catch (err) {
        if (alive) showToast?.(err.message || "Không tải được tin nhắn nội bộ.", "error");
      } finally {
        if (alive) setLoadingMsgs(false);
      }
    }
    load();

    return () => {
      alive = false;
    };
  }, [activeThreadId, setInternalMessagesById, setInternalThreads, showToast]);

  const selectedMessages = activeThreadId ? internalMessagesById[Number(activeThreadId)] || [] : [];

  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedMessages.length]);

  async function handleOpenContact(contact) {
    try {
      const thread = await startOrOpenPeerThread(contact.userId);
      if (thread) {
        upsertInternalThread(thread);
        setActiveThreadId(thread.id);
      }
    } catch (err) {
      showToast?.(err.message || "Không thể mở cuộc trò chuyện nội bộ.", "error");
    }
  }

  async function handleSaveRename(e) {
    e.preventDefault();
    if (!selectedThread) return;
    try {
      const res = await adminChatClient.renameInternalThread(selectedThread.id, customNameInput);
      upsertInternalThread({
        id: selectedThread.id,
        peerName: res.customName || selectedThread.defaultPeerName,
        customPeerName: res.customName || null,
      });
      setRenaming(false);
      showToast?.("Đã cập nhật tên gợi nhớ.", "success");
    } catch (err) {
      showToast?.(err.message || "Không thể đổi tên gợi nhớ.", "error");
    }
  }

  async function handleSendSubmit(e) {
    e.preventDefault();
    if (!selectedThread || selectedThread.isArchived) return;
    const clean = draftText.trim();
    if (!clean) return;
    setDraftText("");

    const clientMessageId = makeClientMsgId();
    appendInternalMessage(selectedThread.id, {
      id: `temp-${clientMessageId}`,
      threadId: selectedThread.id,
      sequence: Number.MAX_SAFE_INTEGER - Math.floor(Math.random() * 1000),
      senderUserId: chatMe?.userId,
      senderName: chatMe?.displayName || "Tôi",
      clientMessageId,
      content: clean,
      createdAt: new Date().toISOString(),
      localStatus: "sending",
    });

    try {
      const res = await adminChatClient.sendInternalMessage(selectedThread.id, {
        content: clean,
        clientMessageId,
      });
      if (res?.message) appendInternalMessage(selectedThread.id, res.message);
    } catch (err) {
      setInternalMessagesById((prev) => ({
        ...prev,
        [Number(selectedThread.id)]: (prev[Number(selectedThread.id)] || []).map((m) =>
          m.clientMessageId === clientMessageId ? { ...m, localStatus: "failed" } : m,
        ),
      }));
      showToast?.(err.message || "Không thể gửi tin nhắn nội bộ.", "error");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      if (isImeComposing(e)) return;
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  const filteredContacts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return contacts.filter((c) => {
      if (!q) return true;
      return (
        String(c.fullName || "").toLowerCase().includes(q) ||
        String(c.accommodationName || "").toLowerCase().includes(q) ||
        String(c.email || "").toLowerCase().includes(q)
      );
    });
  }, [contacts, searchTerm]);

  const myUserIdLower = String(chatMe?.userId || "").toLowerCase();
  const lastOutgoingIdx = (() => {
    for (let i = selectedMessages.length - 1; i >= 0; i--) {
      if (String(selectedMessages[i].senderUserId || "").toLowerCase() === myUserIdLower) {
        return i;
      }
    }
    return -1;
  })();

  return (
    <div className="vps-admin-chat-page">
      <div className="vps-admin-chat-topbar">
        <div>
          <h1 className="page-title" style={{ marginBottom: "4px" }}>
            Chat nội bộ VietPeace Stay
          </h1>
          <p className="page-subtitle">
            Trao đổi trực tiếp Admin ↔ Quản lý và giữa các Quản lý cơ sở với trạng thái Đã gửi / Đã nhận / Đã xem theo thời gian thực.
          </p>
        </div>
        <ChatNavigation />
      </div>

      <div className="vps-chat-workspace">
        {/* Left: Active Threads + Contacts */}
        <aside className="vps-chat-sidebar">
          <div className="vps-sidebar-filters">
            <div className="vps-search-box">
              <Search size={15} />
              <input
                type="search"
                placeholder="Tìm Admin, Quản lý hoặc cơ sở…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Tìm liên hệ nội bộ"
              />
            </div>
          </div>

          <div className="vps-thread-list">
            <div className="vps-list-section-label">Cuộc trò chuyện gần đây</div>
            {internalThreads.length === 0 ? (
              <div className="vps-empty-note-sm">Chưa có luồng chat nội bộ nào. Chọn liên hệ bên dưới để bắt đầu.</div>
            ) : (
              internalThreads.map((t) => {
                const isSelected = Number(t.id) === Number(activeThreadId);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`vps-thread-item ${isSelected ? "active" : ""}`}
                    onClick={() => setActiveThreadId(t.id)}
                  >
                    <div className="vps-thread-item-head">
                      <strong>{t.peerName}</strong>
                      {t.unreadCount > 0 && <span className="vps-unread-dot">{t.unreadCount}</span>}
                    </div>
                    <div className="vps-thread-item-sub">
                      {t.peerRole === "ADMIN" ? <ShieldCheck size={12} /> : <Building2 size={12} />}
                      <span>
                        {t.threadType === "ADMIN_MANAGER" && t.peerRole === "ADMIN"
                          ? "Ban quản trị VietPeace Stay"
                          : t.accommodationName || "Quản lý cơ sở"}
                      </span>
                      {t.isArchived && <Archive size={11} title="Đã lưu trữ Read-Only" />}
                    </div>
                    <div className="vps-thread-item-preview">{t.lastMessagePreview || "Bắt đầu trao đổi…"}</div>
                  </button>
                );
              })
            )}

            <div className="vps-list-section-label" style={{ marginTop: "8px" }}>
              Danh bạ nhân sự đang hoạt động
            </div>
            {filteredContacts.map((c) => (
              <button
                key={c.userId}
                type="button"
                className="vps-contact-item"
                onClick={() => handleOpenContact(c)}
              >
                <div>
                  <strong>{c.fullName}</strong>
                  <small>{c.accommodationName}</small>
                </div>
                <MessageSquarePlus size={15} />
              </button>
            ))}
          </div>
        </aside>

        {/* Right: Active Thread Conversation */}
        <section className="vps-chat-main">
          {!selectedThread ? (
            <div className="vps-empty-pane">Chọn một đồng nghiệp bên trái để nhắn tin nội bộ.</div>
          ) : (
            <>
              <header className="vps-main-header">
                <div>
                  <div className="vps-main-title-row">
                    <h2>{selectedThread.peerName}</h2>
                    <span className="vps-mode-chip vps-mode-chip--ai">
                      {selectedThread.threadType === "ADMIN_MANAGER" ? "Admin ↔ Quản lý" : "Quản lý ↔ Quản lý"}
                    </span>
                    {selectedThread.isArchived && (
                      <span className="vps-mode-chip vps-mode-chip--resolved">Lưu trữ Read-Only</span>
                    )}
                  </div>
                  <div className="vps-main-meta">
                    <span>{selectedThread.accommodationName || "Ban quản trị"}</span>
                    {selectedThread.peerEmail && <span> · {selectedThread.peerEmail}</span>}
                  </div>
                </div>

                {!renaming ? (
                  <button
                    type="button"
                    className="vps-btn-outline"
                    onClick={() => {
                      setCustomNameInput(selectedThread.customPeerName || selectedThread.peerName);
                      setRenaming(true);
                    }}
                  >
                    <Edit3 size={14} />
                    <span>Đổi tên gợi nhớ</span>
                  </button>
                ) : (
                  <form className="vps-rename-form" onSubmit={handleSaveRename}>
                    <input
                      type="text"
                      value={customNameInput}
                      onChange={(e) => setCustomNameInput(e.target.value)}
                      placeholder="Nhập tên gợi nhớ…"
                      maxLength={80}
                    />
                    <button type="submit" className="btn-primary btn-sm">
                      Lưu
                    </button>
                    <button type="button" className="vps-btn-outline" onClick={() => setRenaming(false)}>
                      Hủy
                    </button>
                  </form>
                )}
              </header>

              {selectedThread.isArchived && (
                <div className="vps-supervise-bar">
                  <Archive size={14} />
                  <span>
                    Luồng lịch sử thuộc nhiệm kỳ bàn giao trước ({selectedThread.archivedReason || "archived"}) —
                    chỉ xem để bảo toàn tính toàn vẹn dữ liệu.
                  </span>
                </div>
              )}

              <div className="vps-main-stream">
                {loadingMsgs && selectedMessages.length === 0 ? (
                  <div className="vps-empty-pane">
                    <Loader2 size={20} className="vps-adm-spin" /> Đang tải tin nhắn nội bộ…
                  </div>
                ) : (
                  selectedMessages.map((msg, idx) => {
                    const isMine = String(msg.senderUserId || "").toLowerCase() === myUserIdLower;
                    const showReceipt = isMine && idx === lastOutgoingIdx;
                    const receipt = showReceipt
                      ? getAdminReceiptMeta(msg, selectedThread.peerDelivery, selectedThread.peerName)
                      : null;

                    return (
                      <div key={msg.id || msg.clientMessageId || idx} className={`vps-adm-msg ${isMine ? "out" : "in"}`}>
                        <div className="vps-adm-msg-meta">
                          <strong>{isMine ? "Bạn" : msg.senderName || selectedThread.peerName}</strong>
                          <span>{formatShortClock(msg.createdAt)}</span>
                        </div>
                        <div className="vps-adm-msg-bubble">{msg.content}</div>
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
                <div ref={streamEndRef} />
              </div>

              <form className="vps-adm-composer-wrap" onSubmit={handleSendSubmit}>
                <div className="vps-composer-row">
                  <textarea
                    rows={2}
                    className="vps-adm-textarea"
                    disabled={selectedThread.isArchived}
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      selectedThread.isArchived
                        ? "Luồng đã lưu trữ Read-Only sau bàn giao nhiệm kỳ."
                        : `Nhắn tin nội bộ tới ${selectedThread.peerName}… (Enter để gửi)`
                    }
                    aria-label="Nội dung tin nhắn nội bộ"
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={selectedThread.isArchived || !draftText.trim()}
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
