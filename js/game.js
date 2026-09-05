// Taxi Tycoon v2.0.0 — Core Game Logic
import { CAR_TYPES, DRIVER_NAMES, ZONES, UPGRADES, ACHIEVEMENTS, EVENTS, DAILY_REWARDS } from "./game-data.js";
import { saveGameCloud, loadGameCloud, getLeaderboard, getCurrentUser } from "./auth.js";
import { APP_VERSION } from "./firebase-config.js";

export function createDefaultGame() {
  const zoneDemand = {};
  ZONES.forEach(z => { zoneDemand[z.id] = z.baseDemand; });
  return {
    money: 5000,
    reputation: 50,
    day: 1,
    hour: 8,
    minute: 0,
    level: 1,
    xp: 0,
    xpNeeded: 100,
    fleet: [],
    drivers: [],
    upgrades: [],
    achievements: [],
    totalRides: 0,
    totalIncome: 0,
    totalExpense: 0,
    todayIncome: 0,
    todayGoal: 500,
    speed: 1,
    paused: false,
    nextTaxiId: 1,
    nextDriverId: 1,
    activeEvents: [],
    rideHistory: [],
    incomeHistory: [],
    zoneDemand,
    companyName: "Công ty Taxi của tôi",
    dailyStreak: 0,
    lastDailyClaim: null,
    lastSave: Date.now(),
    version: APP_VERSION,
    // v2.1+ features
    bank: 0,
    bankLastInterestDay: 0,
    prestige: 0,
    prestigeMult: 1,
    missions: [],
    missionsDay: 0,
    missionsCompleted: 0,
    contracts: [],
    soundEnabled: true,
    lastOnline: Date.now(),
    totalOfflineEarned: 0,
    insuranceClaims: 0,
    adsBoostUntil: 0,
    loanDebt: 0
  };
}

let game = createDefaultGame();
let tickInterval = null;
let uiCallbacks = {};

export function getGame() { return game; }

export function setUICallbacks(cbs) {
  uiCallbacks = cbs;
}

const fmt = n => {
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "k";
  return "$" + Math.floor(n).toLocaleString("en-US");
};
export { fmt };

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;

function notify(msg, type = "info") {
  if (uiCallbacks.toast) uiCallbacks.toast(msg, type);
}
function feed(msg, type = "event") {
  if (uiCallbacks.addFeed) uiCallbacks.addFeed(msg, type);
}
function onRender() {
  if (uiCallbacks.render) uiCallbacks.render();
}
function onUpdateUI() {
  if (uiCallbacks.updateUI) uiCallbacks.updateUI();
}
function onAchievement(ach) {
  if (uiCallbacks.showAchievement) uiCallbacks.showAchievement(ach);
}

function getUpgradeEffect(key) {
  let val = 0;
  game.upgrades.forEach(uid => {
    const u = UPGRADES.find(x => x.id === uid);
    if (u && u.effect[key] !== undefined) val += u.effect[key];
  });
  game.activeEvents.forEach(ev => {
    if (ev.effect[key] !== undefined) val += ev.effect[key];
  });
  return val;
}

function calcXPNeeded(level) {
  return Math.floor(100 * Math.pow(1.35, level - 1));
}

function addXP(amount) {
  game.xp += amount;
  while (game.xp >= game.xpNeeded) {
    game.xp -= game.xpNeeded;
    game.level++;
    game.xpNeeded = calcXPNeeded(game.level);
    notify(`🎉 Công ty lên cấp ${game.level}!`, "success");
    feed(`Công ty đạt cấp ${game.level}!`, "event");
    game.money += game.level * 500;
  }
  checkAchievements();
}

function checkAchievements() {
  ACHIEVEMENTS.forEach(ach => {
    if (game.achievements.includes(ach.id)) return;
    if (ach.check(game)) {
      game.achievements.push(ach.id);
      game.money += ach.reward;
      onAchievement(ach);
      feed(`🏆 Thành tựu: ${ach.name} (+${fmt(ach.reward)})`, "income");
      notify(`🏆 ${ach.name} — +${fmt(ach.reward)}`, "success");
    }
  });
}

