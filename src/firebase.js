import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAR0ThtUnwLjxFD7ooH7qCOC9JkKzHDT_I",
  authDomain: "karate-attendance-efbd4.firebaseapp.com",
  projectId: "karate-attendance-efbd4",
  storageBucket: "karate-attendance-efbd4.firebasestorage.app",
  messagingSenderId: "362930727482",
  appId: "1:362930727482:web:35e70937b8e3007b6b6303",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
