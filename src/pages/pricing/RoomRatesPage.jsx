import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { formatVND, formatDateVN, ADJUSTMENT_OPTIONS } from '../../data/mockData.js';
import {
  Edit2,
  Save,
  X,
  RotateCcw,
  Calendar,
  Building2,
  SlidersHorizontal,
  CheckCircle,
  ArrowRight,
  Trash2,
  AlertCircle,
  Plus,
  HelpCircle,
  Tag
} from 'lucide-react';

export default function RoomRatesPage() {
  const {
    roomRates,
    accommodations,
    locations,
    roomTypes,
    ratePeriods,
    roomWeekdayRates,
    getRoomWeekdayRates,
    updateRoomWeekdayRates,
    saveRatePeriodRoomConfig,
    bulkSaveRatePeriodRoomConfig,
    removeRatePeriodItem,
    DAYS_OF_WEEK
  } = useAdmin();

  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab: 'special' (Cấu hình giá kỳ đặc biệt) | 'weekday' (Giá theo ngày trong tuần)
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'weekday' ? 'weekday' : 'special');

  // Filters for Weekday tab
  const [weekdayAccFilter, setWeekdayAccFilter] = useState(searchParams.get('accId') || '');

  // 7-Day Edit Modal State (room_weekday_rates)
  const [editingWeekdayRoom, setEditingWeekdayRoom] = useState(null);
  const [weekdayForm, setWeekdayForm] = useState({ 1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '' });
  const [uniformPrice, setUniformPrice] = useState('');

  // =========================================================================
  // TAB 2: SPECIAL RATE PERIOD PRICE CONFIGURATION STATE
  // =========================================================================

  // A. Rate Period Selection (default to first available)
  const [selectedPeriodId, setSelectedPeriodId] = useState(() => {
    const fromParam = searchParams.get('periodId');
    if (fromParam) return fromParam;
    return ratePeriods.length > 0 ? String(ratePeriods[0].id) : '';
  });

  // Ensure valid rate period is selected after loading/updates
  useEffect(() => {
    if (ratePeriods.length > 0) {
      const exists = ratePeriods.some((p) => String(p.id) === String(selectedPeriodId));
      if (!exists && !selectedPeriodId) {
        setSelectedPeriodId(String(ratePeriods[0].id));
      }
    } else {
      setSelectedPeriodId('');
    }
  }, [ratePeriods, selectedPeriodId]);

  // Selected period object
  const currentPeriod = useMemo(() => {
    if (!selectedPeriodId) return null;
    return ratePeriods.find((p) => String(p.id) === String(selectedPeriodId)) || null;
  }, [ratePeriods, selectedPeriodId]);

  // B. Location & Accommodation Selection
  // Initial location and accommodation from query param if available
  const initialAcc = useMemo(() => {
    const accParam = searchParams.get('accId');
    if (accParam) {
      return accommodations.find((a) => String(a.id) === String(accParam)) || null;
    }
    return accommodations[0] || null;
  }, [searchParams, accommodations]);

  const [selectedLocationId, setSelectedLocationId] = useState(() => {
    if (initialAcc) {
      return String(initialAcc.location_id);
    }
    return locations.length > 1 ? String(locations[1].id) : '';
  });

  const [selectedAccId, setSelectedAccId] = useState(() => {
    return initialAcc ? String(initialAcc.id) : '';
  });

  // Helper: Check if accommodation belongs to location (including hierarchical ancestry)
  const doesAccommodationBelongToLocation = (acc, targetLocationId) => {
    if (!targetLocationId) return false;
    let curr = acc.location_id;
    while (curr) {
      if (String(curr) === String(targetLocationId)) return true;
      const found = locations.find((l) => l.id === Number(curr));
      curr = found ? found.parent_location_id : null;
    }
    return false;
  };

  // List of accommodations belonging to selected location
  const accommodationsForLocation = useMemo(() => {
    if (!selectedLocationId) return [];
    return accommodations.filter((a) => doesAccommodationBelongToLocation(a, selectedLocationId));
  }, [accommodations, selectedLocationId, locations]);

  // C. Bulk Configuration State
  const [bulkAdjustmentType, setBulkAdjustmentType] = useState('FIXED');
  const [bulkAdjustmentValue, setBulkAdjustmentValue] = useState('');
  const [bulkError, setBulkError] = useState('');

  // D. Row-level Inline Editing State
  const [editingRowId, setEditingRowId] = useState(null);
  const [rowDraftType, setRowDraftType] = useState('FIXED');
  const [rowDraftValue, setRowDraftValue] = useState('');
  const [rowError, setRowError] = useState('');

  // Handle Location change: clear accommodation selection and room type table
  const handleLocationChange = (e) => {
    const newLocId = e.target.value;
    setSelectedLocationId(newLocId);
    setSelectedAccId(''); // Clears previous accommodation
    setEditingRowId(null);
    setRowError('');
  };

  // Handle Accommodation change
  const handleAccommodationChange = (e) => {
    setSelectedAccId(e.target.value);
    setEditingRowId(null);
    setRowError('');
  };

  // All room types belonging to selected accommodation
  const allRoomTypesForAcc = useMemo(() => {
    if (!selectedAccId) return [];
    return roomTypes.filter((r) => String(r.accommodation_id) === String(selectedAccId));
  }, [roomTypes, selectedAccId]);

  // Map of configured special rate items for selected rate period
  const configuredItemsMap = useMemo(() => {
    const map = {};
    if (!selectedPeriodId) return map;
    roomRates
      .filter((item) => String(item.rate_period_id) === String(selectedPeriodId))
      .forEach((item) => {
        map[item.room_type_id] = item;
      });
    return map;
  }, [roomRates, selectedPeriodId]);

  // Get Unit string for adjustment type
  const getUnitForType = (type) => {
    if (type === 'PERCENT_INCREASE' || type === 'PERCENT_DECREASE') return '%';
    return 'VNĐ';
  };

  // Format saved configuration description for display in normal viewing mode
  const renderConfigDescription = (config) => {
    if (!config) return <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Chưa cấu hình</span>;

    const adjType = config.adjustment_type || 'FIXED';
    const adjVal = config.adjustment_value !== undefined ? config.adjustment_value : config.price;
    if (adjVal === undefined || adjVal === null || Number(adjVal) <= 0) {
      return <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Chưa cấu hình</span>;
    }

    switch (adjType) {
      case 'FIXED':
        return (
          <span style={{ fontWeight: 600, color: '#1E3A8A' }}>
            Giá cố định {formatVND(adjVal)}/đêm
          </span>
        );
      case 'PERCENT_INCREASE':
        return (
          <span style={{ fontWeight: 600, color: '#B45309' }}>
            Tăng {adjVal}% so với giá gốc
          </span>
        );
      case 'PERCENT_DECREASE':
        return (
          <span style={{ fontWeight: 600, color: '#047857' }}>
            Giảm {adjVal}% so với giá gốc
          </span>
        );
      case 'AMOUNT_INCREASE':
        return (
          <span style={{ fontWeight: 600, color: '#B45309' }}>
            Tăng thêm {formatVND(adjVal)}
          </span>
        );
      case 'AMOUNT_DECREASE':
        return (
          <span style={{ fontWeight: 600, color: '#047857' }}>
            Giảm {formatVND(adjVal)}
          </span>
        );
      default:
        return (
          <span style={{ fontWeight: 600, color: '#1E3A8A' }}>
            Giá cố định {formatVND(adjVal)}/đêm
          </span>
        );
    }
  };

  // =========================================================================
  // ACTIONS: BULK SAVE
  // =========================================================================
  const handleBulkSave = (e) => {
    e.preventDefault();
    setBulkError('');

    if (!selectedPeriodId) {
      setBulkError('Vui lòng chọn một kỳ giá đặc biệt trước khi lưu.');
      return;
    }
    if (!selectedAccId) {
      setBulkError('Vui lòng chọn cơ sở lưu trú trước khi lưu.');
      return;
    }

    const valNum = Number(bulkAdjustmentValue);
    if (!bulkAdjustmentValue || isNaN(valNum) || valNum <= 0) {
      setBulkError('Vui lòng nhập giá trị điều chỉnh là số hợp lệ và lớn hơn 0.');
      return;
    }

    if (bulkAdjustmentType === 'PERCENT_DECREASE' && valNum > 100) {
      setBulkError('Giảm theo % không được vượt quá 100%.');
      return;
    }

    const success = bulkSaveRatePeriodRoomConfig(
      selectedPeriodId,
      selectedAccId,
      bulkAdjustmentType,
      valNum
    );

    if (success) {
      setBulkAdjustmentValue('');
      setBulkError('');
    }
  };

  // =========================================================================
  // ACTIONS: INLINE ROW EDITING
  // =========================================================================
  const handleStartEditRow = (room) => {
    setEditingRowId(room.id);
    setRowError('');
    const existing = configuredItemsMap[room.id];
    if (existing && existing.adjustment_type) {
      setRowDraftType(existing.adjustment_type);
      setRowDraftValue(String(existing.adjustment_value !== undefined ? existing.adjustment_value : existing.price));
    } else {
      setRowDraftType('FIXED');
      setRowDraftValue(String(room.base_price || ''));
    }
  };

  const handleCancelEditRow = () => {
    setEditingRowId(null);
    setRowDraftValue('');
    setRowError('');
  };

  const handleSaveRow = (room) => {
    setRowError('');
    const valNum = Number(rowDraftValue);

    if (!rowDraftValue || isNaN(valNum) || valNum <= 0) {
      setRowError('Vui lòng nhập giá trị điều chỉnh hợp lệ (lớn hơn 0).');
      return;
    }

    if (rowDraftType === 'PERCENT_DECREASE' && valNum > 100) {
      setRowError('Giảm theo % không được lớn hơn 100%.');
      return;
    }

    const ok = saveRatePeriodRoomConfig(
      selectedPeriodId,
      room.id,
      selectedAccId,
      rowDraftType,
      valNum
    );

    if (ok) {
      setEditingRowId(null);
      setRowDraftValue('');
      setRowError('');
    }
  };

  // Remove configuration for single room type
  const handleRemoveRow = (roomTypeId) => {
    removeRatePeriodItem(selectedPeriodId, roomTypeId);
    if (editingRowId === roomTypeId) {
      setEditingRowId(null);
    }
  };

  // =========================================================================
  // TAB 1: WEEKDAY RATES HANDLERS
  // =========================================================================
  const handleOpenEditWeekday = (room) => {
    setEditingWeekdayRoom(room);
    const existingRates = getRoomWeekdayRates(room.id);
    const formVals = {};
    existingRates.forEach((r) => {
      formVals[r.day_of_week] = String(r.price);
    });
    setWeekdayForm(formVals);
    setUniformPrice(String(room.base_price || ''));
  };

  const handleSaveWeekday = (e) => {
    e.preventDefault();
    if (!editingWeekdayRoom) return;

    for (let day = 1; day <= 7; day++) {
      const price = Number(weekdayForm[day]);
      if (isNaN(price) || price < 0) {
        alert('Tất cả giá các ngày trong tuần phải là số hợp lệ và lớn hơn hoặc bằng 0.');
        return;
      }
    }

    updateRoomWeekdayRates(editingWeekdayRoom.id, weekdayForm);
    setEditingWeekdayRoom(null);
  };

  const handleApplyUniform = () => {
    const val = Number(uniformPrice);
    if (isNaN(val) || val < 0) return;
    setWeekdayForm({
      1: String(val),
      2: String(val),
      3: String(val),
      4: String(val),
      5: String(val),
      6: String(val),
      7: String(val)
    });
  };

  const handleApplyWeekendSurcharge = () => {
    const base = Number(weekdayForm[1]) || Number(editingWeekdayRoom?.base_price) || 1000000;
    const weekendPrice = Math.round(base * 1.2);
    setWeekdayForm((prev) => ({
      ...prev,
      6: String(weekendPrice),
      7: String(weekendPrice)
    }));
  };

  // Distinct locations for dropdown
  const destinationOptions = useMemo(() => {
    return locations.filter((loc) => loc.parent_location_id !== null);
  }, [locations]);

  return (
    <div>
      <PageHeader
        title="Quản lý giá phòng"
        description="Cấu hình giá kỳ đặc biệt cho từng cơ sở lưu trú và thiết lập bảng giá phòng tiêu chuẩn 7 ngày trong tuần."
        breadcrumb={[
          { label: 'Giá & Phòng trống' },
          { label: 'Cấu hình giá phòng' }
        ]}
      />

      {/* Navigation Tabs */}
      <div className="tabs-header" style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #E5E7EB', paddingBottom: '2px' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'special' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => {
            setActiveTab('special');
            setSearchParams({ tab: 'special' });
          }}
        >
          <Calendar size={15} />
          <span>Cấu hình giá kỳ đặc biệt</span>
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'weekday' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => {
            setActiveTab('weekday');
            setSearchParams({ tab: 'weekday' });
          }}
        >
          <SlidersHorizontal size={15} />
          <span>Giá theo ngày trong tuần (7 ngày)</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB: CẤU HÌNH GIÁ KỲ ĐẶC BIỆT                                          */}
      {/* ===================================================================== */}
      {activeTab === 'special' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* SECTION A: RATE PERIOD SELECTION */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ maxWidth: '640px', marginBottom: '14px' }}>
              <label
                htmlFor="rate-period-dropdown"
                style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#1F2937', marginBottom: '6px' }}
              >
                Kỳ giá đặc biệt
              </label>

              {ratePeriods.length === 0 ? (
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: '6px',
                    color: '#991B1B',
                    fontSize: '13px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    <AlertCircle size={16} /> Chưa có kỳ giá đặc biệt nào được tạo trong hệ thống.
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    Vui lòng chuyển sang trang{' '}
                    <Link to="/admin/rate-periods" style={{ color: '#991B1B', textDecoration: 'underline', fontWeight: 600 }}>
                      Quản lý kỳ giá đặc biệt
                    </Link>{' '}
                    để tạo mới kỳ giá trước khi cấu hình.
                  </div>
                </div>
              ) : (
                <select
                  id="rate-period-dropdown"
                  className="form-select"
                  style={{ width: '100%', height: '40px', fontSize: '14px', fontWeight: 500 }}
                  value={selectedPeriodId}
                  onChange={(e) => {
                    setSelectedPeriodId(e.target.value);
                    setEditingRowId(null);
                    setRowError('');
                  }}
                >
                  {ratePeriods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatDateVN(p.start_date)} - {formatDateVN(p.end_date)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Selected Period Details: Start date, End date, Description */}
            {currentPeriod && (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '14px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155' }}>
                    <Calendar size={15} color="#0284C7" />
                    <span>
                      Ngày bắt đầu: <strong>{formatDateVN(currentPeriod.start_date)}</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155' }}>
                    <Calendar size={15} color="#0284C7" />
                    <span>
                      Ngày kết thúc: <strong>{formatDateVN(currentPeriod.end_date)}</strong>
                    </span>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <StatusBadge status={currentPeriod.status} />
                  </div>
                </div>

                {currentPeriod.description && (
                  <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, borderTop: '1px dashed #E2E8F0', paddingTop: '8px' }}>
                    <strong>Mô tả:</strong> {currentPeriod.description}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION B: LOCATION AND ACCOMMODATION SELECTION */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Điểm đến */}
              <div>
                <label
                  htmlFor="location-dropdown"
                  style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: '#1F2937', marginBottom: '6px' }}
                >
                  Điểm đến
                </label>
                <select
                  id="location-dropdown"
                  className="form-select"
                  style={{ width: '100%', height: '38px', fontSize: '13.5px' }}
                  value={selectedLocationId}
                  onChange={handleLocationChange}
                  disabled={ratePeriods.length === 0}
                >
                  <option value="">-- Chọn điểm đến --</option>
                  {destinationOptions.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cơ sở lưu trú */}
              <div>
                <label
                  htmlFor="accommodation-dropdown"
                  style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: '#1F2937', marginBottom: '6px' }}
                >
                  Cơ sở lưu trú
                </label>
                <select
                  id="accommodation-dropdown"
                  className="form-select"
                  style={{ width: '100%', height: '38px', fontSize: '13.5px' }}
                  value={selectedAccId}
                  onChange={handleAccommodationChange}
                  disabled={ratePeriods.length === 0 || !selectedLocationId}
                >
                  <option value="">-- Chọn cơ sở lưu trú --</option>
                  {accommodationsForLocation.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Prompt if location selected but accommodation not chosen */}
            {selectedLocationId && accommodationsForLocation.length === 0 && (
              <div style={{ marginTop: '12px', fontSize: '13px', color: '#6B7280', fontStyle: 'italic' }}>
                Không có cơ sở lưu trú nào thuộc điểm đến này. Vui lòng chọn điểm đến khác.
              </div>
            )}
            {!selectedAccId && selectedLocationId && accommodationsForLocation.length > 0 && (
              <div style={{ marginTop: '12px', fontSize: '13px', color: '#4B5563' }}>
                Vui lòng chọn cơ sở lưu trú để hiển thị danh sách tất cả các loại phòng và cấu hình giá.
              </div>
            )}
          </div>

          {/* If accommodation is selected: display Bulk Section and Room Type Table */}
          {selectedAccId && (
            <>
              {/* SECTION C: BULK CONFIGURATION SECTION */}
              <div
                className="card"
                style={{
                  padding: '20px',
                  backgroundColor: '#F8FAFC',
                  borderColor: '#CBD5E1',
                  borderRadius: '8px'
                }}
              >
                <div style={{ marginBottom: '6px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                  Cấu hình chung cho tất cả loại phòng
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748B', marginBottom: '14px' }}>
                  Áp dụng và ghi đè cấu hình cho tất cả loại phòng của cơ sở lưu trú trong kỳ giá đang chọn.
                </div>

                <form
                  onSubmit={handleBulkSave}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}
                >
                  {/* Loại điều chỉnh dropdown */}
                  <div style={{ minWidth: '220px' }}>
                    <label
                      htmlFor="bulk-adj-type"
                      style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}
                    >
                      Loại điều chỉnh
                    </label>
                    <select
                      id="bulk-adj-type"
                      className="form-select"
                      style={{ width: '100%', height: '36px', fontSize: '13px' }}
                      value={bulkAdjustmentType}
                      onChange={(e) => {
                        setBulkAdjustmentType(e.target.value);
                        setBulkError('');
                      }}
                      disabled={ratePeriods.length === 0}
                    >
                      {ADJUSTMENT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Giá trị điều chỉnh input with dynamic unit */}
                  <div style={{ width: '200px' }}>
                    <label
                      htmlFor="bulk-adj-val"
                      style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}
                    >
                      Giá trị điều chỉnh
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        id="bulk-adj-val"
                        type="number"
                        className="form-input"
                        style={{
                          width: '100%',
                          height: '36px',
                          borderTopRightRadius: 0,
                          borderBottomRightRadius: 0,
                          textAlign: 'right',
                          fontWeight: 600
                        }}
                        placeholder={bulkAdjustmentType.includes('PERCENT') ? 'Ví dụ: 15' : 'Ví dụ: 1500000'}
                        value={bulkAdjustmentValue}
                        onChange={(e) => {
                          setBulkAdjustmentValue(e.target.value);
                          setBulkError('');
                        }}
                        disabled={ratePeriods.length === 0}
                      />
                      <span
                        style={{
                          height: '36px',
                          padding: '0 12px',
                          backgroundColor: '#E2E8F0',
                          border: '1px solid #CBD5E1',
                          borderLeft: 'none',
                          borderTopRightRadius: '6px',
                          borderBottomRightRadius: '6px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {getUnitForType(bulkAdjustmentType)}
                      </span>
                    </div>
                  </div>

                  {/* Button Lưu */}
                  <div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ height: '36px', padding: '0 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      disabled={ratePeriods.length === 0}
                    >
                      <Save size={15} />
                      <span>Lưu</span>
                    </button>
                  </div>
                </form>

                {bulkError && (
                  <div style={{ marginTop: '10px', color: '#DC2626', fontSize: '12.5px', fontWeight: 500 }}>
                    {bulkError}
                  </div>
                )}
              </div>

              {/* SECTION D: ROOM TYPE TABLE */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '35%' }}>Tên loại phòng</th>
                        <th style={{ width: '45%' }}>Cấu hình giá</th>
                        <th style={{ width: '20%', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRoomTypesForAcc.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', padding: '36px', color: '#6B7280' }}>
                            Cơ sở lưu trú này chưa có loại phòng nào được thiết lập.
                          </td>
                        </tr>
                      ) : (
                        allRoomTypesForAcc.map((room) => {
                          const config = configuredItemsMap[room.id];
                          const isConfigured = Boolean(
                            config && (config.adjustment_value !== undefined || config.price > 0)
                          );
                          const isEditing = editingRowId === room.id;

                          return (
                            <tr
                              key={room.id}
                              style={{
                                backgroundColor: isEditing ? '#FEFCE8' : undefined,
                                transition: 'background-color 0.15s ease'
                              }}
                            >
                              {/* 1. Tên loại phòng */}
                              <td>
                                <div style={{ fontWeight: 600, color: '#1F2937', fontSize: '13.5px' }}>
                                  {room.name}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                  Mã: {room.code || 'N/A'} · Giá gốc: {formatVND(room.base_price)}
                                </div>
                              </td>

                              {/* 2. Cấu hình giá */}
                              <td>
                                {isEditing ? (
                                  /* INLINE EDITING MODE: Dropdown, numeric input, unit */
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                      {/* Dropdown Loại điều chỉnh */}
                                      <select
                                        className="form-select"
                                        style={{
                                          height: '34px',
                                          fontSize: '12.5px',
                                          minWidth: '180px',
                                          fontWeight: 500
                                        }}
                                        value={rowDraftType}
                                        onChange={(e) => {
                                          setRowDraftType(e.target.value);
                                          setRowError('');
                                        }}
                                      >
                                        {ADJUSTMENT_OPTIONS.map((opt) => (
                                          <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>

                                      {/* Input Giá trị điều chỉnh */}
                                      <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <input
                                          type="number"
                                          className="form-input"
                                          style={{
                                            width: '130px',
                                            height: '34px',
                                            textAlign: 'right',
                                            fontWeight: 600,
                                            borderTopRightRadius: 0,
                                            borderBottomRightRadius: 0
                                          }}
                                          placeholder="Nhập giá trị"
                                          value={rowDraftValue}
                                          onChange={(e) => {
                                            setRowDraftValue(e.target.value);
                                            setRowError('');
                                          }}
                                          autoFocus
                                        />
                                        <span
                                          style={{
                                            height: '34px',
                                            padding: '0 10px',
                                            backgroundColor: '#E2E8F0',
                                            border: '1px solid #CBD5E1',
                                            borderLeft: 'none',
                                            borderTopRightRadius: '6px',
                                            borderBottomRightRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            color: '#475569',
                                            display: 'flex',
                                            alignItems: 'center'
                                          }}
                                        >
                                          {getUnitForType(rowDraftType)}
                                        </span>
                                      </div>
                                    </div>

                                    {rowError && (
                                      <span style={{ color: '#DC2626', fontSize: '11.5px', fontWeight: 500 }}>
                                        {rowError}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  /* NORMAL VIEWING MODE: Description */
                                  <div>
                                    <div style={{ fontSize: '13.5px' }}>{renderConfigDescription(config)}</div>
                                    {isConfigured && config.price > 0 && (
                                      <div style={{ fontSize: '11.5px', color: '#4B5563', marginTop: '2px' }}>
                                        Giá áp dụng:{' '}
                                        <strong style={{ color: '#1E40AF' }}>{formatVND(config.price)}/đêm</strong>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* 3. Thao tác */}
                              <td style={{ textAlign: 'center' }}>
                                {isEditing ? (
                                  /* Inline editing actions: Lưu & Hủy */
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-sm"
                                      title="Lưu"
                                      style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                      onClick={() => handleSaveRow(room)}
                                    >
                                      <Save size={13} />
                                      <span>Lưu</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      title="Hủy"
                                      style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                      onClick={handleCancelEditRow}
                                    >
                                      <X size={13} />
                                      <span>Hủy</span>
                                    </button>
                                  </div>
                                ) : (
                                  /* Normal viewing actions: Edit & Remove */
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                      type="button"
                                      className="btn-action"
                                      title="Chỉnh sửa"
                                      onClick={() => handleStartEditRow(room)}
                                    >
                                      <Edit2 size={15} />
                                    </button>

                                    {isConfigured ? (
                                      <button
                                        type="button"
                                        className="btn-action btn-action-danger"
                                        title="Gỡ cấu hình"
                                        onClick={() => handleRemoveRow(room.id)}
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="btn-action"
                                        style={{ opacity: 0.35, cursor: 'not-allowed' }}
                                        title="Chưa cấu hình"
                                        disabled
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: GIÁ THEO NGÀY TRONG TUẦN (7 NGÀY) MATRIX                         */}
      {/* ===================================================================== */}
      {activeTab === 'weekday' && (
        <div>
          {/* Banner */}
          <div
            className="card"
            style={{
              marginBottom: '16px',
              backgroundColor: '#FFFDF5',
              borderColor: '#F7E396',
              padding: '12px 16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#4B3800' }}>
                <CheckCircle size={16} color="#8C5A00" />
                <span>
                  <strong>Bảng giá chuẩn 7 ngày trong tuần:</strong> Mỗi loại phòng có 7 mức giá ứng với từng ngày
                  trong tuần (Thứ Hai đến Chủ Nhật). Giá kỳ đặc biệt sẽ ghi đè mức giá này khi khách đặt phòng trong thời gian áp dụng kỳ giá.
                </span>
              </div>
              <span className="badge badge-success" style={{ fontWeight: 600 }}>
                7 Ngày / Tuần
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <div className="filter-group">
              <label htmlFor="weekday-acc-filter">Lọc theo cơ sở lưu trú:</label>
              <select
                id="weekday-acc-filter"
                className="filter-select"
                value={weekdayAccFilter}
                onChange={(e) => setWeekdayAccFilter(e.target.value)}
              >
                <option value="">Tất cả cơ sở lưu trú</option>
                {accommodations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {weekdayAccFilter && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setWeekdayAccFilter('')}
              >
                <RotateCcw size={13} /> Đặt lại lọc
              </button>
            )}
          </div>

          {/* 7-Day Matrix Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>Mã</th>
                    <th>Cơ sở lưu trú</th>
                    <th>Loại phòng</th>
                    <th style={{ textAlign: 'right', width: '110px' }}>Giá gốc</th>
                    <th style={{ textAlign: 'right', backgroundColor: '#F9FAFB' }}>T2 (Thứ 2)</th>
                    <th style={{ textAlign: 'right', backgroundColor: '#F9FAFB' }}>T3 (Thứ 3)</th>
                    <th style={{ textAlign: 'right', backgroundColor: '#F9FAFB' }}>T4 (Thứ 4)</th>
                    <th style={{ textAlign: 'right', backgroundColor: '#F9FAFB' }}>T5 (Thứ 5)</th>
                    <th style={{ textAlign: 'right', backgroundColor: '#F9FAFB' }}>T6 (Thứ 6)</th>
                    <th style={{ textAlign: 'right', backgroundColor: '#FEF9C3', color: '#8C5A00' }}>T7 (Thứ 7)</th>
                    <th style={{ textAlign: 'right', backgroundColor: '#FEF9C3', color: '#8C5A00' }}>CN (Chủ Nhật)</th>
                    <th style={{ textAlign: 'center', width: '130px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {roomTypes
                    .filter((r) => !weekdayAccFilter || String(r.accommodation_id) === String(weekdayAccFilter))
                    .map((room) => {
                      const acc = accommodations.find((a) => a.id === room.accommodation_id);
                      const rates = getRoomWeekdayRates(room.id);
                      const rateByDay = {};
                      rates.forEach((r) => {
                        rateByDay[r.day_of_week] = r.price;
                      });

                      return (
                        <tr key={room.id}>
                          <td className="code-badge">#{room.id}</td>
                          <td style={{ fontWeight: 600 }}>{acc ? acc.name : 'N/A'}</td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#292D32' }}>{room.name}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>
                              Mã: {room.code || 'N/A'} · Sức chứa: {room.capacity_adults} người lớn
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', color: '#6B7280', fontSize: '12px' }} className="tabular-nums">
                            {formatVND(room.base_price)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }} className="tabular-nums">
                            {formatVND(rateByDay[1] || room.base_price)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }} className="tabular-nums">
                            {formatVND(rateByDay[2] || room.base_price)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }} className="tabular-nums">
                            {formatVND(rateByDay[3] || room.base_price)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }} className="tabular-nums">
                            {formatVND(rateByDay[4] || room.base_price)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }} className="tabular-nums">
                            {formatVND(rateByDay[5] || room.base_price)}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 700,
                              backgroundColor: '#FEFCE8',
                              color: '#713F12'
                            }}
                            className="tabular-nums"
                          >
                            {formatVND(rateByDay[6] || room.base_price)}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 700,
                              backgroundColor: '#FEFCE8',
                              color: '#713F12'
                            }}
                            className="tabular-nums"
                          >
                            {formatVND(rateByDay[7] || room.base_price)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                              onClick={() => handleOpenEditWeekday(room)}
                            >
                              <Edit2 size={13} />
                              <span>Chỉnh sửa 7 ngày</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Weekday 7-Day Edit Modal */}
      {editingWeekdayRoom && (
        <div className="modal-backdrop" onClick={() => setEditingWeekdayRoom(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                Chỉnh sửa giá 7 ngày: {editingWeekdayRoom.name}
              </h2>
              <button
                type="button"
                className="btn-close"
                onClick={() => setEditingWeekdayRoom(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveWeekday}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#F3F4F6', borderRadius: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563' }}>
                    Giá niêm yết gốc: <strong>{formatVND(editingWeekdayRoom.base_price)}</strong>
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleApplyWeekendSurcharge}
                    >
                      +20% Cuối tuần (T7, CN)
                    </button>
                  </div>
                </div>

                {/* 7 Days Input Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {DAYS_OF_WEEK.map((d) => (
                    <div key={d.day}>
                      <label
                        htmlFor={`day-${d.day}`}
                        style={{
                          display: 'block',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          color: d.isWeekend ? '#9A3412' : '#374151',
                          marginBottom: '3px'
                        }}
                      >
                        {d.name} {d.isWeekend ? '(Cuối tuần)' : ''}:
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          id={`day-${d.day}`}
                          type="number"
                          className="form-input"
                          style={{
                            width: '100%',
                            height: '34px',
                            textAlign: 'right',
                            fontWeight: 600,
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0
                          }}
                          value={weekdayForm[d.day] || ''}
                          onChange={(e) =>
                            setWeekdayForm({ ...weekdayForm, [d.day]: e.target.value })
                          }
                        />
                        <span
                          style={{
                            height: '34px',
                            padding: '0 8px',
                            backgroundColor: '#E5E7EB',
                            border: '1px solid #D1D5DB',
                            borderLeft: 'none',
                            borderTopRightRadius: '6px',
                            borderBottomRightRadius: '6px',
                            fontSize: '11px',
                            color: '#4B5563',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          VNĐ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingWeekdayRoom(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={15} /> Lưu bảng giá 7 ngày
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
