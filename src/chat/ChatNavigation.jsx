import { NavLink } from "react-router-dom";
import { MessageSquare, MessagesSquare, ShieldAlert } from "lucide-react";
import { useAdminChat } from "./ChatContext";

export default function ChatNavigation() {
  const { isAdmin, waitingCount, internalUnread, reportsBadge } = useAdminChat();

  return (
    <nav className="vps-admin-chat-nav" aria-label="Điều hướng hệ thống Chat">
      <NavLink
        to="/admin/chat"
        end
        className={({ isActive }) => `vps-admin-chat-tab ${isActive ? "active" : ""}`}
      >
        <MessageSquare size={16} />
        <span>Tư vấn khách hàng</span>
        {waitingCount > 0 && <span className="vps-tab-badge vps-tab-badge--warn">{waitingCount}</span>}
      </NavLink>

      <NavLink
        to="/admin/chat/internal"
        className={({ isActive }) => `vps-admin-chat-tab ${isActive ? "active" : ""}`}
      >
        <MessagesSquare size={16} />
        <span>Chat nội bộ</span>
        {internalUnread > 0 && <span className="vps-tab-badge">{internalUnread}</span>}
      </NavLink>

      {/* ADMIN ONLY — Manager never sees Chat Reports */}
      {isAdmin && (
        <NavLink
          to="/admin/chat/reports"
          className={({ isActive }) => `vps-admin-chat-tab ${isActive ? "active" : ""}`}
        >
          <ShieldAlert size={16} />
          <span>Báo cáo chat</span>
          {reportsBadge > 0 && <span className="vps-tab-badge vps-tab-badge--danger">{reportsBadge}</span>}
        </NavLink>
      )}
    </nav>
  );
}
