/* ============================================================
   ServidorAPP - MÓDULO DE VISUALIZACIÓN DE IMÁGENES PRO (HIGHT QUALITY)
   ============================================================ */

/**
 * Este módulo maneja exclusivamente la visualización de imágenes,
 * permitiendo zoom, arrastre y descarga en alta calidad sin cortes.
 */

window.imageViewer = {
    currentUrl: '',
    currentName: '',
    scale: 1,
    isDragging: false,
    startX: 0,
    startY: 0,
    translateX: 0,
    translateY: 0
};

function openImageViewer(filename, path, token) {
    const overlay = document.getElementById('imageViewerOverlay');
    const imgEl = document.getElementById('ivImage');
    const nameEl = document.getElementById('ivFileName');
    
    if (!overlay || !imgEl) return;

    // Resetear estado
    imageViewer.scale = 1;
    imageViewer.translateX = 0;
    imageViewer.translateY = 0;
    updateImageTransform();

    // Configurar metadatos
    imageViewer.currentName = filename;
    imageViewer.currentUrl = `${API_URL}/api/files/preview/${encodeURIComponent(filename)}?path=${encodeURIComponent(path)}&token=${token}`;
    
    nameEl.textContent = filename;
    imgEl.src = imageViewer.currentUrl;
    
    // Mostrar overlay con animación
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Bloquear scroll
}

function closeImageViewer() {
    const overlay = document.getElementById('imageViewerOverlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = ''; // Restaurar scroll
}

// ---- FUNCIONES DE ZOOM Y ARRATER ----

function ivZoomIn() {
    imageViewer.scale += 0.2;
    if (imageViewer.scale > 5) imageViewer.scale = 5;
    updateImageTransform();
}

function ivZoomOut() {
    imageViewer.scale -= 0.2;
    if (imageViewer.scale < 0.2) imageViewer.scale = 0.2;
    updateImageTransform();
}

function ivResetZoom() {
    imageViewer.scale = 1;
    imageViewer.translateX = 0;
    imageViewer.translateY = 0;
    updateImageTransform();
}

function updateImageTransform() {
    const imgEl = document.getElementById('ivImage');
    if (imgEl) {
        imgEl.style.transform = `translate(${imageViewer.translateX}px, ${imageViewer.translateY}px) scale(${imageViewer.scale})`;
    }
}

function ivDownload() {
    if (typeof downloadFile === 'function') {
        downloadFile(imageViewer.currentName);
    }
}

// ---- EVENTOS DE ARRASTRE ----

document.addEventListener('DOMContentLoaded', () => {
    const imgEl = document.getElementById('ivImage');
    const overlay = document.getElementById('imageViewerOverlay');

    if (imgEl) {
        imgEl.addEventListener('mousedown', (e) => {
            if (imageViewer.scale > 1) {
                imageViewer.isDragging = true;
                imageViewer.startX = e.clientX - imageViewer.translateX;
                imageViewer.startY = e.clientY - imageViewer.translateY;
                imgEl.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (imageViewer.isDragging) {
                imageViewer.translateX = e.clientX - imageViewer.startX;
                imageViewer.translateY = e.clientY - imageViewer.startY;
                updateImageTransform();
            }
        });

        window.addEventListener('mouseup', () => {
            imageViewer.isDragging = false;
            if (imgEl) imgEl.style.cursor = imageViewer.scale > 1 ? 'grab' : 'default';
        });

        // Zoom con rueda del ratón
        overlay.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) ivZoomIn();
            else ivZoomOut();
        }, { passive: false });
    }
});
