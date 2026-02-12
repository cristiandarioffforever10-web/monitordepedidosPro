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
        userRole: 'operativo',
        localName: '',
        localLogo: '',
        localLogoWidth: null,
        localLogoHeight: null
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
                console.warn("User authenticated but not authorized.");
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
        } else {
            // No user, redirect to login if not already there
            const urls = getURLs();
            if (!window.location.pathname.includes(urls.login)) {
                window.location.href = urls.login;
            }
        }
    });

    // Inicilizamos sin login automático

    // Cargar configuración de marca
    const savedName = localStorage.getItem('rutatotal_local_name');
    const savedLogo = localStorage.getItem('rutatotal_local_logo');
    const savedWidth = localStorage.getItem('rutatotal_local_logo_width');
    const savedHeight = localStorage.getItem('rutatotal_local_logo_height');

    if (savedName) window.AppState.data.localName = savedName;
    if (savedLogo) window.AppState.data.localLogo = savedLogo;
    if (savedWidth) window.AppState.data.localLogoWidth = savedWidth;
    if (savedHeight) window.AppState.data.localLogoHeight = savedHeight;

    updateBrandUI(
        window.AppState.data.localName,
        window.AppState.data.localLogo,
        window.AppState.data.localLogoWidth,
        window.AppState.data.localLogoHeight
    );
};

function updateBrandUI(name, logo, width, height) {
    const nameInput = document.getElementById('local-name-input');
    const logoDisplay = document.getElementById('local-logo-display');
    const logoPlaceholder = document.getElementById('local-logo-placeholder');

    if (nameInput) {
        nameInput.value = name || "";
        nameInput.classList.toggle('text-white', !!name);
        nameInput.classList.toggle('text-white/10', !name);
        setTimeout(resizeNameInput, 0);
    }

    if (logoDisplay && logoPlaceholder) {
        if (logo) {
            logoDisplay.src = logo;
            logoDisplay.classList.remove('hidden');
            logoPlaceholder.classList.add('hidden');
        } else {
            logoDisplay.classList.add('hidden');
            logoPlaceholder.classList.remove('hidden');
        }

        const elements = [logoDisplay, logoPlaceholder];
        if (width && height) {
            elements.forEach(el => {
                if (el) {
                    el.style.width = width + 'px';
                    el.style.height = height + 'px';
                    el.classList.remove('w-10', 'h-10');
                }
            });
        }
    }
}

