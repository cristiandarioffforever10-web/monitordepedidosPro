import { doc, setDoc, updateDoc, deleteDoc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { INITIAL_STAFF } from "../config/constants.js";

/**
 * Servicio de Logística para RutaTotal 360
 * Encapsula todas las operaciones de Firestore para facilitar la migración a Angular.
 */
export class LogisticsService {
    constructor(db, appId) {
        this.db = db;
        this.appId = appId;
    }

    /**
     * Escucha cambios en los pedidos en tiempo real
     */
    listenOrders(callback) {
        const ordersRef = collection(this.db, 'artifacts', this.appId, 'public', 'data', 'orders');
        return onSnapshot(ordersRef, (snapshot) => {
            const orders = {};
            snapshot.forEach(doc => {
                orders[doc.id] = doc.data();
            });
            callback(orders);
        }, (error) => console.error("Error en listenOrders:", error));
    }

    /**
     * Escucha cambios en la flota (staff)
     */
    listenStaff(callback) {
        const configRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'config', 'staff');
        return onSnapshot(configRef, (snapshot) => {
            let staff = [];
            if (snapshot.exists()) {
                staff = snapshot.data().list || [];
            } else {
                staff = INITIAL_STAFF;
                setDoc(configRef, { list: staff });
            }
            callback(staff);
        }, (error) => console.error("Error en listenStaff:", error));
    }

    async createOrder(id, repartidor = null) {
        const orderRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'orders', id.toString());
        const newOrder = {
            id: parseInt(id),
            repartidor: repartidor || null,
            status: repartidor ? 'en ruta' : 'nuevo',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };
        await setDoc(orderRef, newOrder);
        return newOrder;
    }

    async assignOrder(id, repartidor) {
        const orderRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'orders', id.toString());
        await updateDoc(orderRef, {
            repartidor: repartidor || null,
            status: repartidor ? 'en ruta' : 'nuevo',
            timestamp: Date.now()
        });
    }

    async finalizeOrder(id) {
        const orderRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'orders', id.toString());
        await updateDoc(orderRef, {
            status: 'entregado',
            timestamp: Date.now()
        });
    }

    async deleteOrder(id) {
        const orderRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'orders', id.toString());
        await deleteDoc(orderRef);
    }

    async updateStaff(newList) {
        const configRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'config', 'staff');
        await setDoc(configRef, { list: newList });
    }
}
