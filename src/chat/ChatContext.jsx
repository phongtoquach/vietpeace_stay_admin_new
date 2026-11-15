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

function getConversationOwnerKey(conv) {
  if (!conv) return null;
  if (conv.customerUserId) return `cust:${String(conv.customerUserId).toLowerCase()}`;
  if (conv.guestSessionId) return `guest:${String(conv.guestSessionId).toLowerCase()}`;
  return null;
}

function shouldSupersedeOwnerConv(incoming, existing) {
  if (!incoming || !existing) return false;
  const incOpen = incoming.status === "OPEN" ? 0 : 1;
  const extOpen = existing.status === "OPEN" ? 0 : 1;
  if (incOpen !== extOpen) return incOpen < extOpen;
  const incTime = new Date(incoming.lastMessageAt || incoming.updatedAt || incoming.createdAt || 0).getTime();
  const extTime = new Date(existing.lastMessageAt || existing.updatedAt || existing.createdAt || 0).getTime();
  if (incTime !== extTime) return incTime > extTime;
  return Number(incoming.id) >= Number(existing.id);
}

const AdminChatContext = createContext(null);

function playHandoffChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [880, 1174.66].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.3);
    });
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 800);
  } catch {
    // Ignore browser autoplay restrictions before interaction
  }
}

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
  const [handoffMetadataByConv, setHandoffMetadataByConv] = useState({});
  const [dismissedHandoffKeys, setDismissedHandoffKeys] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);

  // Shared live message caches keyed by conversationId / threadId
  const [convMessagesById, setConvMessagesById] = useState({});
  const [internalMessagesById, setInternalMessagesById] = useState({});
  const [activeConvId, setActiveConvId] = useState(null);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [customerTypingByConv, setCustomerTypingByConv] = useState({});
  const [reportsRefreshTick, setReportsRefreshTick] = useState(0);

  const activeConvIdRef = useRef(activeConvId);
  const activeOwnerKeyRef = useRef(null);
  const activeThreadIdRef = useRef(activeThreadId);
  const userIdRef = useRef(userId);
  const userRoleRef = useRef(userRole);
  const showToastRef = useRef(showToast);
  const bootedUserIdRef = useRef(null);
  const notifiedHandoffKeysRef = useRef(new Set());
  const baseTitleRef = useRef(null);

  useEffect(() => {
    activeConvIdRef.current = activeConvId;
    activeThreadIdRef.current = activeThreadId;
    userIdRef.current = userId;
    userRoleRef.current = userRole;
    showToastRef.current = showToast;
  }, [activeConvId, activeThreadId, userId, userRole, showToast]);

  useEffect(() => {
    if (!activeConvId) {
      activeOwnerKeyRef.current = null;
      return;
    }
    const current = conversations.find((c) => Number(c.id) === Number(activeConvId));
    if (current) {
      const key = getConversationOwnerKey(current);
      if (key) activeOwnerKeyRef.current = key;
      return;
    }
    if (activeOwnerKeyRef.current) {
      const replacement = conversations.find(
        (c) => getConversationOwnerKey(c) === activeOwnerKeyRef.current,
      );
      if (replacement) {
        setActiveConvId(Number(replacement.id));
      }
    }
  }, [conversations, activeConvId]);

  const notifyHandoffAlert = useCallback((handoffKey, accommodationName, requesterName) => {
    if (!handoffKey || notifiedHandoffKeysRef.current.has(handoffKey)) return;
    notifiedHandoffKeysRef.current.add(handoffKey);
    if (userRoleRef.current === "ACCOMMODATION_MANAGER") {
      playHandoffChime();
      showToastRef.current?.(
        `${requesterName || "Khách hàng"} yêu cầu gặp Quản lý tại ${accommodationName || "cơ sở"} (hạn 5 phút)!`,
        "warning",
      );
    }
  }, []);

  const refreshConversations = useCallback(
    async (filters = {}) => {
      const res = await adminChatClient.listConversations(filters);
      const items = res.items || [];
      setConversations(items);
      if (userRoleRef.current === "ACCOMMODATION_MANAGER") {
        items.forEach((c) => {
          if (c.handlingMode === "WAITING_HUMAN" && c.status === "OPEN") {
            const key = `${Number(c.id)}:${c.currentHandoffId || ""}`;
            notifyHandoffAlert(key, c.accommodationName, c.customerName);
          }
        });
      }
      return items;
    },
    [notifyHandoffAlert],
  );

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
    const ownerKey = getConversationOwnerKey(conv);
    setConversations((prev) => {
      const exists = prev.some((c) => Number(c.id) === cid);
      let next;
      if (exists) {
        next = prev.map((c) => (Number(c.id) === cid ? { ...c, ...conv } : c));
      } else if (ownerKey) {
        const sameOwnerIdx = prev.findIndex((c) => getConversationOwnerKey(c) === ownerKey);
        if (sameOwnerIdx !== -1) {
          const existingOwnerConv = prev[sameOwnerIdx];
          next = shouldSupersedeOwnerConv(conv, existingOwnerConv)
            ? prev.map((c, i) => (i === sameOwnerIdx ? conv : c))
            : prev;
        } else {
          next = [conv, ...prev];
        }
      } else {
        next = [conv, ...prev];
      }
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
        refreshConversations().catch(() => {});
        refreshInternalThreads().catch(() => {});
        if (userRoleRef.current === "ADMIN") {
          refreshReportsSummary().catch(() => {});
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

      socket.on("conversation:updated", (payload) => {
        if (payload?.conversation) {
          upsertConversation(payload.conversation);
        } else if (payload?.conversationId && payload?.handlingMode) {
          upsertConversation({
            id: Number(payload.conversationId),
            handlingMode: payload.handlingMode,
            ...(payload.assignedUserId !== undefined ? { assignedUserId: payload.assignedUserId } : {}),
            ...(payload.assignedManagerName !== undefined ? { assignedManagerName: payload.assignedManagerName } : {}),
            ...(payload.currentHandoffId !== undefined ? { currentHandoffId: payload.currentHandoffId } : {}),
            ...(payload.managerWaitExpiresAt !== undefined ? { managerWaitExpiresAt: payload.managerWaitExpiresAt } : {}),
            ...(payload.retentionState !== undefined ? { retentionState: payload.retentionState } : {}),
          });
        }
        const cid = Number(payload?.conversation?.id || payload?.conversationId || 0);
        const nextMode = payload?.conversation?.handlingMode || payload?.handlingMode;
        if (cid && nextMode && nextMode !== "WAITING_HUMAN") {
          setHandoffMetadataByConv((prev) => {
            if (!prev[cid]) return prev;
            const next = { ...prev };
            delete next[cid];
            return next;
          });
        }
        refreshConversations().catch(() => {});
      });

      socket.on("queue:updated", (payload) => {
        const cid = Number(payload?.conversationId || 0);
        if (cid && payload?.action && payload.action !== "REQUESTED") {
          setHandoffMetadataByConv((prev) => {
            if (!prev[cid]) return prev;
            const next = { ...prev };
            delete next[cid];
            return next;
          });
        }
        refreshConversations().catch(() => {});
      });

      socket.on("handoff:requested", (payload) => {
        const cid = Number(payload?.conversationId || 0);
        if (cid) {
          setHandoffMetadataByConv((prev) => ({
            ...prev,
            [cid]: { ...payload, conversationId: cid },
          }));
          const key = `${cid}:${payload?.handoffId || ""}`;
          notifyHandoffAlert(key, payload?.accommodationName, payload?.requesterName);
        }
        refreshConversations().catch(() => {});
      });

      socket.on("handoff:missed", (payload) => {
        const cid = Number(payload?.conversationId || 0);
        if (cid) {
          setHandoffMetadataByConv((prev) => {
            if (!prev[cid]) return prev;
            const next = { ...prev };
            delete next[cid];
            return next;
          });
        }
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
      notifyHandoffAlert,
      refreshConversations,
      refreshInternalThreads,
      refreshReportsSummary,
      upsertConversation,
      upsertInternalThread,
    ],
  );

  // Key socket + initial loads strictly on userId; preserve live state across route transitions
  useEffect(() => {
    let cancelled = false;
    async function syncBoot() {
      await Promise.resolve();
      if (cancelled) return;

      if (!userId) {
        if (!isCheckingAuthen) {
          bootedUserIdRef.current = null;
          notifiedHandoffKeysRef.current.clear();
          adminChatClient.disconnectSocket();
          setSocketConnected(false);
          setConversations([]);
          setInternalThreads([]);
          setConvMessagesById({});
          setInternalMessagesById({});
          setHandoffMetadataByConv({});
          setDismissedHandoffKeys([]);
        }
        return;
      }

      // AuthContext toggles isCheckingAuthen=true on route navigation; keep active session alive
      if (isCheckingAuthen) {
        return;
      }

      if (bootedUserIdRef.current === userId && adminChatClient.socket?.connected) {
        refreshConversations().catch(() => {});
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
        if (!cancelled) {
          bootedUserIdRef.current = userId;
          if (!socket._vpsAdminListenersAttached) {
            attachSocketListeners(socket);
            socket._vpsAdminListenersAttached = true;
          }
          if (socket.connected) {
            setSocketConnected(true);
          }
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

  // Tab focus, visibility resume, and fallback polling sync so missed handoff events always surface
  useEffect(() => {
    if (!userId) return undefined;

    const syncNow = () => {
      refreshConversations().catch(() => {});
      refreshInternalThreads().catch(() => {});
      if (userRoleRef.current === "ADMIN") {
        refreshReportsSummary().catch(() => {});
      }
      if (!adminChatClient.socket?.connected) {
        adminChatClient.connectSocket()
          .then((socket) => {
            if (!socket._vpsAdminListenersAttached) {
              attachSocketListeners(socket);
              socket._vpsAdminListenersAttached = true;
            }
          })
          .catch(() => {});
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncNow();
      }
    };

    window.addEventListener("focus", syncNow);
    document.addEventListener("visibilitychange", handleVisibility);
    const intervalMs = socketConnected ? 25000 : 10000;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" || !socketConnected) {
        refreshConversations().catch(() => {});
        if (userRoleRef.current === "ADMIN") {
          refreshReportsSummary().catch(() => {});
        }
      }
    }, intervalMs);

    return () => {
      window.removeEventListener("focus", syncNow);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(timer);
    };
  }, [userId, socketConnected, attachSocketListeners, refreshConversations, refreshInternalThreads, refreshReportsSummary]);

  const waitingConversations = useMemo(
    () =>
      conversations
        .filter((c) => c.handlingMode === "WAITING_HUMAN" && c.status === "OPEN")
        .sort(
          (a, b) =>
            new Date(a.managerWaitExpiresAt || a.updatedAt || 0) -
            new Date(b.managerWaitExpiresAt || b.updatedAt || 0),
        ),
    [conversations],
  );

  const pendingHandoffAlerts = useMemo(() => {
    const seenConvIds = new Set();
    const list = [];

    waitingConversations.forEach((c) => {
      const cid = Number(c.id);
      seenConvIds.add(cid);
      const meta = handoffMetadataByConv[cid] || {};
      const handoffId = c.currentHandoffId ?? meta.handoffId ?? "";
      const dismissKey = `${cid}:${handoffId}`;
      if (dismissedHandoffKeys.includes(dismissKey)) return;
      list.push({
        conversationId: cid,
        handoffId,
        requesterName: meta.requesterName || c.customerName || "Khách hàng",
        accommodationId: c.accommodationId,
        accommodationName: meta.accommodationName || c.accommodationName || "cơ sở",
        expiresAt: c.managerWaitExpiresAt || meta.expiresAt || null,
        lastMessagePreview: c.lastMessagePreview || "",
        dismissKey,
      });
    });

    Object.values(handoffMetadataByConv).forEach((meta) => {
      const cid = Number(meta?.conversationId || 0);
      if (!cid || seenConvIds.has(cid)) return;
      if (conversations.some((c) => Number(c.id) === cid)) return;
      const handoffId = meta.handoffId ?? "";
      const dismissKey = `${cid}:${handoffId}`;
      if (dismissedHandoffKeys.includes(dismissKey)) return;
      list.push({
        conversationId: cid,
        handoffId,
        requesterName: meta.requesterName || "Khách hàng",
        accommodationId: meta.accommodationId || null,
        accommodationName: meta.accommodationName || "cơ sở",
        expiresAt: meta.expiresAt || null,
        lastMessagePreview: "",
        dismissKey,
      });
    });

    return list;
  }, [waitingConversations, handoffMetadataByConv, conversations, dismissedHandoffKeys]);

  const dismissHandoffAlert = useCallback(
    (cid) => {
      const numCid = Number(cid);
      const target = pendingHandoffAlerts.find((a) => Number(a.conversationId) === numCid);
      const key = target?.dismissKey || `${numCid}:`;
      setDismissedHandoffKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    },
    [pendingHandoffAlerts],
  );

  const waitingCount = waitingConversations.length;

  useEffect(() => {
    if (!baseTitleRef.current) {
      baseTitleRef.current = document.title || "VietPeace Stay";
    }
    const baseTitle = baseTitleRef.current;
    if (isManager && waitingCount > 0) {
      document.title = `(${waitingCount}) Khách chờ Quản lý · ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
    return () => {
      document.title = baseTitle;
    };
  }, [isManager, waitingCount]);

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
    waitingConversations,
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
    dismissHandoffAlert,
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
