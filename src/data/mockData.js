// Mock Data for VietPeace Stay Hospitality Chain
import resortDanangImg from '../assets/images/resort_danang_1790825961463.jpg';
import hotelHanoiImg from '../assets/images/hotel_hanoi_1790825973601.jpg';
import homestaySapaImg from '../assets/images/homestay_sapa_1790825984612.jpg';
import resortPhuquocImg from '../assets/images/resort_phuquoc_1790825997319.jpg';
import adminAvatarImg from '../assets/images/admin_avatar_1790826011796.jpg';

export const INITIAL_USER = {
  id: 1,
  name: "Nguyen Tran Thao",
  email: "thao.nguyen@vietpeacestay.vn",
  role: "Super Administrator",
  avatar: adminAvatarImg,
  phone: "+84 908 123 456",
  status: "Active"
};

export const INITIAL_LOCATIONS = [
  {
    id: 2,
    name: "Da Nang",
    code: "VN-DAD",
    type: "Province / City",
    parent_location_id: null,
    description: "Central coastal economic and tourism hub",
    status: "Active"
  },
  {
    id: 3,
    name: "Son Tra Peninsula",
    code: "DAD-ST",
    type: "Ward / District",
    parent_location_id: 2,
    description: "Pristine coastline and prime resort belt",
    status: "Active"
  },
  {
    id: 4,
    name: "Ngu Hanh Son",
    code: "DAD-NHS",
    type: "Ward / District",
    parent_location_id: 2,
    description: "Marble Mountains coastal tourism area",
    status: "Active"
  },
  {
    id: 5,
    name: "Ba Na Hills Area",
    code: "DAD-BN",
    type: "Tourism Area",
    parent_location_id: 2,
    description: "Highland mountain tourism and entertainment",
    status: "Active"
  },
  {
    id: 6,
    name: "Hanoi",
    code: "VN-HAN",
    type: "Province / City",
    parent_location_id: null,
    description: "Capital city with thousand-year heritage",
    status: "Active"
  },
  {
    id: 7,
    name: "Hoan Kiem District",
    code: "HAN-HK",
    type: "Ward / District",
    parent_location_id: 6,
    description: "Historical Old Quarter cultural center",
    status: "Active"
  },
  {
    id: 8,
    name: "Tay Ho District",
    code: "HAN-TH",
    type: "Ward / District",
    parent_location_id: 6,
    description: "West Lake boutique hotel and diplomatic hub",
    status: "Active"
  },
  {
    id: 9,
    name: "Lao Cai",
    code: "VN-LC",
    type: "Province / City",
    parent_location_id: null,
    description: "Northwest mountainous landscape and cultural trekking",
    status: "Active"
  },
  {
    id: 10,
    name: "Sapa Town",
    code: "LC-SP",
    type: "Ward / District",
    parent_location_id: 9,
    description: "Highland valley mist city and Fansipan base",
    status: "Active"
  },
  {
    id: 11,
    name: "Ta Van Commune",
    code: "SP-TV",
    type: "Ward / Commune",
    parent_location_id: 10,
    description: "Indigenous ethnic homestays and terraced rice paddies",
    status: "Active"
  },
  {
    id: 12,
    name: "Muong Hoa Valley",
    code: "SP-MH",
    type: "Tourism Area",
    parent_location_id: 10,
    description: "Scenic valley trekking corridor",
    status: "Active"
  },
  {
    id: 13,
    name: "Kien Giang",
    code: "VN-KG",
    type: "Province / City",
    parent_location_id: null,
    description: "Southwestern Gulf of Thailand territory",
    status: "Active"
  },
  {
    id: 14,
    name: "Phu Quoc Island",
    code: "KG-PQ",
    type: "Ward / District",
    parent_location_id: 13,
    description: "Pearl Island tropical beach destination",
    status: "Active"
  },
  {
    id: 15,
    name: "Duong Dong Ward",
    code: "PQ-DD",
    type: "Ward / Commune",
    parent_location_id: 14,
    description: "Central island town, night market and fishing harbor",
    status: "Active"
  },
  {
    id: 16,
    name: "Bai Truong Coastline",
    code: "PQ-BT",
    type: "Tourism Area",
    parent_location_id: 14,
    description: "Long Beach sunset luxury resort strip",
    status: "Active"
  },
  {
    id: 17,
    name: "Lam Dong",
    code: "VN-LD",
    type: "Province / City",
    parent_location_id: null,
    description: "Central Highlands pine hills and flower capital",
    status: "Active"
  },
  {
    id: 18,
    name: "Da Lat City",
    code: "LD-DL",
    type: "Ward / District",
    parent_location_id: 17,
    description: "Romantic temperate plateau resort town",
    status: "Active"
  },
  {
    id: 19,
    name: "Tuyen Lam Lake",
    code: "DL-TL",
    type: "Tourism Area",
    parent_location_id: 18,
    description: "Eco-tourism pine lake and sanctuary",
    status: "Active"
  }
];

export const INITIAL_AMENITIES = [
  { id: 1, name: "Free High-Speed Wi-Fi", category: "Property Facilities", icon: "Wifi", description: "Fibre-optic internet access throughout property", status: "Active" },
  { id: 2, name: "Infinity Ocean Swimming Pool", category: "Property Facilities", icon: "Waves", description: "Heated saltwater infinity swimming pool", status: "Active" },
  { id: 3, name: "VietPeace Lotus Spa", category: "Recreation", icon: "Sparkles", description: "Holistic herbal massage and wellness sanctuary", status: "Active" },
  { id: 4, name: "Morning Buffet Breakfast", category: "Dining", icon: "Utensils", description: "Daily Vietnamese pho & continental breakfast spread", status: "Active" },
  { id: 5, name: "24/7 Front Desk Concierge", category: "Services", icon: "Clock", description: "Round-the-clock multilingual assistance", status: "Active" },
  { id: 6, name: "Airport Shuttle Service", category: "Services", icon: "Car", description: "Private luxury van transfers to and from airports", status: "Active" },
  { id: 7, name: "In-Room Smart Air Conditioning", category: "Room Amenities", icon: "Wind", description: "Inverter climate control system", status: "Active" },
  { id: 8, name: "55-inch 4K Smart TV", category: "Room Amenities", icon: "Tv", description: "Cable TV channels and streaming apps", status: "Active" },
  { id: 9, name: "Minibar & Local Herbal Tea Set", category: "Room Amenities", icon: "Coffee", description: "Selected organic tea, premium coffee, soft drinks", status: "Active" },
  { id: 10, name: "Panoramic Balcony", category: "Room Amenities", icon: "Maximize", description: "Private balcony with outdoor lounge seating", status: "Active" },
  { id: 11, name: "Deep Soaking Marble Bathtub", category: "Room Amenities", icon: "Bath", description: "Oversized bathtub with artisanal sea salts", status: "Active" },
  { id: 12, name: "Digital Security Safe Box", category: "Room Amenities", icon: "Shield", description: "Laptop-sized electronic in-room safe", status: "Active" },
  { id: 13, name: "Scenic Bicycle Rental", category: "Recreation", icon: "Bike", description: "Complimentary town bicycles for hotel guests", status: "Active" },
  { id: 14, name: "Kayaking & Paddle Boards", category: "Recreation", icon: "Anchor", description: "Water sports gear for coastal & lake explorations", status: "Active" },
  { id: 15, name: "BBQ Garden Courtyard", category: "Dining", icon: "Flame", description: "Outdoor grill facilities for private family gatherings", status: "Active" },
  { id: 16, name: "Executive Conference Room", category: "Property Facilities", icon: "Briefcase", description: "Projector and sound system for corporate meetings", status: "Active" }
];

export const AMENITY_CATEGORY_MAP = {
  'Room Amenities': 'Tiện nghi trong phòng',
  'Property Facilities': 'Cơ sở vật chất chung',
  'Dining': 'Ẩm thực & Nhà hàng',
  'Recreation': 'Giải trí & Thể thao',
  'Services': 'Dịch vụ lưu trú'
};

