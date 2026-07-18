import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAyDI8YpeBME2jVN_dauO0ldLWCNy58tY0",
  authDomain: "placement-948bb.firebaseapp.com",
  projectId: "placement-948bb",
  storageBucket: "placement-948bb.firebasestorage.app",
  messagingSenderId: "539324667661",
  appId: "1:539324667661:web:676725a0b4e6394bfd0244",
  measurementId: "G-W7HKM08FRC"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