// ---------- Actions ----------
export function buyTaxi(typeId) {
  const type = CAR_TYPES.find(c => c.id === typeId);
  if (!type) return false;
  if (game.money < type.price) {
    notify("Không đủ tiền!", "error");
    return false;
  }
  game.money -= type.price;
  game.totalExpense += type.price;
  const taxi = {
    id: game.nextTaxiId++,
    typeId: type.id,
    name: type.name,
    emoji: type.emoji,
    condition: 100,
    mileage: 0,
    assignedDriver: null,
    assignedZone: "center",
    status: "idle",
    earnings: 0,
    rides: 0
  };
  game.fleet.push(taxi);
  feed(`Đã mua ${type.emoji} ${type.name}`, "expense");
  notify(`Đã mua ${type.name}!`, "success");
  addXP(15);
  updateMissionProgress("fleet");
  saveGameQuick();
  onRender();
  checkAchievements();
  return true;
}

export function hireDriver() {
  const cost = 800 + game.drivers.length * 150;
  if (game.money < cost) {
    notify("Không đủ tiền thuê tài xế!", "error");
    return false;
  }
  game.money -= cost;
  game.totalExpense += cost;
  const skill = 1 + Math.floor(Math.random() * 3) + (game.upgrades.includes("training") ? 1 : 0);
  const driver = {
    id: game.nextDriverId++,
    name: pick(DRIVER_NAMES) + " " + String.fromCharCode(65 + Math.floor(Math.random() * 26)),
    skill: clamp(skill, 1, 5),
    mood: 70 + Math.floor(Math.random() * 20),
    salary: 80 + skill * 25,
    assignedTaxi: null,
    totalRides: 0,
    totalEarnings: 0,
    hiredDay: game.day
  };
  game.drivers.push(driver);
  feed(`Thuê tài xế ${driver.name} (Kỹ năng ${driver.skill})`, "expense");
  notify(`Đã thuê ${driver.name}! · ${fmt(cost)}`, "success");
  addXP(10);
  saveGameQuick();
  onRender();
  checkAchievements();
  return true;
}

export function assignDriverToTaxi(driverId, taxiId) {
  const driver = game.drivers.find(d => d.id === driverId);
  const taxi = game.fleet.find(t => t.id === taxiId);
  if (!driver || !taxi) return;
  if (driver.assignedTaxi) {
    const old = game.fleet.find(t => t.id === driver.assignedTaxi);
    if (old) old.assignedDriver = null;
  }
  if (taxi.assignedDriver) {
    const oldD = game.drivers.find(d => d.id === taxi.assignedDriver);
    if (oldD) oldD.assignedTaxi = null;
  }
  driver.assignedTaxi = taxi.id;
  taxi.assignedDriver = driver.id;
  notify(`Gán ${driver.name} → ${taxi.emoji}`, "info");
  onRender();
}

export function assignZone(taxiId, zoneId) {
  const taxi = game.fleet.find(t => t.id === taxiId);
  if (taxi) {
    taxi.assignedZone = zoneId;
    const z = ZONES.find(x => x.id === zoneId);
    notify(`Chuyển xe đến ${z?.name}`, "info");
    onRender();
  }
}

export function repairTaxi(taxiId) {
  const taxi = game.fleet.find(t => t.id === taxiId);
  if (!taxi) return;
  const type = CAR_TYPES.find(c => c.id === taxi.typeId);
  const baseCost = (100 - taxi.condition) * type.maint * 0.4;
  const cost = Math.floor(baseCost * (1 + getUpgradeEffect("maint")));
  if (game.money < cost) {
    notify("Không đủ tiền sửa xe!", "error");
    return;
  }
  game.money -= cost;
  game.totalExpense += cost;
  taxi.condition = 100;
  taxi.status = "idle";
  feed(`Sửa chữa ${taxi.emoji} #${taxi.id} (-${fmt(cost)})`, "expense");
  notify("Xe đã được sửa chữa!", "success");
  onRender();
}

export function sellTaxi(taxiId) {
  const taxi = game.fleet.find(t => t.id === taxiId);
  if (!taxi) return;
  const type = CAR_TYPES.find(c => c.id === taxi.typeId);
  const value = Math.floor(type.price * 0.5 * (taxi.condition / 100));
  if (taxi.assignedDriver) {
    const d = game.drivers.find(x => x.id === taxi.assignedDriver);
    if (d) d.assignedTaxi = null;
  }
  game.money += value;
  game.fleet = game.fleet.filter(t => t.id !== taxiId);
  feed(`Bán ${taxi.emoji} #${taxi.id} (+${fmt(value)})`, "income");
  notify(`Đã bán xe, nhận ${fmt(value)}`, "success");
  saveGameQuick();
  onRender();
}

