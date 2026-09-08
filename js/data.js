/**
 * Taxi Xanh - Data Layer
 * Quản lý đội xe taxi
 * Version: 2.0.0 (Taxi Management Game)
 */

// ====================== VEHICLES ======================
const DEFAULT_VEHICLES = [
  {
    id: 'xe-4cho-co-ban',
    icon: '🚗',
    name: 'Xe 4 chỗ Cơ bản',
    type: 'economy',
    buyPrice: 800,
    fuelCapacity: 40,
    fuelPerKm: 0.12,
    maxCondition: 100,
    speed: 1.0,
    capacity: 4,
    comfort: 1,
    baseFare: 15,
    farePerKm: 8,
    xp: 5,
    unlockLevel: 1,
    desc: 'Xe phổ thông, tiết kiệm, phù hợp chạy nội thành.'
  },
  {
    id: 'xe-4cho-tiet-kiem',
    icon: '🚙',
    name: 'Xe 4 chỗ Tiết kiệm',
    type: 'economy',
    buyPrice: 1200,
    fuelCapacity: 38,
    fuelPerKm: 0.10,
    maxCondition: 100,
    speed: 1.05,
    capacity: 4,
    comfort: 2,
    baseFare: 18,
    farePerKm: 9,
    xp: 6,
    unlockLevel: 2,
    desc: 'Tiêu hao nhiên liệu thấp hơn, lợi nhuận tốt hơn.'
  },
  {
    id: 'xe-7cho-gia-dinh',
    icon: '🚐',
    name: 'Xe 7 chỗ Gia đình',
    type: 'economy',
    buyPrice: 2200,
    fuelCapacity: 55,
    fuelPerKm: 0.16,
    maxCondition: 100,
    speed: 0.95,
    capacity: 7,
    comfort: 2,
    baseFare: 25,
    farePerKm: 11,
    xp: 8,
    unlockLevel: 4,
    desc: 'Chở nhiều người, phù hợp sân bay và gia đình.'
  },
  {
    id: 'xe-sedan-comfort',
    icon: '🚘',
    name: 'Sedan Comfort',
    type: 'comfort',
    buyPrice: 3500,
    fuelCapacity: 50,
    fuelPerKm: 0.13,
    maxCondition: 110,
    speed: 1.15,
    capacity: 4,
    comfort: 4,
    baseFare: 28,
    farePerKm: 14,
    xp: 12,
    unlockLevel: 6,
    desc: 'Êm ái, sạch sẽ, khách hàng đánh giá cao.'
  },
  {
    id: 'xe-suv-comfort',
    icon: '🚙',
    name: 'SUV Comfort',
    type: 'comfort',
    buyPrice: 4800,
    fuelCapacity: 65,
    fuelPerKm: 0.18,
    maxCondition: 120,
    speed: 1.10,
    capacity: 6,
    comfort: 5,
    baseFare: 35,
    farePerKm: 16,
    xp: 15,
    unlockLevel: 8,
    desc: 'Không gian rộng, phù hợp đường xa và khách VIP vừa.'
  },
  {
    id: 'xe-luxury-sedan',
    icon: '🏎️',
    name: 'Luxury Sedan',
    type: 'luxury',
    buyPrice: 9000,
    fuelCapacity: 60,
    fuelPerKm: 0.15,
    maxCondition: 130,
    speed: 1.30,
    capacity: 4,
    comfort: 8,
    baseFare: 55,
    farePerKm: 25,
    xp: 25,
    unlockLevel: 12,
    desc: 'Sang trọng, chạy nhanh, giá cước cao.'
  },
  {
    id: 'xe-vip-limousine',
    icon: '🥂',
    name: 'VIP Limousine',
    type: 'luxury',
    buyPrice: 18000,
    fuelCapacity: 80,
    fuelPerKm: 0.22,
    maxCondition: 150,
    speed: 1.20,
    capacity: 6,
    comfort: 10,
    baseFare: 90,
    farePerKm: 40,
    xp: 40,
    unlockLevel: 18,
    desc: 'Đỉnh cao dịch vụ. Chỉ dành cho khách hàng thượng lưu.'
  },
  {
    id: 'xe-dien-eco',
    icon: '⚡',
    name: 'Xe Điện Eco',
    type: 'special',
    buyPrice: 6500,
    fuelCapacity: 100,
    fuelPerKm: 0.08,
    maxCondition: 115,
    speed: 1.08,
    capacity: 4,
    comfort: 5,
    baseFare: 30,
    farePerKm: 12,
    xp: 14,
    unlockLevel: 10,
    isElectric: true,
    desc: 'Không xăng, chi phí vận hành cực thấp, thân thiện môi trường.'
  },
  {
    id: 'xe-ban-tai',
    icon: '🛻',
    name: 'Xe Bán Tải',
    type: 'special',
    buyPrice: 4200,
    fuelCapacity: 70,
    fuelPerKm: 0.20,
    maxCondition: 140,
    speed: 0.90,
    capacity: 2,
    comfort: 2,
    baseFare: 40,
    farePerKm: 18,
    xp: 16,
    unlockLevel: 9,
    canCargo: true,
    desc: 'Chở hàng hóa, phù hợp đơn hàng đặc biệt.'
  }
];