export const WARDS_BY_PROVINCE = {
  2: [
    { id: 'dn-tq', name: 'Phường Thọ Quang' },
    { id: 'dn-nhd', name: 'Phường Nại Hiên Đông' },
    { id: 'dn-mt', name: 'Phường Mân Thái' },
    { id: 'dn-ahb', name: 'Phường An Hải Bắc' },
    { id: 'dn-pm', name: 'Phường Phước Mỹ' },
    { id: 'dn-ma', name: 'Phường Mỹ An' },
    { id: 'dn-km', name: 'Phường Khuê Mỹ' },
    { id: 'dn-hh', name: 'Phường Hòa Hải' },
    { id: 'dn-hq', name: 'Phường Hòa Quý' },
    { id: 'dn-hn', name: 'Xã Hòa Ninh' }
  ],
  6: [
    { id: 'hn-hb', name: 'Phường Hàng Bè' },
    { id: 'hn-hba', name: 'Phường Hàng Bạc' },
    { id: 'hn-ht', name: 'Phường Hàng Trống' },
    { id: 'hn-tt', name: 'Phường Tràng Tiền' },
    { id: 'hn-ptc', name: 'Phường Phan Chu Trinh' },
    { id: 'hn-ltt', name: 'Phường Lý Thái Tổ' },
    { id: 'hn-cd', name: 'Phường Cửa Đông' },
    { id: 'hn-qa', name: 'Phường Quảng An' },
    { id: 'hn-yp', name: 'Phường Yên Phụ' },
    { id: 'hn-nt', name: 'Phường Nhật Tân' }
  ],
  9: [
    { id: 'lc-tv', name: 'Xã Tả Van' },
    { id: 'lc-sp', name: 'Phường Sa Pa' },
    { id: 'lc-psp', name: 'Phường Phan Si Păng' },
    { id: 'lc-hr', name: 'Phường Hàm Rồng' },
    { id: 'lc-cm', name: 'Phường Cầu Mây' },
    { id: 'lc-mh', name: 'Xã Mường Hoa' },
    { id: 'lc-tp', name: 'Xã Tả Phìn' },
    { id: 'lc-hl', name: 'Xã Hoàng Liên' }
  ],
  13: [
    { id: 'kg-dd', name: 'Phường Dương Đông' },
    { id: 'kg-at', name: 'Phường An Thới' },
    { id: 'kg-dt', name: 'Xã Dương Tơ' },
    { id: 'kg-cd', name: 'Xã Cửa Dương' },
    { id: 'kg-cc', name: 'Xã Cửa Cạn' },
    { id: 'kg-gd', name: 'Xã Gành Dầu' },
    { id: 'kg-hn', name: 'Xã Hàm Ninh' },
    { id: 'kg-bt', name: 'Xã Bãi Thơm' }
  ],
  17: [
    { id: 'ld-p1', name: 'Phường 1 (Đà Lạt)' },
    { id: 'ld-p2', name: 'Phường 2 (Đà Lạt)' },
    { id: 'ld-p3', name: 'Phường 3 (Đà Lạt)' },
    { id: 'ld-p4', name: 'Phường 4 (Đà Lạt)' },
    { id: 'ld-p10', name: 'Phường 10 (Đà Lạt)' },
    { id: 'ld-tn', name: 'Xã Tà Nung' },
    { id: 'ld-xt', name: 'Xã Xuân Thọ' },
    { id: 'ld-th', name: 'Xã Trạm Hành' }
  ]
};

export const INITIAL_ATTRACTIONS = [
  // Location 3: Son Tra Peninsula (Đà Nẵng)
  {
    id: 1,
    location_id: 3,
    name: "Chùa Linh Ứng Bãi Bụt",
    address: "Bãi Bụt, Bán đảo Sơn Trà, TP. Đà Nẵng",
    description: "Ngôi chùa nổi tiếng với tượng Phật Bà Quan Âm cao 67m hướng ra biển Đông, là điểm du lịch tâm linh và ngắm toàn cảnh vịnh Đà Nẵng tuyệt đẹp.",
    image: resortDanangImg,
    is_active: true,
    created_at: "2026-01-10 08:00:00",
    updated_at: "2026-01-10 08:00:00"
  },
  {
    id: 2,
    location_id: 3,
    name: "Đỉnh Bàn Cờ Sơn Trà",
    address: "Đỉnh bán đảo Sơn Trà, Thọ Quang, Sơn Trà, TP. Đà Nẵng",
    description: "Điểm cao nhất trên bán đảo Sơn Trà với tượng tiên ông chơi cờ, nơi ngắm trọn vẹn bình minh và mây ngàn bao phủ thành phố.",
    image: resortDanangImg,
    is_active: true,
    created_at: "2026-01-12 09:30:00",
    updated_at: "2026-01-12 09:30:00"
  },
  {
    id: 3,
    location_id: 3,
    name: "Bãi Rạng & Ghềnh Bàng",
    address: "Hoàng Sa, Thọ Quang, Sơn Trà, TP. Đà Nẵng",
    description: "Bãi san hô tự nhiên hoang sơ với các bãi đá rêu phong kỳ vĩ, thích hợp lặn ngắm san hô và cắm trại ven biển.",
    image: resortDanangImg,
    is_active: false,
    created_at: "2026-01-15 14:00:00",
    updated_at: "2026-01-15 14:00:00"
  },

  // Location 4: Ngu Hanh Son (Đà Nẵng)
  {
    id: 4,
    location_id: 4,
    name: "Danh thắng Non Nước Ngũ Hành Sơn",
    address: "81 Huyền Trân Công Chúa, Hòa Hải, Ngũ Hành Sơn, TP. Đà Nẵng",
    description: "Quần thể 5 ngọn núi đá vôi đá cẩm thạch gồm Kim, Mộc, Thủy, Hỏa, Thổ với nhiều hang động huyền bí và chùa cổ linh thiêng.",
    image: resortDanangImg,
    is_active: true,
    created_at: "2026-01-16 10:00:00",
    updated_at: "2026-01-16 10:00:00"
  },

  // Location 5: Ba Na Hills (Đà Nẵng)
  {
    id: 5,
    location_id: 5,
    name: "Cầu Vàng Bà Nà Hills",
    address: "Thôn An Sơn, Hòa Ninh, Hòa Vang, TP. Đà Nẵng",
    description: "Kiến trúc biểu tượng quốc tế với đôi bàn tay khổng lồ nâng đỡ dải lụa vàng giữa mây trời rừng nguyên sinh Bà Nà.",
    image: resortDanangImg,
    is_active: true,
    created_at: "2026-01-18 11:00:00",
    updated_at: "2026-01-18 11:00:00"
  },

  // Location 7: Hoan Kiem District (Hà Nội)
  {
    id: 6,
    location_id: 7,
    name: "Hồ Hoàn Kiếm & Đền Ngọc Sơn",
    address: "Phố Đinh Tiên Hoàng, Hàng Trống, Hoàn Kiếm, Hà Nội",
    description: "Trái tim của thủ đô nghìn năm văn hiến với Tháp Rùa cổ kính, Cầu Thê Húc đỏ son và Đền Ngọc Sơn uy nghiêm.",
    image: hotelHanoiImg,
    is_active: true,
    created_at: "2026-01-20 08:30:00",
    updated_at: "2026-01-20 08:30:00"
  },
  {
    id: 7,
    location_id: 7,
    name: "Nhà hát Lớn Hà Nội",
    address: "Số 1 Tràng Tiền, Phan Chu Trinh, Hoàn Kiếm, Hà Nội",
    description: "Công trình kiến trúc Phục Hưng Pháp tráng lệ khánh thành năm 1911, cái nôi của các chương trình hòa nhạc và nghệ thuật đỉnh cao.",
    image: hotelHanoiImg,
    is_active: true,
    created_at: "2026-01-22 09:15:00",
    updated_at: "2026-01-22 09:15:00"
  },
  {
    id: 8,
    location_id: 7,
    name: "Phố cổ Hà Nội 36 Phố Phường",
    address: "Khu phố cổ, Hàng Buồm, Hoàn Kiếm, Hà Nội",
    description: "Khu vực lưu giữ nếp sống truyền thống của Thăng Long xưa với các phố nghề cổ kính, ẩm thực đường phố và di tích lịch sử.",
    image: hotelHanoiImg,
    is_active: true,
    created_at: "2026-01-25 15:00:00",
    updated_at: "2026-01-25 15:00:00"
  },

  // Location 8: Tay Ho District (Hà Nội)
  {
    id: 9,
    location_id: 8,
    name: "Chùa Trấn Quốc Hồ Tây",
    address: "Đường Thanh Niên, Yên Phụ, Tây Hồ, Hà Nội",
    description: "Ngôi chùa cổ nhất thủ đô với hơn 1.500 năm lịch sử, nằm trên hòn đảo xinh đẹp phía đông Hồ Tây.",
    image: hotelHanoiImg,
    is_active: true,
    created_at: "2026-01-26 16:00:00",
    updated_at: "2026-01-26 16:00:00"
  },

  // Location 11: Ta Van Commune (Lào Cai / Sa Pa)
  {
    id: 10,
    location_id: 11,
    name: "Bản Tả Van & Thung lũng Mường Hoa",
    address: "Thôn Tả Van Giáy, Xã Tả Van, Thị xã Sa Pa, Lào Cai",
    description: "Ngôi làng bình yên của đồng bào Giáy và H'Mông uốn lượn bên suối Mường Hoa và các thửa ruộng bậc thang kỳ vĩ.",
    image: homestaySapaImg,
    is_active: true,
    created_at: "2026-02-01 10:00:00",
    updated_at: "2026-02-01 10:00:00"
  },
  {
    id: 11,
    location_id: 11,
    name: "Cầu Mây Tả Van",
    address: "Bản Giàng Tả Chải, Xã Tả Van, Thị xã Sa Pa, Lào Cai",
    description: "Cây cầu gỗ dây mây nổi tiếng bắc qua suối Mường Hoa, địa điểm chụp ảnh thơ mộng vào mùa lúa chín.",
    image: homestaySapaImg,
    is_active: true,
    created_at: "2026-02-02 11:00:00",
    updated_at: "2026-02-02 11:00:00"
  },

  // Location 10: Sa Pa Town (Lào Cai)
  {
    id: 12,
    location_id: 10,
    name: "Đỉnh Fansipan - Nóc nhà Đông Dương",
    address: "Quần thể Sun World Fansipan Legend, Sa Pa, Lào Cai",
    description: "Đỉnh núi cao nhất Việt Nam 3.143m với hệ thống cáp treo ba dây kỷ lục thế giới và quần thể tâm linh trên mây.",
    image: homestaySapaImg,
    is_active: true,
    created_at: "2026-02-05 13:00:00",
    updated_at: "2026-02-05 13:00:00"
  },

  // Location 16: Bai Truong (Phú Quốc / Kiên Giang)
  {
    id: 13,
    location_id: 16,
    name: "Bãi Trường Phú Quốc (Long Beach)",
    address: "Dọc đường Trần Hưng Đạo, Dương Tơ, TP. Phú Quốc, Kiên Giang",
    description: "Bãi biển thoai thoải dài 20km nổi tiếng với bờ cát vàng mịn màng và khoảnh khắc hoàng hôn rực rỡ nhất đảo ngọc.",
    image: resortPhuquocImg,
    is_active: true,
    created_at: "2026-02-08 14:00:00",
    updated_at: "2026-02-08 14:00:00"
  },
  {
    id: 14,
    location_id: 16,
    name: "Quảng trường Hoàng hôn Sunset Sanato",
    address: "Khu du lịch Sunset Sanato, Dương Tơ, TP. Phú Quốc, Kiên Giang",
    description: "Điểm check-in ven biển độc đáo với các tác phẩm điêu khắc nghệ thuật đàn voi chân dài, cổng trời thiên đường giữa hoàng hôn.",
    image: resortPhuquocImg,
    is_active: true,
    created_at: "2026-02-10 15:30:00",
    updated_at: "2026-02-10 15:30:00"
  },

  // Location 19: Tuyen Lam Lake (Đà Lạt / Lâm Đồng)
  {
    id: 15,
    location_id: 19,
    name: "Thiền Viện Trúc Lâm Đà Lạt",
    address: "Khu du lịch Hồ Tuyền Lâm, Phường 3, TP. Đà Lạt, Lâm Đồng",
    description: "Một trong ba thiền viện lớn nhất Việt Nam theo dòng Trúc Lâm Yên Tử, tọa lạc trên đỉnh núi Phụng Hoàng soi bóng xuống hồ Tuyền Lâm.",
    image: homestaySapaImg,
    is_active: true,
    created_at: "2026-02-12 09:00:00",
    updated_at: "2026-02-12 09:00:00"
  },
  {
    id: 16,
    location_id: 19,
    name: "Khu du lịch Thác Datanla",
    address: "Quốc lộ 20, Đèo Prenn, Phường 3, TP. Đà Lạt, Lâm Đồng",
    description: "Dòng thác hùng vĩ giữa đèo Prenn với hệ thống máng trượt xuyên rừng thông dài nhất Đông Nam Á.",
    image: homestaySapaImg,
    is_active: true,
    created_at: "2026-02-15 10:30:00",
    updated_at: "2026-02-15 10:30:00"
  }
];

