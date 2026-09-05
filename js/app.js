// Taxi Tycoon v2.0.0 — Application Entry
import { login, onAuth, isAdmin } from "./auth.js";
import { setUICallbacks, loadGame, startGameLoop, getGame } from "./game.js";
import {
  toast, addFeed, showAchievement, render, updateUI,
  bindUIEvents, switchPanel, showModal, closeModal
} from "./ui.js";
import { APP_VERSION } from "./firebase-config.js";

const $ = id => document.getElementById(id);

// Wire UI callbacks into game
setUICallbacks({
  toast,
  addFeed,
  showAchievement,
  render,
  updateUI
});

// Login form
$("login-form")?.addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("login-email").value.trim();
  const password = $("login-password").value;
  const errEl = $("login-error");
  const btn = $("login-btn");
  errEl.textContent = "";
  btn.disabled = true;
  btn.textContent = "Đang đăng nhập...";
  try {
    await login(email, password);
    // onAuth will handle the rest
  } catch (err) {
    console.error(err);
    let msg = "Đăng nhập thất bại";
    if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
      msg = "Email hoặc mật khẩu không đúng";
    } else if (err.code === "auth/too-many-requests") {
      msg = "Quá nhiều lần thử. Thử lại sau.";
    } else if (err.code === "auth/invalid-email") {
      msg = "Email không hợp lệ";
    }
    errEl.textContent = msg;
    btn.disabled = false;
    btn.textContent = "Đăng nhập";
  }
});

// Auth state
onAuth(async (user, profile) => {
  if (!user) {
    $("login-screen").classList.remove("hidden");
    $("app").style.display = "none";
    return;
  }

  // Logged in
  $("login-screen").classList.add("hidden");
  $("app").style.display = "flex";

  // Load game
  await loadGame();
  bindUIEvents();
  render();
  startGameLoop();

  const g = getGame();
  if (g.fleet.length === 0 && g.day === 1 && g.totalRides === 0) {
    setTimeout(() => {
      showModal(`
        <h2>🚕 Chào mừng đến Taxi Tycoon!</h2>
        <p>Bạn vừa thành lập công ty taxi. Mục tiêu: xây dựng đế chế vận tải lớn nhất thành phố.</p>
        <ul style="color:var(--text-muted);margin:12px 0 18px 18px;font-size:0.88rem">
          <li>Mua xe ở <strong>Cửa hàng</strong></li>
          <li>Thuê tài xế và gán vào xe</li>
          <li>Phân bổ xe theo nhu cầu khu vực</li>
          <li>Nâng cấp công ty để tăng lợi nhuận</li>
          <li>Nhận thưởng hàng ngày &amp; hoàn thành thành tựu</li>
          <li>Cạnh tranh trên bảng xếp hạng</li>
        </ul>
        <p style="font-size:0.82rem;color:var(--text-dim)">Bắt đầu với $5,000 · Version ${APP_VERSION}</p>
        <div class="modal-actions">
          <button class="btn btn-primary" id="welcome-ok">Bắt đầu kinh doanh!</button>
        </div>`);
      $("welcome-ok")?.addEventListener("click", closeModal);
    }, 500);
  }

  addFeed(`Chào mừng trở lại, ${profile?.displayName || user.email}!`, "event");

  if (isAdmin()) {
    const link = $("admin-link");
    if (link) link.style.display = "flex";
  }
});

// Version in login
if ($("login-version")) {
  $("login-version").textContent = "v" + APP_VERSION;
}