// ====================== DRIVERS ======================
const DEFAULT_DRIVERS = [
  {
    id: 'tai-xe-moi',
    icon: '👨‍✈️',
    name: 'Tài xế Mới',
    hirePrice: 300,
    salaryPerTrip: 8,
    skill: 1,
    stamina: 80,
    maxStamina: 80,
    loyalty: 50,
    unlockLevel: 1,
    desc: 'Mới vào nghề, cần được đào tạo.'
  },
  {
    id: 'tai-xe-than-thien',
    icon: '😊',
    name: 'Tài xế Thân thiện',
    hirePrice: 600,
    salaryPerTrip: 12,
    skill: 3,
    stamina: 90,
    maxStamina: 90,
    loyalty: 70,
    unlockLevel: 3,
    desc: 'Khách hàng thích, tip cao hơn.'
  },
  {
    id: 'tai-xe-chuyen-nghiep',
    icon: '🧑‍✈️',
    name: 'Tài xế Chuyên nghiệp',
    hirePrice: 1200,
    salaryPerTrip: 18,
    skill: 5,
    stamina: 100,
    maxStamina: 100,
    loyalty: 80,
    unlockLevel: 6,
    desc: 'Lái xe giỏi, ít tai nạn, hoàn thành chuyến nhanh.'
  },
  {
    id: 'tai-xe-cao-cap',
    icon: '🤵',
    name: 'Tài xế Cao cấp',
    hirePrice: 2500,
    salaryPerTrip: 30,
    skill: 8,
    stamina: 110,
    maxStamina: 110,
    loyalty: 90,
    unlockLevel: 12,
    desc: 'Phục vụ khách VIP, tăng đáng kể đánh giá công ty.'
  },
  {
    id: 'tai-xe-huyen-thoai',
    icon: '👑',
    name: 'Tài xế Huyền thoại',
    hirePrice: 6000,
    salaryPerTrip: 50,
    skill: 10,
    stamina: 130,
    maxStamina: 130,
    loyalty: 100,
    unlockLevel: 20,
    desc: 'Huyền thoại đường phố. Tối ưu mọi chỉ số.'
  }
];

