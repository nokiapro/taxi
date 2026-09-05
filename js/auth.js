// Taxi Tycoon v2.0.0 — Authentication Module
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  onValue
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";
import { firebaseConfig, APP_VERSION } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

let currentUser = null;
let userProfile = null;

export function getCurrentUser() {
  return currentUser;
}

export function getUserProfile() {
  return userProfile;
}

export function isAdmin() {
  return userProfile && userProfile.role === "admin";
}

/**
 * Login with email/password only (no registration)
 */
export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  currentUser = cred.user;
  await loadOrCreateProfile(currentUser);
  return currentUser;
}

export async function logout() {
  await signOut(auth);
  currentUser = null;
  userProfile = null;
}

/**
 * Load profile from DB. If missing, create default player profile.
 * Admin must set role: "admin" manually in Firebase Console.
 */
async function loadOrCreateProfile(user) {
  const profileRef = ref(db, `users/${user.uid}/profile`);
  const snap = await get(profileRef);
  if (snap.exists()) {
    userProfile = snap.val();
  } else {
    userProfile = {
      email: user.email,
      displayName: user.email.split("@")[0],
      role: "player",
      createdAt: Date.now(),
      lastLogin: Date.now(),
      version: APP_VERSION
    };
    await set(profileRef, userProfile);
  }
  // Update last login
  await update(profileRef, { lastLogin: Date.now(), version: APP_VERSION });
  return userProfile;
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadOrCreateProfile(user);
      callback(user, userProfile);
    } else {
      currentUser = null;
      userProfile = null;
      callback(null, null);
    }
  });
}

/** Save full game state to Firebase */
export async function saveGameCloud(gameState) {
  if (!currentUser) return false;
  try {
    // Strip undefined / non-serializable values for Firebase
    const clean = JSON.parse(JSON.stringify({
      ...gameState,
      savedAt: Date.now(),
      version: APP_VERSION,
      paused: false
    }));
    const gameRef = ref(db, `users/${currentUser.uid}/game`);
    await set(gameRef, clean);
    const lbRef = ref(db, `leaderboard/${currentUser.uid}`);
    await set(lbRef, {
      name: userProfile?.displayName || currentUser.email.split("@")[0],
      email: currentUser.email,
      money: gameState.money || 0,
      level: gameState.level || 1,
      reputation: Math.floor(gameState.reputation || 0),
      totalRides: gameState.totalRides || 0,
      totalIncome: gameState.totalIncome || 0,
      fleetSize: (gameState.fleet || []).length,
      day: gameState.day || 1,
      updatedAt: Date.now()
    });
    return true;
  } catch (e) {
    console.error("Save failed:", e);
    return false;
  }
}

/** Load game state from Firebase */
export async function loadGameCloud() {
  if (!currentUser) return null;
  try {
    const gameRef = ref(db, `users/${currentUser.uid}/game`);
    const snap = await get(gameRef);
    if (snap.exists()) return snap.val();
    return null;
  } catch (e) {
    console.error("Load failed:", e);
    return null;
  }
}

/** Update display name */
export async function updateDisplayName(name) {
  if (!currentUser) return;
  userProfile.displayName = name;
  await update(ref(db, `users/${currentUser.uid}/profile`), { displayName: name });
}

/** Admin: get all leaderboard */
export async function getLeaderboard(limit = 50) {
  const lbRef = ref(db, "leaderboard");
  const snap = await get(lbRef);
  if (!snap.exists()) return [];
  const data = snap.val();
  return Object.entries(data)
    .map(([uid, v]) => ({ uid, ...v }))
    .sort((a, b) => (b.money || 0) - (a.money || 0))
    .slice(0, limit);
}

/** Admin: get all users profiles */
export async function getAllUsers() {
  const usersRef = ref(db, "users");
  const snap = await get(usersRef);
  if (!snap.exists()) return [];
  const data = snap.val();
  return Object.entries(data).map(([uid, v]) => ({
    uid,
    profile: v.profile || {},
    hasGame: !!v.game,
    game: v.game || null,
    gameSummary: v.game
      ? {
          money: v.game.money,
          level: v.game.level,
          day: v.game.day,
          totalRides: v.game.totalRides,
          reputation: v.game.reputation,
          totalIncome: v.game.totalIncome,
          fleetSize: (v.game.fleet || []).length,
          drivers: (v.game.drivers || []).length,
          xp: v.game.xp,
          companyName: v.game.companyName,
          bank: v.game.bank || 0,
          prestige: v.game.prestige || 0
        }
      : null
  }));
}

/** Admin: get full game of a player */
export async function adminGetPlayerGame(uid) {
  const snap = await get(ref(db, `users/${uid}/game`));
  return snap.exists() ? snap.val() : null;
}

/** Admin: patch player game fields + sync leaderboard */
export async function adminUpdatePlayerGame(uid, patch) {
  const gameRef = ref(db, `users/${uid}/game`);
  const snap = await get(gameRef);
  const current = snap.exists() ? snap.val() : {
    money: 5000, reputation: 50, day: 1, hour: 8, minute: 0,
    level: 1, xp: 0, xpNeeded: 100, fleet: [], drivers: [],
    upgrades: [], achievements: [], totalRides: 0, totalIncome: 0,
    totalExpense: 0, todayIncome: 0, todayGoal: 500, bank: 0,
    prestige: 0, companyName: "Công ty Taxi"
  };
  const next = { ...current, ...patch, savedAt: Date.now() };
  // sanitize
  const clean = JSON.parse(JSON.stringify(next));
  await set(gameRef, clean);
  // leaderboard
  const profileSnap = await get(ref(db, `users/${uid}/profile`));
  const profile = profileSnap.exists() ? profileSnap.val() : {};
  await set(ref(db, `leaderboard/${uid}`), {
    name: profile.displayName || profile.email || "Player",
    email: profile.email || "",
    money: clean.money || 0,
    level: clean.level || 1,
    reputation: Math.floor(clean.reputation || 0),
    totalRides: clean.totalRides || 0,
    totalIncome: clean.totalIncome || 0,
    fleetSize: (clean.fleet || []).length,
    day: clean.day || 1,
    updatedAt: Date.now()
  });
  return clean;
}

/** Admin: add money (delta) */
export async function adminAddMoney(uid, amount) {
  const game = await adminGetPlayerGame(uid);
  const money = (game?.money || 0) + amount;
  return adminUpdatePlayerGame(uid, { money: Math.max(0, money) });
}

/** Admin: reset a player's game */
export async function adminResetPlayer(uid) {
  await set(ref(db, `users/${uid}/game`), null);
  await set(ref(db, `leaderboard/${uid}`), null);
}

/** Admin: set role */
export async function adminSetRole(uid, role) {
  await update(ref(db, `users/${uid}/profile`), { role });
}

/** Admin: update profile fields */
export async function adminUpdateProfile(uid, fields) {
  await update(ref(db, `users/${uid}/profile`), fields);
}

/** Admin: update global config */
export async function getGlobalConfig() {
  const snap = await get(ref(db, "config"));
  return snap.exists() ? snap.val() : {};
}

export async function setGlobalConfig(config) {
  await set(ref(db, "config"), config);
}
