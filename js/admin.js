// Taxi Tycoon v2.1.0 — Admin Panel
import {
  onAuth, isAdmin, logout, getAllUsers, getLeaderboard,
  adminResetPlayer, adminSetRole, getGlobalConfig, setGlobalConfig,
  adminUpdatePlayerGame, adminAddMoney, adminGetPlayerGame, adminUpdateProfile
} from "./auth.js";
import { APP_VERSION } from "./firebase-config.js";

const $ = id => document.getElementById(id);
const fmt = n => {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "k";
  return "$" + Math.floor(n).toLocaleString("en-US");
};
const timeAgo = ts => {
  if (!ts) return "—";
  const d = Date.now() - ts;
  if (d < 60000) return "Vừa xong";
  if (d < 3600000) return Math.floor(d / 60000) + " phút trước";
  if (d < 86400000) return Math.floor(d / 3600000) + " giờ trước";
  return Math.floor(d / 86400000) + " ngày trước";
};

function toast(msg, type = "info") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  $("toasts")?.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

let allUsers = [];
let allLB = [];
let filteredUsers = [];
let page = 1;
const PER_PAGE = 15;

function switchPanel(name) {
  document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".admin-nav-item").forEach(n => n.classList.remove("active"));
  $(`admin-panel-${name}`)?.classList.add("active");
  document.querySelector(`.admin-nav-item[data-panel="${name}"]`)?.classList.add("active");

  if (name === "overview") loadOverview();
  if (name === "users") loadUsers();
  if (name === "leaderboard") loadLB();
  if (name === "economy") loadEconomy();
  if (name === "config") loadConfig();
}

async function fetchData() {
  const [users, lb] = await Promise.all([getAllUsers(), getLeaderboard(100)]);
  allUsers = users || [];
  allLB = lb || [];
  if ($("nav-count-users")) $("nav-count-users").textContent = allUsers.length;
  return { users: allUsers, lb: allLB };
}

async function loadOverview() {
  try {
    const { users, lb } = await fetchData();
    $("stat-users").textContent = users.length;
    $("stat-players").textContent = users.filter(u => u.hasGame).length;
    $("stat-admins").textContent = users.filter(u => u.profile?.role === "admin").length;
    const totalMoney = lb.reduce((s, p) => s + (p.money || 0), 0);
    $("stat-economy").textContent = fmt(totalMoney);
    $("stat-rides").textContent = lb.reduce((s, p) => s + (p.totalRides || 0), 0).toLocaleString();
    $("stat-fleet").textContent = lb.reduce((s, p) => s + (p.fleetSize || 0), 0);

    // Top 5
    const top5 = [...lb].sort((a, b) => (b.money || 0) - (a.money || 0)).slice(0, 5);
    $("overview-top5").innerHTML = top5.length
      ? top5.map((p, i) => `
        <div class="activity-item">
          <div class="act-icon">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1)}</div>
          <div>
            <div style="font-weight:600">${p.name || "Player"}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">Lv${p.level || 1} · ${p.totalRides || 0} chuyến</div>
          </div>
          <div class="act-time" style="color:#34d399;font-weight:700;font-family:var(--mono)">${fmt(p.money)}</div>
        </div>`).join("")
      : '<div class="admin-empty"><p>Chưa có dữ liệu</p></div>';

    // Recent logins
    const recent = [...users]
      .filter(u => u.profile?.lastLogin)
      .sort((a, b) => (b.profile.lastLogin || 0) - (a.profile.lastLogin || 0))
      .slice(0, 6);
    $("overview-recent").innerHTML = recent.length
      ? recent.map(u => `
        <div class="activity-item">
          <div class="act-icon">👤</div>
          <div>
            <div style="font-weight:600">${u.profile?.displayName || u.profile?.email || "User"}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">${u.profile?.email || ""}</div>
          </div>
          <div class="act-time">${timeAgo(u.profile?.lastLogin)}</div>
        </div>`).join("")
      : '<div class="admin-empty"><p>Chưa có dữ liệu</p></div>';
  } catch (e) {
    toast("Lỗi tải overview: " + e.message, "error");
  }
}

