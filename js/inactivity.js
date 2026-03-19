/* ============================================================
   ServidorAPP - LÓGICA DE INACTIVIDAD (SENSOR Y TIMERS)
   ============================================================ */

const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 Minutos
const COUNTDOWN_SECONDS = 5 * 60; // 5 Minutos de gracia en el modal

let inactivityTimer = null;
let countdownInterval = null;
let secondsRemaining = COUNTDOWN_SECONDS;
let isModalShowing = false;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar e inyectar el HTML del Modal en el Dashboard de forma silenciosa
    injectInactivityModal();
});

async function injectInactivityModal() {
    try {
        const response = await fetch('inactivity.html');
        if (!response.ok) return; // Si no hay HTML, no armar nada
        const html = await response.text();
        
        // Crear un contenedor e inyectar al DOM
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper.firstElementChild);

        // 2. Iniciar el rastreador de eventos
        startInactivitySensor();

    } catch (e) {
        console.error("Error cargando sensor inactividad:", e);
    }
}

function startInactivitySensor() {
    // Reiniciar reloj al detectar movimiento
    const resetTimer = () => {
        if (isModalShowing) return; // Si ya saltó el alerta, los movimientos de mouse no importan
        
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(triggerWarningModal, INACTIVITY_LIMIT_MS);
    };

    // Eventos a sensar (API Local Humana)
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('scroll', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    // Arrancar reloj primario por 10 minutos
    resetTimer();
}

function triggerWarningModal() {
    isModalShowing = true;
    
    // Configurar Modal
    const overlay = document.getElementById('inactivityOverlay');
    const timerDisplay = document.getElementById('inaTimerDisplay');
    const btnKeepAlive = document.getElementById('btnKeepSessionAlive');
    const timerWrapper = document.querySelector('.ina-timer-wrapper');

    if (!overlay) return;

    // Mostrar
    overlay.classList.add('show');
    secondsRemaining = COUNTDOWN_SECONDS;
    updateCounterDisplay(timerDisplay, secondsRemaining);

    // Botón Aceptar: cerrar modal, recuperar sesión y volver al minuto 0
    btnKeepAlive.onclick = () => {
        clearInterval(countdownInterval);
        overlay.classList.remove('show');
        timerWrapper.classList.remove('danger');
        isModalShowing = false;
        
        // Volver a dar 10 minutos (limpiar rastro viejo)
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(triggerWarningModal, INACTIVITY_LIMIT_MS);
    };

    // Comenzar Regresiva 5 Min (300... 299... 0)
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        secondsRemaining--;

        updateCounterDisplay(timerDisplay, secondsRemaining);

        // Efecto Rojo peligro en los ultimos 30 segundos
        if (secondsRemaining <= 30) {
            timerWrapper.classList.add('danger');
        }

        // ¿Perdió todo el tiempo? Cerrar Sesión Definitivamente
        if (secondsRemaining <= 0) {
            clearInterval(countdownInterval);
            if (typeof logout === 'function') {
                logout(); // Función de logout existente en dashboard.js
            } else {
                window.location.href = 'login.html';
            }
        }
    }, 1000);
}

function updateCounterDisplay(element, totalSeconds) {
    if (!element) return;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    
    // Formato 00:00
    const strM = mins.toString().padStart(2, '0');
    const strS = secs.toString().padStart(2, '0');
    
    element.textContent = `${strM}:${strS}`;
}
