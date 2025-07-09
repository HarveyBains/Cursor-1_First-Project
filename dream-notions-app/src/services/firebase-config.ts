import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgTG6QIjabrxce6TXQ1EpHxnAuq__t4iM",
  authDomain: "cursor-mydreamsapp.firebaseapp.com",
  projectId: "cursor-mydreamsapp",
  storageBucket: "cursor-mydreamsapp.firebasestorage.app",
  messagingSenderId: "560129086799",
  appId: "1:560129086799:web:94be8a8455db941b66a13a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
