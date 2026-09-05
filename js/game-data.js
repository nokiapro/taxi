// Taxi Tycoon v2.0.0 — Static Game Data

export const CAR_TYPES = [
  { id: "economy", name: "Taxi Cơ bản", emoji: "🚕", price: 3500, speed: 1, capacity: 4, comfort: 1, fuel: 1.0, maint: 15, color: "#22d3ee" },
  { id: "comfort", name: "Taxi Comfort", emoji: "🚖", price: 6500, speed: 1.15, capacity: 4, comfort: 2, fuel: 1.1, maint: 25, color: "#34d399" },
  { id: "premium", name: "Taxi Premium", emoji: "🏎️", price: 12000, speed: 1.35, capacity: 4, comfort: 3, fuel: 1.3, maint: 40, color: "#fbbf24" },
  { id: "van", name: "Taxi 7 chỗ", emoji: "🚐", price: 9500, speed: 0.95, capacity: 7, comfort: 2, fuel: 1.4, maint: 35, color: "#c084fc" },
  { id: "electric", name: "Taxi Điện", emoji: "⚡", price: 15000, speed: 1.25, capacity: 4, comfort: 3, fuel: 0.3, maint: 20, color: "#10b981" },
  { id: "luxury", name: "Limousine", emoji: "🚘", price: 28000, speed: 1.5, capacity: 4, comfort: 5, fuel: 1.6, maint: 60, color: "#f472b6" },
  { id: "suv", name: "Taxi SUV", emoji: "🚙", price: 18000, speed: 1.2, capacity: 6, comfort: 3, fuel: 1.5, maint: 45, color: "#60a5fa" },
  { id: "hyper", name: "Hyper Taxi", emoji: "🚀", price: 50000, speed: 2.0, capacity: 2, comfort: 5, fuel: 2.0, maint: 100, color: "#f43f5e" }
];

export const DRIVER_NAMES = [
  "Minh", "Hùng", "Tuấn", "Nam", "Đức", "Hải", "Long", "Phong", "Quang", "Khoa",
  "An", "Bình", "Cường", "Dũng", "Em", "Giang", "Hoàng", "Khánh", "Lâm", "Mạnh",
  "Nghĩa", "Phúc", "Quân", "Sơn", "Thắng", "Uyên", "Vinh", "Xuân", "Yến", "Zung",
  "Hạnh", "Lan", "Mai", "Nga", "Oanh", "Phương", "Quyên", "Trang", "Uyển", "Vy"
];

export const ZONES = [
  { id: "center", name: "Trung tâm", emoji: "🏢", baseDemand: 1.4, peak: [8, 9, 17, 18, 19], avgFare: 18 },
  { id: "airport", name: "Sân bay", emoji: "✈️", baseDemand: 1.1, peak: [6, 7, 10, 14, 20], avgFare: 45 },
  { id: "university", name: "Đại học", emoji: "🎓", baseDemand: 0.9, peak: [7, 8, 11, 16, 17], avgFare: 12 },
  { id: "residential", name: "Khu dân cư", emoji: "🏠", baseDemand: 1.0, peak: [7, 8, 18, 19, 20], avgFare: 15 },
  { id: "nightlife", name: "Khu vui chơi", emoji: "🌃", baseDemand: 0.7, peak: [20, 21, 22, 23, 0], avgFare: 22 },
  { id: "industrial", name: "Khu công nghiệp", emoji: "🏭", baseDemand: 0.85, peak: [6, 7, 16, 17], avgFare: 20 },
  { id: "beach", name: "Bãi biển", emoji: "🏖️", baseDemand: 0.8, peak: [10, 11, 14, 15, 16], avgFare: 25 },
  { id: "hospital", name: "Bệnh viện", emoji: "🏥", baseDemand: 1.0, peak: [7, 8, 12, 17, 18], avgFare: 16 }
];

export const UPGRADES = [
  { id: "app", name: "App đặt xe", desc: "+15% số chuyến mỗi giờ", price: 8000, effect: { rides: 0.15 }, icon: "📱" },
  { id: "gps", name: "Hệ thống GPS", desc: "+10% tốc độ hoàn thành chuyến", price: 5000, effect: { speed: 0.1 }, icon: "🛰️" },
  { id: "ads", name: "Quảng cáo online", desc: "+20% uy tín khi hoàn thành chuyến", price: 6000, effect: { rep: 0.2 }, icon: "📢" },
  { id: "fuel_deal", name: "Hợp đồng nhiên liệu", desc: "-25% chi phí nhiên liệu", price: 10000, effect: { fuel: -0.25 }, icon: "⛽" },
  { id: "workshop", name: "Xưởng bảo dưỡng", desc: "-30% chi phí sửa chữa", price: 12000, effect: { maint: -0.3 }, icon: "🔧" },
  { id: "training", name: "Trung tâm đào tạo", desc: "Tài xế mới +1 kỹ năng", price: 9000, effect: { skill: 1 }, icon: "📚" },
  { id: "vip", name: "Dịch vụ VIP", desc: "+25% giá cước trung bình", price: 15000, effect: { fare: 0.25 }, icon: "👑" },
  { id: "insurance", name: "Bảo hiểm toàn diện", desc: "Giảm 50% rủi ro sự cố", price: 7000, effect: { risk: -0.5 }, icon: "🛡️" },
  { id: "callcenter", name: "Tổng đài 24/7", desc: "+10% nhu cầu toàn thành phố", price: 11000, effect: { demand: 0.1 }, icon: "📞" },
  { id: "branding", name: "Thương hiệu mạnh", desc: "+15% uy tín tối đa hiệu quả", price: 14000, effect: { rep: 0.15, fare: 0.05 }, icon: "🏷️" }
];

