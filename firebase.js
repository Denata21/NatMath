// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Config Firebase lo
const firebaseConfig = {
  apiKey: "AIzaSyCYFtqhUq0aTLvPWBON7dVEz6iSafQvs-Y",
  authDomain: "natmath-2110.firebaseapp.com",
  projectId: "natmath-2110",
  storageBucket: "natmath-2110.firebasestorage.app",
  messagingSenderId: "879310505464",
  appId: "1:879310505464:web:baea7022b47ab77a65420d"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };