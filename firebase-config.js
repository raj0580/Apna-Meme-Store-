// firebase-config.js
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// Your web app's Firebase configuration
// IMPORTANT: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCYgLkfEEfFzLzJBtB7lE0w0Knc4o0ws-o",
  authDomain: "apna-meme-store-fdc5b.firebaseapp.com",
  projectId: "apna-meme-store-fdc5b",
  storageBucket: "apna-meme-store-fdc5b.firebasestorage.app",
  messagingSenderId: "703244299489",
  appId: "1:703244299489:web:0e5482afa8b8f4c9f19ba0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services you need
export const db = getFirestore(app);
export const auth = getAuth(app);