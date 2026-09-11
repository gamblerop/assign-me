
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBxPTDO2Z0OWOWgTiOlsr48Ma-eJNec2RA",
  authDomain: "assign-me-aadb9.firebaseapp.com",
  databaseURL:
    "https://assign-me-aadb9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "assign-me-aadb9",
  storageBucket: "assign-me-aadb9.firebasestorage.app",
  messagingSenderId: "1044212616888",
  appId: "1:1044212616888:web:85c8c6b5938700aac2ee4d",
  measurementId: "G-WT0PT9MTPF",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
});