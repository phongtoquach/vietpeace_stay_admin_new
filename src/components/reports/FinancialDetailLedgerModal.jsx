import { useEffect, useId, useRef, useState } from 'react';
import { X, Save, Lock, Unlock, Building2, AlertTriangle } from 'lucide-react';
import { financialReportsApi } from '../../api/financialReports.js';
import { formatVND, formatDateVN } from '../../data/mockData.js';

export default function FinancialDetailLedgerModal({
  accommodationId,
  periodFilters,
  isAdmin,
  onClose,
  onSaved,
  showToast,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const [innerTab, setInnerTab] = useState('breakdown'); // 'breakdown' | 'ledger' | 'profile'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  const [selectedMonth, setSelectedMonth] = useState(
    periodFilters?.month ? Number(periodFilters.month) : 11,
  );
  const [ledgerForm, setLedgerForm] = useState(null);
  const [profileForm, setProfileForm] = useState(null);

  const loadDetail = async () => {
    if (!accommodationId) return;
    setLoading(true);
    setError('');
    try {
      const data = await financialReportsApi.getAccommodationDetail(accommodationId, periodFilters);
      setDetail(data);
      const prof = data?.property?.profile;
      if (prof) {
        setProfileForm({ ...prof });
      }
      syncMonthForm(selectedMonth, data);
    } catch (err) {
      setError(err.message || 'Không thể tải chi tiết cơ sở.');
    } finally {
      setLoading(false);
    }
  };

  const syncMonthForm = (m, dataPayload = detail) => {
    const existingLedger = dataPayload?.ledgers?.find((l) => Number(l.period_month) === Number(m));
    const prof = dataPayload?.property?.profile;
    if (existingLedger) {
      setLedgerForm({
        period_year: periodFilters?.year || 2026,
        period_month: Number(m),
        ancillary_service_revenue: Number(existingLedger.ancillary_service_revenue || 0),
        other_rental_revenue: Number(existingLedger.other_rental_revenue || 0),
        electricity_cost: Number(existingLedger.electricity_cost || 0),
        water_cost: Number(existingLedger.water_cost || 0),
        internet_fuel_cost: Number(existingLedger.internet_fuel_cost || 0),
        asset_depreciation_cost: Number(existingLedger.asset_depreciation_cost || 0),
        maintenance_repair_cost: Number(existingLedger.maintenance_repair_cost || 0),
        manager_salary_cost: Number(existingLedger.manager_salary_cost || 0),
        staff_payroll_cost: Number(existingLedger.staff_payroll_cost || 0),
        other_operating_cost: Number(existingLedger.other_operating_cost || 0),
        staff_headcount_snapshot: Number(existingLedger.staff_headcount_snapshot || prof?.staff_headcount || 8),
        is_locked: Boolean(existingLedger.is_locked),
        note: existingLedger.note || '',
      });
    } else if (prof) {
      setLedgerForm({
        period_year: periodFilters?.year || 2026,
        period_month: Number(m),
        ancillary_service_revenue: 0,
        other_rental_revenue: 0,
        electricity_cost: Number(prof.base_electricity_cost || 0),
        water_cost: Number(prof.base_water_cost || 0),
        internet_fuel_cost: Number(prof.internet_fuel_cost || 0),
        asset_depreciation_cost: Number(prof.monthly_asset_depreciation || 0),
        maintenance_repair_cost: Number(prof.monthly_maintenance_supplies || 0),
        manager_salary_cost: Number(prof.manager_base_salary || 0),
        staff_payroll_cost: Number(prof.staff_monthly_payroll || 0),
        other_operating_cost: Number(prof.other_fixed_opex || 0),
        staff_headcount_snapshot: Number(prof.staff_headcount || 8),
        is_locked: false,
        note: '',
      });
    }
  };

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return undefined;

    if (accommodationId && !dlg.open) {
      dlg.showModal();
      loadDetail();
    }

    const handleClose = () => {
      dlg.returnValue = '';
      onClose?.();
    };
    dlg.addEventListener('close', handleClose);
    return () => dlg.removeEventListener('close', handleClose);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accommodationId]);

  const handleMonthChange = (nextMonth) => {
    const m = Number(nextMonth);
    setSelectedMonth(m);
    syncMonthForm(m, detail);
  };

  const handleSaveLedger = async (e) => {
    e.preventDefault();
    if (!ledgerForm) return;
    setSaving(true);
    try {
      await financialReportsApi.upsertMonthlyLedger(accommodationId, ledgerForm);
      showToast?.(`Đã lưu sổ cái tháng ${ledgerForm.period_month}/${ledgerForm.period_year}.`);
      await loadDetail();
      onSaved?.();
    } catch (err) {
      showToast?.(err.message || 'Lỗi lưu sổ cái tháng.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm) return;
    setSaving(true);
    try {
      await financialReportsApi.updateOperatingProfile(accommodationId, profileForm);
      showToast?.('Đã cập nhật định mức vận hành & KPI cơ sở.');
      await loadDetail();
      onSaved?.();
    } catch (err) {
      showToast?.(err.message || 'Lỗi cập nhật định mức cơ sở.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const p = detail?.property;

  return (
    <dialog
      ref={dialogRef}
      className="admin-native-dialog"
      aria-labelledby={titleId}
      closedby="any"
    >
      <div className="fin-dialog-header">
        <div>
          <h2 id={titleId} style={{ margin: 0, fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} style={{ color: '#B45309' }} aria-hidden="true" />
            <span>{p ? p.accommodation_name : 'Chi tiết P&L & Sổ cái cơ sở'}</span>
          </h2>
          {p && (
            <div style={{ fontSize: '12.5px', color: '#6B7280', marginTop: '4px' }}>
              {p.accommodation_type_name} · {p.location_name} · {p.total_rooms} phòng · Manager:{' '}
              <strong>{p.manager_name || 'Chưa phân công'}</strong>
              {p.is_new_manager_under_30_days && (
                <span className="badge" style={{ marginLeft: '6px', background: '#FEF3C7', color: '#92400E' }}>
                  Mới tiếp quản (&lt; 30 ngày)
                </span>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => dialogRef.current?.close('close')}
          aria-label="Đóng cửa sổ chi tiết"
        >
          <X size={16} />
        </button>
      </div>

      <div className="fin-dialog-body">
        {loading ? (
          <div style={{ padding: '28px', textAlign: 'center', color: '#6B7280' }}>
            Đang tải dữ liệu tài chính cơ sở...
          </div>
        ) : error ? (
          <div style={{ padding: '16px', background: '#FEF2F2', borderRadius: '8px', color: '#991B1B' }}>
            {error}
          </div>
        ) : (
          <>
            <div className="fin-seg-control" style={{ marginBottom: '16px' }}>
              <button
                type="button"
                className={`fin-seg-btn ${innerTab === 'breakdown' ? 'active' : ''}`}
                onClick={() => setInnerTab('breakdown')}
              >
                Chi tiết P&amp;L ({detail?.period?.periodLabel})
              </button>
              {isAdmin && (
                <>
                  <button
                    type="button"
                    className={`fin-seg-btn ${innerTab === 'ledger' ? 'active' : ''}`}
                    onClick={() => setInnerTab('ledger')}
                  >
                    Nhập / Chốt Sổ cái tháng
                  </button>
                  <button
                    type="button"
                    className={`fin-seg-btn ${innerTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setInnerTab('profile')}
                  >
                    Định mức vận hành &amp; KPI
                  </button>
                </>
              )}
            </div>

            {innerTab === 'breakdown' && p && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Waterfall P&L Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
                  <div style={{ padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11.5px', color: '#6B7280' }}>Thu đặt phòng Pre-VAT</div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0284C7' }} className="tabular-nums">
                      {formatVND(p.net_booking_revenue_pre_vat)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                      VAT thu hộ: {formatVND(p.booking_tax_collected)}
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11.5px', color: '#6B7280' }}>Thu Dịch vụ &amp; Cho thuê</div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0369A1' }} className="tabular-nums">
                      {formatVND(p.extra_facility_revenue)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                      Phụ trợ + Mặt bằng
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11.5px', color: '#6B7280' }}>Tổng Chi OPEX</div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#B45309' }} className="tabular-nums">
                      {formatVND(p.total_expenses)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                      Lương + Điện nước + KH
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', background: p.net_profit_after_tax < 0 ? '#FEF2F2' : '#F0FDF4' }}>
                    <div style={{ fontSize: '11.5px', color: '#6B7280' }}>Lợi nhuận sau thuế</div>
                    <div style={{ fontWeight: 800, fontSize: '14.5px', color: p.net_profit_after_tax < 0 ? '#B91C1C' : '#15803D' }} className="tabular-nums">
                      {formatVND(p.net_profit_after_tax)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                      Biên: {p.net_margin_percent}% · Thuế TNDN: {formatVND(p.tax_amount)}
                    </div>
                  </div>
                </div>

                {p.assigned_at && p.manager_tenure_net_profit !== null && (
                  <div style={{ padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '12.5px' }}>
                    <strong>Đánh giá theo nhiệm kỳ Manager hiện tại</strong> (nhận bàn giao {formatDateVN(p.assigned_at)} · {p.days_since_assigned} ngày):{' '}
                    Lợi nhuận phát sinh từ tháng tiếp quản đến cuối kỳ:{' '}
                    <strong style={{ color: p.manager_tenure_net_profit < 0 ? '#B91C1C' : '#15803D' }}>
                      {formatVND(p.manager_tenure_net_profit)}
                    </strong>
                  </div>
                )}

                {/* Room-type breakdown */}
                <div>
                  <h3 style={{ fontSize: '13.5px', margin: '0 0 8px' }}>Doanh thu theo Hạng phòng</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Hạng phòng</th>
                        <th style={{ textAlign: 'center' }}>Lượt phòng</th>
                        <th style={{ textAlign: 'center' }}>Đêm phòng</th>
                        <th style={{ textAlign: 'right' }}>Tiền phòng &amp; Phụ thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.roomTypeBreakdown.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', color: '#6B7280' }}>
                            Chưa phát sinh đơn hoàn tất theo hạng phòng trong kỳ này.
                          </td>
                        </tr>
                      ) : (
                        detail.roomTypeBreakdown.map((rt) => (
                          <tr key={rt.room_type_id}>
                            <td>{rt.room_type_name}</td>
                            <td style={{ textAlign: 'center' }}>{rt.room_bookings_count}</td>
                            <td style={{ textAlign: 'center' }}>{rt.booked_room_nights}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                              {formatVND(rt.item_total_amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Monthly breakdown table */}
                <div>
                  <h3 style={{ fontSize: '13.5px', margin: '0 0 8px' }}>Hạch toán Thu – Chi từng tháng trong kỳ</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Tháng</th>
                          <th>Nguồn</th>
                          <th style={{ textAlign: 'right' }}>Tổng Thu Ròng</th>
                          <th style={{ textAlign: 'right' }}>Tổng Chi OPEX</th>
                          <th style={{ textAlign: 'right' }}>LN Sau Thuế</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.monthly_breakdown.map((m) => (
                          <tr key={m.month}>
                            <td>
                              Thg {m.month}/{m.year} {m.is_locked && <Lock size={12} style={{ verticalAlign: 'middle', color: '#6B7280' }} />}
                            </td>
                            <td>
                              <span style={{ fontSize: '11.5px', color: m.source === 'LEDGER' ? '#15803D' : '#6B7280' }}>
                                {m.source === 'LEDGER'
                                  ? 'Sổ cái thực tế'
                                  : m.source === 'PROFILE_FALLBACK'
                                    ? 'Suy diễn định mức'
                                    : 'Chưa mở kỳ'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }} className="tabular-nums">{formatVND(m.total_revenue)}</td>
                            <td style={{ textAlign: 'right' }} className="tabular-nums">{formatVND(m.total_expenses)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: m.net_profit_after_tax < 0 ? '#B91C1C' : '#15803D' }} className="tabular-nums">
                              {formatVND(m.net_profit_after_tax)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {detail.warningsHistory?.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '13.5px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={14} style={{ color: '#D97706' }} /> Lịch sử gửi Gmail cảnh báo
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {detail.warningsHistory.slice(0, 5).map((w) => (
                        <div key={w.id} style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px' }}>
                          <div>
                            <strong>{w.period_label}</strong> · Tới {w.recipient_email} ·{' '}
                            <span style={{ color: w.email_status === 'SENT' ? '#15803D' : '#B91C1C' }}>
                              {w.email_status === 'SENT' ? 'Đã gửi' : 'Lỗi SMTP'}
                            </span>
                          </div>
                          <div style={{ color: '#4B5563', marginTop: '3px' }}>{w.admin_note}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {innerTab === 'ledger' && isAdmin && ledgerForm && (
              <form onSubmit={handleSaveLedger} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="fin-filter-item">
                    <label htmlFor="ledger-month-select">Chọn Tháng hạch toán ({ledgerForm.period_year})</label>
                    <select
                      id="ledger-month-select"
                      className="filter-select"
                      value={selectedMonth}
                      onChange={(e) => handleMonthChange(e.target.value)}
                    >
                      {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                        <option key={m} value={m}>Tháng {m}/{ledgerForm.period_year}</option>
                      ))}
                    </select>
                  </div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', paddingBottom: '6px' }}>
                    <input
                      type="checkbox"
                      checked={ledgerForm.is_locked}
                      onChange={(e) => setLedgerForm({ ...ledgerForm, is_locked: e.target.checked })}
                    />
                    {ledgerForm.is_locked ? <Lock size={14} /> : <Unlock size={14} />}
                    Khóa sổ tháng này
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {[
                    ['ancillary_service_revenue', 'Thu dịch vụ phụ trợ (VNĐ)'],
                    ['other_rental_revenue', 'Thu cho thuê mặt bằng/sự kiện'],
                    ['manager_salary_cost', 'Lương Manager thực chi'],
                    ['staff_payroll_cost', 'Quỹ lương nhân viên thực chi'],
                    ['electricity_cost', 'Tiền điện thực tế'],
                    ['water_cost', 'Tiền nước thực tế'],
                    ['asset_depreciation_cost', 'Khấu hao tài sản tháng'],
                    ['maintenance_repair_cost', 'Bảo trì & Vật tư'],
                    ['internet_fuel_cost', 'Internet & Nhiên liệu'],
                    ['other_operating_cost', 'Chi phí vận hành khác'],
                    ['staff_headcount_snapshot', 'Số nhân sự tháng'],
                  ].map(([key, label]) => (
                    <div key={key} className="fin-filter-item">
                      <label htmlFor={`ledger-${key}`}>{label}</label>
                      <input
                        id={`ledger-${key}`}
                        type="number"
                        min="0"
                        className="form-input"
                        value={ledgerForm[key]}
                        onChange={(e) => setLedgerForm({ ...ledgerForm, [key]: Number(e.target.value || 0) })}
                      />
                    </div>
                  ))}
                </div>

                <div className="fin-filter-item">
                  <label htmlFor="ledger-note">Ghi chú sổ cái tháng</label>
                  <input
                    id="ledger-note"
                    type="text"
                    className="form-input"
                    value={ledgerForm.note}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, note: e.target.value })}
                    placeholder="Ghi chú kiểm toán hoặc giải trình biến động tháng..."
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <Save size={15} /> {saving ? 'Đang lưu...' : 'Lưu Sổ cái Tháng'}
                  </button>
                </div>
              </form>
            )}

            {innerTab === 'profile' && isAdmin && profileForm && (
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {[
                    ['staff_headcount', 'Định biên nhân viên (người)'],
                    ['manager_base_salary', 'Lương cơ bản Manager / tháng'],
                    ['staff_avg_salary', 'Lương bình quân / nhân viên'],
                    ['staff_monthly_payroll', 'Tổng quỹ lương NV / tháng'],
                    ['base_electricity_cost', 'Tiền điện cố định / tháng'],
                    ['base_water_cost', 'Tiền nước cố định / tháng'],
                    ['variable_utility_per_room_night', 'Biến phí điện nước / đêm phòng'],
                    ['internet_fuel_cost', 'Internet & Nhiên liệu / tháng'],
                    ['monthly_asset_depreciation', 'Khấu hao tài sản / tháng'],
                    ['monthly_maintenance_supplies', 'Bảo trì định kỳ / tháng'],
                    ['other_fixed_opex', 'Chi phí cố định khác / tháng'],
                    ['tax_rate_percent', 'Thuế suất TNDN ước tính (%)'],
                    ['monthly_target_net_profit', 'Chỉ tiêu KPI Lợi nhuận / tháng'],
                  ].map(([key, label]) => (
                    <div key={key} className="fin-filter-item">
                      <label htmlFor={`prof-${key}`}>{label}</label>
                      <input
                        id={`prof-${key}`}
                        type="number"
                        min="0"
                        step={key === 'tax_rate_percent' ? '0.5' : '1'}
                        className="form-input"
                        value={profileForm[key]}
                        onChange={(e) => setProfileForm({ ...profileForm, [key]: Number(e.target.value || 0) })}
                      />
                    </div>
                  ))}
                  <div className="fin-filter-item">
                    <label htmlFor="prof-opex-start">Ngày bắt đầu tính OPEX</label>
                    <input
                      id="prof-opex-start"
                      type="date"
                      className="form-input"
                      value={profileForm.opex_start_date || '2026-01-01'}
                      onChange={(e) => setProfileForm({ ...profileForm, opex_start_date: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <Save size={15} /> {saving ? 'Đang cập nhật...' : 'Cập nhật Định mức & KPI'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      <div className="fin-dialog-footer">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => dialogRef.current?.close('close')}
        >
          Đóng
        </button>
      </div>
    </dialog>
  );
}
