// Taxi Tycoon v2.0.0 — UI Rendering
import {
  getGame, fmt, buyTaxi, hireDriver, assignDriverToTaxi, assignZone,
  repairTaxi, sellTaxi, fireDriver, buyUpgrade, setCompanyName,
  setSpeed, togglePause, claimDailyReward, canClaimDaily,
  saveGame, fetchLeaderboard,
  getMissions, claimMission, bankDeposit, bankWithdraw, trainDriver,
  takeLoan, repayLoan, buyAdBoost, doPrestige, getCompanyValue, toggleSound,
  CAR_TYPES, ZONES, UPGRADES, ACHIEVEMENTS
} from "./game.js";
import { getUserProfile, isAdmin, logout, updateDisplayName } from "./auth.js";
import { APP_VERSION } from "./firebase-config.js";

const $ = id => document.getElementById(id);

export function toast(msg, type = "info") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  $("toasts").appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export function addFeed(msg, type = "event") {
  const g = getGame();
  const el = document.createElement("div");
  el.className = `feed-item ${type}`;
  const t = `${String(g.hour).padStart(2, "0")}:${String(Math.floor(g.minute)).padStart(2, "0")}`;
  el.innerHTML = `<div class="time">Ngày ${g.day} · ${t}</div><div class="msg">${msg}</div>`;
  const feed = $("activity-feed");
  if (!feed) return;
  feed.prepend(el);
  while (feed.children.length > 60) feed.lastChild.remove();
}

export function showModal(html) {
  $("modal-content").innerHTML = html;
  $("modal").classList.add("show");
}

export function closeModal() {
  $("modal").classList.remove("show");
}

export function showAchievement(ach) {
  $("ach-title").textContent = ach.name;
  $("ach-desc").textContent = ach.desc + ` · +${fmt(ach.reward)}`;
  $("ach-popup").classList.add("show");
  setTimeout(() => $("ach-popup").classList.remove("show"), 4000);
}

function drawChart() {
  const canvas = $("income-chart");
  if (!canvas) return;
  const g = getGame();
  const ctx = canvas.getContext("2d");
  const w = (canvas.width = canvas.parentElement.clientWidth - 32);
  const h = (canvas.height = 110);
  ctx.clearRect(0, 0, w, h);
  const data = g.incomeHistory.length ? g.incomeHistory : [0];
  const max = Math.max(...data, 100);
  ctx.strokeStyle = "rgba(34,211,238,0.85)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * (w - 10) + 5;
    const y = h - 10 - (v / max) * (h - 20);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.lineTo((data.length - 1) / Math.max(data.length - 1, 1) * (w - 10) + 5, h - 10);
  ctx.lineTo(5, h - 10);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(34,211,238,0.22)");
  grad.addColorStop(1, "rgba(34,211,238,0)");
  ctx.fillStyle = grad;
  ctx.fill();
}

export function updateUI() {
  const g = getGame();
  if ($("money-display")) $("money-display").textContent = fmt(g.money);
  if ($("rep-display")) $("rep-display").textContent = Math.floor(g.reputation);
  if ($("day-display")) $("day-display").textContent = g.day;
  if ($("time-display")) $("time-display").textContent =
    `${String(g.hour).padStart(2, "0")}:${String(Math.floor(g.minute)).padStart(2, "0")}`;

  if ($("dash-money")) $("dash-money").textContent = fmt(g.money);
  if ($("dash-income")) $("dash-income").textContent = fmt(g.todayIncome);
  if ($("dash-rep")) $("dash-rep").textContent = Math.floor(g.reputation);
  const activeFleet = g.fleet.filter(t => t.assignedDriver && t.status !== "repair").length;
  if ($("dash-fleet")) $("dash-fleet").textContent = `${activeFleet}/${g.fleet.length}`;

  if ($("company-level")) $("company-level").textContent = g.level;
  if ($("xp-text")) $("xp-text").textContent = `${Math.floor(g.xp)} / ${g.xpNeeded}`;
  if ($("xp-bar")) $("xp-bar").style.width = `${(g.xp / g.xpNeeded) * 100}%`;
  if ($("company-name-display")) $("company-name-display").textContent = g.companyName;
  if ($("company-value")) $("company-value").textContent = fmt(getCompanyValue());
  if ($("prestige-display")) $("prestige-display").textContent = `#${g.prestige || 0} · x${(g.prestigeMult || 1).toFixed(1)}`;

  const goalPct = Math.min(100, (g.todayIncome / g.todayGoal) * 100);
  if ($("goal-pct")) $("goal-pct").textContent = Math.floor(goalPct) + "%";
  if ($("goal-bar")) $("goal-bar").style.width = goalPct + "%";
  if ($("goal-text")) $("goal-text").textContent = `Kiếm ${fmt(g.todayGoal)} hôm nay`;

  // Active events
  const evEl = $("active-events");
  if (evEl) {
    if (!g.activeEvents.length) {
      evEl.innerHTML = '<span style="color:var(--text-muted)">Không có sự kiện đặc biệt</span>';
    } else {
      evEl.innerHTML = g.activeEvents.map(e =>
        `<div style="margin:5px 0"><strong>${e.name}</strong> — ${e.desc} <span class="badge yellow">còn ${e.remaining}h</span></div>`
      ).join("");
    }
  }

  // Daily reward button state
  const dailyBtn = $("btn-daily");
  if (dailyBtn) {
    dailyBtn.disabled = !canClaimDaily();
    dailyBtn.textContent = canClaimDaily() ? "🎁 Nhận thưởng ngày" : "✓ Đã nhận hôm nay";
  }

  drawChart();
}

