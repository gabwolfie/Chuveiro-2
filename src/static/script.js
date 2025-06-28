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
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Permissão de notificação concedida');
                    registerForPushNotifications();
                }
            });
        } else if (Notification.permission === 'granted') {
            registerForPushNotifications();
        }
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
        }).catch(err => console.log('Erro ao se inscrever para push notifications:', err));
    }
}

// Função de login
async function login() {
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    if (!username || !password) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('mainApp').classList.remove('hidden');
            document.getElementById('welcomeMessage').textContent = `Bem-vindo, ${data.user.username}!`;
            
            // Inicializar SocketIO
            initializeSocket();
            
            // Solicitar permissão para notificações
            requestNotificationPermission();
            
            // Atualizar status inicial
            updateStatus();
            
            alert(data.message || "Login realizado com sucesso!");
        } else {
            alert(data.error || "Erro no login.");
        }
    } catch (err) {
        console.error(err);
        alert("Erro de conexão. Tente novamente.");
    }
}

// Função de cadastro
async function register() {
    const username = document.getElementById("registerUsername").value;
    const email = document.getElementById("registerEmail").value;
    const phone = document.getElementById("registerPhone").value;
    const password = document.getElementById("registerPassword").value;

    if (!username || !email || !password) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, phone, password }),
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message || "Cadastro realizado com sucesso!");
            showLoginForm();
        } else {
            alert(data.error || "Erro no cadastro.");
        }
    } catch (err) {
        console.error(err);
        alert("Erro de conexão. Tente novamente.");
    }
}

// Função para mostrar formulário de cadastro
function showRegisterForm() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
}

// Função para mostrar formulário de login
function showLoginForm() {
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
}

// Função de logout
async function logout() {
    try {
        await fetch("/api/logout", {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        currentUser = null;
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
        
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        
        alert("Logout realizado com sucesso!");
    } catch (err) {
        console.error(err);
        alert("Erro no logout.");
    }
}

// Inicializar SocketIO
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Conectado ao servidor');
        socket.emit('join_notifications');
    });
    
    socket.on('notification', (data) => {
        showNotification(data.message, data.type);
        notificationCount++;
        updateNotificationBadge();
    });
    
    socket.on('shower_started', (data) => {
        updateStatus();
    });
    
    socket.on('shower_ended', (data) => {
        updateStatus();
    });
}

// Atualizar status do chuveiro
async function updateStatus() {
    try {
        const response = await fetch("/api/shower/status");
        const data = await response.json();
        
        const statusDisplay = document.getElementById('statusDisplay');
        const showerControl = document.getElementById('showerControl');
        const activeSession = document.getElementById('activeSession');
        
        if (data.status === 'occupied') {
            statusDisplay.innerHTML = `
                <div class="status status-occupied">
                    🚿 Chuveiro ocupado por ${data.user}
                    <br>Tempo restante: ~${data.remaining_time} min
                </div>
            `;
            showerControl.classList.add('hidden');
            
            // Mostrar botão de finalizar apenas se for o usuário atual
            if (currentUser && data.user === currentUser.username) {
                activeSession.classList.remove('hidden');
            } else {
                activeSession.classList.add('hidden');
            }
        } else {
            statusDisplay.innerHTML = `
                <div class="status status-free">
                    ✅ Chuveiro disponível
                </div>
            `;
            showerControl.classList.remove('hidden');
            activeSession.classList.add('hidden');
        }
        
        // Atualizar timestamp
        document.getElementById('lastUpdate').textContent = `Última atualização: agora`;
        
    } catch (err) {
        console.error('Erro ao atualizar status:', err);
    }
}

// Iniciar uso do chuveiro
async function startShower() {
    try {
        const response = await fetch("/api/shower/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ duration: selectedDuration }),
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message || "Uso do chuveiro iniciado!");
            updateStatus();
        } else {
            alert(data.error || "Erro ao iniciar uso do chuveiro.");
        }
    } catch (err) {
        console.error(err);
        alert("Erro de conexão. Tente novamente.");
    }
}

// Finalizar uso do chuveiro
async function endShower() {
    try {
        const response = await fetch("/api/shower/end", {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message || "Uso do chuveiro finalizado!");
            updateStatus();
        } else {
            alert(data.error || "Erro ao finalizar uso do chuveiro.");
        }
    } catch (err) {
        console.error(err);
        alert("Erro de conexão. Tente novamente.");
    }
}

// Mostrar notificação
function showNotification(message, type) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Chuveiro App', {
            body: message,
            icon: '/icon-192.png'
        });
    }
    
    // Adicionar à lista de notificações
    const notificationsList = document.getElementById('notificationsList');
    const notificationItem = document.createElement('div');
    notificationItem.className = 'notification-item';
    notificationItem.textContent = message;
    
    notificationsList.insertBefore(notificationItem, notificationsList.firstChild);
    notificationsList.classList.remove('hidden');
}

// Atualizar badge de notificações
function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (notificationCount > 0) {
        badge.textContent = notificationCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// Event listeners para seleção de duração
document.addEventListener('DOMContentLoaded', () => {
    const durationOptions = document.querySelectorAll('.duration-option');
    
    durationOptions.forEach(option => {
        option.addEventListener('click', () => {
            durationOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedDuration = parseInt(option.dataset.duration);
        });
    });
    
    // Verificar se já está logado
    checkCurrentUser();
});

// Verificar usuário atual
async function checkCurrentUser() {
    try {
        const response = await fetch("/api/me");
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('mainApp').classList.remove('hidden');
            document.getElementById('welcomeMessage').textContent = `Bem-vindo, ${data.user.username}!`;
            
            initializeSocket();
            requestNotificationPermission();
            updateStatus();
        }
    } catch (err) {
        console.log('Usuário não logado');
    }
}
