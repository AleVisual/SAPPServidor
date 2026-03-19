/* ============================================================
   ServidorAPP - MÓDULO Copy (Mover & Drag and Drop) - V2 (Blindado)
   Gestión de movimiento de archivos y subidas por arrastre
   ============================================================ */

const DRAG_TYPE_INTERNAL = 'application/x-sapp-internal';

// 1. Lógica para MOVER archivos entre carpetas (UI a UI)
function initDragAndDropMove() {
    const container = document.getElementById('filesContainer');
    if (!container) return;

    // Usamos delegación de eventos nativa sobre el contenedor para mayor estabilidad
    container.ondragstart = (e) => {
        const tr = e.target.closest('.draggable-item');
        if (tr) {
            // Seteamos un tipo de dato personalizado para identificar drag interno
            e.dataTransfer.setData(DRAG_TYPE_INTERNAL, tr.dataset.name);
            e.dataTransfer.effectAllowed = 'move';
            tr.classList.add('dragging');
            e.stopPropagation();
        }
    };

    container.ondragend = (e) => {
        const tr = e.target.closest('.draggable-item');
        if (tr) tr.classList.remove('dragging');
    };

    container.ondragover = (e) => {
        const folderRow = e.target.closest('.drop-zone-folder');
        if (folderRow) {
            // IMPORTANTE: Prevenir default es lo que permite el DROP
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            folderRow.classList.add('drag-over');
        }
    };

    container.ondragleave = (e) => {
        const folderRow = e.target.closest('.drop-zone-folder');
        if (folderRow) {
            folderRow.classList.remove('drag-over');
        }
    };

    container.ondrop = async (e) => {
        const folderRow = e.target.closest('.drop-zone-folder');
        if (folderRow) {
            // EVITAR DESCARGA: El preventDefault aquí es CRÍTICO
            e.preventDefault();
            e.stopPropagation();
            folderRow.classList.remove('drag-over');

            const sourceName = e.dataTransfer.getData(DRAG_TYPE_INTERNAL);
            const targetFolderName = folderRow.dataset.name;

            if (sourceName && targetFolderName && sourceName !== targetFolderName) {
                await moveItem(sourceName, targetFolderName);
            }
        }
    };
}

async function moveItem(sourceName, targetFolderName) {
    try {
        const response = await fetch(`${API_URL}/api/files/move`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${app.token}`
            },
            body: JSON.stringify({
                sourceName,
                targetFolderName,
                currentPath: app.currentPath
            })
        });

        if (response.ok) {
            showModal(`Moviendo "${sourceName}" a "${targetFolderName}"...`, 'success', 'Elemento Movido');
            if (typeof loadFiles === 'function') loadFiles();
        } else {
            const data = await response.json();
            showModal(data.message || 'Error al mover', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showModal('Error de conexión al mover archivo', 'error');
    }
}

// 2. Lógica para SUBIR archivos arrastrando desde la PC
function initDragAndDropUpload() {
    // Escuchamos en window para capturar cualquier arrastre desde fuera
    window.addEventListener('dragover', (e) => {
        // PREVENIR SIEMPRE para evitar que el navegador abra/descargue el archivo
        e.preventDefault();
        e.stopPropagation();
        
        const types = e.dataTransfer.types;
        // Solo mostrar si vienen archivos reales (PC) o el tipo interno
        if (types && (types.includes('Files') || types.includes('files'))) {
            showUploadOverlay();
        }
    }, false);

    window.addEventListener('drop', (e) => {
        // CRÍTICO: Prevenir que el navegador descargue/abra el archivo soltado
        e.preventDefault();
        e.stopPropagation();
        hideUploadOverlay();

        const types = e.dataTransfer.types;
        if (types && (types.includes('Files') || types.includes('files'))) {
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                handleFileUploads(files);
            }
        }
    }, false);

    window.addEventListener('dragleave', (e) => {
        if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
            hideUploadOverlay();
        }
    });

    // Aseguramos que el overlay no bloquee eventos
    document.addEventListener('DOMContentLoaded', () => {
        const overlay = document.getElementById('dragUploadOverlay');
        if (overlay) {
            overlay.style.pointerEvents = 'none';
        }
    });
}

function showUploadOverlay() {
    let overlay = document.getElementById('dragUploadOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'dragUploadOverlay';
        overlay.innerHTML = `
            <div class="drag-upload-content">
                <div class="drag-icon">${typeof getSvgIconHtml === 'function' ? getSvgIconHtml('upload', 80) : '↑'}</div>
                <h2>Suelta para subir</h2>
                <p>Destino: <strong>${app.currentPath || 'Directorio Raíz'}</strong></p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.classList.add('visible');
}

function hideUploadOverlay() {
    const overlay = document.getElementById('dragUploadOverlay');
    if (overlay) overlay.classList.remove('visible');
}

async function handleFileUploads(files) {
    showModal(`Procesando ${files.length} archivo(s)...`, 'info', 'Subida en Progreso');
    
    for (const file of files) {
        await uploadSingleFile(file);
    }
    
    if (typeof loadFiles === 'function') loadFiles();
    showModal('Todos los archivos se han procesado correctamente', 'success', 'Subida Finalizada');
}

async function uploadSingleFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('currentPath', app.currentPath || '');

    try {
        const response = await fetch(`${API_URL}/api/files/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${app.token}` },
            body: formData
        });

        if (!response.ok) {
            const data = await response.json();
            console.error(`Error subiendo ${file.name}:`, data.message);
        }
    } catch (err) {
        console.error('Upload error:', err);
    }
}

// 3. Lógica para PEGAR archivos (Ctrl+V) copiados desde la PC
function initClipboardPasteUpload() {
    window.addEventListener('paste', (e) => {
        const clipboard = e.clipboardData;
        if (!clipboard) return;

        // Intentar extraer archivos ya sea de .files o de .items (Chrome a veces esconde archivos de Windows en items)
        const files = [];
        
        if (clipboard.files && clipboard.files.length > 0) {
            for (let i = 0; i < clipboard.files.length; i++) {
                files.push(clipboard.files[i]);
            }
        } else if (clipboard.items && clipboard.items.length > 0) {
            for (let i = 0; i < clipboard.items.length; i++) {
                if (clipboard.items[i].kind === 'file') {
                    const f = clipboard.items[i].getAsFile();
                    if (f) files.push(f);
                }
            }
        }

        // Detectar si está tipeando en un input
        const activeElement = document.activeElement;
        const isEditor = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);

        // Si es texto (files.length === 0) y está en un input, dejar fluir
        if (files.length === 0 && isEditor) return;

        // Si definitivamente no hay archivos copiados
        if (files.length === 0) {
            // Ignorar silenciosamente para no ser molestos con textos copiados
            return; 
        }

        e.preventDefault();

        // Confirmar intencionalidad antes de disparar subida
        const folderName = app.currentPath || 'Raíz';
        showConfirm(`Detectamos que apretaste Ctrl+V para pegar ${files.length} archivo(s). ¿Subirlos a la carpeta "${folderName}"?`, 'Pegar y Subir', () => {
            handleFileUploads(files);
        });
    });
}

// Iniciar subida global y monitoreo de portapapeles una sola vez
initDragAndDropUpload();
initClipboardPasteUpload();
