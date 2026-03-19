/* ============================================================
   ServidorAPP - MÓDULO DE AUTENTICACIÓN (Login/Registro)
   ============================================================ */

function setupLoginForm() {
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', handleLogin);
    }
}

async function handleLogin(e) {
    if (e) e.preventDefault();

    const loginBtn = document.getElementById('loginBtn');

    // Función interna para resetear el botón en caso de error
    function _resetBtn() {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading');
            const span = loginBtn.querySelector('span');
            if (span) span.textContent = 'Ingresar';
        }
    }

    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.classList.add('loading');
        const span = loginBtn.querySelector('span');
        if (span) span.textContent = 'Validando...';
    }

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.querySelector('input[name="rememberMe"]')?.checked || false;

    // BUG FIX: el argumento era al revés → showError('loginError', msg)
    // La función showError en login.html solo acepta un parámetro (el mensaje)
    if (!username || !password) {
        _resetBtn();
        if (typeof showError === 'function') {
            showError('Por favor completá todos los campos');
        }
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, rememberMe })
        });

        const data = await response.json();

        // BUG FIX: Si es 429 → lockout. El botón se re-habilita al terminar el countdown.
        if (response.status === 429) {
            startLockoutCountdown(60);
            return;
        }

        if (!response.ok) {
            // BUG FIX: re-habilitar el botón ANTES de mostrar el error
            // (antes quedaba disabled para siempre tras el primer intento fallido)
            _resetBtn();
            if (typeof showError === 'function') {
                showError(data.message || 'Credenciales inválidas');
            }
            return;
        }

        // Login exitoso → guardar y redirigir
        sessionStorage.setItem(TOKEN_KEY, data.token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error('Error en login:', error);
        // BUG FIX: también re-habilitar en caso de error de red
        _resetBtn();
        if (typeof showError === 'function') {
            showError('Error de conexión con el servidor');
        }
    }
}

function setupRegisterForm() {
    const form = document.getElementById('registerForm');
    if (form) {
        form.addEventListener('submit', handleRegister);
    }

    // Validación de contraseña en tiempo real
    const passwordInput = document.getElementById('regPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordStrength);
    }
}

function checkPasswordStrength() {
    const password = document.getElementById('regPassword').value;
    const strengthElement = document.getElementById('passwordStrength');

    if (!strengthElement) return;

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (password.length === 0) {
        strengthElement.textContent = '';
    } else if (strength <= 1) {
        strengthElement.textContent = '⚠️ Contraseña débil';
        strengthElement.style.color = '#e74c3c';
    } else if (strength === 2) {
        strengthElement.textContent = '⚠️ Contraseña regular';
        strengthElement.style.color = '#f39c12';
    } else {
        strengthElement.textContent = '✓ Contraseña segura';
        strengthElement.style.color = '#27ae60';
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const adminKey = document.getElementById('adminKey').value.trim();

    // Validaciones
    if (!username || !password) {
        showModal('Por favor completá todos los campos obligatorios', 'error', 'Campos requeridos');
        return;
    }
    if (password.length < 8) {
        showModal('La contraseña debe tener al menos 8 caracteres', 'error', 'Contraseña débil');
        return;
    }
    if (password !== confirmPassword) {
        showModal('Las contraseñas no coinciden', 'error', 'Error de Validación');
        return;
    }

    // Si hay clave de admin → mostrar modal para elegir carpeta (Ari/Ruth)
    if (adminKey) {
        window._pendingRegister = { username, password, adminKey };
        if (typeof showFolderModal === 'function') {
            showFolderModal();
        }
        return; // Esperamos que el admin elija la carpeta
    }

    // Sin clave admin → registrar sin carpeta asignada
    await _submitRegistration(username, password, null, null);
}

// Llamado desde los botones del modal de register.html
// onclick="selectFolder('ari')" / onclick="selectFolder('ruth')"
window.selectFolder = async function(folderType) {
    if (typeof hideFolderModal === 'function') hideFolderModal();

    const pending = window._pendingRegister;
    if (!pending) return;
    window._pendingRegister = null;

    await _submitRegistration(pending.username, pending.password, pending.adminKey, folderType);
};

async function _submitRegistration(username, password, adminKey, folderType) {
    const btn = document.getElementById('registerBtn');
    if (btn) {
        btn.classList.add('loading');
        btn.disabled = true;
        const span = btn.querySelector('span');
        if (span) span.textContent = 'Creando cuenta...';
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, adminKey, folderType })
        });

        const data = await response.json();

        if (response.ok) {
            const folderMsg = folderType ? ` Carpeta asignada: ${folderType === 'ari' ? 'Ari' : 'Ruth'}.` : '';
            showModal(`Registro exitoso.${folderMsg} Ya podés iniciar sesión.`, 'success', '¡Registrado!', () => {
                window.location.href = 'login.html';
            });
        } else {
            if (btn) {
                btn.classList.remove('loading');
                btn.disabled = false;
                const span = btn.querySelector('span');
                if (span) span.textContent = 'Crear Cuenta';
            }
            showModal(data.message || 'Error al registrarse', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error en registro:', error);
        if (btn) {
            btn.classList.remove('loading');
            btn.disabled = false;
            const span = btn.querySelector('span');
            if (span) span.textContent = 'Crear Cuenta';
        }
        showModal('Error de conexión con el servidor', 'error', 'Error');
    }
}


