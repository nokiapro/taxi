/**
 * Taxi Xanh - Core Game Logic
 * Quản lý đội xe taxi
 * Version: 2.0.0
 */

const Game = {
  now() {
    return (typeof nowMs === 'function') ? nowMs() : Date.now();
  },

  toMs(val) {
    if (val == null || val === '') return null;
    if (typeof val === 'number') return Number.isFinite(val) && val > 0 ? val : null;
    if (typeof val === 'string') {
      const n = Number(val);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    if (typeof val === 'object') {
      if (typeof val.toMillis === 'function') {
        try {
          const m = val.toMillis();
          return Number.isFinite(m) && m > 0 ? m : null;
        } catch (_) {}
      }
      if (val.seconds != null) {
        const sec = Number(val.seconds);
        const nano = Number(val.nanoseconds) || 0;
        if (Number.isFinite(sec)) return sec * 1000 + Math.floor(nano / 1e6);
      }
      if (val._seconds != null) {
        const sec = Number(val._seconds);
        const nano = Number(val._nanoseconds) || 0;
        if (Number.isFinite(sec)) return sec * 1000 + Math.floor(nano / 1e6);
      }
    }
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : null;
  },

  // ====================== GETTERS ======================
  getPlayer() { return currentPlayer; },

  getVehicles() { return currentVehicles && currentVehicles.length ? currentVehicles : DEFAULT_VEHICLES; },
  getVehicle(id) {
    if (id == null || id === '') return null;
    const s = String(id);
    return this.getVehicles().find(v => v && (v.id === id || String(v.id) === s)) || null;
  },

  getDrivers() { return DEFAULT_DRIVERS; },
  getDriver(id) { return DEFAULT_DRIVERS.find(d => d.id === id) || null; },

  getTrips() { return DEFAULT_TRIPS; },
  getTrip(id) { return DEFAULT_TRIPS.find(t => t.id === id) || null; },

  getFuels() { return DEFAULT_FUELS; },
  getFuel(id) { return DEFAULT_FUELS.find(f => f.id === id) || null; },

  getMaintenanceItems() { return DEFAULT_MAINTENANCE; },
  getMaintenance(id) { return DEFAULT_MAINTENANCE.find(m => m.id === id) || null; },

  getUpgrades() { return DEFAULT_UPGRADES; },
  getUpgrade(id) { return DEFAULT_UPGRADES.find(u => u.id === id) || null; },

  getSettings() { return currentSettings; },

  // Compatibility aliases
  getPlants() { return this.getVehicles(); },
  getPlant(id) { return this.getVehicle(id); },
  getFertilizer(id) { return this.getFuel(id); },
  getFertilizers() { return this.getFuels(); },

  // ====================== ECONOMY ======================
  isUnlimitedResources() {
    return !!(currentPlayer && currentPlayer.role === 'admin' && currentPlayer.unlimited);
  },

  canAfford(cost) {
    if (this.isUnlimitedResources()) return true;
    return (currentPlayer.coins || 0) >= cost;
  },

  chargeCoins(cost) {
    if (this.isUnlimitedResources()) return true;
    if ((currentPlayer.coins || 0) < cost) return false;
    currentPlayer.coins -= cost;
    if (!currentPlayer.stats) currentPlayer.stats = {};
    currentPlayer.stats.totalSpent = (currentPlayer.stats.totalSpent || 0) + cost;
    return true;
  },

  addCoins(amount) {
    currentPlayer.coins = (currentPlayer.coins || 0) + Math.floor(amount);
    if (!currentPlayer.stats) currentPlayer.stats = {};
    currentPlayer.stats.totalEarned = (currentPlayer.stats.totalEarned || 0) + Math.floor(amount);
  },

  // ====================== LEVEL & XP ======================
  xpForLevel(level) {
    return level * 80;
  },

  addXp(amount) {
    if (!currentPlayer || amount <= 0) return;
    currentPlayer.xp = (currentPlayer.xp || 0) + amount;
    let leveled = false;
    while (currentPlayer.xp >= this.xpForLevel(currentPlayer.level || 1)) {
      currentPlayer.xp -= this.xpForLevel(currentPlayer.level || 1);
      currentPlayer.level = (currentPlayer.level || 1) + 1;
      leveled = true;
      this.addCoins(150 * currentPlayer.level); // thưởng lên cấp
    }
    return leveled;
  },

  // ====================== SLOT / GARAGE MANAGEMENT ======================
  makeEmptyPlots(count) {
    const n = Math.max(1, count || (currentSettings && currentSettings.plotCount) || 4);
    return Array.from({ length: n }, (_, i) => ({
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
    }));
  },

  ensureGardens() {
    if (!currentPlayer) return;

    // Normalize gardens from Firebase object
    if (currentPlayer.gardens && !Array.isArray(currentPlayer.gardens) && typeof currentPlayer.gardens === 'object') {
      const keys = Object.keys(currentPlayer.gardens).sort((a, b) => Number(a) - Number(b));
      currentPlayer.gardens = keys.map(k => currentPlayer.gardens[k]);
    }

    if (!Array.isArray(currentPlayer.gardens) || !currentPlayer.gardens.length) {
      let plots = currentPlayer.plots;
      if (!Array.isArray(plots)) plots = Object.values(plots || {});
      if (!plots.length) plots = this.makeEmptyPlots();

      // Migrate old plant-based plots to vehicle-based
      plots = plots.map((p, i) => this.normalizePlot(p, i));
      currentPlayer.gardens = [plots];
      currentPlayer.plots = plots;
    } else {
      for (let gi = 0; gi < currentPlayer.gardens.length; gi++) {
        let g = currentPlayer.gardens[gi];
        let plots;
        if (Array.isArray(g)) {
          plots = g;
        } else if (g && Array.isArray(g.plots)) {
          plots = g.plots;
        } else if (g && typeof g === 'object') {
          const keys = Object.keys(g).filter(k => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
          plots = keys.length ? keys.map(k => g[k]) : [];
        } else {
          plots = [];
        }
        if (!plots.length) plots = this.makeEmptyPlots();
        plots = plots.map((p, i) => this.normalizePlot(p, i));
        currentPlayer.gardens[gi] = plots;
      }
    }

    // Deduplicate shared references
    if (Array.isArray(currentPlayer.gardens) && currentPlayer.gardens.length > 1) {
      const seen = new Map();
      for (let gi = 0; gi < currentPlayer.gardens.length; gi++) {
        const arr = currentPlayer.gardens[gi];
        if (!Array.isArray(arr)) continue;
        if (seen.has(arr)) {
          currentPlayer.gardens[gi] = arr.map((p, idx) => this.normalizePlot(Object.assign({}, p), idx));
        } else {
          seen.set(arr, gi);
        }
      }
    }

    if (typeof currentPlayer.activeGarden !== 'number' || currentPlayer.activeGarden < 0) {
      currentPlayer.activeGarden = 0;
    }
    if (currentPlayer.activeGarden >= currentPlayer.gardens.length) {
      currentPlayer.activeGarden = Math.max(0, currentPlayer.gardens.length - 1);
    }

    // Sync plots to active garden
    const active = currentPlayer.gardens[currentPlayer.activeGarden];
    if (Array.isArray(active)) {
      currentPlayer.plots = active;
    }

    this.refreshGardenUnlocks();
  },

  normalizePlot(p, idx) {
    if (!p || typeof p !== 'object') {
      return {
        id: idx,
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
      };
    }

    // Migrate old farming fields
    if (p.plantId && !p.vehicleId) {
      p.vehicleId = null; // clear old plant
      p.status = 'idle';
    }

    return {
      id: typeof p.id === 'number' ? p.id : idx,
      vehicleId: p.vehicleId || null,
      driverId: p.driverId || null,
      status: p.status || (p.vehicleId ? 'idle' : 'idle'),
      tripId: p.tripId || null,
      tripStartedAt: this.toMs(p.tripStartedAt) || null,
      tripDistance: Number(p.tripDistance) || 0,
      tripFare: Number(p.tripFare) || 0,
      tripBaseTime: Number(p.tripBaseTime) || 0,
      fuel: Number(p.fuel) || 0,
      condition: Math.min(150, Math.max(0, Number(p.condition) || 100)),
      totalTrips: Number(p.totalTrips) || 0,
      totalEarned: Number(p.totalEarned) || 0,
      lastActionAt: this.toMs(p.lastActionAt) || null
    };
  },

  refreshGardenUnlocks() {
    // Future: unlock more garages by level
  },

  getActivePlots() {
    this.ensureGardens();
    const gi = currentPlayer.activeGarden || 0;
    return currentPlayer.gardens[gi] || currentPlayer.plots || [];
  },

  getPlot(plotId) {
    const plots = this.getActivePlots();
    return plots.find(p => p && p.id === plotId) || plots[plotId] || null;
  },

  getGardenCount() {
    this.ensureGardens();
    return currentPlayer.gardens ? currentPlayer.gardens.length : 1;
  },

  getActiveGardenIndex() {
    return currentPlayer.activeGarden || 0;
  },

  switchGarden(index) {
    this.ensureGardens();
    if (index < 0 || index >= currentPlayer.gardens.length) return false;
    currentPlayer.activeGarden = index;
    currentPlayer.plots = currentPlayer.gardens[index];
    return true;
  },

  // ====================== BUY / ASSIGN VEHICLE ======================
  async buyVehicle(vehicleId, plotId) {
    const veh = this.getVehicle(vehicleId);
    if (!veh) return { ok: false, msg: 'Không tìm thấy loại xe!' };

    if ((currentPlayer.level || 1) < (veh.unlockLevel || 1)) {
      return { ok: false, msg: `Cần cấp ${veh.unlockLevel} để mua xe này!` };
    }

    if (!this.canAfford(veh.buyPrice)) {
      return { ok: false, msg: 'Không đủ tiền!' };
    }

    const plot = this.getPlot(plotId);
    if (!plot) return { ok: false, msg: 'Ô không hợp lệ!' };
    if (plot.vehicleId) return { ok: false, msg: 'Ô này đã có xe!' };

    this.chargeCoins(veh.buyPrice);

    plot.vehicleId = vehicleId;
    plot.status = 'idle';
    plot.fuel = Math.floor(veh.fuelCapacity * 0.6); // bắt đầu với 60% xăng
    plot.condition = veh.maxCondition || 100;
    plot.driverId = null;
    plot.tripId = null;
    plot.tripStartedAt = null;
    plot.lastActionAt = this.now();

    // Track owned
    if (!currentPlayer.inventory.vehiclesOwned) currentPlayer.inventory.vehiclesOwned = {};
    currentPlayer.inventory.vehiclesOwned[vehicleId] = (currentPlayer.inventory.vehiclesOwned[vehicleId] || 0) + 1;

    if (typeof savePlayer === 'function') await savePlayer();
    return { ok: true, msg: `Đã mua ${veh.name}!`, vehicle: veh };
  },

  async sellVehicle(plotId) {
    const plot = this.getPlot(plotId);
    if (!plot || !plot.vehicleId) return { ok: false, msg: 'Không có xe để bán!' };
    if (plot.status === 'on_trip') return { ok: false, msg: 'Xe đang chạy chuyến, không thể bán!' };

    const veh = this.getVehicle(plot.vehicleId);
    const refund = Math.floor((veh?.buyPrice || 0) * 0.5);

    this.addCoins(refund);
    plot.vehicleId = null;
    plot.driverId = null;
    plot.status = 'idle';
    plot.fuel = 0;
    plot.condition = 100;
    plot.tripId = null;
    plot.tripStartedAt = null;

    if (typeof savePlayer === 'function') await savePlayer();
    return { ok: true, msg: `Đã bán xe, nhận lại ${refund} xu.`, refund };
  },

  // ====================== DRIVERS ======================
  async hireDriver(driverId) {
    const driver = this.getDriver(driverId);
    if (!driver) return { ok: false, msg: 'Không tìm thấy tài xế!' };

    if ((currentPlayer.level || 1) < (driver.unlockLevel || 1)) {
      return { ok: false, msg: `Cần cấp ${driver.unlockLevel} để thuê tài xế này!` };
    }

    if (!this.canAfford(driver.hirePrice)) {
      return { ok: false, msg: 'Không đủ tiền thuê!' };
    }

    this.chargeCoins(driver.hirePrice);

    if (!currentPlayer.hiredDrivers) currentPlayer.hiredDrivers = [];
    const instance = {
      instanceId: 'd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      driverId: driver.id,
      stamina: driver.maxStamina,
      totalTrips: 0,
      skillBonus: 0,
      hiredAt: this.now()
    };
    currentPlayer.hiredDrivers.push(instance);

    if (typeof savePlayer === 'function') await savePlayer();
    return { ok: true, msg: `Đã thuê ${driver.name}!`, driver: instance };
  },

  async assignDriver(plotId, instanceId) {
    const plot = this.getPlot(plotId);
    if (!plot || !plot.vehicleId) return { ok: false, msg: 'Cần có xe trước!' };
    if (plot.status === 'on_trip') return { ok: false, msg: 'Xe đang chạy chuyến!' };

    const drivers = currentPlayer.hiredDrivers || [];
    const driverInst = drivers.find(d => d.instanceId === instanceId);
    if (!driverInst) return { ok: false, msg: 'Không tìm thấy tài xế!' };

    // Unassign from other plots
    const plots = this.getActivePlots();
    plots.forEach(p => {
      if (p.driverId === instanceId) p.driverId = null;
    });

    plot.driverId = instanceId;
    plot.lastActionAt = this.now();

    if (typeof savePlayer === 'function') await savePlayer();
    return { ok: true, msg: 'Đã gán tài xế cho xe!' };
  },

  getAvailableDrivers() {
    const hired = currentPlayer.hiredDrivers || [];
    const plots = this.getActivePlots();
    const assigned = new Set(plots.filter(p => p.driverId).map(p => p.driverId));
    return hired.filter(d => !assigned.has(d.instanceId));
  },

  // ====================== TRIP SYSTEM ======================
  generateTripForVehicle(plot) {
    const veh = this.getVehicle(plot.vehicleId);
    if (!veh) return null;

    const level = currentPlayer.level || 1;
    const availableTrips = DEFAULT_TRIPS.filter(t => {
      if ((t.unlockLevel || 1) > level) return false;
      if (t.types && !t.types.includes(veh.type)) return false;
      if (t.requireComfort && (veh.comfort || 0) < t.requireComfort) return false;
      if (t.requireCargo && !veh.canCargo) return false;
      return true;
    });

    if (!availableTrips.length) return null;

    // Weighted by demand
    let totalWeight = 0;
    const weights = availableTrips.map(t => {
      let w = t.demand || 1;
      if (this.isRushHour()) w *= 1.4;
      if (this.isRaining()) w *= 1.2;
      totalWeight += w;
      return w;
    });

    let r = Math.random() * totalWeight;
    let chosen = availableTrips[0];
    for (let i = 0; i < availableTrips.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        chosen = availableTrips[i];
        break;
      }
    }

    const distance = chosen.minDistance + Math.random() * (chosen.maxDistance - chosen.minDistance);
    const dist = Math.round(distance * 10) / 10;

    // Fare calculation
    let fare = veh.baseFare + dist * veh.farePerKm;
    if (this.isRushHour()) fare *= (DEFAULT_EVENTS.rushHour.fareMult || 1.25);
    if (chosen.tipBonus) fare *= chosen.tipBonus;
    fare = Math.round(fare);

    // Time calculation
    let baseTime = chosen.baseTime * (dist / ((chosen.minDistance + chosen.maxDistance) / 2));
    baseTime = baseTime / (veh.speed || 1);

    // Driver skill bonus
    if (plot.driverId) {
      const dInst = (currentPlayer.hiredDrivers || []).find(d => d.instanceId === plot.driverId);
      if (dInst) {
        const dDef = this.getDriver(dInst.driverId);
        if (dDef) baseTime *= (1 - (dDef.skill || 0) * 0.025);
      }
    }

    // GPS upgrade
    const gpsLevel = (currentPlayer.upgrades && currentPlayer.upgrades['he-thong-gps']) || 0;
    if (gpsLevel > 0) {
      const upg = this.getUpgrade('he-thong-gps');
      if (upg && upg.values[gpsLevel - 1]) {
        baseTime *= (1 - upg.values[gpsLevel - 1]);
      }
    }

    if (this.isRaining()) baseTime *= (DEFAULT_EVENTS.rain.speedMult || 0.8);

    return {
      tripId: chosen.id,
      distance: dist,
      fare: Math.max(10, fare),
      baseTime: Math.round(baseTime),
      tripDef: chosen
    };
  },

  async startTrip(plotId) {
    const plot = this.getPlot(plotId);
    if (!plot) return { ok: false, msg: 'Ô không hợp lệ!' };
    if (!plot.vehicleId) return { ok: false, msg: 'Chưa có xe!' };
    if (plot.status === 'on_trip') return { ok: false, msg: 'Xe đang chạy chuyến!' };
    if (plot.status === 'broken') return { ok: false, msg: 'Xe đang hỏng, cần sửa!' };
    if (plot.condition < 15) return { ok: false, msg: 'Xe quá xuống cấp, cần bảo dưỡng!' };

    const veh = this.getVehicle(plot.vehicleId);
    if (!veh) return { ok: false, msg: 'Loại xe không hợp lệ!' };

    // Check fuel
    if (plot.fuel < 5) return { ok: false, msg: 'Không đủ nhiên liệu!' };

    // Check driver stamina
    if (plot.driverId) {
      const dInst = (currentPlayer.hiredDrivers || []).find(d => d.instanceId === plot.driverId);
      if (dInst && dInst.stamina < 10) {
        return { ok: false, msg: 'Tài xế quá mệt, cần nghỉ ngơi!' };
      }
    }

    const trip = this.generateTripForVehicle(plot);
    if (!trip) return { ok: false, msg: 'Không có chuyến phù hợp!' };

    // Estimate fuel needed
    const fuelNeeded = trip.distance * (veh.fuelPerKm || 0.12);
    if (plot.fuel < fuelNeeded * 0.8) {
      return { ok: false, msg: `Cần thêm nhiên liệu (ước tính ${fuelNeeded.toFixed(1)}L)!` };
    }

    plot.status = 'on_trip';
    plot.tripId = trip.tripId;
    plot.tripStartedAt = this.now();
    plot.tripDistance = trip.distance;
    plot.tripFare = trip.fare;
    plot.tripBaseTime = trip.baseTime;
    plot.lastActionAt = this.now();

    if (typeof savePlayer === 'function') await savePlayer();
    return {
      ok: true,
      msg: `Bắt đầu chuyến ${trip.tripDef.name} (${trip.distance}km) - ${trip.fare} xu`,
      trip
    };
  },

  getTripProgress(plot) {
    if (!plot || plot.status !== 'on_trip' || !plot.tripStartedAt) return 0;
    const elapsed = (this.now() - plot.tripStartedAt) / 1000;
    const total = plot.tripBaseTime || 300;
    return Math.min(1, elapsed / total);
  },

  getTripRemainingSec(plot) {
    if (!plot || plot.status !== 'on_trip' || !plot.tripStartedAt) return 0;
    const elapsed = (this.now() - plot.tripStartedAt) / 1000;
    const total = plot.tripBaseTime || 300;
    return Math.max(0, Math.ceil(total - elapsed));
  },

  isTripReady(plot) {
    return this.getTripProgress(plot) >= 1;
  },

  async completeTrip(plotId) {
    const plot = this.getPlot(plotId);
    if (!plot || plot.status !== 'on_trip') return { ok: false, msg: 'Xe không đang chạy chuyến!' };
    if (!this.isTripReady(plot)) {
      const remain = this.getTripRemainingSec(plot);
      return { ok: false, msg: `Chuyến còn ${this.formatTime(remain)} nữa!` };
    }

    const veh = this.getVehicle(plot.vehicleId);
    const fare = plot.tripFare || 0;
    const distance = plot.tripDistance || 0;

    // Fuel consumption
    const fuelUsed = distance * (veh?.fuelPerKm || 0.12);
    plot.fuel = Math.max(0, plot.fuel - fuelUsed);

    // Condition wear
    const wear = 1 + Math.random() * 3 + (distance / 20);
    plot.condition = Math.max(0, plot.condition - wear);
    if (plot.condition < 10) plot.status = 'broken';

    // Driver stamina
    let salary = 0;
    if (plot.driverId) {
      const dInst = (currentPlayer.hiredDrivers || []).find(d => d.instanceId === plot.driverId);
      if (dInst) {
        const dDef = this.getDriver(dInst.driverId);
        dInst.stamina = Math.max(0, (dInst.stamina || 0) - (8 + distance * 0.3));
        dInst.totalTrips = (dInst.totalTrips || 0) + 1;
        salary = dDef?.salaryPerTrip || 10;
      }
    }

    // Earnings
    const net = Math.max(0, fare - salary);
    this.addCoins(net);

    // XP
    const xpGain = Math.round((veh?.xp || 5) * (1 + distance / 30));
    this.addXp(xpGain);

    // Stats
    plot.totalTrips = (plot.totalTrips || 0) + 1;
    plot.totalEarned = (plot.totalEarned || 0) + net;
    if (!currentPlayer.stats) currentPlayer.stats = {};
    currentPlayer.stats.totalTrips = (currentPlayer.stats.totalTrips || 0) + 1;
    currentPlayer.stats.totalDistance = (currentPlayer.stats.totalDistance || 0) + distance;
    currentPlayer.stats.customersServed = (currentPlayer.stats.customersServed || 0) + 1;
    currentPlayer.stats.totalFuelUsed = (currentPlayer.stats.totalFuelUsed || 0) + fuelUsed;

    // Reputation
    let repChange = 0.5;
    if (plot.condition > 70) repChange += 0.3;
    if (this.isRaining()) repChange += 0.2;
    currentPlayer.reputation = Math.min(100, (currentPlayer.reputation || 50) + repChange);

    // Reset trip
    const completedFare = fare;
    const completedDist = distance;
    plot.status = plot.condition < 10 ? 'broken' : 'idle';
    plot.tripId = null;
    plot.tripStartedAt = null;
    plot.tripDistance = 0;
    plot.tripFare = 0;
    plot.tripBaseTime = 0;
    plot.lastActionAt = this.now();

    if (typeof savePlayer === 'function') await savePlayer();

    return {
      ok: true,
      msg: `Hoàn thành chuyến! +${net} xu (cước ${completedFare}, lương TX ${salary})`,
      fare: completedFare,
      net,
      salary,
      distance: completedDist,
      xp: xpGain
    };
  },

  async completeAllReady() {
    const plots = this.getActivePlots();
    let totalNet = 0;
    let count = 0;
    const results = [];

    for (const plot of plots) {
      if (plot.status === 'on_trip' && this.isTripReady(plot)) {
        const res = await this.completeTrip(plot.id);
        if (res.ok) {
          totalNet += res.net || 0;
          count++;
          results.push(res);
        }
      }
    }

    return { ok: true, count, totalNet, results };
  },

  // ====================== REFUEL & REPAIR ======================
  async buyFuel(fuelId, qty = 1) {
    const fuel = this.getFuel(fuelId);
    if (!fuel) return { ok: false, msg: 'Loại nhiên liệu không hợp lệ!' };

    const cost = fuel.price * qty;
    if (!this.canAfford(cost)) return { ok: false, msg: 'Không đủ tiền!' };

    this.chargeCoins(cost);
    if (!currentPlayer.inventory.fuels) currentPlayer.inventory.fuels = {};
    currentPlayer.inventory.fuels[fuelId] = (currentPlayer.inventory.fuels[fuelId] || 0) + qty;

    if (typeof savePlayer === 'function') await savePlayer();
    return { ok: true, msg: `Đã mua ${qty} ${fuel.name}` };
  },

  async refuelPlot(plotId, fuelId) {
    const plot = this.getPlot(plotId);
    if (!plot || !plot.vehicleId) return { ok: false, msg: 'Không có xe!' };
    if (plot.status === 'on_trip') return { ok: false, msg: 'Xe đang chạy chuyến!' };

    const fuel = this.getFuel(fuelId);
    if (!fuel) return { ok: false, msg: 'Loại nhiên liệu không hợp lệ!' };

    const veh = this.getVehicle(plot.vehicleId);
    const isElectric = !!veh?.isElectric;
    if (isElectric && !fuel.isElectric) return { ok: false, msg: 'Xe điện chỉ dùng sạc!' };
    if (!isElectric && fuel.isElectric) return { ok: false, msg: 'Xe xăng không dùng sạc!' };

    const inv = currentPlayer.inventory.fuels || {};
    if ((inv[fuelId] || 0) < 1) return { ok: false, msg: 'Không còn nhiên liệu loại này!' };

    const capacity = veh?.fuelCapacity || 40;
    if (plot.fuel >= capacity) return { ok: false, msg: 'Bình đã đầy!' };

    inv[fuelId] -= 1;
    const add = fuel.amount * (fuel.quality || 1);
    plot.fuel = Math.min(capacity, plot.fuel + add);
    plot.lastActionAt = this.now();

    if (typeof savePlayer === 'function') await savePlayer();
    return { ok: true, msg: `Đã đổ ${add.toFixed(0)}L. Hiện tại: ${plot.fuel.toFixed(0)}/${capacity}` };
  },

  async buyMaintenance(itemId, qty = 1) {
    const item = this.getMaintenance(itemId);
    if (!item) return { ok: false, msg: 'Không hợp lệ!' };

    const cost = item.price * qty;
    if (!this.canAfford(cost)) return { ok: false, msg: 'Không đủ tiền!' };

    this.chargeCoins(cost);
    if (!currentPlayer.inventory.maintenance) currentPlayer.inventory.maintenance = {};
    currentPlayer.inventory.maintenance[itemId] = (currentPlayer.inventory.maintenance[itemId] || 0) + qty;

    if (typeof savePlayer === 'function') await savePlayer();
    return { ok: true, msg: `Đã mua ${qty} ${item.name}` };
  },

  async repairPlot(plotId, itemId) {
    const plot = this.getPlot(plotId);
    if (!plot || !plot.vehicleId) return { ok: false, msg: 'Không có xe!' };
    if (plot.status === 'on_trip') return { ok: false, msg: 'Xe đang chạy chuyến!' };

    const item = this.getMaintenance(itemId);
    if (!item) return { ok: false, msg: 'Vật phẩm không hợp lệ!' };

    const inv = currentPlayer.inventory.maintenance || {};
    if ((inv[itemId] || 0) < 1) return { ok: false, msg: 'Không còn vật phẩm này!' };

    const veh = this.getVehicle(plot.vehicleId);
    const maxCond = veh?.maxCondition || 100;

    inv[itemId] -= 1;
    plot.condition = Math.min(maxCond, plot.condition + item.restore);
    if (plot.status === 'broken' && plot.condition >= 20) {
      plot.status = 'idle';
    }
    plot.lastActionAt = this.now();

    if (typeof savePlayer === 'function') await savePlayer();
    return { ok: true, msg: `Đã sửa xe +${item.restore}. Tình trạng: ${Math.round(plot.condition)}%` };
  },

  // ====================== EVENTS ======================
  isRushHour() {
    return (currentPlayer.rushUntil || 0) > this.now();
  },

  isRaining() {
    return (currentPlayer.rainUntil || 0) > this.now();
  },

  ensureNextEvents() {
    const now = this.now();
    if (!currentPlayer.nextRushAt || currentPlayer.nextRushAt < now) {
      currentPlayer.nextRushAt = now + DEFAULT_EVENTS.rushHour.intervalMs * (0.7 + Math.random() * 0.6);
    }
    if (!currentPlayer.nextRainAt || currentPlayer.nextRainAt < now) {
      currentPlayer.nextRainAt = now + DEFAULT_EVENTS.rain.intervalMs * (0.7 + Math.random() * 0.6);
    }
  },

  tryTriggerEvents() {
    const now = this.now();
    this.ensureNextEvents();
    let changed = false;

    if (!this.isRushHour() && now >= (currentPlayer.nextRushAt || 0)) {
      currentPlayer.rushUntil = now + DEFAULT_EVENTS.rushHour.durationMs;
      currentPlayer.nextRushAt = now + DEFAULT_EVENTS.rushHour.intervalMs * (0.8 + Math.random() * 0.5);
      changed = true;
    }

    if (!this.isRaining() && now >= (currentPlayer.nextRainAt || 0)) {
      currentPlayer.rainUntil = now + DEFAULT_EVENTS.rain.durationMs;
      currentPlayer.nextRainAt = now + DEFAULT_EVENTS.rain.intervalMs * (0.8 + Math.random() * 0.5);
      changed = true;
    }

    return changed;
  },

  getRushRemainingSec() {
    return Math.max(0, Math.ceil(((currentPlayer.rushUntil || 0) - this.now()) / 1000));
  },

  getRainRemainingSec() {
    return Math.max(0, Math.ceil(((currentPlayer.rainUntil || 0) - this.now()) / 1000));
  },

  // ====================== AUTO DISPATCH ======================
  async autoDispatchAll() {
    if (!currentPlayer.buffPrefs?.autoDispatch) return { ok: false, count: 0 };

    const plots = this.getActivePlots();
    let count = 0;

    for (const plot of plots) {
      if (plot.vehicleId && plot.status === 'idle' && plot.fuel >= 8 && plot.condition >= 20) {
        // Auto assign driver if available
        if (!plot.driverId) {
          const available = this.getAvailableDrivers();
          if (available.length) {
            plot.driverId = available[0].instanceId;
          }
        }
        const res = await this.startTrip(plot.id);
        if (res.ok) count++;
      }
    }

    return { ok: true, count };
  },

  // ====================== UPGRADES ======================
  async buyUpgrade(upgradeId) {
    const upg = this.getUpgrade(upgradeId);
    if (!upg) return { ok: false, msg: 'Nâng cấp không tồn tại!' };

    const currentLevel = (currentPlayer.upgrades && currentPlayer.upgrades[upgradeId]) || 0;
    if (currentLevel >= upg.maxLevel) return { ok: false, msg: 'Đã đạt cấp tối đa!' };

    const cost = upg.costs[currentLevel];
    if (!this.canAfford(cost)) return { ok: false, msg: 'Không đủ tiền!' };

    this.chargeCoins(cost);
    if (!currentPlayer.upgrades) currentPlayer.upgrades = {};
    currentPlayer.upgrades[upgradeId] = currentLevel + 1;

    // Apply slot expansion immediately
    if (upg.effect === 'slots') {
      const add = upg.values[currentLevel] || 1;
      const plots = this.getActivePlots();
      const startId = plots.length;
      for (let i = 0; i < add; i++) {
        plots.push(this.normalizePlot(null, startId + i));
      }
      // Also update gardens
      const gi = currentPlayer.activeGarden || 0;
      if (currentPlayer.gardens && currentPlayer.gardens[gi]) {
        currentPlayer.gardens[gi] = plots;
      }
      currentPlayer.plots = plots;
    }

    if (typeof savePlayer === 'function') await savePlayer();
    return { ok: true, msg: `Đã nâng cấp ${upg.name} lên cấp ${currentLevel + 1}!` };
  },

  // ====================== DAILY ======================
  hasClaimedDaily() {
    if (!currentPlayer.lastDaily) return false;
    const last = this.toMs(currentPlayer.lastDaily) || 0;
    const todayStart = getGmt7DayStartMs(this.now());
    return last >= todayStart;
  },

  async claimDaily() {
    if (this.hasClaimedDaily()) return { ok: false, msg: 'Hôm nay đã nhận rồi!' };

    const reward = 200 + (currentPlayer.level || 1) * 30;
    this.addCoins(reward);
    this.addXp(20);
    currentPlayer.lastDaily = this.now();

    // Bonus fuel
    if (!currentPlayer.inventory.fuels) currentPlayer.inventory.fuels = {};
    currentPlayer.inventory.fuels['xang-thuong'] = (currentPlayer.inventory.fuels['xang-thuong'] || 0) + 3;

    if (typeof savePlayer === 'function') await savePlayer();
    return { ok: true, msg: `Nhận thưởng ngày: +${reward} xu và 3 bình xăng!`, reward };
  },

  // ====================== UTILS ======================
  formatTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    if (sec < 60) return sec + 's';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m < 60) return m + 'p' + (s > 0 ? s + 's' : '');
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return h + 'h' + (rm > 0 ? rm + 'p' : '');
  },

  getProgress(plot) {
    if (plot.status === 'on_trip') return this.getTripProgress(plot);
    return 0;
  },

  getRemainingSeconds(plot) {
    if (plot.status === 'on_trip') return this.getTripRemainingSec(plot);
    return 0;
  },

  isReady(plot) {
    return plot.status === 'on_trip' && this.isTripReady(plot);
  },

  // ====================== COMPATIBILITY SHIMS (để app.js cũ không crash) ======================
  async plantSeed() { return { ok: false, msg: 'Đã chuyển sang hệ thống Taxi!' }; },
  async waterPlot() { return { ok: false, msg: 'Đã chuyển sang hệ thống Taxi!' }; },
  async harvestPlot(plotId) { return this.completeTrip(plotId); },
  async harvestAll() { return this.completeAllReady(); },
  async buySeed() { return { ok: false, msg: 'Dùng mua xe thay thế!' }; },
  async sellHarvest() { return { ok: false, msg: 'Chức năng không còn dùng.' }; },
  async fertilizeAll() { return { ok: false, msg: 'Dùng bảo dưỡng xe!' }; },
  async waterAll() { return { ok: false, msg: 'Dùng đổ xăng!' }; },

  getStage(plot) {
    if (plot.status === 'on_trip') {
      const p = this.getTripProgress(plot);
      if (p >= 1) return 4;
      if (p >= 0.75) return 3;
      if (p >= 0.4) return 2;
      return 1;
    }
    return 0;
  },

  getEffectiveGrowTime(plot) {
    return plot.tripBaseTime || 0;
  },

  getElapsedEffective(plot) {
    if (!plot.tripStartedAt) return 0;
    return (this.now() - plot.tripStartedAt) / 1000;
  },

  // Fairy / helper stubs (retheme later if needed)
  hasFairy() { return (currentPlayer.fairyUntil || 0) > this.now(); },
  isFairyActive() { return this.hasFairy(); },
  fairyRemainingSec() { return Math.max(0, Math.ceil(((currentPlayer.fairyUntil || 0) - this.now()) / 1000)); },
  hasNyc() { return false; },
  isNycActive() { return false; },
  nycRemainingSec() { return 0; },
  showFairyDecor() { return false; },
  showNycDecor() { return false; },
  showHelperDecor() { return false; },
  showRobotDecor() { return false; },

  getBuffPrefs() { return currentPlayer.buffPrefs || {}; },
  setBuffPrefs(prefs) {
    currentPlayer.buffPrefs = { ...currentPlayer.buffPrefs, ...prefs };
  },

  // Collection / limited stubs
  isPlantLimited() { return false; },
  isPlantAvailable() { return true; },
  getLimitedEventLabel() { return ''; },
  unlockCollection() {},
  collectionCount() { return 0; },

  async publishPublicGarden() { return { ok: false }; },
  async helpWaterFriend() { return { ok: false }; },
  async applyPendingHelps() { return { ok: false }; },
  async collectRainItem() { return { ok: false }; },

  getWeather() {
    if (this.isRaining()) return 'rain';
    if (this.isRushHour()) return 'rush';
    return 'clear';
  },

  tryTriggerRain() { return this.tryTriggerEvents(); },
  startRain() {},
  getRainRemainingSec() { return this.getRainRemainingSec(); },
  ensureNextRainAt() { this.ensureNextEvents(); },
  scheduleNextRain() {},
  getRainDurationMs() { return DEFAULT_EVENTS.rain.durationMs; },

  // Max plots
  MAX_PLOTS_PER_GARDEN: 16
};

// Make Game globally available
if (typeof window !== 'undefined') {
  window.Game = Game;
}
