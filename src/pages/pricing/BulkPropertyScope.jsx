import { useEffect, useId, useRef, useState } from 'react';
import { groupAccommodationsByCity } from '../../utils/accommodationCity';

export function PropertyCityOptions({ accommodations, selectedIds, onChange }) {
  const [city, setCity] = useState('');
  const groups = groupAccommodationsByCity(accommodations);
  return <>
    <label>Thành phố<select value={city} onChange={e => setCity(e.target.value)}>
      <option value="">Tất cả thành phố ({accommodations.length})</option>
      {groups.map(group => <option key={group.name} value={group.name}>{group.name} ({group.items.length})</option>)}
    </select></label>
    <div className="pricing-city-groups">{groups.filter(group => !city || group.name === city).map(group => <section key={group.name}>
      <h3>{group.name} ({group.items.length})</h3>
      <div className="pricing-property-checklist">{group.items.map(a => <label key={a.id}>
        <input type="checkbox" checked={selectedIds.includes(a.id)} onChange={e => onChange(e.target.checked ? [...selectedIds, a.id] : selectedIds.filter(id => id !== a.id))} />{a.name}
      </label>)}</div>
    </section>)}</div>
    <p className="pricing-muted">Đã chọn {selectedIds.length} cơ sở</p>
  </>;
}

export default function BulkPropertyScope({ scope, accommodations, onChange, disabled = false }) {
  const [open, setOpen] = useState(null);
  const root = useRef(null);
  const triggers = useRef({});
  const panelId = useId();
  const multiple = scope.mode === 'multiple';
  const active = multiple ? 'multiple' : 'single';
  const expanded = open === active && !disabled;
  const singleName = scope.single === 'all' ? `Tất cả cơ sở (${accommodations.length})` : accommodations.find(a => String(a.id) === scope.single)?.name || 'Chọn cơ sở';
  useEffect(() => {
    if (!open) return;
    const closeOutside = e => { if (!root.current?.contains(e.target)) setOpen(null); };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);
  function activate(mode) { setOpen(null); onChange({ ...scope, mode }); }
  return <div ref={root} className="pricing-bulk-scope" onKeyDown={e => {
    if (e.key === 'Escape' && expanded) { e.stopPropagation(); setOpen(null); triggers.current[active]?.focus(); }
  }}>
    <section className={`pricing-scope-card ${multiple ? 'is-inactive' : ''}`}>
      <label className="pricing-scope-mode"><input type="radio" name="property-scope" checked={!multiple} disabled={disabled} onChange={() => activate('single')} />Một cơ sở / tất cả cơ sở</label>
      <fieldset disabled={disabled || multiple} className="pricing-scope-options">
        <button ref={node => { triggers.current.single = node; }} type="button" className="pricing-scope-trigger" aria-label={`Cơ sở áp dụng: ${singleName}`} aria-expanded={expanded && !multiple} aria-controls={panelId} onClick={() => setOpen(open === 'single' ? null : 'single')}><span>{singleName}</span><span aria-hidden="true">▾</span></button>
      </fieldset>
    </section>
    <section className={`pricing-scope-card ${multiple ? '' : 'is-inactive'}`}>
      <label className="pricing-scope-mode"><input type="radio" name="property-scope" checked={multiple} disabled={disabled} onChange={() => activate('multiple')} />Chọn các cơ sở cụ thể</label>
      <fieldset disabled={disabled || !multiple} className="pricing-scope-options">
        <button ref={node => { triggers.current.multiple = node; }} type="button" className="pricing-scope-trigger" aria-expanded={expanded && multiple} aria-controls={panelId} onClick={() => setOpen(open === 'multiple' ? null : 'multiple')}><span>{scope.ids.length ? `Đã chọn ${scope.ids.length} cơ sở` : 'Chọn cơ sở theo thành phố'}</span><span aria-hidden="true">▾</span></button>
      </fieldset>
    </section>
    {expanded && <div id={panelId} className="pricing-scope-panel" role="region" aria-label={multiple ? 'Chọn các cơ sở theo thành phố' : 'Cơ sở áp dụng'}>
      {multiple ? <PropertyCityOptions accommodations={accommodations} selectedIds={scope.ids} onChange={ids => onChange({ ...scope, ids })} /> : <div className="pricing-single-options">
        {[{ id: 'all', name: `Tất cả cơ sở (${accommodations.length})` }, ...accommodations].map(a => <button type="button" key={a.id} aria-pressed={scope.single === String(a.id)} onClick={() => { onChange({ ...scope, single: String(a.id) }); setOpen(null); triggers.current.single?.focus(); }}>{a.name}</button>)}
      </div>}
    </div>}
  </div>;
}
