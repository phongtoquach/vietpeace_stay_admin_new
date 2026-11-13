import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { shortDate, periodTimeStatus, periodTimeLabels, periodScopeLabel, pricingPath } from './pricingUtils';

export default function PeriodCatalog({ periods, query, filter, onQuery, onFilter, isAdmin, onEdit, onDelete, loading=false, busy=false }) {
  const [params] = useSearchParams();
  const accommodationId = params.get('accId');
  const matches=periods.filter(p=>p.name.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
  const counts={upcoming:0,ongoing:0,ended:0};
  for(const period of matches)counts[periodTimeStatus(period)]++;
  const visible=matches.filter(p=>!filter||periodTimeStatus(p)===filter);
  return <>
    <div className={`pricing-toolbar period-catalog-toolbar ${isAdmin?'':'period-catalog-toolbar--readonly'}`}>
      <label>Tìm kỳ giá<input type="search" placeholder="Tìm theo tên kỳ giá…" value={query} onChange={e=>onQuery(e.target.value)} /></label>
      <label>Thời gian<select value={filter} onChange={e=>onFilter(e.target.value)}>
        <option value="">Tất cả ({matches.length})</option>
        <option value="upcoming">Sắp tới ({counts.upcoming})</option>
        <option value="ongoing">Đang trong kỳ giá ({counts.ongoing})</option>
        <option value="ended">Đã kết thúc ({counts.ended})</option>
      </select></label>
      {isAdmin&&<Link className="btn btn-primary period-create-button" to={pricingPath('/admin/rate-periods/create', accommodationId)}><Plus size={16} />Tạo kỳ giá</Link>}
    </div>
    <div className="pricing-scroll period-catalog-table"><table aria-label="Danh sách kỳ giá đặc biệt">
      <thead><tr><th>Kỳ giá</th><th>Đêm bắt đầu</th><th>Kết thúc trước ngày</th><th>Số đêm</th><th>Phạm vi áp dụng</th><th>Thời gian</th>{isAdmin&&<th>Thao tác</th>}</tr></thead>
      <tbody>{visible.map(period=>{
        const status=periodTimeStatus(period),locked=period.canModify===false||Boolean(period.first_applied_at);
        const reason=locked?'Kỳ giá đã được áp dụng nên không thể sửa hoặc xóa.':undefined;
        return <tr key={period.id}>
          <td><strong className="period-catalog-name">{period.name}</strong></td>
          <td>{shortDate(period.start_date)}</td><td>{shortDate(period.end_date)}</td>
          <td>{Math.round((Date.parse(period.end_date)-Date.parse(period.start_date))/86400000)}</td>
          <td><span className={`period-scope ${Number(period.propertyCount)>0?'period-scope--applied':''}`}>{periodScopeLabel(period)}</span></td>
          <td><span className={`period-time period-time--${status}`} title="Thời gian được xác định theo ngày bắt đầu và ngày kết thúc của kỳ."><i aria-hidden="true" />{periodTimeLabels[status]}</span></td>
          {isAdmin&&<td><div className="period-row-actions">
            <span title={reason}><button type="button" className="btn btn-secondary btn-sm" disabled={locked||busy} onClick={()=>onEdit(period)}><Pencil size={14} />Sửa</button></span>
            <span title={reason}><button type="button" className="btn btn-secondary btn-sm period-delete-button" disabled={locked||busy} onClick={()=>onDelete(period)}><Trash2 size={14} />Xóa</button></span>
          </div></td>}
        </tr>;
      })}</tbody>
    </table>{loading?<div className="pricing-empty">Đang tải…</div>:!visible.length&&<div className="pricing-empty">{periods.length?'Không tìm thấy kỳ giá phù hợp.':isAdmin?'Chưa có kỳ giá. Tạo kỳ mới để chuẩn bị cho bước áp dụng.':'Chưa có kỳ giá đặc biệt.'}</div>}</div>
  </>;
}
