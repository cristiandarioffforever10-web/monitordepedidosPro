// UI Constants
const COLORS = [{ bg: '#6366f1' }, { bg: '#8b5cf6' }, { bg: '#3b82f6' }, { bg: '#f59e0b' }, { bg: '#ec4899' }, { bg: '#06b6d4' }];
const STAFF_COLOR_MAP = { lucas: '#007BFF', juan: '#8A2BE2', pedro: '#FF8C00', cri: '#FFD700' };

let currentSlide = 0;
let searchQuery = "";
let touchDraggedId = null;
let synth = null;
let lastStaffHash = "";

export const uiManager = {
    // 1. Core Render Loop
    renderApp(state, handlers) {
        if (!state) return;
        const { orders, staff, userRole } = state;

        this.renderKitchen(orders, staff, handlers);
        this.renderKanban(orders, staff, handlers);
        this.renderHistory(orders, staff, handlers, userRole);
    },

    // 2. Component: Kitchen (Cocina)
    renderKitchen(orders, staff, handlers) {
        const buttons = document.querySelectorAll('.num-btn');
        if (buttons.length === 0) this.initSliderGrid(handlers);

        buttons.forEach(b => {
            const n = b.textContent;
            const o = orders[n];

            b.className = 'num-btn shadow-sm';
            b.style = '';

            if (o) {
                if (o.status === 'entregado') {
                    b.classList.add('num-btn-delivered');
                } else if (o.repartidor) {
                    const staffIdx = staff.indexOf(o.repartidor);
                    const assignedColor = this.getStaffColor(o.repartidor, staffIdx);
                    b.style.backgroundColor = assignedColor;
                    b.style.borderColor = assignedColor;
                    b.style.color = 'white';
                    b.classList.add('num-btn-active');
                } else {
                    b.style.borderColor = '#00A382';
                    b.style.color = '#00A382';
                }
            }
        });

        const track = document.getElementById('slider-track');
        if (track) track.style.transform = `translateX(-${currentSlide * 100}%)`;
    },

    // 3. Component: Kanban Board
    renderKanban(orders, staff, handlers) {
        const container = document.getElementById('orders-kanban');
        if (!container) return;

        const currentHash = JSON.stringify(staff);
        if (lastStaffHash !== currentHash) {
            this.rebuildKanbanColumns(container, staff, handlers);
            lastStaffHash = currentHash;
        }

        document.querySelectorAll('.kanban-col').forEach(c => c.innerHTML = '');

        const activeOrders = Object.values(orders)
            .filter(o => o.status !== 'entregado')
            .sort((a, b) => b.timestamp - a.timestamp);

        let unassignedCount = 0;
        activeOrders.forEach(o => {
            const cardElement = document.createElement('div');
            cardElement.className = "glass-panel p-4 rounded-xl shadow-md card-draggable flex flex-col gap-3 border-l-4";

            const staffIdx = staff.indexOf(o.repartidor);
            cardElement.style.borderLeftColor = o.repartidor ? this.getStaffColor(o.repartidor, staffIdx) : '#64748b';
            cardElement.draggable = true;
            cardElement.innerHTML = this.createCardHTML(o, staff);

            this.attachCardEvents(cardElement, o, handlers, staff);

            if (o.repartidor) {
                const safeName = o.repartidor.replace(/\s/g, '');
                const col = document.getElementById(`col-${safeName}`);
                if (col) col.appendChild(cardElement);
            } else {
                document.getElementById('col-unassigned').appendChild(cardElement);
                unassignedCount++;
            }
        });

        const counter = document.getElementById('count-unassigned');
        if (counter) counter.textContent = unassignedCount;
    },

    createCardHTML(o, staff) {
        const isAssigned = !!o.repartidor;
        let actionArea = '';
        if (isAssigned) {
            actionArea = `<button class="finish-btn flex-1 bg-emerald-600 text-white text-xs font-black py-3 rounded-lg uppercase shadow-lg hover:bg-emerald-500">Finalizar</button>`;
        } else {
            actionArea = `<div class="flex flex-wrap gap-2 w-full">` +
                staff.map(r => `<button class="assign-btn" data-staff="${r}">${r}</button>`).join('') +
                `</div>`;
        }

        return `
            <div class="flex justify-between items-start">
                <div class="flex flex-col">
                    <span class="text-[10px] font-black text-muted block uppercase tracking-wide">Ticket</span>
                    <span class="text-3xl font-black text-main font-mono leading-none my-1">#${o.id}</span>
                </div>
                <div class="text-right flex flex-col items-end">
                    <span class="text-xs font-bold text-slate-500 block mb-1">${o.time}</span>
                    <span class="text-[10px] font-black block uppercase px-2 py-0.5 rounded bg-slate-800" style="color:${isAssigned ? '#ffffff' : '#67e8f9'}">${isAssigned ? o.repartidor : 'EN CASA'}</span>
                    ${isAssigned ? '' : '<span class="text-[9px] block text-slate-400 mt-1">Control local</span>'}
                </div>
            </div>
            <div class="flex justify-between items-center mt-3 pt-2 border-t border-slate-800/50">
                    <div class="flex-grow">${actionArea}</div>
                    <button class="delete-order-btn p-3 text-slate-600 hover:text-red-500 transition hover:bg-red-500/10 rounded-lg ml-2"><i class="fas fa-trash-alt text-lg"></i></button>
            </div>
        `;
    },

    attachCardEvents(card, o, handlers, staff) {
        card.ondragstart = (e) => e.dataTransfer.setData('id', o.id);

        card.ontouchstart = (e) => this.handleTouchStart(e, card, o.id);
        card.ontouchmove = (e) => this.handleTouchMove(e);
        card.ontouchend = (e) => this.handleTouchEnd(e, card, o.id, handlers);

        const delBtn = card.querySelector('.delete-order-btn');
        if (delBtn) delBtn.onclick = () => confirm(`¿Eliminar #${o.id}?`) && handlers.onDeleteOrder(o.id);

        const finBtn = card.querySelector('.finish-btn');
        if (finBtn) finBtn.onclick = () => handlers.onFinalizeOrder(o.id);

        card.querySelectorAll('.assign-btn').forEach(btn => {
            btn.onclick = () => handlers.onAssignOrder(o.id, btn.getAttribute('data-staff'));
        });
    },

    rebuildKanbanColumns(container, staff, handlers) {
        container.querySelectorAll('.rep-col').forEach(e => e.remove());

        staff.forEach((r, idx) => {
            const color = this.getStaffColor(r, idx);
            const safeName = r.replace(/\s/g, '');
            const colId = `col-${safeName}`;
            const inputId = `input-${safeName}`;

            const colWrapper = document.createElement('div');
            colWrapper.className = "flex flex-col flex-shrink-0 rep-col h-full";

            colWrapper.innerHTML = `
                <div class="flex justify-between items-center mb-3 px-2">
                    <span class="text-xs font-black uppercase tracking-widest" style="color: ${color}">${r}</span>
                </div>
                <div class="mb-3 flex gap-2">
                    <input type="number" id="${inputId}" placeholder="Auditoría..." class="w-full text-sm font-bold p-3 rounded-xl outline-none border border-slate-700 focus:border-emerald-500 transition">
                    <button class="quick-add-btn text-white px-5 rounded-xl transition" style="background-color: ${color}"><i class="fas fa-bolt text-sm"></i></button>
                </div>
                <div id="${colId}" data-repartidor="${r}" class="kanban-col flex flex-col gap-3 p-4 rounded-2xl border border-slate-800/50 overflow-y-auto column-scroll flex-grow"></div>
            `;

            const dz = colWrapper.querySelector('.kanban-col');
            this.setupDropZone(dz, r, handlers);

            try {
                dz.style.borderColor = this.hexToRgba(color, 0.12);
            } catch (e) { }

            colWrapper.querySelector('.quick-add-btn').onclick = () => {
                const input = document.getElementById(inputId);
                if (input.value) { handlers.onCreateOrder(input.value, r); input.value = ''; }
            };

            container.appendChild(colWrapper);
        });
    },

    // 4. Component: History (Reportes)
    renderHistory(orders, staff, handlers, role) {
        const isOperativo = role === 'operativo';
        const all = Object.values(orders);
        const filtered = all.filter(o => o.id.toString().includes(searchQuery)).sort((a, b) => b.timestamp - a.timestamp);

        const totalDelivered = all.filter(o => o.status === 'entregado').length;
        const statEl = document.getElementById('stat-total-orders');
        if (statEl) statEl.textContent = totalDelivered;

        const perfContainer = document.getElementById('staff-performance-labels');
        if (perfContainer) {
            perfContainer.innerHTML = staff.map((r, i) => {
                const count = all.filter(o => o.repartidor === r).length;
                const ok = all.filter(o => o.repartidor === r && o.status === 'entregado').length;
                const color = this.getStaffColor(r, i);
                return `
                    <div class="bg-slate-900 border border-slate-800 p-3 rounded-xl min-w-[100px]">
                        <p class="text-[7px] font-black text-slate-500 uppercase mb-1" style="color:${color}">${r}</p>
                        <div class="flex items-baseline gap-1"><span class="text-xl font-black text-white">${count}</span><span class="text-[8px] font-black text-emerald-500" style="color:var(--accent-emerald)">${ok} OK</span></div>
                    </div>`;
            }).join('');
        }

        const tbody = document.getElementById('history-table-body');
        if (tbody) {
            tbody.innerHTML = filtered.map(o => `
                <tr>
                    <td class="px-6 py-3 font-black">#${o.id}</td>
                    <td class="px-6 py-3 font-bold">${o.repartidor || '-'}</td>
                    <td class="px-6 py-3 uppercase text-[8px]">${o.repartidor ? o.status : 'EN CASA (LOCAL)'}</td>
                    <td class="px-6 py-3 text-right">
                        ${!isOperativo ? `<button class="delete-history-btn text-slate-700 hover:text-red-500 transition" data-id="${o.id}"><i class="fas fa-trash"></i></button>` : ''}
                    </td>
                </tr>
             `).join('');

            tbody.querySelectorAll('.delete-history-btn').forEach(btn => {
                btn.onclick = () => confirm(`¿Eliminar #${btn.dataset.id}?`) && handlers.onDeleteOrder(btn.dataset.id);
            });
        }
    },

    // --- UTILS & HELPERS ---
    initSliderGrid(handlers) {
        const track = document.getElementById('slider-track');
        if (!track) return;
        track.innerHTML = '';
        const ticketsPerSlide = 20;
        for (let p = 0; p < 5; p++) {
            const grid = document.createElement('div');
            grid.className = 'grid grid-cols-10 grid-rows-2 gap-3 min-w-full p-1 h-full content-start';
            for (let i = 1; i <= ticketsPerSlide; i++) {
                const n = p * ticketsPerSlide + i;
                const b = document.createElement('button');
                b.className = 'num-btn shadow-sm';
                b.textContent = n;
                b.onclick = async () => {
                    const existingOrder = window.AppState.data.orders[n];
                    if (existingOrder && existingOrder.status === 'entregado') {
                        if (confirm(`Este pedido (${n}) ya fue entregado, ¿desea seleccionarlo de nuevo? (Se eliminará el registro anterior)`)) {
                            await handlers.onDeleteOrder(n);
                            await handlers.onCreateOrder(n);
                        }
                    } else {
                        handlers.onCreateOrder(n);
                    }
                };
                grid.appendChild(b);
            }
            track.appendChild(grid);
        }
    },

    slideNumbers(d, state) {
        currentSlide = Math.max(0, Math.min(4, currentSlide + d));
        this.renderApp(state, null); // RenderApp handles slide position
    },

    setSearchQuery(query) {
        searchQuery = query;
    },

    getStaffColor(name, idx) {
        if (!name) return COLORS[Math.abs(idx || 0) % COLORS.length].bg;
        const key = name.toLowerCase();
        for (const k in STAFF_COLOR_MAP) { if (key.includes(k)) return STAFF_COLOR_MAP[k]; }
        let h = 0; for (let i = 0; i < key.length; i++) { h = ((h << 5) - h) + key.charCodeAt(i); h |= 0; }
        return COLORS[Math.abs(h) % COLORS.length].bg;
    },

    hexToRgba(hex, alpha) {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16), g = parseInt(hex.substring(2, 4), 16), b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    },

    setupDropZone(dz, repName, handlers) {
        dz.ondragover = (e) => e.preventDefault();
        dz.ondragenter = (e) => { e.preventDefault(); dz.classList.add('drop-zone-active'); };
        dz.ondragleave = (e) => { if (!dz.contains(e.relatedTarget)) dz.classList.remove('drop-zone-active'); };
        dz.ondrop = (e) => { dz.classList.remove('drop-zone-active'); handlers.onAssignOrder(e.dataTransfer.getData('id'), repName); };
    },

    playSound(f) {
        if (!synth) synth = new Tone.PolySynth(Tone.Synth).toDestination();
        if (Tone.context.state !== 'running') Tone.start();
        synth.triggerAttackRelease(f, "8n");
    },

    handleTouchStart(e, card, id) {
        const touch = e.touches[0];
        touchDraggedId = id;
        const ghost = document.getElementById('drag-ghost');
        ghost.innerHTML = card.innerHTML;
        ghost.style.display = 'block';
        ghost.style.left = `${touch.clientX - 90}px`;
        ghost.style.top = `${touch.clientY - 40}px`;
        card.style.opacity = "0.4";
    },

    handleTouchMove(e) {
        if (!touchDraggedId) return;
        e.preventDefault();
        const touch = e.touches[0];
        const ghost = document.getElementById('drag-ghost');
        ghost.style.left = `${touch.clientX - 90}px`;
        ghost.style.top = `${touch.clientY - 40}px`;

        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const col = el?.closest('.kanban-col');
        document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drop-zone-active'));
        if (col) col.classList.add('drop-zone-active');
    },

    handleTouchEnd(e, card, id, handlers) {
        if (!touchDraggedId) return;
        const touch = e.changedTouches[0];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const col = el?.closest('.kanban-col');
        if (col) {
            const newRep = col.getAttribute('data-repartidor') || null;
            handlers.onAssignOrder(touchDraggedId, newRep);
        }
        document.getElementById('drag-ghost').style.display = 'none';
        card.style.opacity = "1";
        document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drop-zone-active'));
        touchDraggedId = null;
    },

    renderStaffListModal(staff, onUpdateStaff, role) {
        const isOperativo = role === 'operativo';
        const list = document.getElementById('staff-list');
        list.innerHTML = staff.map((n, i) => `
            <div class="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span class="font-black text-slate-300 text-[10px] uppercase">${n}</span>
                ${!isOperativo ? `<button class="remove-staff text-red-500/50 hover:text-red-500" data-idx="${i}"><i class="fas fa-times-circle"></i></button>` : ''}
            </div>
         `).join('');

        list.querySelectorAll('.remove-staff').forEach(b => b.onclick = () => {
            const nl = [...staff];
            nl.splice(b.dataset.idx, 1);
            onUpdateStaff(nl);
            document.getElementById('open-staff-modal-btn').click();
        });
    },

    generatePDFReport(orders, staff) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const allOrders = Object.values(orders);
        const currentStaff = staff;

        const BRAND_COLOR = [0, 163, 130];
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
        doc.text("RUTATOTAL 360", 15, 20);
        
        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.text("CENTRO DE CONTROL LOGÍSTICO - REPORTE DE OPERACIONES", 15, 28);
        
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 15, 35);
        doc.setDrawColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
        doc.line(15, 38, 195, 38);

        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text("RESUMEN GENERAL DE TICKETS", 15, 48);
        
        doc.autoTable({
            startY: 52,
            head: [['ID', 'OPERADOR', 'ESTADO', 'HORA']],
            body: allOrders.map(o => [`#${o.id}`, o.repartidor || 'SIN ASIGNAR', (o.status || '').toUpperCase(), o.time]),
            headStyles: { fillColor: BRAND_COLOR, fontSize: 10 },
            styles: { fontSize: 9, font: "helvetica" },
            alternateRowStyles: { fillColor: [245, 247, 250] }
        });

        let currentY = doc.lastAutoTable.finalY + 20;

        doc.setFontSize(14);
        doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
        doc.text("DESGLOSE POR REPARTIDOR", 15, currentY);
        currentY += 8;

        currentStaff.forEach((repartidor, idx) => {
            const staffOrders = allOrders.filter(o => o.repartidor === repartidor);
            if (staffOrders.length > 0) {
                if (currentY > 240) { doc.addPage(); currentY = 20; }
                
                doc.setFontSize(11);
                doc.setTextColor(60);
                doc.text(`OPERADOR: ${repartidor.toUpperCase()}`, 15, currentY);
                
                doc.autoTable({
                    startY: currentY + 3,
                    head: [['TICKET', 'ESTADO', 'ENTREGA']],
                    body: staffOrders.map(o => [`#${o.id}`, (o.status || '').toUpperCase(), o.time]),
                    headStyles: { fillColor: [99, 102, 241], fontSize: 9 },
                    styles: { fontSize: 8 },
                    margin: { left: 20 }
                });
                currentY = doc.lastAutoTable.finalY + 15;
            }
        });

        if (currentY > 180) { doc.addPage(); currentY = 20; }
        
        doc.setFontSize(14);
        doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
        doc.text("ESTADÍSTICAS DE DISTRIBUCIÓN", 15, currentY);
        currentY += 10;

        const stats = currentStaff.map(r => ({
            name: r,
            count: allOrders.filter(o => o.repartidor === r).length
        })).filter(s => s.count > 0);
        
        const total = stats.reduce((acc, s) => acc + s.count, 0);
        
        if (total > 0) {
            const canvas = document.createElement('canvas');
            canvas.width = 500;
            canvas.height = 500;
            const ctx = canvas.getContext('2d');
            const centerX = 250;
            const centerY = 250;
            const radius = 200;
            let startAngle = 0;

            const palette = ['#6366f1', '#8b5cf6', '#3b82f6', '#f59e0b', '#ec4899', '#06b6d4'];

            stats.forEach((s, i) => {
                const sliceAngle = (s.count / total) * 2 * Math.PI;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
                ctx.closePath();
                ctx.fillStyle = palette[i % palette.length];
                ctx.fill();
                
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 4;
                ctx.stroke();

                const colorHex = palette[i % palette.length];
                const r = parseInt(colorHex.slice(1,3), 16);
                const g = parseInt(colorHex.slice(3,5), 16);
                const b = parseInt(colorHex.slice(5,7), 16);
                
                doc.setFillColor(r, g, b);
                doc.rect(120, currentY + (i * 10), 5, 5, 'F');
                doc.setTextColor(60);
                doc.setFontSize(9);
                doc.text(`${s.name}: ${s.count} pedidos (${Math.round((s.count/total)*100)}%)`, 130, currentY + 4 + (i * 10));

                startAngle += sliceAngle;
            });

            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 15, currentY - 5, 90, 90);
            
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text(`Total de pedidos analizados: ${total}`, 15, currentY + 95);
        } else {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text("No hay pedidos asignados para generar estadísticas.", 15, currentY + 5);
        }

        doc.save(`Reporte_Logistico_RutaTotal360_${new Date().toISOString().split('T')[0]}.pdf`);
    }
};