// ====================== TRIP TYPES ======================
const DEFAULT_TRIPS = [
  {
    id: 'noi-thanh-ngan',
    name: 'Nội thành ngắn',
    icon: '🏙️',
    minDistance: 2,
    maxDistance: 6,
    baseTime: 180,
    demand: 1.2,
    unlockLevel: 1,
    types: ['economy', 'comfort']
  },
  {
    id: 'noi-thanh-trung',
    name: 'Nội thành trung bình',
    icon: '🌆',
    minDistance: 5,
    maxDistance: 12,
    baseTime: 360,
    demand: 1.0,
    unlockLevel: 1,
    types: ['economy', 'comfort', 'luxury']
  },
  {
    id: 'san-bay',
    name: 'Đón sân bay',
    icon: '✈️',
    minDistance: 12,
    maxDistance: 25,
    baseTime: 600,
    demand: 1.4,
    unlockLevel: 4,
    types: ['comfort', 'luxury', 'special'],
    tipBonus: 1.3
  },
  {
    id: 'lien-tinh',
    name: 'Liên tỉnh',
    icon: '🛣️',
    minDistance: 30,
    maxDistance: 80,
    baseTime: 1800,
    demand: 0.8,
    unlockLevel: 8,
    types: ['comfort', 'luxury', 'special'],
    tipBonus: 1.5
  },
  {
    id: 'vip-dac-biet',
    name: 'Chuyến VIP Đặc biệt',
    icon: '💎',
    minDistance: 8,
    maxDistance: 40,
    baseTime: 900,
    demand: 0.5,
    unlockLevel: 14,
    types: ['luxury'],
    tipBonus: 2.0,
    requireComfort: 7
  },
  {
    id: 'chuyen-hang',
    name: 'Chở hàng',
    icon: '📦',
    minDistance: 5,
    maxDistance: 30,
    baseTime: 500,
    demand: 0.9,
    unlockLevel: 9,
    types: ['special'],
    requireCargo: true
  }
];

// ====================== FUEL & MAINTENANCE ======================
const DEFAULT_FUELS = [
  { id: 'xang-thuong', name: 'Xăng Thường', icon: '⛽', price: 25, amount: 10, quality: 1 },
  { id: 'xang-cao-cap', name: 'Xăng Cao cấp', icon: '🛢️', price: 40, amount: 10, quality: 1.15 },
  { id: 'pin-sac-nhanh', name: 'Sạc Nhanh', icon: '🔌', price: 35, amount: 30, quality: 1, isElectric: true }
];

const DEFAULT_MAINTENANCE = [
  { id: 'sua-nho', name: 'Bảo dưỡng nhỏ', icon: '🔧', price: 80, restore: 25, desc: 'Khôi phục 25 điểm tình trạng.' },
  { id: 'sua-lon', name: 'Đại tu', icon: '🛠️', price: 220, restore: 70, desc: 'Khôi phục 70 điểm tình trạng.' },
  { id: 'son-xe', name: 'Sơn lại xe', icon: '🎨', price: 350, restore: 15, bonusComfort: 1, desc: 'Làm mới ngoại thất.' }
];

// ====================== UPGRADES ======================
const DEFAULT_UPGRADES = [
  { id: 'mo-rong-bai-do', name: 'Mở rộng bãi đỗ', icon: '🅿️', maxLevel: 5, costs: [1500,3000,6000,12000,25000], effect: 'slots', values: [1,1,2,2,3], desc: 'Tăng số xe có thể sở hữu.' },
  { id: 'trung-tam-dieu-hanh', name: 'Trung tâm điều hành', icon: '📡', maxLevel: 3, costs: [2000,5000,12000], effect: 'dispatchSpeed', values: [0.1,0.15,0.2], desc: 'Giảm thời gian chờ chuyến mới.' },
  { id: 'he-thong-gps', name: 'Hệ thống GPS nâng cao', icon: '🗺️', maxLevel: 3, costs: [1800,4000,9000], effect: 'tripSpeed', values: [0.08,0.12,0.18], desc: 'Rút ngắn thời gian hoàn thành chuyến.' },
  { id: 'chuong-trinh-dao-tao', name: 'Chương trình đào tạo', icon: '📚', maxLevel: 3, costs: [2500,6000,14000], effect: 'driverXp', values: [0.15,0.25,0.4], desc: 'Tài xế tăng kỹ năng nhanh hơn.' }
];

