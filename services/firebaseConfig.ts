
import * as firebaseApp from "firebase/app";
import * as firebaseAuth from "firebase/auth";
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

// Use named initializeApp. Check if app already initialized to avoid hot-reload errors.
const app = firebaseApp.getApps().length > 0 ? firebaseApp.getApp() : firebaseApp.initializeApp(firebaseConfig);

// Initialize a SECONDARY app instance for Admin User Creation.
let secondaryApp: firebaseApp.FirebaseApp;
try {
    secondaryApp = firebaseApp.getApp("SecondaryApp");
} catch (e) {
    secondaryApp = firebaseApp.initializeApp(firebaseConfig, "SecondaryApp");
}

export const auth = firebaseAuth.getAuth(app);
export const secondaryAuth = firebaseAuth.getAuth(secondaryApp); // Export secondary auth
export const database = getDatabase(app);
