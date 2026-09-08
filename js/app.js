/**
 * Taxi Xanh - Application Layer
 * Version 2.0.0 — Full taxi management (clean rewrite)
 */

// ====================== UTILS ======================
function $(id) { return document.getElementById(id); }
function formatNum(n) { return Math.floor(n || 0).toLocaleString('vi-VN'); }

function showToast(msg, type) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show ' + (type || 'info');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.className = 'toast'; }, 2800);
}

function nowMs() { return Date.now(); }

// ====================== THEME ======================
function initTheme() {
  const key = 'tx-theme';
  const saved = localStorage.getItem(key);
  const isDark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  applyTheme(isDark ? 'dark' : 'light');
  const btn = $('btn-theme');
  if (btn) {
    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem(key, next);
    });
  }
}

function applyTheme(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  document.documentElement.classList.toggle('dark', mode === 'dark');
  const icon = $('theme-icon');
  if (icon) icon.className = mode === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

// ====================== MODAL ======================
let _modalEl = null;

function showModal(html, bindFn) {
  closeModal();
  const root = $('modal-root') || document.body;
  const overlay = document.createElement('div');
  overlay.className = 'tx-modal-overlay';
  overlay.innerHTML = `
    <div class="tx-modal">
      <button class="tx-modal-close" aria-label="Đóng">×</button>
      <div class="tx-modal-body">${html}</div>
    </div>`;
  root.appendChild(overlay);
  _modalEl = overlay;
  overlay.querySelector('.tx-modal-close').onclick = closeModal;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  if (typeof bindFn === 'function') bindFn(overlay);
}

function closeModal() {
  if (_modalEl) { _modalEl.remove(); _modalEl = null; }
}

// ====================== SAVE / LOAD ======================
let _saveTimer = null;
let _playerBaseUpdatedAt = 0;

function scheduleSavePlayer(delay) {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => { savePlayer().catch(() => {}); }, delay || 800);
}

async function savePlayer() {
  if (!currentUser || !currentPlayer || !db) return;
  try {
    currentPlayer.updatedAt = nowMs();
    await db.ref('users/' + currentUser.uid).set(currentPlayer);
    _playerBaseUpdatedAt = currentPlayer.updatedAt;
  } catch (e) {
    console.warn('savePlayer', e);
  }
}

async function loadPlayer(uid, email) {
  const snap = await db.ref('users/' + uid).once('value');
  if (!snap.exists()) {
    // First user becomes admin
    let role = 'user';
    try {
      const all = await db.ref('users').once('value');
      if (!all.exists() || Object.keys(all.val() || {}).length === 0) role = 'admin';
    } catch (_) {}
    currentPlayer = createDefaultPlayerData(uid, email, role);
    await db.ref('users/' + uid).set(currentPlayer);
  } else {
    currentPlayer = snap.val();
    // Ensure required fields (taxi schema)
    if (!currentPlayer.inventory) currentPlayer.inventory = { fuels: {}, maintenance: {}, drivers: {}, vehiclesOwned: {} };
    if (!currentPlayer.inventory.fuels) currentPlayer.inventory.fuels = {};
    if (!currentPlayer.inventory.maintenance) currentPlayer.inventory.maintenance = {};
    if (!currentPlayer.stats) currentPlayer.stats = {};
    if (!currentPlayer.hiredDrivers) currentPlayer.hiredDrivers = [];
    if (!currentPlayer.upgrades) currentPlayer.upgrades = {};
    if (!currentPlayer.buffPrefs) currentPlayer.buffPrefs = { autoDispatch: true, autoRefuel: true };
    if (!currentPlayer.companyName) currentPlayer.companyName = 'Đội Xe Xanh';
    if (currentPlayer.reputation == null) currentPlayer.reputation = 50;
    // Migrate legacy farming plots -> taxi slots
    if (Array.isArray(currentPlayer.plots)) {
      currentPlayer.plots = currentPlayer.plots.map((p, i) => {
        if (!p || typeof p !== 'object') return p;
        if (p.plantId && !p.vehicleId) {
          return {
            id: typeof p.id === 'number' ? p.id : i,
            vehicleId: null, driverId: null, status: 'idle',
            tripId: null, tripStartedAt: null, tripDistance: 0, tripFare: 0, tripBaseTime: 0,
            fuel: 0, condition: 100, totalTrips: 0, totalEarned: 0, lastActionAt: null
          };
        }
        return p;
      });
    }
  }
  isAdmin = currentPlayer.role === 'admin';
  _playerBaseUpdatedAt = currentPlayer.updatedAt || 0;
  if (typeof Game !== 'undefined') Game.ensureGardens();
}

