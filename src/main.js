import { authService } from './services/auth.service.js';
import { databaseService } from './services/database.service.js';
import { uiManager } from './ui/ui.manager.js';
import { getURLs } from './config/urls.js';

// Global App State
window.AppState = {
    data: {
        orders: {},
        staff: [],
        currentUser: null,
        userRole: 'operativo'
    },
    update(key, payload) {
        this.data[key] = payload;
        uiManager.renderApp(this.data, handlers);
    }
};

// Handlers for UI actions
const handlers = {
    onCreateOrder: (id, rep) => databaseService.createOrder(id, rep).then(() => uiManager.playSound(rep ? "G4" : "E4")),
    onAssignOrder: (id, rep) => databaseService.assignOrder(id, rep).then(() => uiManager.playSound("G4")),
    onFinalizeOrder: (id) => databaseService.finalizeOrder(id).then(() => uiManager.playSound("C5")),
    onDeleteOrder: (id) => {
        if (window.AppState.data.userRole !== 'admin') {
            console.warn("Acción denegada: Solo administradores pueden borrar pedidos.");
            return Promise.resolve();
        }
        return databaseService.deleteOrder(id).then(() => uiManager.playSound("A2"));
    },
    onUpdateStaff: (list) => {
        if (window.AppState.data.userRole !== 'admin') {
            console.warn("Acción denegada: Solo administradores pueden gestionar la flota.");
            return Promise.resolve();
        }
        return databaseService.updateStaff(list);
    },
    onSignOut: () => authService.logout().finally(() => {
        localStorage.removeItem('rutatotal_role');
        const URLs = getURLs();
        window.location.href = URLs.login;
    })
};

// Initialize Application
const init = async () => {
    const loadingScreen = document.getElementById('loading-screen');

    authService.onAuthChange(async (user) => {
        if (user) {
            let role = localStorage.getItem('rutatotal_role') || 'operativo';
            let isAuthorized = false;

            if (user.isAnonymous) {
                // Si es anónimo, confiamos en que pasó por el flujo de PIN en login.html
                // y que el rol en localStorage es correcto. 
                isAuthorized = role === 'operativo';
            } else {
                // Si es Google Auth, verificamos en Firestore
                isAuthorized = await authService.checkAuthorization(user.email);
                role = isAuthorized ? 'admin' : null;
            }

            if (!isAuthorized) {
                console.warn(`Acceso Denegado: '${user.email}' no es un administrador autorizado.`);
                console.info("Acción Requerida: Agrega este email a la colección 'authorized_users' en Firebase con el campo 'role: \"admin\"'.");
                await authService.logout();
                const urls = getURLs();
                window.location.href = urls.login + '?error=unauthorized';
                return;
            }

            window.AppState.data.userRole = role; // Store role in state
            window.AppState.update('currentUser', user);

            const userDisplay = document.getElementById('user-display');
            if (userDisplay) {
                const displayName = user.isAnonymous ? localStorage.getItem('rutatotal_staff_name') : user.email;
                userDisplay.textContent = `${role.toUpperCase()} • ${displayName}`;
            }

            // Aplicar restricciones de rol antes de mostrar la app
            applyRoleRestrictions(role);

            // Subscribe to real-time data ONLY after verification
            databaseService.subscribeToOrders((orders) => window.AppState.update('orders', orders));
            databaseService.subscribeToStaff((staff) => window.AppState.update('staff', staff));

            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => loadingScreen.style.display = 'none', 500);
            }
            document.getElementById('kanban-container')?.classList.remove('hidden');
            document.getElementById('ops-panel')?.classList.remove('hidden');
        } else {
            // No user, redirect to login if not already there
            const urls = getURLs();
            if (!window.location.pathname.includes(urls.login)) {
                window.location.href = urls.login;
            }
        }
    });

    // Inicilizamos sin login automático
};

