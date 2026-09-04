import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// YMCA Ethiopia Firebase Configuration provided by user
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCtk1sqN4AXUaSc0MfeBOyc1lyTyX57cqk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ymca-certficate.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ymca-certficate",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ymca-certficate.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "947428419710",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:947428419710:web:7224ccc64c005410b6902f"
};

// Initialize Firebase safely
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