export const INITIAL_ACCOMMODATIONS = [
  {
    id: 1,
    name: "VietPeace Danang Premier Beach Resort",
    code: "VPD-RES-01",
    type: "Resort",
    short_description: "Premier beachfront 5-star haven overlooking My Khe and Son Tra coastline.",
    full_description: "VietPeace Danang Premier Beach Resort is an award-winning coastal sanctuary offering direct white-sand beach access, private plunge pools, world-class dining, and traditional Vietnamese architectural finesse surrounded by tropical gardens.",
    province_id: 2,
    location_id: 3,
    ward: "Phường Thọ Quang",
    address: "268 Vo Nguyen Giap Street, Son Tra Peninsula",
    latitude: "16.0748",
    longitude: "108.2467",
    phone: "+84 236 388 9999",
    email: "danang.resort@vietpeacestay.vn",
    website: "https://vietpeacestay.vn/resorts/danang",
    checkin_time: "14:00",
    checkout_time: "12:00",
    star_rating: 5,
    status: "Active",
    featured: true,
    cover_image: resortDanangImg,
    gallery_images: [resortDanangImg, resortPhuquocImg],
    amenity_ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16],
    room_types_count: 3,
    attractions: [
      { attraction_id: 1, distance: 3.5, distance_unit: "km", distance_meters: 3500, notes: "Cách resort 10 phút lái xe dọc cung đường Hoàng Sa" },
      { attraction_id: 2, distance: 7.2, distance_unit: "km", distance_meters: 7200, notes: "Tuyến đường ngắm cảnh vịnh Đà Nẵng tuyệt đẹp" }
    ]
  },
  {
    id: 2,
    name: "VietPeace Heritage Boutique Hotel",
    code: "VPH-HOT-02",
    type: "Hotel",
    short_description: "Colonial-charm boutique hotel in the heart of Hanoi Old Quarter.",
    full_description: "Nestled in Hanoi's historic quarter, VietPeace Heritage Hotel pairs French colonial elegance with traditional Vietnamese lacquer crafts. Moments away from Hoan Kiem Lake, offering peaceful courtyard views and refined tea rituals.",
    province_id: 6,
    location_id: 7,
    ward: "Phường Hàng Bè",
    address: "42 Hang Be Street, Hoan Kiem District",
    latitude: "21.0328",
    longitude: "105.8542",
    phone: "+84 24 3926 7777",
    email: "hanoi.heritage@vietpeacestay.vn",
    website: "https://vietpeacestay.vn/hotels/hanoi-heritage",
    checkin_time: "14:00",
    checkout_time: "12:00",
    star_rating: 4,
    status: "Active",
    featured: true,
    cover_image: hotelHanoiImg,
    gallery_images: [hotelHanoiImg, resortDanangImg],
    amenity_ids: [1, 4, 5, 6, 7, 8, 9, 10, 12, 13, 16],
    room_types_count: 2,
    attractions: [
      { attraction_id: 6, distance: 350, distance_unit: "m", distance_meters: 350, notes: "Đi bộ 5 phút từ sảnh khách sạn" },
      { attraction_id: 7, distance: 850, distance_unit: "m", distance_meters: 850, notes: "Đi bộ dạo phố Tràng Tiền" }
    ]
  },
  {
    id: 3,
    name: "VietPeace Sapa Cloud Valley Eco-Homestay",
    code: "VPS-HOM-03",
    type: "Homestay",
    short_description: "Authentic wooden eco-homestay nestled among emerald terraced rice fields.",
    full_description: "Perched over the magnificent Muong Hoa valley in Ta Van, this eco-homestay is built with sustainable cedar wood and stone. Guests enjoy fireside organic dinners, local herbal baths, and panoramic misty mountain sunrises.",
    province_id: 9,
    location_id: 11,
    ward: "Xã Tả Van",
    address: "Village 1, Ta Van Commune, Sapa",
    latitude: "22.3021",
    longitude: "103.8829",
    phone: "+84 214 387 6666",
    email: "sapa.homestay@vietpeacestay.vn",
    website: "https://vietpeacestay.vn/homestays/sapa-cloud",
    checkin_time: "13:30",
    checkout_time: "11:30",
    star_rating: 3,
    status: "Active",
    featured: true,
    cover_image: homestaySapaImg,
    gallery_images: [homestaySapaImg, hotelHanoiImg],
    amenity_ids: [1, 4, 5, 7, 9, 10, 13, 15],
    room_types_count: 2,
    attractions: [
      { attraction_id: 10, distance: 200, distance_unit: "m", distance_meters: 200, notes: "Nằm ngay trước ban công homestay" },
      { attraction_id: 11, distance: 600, distance_unit: "m", distance_meters: 600, notes: "Dọc đường mòn suối Mường Hoa" }
    ]
  },
  {
    id: 4,
    name: "VietPeace Sunset Beach Villas & Resort",
    code: "VPQ-RES-04",
    type: "Resort",
    short_description: "Private tropical pool villas facing the dramatic sunsets of Phu Quoc.",
    full_description: "Situated on tranquil Bai Truong, VietPeace Sunset Beach Villas features standalone thatched-roof villas, private gardens, outdoor stone showers, and front-row seats to Vietnam's most celebrated ocean sunsets.",
    province_id: 13,
    location_id: 16,
    ward: "Xã Dương Tơ",
    address: "Group 3, Bai Truong Coastline, Phu Quoc",
    latitude: "10.1583",
    longitude: "103.9681",
    phone: "+84 297 399 8888",
    email: "phuquoc.villas@vietpeacestay.vn",
    website: "https://vietpeacestay.vn/resorts/phuquoc-sunset",
    checkin_time: "15:00",
    checkout_time: "12:00",
    star_rating: 5,
    status: "Active",
    featured: true,
    cover_image: resortPhuquocImg,
    gallery_images: [resortPhuquocImg, resortDanangImg],
    amenity_ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15],
    room_types_count: 3,
    attractions: [
      { attraction_id: 13, distance: 50, distance_unit: "m", distance_meters: 50, notes: "Bãi biển trải dài ngay thềm biệt thự" },
      { attraction_id: 14, distance: 1.8, distance_unit: "km", distance_meters: 1800, notes: "Đi xe điện 5 phút" }
    ]
  },
  {
    id: 5,
    name: "VietPeace Dalat Pine Forest Homestay",
    code: "VPD-HOM-05",
    type: "Homestay",
    short_description: "Cozy hillside cabins surrounded by aromatic pine groves and morning fog.",
    full_description: "A tranquil mountain hideaway located minutes from Tuyen Lam Lake. Built in Scandinavian-Vietnamese fusion style with floor-to-ceiling glass windows overlooking misty pine hills and strawberry gardens.",
    province_id: 17,
    location_id: 19,
    ward: "Phường 3 (Đà Lạt)",
    address: "15 Hoa Hong Street, Tuyen Lam Lake Area, Da Lat",
    latitude: "11.9056",
    longitude: "108.4312",
    phone: "+84 263 355 4444",
    email: "dalat.pine@vietpeacestay.vn",
    website: "https://vietpeacestay.vn/homestays/dalat-pine",
    checkin_time: "14:00",
    checkout_time: "12:00",
    star_rating: 3,
    status: "Active",
    featured: false,
    cover_image: homestaySapaImg,
    gallery_images: [homestaySapaImg],
    amenity_ids: [1, 4, 5, 7, 9, 10, 13, 15],
    room_types_count: 2,
    attractions: [
      { attraction_id: 15, distance: 1.2, distance_unit: "km", distance_meters: 1200, notes: "Đi thuyền hoặc xe máy 5 phút" },
      { attraction_id: 16, distance: 2.5, distance_unit: "km", distance_meters: 2500, notes: "Khu máng trượt và thác nước" }
    ]
  },
  {
    id: 6,
    name: "VietPeace Ha Long Bay Royal Hotel",
    code: "VPH-HOT-06",
    type: "Hotel",
    short_description: "Modern upscale harborfront hotel looking out to limestone karsts.",
    full_description: "Conveniently situated along Bai Chay promenade, this 4-star hotel delivers unhindered panoramas of Ha Long Bay, international buffets, and rooftop cocktail lounges.",
    province_id: 2,
    location_id: 2,
    ward: "Phường Thọ Quang",
    address: "88 Ha Long Road, Bai Chay, Ha Long",
    latitude: "20.9542",
    longitude: "107.0378",
    phone: "+84 203 384 3333",
    email: "halong.royal@vietpeacestay.vn",
    website: "https://vietpeacestay.vn/hotels/halong-royal",
    checkin_time: "14:00",
    checkout_time: "11:30",
    star_rating: 4,
    status: "Active",
    featured: false,
    cover_image: hotelHanoiImg,
    gallery_images: [hotelHanoiImg],
    amenity_ids: [1, 4, 5, 6, 7, 8, 9, 11, 12, 16],
    room_types_count: 2,
    attractions: []
  }
];

