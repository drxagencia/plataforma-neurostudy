
import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDbNCUqJIR0OfuqoI6uh_gg6Htp2yh3fBo",
  authDomain: "neurostudy-d8a00.firebaseapp.com",
  databaseURL: "https://neurostudy-d8a00-default-rtdb.firebaseio.com",
  projectId: "neurostudy-d8a00",
  storageBucket: "neurostudy-d8a00.firebasestorage.app",
  messagingSenderId: "62427731403",
  appId: "1:62427731403:web:27244160d22deb1557924e",
  measurementId: "G-CFYSRSFF0V"
};

// Fix: Standard modular SDK functions are exported from 'firebase/app'
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize a SECONDARY app instance for Admin User Creation using correct FirebaseApp type
let secondaryApp: FirebaseApp;
try {
    secondaryApp = getApp("SecondaryApp");
} catch (e) {
    secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
}

export const auth = getAuth(app);
export const secondaryAuth = getAuth(secondaryApp); 
export const database = getDatabase(app);