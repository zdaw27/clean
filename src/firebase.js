// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBqy9FVSM1OyHRDw1DO5ZFaMhZ35ZYxlBo",
  authDomain: "clothing-app-5fe84.firebaseapp.com",
  projectId: "clothing-app-5fe84",
  storageBucket: "clothing-app-5fe84.firebasestorage.app",
  messagingSenderId: "10932015612",
  appId: "1:10932015612:web:9fa6b1e939a454955a6279",
  measurementId: "G-CVHZT6ENYG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