function renderFleet() {
  const list = $("fleet-list");
  if (!list) return;
  const g = getGame();
  if (!g.fleet.length) {
    list.innerHTML = `<div class="empty"><div class="icon">🚗</div><p>Chưa có xe nào. Hãy mua xe đầu tiên!</p></div>`;
    return;
  }
  list.innerHTML = g.fleet.map(taxi => {
    const driver = g.drivers.find(d => d.id === taxi.assignedDriver);
    const condClass = taxi.condition > 60 ? "green" : taxi.condition > 30 ? "yellow" : "red";
    const statusBadge = taxi.status === "busy" ? '<span class="badge blue">Đang chạy</span>'
      : taxi.status === "repair" ? '<span class="badge red">Cần sửa</span>'
      : '<span class="badge green">Sẵn sàng</span>';
    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div class="car-emoji">${taxi.emoji}</div>
            <div class="card-title">${taxi.name} #${taxi.id}</div>
          </div>
          ${statusBadge}
        </div>
        <div class="card-stats">
          <span class="badge">🛣 ${Math.floor(taxi.mileage)} km</span>
          <span class="badge">💰 ${fmt(taxi.earnings)}</span>
          <span class="badge">🚕 ${taxi.rides} chuyến</span>
        </div>
        <div style="margin-bottom:8px">
          <div class="xp-label"><span>Tình trạng</span><span>${Math.floor(taxi.condition)}%</span></div>
          <div class="progress"><div class="progress-bar ${condClass}" style="width:${taxi.condition}%"></div></div>
        </div>
        <div class="card-meta">
          Tài xế: ${driver ? driver.name + ` (Lv${driver.skill})` : "<em>Chưa gán</em>"}<br>
          Khu vực: ${ZONES.find(z => z.id === taxi.assignedZone)?.name || "—"}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
          <button class="btn btn-ghost btn-sm" data-action="assign-driver" data-id="${taxi.id}">Gán tài xế</button>
          <button class="btn btn-ghost btn-sm" data-action="assign-zone" data-id="${taxi.id}">Đổi khu</button>
          ${taxi.condition < 90 ? `<button class="btn btn-accent btn-sm" data-action="repair" data-id="${taxi.id}">Sửa chữa</button>` : ""}
          <button class="btn btn-danger btn-sm" data-action="sell" data-id="${taxi.id}">Bán</button>
        </div>
      </div>`;
  }).join("");
}

function renderDrivers() {
  const list = $("drivers-list");
  if (!list) return;
  const g = getGame();
  if (!g.drivers.length) {
    list.innerHTML = `<div class="empty"><div class="icon">👨‍✈️</div><p>Chưa có tài xế. Hãy thuê ngay!</p></div>`;
    return;
  }
  list.innerHTML = g.drivers.map(d => {
    const taxi = g.fleet.find(t => t.id === d.assignedTaxi);
    const moodClass = d.mood > 60 ? "green" : d.mood > 35 ? "yellow" : "red";
    return `
      <div class="card">
        <div class="card-title">👨‍✈️ ${d.name}</div>
        <div class="card-stats">
          <span class="badge purple">Kỹ năng ${d.skill}/5</span>
          <span class="badge">💵 ${fmt(d.salary)}/ngày</span>
          <span class="badge">🚕 ${d.totalRides} chuyến</span>
        </div>
        <div style="margin-bottom:8px">
          <div class="xp-label"><span>Tinh thần</span><span>${Math.floor(d.mood)}%</span></div>
          <div class="progress"><div class="progress-bar ${moodClass}" style="width:${d.mood}%"></div></div>
        </div>
        <div class="card-meta">
          Xe: ${taxi ? taxi.emoji + " #" + taxi.id : "<em>Chưa gán</em>"}<br>
          Tổng thu: ${fmt(d.totalEarnings)}
        </div>
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" data-action="assign-taxi" data-id="${d.id}">Gán xe</button>
          ${d.skill < 5 ? `<button class="btn btn-accent btn-sm" data-action="train" data-id="${d.id}">Đào tạo ($${500 * d.skill * d.skill})</button>` : ""}
          <button class="btn btn-danger btn-sm" data-action="fire" data-id="${d.id}">Sa thải</button>
        </div>
      </div>`;
  }).join("");
}

function renderCity() {
  const map = $("city-map");
  if (!map) return;
  const g = getGame();
  map.innerHTML = ZONES.map(z => {
    const demand = g.zoneDemand[z.id] || 1;
    const pct = Math.min(100, Math.max(5, (demand / 2.5) * 100));
    const color = demand > 1.5 ? "#ef4444" : demand > 1 ? "#f59e0b" : "#10b981";
    const taxisHere = g.fleet.filter(t => t.assignedZone === z.id).length;
    return `
      <div class="zone">
        <div class="zone-name">${z.emoji} ${z.name}</div>
        <div class="card-meta">Nhu cầu · ${taxisHere} xe</div>
        <div class="zone-demand"><div class="zone-demand-fill" style="width:${pct}%;background:${color}"></div></div>
        <div style="font-size:0.78rem;color:var(--text-muted)">TB cước: ${fmt(z.avgFare)}</div>
      </div>`;
  }).join("");

  const assign = $("zone-assignment");
  if (assign) {
    assign.innerHTML = g.fleet.map(t => {
      const z = ZONES.find(x => x.id === t.assignedZone);
      return `<span class="badge" style="margin:3px">${t.emoji}#${t.id} → ${z?.emoji || ""} ${z?.name || "?"}</span>`;
    }).join("") || '<span class="card-meta">Chưa có xe</span>';
  }
}

