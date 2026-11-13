import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Filter,
  Mail,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import ReportSuiteTabs from '../../components/reports/ReportSuiteTabs.jsx';
import ReportYearSelect from '../../components/reports/ReportYearSelect.jsx';
import FinancialPnlChart from '../../components/reports/FinancialPnlChart.jsx';
import FinancialDetailLedgerModal from '../../components/reports/FinancialDetailLedgerModal.jsx';
import FinancialWarningEmailModal from '../../components/reports/FinancialWarningEmailModal.jsx';
import { financialReportsApi, formatCompactVND } from '../../api/financialReports.js';
import { lookupsApi } from '../../api/lookups.js';
import { formatDateVN, formatVND } from '../../data/mockData.js';

const viCollator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });

const TIER_META = {
  TOP_1: { label: 'Top 1 · 3%', short: 'Top 1' },
  TOP_2: { label: 'Top 2 · 2%', short: 'Top 2' },
  TOP_3: { label: 'Top 3 · 1%', short: 'Top 3' },
  PROFITABLE: { label: 'Có lãi', short: 'Có lãi' },
  LOW_OR_ZERO: { label: 'Lãi mỏng / DT=0', short: 'Cảnh báo vàng' },
  NEGATIVE_LOSS: { label: 'Âm lợi nhuận', short: 'Âm LN' },
};