// ====================== UI: HEADER ======================
function updateCoins() {
  const el = $('coin-display');
  if (el && currentPlayer) el.textContent = formatNum(currentPlayer.coins);
  const lv = $('level-display');
  if (lv && currentPlayer) lv.textContent = currentPlayer.level || 1;
  const name = $('company-name-display');
  if (name && currentPlayer) name.textContent = currentPlayer.companyName || 'Đội Xe Xanh';
  const daily = $('btn-daily');
  if (daily) daily.style.display = (typeof Game !== 'undefined' && Game.hasClaimedDaily()) ? 'none' : '';
  const adminBtn = $('btn-admin');
  if (adminBtn) adminBtn.style.display = isAdmin ? '' : 'none';
}

// ====================== UI: FLEET ======================
function renderFleet() {
  if (!currentPlayer || typeof Game === 'undefined') return;
  Game.ensureGardens();
  Game.tryTriggerEvents();

  const grid = $('fleet-grid');
  if (!grid) return;
  grid.innerHTML = '';

  // Events
  const wIcon = $('weather-icon');
  const wText = $('weather-text');
  if (wIcon && wText) {
    if (Game.isRushHour()) {
      wIcon.innerHTML = '<i class="fa-solid fa-traffic-light"></i>';
      wText.textContent = 'Giờ cao điểm · còn ' + Game.formatTime(Game.getRushRemainingSec());
    } else if (Game.isRaining()) {
      wIcon.innerHTML = '<i class="fa-solid fa-cloud-showers-heavy"></i>';
      wText.textContent = 'Mưa lớn · còn ' + Game.formatTime(Game.getRainRemainingSec());
    } else {
      wIcon.innerHTML = '<i class="fa-solid fa-sun"></i>';
      wText.textContent = 'Thời tiết đẹp';
    }
  }

  updateCoins();
  const plots = Game.getActivePlots();

  plots.forEach((plot) => {
    const div = document.createElement('div');
    div.className = 'plot';
    const pid = plot.id;

    if (!plot.vehicleId) {
      div.classList.add('empty');
      div.innerHTML = `
        <div class="plot-icon">🅿️</div>
        <div class="plot-name">Chỗ trống</div>
        <div class="plot-status">Nhấn để mua xe</div>`;
      div.onclick = () => openBuyVehicleModal(pid);
    } else {
      const veh = Game.getVehicle(plot.vehicleId);
      if (!veh) {
        div.innerHTML = '<div class="plot-icon">❓</div><div class="plot-name">Lỗi</div>';
      } else {
        const onTrip = plot.status === 'on_trip';
        const ready = onTrip && Game.isTripReady(plot);
        const broken = plot.status === 'broken' || (plot.condition || 0) < 10;

        if (ready) div.classList.add('ready');
        else if (onTrip) div.classList.add('growing');
        else if (broken) div.classList.add('empty');
        else div.classList.add('growing');

        const fuelPct = Math.min(100, Math.round((plot.fuel / (veh.fuelCapacity || 40)) * 100));
        const condPct = Math.min(100, Math.round(plot.condition || 0));

        let status = '🟡 Sẵn sàng';
        let hint = 'Nhấn để bắt đầu chuyến';
        if (ready) { status = '✅ Hoàn thành'; hint = 'Nhấn nhận tiền'; }
        else if (onTrip) {
          status = '🚗 Đang chạy ' + Math.round(Game.getTripProgress(plot) * 100) + '%';
          hint = 'Còn ' + Game.formatTime(Game.getTripRemainingSec(plot));
        } else if (broken) { status = '🔧 Cần sửa'; hint = 'Nhấn để bảo dưỡng'; }

        let driverHtml = '';
        if (plot.driverId) {
          const dInst = (currentPlayer.hiredDrivers || []).find(d => d.instanceId === plot.driverId);
          if (dInst) {
            const dDef = Game.getDriver(dInst.driverId);
            driverHtml = `<div class="plot-driver">${dDef ? dDef.icon : '👨‍✈️'} ${dDef ? dDef.name.split(' ').pop() : ''}</div>`;
          }
        }

        div.innerHTML = `
          <div class="plot-icon">${veh.icon}</div>
          <div class="plot-name">${veh.name}</div>
          <div class="plot-status">${status}</div>
          <div class="plot-timer">${hint}</div>
          ${driverHtml}
          <div class="plot-bars">
            <div class="bar" title="Nhiên liệu ${fuelPct}%"><div class="bar-fill" style="width:${fuelPct}%;background:#3b82f6"></div></div>
            <div class="bar" title="Tình trạng ${condPct}%"><div class="bar-fill" style="width:${condPct}%;background:${condPct < 30 ? '#ef4444' : '#22c55e'}"></div></div>
          </div>`;
        div.onclick = () => openVehicleModal(pid);
      }
    }
    grid.appendChild(div);
  });
}

