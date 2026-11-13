import InlineValidatedForm, { FieldError } from '../../components/forms/ValidatedForm';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { pricingApi } from '../../api/pricing';
import { PricingHeader, Message } from './PricingShared';
import { usePricingAccess, localToday, addDays, pricingPath } from './pricingUtils';
export default function PeriodFormView() {
  const [params] = useSearchParams();
  const catalogPath = pricingPath('/admin/rate-periods', params.get('accId'));
  const {
      id
    } = useParams(),
    navigate = useNavigate(),
    {
      isAdmin
    } = usePricingAccess();
  const [form, setForm] = useState({
      name: '',
      start_date: localToday(),
      end_date: addDays(localToday(), 1),
      description: '',
      adjustment_direction: 'increase'
    }),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(Boolean(id)),
    [busy, setBusy] = useState(false),
    [review, setReview] = useState(false),
    [locked, setLocked] = useState(false);
  useEffect(() => {
    if (!id) return;
    const c = new AbortController();
    pricingApi.bootstrap(c.signal).then(b => {
      const p = b.periods.find(p => String(p.id) === id);
      if (!p) throw new Error('Không tìm thấy kỳ giá.');
      if(p.canModify===false||p.first_applied_at){setLocked(true);setError('Kỳ giá đã được áp dụng nên không thể sửa.');return;}
      setForm(p);
    }).catch(e => {
      if (e.name !== 'AbortError') setError(e.message);
    }).finally(() => {
      if (!c.signal.aborted) setLoading(false);
    });
    return () => c.abort();
  }, [id]);
  function update(key, value) {
    setForm(f => ({
      ...f,
      [key]: value
    }));
    setReview(false);
  }
  async function submit(e) {
    e.preventDefault();
    if (form.end_date <= form.start_date) {
      setError('Ngày kết thúc phải sau ngày bắt đầu.');
      return;
    }
    if (!review) {
      setReview(true);
      return;
    }
    setBusy(true);
    try {
      await pricingApi.savePeriod(form, id);
      navigate(catalogPath);
    } catch (e) {
      setError(e.message);
      setReview(false);
    } finally {
      setBusy(false);
    }
  }
  if (!isAdmin) return <Message error="Chỉ admin được tạo/sửa danh mục kỳ giá. Manager cấu hình giá tại cơ sở được phân công." />;
  if(locked)return <div className="pricing-page"><PricingHeader title="Chỉnh sửa kỳ giá"/><Message error={error}/><Link className="btn btn-secondary" to={catalogPath}>Quay lại danh sách kỳ giá</Link></div>;
  return <div className="pricing-page"><PricingHeader title={id ? 'Chỉnh sửa kỳ giá' : 'Tạo kỳ giá đặc biệt'} /><Message error={error} />{loading ? <div className="pricing-empty">Đang tải…</div> : <InlineValidatedForm className="pricing-section" onSubmit={submit}><div className="pricing-form-grid"><label>Tên kỳ giá<FieldError name="name" /><input required maxLength={200} value={form.name} onChange={e => update('name', e.target.value)} placeholder="Ví dụ: Tết Nguyên đán 2027" name="name" data-validation-label="Tên kỳ giá" /></label><div className="pricing-period-dates"><label>Từ đêm<FieldError name="start_date" /><input type="date" required value={form.start_date} onChange={e => update('start_date', e.target.value)} name="start_date" data-validation-label="Ngày bắt đầu" /></label><label>Kết thúc trước ngày<FieldError name="end_date" /><input type="date" min={form.start_date ? addDays(form.start_date, 1) : undefined} required value={form.end_date} onChange={e => update('end_date', e.target.value)} name="end_date" data-validation-label="Ngày kết thúc" /></label></div></div><div className="pricing-period-description"><label htmlFor="period-description">Mô tả</label><FieldError name="adjustment_direction" /><FieldError name="description" /><div className="pricing-description-box"><select aria-label="Hướng điều chỉnh kỳ giá" name="adjustment_direction" required value={form.adjustment_direction || ''} onChange={e => update('adjustment_direction', e.target.value)}><option value="">Chọn tăng / giảm</option><option value="increase">Tăng giá</option><option value="decrease">Giảm giá</option></select><textarea id="period-description" maxLength={1000} value={form.description || ''} onChange={e => update('description', e.target.value)} name="description" data-validation-label="Mô tả" /></div></div><p className="pricing-muted">Ví dụ từ 29/04 đến trước 04/05: áp dụng cho 5 đêm 29/04–03/05. Kỳ chưa tự làm thay đổi giá. Áp dụng kỳ tại Thiết lập giá sau khi tạo.</p>{review && <div className="pricing-preview"><strong>Xác nhận phạm vi thay đổi</strong><p>{form.adjustment_direction === 'decrease' ? 'Giảm giá' : 'Tăng giá'} · {form.name}: {form.start_date} → trước {form.end_date}.</p><p>{id ? `Kỳ này đang có ${form.propertyCount || 0} cơ sở bật áp dụng. Thay đổi thời gian có thể tác động giá tương lai tại các cơ sở đã cấu hình. Giá điều chỉnh theo ngày và snapshot booking được giữ lại.` : 'Chỉ lưu thông tin kỳ vào danh mục. Áp dụng kỳ tại Thiết lập giá khi cần.'}</p></div>}<div className="pricing-toolbar"><Link className="btn btn-secondary" to={catalogPath}>Quay lại</Link><button className="btn btn-primary" disabled={busy}>{busy ? 'Đang lưu…' : review ? 'Xác nhận lưu kỳ giá' : 'Xem lại trước khi lưu'}</button></div></InlineValidatedForm>}</div>;
}