export function fireDriver(driverId) {
  const d = game.drivers.find(x => x.id === driverId);
  if (!d) return;
  if (d.assignedTaxi) {
    const t = game.fleet.find(x => x.id === d.assignedTaxi);
    if (t) t.assignedDriver = null;
  }
  game.drivers = game.drivers.filter(x => x.id !== driverId);
  notify("Đã sa thải tài xế", "info");
  onRender();
}

export function buyUpgrade(upgradeId) {
  if (game.upgrades.includes(upgradeId)) {
    notify("Đã sở hữu nâng cấp này!", "info");
    return;
  }
  const u = UPGRADES.find(x => x.id === upgradeId);
  if (!u) return;
  if (game.money < u.price) {
    notify("Không đủ tiền!", "error");
    return;
  }
  game.money -= u.price;
  game.totalExpense += u.price;
  game.upgrades.push(upgradeId);
  feed(`Nâng cấp: ${u.icon} ${u.name}`, "expense");
  notify(`Đã mua ${u.name}!`, "success");
  addXP(25);
  saveGameQuick();
  onRender();
  checkAchievements();
}

export function setCompanyName(name) {
  game.companyName = name.slice(0, 40) || "Công ty Taxi của tôi";
  onRender();
}

export function setSpeed(s) {
  game.speed = s;
}

export function togglePause() {
  game.paused = !game.paused;
  return game.paused;
}

export function claimDailyReward() {
  const today = new Date().toDateString();
  if (game.lastDailyClaim === today) {
    notify("Bạn đã nhận thưởng hôm nay rồi!", "info");
    return false;
  }
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (game.lastDailyClaim === yesterday) {
    game.dailyStreak = (game.dailyStreak || 0) + 1;
  } else {
    game.dailyStreak = 1;
  }
  const idx = Math.min((game.dailyStreak - 1) % 7, 6);
  const reward = DAILY_REWARDS[idx];
  game.money += reward.money;
  addXP(reward.xp);
  game.lastDailyClaim = today;
  notify(`🎁 Thưởng ngày ${game.dailyStreak}: +${fmt(reward.money)} +${reward.xp}XP`, "success");
  feed(`Nhận thưởng hàng ngày (streak ${game.dailyStreak})`, "income");
  checkAchievements();
  saveGameQuick();
  onRender();
  return true;
}

export function canClaimDaily() {
  return game.lastDailyClaim !== new Date().toDateString();
}

// ---------- Simulation ----------
function getCurrentDemand(zone) {
  let demand = zone.baseDemand;
  if (zone.peak.includes(game.hour)) demand *= 1.6;
  if (game.hour >= 1 && game.hour <= 5 && zone.id !== "nightlife") demand *= 0.35;
  demand *= 0.7 + game.reputation / 200;
  demand *= 1 + getUpgradeEffect("demand");
  // Ad boost
  if (game.adsBoostUntil && (game.day * 24 + game.hour) < game.adsBoostUntil) {
    demand *= 1.3;
  }
  demand *= rand(0.85, 1.15);
  return clamp(demand, 0.1, 3.5);
}