// Alias for any leftover calls
window.renderGarden = renderFleet;

// ====================== VEHICLE MODALS ======================
function openBuyVehicleModal(plotId) {
  const vehicles = Game.getVehicles().filter(v => (currentPlayer.level || 1) >= (v.unlockLevel || 1));
  let html = `<div class="tx-modal-title">Mua xe — chỗ #${plotId + 1}</div><div class="tx-modal-list">`;
  vehicles.forEach(v => {
    const can = Game.canAfford(v.buyPrice);
    html += `
      <div class="tx-modal-item">
        <span class="item-icon">${v.icon}</span>
        <div class="item-info">
          <strong>${v.name}</strong>
          <small>${v.desc}</small>
          <small>⛽ ${v.fuelCapacity}L · Comfort ${v.comfort} · Cấp ${v.unlockLevel}</small>
        </div>
        <button class="btn btn-sm btn-primary" data-vid="${v.id}" ${can ? '' : 'disabled'}>${formatNum(v.buyPrice)}</button>
      </div>`;
  });
  html += '</div>';
  showModal(html, (m) => {
    m.querySelectorAll('[data-vid]').forEach(btn => {
      btn.onclick = async () => {
        const res = await Game.buyVehicle(btn.dataset.vid, plotId);
        showToast(res.msg, res.ok ? 'success' : 'error');
        if (res.ok) { closeModal(); renderFleet(); updateCoins(); }
      };
    });
  });
}

function openVehicleModal(plotId) {
  const plot = Game.getPlot(plotId);
  if (!plot || !plot.vehicleId) return;
  const veh = Game.getVehicle(plot.vehicleId);
  const onTrip = plot.status === 'on_trip';
  const ready = onTrip && Game.isTripReady(plot);

  let actions = '';
  if (ready) {
    actions = `<button class="btn btn-primary btn-block" id="act-complete">✅ Nhận tiền (+${formatNum(plot.tripFare)} xu)</button>`;
  } else if (onTrip) {
    actions = `<div class="info-box">Đang chạy chuyến...<br>Còn <strong>${Game.formatTime(Game.getTripRemainingSec(plot))}</strong></div>`;
  } else {
    actions = `
      <button class="btn btn-primary btn-block" id="act-start">🚗 Bắt đầu chuyến</button>
      <button class="btn btn-secondary btn-block" id="act-refuel">⛽ Đổ nhiên liệu</button>
      <button class="btn btn-secondary btn-block" id="act-repair">🔧 Bảo dưỡng</button>
      <button class="btn btn-secondary btn-block" id="act-driver">👨‍✈️ Gán tài xế</button>
      <button class="btn btn-danger btn-block" id="act-sell">💰 Bán xe (50%)</button>`;
  }

  const fuelPct = Math.round((plot.fuel / (veh.fuelCapacity || 40)) * 100);
  const html = `
    <div class="tx-modal-title">${veh.icon} ${veh.name}</div>
    <div class="vehicle-stats">
      <div>Nhiên liệu: <strong>${Math.round(plot.fuel)}/${veh.fuelCapacity}</strong> (${fuelPct}%)</div>
      <div>Tình trạng: <strong>${Math.round(plot.condition)}%</strong></div>
      <div>Tổng chuyến: <strong>${plot.totalTrips || 0}</strong></div>
      <div>Doanh thu xe: <strong>${formatNum(plot.totalEarned)} xu</strong></div>
    </div>
    <div class="tx-modal-actions">${actions}</div>`;

  showModal(html, (m) => {
    const complete = m.querySelector('#act-complete');
    if (complete) complete.onclick = async () => {
      const res = await Game.completeTrip(plotId);
      showToast(res.msg, res.ok ? 'success' : 'error');
      if (res.ok) { closeModal(); renderFleet(); updateCoins(); }
    };
    const start = m.querySelector('#act-start');
    if (start) start.onclick = async () => {
      const res = await Game.startTrip(plotId);
      showToast(res.msg, res.ok ? 'success' : 'error');
      if (res.ok) { closeModal(); renderFleet(); }
    };
    const refuel = m.querySelector('#act-refuel');
    if (refuel) refuel.onclick = () => openRefuelModal(plotId);
    const repair = m.querySelector('#act-repair');
    if (repair) repair.onclick = () => openRepairModal(plotId);
    const driver = m.querySelector('#act-driver');
    if (driver) driver.onclick = () => openAssignDriverModal(plotId);
    const sell = m.querySelector('#act-sell');
    if (sell) sell.onclick = async () => {
      if (!confirm('Bán xe này và nhận lại 50% giá?')) return;
      const res = await Game.sellVehicle(plotId);
      showToast(res.msg, res.ok ? 'success' : 'error');
      if (res.ok) { closeModal(); renderFleet(); updateCoins(); }
    };
  });
}