export const INITIAL_ROOM_TYPES = [
  {
    id: 1,
    name: "Premier Ocean Suite",
    code: "VPD-POS",
    accommodation_id: 1,
    description: "Panoramic ocean vista suite with expansive private terrace and deep soaking tub.",
    room_size: 65,
    bed_type: "1 King Bed",
    number_of_beds: 1,
    included_adults: 2,
    included_children: 1,
    max_adults: 3,
    max_children: 2,
    max_occupancy: 4,
    extra_adult_fee: 450000,
    extra_child_fee: 250000,
    base_price: 3850000,
    view: "Sea",
    balcony: true,
    amenities: ["Free High-Speed Wi-Fi", "55-inch 4K Smart TV", "Deep Soaking Marble Bathtub", "Minibar & Local Herbal Tea Set"],
    room_image: resortDanangImg,
    status: "Active"
  },
  {
    id: 2,
    name: "Deluxe Garden View Room",
    code: "VPD-DGV",
    accommodation_id: 1,
    description: "Elegant ground-floor room framed by tropical palm gardens and lotus ponds.",
    room_size: 45,
    bed_type: "2 Queen Beds",
    number_of_beds: 2,
    included_adults: 2,
    included_children: 2,
    max_adults: 4,
    max_children: 2,
    max_occupancy: 4,
    extra_adult_fee: 350000,
    extra_child_fee: 200000,
    base_price: 2450000,
    view: "Garden",
    balcony: true,
    amenities: ["Free High-Speed Wi-Fi", "In-Room Smart Air Conditioning", "Minibar & Local Herbal Tea Set"],
    room_image: resortDanangImg,
    status: "Active"
  },
  {
    id: 3,
    name: "Beachfront Pool Villa",
    code: "VPD-BPV",
    accommodation_id: 1,
    description: "Standalone luxury villa with private 25m² pool and direct step-out to My Khe beach.",
    room_size: 110,
    bed_type: "1 Super King Bed",
    number_of_beds: 1,
    included_adults: 2,
    included_children: 2,
    max_adults: 4,
    max_children: 2,
    max_occupancy: 4,
    extra_adult_fee: 700000,
    extra_child_fee: 350000,
    base_price: 6800000,
    view: "Sea",
    balcony: true,
    amenities: ["Free High-Speed Wi-Fi", "Infinity Ocean Swimming Pool", "Deep Soaking Marble Bathtub", "VietPeace Lotus Spa"],
    room_image: resortDanangImg,
    status: "Active"
  },
  {
    id: 4,
    name: "Heritage Classic Room",
    code: "VPH-HCR",
    accommodation_id: 2,
    description: "Indochine-inspired decor featuring high ceilings, hardwood floors, and vintage bronze lamps.",
    room_size: 32,
    bed_type: "1 Queen Bed",
    number_of_beds: 1,
    included_adults: 2,
    included_children: 0,
    max_adults: 2,
    max_children: 1,
    max_occupancy: 3,
    extra_adult_fee: 300000,
    extra_child_fee: 150000,
    base_price: 1650000,
    view: "City",
    balcony: false,
    amenities: ["Free High-Speed Wi-Fi", "55-inch 4K Smart TV", "In-Room Smart Air Conditioning"],
    room_image: hotelHanoiImg,
    status: "Active"
  },
  {
    id: 5,
    name: "Old Quarter Balcony Suite",
    code: "VPH-OQS",
    accommodation_id: 2,
    description: "Spacious corner room overlooking bustling Hang Be street and ancient colonial roofs.",
    room_size: 48,
    bed_type: "1 King Bed",
    number_of_beds: 1,
    included_adults: 2,
    included_children: 1,
    max_adults: 3,
    max_children: 1,
    max_occupancy: 3,
    extra_adult_fee: 400000,
    extra_child_fee: 200000,
    base_price: 2350000,
    view: "City",
    balcony: true,
    amenities: ["Free High-Speed Wi-Fi", "Panoramic Balcony", "Minibar & Local Herbal Tea Set"],
    room_image: hotelHanoiImg,
    status: "Active"
  },
  {
    id: 6,
    name: "Valley Mist Wooden Bungalow",
    code: "VPS-VMB",
    accommodation_id: 3,
    description: "Handcrafted pine lodge with large front glass facing the terraced rice fields of Ta Van.",
    room_size: 38,
    bed_type: "1 Queen Bed",
    number_of_beds: 1,
    included_adults: 2,
    included_children: 1,
    max_adults: 2,
    max_children: 2,
    max_occupancy: 3,
    extra_adult_fee: 250000,
    extra_child_fee: 120000,
    base_price: 1250000,
    view: "Mountain",
    balcony: true,
    amenities: ["Free High-Speed Wi-Fi", "Panoramic Balcony", "Morning Buffet Breakfast"],
    room_image: homestaySapaImg,
    status: "Active"
  },
  {
    id: 7,
    name: "Terraced Field Family Stilt Room",
    code: "VPS-TFS",
    accommodation_id: 3,
    description: "Traditional elevated wooden stilt house space ideal for families and trekking groups.",
    room_size: 55,
    bed_type: "2 Double Beds",
    number_of_beds: 2,
    included_adults: 4,
    included_children: 2,
    max_adults: 5,
    max_children: 3,
    max_occupancy: 6,
    extra_adult_fee: 200000,
    extra_child_fee: 100000,
    base_price: 1850000,
    view: "Mountain",
    balcony: true,
    amenities: ["Free High-Speed Wi-Fi", "BBQ Garden Courtyard", "Morning Buffet Breakfast"],
    room_image: homestaySapaImg,
    status: "Active"
  },
  {
    id: 8,
    name: "Sunset Oceanfront Pool Villa",
    code: "VPQ-OPV",
    accommodation_id: 4,
    description: "Exclusive villa on the sands of Phu Quoc with infinity plunge pool and sunset panorama.",
    room_size: 95,
    bed_type: "1 King Bed",
    number_of_beds: 1,
    included_adults: 2,
    included_children: 2,
    max_adults: 3,
    max_children: 2,
    max_occupancy: 4,
    extra_adult_fee: 600000,
    extra_child_fee: 300000,
    base_price: 5200000,
    view: "Sea",
    balcony: true,
    amenities: ["Free High-Speed Wi-Fi", "Infinity Ocean Swimming Pool", "Deep Soaking Marble Bathtub"],
    room_image: resortPhuquocImg,
    status: "Active"
  }
];

export const INITIAL_BOOKINGS = [
  {
    id: 1,
    code: "VPS-BK-2026-001",
    customer_id: 1,
    customer_name: "Nguyen Van An",
    customer_phone: "+84 912 345 678",
    customer_email: "an.nguyen@gmail.com",
    accommodation_id: 1,
    accommodation_name: "VietPeace Danang Premier Beach Resort",
    room_type_id: 1,
    room_type_name: "Premier Ocean Suite",
    checkin_date: "2026-10-02",
    checkout_date: "2026-10-05",
    rooms_count: 1,
    adults_count: 2,
    children_count: 1,
    nights: 3,
    room_price: 3850000,
    extra_charges: 250000,
    discount_amount: 500000,
    tax_amount: 1130000,
    total_amount: 12430000,
    booking_status: "Confirmed",
    payment_status: "Paid",
    payment_method: "Bank Transfer (Vietcombank QR)",
    special_requests: "High floor requested, quiet room, late check-in at 18:00.",
    created_at: "2026-09-25 14:22:10",
    history: [
      { status: "Pending", timestamp: "2026-09-25 14:22:10", note: "Booking placed via website" },
      { status: "Confirmed", timestamp: "2026-09-25 14:35:00", note: "Vietcombank transfer verified" }
    ]
  },
  {
    id: 2,
    code: "VPS-BK-2026-002",
    customer_id: 2,
    customer_name: "Tran Thi Mai",
    customer_phone: "+84 983 556 789",
    customer_email: "mai.tran@yahoo.com",
    accommodation_id: 2,
    accommodation_name: "VietPeace Heritage Boutique Hotel",
    room_type_id: 5,
    room_type_name: "Old Quarter Balcony Suite",
    checkin_date: "2026-10-01",
    checkout_date: "2026-10-03",
    rooms_count: 1,
    adults_count: 2,
    children_count: 0,
    nights: 2,
    room_price: 2350000,
    extra_charges: 0,
    discount_amount: 0,
    tax_amount: 470000,
    total_amount: 5170000,
    booking_status: "Checked-in",
    payment_status: "Paid",
    payment_method: "Credit Card (Visa)",
    special_requests: "Airport transfer pickup at Noi Bai Terminal 2.",
    created_at: "2026-09-28 09:15:30",
    history: [
      { status: "Confirmed", timestamp: "2026-09-28 09:15:30", note: "Paid online with Visa" },
      { status: "Checked-in", timestamp: "2026-10-01 14:05:00", note: "Room 302 assigned" }
    ]
  },
  {
    id: 3,
    code: "VPS-BK-2026-003",
    customer_id: 3,
    customer_name: "Le Hoang Long",
    customer_phone: "+84 905 443 210",
    customer_email: "long.lh@fpt.com.vn",
    accommodation_id: 4,
    accommodation_name: "VietPeace Sunset Beach Villas & Resort",
    room_type_id: 8,
    room_type_name: "Sunset Oceanfront Pool Villa",
    checkin_date: "2026-10-01",
    checkout_date: "2026-10-04",
    rooms_count: 1,
    adults_count: 2,
    children_count: 1,
    nights: 3,
    room_price: 5200000,
    extra_charges: 300000,
    discount_amount: 1560000,
    tax_amount: 1434000,
    total_amount: 15774000,
    booking_status: "Pending",
    payment_status: "Unpaid",
    payment_method: "Pending Payment",
    special_requests: "Honeymoon setup: flower petals on bed.",
    created_at: "2026-09-30 18:40:00",
    history: [
      { status: "Pending", timestamp: "2026-09-30 18:40:00", note: "Awaiting bank transfer confirmation" }
    ]
  },
  {
    id: 4,
    code: "VPS-BK-2026-004",
    customer_id: 4,
    customer_name: "David Miller",
    customer_phone: "+1 415 889 2314",
    customer_email: "david.miller@globaltravel.com",
    accommodation_id: 3,
    accommodation_name: "VietPeace Sapa Cloud Valley Eco-Homestay",
    room_type_id: 6,
    room_type_name: "Valley Mist Wooden Bungalow",
    checkin_date: "2026-10-03",
    checkout_date: "2026-10-06",
    rooms_count: 1,
    adults_count: 2,
    children_count: 0,
    nights: 3,
    room_price: 1250000,
    extra_charges: 0,
    discount_amount: 375000,
    tax_amount: 337500,
    total_amount: 3712500,
    booking_status: "Confirmed",
    payment_status: "Paid",
    payment_method: "MasterCard",
    special_requests: "Vegetarian breakfast requested, local hiking guide required.",
    created_at: "2026-09-24 11:20:00",
    history: [
      { status: "Confirmed", timestamp: "2026-09-24 11:25:00", note: "Paid via international gateway" }
    ]
  },
  {
    id: 5,
    code: "VPS-BK-2026-005",
    customer_id: 5,
    customer_name: "Pham Minh Duc",
    customer_phone: "+84 977 112 334",
    customer_email: "duc.pham@vinfast.vn",
    accommodation_id: 1,
    accommodation_name: "VietPeace Danang Premier Beach Resort",
    room_type_id: 3,
    room_type_name: "Beachfront Pool Villa",
    checkin_date: "2026-09-28",
    checkout_date: "2026-10-01",
    rooms_count: 1,
    adults_count: 2,
    children_count: 2,
    nights: 3,
    room_price: 6800000,
    extra_charges: 700000,
    discount_amount: 1000000,
    tax_amount: 2010000,
    total_amount: 22110000,
    booking_status: "Checked-out",
    payment_status: "Paid",
    payment_method: "Bank Transfer",
    special_requests: "Early check-in at 11:00 AM.",
    created_at: "2026-09-20 16:00:00",
    history: [
      { status: "Confirmed", timestamp: "2026-09-20 16:30:00", note: "Confirmed" },
      { status: "Checked-in", timestamp: "2026-09-28 11:15:00", note: "Checked-in Villa 08" },
      { status: "Checked-out", timestamp: "2026-10-01 11:45:00", note: "Smooth checkout, minibar cleared" }
    ]
  },
  {
    id: 6,
    code: "VPS-BK-2026-006",
    customer_id: 6,
    customer_name: "Vu Thu Trang",
    customer_phone: "+84 944 678 901",
    customer_email: "thutrang.vu@gmail.com",
    accommodation_id: 2,
    accommodation_name: "VietPeace Heritage Boutique Hotel",
    room_type_id: 4,
    room_type_name: "Heritage Classic Room",
    checkin_date: "2026-10-05",
    checkout_date: "2026-10-07",
    rooms_count: 1,
    adults_count: 1,
    children_count: 0,
    nights: 2,
    room_price: 1650000,
    extra_charges: 0,
    discount_amount: 0,
    tax_amount: 330000,
    total_amount: 3630000,
    booking_status: "Cancelled",
    payment_status: "Refunded",
    payment_method: "Credit Card (Refunded)",
    special_requests: "Business travel, VAT tax invoice requested.",
    created_at: "2026-09-26 10:11:00",
    history: [
      { status: "Confirmed", timestamp: "2026-09-26 10:15:00", note: "Confirmed" },
      { status: "Cancelled", timestamp: "2026-09-29 15:00:00", note: "Guest requested cancellation due to meeting reschedule" }
    ]
  }
];

