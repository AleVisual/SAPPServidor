/* ============================================================
   ServidorAPP - MÓDULO DE ADMINISTRACIÓN (Panel Maestro)
   ============================================================ */

let masterKey = '';

function setupAdminLogic() {
    const gearBtn = document.getElementById('adminGearBtn');
    if (gearBtn) {
        gearBtn.addEventListener('click', showMasterKeyPrompt);
    }
}

function showMasterKeyPrompt() {
    const modal = document.getElementById('customModal');
    const overlay = document.getElementById('modalOverlay');
    if (!modal) return;
    
    document.getElementById('modalTitle').textContent = 'Acceso Restringido';
    document.getElementById('modalIcon').innerHTML = getSvgIconHtml('lock', 48, 'modal-icon-primary');
    
    document.getElementById('modalMessage').innerHTML = `
        <p style="margin-bottom: 24px; color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.5;">Ingresa la clave maestra de administrador para acceder al panel de gestión de usuarios:</p>
        <div style="position: relative; max-width: 320px; margin: 0 auto;">
            <input type="password" id="adminMasterKeyInput" placeholder="••••••••" 
                   style="width: 100%; padding: 14px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); border-radius: 14px; color: #fff; font-size: 20px; outline: none; text-align: center; transition: all 0.3s; font-family: 'Inter', sans-serif;"
                   onfocus="this.style.borderColor='#4f8ef7'; this.style.boxShadow='0 0 0 4px rgba(79,142,247,0.2)'; this.style.background='rgba(255,255,255,0.08)';"
                   onblur="this.style.borderColor='rgba(255,255,255,0.1)'; this.style.boxShadow='none'; this.style.background='rgba(255,255,255,0.05)';">
        </div>
    `;

    const actions = document.querySelector('.modal-actions');
    actions.innerHTML = `
        <button id="submitMasterKey" class="btn-modal btn-modal-primary" style="width: 100%; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 10px;">
            ${typeof getSvgIconHtml === 'function' ? getSvgIconHtml('unlock', 18) : ''}
            <span>Desbloquear Panel</span>
        </button>
    `;

    modal.classList.add('show');
    overlay.classList.add('show');
    document.body.classList.add('modal-open');
    
    const input = document.getElementById('adminMasterKeyInput');
    input.focus();

    document.getElementById('submitMasterKey').onclick = async () => {
        const key = input.value;
        if (!key) return;
        masterKey = key;
        closeModal();
        await loadAdminUsers();
    };

    input.onkeydown = (e) => {
        if (e.key === 'Enter') document.getElementById('submitMasterKey').click();
    };
}

async function loadAdminUsers() {
    try {
        const response = await fetch(`${API_URL}/api/admin/list-users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ masterKey })
        });

        if (response.status === 401) {
            showModal('La clave de administrador ingresada es incorrecta.', 'error', 'Acceso Denegado');
            return;
        }

        const users = await response.json();
        showAdminPanel(users);

    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        showModal('No se pudo establecer conexión con el servidor de administración.', 'error', 'Error de Red');
    }
}

function showAdminPanel(users) {
    const modal = document.getElementById('customModal');
    const overlay = document.getElementById('modalOverlay');
    
    modal.classList.add('admin-modal');
    document.getElementById('modalTitle').textContent = 'Panel de Administración';
    document.getElementById('modalIcon').innerHTML = getSvgIconHtml('user', 40, 'modal-icon-primary');
    
    let html = `
        <div class="admin-table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Carpeta</th>
                        <th>Último Acceso</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td><strong>${user.username}</strong></td>
                            <td>${user.folderType}</td>
                            <td>${user.lastLogin !== 'Nunca' ? new Date(user.lastLogin).toLocaleString() : 'Nunca'}</td>
                            <td>
                                <button class="btn-delete-user" onclick="confirmDeleteUser('${user.id}', '${user.username}')" title="Eliminar Usuario">
                                    ${typeof getSvgIconHtml === 'function' ? getSvgIconHtml('trash', 15) : ''}
                                    <span>Eliminar</span>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('modalMessage').innerHTML = html;
    
    const actions = document.querySelector('.modal-actions');
    actions.innerHTML = `
        <button class="btn-modal btn-modal-secondary" onclick="closeAdminModal()" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;">
            ${typeof getSvgIconHtml === 'function' ? getSvgIconHtml('close', 18) : ''}
            <span>Cerrar Panel</span>
        </button>
    `;
    overlay.classList.add('show');
    document.body.classList.add('modal-open');
}

window.confirmDeleteUser = (userId, username) => {
    showConfirm(`¿Está seguro que desea eliminar permanentemente al usuario "${username}"? Esta acción no se puede deshacer.`, 
        'Eliminar Usuario', 
        async () => {
           await executeDeleteUser(userId);
        }
    );
};

async function executeDeleteUser(userId) {
    try {
        const response = await fetch(`${API_URL}/api/admin/delete-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ masterKey, userId })
        });

        if (response.ok) {
            await loadAdminUsers(); // Recargar lista
        } else {
            showModal('No se pudo eliminar al usuario seleccionado.', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error:', error);
        showModal('Error de comunicación al intentar eliminar.', 'error', 'Error');
    }
}

function closeAdminModal() {
    const modal = document.getElementById('customModal');
    if (modal) modal.classList.remove('admin-modal');
    closeModal();
}

// Inicializar si el botón existe
setupAdminLogic();
