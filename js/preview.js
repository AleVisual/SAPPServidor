/* ============================================================
   ServidorAPP - MÓDULO DE PREVISUALIZACIÓN Y EDICIÓN PRO
   ============================================================ */

let quill = null; // No se usa en el modal ahora, el editor real está en editor.html

// Tipos de archivo que permiten edición enriquecida (Rich Text -> DOCX)
const EDITABLE_OFFICE = ['.docx', '.doc'];
// Tipos de archivo que permiten edición de texto plano
const EDITABLE_TEXT = ['.txt', '.js', '.css', '.html', '.json', '.php', '.sql'];

async function previewFile(filename, size) {
    const previewModal = document.getElementById('previewModal');
    const previewOverlay = document.getElementById('previewModalOverlay');
    const previewName = document.getElementById('previewFileName');
    const previewBody = document.getElementById('previewBody');
    const iconContainer = document.getElementById('previewFileIcon');

    // Botones de acción
    const btnDownload = document.getElementById('previewDownloadBtn');
    const btnDelete = document.getElementById('previewDeleteBtn');
    const btnOpenDesktop = document.getElementById('previewOpenDesktopBtn');
    const btnEdit = document.getElementById('previewEditBtn');
    const btnSave = document.getElementById('previewSaveBtn');
    const btnCancel = document.getElementById('previewCancelBtn');

    if (!previewModal) return;

    // Reset UI
    previewName.textContent = filename;
    previewBody.innerHTML = '<div class="preview-loading"><div class="spinner"></div><p>Preparando vista previa...</p></div>';
    btnEdit.style.display = 'none';
    btnSave.style.display = 'none';
    btnCancel.style.display = 'none';
    btnOpenDesktop.style.display = 'none';
    
    // Configurar Eliminar
    if (btnDelete) {
        btnDelete.onclick = () => {
            if (typeof deleteFileConfirm === 'function') {
                deleteFileConfirm(filename);
                // El modal de confirmación se encargará, pero si confirma, el archivo se borra y cerramos este modal
                window._postDelete = closePreviewModal; 
            }
        };
    }

    // Mostrar modal
    previewModal.classList.add('show');
    previewOverlay.classList.add('show');
    document.body.classList.add('modal-open');

    const ext = '.' + filename.split('.').pop().toLowerCase();
    const filePath = app.currentPath ? `${app.currentPath}/${filename}` : filename;
    
    // Configurar icono
    if (typeof getSvgIconHtml === 'function') {
        iconContainer.innerHTML = getSvgIconHtml(ext.substring(1), 24);
    }

    // Configurar descarga
    btnDownload.onclick = () => downloadFile(filename);

    // Guardar estado local
    previewState.filename = filename;
    previewState.filePath = filePath;

    // LÓGICA DE VISUALIZACIÓN POR TIPO
    try {
        if (isImage(ext)) {
            // NUEVO: Delegar a nuestro módulo especializado de imágenes
            if (typeof openImageViewer === 'function') {
                openImageViewer(filename, app.currentPath || '', app.token);
                // No abrimos el modal general si es una imagen
                closePreviewModal();
                return;
            }
        } 
        
        if (isVideo(ext)) {
            const url = `${API_URL}/api/files/preview/${encodeURIComponent(filename)}?path=${encodeURIComponent(app.currentPath)}&token=${app.token}`;
            previewBody.innerHTML = `<video controls class="preview-video"><source src="${url}" type="video/mp4">Tu navegador no soporta video.</video>`;
        }
        else if (isAudio(ext)) {
            const url = `${API_URL}/api/files/preview/${encodeURIComponent(filename)}?path=${encodeURIComponent(app.currentPath)}&token=${app.token}`;
            previewBody.innerHTML = `
                <div class="preview-audio-container">
                    <div class="audio-icon">${getSvgIconHtml('music', 64)}</div>
                    <audio controls><source src="${url}">Tu navegador no soporta audio.</audio>
                </div>`;
        }
        else if (isPDF(ext)) {
            const url = `${API_URL}/api/files/preview/${encodeURIComponent(filename)}?path=${encodeURIComponent(app.currentPath)}&token=${app.token}`;
            previewBody.innerHTML = `<iframe src="${url}" class="preview-iframe"></iframe>`;
        }
        else if (isOffice(ext)) {
            // Preview vía Office Online
            const publicUrl = `${API_URL}/api/files/preview/${encodeURIComponent(filename)}?path=${encodeURIComponent(app.currentPath)}&token=${app.token}`;
            const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(publicUrl)}`;
            previewBody.innerHTML = `<iframe src="${officeUrl}" class="preview-iframe"></iframe>`;
            
            // Botón Abrir en Escritorio (WebDAV) - DIRECTO
            btnOpenDesktop.style.display = 'flex';
            btnOpenDesktop.onclick = () => openInDesktop(filePath, ext);
            
            // Botón Editar (Abrir editor real en nueva pestaña)
            btnEdit.style.display = 'flex';
        }
        else if (isText(ext)) {
            // Cargar contenido para previsualizar
            const content = await fetchFileContent(filePath);
            previewBody.innerHTML = `<pre class="preview-text"><code>${escapeHtml(content)}</code></pre>`;
            btnEdit.style.display = 'flex';
            previewState.content = content;
        }
        else {
            previewBody.innerHTML = `
                <div class="preview-unknown">
                    ${getSvgIconHtml('file', 64)}
                    <p>No hay vista previa disponible para este tipo de archivo.</p>
                    <button class="btn btn-primary" onclick="downloadFile('${filename}')">Descargar para ver</button>
                </div>`;
        }
    } catch (err) {
        previewBody.innerHTML = `<div class="preview-error"><p>Error al cargar el archivo: ${err.message}</p></div>`;
    }
}

// ----- FUNCIONALIDADES PRO -----

function openInDesktop(filePath, ext) {
    let protocol = 'ms-word';
    const extension = ext.toLowerCase();
    
    if (extension.startsWith('.xls')) protocol = 'ms-excel';
    else if (extension.startsWith('.ppt')) protocol = 'ms-powerpoint';
    else if (extension.startsWith('.doc')) protocol = 'ms-word';
    else protocol = 'ms-word'; // Fallback

    // URI format: ms-word:ofe|u|https://URL/webdav/TOKEN/PATH
    // Usamos API_URL en lugar de window.location.origin para asegurar que apunte al servidor 3003
    // y encodeURI para manejar espacios y caracteres especiales en la ruta
    const sanitizedPath = filePath.replace(/\\/g, '/');
    const webdavUrl = `${API_URL}/webdav/${app.token}/${encodeURI(sanitizedPath)}`;
    const desktopUri = `${protocol}:ofe|u|${webdavUrl}`;
    
    console.log('Abriendo en escritorio:', desktopUri);
    window.location.href = desktopUri;
}

function enterEditMode() {
    if (!previewState.filename) return;

    const ext = '.' + previewState.filename.split('.').pop().toLowerCase();
    const DESKTOP_ONLY = ['.xlsx', '.xls', '.accdb', '.mdb', '.pptx', '.ppt'];

    if (DESKTOP_ONLY.includes(ext)) {
        let appName = 'Microsoft Excel';
        if (['.accdb', '.mdb'].includes(ext)) appName = 'Microsoft Access';
        if (['.pptx', '.ppt'].includes(ext)) appName = 'Microsoft PowerPoint';

        showModal(
            `Este archivo binario requiere ${appName} instalado en tu equipo. 
             Por favor, utiliza el botón "Abrir en Escritorio" para editarlo de forma segura y profesional.`, 
            'info', 
            'Edición Exclusiva'
        );
        return;
    }

    const file = encodeURIComponent(previewState.filename);
    const path = encodeURIComponent(app.currentPath || '');
    const token = encodeURIComponent(app.token);
    const api = encodeURIComponent(API_URL);

    // Abrir el editor diseñado por nosotros en una nueva pestaña como se pidió
    const editorUrl = `editor.html?file=${file}&path=${path}&token=${token}&api=${api}`;
    window.open(editorUrl, '_blank');
    
    // Opcional: Cerrar el modal de vista previa tras abrir el editor
    closePreviewModal();
}

// ----- UTILS -----

async function fetchFileContent(filePath) {
    const response = await fetch(`${API_URL}/api/files/download?path=${encodeURIComponent(filePath)}&token=${app.token}`);
    if (!response.ok) throw new Error('No se pudo descargar el contenido');
    return await response.text();
}

async function exitEditMode() {
    if (previewState.filename) {
        previewFile(previewState.filename);
    }
}

function closePreviewModal() {
    const modal = document.getElementById('previewModal');
    const overlay = document.getElementById('previewModalOverlay');
    if (modal) modal.classList.remove('show');
    if (overlay) overlay.classList.remove('show');
    document.body.classList.remove('modal-open');
}

// Detección de tipos
function isImage(ext) { return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext); }
function isVideo(ext) { return ['.mp4', '.webm', '.ogg'].includes(ext); }
function isAudio(ext) { return ['.mp3', '.wav', '.ogg'].includes(ext); }
function isPDF(ext) { return ext === '.pdf'; }
function isOffice(ext) { return ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(ext); }
function isText(ext) { return EDITABLE_TEXT.includes(ext); }

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}
