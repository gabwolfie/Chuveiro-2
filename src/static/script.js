// Variáveis globais
let currentUser = null;
let selectedDuration = 10;
let socket = null;
let deferredPrompt = null;
let notificationCount = 0;

// PWA Install
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installPrompt').classList.remove('hidden');
});

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('App instalado');
            }
            deferredPrompt = null;
            document.getElementById('installPrompt').classList.add('hidden');
        });
    }
}

// Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registrado'))
        .catch(error => console.log('SW falhou:', error));
}

// Notificações
function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            // Mostrar um alerta explicativo antes de pedir permissão
            if (confirm('Este app precisa de permissão para enviar notificações sobre o uso do chuveiro. Deseja permitir?')) {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        console.log('Permissão de notificação concedida');
                        showNotification('✅ Notificações Ativadas', 'Você receberá alertas sobre o uso do chuveiro!');
                        registerForPushNotifications();
                    } else {
                        alert('Notificações negadas. Você pode ativar nas configurações do navegador.');
                    }
                });
            }
        } else if (Notification.permission === 'granted') {
            registerForPushNotifications();
        } else if (Notification.permission === 'denied') {
            alert('Notificações estão bloqueadas. Para receber alertas, ative nas configurações do navegador.');
        }
    } else {
        alert('Seu navegador não suporta notificações.');
    }
}

function registerForPushNotifications() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
            return registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: null // Em produção, usar chave VAPID real
            });
        }).then(subscription => {
            console.log('Inscrito para push notifications:', subscription);
            // Aqui você enviaria a subscription para o servidor
        }).catch(err => console.error('Falha ao registrar push:', err));
    }
}

function showNotification(title, body, options = {}) {
    const defaultOptions = {
        body: body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        requireInteraction: false, // Mudado para false para não bloquear
        persistent: true,
        tag: 'chuveiro-notification',
        renotify: true,
        silent: false, // Garantir que não seja silenciosa
        timestamp: Date.now(),
        actions: [
            {
                action: 'view',
                title: 'Ver App',
                icon: '/icon-192.png'
            },
            {
                action: 'close',
                title: 'Fechar',
                icon: '/icon-192.png'
            }
        ],
        data: {
            url: window.location.origin,
            timestamp: Date.now()
        }
    };

    const finalOptions = { ...defaultOptions, ...options };

    // Primeiro tentar via Service Worker (mais confiável para mobile)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, finalOptions).then(() => {
                console.log('Notificação enviada via Service Worker');
            }).catch(err => {
                console.error('Erro ao enviar notificação via SW:', err);
                // Fallback para notificação nativa
                fallbackNotification(title, body, finalOptions);
            });
        }).catch(err => {
            console.error('Service Worker não disponível:', err);
            // Fallback para notificação nativa
            fallbackNotification(title, body, finalOptions);
        });
    } else {
        // Fallback para notificação nativa
        fallbackNotification(title, body, finalOptions);
    }

    // Também mostrar notificação na tela do app
    showInAppNotification(title, body);
}

function fallbackNotification(title, body, options) {
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            const notification = new Notification(title, options);
            
            notification.onclick = function() {
                window.focus();
                notification.close();
            };

            // Auto-fechar após 8 segundos
            setTimeout(() => {
                notification.close();
            }, 8000);
        } catch (err) {
            console.error('Erro ao criar notificação nativa:', err);
        }
    }
}

