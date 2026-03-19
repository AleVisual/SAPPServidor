/**
 * SApp Editor Pro - Logic
 * Gestión de edición independiente para el ServidorAle
 */

let quill = null;
let currentFile = {
    name: '',
    path: '',
    token: '',
    type: 'text' // text or rich
};

document.addEventListener('DOMContentLoaded', () => {
    initEditor();
});

let apiUrl = '';

async function initEditor() {
    const params = new URLSearchParams(window.location.search);
    currentFile.name = params.get('file');
    currentFile.path = params.get('path') || '';
    currentFile.token = params.get('token');
    apiUrl = params.get('api') || ''; // Capturar el origen de la API

    if (!currentFile.name || !currentFile.token) {
        showError('Parámetros de archivo insuficientes.');
        return;
    }

    document.getElementById('fileNameDisplay').textContent = currentFile.name;
    document.getElementById('filePathDisplay').textContent = '/' + currentFile.path;

    const ext = currentFile.name.split('.').pop().toLowerCase();
    const isOffice = ['doc', 'docx', 'odt', 'rtf'].includes(ext);
    
    currentFile.type = isOffice ? 'rich' : 'text';

    if (currentFile.type === 'rich') {
        initRichEditor();
    } else {
        initPlainTextEditor();
    }

    await loadFileContent();
}


function initRichEditor() {
    const toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{ 'header': 1 }, { 'header': 2 }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'font': [] }],
        [{ 'align': [] }],
        ['clean']
    ];

    quill = new Quill('#richEditor', {
        modules: { toolbar: toolbarOptions },
        theme: 'snow',
        placeholder: 'Escribe algo increíble...'
    });
    
    document.getElementById('textEditor').style.display = 'none';
    document.getElementById('richEditor').style.display = 'block';
}

function initPlainTextEditor() {
    document.getElementById('textEditor').style.display = 'block';
    document.getElementById('richEditor').style.display = 'none';
    
    // Permitir tabulación en el textarea
    const textarea = document.getElementById('textEditor');
    textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.substring(0, start) + "\t" + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 1;
        }
    });

    // Atajo Ctrl+S para guardar
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveFile();
        }
    });
}

async function loadFileContent() {
    try {
        const url = `${apiUrl}/api/files/preview/${encodeURIComponent(currentFile.name)}?token=${encodeURIComponent(currentFile.token)}&path=${encodeURIComponent(currentFile.path)}&_t=${Date.now()}`;
        
        const ext = currentFile.name.split('.').pop().toLowerCase();
        const isDocx = ['docx', 'doc'].includes(ext);

        if (isDocx) {
            // Caso especial: Archivos Word (Binarios)
            const response = await fetch(url);
            if (!response.ok) throw new Error('No se pudo leer el archivo binario del servidor.');
            
            const arrayBuffer = await response.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
            
            quill.root.innerHTML = result.value;
            if (result.messages.length > 0) {
                console.warn('Mammoth logs:', result.messages);
            }
        } else {
            // Caso normal: Texto Plano o HTML
            const response = await fetch(url);
            if (!response.ok) throw new Error('No se pudo leer el contenido del servidor.');
            
            const content = await response.text();
            if (currentFile.type === 'rich') {
                quill.root.innerHTML = content;
            } else {
                document.getElementById('textEditor').value = content;
            }
        }

        hideLoading();
    } catch (error) {
        console.error('Error cargando archivo:', error);
        showError('Error al cargar el contenido: ' + error.message);
    }
}


async function saveFile() {
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.innerHTML;
    
    try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span>Guardando...</span>';

        let content = '';
        if (currentFile.type === 'rich') {
            content = quill.root.innerHTML;
        } else {
            content = document.getElementById('textEditor').value;
        }

        const response = await fetch(`${apiUrl}/api/files/content/${encodeURIComponent(currentFile.name)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentFile.token}`
            },
            body: JSON.stringify({
                content: content,
                currentPath: currentFile.path
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Error al guardar en el servidor');
        }

        showToast('✓ Archivo guardado correctamente', 'success');
        
        // ✨ MAGIA: Refrescar la ventana principal (Dashboard) si sigue abierta
        if (window.opener && typeof window.opener.loadFiles === 'function') {
            window.opener.loadFiles();
        }
        
    } catch (error) {
        console.error('Error guardando:', error);
        showToast('Error: ' + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

// Helpers UI
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showError(msg) {
    document.getElementById('loadingText').textContent = msg;
    document.getElementById('loadingOverlay').style.background = 'rgba(239, 68, 68, 0.1)';
    document.querySelector('.spinner').style.display = 'none';
}

function showToast(message, type) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toastMessage');
    
    toast.className = 'toast show toast-' + type;
    msgEl.textContent = message;
    
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}