function simulateTick() {
  if (game.paused) return;

  game.minute += game.speed * 2;
  if (game.minute >= 60) {
    game.minute = 0;
    game.hour++;
    if (game.hour >= 24) {
      game.hour = 0;
      endOfDay();
    }
    game.incomeHistory.push(game.todayIncome);
    if (game.incomeHistory.length > 24) game.incomeHistory.shift();
  }

  ZONES.forEach(z => {
    game.zoneDemand[z.id] = getCurrentDemand(z);
  });

  game.fleet.forEach(taxi => {
    if (taxi.status === "repair") return;
    if (taxi.condition < 15) {
      taxi.status = "repair";
      feed(`${taxi.emoji} #${taxi.id} hỏng nặng, cần sửa!`, "expense");
      return;
    }

    const driver = game.drivers.find(d => d.id === taxi.assignedDriver);
    if (!driver) {
      taxi.status = "idle";
      return;
    }

    const zone = ZONES.find(z => z.id === taxi.assignedZone) || ZONES[0];
    const demand = game.zoneDemand[zone.id] || 1;
    const type = CAR_TYPES.find(c => c.id === taxi.typeId);
    const rideChance = 0.12 * demand * (1 + getUpgradeEffect("rides")) * (driver.skill / 3) * (driver.mood / 80);

    if (taxi.status === "idle" && chance(rideChance)) {
      taxi.status = "busy";
      const fareMult = 1 + getUpgradeEffect("fare") + (type.comfort - 1) * 0.08;
      const baseFare = zone.avgFare * fareMult * rand(0.85, 1.25);
      const skillBonus = 1 + (driver.skill - 1) * 0.06;
      const duration = Math.floor(rand(8, 22) / (type.speed * (1 + getUpgradeEffect("speed"))));
      taxi.ride = {
        fare: Math.floor(baseFare * skillBonus),
        duration,
        remaining: duration,
        zone: zone.id
      };
    }

    if (taxi.status === "busy" && taxi.ride) {
      taxi.ride.remaining -= game.speed;
      if (taxi.ride.remaining <= 0) {
        const income = Math.floor(taxi.ride.fare * (game.prestigeMult || 1));
        game.money += income;
        game.todayIncome += income;
        game.totalIncome += income;
        taxi.earnings += income;
        taxi.rides++;
        taxi.mileage += rand(5, 25);
        driver.totalRides++;
        driver.totalEarnings += income;
        game.totalRides++;

        const wear = rand(0.3, 1.2) * (1 + getUpgradeEffect("risk") * -0.5);
        taxi.condition = clamp(taxi.condition - wear, 0, 100);

        const fuelCost = Math.floor(type.fuel * rand(2, 6) * (1 + getUpgradeEffect("fuel")));
        game.money -= fuelCost;
        game.totalExpense += fuelCost;

        let rating = 3 + Math.random() * 1.5 + (type.comfort - 1) * 0.3 + (driver.skill - 2) * 0.2;
        if (taxi.condition < 40) rating -= 0.8;
        rating = clamp(rating, 1, 5);
        const repChange = (rating - 3) * 0.4 * (1 + getUpgradeEffect("rep"));
        game.reputation = clamp(game.reputation + repChange, 0, 100);
        driver.mood = clamp(driver.mood + rand(-2, 4), 20, 100);

        game.rideHistory.unshift({
          time: `Ngày ${game.day} ${String(game.hour).padStart(2, "0")}:${String(Math.floor(game.minute)).padStart(2, "0")}`,
          zone: zone.name,
          driver: driver.name,
          income,
          rating: rating.toFixed(1)
        });
        if (game.rideHistory.length > 40) game.rideHistory.pop();

        feed(`${taxi.emoji} ${driver.name} · +${fmt(income)} · ⭐${rating.toFixed(1)}`, "income");
        addXP(2 + Math.floor(income / 30));
        updateMissionProgress("rides", 1);
        updateMissionProgress("earn");
        updateMissionProgress("zone_rides", 1, { zoneId: zone.id });
        updateMissionProgress("rep");

        taxi.status = "idle";
        taxi.ride = null;

        if (chance(0.012)) triggerRandomEvent();
      }
    }
  });

  if (chance(0.006)) {
    const msgs = [
      "Khách hàng khen ngợi dịch vụ!",
      "Tài xế tìm thấy ví khách và trả lại.",
      "Xe bị kẹt nhẹ vài phút.",
      "Khách để quên đồ, đã liên hệ trả."
    ];
    feed(pick(msgs), "event");
  }

  onUpdateUI();
}

