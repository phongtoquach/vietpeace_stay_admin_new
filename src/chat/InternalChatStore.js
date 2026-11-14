import { adminChatClient } from "./ChatClient";

export function makeClientMsgId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `int-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function fetchInternalDirectory() {
  const [contactsRes, threadsRes] = await Promise.all([
    adminChatClient.listInternalContacts(),
    adminChatClient.listInternalThreads(),
  ]);
  return {
    contacts: contactsRes.items || [],
    threads: threadsRes.items || [],
  };
}

export async function startOrOpenPeerThread(targetUserId) {
  return adminChatClient.openOrCreateInternalThread(targetUserId);
}

export async function loadThreadHistory(threadId) {
  const res = await adminChatClient.listInternalMessages(threadId, { limit: 80 });
  return res.items || [];
}