function applyRoleRestrictions(role) {
    const isOperativo = role === 'operativo';

    // Elementos a ocultar/mostrar según rol
    const adminOnlyElements = [
        'download-pdf-btn',
        'clear-history-btn',
        'new-staff-name',
        'add-staff-btn'
    ];

    adminOnlyElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = isOperativo ? 'none' : 'block';
    });

    // Gestionar mensaje de feedback
    const feedbackMsg = 'Funciones de administración solo para Encargados';
    const modalFooters = [
        { id: 'historyModal', footerSelector: '.mt-6' },
        { id: 'staffModal', footerSelector: '.modal-content' }
    ];

    modalFooters.forEach(config => {
        const modal = document.getElementById(config.id);
        if (modal) {
            let feedback = modal.querySelector('.role-feedback');
            if (!feedback && isOperativo) {
                feedback = document.createElement('p');
                feedback.className = 'role-feedback text-[10px] text-slate-500 font-bold uppercase mt-4 text-center w-full';
                feedback.textContent = feedbackMsg;
                modal.querySelector(config.footerSelector).appendChild(feedback);
            } else if (feedback) {
                feedback.style.display = isOperativo ? 'block' : 'none';
            }
        }
    });

    // Desbloquear botones de acceso a modales
    ['open-staff-modal-btn', 'open-history-modal-btn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'flex';
    });

    if (isOperativo) console.log("Modo Operativo: Restricciones de acción aplicadas.");
}

// Event Listeners and Global Setup
window.onload = () => {
    init();

    // UI Event Listeners
    document.getElementById('prev-btn').onclick = () => uiManager.slideNumbers(-1, window.AppState.data);
    document.getElementById('next-btn').onclick = () => uiManager.slideNumbers(1, window.AppState.data);

    document.getElementById('history-search').oninput = (e) => {
        uiManager.setSearchQuery(e.target.value);
        uiManager.renderApp(window.AppState.data, handlers);
    };

    document.getElementById('theme-toggle').onclick = () => {
        document.body.classList.toggle('light-mode');
        document.body.classList.toggle('dark-mode', !document.body.classList.contains('light-mode'));
        document.getElementById('theme-text').textContent = document.body.classList.contains('light-mode') ? 'MODO OSCURO' : 'MODO CLARO';
    };

    document.getElementById('start-demo-btn').onclick = () => {
        document.getElementById('ops-panel').classList.remove('hidden');
        document.getElementById('kanban-container').classList.remove('hidden');
        document.getElementById('start-demo-btn').innerHTML = '<i class="fas fa-check-circle"></i><span class="btn-label">TERMINAL</span>';
        uiManager.renderApp(window.AppState.data, handlers);
    };

    // Modal Listeners
    const togModal = (id, show) => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = show ? 'flex' : 'none';
    };

    document.getElementById('open-staff-modal-btn').onclick = () => {
        uiManager.renderStaffListModal(window.AppState.data.staff, handlers.onUpdateStaff, window.AppState.data.userRole);
        togModal('staffModal', true);
    };
    document.getElementById('close-staff-modal-btn').onclick = () => togModal('staffModal', false);

    document.getElementById('open-history-modal-btn').onclick = () => {
        togModal('historyModal', true);
        uiManager.renderApp(window.AppState.data, handlers);
    };
    document.getElementById('close-history-modal-btn').onclick = () => togModal('historyModal', false);

    document.getElementById('add-staff-btn').onclick = () => {
        const v = document.getElementById('new-staff-name').value.trim();
        const cur = window.AppState.data.staff;
        if (v && !cur.includes(v)) {
            handlers.onUpdateStaff([...cur, v]);
            document.getElementById('new-staff-name').value = '';
            togModal('staffModal', false);
        }
    };

    document.getElementById('clear-history-btn').onclick = async () => {
        if (confirm("¿Purgar todo?")) {
            const ids = Object.keys(window.AppState.data.orders);
            for (const id of ids) await handlers.onDeleteOrder(id);
        }
    };

    document.getElementById('download-pdf-btn').onclick = () => {
        uiManager.generatePDFReport(window.AppState.data.orders, window.AppState.data.staff);
    };

    document.getElementById('logoutBtn').onclick = () => handlers.onSignOut();

    // Loading screen fade out - handled in onAuthChange
    /*
    setTimeout(() => {
        const ls = document.getElementById('loading-screen');
        if (ls) {
            ls.style.opacity = '0';
            setTimeout(() => ls.style.display = 'none', 500);
        }
    }, 1000);
    */
};