function openRefuelModal(plotId) {
  const fuels = Game.getFuels();
  const inv = (currentPlayer.inventory && currentPlayer.inventory.fuels) || {};
  let html = `<div class="tx-modal-title">Đổ nhiên liệu</div><div class="tx-modal-list">`;
  fuels.forEach(f => {
    const qty = inv[f.id] || 0;
    html += `
      <div class="tx-modal-item">
        <span class="item-icon">${f.icon}</span>
        <div class="item-info"><strong>${f.name}</strong><small>+${f.amount} · Có: ${qty}</small></div>
        <button class="btn btn-sm btn-primary" data-fid="${f.id}" ${qty < 1 ? 'disabled' : ''}>Dùng</button>
      </div>`;
  });
  html += `</div><button class="btn btn-secondary btn-block" id="buy-fuel" style="margin-top:12px">Mua thêm nhiên liệu</button>`;
  showModal(html, (m) => {
    m.querySelectorAll('[data-fid]').forEach(btn => {
      btn.onclick = async () => {
        const res = await Game.refuelPlot(plotId, btn.dataset.fid);
        showToast(res.msg, res.ok ? 'success' : 'error');
        if (res.ok) { closeModal(); renderFleet(); }
      };
    });
    const buy = m.querySelector('#buy-fuel');
    if (buy) buy.onclick = () => openBuyFuelModal();
  });
}

function openBuyFuelModal() {
  let html = `<div class="tx-modal-title">Mua nhiên liệu</div><div class="tx-modal-list">`;
  Game.getFuels().forEach(f => {
    html += `
      <div class="tx-modal-item">
        <span class="item-icon">${f.icon}</span>
        <div class="item-info"><strong>${f.name}</strong><small>+${f.amount} · ${f.price} xu</small></div>
        <button class="btn btn-sm btn-primary" data-fid="${f.id}">Mua</button>
      </div>`;
  });
  html += '</div>';
  showModal(html, (m) => {
    m.querySelectorAll('[data-fid]').forEach(btn => {
      btn.onclick = async () => {
        const res = await Game.buyFuel(btn.dataset.fid, 1);
        showToast(res.msg, res.ok ? 'success' : 'error');
        if (res.ok) updateCoins();
      };
    });
  });
}

function openRepairModal(plotId) {
  const items = Game.getMaintenanceItems();
  const inv = (currentPlayer.inventory && currentPlayer.inventory.maintenance) || {};
  let html = `<div class="tx-modal-title">Bảo dưỡng</div><div class="tx-modal-list">`;
  items.forEach(item => {
    const qty = inv[item.id] || 0;
    html += `
      <div class="tx-modal-item">
        <span class="item-icon">${item.icon}</span>
        <div class="item-info"><strong>${item.name}</strong><small>${item.desc} · Có: ${qty}</small></div>
        <button class="btn btn-sm btn-primary" data-mid="${item.id}" ${qty < 1 ? 'disabled' : ''}>Dùng</button>
      </div>`;
  });
  html += `</div><button class="btn btn-secondary btn-block" id="buy-maint" style="margin-top:12px">Mua vật phẩm</button>`;
  showModal(html, (m) => {
    m.querySelectorAll('[data-mid]').forEach(btn => {
      btn.onclick = async () => {
        const res = await Game.repairPlot(plotId, btn.dataset.mid);
        showToast(res.msg, res.ok ? 'success' : 'error');
        if (res.ok) { closeModal(); renderFleet(); }
      };
    });
    const buy = m.querySelector('#buy-maint');
    if (buy) buy.onclick = () => {
      let h = `<div class="tx-modal-title">Mua bảo dưỡng</div><div class="tx-modal-list">`;
      items.forEach(item => {
        h += `<div class="tx-modal-item">
          <span class="item-icon">${item.icon}</span>
          <div class="item-info"><strong>${item.name}</strong><small>${item.price} xu</small></div>
          <button class="btn btn-sm btn-primary" data-mid="${item.id}">Mua</button>
        </div>`;
      });
      h += '</div>';
      showModal(h, (m2) => {
        m2.querySelectorAll('[data-mid]').forEach(b => {
          b.onclick = async () => {
            const res = await Game.buyMaintenance(b.dataset.mid, 1);
            showToast(res.msg, res.ok ? 'success' : 'error');
            if (res.ok) updateCoins();
          };
        });
      });
    };
  });
}

