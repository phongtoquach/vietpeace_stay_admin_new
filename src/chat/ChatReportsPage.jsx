import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  AlertTriangle,
  Star,
  Mail,
  CheckCircle2,
  XCircle,
  Settings,
  Clock,
  Check,
  Loader2,
} from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { adminChatClient } from "./ChatClient";
import ChatNavigation from "./ChatNavigation";
import { useAdminChat } from "./ChatContext";
import { formatFullDateTime } from "./chatUtils";
import "./chat.css";

export default function ChatReportsPage() {
  const { showToast } = useAdmin() || {};
  const { isAdmin, reportsSummary, refreshReportsSummary, reportsRefreshTick } = useAdminChat();

  const [tab, setTab] = useState("MISSED"); // 'MISSED' | 'RATINGS' | 'SETTINGS'
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [missedReports, setMissedReports] = useState([]);
  const [ratingStatusFilter, setRatingStatusFilter] = useState("ALL");
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(Boolean(isAdmin));

  const [emailTarget, setEmailTarget] = useState(null);
  const [emailNote, setEmailNote] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const [globalSettingsForm, setGlobalSettingsForm] = useState({
    aiEnabled: true,
    humanHandoffEnabled: true,
    claimTimeoutSeconds: 300,
    offlineMessage: "",
  });

  useEffect(() => {
    if (!isAdmin) return undefined;
    let alive = true;
    async function loadAll() {
      await Promise.resolve();
      if (!alive) return;
      setLoading(true);
      try {
        const [missedRes, ratingsRes, settingsRes] = await Promise.all([
          adminChatClient.listMissedHandoffs({ unreadOnly }),
          adminChatClient.listRatings(ratingStatusFilter),
          adminChatClient.getSettings(),
          refreshReportsSummary(),
        ]);
        if (!alive) return;
        setMissedReports(missedRes.items || []);
        setRatings(ratingsRes.items || []);
        const sItems = settingsRes.items || [];
        const globalRow = sItems.find((x) => !x.accommodationId) || sItems[0];
        if (globalRow) {
          setGlobalSettingsForm({
            aiEnabled: Boolean(globalRow.aiEnabled),
            humanHandoffEnabled: Boolean(globalRow.humanHandoffEnabled),
            claimTimeoutSeconds: Number(globalRow.claimTimeoutSeconds || 300),
            offlineMessage: globalRow.offlineMessage || "",
          });
        }
      } catch (err) {
        if (alive) showToast?.(err.message || "Không tải được báo cáo chat.", "error");
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadAll();
    return () => {
      alive = false;
    };
  }, [isAdmin, unreadOnly, ratingStatusFilter, reportsRefreshTick, refreshReportsSummary, showToast]);

  async function handleAckMissed(id) {
    try {
      const res = await adminChatClient.ackMissedHandoff(id);
      setMissedReports((prev) =>
        prev.map((r) => (Number(r.id) === Number(id) ? { ...r, adminReadAt: res.adminReadAt } : r)),
      );
      await refreshReportsSummary();
      showToast?.("Đã đánh dấu xác nhận báo cáo bỏ lỡ.", "success");
    } catch (err) {
      showToast?.(err.message || "Không thể xác nhận báo cáo.", "error");
    }
  }

  async function handleReviewRating(ratingId, decision) {
    try {
      const res = await adminChatClient.reviewRating(ratingId, { decision });
      setRatings((prev) =>
        prev.map((r) =>
          Number(r.id) === Number(ratingId)
            ? { ...r, adminReviewStatus: res.adminReviewStatus, reviewedAt: res.reviewedAt }
            : r,
        ),
      );
      await refreshReportsSummary();
      showToast?.("Đã cập nhật trạng thái xử lý đánh giá.", "success");
    } catch (err) {
      showToast?.(err.message || "Không thể duyệt đánh giá.", "error");
    }
  }

  async function handleSendWarningEmail(e) {
    e.preventDefault();
    if (!emailTarget) return;
    setSendingEmail(true);
    try {
      const res = await adminChatClient.sendWarningEmail(emailTarget.id, { adminNote: emailNote });
      setRatings((prev) =>
        prev.map((r) =>
          Number(r.id) === Number(emailTarget.id)
            ? { ...r, latestWarningStatus: res.status || "SENT", latestWarningSentAt: new Date().toISOString() }
            : r,
        ),
      );
      setEmailTarget(null);
      setEmailNote("");
      showToast?.("Đã gửi email nhắc nhở CSKH tới Quản lý cơ sở.", "success");
    } catch (err) {
      showToast?.(err.message || "Gửi email nhắc nhở thất bại.", "error");
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    try {
      await adminChatClient.updateSettings({
        accommodationId: null,
        ...globalSettingsForm,
      });
      showToast?.("Đã lưu cấu hình AI & Timeout toàn hệ thống.", "success");
    } catch (err) {
      showToast?.(err.message || "Không thể lưu cấu hình.", "error");
    }
  }

  // Strict defensive UI block for Manager (backend also returns 403 ADMIN_ONLY)
  if (!isAdmin) {
    return <Navigate to="/admin/chat" replace />;
  }

  return (
    <div className="vps-admin-chat-page">
      <div className="vps-admin-chat-topbar">
        <div>
          <h1 className="page-title" style={{ marginBottom: "4px" }}>
            Báo cáo Chat & Chất lượng CSKH
          </h1>
          <p className="page-subtitle">
            Dành riêng cho Super Admin: theo dõi yêu cầu khách bị Quản lý bỏ lỡ quá 5 phút, đánh giá 1–3 sao và gửi email nhắc nhở.
          </p>
        </div>
        <ChatNavigation />
      </div>

      {/* KPI Strip */}
      <div className="vps-report-kpis">
        <div className="vps-kpi-card vps-kpi-card--danger">
          <div className="vps-kpi-label">Bỏ lỡ &gt; 5 phút chưa đọc</div>
          <strong className="vps-kpi-val tabular-nums">{reportsSummary.unreadMissedCount}</strong>
        </div>
        <div className="vps-kpi-card">
          <div className="vps-kpi-label">Tổng lượt bỏ lỡ</div>
          <strong className="vps-kpi-val tabular-nums">{reportsSummary.totalMissedCount}</strong>
        </div>
        <div className="vps-kpi-card vps-kpi-card--warn">
          <div className="vps-kpi-label">Đánh giá 1–3★ chờ duyệt</div>
          <strong className="vps-kpi-val tabular-nums">{reportsSummary.pendingLowRatingsCount}</strong>
        </div>
        <div className="vps-kpi-card">
          <div className="vps-kpi-label">Đã xác nhận vi phạm CSKH</div>
          <strong className="vps-kpi-val tabular-nums">{reportsSummary.confirmedViolationsCount}</strong>
        </div>
      </div>

      {/* Inner Sub-tabs */}
      <div className="vps-report-tabs">
        <button
          type="button"
          className={`vps-report-tab ${tab === "MISSED" ? "active" : ""}`}
          onClick={() => setTab("MISSED")}
        >
          <Clock size={15} />
          <span>Quản lý bỏ lỡ (&gt; 5 phút)</span>
          {reportsSummary.unreadMissedCount > 0 && (
            <span className="vps-tab-badge vps-tab-badge--danger">{reportsSummary.unreadMissedCount}</span>
          )}
        </button>

        <button
          type="button"
          className={`vps-report-tab ${tab === "RATINGS" ? "active" : ""}`}
          onClick={() => setTab("RATINGS")}
        >
          <Star size={15} />
          <span>Đánh giá CSKH (1–5 sao)</span>
          {reportsSummary.pendingLowRatingsCount > 0 && (
            <span className="vps-tab-badge vps-tab-badge--warn">{reportsSummary.pendingLowRatingsCount}</span>
          )}
        </button>

        <button
          type="button"
          className={`vps-report-tab ${tab === "SETTINGS" ? "active" : ""}`}
          onClick={() => setTab("SETTINGS")}
        >
          <Settings size={15} />
          <span>Cấu hình AI & Thời gian chờ</span>
        </button>
      </div>

      {loading ? (
        <div className="vps-report-card" style={{ textAlign: "center", padding: "3rem" }}>
          <Loader2 size={24} className="vps-adm-spin" /> Đang tải dữ liệu báo cáo…
        </div>
      ) : tab === "MISSED" ? (
        <div className="vps-report-card">
          <div className="vps-report-toolbar">
            <h2>Danh sách yêu cầu kết nối bị bỏ lỡ quá 5 phút</h2>
            <label className="vps-checkbox-label">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
              />
              <span>Chỉ hiện mục chưa đọc</span>
            </label>
          </div>

          {missedReports.length === 0 ? (
            <p className="vps-empty-note-lg">Không có báo cáo bỏ lỡ nào khớp bộ lọc.</p>
          ) : (
            <div className="vps-table-scroll">
              <table className="vps-report-table">
                <thead>
                  <tr>
                    <th>Cơ sở lưu trú</th>
                    <th>Quản lý phụ trách</th>
                    <th>Khách hàng</th>
                    <th>Yêu cầu lúc</th>
                    <th>Hết hạn (5 phút)</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {missedReports.map((r) => (
                    <tr key={r.id} className={!r.adminReadAt ? "unread-row" : ""}>
                      <td>
                        <strong>{r.accommodationName}</strong>
                      </td>
                      <td>
                        <div>{r.managerName || "Chưa gán"}</div>
                        <small>{r.managerPersonalEmail || r.managerInternalEmail}</small>
                      </td>
                      <td>{r.requesterType}</td>
                      <td>{formatFullDateTime(r.requestedAt)}</td>
                      <td>{formatFullDateTime(r.expiredAt)}</td>
                      <td>
                        {r.adminReadAt ? (
                          <span className="vps-status-pill ok">Đã xác nhận</span>
                        ) : (
                          <span className="vps-status-pill danger">Chưa đọc</span>
                        )}
                      </td>
                      <td>
                        {!r.adminReadAt && (
                          <button
                            type="button"
                            className="btn-primary btn-sm"
                            onClick={() => handleAckMissed(r.id)}
                          >
                            <Check size={14} /> Đánh dấu đã xem
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : tab === "RATINGS" ? (
        <div className="vps-report-card">
          <div className="vps-report-toolbar">
            <h2>Đánh giá của khách hàng sau khi Quản lý hỗ trợ</h2>
            <div className="vps-filter-pills">
              {[
                { key: "ALL", label: "Tất cả" },
                { key: "PENDING_REVIEW", label: "Chờ duyệt (1–3★)" },
                { key: "CONFIRMED_VIOLATION", label: "Vi phạm" },
                { key: "DISMISSED", label: "Đã bỏ qua" },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`vps-filter-pill ${ratingStatusFilter === s.key ? "active" : ""}`}
                  onClick={() => setRatingStatusFilter(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {ratings.length === 0 ? (
            <p className="vps-empty-note-lg">Chưa có đánh giá nào.</p>
          ) : (
            <div className="vps-table-scroll">
              <table className="vps-report-table">
                <thead>
                  <tr>
                    <th>Đánh giá</th>
                    <th>Khách hàng & Nhận xét</th>
                    <th>Cơ sở & Quản lý</th>
                    <th>Kiểm duyệt</th>
                    <th>Email cảnh báo</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {ratings.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="vps-stars-inline">
                          <Star size={14} fill="#F5B82E" color="#F5B82E" />
                          <strong>{r.rating}/5</strong>
                        </div>
                        <small>{formatFullDateTime(r.createdAt)}</small>
                      </td>
                      <td>
                        <div>
                          <strong>{r.customerName}</strong>
                        </div>
                        <small>{r.comment || "(Không để lại bình luận)"}</small>
                      </td>
                      <td>
                        <div>{r.accommodationName}</div>
                        <small>QL: {r.managerName || "N/A"}</small>
                      </td>
                      <td>
                        <span
                          className={`vps-status-pill ${
                            r.adminReviewStatus === "CONFIRMED_VIOLATION"
                              ? "danger"
                              : r.adminReviewStatus === "PENDING_REVIEW"
                                ? "warn"
                                : "ok"
                          }`}
                        >
                          {r.adminReviewStatus}
                        </span>
                      </td>
                      <td>
                        {r.latestWarningStatus ? (
                          <span className="vps-status-pill ok">{r.latestWarningStatus}</span>
                        ) : (
                          <small>Chưa gửi</small>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {r.adminReviewStatus === "PENDING_REVIEW" && (
                            <>
                              <button
                                type="button"
                                className="vps-btn-danger-sm"
                                onClick={() => handleReviewRating(r.id, "CONFIRMED_VIOLATION")}
                              >
                                <AlertTriangle size={13} /> Xác nhận vi phạm
                              </button>
                              <button
                                type="button"
                                className="vps-btn-outline"
                                onClick={() => handleReviewRating(r.id, "DISMISSED")}
                              >
                                <XCircle size={13} /> Bỏ qua
                              </button>
                            </>
                          )}
                          {r.rating <= 3 && (
                            <button
                              type="button"
                              className="btn-primary btn-sm"
                              onClick={() => {
                                setEmailTarget(r);
                                setEmailNote("");
                              }}
                            >
                              <Mail size={13} /> Gửi email nhắc nhở
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <form className="vps-report-card vps-settings-form" onSubmit={handleSaveSettings}>
          <h2>Cấu hình Hỗ trợ Chat & AI Toàn Hệ Thống</h2>
          <label className="vps-checkbox-label">
            <input
              type="checkbox"
              checked={globalSettingsForm.aiEnabled}
              onChange={(e) => setGlobalSettingsForm((s) => ({ ...s, aiEnabled: e.target.checked }))}
            />
            <span>Bật Trợ lý ảo AI VietPeace Stay (Gemini)</span>
          </label>
          <label className="vps-checkbox-label">
            <input
              type="checkbox"
              checked={globalSettingsForm.humanHandoffEnabled}
              onChange={(e) =>
                setGlobalSettingsForm((s) => ({ ...s, humanHandoffEnabled: e.target.checked }))
              }
            />
            <span>Cho phép khách chủ động yêu cầu kết nối Quản lý cơ sở</span>
          </label>
          <div className="vps-form-field">
            <label htmlFor="claim-timeout">Thời gian chờ Quản lý tiếp nhận (giây, mặc định 300s = 5 phút)</label>
            <input
              id="claim-timeout"
              type="number"
              min={30}
              max={3600}
              value={globalSettingsForm.claimTimeoutSeconds}
              onChange={(e) =>
                setGlobalSettingsForm((s) => ({ ...s, claimTimeoutSeconds: Number(e.target.value) }))
              }
            />
          </div>
          <div className="vps-form-field">
            <label htmlFor="offline-msg">Lời nhắn mặc định khi cơ sở tắt chat trực tiếp</label>
            <textarea
              id="offline-msg"
              rows={3}
              value={globalSettingsForm.offlineMessage}
              onChange={(e) => setGlobalSettingsForm((s) => ({ ...s, offlineMessage: e.target.value }))}
            />
          </div>
          <button type="submit" className="btn-primary">
            <CheckCircle2 size={16} /> Lưu cấu hình
          </button>
        </form>
      )}

      {/* Warning Email Modal */}
      {emailTarget && (
        <div className="vps-modal-backdrop" role="presentation">
          <div className="vps-modal" role="dialog" aria-modal="true" aria-labelledby="vps-warn-title">
            <h3 id="vps-warn-title">Gửi Email nhắc nhở CSKH tới Quản lý</h3>
            <p>
              Cơ sở: <b>{emailTarget.accommodationName}</b> · Quản lý:{" "}
              <b>{emailTarget.managerName}</b> ({emailTarget.managerPersonalEmail || emailTarget.managerInternalEmail})
            </p>
            <form onSubmit={handleSendWarningEmail}>
              <textarea
                rows={4}
                placeholder="Nhập ghi chú nhắc nhở gửi kèm cho Quản lý (tùy chọn)…"
                value={emailNote}
                onChange={(e) => setEmailNote(e.target.value)}
              />
              <div className="vps-modal-actions">
                <button
                  type="button"
                  className="vps-btn-outline"
                  onClick={() => setEmailTarget(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={sendingEmail}>
                  {sendingEmail ? "Đang gửi…" : "Xác nhận gửi Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