function renderShop() {
  const list = $("shop-list");
  if (!list) return;
  const g = getGame();
  list.innerHTML = CAR_TYPES.map(c => `
    <div class="card">
      <div class="shop-item">
        <div class="icon-box" style="background:${c.color}22">${c.emoji}</div>
        <div style="flex:1">
          <div class="card-title">${c.name}</div>
          <div class="card-meta">Tốc độ x${c.speed} · Thoải mái ${c.comfort} · ${c.capacity} chỗ</div>
          <div class="card-stats">
            <span class="badge">⛽ x${c.fuel}</span>
            <span class="badge">🔧 ${c.maint}/ngày</span>
          </div>
          <button class="btn btn-primary btn-sm" data-action="buy-taxi" data-id="${c.id}" ${g.money < c.price ? "disabled" : ""}>
            Mua · ${fmt(c.price)}
          </button>
        </div>
      </div>
    </div>`).join("");
}

function renderUpgrades() {
  const list = $("upgrades-list");
  if (!list) return;
  const g = getGame();
  list.innerHTML = UPGRADES.map(u => {
    const owned = g.upgrades.includes(u.id);
    return `
      <div class="card">
        <div class="shop-item">
          <div class="icon-box">${u.icon}</div>
          <div style="flex:1">
            <div class="card-title">${u.name} ${owned ? '<span class="badge green">Đã sở hữu</span>' : ""}</div>
            <div class="card-meta">${u.desc}</div>
            ${owned ? "" : `
              <button class="btn btn-accent btn-sm" data-action="buy-upgrade" data-id="${u.id}" ${g.money < u.price ? "disabled" : ""}>
                Mua · ${fmt(u.price)}
              </button>`}
          </div>
        </div>
      </div>`;
  }).join("");
}

