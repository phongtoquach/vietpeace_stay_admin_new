import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AuthContext from "../context/AuthContext";
import { useAdmin } from "../context/AdminContext";
import { adminChatClient } from "./ChatClient";

const AdminChatContext = createContext(null);

export function AdminChatProvider({ children }) {
  const { currentLoggedInUser, isCheckingAuthen } = useContext(AuthContext) || {};
  const { showToast } = useAdmin() || {};

  const userId = currentLoggedInUser?.id ? String(currentLoggedInUser.id) : null;
  const userRole = currentLoggedInUser?.role || null;
  const isAdmin = userRole === "ADMIN";
  const isManager = userRole === "ACCOMMODATION_MANAGER";

  const [chatMe, setChatMe] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [internalThreads, setInternalThreads] = useState([]);
  const [reportsSummary, setReportsSummary] = useState({
    unreadMissedCount: 0,
    totalMissedCount: 0,
    pendingLowRatingsCount: 0,
    confirmedViolationsCount: 0,
    totalBadgeCount: 0,
  });
  const [pendingHandoffAlerts, setPendingHandoffAlerts] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);

  // Shared live message caches keyed by conversationId / threadId
  const [convMessagesById, setConvMessagesById] = useState({});
  const [internalMessagesById, setInternalMessagesById] = useState({});
  const [activeConvId, setActiveConvId] = useState(null);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [customerTypingByConv, setCustomerTypingByConv] = useState({});
  const [reportsRefreshTick, setReportsRefreshTick] = useState(0);

  const activeConvIdRef = useRef(activeConvId);
  const activeThreadIdRef = useRef(activeThreadId);
  const userIdRef = useRef(userId);
  const userRoleRef = useRef(userRole);
  const showToastRef = useRef(showToast);

  useEffect(() => {
    activeConvIdRef.current = activeConvId;
    activeThreadIdRef.current = activeThreadId;
    userIdRef.current = userId;
    userRoleRef.current = userRole;
    showToastRef.current = showToast;
  }, [activeConvId, activeThreadId, userId, userRole, showToast]);

  const refreshConversations = useCallback(async (filters = {}) => {
    const res = await adminChatClient.listConversations(filters);
    setConversations(res.items || []);
    return res.items || [];
  }, []);

  const refreshInternalThreads = useCallback(async () => {
    const res = await adminChatClient.listInternalThreads();
    setInternalThreads(res.items || []);
    return res.items || [];
  }, []);

  const refreshReportsSummary = useCallback(async () => {
    if (userRoleRef.current !== "ADMIN") return null;
    const data = await adminChatClient.getReportsSummary();
    setReportsSummary(data);
    return data;
  }, []);

  const upsertConversation = useCallback((conv) => {
    if (!conv?.id) return;
    const cid = Number(conv.id);
    setConversations((prev) => {
      const exists = prev.some((c) => Number(c.id) === cid);
      const next = exists
        ? prev.map((c) => (Number(c.id) === cid ? { ...c, ...conv } : c))
        : [conv, ...prev];
      return [...next].sort(
        (a, b) => new Date(b.lastMessageAt || b.updatedAt || 0) - new Date(a.lastMessageAt || a.updatedAt || 0),
      );
    });
  }, []);

  const upsertInternalThread = useCallback((thread) => {
    if (!thread?.id) return;
    const tid = Number(thread.id);
    setInternalThreads((prev) => {
      const exists = prev.some((t) => Number(t.id) === tid);
      const next = exists
        ? prev.map((t) => (Number(t.id) === tid ? { ...t, ...thread } : t))
        : [thread, ...prev];
      return [...next].sort(
        (a, b) => new Date(b.lastMessageAt || b.updatedAt || 0) - new Date(a.lastMessageAt || a.updatedAt || 0),
      );
    });
  }, []);

  const appendConvMessage = useCallback((cid, msg) => {
    if (!cid || !msg) return;
    const id = Number(cid);
    setConvMessagesById((prev) => {
      const list = prev[id] || [];
      if (msg.clientMessageId) {
        const idx = list.findIndex((m) => m.clientMessageId && m.clientMessageId === msg.clientMessageId);
        if (idx !== -1) {
          const copy = [...list];
          copy[idx] = { ...msg, localStatus: undefined };
          return { ...prev, [id]: copy };
        }
      }
      if (msg.id && list.some((m) => Number(m.id) === Number(msg.id))) {
        return { ...prev, [id]: list.map((m) => (Number(m.id) === Number(msg.id) ? { ...m, ...msg } : m)) };
      }
      const next = [...list, msg].sort(
        (a, b) => Number(a.sequence || Number.MAX_SAFE_INTEGER) - Number(b.sequence || Number.MAX_SAFE_INTEGER),
      );
      return { ...prev, [id]: next };
    });
  }, []);

  const appendInternalMessage = useCallback((tid, msg) => {
    if (!tid || !msg) return;
    const id = Number(tid);
    setInternalMessagesById((prev) => {
      const list = prev[id] || [];
      if (msg.clientMessageId) {
        const idx = list.findIndex((m) => m.clientMessageId && m.clientMessageId === msg.clientMessageId);
        if (idx !== -1) {
          const copy = [...list];
          copy[idx] = { ...msg, localStatus: undefined };
          return { ...prev, [id]: copy };
        }
      }
      if (msg.id && list.some((m) => Number(m.id) === Number(msg.id))) {
        return { ...prev, [id]: list.map((m) => (Number(m.id) === Number(msg.id) ? { ...m, ...msg } : m)) };
      }
      const next = [...list, msg].sort(
        (a, b) => Number(a.sequence || Number.MAX_SAFE_INTEGER) - Number(b.sequence || Number.MAX_SAFE_INTEGER),
      );
      return { ...prev, [id]: next };
    });
  }, []);

  const attachSocketListeners = useCallback(
    (socket) => {
      socket.on("connect", () => {
        setSocketConnected(true);
        adminChatClient.syncInternalDeliveredAll().catch(() => {});
        if (userRoleRef.current === "ACCOMMODATION_MANAGER") {
          adminChatClient.syncDeliveredAll().catch(() => {});
        }
        if (activeConvIdRef.current) {
          socket.emit("conversation:join", { conversationId: activeConvIdRef.current });
        }
        if (activeThreadIdRef.current) {
          socket.emit("internal:join", { threadId: activeThreadIdRef.current });
        }
      });

      socket.on("disconnect", () => {
        setSocketConnected(false);
      });

      socket.on("conversation:updated", ({ conversation }) => {
        if (conversation) upsertConversation(conversation);
        refreshConversations().catch(() => {});
      });

      socket.on("queue:updated", () => {
        refreshConversations().catch(() => {});
      });

      socket.on("handoff:requested", (payload) => {
        setPendingHandoffAlerts((prev) => {
          const cid = Number(payload.conversationId);
          const filtered = prev.filter((x) => Number(x.conversationId) !== cid);
          return [payload, ...filtered].slice(0, 10);
        });
        showToastRef.current?.(
          `Khách yêu cầu gặp Quản lý tại ${payload.accommodationName || "cơ sở"} (hạn 5 phút)!`,
          "warning",
        );
        refreshConversations().catch(() => {});
      });

      socket.on("handoff:missed", (payload) => {
        setPendingHandoffAlerts((prev) =>
          prev.filter((x) => Number(x.conversationId) !== Number(payload?.conversationId)),
        );
        refreshConversations().catch(() => {});
        if (userRoleRef.current === "ADMIN") {
          refreshReportsSummary().catch(() => {});
          setReportsRefreshTick((t) => t + 1);
        }
      });

      socket.on("admin:missed-handoff-alert", (payload) => {
        if (userRoleRef.current === "ADMIN") {
          showToastRef.current?.(
            `Cảnh báo: Quản lý ${payload?.managerName || ""} bỏ lỡ yêu cầu chat > 5 phút (${payload?.accommodationName || ""})`,
            "error",
          );
          refreshReportsSummary().catch(() => {});
          setReportsRefreshTick((t) => t + 1);
        }
      });

      socket.on("admin:low-rating-alert", (payload) => {
        if (userRoleRef.current === "ADMIN") {
          showToastRef.current?.(
            `Đánh giá ${payload?.rating}★ từ khách hàng tại ${payload?.accommodationName || "cơ sở"} cần kiểm tra.`,
            "warning",
          );
          refreshReportsSummary().catch(() => {});
          setReportsRefreshTick((t) => t + 1);
        }
      });

      socket.on("message:created", ({ conversationId, message }) => {
        if (!conversationId || !message) return;
        const cid = Number(conversationId);
        appendConvMessage(cid, message);
        const seq = Number(message.sequence || 0);
        const isCounterparty =
          message.visibility === "PUBLIC" &&
          (message.senderType === "CUSTOMER" || message.senderType === "GUEST");

        // ONLY Manager sends customer delivery/read receipts; Admin supervise MUST NOT mark read
        if (userRoleRef.current === "ACCOMMODATION_MANAGER" && seq > 0 && message.visibility === "PUBLIC") {
          adminChatClient.markDelivered(cid, seq).catch(() => {});
          if (Number(activeConvIdRef.current) === cid && document.visibilityState === "visible") {
            adminChatClient.markRead(cid, seq).catch(() => {});
          }
        }

        if (isCounterparty && Number(activeConvIdRef.current) !== cid) {
          refreshConversations().catch(() => {});
        }
      });

      const handleCustReceipt = (payload) => {
        if (!payload?.conversationId) return;
        if (payload.actorRole !== "CUSTOMER" && payload.actorRole !== "GUEST") return;
        const cid = Number(payload.conversationId);
        setConversations((prev) =>
          prev.map((c) =>
            Number(c.id) === cid
              ? {
                  ...c,
                  counterpartyDelivery: {
                    ...(c.counterpartyDelivery || {}),
                    deliveredSequence: Math.max(
                      Number(c.counterpartyDelivery?.deliveredSequence || 0),
                      Number(payload.deliveredSequence || 0),
                    ),
                    deliveredAt: payload.deliveredAt || c.counterpartyDelivery?.deliveredAt || null,
                    readSequence: Math.max(
                      Number(c.counterpartyDelivery?.readSequence || 0),
                      Number(payload.readSequence || 0),
                    ),
                    readAt: payload.readAt || c.counterpartyDelivery?.readAt || null,
                  },
                }
              : c,
          ),
        );
      };

      socket.on("message:delivery-updated", handleCustReceipt);
      socket.on("message:read-updated", handleCustReceipt);

      socket.on("typing:update", ({ conversationId, actorName, isTyping }) => {
        setCustomerTypingByConv((prev) => ({
          ...prev,
          [Number(conversationId)]: isTyping ? actorName || "Khách" : null,
        }));
      });

      // Internal Chat Events (Admin <-> Manager & Manager <-> Manager)
      socket.on("internal:thread-updated", ({ thread }) => {
        if (thread) upsertInternalThread(thread);
      });

      socket.on("internal:message-created", ({ threadId, message, thread }) => {
        if (thread) upsertInternalThread(thread);
        if (!threadId || !message) return;
        const tid = Number(threadId);
        appendInternalMessage(tid, message);
        const seq = Number(message.sequence || 0);
        const fromPeer = String(message.senderUserId || "").toLowerCase() !== String(userIdRef.current || "").toLowerCase();
        if (seq > 0 && fromPeer) {
          adminChatClient.markInternalDelivered(tid, seq).catch(() => {});
          if (Number(activeThreadIdRef.current) === tid && document.visibilityState === "visible") {
            adminChatClient.markInternalRead(tid, seq).catch(() => {});
          } else {
            refreshInternalThreads().catch(() => {});
          }
        }
      });

      const handleInternalReceipt = (payload) => {
        if (!payload?.threadId) return;
        const isPeer =
          String(payload.actorUserId || "").toLowerCase() !== String(userIdRef.current || "").toLowerCase();
        if (!isPeer) return;
        const tid = Number(payload.threadId);
        setInternalThreads((prev) =>
          prev.map((t) =>
            Number(t.id) === tid
              ? {
                  ...t,
                  peerDelivery: {
                    ...(t.peerDelivery || {}),
                    deliveredSequence: Math.max(
                      Number(t.peerDelivery?.deliveredSequence || 0),
                      Number(payload.deliveredSequence || 0),
                    ),
                    deliveredAt: payload.deliveredAt || t.peerDelivery?.deliveredAt || null,
                    readSequence: Math.max(
                      Number(t.peerDelivery?.readSequence || 0),
                      Number(payload.readSequence || 0),
                    ),
                    readAt: payload.readAt || t.peerDelivery?.readAt || null,
                  },
                }
              : t,
          ),
        );
      };

      socket.on("internal:delivery-updated", handleInternalReceipt);
      socket.on("internal:read-updated", handleInternalReceipt);

      socket.on("access:revoked", () => {
        adminChatClient.disconnectSocket();
        setSocketConnected(false);
      });
    },
    [
      appendConvMessage,
      appendInternalMessage,
      refreshConversations,
      refreshInternalThreads,
      refreshReportsSummary,
      upsertConversation,
      upsertInternalThread,
    ],
  );

  // Key socket + initial loads strictly on stable userId
  useEffect(() => {
    let cancelled = false;
    async function syncBoot() {
      await Promise.resolve();
      if (cancelled) return;
      if (isCheckingAuthen || !userId) {
        adminChatClient.disconnectSocket();
        setSocketConnected(false);
        setConversations([]);
        setInternalThreads([]);
        setConvMessagesById({});
        setInternalMessagesById({});
        setPendingHandoffAlerts([]);
        return;
      }
      try {
        const me = await adminChatClient.getMe();
        if (cancelled) return;
        setChatMe(me);

        await Promise.all([
          refreshConversations().catch(() => []),
          refreshInternalThreads().catch(() => []),
          me.role === "ADMIN" ? refreshReportsSummary().catch(() => null) : Promise.resolve(null),
        ]);

        const socket = await adminChatClient.connectSocket();
        if (!cancelled && !socket._vpsAdminListenersAttached) {
          attachSocketListeners(socket);
          socket._vpsAdminListenersAttached = true;
        }
      } catch (err) {
        console.error("[AdminChatContext.boot]", err);
      }
    }

    syncBoot();
    return () => {
      cancelled = true;
    };
  }, [
    isCheckingAuthen,
    userId,
    attachSocketListeners,
    refreshConversations,
    refreshInternalThreads,
    refreshReportsSummary,
  ]);

  const waitingCount = useMemo(
    () => conversations.filter((c) => c.handlingMode === "WAITING_HUMAN" && c.status === "OPEN").length,
    [conversations],
  );

  const internalUnread = useMemo(
    () => internalThreads.reduce((sum, t) => sum + Number(t.unreadCount || 0), 0),
    [internalThreads],
  );

  const reportsBadge = isAdmin ? Number(reportsSummary?.totalBadgeCount || 0) : 0;

  const value = {
    isAdmin,
    isManager,
    chatMe,
    socketConnected,
    conversations,
    setConversations,
    upsertConversation,
    refreshConversations,
    convMessagesById,
    setConvMessagesById,
    appendConvMessage,
    activeConvId,
    setActiveConvId,
    customerTypingByConv,
    internalThreads,
    setInternalThreads,
    upsertInternalThread,
    refreshInternalThreads,
    internalMessagesById,
    setInternalMessagesById,
    appendInternalMessage,
    activeThreadId,
    setActiveThreadId,
    reportsSummary,
    refreshReportsSummary,
    reportsRefreshTick,
    pendingHandoffAlerts,
    dismissHandoffAlert: (cid) =>
      setPendingHandoffAlerts((prev) => prev.filter((x) => Number(x.conversationId) !== Number(cid))),
    waitingCount,
    internalUnread,
    reportsBadge,
  };

  return <AdminChatContext.Provider value={value}>{children}</AdminChatContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminChat() {
  const ctx = useContext(AdminChatContext);
  if (!ctx) {
    throw new Error("useAdminChat must be used inside AdminChatProvider");
  }
  return ctx;
}

export default AdminChatContext;
