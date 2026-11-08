import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader.jsx';
import FormInput from '../../components/forms/FormInput.jsx';
import FormSelect from '../../components/forms/FormSelect.jsx';
import FormTextarea from '../../components/forms/FormTextarea.jsx';
import ImageUpload from '../../components/forms/ImageUpload.jsx';
import { lookupsApi } from '../../api/lookups.js';
import { accommodationsApi, buildImageUrl } from '../../api/accommodations.js';
import {
  ArrowLeft,
  Save,
  Building,
  MapPin,
  Sparkles,
  Image as ImageIcon,
  Landmark,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  Globe,
  Info
} from 'lucide-react';
import resortDanangImg from '../../assets/images/resort_danang_1790825961463.jpg';

// API /lookup/locations đã trả sẵn provinceId + provinceName cho từng điểm đến,
// nên chỉ cần tra trực tiếp thay vì dò cây cha–con như dữ liệu mock trước đây.
const getProvinceOfLocation = (locationId, locations = []) => {
  if (!locationId || !locations.length) return null;
  const loc = locations.find((l) => Number(l.id) === Number(locationId));
  if (!loc || !loc.provinceId) return null;
  return { id: Number(loc.provinceId), name: loc.provinceName };
};

function getStatusValue(status) {
  if (typeof status === 'number') return status;

  const normalized = String(status ?? '').trim().toLowerCase();

  // Select trả e.target.value luôn là chuỗi ("0"/"1"/"2"), nên phải đổi sang
  // số trước khi tra nhãn. Không vậy mọi lựa chọn đều rơi vào fallback 0
  // và bị lưu thành Bản nháp dù admin chọn Ngừng hoạt động hay Đang hoạt động.
  if (normalized !== '' && Number.isInteger(Number(normalized))) {
    return Number(normalized);
  }

  if (normalized === 'bản nháp' || normalized === 'draft') return 0;
  if (normalized === 'đang hoạt động' || normalized === 'active') return 1;
  if (normalized === 'ngừng hoạt động' || normalized === 'inactive') return 2;

  return 0;
}

// Backend trả lỗi theo key camelCase của payload API,
// còn các input trong form dùng snake_case.
const API_ERROR_KEY_MAP = {
  name: 'name',
  code: 'code',
  typeId: 'type_id',
  locationId: 'location_id',
  wardId: 'ward_id',
  addressLine: 'address',
  shortDescription: 'short_description',
  description: 'full_description',
  phone: 'phone',
  email: 'email',
  websiteUrl: 'website',
  starRating: 'star_rating',
  checkInTime: 'checkin_time',
  checkOutTime: 'checkout_time',
  latitude: 'latitude',
  longitude: 'longitude',
  status: 'status',
  images: 'images',
  amenities: 'amenities',
  attractions: 'attractions',
};

// Field nào thuộc tab nào, dùng để mở đúng tab khi backend báo lỗi.
const FIELD_TAB_MAP = {
  name: 'general',
  code: 'general',
  type_id: 'general',
  star_rating: 'general',
  status: 'general',
  checkin_time: 'general',
  checkout_time: 'general',
  short_description: 'general',
  full_description: 'general',
  phone: 'general',
  email: 'general',
  website: 'general',
  location_id: 'location',
  ward_id: 'location',
  address: 'location',
  latitude: 'location',
  longitude: 'location',
  attractions: 'location',
  amenities: 'amenities',
  images: 'media',
};

// Đổi { shortDescription: "..." } -> { short_description: "..." }
function normalizeApiErrors(apiErrors = {}) {
  return Object.entries(apiErrors).reduce((result, [apiKey, message]) => {
    result[API_ERROR_KEY_MAP[apiKey] || apiKey] = message;
    return result;
  }, {});
}

// Chọn tab chứa lỗi đầu tiên theo thứ tự tab trên UI.
function resolveFirstErrorTab(formErrors = {}) {
  const tabOrder = ['general', 'location', 'amenities', 'media'];
  const tabs = Object.keys(formErrors)
    .map((field) => FIELD_TAB_MAP[field])
    .filter(Boolean);

  if (tabs.length === 0) return 'general';
  return tabs.sort((a, b) => tabOrder.indexOf(a) - tabOrder.indexOf(b))[0];
}

// DB quy ước lưu đường dẫn tương đối (/uploads/...).
// State form giữ URL tuyệt đối để hiển thị, nên phải bỏ origin trước khi gửi API.
function toRelativeImageUrl(url) {
  if (!url) return url;
  const match = String(url).match(/^https?:\/\/[^/]+(\/uploads\/.+)$/);
  return match ? match[1] : url;
}

function toRelativeImageUrls(formData) {
  return [
    formData.cover_image,
    ...(formData.gallery_images || []),
  ]
    .filter((url, index, all) => url && all.indexOf(url) === index)
    .map(toRelativeImageUrl);
}

function toApiGeneralPayload(formData) {
  return {
    // Mã cơ sở lưu trú phải được gửi khi Sửa, nếu không backend giữ nguyên mã cũ.
    code: String(formData.code || '').trim(),
    name: formData.name,
    typeId: Number(formData.type_id),
    status: getStatusValue(formData.status),
    locationId: Number(formData.location_id),
    wardId: formData.ward_id ? Number(formData.ward_id) : null,
    addressLine: formData.address || null,
    shortDescription: formData.short_description || null,
    description: formData.full_description || null,
    phone: formData.phone || null,
    email: formData.email || null,
    websiteUrl: formData.website || null,
    latitude: formData.latitude === '' ? null : Number(formData.latitude),
    longitude: formData.longitude === '' ? null : Number(formData.longitude),
    starRating: formData.star_rating === '' ? null : Number(formData.star_rating),
    checkInTime: formData.checkin_time || null,
    checkOutTime: formData.checkout_time || null,
    isFeatured: Boolean(formData.featured),
  };
}

