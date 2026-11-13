import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { MemoryRouter } from 'react-router-dom';

test('configuration shows current weekly prices and editing without the schedule list', async (t) => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'vietpeace-admin-pricing-test-'));
  t.after(async () => {
    if (dirname(cacheDir) !== resolve(tmpdir()) || !basename(cacheDir).startsWith('vietpeace-admin-pricing-test-')) {
      throw new Error('Unexpected temporary Vite cache path');
    }
    await rm(cacheDir, { recursive: true, force: true });
  });
  const vite = await createServer({ configFile: false, cacheDir, plugins: [react()], server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { default: Configuration } = await vite.ssrLoadModule('/src/pages/pricing/PricingConfiguration.jsx');
    const props = {
      data: {
        rooms: [{ id: 1, name: 'Deluxe', base_price: 1000000 }],
        weekdays: [],
        periodConfigs: [{ id: 1, room_type_id: 1, rate_period_id: 1, name: 'Kỳ thử nghiệm', adjustment_type: 'increase_percent', adjustment_value: 20, priority: 50, is_active: true }],
        schedules: [{ id: 1, room_type_id: 1, day_of_week: 1, effective_from: '2027-01-01', price: 1100000 }]
      },
      cellMap: new Map(), start: '2027-01-01', periods: [], canWrite: true, isManager: true,
      openDialog() {}, periodSeed() {}, setError() {}
    };
    const html = renderToStaticMarkup(React.createElement(Configuration, props));
    assert.ok(html.includes('Giá tiêu chuẩn theo tuần'));
    assert.ok(html.includes('Kỳ giá tại cơ sở'));
    assert.ok(!html.includes('Lịch giá tuần đã thiết lập'));
    assert.ok(!html.includes('Giá tại ngày đang xem.'));
    assert.ok(html.includes('Thiết lập giá tuần') && html.includes('Điều chỉnh theo ngày'));
    assert.ok(html.includes('Chọn Deluxe') && html.includes('Chưa chọn loại phòng'));
    assert.ok(!html.includes('Đề xuất sửa') && !html.includes('Đề xuất gỡ') && !html.includes('Đề xuất áp dụng'));
    assert.ok(!html.includes('Sửa / gỡ'));
    assert.equal((html.match(/<table[ >]/g) || []).length, 2);
    assert.ok(!html.includes('Sàn / trần') && !html.includes('Giới hạn'));
    const readOnly = renderToStaticMarkup(React.createElement(Configuration, { ...props, canWrite: false }));
    assert.ok(!readOnly.includes('<button'));
    assert.ok(readOnly.includes('Kỳ giá tại cơ sở'));
    const admin = renderToStaticMarkup(React.createElement(Configuration, { ...props, isManager: false }));
    assert.ok(!admin.includes('Kỳ giá tại cơ sở'));
    assert.ok(!admin.includes('Cấu hình kỳ giá') && !admin.includes('Sửa / gỡ'));
    assert.ok(!admin.includes('Kỳ thử nghiệm'));
    assert.ok(admin.includes('Sửa tuần') && !admin.includes('Lịch giá tuần đã thiết lập'));
    assert.ok(!admin.includes('Thiết lập giá tuần'));
    assert.equal((admin.match(/<table[ >]/g) || []).length, 1);
    const { default: PeriodForm } = await vite.ssrLoadModule('/src/pages/pricing/PeriodFormView.jsx');
    const { default: PeriodList } = await vite.ssrLoadModule('/src/pages/pricing/PeriodListView.jsx');
    const { default: AuthContext } = await vite.ssrLoadModule('/src/context/AuthContext.jsx');
    const renderAdmin = Component => renderToStaticMarkup(React.createElement(MemoryRouter, null,
      React.createElement(AuthContext.Provider, { value: { currentLoggedInUser: { role: 'ADMIN' }, hasPermission: () => true } }, React.createElement(Component))));
    const createHtml = renderAdmin(PeriodForm);
    assert.ok(createHtml.includes('Tên kỳ giá') && createHtml.includes('Mô tả'));
    assert.ok(!createHtml.includes('Cho phép áp dụng kỳ') && !createHtml.includes('type="checkbox"'));
    assert.ok(createHtml.includes('chưa tự làm thay đổi giá'));
    const listHtml = renderAdmin(PeriodList);
    assert.ok(!listHtml.includes('Được bật') && !listHtml.includes('Tạm tắt'));
    const { periodTimeStatus } = await vite.ssrLoadModule('/src/pages/pricing/pricingUtils.js');
    assert.equal(periodTimeStatus({start_date:'2027-01-01',end_date:'2027-01-03'},'2027-01-01'),'ongoing');
    assert.equal(periodTimeStatus({start_date:'2027-01-01',end_date:'2027-01-03'},'2027-01-03'),'ended');
    assert.equal(periodTimeStatus({start_date:'2027-01-01',end_date:'2027-01-03'},'2026-12-31'),'upcoming');
    const {default: Catalog}=await vite.ssrLoadModule('/src/pages/pricing/PeriodCatalog.jsx');
    const {periodScopeLabel,localToday,addDays,startOfWeek,shortDate}=await vite.ssrLoadModule('/src/pages/pricing/pricingUtils.js');
    const today=localToday();
    assert.equal(startOfWeek('2026-11-08'),'2026-11-02');
    assert.equal(startOfWeek('2026-11-09'),'2026-11-09');
    assert.equal(startOfWeek('2027-01-01'),'2026-12-28');
    const currentWeek = renderToStaticMarkup(React.createElement(Configuration, { ...props, start: today, isManager: false,
      cellMap: new Map([['1:'+today, {normal_price: 1234567}]]) }));
    assert.equal((currentWeek.match(/class="is-today"/g)||[]).length, 2);
    assert.ok(currentWeek.includes('aria-current="date"'));
    assert.ok(currentWeek.includes('<time dateTime="'+today+'">'+shortDate(today)+'</time>'));
    assert.ok(currentWeek.includes('1.234.567'));
    const {default: Workspace} = await vite.ssrLoadModule('/src/pages/pricing/PricingWorkspace.jsx');
    const setup = renderAdmin(() => React.createElement(Workspace, {mode:'config'}));
    for (const label of ['Từ ngày','Khoảng xem','Khoảng trước','Khoảng sau','Hôm nay','Làm mới']) assert.ok(!setup.includes(label), label);
    const calendar = renderAdmin(Workspace);
    assert.ok(calendar.includes('<option value="7" selected="">7 ngày</option>'));
    const renderManager = (Component, path) => renderToStaticMarkup(React.createElement(MemoryRouter, {initialEntries:[path]},
      React.createElement(AuthContext.Provider, {value:{currentLoggedInUser:{role:'ACCOMMODATION_MANAGER'},hasPermission:()=>true}}, React.createElement(Component))));
    for (const mode of ['calendar','config']) {
      const managerWorkspace = renderManager(() => React.createElement(Workspace, {mode}), '/admin/room-rates?accId=2&periodId=9');
      assert.ok(!managerWorkspace.includes('Đề xuất giá tại cơ sở đang quản lý'));
      assert.ok(!managerWorkspace.includes('Theo dõi đề xuất') && !managerWorkspace.includes('Đề xuất áp dụng kỳ đã chọn'));
    }

    const catalogProps={
      periods:[
        {id:1,name:'Kỳ đã áp dụng',description:'Mô tả không hiển thị',start_date:addDays(today,1),end_date:addDays(today,3),propertyCount:2,totalPropertyCount:3,canModify:false,first_applied_at:today},
        {id:2,name:'Kỳ chưa áp dụng',description:'Mô tả không hiển thị',start_date:addDays(today,-3),end_date:today,propertyCount:0,totalPropertyCount:3,canModify:true}
      ],query:'',filter:'',isAdmin:true,onQuery(){},onFilter(){},onEdit(){},onDelete(){}
    };
    const catalog=renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(Catalog,catalogProps)));
    const managerCatalog=renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(Catalog,{...catalogProps,isAdmin:false,canConfigure:true})));
    assert.ok(!managerCatalog.includes('Thao tác') && !managerCatalog.includes('Đề xuất áp dụng'));
    assert.ok(!managerCatalog.includes('<button') && !managerCatalog.includes('Tạo kỳ giá'));
    assert.ok(managerCatalog.includes('Kỳ đã áp dụng') && managerCatalog.includes('Tìm kỳ giá'));
    assert.ok(catalog.includes('Tất cả (2)')&&catalog.includes('Sắp tới (1)')&&catalog.includes('Đã kết thúc (1)'));
    assert.ok(catalog.includes('period-time--upcoming')&&catalog.includes('period-time--ended'));
    assert.ok(catalog.includes('Phạm vi áp dụng')&&catalog.includes('2 cơ sở')&&catalog.includes('Chưa áp dụng'));
    assert.ok(!catalog.includes('Mô tả không hiển thị'));
    assert.equal((catalog.match(/<button[^>]*disabled/g)||[]).length,2);
    assert.equal(periodScopeLabel({propertyCount:3,totalPropertyCount:3}),'Toàn bộ cơ sở');
    const {default: BulkScope}=await vite.ssrLoadModule('/src/pages/pricing/BulkPropertyScope.jsx');
    const accommodations=[{id:1,name:'Cơ sở A'},{id:2,name:'Cơ sở B'}];
    for(const mode of ['single','multiple']) {
      const scope={mode,single:'all',ids:[2]};
      const markup=renderToStaticMarkup(React.createElement(BulkScope,{scope,accommodations,onChange(){}}));
      const sections=markup.match(/<section[\s\S]*?<\/section>/g);
      assert.equal(sections.length,2);
      assert.ok(markup.includes('Tất cả cơ sở (2)'));
      assert.ok(!markup.includes('pricing-scope-panel'));
      assert.equal((markup.match(/aria-expanded="false"/g)||[]).length,2);
      assert.equal(/<fieldset disabled/.test(sections[0]),mode==='multiple');
      assert.equal(/<fieldset disabled/.test(sections[1]),mode==='single');
    }
    const {groupAccommodationsByCity,getMajorCity}=await vite.ssrLoadModule('/src/utils/accommodationCity.js');
    assert.equal(getMajorCity('Châu Đốc'),'An Giang');
    assert.equal(getMajorCity('Sa Đéc'),'Đồng Tháp');
    assert.equal(getMajorCity('Mũi Né'),'Phan Thiết');
    assert.equal(getMajorCity('Bãi Sau - Vũng Tàu'),'TP. Hồ Chí Minh');
    const groupedProperties=[{id:1,name:'Khách sạn B',locationName:'An Giang'},{id:2,name:'Khách sạn A',locationName:'Châu Đốc'},{id:3,name:'Khách sạn C',locationName:'Mũi Né'}];
    const groups=groupAccommodationsByCity(groupedProperties);
    assert.deepEqual(groups.map(g=>[g.name,g.items.map(a=>a.id)]),[['An Giang',[2,1]],['Phan Thiết',[3]]]);
    const {PropertyCityOptions}=await vite.ssrLoadModule('/src/pages/pricing/BulkPropertyScope.jsx');
    const cityHtml=renderToStaticMarkup(React.createElement(PropertyCityOptions,{accommodations:groupedProperties,selectedIds:[2,3],onChange(){}}));
    assert.ok(cityHtml.includes('Tất cả thành phố (3)')&&cityHtml.includes('An Giang (2)')&&cityHtml.includes('Phan Thiết (1)'));
    assert.equal((cityHtml.match(/checked=""/g)||[]).length,2);
    const {default: Proposals}=await vite.ssrLoadModule('/src/pages/pricing/PricingProposalsPage.jsx');
    const proposalHtml=renderAdmin(Proposals);
    assert.ok(proposalHtml.includes('href="/admin/pricing-proposals"'));
    assert.ok(proposalHtml.indexOf('Lịch sử thay đổi')<proposalHtml.indexOf('Đề xuất giá</a>'));
    assert.ok(proposalHtml.includes('Chờ duyệt')&&proposalHtml.includes('Đã duyệt')&&proposalHtml.includes('Từ chối'));
    assert.ok(!proposalHtml.includes('Tạo đề xuất giá'));
    const managerHtml=renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(AuthContext.Provider,{value:{currentLoggedInUser:{role:'ACCOMMODATION_MANAGER'},hasPermission:()=>true}},React.createElement(Proposals))));
    assert.ok(managerHtml.includes('Các đề xuất bạn đã gửi tại cơ sở đang quản lý'));
    assert.ok(managerHtml.includes('Đang tải cơ sở'));
    assert.ok(!managerHtml.includes('Tất cả cơ sở'));
    assert.ok(createHtml.includes('pricing-description-box')&&createHtml.includes('name="adjustment_direction"'));
    const {default: Adjustment}=await vite.ssrLoadModule('/src/pages/pricing/PriceAdjustmentDialog.jsx');
    const adjustmentProps={periods:[{id:9,name:'Kỳ kiểm tra',adjustment_direction:'decrease',start_date:'2027-01-01',end_date:'2027-01-04'}],accommodationId:1,accommodations:[{id:1,name:'Cơ sở A'}],canBulkProperties:true,onClose(){},onSaved(){}};
    const bulkHtml=renderToStaticMarkup(React.createElement(Adjustment,{...adjustmentProps,seed:{bulk:true}}));
    for(const removed of ['Đặt giá cố định','Đóng bán','Mở bán','Giá 7 ngày trong tuần','quay về quy tắc','Thứ áp dụng','Chọn tất cả','Ngày kết thúc không tính vào khoảng áp dụng.']) assert.ok(!bulkHtml.includes(removed),removed);
    assert.ok(bulkHtml.includes('Kỳ kiểm tra')&&bulkHtml.includes('Gỡ kỳ giá đặc biệt')&&bulkHtml.includes('Gỡ điều chỉnh theo ngày'));
    assert.ok(bulkHtml.includes('toàn bộ loại phòng hiện có'));
    const operationSelect=bulkHtml.match(/<select[^>]*>[\s\S]*?<\/select>/)[0];
    assert.ok(operationSelect.includes('value="daily"')&&operationSelect.includes('Điều chỉnh giá theo ngày'));
    assert.ok(!operationSelect.includes('value="increase_percent"')&&!operationSelect.includes('value="increase_amount"'));
    assert.ok(bulkHtml.includes('Cách điều chỉnh'));
    assert.ok(!bulkHtml.includes('Thay thế điều chỉnh theo ngày đã có')&&!bulkHtml.includes('Giữ điều chỉnh theo ngày đang áp dụng'));
    assert.ok(!bulkHtml.includes('Có giá điều chỉnh theo ngày bị trùng'));
    assert.ok(!/type="checkbox"[^>]*checked/.test(bulkHtml));
    const {changeStatusLabel,sourceLabels,actionLabels}=await vite.ssrLoadModule('/src/pages/pricing/pricingUtils.js');
    assert.equal(changeStatusLabel({changeStatus:'kept_existing'}),'Giữ nguyên điều chỉnh đã có');
    assert.equal(changeStatusLabel({changeStatus:'changed'}),'Thay đổi');
    assert.equal(sourceLabels.override,'Giá điều chỉnh theo ngày');
    assert.equal(actionLabels.restore,'Gỡ điều chỉnh theo ngày');
    const amountHtml=renderToStaticMarkup(React.createElement(Adjustment,{...adjustmentProps,seed:{action:'decrease_amount',value:25000}}));
    assert.ok(amountHtml.includes('<span>VNĐ</span>'));
    assert.ok(amountHtml.includes('value="25,000"'));
    const {formatPricingValue,parsePricingValue}=await vite.ssrLoadModule('/src/pages/pricing/pricingUtils.js');
    for(const value of ['1000','1000000','1000000000','1000.25']) assert.equal(parsePricingValue(formatPricingValue(value,'VNĐ'),'VNĐ'),value);
    assert.equal(formatPricingValue('1000000','VNĐ'),'1,000,000');
    assert.equal(formatPricingValue('100','%'),'100');
    assert.equal(parsePricingValue('1,000,000','%'),'1000000');
    assert.equal(parsePricingValue('10,5','%'),'10.5');
    const {default: ConflictDialog}=await vite.ssrLoadModule('/src/pages/pricing/PricingConflictDialog.jsx');
    const conflictHtml=renderToStaticMarkup(React.createElement(ConflictDialog,{warning:{propertyCount:2,roomCount:3,dateCount:2,conflictCount:6,items:[{accommodationId:1,accommodationName:'Cơ sở A',roomTypeId:1,roomName:'Deluxe',start:'2027-01-01',end:'2027-01-02',price:1000000}]},busy:false,onBack(){},onChoose(){}}));
    for(const text of ['2 cơ sở','01/01/2027','02/01/2027','Cơ sở A','Deluxe','Giữ giá đã điều chỉnh','Thay bằng giá mới','Quay lại chỉnh sửa']) assert.ok(conflictHtml.includes(text),text);
    for(const [value,suffix] of [[100,'%'],[100.01,'VNĐ']]) {
      const periodHtml=renderToStaticMarkup(React.createElement(Adjustment,{...adjustmentProps,seed:{action:'period',periodId:9,value}}));
      assert.ok(periodHtml.includes(`<span>${suffix}</span>`));
      assert.equal((periodHtml.match(/type="date"[^>]*disabled=""/g)||[]).length,2);
      assert.ok(periodHtml.includes('value="2027-01-01"')&&periodHtml.includes('value="2027-01-04"'));
      assert.ok(periodHtml.includes('type="text" inputMode="decimal"'));
    }
    const { adjustmentRoomScope } = await vite.ssrLoadModule('/src/pages/pricing/pricingUtils.js');
    assert.deepEqual(adjustmentRoomScope({roomIds:[1]}, false), {roomIds:[1], allRooms:false});
    assert.deepEqual(adjustmentRoomScope({roomIds:[1]}, true), {allRooms:true});
    const cellForm = renderToStaticMarkup(React.createElement(Adjustment, {...adjustmentProps, rooms:props.data.rooms, seed:{roomIds:[1],start:today,end:addDays(today,1)}}));
    assert.ok(cellForm.includes('Chỉ áp dụng cho: Deluxe.'));
    assert.ok(!cellForm.includes('toàn bộ loại phòng'));

    const {weeklyPricesAt,auditChanges,pricingPath} = await vite.ssrLoadModule('/src/pages/pricing/pricingUtils.js');
    const weeklyData = {rooms:props.data.rooms,weekdays:[{room_type_id:1,day_of_week:2,price:900000}],schedules:[
      ...Array.from({length:7},(_,i)=>({room_type_id:1,day_of_week:i+1,effective_from:today,price:2000000})),
      {room_type_id:1,day_of_week:1,effective_from:addDays(today,10),price:3000000}
    ]};
    assert.deepEqual(weeklyPricesAt(weeklyData,1,today),Array(7).fill(2000000));
    assert.equal(weeklyPricesAt(weeklyData,1,addDays(today,10))[0],3000000);
    assert.equal(weeklyPricesAt(weeklyData,1,addDays(today,-1))[1],900000);
    const {default: WeekdayDialog} = await vite.ssrLoadModule('/src/pages/pricing/WeekdayPriceDialog.jsx');
    const weeklyForm = renderToStaticMarkup(React.createElement(WeekdayDialog,{...weeklyData,seed:{roomIds:[1],start:today,prices:Array(7).fill(1000000)},onClose(){},onSaved(){}}));
    assert.equal((weeklyForm.match(/value="2,000,000"/g)||[]).length,7);
    assert.ok(weeklyForm.includes('Loại phòng: <strong>Deluxe</strong>'));
    assert.ok(weeklyForm.includes('Giá tuần cũ') && weeklyForm.includes('2.000.000'));
    assert.ok(weeklyForm.indexOf('Giá cũ') < weeklyForm.indexOf('<h3>Giá mới</h3>'));
    assert.equal((weeklyForm.match(/aria-label="Giá mới /g)||[]).length,7);
    assert.ok(!weeklyForm.includes('type="number"'));
    assert.equal((weeklyForm.match(/<span aria-hidden="true">đ<\/span>/g)||[]).length,7);
    const futureWeeklyForm = renderToStaticMarkup(React.createElement(WeekdayDialog,{...weeklyData,seed:{roomIds:[1],start:addDays(today,10)},onClose(){},onSaved(){}}));
    assert.ok(futureWeeklyForm.includes('value="3,000,000"'));
    const oldRoom = {roomTypeId:1,basePrice:1000000,weekdayRates:[{dayOfWeek:1,price:1000000},{dayOfWeek:2,price:900000}]};
    const audit = after => auditChanges({before_json:JSON.stringify(oldRoom),after_json:JSON.stringify(after)});
    const weekdayRows = audit({...oldRoom,weekdayRates:[{dayOfWeek:1,price:1200000}]});
    assert.equal(weekdayRows.length,2);
    assert.equal(weekdayRows[0].before,'1000000'); assert.equal(weekdayRows[0].after,'1200000');
    assert.ok(weekdayRows[0].context.endsWith('T2'));
    assert.equal(weekdayRows[1].after,'—');
    assert.deepEqual(audit({roomTypeId:1,basePrice:1000000}),[]);

    const {default: OverlapNotice} = await vite.ssrLoadModule('/src/pages/pricing/PeriodOverlapNotice.jsx');
    const overlapMarkup = renderToStaticMarkup(React.createElement(OverlapNotice,{periodName:'Kỳ mới',overlaps:[{accommodationId:2,accommodationName:'Cơ sở B',roomTypeId:1,roomName:'Deluxe',previousPeriodId:4,previousPeriodName:'Kỳ cũ',start:today,end:addDays(today,1)}]}));
    for (const text of ['Kỳ mới','Kỳ cũ','Cơ sở B','Deluxe','sẽ được ưu tiên','Chỉ lưu sau khi']) assert.ok(overlapMarkup.includes(text),text);
    assert.equal(renderToStaticMarkup(React.createElement(OverlapNotice,{})),'');
    assert.equal(pricingPath('/admin/room-rates?periodId=9','2'),'/admin/room-rates?periodId=9&accId=2');
    const {PricingHeader} = await vite.ssrLoadModule('/src/pages/pricing/PricingShared.jsx');
    const scopedHeader = renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:['/admin/room-rates?accId=2']},React.createElement(PricingHeader,{title:'Giá'})));
    for (const target of ['room-rates','room-availability','rate-periods','pricing-proposals']) assert.ok(scopedHeader.includes(`href="/admin/${target}?accId=2"`),target);
    assert.ok(scopedHeader.includes('href="/admin/pricing-history"'));
    assert.equal(pricingPath('/admin/pricing-history','2'),'/admin/pricing-history?accId=2');
  } finally { await vite.close(); }
});
