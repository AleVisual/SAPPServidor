/* ============================================================
   Perfil.js - LÓGICA DE GESTIÓN DE PERFIL SApp
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    
    await loadUserProfile();
    setupAvatarUploader();
});

let selectedFile = null;

async function loadUserProfile() {
    try {
        const response = await fetch(`${API_URL}/api/users/profile`, {
            headers: { 'Authorization': `Bearer ${app.token}` }
        });

        if (!response.ok) throw new Error('Error al cargar perfil');
        const user = await response.json();

        // Actualizar UI
        document.getElementById('userNameLabel').textContent = user.username;
        document.getElementById('userFolderLabel').textContent = user.folderType ? user.folderType.toUpperCase() : 'Ninguna';
        document.getElementById('userDateLabel').textContent = new Date(user.createdAt).toLocaleDateString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        if (user.profileImage) {
            document.getElementById('profilePreview').src = `${API_URL}${user.profileImage}`;
            const deleteBtn = document.getElementById('deleteAvatarBtn');
            if (deleteBtn) deleteBtn.style.display = 'flex';
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

function setupAvatarUploader() {
    const avatarInput = document.getElementById('avatarInput');
    const profilePreview = document.getElementById('profilePreview');
    const saveBtn = document.getElementById('saveProfileBtn');

    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showModal('La imagen es demasiado grande. Máximo 5MB.', 'warning', 'Tamaño excedido');
                return;
            }

            selectedFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                profilePreview.src = e.target.result;
                saveBtn.disabled = false;
                saveBtn.classList.add('visible'); // Mostrar botón de aceptar
                saveBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Aceptar y Guardar Foto
                `;
            };
            reader.readAsDataURL(file);
        }
    });

    saveBtn.addEventListener('click', uploadProfileImage);

    const deleteBtn = document.getElementById('deleteAvatarBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteProfileImage);
    }
}

async function deleteProfileImage() {
    showConfirm('¿Estás seguro de que deseas eliminar tu foto de perfil?', 'Confirmar eliminación', async () => {
        try {
            const response = await fetch(`${API_URL}/api/users/profile-image`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${app.token}` }
            });

            if (response.ok) {
                showModal('Foto de perfil eliminada.', 'success', '¡Éxito!');
                document.getElementById('profilePreview').src = 'assets/default-avatar.png';
                document.getElementById('deleteAvatarBtn').style.display = 'none';
                
                // Actualizamos en local state
                const userInfo = JSON.parse(sessionStorage.getItem('user_info') || '{}');
                userInfo.profileImage = null;
                sessionStorage.setItem('user_info', JSON.stringify(userInfo));
            } else {
                showModal('Error al eliminar la foto', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showModal('Error de conexión', 'error');
        }
    });
}

async function uploadProfileImage() {
    if (!selectedFile) return;

    const saveBtn = document.getElementById('saveProfileBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Subiendo...';

    const formData = new FormData();
    formData.append('avatar', selectedFile);

    try {
        const response = await fetch(`${API_URL}/api/users/profile-image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${app.token}` },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            showModal('Imagen de perfil actualizada correctamente.', 'success', '¡Éxito!');
            saveBtn.textContent = 'Guardado';
            // Mantenemos sincronizado el estado cliente
            const userInfo = JSON.parse(sessionStorage.getItem('user_info') || '{}');
            userInfo.profileImage = data.profileImage;
            sessionStorage.setItem('user_info', JSON.stringify(userInfo));
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            const data = await response.json();
            showModal(data.message || 'Error al subir imagen', 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Guardar Cambios';
        }
    } catch (error) {
        console.error('Error:', error);
        showModal('Error de conexión', 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar Cambios';
    }
}

function checkAuth() {
    const token = sessionStorage.getItem('auth_token');
    const user = JSON.parse(sessionStorage.getItem('user_info'));
    
    if (!token || !user) {
        window.location.href = 'index.html';
        return false;
    }
    
    window.app = { token, user };
    return true;
}
