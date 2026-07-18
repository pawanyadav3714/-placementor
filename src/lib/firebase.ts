import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCX3Oj46SKam3DtnP5nZGIphYMGjJBFQWo",
  authDomain: "placement-preparation-8075c.firebaseapp.com",
  projectId: "placement-preparation-8075c",
  storageBucket: "placement-preparation-8075c.firebasestorage.app",
  messagingSenderId: "392425530130",
  appId: "1:392425530130:web:26d7b37d0ae6e38c1c89cb",
  measurementId: "G-KEPKVVFX6E"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});
export const storage = getStorage(app);