function openAssignDriverModal(plotId) {
  const available = Game.getAvailableDrivers();
  let html = `<div class="tx-modal-title">Gán tài xế</div>`;
  if (!available.length) {
    html += `<p style="margin:12px 0">Không có tài xế rảnh.</p>
      <button class="btn btn-primary btn-block" id="hire-new">Thuê tài xế mới</button>`;
  } else {
    html += `<div class="tx-modal-list">`;
    available.forEach(dInst => {
      const d = Game.getDriver(dInst.driverId);
      html += `
        <div class="tx-modal-item">
          <span class="item-icon">${d ? d.icon : '👨‍✈️'}</span>
          <div class="item-info">
            <strong>${d ? d.name : dInst.driverId}</strong>
            <small>Thể lực ${Math.round(dInst.stamina)} · ${dInst.totalTrips || 0} chuyến</small>
          </div>
          <button class="btn btn-sm btn-primary" data-iid="${dInst.instanceId}">Gán</button>
        </div>`;
    });
    html += `</div><button class="btn btn-secondary btn-block" id="hire-new" style="margin-top:12px">Thuê thêm</button>`;
  }
  showModal(html, (m) => {
    m.querySelectorAll('[data-iid]').forEach(btn => {
      btn.onclick = async () => {
        const res = await Game.assignDriver(plotId, btn.dataset.iid);
        showToast(res.msg, res.ok ? 'success' : 'error');
        if (res.ok) { closeModal(); renderFleet(); }
      };
    });
    const hire = m.querySelector('#hire-new');
    if (hire) hire.onclick = () => openHireDriverModal();
  });
}

function openHireDriverModal() {
  const drivers = Game.getDrivers().filter(d => (currentPlayer.level || 1) >= (d.unlockLevel || 1));
  let html = `<div class="tx-modal-title">Thuê tài xế</div><div class="tx-modal-list">`;
  drivers.forEach(d => {
    html += `
      <div class="tx-modal-item">
        <span class="item-icon">${d.icon}</span>
        <div class="item-info">
          <strong>${d.name}</strong>
          <small>${d.desc}<br>Lương/chuyến: ${d.salaryPerTrip} · Skill ${d.skill}</small>
        </div>
        <button class="btn btn-sm btn-primary" data-did="${d.id}">${formatNum(d.hirePrice)}</button>
      </div>`;
  });
  html += '</div>';
  showModal(html, (m) => {
    m.querySelectorAll('[data-did]').forEach(btn => {
      btn.onclick = async () => {
        const res = await Game.hireDriver(btn.dataset.did);
        showToast(res.msg, res.ok ? 'success' : 'error');
        if (res.ok) updateCoins();
      };
    });
  });
}

// ====================== SHOP ======================
let currentShopTab = 'vehicles';