async function loadEconomy() {
  try {
    if (!allLB.length) await fetchData();
    const lb = allLB;
    if (!lb.length) {
      $("eco-avg-money").textContent = "—";
      $("eco-bars").innerHTML = '<div class="admin-empty"><p>Chưa có dữ liệu</p></div>';
      return;
    }
    const avgMoney = lb.reduce((s, p) => s + (p.money || 0), 0) / lb.length;
    const avgLevel = lb.reduce((s, p) => s + (p.level || 0), 0) / lb.length;
    const avgRides = lb.reduce((s, p) => s + (p.totalRides || 0), 0) / lb.length;
    const maxMoney = Math.max(...lb.map(p => p.money || 0));
    $("eco-avg-money").textContent = fmt(avgMoney);
    $("eco-avg-level").textContent = avgLevel.toFixed(1);
    $("eco-avg-rides").textContent = Math.round(avgRides);
    $("eco-max-money").textContent = fmt(maxMoney);

    const top10 = [...lb].sort((a, b) => (b.money || 0) - (a.money || 0)).slice(0, 10);
    const max = top10[0]?.money || 1;
    $("eco-bars").innerHTML = top10.map(p => `
      <div class="bar-row">
        <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.name}">${p.name || "?"}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, ((p.money || 0) / max) * 100)}%"></div></div>
        <div class="bar-val">${fmt(p.money)}</div>
      </div>`).join("");
  } catch (e) {
    toast("Lỗi economy: " + e.message, "error");
  }
}

function getGameOf(u) {
  const s = u.gameSummary || {};
  const full = u.game || {};
  const lb = allLB.find(p => p.uid === u.uid) || {};
  return {
    money: lb.money ?? s.money ?? full.money,
    level: lb.level ?? s.level ?? full.level,
    day: lb.day ?? s.day ?? full.day,
    totalRides: lb.totalRides ?? s.totalRides ?? full.totalRides,
    fleetSize: lb.fleetSize ?? s.fleetSize ?? (full.fleet || []).length,
    reputation: lb.reputation ?? s.reputation ?? full.reputation,
    totalIncome: lb.totalIncome ?? s.totalIncome ?? full.totalIncome,
    bank: s.bank ?? full.bank ?? 0,
    prestige: s.prestige ?? full.prestige ?? 0,
    drivers: s.drivers ?? (full.drivers || []).length
  };
}

function applyUserFilters() {
  const q = ($("user-search")?.value || "").toLowerCase().trim();
  const role = $("user-filter-role")?.value || "all";
  const sort = $("user-sort")?.value || "lastLogin";

  filteredUsers = allUsers.filter(u => {
    const p = u.profile || {};
    const matchQ = !q ||
      (p.email || "").toLowerCase().includes(q) ||
      (p.displayName || "").toLowerCase().includes(q) ||
      (u.uid || "").toLowerCase().includes(q);
    const matchRole = role === "all" || (p.role || "player") === role;
    return matchQ && matchRole;
  });

  filteredUsers.sort((a, b) => {
    const ga = getGameOf(a);
    const gb = getGameOf(b);
    if (sort === "money") return (gb.money || 0) - (ga.money || 0);
    if (sort === "name") return (a.profile?.displayName || "").localeCompare(b.profile?.displayName || "");
    if (sort === "day") return (gb.day || 0) - (ga.day || 0);
    return (b.profile?.lastLogin || 0) - (a.profile?.lastLogin || 0);
  });

  page = 1;
  renderUsersTable();
}

