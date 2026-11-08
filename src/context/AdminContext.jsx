import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect
} from 'react';

import { accommodationsApi } from '../api/accommodations.js';


import { useAuth } from './AuthContext.jsx';
import {
  INITIAL_BOOKINGS,
  INITIAL_ROOM_WEEKDAY_RATES,
  INITIAL_RATE_PERIODS,
  INITIAL_ROOM_RATES,
  INITIAL_PROMOTIONS,
  INITIAL_CUSTOMERS,
  INITIAL_ADMIN_USERS,
  INITIAL_ROLES,
  INITIAL_ATTRACTIONS,
  DAYS_OF_WEEK
} from '../data/mockData.js';

const AdminContext = createContext(null);
const API_BASE_URL = 'http://localhost:3002/api/admin';

async function readAdminResponse(response) {
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) {
    throw new Error(result?.message || `Yêu cầu thất bại (HTTP ${response.status}).`);
  }
  return result;
}

export function AdminProvider({ children }) {

  // currentLoggedInUser: user backend trả về;
  // isCheckingAuthen: AuthContext còn đang kiểm tra session hay không.
  const { currentLoggedInUser, isCheckingAuthen } = useAuth();

  // User thật được AuthContext lấy từ session backend.
  // Khi chưa kiểm tra xong, giá trị có thể vẫn là null.
  const currentUser = currentLoggedInUser;
  const isAuthenticated = Boolean(currentLoggedInUser);

  // Entity
  const [locations, setLocations] = useState([]);
  // Accommodations chỉ lấy từ API; không khởi tạo bằng mock để trang nào
  // chưa fetch sẽ hiện rỗng thay vì dữ liệu giả.
  const [accommodations, setAccommodations] = useState([]);

  // Dữ liệu list hiện tại do backend trả về.
  const [accommodationsLoading, setAccommodationsLoading] = useState(false);
  const [accommodationsError, setAccommodationsError] = useState(null);

  const [accommodationsPagination, setAccommodationsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [attractions, setAttractions] = useState(INITIAL_ATTRACTIONS);
  // Loại phòng hiện chưa có API list riêng nên state này sẽ rỗng cho tới khi
  // module room type được nối backend (xem báo cáo các trang bị ảnh hưởng).
  const [roomTypes, setRoomTypes] = useState([]);
  const [roomWeekdayRates, setRoomWeekdayRates] = useState(INITIAL_ROOM_WEEKDAY_RATES);
  const [bookings, setBookings] = useState(INITIAL_BOOKINGS);
  const [ratePeriods, setRatePeriods] = useState(INITIAL_RATE_PERIODS);
  const [roomRates, setRoomRates] = useState(INITIAL_ROOM_RATES);
  const [promotions, setPromotions] = useState(INITIAL_PROMOTIONS);
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);
  const [adminUsers, setAdminUsers] = useState(INITIAL_ADMIN_USERS);
  const [roles] = useState(INITIAL_ROLES);

  // Tải danh sách điểm đến từ Backend
  const fetchLocations = async () => {
    const response = await fetch(`${API_BASE_URL}/locations`, { credentials: "include" });
    const result = await readAdminResponse(response);
    const locationsList = result.data?.locationsList;
    if (!Array.isArray(locationsList)) {
      throw new Error('Backend trả về danh sách điểm đến không hợp lệ.');
    }
    setLocations(locationsList);
    return locationsList;
  };

  // Tải danh sách điểm tham quan từ Backend
  const fetchAttractions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/attractions`, { credentials: "include" });
      const result = await res.json();
      if (result.success) {
        setAttractions(result.data.attractionsList);
      }
    } catch (error) {
      console.error("Lỗi tải điểm tham quan:", error);
    }
  };

  useEffect(() => {
    fetchLocations().catch((error) => console.error("Lỗi tải điểm đến:", error));
    fetchAttractions();
  }, [currentLoggedInUser]);



  // System settings
  const [generalSettings, setGeneralSettings] = useState({
    company_name: "VietPeace Stay Hospitality JSC",
    contact_email: "contact@vietpeacestay.vn",
    contact_phone: "+84 28 3822 5555",
    default_currency: "VND (₫)",
    time_zone: "Asia/Ho_Chi_Minh (UTC+07:00)"
  });

  const [websiteSettings, setWebsiteSettings] = useState({
    website_name: "VietPeace Stay - Authentic Vietnamese Retreats",
    logo_url: "",
    contact_info: "Headquarters: 120 Nguyen Hue Boulevard, District 1, Ho Chi Minh City, Vietnam",
    footer_text: "© 2026 VietPeace Stay Hospitality Chain. All rights reserved."
  });

  // UI State: Sidebar collapsed
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchAccommodations = useCallback(async (params = {}) => {
    setAccommodationsLoading(true);
    setAccommodationsError(null);

    try {
      const payload = await accommodationsApi.getList(params);

      setAccommodations(payload.data?.items || []);
      setAccommodationsPagination(
        payload.data?.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      );
      return payload;
    } catch (error) {
      console.error('[ERROR] fetchAccommodations thất bại:', {
        message: error.message,
        status: error.status,
        errorCode: error.errorCode,
        fieldErrors: error.errors
      });
      setAccommodationsError(error);
      throw error;
    } finally {
      setAccommodationsLoading(false);
    }
  }, []);

  // Auth functions
  const login = () => {
    showToast('Đăng nhập được xử lý bởi AuthContext.', 'info');
  };

  const logout = () => {
    showToast('Đăng xuất được xử lý bởi AuthContext.', 'info');
  };
  // Location CRUD
  const addLocation = async (locData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/locations`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locData)
      });
      const result = await readAdminResponse(response);
      const newLocation = result.data?.newLocation;
      if (!newLocation?.id) throw new Error('Backend không trả về điểm đến vừa tạo.');

      setLocations((prev) => [...prev, newLocation]);
      fetchLocations().catch((error) => console.error('Lỗi tải lại điểm đến:', error));
      showToast(`Đã thêm điểm đến "${newLocation.name}".`);
      return newLocation;
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const updateLocation = async (id, locData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/locations/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locData)
      });
      const result = await readAdminResponse(response);
      const updatedLocation = result.data?.updatedLocation;
      if (!updatedLocation?.id) throw new Error('Backend không trả về điểm đến vừa cập nhật.');

      setLocations((prev) => prev.map((location) => (
        location.id === Number(id) ? { ...location, ...updatedLocation } : location
      )));
      fetchLocations().catch((error) => console.error('Lỗi tải lại điểm đến:', error));
      showToast('Đã cập nhật điểm đến.');
      return updatedLocation;
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const deleteLocation = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/locations/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      await readAdminResponse(response);
      setLocations((prev) => prev.filter((location) => location.id !== Number(id)));
      showToast('Đã xóa điểm đến.', 'info');
      return true;
    } catch (error) {
      showToast(error.message, 'error');
      return false;
    }
  };

  // Accommodation CRUD
  const addAccommodation = (accData) => {
    const newId = Math.max(...accommodations.map((a) => a.id), 0) + 1;
    const newAcc = {
      ...accData,
      id: newId,
      room_types_count: 0,
      amenity_ids: accData.amenity_ids || [],
      attractions: accData.attractions || []
    };
    setAccommodations((prev) => [...prev, newAcc]);
    showToast(`Thêm cơ sở lưu trú "${newAcc.name}" thành công.`);
    return newAcc;
  };

  const updateAccommodation = (id, accData) => {
    setAccommodations((prev) => prev.map((a) => (a.id === Number(id) ? { ...a, ...accData } : a)));
    showToast('Cập nhật cơ sở lưu trú thành công.');
  };

  // Room Type CRUD
  const addRoomType = (roomData) => {
    const newId = Math.max(...roomTypes.map((r) => r.id), 0) + 1;
    const newRoom = { ...roomData, id: newId };
    setRoomTypes((prev) => [...prev, newRoom]);

    // Initialize 7 weekday rates for this room type
    const basePrice = Number(newRoom.base_price) || 1000000;
    const initialRates = (roomData.weekday_rates && Object.keys(roomData.weekday_rates).length > 0)
      ? DAYS_OF_WEEK.map((d) => ({
        id: Date.now() + d.day,
        room_type_id: newId,
        day_of_week: d.day,
        price: Number(roomData.weekday_rates[d.day]) || basePrice,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }))
      : DAYS_OF_WEEK.map((d) => ({
        id: Date.now() + d.day,
        room_type_id: newId,
        day_of_week: d.day,
        price: d.isWeekend ? Math.round(basePrice * 1.15) : basePrice,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }));

    setRoomWeekdayRates((prev) => [...prev, ...initialRates]);

    // Update accommodation count
    setAccommodations((prev) =>
      prev.map((a) => (a.id === Number(roomData.accommodation_id) ? { ...a, room_types_count: (a.room_types_count || 0) + 1 } : a))
    );
    showToast(`Room type "${newRoom.name}" added successfully.`);
    return newRoom;
  };

  const updateRoomType = (id, roomData) => {
    setRoomTypes((prev) => prev.map((r) => (r.id === Number(id) ? { ...r, ...roomData } : r)));
    if (roomData.weekday_rates) {
      updateRoomWeekdayRates(Number(id), roomData.weekday_rates, false);
    }
    showToast('Room type updated successfully.');
  };

  const deleteRoomType = (id) => {
    const roomToDelete = roomTypes.find((r) => r.id === Number(id));
    if (roomToDelete) {
      setAccommodations((prev) =>
        prev.map((a) =>
          a.id === Number(roomToDelete.accommodation_id)
            ? { ...a, room_types_count: Math.max(0, (a.room_types_count || 1) - 1) }
            : a
        )
      );
    }
    setRoomTypes((prev) => prev.filter((r) => r.id !== Number(id)));
    // Also remove weekday rates for this room type
    setRoomWeekdayRates((prev) => prev.filter((r) => r.room_type_id !== Number(id)));
    showToast('Room type deleted.', 'info');
    return true;
  };
  
  // Attraction CRUD
  const addAttraction = async (data) => {
    try {
      const res = await fetch(`${API_BASE_URL}/attractions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (resData.success) {
        showToast(`Thêm điểm tham quan "${resData.data.newAttraction.name}" thành công.`);
        await fetchAttractions();
        return resData.data.newAttraction;
      } else {
        showToast(resData.message, "error");
        return null;
      }
    } catch (error) {
      console.error('Add attraction error:', error);
      showToast("Lỗi kết nối khi thêm điểm tham quan.", "error");
    }
  };

  const updateAttraction = async (id, data) => {
    try {
      const res = await fetch(`${API_BASE_URL}/attractions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (resData.success) {
        showToast("Cập nhật điểm tham quan thành công.");
        await fetchAttractions();
        return true;
      } else {
        showToast(resData.message, "error");
        return false;
      }
    } catch (error) {
      console.error('Update attraction error:', error);
      showToast("Lỗi kết nối khi cập nhật điểm tham quan.", "error");
    }
  };

  const toggleAttractionStatus = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/attractions/${id}/status`, {
        method: "PATCH",
        credentials: "include"
      });
      const resData = await res.json();
      if (resData.success) {
        showToast(resData.message, "info");
        await fetchAttractions();
        return true;
      } else {
        showToast(resData.message, "error");
        return false;
      }
    } catch (error) {
      console.error('Toggle attraction status error:', error);
      showToast("Lỗi kết nối khi đổi trạng thái.", "error");
    }
  };

  const deleteAttraction = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/attractions/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      const resData = await res.json();
      if (resData.success) {
        showToast("Xóa điểm tham quan thành công.", "info");
        await fetchAttractions();
        return { success: true };
      } else {
        showToast(resData.message, "warning");
        return { success: false, reason: "linked" };
      }
    } catch (error) {
      console.error('Delete attraction error:', error);
      showToast("Lỗi kết nối khi xóa điểm tham quan.", "error");
      return { success: false };
    }
  };

  // Bookings CRUD
  const updateBookingStatus = (id, newStatus) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === Number(id)) {
          const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
          const historyEntry = {
            status: newStatus,
            timestamp,
            note: `Status updated to ${newStatus} by admin`
          };
          return {
            ...b,
            booking_status: newStatus,
            history: [...(b.history || []), historyEntry]
          };
        }
        return b;
      })
    );
    showToast(`Booking status updated to ${newStatus}.`);
  };

  const updatePaymentStatus = (id, newPaymentStatus) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === Number(id) ? { ...b, payment_status: newPaymentStatus } : b))
    );
    showToast(`Payment status updated to ${newPaymentStatus}.`);
  };

  // Promotions CRUD
  const addPromotion = (data) => {
    const newId = Math.max(...promotions.map((p) => p.id), 0) + 1;
    const newPromo = { ...data, id: newId, times_used: 0 };
    setPromotions((prev) => [...prev, newPromo]);
    showToast(`Tạo mã khuyến mãi "${newPromo.name}" thành công.`);
    return newPromo;
  };

  const updatePromotion = (id, data) => {
    setPromotions((prev) => prev.map((p) => (p.id === Number(id) ? { ...p, ...data } : p)));
    showToast('Cập nhật khuyến mãi thành công.');
  };

  const deletePromotion = (id) => {
    setPromotions((prev) => prev.filter((p) => p.id !== Number(id)));
    showToast('Đã xóa khuyến mãi.', 'info');
  };

  // Customers CRUD
  const updateCustomer = (id, data) => {
    setCustomers((prev) => prev.map((c) => (c.id === Number(id) ? { ...c, ...data } : c)));
    showToast('Cập nhật thông tin khách hàng thành công.');
  };

  const deleteCustomer = (id) => {
    setCustomers((prev) => prev.filter((c) => c.id !== Number(id)));
    showToast('Đã xóa khách hàng.', 'info');
  };

  // Rate Periods (rate_periods SQL Table - independent master periods)
  const addRatePeriod = (data) => {
    if (!data.name?.trim()) {
      showToast('Tên kỳ giá đặc biệt là bắt buộc.', 'error');
      return false;
    }
    if (!data.start_date || !data.end_date) {
      showToast('Ngày bắt đầu và ngày kết thúc là bắt buộc.', 'error');
      return false;
    }
    if (new Date(data.end_date) <= new Date(data.start_date)) {
      showToast('Ngày kết thúc phải lớn hơn ngày bắt đầu.', 'error');
      return false;
    }

    const newId = Math.max(...ratePeriods.map((r) => r.id), 0) + 1;
    const nowTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newPeriod = {
      id: newId,
      name: data.name.trim(),
      start_date: data.start_date,
      end_date: data.end_date,
      description: data.description || '',
      status: (data.status || 'ACTIVE').toUpperCase(),
      created_at: nowTimestamp,
      updated_at: nowTimestamp
    };
    setRatePeriods((prev) => [...prev, newPeriod]);
    showToast(`Đã thêm kỳ giá đặc biệt "${newPeriod.name}".`);
    return newPeriod;
  };

  const updateRatePeriod = (id, data) => {
    if (data.start_date && data.end_date && new Date(data.end_date) <= new Date(data.start_date)) {
      showToast('Ngày kết thúc phải lớn hơn ngày bắt đầu.', 'error');
      return false;
    }

    const nowTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setRatePeriods((prev) =>
      prev.map((r) =>
        r.id === Number(id)
          ? {
            ...r,
            name: data.name !== undefined ? data.name.trim() : r.name,
            start_date: data.start_date !== undefined ? data.start_date : r.start_date,
            end_date: data.end_date !== undefined ? data.end_date : r.end_date,
            description: data.description !== undefined ? data.description : r.description,
            status: data.status ? data.status.toUpperCase() : r.status,
            updated_at: nowTimestamp
          }
          : r
      )
    );
    showToast('Đã cập nhật kỳ giá đặc biệt.');
    return true;
  };

  const deleteRatePeriod = (id) => {
    setRatePeriods((prev) => prev.filter((r) => r.id !== Number(id)));
    // Also remove associated period rates
    setRoomRates((prev) => prev.filter((r) => r.rate_period_id !== Number(id)));
    showToast('Đã xóa kỳ giá đặc biệt.', 'info');
    return true;
  };

  // Room Weekday Rates (room_weekday_rates SQL Table)
  const getRoomWeekdayRates = (roomTypeId) => {
    const existing = roomWeekdayRates.filter((r) => r.room_type_id === Number(roomTypeId));
    if (existing.length === 7) {
      return [...existing].sort((a, b) => a.day_of_week - b.day_of_week);
    }

    const room = roomTypes.find((r) => r.id === Number(roomTypeId));
    const basePrice = Number(room?.base_price) || 1000000;

    return DAYS_OF_WEEK.map((d) => {
      const found = existing.find((r) => r.day_of_week === d.day);
      if (found) return found;
      return {
        id: Date.now() + d.day,
        room_type_id: Number(roomTypeId),
        day_of_week: d.day,
        price: d.isWeekend ? Math.round(basePrice * 1.15) : basePrice,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
    });
  };

  const updateRoomWeekdayRates = (roomTypeId, ratesMap, showNotification = true) => {
    const rId = Number(roomTypeId);
    const nowTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    setRoomWeekdayRates((prev) => {
      // Remove previous rates for this room type
      const others = prev.filter((r) => r.room_type_id !== rId);

      const newRates = DAYS_OF_WEEK.map((d) => {
        let price = 0;
        if (Array.isArray(ratesMap)) {
          const item = ratesMap.find((x) => x.day_of_week === d.day);
          price = item ? Number(item.price) : 0;
        } else if (ratesMap && typeof ratesMap === 'object') {
          price = Number(ratesMap[d.day] ?? ratesMap[String(d.day)] ?? 0);
        }

        if (price < 0) price = 0;

        const prevMatch = prev.find((r) => r.room_type_id === rId && r.day_of_week === d.day);

        return {
          id: prevMatch ? prevMatch.id : Date.now() + d.day,
          room_type_id: rId,
          day_of_week: d.day,
          price: price >= 0 ? price : 0,
          created_at: prevMatch ? prevMatch.created_at : nowTimestamp,
          updated_at: nowTimestamp
        };
      });

      return [...others, ...newRates];
    });

    if (showNotification) {
      showToast('Weekday & weekend room rates updated successfully.');
    }
    return true;
  };

  // Special Rate Period Configurations (rate_period_items SQL Table)
  // columns: id, rate_period_id, accommodation_id, room_type_id, adjustment_type, adjustment_value, price, status, created_at, updated_at
  const saveRatePeriodRoomConfig = (ratePeriodId, roomTypeId, accommodationId, adjustmentType, adjustmentValue) => {
    const pId = Number(ratePeriodId);
    const rId = Number(roomTypeId);
    const accId = Number(accommodationId);
    const adjType = adjustmentType || 'FIXED';
    const adjVal = Number(adjustmentValue);
    const room = roomTypes.find((r) => r.id === rId);
    const basePrice = Number(room?.base_price) || 0;

    let calculatedPrice = adjVal;
    if (adjType === 'PERCENT_INCREASE') {
      calculatedPrice = Math.round(basePrice * (1 + adjVal / 100));
    } else if (adjType === 'PERCENT_DECREASE') {
      calculatedPrice = Math.max(0, Math.round(basePrice * (1 - adjVal / 100)));
    } else if (adjType === 'AMOUNT_INCREASE') {
      calculatedPrice = basePrice + adjVal;
    } else if (adjType === 'AMOUNT_DECREASE') {
      calculatedPrice = Math.max(0, basePrice - adjVal);
    }

    const nowTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    setRoomRates((prev) => {
      const matchIndex = prev.findIndex((item) => item.rate_period_id === pId && item.room_type_id === rId);
      if (matchIndex >= 0) {
        return prev.map((item, idx) =>
          idx === matchIndex
            ? {
              ...item,
              accommodation_id: accId,
              adjustment_type: adjType,
              adjustment_value: adjVal,
              price: calculatedPrice,
              updated_at: nowTimestamp
            }
            : item
        );
      } else {
        const newId = Math.max(...prev.map((item) => item.id), 0) + 1;
        const newItem = {
          id: newId,
          accommodation_id: accId,
          rate_period_id: pId,
          room_type_id: rId,
          adjustment_type: adjType,
          adjustment_value: adjVal,
          price: calculatedPrice,
          status: 'ACTIVE',
          created_at: nowTimestamp,
          updated_at: nowTimestamp
        };
        return [...prev, newItem];
      }
    });

    showToast('Lưu cấu hình giá thành công.');
    return true;
  };

  const bulkSaveRatePeriodRoomConfig = (ratePeriodId, accommodationId, adjustmentType, adjustmentValue) => {
    const pId = Number(ratePeriodId);
    const accId = Number(accommodationId);
    const adjType = adjustmentType || 'FIXED';
    const adjVal = Number(adjustmentValue);

    const targetRooms = roomTypes.filter((r) => String(r.accommodation_id) === String(accId));
    if (targetRooms.length === 0) {
      showToast('Cơ sở lưu trú này chưa có loại phòng nào.', 'warning');
      return false;
    }

    const nowTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    setRoomRates((prev) => {
      let nextList = [...prev];
      let maxId = Math.max(...nextList.map((item) => item.id), 0);

      targetRooms.forEach((room) => {
        const basePrice = Number(room.base_price) || 0;
        let calculatedPrice = adjVal;
        if (adjType === 'PERCENT_INCREASE') {
          calculatedPrice = Math.round(basePrice * (1 + adjVal / 100));
        } else if (adjType === 'PERCENT_DECREASE') {
          calculatedPrice = Math.max(0, Math.round(basePrice * (1 - adjVal / 100)));
        } else if (adjType === 'AMOUNT_INCREASE') {
          calculatedPrice = basePrice + adjVal;
        } else if (adjType === 'AMOUNT_DECREASE') {
          calculatedPrice = Math.max(0, basePrice - adjVal);
        }

        const matchIndex = nextList.findIndex((item) => item.rate_period_id === pId && item.room_type_id === room.id);
        if (matchIndex >= 0) {
          nextList[matchIndex] = {
            ...nextList[matchIndex],
            accommodation_id: accId,
            adjustment_type: adjType,
            adjustment_value: adjVal,
            price: calculatedPrice,
            updated_at: nowTimestamp
          };
        } else {
          maxId += 1;
          nextList.push({
            id: maxId,
            accommodation_id: accId,
            rate_period_id: pId,
            room_type_id: room.id,
            adjustment_type: adjType,
            adjustment_value: adjVal,
            price: calculatedPrice,
            status: 'ACTIVE',
            created_at: nowTimestamp,
            updated_at: nowTimestamp
          });
        }
      });

      return nextList;
    });

    showToast('Đã lưu cấu hình chung cho tất cả loại phòng.');
    return true;
  };

  const setRatePeriodItemPrice = (ratePeriodId, roomTypeId, accommodationId, price) => {
    return saveRatePeriodRoomConfig(ratePeriodId, roomTypeId, accommodationId, 'FIXED', price);
  };

  const removeRatePeriodItem = (ratePeriodId, roomTypeId) => {
    const pId = Number(ratePeriodId);
    const rId = Number(roomTypeId);
    setRoomRates((prev) => prev.filter((item) => !(item.rate_period_id === pId && item.room_type_id === rId)));
    showToast('Đã gỡ cấu hình giá cho loại phòng.', 'info');
    return true;
  };

  const updateRoomRate = (id, price) => {
    setRoomRates((prev) => prev.map((r) => (r.id === Number(id) ? { ...r, price: Number(price) } : r)));
    showToast('Cập nhật giá thành công.');
  };

  // Users & Roles
  const addAdminUser = (data) => {
    const newId = Math.max(...adminUsers.map((u) => u.id), 0) + 1;
    const newUser = {
      ...data,
      id: newId,
      created_date: new Date().toISOString().substring(0, 10)
    };
    setAdminUsers((prev) => [...prev, newUser]);
    showToast(`Đã thêm tài khoản "${newUser.name}".`);
    return newUser;
  };

  const updateAdminUser = (id, data) => {
    setAdminUsers((prev) => prev.map((u) => (u.id === Number(id) ? { ...u, ...data } : u)));
    showToast('Cập nhật tài khoản thành công.');
  };

  const deleteAdminUser = (id) => {
    if (currentUser && Number(id) === Number(currentUser.id)) {
      showToast('Không thể xóa tài khoản quản trị đang đăng nhập.', 'warning');
      return false;
    }
    setAdminUsers((prev) => prev.filter((u) => u.id !== Number(id)));
    showToast('Đã xóa tài khoản quản trị.', 'info');
    return true;
  };

  return (
    <AdminContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isCheckingAuthen,

        // Các hàm này hiện vẫn có thể giữ tạm
        // cho những màn hình mock chưa chuyển sang AuthContext.
        login,
        logout,
        locations,
        addLocation,
        updateLocation,
        deleteLocation,
        accommodations,
        addAccommodation,
        updateAccommodation,

        accommodationsLoading,
        accommodationsError,
        accommodationsPagination,
        fetchAccommodations,

        roomTypes,
        addRoomType,
        updateRoomType,
        deleteRoomType,
        attractions,
        addAttraction,
        updateAttraction,
        toggleAttractionStatus,
        deleteAttraction,
        // Phần Sidebar đang cần ba giá trị này
        bookings,
        updateBookingStatus,
        updatePaymentStatus,
        ratePeriods,
        addRatePeriod,
        updateRatePeriod,
        deleteRatePeriod,
        roomRates,
        updateRoomRate,
        saveRatePeriodRoomConfig,
        bulkSaveRatePeriodRoomConfig,
        setRatePeriodItemPrice,
        removeRatePeriodItem,
        roomWeekdayRates,
        getRoomWeekdayRates,
        updateRoomWeekdayRates,
        DAYS_OF_WEEK,
        promotions,
        addPromotion,
        updatePromotion,
        deletePromotion,
        customers,
        updateCustomer,
        deleteCustomer,
        adminUsers,
        addAdminUser,
        updateAdminUser,
        deleteAdminUser,
        roles,
        generalSettings,
        setGeneralSettings,
        websiteSettings,
        setWebsiteSettings,
        isSidebarOpen,
        setIsSidebarOpen,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        toasts,
        showToast,
        removeToast

        // ... các field còn lại giữ nguyên
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
