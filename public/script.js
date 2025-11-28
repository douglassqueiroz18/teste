// Verificar se estamos editando um cliente existente
const urlParams = new URLSearchParams(window.location.search);
const clienteId = window.location.pathname.includes('/editar/') 
    ? window.location.pathname.split('/editar/')[1] 
    : urlParams.get('id');

let isEditing = false;

// Carregar dados do cliente se estiver editando
if (clienteId) {
    isEditing = true;
    loadClienteData(clienteId);
    loadClientesList();
}

// Carregar lista de clientes na página inicial
if (!clienteId) {
    loadClientesList();
}

// Função para carregar dados do cliente
async function loadClienteData(id) {
    try {
        const response = await fetch(`/api/clientes/${id}`);
        if (response.ok) {
            const cliente = await response.json();
            populateForm(cliente);
            showLinkSection(id);
            document.getElementById('submitText').textContent = 'Atualizar Dados';
        } else {
            showAlert('Cliente não encontrado', 'error');
        }
    } catch (error) {
        showAlert('Erro ao carregar dados do cliente', 'error');
        console.error(error);
    }
}

// Função para preencher o formulário
function populateForm(cliente) {
    document.getElementById('nome').value = cliente.nome || '';
    document.getElementById('telefone').value = cliente.telefone || '';
    document.getElementById('email').value = cliente.email || '';
    document.getElementById('instagram').value = cliente.instagram || '';
    document.getElementById('whatsapp').value = cliente.whatsapp || '';
    document.getElementById('facebook').value = cliente.facebook || '';
    document.getElementById('linkedin').value = cliente.linkedin || '';
    document.getElementById('website').value = cliente.website || '';
    document.getElementById('outros_links').value = cliente.outros_links || '';
}

// Função para carregar lista de clientes
async function loadClientesList() {
    try {
        const response = await fetch('/api/clientes');
        if (response.ok) {
            const clientes = await response.json();
            if (clientes.length > 0) {
                displayClientesList(clientes);
            }
        }
    } catch (error) {
        console.error('Erro ao carregar lista de clientes:', error);
    }
}

// Função para exibir lista de clientes
function displayClientesList(clientes) {
    const listContainer = document.getElementById('clientesList');
    const listItems = document.getElementById('clientesListItems');
    
    listContainer.style.display = 'block';
    listItems.innerHTML = '';

    clientes.forEach(cliente => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="cliente-name">${cliente.nome || 'Sem nome'}</span>
            <div class="cliente-actions">
                <a href="/editar/${cliente.id}" class="btn-edit">Editar</a>
                <a href="/c/${cliente.id}" target="_blank" class="btn-view">Ver PDF</a>
            </div>
        `;
        listItems.appendChild(li);
    });
}

// Manipular envio do formulário
document.getElementById('clienteForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        nome: document.getElementById('nome').value,
        telefone: document.getElementById('telefone').value,
        email: document.getElementById('email').value,
        instagram: document.getElementById('instagram').value,
        whatsapp: document.getElementById('whatsapp').value,
        facebook: document.getElementById('facebook').value,
        linkedin: document.getElementById('linkedin').value,
        website: document.getElementById('website').value,
        outros_links: document.getElementById('outros_links').value
    };

    try {
        let response;
        if (isEditing) {
            // Atualizar cliente existente
            response = await fetch(`/api/clientes/${clienteId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
        } else {
            // Criar novo cliente
            response = await fetch('/api/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
        }

        if (response.ok) {
            const data = await response.json();
            const id = isEditing ? clienteId : data.id;
            
            showAlert(
                isEditing ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!',
                'success'
            );
            
            showLinkSection(id);
            document.getElementById('submitText').textContent = 'Atualizar Dados';
            isEditing = true;
            
            // Atualizar URL sem recarregar a página
            if (!window.location.pathname.includes('/editar/')) {
                window.history.pushState({}, '', `/editar/${id}`);
            }
            
            loadClientesList();
        } else {
            showAlert('Erro ao salvar cliente', 'error');
        }
    } catch (error) {
        showAlert('Erro ao salvar cliente', 'error');
        console.error(error);
    }
});

// Função para mostrar seção de link
function showLinkSection(id) {
    const linkSection = document.getElementById('linkSection');
    const exclusiveLink = document.getElementById('exclusiveLink');
    const baseUrl = window.location.origin;
    
    exclusiveLink.value = `${baseUrl}/c/${id}`;
    linkSection.style.display = 'block';
    document.getElementById('previewBtn').style.display = 'inline-block';
}

// Função para copiar link
document.getElementById('copyBtn').addEventListener('click', () => {
    const linkInput = document.getElementById('exclusiveLink');
    linkInput.select();
    document.execCommand('copy');
    
    const copyBtn = document.getElementById('copyBtn');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = 'Copiado!';
    copyBtn.style.background = '#229954';
    
    setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.background = '#27ae60';
    }, 2000);
});

// Botão de visualizar PDF
document.getElementById('previewBtn').addEventListener('click', () => {
    if (clienteId) {
        window.open(`/c/${clienteId}`, '_blank');
    }
});

// Função para mostrar alertas
function showAlert(message, type) {
    const alert = document.getElementById('alert');
    alert.textContent = message;
    alert.className = `alert ${type}`;
    alert.style.display = 'block';

    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

