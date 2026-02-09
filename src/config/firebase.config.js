import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDfZvwhzUE3Qy1Luoyb5PPaNwM5D2MniiA",
    authDomain: "monitordepedidos-2b20b.firebaseapp.com",
    projectId: "monitordepedidos-2b20b",
    storageBucket: "monitordepedidos-2b20b.firebasestorage.app",
    messagingSenderId: "544194700696",
    appId: "1:544194700696:web:29f2e1c289ed1806a577ed"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
export const APP_ID = 'logistica-pro-360';