function endOfDay() {
  game.day++;
  let salaryTotal = 0;
  game.drivers.forEach(d => {
    salaryTotal += d.salary;
    if (d.totalRides === 0) d.mood = clamp(d.mood - 5, 20, 100);
  });
  if (salaryTotal > 0) {
    game.money -= salaryTotal;
    game.totalExpense += salaryTotal;
    feed(`Trả lương tài xế: -${fmt(salaryTotal)}`, "expense");
  }

  let maintTotal = 0;
  game.fleet.forEach(t => {
    const type = CAR_TYPES.find(c => c.id === t.typeId);
    const cost = Math.floor(type.maint * 0.3 * (1 + getUpgradeEffect("maint")));
    maintTotal += cost;
  });
  if (maintTotal > 0) {
    game.money -= maintTotal;
    game.totalExpense += maintTotal;
    feed(`Bảo dưỡng hàng ngày: -${fmt(maintTotal)}`, "expense");
  }

  if (game.todayIncome >= game.todayGoal) {
    const bonus = Math.floor(game.todayGoal * 0.15);
    game.money += bonus;
    addXP(30);
    notify(`🎯 Hoàn thành mục tiêu ngày! +${fmt(bonus)}`, "success");
  }

  game.todayGoal = Math.floor(500 + game.level * 200 + game.fleet.length * 80);
  game.todayIncome = 0;

  game.activeEvents = game.activeEvents.filter(e => {
    e.remaining--;
    return e.remaining > 0;
  });

  if (chance(0.25) && game.activeEvents.length < 2) triggerRandomEvent();
  if (game.totalRides === 0) game.reputation = clamp(game.reputation - 1, 0, 100);

  applyBankInterest();
  // loan daily interest if unpaid
  if (game.loanDebt > 0) {
    const fee = Math.floor(game.loanDebt * 0.01);
    game.loanDebt += fee;
    feed(`💳 Phí nợ vay: +${fmt(fee)}`, "expense");
  }
  ensureMissions();
  feed(`--- Ngày ${game.day} bắt đầu ---`, "event");
  checkAchievements();
  saveGame();
}

function triggerRandomEvent() {
  const available = EVENTS.filter(e => !game.activeEvents.find(a => a.id === e.id));
  if (!available.length) return;
  const ev = pick(available);
  game.activeEvents.push({ ...ev, remaining: ev.duration });
  feed(`${ev.name}: ${ev.desc}`, "event");
  notify(ev.name, "info");
  onUpdateUI();
}


// ---------- Bank / Missions / Prestige / Offline ----------
const MISSION_TEMPLATES = [
  { id: "rides", label: "Hoàn thành {n} chuyến", type: "rides", min: 5, max: 20, rewardMoney: 800, rewardXP: 40 },
  { id: "earn", label: "Kiếm ${n} hôm nay", type: "earn", min: 300, max: 2000, rewardMoney: 600, rewardXP: 30 },
  { id: "zone", label: "Chạy {n} chuyến khu {zone}", type: "zone_rides", min: 3, max: 10, rewardMoney: 700, rewardXP: 35 },
  { id: "fleet", label: "Sở hữu {n} xe", type: "fleet", min: 2, max: 8, rewardMoney: 1000, rewardXP: 50 },
  { id: "rep", label: "Đạt uy tín {n}", type: "rep", min: 55, max: 90, rewardMoney: 900, rewardXP: 45 }
];

function ensureMissions() {
  if (game.missionsDay === game.day && game.missions && game.missions.length) return;
  game.missionsDay = game.day;
  const used = new Set();
  game.missions = [];
  for (let i = 0; i < 3; i++) {
    let t = pick(MISSION_TEMPLATES);
    let tries = 0;
    while (used.has(t.id) && tries < 10) { t = pick(MISSION_TEMPLATES); tries++; }
    used.add(t.id);
    const n = Math.floor(rand(t.min, t.max + 1));
    const zone = pick(ZONES);
    const mission = {
      id: t.id + "_" + i + "_" + game.day,
      type: t.type,
      label: t.label.replace("{n}", n).replace("{zone}", zone.name).replace("${n}", n),
      target: n,
      progress: 0,
      zoneId: zone.id,
      rewardMoney: Math.floor(t.rewardMoney * (1 + game.level * 0.05) * (game.prestigeMult || 1)),
      rewardXP: t.rewardXP + game.level,
      done: false,
      claimed: false
    };
    // seed progress from current state
    if (t.type === "fleet") mission.progress = game.fleet.length;
    if (t.type === "rep") mission.progress = Math.floor(game.reputation);
    if (t.type === "earn") mission.progress = Math.floor(game.todayIncome);
    game.missions.push(mission);
  }
}

