import { Fragment, useEffect, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Lock,
  Mail,
  MessageSquareText,
  Settings,
  ShieldAlert,
  Sparkles,
  Star,
  X,
  XCircle,
} from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { adminChatClient } from "./ChatClient";
import ChatNavigation from "./ChatNavigation";
import { useAdminChat } from "./ChatContext";
import {
  formatFullDateTime,
  formatShortClock,
  getDaySeparatorLabel,
  groupChatMessages,
} from "./chatUtils";
import "./chat.css";

const REVIEW_STATUS_META = {
  PENDING_REVIEW: { label: "Chờ duyệt", tone: "warn" },
  CONFIRMED_VIOLATION: { label: "Vi phạm CSKH", tone: "danger" },
  DISMISSED: { label: "Đã bỏ qua", tone: "muted" },
};

const WARNING_STATUS_META = {
  SENT: { label: "Đã gửi cảnh báo", tone: "ok" },
  FAILED: { label: "Gửi thất bại", tone: "danger" },
  SENDING: { label: "Đang gửi…", tone: "warn" },
};

function getManagerRecipientEmail(rating) {
  return String(rating?.managerPersonalEmail || rating?.managerInternalEmail || "").trim();
}

function getTranscriptSenderKey(msg) {
  return `${msg?.senderType || "UNKNOWN"}:${msg?.visibility || "PUBLIC"}:${msg?.senderUserId || ""}`;
}

function buildWarningEmailDraft(rating, reviewNoteOverride = "") {
  const managerName = rating?.managerName || "Quản lý cơ sở";
  const accommodationName = rating?.accommodationName || "Cơ sở lưu trú";
  const customerName = rating?.customerName || "Khách hàng";
  const recipientEmail = getManagerRecipientEmail(rating);
  const noteText = String(reviewNoteOverride || rating?.reviewNote || "").trim();
  const score = Number(rating?.rating || 1);

  const subject = `[VietPeace Stay CSKH] Cảnh cáo thái độ & chất lượng tư vấn (${score}/5★) — ${accommodationName}`;
  const bodyLines = [
    `Kính gửi Quản lý ${managerName}${recipientEmail ? ` (${recipientEmail})` : ""},`,
    ``,
    `Ban Quản trị VietPeace Stay xin gửi thư cảnh cáo và nhắc nhở nghiêm túc về hành vi, thái độ chăm sóc khách hàng (CSKH) chưa đạt chuẩn tại cơ sở "${accommodationName}".`,
    ``,
    `Thông tin phiên tư vấn bị đánh giá thấp:`,
    `- Khách hàng: ${customerName}`,
    `- Mức đánh giá: ${score}/5★`,
    `- Thời gian ghi nhận: ${formatFullDateTime(rating?.createdAt)}`,
    `- Nhận xét của khách hàng: ${
      rating?.comment ? `"${rating.comment}"` : "(Khách hàng đánh giá thấp nhưng không để lại nhận xét chi tiết)"
    }`,
    ...(noteText ? [`- Ghi chú kiểm duyệt của Admin: ${noteText}`] : []),
    ``,
    `Hành vi tư vấn thiếu chuẩn mực hoặc hỗ trợ chưa tận tâm làm ảnh hưởng trực tiếp đến trải nghiệm khách hàng và uy tín của hệ thống VietPeace Stay. Yêu cầu Anh/Chị rà soát lại đoạn hội thoại trên, nghiêm túc rút kinh nghiệm và chấn chỉnh ngay thái độ phục vụ, cách giao tiếp cũng như tốc độ phản hồi trong các phiên tư vấn tiếp theo.`,
    ``,
    `Nếu tiếp tục phát sinh phản ánh hoặc đánh giá tiêu cực tương tự, Ban Quản trị sẽ xem xét áp dụng các biện pháp xử lý theo quy chế vận hành hệ thống.`,
    ``,
    `Trân trọng,`,
    `Ban Quản trị VietPeace Stay`,
  ];

  return { subject: subject.replace(/[\r\n]+/g, " ").slice(0, 240), body: bodyLines.join("\n").slice(0, 4000), recipientEmail };
}

