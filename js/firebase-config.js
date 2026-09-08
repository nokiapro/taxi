/**
 * Taxi Xanh - Firebase Config
 * Project: taxi-52bf7
 */
const firebaseConfig = {
  apiKey: "AIzaSyAU9qrzrtqyeA8POtQr6WxXiiLhieqxoZM",
  authDomain: "taxi-52bf7.firebaseapp.com",
  databaseURL: "https://taxi-52bf7-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "taxi-52bf7",
  storageBucket: "taxi-52bf7.firebasestorage.app",
  messagingSenderId: "268254018484",
  appId: "1:268254018484:web:0a142955a3453b0d07d0e1"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();

try {
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
} catch (e) {
  console.warn('auth persistence', e);
}
