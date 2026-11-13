import { currency, localToday, addDays, shortDate, startOfWeek, weekdays } from './pricingUtils';
import ManagerPricingConfiguration from './ManagerPricingConfiguration';

export default function PricingConfiguration({ data, cellMap, start, canWrite, isManager = false, openDialog }) {
  const today = localToday();
  const dates = weekdays.map((_, i) => addDays(startOfWeek(start), i));
  if (isManager) return <ManagerPricingConfiguration key={data.accommodation?.id || data.rooms.map(r => r.id).join(',')} data={data} cellMap={cellMap} start={start} canWrite={canWrite} openDialog={openDialog} />;
  return <>
    <section className="pricing-section">
      <div className="pricing-section-title">
        <div><h2>Giá tiêu chuẩn theo tuần</h2></div>
      </div>
      <div className="pricing-scroll"><table className="pricing-weekly-table">
        <thead><tr><th>Loại phòng</th>{weekdays.map((d, i) => <th key={d} className={dates[i] === today ? 'is-today' : undefined} aria-current={dates[i] === today ? 'date' : undefined}>{d}<small><time dateTime={dates[i]}>{shortDate(dates[i])}</time></small></th>)}<th>Thao tác</th></tr></thead>
        <tbody>{data.rooms.map(room => {
          const prices = weekdays.map((_, i) => {
            const day = dates[i];
            return cellMap.get(`${room.id}:${day}`)?.normal_price || data.weekdays.find(w => w.room_type_id === room.id && w.day_of_week === i + 1)?.price || room.base_price;
          });
          return <tr key={room.id}><td><strong>{room.name}</strong></td>{prices.map((price, i) => <td key={i} className={dates[i] === today ? 'is-today' : undefined}>{currency(price)}</td>)}<td>
            {canWrite && <button className="btn btn-secondary btn-sm" onClick={() => openDialog({ action: 'weekday', fixedAction: true, roomIds: [room.id], start: today, end: addDays(today, 7) })}>Sửa tuần</button>}
          </td></tr>;
        })}</tbody>
      </table></div>
    </section>

  </>;
}
