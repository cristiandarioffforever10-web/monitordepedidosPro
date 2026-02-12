import { auth, db } from '../config/firebase.config.js';
import { 
    signInAnonymously, 
    onAuthStateChanged, 
    signOut, 
    GoogleAuthProvider, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const googleProvider = new GoogleAuthProvider();

export const authService = {
    async loginAnonymously() {
        try {
            return await signInAnonymously(auth);
        } catch (error) {
            console.error("Auth Error:", error);
            throw error;
        }
    },

    async loginWithGoogle() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (error) {
            console.error("Google Login Error:", error);
            throw error;
        }
    },

    async loginWithPIN(pin) {
        if (!pin) throw new Error("PIN requerido");
        try {
            // 1. Autenticación anónima para cumplir con las reglas de Firebase
            await signInAnonymously(auth);

            // 2. BUSQUEDA: Buscar el documento donde el campo 'pin' sea igual al ingresado
            const staffRef = collection(db, 'staff_access');
            const q = query(staffRef, where("pin", "==", pin));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const staffData = querySnapshot.docs[0].data();
                // Aseguramos que el rol sea operativo para aplicar las restricciones
                return { ...staffData, role: 'operativo' };
            } else {
                // Si el PIN no es válido, cerramos la sesión anónima
                await signOut(auth);
                throw new Error("PIN incorrecto");
            }
        } catch (error) {
            console.error("PIN Login Error:", error);
            throw error;
        }
    },

    async checkAuthorization(email) {
        if (!email) return false;
        try {
            const userDoc = await getDoc(doc(db, 'authorized_users', email));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                return userData.role === 'admin';
            }
            return false;
        } catch (error) {
            console.error("Authorization Check Error:", error);
            return false;
        }
    },

    onAuthChange(callback) {
        return onAuthStateChanged(auth, callback);
    },

    async logout() {
        return await signOut(auth);
    },

    getCurrentUser() {
        return auth.currentUser;
    }
};