function toApiCreatePayload(formData) {
  const imageUrls = toRelativeImageUrls(formData);
  const coverImageUrl = toRelativeImageUrl(formData.cover_image);

  return {
    // Backend dùng camelCase và cần mã cơ sở lưu trú khi tạo mới.
    code: String(formData.code || '').trim(),
    name: String(formData.name || '').trim(),

    // type_id của UI phải đổi thành typeId dạng số cho API.
    typeId: Number(formData.type_id),

    // Trang Create luôn tạo bản nháp; đổi trạng thái do trang Sửa đảm nhận.
    status: 0,
    locationId: Number(formData.location_id),
    wardId: formData.ward_id ? Number(formData.ward_id) : null,

    addressLine: String(formData.address || '').trim() || null,
    shortDescription: formData.short_description || null,
    description: formData.full_description || null,

    phone: formData.phone || null,
    email: formData.email || null,
    websiteUrl: formData.website || null,

    latitude: formData.latitude === '' ? null : Number(formData.latitude),
    longitude: formData.longitude === '' ? null : Number(formData.longitude),
    starRating:
      formData.star_rating === '' ? null : Number(formData.star_rating),

    checkInTime: formData.checkin_time || null,
    checkOutTime: formData.checkout_time || null,
    isFeatured: Boolean(formData.featured),

    // Ảnh bìa phải được đánh dấu rõ để backend cho phép trạng thái ACTIVE.
    images: imageUrls.map((imageUrl) => ({
      imageUrl,
      isCover: imageUrl === coverImageUrl,
    })),

    // Backend đọc key "amenities" dạng [{ amenityId, isChargeable, note }] (spec 5.2).
    // Nếu gửi "amenityIds" thì service bỏ qua im lặng → tiện nghi không được ghi.
    amenities: (formData.amenities || []).map((item) => ({
      amenityId: Number(item.amenityId),
      isChargeable: Boolean(item.isChargeable),
      note: String(item.note || '').trim() || null,
    })),

    // Backend nhận distanceMeters, không nhận distance + distance_unit
    // theo format cũ của UI.
    attractions: (formData.attractions || []).map((item) => ({
      attractionId: Number(item.attraction_id),
      distanceMeters: Number(item.distance_meters) || 0,
      note: String(item.notes || '').trim() || null,
    })),
  }
}

function toApiRelatedPayload(formData) {
  const imageUrls = toRelativeImageUrls(formData);
  const coverImageUrl = toRelativeImageUrl(formData.cover_image);

  return {
    images: imageUrls.map((imageUrl) => ({
      imageUrl,
      isCover: imageUrl === coverImageUrl,
    })),
    // Cùng shape với create để backend replaceAmenities xử lý được.
    amenities: (formData.amenities || []).map((item) => ({
      amenityId: Number(item.amenityId),
      isChargeable: Boolean(item.isChargeable),
      note: String(item.note || '').trim() || null,
    })),
    attractions: (formData.attractions || []).map((item) => ({
      attractionId: Number(item.attraction_id),
      distanceMeters: Number(item.distance_meters) || 0,
      note: String(item.notes || '').trim() || null,
    })),
  };
}