function renderShop() {
  const grid = $('shop-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (currentShopTab === 'vehicles') {
    Game.getVehicles().forEach(v => {
      const locked = (currentPlayer.level || 1) < (v.unlockLevel || 1);
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.innerHTML = `
        <div class="item-icon">${v.icon}</div>
        <div class="item-name">${v.name}</div>
        <div class="item-desc">${v.desc}</div>
        <div class="item-price">${locked ? 'Cấp ' + v.unlockLevel : formatNum(v.buyPrice) + ' xu'}</div>
        <button class="btn btn-primary btn-sm" ${locked ? 'disabled' : ''}>${locked ? 'Khóa' : 'Mua vào chỗ trống'}</button>`;
      if (!locked) {
        card.querySelector('button').onclick = () => {
          const plots = Game.getActivePlots();
          const empty = plots.find(p => !p.vehicleId);
          if (!empty) { showToast('Không còn chỗ trống! Hãy nâng cấp bãi đỗ.', 'error'); return; }
          openBuyVehicleModal(empty.id);
        };
      }
      grid.appendChild(card);
    });
  } else if (currentShopTab === 'drivers') {
    Game.getDrivers().forEach(d => {
      const locked = (currentPlayer.level || 1) < (d.unlockLevel || 1);
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.innerHTML = `
        <div class="item-icon">${d.icon}</div>
        <div class="item-name">${d.name}</div>
        <div class="item-desc">${d.desc}<br>Skill ${d.skill} · Lương ${d.salaryPerTrip}/chuyến</div>
        <div class="item-price">${locked ? 'Cấp ' + d.unlockLevel : formatNum(d.hirePrice) + ' xu'}</div>
        <button class="btn btn-primary btn-sm" ${locked ? 'disabled' : ''}>${locked ? 'Khóa' : 'Thuê'}</button>`;
      if (!locked) {
        card.querySelector('button').onclick = async () => {
          const res = await Game.hireDriver(d.id);
          showToast(res.msg, res.ok ? 'success' : 'error');
          if (res.ok) updateCoins();
        };
      }
      grid.appendChild(card);
    });
  } else if (currentShopTab === 'fuel') {
    Game.getFuels().forEach(f => {
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.innerHTML = `
        <div class="item-icon">${f.icon}</div>
        <div class="item-name">${f.name}</div>
        <div class="item-desc">+${f.amount} đơn vị</div>
        <div class="item-price">${f.price} xu</div>
        <button class="btn btn-primary btn-sm">Mua</button>`;
      card.querySelector('button').onclick = async () => {
        const res = await Game.buyFuel(f.id, 1);
        showToast(res.msg, res.ok ? 'success' : 'error');
        if (res.ok) updateCoins();
      };
      grid.appendChild(card);
    });
  } else if (currentShopTab === 'maintenance') {
    Game.getMaintenanceItems().forEach(item => {
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.innerHTML = `
        <div class="item-icon">${item.icon}</div>
        <div class="item-name">${item.name}</div>
        <div class="item-desc">${item.desc}</div>
        <div class="item-price">${item.price} xu</div>
        <button class="btn btn-primary btn-sm">Mua</button>`;
      card.querySelector('button').onclick = async () => {
        const res = await Game.buyMaintenance(item.id, 1);
        showToast(res.msg, res.ok ? 'success' : 'error');
        if (res.ok) updateCoins();
      };
      grid.appendChild(card);
    });
  } else if (currentShopTab === 'upgrades') {
    Game.getUpgrades().forEach(upg => {
      const lv = (currentPlayer.upgrades && currentPlayer.upgrades[upg.id]) || 0;
      const maxed = lv >= upg.maxLevel;
      const cost = maxed ? 0 : upg.costs[lv];
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.innerHTML = `
        <div class="item-icon">${upg.icon}</div>
        <div class="item-name">${upg.name}</div>
        <div class="item-desc">${upg.desc}<br>Cấp ${lv}/${upg.maxLevel}</div>
        <div class="item-price">${maxed ? 'Tối đa' : formatNum(cost) + ' xu'}</div>
        <button class="btn btn-primary btn-sm" ${maxed ? 'disabled' : ''}>${maxed ? 'Max' : 'Nâng cấp'}</button>`;
      if (!maxed) {
        card.querySelector('button').onclick = async () => {
          const res = await Game.buyUpgrade(upg.id);
          showToast(res.msg, res.ok ? 'success' : 'error');
          if (res.ok) { updateCoins(); renderShop(); renderFleet(); }
        };
      }
      grid.appendChild(card);
    });
  }
}

// ====================== INVENTORY ======================
let currentInvTab = 'fuels';