export const ACHIEVEMENTS = [
  { id: "first_taxi", name: "Chuyến xe đầu tiên", desc: "Mua chiếc taxi đầu tiên", reward: 500, check: g => g.fleet.length >= 1 },
  { id: "fleet_5", name: "Đội xe nhỏ", desc: "Sở hữu 5 xe", reward: 1500, check: g => g.fleet.length >= 5 },
  { id: "fleet_15", name: "Đội xe lớn", desc: "Sở hữu 15 xe", reward: 5000, check: g => g.fleet.length >= 15 },
  { id: "fleet_30", name: "Đế chế vận tải", desc: "Sở hữu 30 xe", reward: 15000, check: g => g.fleet.length >= 30 },
  { id: "rich_10k", name: "Triệu phú nhỏ", desc: "Có $10,000", reward: 1000, check: g => g.money >= 10000 },
  { id: "rich_50k", name: "Doanh nhân", desc: "Có $50,000", reward: 3000, check: g => g.money >= 50000 },
  { id: "rich_200k", name: "Ông trùm taxi", desc: "Có $200,000", reward: 10000, check: g => g.money >= 200000 },
  { id: "rich_1m", name: "Tỷ phú", desc: "Có $1,000,000", reward: 50000, check: g => g.money >= 1000000 },
  { id: "rep_80", name: "Uy tín cao", desc: "Đạt uy tín 80", reward: 2000, check: g => g.reputation >= 80 },
  { id: "rep_100", name: "Huyền thoại", desc: "Đạt uy tín tối đa 100", reward: 5000, check: g => g.reputation >= 100 },
  { id: "rides_100", name: "100 chuyến", desc: "Hoàn thành 100 chuyến", reward: 1500, check: g => g.totalRides >= 100 },
  { id: "rides_500", name: "500 chuyến", desc: "Hoàn thành 500 chuyến", reward: 4000, check: g => g.totalRides >= 500 },
  { id: "rides_2000", name: "2000 chuyến", desc: "Hoàn thành 2000 chuyến", reward: 12000, check: g => g.totalRides >= 2000 },
  { id: "drivers_10", name: "Đội ngũ mạnh", desc: "Thuê 10 tài xế", reward: 2500, check: g => g.drivers.length >= 10 },
  { id: "drivers_25", name: "Công ty lớn", desc: "Thuê 25 tài xế", reward: 8000, check: g => g.drivers.length >= 25 },
  { id: "level_5", name: "Cấp 5", desc: "Đạt cấp công ty 5", reward: 3000, check: g => g.level >= 5 },
  { id: "level_10", name: "Cấp 10", desc: "Đạt cấp công ty 10", reward: 8000, check: g => g.level >= 10 },
  { id: "level_20", name: "Cấp 20", desc: "Đạt cấp công ty 20", reward: 20000, check: g => g.level >= 20 },
  { id: "day_30", name: "Một tháng", desc: "Chơi 30 ngày", reward: 5000, check: g => g.day >= 30 },
  { id: "day_100", name: "Trăm ngày", desc: "Chơi 100 ngày", reward: 15000, check: g => g.day >= 100 },
  { id: "all_upgrades", name: "Công nghệ đỉnh", desc: "Mua hết tất cả nâng cấp", reward: 10000, check: g => g.upgrades.length >= 10 },
  { id: "daily_7", name: "Chăm chỉ", desc: "Nhận thưởng hàng ngày 7 lần", reward: 3000, check: g => (g.dailyStreak || 0) >= 7 },
  { id: "hyper_own", name: "Tốc độ ánh sáng", desc: "Sở hữu Hyper Taxi", reward: 5000, check: g => g.fleet.some(t => t.typeId === "hyper") }
];

export const EVENTS = [
  { id: "rain", name: "🌧️ Mưa lớn", desc: "Nhu cầu +40%, tốc độ -15%", duration: 4, effect: { demand: 0.4, speed: -0.15 } },
  { id: "festival", name: "🎉 Lễ hội", desc: "Nhu cầu tăng mạnh", duration: 6, effect: { demand: 0.5 } },
  { id: "traffic", name: "🚦 Tắc đường", desc: "Tốc độ -25%", duration: 3, effect: { speed: -0.25 } },
  { id: "fuel_crisis", name: "⛽ Khủng hoảng nhiên liệu", desc: "Chi phí nhiên liệu +50%", duration: 5, effect: { fuel: 0.5 } },
  { id: "vip_visit", name: "🌟 VIP đến thành phố", desc: "Giá cước +30%", duration: 4, effect: { fare: 0.3 } },
  { id: "competitor", name: "⚔️ Đối thủ giảm giá", desc: "Nhu cầu -20%", duration: 5, effect: { demand: -0.2 } },
  { id: "good_weather", name: "☀️ Thời tiết đẹp", desc: "Ít sự cố hơn", duration: 8, effect: { risk: -0.3 } },
  { id: "strike", name: "✊ Đình công", desc: "Tài xế làm việc chậm hơn", duration: 3, effect: { speed: -0.2, rides: -0.15 } },
  { id: "tourism", name: "📷 Mùa du lịch", desc: "Nhu cầu sân bay & biển +60%", duration: 7, effect: { demand: 0.25, fare: 0.1 } },
  { id: "blackout", name: "💡 Mất điện", desc: "Nhu cầu khu trung tâm giảm", duration: 2, effect: { demand: -0.15 } }
];

export const DAILY_REWARDS = [
  { day: 1, money: 500, xp: 20 },
  { day: 2, money: 800, xp: 30 },
  { day: 3, money: 1200, xp: 40 },
  { day: 4, money: 1800, xp: 50 },
  { day: 5, money: 2500, xp: 70 },
  { day: 6, money: 3500, xp: 90 },
  { day: 7, money: 6000, xp: 150 }
];
