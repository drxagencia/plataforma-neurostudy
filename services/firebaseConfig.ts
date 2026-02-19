
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
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

// Initialize Firebase (Compat)
const app = firebase.apps.length > 0 ? firebase.app() : firebase.initializeApp(firebaseConfig);

// Initialize Secondary App (Compat)
let secondaryApp;
try {
    secondaryApp = firebase.app("SecondaryApp");
} catch (e) {
    secondaryApp = firebase.initializeApp(firebaseConfig, "SecondaryApp");
}

export const auth = app.auth();
export const secondaryAuth = secondaryApp.auth(); 
export const database = getDatabase(app); // Modular Database instance