function renderInventory() {
  const box = $('inventory-content');
  if (!box) return;
  box.innerHTML = '';

  if (currentInvTab === 'fuels') {
    const inv = (currentPlayer.inventory && currentPlayer.inventory.fuels) || {};
    const fuels = Game.getFuels();
    let any = false;
    fuels.forEach(f => {
      const qty = inv[f.id] || 0;
      if (qty <= 0) return;
      any = true;
      const row = document.createElement('div');
      row.className = 'inv-item';
      row.innerHTML = `
        <span class="item-icon">${f.icon}</span>
        <div class="item-info"><strong>${f.name}</strong><small>+${f.amount} mỗi lần dùng</small></div>
        <span class="item-qty">×${qty}</span>`;
      box.appendChild(row);
    });
    if (!any) box.innerHTML = '<p style="opacity:0.7;padding:20px;text-align:center">Chưa có nhiên liệu. Mua ở Cửa hàng.</p>';
  } else if (currentInvTab === 'maintenance') {
    const inv = (currentPlayer.inventory && currentPlayer.inventory.maintenance) || {};
    const items = Game.getMaintenanceItems();
    let any = false;
    items.forEach(item => {
      const qty = inv[item.id] || 0;
      if (qty <= 0) return;
      any = true;
      const row = document.createElement('div');
      row.className = 'inv-item';
      row.innerHTML = `
        <span class="item-icon">${item.icon}</span>
        <div class="item-info"><strong>${item.name}</strong><small>${item.desc}</small></div>
        <span class="item-qty">×${qty}</span>`;
      box.appendChild(row);
    });
    if (!any) box.innerHTML = '<p style="opacity:0.7;padding:20px;text-align:center">Chưa có vật phẩm bảo dưỡng.</p>';
  } else if (currentInvTab === 'drivers') {
    const hired = currentPlayer.hiredDrivers || [];
    if (!hired.length) {
      box.innerHTML = '<p style="opacity:0.7;padding:20px;text-align:center">Chưa thuê tài xế nào.</p>';
      return;
    }
    const plots = Game.getActivePlots();
    const assigned = new Set(plots.filter(p => p.driverId).map(p => p.driverId));
    hired.forEach(dInst => {
      const d = Game.getDriver(dInst.driverId);
      const busy = assigned.has(dInst.instanceId);
      const row = document.createElement('div');
      row.className = 'inv-item';
      row.innerHTML = `
        <span class="item-icon">${d ? d.icon : '👨‍✈️'}</span>
        <div class="item-info">
          <strong>${d ? d.name : dInst.driverId}</strong>
          <small>Thể lực ${Math.round(dInst.stamina)}/${d ? d.maxStamina : '?'} · ${dInst.totalTrips || 0} chuyến · ${busy ? 'Đang lái' : 'Rảnh'}</small>
        </div>`;
      box.appendChild(row);
    });
  }
}

// ====================== COMPANY ======================
function renderCompany() {
  const panel = $('company-panel');
  if (!panel || !currentPlayer) return;
  const s = currentPlayer.stats || {};
  const plots = Game.getActivePlots();
  const activeVehicles = plots.filter(p => p.vehicleId).length;
  const onTrip = plots.filter(p => p.status === 'on_trip').length;

  panel.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-value">${currentPlayer.level || 1}</div><div class="stat-label">Cấp công ty</div></div>
      <div class="stat-card"><div class="stat-value">${Math.round(currentPlayer.reputation || 50)}</div><div class="stat-label">Uy tín</div></div>
      <div class="stat-card"><div class="stat-value">${activeVehicles}</div><div class="stat-label">Số xe</div></div>
      <div class="stat-card"><div class="stat-value">${onTrip}</div><div class="stat-label">Đang chạy</div></div>
      <div class="stat-card"><div class="stat-value">${formatNum(s.totalTrips)}</div><div class="stat-label">Tổng chuyến</div></div>
      <div class="stat-card"><div class="stat-value">${formatNum(s.totalEarned)}</div><div class="stat-label">Tổng doanh thu</div></div>
      <div class="stat-card"><div class="stat-value">${(s.totalDistance || 0).toFixed(0)} km</div><div class="stat-label">Quãng đường</div></div>
      <div class="stat-card"><div class="stat-value">${(currentPlayer.hiredDrivers || []).length}</div><div class="stat-label">Tài xế</div></div>
    </div>
    <div class="stat-card" style="text-align:left;margin-top:8px">
      <strong>XP:</strong> ${currentPlayer.xp || 0} / ${Game.xpForLevel(currentPlayer.level || 1)}
      <div class="plot-bars" style="margin-top:8px">
        <div class="bar" style="height:8px">
          <div class="bar-fill" style="width:${Math.min(100, ((currentPlayer.xp || 0) / Game.xpForLevel(currentPlayer.level || 1)) * 100)}%;background:#3b82f6"></div>
        </div>
      </div>
    </div>`;
}

// ====================== PROFILE ======================
function renderProfile() {
  const panel = $('profile-panel');
  if (!panel || !currentPlayer) return;
  panel.innerHTML = `
    <div class="stat-card" style="text-align:left;margin-bottom:12px">
      <div><strong>Email:</strong> ${currentPlayer.email || currentUser?.email || '—'}</div>
      <div><strong>Tên công ty:</strong> ${currentPlayer.companyName || 'Đội Xe Xanh'}</div>
      <div><strong>Vai trò:</strong> ${currentPlayer.role === 'admin' ? 'Admin' : 'Người chơi'}</div>
      <div><strong>Xu:</strong> ${formatNum(currentPlayer.coins)}</div>
      <div><strong>Cấp:</strong> ${currentPlayer.level || 1}</div>
    </div>`;
}

// ====================== NAVIGATION ======================
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const page = $('page-' + pageId);
  if (page) page.classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-page="${pageId}"]`);
  if (btn) btn.classList.add('active');

  if (pageId === 'fleet') renderFleet();
  else if (pageId === 'shop') renderShop();
  else if (pageId === 'inventory') renderInventory();
  else if (pageId === 'company') renderCompany();
  else if (pageId === 'profile') renderProfile();
}

