/* ============================================================
   ServidorAPP - MÓDULO DE ARCHIVOS (Gestión de Carpetas)
   ============================================================ */

async function loadFolders() {
    try {
        const folderType = app.user.folderType;

        if (!folderType) {
            document.getElementById('foldersContainer').innerHTML = `
                <div class="folder-card empty-state">
                    <h3>Sin Carpeta Asignada</h3>
                    <p>Tu administrador aún no te ha asignado una carpeta.</p>
                </div>
            `;
            return;
        }

        const folderNames = { 'ari': 'Carpeta Ari', 'ruth': 'Carpeta Ruth' };
        const folderName = folderNames[folderType] || folderType;

        const response = await fetch(`${API_URL}/api/files/browse`, {
            headers: { 'Authorization': `Bearer ${app.token}` }
        });

        if (!response.ok) throw new Error('Error al cargar la carpeta asignada');

        const data = await response.json();
        const itemCount = data.items.length;

        document.getElementById('foldersContainer').innerHTML = `
            <div class="folder-card active-folder">
                <div class="folder-header">
                    <span class="folder-title">${folderName}</span>
                </div>
                <div class="folder-details">
                    <p><strong>Ubicación:</strong> ${data.folderPath}</p>
                    <p><strong>Contenido:</strong> ${itemCount} elemento${itemCount !== 1 ? 's' : ''}</p>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('foldersContainer').innerHTML = `<p class="error-msg">${error.message}</p>`;
    }
}

async function loadFiles() {
    // Si el usuario no tiene carpeta asignada, mostrar mensaje y no hacer la llamada
    if (!app.user || !app.user.folderType) {
        const container = document.getElementById('filesContainer');
        if (container) {
            container.innerHTML = `
                <div class="folder-card empty-state" style="text-align:center; padding: 40px 20px;">
                    <h3 style="color: rgba(255,255,255,0.7); margin-bottom: 10px;">Sin Carpeta Asignada</h3>
                    <p style="color: rgba(255,255,255,0.4); font-size: 14px;">Tu administrador aún no te ha asignado una carpeta de acceso.</p>
                </div>
            `;
        }
        return;
    }

    try {
        const pathParam = app.currentPath ? `?path=${encodeURIComponent(app.currentPath)}&_t=${Date.now()}` : `?_t=${Date.now()}`;
        const response = await fetch(`${API_URL}/api/files/browse${pathParam}`, {
            headers: { 'Authorization': `Bearer ${app.token}` }
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || 'Error al cargar archivos');
        }

        const data = await response.json();
        app.files = data.items || [];
        displayFiles();

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('filesContainer').innerHTML = `<p class="error-msg">${error.message}</p>`;
    }
}

function displayFiles() {
    const container = document.getElementById('filesContainer');
    if (!container) return;

    const files = app.files.filter(item => item.isFile);
    const folders = app.files.filter(item => item.isDirectory);

    // Build breadcrumb
    let html = buildBreadcrumb();

    if (app.files.length === 0) {
        html += '<div class="empty-folder">Esta carpeta está vacía.</div>';
        container.innerHTML = html;
        return;
    }

    // List Folders & Files (LAYOUT DE TABLA ÚNICA)
    html += `
        <div class="table-responsive" style="margin-top: 15px; width: 100%; overflow-x: auto;">
            <table class="w-full text-left file-list-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); font-size: 13px; text-transform: uppercase;">
                        <th class="col-name" style="padding: 12px 16px; font-weight: 600;">Nombre</th>
                        <th class="col-type hide-on-mobile" style="padding: 12px 16px; font-weight: 600;">Tipo</th>
                        <th class="col-size hide-on-mobile" style="padding: 12px 16px; font-weight: 600;">Tamaño</th>
                        <th class="col-date hide-on-mobile" style="padding: 12px 16px; font-weight: 600;">Fecha</th>
                        <th class="col-actions" style="padding: 12px 16px; text-align: right; width: 40px;"></th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Generar CSS interno de la tabla simulado usando style para evitar romper cosas
    const trHoverStyle = "this.style.backgroundColor='rgba(255,255,255,0.05)'";
    const trOutStyle = "this.style.backgroundColor='transparent'";

    if (folders.length > 0) {
        folders.forEach(f => {
            html += `
                <tr onmouseenter="${trHoverStyle}" onmouseleave="${trOutStyle}" style="border-bottom: 1px solid rgba(255,255,255,0.03); cursor: pointer; transition: background 0.2s;"
                    data-name="${escapeAttr(f.name)}" 
                    data-folder="true"
                    class="drop-zone-folder"
                    onclick="handleItemInteraction(event, '${escapeAttr(f.name)}', true)">
                    
                    <td class="col-name" style="padding: 14px 16px; max-width: 150px; overflow: hidden; text-overflow: ellipsis;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="color: #4f8ef7; display: flex; flex-shrink: 0;">${getSvgIconHtml('folder', 20)}</span>
                            <span style="font-weight: 500; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(f.name)}</span>
                        </div>
                    </td>
                    <td class="col-type hide-on-mobile" style="padding: 14px 16px; color: rgba(255,255,255,0.6); font-size: 14px;">Carpeta</td>
                    <td class="col-size hide-on-mobile" style="padding: 14px 16px; color: rgba(255,255,255,0.6); font-size: 14px;">-</td>
                    <td class="col-date hide-on-mobile" style="padding: 14px 16px; color: rgba(255,255,255,0.6); font-size: 14px;">${formatDate(f.modified)}</td>
                    <td class="col-actions" style="padding: 14px 16px; text-align: right;">
                        <div class="file-actions" style="display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap;">
                            <button class="btn-delete-sm btn-icon-only" title="Eliminar Carpeta" onclick="event.stopPropagation(); deleteFolderConfirm('${escapeAttr(f.name)}')">
                                ${getSvgIconHtml('trash', 16)}
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }

    if (files.length > 0) {
        files.forEach(f => {
            const ftype = typeof getFileType === 'function' ? getFileType(f.name) : 'unknown';
            html += `
                <tr onmouseenter="${trHoverStyle}" onmouseleave="${trOutStyle}" style="border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.2s;"
                    data-name="${escapeAttr(f.name)}" 
                    data-folder="false"
                    draggable="true" 
                    class="draggable-item">
                    
                    <td class="col-name" style="padding: 14px 16px; max-width: 150px; overflow: hidden; text-overflow: ellipsis;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="color: #4f8ef7; display: flex; flex-shrink: 0;">${getSvgIconHtml('file', 20)}</span>
                            <span style="font-weight: 500; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(f.name)}</span>
                        </div>
                    </td>
                    <td class="col-type hide-on-mobile" style="padding: 14px 16px; color: rgba(255,255,255,0.6); font-size: 14px;">${ftype.toUpperCase()}</td>
                    <td class="col-size hide-on-mobile" style="padding: 14px 16px; color: rgba(255,255,255,0.6); font-size: 14px;">${formatFileSize(f.size)}</td>
                    <td class="col-date hide-on-mobile" style="padding: 14px 16px; color: rgba(255,255,255,0.6); font-size: 14px;">${formatDate(f.modified)}</td>
                    <td class="col-actions" style="padding: 14px 16px; text-align: right;">
                        <div class="file-actions" style="display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap;">
                            <button class="btn-preview-action-sm btn-icon-only" title="Ver" onclick="event.stopPropagation(); previewFile('${escapeAttr(f.name)}')">
                                ${getSvgIconHtml('eye', 14)}
                            </button>
                            <button class="btn-preview-action-sm btn-icon-only" title="Descargar" onclick="event.stopPropagation(); downloadFile('${escapeAttr(f.name)}')">
                                ${getSvgIconHtml('download', 14)}
                            </button>
                            <button class="btn-delete-sm btn-icon-only" title="Eliminar" onclick="event.stopPropagation(); deleteFileConfirm('${escapeAttr(f.name)}')">
                                ${getSvgIconHtml('trash', 14)}
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
    
    // Inicializar Drag & Drop para los elementos renderizados
    if (typeof initDragAndDropMove === 'function') {
        initDragAndDropMove();
    }
}

function navigateToFolder(folderName) {
    app.currentPath = app.currentPath ? `${app.currentPath}/${folderName}` : folderName;
    loadFiles();
}

function navigateToRoot() {
    app.currentPath = '';
    loadFiles();
}

function buildBreadcrumb() {
    const parts = app.currentPath.split('/').filter(p => p);
    let html = '<div class="breadcrumb">';
    html += `<span class="breadcrumb-item" onclick="navigateToRoot()">Mi Carpeta</span>`;
    
    let cumulativePath = '';
    parts.forEach((p, idx) => {
        cumulativePath = cumulativePath ? `${cumulativePath}/${p}` : p;
        html += ` <span class="divider">/</span> `;
        if (idx === parts.length - 1) {
            html += `<span class="breadcrumb-item active">${p}</span>`;
        } else {
            const currentPathCopy = cumulativePath;
            html += `<span class="breadcrumb-item" onclick="app.currentPath='${currentPathCopy}'; loadFiles();">${p}</span>`;
        }
    });

    html += '</div>';
    return html;
}

// ----- ACCIONES DE ARCHIVO -----

async function downloadFile(filename) {
    const filePath = app.currentPath || '';
    const url = `${API_URL}/api/files/download/${encodeURIComponent(filename)}?path=${encodeURIComponent(filePath)}`;
    
    try {
        // Usamos fetch para poder enviar el token en los headers de forma segura
        const response = await fetch(url, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${app.token}` 
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error en la descarga');
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Limpiar
        setTimeout(() => {
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();
        }, 100);

    } catch (err) {
        console.error('Error descargando:', err);
        if (typeof showModal === 'function') {
            showModal('No se pudo descargar el archivo: ' + err.message, 'error');
        }
    }
}

function deleteFileConfirm(filename) {
    const currentPath = app.currentPath || '';
    showConfirm(`¿Estás seguro de que deseas eliminar permanentemente el archivo "${filename}"?`, 'Confirmar Eliminación', async () => {
        try {
            const url = `${API_URL}/api/files/${encodeURIComponent(filename)}?path=${encodeURIComponent(currentPath)}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${app.token}`
                }
            });

             if (response.ok) {
                showModal('Archivo eliminado correctamente', 'success');
                loadFiles();
                if (typeof window._postDelete === 'function') {
                    window._postDelete();
                    window._postDelete = null;
                }
            } else {
                const data = await response.json();
                showModal(data.message || 'Error al eliminar archivo', 'error');
            }
        } catch (error) {
            console.error('Error al eliminar:', error);
            showModal('Error de conexión al eliminar archivo', 'error');
        }
    });
}

function deleteFolderConfirm(folderName) {
    const currentPath = app.currentPath || '';
    showConfirm(`¿Estás seguro de eliminar la carpeta "${folderName}" y TODO su contenido? Esta acción no se puede deshacer.`, 'Eliminar Carpeta', async () => {
        try {
            const url = `${API_URL}/api/folders/${encodeURIComponent(folderName)}?path=${encodeURIComponent(currentPath)}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${app.token}`
                }
            });

            if (response.ok) {
                showModal('Carpeta eliminada correctamente', 'success');
                loadFiles();
            } else {
                const data = await response.json();
                showModal(data.message || 'Error al eliminar carpeta', 'error');
            }
        } catch (error) {
            console.error('Error al eliminar carpeta:', error);
            showModal('Error de conexión al eliminar carpeta', 'error');
        }
    });
}

function showCreateFolderDialog() {
    const modal = document.getElementById('customModal');
    const overlay = document.getElementById('modalOverlay');
    if (!modal) return;
    
    document.getElementById('modalTitle').textContent = 'Nueva Carpeta';
    document.getElementById('modalIcon').innerHTML = getSvgIconHtml('folder', 48, 'modal-icon-primary');
    
    document.getElementById('modalMessage').innerHTML = `
        <p style="margin-bottom: 20px; color: rgba(255,255,255,0.7);">Ingresa el nombre de la nueva carpeta:</p>
        <div class="form-group-custom">
            <input type="text" id="newFolderName" placeholder="Ej: Documentos, Fotos..." 
                   style="width: 100%; padding: 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #fff; font-size: 16px; outline: none; transition: border-color 0.3s;"
                   onfocus="this.style.borderColor='#4f8ef7'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
        </div>
    `;

    const actions = document.querySelector('.modal-actions');
    actions.innerHTML = `
        <button class="btn-modal btn-modal-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn-modal btn-modal-primary" id="confirmCreateFolder">Crear Carpeta</button>
    `;

    modal.classList.add('show');
    overlay.classList.add('show');
    document.body.classList.add('modal-open');
    
    const input = document.getElementById('newFolderName');
    input.focus();

    document.getElementById('confirmCreateFolder').onclick = async () => {
        const folderName = input.value.trim();
        if (!folderName) {
            showModal('Por favor ingresa un nombre válido', 'warning', 'Nombre Requerido');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/folders/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${app.token}`
                },
                body: JSON.stringify({ 
                    folderName: folderName,
                    currentPath: app.currentPath 
                })
            });

            if (response.ok) {
                closeModal();
                showModal('Carpeta creada exitosamente', 'success', 'Éxito');
                loadFiles(); // Recargar lista
            } else {
                const data = await response.json();
                showModal(data.message || 'Error al crear la carpeta', 'error', 'Error');
            }
        } catch (error) {
            console.error('Error al crear carpeta:', error);
            showModal('Error de conexión al servidor', 'error', 'Error');
        }
    };

    // Soporte para Enter
    input.onkeydown = (e) => {
        if (e.key === 'Enter') document.getElementById('confirmCreateFolder').click();
    };
}

// ----- UTILIDADES -----

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function escapeAttr(text) {
    if (!text) return '';
    return text.toString().replace(/'/g, "\\'").replace(/"/g, "&quot;");
}
