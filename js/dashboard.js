/* ============================================================
   ServidorAPP - MÓDULO DE DASHBOARD (Navegación y UI)
   ============================================================ */

function setupDashboard() {
    // Verificar autenticación
    const token = sessionStorage.getItem(TOKEN_KEY);
    const userInfo = sessionStorage.getItem(USER_KEY);

    if (!token || !userInfo) {
        window.location.href = 'login.html';
        return;
    }

    app.token = token;
    app.user = JSON.parse(userInfo);

    // Mostrar información del usuario
    const userNameEl = document.getElementById('userName');
    const userAvatarImg = document.getElementById('userAvatarImg');
    
    if (userNameEl) userNameEl.textContent = app.user.username;
    if (userAvatarImg && app.user.profileImage) {
        userAvatarImg.src = `${API_URL}${app.user.profileImage}`;
    }

    // Cargar datos iniciales
    if (typeof loadFolders === 'function') loadFolders();
    if (typeof loadFiles === 'function') loadFiles();
    if (typeof loadAccountInfo === 'function') loadAccountInfo();

    // Event listeners para cambiar contraseña
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePassword);
    }
}

function switchTab(tabName) {
    // Esconder todas las pestañas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Mostrar pestaña seleccionada
    const targetTab = document.getElementById(tabName + 'Tab');
    if (targetTab) targetTab.classList.add('active');

    // Actualizar menú activo
    document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Si fue llamado por un evento
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }

    app.currentTab = tabName;
}

function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem('last_login_at');
    window.location.href = 'login.html';
}

// Utilidades de formato
function formatDate(dateStr) {
    if (!dateStr || dateStr === 'Nunca') return 'Nunca';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ============================================================
// MENÚ CONTEXTUAL - Patrón exacto del React (window 'click')
// El evento 'click' NUNCA dispara con clic derecho.
// Por tanto, es imposible que el menú se cierre al soltar el botón derecho.
// ============================================================

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/* --- MENÚ CONTEXTUAL DESHABILITADO POR SOLICITUD DEL USUARIO ---

// Detectar clic derecho ANTES de onclick (Windows trackpad envía onclick falso)
let _rightClickDown = false;
document.addEventListener('mousedown', function(e) {
    if (e.button === 2) _rightClickDown = true;
}, true);
document.addEventListener('mouseup', function(e) {
    if (e.button === 2) setTimeout(() => { _rightClickDown = false; }, 300);
}, true);

// Bloquear menú nativo en zonas vacías del dashboard
document.addEventListener('contextmenu', function(e) {
    if (e.target.closest('[data-folder]') || e.target.closest('.file-item')) return; // Permitir que los items manejen el suyo
    e.preventDefault();
    closeContextMenu();
}, true);

// Manejador del clic derecho, idéntico al 'handleContextMenu' del React
window.handleContextMenuReact = function(e, name, isFolder) {
    e.preventDefault(); // Evita el menú del navegador
    e.stopPropagation(); // Evita que el evento suba al global
    
    // Establecemos la posición del menú basada en las coordenadas del ratón
    showContextMenu(e.clientX, e.clientY, isFolder, name);
};

// Cerrar con Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeContextMenu();
});

// Cerrar con clic izquierdo en cualquier lugar de la ventana
// (El evento 'click' NUNCA se dispara normalmente con botón derecho, PERO el
// trackpad de Windows emite un falso click izquierdo al hacer el gesto de 2 dedos).
window.addEventListener('click', function(e) {
    // Si el botón derecho sigue registrado como presionado (gesto del trackpad),
    // ignoramos este click falso para no cerrar el menú.
    if (_rightClickDown) return;
    
    closeContextMenu();
});
window.addEventListener('resize', closeContextMenu);

function closeContextMenu() {
    const menu = document.getElementById('contextMenu');
    if (menu) menu.style.display = 'none';
}
-------------------------------------------------------------- */

// ---- INTERACCIÓN CON ARCHIVOS/CARPETAS ----
function handleItemInteraction(e, name, isFolder) {
    if (e && e.button === 2) return; // Ignorar clic derecho nativo

    if (isFolder) {
        // Solo las carpetas se abren al hacer clic en la fila
        if (typeof navigateToFolder === 'function') navigateToFolder(name);
    } else {
        // Para archivos, no hacemos nada al hacer clic en la fila (solo los botones actúan)
        console.log('Clic en archivo detectado en la fila: el usuario prefiere usar el botón "Ver".');
    }
}

/* --- MENÚ CONTEXTUAL DESHABILITADO POR SOLICITUD DEL USUARIO ---
// ---- MOSTRAR EL MENÚ ----
function showContextMenu(x, y, isFolder, name) {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;

    const menuWidth = 200;
    const menuHeight = isFolder ? 90 : 130;

    let posX = x + 4;
    let posY = y + 4;

    if (posX + menuWidth > window.innerWidth) posX = window.innerWidth - menuWidth - 8;
    if (posY + menuHeight > window.innerHeight) posY = window.innerHeight - menuHeight - 8;

    const nameEscaped = name.replace(/'/g, "\\'");

    let html = '';
    if (isFolder) {
        html = `
            <div class="context-menu-item" onclick="closeContextMenu(); navigateToFolder('${nameEscaped}')">
                ${typeof getSvgIconHtml === 'function' ? getSvgIconHtml('folder', 16) : ''} <span>Abrir Carpeta</span>
            </div>
            <div class="context-menu-item delete" onclick="closeContextMenu(); deleteFolderConfirm('${nameEscaped}')">
                ${typeof getSvgIconHtml === 'function' ? getSvgIconHtml('warning', 16) : ''} <span>Eliminar Carpeta</span>
            </div>
        `;
    } else {
        html = `
            <div class="context-menu-item" onclick="closeContextMenu(); previewFile('${nameEscaped}')">
                ${typeof getSvgIconHtml === 'function' ? getSvgIconHtml('eye', 16) : ''} <span>Visualizar</span>
            </div>
            <div class="context-menu-item" onclick="closeContextMenu(); downloadFile('${nameEscaped}')">
                ${typeof getSvgIconHtml === 'function' ? getSvgIconHtml('download', 16) : ''} <span>Descargar</span>
            </div>
            <div class="context-menu-item delete" onclick="closeContextMenu(); deleteFileConfirm('${nameEscaped}')">
                ${typeof getSvgIconHtml === 'function' ? getSvgIconHtml('warning', 16) : ''} <span>Eliminar</span>
            </div>
        `;
    }

    menu.innerHTML = html;
    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;
    menu.style.zIndex = '99999';
    menu.style.display = 'block';

    // IGUAL QUE EN REACT: el menú detiene la propagación del 'click'
    // para que el window.addEventListener('click', closeContextMenu) no lo cierre al instante
    menu.onclick = function(e) { e.stopPropagation(); };
}
-------------------------------------------------------------- */

