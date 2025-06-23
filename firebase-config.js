// firebase-config.js

// 1. Import the CORE Firebase app AND the services you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

// 2. Your web app's Firebase configuration (this is correct)
const firebaseConfig = {
  apiKey: "AIzaSyCYgLkfEEfFzLzJBtB7lE0w0Knc4o0ws-o",
  authDomain: "apna-meme-store-fdc5b.firebaseapp.com",
  projectId: "apna-meme-store-fdc5b",
  storageBucket: "apna-meme-store-fdc5b.firebasestorage.app",
  messagingSenderId: "703244299489",
  appId: "1:703244299489:web:0e5482afa8b8f4c9f19ba0"
};

// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 4. Initialize services and EXPORT them for use in other files
export const db = getFirestore(app);
export const auth = getAuth(app);
