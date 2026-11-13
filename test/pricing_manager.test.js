import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

test('manager proposal forms and details preserve scope and distinguish proposed prices from applied prices', async (t) => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'vietpeace-admin-pricing-test-'));
  t.after(async () => {
    if (dirname(cacheDir) !== resolve(tmpdir()) || !basename(cacheDir).startsWith('vietpeace-admin-pricing-test-')) {
      throw new Error('Unexpected temporary Vite cache path');
    }
    await rm(cacheDir, { recursive: true, force: true });
  });
  const vite = await createServer({ configFile: false, cacheDir, plugins: [react()], server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { default: Adjustment } = await vite.ssrLoadModule('/src/pages/pricing/PriceAdjustmentDialog.jsx');
    const { default: Weekly } = await vite.ssrLoadModule('/src/pages/pricing/WeekdayPriceDialog.jsx');
    const { ReviewDialog } = await vite.ssrLoadModule('/src/pages/pricing/PricingProposalsPage.jsx');
    const { default: Configuration } = await vite.ssrLoadModule('/src/pages/pricing/PricingConfiguration.jsx');
    const { localToday, addDays } = await vite.ssrLoadModule('/src/pages/pricing/pricingUtils.js');
    const today = localToday(), end = addDays(today, 5);
    const rooms = [{ id: 11, name: 'Deluxe', base_price: 1000000 }, { id: 12, name: 'Suite', base_price: 2000000 }];
    const periods = [{ id: 9, name: 'Kỳ hiện có', adjustment_direction: 'increase', start_date: today, end_date: end }];
    const common = { rooms, periods, accommodationId: 3, accommodations: [{ id: 3, name: 'Cơ sở A' }], isManager: true, canBulkProperties: false, onClose() {}, onSaved() {} };
    const render = (Component, props) => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)));
    const single = render(Adjustment, { ...common, seed: { roomIds: [11] } });
    assert.ok(single.includes('Chỉ áp dụng cho: Deluxe.'));
    assert.ok(single.includes('Giá chỉ thay đổi sau khi admin phê duyệt'));
    assert.match(single, /<textarea[^>]*name="reason"[^>]*required=""[^>]*minLength="3"/);
    assert.ok(!single.includes('Tất cả cơ sở'));
    const bulk = render(Adjustment, { ...common, seed: { bulk: true, roomIds: [11] } });
    assert.ok(bulk.includes('toàn bộ loại phòng hiện có tại cơ sở đang quản lý'));
    assert.ok(!bulk.includes('Chỉ áp dụng cho: Deluxe.'));
    const removal = render(Adjustment, { ...common, seed: { action: 'remove_period', periodId: 9, roomIds: [11] } });
    assert.ok(!removal.includes('value="remove_period"') && !removal.includes('value="period:9"'));
    assert.ok(removal.includes('<option value="daily" selected="">'));
    assert.ok(removal.includes('Chỉ áp dụng cho: Deluxe.'));
    const weekly = render(Weekly, { ...common, seed: { roomIds: [11], start: today } });
    assert.ok(weekly.includes('Đề xuất giá tuần') && weekly.includes('<option value="11" selected="">Deluxe</option>'));
    assert.ok(weekly.includes('Giá cũ') && weekly.includes('Giá mới đề xuất'));
    assert.ok(weekly.indexOf('Giá cũ') < weekly.indexOf('Giá mới đề xuất'));
    assert.ok(!weekly.includes('Đề xuất cho:') && !weekly.includes('Cùng một bộ 7 giá'));
    assert.ok(!weekly.includes('Suite'));
    assert.ok(!weekly.includes('type="number"'));
    assert.equal((weekly.match(/<span aria-hidden="true">đ<\/span>/g)||[]).length,7);
    assert.equal((weekly.match(/value="1,000,000"/g) || []).length, 7);
    const multipleWeekly = render(Weekly, { ...common, seed: { roomIds: [11, 12], start: today } });
    assert.ok(multipleWeekly.includes('<option value="11" selected="">Deluxe</option>'));
    assert.ok(multipleWeekly.includes('<option value="12">Suite</option>'));
    assert.equal((multipleWeekly.match(/value="1,000,000"/g) || []).length, 7);
    assert.ok(multipleWeekly.includes('1.000.000'));
    assert.ok(!multipleWeekly.includes('value="2,000,000"'));
    const suiteWeekly = render(Weekly, { ...common, seed: { roomIds: [12], start: today } });
    assert.equal((suiteWeekly.match(/value="2,000,000"/g) || []).length, 7);
    assert.ok(suiteWeekly.includes('2.000.000'));
    const config = render(Configuration, { ...common, data: { rooms, weekdays: [], periodConfigs: [{ id: 1, room_type_id: 11, rate_period_id: 9, name: 'Kỳ hiện có', adjustment_type: 'increase_percent', adjustment_value: 20, is_active: true, end_date: end }] }, cellMap: new Map(), start: today, canWrite: true, openDialog() {}, periodSeed() {}, setError() {} });
    assert.ok(config.includes('Chọn Deluxe') && config.includes('Chọn Suite'));
    assert.ok(config.includes('Chưa chọn loại phòng'));
    const proposalButton = config.match(/<button[^>]*aria-describedby="manager-pricing-selection-help"[^>]*>/)?.[0];
    assert.ok(proposalButton, 'proposal button explains the room selection requirement');
    assert.ok(!proposalButton.includes('disabled'), 'click without a selection must display feedback instead of silently doing nothing');
    assert.ok(config.includes('Đánh dấu ô vuông bên trái tên phòng'));
    assert.ok(!config.includes('Đề xuất sửa') && !config.includes('Đề xuất gỡ') && !config.includes('Đề xuất áp dụng'));
    const proposal = { id: 123, accommodation_id: 3, accommodationName: 'Cơ sở A', status: 'PENDING', reason: 'Cập nhật theo nhu cầu', payload: { action: 'weekday', start: today, prices: Array(7).fill(1500000) }, changes: [{ roomTypeId: 11, roomName: 'Deluxe', date: today, oldPrice: 1000000, newPrice: 1500000 }], count: 1 };
    for (const status of ['PENDING', 'REJECTED', 'APPROVED']) {
      const detail = render(ReviewDialog, { proposal: { ...proposal, status, review_reason: status === 'REJECTED' ? 'Chưa phù hợp nhu cầu' : '', applied_batch_id: status === 'APPROVED' ? 'audit-123' : null }, isManager: true, canReview: false, onClose() {} });
      assert.ok(detail.includes('bản xem trước tại thời điểm gửi'));
      assert.ok(detail.includes('1.500.000') && detail.includes('Deluxe'));
      assert.ok(!detail.includes('Kiểm tra để duyệt') && !detail.includes('Xác nhận duyệt và áp dụng'));
      assert.ok(detail.includes('>Đóng</button>'));
      if (status === 'PENDING') assert.ok(detail.includes('Giá chưa thay đổi'));
      if (status === 'REJECTED') assert.ok(detail.includes('Chưa phù hợp nhu cầu') && detail.includes('giá giữ nguyên'));
      if (status === 'APPROVED') assert.ok(detail.includes('/admin/pricing-history?accId=3') && detail.includes('audit-123'));
    }
  } finally { await vite.close(); }
});
