import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate Firebase configuration
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
] as const;

const missingVars = requiredEnvVars.filter(
  varName => !import.meta.env[varName]
);

if (missingVars.length > 0) {
  const errorMessage = `Missing required Firebase environment variables: ${missingVars.join(', ')}\n` +
    `Please check your .env file and ensure all VITE_FIREBASE_* variables are set.`;
  
  // 개발 모드에서는 경고만 표시하고, 프로덕션에서는 에러를 던짐
  if (import.meta.env.MODE === 'development') {
    console.warn('⚠️', errorMessage);
    console.warn('⚠️ Firebase가 제대로 작동하지 않을 수 있습니다.');
  } else {
    throw new Error(errorMessage);
  }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

export { db, auth };