function showInAppNotification(title, body) {
    // Criar notificação visual dentro do app
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 300px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
        <div style="font-size: 14px;">${body}</div>
    `;

    // Adicionar animação CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Remover após 5 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);

    // Permitir fechar clicando
    notification.onclick = function() {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    };
}

function showShowerNotification(type, username, duration = null) {
    let title, body, options = {};

    if (type === 'start') {
        title = '🚿 Chuveiro em Uso';
        body = `${username} iniciou o uso do chuveiro`;
        if (duration) {
            body += ` por ${duration} minutos`;
        }
        options.tag = 'shower-start';
        options.icon = '/icon-512.png';
    } else if (type === 'end') {
        title = '✅ Chuveiro Liberado';
        body = `${username} finalizou o uso do chuveiro. Agora está livre!`;
        options.tag = 'shower-end';
        options.icon = '/icon-512.png';
        options.vibrate = [300, 100, 300, 100, 300];
    }

    showNotification(title, body, options);
}

// SocketIO
function initSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Conectado ao servidor');
        socket.emit('join_notifications');
    });
    
    socket.on('notification', (data) => {
        console.log('Nova notificação:', data);
        showNotification('🚿 Chuveiro', data.message);
        addNotificationToList(data);
        updateNotificationBadge();
        updateStatus(); // Atualizar status quando receber notificação
    });

    socket.on('shower_started', (data) => {
        console.log('Chuveiro iniciado por outro usuário:', data);
        showShowerNotification('start', data.username, data.duration);
        updateStatus();
    });

    socket.on('shower_ended', (data) => {
        console.log('Chuveiro finalizado por outro usuário:', data);
        showShowerNotification('end', data.username);
        updateStatus();
    });

    socket.on('status_update', (data) => {
        console.log('Status atualizado:', data);
        displayStatus(data);
    });
    
    socket.on('disconnect', () => {
        console.log('Desconectado do servidor');
    });
}

function addNotificationToList(notification) {
    const list = document.getElementById('notificationsList');
    const item = document.createElement('div');
    item.className = 'notification-item';
    item.innerHTML = `
        <strong>${notification.message}</strong>
        <br><small>${new Date(notification.timestamp).toLocaleTimeString()}</small>
    `;
    list.insertBefore(item, list.firstChild);
    list.classList.remove('hidden');
    
    // Limitar a 5 notificações visíveis
    while (list.children.length > 5) {
        list.removeChild(list.lastChild);
    }
}

function updateNotificationBadge() {
    notificationCount++;
    const badge = document.getElementById('notificationBadge');
    badge.textContent = notificationCount;
    badge.classList.remove('hidden');
}

// Funções de autenticação
async function login() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        alert('Por favor, preencha todos os campos');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            showMainApp();
            requestNotificationPermission();
            initSocket();
        } else {
            alert(data.error || 'Erro no login');
        }
    } catch (error) {
        alert('Erro de conexão');
    }
}

async function register() {
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!username || !email || !password || !confirmPassword) {
        alert('Por favor, preencha todos os campos obrigatórios');
        return;
    }

    if (password !== confirmPassword) {
        alert('As senhas não coincidem. Por favor, verifique e tente novamente.');
        document.getElementById('confirmPassword').focus();
        return;
    }

    if (password.length < 6) {
        alert('A senha deve ter pelo menos 6 caracteres.');
        document.getElementById('registerPassword').focus();
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, phone, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Cadastro realizado com sucesso!');
            showLoginForm();
            // Limpar campos
            document.getElementById('registerUsername').value = '';
            document.getElementById('registerEmail').value = '';
            document.getElementById('registerPhone').value = '';
            document.getElementById('registerPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            document.getElementById('passwordMatchMessage').textContent = '';
            document.getElementById('passwordMatchMessage').className = 'password-match-message empty';
        } else {
            alert(data.error || 'Erro no cadastro');
        }
    } catch (error) {
        alert('Erro de conexão');
    }
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        currentUser = null;
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        showLoginForm();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexão');
    }
}

async function startShower() {
    try {
        const response = await fetch('/api/shower/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ duration: selectedDuration })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Mostrar notificação de início
            showShowerNotification('start', data.user || 'Usuário', selectedDuration);
            updateStatus();
        } else {
            alert(data.error || 'Erro ao iniciar chuveiro');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexão');
    }
}

async function endShower() {
    try {
        const response = await fetch('/api/shower/end', { method: 'POST' });
        const data = await response.json();
        
        if (response.ok) {
            // Mostrar notificação de finalização
            showShowerNotification('end', data.user || 'Usuário');
            updateStatus();
        } else {
            alert(data.error || 'Erro ao finalizar chuveiro');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexão');
    }
}

async function updateStatus() {
    try {
        const response = await fetch('/api/shower/status');
        const data = await response.json();
        
        if (response.ok) {
            displayStatus(data);
        }
        updateLastUpdateTime();
    } catch (error) {
        console.error('Erro ao atualizar status');
    }
}

function displayStatus(status) {
    const statusDisplay = document.getElementById('statusDisplay');
    const showerControl = document.getElementById('showerControl');
    const activeSession = document.getElementById('activeSession');

    if (status.status === 'free') {
        statusDisplay.innerHTML = `
            <div class="status status-free">
                🟢 LIVRE - Nenhum chuveiro em uso
            </div>
        `;
        showerControl.classList.remove('hidden');
        activeSession.classList.add('hidden');
    } else {
        const isCurrentUser = currentUser && status.user === currentUser.username;
        statusDisplay.innerHTML = `
            <div class="status status-occupied">
                🔴 EM USO
                <br>
                ${isCurrentUser ? '✅ Você está usando o chuveiro' : `👤 ${status.user} está usando`}
                <br>
                ⏱️ ${status.remaining_time} minutos restantes
            </div>
        `;
        
        if (isCurrentUser) {
            showerControl.classList.add('hidden');
            activeSession.classList.remove('hidden');
        } else {
            showerControl.classList.add('hidden');
            activeSession.classList.add('hidden');
        }
    }
}

function updateLastUpdateTime() {
    document.getElementById('lastUpdate').textContent = 'Última atualização: há 1 segundo';
}

// Funções de interface
function showLoginForm() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

function showRegisterForm() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    
    if (currentUser) {
        document.getElementById('welcomeMessage').textContent = `Bem-vindo, ${currentUser.username}!`;
    }
    
    updateStatus();
    setInterval(updateStatus, 5000); // Atualizar a cada 5 segundos
}

// Função para verificar se as senhas coincidem
function checkPasswordMatch() {
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageElement = document.getElementById('passwordMatchMessage');

    if (confirmPassword === '') {
        messageElement.textContent = '';
        messageElement.className = 'password-match-message empty';
    } else if (password === confirmPassword) {
        messageElement.textContent = '✅ As senhas coincidem';
        messageElement.className = 'password-match-message match';
    } else {
        messageElement.textContent = '❌ As senhas não coincidem';
        messageElement.className = 'password-match-message no-match';
    }
}

// Função para alternar visibilidade da senha
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.password-toggle');
    
    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈';
        button.setAttribute('aria-label', 'Ocultar senha');
    } else {
        input.type = 'password';
        button.textContent = '👁️';
        button.setAttribute('aria-label', 'Mostrar senha');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Seletor de duração
    document.querySelectorAll('.duration-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.duration-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selectedDuration = parseInt(this.dataset.duration);
        });
    });

    // Enter key para login
    document.getElementById('loginPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            login();
        }
    });

    // Enter key para registro
    document.getElementById('registerPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            register();
        }
    });

    // Enter key para confirmação de senha
    document.getElementById('confirmPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            register();
        }
    });

    // Verificar senhas em tempo real
    document.getElementById('registerPassword').addEventListener('input', checkPasswordMatch);
    document.getElementById('confirmPassword').addEventListener('input', checkPasswordMatch);

    // Verificar se já está logado
    fetch('/api/me')
        .then(response => response.json())
        .then(data => {
            if (data.user) {
                currentUser = data.user;
                showMainApp();
                requestNotificationPermission();
                initSocket();
            }
        })
        .catch(() => {
            // Usuário não logado, mostrar tela de login
        });
});

