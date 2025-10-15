// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAie6Vcgbp0knRiCT7z-Y2nun5y9r1z_1o",
  authDomain: "exerciseli-87fd0.firebaseapp.com",
  projectId: "exerciseli-87fd0",
  storageBucket: "exerciseli-87fd0.firebasestorage.app",
  messagingSenderId: "97219245286",
  appId: "1:97219245286:web:7fec41cfbe9fe37ef43727",
  measurementId: "G-BNGVKMC8Y2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
