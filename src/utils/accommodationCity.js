// Same city grouping used by the manager assignment screen.
export function getMajorCity(locationName) {
  if (!locationName) return '';
  const loc = locationName.trim();
  if (loc === 'TP. Hồ Chí Minh' || loc === 'Vũng Tàu' || loc.includes('Vũng Tàu') || loc.includes('Thủ Đức')) return 'TP. Hồ Chí Minh';
  if (['An Giang', 'Châu Đốc', 'Tri Tôn'].includes(loc)) return 'An Giang';
  if (['Đồng Tháp', 'Sa Đéc', 'Cao Lãnh'].includes(loc)) return 'Đồng Tháp';
  if (['Phan Thiết', 'Mũi Né'].includes(loc)) return 'Phan Thiết';
  return loc;
}

export function groupAccommodationsByCity(accommodations) {
  const groups = new Map();
  for (const accommodation of accommodations) {
    const name = getMajorCity(accommodation.locationName) || 'Chưa có địa điểm';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(accommodation);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b, 'vi')).map(([name, items]) => ({
    name, items: items.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }));
}
