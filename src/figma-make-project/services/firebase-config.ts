import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase Configuration - My Dreams Project
// Updated with correct API key details
const firebaseConfig = {
  apiKey: "AIzaSyBxaSF8kQdfvvvwgvB_aM3Eqq2KDUrSIBY",
  authDomain: "figmaapp-mydreams.firebaseapp.com",
  projectId: "figmaapp-mydreams",
  storageBucket: "figmaapp-mydreams.firebasestorage.app",
  messagingSenderId: "19543221282",
  appId: "1:19543221282:web:61ae13afc907656d94967b",
  measurementId: "G-ZH6R1M1ZQC"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

// Export the Firebase app instance
export default app

console.log('🔥 Firebase initialized with project:', firebaseConfig.projectId)