export default function AccommodationFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  // Active form section tab (4 tabs total, NO separate attraction tab)
  const [activeTab, setActiveTab] = useState('general');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type_id: '',
    type: '',
    short_description: '',
    full_description: '',
    address: '',
    ward_id: '',
    ward: '',
    location_id: '',
    latitude: '',
    longitude: '',
    phone: '',
    email: '',
    website: '',
    checkin_time: '14:00',
    checkout_time: '12:00',
    star_rating: 4,
    status: 'Draft',
    featured: false,
    cover_image: '',
    gallery_images: [],
    // Mỗi tiện nghi được chọn giữ thêm ghi chú và cờ thu phí của
    // bảng accommodation_amenities (không phải thuộc tính chung của amenities).
    amenities: [],
    attractions: []
  });

  // Giữ note/chargeable của tiện nghi vừa bỏ chọn trong phiên làm việc,
  // để tick lại không phải nhập lại từ đầu.
  const amenityDraftCache = useRef({});

  const [errors, setErrors] = useState({});

  // GET detail trả 404 (không tồn tại / ngoài scope) → hiện màn riêng
  // thay vì render form rỗng cho người dùng bấm Lưu vào ID không có thật.
  const [isNotFound, setIsNotFound] = useState(false);

  // Chống double-submit: bấm đúp nút Save trước đây gửi 2 request PUT/POST.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Đếm số lượt upload đang chạy. Khi > 0, preview ảnh vẫn là blob: tạm
  // nên phải chặn submit để URL blob không bị ghi xuống DB.
  const [uploadingCount, setUploadingCount] = useState(0);

  // Dữ liệu danh mục lấy từ backend (thay cho mock trước đây).
  const [lookupLocations, setLookupLocations] = useState([]);
  const [lookupWards, setLookupWards] = useState([]);
  const [lookupAmenities, setLookupAmenities] = useState([]);
  const [lookupAttractions, setLookupAttractions] = useState([]);
  const [lookupError, setLookupError] = useState(null);
  const [isLoadingLookups, setIsLoadingLookups] = useState(false);
  const uploadImages = async (files, field, multiple = false) => {
    console.group("[AccommodationFormPage.uploadImages]");
    console.log("[1] bắt đầu upload", files.length, "ảnh cho trường", field);

    // Giữ giá trị cũ để khôi phục nếu upload lỗi (vd ảnh bìa đang có trên server).
    const previousValue = formData[field];
    const previews = files.map((file) => URL.createObjectURL(file));
    setUploadingCount((count) => count + 1);

    // Hiển thị preview ngay, không bắt người dùng chờ request upload hoàn tất.
    setFormData((prev) => ({
      ...prev,
      [field]: multiple ? [...(prev[field] || []), ...previews] : previews[0] || '',
    }));

    try {
      const urls = await Promise.all(files.map((file) => accommodationsApi.uploadImage(file)));
      setFormData((prev) => ({
        ...prev,
        [field]: multiple ? [...(prev[field] || []).filter((url) => !previews.includes(url)), ...urls] : urls[0] || '',
      }));
      previews.forEach((url) => URL.revokeObjectURL(url));
      console.log("[2] upload xong, nhận URL backend:", urls);
    } catch (error) {
      // Upload lỗi thì gỡ blob khỏi form, tránh submit nhầm URL blob:.
      setFormData((prev) => ({
        ...prev,
        [field]: multiple
          ? (prev[field] || []).filter((url) => !previews.includes(url))
          : previousValue || '',
      }));
      previews.forEach((url) => URL.revokeObjectURL(url));
      console.error("[3] upload thất bại:", error);
      setErrors((prev) => ({ ...prev, images: error.message || 'Không thể tải ảnh lên.' }));
    } finally {
      // Luôn giảm bộ đếm kể cả thành công hay lỗi để không kẹt trạng thái chặn submit.
      setUploadingCount((count) => count - 1);
      console.groupEnd();
    }
  };

  // Form Sửa phải đọc detail thật vì list chỉ có summary và AdminContext còn giữ mock.
  useEffect(() => {
    if (!isEdit) return;

    let cancelled = false;

    async function loadAccommodationDetail() {
      try {
        const payload = await accommodationsApi.getDetail(id);

        if (cancelled) return;

        const detail = payload.data;
        const images = detail.images || [];
        const mappedFormData = {
          name: detail.name || '',
          code: detail.code || '',
          type_id: detail.type?.id || '',
          type: detail.type?.name || detail.type?.code || '',
          short_description: detail.shortDescription || '',
          full_description: detail.description || '',
          address: detail.addressLine || '',
          location_id: detail.location?.id || '',
          ward_id: detail.ward?.id || '',
          ward: detail.ward?.name || '',
          latitude: detail.latitude ?? '',
          longitude: detail.longitude ?? '',
          phone: detail.phone || '',
          email: detail.email || '',
          website: detail.websiteUrl || '',
          checkin_time: detail.checkInTime || '14:00',
          checkout_time: detail.checkOutTime || '12:00',
          star_rating: detail.starRating ?? '',
          status: detail.status ?? 0,
          // R7: backend trả cờ "đã có Manager đang hoạt động" để khóa
          // lựa chọn trạng thái ACTIVE khi chưa gán Manager.
          hasManager: Boolean(detail.hasManager),
          featured: Boolean(detail.isFeatured),
          cover_image: buildImageUrl(detail.coverImageUrl) || '',
          gallery_images: images
            .filter((image) => !image.isCover)
            .map((image) => buildImageUrl(image.imageUrl)),
          amenities: (detail.amenities || []).map((amenity) => ({
            amenityId: Number(amenity.amenityId ?? amenity.id),
            note: amenity.note || '',
            isChargeable: Boolean(amenity.isChargeable),
          })),
          attractions: (detail.attractions || []).map((attraction) => ({
            attraction_id: attraction.attractionId,
            distance_meters: attraction.distanceMeters || 0,
            distance_unit: 'm',
            distance: attraction.distanceMeters || 0,
            notes: attraction.note || '',
          })),
        };

        setFormData(mappedFormData);
      } catch (error) {
        if (!cancelled) {
          console.error('[ERROR] Không tải được detail để sửa:', {
            message: error.message,
            status: error.status,
            errorCode: error.errorCode,
          });

          // 404: bản ghi không tồn tại hoặc ngoài scope — chặn form sớm.
          if (error.status === 404) {
            setIsNotFound(true);
            return;
          }

          // Lỗi khác (500/network): vẫn cho mở form, hiện banner chung.
          setErrors({ form: error.message });
        }
      }
    }

    loadAccommodationDetail();

    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  // Điểm đến + tiện nghi: chỉ cần nạp một lần khi mở form.
  useEffect(() => {
    let cancelled = false;

    async function loadStaticLookups() {
      setIsLoadingLookups(true);
      setLookupError(null);

      try {
        const [locationItems, amenityItems] = await Promise.all([
          lookupsApi.getLocations(),
          lookupsApi.getAmenities('accommodation')
        ]);

        if (cancelled) return;

        setLookupLocations(locationItems);
        setLookupAmenities(
          amenityItems.map((item) => ({
            id: item.id,
            name: item.name,
            category: item.categoryName || 'Khác'
          }))
        );
      } catch (error) {
        if (!cancelled) {
          console.error('[ERROR] Không nạp được lookup tĩnh:', error);
          setLookupError(error.message || 'Không tải được danh mục điểm đến / tiện nghi.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLookups(false);
        }
      }
    }

    loadStaticLookups();
    return () => {
      cancelled = true;
    };
  }, []);

  // Điểm đến hợp lệ → suy ra tỉnh/thành (API đã trả sẵn provinceId + provinceName).
  const currentProvince = useMemo(
    () => getProvinceOfLocation(formData.location_id, lookupLocations),
    [formData.location_id, lookupLocations]
  );

  // Đổi điểm đến → nạp lại phường/xã theo tỉnh và điểm tham quan theo điểm đến.
  useEffect(() => {
    let cancelled = false;

    async function loadLocationLookups() {
      const locationId = formData.location_id;
      const provinceId = currentProvince ? currentProvince.id : null;

      if (!locationId) {
        setLookupWards([]);
        setLookupAttractions([]);
        return;
      }

      try {
        const [wardItems, attractionItems] = await Promise.all([
          lookupsApi.getWards(provinceId),
          lookupsApi.getAttractions(Number(locationId), true)
        ]);

        if (cancelled) return;

        setLookupWards(wardItems);
        setLookupAttractions(
          attractionItems.map((item) => ({
            id: item.id,
            name: item.name,
            address: item.addressLine,
            image: item.imageUrl,
            is_active: Boolean(item.isActive)
          }))
        );
        setLookupError(null);
      } catch (error) {
        if (!cancelled) {
          console.error('[ERROR] Không nạp được lookup theo điểm đến:', error);
          setLookupWards([]);
          setLookupAttractions([]);
          setLookupError(error.message || 'Không tải được phường/xã hoặc điểm tham quan.');
        }
      }
    }

    loadLocationLookups();
    return () => {
      cancelled = true;
    };
  }, [formData.location_id, currentProvince]);

  // "Điểm đến" dropdown: nhãn kèm tỉnh/thành để người dùng phân biệt.
  const locationSelectOptions = useMemo(() => {
    return lookupLocations
      .map((loc) => ({
        value: String(loc.id),
        label: loc.provinceName ? `${loc.name} (${loc.provinceName})` : loc.name
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  }, [lookupLocations]);

  // Phường/xã thuộc tỉnh/thành của điểm đến đang chọn.
  const availableWards = lookupWards;

  // Điểm tham quan thuộc điểm đến đang chọn.
  // BE đã lọc theo locationId; ở đây chỉ giấu điểm ngừng hoạt động nếu chưa liên kết.
  const locationAttractions = useMemo(() => {
    return lookupAttractions.filter((att) => {
      const isAlreadyLinked = (formData.attractions || []).some(
        (a) => Number(a.attraction_id) === Number(att.id)
      );
      return att.is_active || isAlreadyLinked;
    });
  }, [lookupAttractions, formData.attractions]);

  // Group amenities by category
  const amenitiesByCategory = useMemo(() => {
    const grouped = {};
    lookupAmenities.forEach((item) => {
      const cat = item.category || 'Khác';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    return grouped;
  }, [lookupAmenities]);

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

  // Đổi điểm đến không hỏi xác nhận; dữ liệu phụ thuộc sẽ được nạp lại tự động.
  const handleLocationChange = (e) => {
    const newLocationId = e.target.value;
    const newIdStr = String(newLocationId);
    if (newIdStr === String(formData.location_id)) return;

    setFormData((prev) => ({
      ...prev,
      location_id: newLocationId,
      // Điểm đến đổi thì reset phường/xã vì có thể khác tỉnh.
      ward_id: '',
      ward: '',
      attractions: []
    }));

    if (errors.location_id || errors.ward_id || errors.wardId) {
      setErrors((prev) => ({
        ...prev,
        location_id: null,
        ward_id: null,
        wardId: null,
      }));
    }
  };

  // Phường/xã lưu cả id (BE cần wardId) và tên (để hiển thị).
  const handleWardChange = (e) => {
    const wardId = e.target.value;
    const selected = availableWards.find((w) => String(w.id) === wardId);

    setFormData((prev) => ({
      ...prev,
      ward_id: wardId,
      ward: selected ? selected.name : ''
    }));

    setErrors((prev) => ({
      ...prev,
      ward_id: null,
      wardId: null,
    }));
  };

  // Toggle nearby attraction selection
  const handleAttractionToggle = (attractionId) => {
    const idNum = Number(attractionId);
    setFormData((prev) => {
      const current = prev.attractions || [];
      const exists = current.find((a) => Number(a.attraction_id) === idNum);
      if (exists) {
        // Uncheck: remove from associations without deleting master record
        return {
          ...prev,
          attractions: current.filter((a) => Number(a.attraction_id) !== idNum)
        };
      } else {
        // Check: add new association
        const newItem = {
          attraction_id: idNum,
          distance: 1,
          distance_unit: 'km',
          distance_meters: 1000,
          notes: ''
        };
        return {
          ...prev,
          attractions: [...current, newItem]
        };
      }
    });
  };

  // Update attraction association fields (distance, unit, notes)
  const handleAttractionFieldChange = (attractionId, field, value) => {
    const idNum = Number(attractionId);
    setFormData((prev) => {
      const current = prev.attractions || [];
      const updated = current.map((item) => {
        if (Number(item.attraction_id) === idNum) {
          const next = { ...item, [field]: value };
          if (field === 'distance' || field === 'distance_unit') {
            const rawDist = field === 'distance' ? value : item.distance;
            const dist = parseFloat(rawDist) || 0;
            const unit = field === 'distance_unit' ? value : item.distance_unit;
            next.distance = rawDist;
            next.distance_unit = unit;
            next.distance_meters = unit === 'km' ? Math.round(dist * 1000) : Math.round(dist);
          }
          return next;
        }
        return item;
      });
      return { ...prev, attractions: updated };
    });
  };

  const handleAmenityToggle = (amenityId) => {
    const idNum = Number(amenityId);

    setFormData((prev) => {
      const current = prev.amenities || [];
      const existing = current.find(
        (item) => Number(item.amenityId) === idNum,
      );

      if (existing) {
        // Lưu nháp trước khi bỏ chọn để tick lại vẫn còn note đã nhập.
        amenityDraftCache.current[idNum] = {
          note: existing.note || '',
          isChargeable: Boolean(existing.isChargeable),
        };
        return {
          ...prev,
          amenities: current.filter(
            (item) => Number(item.amenityId) !== idNum,
          ),
        };
      }

      const draft = amenityDraftCache.current[idNum] || {
        note: '',
        isChargeable: false,
      };
      return {
        ...prev,
        amenities: [...current, { amenityId: idNum, ...draft }],
      };
    });

    if (errors.amenities) {
      setErrors((prev) => ({ ...prev, amenities: null }));
    }
  };

  const handleAmenityFieldChange = (amenityId, field, value) => {
    const idNum = Number(amenityId);
    setFormData((prev) => ({
      ...prev,
      amenities: (prev.amenities || []).map((item) =>
        Number(item.amenityId) === idNum ? { ...item, [field]: value } : item,
      ),
    }));

    if (errors.amenities) {
      setErrors((prev) => ({ ...prev, amenities: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Chặn double-submit: request trước chưa xong thì bỏ qua lần bấm thêm.
    if (isSubmitting) return;

    // Ảnh còn upload thì preview là blob:, chưa có URL backend để lưu.
    if (uploadingCount > 0) {
      setErrors((prev) => ({ ...prev, images: 'Ảnh đang tải lên, vui lòng đợi hoàn tất.' }));
      setActiveTab('media');
      return;
    }

    const clientErrors = {};
    if (!String(formData.address || '').trim()) {
      clientErrors.address = 'Vui lòng nhập địa chỉ.';
    }
    if (!formData.ward_id) {
      clientErrors.ward_id = 'Vui lòng chọn phường/xã.';
    }
    if (!isEdit && !String(formData.short_description || '').trim()) {
      clientErrors.short_description = 'Vui lòng nhập mô tả tóm tắt.';
    }
    const hasTooLongAmenityNote = (formData.amenities || []).some(
      (item) => String(item.note || '').length > 1000,
    );
    if (hasTooLongAmenityNote) {
      clientErrors.amenities = 'Ghi chú tiện nghi tối đa 1000 ký tự.';
    }
    if (Object.keys(clientErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...clientErrors }));
      // Lỗi địa chỉ/phường nằm ở tab location, mô tả nằm ở general.
      setActiveTab(resolveFirstErrorTab(clientErrors));
      return;
    }

    const payload = isEdit
      ? { ...toApiGeneralPayload(formData), ...toApiRelatedPayload(formData) }
      : {
        ...formData,
        location_id: Number(formData.location_id),
        ward_id: formData.ward_id ? Number(formData.ward_id) : null,
        star_rating: Number(formData.star_rating),
        attractions: (formData.attractions || []).map((a) => ({
          attraction_id: Number(a.attraction_id),
          distance: Number(a.distance) || 0,
          distance_unit: a.distance_unit || 'km',
          distance_meters:
            (a.distance_unit || 'km') === 'km'
              ? Math.round(Number(a.distance) * 1000)
              : Math.round(Number(a.distance) || 0),
          notes: (a.notes || '').trim()
        }))
      };

    console.group("[AccommodationFormPage.handleSubmit]");
    console.log("[1] gửi", isEdit ? "PUT" : "POST", "| trạng thái:", getStatusValue(formData.status));

    setIsSubmitting(true);

    try {
      if (isEdit) {
        await accommodationsApi.update(id, payload);
        console.log("[2] PUT thành công, id =", id);
        navigate(`/admin/accommodations/${id}`);
      } else {
        const createPayload = toApiCreatePayload(formData);
        const created = await accommodationsApi.create(createPayload);
        console.log("[2] POST thành công, id =", created.id);
        navigate(`/admin/accommodations/${created.id}`);
      }
    } catch (error) {
      console.error("[3] lưu form thất bại:", {
        message: error.message,
        status: error.status,
        errorCode: error.errorCode,
        errors: error.errors,
      });

      if (error.errors && Object.keys(error.errors).length > 0) {
        // Đổi key API -> key input rồi mở tab chứa lỗi đầu tiên.
        const fieldErrors = normalizeApiErrors(error.errors);
        setErrors(fieldErrors);
        setActiveTab(resolveFirstErrorTab(fieldErrors));
      } else {
        // 401/500/INVALID_STATE... không gắn field → hiện banner chung.
        setErrors({ form: error.message });
        setActiveTab('general');
      }
    } finally {
      setIsSubmitting(false);
      console.groupEnd();
    }
  };

  // GET detail trả 404 → chặn form, hiện màn riêng (cùng pattern RoomTypeFormPage).
  if (isNotFound) {
    return (
      <div className="admin-page">
        <PageHeader
          title="Không tìm thấy cơ sở lưu trú"
          breadcrumb={[
            { label: 'Cơ sở lưu trú', path: '/admin/accommodations' },
            { label: 'Lỗi' }
          ]}
        />
        <div className="admin-card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={36} color="#DC2626" style={{ margin: '0 auto 12px' }} />
          <h3>Cơ sở lưu trú không tồn tại hoặc đã bị gỡ bỏ.</h3>
          <p style={{ color: '#6B7280', marginTop: '6px' }}>
            ID #{id} không có trong dữ liệu bạn được phép quản lý.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: '16px' }}
            onClick={() => navigate('/admin/accommodations')}
          >
            Quay lại danh sách cơ sở lưu trú
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? `Chỉnh sửa cơ sở lưu trú: ${formData.name}` : 'Thêm cơ sở lưu trú mới'}
        description="Cấu hình thông số kỹ thuật, định vị địa lý, thông tin liên hệ, tiện nghi và điểm tham quan lân cận."
        breadcrumb={[
          { label: 'Cơ sở lưu trú', path: '/admin/accommodations' },
          { label: isEdit ? 'Chỉnh sửa' : 'Thêm mới' }
        ]}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/admin/accommodations" className="btn btn-secondary">
              <ArrowLeft size={14} /> Quay lại danh sách
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={isSubmitting || uploadingCount > 0}
            >
              <Save size={14} />{' '}
              {uploadingCount > 0
                ? 'Đang tải ảnh...'
                : isSubmitting
                  ? 'Đang lưu...'
                  : isEdit ? 'Lưu thay đổi' : 'Tạo cơ sở lưu trú'}
            </button>
          </div>
        }
      />

      {/* Tabs: Exactly 4 consolidated tabs */}
      <div className="admin-tabs" style={{ marginBottom: '16px' }}>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          Thông tin chung & Liên hệ
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'location' ? 'active' : ''}`}
          onClick={() => setActiveTab('location')}
        >
          Điểm đến & điểm tham quan
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'amenities' ? 'active' : ''}`}
          onClick={() => setActiveTab('amenities')}
        >
          Tiện nghi ({formData.amenities?.length || 0})
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
        >
          Hình ảnh & Thư viện
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {errors.form && (
          <div className="admin-card" style={{ borderColor: '#E53E3E', marginBottom: '12px' }}>
            <div className="admin-card-body" style={{ color: '#C53030', fontSize: '13px' }}>
              {errors.form}
            </div>
          </div>
        )}
        {/* Tab 1: General Information & Contact */}
        {activeTab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Property Profile */}
            <div className="admin-card">
              <div className="admin-card-header">
                <div className="admin-card-title">Hồ sơ cơ sở lưu trú & Thiết lập vận hành</div>
              </div>
              <div className="admin-card-body">
                <div className="form-grid">
                  <FormInput
                    label="Tên cơ sở lưu trú"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="VD: VietPeace Danang Premier Beach Resort"
                    required
                    error={errors.name}
                  />

                  <FormInput
                    label="Mã cơ sở lưu trú"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="VD: VPD-RES-01"
                    required
                    error={errors.code}
                    helperText="Mã nhận diện nội bộ cho quy trình kế toán và vận hành."
                  />

                  <FormSelect
                    label="Loại hình lưu trú"
                    name="type_id"
                    value={formData.type_id}
                    onChange={handleChange}
                    placeholder="Chọn loại hình lưu trú"
                    options={[
                      { value: 1, label: 'Khách sạn (Hotel)' },
                      { value: 2, label: 'Khu nghỉ dưỡng (Resort)' },
                      { value: 3, label: 'Homestay' }
                    ]}
                    error={errors.type_id}
                    required
                  />

                  <FormSelect
                    label="Hạng sao"
                    name="star_rating"
                    value={formData.star_rating}
                    onChange={handleChange}
                    options={[
                      { value: 1, label: '1 Sao' },
                      { value: 2, label: '2 Sao' },
                      { value: 3, label: '3 Sao' },
                      { value: 4, label: '4 Sao' },
                      { value: 5, label: '5 Sao (Cao cấp)' }
                    ]}
                    error={errors.star_rating}
                  />

                  {isEdit && (
                    <FormSelect
                      label="Trạng thái hoạt động"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      options={[
                        { value: 0, label: 'Bản nháp' },
                        // R7: chưa có Manager đang hoạt động thì ẩn hẳn lựa chọn
                        // ACTIVE thay vì hiện rồi làm mờ. Riêng cơ sở đang là
                        // ACTIVE (dữ liệu cũ) vẫn giữ để select hiển thị đúng
                        // trạng thái hiện có.
                        ...(formData.hasManager || Number(formData.status) === 1
                          ? [{ value: 1, label: 'Đang hoạt động (Mở nhận đặt phòng)' }]
                          : []),
                        { value: 2, label: 'Ngừng hoạt động (Tạm đóng bảo trì)' }
                      ]}
                      error={errors.status}
                      helperText={
                        !formData.hasManager
                          ? 'Cơ sở chưa có Manager đang hoạt động: chỉ được chuyển qua lại Bản nháp và Ngừng hoạt động.'
                          : undefined
                      }
                    />
                  )}

                  <div className="form-group" style={{ justifyContent: 'center' }}>
                    <label className="form-checkbox-label" style={{ marginTop: '16px' }}>
                      <input
                        type="checkbox"
                        name="featured"
                        checked={formData.featured}
                        onChange={handleChange}
                      />
                      <span>Đặt làm cơ sở nổi bật trên trang chủ</span>
                    </label>
                  </div>

                  <FormInput
                    label="Giờ nhận phòng (Check-in)"
                    name="checkin_time"
                    type="time"
                    value={formData.checkin_time}
                    onChange={handleChange}
                    error={errors.checkin_time}
                  />

                  <FormInput
                    label="Giờ trả phòng (Check-out)"
                    name="checkout_time"
                    type="time"
                    value={formData.checkout_time}
                    onChange={handleChange}
                    error={errors.checkout_time}
                  />

                  <div className="col-span-full">
                    <FormTextarea
                      label="Mô tả tóm tắt ngắn"
                      name="short_description"
                      value={formData.short_description}
                      onChange={handleChange}
                      rows={2}
                      required
                      error={errors.short_description}
                      placeholder="Mô tả tóm tắt 1-2 câu giới thiệu điểm nhấn cơ sở..."
                    />
                  </div>

                  <div className="col-span-full">
                    <FormTextarea
                      label="Mô tả chi tiết đầy đủ"
                      name="full_description"
                      value={formData.full_description}
                      onChange={handleChange}
                      rows={5}
                      error={errors.full_description}
                      placeholder="Mô tả toàn diện về khuôn viên, phong cách thiết kế, trải nghiệm nghỉ dưỡng..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preserved Contact Section */}
            <div className="admin-card">
              <div className="admin-card-header">
                <div className="admin-card-title">Thông tin liên hệ cơ sở lưu trú</div>
              </div>
              <div className="admin-card-body">
                <div className="form-grid">
                  <FormInput
                    label="Số điện thoại lễ tân"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    error={errors.phone}
                    placeholder="+84 236 388 9999"
                  />

                  <FormInput
                    label="Email đặt phòng"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    placeholder="danang.resort@vietpeacestay.vn"
                  />

                  <FormInput
                    label="Website chính thức"
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={handleChange}
                    error={errors.website}
                    placeholder="https://vietpeacestay.vn/resorts/danang"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Consolidated "Điểm đến & điểm tham quan" */}
        {activeTab === 'location' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="admin-card">
              <div className="admin-card-header">
                <div className="admin-card-title">Định vị địa lý & Địa chỉ hành chính</div>
              </div>
              <div className="admin-card-body">
                <div className="form-grid">
                  {/* 1. "Điểm đến" dropdown (NO province dropdown) */}
                  <div className="col-span-full">
                    <label className="form-label" htmlFor="field-location-id" style={{ fontWeight: 600 }}>
                      Điểm đến <span style={{ color: '#E53E3E' }}>*</span>
                    </label>
                    <select
                      id="field-location-id"
                      name="location_id"
                      className="filter-select"
                      style={{
                        width: '100%',
                        height: '40px',
                        borderColor: errors.location_id ? '#E53E3E' : '#D9DDE2'
                      }}
                      value={formData.location_id || ''}
                      onChange={handleLocationChange}
                    >
                      <option value="">-- Chọn điểm đến --</option>
                      {locationSelectOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors.location_id && (
                      <p className="form-error" style={{ marginTop: '4px' }}>
                        {errors.location_id}
                      </p>
                    )}
                    <span style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', display: 'block' }}>
                      Chọn điểm đến để hệ thống tự động xác định Tỉnh/thành, nạp danh sách Phường/xã và các điểm tham quan lân cận trực thuộc.
                    </span>
                    {isLoadingLookups && (
                      <span style={{ fontSize: '12px', color: '#2563EB', marginTop: '4px', display: 'block' }}>
                        Đang tải danh mục điểm đến / tiện nghi từ server...
                      </span>
                    )}
                    {lookupError && (
                      <span style={{ fontSize: '12px', color: '#B91C1C', marginTop: '4px', display: 'block' }}>
                        {lookupError}
                      </span>
                    )}
                  </div>

                  {/* 2. Read-only "Tỉnh/thành: {province name}" text */}
                  <div className="col-span-full">
                    {formData.location_id ? (
                      currentProvince ? (
                        <div
                          style={{
                            padding: '10px 14px',
                            backgroundColor: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <MapPin size={16} color="#16A34A" />
                          <span style={{ fontSize: '13.5px', color: '#166534', fontWeight: 600 }}>
                            Tỉnh/thành: {currentProvince.name}
                          </span>
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: '10px 14px',
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            borderRadius: '6px',
                            color: '#991B1B',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <AlertCircle size={16} />
                          <span>Không xác định được tỉnh/thành cho điểm đến này.</span>
                        </div>
                      )
                    ) : (
                      <div
                        style={{
                          padding: '10px 14px',
                          backgroundColor: '#F9FAFB',
                          border: '1px dashed #D1D5DB',
                          borderRadius: '6px',
                          color: '#6B7280',
                          fontSize: '13px'
                        }}
                      >
                        Tỉnh/thành: <em>(Vui lòng chọn điểm đến ở trên để tự động nhận diện tỉnh/thành)</em>
                      </div>
                    )}
                  </div>

                  {/* 3. "Phường/xã" dropdown and "Địa chỉ" textbox */}
                  <div>
                    <label className="form-label" htmlFor="field-ward" style={{ fontWeight: 600 }}>
                      Phường/xã
                    </label>
                    <select
                      id="field-ward"
                      name="ward_id"
                      className="filter-select"
                      style={{ width: '100%', height: '40px' }}
                      value={formData.ward_id || ''}
                      onChange={handleWardChange}
                      disabled={!formData.location_id || availableWards.length === 0}
                    >
                      <option value="">
                        {!formData.location_id
                          ? '-- Vui lòng chọn điểm đến trước --'
                          : availableWards.length === 0
                            ? '-- Không có dữ liệu phường/xã --'
                            : '-- Chọn phường/xã --'}
                      </option>
                      {availableWards.map((w) => (
                        <option key={w.id} value={String(w.id)}>
                          {w.name}
                        </option>
                      ))}
                      {/* Giữ lại phường/xã đã lưu nếu danh sách mới chưa tải xong */}
                      {formData.ward_id &&
                        !availableWards.some((w) => String(w.id) === String(formData.ward_id)) && (
                          <option value={String(formData.ward_id)}>
                            {formData.ward || 'Phường/xã đã chọn'}
                          </option>
                        )}
                    </select>
                    {errors.ward_id && (
                      <span style={{ color: '#B91C1C', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        {errors.ward_id}
                      </span>
                    )}
                    <span style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '4px', display: 'block' }}>
                      Danh sách phường/xã phụ thuộc vào Tỉnh/thành của điểm đến đã chọn.
                    </span>
                  </div>

                  <FormInput
                    label="Địa chỉ đường phố cụ thể"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="VD: 268 Đường Võ Nguyên Giáp"
                    required
                    error={errors.address}
                  />

                  {/* 4. "Vĩ độ" and "Kinh độ" inputs */}
                  <FormInput
                    label="Vĩ độ (Latitude)"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleChange}
                    error={errors.latitude}
                    placeholder="VD: 16.0748"
                    helperText="Tọa độ GPS độc lập của cơ sở lưu trú."
                  />

                  <FormInput
                    label="Kinh độ (Longitude)"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                    error={errors.longitude}
                    placeholder="VD: 108.2467"
                    helperText="Tọa độ GPS độc lập của cơ sở lưu trú."
                  />
                </div>
              </div>
            </div>

            {/* 5. "Điểm tham quan lân cận" Section WITHIN THIS SAME TAB */}
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
                  <div className="admin-card-title">Điểm tham quan lân cận</div>
                  <div style={{ fontSize: '12.5px', color: '#6B7280' }}>
                    Chọn các điểm du lịch, danh lam thắng cảnh xung quanh cơ sở lưu trú và thiết lập cự ly di chuyển độc lập.
                  </div>
                </div>
                <span className="badge badge-success">
                  {(formData.attractions || []).length} điểm đã liên kết
                </span>
              </div>

              <div className="admin-card-body">
                {errors.attractions && (
                  <span className="form-error-text">{errors.attractions}</span>
                )}
                {!formData.location_id ? (
                  <div
                    style={{
                      padding: '36px 16px',
                      textAlign: 'center',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '6px',
                      border: '1px dashed #D1D5DB',
                      color: '#6B7280'
                    }}
                  >
                    <Landmark size={28} color="#9CA3AF" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 600, color: '#374151' }}>
                      Chưa chọn Điểm đến
                    </div>
                    <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                      Vui lòng chọn <strong>Điểm đến</strong> ở phần thông tin phía trên để tải và cấu hình danh sách các điểm tham quan lân cận.
                    </div>
                  </div>
                ) : locationAttractions.length === 0 ? (
                  <div
                    style={{
                      padding: '36px 16px',
                      textAlign: 'center',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '6px',
                      border: '1px dashed #D1D5DB',
                      color: '#6B7280'
                    }}
                  >
                    <Info size={28} color="#9CA3AF" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 600, color: '#374151' }}>
                      Chưa có điểm tham quan nào cho điểm đến này
                    </div>
                    <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                      Hiện chưa có điểm tham quan nào trong hệ thống thuộc điểm đến đã chọn. Bạn có thể bổ sung trong mục <strong>Điểm tham quan</strong> tại thanh menu bên trái.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {locationAttractions.map((att) => {
                      const linkedItem = (formData.attractions || []).find(
                        (a) => Number(a.attraction_id) === Number(att.id)
                      );
                      const isChecked = Boolean(linkedItem);

                      return (
                        <div
                          key={att.id}
                          style={{
                            border: isChecked ? '1.5px solid #287A4B' : '1px solid #E5E7EB',
                            borderRadius: '6px',
                            backgroundColor: isChecked ? '#FBFDFB' : '#FFFFFF',
                            padding: '14px 16px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* Row Header: Checkbox + Thumbnail + Name + Address + Status */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '12px'
                            }}
                          >
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                cursor: 'pointer',
                                flex: 1,
                                minWidth: '240px'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleAttractionToggle(att.id)}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  accentColor: '#287A4B',
                                  cursor: 'pointer'
                                }}
                              />

                              {/* Thumbnail */}
                              <div
                                style={{
                                  width: '56px',
                                  height: '42px',
                                  borderRadius: '4px',
                                  overflow: 'hidden',
                                  backgroundColor: '#F3F4F6',
                                  border: '1px solid #D9DDE2',
                                  flexShrink: 0
                                }}
                              >
                                <img
                                  src={att.image || resortDanangImg}
                                  alt={att.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = resortDanangImg;
                                  }}
                                  referrerPolicy="no-referrer"
                                />
                              </div>

                              <div>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    color: '#1F2937',
                                    fontSize: '13.5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  <span>{att.name}</span>
                                  {!att.is_active && (
                                    <span
                                      className="badge badge-danger"
                                      style={{ fontSize: '10.5px', padding: '1px 6px' }}
                                    >
                                      Ngừng hoạt động
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                  {att.address || 'Chưa có địa chỉ chi tiết'}
                                </div>
                              </div>
                            </label>

                            <div>
                              {isChecked ? (
                                <span
                                  className="badge badge-success"
                                  style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <CheckCircle2 size={12} /> Đã liên kết ({linkedItem.distance} {linkedItem.distance_unit || 'km'})
                                </span>
                              ) : (
                                <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                                  Chưa liên kết
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 6. EXPAND THAT SAME ROW when checked: distance, unit, notes */}
                          {isChecked && linkedItem && (
                            <div
                              style={{
                                marginTop: '12px',
                                paddingTop: '12px',
                                borderTop: '1px dashed #CBD5E1',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '14px',
                                alignItems: 'flex-start'
                              }}
                            >
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                  <label
                                    className="form-label"
                                    style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}
                                  >
                                    Khoảng cách:
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    className="filter-input"
                                    style={{ width: '100%', height: '36px' }}
                                    value={linkedItem.distance ?? ''}
                                    onChange={(e) =>
                                      handleAttractionFieldChange(att.id, 'distance', e.target.value)
                                    }
                                    placeholder="VD: 3.5 hoặc 350"
                                  />
                                </div>
                                <div style={{ width: '85px' }}>
                                  <label
                                    className="form-label"
                                    style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}
                                  >
                                    Đơn vị:
                                  </label>
                                  <select
                                    className="filter-select"
                                    style={{ width: '100%', height: '36px' }}
                                    value={linkedItem.distance_unit || 'km'}
                                    onChange={(e) =>
                                      handleAttractionFieldChange(att.id, 'distance_unit', e.target.value)
                                    }
                                  >
                                    <option value="km">km</option>
                                    <option value="m">m</option>
                                  </select>
                                </div>
                              </div>

                              <div style={{ gridColumn: 'span 2' }}>
                                <label
                                  className="form-label"
                                  style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}
                                >
                                  Ghi chú:
                                </label>
                                <textarea
                                  className="filter-input"
                                  style={{
                                    width: '100%',
                                    minHeight: '36px',
                                    height: '36px',
                                    resize: 'vertical',
                                    fontSize: '12.5px'
                                  }}
                                  rows={1}
                                  value={linkedItem.notes || ''}
                                  onChange={(e) =>
                                    handleAttractionFieldChange(att.id, 'notes', e.target.value)
                                  }
                                  placeholder="VD: Cách resort 10 phút lái xe dọc cung đường Hoàng Sa..."
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Amenities */}
        {activeTab === 'amenities' && (
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title">Tiện nghi & Dịch vụ cơ sở lưu trú</div>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>
                Đã chọn {(formData.amenities || []).length} tiện nghi
              </span>
            </div>
            <div className="admin-card-body">
              {errors.amenities && (
                <span className="form-error-text">{errors.amenities}</span>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {Object.entries(amenitiesByCategory).map(([category, items]) => (
                  <div key={category} style={{ borderBottom: '1px solid #F3F4F6', paddingBottom: '14px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#292D32', marginBottom: '8px' }}>
                      {category}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
                      {items.map((amenity) => {
                        const entry = (formData.amenities || []).find(
                          (item) => Number(item.amenityId) === Number(amenity.id),
                        );
                        const isChecked = Boolean(entry);
                        return (
                          <div
                            key={amenity.id}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              padding: '6px 10px',
                              backgroundColor: isChecked ? '#FEFBE8' : '#F9FAFB',
                              border: isChecked ? '1px solid #F4C542' : '1px solid #E5E7EB',
                              borderRadius: '4px'
                            }}
                          >
                            <label className="form-checkbox-label" style={{ padding: 0 }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleAmenityToggle(amenity.id)}
                              />
                              <span style={{ fontSize: '12.5px' }}>{amenity.name}</span>
                            </label>

                            {isChecked && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '20px' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ fontSize: '12px', padding: '5px 8px' }}
                                  placeholder="Ghi chú (VD: Mở cửa 06:30–22:00)"
                                  value={entry.note || ''}
                                  maxLength={1000}
                                  onChange={(e) =>
                                    handleAmenityFieldChange(amenity.id, 'note', e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    // Tránh Enter trong ô ghi chú kích hoạt submit cả form.
                                    if (e.key === 'Enter') e.preventDefault();
                                  }}
                                />
                                <label className="form-checkbox-label" style={{ fontSize: '11.5px', color: '#4B5563' }}>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(entry.isChargeable)}
                                    onChange={(e) =>
                                      handleAmenityFieldChange(
                                        amenity.id,
                                        'isChargeable',
                                        e.target.checked,
                                      )
                                    }
                                  />
                                  <span>Có thu phí</span>
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Photos & Media */}
        {activeTab === 'media' && (
          <div className="admin-card">
            <div className="admin-card-header">
              <div className="admin-card-title">Hình ảnh & Bộ sưu tập ảnh</div>
            </div>
            <div className="admin-card-body">
              {errors.images && (
                <span className="form-error-text">{errors.images}</span>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <ImageUpload
                  label="Ảnh bìa chính (Hero Banner)"
                  images={formData.cover_image ? [formData.cover_image] : []}
                  onChange={(imgs) => setFormData((prev) => ({ ...prev, cover_image: imgs[0] || '' }))}
                  onFilesSelected={(files) => uploadImages(files, 'cover_image')}
                  multiple={false}
                  helperText="Ảnh chất lượng cao hiển thị ở đầu trang chi tiết, danh sách tìm kiếm và hóa đơn."
                />

                <ImageUpload
                  label="Bộ sưu tập ảnh khuôn viên (Nhiều ảnh)"
                  images={formData.gallery_images || []}
                  onChange={(imgs) => setFormData((prev) => ({ ...prev, gallery_images: imgs }))}
                  onFilesSelected={(files) => uploadImages(files, 'gallery_images', true)}
                  multiple={true}
                  helperText="Tải lên ảnh ngoại cảnh, sảnh đón tiếp, hồ bơi, nhà hàng và cảnh quan xung quanh."
                />
              </div>
            </div>
          </div>
        )}

        {/* Form Actions footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <Link to="/admin/accommodations" className="btn btn-secondary">
            Hủy
          </Link>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || uploadingCount > 0}>
            <Save size={14} />{' '}
            {uploadingCount > 0
              ? 'Đang tải ảnh...'
              : isSubmitting
                ? 'Đang lưu...'
                : isEdit ? 'Lưu thay đổi' : 'Tạo cơ sở lưu trú'}
          </button>
        </div>
      </form>
    </div>
  );
}
