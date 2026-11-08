import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import FormInput from '../../components/forms/FormInput.jsx';
import FormSelect from '../../components/forms/FormSelect.jsx';
import FormTextarea from '../../components/forms/FormTextarea.jsx';
import { formatVND } from '../../data/entities.js';
import { DAYS_OF_WEEK } from '../../data/mockData.js';
import {
  roomTypesApi,
  toRoomTypeWritePayload,
  isLocalPreviewUrl,
} from '../../api/roomTypes.js';
import { useAdmin } from '../../context/AdminContext.jsx';
import { accommodationsApi } from '../../api/accommodations.js';
import { lookupsApi } from '../../api/lookups.js';
import {
  ArrowLeft,
  Save,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Trash2,
  X,
  UploadCloud,
  Search,
  RotateCcw,
  Wifi,
  Waves,
  Sparkles,
  Utensils,
  Clock,
  Car,
  Wind,
  Tv,
  Coffee,
  Maximize,
  Bath,
  Shield,
  Bike,
  Anchor,
  Flame,
  Briefcase
} from 'lucide-react';

const AMENITY_CATEGORY_LABELS = {
  'Room Amenities': 'Tiện nghi trong phòng',
  'Property Facilities': 'Cơ sở vật chất chung',
  'Dining': 'Ẩm thực & Nhà hàng',
  'Recreation': 'Giải trí & Thể thao',
  'Services': 'Dịch vụ lưu trú'
};

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function validateImageFile(file) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Chỉ nhận ảnh JPG, PNG hoặc WEBP.';
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return 'Kích thước ảnh tối đa là 5MB.';
  }
  return null;
}

// Khi backend trả lỗi theo field, cần biết field đó nằm ở tab nào
// để tự chuyển tab, tránh người dùng phải tự tìm.
const FIELD_TAB_MAP = {
  accommodation_id: 'general',
  code: 'general',
  name: 'general',
  short_description: 'general',
  description: 'general',
  status: 'general',

  room_size: 'capacity',
  bed_type: 'capacity',
  quantity: 'capacity',
  bedroom_count: 'capacity',
  bathroom_count: 'capacity',
  included_adults: 'capacity',
  included_children: 'capacity',
  max_adults: 'capacity',
  max_children: 'capacity',
  max_occupancy: 'capacity',
  base_price: 'general',
  extra_adult_fee: 'capacity',
  extra_child_fee: 'capacity',

  weekday_rates: 'pricing',
  amenity_ids: 'amenities',
  room_image: 'media',
  supplementary_images: 'media'
};

// Backend dùng camelCase, form dùng snake_case.
const API_FIELD_TO_FORM_FIELD = {
  accommodationId: 'accommodation_id',
  code: 'code',
  name: 'name',
  shortDescription: 'short_description',
  description: 'description',
  quantity: 'quantity',
  basePrice: 'base_price',
  areaSqm: 'room_size',
  bedDescription: 'bed_type',
  bedroomCount: 'bedroom_count',
  bathroomCount: 'bathroom_count',
  includedAdults: 'included_adults',
  includedChildren: 'included_children',
  maxAdults: 'max_adults',
  maxChildren: 'max_children',
  maxOccupancy: 'max_occupancy',
  extraAdultFee: 'extra_adult_fee',
  extraChildFee: 'extra_child_fee',
  status: 'status',
  sortOrder: 'sort_order',
  images: 'room_image',
  amenities: 'amenity_ids',
  weekdayRates: 'weekday_rates'
};

// DTO detail -> state form. Tách ra để dùng chung cho lúc mở trang Sửa
// và lúc backend trả detail mới sau khi PUT.
function detailToFormState(detail) {
  return {
    name: detail.name || '',
    code: detail.code || '',
    accommodation_id: detail.accommodationId ?? '',
    short_description: detail.shortDescription || '',
    description: detail.description || '',
    status: detail.status ?? 0,
    quantity: detail.quantity ?? 1,
    room_size: detail.areaSqm ?? '',
    bed_type: detail.bedDescription || '',
    bedroom_count: detail.bedroomCount ?? 1,
    bathroom_count: detail.bathroomCount ?? 1,
    included_adults: detail.includedAdults ?? 1,
    included_children: detail.includedChildren ?? 0,
    max_adults: detail.maxAdults ?? 1,
    max_children: detail.maxChildren ?? 0,
    max_occupancy: detail.maxOccupancy ?? 1,
    extra_adult_fee: detail.extraAdultFee ?? 0,
    extra_child_fee: detail.extraChildFee ?? 0,
    base_price: detail.basePrice ?? '',
    sort_order: detail.sortOrder ?? 0,
    amenity_ids: detail.amenityIds || [],
    room_image: detail.coverImageUrl || '',
    supplementary_images: detail.galleryImageUrls || []
  };
}

function ratesToWeekdayState(rates = []) {
  const next = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  rates.forEach((rate) => {
    next[rate.dayOfWeek] = rate.price;
  });
  return next;
}