function updateMissionProgress(type, amount = 1, extra = {}) {
  ensureMissions();
  game.missions.forEach(m => {
    if (m.done || m.claimed) return;
    if (m.type === "rides" && type === "rides") m.progress += amount;
    if (m.type === "earn" && type === "earn") m.progress = Math.floor(game.todayIncome);
    if (m.type === "zone_rides" && type === "zone_rides" && extra.zoneId === m.zoneId) m.progress += amount;
    if (m.type === "fleet" && type === "fleet") m.progress = game.fleet.length;
    if (m.type === "rep" && type === "rep") m.progress = Math.floor(game.reputation);
    if (m.progress >= m.target) {
      m.progress = m.target;
      m.done = true;
    }
  });
}

export function claimMission(missionId) {
  ensureMissions();
  const m = game.missions.find(x => x.id === missionId);
  if (!m || !m.done || m.claimed) {
    notify("Nhiệm vụ chưa hoàn thành!", "error");
    return false;
  }
  m.claimed = true;
  game.money += m.rewardMoney;
  addXP(m.rewardXP);
  game.missionsCompleted = (game.missionsCompleted || 0) + 1;
  notify(`✅ Nhận thưởng nhiệm vụ: +${fmt(m.rewardMoney)}`, "success");
  feed(`Hoàn thành nhiệm vụ: ${m.label}`, "income");
  saveGameQuick();
  onRender();
  return true;
}

export function getMissions() {
  ensureMissions();
  return game.missions;
}

export function bankDeposit(amount) {
  amount = Math.floor(amount);
  if (amount <= 0 || game.money < amount) {
    notify("Không đủ tiền gửi!", "error");
    return false;
  }
  game.money -= amount;
  game.bank = (game.bank || 0) + amount;
  notify(`Đã gửi ${fmt(amount)} vào ngân hàng`, "success");
  saveGameQuick();
  onRender();
  return true;
}

export function bankWithdraw(amount) {
  amount = Math.floor(amount);
  if (amount <= 0 || (game.bank || 0) < amount) {
    notify("Không đủ tiền trong ngân hàng!", "error");
    return false;
  }
  game.bank -= amount;
  game.money += amount;
  notify(`Đã rút ${fmt(amount)}`, "success");
  saveGameQuick();
  onRender();
  return true;
}

function applyBankInterest() {
  if (!game.bank || game.bank <= 0) return;
  if (game.bankLastInterestDay === game.day) return;
  // 2% per day
  const interest = Math.floor(game.bank * 0.02);
  if (interest > 0) {
    game.bank += interest;
    feed(`🏦 Lãi ngân hàng: +${fmt(interest)}`, "income");
  }
  game.bankLastInterestDay = game.day;
}

export function trainDriver(driverId) {
  const d = game.drivers.find(x => x.id === driverId);
  if (!d) return false;
  if (d.skill >= 5) {
    notify("Tài xế đã đạt kỹ năng tối đa!", "info");
    return false;
  }
  const cost = 500 * d.skill * d.skill;
  if (game.money < cost) {
    notify(`Cần ${fmt(cost)} để đào tạo!`, "error");
    return false;
  }
  game.money -= cost;
  game.totalExpense += cost;
  d.skill = Math.min(5, d.skill + 1);
  d.salary = 80 + d.skill * 25;
  notify(`${d.name} lên kỹ năng ${d.skill}!`, "success");
  feed(`Đào tạo ${d.name} → Lv${d.skill} (-${fmt(cost)})`, "expense");
  saveGameQuick();
  onRender();
  return true;
}

export function takeLoan(amount) {
  amount = Math.floor(amount);
  if (amount < 1000 || amount > 50000) {
    notify("Khoản vay từ $1,000 đến $50,000", "error");
    return false;
  }
  if ((game.loanDebt || 0) > 0) {
    notify("Hãy trả hết nợ cũ trước!", "error");
    return false;
  }
  game.money += amount;
  game.loanDebt = Math.floor(amount * 1.15); // 15% interest
  notify(`Vay ${fmt(amount)} — nợ ${fmt(game.loanDebt)}`, "info");
  feed(`💳 Vay ngân hàng ${fmt(amount)}`, "income");
  saveGameQuick();
  onRender();
  return true;
}