// ====================== AUTH ======================
function showLogin() {
  $('auth-loading').style.display = 'none';
  $('login-screen').style.display = '';
  $('app-screen').style.display = 'none';
}

function showApp() {
  $('auth-loading').style.display = 'none';
  $('login-screen').style.display = 'none';
  $('app-screen').style.display = '';
  updateCoins();
  showPage('fleet');
}

async function handleLogin() {
  const email = ($('login-email').value || '').trim();
  const password = $('login-password').value || '';
  const errEl = $('login-error');
  errEl.textContent = '';
  if (!email || !password) {
    errEl.textContent = 'Nhập email và mật khẩu.';
    return;
  }
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    currentUser = cred.user;
    await initGlobalData();
    await loadPlayer(currentUser.uid, currentUser.email);
    showApp();
  } catch (e) {
    let msg = 'Đăng nhập thất bại.';
    if (e.code === 'auth/user-not-found') msg = 'Tài khoản không tồn tại.';
    else if (e.code === 'auth/wrong-password') msg = 'Sai mật khẩu.';
    else if (e.code === 'auth/invalid-email') msg = 'Email không hợp lệ.';
    else if (e.code === 'auth/too-many-requests') msg = 'Thử lại sau.';
    errEl.textContent = msg;
  }
}

// ====================== TICK ======================
let _tickTimer = null;
function startTick() {
  clearInterval(_tickTimer);
  _tickTimer = setInterval(() => {
    if (!currentPlayer || typeof Game === 'undefined') return;
    Game.tryTriggerEvents();
    const fleetPage = $('page-fleet');
    if (fleetPage && fleetPage.classList.contains('active')) {
      // Refresh if any trip completed
      const plots = Game.getActivePlots();
      const hasReady = plots.some(p => p.status === 'on_trip' && Game.isTripReady(p));
      const hasRunning = plots.some(p => p.status === 'on_trip');
      if (hasReady || hasRunning) renderFleet();
    }
  }, 2000);
}

// ====================== BIND EVENTS ======================
function bindEvents() {
  $('btn-login')?.addEventListener('click', handleLogin);
  $('login-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });

  document.querySelectorAll('.shop-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentShopTab = tab.dataset.shop;
      renderShop();
    });
  });

  document.querySelectorAll('.inventory-tabs .tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.inventory-tabs .tab-btn').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentInvTab = tab.dataset.tab;
      renderInventory();
    });
  });

  $('btn-daily')?.addEventListener('click', async () => {
    const res = await Game.claimDaily();
    showToast(res.msg, res.ok ? 'success' : 'error');
    if (res.ok) updateCoins();
  });

  $('btn-complete-all')?.addEventListener('click', async () => {
    const res = await Game.completeAllReady();
    if (res.count > 0) {
      showToast(`Nhận ${res.count} chuyến · +${formatNum(res.totalNet)} xu`, 'success');
      renderFleet();
      updateCoins();
    } else {
      showToast('Chưa có chuyến nào hoàn thành', 'info');
    }
  });

  $('btn-auto-dispatch')?.addEventListener('click', async () => {
    const res = await Game.autoDispatchAll();
    showToast(res.count > 0 ? `Đã điều phối ${res.count} xe` : 'Không có xe sẵn sàng', res.count > 0 ? 'success' : 'info');
    renderFleet();
  });

  $('btn-logout')?.addEventListener('click', async () => {
    await auth.signOut();
    currentUser = null;
    currentPlayer = null;
    showLogin();
  });

  $('btn-reset-data')?.addEventListener('click', async () => {
    if (!confirm('XÓA TOÀN BỘ dữ liệu công ty và bắt đầu lại?')) return;
    if (!confirm('Chắc chắn? Không hoàn tác được.')) return;
    const res = await resetPlayerData();
    if (!res.ok) showToast(res.msg || 'Lỗi', 'error');
  });

  $('btn-admin')?.addEventListener('click', () => {
    window.location.href = 'admin/index.html';
  });
}

// ====================== INIT ======================
async function init() {
  initTheme();
  bindEvents();

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      try {
        await initGlobalData();
        await loadPlayer(user.uid, user.email);
        showApp();
        startTick();
      } catch (e) {
        console.error(e);
        showToast('Lỗi tải dữ liệu: ' + e.message, 'error');
        showLogin();
      }
    } else {
      currentUser = null;
      currentPlayer = null;
      showLogin();
    }
  });
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