function buildGmailComposeUrl(to, subject, body) {
  if (!to) return "";
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to,
    su: subject || "",
    body: body || "",
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

function buildMailtoHref(to, subject, body) {
  if (!to) return "";
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject || "")}&body=${encodeURIComponent(
    body || "",
  )}`;
}

export default function ChatReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useAdmin() || {};
  const { isAdmin, reportsSummary, refreshReportsSummary, reportsRefreshTick } = useAdminChat();

  const rawTab = String(searchParams.get("tab") || "MISSED").toUpperCase();
  const tab = ["MISSED", "RATINGS", "SETTINGS"].includes(rawTab) ? rawTab : "MISSED";
  const setTab = (nextTab) => setSearchParams({ tab: nextTab }, { replace: true });
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [missedReports, setMissedReports] = useState([]);
  const [ratingStatusFilter, setRatingStatusFilter] = useState("ACTIVE");
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(Boolean(isAdmin));
  const [ratingsHaveMore, setRatingsHaveMore] = useState(false);
  const [missedHaveMore, setMissedHaveMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState("");
  const reportsRequestRef = useRef(0);
  const loadingMoreRef = useRef("");
  const settingsDirtyRef = useRef(false);

  const transcriptDialogRef = useRef(null);
  const warningDialogRef = useRef(null);
  const transcriptStreamRef = useRef(null);
  const transcriptRequestRef = useRef(0);
  const sendingEmailRef = useRef(false);

  const [transcriptTarget, setTranscriptTarget] = useState(null);
  const [transcriptMessages, setTranscriptMessages] = useState([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState("");
  const [reviewNoteInput, setReviewNoteInput] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState("");

  const [emailTarget, setEmailTarget] = useState(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
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
    const requestId = ++reportsRequestRef.current;
    async function loadAll() {
      await Promise.resolve();
      if (!alive) return;
      setLoading(true);
      loadingMoreRef.current = "";
      setLoadingMore("");
      try {
        const [missedRes, ratingsRes, settingsRes] = await Promise.all([
          adminChatClient.listMissedHandoffs({ unreadOnly }),
          adminChatClient.listRatings(ratingStatusFilter),
          adminChatClient.getSettings(),
          refreshReportsSummary().catch(() => null),
        ]);
        if (!alive) return;
        setMissedReports(missedRes.items || []);
        setRatings(ratingsRes.items || []);
        setMissedHaveMore((missedRes.items || []).length === 50);
        setRatingsHaveMore((ratingsRes.items || []).length === 50);
        const sItems = settingsRes.items || [];
        const globalRow = sItems.find((x) => !x.accommodationId) || sItems[0];
        if (globalRow && !settingsDirtyRef.current) {
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
      if (reportsRequestRef.current === requestId) reportsRequestRef.current += 1;
    };
  }, [isAdmin, unreadOnly, ratingStatusFilter, reportsRefreshTick, refreshReportsSummary, showToast]);

  useEffect(() => () => { transcriptRequestRef.current += 1; }, []);

  async function loadMoreReports(kind) {
    if (loadingMoreRef.current) return;
    const requestId = reportsRequestRef.current;
    loadingMoreRef.current = kind;
    setLoadingMore(kind);
    try {
      const res = kind === "RATINGS"
        ? await adminChatClient.listRatings(ratingStatusFilter, { offset: ratings.length })
        : await adminChatClient.listMissedHandoffs({ unreadOnly, offset: missedReports.length });
      if (requestId !== reportsRequestRef.current) return;
      const items = res.items || [];
      const append = (prev) => {
        const existing = new Set(prev.map((r) => Number(r.id)));
        return [...prev, ...items.filter((r) => !existing.has(Number(r.id)))];
      };
      if (kind === "RATINGS") { setRatings(append); setRatingsHaveMore(items.length === 50); }
      else { setMissedReports(append); setMissedHaveMore(items.length === 50); }
    } catch (err) {
      if (requestId === reportsRequestRef.current) showToast?.(err.message || "Không tải được trang báo cáo tiếp theo.", "error");
    } finally {
      if (requestId === reportsRequestRef.current) { loadingMoreRef.current = ""; setLoadingMore(""); }
    }
  }

  // Sync native top-layer modal <dialog> elements with React state
  useEffect(() => {
    const dlg = transcriptDialogRef.current;
    if (!dlg) return;
    if (transcriptTarget && !dlg.open) {
      dlg.showModal();
    } else if (!transcriptTarget && dlg.open) {
      dlg.close();
    }
  }, [transcriptTarget]);

  useEffect(() => {
    const dlg = warningDialogRef.current;
    if (!dlg) return;
    if (emailTarget && !dlg.open) {
      dlg.showModal();
    } else if (!emailTarget && dlg.open) {
      dlg.close();
    }
  }, [emailTarget]);

  useEffect(() => {
    if (!transcriptTarget || transcriptLoading || transcriptMessages.length === 0) return;
    const container = transcriptStreamRef.current;
    if (!container) return;
    const highlighted = container.querySelector(".vps-transcript-in-handoff");
    if (highlighted) {
      highlighted.scrollIntoView({ block: "center" });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, [transcriptTarget, transcriptLoading, transcriptMessages]);

  async function handleAckMissed(id) {
    try {
      const res = await adminChatClient.ackMissedHandoff(id);
      setMissedReports((prev) =>
        unreadOnly ? prev.filter((r) => Number(r.id) !== Number(id))
          : prev.map((r) => (Number(r.id) === Number(id) ? { ...r, adminReadAt: res.adminReadAt } : r)),
      );
      await refreshReportsSummary().catch(() => null);
      showToast?.("Đã đánh dấu xác nhận báo cáo bỏ lỡ.", "success");
    } catch (err) {
      showToast?.(err.message || "Không thể xác nhận báo cáo.", "error");
    }
  }

  async function fetchTranscriptMessages(conversationId) {
    const requestId = ++transcriptRequestRef.current;
    setTranscriptLoading(true);
    setTranscriptError("");
    try {
      const messages = [];
      let beforeSequence = null;
      // History endpoints cap each page at 100. Fetch older pages so the
      // rated handoff remains available even in a long, ongoing conversation.
      while (requestId === transcriptRequestRef.current) {
        const res = await adminChatClient.getMessages(conversationId, { limit: 100, beforeSequence });
        if (requestId !== transcriptRequestRef.current) return;
        const items = res.items || [];
        messages.unshift(...items);
        if (items.length < 100) break;
        const oldest = Math.min(...items.map((m) => Number(m.sequence)));
        if (!Number.isSafeInteger(oldest) || oldest < 1 || (beforeSequence && oldest >= beforeSequence)) {
          throw new Error("Không thể tải tiếp lịch sử hội thoại.");
        }
        beforeSequence = oldest;
      }
      if (requestId === transcriptRequestRef.current) setTranscriptMessages(messages);
    } catch (err) {
      if (requestId === transcriptRequestRef.current) setTranscriptError(err.message || "Không tải được lịch sử đoạn tin nhắn.");
    } finally {
      if (requestId === transcriptRequestRef.current) setTranscriptLoading(false);
    }
  }

  function handleOpenTranscript(rating) {
    setTranscriptTarget(rating);
    setReviewNoteInput(rating.reviewNote || "");
    setTranscriptMessages([]);
    setTranscriptError("");
    fetchTranscriptMessages(rating.conversationId);
  }

  function handleCloseTranscript() {
    transcriptRequestRef.current += 1;
    if (transcriptDialogRef.current?.open) {
      transcriptDialogRef.current.close();
    }
    setTranscriptTarget(null);
  }

  async function handleReviewFromTranscript(decision) {
    if (!transcriptTarget) return;
    setReviewSubmitting(decision);
    try {
      const cleanNote = reviewNoteInput.trim();
      const res = await adminChatClient.reviewRating(transcriptTarget.id, {
        decision,
        reviewNote: cleanNote,
      });

      const updatedFields = {
        adminReviewStatus: res.adminReviewStatus,
        reviewNote: cleanNote || null,
        reviewedAt: res.reviewedAt,
      };

      setRatings((prev) => {
        if (decision === "DISMISSED" && ["ACTIVE", "PENDING_REVIEW"].includes(ratingStatusFilter)) {
          return prev.filter((item) => Number(item.id) !== Number(transcriptTarget.id));
        }
        if (decision === "CONFIRMED_VIOLATION" && ratingStatusFilter === "PENDING_REVIEW") {
          return prev.filter((item) => Number(item.id) !== Number(transcriptTarget.id));
        }
        return prev.map((item) =>
          Number(item.id) === Number(transcriptTarget.id) ? { ...item, ...updatedFields } : item,
        );
      });

      await refreshReportsSummary().catch(() => null);

      if (decision === "DISMISSED") {
        handleCloseTranscript();
        showToast?.("Đã bỏ qua — đánh giá này đã được đưa ra khỏi mục báo cáo CSKH.", "success");
      } else {
        setTranscriptTarget((prev) => (Number(prev?.id) === Number(transcriptTarget.id) ? { ...prev, ...updatedFields } : prev));
        showToast?.("Đã xác nhận vi phạm CSKH. Bạn có thể chọn Gửi Gmail cảnh cáo.", "success");
      }
    } catch (err) {
      showToast?.(err.message || "Không thể cập nhật kiểm duyệt đánh giá.", "error");
    } finally {
      setReviewSubmitting("");
    }
  }

  function openWarningEmailModal(rating, noteOverride = "") {
    if (sendingEmailRef.current) return;
    transcriptRequestRef.current += 1;
    if (transcriptDialogRef.current?.open) {
      transcriptDialogRef.current.close();
    }
    const draft = buildWarningEmailDraft(rating, noteOverride);
    setTranscriptTarget(null);
    setEmailTarget(rating);
    setEmailSubject(draft.subject);
    setEmailBody(draft.body);
  }

  function closeWarningEmailModal() {
    if (sendingEmailRef.current) return;
    if (warningDialogRef.current?.open) {
      warningDialogRef.current.close();
    }
    setEmailTarget(null);
  }

  async function handleSendWarningEmail(e) {
    e.preventDefault();
    if (!emailTarget || sendingEmailRef.current) return;
    if (!emailSubject.trim() || !emailBody.trim()) {
      showToast?.("Vui lòng nhập tiêu đề và nội dung email.", "error");
      return;
    }
    sendingEmailRef.current = true;
    setSendingEmail(true);
    try {
      const res = await adminChatClient.sendWarningEmail(emailTarget.id, {
        subject: emailSubject.trim(),
        emailBody: emailBody.trim(),
        adminNote: emailTarget.reviewNote || undefined,
      });
      const nextWarningStatus = res.status || "SENT";
      setRatings((prev) => {
        if (nextWarningStatus === "SENT" && ratingStatusFilter === "ACTIVE") {
          return prev.filter((r) => Number(r.id) !== Number(emailTarget.id));
        }
        return prev.map((r) =>
          Number(r.id) === Number(emailTarget.id)
            ? {
                ...r,
                adminReviewStatus:
                  r.adminReviewStatus === "PENDING_REVIEW" ? "CONFIRMED_VIOLATION" : r.adminReviewStatus,
                latestWarningStatus: nextWarningStatus,
                latestWarningSentAt: new Date().toISOString(),
              }
            : r,
        );
      });
      await refreshReportsSummary().catch(() => null);
      sendingEmailRef.current = false;
      closeWarningEmailModal();
      setEmailSubject("");
      setEmailBody("");
      showToast?.(
        res.method === "smtp"
          ? `Đã gửi Gmail cảnh cáo tới ${res.recipientEmail} và lưu vào mục Vi phạm CSKH.`
          : `Đã ghi nhận gửi cảnh báo tới ${res.recipientEmail} và lưu vào mục Vi phạm CSKH.`,
        "success",
      );
    } catch (err) {
      if (err.errorCode === "EMAIL_SEND_FAILED") {
        setRatings((prev) => prev.map((r) => Number(r.id) === Number(emailTarget.id)
          ? { ...r, adminReviewStatus: "CONFIRMED_VIOLATION", latestWarningStatus: "FAILED", latestWarningSentAt: null, latestWarningError: err.message }
          : r));
        await refreshReportsSummary().catch(() => null);
      }
      showToast?.(err.message || "Gửi email cảnh báo thất bại.", "error");
    } finally {
      sendingEmailRef.current = false;
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
      settingsDirtyRef.current = false;
      showToast?.("Đã lưu cấu hình AI & Timeout toàn hệ thống.", "success");
    } catch (err) {
      showToast?.(err.message || "Không thể lưu cấu hình.", "error");
    }
  }

  // Strict defensive UI block for Manager (backend also returns 403 ADMIN_ONLY)
  if (!isAdmin) {
    return <Navigate to="/admin/chat" replace />;
  }

  const displayedRatings =
    ratingStatusFilter === "ACTIVE"
      ? ratings.filter((r) => !(r.adminReviewStatus === "CONFIRMED_VIOLATION" && r.latestWarningStatus === "SENT"))
      : ratings;

  const targetManagerEmail = getManagerRecipientEmail(emailTarget);
  const gmailComposeUrl = buildGmailComposeUrl(targetManagerEmail, emailSubject, emailBody);
  const mailtoHref = buildMailtoHref(targetManagerEmail, emailSubject, emailBody);

  const handoffStartMs = transcriptTarget?.handoffRequestedAt
    ? new Date(transcriptTarget.handoffRequestedAt).getTime()
    : null;
  const handoffEndMs = transcriptTarget?.handoffClosedAt
    ? new Date(transcriptTarget.handoffClosedAt).getTime()
    : transcriptTarget?.createdAt
      ? new Date(transcriptTarget.createdAt).getTime()
      : null;

  return (
    <div className="vps-admin-chat-page">
      <div className="vps-admin-chat-topbar">
        <div className="vps-admin-chat-heading">
          <h1 className="page-title">
            Báo cáo Chat &amp; Chất lượng CSKH
          </h1>
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
          <div className="vps-kpi-label">Đánh giá CSKH (1★-3★) chờ duyệt</div>
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
          <span>Đánh giá CSKH (1★-3★)</span>
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
          <span>Cấu hình AI &amp; Thời gian chờ</span>
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
                            className="btn btn-primary btn-sm"
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
            <h2>Báo cáo đánh giá CSKH thấp (1★-3★)</h2>
            <div className="vps-filter-pills">
              {[
                { key: "ACTIVE", label: "Cần xử lý" },
                { key: "PENDING_REVIEW", label: "Chờ duyệt" },
                { key: "CONFIRMED_VIOLATION", label: "Vi phạm CSKH" },
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

          {displayedRatings.length === 0 ? (
            <p className="vps-empty-note-lg">Không có đánh giá CSKH (1★-3★) nào trong mục này.</p>
          ) : (
            <div className="vps-table-scroll">
              <table className="vps-report-table">
                <thead>
                  <tr>
                    <th>Đánh giá (1★-3★)</th>
                    <th>Khách hàng &amp; Nhận xét</th>
                    <th>Cơ sở &amp; Quản lý</th>
                    <th>Kiểm duyệt</th>
                    <th>Email cảnh báo</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRatings.map((r) => {
                    const reviewMeta = REVIEW_STATUS_META[r.adminReviewStatus] || {
                      label: r.adminReviewStatus,
                      tone: "muted",
                    };
                    const warningMeta = r.latestWarningStatus
                      ? WARNING_STATUS_META[r.latestWarningStatus] || {
                          label: r.latestWarningStatus,
                          tone: "ok",
                        }
                      : null;
                    const mgrEmail = getManagerRecipientEmail(r);

                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="vps-rating-cell">
                            <div className="vps-rating-stars-row" aria-label={`${r.rating} trên 5 sao`}>
                              {Array.from({ length: 5 }, (_, idx) => (
                                <Star
                                  key={idx}
                                  size={13}
                                  fill={idx < r.rating ? "#F5B82E" : "none"}
                                  color={idx < r.rating ? "#F5B82E" : "#CBD5E1"}
                                />
                              ))}
                              <strong>{r.rating}/5</strong>
                            </div>
                            <small className="vps-rating-time">{formatFullDateTime(r.createdAt)}</small>
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong>{r.customerName}</strong>
                          </div>
                          <small>{r.comment || "(Không để lại bình luận)"}</small>
                        </td>
                        <td>
                          <div>
                            <strong>{r.accommodationName}</strong>
                          </div>
                          <small className="vps-block-sub">QL: {r.managerName || "N/A"}</small>
                          {mgrEmail && <small className="vps-block-sub vps-email-hint">{mgrEmail}</small>}
                        </td>
                        <td>
                          <span className={`vps-status-pill ${reviewMeta.tone}`}>{reviewMeta.label}</span>
                        </td>
                        <td>
                          {warningMeta ? (
                            <div className="vps-warning-cell">
                              <span className={`vps-status-pill ${warningMeta.tone}`}>{warningMeta.label}</span>
                              {r.latestWarningSentAt && (
                                <small>{formatFullDateTime(r.latestWarningSentAt)}</small>
                              )}
                            </div>
                          ) : (
                            <small className="vps-muted-inline">Chưa gửi</small>
                          )}
                        </td>
                        <td>
                          <div className="vps-row-actions">
                            <button
                              type="button"
                              className={r.adminReviewStatus === "PENDING_REVIEW" ? "btn btn-primary btn-sm" : "vps-btn-outline"}
                              onClick={() => handleOpenTranscript(r)}
                            >
                              <MessageSquareText size={14} /> Xem tin nhắn
                            </button>

                            {r.adminReviewStatus === "CONFIRMED_VIOLATION" && (
                              <button
                                type="button"
                                className={r.latestWarningStatus === "SENT" ? "vps-btn-outline" : "vps-btn-danger-sm"}
                                onClick={() => openWarningEmailModal(r)}
                              >
                                <Mail size={14} />{" "}
                                {r.latestWarningStatus === "SENT" ? "Gửi lại Gmail cảnh cáo" : "Gửi Gmail cảnh cáo"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <form className="vps-report-card vps-settings-form" onSubmit={handleSaveSettings} onChange={() => { settingsDirtyRef.current = true; }}>
          <h2>Cấu hình Hỗ trợ Chat &amp; AI Toàn Hệ Thống</h2>
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
          <button type="submit" className="btn btn-primary">
            <CheckCircle2 size={16} /> Lưu cấu hình
          </button>
        </form>
      )}

      {!loading && ((tab === "RATINGS" && ratingsHaveMore) || (tab === "MISSED" && missedHaveMore)) && (
        <button type="button" className="vps-btn-outline" disabled={Boolean(loadingMore)} onClick={() => loadMoreReports(tab)}>
          {loadingMore ? "Đang tải…" : tab === "RATINGS" ? "Xem thêm đánh giá" : "Xem thêm báo cáo bỏ lỡ"}
        </button>
      )}

      {/* Transcript Review Dialog (Native modal <dialog>) */}
      <dialog
        ref={transcriptDialogRef}
        id="vps-transcript-dialog"
        className="vps-native-dialog vps-native-dialog--wide"
        aria-labelledby="vps-transcript-title"
        onCancel={(event) => { if (reviewSubmitting) event.preventDefault(); }}
        onClose={() => { if (!transcriptDialogRef.current?.open) handleCloseTranscript(); }}
      >
        {transcriptTarget && (
          <div className="vps-dialog-shell">
            <div className="vps-dialog-head">
              <div>
                <h2 id="vps-transcript-title">Xem lại đoạn tin nhắn Quản lý &amp; Khách hàng</h2>
                <p className="vps-dialog-sub">
                  Cơ sở: <strong>{transcriptTarget.accommodationName}</strong> · Khách:{" "}
                  <strong>{transcriptTarget.customerName}</strong> · Quản lý:{" "}
                  <strong>{transcriptTarget.managerName || "N/A"}</strong>
                  {getManagerRecipientEmail(transcriptTarget) && (
                    <>
                      {" "}
                      (
                      <a
                        href={`mailto:${encodeURIComponent(getManagerRecipientEmail(transcriptTarget))}`}
                        className="vps-inline-mailto"
                      >
                        {getManagerRecipientEmail(transcriptTarget)}
                      </a>
                      )
                    </>
                  )}
                </p>
              </div>
              <button
                type="button"
                className="vps-dialog-close-btn"
                aria-label="Đóng hộp thoại xem tin nhắn"
                autoFocus
                onClick={handleCloseTranscript}
                disabled={Boolean(reviewSubmitting)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="vps-transcript-rating-banner">
              <div className="vps-rating-stars-row">
                {Array.from({ length: 5 }, (_, idx) => (
                  <Star
                    key={idx}
                    size={14}
                    fill={idx < transcriptTarget.rating ? "#F5B82E" : "none"}
                    color={idx < transcriptTarget.rating ? "#F5B82E" : "#CBD5E1"}
                  />
                ))}
                <strong>{transcriptTarget.rating}/5★</strong>
                <span className={`vps-status-pill ${(REVIEW_STATUS_META[transcriptTarget.adminReviewStatus] || {}).tone || "muted"}`}>
                  {(REVIEW_STATUS_META[transcriptTarget.adminReviewStatus] || {}).label ||
                    transcriptTarget.adminReviewStatus}
                </span>
              </div>
              <div className="vps-transcript-comment">
                <strong>Nhận xét khách hàng:</strong>{" "}
                {transcriptTarget.comment || "(Khách hàng không để lại bình luận)"}
              </div>
            </div>

            <div className="vps-transcript-stream" ref={transcriptStreamRef}>
              {transcriptLoading ? (
                <div className="vps-transcript-state">
                  <Loader2 size={20} className="vps-adm-spin" /> Đang tải lịch sử đoạn hội thoại…
                </div>
              ) : transcriptError ? (
                <div className="vps-transcript-state vps-transcript-error">
                  <p>{transcriptError}</p>
                  <button
                    type="button"
                    className="vps-btn-outline"
                    onClick={() => fetchTranscriptMessages(transcriptTarget.conversationId)}
                  >
                    Thử tải lại
                  </button>
                </div>
              ) : transcriptMessages.length === 0 ? (
                <div className="vps-transcript-state">Chưa có tin nhắn nào trong hội thoại này.</div>
              ) : (
                groupChatMessages(
                  transcriptMessages,
                  getTranscriptSenderKey,
                  (prevMsg, currMsg) => {
                    const isPrevInHandoff = prevMsg.handoffId
                      ? Number(prevMsg.handoffId) === Number(transcriptTarget.handoffId)
                      : Boolean(handoffStartMs && handoffEndMs) &&
                        new Date(prevMsg.createdAt).getTime() >= handoffStartMs &&
                        new Date(prevMsg.createdAt).getTime() <= handoffEndMs;
                    const isCurrInHandoff = currMsg.handoffId
                      ? Number(currMsg.handoffId) === Number(transcriptTarget.handoffId)
                      : Boolean(handoffStartMs && handoffEndMs) &&
                        new Date(currMsg.createdAt).getTime() >= handoffStartMs &&
                        new Date(currMsg.createdAt).getTime() <= handoffEndMs;
                    return isPrevInHandoff === isCurrInHandoff;
                  },
                ).map((entry) => {
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
                  const isStaffNote = firstMsg.visibility === "STAFF";
                  const isManagerMsg = firstMsg.senderType === "MANAGER";
                  const isCustomerMsg = firstMsg.senderType === "CUSTOMER" || firstMsg.senderType === "GUEST";
                  const isAiMsg = !isStaffNote && !isManagerMsg && !isCustomerMsg;

                  const msgTs = firstMsg.createdAt ? new Date(firstMsg.createdAt).getTime() : 0;
                  const isInRatedHandoff = firstMsg.handoffId
                    ? Number(firstMsg.handoffId) === Number(transcriptTarget.handoffId)
                    : Boolean(handoffStartMs && handoffEndMs) && msgTs >= handoffStartMs && msgTs <= handoffEndMs;

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
                        } ${isInRatedHandoff ? "vps-transcript-in-handoff" : ""}`}
                      >
                        <div className="vps-adm-msg-meta">
                          {isStaffNote ? (
                            <span className="vps-adm-note-badge">
                              <Lock size={10} aria-hidden="true" />
                              Ghi chú nội bộ
                            </span>
                          ) : isAiMsg ? (
                            <span className="vps-adm-ai-badge">
                              <Sparkles size={10} aria-hidden="true" />
                              Trợ lý AI
                            </span>
                          ) : (
                            <strong>
                              {isManagerMsg
                                ? `Quản lý (${firstMsg.senderName || (String(firstMsg.senderUserId || "").toLowerCase() === String(transcriptTarget.managerUserId || "").toLowerCase() ? transcriptTarget.managerName : null) || "CSKH"})`
                                : transcriptTarget.customerName || "Khách hàng"}
                            </strong>
                          )}
                          {isInRatedHandoff && (
                            <span className="vps-handoff-hit-tag">Phiên được đánh giá</span>
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
                              <div className="vps-adm-msg-text">{item.content}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Fragment>
                  );
                })
              )}
            </div>

            <div className="vps-dialog-footer">
              {transcriptTarget.adminReviewStatus === "PENDING_REVIEW" ? (
                <>
                  <div className="vps-form-field">
                    <label htmlFor="vps-review-note">Ghi chú kiểm duyệt của Admin (tùy chọn)</label>
                    <input
                      id="vps-review-note"
                      type="text"
                      placeholder="Ví dụ: Quản lý trả lời thiếu tôn trọng / phản hồi quá chậm…"
                      value={reviewNoteInput}
                      maxLength={950}
                      onChange={(e) => setReviewNoteInput(e.target.value)}
                    />
                  </div>
                  <div className="vps-dialog-actions-row">
                    <button
                      type="button"
                      className="vps-btn-outline"
                      disabled={Boolean(reviewSubmitting)}
                      onClick={() => handleReviewFromTranscript("DISMISSED")}
                    >
                      <XCircle size={15} />
                      {reviewSubmitting === "DISMISSED" ? "Đang bỏ qua…" : "Bỏ qua & Rời báo cáo"}
                    </button>
                    <button
                      type="button"
                      className="vps-btn-danger-md"
                      disabled={Boolean(reviewSubmitting)}
                      onClick={() => handleReviewFromTranscript("CONFIRMED_VIOLATION")}
                    >
                      <AlertTriangle size={15} />
                      {reviewSubmitting === "CONFIRMED_VIOLATION" ? "Đang xác nhận…" : "Xác nhận vi phạm"}
                    </button>
                  </div>
                </>
              ) : transcriptTarget.adminReviewStatus === "CONFIRMED_VIOLATION" ? (
                <div className="vps-confirmed-bar">
                  <div className="vps-confirmed-info">
                    <ShieldAlert size={18} />
                    <div>
                      <strong>Đã xác nhận vi phạm CSKH</strong>
                      <p>Bạn có thể mở mẫu soạn sẵn để gửi Gmail cảnh cáo Quản lý cơ sở ngay.</p>
                    </div>
                  </div>
                  <div className="vps-dialog-actions-row">
                    <button type="button" className="vps-btn-outline" onClick={handleCloseTranscript}>
                      Đóng
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => openWarningEmailModal(transcriptTarget, reviewNoteInput)}
                    >
                      <Mail size={15} /> Gửi Gmail cảnh cáo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="vps-dialog-actions-row">
                  <span className="vps-muted-inline" style={{ marginRight: "auto" }}>
                    Đánh giá này đã được bỏ qua và loại khỏi danh sách vi phạm.
                  </span>
                  <button type="button" className="vps-btn-outline" onClick={handleCloseTranscript}>
                    Đóng
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </dialog>

      {/* Warning Gmail Compose Dialog (Native modal <dialog>) */}
      <dialog
        ref={warningDialogRef}
        id="vps-warning-dialog"
        className="vps-native-dialog vps-native-dialog--mail"
        aria-labelledby="vps-warn-title"
        onCancel={(event) => { if (sendingEmailRef.current) event.preventDefault(); }}
        onClose={() => { if (!warningDialogRef.current?.open && !sendingEmailRef.current) setEmailTarget(null); }}
      >
        {emailTarget && (
          <div className="vps-dialog-shell">
            <div className="vps-dialog-head">
              <div>
                <h2 id="vps-warn-title">Soạn &amp; Gửi Gmail cảnh cáo Quản lý (CSKH)</h2>
                <p className="vps-dialog-sub">
                  Nội dung nhắc nhở thái độ CSKH đã được soạn sẵn và liên kết trực tiếp với email Quản lý.
                </p>
              </div>
              <button
                type="button"
                className="vps-dialog-close-btn"
                aria-label="Đóng hộp thoại gửi Gmail cảnh cáo"
                onClick={closeWarningEmailModal}
                disabled={sendingEmail}
              >
                <X size={18} />
              </button>
            </div>

            <div className="vps-mail-recipient-box">
              <div>
                <span className="vps-mail-label">Cơ sở &amp; Quản lý:</span>{" "}
                <strong>{emailTarget.accommodationName}</strong> · <strong>{emailTarget.managerName || "N/A"}</strong>
              </div>
              <div className="vps-mail-to-row">
                <span className="vps-mail-label">Email liên kết của Quản lý:</span>
                {targetManagerEmail ? (
                  <a
                    href={mailtoHref}
                    className="vps-manager-email-link"
                    title="Nhấn để mở ứng dụng Email mặc định tới địa chỉ này"
                  >
                    <Mail size={14} /> {targetManagerEmail}
                  </a>
                ) : (
                  <span className="vps-status-pill danger">Chưa có email Quản lý</span>
                )}
              </div>
            </div>

            <form className="vps-mail-compose-form" onSubmit={handleSendWarningEmail}>
              <div className="vps-form-field">
                <label htmlFor="vps-warn-subject">Tiêu đề Gmail cảnh cáo</label>
                <input
                  id="vps-warn-subject"
                  type="text"
                  required
                  maxLength={240}
                  disabled={sendingEmail}
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>

              <div className="vps-form-field">
                <label htmlFor="vps-warn-body">Nội dung cảnh cáo &amp; nhắc nhở hành vi CSKH</label>
                <textarea
                  id="vps-warn-body"
                  rows={10}
                  autoFocus
                  required
                  maxLength={4000}
                  disabled={sendingEmail}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                />
              </div>

              <div className="vps-modal-actions vps-mail-actions">
                <button type="button" className="vps-btn-outline" onClick={closeWarningEmailModal} disabled={sendingEmail}>
                  Hủy
                </button>
                {targetManagerEmail && (
                  <a
                    href={gmailComposeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vps-btn-gmail"
                  >
                    <ExternalLink size={14} /> Mở soạn sẵn trong Gmail
                  </a>
                )}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sendingEmail || !targetManagerEmail}
                >
                  <Mail size={14} /> {sendingEmail ? "Đang gửi…" : "Gửi cảnh báo qua hệ thống"}
                </button>
              </div>
            </form>
          </div>
        )}
      </dialog>
    </div>
  );
}