export function repayLoan() {
  const debt = game.loanDebt || 0;
  if (debt <= 0) {
    notify("Không có nợ!", "info");
    return false;
  }
  if (game.money < debt) {
    notify(`Cần ${fmt(debt)} để trả nợ!`, "error");
    return false;
  }
  game.money -= debt;
  game.loanDebt = 0;
  notify("Đã trả hết nợ!", "success");
  feed(`💳 Trả nợ ${fmt(debt)}`, "expense");
  saveGameQuick();
  onRender();
  return true;
}

export function buyAdBoost() {
  const cost = 2000 + game.level * 200;
  if (game.money < cost) {
    notify("Không đủ tiền quảng cáo!", "error");
    return false;
  }
  game.money -= cost;
  // boost for 8 game-hours equivalent stored as timestamp of game day*24+hour
  game.adsBoostUntil = game.day * 24 + game.hour + 8;
  notify("📢 Quảng cáo kích hoạt 8 giờ game!", "success");
  feed(`Quảng cáo (+30% nhu cầu) · -${fmt(cost)}`, "expense");
  saveGameQuick();
  onRender();
  return true;
}

export function doPrestige() {
  if (game.level < 15) {
    notify("Cần đạt cấp 15 để Prestige!", "error");
    return false;
  }
  if (!confirm || true) {
    // caller may confirm
  }
  const bonus = 0.1 + Math.floor(game.level / 15) * 0.05;
  game.prestige = (game.prestige || 0) + 1;
  game.prestigeMult = 1 + (game.prestige * 0.1);
  // reset progress keep prestige
  const kept = {
    prestige: game.prestige,
    prestigeMult: game.prestigeMult,
    achievements: game.achievements,
    companyName: game.companyName,
    soundEnabled: game.soundEnabled,
    dailyStreak: game.dailyStreak,
    lastDailyClaim: game.lastDailyClaim,
    missionsCompleted: game.missionsCompleted
  };
  Object.assign(game, createDefaultGame(), kept);
  game.money = 8000 + game.prestige * 2000;
  notify(`✨ Prestige #${game.prestige}! x${game.prestigeMult.toFixed(1)} thu nhập`, "success");
  feed(`Prestige lần ${game.prestige}`, "event");
  saveGameQuick();
  onRender();
  return true;
}

export function getCompanyValue() {
  const fleetVal = game.fleet.reduce((s, t) => {
    const type = CAR_TYPES.find(c => c.id === t.typeId);
    return s + (type ? type.price * 0.5 * (t.condition / 100) : 0);
  }, 0);
  return Math.floor((game.money || 0) + (game.bank || 0) + fleetVal - (game.loanDebt || 0));
}

export function calcOfflineEarnings() {
  const now = Date.now();
  const last = game.lastOnline || now;
  const hoursAway = Math.min(12, (now - last) / 3600000); // max 12h
  game.lastOnline = now;
  if (hoursAway < 0.25) return 0; // less than 15 min
  const activeTaxis = game.fleet.filter(t => t.assignedDriver).length;
  if (activeTaxis <= 0) return 0;
  const rate = activeTaxis * 15 * (game.prestigeMult || 1) * (0.7 + game.reputation / 200);
  const earned = Math.floor(rate * hoursAway);
  if (earned > 0) {
    game.money += earned;
    game.totalOfflineEarned = (game.totalOfflineEarned || 0) + earned;
    game.totalIncome += earned;
    notify(`💤 Offline ${hoursAway.toFixed(1)}h · kiếm ${fmt(earned)}`, "success");
    feed(`Thu nhập offline: +${fmt(earned)}`, "income");
  }
  return earned;
}

export function toggleSound() {
  game.soundEnabled = !game.soundEnabled;
  notify(game.soundEnabled ? "🔊 Bật âm thanh" : "🔇 Tắt âm thanh", "info");
  return game.soundEnabled;
}


// ---------- Save / Load ----------
function storageKey() {
  const u = getCurrentUser();
  return u ? `taxiTycoon_v2_${u.uid}` : "taxiTycoon_v2_guest";
}

/** Clean object for Firebase (no undefined, no functions) */
function sanitizeState(state) {
  return JSON.parse(JSON.stringify(state));
}

function scoreSave(s) {
  if (!s) return -1;
  return (s.day || 0) * 1e9 + (s.totalRides || 0) * 1e4 + (s.money || 0) + (s.savedAt || 0) / 1e13;
}