async function loadAccountInfo() {
    const userEl = document.getElementById('accountUsername');
    const displayUserEl = document.getElementById('accountUsernameDisplay');
    const avatarLetterEl = document.getElementById('avatarLetter');
    const lastLoginEl = document.getElementById('lastLogin');
    
    if (app.user) {
        if (userEl) userEl.textContent = app.user.username;
        if (displayUserEl) displayUserEl.textContent = app.user.username;
        if (avatarLetterEl) avatarLetterEl.textContent = app.user.username.charAt(0).toUpperCase();
    }
    
    if (lastLoginEl) {
        const lastLogin = sessionStorage.getItem('last_login_at') || 'Hoy';
        lastLoginEl.textContent = lastLogin;
    }
}

async function handleChangePassword(e) {
    if (e) e.preventDefault();
    
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');

    if (!currentPasswordInput || !newPasswordInput || !confirmNewPasswordInput) return;

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;

    if (newPassword !== confirmNewPassword) {
        showModal('Las nuevas contraseñas no coinciden', 'error', 'Error');
        return;
    }

    if (newPassword.length < 8) {
        showModal('La nueva contraseña debe tener al menos 8 caracteres', 'error', 'Error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/users/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${app.token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json();
        if (response.ok) {
            showModal('¡Contraseña actualizada con éxito!', 'success', 'Éxito');
            document.getElementById('changePasswordForm').reset();
        } else {
            showModal(data.message || 'Error al cambiar contraseña', 'error', 'Error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showModal('Error de conexión al cambiar la contraseña', 'error', 'Error');
    }
}

function startLockoutCountdown(seconds) {
    const loginBtn = document.getElementById('loginBtn');
    let timeLeft = seconds;

    // 1. Bloquear el botón de login (sin tocar el texto, el contador va solo en el modal)
    if (loginBtn) {
        loginBtn.disabled = true;
    }

    // 2. Mostrar el modal base (el título sin emoji)
    if (typeof showModal === 'function') {
        showModal(
            `Demasiados intentos fallidos. Esperá ${seconds} segundos para volver a intentarlo.`,
            'warning',
            'Seguridad Activada'
        );
    }

    // 3. Reemplazar el icono: usar SVG vectorial del candado en vez de emoji
    const iconEl = document.getElementById('modalIcon');
    if (iconEl && typeof getSvgIconHtml === 'function') {
        iconEl.innerHTML = getSvgIconHtml('lock', 48, 'modal-icon-warning');
    }

    // 4. Reescribir el mensaje con HTML rico (contador en negrita)
    const msgEl = document.getElementById('modalMessage');
    if (msgEl) {
        msgEl.innerHTML = `Demasiados intentos fallidos. Por seguridad, esperá <b style="color:#fff; font-size:1.1em;">${timeLeft}s</b> para volver a intentarlo.`;
    }

    // 5. Bloquear el botón "Aceptar" y la "X" de cierre del modal
    // NOTA: showModal() reemplaza el innerHTML de .modal-actions con un botón SIN id,
    // por eso getElementById('modalButton') devuelve null. Usamos querySelector.
    const acceptBtn = document.querySelector('#customModal .modal-actions button');
    const closeBtn  = document.querySelector('#customModal .modal-close');

    function _lockModalButtons() {
        [acceptBtn, closeBtn].forEach(btn => {
            if (!btn) return;
            btn.disabled = true;
            btn.style.opacity = '0.3';
            btn.style.cursor = 'not-allowed';
            btn.style.pointerEvents = 'none';
        });
    }

    function _unlockModalButtons() {
        [acceptBtn, closeBtn].forEach(btn => {
            if (!btn) return;
            btn.disabled = false;
            btn.style.opacity = '';
            btn.style.cursor = '';
            btn.style.pointerEvents = '';
        });
    }

    _lockModalButtons();

    // 6. Actualizar el contador cada segundo
    const interval = setInterval(() => {
        timeLeft--;

        // Actualizar el mensaje del modal
        const el = document.getElementById('modalMessage');
        if (el) {
            el.innerHTML = `Demasiados intentos fallidos. Por seguridad, esperá <b style="color:#fff; font-size:1.1em;">${timeLeft}s</b> para volver a intentarlo.`;
        }

        if (timeLeft <= 0) {
            clearInterval(interval);

            // Re-habilitar botón de login
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.classList.remove('loading');
                const span = loginBtn.querySelector('span');
                if (span) span.textContent = 'Ingresar';
            }

            // Desbloquear botones del modal (NO cerrar automáticamente, esperar clic del usuario)
            _unlockModalButtons();

            // Actualizar el mensaje final
            const finalMsg = document.getElementById('modalMessage');
            if (finalMsg) {
                finalMsg.innerHTML = `El bloqueo ha finalizado. Podés volver a intentarlo.<br><small style="color:rgba(255,255,255,0.5); font-size:0.85em;">Los campos se limpiarán al aceptar.</small>`;
            }

            // Redefinir el onclick del Aceptar: limpiar campos y cerrar modal
            if (acceptBtn) {
                acceptBtn.onclick = () => {
                    const u = document.getElementById('username');
                    const p = document.getElementById('password');
                    if (u) u.value = '';
                    if (p) p.value = '';
                    if (typeof closeModal === 'function') closeModal();
                };
            }
        }
    }, 1000);
}
