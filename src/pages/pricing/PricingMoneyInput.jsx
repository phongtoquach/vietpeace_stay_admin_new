import { useLayoutEffect, useRef } from 'react';
import { formatPricingValue, parsePricingValue } from './pricingUtils';

export default function PricingMoneyInput({ value, onValueChange, ...props }) {
  const inputRef = useRef(null);
  const caret = useRef(null);
  const displayed = formatPricingValue(String(value ?? ''), 'VNĐ');
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (caret.current === null || document.activeElement !== input) return;
    let position = 0, digits = 0;
    while (position < displayed.length && digits < caret.current) {
      if (displayed[position] !== ',') digits++;
      position++;
    }
    input.setSelectionRange(position, position);
    caret.current = null;
  }, [displayed]);
  function change(event) {
    const raw = parsePricingValue(event.target.value, 'VNĐ');
    if (!/^\d*(\.\d{0,2})?$/.test(raw)) return;
    caret.current = parsePricingValue(event.target.value.slice(0, event.target.selectionStart), 'VNĐ').length;
    onValueChange(raw);
  }
  return <div className="pricing-value-input pricing-money-input"><input {...props} ref={inputRef} type="text" inputMode="decimal" pattern="([0-9]+|[0-9]{1,3}(,[0-9]{3})+)([.][0-9]{1,2})?" value={displayed} onChange={change} /><span aria-hidden="true">đ</span></div>;
}
