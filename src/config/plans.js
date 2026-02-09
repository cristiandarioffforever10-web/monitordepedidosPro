/**
 * @typedef {Object} PlanConfig
 * @property {string} id - Identificador único del plan.
 * @property {string} fase - Nombre de la fase operativa.
 * @property {string} titulo - Título comercial del plan.
 * @property {string} subtitulo - Beneficio emocional principal.
 * @property {string} descripcion - Descripción detallada orientada a ventas.
 * @property {number|string} precioInstalacion - Costo fijo inicial.
 * @property {number|string} precioMensual - Tarifa de suscripción mensual.
 * @property {boolean} popular - Indica si es el plan recomendado.
 * @property {string} cta - Texto del botón de llamado a la acción.
 * @property {string[]} caracteristicas - Lista de funcionalidades incluidas.
 */

/** @type {PlanConfig[]} */
export const PLANES_CONFIG = [
    {
        id: "fase-1",
        fase: "Fase 01",
        titulo: "Gestión Directa",
        subtitulo: "Elimina el caos de las comandas",
        descripcion: "Perfecto para dueños que quieren recuperar el silencio en el mostrador y eliminar los gritos en la cocina.",
        precioInstalacion: 150,
        precioMensual: 25,
        popular: false,
        cta: "Recuperar el Control",
        caracteristicas: [
            "Dashboard Proactivo (Glance-First)",
            "Gestión de 4 Estados Operativos",
            "Interacción Táctil Drag-and-Drop",
            "Logística Visual por Colores de contraste",
            "Feedback Auditivo (Motor Tone.js)",
            "Buscador Mega-Rápido de IDs",
            "Bloqueo de Errores y Duplicados",
            "Centro de Reportes Avanzado",
            "Historial de Auditoría Permanente"
        ]
    },
    {
        id: "fase-2",
        fase: "Fase 02",
        titulo: "Logística Inteligente",
        subtitulo: "Control total del delivery",
        descripcion: "Transforma tu negocio en una Torre de Control con seguimiento en tiempo real y sincronización total.",
        precioInstalacion: 350,
        precioMensual: 60,
        popular: true,
        cta: "Escalar mi Negocio",
        caracteristicas: [
            "Todo lo incluido en Fase 01",
            "Acceso Multi-Pantalla simultáneo",
            "Nube Sincronizada (Google Firebase)",
            "Conciliación Total de Dinero (Anti-Robo)",
            "Optimización de Medios (Firebase Storage)",
            "Notificaciones Web Push ilimitadas"
        ]
    },
    {
        id: "fase-3",
        fase: "Fase 03",
        titulo: "Torre de Control 360",
        subtitulo: "Estado de Poder Absoluto",
        descripcion: "Para locales de alto volumen que buscan automatización completa e inteligencia artificial.",
        precioInstalacion: "VIP",
        precioMensual: "Custom",
        popular: false,
        cta: "Solicitar Auditoría",
        caracteristicas: [
            "Todo lo incluido en Fase 02",
            "IA predictiva de demanda horaria",
            "Integración total con Marketplaces",
            "Algoritmo de optimización de rutas",
            "Soporte prioritario 24/7",
            "Backup Local redundante"
        ]
    }
];
