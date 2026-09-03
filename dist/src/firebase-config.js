import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { getDatabase, ref, get, set } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBuEWTm_3OGSEv9MOj8zCeTWEfO4cISnkU",
  authDomain: "token-tokens.firebaseapp.com",
  projectId: "token-tokens",
  storageBucket: "token-tokens.firebasestorage.app",
  messagingSenderId: "27201167702",
  appId: "1:27201167702:web:9cacb172e3fa92951236f7",
  measurementId: "G-Y0TR8YPGLE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

window.firebaseAuth = auth;
window.firebaseDb = db;
window.fbSignIn = signInWithEmailAndPassword;
window.fbSignUp = createUserWithEmailAndPassword;
window.fbSignOut = signOut;
window.fbOnAuthStateChanged = onAuthStateChanged;

window.fbRef = ref;
window.fbGet = get;
window.fbSet = set;