export const DAYS_OF_WEEK = [
  { day: 1, name: 'Monday', short: 'Mon', vietnamese: 'Thứ Hai', isWeekend: false },
  { day: 2, name: 'Tuesday', short: 'Tue', vietnamese: 'Thứ Ba', isWeekend: false },
  { day: 3, name: 'Wednesday', short: 'Wed', vietnamese: 'Thứ Tư', isWeekend: false },
  { day: 4, name: 'Thursday', short: 'Thu', vietnamese: 'Thứ Năm', isWeekend: false },
  { day: 5, name: 'Friday', short: 'Fri', vietnamese: 'Thứ Sáu', isWeekend: false },
  { day: 6, name: 'Saturday', short: 'Sat', vietnamese: 'Thứ Bảy', isWeekend: true },
  { day: 7, name: 'Sunday', short: 'Sun', vietnamese: 'Chủ Nhật', isWeekend: true }
];

// room_weekday_rates:
// Table columns: id, room_type_id, day_of_week (1=Mon ... 7=Sun), price, created_at, updated_at
export const INITIAL_ROOM_WEEKDAY_RATES = [
  // Room Type 1: Premier Ocean Suite (Base: 3,850,000 VND)
  { id: 1, room_type_id: 1, day_of_week: 1, price: 3850000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 2, room_type_id: 1, day_of_week: 2, price: 3850000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 3, room_type_id: 1, day_of_week: 3, price: 3850000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 4, room_type_id: 1, day_of_week: 4, price: 3850000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 5, room_type_id: 1, day_of_week: 5, price: 4200000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 6, room_type_id: 1, day_of_week: 6, price: 4600000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 7, room_type_id: 1, day_of_week: 7, price: 4100000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },

  // Room Type 2: Deluxe Garden View Room (Base: 2,450,000 VND)
  { id: 8, room_type_id: 2, day_of_week: 1, price: 2450000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 9, room_type_id: 2, day_of_week: 2, price: 2450000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 10, room_type_id: 2, day_of_week: 3, price: 2450000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 11, room_type_id: 2, day_of_week: 4, price: 2450000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 12, room_type_id: 2, day_of_week: 5, price: 2700000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 13, room_type_id: 2, day_of_week: 6, price: 2950000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 14, room_type_id: 2, day_of_week: 7, price: 2600000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },

  // Room Type 3: Beachfront Pool Villa (Base: 6,800,000 VND)
  { id: 15, room_type_id: 3, day_of_week: 1, price: 6800000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 16, room_type_id: 3, day_of_week: 2, price: 6800000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 17, room_type_id: 3, day_of_week: 3, price: 6800000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 18, room_type_id: 3, day_of_week: 4, price: 6800000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 19, room_type_id: 3, day_of_week: 5, price: 7400000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 20, room_type_id: 3, day_of_week: 6, price: 8200000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 21, room_type_id: 3, day_of_week: 7, price: 7200000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },

  // Room Type 4: Heritage Classic Room (Base: 1,650,000 VND)
  { id: 22, room_type_id: 4, day_of_week: 1, price: 1650000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 23, room_type_id: 4, day_of_week: 2, price: 1650000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 24, room_type_id: 4, day_of_week: 3, price: 1650000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 25, room_type_id: 4, day_of_week: 4, price: 1650000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 26, room_type_id: 4, day_of_week: 5, price: 1850000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 27, room_type_id: 4, day_of_week: 6, price: 1950000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 28, room_type_id: 4, day_of_week: 7, price: 1750000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },

  // Room Type 5: Old Quarter Balcony Suite (Base: 2,350,000 VND)
  { id: 29, room_type_id: 5, day_of_week: 1, price: 2350000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 30, room_type_id: 5, day_of_week: 2, price: 2350000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 31, room_type_id: 5, day_of_week: 3, price: 2350000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 32, room_type_id: 5, day_of_week: 4, price: 2350000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 33, room_type_id: 5, day_of_week: 5, price: 2600000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 34, room_type_id: 5, day_of_week: 6, price: 2850000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 35, room_type_id: 5, day_of_week: 7, price: 2500000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },

  // Room Type 6: Valley Mist Wooden Bungalow (Base: 1,250,000 VND)
  { id: 36, room_type_id: 6, day_of_week: 1, price: 1250000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 37, room_type_id: 6, day_of_week: 2, price: 1250000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 38, room_type_id: 6, day_of_week: 3, price: 1250000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 39, room_type_id: 6, day_of_week: 4, price: 1250000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 40, room_type_id: 6, day_of_week: 5, price: 1450000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 41, room_type_id: 6, day_of_week: 6, price: 1650000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 42, room_type_id: 6, day_of_week: 7, price: 1350000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },

  // Room Type 7: Traditional Family Stilt Suite (Base: 1,850,000 VND)
  { id: 43, room_type_id: 7, day_of_week: 1, price: 1850000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 44, room_type_id: 7, day_of_week: 2, price: 1850000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 45, room_type_id: 7, day_of_week: 3, price: 1850000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 46, room_type_id: 7, day_of_week: 4, price: 1850000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 47, room_type_id: 7, day_of_week: 5, price: 2100000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 48, room_type_id: 7, day_of_week: 6, price: 2350000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 49, room_type_id: 7, day_of_week: 7, price: 2000000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },

  // Room Type 8: Sunset Oceanfront Pool Villa (Base: 5,200,000 VND)
  { id: 50, room_type_id: 8, day_of_week: 1, price: 5200000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 51, room_type_id: 8, day_of_week: 2, price: 5200000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 52, room_type_id: 8, day_of_week: 3, price: 5200000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 53, room_type_id: 8, day_of_week: 4, price: 5200000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 54, room_type_id: 8, day_of_week: 5, price: 5800000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 55, room_type_id: 8, day_of_week: 6, price: 6500000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" },
  { id: 56, room_type_id: 8, day_of_week: 7, price: 5600000, created_at: "2026-09-01 08:00:00", updated_at: "2026-09-01 08:00:00" }
];

// Adjustment Types for Special Rate Period Configuration (5 mandatory types)
export const ADJUSTMENT_TYPES = {
  FIXED: {
    value: 'FIXED',
    label: 'Giá cố định mỗi đêm',
    unit: 'VNĐ',
    placeholder: 'Ví dụ: 1500000',
    formatDisplay: (val) => `Giá cố định ${formatVND(val)}/đêm`,
    calcPrice: (base, val) => Number(val)
  },
  PERCENT_INCREASE: {
    value: 'PERCENT_INCREASE',
    label: 'Tăng theo %',
    unit: '%',
    placeholder: 'Ví dụ: 20',
    formatDisplay: (val) => `Tăng ${val}% so với giá gốc`,
    calcPrice: (base, val) => Math.round(base * (1 + Number(val) / 100))
  },
  PERCENT_DECREASE: {
    value: 'PERCENT_DECREASE',
    label: 'Giảm theo %',
    unit: '%',
    placeholder: 'Ví dụ: 15',
    formatDisplay: (val) => `Giảm ${val}% so với giá gốc`,
    calcPrice: (base, val) => Math.max(0, Math.round(base * (1 - Number(val) / 100)))
  },
  AMOUNT_INCREASE: {
    value: 'AMOUNT_INCREASE',
    label: 'Tăng theo số tiền',
    unit: 'VNĐ',
    placeholder: 'Ví dụ: 200000',
    formatDisplay: (val) => `Tăng thêm ${formatVND(val)}`,
    calcPrice: (base, val) => base + Number(val)
  },
  AMOUNT_DECREASE: {
    value: 'AMOUNT_DECREASE',
    label: 'Giảm theo số tiền',
    unit: 'VNĐ',
    placeholder: 'Ví dụ: 100000',
    formatDisplay: (val) => `Giảm ${formatVND(val)}`,
    calcPrice: (base, val) => Math.max(0, base - Number(val))
  }
};

export const ADJUSTMENT_OPTIONS = [
  { value: 'FIXED', label: 'Giá cố định mỗi đêm', unit: 'VNĐ' },
  { value: 'PERCENT_INCREASE', label: 'Tăng theo %', unit: '%' },
  { value: 'PERCENT_DECREASE', label: 'Giảm theo %', unit: '%' },
  { value: 'AMOUNT_INCREASE', label: 'Tăng theo số tiền', unit: 'VNĐ' },
  { value: 'AMOUNT_DECREASE', label: 'Giảm theo số tiền', unit: 'VNĐ' }
];

export function formatRatePeriodConfigDisplay(config, basePrice = 0) {
  if (!config) return 'Chưa cấu hình';
  const adjType = config.adjustment_type || 'FIXED';
  const adjVal = config.adjustment_value !== undefined ? config.adjustment_value : config.price;
  if (adjVal === undefined || adjVal === null || Number(adjVal) <= 0) return 'Chưa cấu hình';

  const handler = ADJUSTMENT_TYPES[adjType];
  if (handler) {
    return handler.formatDisplay(adjVal);
  }
  return `Giá cố định ${formatVND(config.price || adjVal)}/đêm`;
}

// rate_periods (Independent master periods reusable across multiple accommodations)
// Table columns: id, name, start_date, end_date, description, status ('ACTIVE' | 'INACTIVE'), created_at, updated_at
export const INITIAL_RATE_PERIODS = [
  {
    id: 1,
    name: "Kỳ nghỉ lễ 30/4 - 1/5 năm 2027",
    start_date: "2027-04-29",
    end_date: "2027-05-04",
    description: "Kỳ nghỉ lễ Ngày Giải phóng miền Nam 30/4 và Quốc tế Lao động 1/5 áp dụng trên toàn chuỗi.",
    status: "ACTIVE",
    created_at: "2026-09-15 10:00:00",
    updated_at: "2026-09-15 10:00:00"
  },
  {
    id: 2,
    name: "Mùa cao điểm du lịch hè 2027",
    start_date: "2027-06-01",
    end_date: "2027-08-31",
    description: "Giai đoạn cao điểm du lịch hè trên toàn quốc phục vụ gia đình và khách đoàn.",
    status: "ACTIVE",
    created_at: "2026-09-15 10:00:00",
    updated_at: "2026-09-15 10:00:00"
  },
  {
    id: 3,
    name: "Tết Nguyên Đán Đinh Mùi 2027",
    start_date: "2027-02-05",
    end_date: "2027-02-15",
    description: "Kỳ nghỉ Tết cổ truyền đón xuân Đinh Mùi trên toàn bộ hệ thống cơ sở lưu trú.",
    status: "ACTIVE",
    created_at: "2026-09-18 11:30:00",
    updated_at: "2026-09-18 11:30:00"
  },
  {
    id: 4,
    name: "Lễ hội mùa đông & Giáng sinh 2026",
    start_date: "2026-12-15",
    end_date: "2027-01-05",
    description: "Giai đoạn Giáng sinh và Tết Dương lịch cao điểm đón khách quốc tế và nội địa.",
    status: "ACTIVE",
    created_at: "2026-09-20 14:00:00",
    updated_at: "2026-09-20 14:00:00"
  },
  {
    id: 5,
    name: "Mùa nắng vàng Phú Quốc & Biển đảo 2026-2027",
    start_date: "2026-11-01",
    end_date: "2027-03-31",
    description: "Thời tiết lý tưởng tại các vùng biển đảo phía Nam với lượng khách quốc tế cao.",
    status: "ACTIVE",
    created_at: "2026-09-22 09:15:00",
    updated_at: "2026-09-22 09:15:00"
  },
  {
    id: 6,
    name: "Lễ Quốc Khánh 2/9 năm 2027",
    start_date: "2027-09-01",
    end_date: "2027-09-04",
    description: "Kỳ nghỉ lễ Quốc khánh 2/9 thu hút khách du lịch trải nghiệm kỳ nghỉ ngắn.",
    status: "ACTIVE",
    created_at: "2026-09-25 15:45:00",
    updated_at: "2026-09-25 15:45:00"
  }
];

// Seasonal Rate Period Overrides for Room Types (rate_period_items / room_rates)
// columns: id, rate_period_id, accommodation_id, room_type_id, adjustment_type, adjustment_value, price, status
export const INITIAL_ROOM_RATES = [
  { id: 1, accommodation_id: 1, room_type_id: 1, rate_period_id: 1, adjustment_type: "FIXED", adjustment_value: 4800000, price: 4800000, status: "ACTIVE" },
  { id: 2, accommodation_id: 1, room_type_id: 2, rate_period_id: 1, adjustment_type: "PERCENT_INCREASE", adjustment_value: 20, price: 3000000, status: "ACTIVE" },
  { id: 3, accommodation_id: 1, room_type_id: 3, rate_period_id: 1, adjustment_type: "AMOUNT_INCREASE", adjustment_value: 500000, price: 8500000, status: "ACTIVE" },
  { id: 4, accommodation_id: 1, room_type_id: 1, rate_period_id: 2, adjustment_type: "FIXED", adjustment_value: 4400000, price: 4400000, status: "ACTIVE" },
  { id: 5, accommodation_id: 1, room_type_id: 2, rate_period_id: 2, adjustment_type: "PERCENT_DECREASE", adjustment_value: 10, price: 2250000, status: "ACTIVE" },
  { id: 6, accommodation_id: 2, room_type_id: 4, rate_period_id: 3, adjustment_type: "FIXED", adjustment_value: 2100000, price: 2100000, status: "ACTIVE" },
  { id: 7, accommodation_id: 2, room_type_id: 5, rate_period_id: 3, adjustment_type: "AMOUNT_DECREASE", adjustment_value: 150000, price: 2200000, status: "ACTIVE" },
  { id: 8, accommodation_id: 3, room_type_id: 6, rate_period_id: 4, adjustment_type: "FIXED", adjustment_value: 1650000, price: 1650000, status: "ACTIVE" },
  { id: 9, accommodation_id: 3, room_type_id: 7, rate_period_id: 4, adjustment_type: "PERCENT_INCREASE", adjustment_value: 25, price: 2312500, status: "ACTIVE" },
  { id: 10, accommodation_id: 4, room_type_id: 8, rate_period_id: 5, adjustment_type: "FIXED", adjustment_value: 6500000, price: 6500000, status: "ACTIVE" }
];

export const INITIAL_PROMOTIONS = [
  {
    id: 1,
    name: "Autumn Escape Promo",
    code: "AUTUMN2026",
    description: "Enjoy 15% discount for bookings throughout October and November across all resorts.",
    discount_type: "Percentage",
    discount_value: 15,
    min_booking_amount: 3000000,
    max_discount: 1000000,
    start_date: "2026-10-01",
    end_date: "2026-11-30",
    applicable_accommodations: [1, 4],
    applicable_room_types: [],
    usage_limit: 100,
    times_used: 28,
    status: "Active"
  },
  {
    id: 2,
    name: "Early Tet Holiday Booking",
    code: "EARLYTET27",
    description: "Fixed VND 500,000 deduction on 3+ nights stay booked 60 days in advance.",
    discount_type: "Fixed Amount",
    discount_value: 500000,
    min_booking_amount: 6000000,
    max_discount: 500000,
    start_date: "2026-09-15",
    end_date: "2026-12-31",
    applicable_accommodations: [],
    applicable_room_types: [],
    usage_limit: 50,
    times_used: 14,
    status: "Active"
  },
  {
    id: 3,
    name: "Sapa Trekker Special",
    code: "SAPATREK",
    description: "10% off for eco-homestays in Sapa with complimentary herbal bath voucher.",
    discount_type: "Percentage",
    discount_value: 10,
    min_booking_amount: 1000000,
    max_discount: 400000,
    start_date: "2026-09-01",
    end_date: "2026-12-20",
    applicable_accommodations: [3],
    applicable_room_types: [6, 7],
    usage_limit: 200,
    times_used: 65,
    status: "Active"
  }
];

export const INITIAL_CUSTOMERS = [
  {
    id: 1,
    name: "Nguyen Van An",
    email: "an.nguyen@gmail.com",
    phone: "+84 912 345 678",
    city: "Ho Chi Minh City",
    country: "Vietnam",
    status: "Active",
    created_date: "2025-06-12",
    total_bookings: 4,
    total_spent: 38400000,
    notes: "VIP Member, prefers quiet high-floor rooms."
  },
  {
    id: 2,
    name: "Tran Thi Mai",
    email: "mai.tran@yahoo.com",
    phone: "+84 983 556 789",
    city: "Hanoi",
    country: "Vietnam",
    status: "Active",
    created_date: "2025-08-20",
    total_bookings: 3,
    total_spent: 18200000,
    notes: "Frequently books weekend boutique stays in Hanoi."
  },
  {
    id: 3,
    name: "Le Hoang Long",
    email: "long.lh@fpt.com.vn",
    phone: "+84 905 443 210",
    city: "Da Nang",
    country: "Vietnam",
    status: "Active",
    created_date: "2026-01-14",
    total_bookings: 2,
    total_spent: 24500000,
    notes: "Corporate partner tier."
  },
  {
    id: 4,
    name: "David Miller",
    email: "david.miller@globaltravel.com",
    phone: "+1 415 889 2314",
    city: "San Francisco",
    country: "United States",
    status: "Active",
    created_date: "2026-02-18",
    total_bookings: 1,
    total_spent: 3712500,
    notes: "International eco-tourist."
  },
  {
    id: 5,
    name: "Pham Minh Duc",
    email: "duc.pham@vinfast.vn",
    phone: "+84 977 112 334",
    city: "Hai Phong",
    country: "Vietnam",
    status: "Active",
    created_date: "2025-11-04",
    total_bookings: 5,
    total_spent: 54900000,
    notes: "Frequent resort villa guest with family."
  },
  {
    id: 6,
    name: "Vu Thu Trang",
    email: "thutrang.vu@gmail.com",
    phone: "+84 944 678 901",
    city: "Hanoi",
    country: "Vietnam",
    status: "Active",
    created_date: "2026-03-29",
    total_bookings: 1,
    total_spent: 0,
    notes: "Cancelled booking."
  }
];

export const INITIAL_ADMIN_USERS = [
  {
    id: 1,
    name: "Nguyen Tran Thao",
    email: "thao.nguyen@vietpeacestay.vn",
    phone: "+84 908 123 456",
    role: "Super Administrator",
    status: "Active",
    created_date: "2024-01-15"
  },
  {
    id: 2,
    name: "Le Quang Huy",
    email: "huy.le@vietpeacestay.vn",
    phone: "+84 918 334 556",
    role: "Hotel Operations Manager",
    status: "Active",
    created_date: "2024-06-01"
  },
  {
    id: 3,
    name: "Tran Bao Ngoc",
    email: "ngoc.tran@vietpeacestay.vn",
    phone: "+84 933 778 990",
    role: "Front Desk Supervisor",
    status: "Active",
    created_date: "2025-02-10"
  },
  {
    id: 4,
    name: "Dang Minh Tri",
    email: "tri.dang@vietpeacestay.vn",
    phone: "+84 972 665 443",
    role: "Reservation Agent",
    status: "Active",
    created_date: "2025-08-15"
  }
];

export const INITIAL_ROLES = [
  {
    id: 1,
    name: "Super Administrator",
    description: "Complete control over all properties, financial reports, system users, and system configuration.",
    users_count: 1,
    permissions: [
      "accommodations:read", "accommodations:write", "accommodations:delete",
      "bookings:read", "bookings:write", "bookings:delete",
      "pricing:read", "pricing:write",
      "locations:read", "locations:write", "locations:delete",
      "users:read", "users:write", "users:delete",
      "reports:view_all", "settings:manage"
    ]
  },
  {
    id: 2,
    name: "Hotel Operations Manager",
    description: "Manages assigned accommodations, room inventory, rates, and operational check-ins.",
    users_count: 1,
    permissions: [
      "accommodations:read", "accommodations:write",
      "bookings:read", "bookings:write",
      "pricing:read", "pricing:write",
      "locations:read",
      "reports:view_all"
    ]
  },
  {
    id: 3,
    name: "Front Desk Supervisor",
    description: "Daily guest check-in/out handling, room assignment, and on-site guest support.",
    users_count: 1,
    permissions: [
      "accommodations:read",
      "bookings:read", "bookings:write",
      "customers:read", "customers:write"
    ]
  },
  {
    id: 4,
    name: "Reservation Agent",
    description: "Handles customer inquiries, confirms pending bookings, and issues discount codes.",
    users_count: 1,
    permissions: [
      "accommodations:read",
      "bookings:read", "bookings:write",
      "promotions:read",
      "customers:read"
    ]
  }
];

export const MONTHLY_REVENUE_DATA = [
  { month: "Jan", revenue: 420000000, bookings: 78, occupancy: 62 },
  { month: "Feb", revenue: 680000000, bookings: 125, occupancy: 88 },
  { month: "Mar", revenue: 510000000, bookings: 94, occupancy: 70 },
  { month: "Apr", revenue: 590000000, bookings: 110, occupancy: 76 },
  { month: "May", revenue: 640000000, bookings: 118, occupancy: 82 },
  { month: "Jun", revenue: 780000000, bookings: 145, occupancy: 91 },
  { month: "Jul", revenue: 890000000, bookings: 168, occupancy: 95 },
  { month: "Aug", revenue: 820000000, bookings: 152, occupancy: 89 },
  { month: "Sep", revenue: 570000000, bookings: 104, occupancy: 72 }
];

export const BOOKING_STATUS_STATS = [
  { status: "Confirmed", count: 184, percentage: 54, color: "#287A4B" },
  { status: "Checked-in", count: 48, percentage: 14, color: "#F4C542" },
  { status: "Pending", count: 32, percentage: 9, color: "#A66A00" },
  { status: "Checked-out", count: 62, percentage: 18, color: "#1E6091" },
  { status: "Cancelled", count: 16, percentage: 5, color: "#C0392B" }
];

// Helper currency formatter (Vietnamese convention: 1.500.000 VNĐ)
export function formatVND(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 VNĐ';
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' VNĐ';
}

// Helper date formatter (Vietnamese convention: dd/MM/yyyy)
export function formatDateVN(dateStr) {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  const datePart = str.split('T')[0].split(' ')[0];
  const parts = datePart.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper datetime formatter (Vietnamese convention: dd/MM/yyyy HH:mm)
export function formatDateTimeVN(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