const PAYMENT_STATUS_META = {
  SUCCESS: { label: 'Thành công', bg: '#DCFCE7', color: '#166534' },
  PARTIALLY_REFUNDED: { label: 'Hoàn một phần', bg: '#FEF3C7', color: '#92400E' },
  REFUNDED: { label: 'Đã hoàn 100%', bg: '#E5E7EB', color: '#374151' },
  REFUND_PROCESSING: { label: 'Chờ hoàn tiền', bg: '#FEE2E2', color: '#991B1B' },
  PROCESSING: { label: 'Đang thanh toán', bg: '#DBEAFE', color: '#1E40AF' },
  PENDING: { label: 'Chờ xử lý', bg: '#FEF9C3', color: '#854D0E' },
  CANCELLED: { label: 'Đã hủy', bg: '#F3F4F6', color: '#4B5563' },
  FAILED: { label: 'Thất bại', bg: '#FEE2E2', color: '#7F1D1D' },
};

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadCsv(filename, rows) {
  const content = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

const VALID_TABS = new Set(['pnl', 'bonus', 'tet', 'payments']);

export default function RevenueReportPage() {
  const { currentLoggedInUser } = useAuth();
  const { showToast } = useAdmin();
  const isAdmin = currentLoggedInUser?.role === 'ADMIN';
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get('tab');
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : 'pnl';
  const tabRefs = useRef({});
  const pnlCaptionId = useId();
  const tetCaptionId = useId();
  const payCaptionId = useId();
  const [sortAnnouncement, setSortAnnouncement] = useState('');

  // Global accounting period & dimension filters
  const [year, setYear] = useState(() => Number(searchParams.get('year')) || new Date().getFullYear());
  const [periodType, setPeriodType] = useState('YEAR'); // 'YEAR' | 'QUARTER' | 'MONTH'
  const [quarter, setQuarter] = useState(4);
  const [month, setMonth] = useState(11);
  const [locationId, setLocationId] = useState('all');
  const [accommodationTypeId, setAccommodationTypeId] = useState('all');
  const [rankingMode, setRankingMode] = useState('CHAIN'); // 'CHAIN' | 'BY_TYPE'
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [locations, setLocations] = useState([]);

  // Overview / Tab 1 & 2 state
  const [tierFilter, setTierFilter] = useState('ALL');
  const [showCharts, setShowCharts] = useState(true);
  const [sortField, setSortField] = useState('net_profit_after_tax');
  const [sortDir, setSortDir] = useState('descending'); // 'ascending' | 'descending'
  const [pnlPage, setPnlPage] = useState(1);
  const [pnlPageSize, setPnlPageSize] = useState(15);
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState('');
  const [overviewLoadedKey, setOverviewLoadedKey] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);

  // Tab 3 (Tet & 13th Salary) state
  const [settlementType, setSettlementType] = useState('ANNUAL_TET_13TH');
  const [bonusPreview, setBonusPreview] = useState(null);
  const [bonusLoadedKey, setBonusLoadedKey] = useState('');
  const [workingMonthsMap, setWorkingMonthsMap] = useState({});
  const [selectedBonusIds, setSelectedBonusIds] = useState(new Set());
  const [approvingBonus, setApprovingBonus] = useState(false);
  const [bonusAdminNote, setBonusAdminNote] = useState('');

  // Tab 4 (Payments Reconciliation) state
  const [payStatusFilter, setPayStatusFilter] = useState('ALL');
  const [paySearchInput, setPaySearchInput] = useState('');
  const [payDebouncedSearch, setPayDebouncedSearch] = useState('');
  const [payPage, setPayPage] = useState(1);
  const [paymentsData, setPaymentsData] = useState(null);
  const [paymentsLoadedKey, setPaymentsLoadedKey] = useState('');

  // Modals
  const [detailModalAccId, setDetailModalAccId] = useState(null);
  const [warningModalProperty, setWarningModalProperty] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPnlPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPayDebouncedSearch(paySearchInput.trim());
      setPayPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [paySearchInput]);

  useEffect(() => {
    lookupsApi.getLocations().then(setLocations).catch(() => {});
  }, []);

  const periodQueryParams = useMemo(() => {
    const params = { year, periodType };
    if (periodType === 'QUARTER') params.quarter = quarter;
    if (periodType === 'MONTH') params.month = month;
    return params;
  }, [year, periodType, quarter, month]);

  const overviewRequestKey = JSON.stringify({
    ...periodQueryParams,
    locationId,
    accommodationTypeId,
    tierFilter,
    rankingMode,
    debouncedSearch,
    reloadNonce,
  });
  const loadingOverview = overviewLoadedKey !== overviewRequestKey;

  const bonusRequestKey = JSON.stringify({
    settlementType,
    year,
    quarter,
    month,
    rankingMode,
    reloadNonce,
  });
  const loadingBonus = activeTab === 'tet' && bonusLoadedKey !== bonusRequestKey;

  const paymentsRequestKey = JSON.stringify({
    ...periodQueryParams,
    payStatusFilter,
    payDebouncedSearch,
    payPage,
    reloadNonce,
  });
  const loadingPayments = activeTab === 'payments' && paymentsLoadedKey !== paymentsRequestKey;

  // Fetch Overview (Tab 1 & Tab 2 & KPI Cards)
  useEffect(() => {
    let cancelled = false;

    financialReportsApi
      .getOverview({
        ...periodQueryParams,
        locationId,
        accommodationTypeId,
        performanceTier: tierFilter,
        rankingMode,
        search: debouncedSearch,
      })
      .then((res) => {
        if (!cancelled) {
          setOverview(res);
          setOverviewError('');
          setPnlPage(1);
          setOverviewLoadedKey(overviewRequestKey);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setOverviewError(err.message || 'Không thể tải dữ liệu báo cáo tài chính.');
          setOverviewLoadedKey(overviewRequestKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [periodQueryParams, locationId, accommodationTypeId, tierFilter, rankingMode, debouncedSearch, reloadNonce, overviewRequestKey]);

  // Fetch Tab 3 Bonus Preview when Tab 3 active
  useEffect(() => {
    if (activeTab !== 'tet') return undefined;
    let cancelled = false;

    financialReportsApi
      .getBonusPreview({
        settlementType,
        year,
        quarter,
        month,
        rankingMode,
      })
      .then((res) => {
        if (cancelled) return;
        setBonusPreview(res);
        const initialMonths = {};
        for (const it of res?.items || []) {
          initialMonths[it.accommodation_id] = it.manager_working_months;
        }
        setWorkingMonthsMap(initialMonths);
        setSelectedBonusIds(new Set());
        setBonusLoadedKey(bonusRequestKey);
      })
      .catch((err) => {
        if (!cancelled) {
          showToast(err.message || 'Không thể tải bảng quyết toán thưởng.', 'error');
          setBonusLoadedKey(bonusRequestKey);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, settlementType, year, quarter, month, rankingMode, reloadNonce, bonusRequestKey]);

  // Fetch Tab 4 Payments Ledger when Tab 4 active
  useEffect(() => {
    if (activeTab !== 'payments') return undefined;
    let cancelled = false;

    financialReportsApi
      .getPaymentsLedger({
        ...periodQueryParams,
        status: payStatusFilter,
        search: payDebouncedSearch,
        page: payPage,
        pageSize: 20,
      })
      .then((res) => {
        if (!cancelled) {
          setPaymentsData(res);
          setPaymentsLoadedKey(paymentsRequestKey);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          showToast(err.message || 'Không thể tải sổ cái giao dịch.', 'error');
          setPaymentsLoadedKey(paymentsRequestKey);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, periodQueryParams, payStatusFilter, payDebouncedSearch, payPage, reloadNonce, paymentsRequestKey]);

  const switchTab = (nextKey) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', nextKey);
      return next;
    }, { replace: true });
  };

  const handleTabKeyDown = (e, keys, idx) => {
    let targetIdx = null;
    if (e.key === 'ArrowRight') targetIdx = (idx + 1) % keys.length;
    else if (e.key === 'ArrowLeft') targetIdx = (idx - 1 + keys.length) % keys.length;
    else if (e.key === 'Home') targetIdx = 0;
    else if (e.key === 'End') targetIdx = keys.length - 1;
    if (targetIdx !== null) {
      e.preventDefault();
      const targetKey = keys[targetIdx];
      tabRefs.current[targetKey]?.focus();
      switchTab(targetKey);
    }
  };

  // Client-side deterministic sort on overview properties (with raw numeric / Intl.Collator compare)
  const sortedPnlRows = useMemo(() => {
    const list = [...(overview?.properties || [])];
    const factor = sortDir === 'ascending' ? 1 : -1;
    list.sort((a, b) => {
      if (sortField === 'accommodation_name') {
        return factor * viCollator.compare(a.accommodation_name || '', b.accommodation_name || '');
      }
      if (sortField === 'manager_name') {
        return factor * viCollator.compare(a.manager_name || 'Chưa phân công', b.manager_name || 'Chưa phân công');
      }
      const va = Number(a[sortField] ?? 0);
      const vb = Number(b[sortField] ?? 0);
      if (va !== vb) return factor * (va - vb);
      return a.accommodation_id - b.accommodation_id;
    });
    return list;
  }, [overview, sortField, sortDir]);

  const totalPnlPages = Math.max(1, Math.ceil(sortedPnlRows.length / pnlPageSize));
  const pagedPnlRows = sortedPnlRows.slice((pnlPage - 1) * pnlPageSize, pnlPage * pnlPageSize);

  const handleSortColumn = (field, label) => {
    const nextDir = sortField === field && sortDir === 'descending' ? 'ascending' : 'descending';
    setSortField(field);
    setSortDir(nextDir);
    setPnlPage(1);
    setSortAnnouncement(
      `Đã sắp xếp theo ${label}, thứ tự ${nextDir === 'ascending' ? 'tăng dần' : 'giảm dần'}, ${sortedPnlRows.length} cơ sở.`,
    );
  };

  const handleExportCurrentCsv = () => {
    if (activeTab === 'tet' && bonusPreview?.items) {
      const rows = [
        ['QUYẾT TOÁN LƯƠNG THÁNG 13 & THƯỞNG TẾT', bonusPreview.periodLabel],
        [],
        [
          'Cơ sở',
          'Loại hình',
          'Manager',
          'Tháng làm việc Mgr',
          'LN Sau Thuế',
          'Xếp loại',
          'Lương T13 Manager',
          'Thưởng Tết Manager (40%)',
          'Số NV',
          'Quỹ Lương T13 NV',
          'Quỹ Thưởng Tết NV (60%)',
          'Khấu trừ Top đã duyệt',
          'Tổng chi cơ sở',
          'Trạng thái',
        ],
        ...bonusPreview.items.map((r) => [
          r.accommodation_name,
          r.accommodation_type_name,
          r.manager_name || 'Chưa phân công',
          r.manager_working_months,
          r.net_profit_after_tax,
          TIER_META[r.performance_tier]?.label || r.performance_tier,
          r.manager_13th_salary,
          r.manager_tet_bonus,
          r.staff_headcount,
          r.staff_13th_salary_pool,
          r.staff_tet_bonus_pool,
          r.prior_period_top_bonus_deducted,
          r.total_payout_amount,
          r.settlement_status,
        ]),
      ];
      downloadCsv(`vietpeace_quyet_toan_thuong_t13_${year}.csv`, rows);
      showToast('Đã xuất file CSV Quyết toán Lương T13 & Thưởng Tết.');
      return;
    }

    if (overview?.properties) {
      const rows = [
        ['BÁO CÁO TÀI CHÍNH P&L', overview.period?.periodLabel || year],
        [],
        [
          'Hạng',
          'Mã cơ sở',
          'Cơ sở lưu trú',
          'Loại hình',
          'Điểm đến',
          'Manager',
          'Thu Đặt phòng Pre-VAT',
          'Thu Phụ trợ & Khác',
          'Tổng Thu Ròng',
          'Tổng Chi OPEX',
          'Thuế TNDN (10%)',
          'Lợi nhuận Sau Thuế',
          'Biên LN (%)',
          'Xếp loại',
          'Thưởng Top dự kiến',
        ],
        ...sortedPnlRows.map((r) => [
          r.ranking_position || '-',
          r.accommodation_code,
          r.accommodation_name,
          r.accommodation_type_name,
          r.location_name,
          r.manager_name || 'Chưa phân công',
          r.net_booking_revenue_pre_vat,
          r.extra_facility_revenue,
          r.total_net_revenue,
          r.total_expenses,
          r.tax_amount,
          r.net_profit_after_tax,
          r.net_margin_percent,
          TIER_META[r.performance_tier]?.label || r.performance_tier,
          r.top_bonus_amount,
        ]),
      ];
      downloadCsv(`vietpeace_bao_cao_pnl_${year}.csv`, rows);
      showToast('Đã xuất file CSV Bảng Thu – Chi (P&L).');
    }
  };

  // Filtered items in Tab 3 supporting search/location/type filters seamlessly
  const filteredBonusItems = useMemo(() => {
    const list = bonusPreview?.items || [];
    const locNum = locationId !== 'all' ? Number(locationId) : null;
    return list.filter((item) => {
      if (locNum && overview?.properties) {
        const matchOverview = overview.properties.find((p) => p.accommodation_id === item.accommodation_id);
        if (!matchOverview) return false;
      }
      if (debouncedSearch) {
        const hay = `${item.accommodation_name} ${item.manager_name || ''} ${item.location_name}`.toLowerCase();
        if (!hay.includes(debouncedSearch.toLowerCase())) return false;
      }
      return true;
    });
  }, [bonusPreview, locationId, overview, debouncedSearch]);

  const handleToggleSelectBonus = (accId) => {
    setSelectedBonusIds((prev) => {
      const next = new Set(prev);
      if (next.has(accId)) next.delete(accId);
      else next.add(accId);
      return next;
    });
  };

  const handleToggleAllBonus = () => {
    if (selectedBonusIds.size === filteredBonusItems.length && filteredBonusItems.length > 0) {
      setSelectedBonusIds(new Set());
    } else {
      setSelectedBonusIds(new Set(filteredBonusItems.map((it) => it.accommodation_id)));
    }
  };

  const handleApproveSettlements = async (sendEmails = false) => {
    const ids = selectedBonusIds.size > 0
      ? [...selectedBonusIds]
      : filteredBonusItems.map((i) => i.accommodation_id);
    if (!ids.length) return;

    setApprovingBonus(true);
    try {
      const overrides = ids.map((accId) => ({
        accommodation_id: accId,
        manager_working_months: Number(workingMonthsMap[accId] ?? 12),
      }));
      const res = await financialReportsApi.approveBonuses({
        settlementType,
        year,
        quarter,
        month,
        rankingMode,
        status: 'APPROVED',
        sendEmails,
        adminNote: bonusAdminNote.trim() || undefined,
        accommodationIds: ids,
        overrides,
      });
      showToast(
        sendEmails
          ? `Đã phê duyệt ${res.savedCount} cơ sở và gửi ${res.emailedCount} Gmail thông báo thưởng.`
          : `Đã lưu & phê duyệt quyết toán cho ${res.savedCount} cơ sở.`,
      );
      setReloadNonce((n) => n + 1);
    } catch (err) {
      showToast(err.message || 'Phê duyệt quyết toán thất bại.', 'error');
    } finally {
      setApprovingBonus(false);
    }
  };

  const summary = overview?.summary || {
    propertyCount: 0,
    totalNetBookingRevenuePreVat: 0,
    totalGrossCashCollected: 0,
    totalBookingTaxCollected: 0,
    totalExtraFacilityRevenue: 0,
    totalNetRevenue: 0,
    totalOperatingExpenses: 0,
    totalCorporateTaxAmount: 0,
    totalNetProfitAfterTax: 0,
    estimatedTopBonusPool: 0,
    totalRefundedAmount: 0,
    pendingRefundProcessingAmount: 0,
    negativeCount: 0,
    lowOrZeroCount: 0,
    profitableCount: 0,
    warningCount: 0,
    expenseBreakdown: {},
  };

  const topPodiumByType = useMemo(() => {
    const rows = overview?.properties || [];
    if (rankingMode !== 'BY_TYPE') return null;
    const grouped = new Map();
    for (const r of rows) {
      if (!['TOP_1', 'TOP_2', 'TOP_3'].includes(r.performance_tier)) continue;
      if (!grouped.has(r.accommodation_type_name)) grouped.set(r.accommodation_type_name, []);
      grouped.get(r.accommodation_type_name).push(r);
    }
    return [...grouped.entries()];
  }, [overview, rankingMode]);

  const tabItems = [
    { key: 'pnl', label: 'Bảng Thu – Chi (P&L)', count: sortedPnlRows.length, icon: BarChart3 },
    ...(isAdmin
      ? [{ key: 'bonus', label: 'Thưởng Top 1–2–3 & Cảnh báo', count: summary.warningCount, icon: Award }]
      : []),
    { key: 'tet', label: 'Lương T13 & Thưởng Tết', count: null, icon: Coins },
    { key: 'payments', label: 'Đối soát Giao dịch', count: null, icon: FileSpreadsheet },
  ];
  const tabKeys = tabItems.map((t) => t.key);

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ChevronDown size={13} aria-hidden="true" style={{ opacity: 0.35 }} />;
    return sortDir === 'ascending'
      ? <ChevronUp size={13} aria-hidden="true" style={{ color: '#B45309' }} />
      : <ChevronDown size={13} aria-hidden="true" style={{ color: '#B45309' }} />;
  };

  return (
    <div>
      <PageHeader
        title={isAdmin ? 'Báo cáo Tài chính (Thu – Chi P&L) & Đánh giá Hiệu suất' : 'Báo cáo Tài chính cơ sở'}
        description={
          isAdmin
            ? 'Theo dõi dòng tiền Thu – Chi, lợi nhuận sau thuế từng cơ sở, xét thưởng Top 3 và quyết toán Lương tháng 13 / Thưởng Tết.'
            : 'Theo dõi Thu – Chi P&L, chi tiết từng hạng phòng và bảng dự kiến Lương tháng 13 / Thưởng Tết tại cơ sở phụ trách.'
        }
        actions={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setReloadNonce((n) => n + 1)}
              disabled={loadingOverview}
            >
              <RefreshCw size={14} className={loadingOverview ? 'spin' : ''} /> Làm mới
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExportCurrentCsv}
              disabled={loadingOverview || (!overview && !bonusPreview)}
            >
              <Download size={14} /> Xuất CSV
            </button>
          </div>
        }
      />

      {/* Top Hub Navigation Pills & Period Readout */}
      <div className="fin-hub-nav">
        <ReportSuiteTabs />
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12.5px',
            padding: '6px 12px',
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '8px',
            color: '#92400E',
          }}
        >
          <span style={{ fontWeight: 500 }}>Kỳ dữ liệu:</span>
          <strong>{overview?.period?.periodLabel || `Năm ${year}`}</strong>
        </div>
      </div>

      {/* Multi-Dimensional Accounting Filter Bar */}
      <div className="fin-filter-bar" role="region" aria-label="Bộ lọc báo cáo tài chính">
        <div className="fin-filter-item" style={{ minWidth: '90px' }}>
          <ReportYearSelect year={year} onChange={(nextY) => setYear(nextY)} />
        </div>

        <div className="fin-filter-item">
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#6B7280' }}>Kỳ hạch toán ({year})</span>
          <div className="fin-seg-control">
            {[
              ['YEAR', 'Cả năm'],
              ['QUARTER', 'Theo Quý'],
              ['MONTH', 'Theo Tháng'],
            ].map(([typeKey, label]) => (
              <button
                key={typeKey}
                type="button"
                className={`fin-seg-btn ${periodType === typeKey ? 'active' : ''}`}
                onClick={() => setPeriodType(typeKey)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {periodType === 'QUARTER' && (
          <div className="fin-filter-item" style={{ minWidth: '110px' }}>
            <label htmlFor="fin-quarter-select">Chọn Quý</label>
            <select
              id="fin-quarter-select"
              className="filter-select"
              value={quarter}
              onChange={(e) => setQuarter(Number(e.target.value))}
            >
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={q}>Quý {q}/{year}</option>
              ))}
            </select>
          </div>
        )}

        {periodType === 'MONTH' && (
          <div className="fin-filter-item" style={{ minWidth: '125px' }}>
            <label htmlFor="fin-month-select">Chọn Tháng</label>
            <select
              id="fin-month-select"
              className="filter-select"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                <option key={m} value={m}>Tháng {m}/{year}</option>
              ))}
            </select>
          </div>
        )}

        {isAdmin && (
          <>
            <div className="fin-filter-item" style={{ minWidth: '150px' }}>
              <label htmlFor="fin-location-select">Điểm đến</label>
              <select
                id="fin-location-select"
                className="filter-select"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="all">Tất cả điểm đến</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div className="fin-filter-item" style={{ minWidth: '140px' }}>
              <label htmlFor="fin-type-select">Loại hình</label>
              <select
                id="fin-type-select"
                className="filter-select"
                value={accommodationTypeId}
                onChange={(e) => setAccommodationTypeId(e.target.value)}
              >
                <option value="all">Tất cả loại hình</option>
                <option value="1">Khách sạn</option>
                <option value="2">Resort</option>
                <option value="3">Homestay</option>
              </select>
            </div>

            <div className="fin-filter-item" style={{ minWidth: '175px' }}>
              <label htmlFor="fin-ranking-mode">Chế độ Xếp hạng Top 3</label>
              <select
                id="fin-ranking-mode"
                className="filter-select"
                value={rankingMode}
                onChange={(e) => setRankingMode(e.target.value)}
              >
                <option value="CHAIN">Toàn chuỗi (72 cơ sở)</option>
                <option value="BY_TYPE">Theo từng Loại hình</option>
              </select>
            </div>
          </>
        )}

        <div className="fin-filter-item" style={{ flex: 1, minWidth: '210px' }}>
          <label htmlFor="fin-search-input">Tìm kiếm</label>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input
              id="fin-search-input"
              type="text"
              className="form-input"
              style={{ paddingLeft: '32px' }}
              placeholder="Tìm tên cơ sở, Manager, mã..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      {overviewError && (
        <div
          className="admin-card"
          style={{ padding: '12px 16px', marginBottom: '14px', borderColor: '#FCA5A5', background: '#FEF2F2', color: '#991B1B' }}
        >
          {overviewError}
        </div>
      )}

      {/* 6 Executive Financial KPI Cards */}
      <div className="stat-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Tổng Nguồn Thu (Pre-VAT)</span>
            <span className="stat-card-value tabular-nums" style={{ color: '#0284C7' }}>
              {loadingOverview ? '…' : formatCompactVND(summary.totalNetRevenue)}
            </span>
            <span className="stat-card-sub">
              Phòng {formatCompactVND(summary.totalNetBookingRevenuePreVat)} · Phụ trợ {formatCompactVND(summary.totalExtraFacilityRevenue)}
            </span>
          </div>
          <div className="stat-card-icon" style={{ backgroundColor: '#E0F2FE', borderColor: '#BAE6FD', color: '#0284C7' }}>
            <Wallet size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Tổng Chi Vận Hành (OPEX)</span>
            <span className="stat-card-value tabular-nums" style={{ color: '#D97706' }}>
              {loadingOverview ? '…' : formatCompactVND(summary.totalOperatingExpenses)}
            </span>
            <span className="stat-card-sub">
              Lương {formatCompactVND((summary.expenseBreakdown?.staff_payroll_cost || 0) + (summary.expenseBreakdown?.manager_salary_cost || 0))} · Điện nước {formatCompactVND((summary.expenseBreakdown?.electricity_cost || 0) + (summary.expenseBreakdown?.water_cost || 0))}
            </span>
          </div>
          <div className="stat-card-icon" style={{ backgroundColor: '#FEF3C7', borderColor: '#FDE68A', color: '#D97706' }}>
            <TrendingDown size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Lợi Nhuận Sau Thuế</span>
            <span
              className="stat-card-value tabular-nums"
              style={{ color: summary.totalNetProfitAfterTax < 0 ? '#DC2626' : '#15803D' }}
            >
              {loadingOverview ? '…' : formatCompactVND(summary.totalNetProfitAfterTax)}
            </span>
            <span className="stat-card-sub">
              Đã trừ thuế TNDN {formatCompactVND(summary.totalCorporateTaxAmount)} (10%)
            </span>
          </div>
          <div className="stat-card-icon" style={{ backgroundColor: '#DCFCE7', borderColor: '#86EFAC', color: '#15803D' }}>
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-card-title">Quỹ Thưởng Doanh Thu</span>
            <span className="stat-card-value tabular-nums" style={{ color: '#92400E' }}>
              {loadingOverview ? '…' : formatCompactVND(summary.estimatedTopBonusPool)}
            </span>
            <span className="stat-card-sub">
              {summary.profitableCount}/{summary.propertyCount} cơ sở có lãi (3%–2%–1%–0.5%)
            </span>
          </div>
          <div className="stat-card-icon" style={{ backgroundColor: '#FFFBEB', borderColor: '#FCD34D', color: '#B45309' }}>
            <Award size={20} />
          </div>
        </div>

        <button
          type="button"
          className="stat-card"
          style={{ textAlign: 'left', cursor: isAdmin ? 'pointer' : 'default' }}
          onClick={() => isAdmin && switchTab('bonus')}
        >
          <div className="stat-card-left">
            <span className="stat-card-title">Cơ Sở Cần Chú Ý</span>
            <span className="stat-card-value tabular-nums" style={{ color: summary.warningCount > 0 ? '#DC2626' : '#15803D' }}>
              {loadingOverview ? '…' : `${summary.negativeCount} cơ sở âm`}
            </span>
            <span className="stat-card-sub">
              + {summary.lowOrZeroCount} lãi mỏng / DT = 0 · Xem Tab Cảnh báo
            </span>
          </div>
          <div className="stat-card-icon" style={{ backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', color: '#DC2626' }}>
            <AlertTriangle size={20} />
          </div>
        </button>

        <button
          type="button"
          className="stat-card"
          style={{ textAlign: 'left', cursor: 'pointer' }}
          onClick={() => switchTab('payments')}
        >
          <div className="stat-card-left">
            <span className="stat-card-title">Hoàn Trả &amp; Chờ Hoàn</span>
            <span className="stat-card-value tabular-nums" style={{ color: '#475569' }}>
              {loadingOverview ? '…' : formatCompactVND(summary.totalRefundedAmount)}
            </span>
            <span className="stat-card-sub">
              Đang chờ hoàn: {formatCompactVND(summary.pendingRefundProcessingAmount)} · VAT: {formatCompactVND(summary.totalBookingTaxCollected)}
            </span>
          </div>
          <div className="stat-card-icon" style={{ backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', color: '#475569' }}>
            <ShieldAlert size={20} />
          </div>
        </button>
      </div>

      {/* 4 Accessible Sub-Tabs */}
      <div
        role="tablist"
        aria-label="Các phân hệ báo cáo tài chính và thưởng"
        className="fin-tablist"
      >
        {tabItems.map((tab, idx) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              id={`fin-tab-${tab.key}`}
              ref={(el) => {
                tabRefs.current[tab.key] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              className="fin-tab-btn"
              onClick={() => switchTab(tab.key)}
              onKeyDown={(e) => handleTabKeyDown(e, tabKeys, idx)}
            >
              <Icon size={15} aria-hidden="true" />
              <span>{tab.label}</span>
              {tab.count !== null && <span className="fin-tab-count">{tab.count}</span>}
            </button>
          );
        })}
      </div>

      {/* Formula transparency caption + Chart collapse button */}
      {activeTab === 'pnl' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#6B7280' }}>
            <strong>Công thức:</strong> Lợi nhuận Sau Thuế = Tổng Thu Ròng (Phòng Pre-VAT + Phụ trợ + Thu khác) − Tổng Chi OPEX − Thuế TNDN ước tính trên EBT của kỳ đang chọn.
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowCharts((s) => !s)}
          >
            {showCharts ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showCharts ? 'Thu gọn biểu đồ' : 'Hiển thị biểu đồ'}
          </button>
        </div>
      )}

      {/* TAB 1: P&L TABLE & ANALYTICS */}
      {activeTab === 'pnl' && (
        <div role="tabpanel" aria-labelledby="fin-tab-pnl" tabIndex={0}>
          {showCharts && (
            <FinancialPnlChart
              monthlySeries={overview?.monthlySeries || []}
              expenseBreakdown={summary.expenseBreakdown}
              totalOperatingExpenses={summary.totalOperatingExpenses}
              periodLabel={overview?.period?.periodLabel || `Năm ${year}`}
            />
          )}

          <div className="admin-card">
            <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <Filter size={14} style={{ color: '#6B7280' }} aria-hidden="true" />
                {[
                  ['ALL', 'Tất cả'],
                  ...(isAdmin ? [['TOP_3', 'Top 1–3'], ['PROFITABLE', 'Có lãi (đạt chuẩn)'], ['WARNING', 'Cảnh báo'], ['NEGATIVE_LOSS', 'Đang âm']] : []),
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`btn btn-sm ${tierFilter === key ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setTierFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
                <label htmlFor="pnl-page-size" style={{ color: '#6B7280' }}>Hiển thị</label>
                <select
                  id="pnl-page-size"
                  className="filter-select"
                  value={pnlPageSize}
                  onChange={(e) => {
                    setPnlPageSize(Number(e.target.value));
                    setPnlPage(1);
                  }}
                >
                  <option value={15}>15 dòng</option>
                  <option value={30}>30 dòng</option>
                  <option value={72}>Tất cả (72)</option>
                </select>
              </div>
            </div>

            <div className="sr-only" role="status" aria-live="polite">
              {sortAnnouncement}
            </div>

            <div className="fin-table-wrapper" role="region" tabIndex={0} aria-labelledby={pnlCaptionId}>
              <table className="data-table">
                <caption id={pnlCaptionId} className="sr-only">
                  Bảng hạch toán Thu Chi P&amp;L theo từng cơ sở lưu trú
                </caption>
                <thead>
                  <tr>
                    {isAdmin && <th scope="col" style={{ textAlign: 'center' }}>Hạng</th>}
                    <th
                      scope="col"
                      aria-sort={sortField === 'accommodation_name' ? sortDir : undefined}
                    >
                      <button
                        type="button"
                        className="fin-sort-btn align-left"
                        onClick={() => handleSortColumn('accommodation_name', 'Cơ sở lưu trú')}
                      >
                        <span>Cơ sở lưu trú</span>
                        {renderSortIcon('accommodation_name')}
                      </button>
                    </th>
                    <th
                      scope="col"
                      aria-sort={sortField === 'manager_name' ? sortDir : undefined}
                    >
                      <button
                        type="button"
                        className="fin-sort-btn align-left"
                        onClick={() => handleSortColumn('manager_name', 'Manager phụ trách')}
                      >
                        <span>Manager phụ trách</span>
                        {renderSortIcon('manager_name')}
                      </button>
                    </th>
                    <th
                      scope="col"
                      aria-sort={sortField === 'total_net_revenue' ? sortDir : undefined}
                    >
                      <button
                        type="button"
                        className="fin-sort-btn"
                        onClick={() => handleSortColumn('total_net_revenue', 'Tổng Thu Ròng')}
                      >
                        <span>Tổng Thu Ròng</span>
                        {renderSortIcon('total_net_revenue')}
                      </button>
                    </th>
                    <th
                      scope="col"
                      aria-sort={sortField === 'total_expenses' ? sortDir : undefined}
                    >
                      <button
                        type="button"
                        className="fin-sort-btn"
                        onClick={() => handleSortColumn('total_expenses', 'Tổng Chi OPEX')}
                      >
                        <span>Tổng Chi OPEX</span>
                        {renderSortIcon('total_expenses')}
                      </button>
                    </th>
                    <th scope="col" style={{ textAlign: 'right' }}>Thuế (10%)</th>
                    <th
                      scope="col"
                      aria-sort={sortField === 'net_profit_after_tax' ? sortDir : undefined}
                    >
                      <button
                        type="button"
                        className="fin-sort-btn"
                        onClick={() => handleSortColumn('net_profit_after_tax', 'Lợi nhuận Sau Thuế')}
                      >
                        <span>Lợi nhuận Sau Thuế</span>
                        {renderSortIcon('net_profit_after_tax')}
                      </button>
                    </th>
                    <th scope="col" style={{ textAlign: 'center' }}>Xếp loại &amp; Thưởng</th>
                    <th scope="col" style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingOverview ? (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '28px', color: '#6B7280' }}>
                        Đang tính toán sổ cái P&amp;L toàn hệ thống...
                      </td>
                    </tr>
                  ) : pagedPnlRows.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '28px', color: '#6B7280' }}>
                        Không có cơ sở nào khớp bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    pagedPnlRows.map((row) => (
                      <tr key={row.accommodation_id}>
                        {isAdmin && (
                          <td style={{ textAlign: 'center', fontWeight: 700 }} className="tabular-nums">
                            {row.ranking_position ? `#${row.ranking_position}` : '—'}
                          </td>
                        )}
                        <td>
                          <div style={{ fontWeight: 700, color: '#111827' }}>{row.accommodation_name}</div>
                          <div style={{ fontSize: '11.5px', color: '#6B7280' }}>
                            {row.accommodation_type_name} · {row.location_name} · {row.total_rooms} phòng
                          </div>
                        </td>
                        <td>
                          {row.manager_name ? (
                            <>
                              <div style={{ fontWeight: 600 }}>{row.manager_name}</div>
                              <div style={{ fontSize: '11px', color: '#6B7280' }}>{row.manager_personal_email}</div>
                            </>
                          ) : (
                            <span className="badge" style={{ background: '#F3F4F6', color: '#4B5563' }}>
                              Chưa phân công Manager
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }} className="tabular-nums">
                          <div style={{ fontWeight: 700, color: '#0369A1' }}>{formatVND(row.total_net_revenue)}</div>
                          <div style={{ fontSize: '11px', color: '#6B7280' }}>
                            {row.booking_count} đơn · Phụ trợ {formatCompactVND(row.extra_facility_revenue)}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }} className="tabular-nums">
                          <div style={{ fontWeight: 700 }}>{formatVND(row.total_expenses)}</div>
                          <div style={{ fontSize: '11px', color: '#6B7280' }}>
                            Lương {formatCompactVND(row.expenses.payroll_total)} · ĐN {formatCompactVND(row.expenses.utilities_total)}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }} className="tabular-nums">
                          {formatVND(row.tax_amount)}
                        </td>
                        <td style={{ textAlign: 'right' }} className="tabular-nums">
                          <div style={{ fontWeight: 800, color: row.net_profit_after_tax < 0 ? '#DC2626' : '#15803D' }}>
                            {formatVND(row.net_profit_after_tax)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6B7280' }}>
                            Biên LN: {row.net_margin_percent}%
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`fin-tier-pill ${row.performance_tier}`}>
                            {TIER_META[row.performance_tier]?.label || row.performance_tier}
                          </span>
                          {row.top_bonus_amount > 0 && (
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#B45309', marginTop: '3px' }}>
                              +{formatCompactVND(row.top_bonus_amount)}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setDetailModalAccId(row.accommodation_id)}
                          >
                            {isAdmin ? 'Sổ cái' : 'Chi tiết'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {sortedPnlRows.length > 0 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '12.5px' }}>
                <span style={{ color: '#6B7280' }}>
                  Hiển thị {(pnlPage - 1) * pnlPageSize + 1}–{Math.min(pnlPage * pnlPageSize, sortedPnlRows.length)} / {sortedPnlRows.length} cơ sở
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={pnlPage <= 1}
                    onClick={() => setPnlPage((p) => p - 1)}
                  >
                    Trước
                  </button>
                  <span style={{ padding: '5px 10px', fontWeight: 600 }}>Trang {pnlPage} / {totalPnlPages}</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={pnlPage >= totalPnlPages}
                    onClick={() => setPnlPage((p) => p + 1)}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TOP 1-2-3 AWARD & WARNING ACTIONS */}
      {activeTab === 'bonus' && isAdmin && (
        <div role="tabpanel" aria-labelledby="fin-tab-bonus" tabIndex={0}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
              Vinh danh Top 1 – Top 2 – Top 3 ({rankingMode === 'CHAIN' ? 'Toàn chuỗi' : 'Theo từng Loại hình'})
            </h3>
            <div className="fin-seg-control">
              <button
                type="button"
                className={`fin-seg-btn ${rankingMode === 'CHAIN' ? 'active' : ''}`}
                onClick={() => setRankingMode('CHAIN')}
              >
                Top 3 Toàn chuỗi
              </button>
              <button
                type="button"
                className={`fin-seg-btn ${rankingMode === 'BY_TYPE' ? 'active' : ''}`}
                onClick={() => setRankingMode('BY_TYPE')}
              >
                Top 3 theo Loại hình (KS / Resort / Homestay)
              </button>
            </div>
          </div>

          {rankingMode === 'CHAIN' ? (
            <div className="fin-podium-grid">
              {(overview?.topPerformers || []).map((top) => (
                <div
                  key={top.accommodation_id}
                  className="admin-card"
                  style={{
                    marginBottom: 0,
                    borderColor: top.ranking_position === 1 ? '#F59E0B' : '#E5E7EB',
                    background: top.ranking_position === 1 ? 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)' : '#FFFFFF',
                  }}
                >
                  <div className="admin-card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className={`fin-tier-pill ${top.performance_tier}`}>
                        {TIER_META[top.performance_tier]?.label}
                      </span>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>{top.accommodation_type_name}</span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#111827', marginBottom: '4px' }}>
                      {top.accommodation_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#4B5563', marginBottom: '12px' }}>
                      Manager: <strong>{top.manager_name || 'Chưa phân công'}</strong> ({top.location_name})
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F3F4F6', paddingTop: '10px', fontSize: '12.5px' }}>
                      <div>
                        <div style={{ color: '#6B7280' }}>Lợi nhuận Sau Thuế</div>
                        <strong style={{ color: '#15803D', fontSize: '14px' }}>{formatVND(top.net_profit_after_tax)}</strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#6B7280' }}>Thưởng dự kiến</div>
                        <strong style={{ color: '#B45309', fontSize: '14px' }}>+{formatVND(top.top_bonus_amount)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px' }}>
              {(topPodiumByType || []).map(([typeName, list]) => (
                <div key={typeName}>
                  <h4 style={{ margin: '0 0 8px', fontSize: '13.5px', color: '#92400E' }}>Nhóm {typeName}</h4>
                  <div className="fin-podium-grid" style={{ marginBottom: 0 }}>
                    {list.map((top) => (
                      <div key={top.accommodation_id} className="admin-card" style={{ marginBottom: 0 }}>
                        <div className="admin-card-body">
                          <span className={`fin-tier-pill ${top.performance_tier}`} style={{ marginBottom: '6px' }}>
                            {TIER_META[top.performance_tier]?.label}
                          </span>
                          <div style={{ fontWeight: 700, fontSize: '14px' }}>{top.accommodation_name}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
                            {top.manager_name || 'Chưa phân công'} · Biên {top.net_margin_percent}%
                          </div>
                          <div style={{ fontWeight: 700, color: '#15803D' }}>{formatVND(top.net_profit_after_tax)}</div>
                          <div style={{ fontSize: '12px', color: '#B45309', fontWeight: 700 }}>
                            Thưởng ({top.top_bonus_rate_percent}%): +{formatVND(top.top_bonus_amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Warning Properties Table */}
          <div className="admin-card">
            <div className="admin-card-header">
              <div>
                <div className="admin-card-title" style={{ color: '#991B1B' }}>
                  Cảnh báo Đỏ &amp; Vàng — Cơ sở Âm Lợi nhuận / Lãi mỏng &lt; 5% / Chưa phát sinh Doanh thu
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                  Ghi chú: Cơ sở mới bàn giao Manager dưới 30 ngày được gắn nhãn cảnh báo công bằng để Admin đối chiếu trước khi nhắc nhở.
                </div>
              </div>
            </div>

            <div className="table-responsive" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cơ sở</th>
                    <th>Manager &amp; Nhiệm kỳ</th>
                    <th style={{ textAlign: 'right' }}>Tổng Thu Ròng</th>
                    <th style={{ textAlign: 'right' }}>Tổng Chi OPEX</th>
                    <th style={{ textAlign: 'right' }}>Lợi nhuận Sau Thuế</th>
                    <th style={{ textAlign: 'center' }}>Phân loại</th>
                    <th style={{ textAlign: 'center' }}>Hành động điều hành</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.warningProperties || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#15803D' }}>
                        Toàn bộ cơ sở trong bộ lọc hiện tại đều đạt mức lợi nhuận ổn định.
                      </td>
                    </tr>
                  ) : (
                    (overview?.warningProperties || []).map((row) => {
                      const hasMgrEmail = Boolean(row.manager_user_id && row.manager_personal_email);
                      return (
                        <tr key={row.accommodation_id}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{row.accommodation_name}</div>
                            <div style={{ fontSize: '11.5px', color: '#6B7280' }}>
                              {row.accommodation_type_name} · {row.location_name}
                            </div>
                          </td>
                          <td>
                            {row.manager_user_id ? (
                              <>
                                <div style={{ fontWeight: 600 }}>{row.manager_name}</div>
                                <div style={{ fontSize: '11px', color: '#6B7280' }}>{row.manager_personal_email}</div>
                                {row.is_new_manager_under_30_days && (
                                  <span className="badge" style={{ marginTop: '4px', background: '#FEF3C7', color: '#92400E' }}>
                                    Mới tiếp quản (&lt; 30 ngày) · {row.days_since_assigned}d
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="badge" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                                Chưa phân công Manager
                              </span>
                            )}
                            {row.latest_warning && (
                              <div style={{ fontSize: '11px', color: '#0369A1', marginTop: '4px' }}>
                                Đã nhắc Gmail: {formatDateVN(row.latest_warning.created_at)}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }} className="tabular-nums">{formatVND(row.total_net_revenue)}</td>
                          <td style={{ textAlign: 'right' }} className="tabular-nums">{formatVND(row.total_expenses)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: row.net_profit_after_tax < 0 ? '#DC2626' : '#92400E' }} className="tabular-nums">
                            <div>{formatVND(row.net_profit_after_tax)}</div>
                            <div style={{ fontSize: '11px', fontWeight: 500 }}>Biên: {row.net_margin_percent}%</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`fin-tier-pill ${row.performance_tier}`}>
                              {TIER_META[row.performance_tier]?.short}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={!hasMgrEmail}
                                title={hasMgrEmail ? 'Gửi Gmail yêu cầu giải trình tới Manager' : 'Cơ sở chưa có Manager — vui lòng phân công trước'}
                                onClick={() => setWarningModalProperty(row)}
                              >
                                <Mail size={13} />
                                {hasMgrEmail ? 'Gửi Gmail nhắc nhở' : 'Chưa có Manager'}
                              </button>
                              <Link
                                to={`/admin/roles?search=${encodeURIComponent(row.accommodation_name)}`}
                                className="btn btn-secondary btn-sm"
                                style={{ textDecoration: 'none' }}
                              >
                                <ExternalLink size={13} /> Bàn giao Manager
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 13TH MONTH SALARY & TET BONUS SETTLEMENT */}
      {activeTab === 'tet' && (
        <div role="tabpanel" aria-labelledby="fin-tab-tet" tabIndex={0}>
          <div className="admin-card">
            <div className="admin-card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <label htmlFor="settlement-type-select" style={{ fontWeight: 700, fontSize: '13px' }}>Loại kỳ quyết toán:</label>
                <select
                  id="settlement-type-select"
                  className="filter-select"
                  value={settlementType}
                  onChange={(e) => setSettlementType(e.target.value)}
                >
                  <option value="ANNUAL_TET_13TH">Quyết toán Năm — Lương Tháng 13 &amp; Thưởng Tết</option>
                  <option value="QUARTERLY_TOP_BONUS">Xét Thưởng Top 1–3 theo Quý ({quarter}/{year})</option>
                  <option value="MONTHLY_TOP_BONUS">Xét Thưởng Top 1–3 theo Tháng ({month}/{year})</option>
                </select>
              </div>

              {isAdmin && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '220px' }}
                    placeholder="Ghi chú duyệt thưởng..."
                    value={bonusAdminNote}
                    onChange={(e) => setBonusAdminNote(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={approvingBonus || loadingBonus}
                    onClick={() => handleApproveSettlements(false)}
                  >
                    <CheckCircle2 size={14} /> Lưu &amp; Phê duyệt ({selectedBonusIds.size > 0 ? selectedBonusIds.size : 'Tất cả'})
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={approvingBonus || loadingBonus}
                    onClick={() => handleApproveSettlements(true)}
                  >
                    <Mail size={14} /> Duyệt &amp; Gửi Gmail Thông báo
                  </button>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              padding: '10px 14px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              marginBottom: '14px',
              fontSize: '12.5px',
              color: '#1E3A8A',
            }}
          >
            <strong>Trạng thái Tích hợp Đánh giá Chatbox CSKH:</strong>{' '}
            {bonusPreview?.chatboxPhase2Active
              ? 'Đang kích hoạt Giai đoạn 2 — Tự động áp hệ số 0.70 nếu Manager có vi phạm thái độ được xác nhận (chỉ áp dụng lên 40% phần Manager, bảo toàn 100% quỹ 60% tập thể nhân viên).'
              : 'Chờ tích hợp Giai đoạn 2 (mặc định hệ số thái độ = 1.00; quỹ thưởng 60% tập thể nhân viên được tách riêng và bảo vệ trước mọi án phạt cá nhân của Manager).'}
          </div>

          {bonusPreview?.totals && (
            <div className="stat-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
              <div className="stat-card">
                <div className="stat-card-left">
                  <span className="stat-card-title">Quỹ Lương T13 (Mgr + NV)</span>
                  <span className="stat-card-value tabular-nums">
                    {formatCompactVND(bonusPreview.totals.totalManager13thSalary + bonusPreview.totals.totalStaff13thSalaryPool)}
                  </span>
                  <span className="stat-card-sub">
                    Mgr {formatCompactVND(bonusPreview.totals.totalManager13thSalary)} · NV {formatCompactVND(bonusPreview.totals.totalStaff13thSalaryPool)}
                  </span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-left">
                  <span className="stat-card-title">Quỹ Thưởng Tết / Hiệu suất</span>
                  <span className="stat-card-value tabular-nums" style={{ color: '#B45309' }}>
                    {formatCompactVND(bonusPreview.totals.totalManagerTetBonus + bonusPreview.totals.totalStaffTetBonusPool)}
                  </span>
                  <span className="stat-card-sub">
                    Mgr 40%: {formatCompactVND(bonusPreview.totals.totalManagerTetBonus)} · NV 60%: {formatCompactVND(bonusPreview.totals.totalStaffTetBonusPool)}
                  </span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-left">
                  <span className="stat-card-title">Đã khấu trừ Top Tháng/Quý</span>
                  <span className="stat-card-value tabular-nums">
                    {formatCompactVND(bonusPreview.totals.totalPriorDeducted)}
                  </span>
                  <span className="stat-card-sub">Chống chi trùng quyết toán năm</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-left">
                  <span className="stat-card-title">Tổng Chi Quyết Toán</span>
                  <span className="stat-card-value tabular-nums" style={{ color: '#15803D' }}>
                    {formatCompactVND(bonusPreview.totals.grandTotalPayout)}
                  </span>
                  <span className="stat-card-sub">
                    Đã duyệt {bonusPreview.totals.approvedCount}/{bonusPreview.totals.propertyCount} cơ sở · {bonusPreview.totals.totalStaffHeadcount} nhân viên
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="admin-card">
            <div className="fin-table-wrapper" role="region" tabIndex={0} aria-labelledby={tetCaptionId}>
              <table className="data-table">
                <caption id={tetCaptionId} className="sr-only">
                  Bảng quyết toán Lương Tháng 13 và Thưởng Tết cho Manager và Tập thể nhân viên cơ sở
                </caption>
                <thead>
                  <tr>
                    {isAdmin && (
                      <th scope="col" style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          aria-label="Chọn tất cả cơ sở quyết toán"
                          checked={filteredBonusItems.length > 0 && selectedBonusIds.size === filteredBonusItems.length}
                          onChange={handleToggleAllBonus}
                        />
                      </th>
                    )}
                    <th scope="col">Cơ sở &amp; Xếp hạng</th>
                    <th scope="col">Manager</th>
                    <th scope="col" style={{ textAlign: 'center' }}>Tháng LV</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Lương T13 Mgr</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Thưởng Mgr (40%)</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Quỹ T13 NV</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Thưởng NV (60%)</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Bình quân / NV</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Tổng chi cơ sở</th>
                    <th scope="col" style={{ textAlign: 'center' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingBonus ? (
                    <tr>
                      <td colSpan={isAdmin ? 11 : 10} style={{ textAlign: 'center', padding: '28px', color: '#6B7280' }}>
                        Đang tính bảng quyết toán Lương T13 &amp; Thưởng Tết...
                      </td>
                    </tr>
                  ) : filteredBonusItems.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 11 : 10} style={{ textAlign: 'center', padding: '28px', color: '#6B7280' }}>
                        Không có cơ sở nào khớp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredBonusItems.map((row) => {
                      const editedMonths = Number(workingMonthsMap[row.accommodation_id] ?? row.manager_working_months);
                      const recomputedMgr13th = row.manager_user_id && settlementType === 'ANNUAL_TET_13TH'
                        ? Math.round(row.manager_base_salary * (editedMonths / 12))
                        : 0;
                      const recomputedTotal =
                        recomputedMgr13th + row.manager_tet_bonus + row.staff_13th_salary_pool + row.staff_tet_bonus_pool;

                      return (
                        <tr key={row.accommodation_id}>
                          {isAdmin && (
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                aria-label={`Chọn ${row.accommodation_name}`}
                                checked={selectedBonusIds.has(row.accommodation_id)}
                                onChange={() => handleToggleSelectBonus(row.accommodation_id)}
                              />
                            </td>
                          )}
                          <td>
                            <div style={{ fontWeight: 700 }}>{row.accommodation_name}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>
                              {row.ranking_position ? `#${row.ranking_position} · ` : ''}
                              <span className={`fin-tier-pill ${row.performance_tier}`} style={{ padding: '1px 6px', fontSize: '10.5px' }}>
                                {TIER_META[row.performance_tier]?.label}
                              </span>
                              {row.property_kpi_multiplier > 1 && (
                                <span style={{ marginLeft: '5px', color: '#15803D', fontWeight: 700 }}>×1.2 KPI</span>
                              )}
                            </div>
                          </td>
                          <td>
                            {row.manager_name ? (
                              <>
                                <div style={{ fontWeight: 600 }}>{row.manager_name}</div>
                                <div style={{ fontSize: '11px', color: '#6B7280' }}>{row.manager_personal_email}</div>
                              </>
                            ) : (
                              <span className="badge" style={{ background: '#F3F4F6', color: '#4B5563' }}>
                                Trống Manager (0đ Mgr)
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {isAdmin && row.manager_user_id ? (
                              <input
                                type="number"
                                min={0}
                                max={12}
                                aria-label={`Số tháng làm việc của Manager ${row.accommodation_name}`}
                                className="form-input tabular-nums"
                                style={{ width: '58px', textAlign: 'center', padding: '4px 6px' }}
                                value={editedMonths}
                                onChange={(e) => {
                                  const v = Math.max(0, Math.min(12, Math.trunc(Number(e.target.value || 0))));
                                  setWorkingMonthsMap((prev) => ({ ...prev, [row.accommodation_id]: v }));
                                }}
                              />
                            ) : (
                              <span>{editedMonths}/12</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }} className="tabular-nums">{formatVND(recomputedMgr13th)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#B45309' }} className="tabular-nums">
                            {formatVND(row.manager_tet_bonus)}
                          </td>
                          <td style={{ textAlign: 'right' }} className="tabular-nums">
                            <div>{formatVND(row.staff_13th_salary_pool)}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>{row.staff_headcount} NV</div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#15803D' }} className="tabular-nums">
                            {formatVND(row.staff_tet_bonus_pool)}
                          </td>
                          <td style={{ textAlign: 'right' }} className="tabular-nums">{formatVND(row.avg_staff_payout)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800 }} className="tabular-nums">
                            <div>{formatVND(recomputedTotal)}</div>
                            {row.prior_period_top_bonus_deducted > 0 && (
                              <div style={{ fontSize: '10.5px', color: '#6B7280' }}>
                                Đã trừ {formatCompactVND(row.prior_period_top_bonus_deducted)}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className="badge"
                              style={{
                                background: row.settlement_status === 'APPROVED' ? '#DCFCE7' : '#F3F4F6',
                                color: row.settlement_status === 'APPROVED' ? '#166534' : '#374151',
                              }}
                            >
                              {row.settlement_status}
                            </span>
                            <div style={{ fontSize: '10.5px', color: '#6B7280', marginTop: '3px' }}>
                              Mail: {row.email_notification_status}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: VNPAY PAYMENT & REFUND RECONCILIATION LEDGER */}
      {activeTab === 'payments' && (
        <div role="tabpanel" aria-labelledby="fin-tab-payments" tabIndex={0}>
          {paymentsData?.summary && (
            <div className="stat-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div className="stat-card">
                <div className="stat-card-left">
                  <span className="stat-card-title">Thực thu ròng VNPAY</span>
                  <span className="stat-card-value tabular-nums" style={{ color: '#0284C7' }}>
                    {formatCompactVND(paymentsData.summary.totalNetCollectedCash)}
                  </span>
                  <span className="stat-card-sub">
                    Khớp 100% Tab 1 ({formatVND(paymentsData.summary.totalNetCollectedCash)})
                  </span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-left">
                  <span className="stat-card-title">Doanh thu Booking Pre-VAT</span>
                  <span className="stat-card-value tabular-nums" style={{ color: '#15803D' }}>
                    {formatCompactVND(paymentsData.summary.totalPreVatBookingRevenue)}
                  </span>
                  <span className="stat-card-sub">VAT thu hộ: {formatVND(paymentsData.summary.totalVatCollected)}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-left">
                  <span className="stat-card-title">Đã hoàn tiền (Refunded)</span>
                  <span className="stat-card-value tabular-nums">
                    {formatCompactVND(paymentsData.summary.totalRefundedAmount)}
                  </span>
                  <span className="stat-card-sub">Trên {paymentsData.summary.totalTransactions} giao dịch trong kỳ</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-left">
                  <span className="stat-card-title">Chờ hoàn (REFUND_PROCESSING)</span>
                  <span className="stat-card-value tabular-nums" style={{ color: '#DC2626' }}>
                    {formatCompactVND(paymentsData.summary.pendingRefundAmount)}
                  </span>
                  <span className="stat-card-sub">{paymentsData.summary.pendingRefundCount} giao dịch cần đối soát hoàn</span>
                </div>
              </div>
            </div>
          )}

          <div className="admin-card">
            <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <label htmlFor="pay-status-filter" style={{ fontSize: '12.5px', fontWeight: 600 }}>Trạng thái GD:</label>
                <select
                  id="pay-status-filter"
                  className="filter-select"
                  value={payStatusFilter}
                  onChange={(e) => {
                    setPayStatusFilter(e.target.value);
                    setPayPage(1);
                  }}
                >
                  <option value="ALL">Tất cả giao dịch</option>
                  <option value="SUCCESS">Thành công (SUCCESS)</option>
                  <option value="PARTIALLY_REFUNDED">Hoàn một phần (PARTIALLY_REFUNDED)</option>
                  <option value="REFUNDED">Đã hoàn 100% (REFUNDED)</option>
                  <option value="REFUND_PROCESSING">Đang chờ hoàn (REFUND_PROCESSING)</option>
                  <option value="PROCESSING">Đang thanh toán (PROCESSING)</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
              </div>

              <div style={{ position: 'relative', minWidth: '240px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '32px' }}
                  placeholder="Mã booking, mã VNPAY, khách hàng..."
                  aria-label="Tìm giao dịch đối soát"
                  value={paySearchInput}
                  onChange={(e) => setPaySearchInput(e.target.value)}
                />
              </div>
            </div>

            <div className="fin-table-wrapper" role="region" tabIndex={0} aria-labelledby={payCaptionId}>
              <table className="data-table">
                <caption id={payCaptionId} className="sr-only">
                  Sổ cái đối soát giao dịch thanh toán VNPAY và hoàn tiền
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Mã GD / VNPAY</th>
                    <th scope="col">Mã đơn &amp; Cơ sở</th>
                    <th scope="col">Khách hàng</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Tiền thu gốc</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Đã hoàn</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Thực giữ (Pre-VAT + VAT)</th>
                    <th scope="col" style={{ textAlign: 'center' }}>Trạng thái &amp; Lý do</th>
                    <th scope="col">Thời gian GD</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPayments ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#6B7280' }}>
                        Đang tải sổ cái đối soát giao dịch...
                      </td>
                    </tr>
                  ) : (paymentsData?.items || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#6B7280' }}>
                        Không có giao dịch nào trong kỳ/bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    (paymentsData?.items || []).map((tx) => {
                      const badge = PAYMENT_STATUS_META[tx.payment_status] || { label: tx.payment_status, bg: '#F3F4F6', color: '#374151' };
                      return (
                        <tr key={tx.payment_id}>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: '12.5px' }}>{tx.payment_code}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>
                              VNPAY #{tx.provider_transaction_id || 'N/A'}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '12.5px' }}>{tx.booking_code}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>{tx.accommodation_name}</div>
                          </td>
                          <td>
                            <div>{tx.contact_name}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>{tx.contact_phone}</div>
                          </td>
                          <td style={{ textAlign: 'right' }} className="tabular-nums">{formatVND(tx.amount)}</td>
                          <td style={{ textAlign: 'right', color: tx.refunded_amount > 0 ? '#DC2626' : '#6B7280' }} className="tabular-nums">
                            {formatVND(tx.refunded_amount)}
                          </td>
                          <td style={{ textAlign: 'right' }} className="tabular-nums">
                            <div style={{ fontWeight: 700 }}>{formatVND(tx.net_cash_collected)}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>
                              Pre-VAT: {formatVND(tx.pre_vat_booking_revenue)} · VAT: {formatVND(tx.booking_tax_collected)}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge" style={{ background: badge.bg, color: badge.color }}>
                              {badge.label}
                            </span>
                            {tx.refund_reason && (
                              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px', maxWidth: '210px' }}>
                                {tx.refund_reason}
                              </div>
                            )}
                          </td>
                          <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                            {formatDateVN(tx.paid_at || tx.created_at)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {paymentsData?.pagination && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                <span style={{ color: '#6B7280' }}>
                  Tổng {paymentsData.pagination.total} giao dịch · Trang {paymentsData.pagination.page}/{paymentsData.pagination.totalPages}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={payPage <= 1}
                    onClick={() => setPayPage((p) => p - 1)}
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={payPage >= paymentsData.pagination.totalPages}
                    onClick={() => setPayPage((p) => p + 1)}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail & Monthly Ledger / Profile Modal */}
      {detailModalAccId !== null && (
        <FinancialDetailLedgerModal
          accommodationId={detailModalAccId}
          periodFilters={periodQueryParams}
          isAdmin={isAdmin}
          onClose={() => setDetailModalAccId(null)}
          onSaved={() => setReloadNonce((n) => n + 1)}
          showToast={showToast}
        />
      )}

      {/* Manager Warning Email Modal */}
      {warningModalProperty && (
        <FinancialWarningEmailModal
          property={warningModalProperty}
          periodFilters={periodQueryParams}
          onClose={() => setWarningModalProperty(null)}
          onSent={() => setReloadNonce((n) => n + 1)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
