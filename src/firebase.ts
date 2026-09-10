/// <reference types="vite/client" />

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBxPTDO2Z0OWOWgTiOlsr48Ma-eJNec2RA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "assign-me-aadb9.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "assign-me-aadb9",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "assign-me-aadb9.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1044212616888",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1044212616888:web:85c8c6b5938700aac2ee4d"
};

const app = initializeApp(firebaseConfig);

// Standard (default) Firestore database for your own project.git commit -m "Fix Firebase authentication and Firestore permissions"
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);