function renderAchievements() {
  const list = $("achievements-list");
  if (!list) return;
  const g = getGame();
  list.innerHTML = ACHIEVEMENTS.map(a => {
    const done = g.achievements.includes(a.id);
    return `
      <div class="card" style="opacity:${done ? 1 : 0.65}">
        <div class="card-title">${done ? "✅" : "🔒"} ${a.name}</div>
        <div class="card-meta">${a.desc}</div>
        <span class="badge ${done ? "green" : "yellow"}">+${fmt(a.reward)}</span>
      </div>`;
  }).join("");
}

function renderStats() {
  const cards = $("stats-cards");
  if (!cards) return;
  const g = getGame();
  cards.innerHTML = `
    <div class="dash-stat"><div class="label">Tổng thu nhập</div><div class="value" style="color:#34d399">${fmt(g.totalIncome)}</div></div>
    <div class="dash-stat"><div class="label">Tổng chi tiêu</div><div class="value" style="color:#f87171">${fmt(g.totalExpense)}</div></div>
    <div class="dash-stat"><div class="label">Tổng chuyến</div><div class="value" style="color:var(--primary)">${g.totalRides}</div></div>
    <div class="dash-stat"><div class="label">Số xe</div><div class="value">${g.fleet.length}</div></div>
    <div class="dash-stat"><div class="label">Số tài xế</div><div class="value">${g.drivers.length}</div></div>
    <div class="dash-stat"><div class="label">Nâng cấp</div><div class="value">${g.upgrades.length}/${UPGRADES.length}</div></div>
    <div class="dash-stat"><div class="label">Thành tựu</div><div class="value">${g.achievements.length}/${ACHIEVEMENTS.length}</div></div>
    <div class="dash-stat"><div class="label">Streak ngày</div><div class="value">${g.dailyStreak || 0}</div></div>
  `;
  const tbody = $("rides-history");
  if (tbody) {
    tbody.innerHTML = g.rideHistory.slice(0, 20).map(r => `
      <tr>
        <td>${r.time}</td>
        <td>${r.zone}</td>
        <td>${r.driver}</td>
        <td style="color:#34d399">${fmt(r.income)}</td>
        <td>⭐ ${r.rating}</td>
      </tr>`).join("") ||
      '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Chưa có chuyến nào</td></tr>';
  }
}

async function renderLeaderboard() {
  const list = $("leaderboard-list");
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;padding:20px"><div class="spinner"></div></div>';
  try {
    const data = await fetchLeaderboard();
    if (!data.length) {
      list.innerHTML = '<div class="empty"><p>Chưa có dữ liệu xếp hạng</p></div>';
      return;
    }
    list.innerHTML = data.map((p, i) => {
      const rankClass = i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";
      return `
        <div class="lb-row">
          <div class="lb-rank ${rankClass}">${i + 1}</div>
          <div class="lb-info">
            <div class="lb-name">${p.name || "Player"}</div>
            <div class="lb-meta">Lv${p.level || 1} · ⭐${p.reputation || 0} · ${p.totalRides || 0} chuyến · ${p.fleetSize || 0} xe</div>
          </div>
          <div class="lb-money">${fmt(p.money || 0)}</div>
        </div>`;
    }).join("");
  } catch (e) {
    list.innerHTML = '<div class="empty"><p>Không tải được bảng xếp hạng</p></div>';
  }
}

