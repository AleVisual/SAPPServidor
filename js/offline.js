/* ============================================================
   ServidorAPP - LÓGICA DE RECONEXIÓN (OFFLINE)
   ============================================================ */

const API_URL = 'https://instruments-department-certification-indication.trycloudflare.com';

document.addEventListener('DOMContentLoaded', () => {
    const btnDetect = document.getElementById('btnDetect');
    const statusText = document.getElementById('statusText');
    const statusDot = document.querySelector('.status-dot');
    
    // Función de ping manual al apretar el botón
    btnDetect.addEventListener('click', async () => {
        // Estado de carga
        btnDetect.classList.add('loading');
        const originalText = btnDetect.innerHTML;
        btnDetect.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" class="spin" style="margin-right:8px;"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg> Comprobando...`;
        
        statusText.textContent = "Haciendo ping al servidor...";

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seg
            
            const response = await fetch(`${API_URL}/api/health`, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                // ÉXITO: El servidor volvió
                statusDot.classList.add('success');
                statusText.textContent = "¡Servidor en línea! Redirigiendo...";
                statusText.style.color = "#2ecc71";
                
                btnDetect.innerHTML = `¡Conectado!`;
                btnDetect.style.background = "#2ecc71";
                btnDetect.style.boxShadow = "0 8px 20px rgba(46, 204, 113, 0.4)";
                
                // Redirigir al inicio después de un segundo
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1200);

            } else {
                throw new Error("Respuesta no OK");
            }

        } catch (error) {
            // FALLO: Sigue apagado
            console.error('Ping fallido:', error);
            
            statusText.textContent = "Ups... Aún sin respuesta.";
            statusText.style.color = "#ff4757";
            setTimeout(() => {
                statusText.textContent = "Esperando conexión...";
                statusText.style.color = "";
            }, 3000);

            // Restaurar botón
            btnDetect.classList.remove('loading');
            btnDetect.innerHTML = originalText;
        }
    });
});
