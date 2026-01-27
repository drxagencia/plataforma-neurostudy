import * as firebaseApp from "firebase/app";
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

// Use firebaseApp.initializeApp to handle potential type definition mismatches
const app = firebaseApp.initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);