import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCXHsdnrf4QCH_Xk6o0ip-VC0Ku9KRuqCw",
  authDomain: "placement-38504.firebaseapp.com",
  projectId: "placement-38504",
  storageBucket: "placement-38504.firebasestorage.app",
  messagingSenderId: "441103722709",
  appId: "1:441103722709:web:28452022d505c756401a5c",
  measurementId: "G-FMT4FZ50CZ"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});
export const storage = getStorage(app);
