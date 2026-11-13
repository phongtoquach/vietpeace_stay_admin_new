import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { pricingApi } from '../../api/pricing';
import PricingConfiguration from './PricingConfiguration';
import PriceAdjustmentDialog from './PriceAdjustmentDialog';
import WeekdayPriceDialog from './WeekdayPriceDialog';
import PricingHistoryView from './PricingHistoryView';
import { PricingHeader, Message, Modal } from './PricingShared';
import { usePricingAccess, currency, localToday, addDays, startOfWeek, shortDate, weekdays, types, sourceLabels } from './pricingUtils';
function PriceSourceIcon({
  source,
  bar = false
}) {
  if (source !== 'override' && source !== 'period') return null;
  return <i className={`${bar ? 'pricing-source-bar' : 'pricing-source-swatch'} pricing-source--${source}`} role="img" aria-label={sourceLabels[source]} title={sourceLabels[source]} />;
}
export default function PricingWorkspace({ mode = 'calendar' }) {
  return mode === 'history' ? <PricingHistoryView /> : <PricingWorkspaceContent mode={mode} />;
}
function PricingWorkspaceContent({ mode }) {
  const access = usePricingAccess(),
    [params, setParams] = useSearchParams();
  const [bootstrap, setBootstrap] = useState(null),
    [data, setData] = useState(null);
  const requestedId = params.get('accId') || '';
  const accId = bootstrap ? String(bootstrap.accommodations.find(a => String(a.id) === requestedId)?.id || bootstrap.accommodations[0]?.id || '') : requestedId;
  const [start, setStart] = useState(localToday()),
    [length, setLength] = useState(7),
    [refresh, setRefresh] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [success, setSuccess] = useState('');
  const [dialog, setDialog] = useState(null),
    [cellDetail, setCellDetail] = useState(null),
    [view, setView] = useState('both'),
    [roomFilter, setRoomFilter] = useState(''),
    [expanded, setExpanded] = useState(false);
  const calendarStart = mode === 'config' ? startOfWeek(localToday()) : start;
  const calendarLength = mode === 'config' ? 7 : length;
  useEffect(() => {
    const controller = new AbortController();
    pricingApi.bootstrap(controller.signal).then(b => {
      setBootstrap(b);
    }).catch(e => {
      if (e.name !== 'AbortError') setError(e.message);
    });
    return () => controller.abort();
  }, [refresh]);
  useEffect(() => {
    if (bootstrap && accId && requestedId !== accId) setParams(previous => {
      const next = new URLSearchParams(previous);
      next.set('accId', accId);
      return next;
    }, { replace: true });
  }, [bootstrap, accId, requestedId, setParams]);
  useEffect(() => {
    if (!accId || !bootstrap) return;
    const controller = new AbortController();
    const task = Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setError('');
      setData(null);
      return pricingApi.calendar({
        accommodationId: accId,
        start: calendarStart,
        end: addDays(calendarStart, calendarLength)
      }, controller.signal);
    });
    task.then(d => {
      if (controller.signal.aborted) return;
      setData(d);
    }).catch(e => {
      if (e.name !== 'AbortError') setError(e.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [accId, bootstrap, calendarStart, calendarLength, refresh]);
  const rooms = (data?.rooms || []).filter(r => !roomFilter || String(r.id) === roomFilter);
  const cellMap = useMemo(() => new Map((data?.cells || []).map(c => [`${c.room_type_id}:${c.stay_date}`, c])), [data]);
  function openDialog(seed = {}) {
    setSuccess('');
    setDialog(seed);
  }
  function saved(message) {
    setDialog(null);
    setCellDetail(null);
    setSuccess(message);
    setRefresh(n => n + 1);
  }
  const title = mode === 'calendar' ? 'Lịch giá & phòng trống' : mode === 'history' ? 'Lịch sử thay đổi' : 'Thiết lập giá';
  const periods = (bootstrap?.periods || []).filter(p => p.end_date > localToday());
  if (!access.canRead) return <Message error="Bạn chưa được cấp quyền xem giá." />;
  return <div className="pricing-page"><PricingHeader title={title} /><Message error={error} success={success} />
 <div className={`pricing-toolbar ${mode === 'config' ? 'pricing-setup-toolbar' : mode === 'calendar' ? 'pricing-calendar-toolbar' : ''}`}>{bootstrap?.accommodations.length === 1 ? <div><span className="pricing-muted">Cơ sở đang quản lý</span><strong className="pricing-property">{bootstrap.accommodations[0].name}</strong></div> : <label>Cơ sở<select value={accId} onChange={e => {
          setRoomFilter('');
          setParams(p => {
            p.set('accId', e.target.value);
            return p;
          });
        }}><option value="">Chọn cơ sở</option>{bootstrap?.accommodations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
 {mode === 'calendar' && <><label>Từ ngày<input type="date" value={start} onChange={e => {
            if (e.target.value) setStart(e.target.value);
          }} /></label><label>Khoảng xem<select value={length} onChange={e => setLength(Number(e.target.value))}>{[7, 14, 30].map(n => <option key={n} value={n}>{n} ngày</option>)}</select></label><div className="pricing-date-navigation"><button className="btn btn-secondary" aria-label="Khoảng trước" onClick={() => setStart(addDays(start, -length))}>←</button><button className="btn btn-secondary" onClick={() => setStart(localToday())}>Hôm nay</button><button className="btn btn-secondary" aria-label="Khoảng sau" onClick={() => setStart(addDays(start, length))}>→</button></div></>}
 {mode === 'calendar' && <button className="btn btn-secondary" onClick={() => setRefresh(n => n + 1)}>Làm mới</button>}{mode === 'config' && !access.isManager && access.canWrite && data?.rooms.length > 0 && <button className="btn btn-primary" onClick={() => openDialog({
        bulk: true,
        roomIds: rooms.slice(0, 50).map(r => r.id),
        start: start < localToday() ? localToday() : start,
        end: addDays(start < localToday() ? localToday() : start, length)
      })}>{access.isManager ? '＋ Đề xuất điều chỉnh hàng loạt' : '＋ Cập nhật hàng loạt'}</button>}</div>
 {bootstrap && !bootstrap.accommodations.length && <div className="pricing-empty">Bạn chưa được phân công cơ sở nào.</div>}
 {loading && accId && <div className="pricing-empty">Đang tải dữ liệu thật từ hệ thống…</div>}
 {mode === 'calendar' && data && <><div className="pricing-toolbar compact"><label>Loại phòng<select value={roomFilter} onChange={e => setRoomFilter(e.target.value)}><option value="">Tất cả loại phòng</option>{data.rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>Hiển thị<select value={view} onChange={e => setView(e.target.value)}><option value="both">Giá & phòng trống</option><option value="price">Chỉ giá</option><option value="inventory">Chỉ tồn phòng</option></select></label><div className="pricing-toolbar-meta"><label className="pricing-check"><input type="checkbox" checked={expanded} onChange={e => setExpanded(e.target.checked)} />Chi tiết tồn phòng</label><div className="pricing-legend"><span className="pricing-legend-item"><PriceSourceIcon source="override" />{sourceLabels.override}</span><span className="pricing-legend-item"><PriceSourceIcon source="period" />{sourceLabels.period}</span><span className="pricing-legend-note">Giá/phòng/đêm, chưa gồm phụ thu và thuế/phí</span></div></div></div><div className="pricing-scroll pricing-calendar"><table><thead><tr><th>Loại phòng</th>{data.dates.map(d => <th key={d} className={d === localToday() ? 'is-today' : ''}><span>{weekdays[(new Date(d).getUTCDay() + 6) % 7]}</span><strong>{shortDate(d).slice(0, 5)}</strong></th>)}</tr></thead><tbody>{rooms.map(room => <tr key={room.id}><th><strong>{room.name}</strong><small>{room.quantity} phòng · {room.included_adults} người lớn</small><small>{room.status === 1 ? 'Đang kinh doanh' : 'Ngừng / nháp'}</small></th>{data.dates.map(d => {
                const c = cellMap.get(`${room.id}:${d}`);
                return <td key={d} className={`${d < localToday() ? 'is-past' : ''} ${c?.stop_sell ? 'is-closed' : ''} ${c?.available_to_sell === 0 ? 'is-empty' : c?.available_to_sell <= 3 ? 'is-low' : ''}`}><button className="pricing-cell" onClick={() => setCellDetail({
                    ...c,
                    room
                  })}>{view !== 'inventory' && <strong>{currency(c?.effective_price)}</strong>}{view !== 'price' && <span>{c?.stop_sell ? 'Đóng bán' : `Còn bán ${c?.available_to_sell}`}</span>}{expanded && <small>Đã đặt {c?.booked}<br />Còn thực tế {c?.remaining}</small>}{view !== 'inventory' && <PriceSourceIcon source={c?.price_source} bar />}</button></td>;
              })}</tr>)}</tbody></table>{!rooms.length && <div className="pricing-empty">Cơ sở chưa có loại phòng.</div>}</div></>}
 {mode === 'config' && data && <PricingConfiguration data={data} cellMap={cellMap} start={calendarStart} canWrite={access.canWrite} isManager={access.isManager} openDialog={openDialog} />}
 
 {dialog && (dialog.action === 'weekday' ? <WeekdayPriceDialog seed={dialog} rooms={data?.rooms || []} weekdays={data?.weekdays || []} schedules={data?.schedules || []} accommodationId={accId} isManager={access.isManager} onClose={() => setDialog(null)} onSaved={saved} /> : <PriceAdjustmentDialog seed={dialog} rooms={data?.rooms || []} periods={periods} accommodationId={accId} accommodations={bootstrap?.accommodations || []} isManager={access.isManager} canBulkProperties={access.isAdmin} onClose={() => setDialog(null)} onSaved={saved} />)}
 {cellDetail && <Modal title={`${cellDetail.room.name} · ${shortDate(cellDetail.stay_date)}`} onClose={() => setCellDetail(null)}><dl className="pricing-breakdown"><dt>Giá theo thứ / giá gốc</dt><dd>{currency(cellDetail.normal_price)}</dd><dt>Kỳ áp dụng</dt><dd>{cellDetail.period_name || 'Không có'}{cellDetail.adjustment_type && ` · ${types[cellDetail.adjustment_type]} ${cellDetail.adjustment_value}${cellDetail.adjustment_type.includes('percent') ? '%' : 'đ'}`}</dd><dt>Nguồn giá kết quả</dt><dd>{sourceLabels[cellDetail.price_source]}</dd><dt>Giá bán / đêm</dt><dd><strong>{currency(cellDetail.effective_price)}</strong></dd><dt>Tổng / Đã đặt</dt><dd>{cellDetail.quantity} / {cellDetail.booked}</dd><dt>Còn thực tế / Còn bán</dt><dd>{cellDetail.remaining} / {cellDetail.available_to_sell}</dd><dt>Trạng thái</dt><dd>{cellDetail.stop_sell ? 'Đóng bán' : 'Mở bán'}</dd></dl><p>{cellDetail.override_reason || cellDetail.sale_reason}</p><p className="pricing-muted">Giá cho {cellDetail.room.included_adults} người lớn và {cellDetail.room.included_children} trẻ em; chưa cộng phụ thu, thuế/phí.</p><footer>{access.canWrite && cellDetail.stay_date >= localToday() && <button className="btn btn-primary" onClick={() => {
          openDialog({
            roomIds: [cellDetail.room_type_id],
            start: cellDetail.stay_date,
            end: addDays(cellDetail.stay_date, 1),
            value: cellDetail.effective_price,
            skipOverrides: false
          });
          setCellDetail(null);
        }}>{access.isManager ? 'Đề xuất điều chỉnh ngày này' : 'Điều chỉnh ngày này'}</button>}<button className="btn btn-secondary" onClick={() => setCellDetail(null)}>Đóng</button></footer></Modal>}
 </div>;
}
