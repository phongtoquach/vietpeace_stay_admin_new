import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
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
  MessageSquare,
  Users,
  Loader2,
  ArrowDown,
} from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { adminChatClient } from "./ChatClient";
import ChatNavigation from "./ChatNavigation";
import { useAdminChat } from "./ChatContext";
import {
  formatFullDateTime,
  formatShortClock,
  formatSidebarTime,
  getAdminReceiptMeta,
  getDaySeparatorLabel,
  getInitials,
  groupChatMessages,
  isImeComposing,
} from "./chatUtils";
import {
  fetchInternalDirectory,
  loadThreadHistory,
  makeClientMsgId,
  startOrOpenPeerThread,
} from "./InternalChatStore";
import "./chat.css";

function getInternalSenderKey(msg) {
  return String(msg?.senderUserId || "").toLowerCase();
}

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
  const [threadSearch, setThreadSearch] = useState("");
  const [directorySearch, setDirectorySearch] = useState("");
  const [leftTab, setLeftTab] = useState("threads"); // 'threads' | 'directory'
  const [draftText, setDraftText] = useState("");
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [customNameInput, setCustomNameInput] = useState("");
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const tabIdPrefix = useId();
  const threadsTabId = `${tabIdPrefix}-threads-tab`;
  const directoryTabId = `${tabIdPrefix}-directory-tab`;
  const threadsTabRef = useRef(null);
  const directoryTabRef = useRef(null);
  const streamEndRef = useRef(null);
  const isNearBottomRef = useRef(true);

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

  const recentThreads = useMemo(
    () =>
      internalThreads.filter((t) => {
        const msgs = internalMessagesById[Number(t.id)];
        return (
          Number(t.lastSequence || 0) > 0 ||
          Boolean(t.lastMessageAt) ||
          Boolean(String(t.lastMessagePreview || "").trim()) ||
          (Array.isArray(msgs) && msgs.length > 0)
        );
      }),
    [internalThreads, internalMessagesById],
  );

  useEffect(() => {
    if (!activeThreadId && recentThreads.length > 0) {
      setActiveThreadId(recentThreads[0].id);
    }
  }, [activeThreadId, recentThreads, setActiveThreadId]);

  useEffect(() => {
    if (!activeThreadId) return;
    let alive = true;
    async function load() {
      await Promise.resolve();
      if (!alive) return;
      setLoadingMsgs(true);
      setRenaming(false);
      isNearBottomRef.current = true;
      setShowScrollBottom(false);

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

  function handleSelectThread(tid) {
    isNearBottomRef.current = true;
    setShowScrollBottom(false);
    setActiveThreadId(tid);
  }

  async function handleOpenContact(contact) {
    try {
      const thread = await startOrOpenPeerThread(contact.userId);
      if (thread) {
        upsertInternalThread(thread);
        handleSelectThread(thread.id);
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
    isNearBottomRef.current = true;
    setShowScrollBottom(false);

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
      if (res?.message) {
        appendInternalMessage(selectedThread.id, res.message);
        upsertInternalThread({
          id: selectedThread.id,
          lastSequence: res.message.sequence,
          lastMessageAt: res.message.createdAt,
          lastMessagePreview: res.message.content,
        });
      }
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

  function handleLeftTabKeyDown(e) {
    let nextTab = null;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      nextTab = leftTab === "threads" ? "directory" : "threads";
    } else if (e.key === "Home") {
      nextTab = "threads";
    } else if (e.key === "End") {
      nextTab = "directory";
    }
    if (!nextTab) return;
    e.preventDefault();
    setLeftTab(nextTab);
    const targetRef = nextTab === "threads" ? threadsTabRef : directoryTabRef;
    targetRef.current?.focus();
  }

  const filteredRecentThreads = useMemo(() => {
    const q = threadSearch.trim().toLowerCase();
    if (!q) return recentThreads;
    return recentThreads.filter(
      (t) =>
        String(t.peerName || "").toLowerCase().includes(q) ||
        String(t.accommodationName || "").toLowerCase().includes(q) ||
        String(t.peerEmail || "").toLowerCase().includes(q) ||
        String(t.lastMessagePreview || "").toLowerCase().includes(q),
    );
  }, [recentThreads, threadSearch]);

  const filteredContacts = useMemo(() => {
    const q = directorySearch.trim().toLowerCase();
    return contacts.filter((c) => {
      if (!q) return true;
      return (
        String(c.fullName || "").toLowerCase().includes(q) ||
        String(c.accommodationName || "").toLowerCase().includes(q) ||
        String(c.email || "").toLowerCase().includes(q)
      );
    });
  }, [contacts, directorySearch]);

  const activePeerUserId = String(selectedThread?.peerUserId || "").toLowerCase();
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
    <div className="vps-admin-chat-page vps-admin-chat-page--split vps-admin-chat-page--internal">
      <div className="vps-admin-chat-topbar">
        <div className="vps-admin-chat-heading">
          <h1 className="page-title">Chat nội bộ VietPeace Stay</h1>
        </div>
        <ChatNavigation />
      </div>

      <div className="vps-chat-workspace vps-chat-workspace--internal">
        {/* Left Sidebar: Combined Conversations & Directory Tabs */}
        <aside className="vps-chat-sidebar vps-internal-sidebar" aria-label="Cuộc trò chuyện và danh bạ nhân sự">
          <div
            className="vps-internal-tablist"
            role="tablist"
            aria-label="Chọn giữa cuộc trò chuyện và danh bạ"
          >
            <button
              ref={threadsTabRef}
              id={threadsTabId}
              type="button"
              role="tab"
              aria-selected={leftTab === "threads"}
              tabIndex={leftTab === "threads" ? 0 : -1}
              className="vps-internal-tab"
              onClick={() => setLeftTab("threads")}
              onKeyDown={handleLeftTabKeyDown}
            >
              <MessageSquare size={15} aria-hidden="true" />
              <span className="vps-ellipsis">Cuộc trò chuyện</span>
              <span className="vps-pane-count">{recentThreads.length}</span>
            </button>
            <button
              ref={directoryTabRef}
              id={directoryTabId}
              type="button"
              role="tab"
              aria-selected={leftTab === "directory"}
              tabIndex={leftTab === "directory" ? 0 : -1}
              className="vps-internal-tab"
              onClick={() => setLeftTab("directory")}
              onKeyDown={handleLeftTabKeyDown}
            >
              <Users size={15} aria-hidden="true" />
              <span className="vps-ellipsis">Danh bạ</span>
              <span className="vps-pane-count">{contacts.length}</span>
            </button>
          </div>

          <div
            className="vps-internal-tabpanel"
            role="tabpanel"
            aria-labelledby={threadsTabId}
            hidden={leftTab !== "threads"}
          >
            <div className="vps-sidebar-filters">
              <div className="vps-search-box">
                <Search size={15} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Tìm người đã nhắn tin…"
                  value={threadSearch}
                  onChange={(e) => setThreadSearch(e.target.value)}
                  aria-label="Tìm trong cuộc trò chuyện gần đây"
                />
              </div>
            </div>

            <div className="vps-thread-list">
              {filteredRecentThreads.length === 0 ? (
                <div className="vps-empty-note-sm">
                  {recentThreads.length === 0
                    ? "Chưa có cuộc trò chuyện nào. Chuyển sang mục Danh bạ bên cạnh để bắt đầu."
                    : "Không tìm thấy cuộc trò chuyện phù hợp."}
                </div>
              ) : (
                filteredRecentThreads.map((t) => {
                  const isSelected = Number(t.id) === Number(activeThreadId);
                  const hasUnread = Number(t.unreadCount || 0) > 0 && !isSelected;
                  const avatarTone = t.isArchived
                    ? "resolved"
                    : t.peerRole === "ADMIN"
                      ? "admin"
                      : "human";
                  const timeLabel = formatSidebarTime(t.lastMessageAt || t.updatedAt);
                  const orgLabel =
                    t.threadType === "ADMIN_MANAGER" && t.peerRole === "ADMIN"
                      ? "Ban quản trị VietPeace Stay"
                      : t.accommodationName || "Quản lý cơ sở";
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`vps-thread-item ${isSelected ? "active" : ""} ${hasUnread ? "is-unread" : ""}`}
                      onClick={() => handleSelectThread(t.id)}
                    >
                      <div className={`vps-thread-avatar vps-thread-avatar--${avatarTone}`} aria-hidden="true">
                        {getInitials(t.peerName, "NV")}
                      </div>
                      <div className="vps-thread-content">
                        <div className="vps-thread-item-head">
                          <strong className="vps-ellipsis">{t.peerName}</strong>
                          {timeLabel && <span className="vps-thread-time">{timeLabel}</span>}
                        </div>
                        <div className="vps-thread-item-sub">
                          <span className="vps-thread-sub-left" title={orgLabel}>
                            {t.peerRole === "ADMIN" ? (
                              <ShieldCheck size={12} aria-hidden="true" />
                            ) : (
                              <Building2 size={12} aria-hidden="true" />
                            )}
                            <span className="vps-ellipsis">{orgLabel}</span>
                            {t.isArchived && <Archive size={11} title="Đã lưu trữ Read-Only" />}
                          </span>
                          {hasUnread && (
                            <span className="vps-unread-dot" aria-label={`${t.unreadCount} tin chưa đọc`}>
                              {t.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="vps-thread-item-preview">{t.lastMessagePreview || "Bắt đầu trao đổi…"}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div
            className="vps-internal-tabpanel"
            role="tabpanel"
            aria-labelledby={directoryTabId}
            hidden={leftTab !== "directory"}
          >
            <div className="vps-sidebar-filters">
              <div className="vps-search-box">
                <Search size={15} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Tìm Admin, Quản lý hoặc cơ sở…"
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  aria-label="Tìm liên hệ trong danh bạ"
                />
              </div>
            </div>

            <div className="vps-thread-list vps-directory-list">
              {filteredContacts.length === 0 ? (
                <div className="vps-empty-note-sm">Không tìm thấy nhân sự phù hợp.</div>
              ) : (
                filteredContacts.map((c) => {
                  const isActivePeer =
                    Boolean(activePeerUserId) && String(c.userId || "").toLowerCase() === activePeerUserId;
                  return (
                    <button
                      key={c.userId}
                      type="button"
                      className={`vps-contact-item ${isActivePeer ? "active" : ""}`}
                      onClick={() => handleOpenContact(c)}
                      title={`Nhắn tin với ${c.fullName}`}
                    >
                      <div
                        className={`vps-thread-avatar vps-thread-avatar--${c.role === "ADMIN" ? "admin" : "ai"}`}
                        aria-hidden="true"
                      >
                        {getInitials(c.fullName, "NV")}
                      </div>
                      <div className="vps-contact-meta">
                        <strong className="vps-ellipsis">{c.fullName}</strong>
                        <small className="vps-thread-sub-left" title={c.accommodationName}>
                          {c.role === "ADMIN" ? (
                            <ShieldCheck size={12} aria-hidden="true" />
                          ) : (
                            <Building2 size={12} aria-hidden="true" />
                          )}
                          <span className="vps-ellipsis">{c.accommodationName}</span>
                        </small>
                      </div>
                      <span className="vps-contact-action-icon" aria-hidden="true">
                        <MessageSquarePlus size={15} />
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Right Pane: Active Thread Conversation */}
        <section className="vps-chat-main">
          {!selectedThread ? (
            <div className="vps-empty-pane">
              Chọn nhân sự trong mục Danh bạ bên cạnh để bắt đầu nhắn tin nội bộ.
            </div>
          ) : (
            <>
              <header className="vps-main-header">
                <div className="vps-main-identity">
                  <div
                    className={`vps-thread-avatar vps-main-avatar vps-thread-avatar--${
                      selectedThread.isArchived
                        ? "resolved"
                        : selectedThread.peerRole === "ADMIN"
                          ? "admin"
                          : "human"
                    }`}
                    aria-hidden="true"
                  >
                    {getInitials(selectedThread.peerName, "NV")}
                  </div>
                  <div className="vps-main-identity-text">
                    <div className="vps-main-title-row">
                      <h2 className="vps-ellipsis">{selectedThread.peerName}</h2>
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
                    <Edit3 size={14} aria-hidden="true" />
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
                      aria-label="Tên gợi nhớ"
                    />
                    <button type="submit" className="btn btn-primary btn-sm">
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
                  <Archive size={14} aria-hidden="true" />
                  <span>
                    Luồng lịch sử thuộc nhiệm kỳ bàn giao trước ({selectedThread.archivedReason || "archived"}) —
                    chỉ xem để bảo toàn tính toàn vẹn dữ liệu.
                  </span>
                </div>
              )}

              <div className="vps-stream-shell">
                <div className="vps-main-stream" onScroll={handleStreamScroll}>
                  {loadingMsgs && selectedMessages.length === 0 ? (
                    <div className="vps-empty-pane">
                      <Loader2 size={20} className="vps-adm-spin" /> Đang tải tin nhắn nội bộ…
                    </div>
                  ) : (
                    groupChatMessages(selectedMessages, getInternalSenderKey).map((entry) => {
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
                      const isMine = getInternalSenderKey(firstMsg) === myUserIdLower;
                      const showReceipt = isMine && entry.lastIndex === lastOutgoingIdx;
                      const receipt = showReceipt
                        ? getAdminReceiptMeta(lastMsg, selectedThread.peerDelivery, selectedThread.peerName)
                        : null;

                      return (
                        <Fragment key={entry.key}>
                          {entry.showDaySep && (
                            <div className="vps-adm-day-sep" role="separator">
                              <span>{getDaySeparatorLabel(firstMsg.createdAt)}</span>
                            </div>
                          )}
                          <div className={`vps-adm-msg ${isMine ? "out" : "in"}`}>
                            <div className="vps-adm-msg-meta">
                              <strong>{isMine ? "Bạn" : firstMsg.senderName || selectedThread.peerName}</strong>
                              <span>{formatShortClock(firstMsg.createdAt)}</span>
                            </div>
                            <div className="vps-adm-msg-bubble">
                              {entry.items.map((item, itemIdx) => (
                                <div
                                  key={item.id || item.clientMessageId || itemIdx}
                                  className="vps-adm-msg-part"
                                  title={formatFullDateTime(item.createdAt)}
                                >
                                  <div className="vps-adm-msg-text">{item.content}</div>
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

              <form className="vps-adm-composer-wrap" onSubmit={handleSendSubmit}>
                <div className="vps-composer-card">
                  <div className="vps-composer-row">
                    <textarea
                      rows={1}
                      className="vps-adm-textarea"
                      disabled={selectedThread.isArchived}
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        selectedThread.isArchived
                          ? "Luồng đã lưu trữ Read-Only sau bàn giao nhiệm kỳ."
                          : `Nhắn tin nội bộ tới ${selectedThread.peerName}… (Enter gửi, Shift+Enter xuống dòng)`
                      }
                      aria-label="Nội dung tin nhắn nội bộ"
                    />
                    <button
                      type="submit"
                      className="btn btn-primary vps-send-btn"
                      disabled={selectedThread.isArchived || !draftText.trim()}
                    >
                      <Send size={15} aria-hidden="true" />
                      <span>Gửi</span>
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