function resizeNameInput() {
    const input = document.getElementById('local-name-input');
    if (input) {
        const tempSpan = document.createElement('span');
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.style.whiteSpace = 'pre';
        tempSpan.style.font = window.getComputedStyle(input).font;
        tempSpan.style.textTransform = 'uppercase';
        tempSpan.style.letterSpacing = window.getComputedStyle(input).letterSpacing;
        tempSpan.textContent = input.value || input.placeholder;
        document.body.appendChild(tempSpan);
        input.style.width = (tempSpan.offsetWidth + 10) + 'px';
        document.body.removeChild(tempSpan);
    }
}

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
                const footer = modal.querySelector(config.footerSelector);
                if (footer) footer.appendChild(feedback);
            } else if (feedback) {
                feedback.style.display = isOperativo ? 'block' : 'none';
            }
        }
    });

    // Gestión de visibilidad y edición de marca
    const brandGroup = document.getElementById('brand-header-group');
    const nameInput = document.getElementById('local-name-input');
    const logoContainer = document.querySelector('#local-logo-container .relative');

    if (brandGroup) {
        if (isOperativo) {
            // Personal operativo: Marca siempre visible y NO editable
            brandGroup.classList.add('brand-visible');
            brandGroup.style.cursor = 'default';
            brandGroup.ondblclick = null;

            if (nameInput) {
                nameInput.readOnly = true;
                nameInput.style.pointerEvents = 'none';
            }
            if (logoContainer) {
                logoContainer.style.pointerEvents = 'none';
                logoContainer.removeAttribute('onclick');
            }
        } else {
            // Admin: Oculto por defecto, toggleable y EDITABLE
            brandGroup.classList.remove('brand-visible');
            brandGroup.style.cursor = 'pointer';
            brandGroup.ondblclick = () => {
                brandGroup.classList.toggle('brand-visible');
                if (brandGroup.classList.contains('brand-visible')) {
                    resizeNameInput();
                }
            };

            if (nameInput) {
                nameInput.readOnly = false;
                nameInput.style.pointerEvents = 'auto';
            }
            if (logoContainer) {
                logoContainer.style.pointerEvents = 'auto';
                logoContainer.setAttribute('onclick', "document.getElementById('local-logo-file').click()");
            }
        }
    }

    if (isOperativo) console.log("Modo Operativo: Restricciones aplicadas.");
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
        const opsPanel = document.getElementById('ops-panel');
        const kanban = document.getElementById('kanban-container');
        const btn = document.getElementById('start-demo-btn');

        const isHidden = opsPanel.classList.contains('hidden');

        if (isHidden) {
            opsPanel.classList.remove('hidden');
            kanban.classList.remove('hidden');
            btn.innerHTML = '<i class="fas fa-power-off text-xl"></i>';
            btn.classList.add('bg-red-600', 'hover:bg-red-500');
            btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
            uiManager.renderApp(window.AppState.data, handlers);
        } else {
            opsPanel.classList.add('hidden');
            kanban.classList.add('hidden');
            btn.innerHTML = '<i class="fas fa-terminal text-xl"></i>';
            btn.classList.remove('bg-red-600', 'hover:bg-red-500');
            btn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
        }
    };

    // Modal Listeners
    const togModal = (id, show) => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = show ? 'flex' : 'none';
    };

    // Side Menu (Burger) Listeners
    const sideMenu = document.getElementById('side-menu');
    const sideOverlay = document.getElementById('side-menu-overlay');

    const togSideMenu = (show) => {
        if (!sideMenu || !sideOverlay) return;
        if (show) {
            sideOverlay.classList.remove('hidden');
            setTimeout(() => {
                sideOverlay.style.opacity = '1';
                sideMenu.classList.remove('translate-x-full');
            }, 10);
        } else {
            sideOverlay.style.opacity = '0';
            sideMenu.classList.add('translate-x-full');
            setTimeout(() => {
                sideOverlay.classList.add('hidden');
            }, 300);
        }
    };

    document.getElementById('burger-menu-btn').onclick = () => togSideMenu(true);
    document.getElementById('close-side-menu').onclick = () => togSideMenu(false);
    sideOverlay.onclick = () => togSideMenu(false);

    // Cerrar menú al hacer click en cualquier opción dentro
    sideMenu.querySelectorAll('button').forEach(btn => {
        const oldClick = btn.onclick;
        btn.onclick = (e) => {
            if (oldClick) oldClick(e);
            if (btn.id !== 'logoutBtn') togSideMenu(false); // No cerramos si es logout para ver la confirmación
        };
    });

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
        if (confirm("¿Activar Modo Fantasma? Se archivarán todos los pedidos actuales para auditoría y se limpiará el monitor.")) {
            try {
                await databaseService.archiveAndClearAllOrders(window.AppState.data.orders);
                uiManager.playSound("A2");
                alert("Operación completada: Monitor limpio y datos archivados.");
            } catch (error) {
                console.error("Error en Modo Fantasma:", error);
                alert("Error al archivar. El monitor no se ha limpiado.");
            }
        }
    };

    document.getElementById('download-pdf-btn').onclick = () => {
        uiManager.generatePDFReport(window.AppState.data.orders, window.AppState.data.staff);
    };

    document.getElementById('logoutBtn').onclick = () => {
        if (confirm("¿Estás seguro de que deseas cerrar sesión? Detendrás la sincronización en tiempo real.")) {
            handlers.onSignOut();
        }
    };

    // Brand Personalization Listeners
    const nameInput = document.getElementById('local-name-input');
    if (nameInput) {
        nameInput.oninput = (e) => {
            const val = e.target.value;
            window.AppState.data.localName = val;
            localStorage.setItem('rutatotal_local_name', val);
            nameInput.classList.toggle('text-white', !!val);
            nameInput.classList.toggle('text-white/10', !val);
            resizeNameInput();
        };
    }

    const logoFileInput = document.getElementById('local-logo-file');
    if (logoFileInput) {
        logoFileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target.result;
                    window.AppState.data.localLogo = base64;
                    localStorage.setItem('rutatotal_local_logo', base64);
                    updateBrandUI(
                        window.AppState.data.localName,
                        base64,
                        window.AppState.data.localLogoWidth,
                        window.AppState.data.localLogoHeight
                    );
                };
                reader.readAsDataURL(file);
            }
        };
    }

    // Resize Logic for Logo
    const handle = document.getElementById('logo-resize-handle');
    const container = document.getElementById('local-logo-container');
    if (handle && container) {
        const startResize = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const startX = e.clientX || e.touches[0].clientX;
            const startY = e.clientY || e.touches[0].clientY;
            const startWidth = container.offsetWidth;
            const startHeight = container.offsetHeight;

            const onMove = (moveEvent) => {
                const currentX = moveEvent.clientX || moveEvent.touches[0].clientX;
                const currentY = moveEvent.clientY || moveEvent.touches[0].clientY;

                let newWidth = startWidth + (currentX - startX);
                let newHeight = startHeight + (currentY - startY);

                newWidth = Math.min(80, Math.max(20, newWidth));
                newHeight = Math.min(54, Math.max(20, newHeight));

                window.AppState.data.localLogoWidth = newWidth;
                window.AppState.data.localLogoHeight = newHeight;
                localStorage.setItem('rutatotal_local_logo_width', newWidth);
                localStorage.setItem('rutatotal_local_logo_height', newHeight);

                updateBrandUI(
                    window.AppState.data.localName,
                    window.AppState.data.localLogo,
                    newWidth,
                    newHeight
                );
            };

            const onEnd = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onEnd);
                window.removeEventListener('touchmove', onMove);
                window.removeEventListener('touchend', onEnd);
            };

            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onEnd);
            window.addEventListener('touchmove', onMove, { passive: false });
            window.addEventListener('touchend', onEnd);
        };

        handle.onmousedown = startResize;
        handle.ontouchstart = startResize;
    }
};
