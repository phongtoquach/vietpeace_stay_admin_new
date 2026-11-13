import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { pricingApi } from '../../api/pricing';
import { PricingHeader, Message, Modal } from './PricingShared';
import { usePricingAccess, pricingPath } from './pricingUtils';
import PeriodCatalog from './PeriodCatalog';

export default function PeriodCatalogPage() {
  const [params] = useSearchParams();
  const {canRead,isAdmin,isManager}=usePricingAccess(),navigate=useNavigate();
  const [periods,setPeriods]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[query,setQuery]=useState(''),[filter,setFilter]=useState(''),[refresh,setRefresh]=useState(0),[busy,setBusy]=useState(false),[deleteTarget,setDeleteTarget]=useState(null);
  useEffect(()=>{
    const controller=new AbortController();
    Promise.resolve().then(()=>{if(!controller.signal.aborted)setLoading(true);return pricingApi.bootstrap(controller.signal);})
      .then(data=>{if(!controller.signal.aborted)setPeriods(data.periods);})
      .catch(e=>{if(e.name!=='AbortError')setError(e.message);})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[refresh]);
  async function removePeriod(){
    if(!deleteTarget||busy)return;
    setBusy(true);setError('');
    try{await pricingApi.archivePeriod(deleteTarget);setDeleteTarget(null);setRefresh(n=>n+1);}
    catch(e){setError(e.message);if(e.status===409){setDeleteTarget(null);setRefresh(n=>n+1);}}
    finally{setBusy(false);}
  }
  if(!canRead)return <Message error="Bạn chưa được cấp quyền xem giá."/>;
  return <div className="pricing-page">
    <PricingHeader title="Kỳ giá đặc biệt"/><Message error={error}/>
    <p className="pricing-muted">{isManager ? 'Danh mục kỳ giá đặc biệt do admin quản lý. Bạn có thể xem và tra cứu thời gian các kỳ giá tại đây.' : 'Tạo kỳ để chuẩn bị cho bước áp dụng. Kỳ đã được áp dụng sẽ không thể sửa hoặc xóa.'}</p>
    <PeriodCatalog periods={periods} query={query} filter={filter} onQuery={setQuery} onFilter={setFilter} isAdmin={isAdmin} onEdit={p=>navigate(pricingPath(`/admin/rate-periods/${p.id}/edit`, params.get('accId')))} onDelete={setDeleteTarget} loading={loading} busy={busy}/>
    {deleteTarget&&<Modal title="Xóa kỳ giá" onClose={()=>{if(!busy)setDeleteTarget(null);}}>
      <p>Bạn muốn xóa kỳ giá <strong>{deleteTarget.name}</strong> khỏi danh mục?</p><p className="pricing-muted">Chỉ kỳ chưa được áp dụng mới được phép xóa.</p>
      <footer><button className="btn btn-secondary" disabled={busy} onClick={()=>setDeleteTarget(null)}>Hủy</button><button className="btn btn-primary" disabled={busy} onClick={removePeriod}>{busy?'Đang xóa…':'Xóa kỳ giá'}</button></footer>
    </Modal>}
  </div>;
}