export default function RoomTypeFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const preselectedAccId = searchParams.get('accommodation_id');
  const navigate = useNavigate();
  const { showToast, currentUser } = useAdmin();

  // Role từ server session. Backend chặn manager đổi accommodation của
  // room type (403) — disable select ở đây chỉ để người dùng không mất công.
  const isAdmin = currentUser?.role === 'ADMIN';
  // Khi Sửa mà không phải ADMIN: room type gắn chặt cơ sở hiện tại (policy P2).
  const lockAccommodationSelect = Boolean(preselectedAccId) || (isEdit && !isAdmin);

  // 5 Tabs in exact required order
  const [activeTab, setActiveTab] = useState('general');

  // File input refs
  const coverFileInputRef = useRef(null);
  const suppFileInputRef = useRef(null);

  // Form State — chỉ chứa field có trong DB room_types.
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    accommodation_id: preselectedAccId ? Number(preselectedAccId) : '',
    short_description: '',
    description: '',
    status: 0,
    quantity: 1,
    room_size: '',
    bed_type: '',
    bedroom_count: 1,
    bathroom_count: 1,
    included_adults: 2,
    included_children: 0,
    max_adults: 2,
    max_children: 0,
    max_occupancy: 2,
    extra_adult_fee: 0,
    extra_child_fee: 0,
    base_price: '',
    sort_order: 0,
    amenity_ids: [],
    room_image: '',
    supplementary_images: []
  });

  // Weekday Rates state (day 1 to 7)
  const [weekdayRates, setWeekdayRates] = useState({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0
  });

  // Số người thêm tối đa theo từng giới hạn độc lập.
  const extraAdultCount = Math.max(
    0,
    (Number(formData.max_adults) || 0) - (Number(formData.included_adults) || 0)
  );
  const extraChildCount = Math.max(
    0,
    (Number(formData.max_children) || 0) - (Number(formData.included_children) || 0)
  );
  const extraAdultMaxFee = extraAdultCount * (Number(formData.extra_adult_fee) || 0);
  const extraChildMaxFee = extraChildCount * (Number(formData.extra_child_fee) || 0);

  // Amenity filters
  const [amenityCategoryFilter, setAmenityCategoryFilter] = useState('');
  const [amenitySearchTerm, setAmenitySearchTerm] = useState('');

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);

  // Dữ liệu danh mục lấy từ DB, không dùng mock context.
  const [accommodationOptions, setAccommodationOptions] = useState([]);
  const [amenityOptions, setAmenityOptions] = useState([]);

  // Nạp cơ sở lưu trú cho dropdown.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const payload = await accommodationsApi.getList({ page: 1, limit: 100 });
        if (cancelled) return;

        const items = payload.data?.items || [];
        setAccommodationOptions(items);
        // Không tự chọn cơ sở đầu tiên (trước đây `items[0]?.id` được gửi lên
        // âm thầm nếu người dùng bỏ trống). Create để rỗng: backend trả
        // 400 "Vui lòng chọn cơ sở lưu trú" và form tự nhảy đúng tab.
        setFormData((prev) => ({
          ...prev,
          accommodation_id: prev.accommodation_id || '',
        }));
      } catch (error) {
        if (cancelled) return;
        console.error('[RoomTypeFormPage] Không tải được cơ sở lưu trú:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Room type có thể dùng tiện nghi scope 'room' hoặc 'both',
  // nên gọi cả hai và gộp theo id.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [roomItems, bothItems] = await Promise.all([
          lookupsApi.getAmenities('room'),
          lookupsApi.getAmenities('both'),
        ]);
        if (cancelled) return;

        const seen = new Set();
        const merged = [];

        [...roomItems, ...bothItems].forEach((item) => {
          if (seen.has(item.id)) return;
          seen.add(item.id);
          merged.push({
            ...item,
            category: item.categoryName || item.categoryCode || 'Khác',
            icon: item.iconKey
              ? item.iconKey.charAt(0).toUpperCase() + item.iconKey.slice(1)
              : '',
          });
        });

        setAmenityOptions(merged);
      } catch (error) {
        if (cancelled) return;
        console.error('[RoomTypeFormPage] Không tải được tiện nghi:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Khi Sửa: đọc detail thật từ DB thay vì tìm trong mock context.
  useEffect(() => {
    if (!isEdit) {
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const payload = await roomTypesApi.getDetail(id);
        if (cancelled) return;

        const detail = payload.data;

        setFormData(detailToFormState(detail));
        setWeekdayRates(ratesToWeekdayState(detail.weekdayRates));
        setIsNotFound(false);
      } catch (error) {
        if (cancelled) return;

        if (error.status === 404) {
          setIsNotFound(true);
        } else {
          setErrors((prev) => ({ ...prev, form: error.message }));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  // Create mode có thể được mở từ trang cơ sở lưu trú với ?accommodation_id=...
  useEffect(() => {
    if (!isEdit && preselectedAccId) {
      setFormData((prev) => ({ ...prev, accommodation_id: Number(preselectedAccId) }));
    }
  }, [isEdit, preselectedAccId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Ô giá gốc là text để dễ nhập, nhưng chỉ giữ chữ số
  // trước khi chuyển thành số ở toRoomTypeWritePayload.
  const handleBasePriceChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    setFormData((prev) => ({ ...prev, base_price: digits }));
    if (errors.base_price) {
      setErrors((prev) => ({ ...prev, base_price: null }));
    }
  };

  // Toggle amenity selection (belongs strictly to room type)
  const handleAmenityToggle = (amenityId) => {
    setFormData((prev) => {
      const current = prev.amenity_ids || [];
      const updated = current.includes(amenityId)
        ? current.filter((i) => i !== amenityId)
        : [...current, amenityId];
      return { ...prev, amenity_ids: updated };
    });
  };

  // Select all visible amenities
  const handleSelectAllVisibleAmenities = (items) => {
    setFormData((prev) => {
      const current = new Set(prev.amenity_ids || []);
      items.forEach((it) => current.add(it.id));
      return { ...prev, amenity_ids: Array.from(current) };
    });
  };

  // Deselect all visible amenities
  const handleDeselectAllVisibleAmenities = (items) => {
    setFormData((prev) => {
      const idsToRemove = new Set(items.map((it) => it.id));
      const updated = (prev.amenity_ids || []).filter((id) => !idsToRemove.has(id));
      return { ...prev, amenity_ids: updated };
    });
  };

  // Cover image: hiện preview blob: ngay, sau đó thay bằng URL server.
  const handleCoverFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (coverFileInputRef.current) {
      coverFileInputRef.current.value = '';
    }
    if (!file || uploadingCount > 0) return;

    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      setErrors((prev) => ({ ...prev, room_image: validationMessage }));
      return;
    }

    const previousUrl = formData.room_image;
    const previewUrl = URL.createObjectURL(file);

    setErrors((prev) => ({ ...prev, room_image: null }));
    setFormData((prev) => ({ ...prev, room_image: previewUrl }));
    setUploadingCount((count) => count + 1);

    try {
      const uploadedUrl = await roomTypesApi.uploadImage(file);
      setFormData((prev) => ({ ...prev, room_image: uploadedUrl }));
    } catch (error) {
      // Upload lỗi thì trả lại ảnh cũ, không để blob: nằm lại trong form.
      setFormData((prev) => ({ ...prev, room_image: previousUrl }));
      setErrors((prev) => ({
        ...prev,
        room_image: error.message || 'Tải ảnh lên thất bại.',
      }));
      console.error('[RoomTypeFormPage] Upload ảnh bìa thất bại:', error);
    } finally {
      URL.revokeObjectURL(previewUrl);
      setUploadingCount((count) => Math.max(0, count - 1));
    }
  };

  // Supplementary images: upload song song, map preview blob: -> URL server.
  const handleSupplementaryFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (suppFileInputRef.current) {
      suppFileInputRef.current.value = '';
    }
    if (files.length === 0 || uploadingCount > 0) return;

    const validFiles = [];
    const invalidMessages = [];
    for (const file of files) {
      const validationMessage = validateImageFile(file);
      if (validationMessage) {
        invalidMessages.push(`${file.name}: ${validationMessage}`);
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      setErrors((prev) => ({
        ...prev,
        supplementary_images: invalidMessages.join(' '),
      }));
      return;
    }

    const previews = validFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    // Vẫn báo các file bị từ chối, kể cả khi một số file hợp lệ được upload.
    setErrors((prev) => ({
      ...prev,
      supplementary_images: invalidMessages.length
        ? invalidMessages.join(' ')
        : null,
    }));
    setFormData((prev) => ({
      ...prev,
      supplementary_images: [
        ...(prev.supplementary_images || []),
        ...previews.map((item) => item.previewUrl),
      ],
    }));
    setUploadingCount((count) => count + previews.length);

    await Promise.all(
      previews.map(async ({ file, previewUrl }) => {
        try {
          const uploadedUrl = await roomTypesApi.uploadImage(file);
          setFormData((prev) => ({
            ...prev,
            supplementary_images: (prev.supplementary_images || []).map(
              (url) => (url === previewUrl ? uploadedUrl : url)
            ),
          }));
        } catch (error) {
          // Ảnh nào lỗi thì bỏ đúng preview đó, không đụng ảnh khác.
          setFormData((prev) => ({
            ...prev,
            supplementary_images: (prev.supplementary_images || []).filter(
              (url) => url !== previewUrl
            ),
          }));
          setErrors((prev) => ({
            ...prev,
            supplementary_images: error.message || 'Tải ảnh lên thất bại.',
          }));
          console.error('[RoomTypeFormPage] Upload ảnh phụ thất bại:', error);
        } finally {
          URL.revokeObjectURL(previewUrl);
          setUploadingCount((count) => Math.max(0, count - 1));
        }
      })
    );
  };

  const handleRemoveSupplementaryImage = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      supplementary_images: (prev.supplementary_images || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Render icon helper
  const renderAmenityIcon = (iconName) => {
    switch (iconName) {
      case 'Wifi': return <Wifi size={16} />;
      case 'Waves': return <Waves size={16} />;
      case 'Sparkles': return <Sparkles size={16} />;
      case 'Utensils': return <Utensils size={16} />;
      case 'Clock': return <Clock size={16} />;
      case 'Car': return <Car size={16} />;
      case 'Wind': return <Wind size={16} />;
      case 'Tv': return <Tv size={16} />;
      case 'Coffee': return <Coffee size={16} />;
      case 'Maximize': return <Maximize size={16} />;
      case 'Bath': return <Bath size={16} />;
      case 'Shield': return <Shield size={16} />;
      case 'Bike': return <Bike size={16} />;
      case 'Anchor': return <Anchor size={16} />;
      case 'Flame': return <Flame size={16} />;
      case 'Briefcase': return <Briefcase size={16} />;
      default: return <Sparkles size={16} />;
    }
  };

  // Filtered amenities grouped by category
  const filteredAmenitiesByCategory = useMemo(() => {
    const grouped = {};
    amenityOptions.forEach((item) => {
      if (amenityCategoryFilter && item.category !== amenityCategoryFilter) {
        return;
      }
      if (amenitySearchTerm.trim()) {
        const query = amenitySearchTerm.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchDesc = (item.description || '').toLowerCase().includes(query);
        if (!matchName && !matchDesc) return;
      }
      const cat = item.category || 'Khác';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    return grouped;
  }, [amenityOptions, amenityCategoryFilter, amenitySearchTerm]);

  // Unique categories list
  const uniqueCategories = useMemo(() => {
    const set = new Set();
    amenityOptions.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return Array.from(set);
  }, [amenityOptions]);

  // Ràng buộc chéo theo CHECK constraint của bảng room_types.
  const validateCapacityRules = () => {
    const nextErrors = {};

    const includedAdults = Number(formData.included_adults);
    const includedChildren = Number(formData.included_children);
    const maxAdults = Number(formData.max_adults);
    const maxChildren = Number(formData.max_children);
    const maxOccupancy = Number(formData.max_occupancy);
    const extraAdultFee = Number(formData.extra_adult_fee);
    const extraChildFee = Number(formData.extra_child_fee);

    if (!Number.isInteger(includedAdults) || includedAdults < 1) {
      nextErrors.included_adults = 'Số người lớn đi kèm phải là số nguyên từ 1 trở lên.';
    }
    if (!Number.isInteger(includedChildren) || includedChildren < 0) {
      nextErrors.included_children = 'Số trẻ em đi kèm phải là số nguyên từ 0 trở lên.';
    }
    if (!Number.isInteger(maxAdults) || maxAdults < 1) {
      nextErrors.max_adults = 'Số người lớn tối đa phải là số nguyên từ 1 trở lên.';
    }
    if (!Number.isInteger(maxChildren) || maxChildren < 0) {
      nextErrors.max_children = 'Số trẻ em tối đa phải là số nguyên từ 0 trở lên.';
    }
    if (!Number.isInteger(maxOccupancy) || maxOccupancy < 1) {
      nextErrors.max_occupancy = 'Sức chứa tối đa phải là số nguyên từ 1 trở lên.';
    }
    if (!Number.isFinite(extraAdultFee) || extraAdultFee < 0) {
      nextErrors.extra_adult_fee = 'Phụ phí người lớn thêm không được âm.';
    }
    if (!Number.isFinite(extraChildFee) || extraChildFee < 0) {
      nextErrors.extra_child_fee = 'Phụ phí trẻ em thêm không được âm.';
    }

    if (
      !nextErrors.included_adults &&
      !nextErrors.max_adults &&
      includedAdults > maxAdults
    ) {
      nextErrors.included_adults =
        'Số người lớn đi kèm không được lớn hơn số người lớn tối đa.';
    }
    if (
      !nextErrors.included_children &&
      !nextErrors.max_children &&
      includedChildren > maxChildren
    ) {
      nextErrors.included_children =
        'Số trẻ em đi kèm không được lớn hơn số trẻ em tối đa.';
    }
    if (
      !nextErrors.max_adults &&
      !nextErrors.max_occupancy &&
      maxAdults > maxOccupancy
    ) {
      nextErrors.max_adults =
        'Số người lớn tối đa không được lớn hơn sức chứa tối đa.';
    }
    if (
      !nextErrors.max_children &&
      !nextErrors.max_occupancy &&
      maxChildren > maxOccupancy
    ) {
      nextErrors.max_children =
        'Số trẻ em tối đa không được lớn hơn sức chứa tối đa.';
    }
    if (
      !nextErrors.included_adults &&
      !nextErrors.included_children &&
      !nextErrors.max_occupancy &&
      includedAdults + includedChildren > maxOccupancy
    ) {
      nextErrors.max_occupancy =
        'Số khách đi kèm tiêu chuẩn không được lớn hơn sức chứa tối đa.';
    }
    if (
      !nextErrors.max_adults &&
      !nextErrors.max_children &&
      !nextErrors.max_occupancy &&
      maxAdults + maxChildren < maxOccupancy
    ) {
      nextErrors.max_occupancy =
        'Sức chứa tối đa không được lớn hơn tổng số người lớn tối đa và trẻ em tối đa.';
    }

    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || uploadingCount > 0) return;

    setErrors({});

    // Chốt chặn cuối: nếu còn URL blob:/data: thì ảnh chưa lên server.
    const localFields = [];
    if (isLocalPreviewUrl(formData.room_image)) {
      localFields.push('room_image');
    }
    if ((formData.supplementary_images || []).some(isLocalPreviewUrl)) {
      localFields.push('supplementary_images');
    }

    if (localFields.length > 0) {
      const message = 'Ảnh vẫn đang được tải lên server. Vui lòng chờ hoàn tất.';
      const imageErrors = { form: message };
      localFields.forEach((field) => {
        imageErrors[field] = message;
      });
      setErrors(imageErrors);
      setActiveTab('media');
      return;
    }

    const capacityErrors = validateCapacityRules();
    if (Object.keys(capacityErrors).length > 0) {
      setErrors(capacityErrors);
      setActiveTab('capacity');
      return;
    }

    const payload = toRoomTypeWritePayload(formData, weekdayRates);

    // Create luôn tạo bản nháp; đổi trạng thái do trang Sửa đảm nhận
    // (đồng bộ pattern AccommodationFormPage.toApiCreatePayload).
    // Backend room_type_service cũng mặc định status = 0 khi create không gửi.
    if (!isEdit) payload.status = 0;

    console.group('[RoomTypeFormPage.handleSubmit]');
    console.log('[1] chế độ:', isEdit ? 'cập nhật' : 'tạo mới');
    console.log('[2] payload:', payload);

    setIsSubmitting(true);

    try {
      if (isEdit) {
        const saved = await roomTypesApi.update(id, payload);
        console.log('[3] cập nhật thành công id:', saved.id);
        showToast('Đã cập nhật loại phòng thành công.');
        navigate('/admin/room-types');
      } else {
        const created = await roomTypesApi.create(payload);
        console.log('[3] tạo thành công id:', created.id);
        showToast('Đã tạo loại phòng thành công.');
        navigate('/admin/room-types');
      }
    } catch (error) {
      const apiErrors = error.errors || {};
      const mappedErrors = {};

      Object.entries(apiErrors).forEach(([apiField, message]) => {
        const formField = API_FIELD_TO_FORM_FIELD[apiField] || apiField;
        mappedErrors[formField] = message;
      });

      // Banner chung ưu tiên message cụ thể đầu tiên của backend.
      const firstSpecificMessage = Object.values(apiErrors)[0];
      setErrors({
        ...mappedErrors,
        form: firstSpecificMessage || error.message,
      });

      // Nhảy tới tab chứa field lỗi đầu tiên.
      const firstApiField = Object.keys(apiErrors)[0];
      const firstFormField =
        API_FIELD_TO_FORM_FIELD[firstApiField] || firstApiField;
      setActiveTab(FIELD_TAB_MAP[firstFormField] || 'general');

      console.error('[4] lỗi lưu loại phòng:', {
        status: error.status,
        errorCode: error.errorCode,
        errors: apiErrors,
      });
    } finally {
      setIsSubmitting(false);
      console.groupEnd();
    }
  };

  if (isLoading) {
    return (
      <div className="admin-page">
        <PageHeader
          title="Đang tải loại phòng..."
          breadcrumb={[
            { label: 'Cơ sở lưu trú', path: '/admin/accommodations' },
            { label: 'Loại phòng', path: '/admin/room-types' },
            { label: isEdit ? 'Chỉnh sửa' : 'Thêm mới' }
          ]}
        />
        <div className="admin-card" style={{ padding: '48px', textAlign: 'center', color: '#6B7280' }}>
          Đang tải dữ liệu loại phòng từ server...
        </div>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="admin-page">
        <PageHeader
          title="Không tìm thấy loại phòng"
          breadcrumb={[
            { label: 'Cơ sở lưu trú', path: '/admin/accommodations' },
            { label: 'Loại phòng', path: '/admin/room-types' },
            { label: 'Lỗi' }
          ]}
        />
        <div className="admin-card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={36} color="#DC2626" style={{ margin: '0 auto 12px' }} />
          <h3>Loại phòng không tồn tại hoặc đã bị xóa.</h3>
          <p style={{ color: '#6B7280', marginTop: '6px' }}>
            ID #{id} không có trong cơ sở dữ liệu hệ thống.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: '16px' }}
            onClick={() => navigate('/admin/room-types')}
          >
            Quay lại danh sách loại phòng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? `Chỉnh sửa loại phòng: ${formData.name}` : 'Thêm loại phòng mới'}
        description="Cấu hình thông số kỹ thuật, sức chứa, bảng giá 7 ngày trong tuần, tiện nghi trang bị và hình ảnh phòng."
        breadcrumb={[
          { label: 'Cơ sở lưu trú', path: '/admin/accommodations' },
          { label: 'Loại phòng', path: '/admin/room-types' },
          { label: isEdit ? 'Chỉnh sửa' : 'Thêm mới' }
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link
              to={preselectedAccId ? `/admin/accommodations/${preselectedAccId}` : '/admin/room-types'}
              className="btn btn-secondary"
            >
              <ArrowLeft size={14} /> Quay lại
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={isSubmitting || uploadingCount > 0}
            >
              <Save size={14} />
              {uploadingCount > 0
                ? 'Đang tải ảnh...'
                : isSubmitting
                  ? 'Đang lưu...'
                  : isEdit
                    ? 'Lưu thay đổi'
                    : 'Tạo loại phòng'}
            </button>
          </div>
        }
      />

      {errors.form && (
        <div className="admin-card" style={{ borderColor: '#E53E3E', marginBottom: '12px' }}>
          <div className="admin-card-body" style={{ color: '#C53030', fontSize: '13px' }}>
            {errors.form}
          </div>
        </div>
      )}

      {/* Tabs: Exactly Five Tabs in required order */}
      <div className="admin-tabs" style={{ marginBottom: '16px' }}>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          Thông tin tổng quan loại phòng
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'capacity' ? 'active' : ''}`}
          onClick={() => setActiveTab('capacity')}
        >
          Kích thước, sức chứa
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'pricing' ? 'active' : ''}`}
          onClick={() => setActiveTab('pricing')}
        >
          Bảng giá 7 ngày trong tuần
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'amenities' ? 'active' : ''}`}
          onClick={() => setActiveTab('amenities')}
        >
          Tiện nghi ({(formData.amenity_ids || []).length})
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
        >
          Hình ảnh phòng
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tab 1: Thông tin tổng quan loại phòng */}
        {activeTab === 'general' && (
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title">Thông tin tổng quan loại phòng</div>
            </div>
            <div className="admin-card-body">
              <div className="form-grid">
                <FormInput
                  label="Tên loại phòng"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="VD: Premier Ocean Suite"
                  required
                  error={errors.name}
                />

                <FormInput
                  label="Mã loại phòng"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="VD: VPD-POS"
                  required
                  error={errors.code}
                />

                <FormSelect
                  label="Cơ sở lưu trú trực thuộc"
                  name="accommodation_id"
                  value={formData.accommodation_id}
                  onChange={handleChange}
                  options={accommodationOptions.map((a) => ({ value: a.id, label: a.name }))}
                  required
                  disabled={lockAccommodationSelect}
                  error={errors.accommodation_id}
                  helperText={
                    preselectedAccId
                      ? 'Đã được chỉ định từ cơ sở lưu trú cha.'
                      : isEdit && !isAdmin
                        ? 'Loại phòng gắn chặt cơ sở hiện tại; chỉ ADMIN mới đổi được cơ sở.'
                        : ''
                  }
                />

                {/* Trạng thái chỉ có ở trang Sửa: create luôn tạo bản nháp,
                    người dùng kích hoạt sau khi nội dung đã đầy đủ. */}
                {isEdit && (
                  <FormSelect
                    label="Trạng thái"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    options={[
                      { value: 0, label: 'Bản nháp' },
                      { value: 1, label: 'Đang hoạt động' },
                      { value: 2, label: 'Ngừng hoạt động' }
                    ]}
                  />
                )}

                <FormInput
                  label="Giá gốc theo đêm (VNĐ)"
                  name="base_price"
                  type="text"
                  inputMode="numeric"
                  value={formData.base_price}
                  onChange={handleBasePriceChange}
                  placeholder="VD: 450000"
                  required
                  error={errors.base_price}
                  helperText="Chỉ nhập chữ số. Giá gốc dùng làm mốc tính giá các ngày trong tuần."
                />

                <div className="col-span-full">
                  <FormTextarea
                    label="Mô tả ngắn"
                    name="short_description"
                    value={formData.short_description}
                    onChange={handleChange}
                    rows={2}
                    placeholder="1-2 câu giới thiệu ngắn về loại phòng..."
                  />
                </div>

                <div className="col-span-full">
                  <FormTextarea
                    label="Mô tả loại phòng"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Mô tả không gian phòng, nội thất, tiện ích đặc trưng và tầm nhìn cảnh quan..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Kích thước, sức chứa */}
        {activeTab === 'capacity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-card">
              <div className="admin-card-header">
                <div className="admin-card-title">Thông số diện tích & Bố trí giường</div>
              </div>
              <div className="admin-card-body">
                <div className="form-grid">
                  <FormInput
                    label="Diện tích phòng (m²)"
                    name="room_size"
                    type="number"
                    min="1"
                    value={formData.room_size}
                    onChange={handleChange}
                    required
                    error={errors.room_size}
                  />

                  <FormInput
                    label="Loại giường"
                    name="bed_type"
                    value={formData.bed_type}
                    onChange={handleChange}
                    placeholder="VD: 1 giường King (1,8 m x 2 m)"
                  />

                  <FormInput
                    label="Số phòng"
                    name="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={handleChange}
                    helperText="Số lượng phòng thực tế của cơ sở."
                  />
                </div>
              </div>
            </div>

            <div className="admin-card">
              <div className="admin-card-header">
                <div className="admin-card-title">Quy định sức chứa, khách đi kèm & Phụ phí quá tải</div>
              </div>
              <div className="admin-card-body">
                <div className="form-grid">
                  <FormInput
                    label="Số người lớn đi kèm (tiêu chuẩn)"
                    name="included_adults"
                    type="number"
                    min="1"
                    value={formData.included_adults}
                    onChange={handleChange}
                    error={errors.included_adults}
                  />

                  <FormInput
                    label="Số trẻ em đi kèm (tiêu chuẩn)"
                    name="included_children"
                    type="number"
                    min="0"
                    value={formData.included_children}
                    onChange={handleChange}
                    error={errors.included_children}
                  />

                  <FormInput
                    label="Số người lớn tối đa"
                    name="max_adults"
                    type="number"
                    min="1"
                    value={formData.max_adults}
                    onChange={handleChange}
                    error={errors.max_adults}
                  />

                  <FormInput
                    label="Số trẻ em tối đa"
                    name="max_children"
                    type="number"
                    min="0"
                    value={formData.max_children}
                    onChange={handleChange}
                    error={errors.max_children}
                  />

                  <FormInput
                    label="Sức chứa tối đa (tổng số khách)"
                    name="max_occupancy"
                    type="number"
                    min="1"
                    value={formData.max_occupancy}
                    onChange={handleChange}
                    error={errors.max_occupancy}
                    helperText="Giới hạn tổng khách; không được lớn hơn số người lớn tối đa + số trẻ em tối đa."
                  />

                  <FormInput
                    label="Phụ phí người lớn thêm (VNĐ/đêm)"
                    name="extra_adult_fee"
                    type="number"
                    min="0"
                    step="50000"
                    value={formData.extra_adult_fee}
                    onChange={handleChange}
                    error={errors.extra_adult_fee}
                    helperText={
                      extraAdultCount > 0
                        ? `Áp dụng cho tối đa ${extraAdultCount} người lớn thêm/đêm (${formatVND(extraAdultMaxFee)}).`
                        : undefined
                    }
                  />

                  <FormInput
                    label="Phụ phí trẻ em thêm (VNĐ/đêm)"
                    name="extra_child_fee"
                    type="number"
                    min="0"
                    step="50000"
                    value={formData.extra_child_fee}
                    onChange={handleChange}
                    error={errors.extra_child_fee}
                    helperText={
                      extraChildCount > 0
                        ? `Áp dụng cho tối đa ${extraChildCount} trẻ em thêm/đêm (${formatVND(extraChildMaxFee)}).`
                        : undefined
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Bảng giá 7 ngày trong tuần */}
        {activeTab === 'pricing' && (
          <div className="admin-card">
            <div
              className="admin-card-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div>
                <div className="admin-card-title">Bảng giá 7 ngày trong tuần (room_weekday_rates)</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  Mỗi loại phòng có đúng 1 mức giá cố định cho từng ngày trong tuần (1 = Thứ Hai ... 7 = Chủ Nhật).
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const base = Number(formData.base_price) || 1000000;
                    setWeekdayRates({
                      1: base,
                      2: base,
                      3: base,
                      4: base,
                      5: base,
                      6: base,
                      7: base
                    });
                  }}
                  style={{ fontSize: '11.5px' }}
                >
                  Đồng bộ theo giá gốc ({formatVND(Number(formData.base_price) || 0)})
                </button>
              </div>
            </div>
            <div className="admin-card-body">
              {errors.weekday_rates && (
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '4px',
                    color: '#DC2626',
                    fontSize: '12.5px',
                    marginBottom: '14px'
                  }}
                >
                  {errors.weekday_rates}
                </div>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '12px'
                }}
              >
                {DAYS_OF_WEEK.map((d) => {
                  const val = weekdayRates[d.day] ?? '';
                  const numVal = Number(val);
                  return (
                    <div
                      key={d.day}
                      style={{
                        padding: '10px 12px',
                        border: '1px solid #E5E7EB',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '4px'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '6px'
                        }}
                      >
                        <span
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 600,
                            color: '#1F2937'
                          }}
                        >
                          Ngày {d.day}: {d.vietnamese}
                        </span>
                        <span
                          style={{
                            fontSize: '10.5px',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            backgroundColor: '#E5E7EB',
                            color: '#4B5563'
                          }}
                        >
                          {d.isWeekend ? 'Cuối tuần' : 'Ngày thường'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="number"
                          step="50000"
                          min="0"
                          className="form-input"
                          value={val}
                          onChange={(e) => {
                            const v = e.target.value;
                            setWeekdayRates((prev) => ({ ...prev, [d.day]: v }));
                          }}
                          placeholder="Giá theo đêm (VNĐ)"
                          style={{
                            textAlign: 'right',
                            fontWeight: 600,
                            borderColor: '#D1D5DB'
                          }}
                        />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>VNĐ</span>
                      </div>

                      <div
                        style={{
                          fontSize: '11.5px',
                          textAlign: 'right',
                          marginTop: '4px',
                          color: '#4B5563',
                          fontWeight: 500
                        }}
                        className="tabular-nums"
                      >
                        {numVal >= 0 ? formatVND(numVal) : 'Không hợp lệ'}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: '14px',
                  fontSize: '12px',
                  color: '#6B7280',
                  padding: '8px 12px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '4px'
                }}
              >
                * Mức giá cấu hình tại đây sẽ được lưu trữ trực tiếp vào bảng <code>room_weekday_rates</code> và làm giá mặc định khi bán phòng cho từng thứ trong tuần.
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Tiện nghi */}
        {activeTab === 'amenities' && (
          <div className="admin-card">
            <div
              className="admin-card-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div>
                <div className="admin-card-title">Tiện nghi & Dịch vụ trang bị trong loại phòng</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  Lựa chọn các tiện ích, trang thiết bị đi kèm riêng biệt của loại phòng này (độc lập với tiện nghi chung của cơ sở lưu trú).
                </div>
              </div>
              <span className="badge badge-success" style={{ fontSize: '12px', padding: '4px 10px' }}>
                Đã chọn {(formData.amenity_ids || []).length} tiện nghi
              </span>
            </div>

            <div className="admin-card-body">
              {/* Filter Toolbar: Category dropdown & Search */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  paddingBottom: '16px',
                  marginBottom: '16px',
                  borderBottom: '1px solid #E5E7EB'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                    Nhóm tiện nghi:
                  </label>
                  <select
                    className="filter-select"
                    style={{ minWidth: '220px', height: '36px' }}
                    value={amenityCategoryFilter}
                    onChange={(e) => setAmenityCategoryFilter(e.target.value)}
                  >
                    <option value="">Tất cả danh mục</option>
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {AMENITY_CATEGORY_LABELS[cat] || cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
                  <input
                    type="text"
                    className="filter-input"
                    style={{ width: '100%', height: '36px', paddingLeft: '30px' }}
                    placeholder="Tìm kiếm tiện nghi theo tên hoặc mô tả..."
                    value={amenitySearchTerm}
                    onChange={(e) => setAmenitySearchTerm(e.target.value)}
                  />
                  <Search
                    size={14}
                    style={{ position: 'absolute', left: '10px', top: '11px', color: '#6B7280' }}
                  />
                </div>

                {(amenityCategoryFilter || amenitySearchTerm) && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setAmenityCategoryFilter('');
                      setAmenitySearchTerm('');
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RotateCcw size={13} /> Đặt lại bộ lọc
                  </button>
                )}
              </div>

              {/* Grouped Amenities List */}
              {Object.keys(filteredAmenitiesByCategory).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: '#6B7280' }}>
                  Không tìm thấy tiện nghi nào phù hợp với bộ lọc tìm kiếm.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                  {Object.entries(filteredAmenitiesByCategory).map(([category, items]) => {
                    const categoryTitle = AMENITY_CATEGORY_LABELS[category] || category;
                    const selectedCountInCategory = items.filter((it) =>
                      (formData.amenity_ids || []).includes(it.id)
                    ).length;

                    return (
                      <div
                        key={category}
                        style={{
                          border: '1px solid #E5E7EB',
                          borderRadius: '6px',
                          padding: '14px 16px',
                          backgroundColor: '#FAFAFA'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#1F2937', margin: 0 }}>
                              {categoryTitle}
                            </h4>
                            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                              {selectedCountInCategory} / {items.length} đã chọn
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '2px 8px' }}
                              onClick={() => handleSelectAllVisibleAmenities(items)}
                            >
                              Chọn tất cả
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '2px 8px' }}
                              onClick={() => handleDeselectAllVisibleAmenities(items)}
                            >
                              Bỏ chọn
                            </button>
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                            gap: '10px'
                          }}
                        >
                          {items.map((amenity) => {
                            const isChecked = (formData.amenity_ids || []).includes(amenity.id);
                            return (
                              <label
                                key={amenity.id}
                                className="form-checkbox-label"
                                style={{
                                  padding: '10px 12px',
                                  backgroundColor: isChecked ? '#FEFBE8' : '#FFFFFF',
                                  border: isChecked ? '1.5px solid #F4C542' : '1px solid #E5E7EB',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '10px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleAmenityToggle(amenity.id)}
                                  style={{
                                    accentColor: '#287A4B',
                                    width: '16px',
                                    height: '16px',
                                    marginTop: '2px',
                                    cursor: 'pointer'
                                  }}
                                />
                                <div
                                  style={{
                                    color: isChecked ? '#92400E' : '#4B5563',
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginTop: '2px'
                                  }}
                                >
                                  {renderAmenityIcon(amenity.icon)}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div
                                    style={{
                                      fontSize: '13px',
                                      fontWeight: isChecked ? 600 : 500,
                                      color: isChecked ? '#92400E' : '#1F2937'
                                    }}
                                  >
                                    {amenity.name}
                                  </div>
                                  {amenity.description && (
                                    <div
                                      style={{
                                        fontSize: '11.5px',
                                        color: '#6B7280',
                                        marginTop: '2px',
                                        lineHeight: 1.35
                                      }}
                                    >
                                      {amenity.description}
                                    </div>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Hình ảnh phòng (TWO clearly separated upload controls) */}
        {activeTab === 'media' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {uploadingCount > 0 && (
              <div className="admin-card" style={{ borderColor: '#F59E0B' }}>
                <div className="admin-card-body" style={{ color: '#92400E', fontSize: '13px' }}>
                  Đang tải {uploadingCount} ảnh lên server. Vui lòng chờ hoàn tất trước khi lưu.
                </div>
              </div>
            )}
            {/* A. Cover image: Hình đại diện loại phòng */}
            <div className="admin-card">
              <div className="admin-card-header">
                <div className="admin-card-title">Hình đại diện loại phòng</div>
                <span className="badge badge-success" style={{ fontSize: '11.5px' }}>
                  Ảnh chính hiển thị đại diện (Chỉ chọn 1 ảnh)
                </span>
              </div>
              <div className="admin-card-body">
                <p style={{ fontSize: '13px', color: '#4B5563', marginBottom: '14px' }}>
                  Đây là ảnh bìa lớn nhất của loại phòng, được hiển thị ở thẻ danh sách đặt phòng và trên đầu trang thông tin chi tiết phòng.
                </p>

                {formData.room_image ? (
                  <div style={{ maxWidth: '440px' }}>
                    <div
                      style={{
                        width: '100%',
                        height: '240px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '2px solid #287A4B',
                        backgroundColor: '#F3F4F6',
                        position: 'relative'
                      }}
                    >
                      <img
                        src={formData.room_image}
                        alt="Hình đại diện loại phòng"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        referrerPolicy="no-referrer"
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          backgroundColor: 'rgba(40, 122, 75, 0.92)',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <CheckCircle2 size={12} /> Hình đại diện chính
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => coverFileInputRef.current?.click()}
                        disabled={uploadingCount > 0}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <ImageIcon size={13} /> Thay đổi hình đại diện
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setFormData((prev) => ({ ...prev, room_image: '' }))}
                        disabled={uploadingCount > 0}
                        style={{ color: '#DC2626', borderColor: '#FECACA' }}
                      >
                        <Trash2 size={13} /> Gỡ ảnh đại diện
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="image-upload-zone"
                    onClick={() => {
                      if (uploadingCount === 0) coverFileInputRef.current?.click();
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label="Tải ảnh đại diện lên"
                    style={{ maxWidth: '520px' }}
                  >
                    <UploadCloud size={32} color="#287A4B" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1F2937' }}>
                      Nhấp hoặc kéo thả hình đại diện loại phòng vào đây
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '3px' }}>
                      Định dạng JPG, PNG hoặc WEBP (Chỉ 1 ảnh, tối đa 5MB).
                    </div>
                  </div>
                )}

                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple={false}
                  disabled={uploadingCount > 0}
                  style={{ display: 'none' }}
                  onChange={handleCoverFileChange}
                />
                {errors.room_image && (
                  <p className="form-error" style={{ marginTop: '8px' }}>
                    {errors.room_image}
                  </p>
                )}
              </div>
            </div>

            {/* B. Supplementary images: Hình ảnh phụ */}
            <div className="admin-card">
              <div
                className="admin-card-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div>
                  <div className="admin-card-title">Hình ảnh phụ</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    Tải lên nhiều hình ảnh bổ sung minh họa góc nhìn phòng, phòng tắm, ban công, nội thất và dịch vụ kèm theo.
                  </div>
                </div>
                <span className="badge badge-neutral" style={{ fontSize: '11.5px' }}>
                  {(formData.supplementary_images || []).length} ảnh phụ đã chọn
                </span>
              </div>
              <div className="admin-card-body">
                {/* Upload Zone */}
                <div
                  className="image-upload-zone"
                  onClick={() => {
                    if (uploadingCount === 0) suppFileInputRef.current?.click();
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label="Tải thêm ảnh phụ"
                  style={{ marginBottom: '16px' }}
                >
                  <UploadCloud size={28} color="#6B7280" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#292D32' }}>
                    Nhấp hoặc kéo thả để tải thêm nhiều ảnh phụ
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '2px' }}>
                    Hỗ trợ chọn nhiều ảnh cùng lúc. Khi chọn thêm, các ảnh mới sẽ được thêm vào danh sách ảnh hiện có mà không bị ghi đè.
                  </div>
                  <input
                    ref={suppFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple={true}
                    disabled={uploadingCount > 0}
                    style={{ display: 'none' }}
                    onChange={handleSupplementaryFileChange}
                  />
                </div>

                {/* Thumbnail grid */}
                {(formData.supplementary_images || []).length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: '12px'
                    }}
                  >
                    {formData.supplementary_images.map((imgSrc, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid #D9DDE2',
                          backgroundColor: '#F3F4F6',
                          height: '95px'
                        }}
                      >
                        <img
                          src={imgSrc}
                          alt={`Ảnh phụ ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSupplementaryImage(idx);
                          }}
                          disabled={uploadingCount > 0}
                          title="Gỡ ảnh này"
                          aria-label={`Xóa ảnh phụ ${idx + 1}`}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            color: '#fff',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <X size={12} />
                        </button>
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '3px',
                            left: '4px',
                            backgroundColor: 'rgba(0,0,0,0.65)',
                            color: '#fff',
                            fontSize: '9.5px',
                            padding: '1px 5px',
                            borderRadius: '3px'
                          }}
                        >
                          Ảnh #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '24px 16px',
                      color: '#6B7280',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '4px',
                      border: '1px dashed #D1D5DB',
                      fontSize: '12.5px'
                    }}
                  >
                    Chưa có ảnh phụ nào được thêm. Nhấp vào khung ở trên để tải lên các hình ảnh góc phòng, ban công hoặc phòng tắm.
                  </div>
                )}

                {errors.supplementary_images && (
                  <p className="form-error" style={{ marginTop: '8px' }}>
                    {errors.supplementary_images}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form Actions Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <Link
            to={preselectedAccId ? `/admin/accommodations/${preselectedAccId}` : '/admin/room-types'}
            className="btn btn-secondary"
          >
            Hủy
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || uploadingCount > 0}
          >
            <Save size={14} />
            {uploadingCount > 0
              ? 'Đang tải ảnh...'
              : isSubmitting
                ? 'Đang lưu...'
                : isEdit
                  ? 'Lưu thay đổi'
                  : 'Tạo loại phòng'}
          </button>
        </div>
      </form>
    </div>
  );
}
