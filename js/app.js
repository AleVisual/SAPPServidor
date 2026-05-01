/* ============================================================
   ServidorAPP - NÚCLEO CENTRAL (Core & Configuration)
   ============================================================ */

// 1. Configuración Global
const API_URL = 'https://applied-representation-helicopter-montana.trycloudflare.com'; //Siempre colocar la URL de Cloudflared
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_info';

// 2. Estado Global de la Aplicación
window.app = {
    user: null,
    token: null,
    currentTab: 'folders',
    currentPath: '',
    folders: [],
    files: [],
    folderType: null
};

// 3. Estado del Editor/Vista Previa
window.previewState = {
    filename: null,
    filePath: null,
    content: null,
    type: null
};

// 3. Inicialización Automática y Health Check
document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname.toLowerCase();

    // Verificación de salud del servidor (Ping)
    if (!path.includes('offline.html')) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

            const healthRes = await fetch(`${API_URL}/api/health`, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!healthRes.ok) {
                window.location.href = 'offline.html';
                return;
            }
        } catch (error) {
            console.error('Servidor desconectado. Redirigiendo a modo offline...', error);
            window.location.href = 'offline.html';
            return;
        }
    }

    // Inicializaciones específicas de la página
    if (path.includes('dashboard.html')) {
        if (typeof setupDashboard === 'function') setupDashboard();
    }
    // La inicialización de login y registro se hace en sus propios archivos para evitar duplicidad
});

// 4. Sistema de Modales Globales (PRO)
function showModal(message, type = 'info', title = '', callback = null) {
    const modal = document.getElementById('customModal');
    const overlay = document.getElementById('modalOverlay');
    if (!modal) return;

    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalIcon = document.getElementById('modalIcon');
    const modalActions = document.querySelector('.modal-actions');

    modalTitle.textContent = title || (type === 'error' ? 'Error' : (type === 'success' ? 'Éxito' : 'Mensaje'));
    modalMessage.textContent = message;

    if (typeof getSvgIconHtml === 'function') {
        const icon = type === 'success' ? 'check' : (type === 'error' ? 'warning' : 'info');
        modalIcon.innerHTML = getSvgIconHtml(icon, 48, `modal-icon-${type}`);
    }

    // Botón Aceptar por defecto
    modalActions.innerHTML = `<button class="btn-modal btn-modal-${type === 'error' ? 'danger' : 'primary'}" onclick="closeModal(); if(window._modalCb) window._modalCb();">Aceptar</button>`;
    window._modalCb = callback;

    modal.classList.add('show');
    overlay.classList.add('show');
    document.body.classList.add('modal-open');
}

function showConfirm(message, title = '', onConfirm = null) {
    const modal = document.getElementById('customModal');
    const overlay = document.getElementById('modalOverlay');
    if (!modal) return;

    document.getElementById('modalTitle').textContent = title || 'Confirmar';
    document.getElementById('modalMessage').textContent = message;

    if (typeof getSvgIconHtml === 'function') {
        document.getElementById('modalIcon').innerHTML = getSvgIconHtml('warning', 48, 'modal-icon-warning');
    }

    const actions = document.querySelector('.modal-actions');
    actions.innerHTML = `
        <button class="btn-modal btn-modal-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-modal btn-modal-danger" id="confirmBtn">Confirmar</button>
    `;

    document.getElementById('confirmBtn').onclick = () => {
        closeModal();
        if (onConfirm) onConfirm();
    };

    modal.classList.add('show');
    overlay.classList.add('show');
    document.body.classList.add('modal-open');
}

function closeModal() {
    const modal = document.getElementById('customModal');
    const overlay = document.getElementById('modalOverlay');
    const previewModal = document.getElementById('previewModal');
    const previewOverlay = document.getElementById('previewModalOverlay');

    if (modal) modal.classList.remove('show');
    if (overlay) overlay.classList.remove('show');
    if (previewModal) previewModal.classList.remove('show');
    if (previewOverlay) previewOverlay.classList.remove('show');

    document.body.classList.remove('modal-open');
}

// 5. Utilidades Compartidas
function setupPasswordToggle(btnId, inputId, eyeIconId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(eyeIconId);
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        if (icon) {
            icon.innerHTML = isPassword
                ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>`
                : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
        }
    });
}