function applyLoadedState(saved) {
  const fresh = createDefaultGame();
  Object.assign(game, fresh, saved);
  // Restore defaults for missing nested fields
  if (!game.zoneDemand) game.zoneDemand = {};
  ZONES.forEach(z => {
    if (game.zoneDemand[z.id] === undefined) game.zoneDemand[z.id] = z.baseDemand;
  });
  if (!Array.isArray(game.fleet)) game.fleet = [];
  if (!Array.isArray(game.drivers)) game.drivers = [];
  if (!Array.isArray(game.upgrades)) game.upgrades = [];
  if (!Array.isArray(game.achievements)) game.achievements = [];
  if (!Array.isArray(game.activeEvents)) game.activeEvents = [];
  if (!Array.isArray(game.rideHistory)) game.rideHistory = [];
  if (!Array.isArray(game.incomeHistory)) game.incomeHistory = [];
  game.paused = false;
  game.speed = game.speed || 1;
}

function saveLocal() {
  try {
    game.lastSave = Date.now();
    game.version = APP_VERSION;
    localStorage.setItem(storageKey(), JSON.stringify(game));
    // legacy key for migration
    localStorage.setItem("taxiTycoon_v2", JSON.stringify(game));
    return true;
  } catch (e) {
    console.error("Local save failed", e);
    return false;
  }
}

function loadLocal() {
  try {
    let raw = localStorage.getItem(storageKey());
    if (!raw) raw = localStorage.getItem("taxiTycoon_v2"); // migrate old key
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

let saveInFlight = false;
let pendingSave = false;

export async function saveGame(silent = false) {
  game.lastSave = Date.now();
  game.version = APP_VERSION;
  saveLocal();

  if (saveInFlight) {
    pendingSave = true;
    return false;
  }
  saveInFlight = true;
  try {
    const ok = await saveGameCloud(sanitizeState(game));
    if (!silent) {
      if (ok) notify("Đã lưu cloud ✓", "success");
      else notify("Đã lưu máy (cloud lỗi — kiểm tra Firebase Rules)", "info");
    }
    return ok;
  } finally {
    saveInFlight = false;
    if (pendingSave) {
      pendingSave = false;
      saveGame(true);
    }
  }
}

/** Quiet save after actions — local always, cloud debounced */
let cloudDebounce = null;
export function saveGameQuick() {
  saveLocal();
  clearTimeout(cloudDebounce);
  cloudDebounce = setTimeout(() => {
    saveGameCloud(sanitizeState(game)).catch(() => {});
  }, 2000);
}

export async function loadGame() {
  const local = loadLocal();
  let cloud = null;
  try {
    cloud = await loadGameCloud();
  } catch (e) {
    console.error("Cloud load error", e);
  }

  // Pick the more progressed save
  const best = scoreSave(cloud) >= scoreSave(local) ? cloud : local;
  if (best && scoreSave(best) > 0) {
    applyLoadedState(best);
    const src = best === cloud && scoreSave(cloud) >= scoreSave(local) ? "cloud" : "máy";
    notify(`Đã tải game từ ${src}! (Ngày ${game.day}, ${fmt(game.money)})`, "success");
    calcOfflineEarnings();
    ensureMissions();
    onRender();
    // Sync the other storage
    saveLocal();
    if (local && scoreSave(local) > scoreSave(cloud)) {
      saveGameCloud(sanitizeState(game)).catch(() => {});
    }
    return true;
  }

  return false;
}

export function startGameLoop() {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(simulateTick, 800);
}

export function stopGameLoop() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

export async function fetchLeaderboard() {
  return getLeaderboard(30);
}

// Auto-save every 20s
setInterval(() => {
  if (game.fleet.length > 0 || game.totalRides > 0 || game.day > 1 || game.money !== 5000) {
    saveLocal();
    saveGameCloud(sanitizeState(game)).catch(() => {});
  }
}, 20000);

// Save when leaving page
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    try {
      game.lastSave = Date.now();
      localStorage.setItem(storageKey(), JSON.stringify(game));
      localStorage.setItem("taxiTycoon_v2", JSON.stringify(game));
    } catch (e) {}
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveLocal();
  });
}

export { CAR_TYPES, DRIVER_NAMES, ZONES, UPGRADES, ACHIEVEMENTS, EVENTS, DAILY_REWARDS };