function renderMissions() {
  const list = $("missions-list");
  if (!list) return;
  const missions = getMissions();
  if (!missions.length) {
    list.innerHTML = '<div class="empty"><div class="icon">🎯</div><p>Chưa có nhiệm vụ</p></div>';
    return;
  }
  list.innerHTML = missions.map(m => {
    const pct = Math.min(100, (m.progress / m.target) * 100);
    const status = m.claimed ? '<span class="badge green">Đã nhận</span>'
      : m.done ? '<span class="badge yellow">Hoàn thành!</span>'
      : '<span class="badge blue">Đang làm</span>';
    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div class="card-title">${m.label}</div>
          ${status}
        </div>
        <div class="xp-bar-wrap" style="margin:12px 0">
          <div class="xp-label"><span>Tiến độ</span><span>${Math.floor(m.progress)} / ${m.target}</span></div>
          <div class="progress"><div class="progress-bar ${m.done ? "green" : ""}" style="width:${pct}%"></div></div>
        </div>
        <div class="card-stats">
          <span class="badge green">💰 ${fmt(m.rewardMoney)}</span>
          <span class="badge purple">✨ ${m.rewardXP} XP</span>
        </div>
        ${m.done && !m.claimed ? `<button class="btn btn-primary btn-sm" data-action="claim-mission" data-id="${m.id}">Nhận thưởng</button>` : ""}
      </div>`;
  }).join("");
}

function renderBank() {
  const g = getGame();
  const stats = $("bank-stats");
  if (stats) {
    stats.innerHTML = `
      <div class="dash-stat money"><div class="label">Tiền mặt</div><div class="value">${fmt(g.money)}</div></div>
      <div class="dash-stat"><div class="label">Ngân hàng</div><div class="value" style="color:#60a5fa">${fmt(g.bank || 0)}</div></div>
      <div class="dash-stat"><div class="label">Nợ vay</div><div class="value" style="color:#f87171">${fmt(g.loanDebt || 0)}</div></div>
      <div class="dash-stat"><div class="label">Giá trị công ty</div><div class="value" style="color:#fbbf24">${fmt(getCompanyValue())}</div></div>
    `;
  }
  const actions = $("bank-actions");
  if (actions) {
    const adActive = g.adsBoostUntil && (g.day * 24 + g.hour) < g.adsBoostUntil;
    actions.innerHTML = `
      <div class="card">
        <div class="card-title">💵 Gửi / Rút tiết kiệm</div>
        <div class="card-meta">Lãi suất 2% mỗi ngày game</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <button class="btn btn-primary btn-sm" data-action="bank-dep" data-amt="1000">Gửi $1k</button>
          <button class="btn btn-primary btn-sm" data-action="bank-dep" data-amt="5000">Gửi $5k</button>
          <button class="btn btn-primary btn-sm" data-action="bank-dep" data-amt="0">Gửi hết</button>
          <button class="btn btn-ghost btn-sm" data-action="bank-wd" data-amt="1000">Rút $1k</button>
          <button class="btn btn-ghost btn-sm" data-action="bank-wd" data-amt="0">Rút hết</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title">💳 Vay vốn</div>
        <div class="card-meta">Lãi 15% một lần · phí 1%/ngày nếu chưa trả</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <button class="btn btn-accent btn-sm" data-action="loan" data-amt="5000">Vay $5k</button>
          <button class="btn btn-accent btn-sm" data-action="loan" data-amt="20000">Vay $20k</button>
          <button class="btn btn-danger btn-sm" data-action="repay-loan">Trả nợ</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title">📢 Quảng cáo</div>
        <div class="card-meta">${adActive ? "✅ Đang chạy (+30% nhu cầu)" : "Tăng 30% nhu cầu trong 8 giờ game"}</div>
        <button class="btn btn-primary btn-sm" style="margin-top:10px" data-action="ads" ${adActive ? "disabled" : ""}>Mua quảng cáo</button>
      </div>
      <div class="card">
        <div class="card-title">🔊 Âm thanh</div>
        <div class="card-meta">Bật/tắt hiệu ứng thông báo</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:10px" data-action="sound">${g.soundEnabled !== false ? "Tắt âm thanh" : "Bật âm thanh"}</button>
      </div>
    `;
  }
  const prestige = $("prestige-card");
  if (prestige) {
    prestige.innerHTML = `
      <div class="card-title">✨ Prestige (Tái sinh)</div>
      <div class="card-meta">
        Cần cấp 15+. Reset tiến độ, giữ thành tựu, nhận hệ số thu nhập vĩnh viễn.<br>
        Hiện tại: Prestige <strong>#${g.prestige || 0}</strong> · Hệ số x<strong>${(g.prestigeMult || 1).toFixed(1)}</strong>
      </div>
      <button class="btn btn-accent btn-sm" data-action="prestige" ${g.level < 15 ? "disabled" : ""}>
        Prestige ngay ${g.level < 15 ? "(cần Lv15)" : ""}
      </button>
    `;
  }
}

export function render() {
  updateUI();
  renderFleet();
  renderDrivers();
  renderCity();
  renderShop();
  renderUpgrades();
  renderAchievements();
  renderStats();
  renderMissions();
  renderBank();
  if ($("panel-leaderboard")?.classList.contains("active")) {
    renderLeaderboard();
  }
}

export function switchPanel(name) {
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item, .mobile-nav-item").forEach(n => n.classList.remove("active"));
  const panel = $(`panel-${name}`);
  if (panel) panel.classList.add("active");
  document.querySelectorAll(`[data-panel="${name}"]`).forEach(n => n.classList.add("active"));
  render();
  if (name === "leaderboard") renderLeaderboard();
}

// Event delegation for dynamic buttons
export function bindUIEvents() {
  $("modal")?.addEventListener("click", e => {
    if (e.target === $("modal")) closeModal();
  });

  document.querySelectorAll(".nav-item, .mobile-nav-item").forEach(el => {
    el.addEventListener("click", () => switchPanel(el.dataset.panel));
  });

  document.querySelectorAll(".speed-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      setSpeed(parseInt(btn.dataset.speed));
    });
  });

  $("btn-pause")?.addEventListener("click", () => {
    const paused = togglePause();
    $("btn-pause").textContent = paused ? "▶️" : "⏸️";
    toast(paused ? "Đã tạm dừng" : "Tiếp tục", "info");
  });

  $("btn-save")?.addEventListener("click", () => saveGame());

  $("btn-buy-taxi")?.addEventListener("click", () => switchPanel("shop"));
  $("btn-hire-driver")?.addEventListener("click", () => hireDriver());
  $("btn-daily")?.addEventListener("click", () => claimDailyReward());

  $("btn-logout")?.addEventListener("click", async () => {
    await logout();
    location.reload();
  });

  $("btn-rename")?.addEventListener("click", () => {
    const g = getGame();
    showModal(`
      <h2>Đổi tên công ty</h2>
      <div class="form-group" style="margin:16px 0">
        <label>Tên công ty</label>
        <input type="text" id="input-company-name" value="${g.companyName}" maxlength="40"
          style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--card-border);background:rgba(0,0,0,0.3);color:var(--text);font-family:inherit;font-size:1rem">
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="modal-cancel">Hủy</button>
        <button class="btn btn-primary" id="modal-rename-ok">Lưu</button>
      </div>`);
    $("modal-cancel")?.addEventListener("click", closeModal);
    $("modal-rename-ok")?.addEventListener("click", () => {
      setCompanyName($("input-company-name").value);
      closeModal();
      toast("Đã đổi tên công ty!", "success");
    });
  });

  // Content click delegation
  $("content")?.addEventListener("click", e => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === "buy-taxi") {
      buyTaxi(id);
      closeModal();
    } else if (action === "buy-upgrade") {
      buyUpgrade(id);
    } else if (action === "repair") {
      repairTaxi(parseInt(id));
    } else if (action === "sell") {
      const g = getGame();
      const taxi = g.fleet.find(t => t.id === parseInt(id));
      if (!taxi) return;
      const type = CAR_TYPES.find(c => c.id === taxi.typeId);
      const value = Math.floor(type.price * 0.5 * (taxi.condition / 100));
      showModal(`
        <h2>Bán xe?</h2>
        <p>Bạn sẽ nhận <strong>${fmt(value)}</strong> khi bán ${taxi.emoji} #${taxi.id}.</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="modal-cancel">Hủy</button>
          <button class="btn btn-danger" id="modal-sell-ok">Bán ngay</button>
        </div>`);
      $("modal-cancel")?.addEventListener("click", closeModal);
      $("modal-sell-ok")?.addEventListener("click", () => {
        sellTaxi(parseInt(id));
        closeModal();
      });
    } else if (action === "fire") {
      const g = getGame();
      const d = g.drivers.find(x => x.id === parseInt(id));
      if (!d) return;
      showModal(`
        <h2>Sa thải ${d.name}?</h2>
        <p>Tài xế sẽ rời công ty ngay.</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="modal-cancel">Hủy</button>
          <button class="btn btn-danger" id="modal-fire-ok">Sa thải</button>
        </div>`);
      $("modal-cancel")?.addEventListener("click", closeModal);
      $("modal-fire-ok")?.addEventListener("click", () => {
        fireDriver(parseInt(id));
        closeModal();
      });
    } else if (action === "assign-driver") {
      openAssignDriver(parseInt(id));
    } else if (action === "assign-zone") {
      openAssignZone(parseInt(id));
    } else if (action === "assign-taxi") {
      openAssignTaxi(parseInt(id));
    } else if (action === "train") {
      trainDriver(parseInt(id));
    } else if (action === "claim-mission") {
      claimMission(id);
    } else if (action === "bank-dep") {
      const g = getGame();
      let amt = parseInt(btn.dataset.amt);
      if (amt === 0) amt = g.money;
      bankDeposit(amt);
    } else if (action === "bank-wd") {
      const g = getGame();
      let amt = parseInt(btn.dataset.amt);
      if (amt === 0) amt = g.bank || 0;
      bankWithdraw(amt);
    } else if (action === "loan") {
      takeLoan(parseInt(btn.dataset.amt));
    } else if (action === "repay-loan") {
      repayLoan();
    } else if (action === "ads") {
      buyAdBoost();
    } else if (action === "sound") {
      toggleSound();
      render();
    } else if (action === "prestige") {
      if (confirm("Prestige sẽ reset gần như toàn bộ tiến độ. Tiếp tục?")) doPrestige();
    }
  });

  // Show admin link if admin
  const profile = getUserProfile();
  if (isAdmin() && $("admin-link")) {
    $("admin-link").style.display = "flex";
  }
  if (profile && $("user-name")) {
    $("user-name").textContent = profile.displayName || profile.email?.split("@")[0];
  }
  if (profile && $("user-avatar")) {
    const name = profile.displayName || profile.email || "?";
    $("user-avatar").textContent = name.charAt(0).toUpperCase();
  }
  if ($("app-version")) $("app-version").textContent = "v" + APP_VERSION;
}

function openAssignDriver(taxiId) {
  const g = getGame();
  const free = g.drivers.filter(d => !d.assignedTaxi || d.assignedTaxi === taxiId);
  if (!free.length) {
    toast("Không còn tài xế trống! Hãy thuê thêm.", "error");
    return;
  }
  showModal(`
    <h2>Gán tài xế</h2>
    <p>Chọn tài xế cho xe #${taxiId}</p>
    <div style="display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto">
      ${free.map(d => `
        <button class="btn btn-ghost" style="justify-content:space-between" data-driver="${d.id}">
          <span>👨‍✈️ ${d.name}</span>
          <span class="badge purple">Lv${d.skill}</span>
        </button>`).join("")}
    </div>
    <div class="modal-actions"><button class="btn btn-ghost" id="modal-cancel">Đóng</button></div>`);
  $("modal-cancel")?.addEventListener("click", closeModal);
  $("modal-content").querySelectorAll("[data-driver]").forEach(btn => {
    btn.addEventListener("click", () => {
      assignDriverToTaxi(parseInt(btn.dataset.driver), taxiId);
      closeModal();
    });
  });
}

function openAssignZone(taxiId) {
  const g = getGame();
  showModal(`
    <h2>Chọn khu vực</h2>
    <p>Gán xe #${taxiId} đến khu vực nào?</p>
    <div style="display:flex;flex-direction:column;gap:6px;max-height:320px;overflow-y:auto">
      ${ZONES.map(z => `
        <button class="btn btn-ghost" style="justify-content:space-between" data-zone="${z.id}">
          <span>${z.emoji} ${z.name}</span>
          <span class="badge">${(g.zoneDemand[z.id] || 1).toFixed(1)}</span>
        </button>`).join("")}
    </div>
    <div class="modal-actions"><button class="btn btn-ghost" id="modal-cancel">Đóng</button></div>`);
  $("modal-cancel")?.addEventListener("click", closeModal);
  $("modal-content").querySelectorAll("[data-zone]").forEach(btn => {
    btn.addEventListener("click", () => {
      assignZone(taxiId, btn.dataset.zone);
      closeModal();
    });
  });
}

function openAssignTaxi(driverId) {
  const g = getGame();
  const free = g.fleet.filter(t => !t.assignedDriver || t.assignedDriver === driverId);
  if (!free.length) {
    toast("Không còn xe trống!", "error");
    return;
  }
  showModal(`
    <h2>Gán xe</h2>
    <p>Chọn xe cho tài xế</p>
    <div style="display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto">
      ${free.map(t => `
        <button class="btn btn-ghost" style="justify-content:space-between" data-taxi="${t.id}">
          <span>${t.emoji} ${t.name} #${t.id}</span>
          <span class="badge">${Math.floor(t.condition)}%</span>
        </button>`).join("")}
    </div>
    <div class="modal-actions"><button class="btn btn-ghost" id="modal-cancel">Đóng</button></div>`);
  $("modal-cancel")?.addEventListener("click", closeModal);
  $("modal-content").querySelectorAll("[data-taxi]").forEach(btn => {
    btn.addEventListener("click", () => {
      assignDriverToTaxi(driverId, parseInt(btn.dataset.taxi));
      closeModal();
    });
  });
}