// ====================== SETTINGS ======================
const DEFAULT_SETTINGS = {
  plotCount: 4,
  startCoins: 2500,
  maxVehiclesPerGarage: 12,
  fuelPriceMultiplier: 1.0,
  demandBase: 1.0,
  rushHourBonus: 1.45,
  rainDemandBonus: 1.25,
  rainSpeedPenalty: 0.85,
  version: '2.0.0'
};

// ====================== EVENTS ======================
const DEFAULT_EVENTS = {
  rushHour: {
    id: 'rush-hour',
    name: 'Giờ cao điểm',
    icon: '🚦',
    durationMs: 8 * 60 * 1000,
    intervalMs: 25 * 60 * 1000,
    demandMult: 1.5,
    fareMult: 1.25
  },
  rain: {
    id: 'rain',
    name: 'Mưa lớn',
    icon: '🌧️',
    durationMs: 6 * 60 * 1000,
    intervalMs: 35 * 60 * 1000,
    demandMult: 1.3,
    speedMult: 0.8,
    tipMult: 1.15
  }
};

// ====================== RUNTIME ======================
let currentUser = null;
let currentPlayer = null;
let currentVehicles = [];
let currentSettings = { ...DEFAULT_SETTINGS };
let isAdmin = false;

// Compatibility
function createDefaultPlayerData(uid, email, role) {
  const slotCount = currentSettings.plotCount || DEFAULT_SETTINGS.plotCount;
  const startCoins = currentSettings.startCoins || DEFAULT_SETTINGS.startCoins;

  return {
    uid,
    email: email || '',
    role: role || 'user',
    coins: startCoins,
    level: 1,
    xp: 0,
    companyName: 'Đội Xe Xanh',
    reputation: 50,
    displayName: 'Chủ doanh nghiệp',

    plots: Array(slotCount).fill(null).map((_, i) => ({
      id: i,
      vehicleId: null,
      driverId: null,
      status: 'idle',
      tripId: null,
      tripStartedAt: null,
      tripDistance: 0,
      tripFare: 0,
      tripBaseTime: 0,
      fuel: 0,
      condition: 100,
      totalTrips: 0,
      totalEarned: 0,
      lastActionAt: null
    })),

    gardens: null,
    activeGarden: 0,

    inventory: {
      fuels: { 'xang-thuong': 5, 'xang-cao-cap': 1 },
      maintenance: { 'sua-nho': 2 },
      drivers: {},
      vehiclesOwned: {}
    },

    hiredDrivers: [],
    ownedVehicles: [],
    upgrades: {},

    stats: {
      totalTrips: 0,
      totalDistance: 0,
      totalEarned: 0,
      totalSpent: 0,
      totalFuelUsed: 0,
      customersServed: 0,
      avgRating: 4.5
    },

    activity: [],
    lastDaily: null,
    collection: {},
    achievements: {},

    rushUntil: 0,
    rainUntil: 0,
    nextRushAt: 0,
    nextRainAt: 0,

    fairyUntil: 0,
    nycUntil: 0,
    helperUntil: 0,

    buffPrefs: {
      autoDispatch: true,
      autoRefuel: true,
      autoRepair: false
    },

    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

async function resetPlayerData(opts) {
  opts = opts || {};
  if (!currentUser || !currentUser.uid) {
    return { ok: false, msg: 'Chưa đăng nhập!' };
  }
  const uid = currentUser.uid;
  const email = (currentUser.email || (currentPlayer && currentPlayer.email) || '');
  let role = (currentPlayer && currentPlayer.role) || 'user';

  if (role !== 'admin') {
    try {
      const usersSnap = await db.ref('users').once('value');
      const val = usersSnap.val() || {};
      if (Object.keys(val).length <= 1) role = 'admin';
    } catch (_) {}
  }

  const keepName = (currentPlayer && currentPlayer.displayName) || '';
  const keepAvatar = (currentPlayer && currentPlayer.avatar) || '';

  try {
    Object.keys(localStorage).forEach(k => {
      if (k.includes(uid) || k.startsWith('vx-') || k.startsWith('taxi-')) {
        try { localStorage.removeItem(k); } catch (_) {}
      }
    });
  } catch (e) {}

  try { await db.ref('playLogs/' + uid).remove(); } catch (e) {}

  const data = createDefaultPlayerData(uid, email, role);
  data.displayName = keepName || 'Chủ doanh nghiệp';
  data.avatar = keepAvatar || '';
  data.updatedAt = Date.now();
  data.sessionId = String(Date.now());
  data.lastSeenAt = data.updatedAt;
  data.resetAt = data.updatedAt;
  data.resetCount = ((currentPlayer && currentPlayer.resetCount) || 0) + 1;

  await db.ref('users/' + uid).set(data);
  currentPlayer = data;
  isAdmin = role === 'admin';

  if (typeof Game !== 'undefined' && Game.ensureGardens) {
    try { Game.ensureGardens(); } catch (_) {}
  }

  if (!opts.silent && typeof showToast === 'function') {
    showToast('Đã reset dữ liệu công ty. Đang tải lại...', 'success');
  }

  if (!opts.noReload) {
    setTimeout(() => location.reload(), 600);
  }
  return { ok: true, msg: 'Đã reset dữ liệu', role };
}

async function initGlobalData() {
  // Vehicles catalog (fallback to local defaults if DB empty / permission denied)
  currentVehicles = [...DEFAULT_VEHICLES];
  try {
    const vehSnap = await db.ref('vehicles').once('value');
    if (!vehSnap.exists()) {
      const obj = {};
      DEFAULT_VEHICLES.forEach(v => { obj[v.id] = v; });
      try {
        await db.ref('vehicles').set(obj);
      } catch (e) {
        console.warn('seed vehicles skipped', e && e.code);
      }
      currentVehicles = [...DEFAULT_VEHICLES];
    } else {
      const val = vehSnap.val() || {};
      const merged = { ...val };
      let changed = false;
      DEFAULT_VEHICLES.forEach(v => {
        if (!merged[v.id]) {
          merged[v.id] = v;
          changed = true;
        }
      });
      if (changed) {
        try {
          await db.ref('vehicles').set(merged);
        } catch (e) {
          console.warn('merge vehicles skipped', e && e.code);
        }
      }
      currentVehicles = Object.values(merged);
    }
  } catch (e) {
    console.warn('load vehicles', e);
    currentVehicles = [...DEFAULT_VEHICLES];
  }

  // Settings
  currentSettings = { ...DEFAULT_SETTINGS };
  try {
    const setSnap = await db.ref('settings').once('value');
    if (!setSnap.exists()) {
      try {
        await db.ref('settings').set(DEFAULT_SETTINGS);
      } catch (e) {
        console.warn('seed settings skipped', e && e.code);
      }
      currentSettings = { ...DEFAULT_SETTINGS };
    } else {
      currentSettings = { ...DEFAULT_SETTINGS, ...setSnap.val() };
    }
  } catch (e) {
    console.warn('load settings', e);
    currentSettings = { ...DEFAULT_SETTINGS };
  }
}

// Helpers
function getGmt7DayStartMs(nowMsVal) {
  const d = new Date(nowMsVal || Date.now());
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const gmt7 = new Date(utc + (7 * 3600000));
  gmt7.setHours(0, 0, 0, 0);
  return gmt7.getTime() - (7 * 3600000) + (d.getTimezoneOffset() * 60000);
}

function pruneActivityOlderThan24h(list, now) {
  now = now || Date.now();
  const cutoff = now - 24 * 3600 * 1000;
  if (!Array.isArray(list)) return { list: [], changed: true };
  const filtered = list.filter(a => (a && a.at && a.at >= cutoff));
  return { list: filtered, changed: filtered.length !== list.length };
}

function applyActivityPrune(opts) {
  opts = opts || {};
  if (!currentPlayer) return false;
  const r = pruneActivityOlderThan24h(currentPlayer.activity || [], opts.now);
  if (r.changed || !Array.isArray(currentPlayer.activity)) {
    currentPlayer.activity = r.list;
    return true;
  }
  return false;
}