function renderUsersTable() {
  const tbody = $("users-tbody");
  if (!tbody) return;

  const total = filteredUsers.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (page > pages) page = pages;
  const start = (page - 1) * PER_PAGE;
  const slice = filteredUsers.slice(start, start + PER_PAGE);

  $("users-quick").innerHTML = `
    <div class="quick-chip"><span>Hiện:</span>${total}</div>
    <div class="quick-chip"><span>Admin:</span>${filteredUsers.filter(u => u.profile?.role === "admin").length}</div>
    <div class="quick-chip"><span>Có game:</span>${filteredUsers.filter(u => u.hasGame).length}</div>
  `;

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="admin-empty"><div class="icon">👥</div><p>Không tìm thấy người chơi</p></div></td></tr>`;
  } else {
    tbody.innerHTML = slice.map(u => {
      const p = u.profile || {};
      const g = getGameOf(u);
      const role = p.role || "player";
      const name = p.displayName || p.email?.split("@")[0] || "?";
      const initial = name.charAt(0).toUpperCase();
      return `
        <tr>
          <td>
            <div class="user-cell">
              <div class="user-av">${initial}</div>
              <div>
                <div class="name">${name}</div>
                <div class="email">${p.email || u.uid.slice(0, 12) + "…"}</div>
              </div>
            </div>
          </td>
          <td><span class="role-badge ${role}">${role}</span></td>
          <td style="color:#34d399;font-family:var(--mono);font-weight:600">${u.hasGame || g.money != null ? fmt(g.money) : "—"}</td>
          <td>${g.level != null ? g.level : "—"}</td>
          <td>${g.day != null ? g.day : "—"}</td>
          <td>${g.totalRides != null ? g.totalRides : "—"}</td>
          <td>${g.fleetSize != null ? g.fleetSize : "—"}</td>
          <td style="font-size:0.78rem;color:var(--text-muted)">${timeAgo(p.lastLogin)}</td>
          <td>
            <div class="action-btns">
              <button class="btn btn-ghost btn-sm" data-detail="${u.uid}">Chi tiết</button>
              <button class="btn btn-ghost btn-sm" data-role="${u.uid}" data-current="${role}">
                ${role === "admin" ? "→ Player" : "→ Admin"}
              </button>
              <button class="btn btn-danger btn-sm" data-reset="${u.uid}">Reset</button>
            </div>
          </td>
        </tr>`;
    }).join("");
  }

  $("users-page-info").textContent = `${total} người chơi · trang ${page}/${pages}`;
  const pagesEl = $("users-pages");
  pagesEl.innerHTML = "";
  for (let i = 1; i <= Math.min(pages, 8); i++) {
    const btn = document.createElement("button");
    btn.className = "page-btn" + (i === page ? " active" : "");
    btn.textContent = i;
    btn.addEventListener("click", () => { page = i; renderUsersTable(); });
    pagesEl.appendChild(btn);
  }

  // Bind actions
  tbody.querySelectorAll("[data-detail]").forEach(btn => {
    btn.addEventListener("click", () => openDetail(btn.dataset.detail));
  });
  tbody.querySelectorAll("[data-role]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const uid = btn.dataset.role;
      const next = btn.dataset.current === "admin" ? "player" : "admin";
      if (!confirm(`Đổi role thành "${next}"?`)) return;
      try {
        await adminSetRole(uid, next);
        toast(`Đã đổi role → ${next}`, "success");
        await loadUsers();
      } catch (e) {
        toast("Lỗi: " + e.message, "error");
      }
    });
  });
  tbody.querySelectorAll("[data-reset]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Xóa TOÀN BỘ dữ liệu game của user này? Không hoàn tác được.")) return;
      try {
        await adminResetPlayer(btn.dataset.reset);
        toast("Đã reset game player", "success");
        await loadUsers();
        await loadOverview();
      } catch (e) {
        toast("Lỗi: " + e.message, "error");
      }
    });
  });
}

async function loadUsers() {
  const tbody = $("users-tbody");
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px"><div class="spinner"></div></td></tr>';
  try {
    await fetchData();
    applyUserFilters();
  } catch (e) {
    const msg = e.message || String(e);
    const isPerm = /permission|denied|PERMISSION/i.test(msg);
    tbody.innerHTML = `<tr><td colspan="9" style="color:#f87171;padding:20px;line-height:1.7">
      <strong>Lỗi: ${msg}</strong><br>
      ${isPerm ? `<span style="color:var(--text-muted);font-size:0.85rem">
        → Firebase Rules chưa cho Admin đọc <code>users</code>.<br>
        → Set <code>role = "admin"</code> trong Database.<br>
        → Tạm test: <code>{ "rules": { ".read": true, ".write": true } }</code>
      </span>` : ""}
    </td></tr>`;
  }
}

function openDetail(uid) {
  const u = allUsers.find(x => x.uid === uid);
  if (!u) return;
  const p = u.profile || {};
  const g = getGameOf(u);
  const lb = allLB.find(x => x.uid === uid);
  const name = p.displayName || p.email || uid;

  $("drawer-title").textContent = name;
  $("drawer-body").innerHTML = `
    <div class="drawer-section">
      <h3>Hồ sơ</h3>
      <div class="detail-grid">
        <div class="detail-item"><div class="d-label">Email</div><div class="d-value" style="font-size:0.8rem;font-family:inherit">${p.email || "—"}</div></div>
        <div class="detail-item"><div class="d-label">Role</div><div class="d-value"><span class="role-badge ${p.role || "player"}">${p.role || "player"}</span></div></div>
        <div class="detail-item"><div class="d-label">UID</div><div class="d-value" style="font-size:0.65rem">${uid.slice(0, 14)}…</div></div>
        <div class="detail-item"><div class="d-label">Last login</div><div class="d-value" style="font-size:0.8rem;font-family:inherit">${timeAgo(p.lastLogin)}</div></div>
      </div>
    </div>
    <div class="drawer-section">
      <h3>Dữ liệu game</h3>
      <div class="detail-grid">
        <div class="detail-item"><div class="d-label">Tiền</div><div class="d-value" style="color:#34d399">${fmt(g.money)}</div></div>
        <div class="detail-item"><div class="d-label">Ngân hàng</div><div class="d-value" style="color:#60a5fa">${fmt(g.bank)}</div></div>
        <div class="detail-item"><div class="d-label">Cấp</div><div class="d-value">${g.level ?? "—"}</div></div>
        <div class="detail-item"><div class="d-label">Ngày</div><div class="d-value">${g.day ?? "—"}</div></div>
        <div class="detail-item"><div class="d-label">Uy tín</div><div class="d-value">${g.reputation != null ? Math.floor(g.reputation) : "—"}</div></div>
        <div class="detail-item"><div class="d-label">Chuyến</div><div class="d-value">${g.totalRides ?? "—"}</div></div>
        <div class="detail-item"><div class="d-label">Xe</div><div class="d-value">${g.fleetSize ?? "—"}</div></div>
        <div class="detail-item"><div class="d-label">Prestige</div><div class="d-value">${g.prestige ?? 0}</div></div>
      </div>
    </div>
    <div class="drawer-section">
      <h3>💰 Cộng / trừ tiền</h3>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
        <button class="btn btn-primary btn-sm" data-add-money="1000">+$1k</button>
        <button class="btn btn-primary btn-sm" data-add-money="10000">+$10k</button>
        <button class="btn btn-primary btn-sm" data-add-money="100000">+$100k</button>
        <button class="btn btn-danger btn-sm" data-add-money="-5000">-$5k</button>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <input type="number" id="custom-money" placeholder="Số tùy chỉnh" style="flex:1;padding:8px 12px;border-radius:10px;border:1px solid var(--card-border);background:rgba(0,0,0,0.3);color:var(--text);font-family:inherit" />
        <button class="btn btn-accent btn-sm" id="btn-custom-money">Cộng</button>
      </div>
    </div>
    <div class="drawer-section">
      <h3>✏️ Chỉnh sửa chỉ số</h3>
      <div class="detail-grid" style="margin-bottom:10px">
        <div>
          <div class="d-label" style="margin-bottom:4px">Set tiền =</div>
          <input type="number" id="set-money" placeholder="${g.money || 0}" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--card-border);background:rgba(0,0,0,0.3);color:var(--text);font-family:inherit" />
        </div>
        <div>
          <div class="d-label" style="margin-bottom:4px">Set cấp =</div>
          <input type="number" id="set-level" placeholder="${g.level || 1}" min="1" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--card-border);background:rgba(0,0,0,0.3);color:var(--text);font-family:inherit" />
        </div>
        <div>
          <div class="d-label" style="margin-bottom:4px">Set uy tín (0-100)</div>
          <input type="number" id="set-rep" placeholder="${Math.floor(g.reputation || 50)}" min="0" max="100" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--card-border);background:rgba(0,0,0,0.3);color:var(--text);font-family:inherit" />
        </div>
        <div>
          <div class="d-label" style="margin-bottom:4px">Set ngày</div>
          <input type="number" id="set-day" placeholder="${g.day || 1}" min="1" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--card-border);background:rgba(0,0,0,0.3);color:var(--text);font-family:inherit" />
        </div>
        <div>
          <div class="d-label" style="margin-bottom:4px">Set ngân hàng</div>
          <input type="number" id="set-bank" placeholder="${g.bank || 0}" min="0" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--card-border);background:rgba(0,0,0,0.3);color:var(--text);font-family:inherit" />
        </div>
        <div>
          <div class="d-label" style="margin-bottom:4px">Set prestige</div>
          <input type="number" id="set-prestige" placeholder="${g.prestige || 0}" min="0" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--card-border);background:rgba(0,0,0,0.3);color:var(--text);font-family:inherit" />
        </div>
      </div>
      <button class="btn btn-primary btn-block btn-sm" id="btn-apply-stats">Áp dụng chỉ số</button>
    </div>
    <div class="drawer-section">
      <h3>Hành động khác</h3>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-ghost btn-block" id="drawer-role">
          Đổi role → ${(p.role || "player") === "admin" ? "player" : "admin"}
        </button>
        <button class="btn btn-accent btn-block" id="drawer-give-taxi">Tặng 1 Taxi Comfort</button>
        <button class="btn btn-danger btn-block" id="drawer-reset">Reset dữ liệu game</button>
      </div>
    </div>
  `;

  $("drawer-overlay").classList.add("show");

  const refresh = async () => {
    await loadUsers();
    openDetail(uid);
  };

  $("drawer-body").querySelectorAll("[data-add-money]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const amt = parseInt(btn.dataset.addMoney);
      try {
        await adminAddMoney(uid, amt);
        toast(`${amt >= 0 ? "+" : ""}${fmt(amt)} tiền`, "success");
        await refresh();
      } catch (e) { toast(e.message, "error"); }
    });
  });

  $("btn-custom-money")?.addEventListener("click", async () => {
    const amt = parseInt($("custom-money").value);
    if (!amt) return toast("Nhập số tiền", "error");
    try {
      await adminAddMoney(uid, amt);
      toast(`Đã cộng ${fmt(amt)}`, "success");
      await refresh();
    } catch (e) { toast(e.message, "error"); }
  });

  $("btn-apply-stats")?.addEventListener("click", async () => {
    const patch = {};
    const money = $("set-money").value;
    const level = $("set-level").value;
    const rep = $("set-rep").value;
    const day = $("set-day").value;
    const bank = $("set-bank").value;
    const prestige = $("set-prestige").value;
    if (money !== "") patch.money = Math.max(0, Number(money));
    if (level !== "") {
      patch.level = Math.max(1, Number(level));
      patch.xpNeeded = Math.floor(100 * Math.pow(1.35, patch.level - 1));
    }
    if (rep !== "") patch.reputation = Math.max(0, Math.min(100, Number(rep)));
    if (day !== "") patch.day = Math.max(1, Number(day));
    if (bank !== "") patch.bank = Math.max(0, Number(bank));
    if (prestige !== "") {
      patch.prestige = Math.max(0, Number(prestige));
      patch.prestigeMult = 1 + patch.prestige * 0.1;
    }
    if (!Object.keys(patch).length) return toast("Chưa nhập gì", "info");
    try {
      await adminUpdatePlayerGame(uid, patch);
      toast("Đã cập nhật chỉ số", "success");
      await refresh();
    } catch (e) { toast(e.message, "error"); }
  });

  $("drawer-role")?.addEventListener("click", async () => {
    const next = (p.role || "player") === "admin" ? "player" : "admin";
    if (!confirm(`Đổi role thành ${next}?`)) return;
    await adminSetRole(uid, next);
    toast(`Role → ${next}`, "success");
    closeDrawer();
    await loadUsers();
  });

  $("drawer-give-taxi")?.addEventListener("click", async () => {
    try {
      const full = await adminGetPlayerGame(uid) || {};
      const fleet = full.fleet || [];
      const nextId = full.nextTaxiId || (fleet.length + 1);
      fleet.push({
        id: nextId,
        typeId: "comfort",
        name: "Taxi Comfort",
        emoji: "🚖",
        condition: 100,
        mileage: 0,
        assignedDriver: null,
        assignedZone: "center",
        status: "idle",
        earnings: 0,
        rides: 0
      });
      await adminUpdatePlayerGame(uid, { fleet, nextTaxiId: nextId + 1 });
      toast("Đã tặng Taxi Comfort", "success");
      await refresh();
    } catch (e) { toast(e.message, "error"); }
  });

  $("drawer-reset")?.addEventListener("click", async () => {
    if (!confirm("Xóa toàn bộ game data?")) return;
    await adminResetPlayer(uid);
    toast("Đã reset", "success");
    closeDrawer();
    await loadUsers();
  });
}

function closeDrawer() {
  $("drawer-overlay")?.classList.remove("show");
}

async function loadLB() {
  const list = $("admin-lb-list");
  list.innerHTML = '<div style="text-align:center;padding:30px"><div class="spinner"></div></div>';
  try {
    await fetchData();
    const data = allLB;
    if (!data.length) {
      list.innerHTML = '<div class="admin-empty"><div class="icon">🥇</div><p>Chưa có dữ liệu xếp hạng</p></div>';
      return;
    }
    list.innerHTML = data.map((p, i) => {
      const rankClass = i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";
      return `
        <div class="lb-row">
          <div class="lb-rank ${rankClass}">${i + 1}</div>
          <div class="lb-info">
            <div class="lb-name">${p.name || "Player"} <span style="color:var(--text-dim);font-size:0.75rem;font-weight:400">${p.email || ""}</span></div>
            <div class="lb-meta">Lv${p.level || 1} · ⭐${p.reputation || 0} · ${p.totalRides || 0} chuyến · ${p.fleetSize || 0} xe · Day ${p.day || 1}</div>
          </div>
          <div class="lb-money">${fmt(p.money || 0)}</div>
        </div>`;
    }).join("");
  } catch (e) {
    list.innerHTML = `<div style="color:#f87171;padding:20px">Lỗi: ${e.message}</div>`;
  }
}

async function loadConfig() {
  try {
    const cfg = await getGlobalConfig();
    $("cfg-motd").value = cfg.motd || "";
    $("cfg-maintenance").checked = !!cfg.maintenance;
    if ($("cfg-notes")) $("cfg-notes").value = cfg.notes || "";
  } catch (e) {
    toast("Không tải được config: " + e.message, "error");
  }
}

// Events
document.querySelectorAll(".admin-nav-item").forEach(el => {
  el.addEventListener("click", () => {
    if (el.dataset.panel) switchPanel(el.dataset.panel);
  });
});

$("btn-admin-logout")?.addEventListener("click", async () => {
  await logout();
  location.href = "index.html";
});
$("btn-back-game")?.addEventListener("click", () => { location.href = "index.html"; });
$("btn-refresh-all")?.addEventListener("click", () => loadOverview());
$("btn-refresh-users")?.addEventListener("click", () => loadUsers());
$("btn-refresh-lb")?.addEventListener("click", () => loadLB());
$("drawer-close")?.addEventListener("click", closeDrawer);
$("drawer-overlay")?.addEventListener("click", e => {
  if (e.target === $("drawer-overlay")) closeDrawer();
});

$("user-search")?.addEventListener("input", () => applyUserFilters());
$("user-filter-role")?.addEventListener("change", () => applyUserFilters());
$("user-sort")?.addEventListener("change", () => applyUserFilters());

$("cfg-save")?.addEventListener("click", async () => {
  try {
    await setGlobalConfig({
      motd: $("cfg-motd").value.trim(),
      maintenance: $("cfg-maintenance").checked,
      notes: $("cfg-notes")?.value?.trim() || "",
      updatedAt: Date.now()
    });
    toast("Đã lưu cấu hình", "success");
  } catch (e) {
    toast("Lỗi lưu: " + e.message, "error");
  }
});

// Auth guard
onAuth((user, profile) => {
  if (!user) {
    location.href = "index.html";
    return;
  }
  if (!isAdmin()) {
    alert("Bạn không có quyền Admin.\nHãy set role: \"admin\" trong Firebase Realtime Database.");
    location.href = "index.html";
    return;
  }
  $("admin-user").textContent = profile?.displayName || user.email;
  $("admin-version").textContent = "v" + APP_VERSION;
  loadOverview();
});
