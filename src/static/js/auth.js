// Módulo de autenticación
const Auth = {
    currentUser: null,

    init() {
        this.bindEvents();
        this.checkAuthStatus();
    },

    bindEvents() {
        // Login
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', e => {
                e.preventDefault();
                this.login();
            });
        }
        // Register
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', e => {
                e.preventDefault();
                this.register();
            });
        }
        // Logout
        document.addEventListener('click', e => {
            if (e.target.id === 'nav-logout') {
                e.preventDefault();
                this.logout();
            }
        });
    },

    // Verifica token y coge perfil
    async checkAuthStatus() {
        const token = API.getToken();
        if (!token) {
            return this.showLoginPage();
        }
        try {
            await API.auth.validateToken();
            // si no arroja, el token es válido → cargamos perfil
            const profile = await API.auth.getProfile();
            this.currentUser = profile;
            App.showHomePage();
        } catch (err) {
            console.warn('Token inválido o expirado:', err);
            this.logout();
        }
    },

    // Muestra la vista de login/registro
    showLoginPage() {
        const container = document.getElementById('app');
        container.innerHTML = document.getElementById('auth-template').innerHTML;
        this.bindEvents();
    },

    // Login real
    async login() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        if (!email || !password) {
            return this.showAuthMessage('Completa todos los campos', 'warning');
        }
        try {
            const { token } = await API.auth.login({ email, password });
            API.setToken(token);
            this.showAuthMessage('Inicio exitoso', 'success');
            // recarga estado para cargar ligas, perfil, etc.
            setTimeout(() => this.checkAuthStatus(), 500);
        } catch (err) {
            console.error('Error de login:', err);
            this.showAuthMessage(err.message || 'Credenciales inválidas', 'danger');
        }
    },

    // Registro
    async register() {
        const u = document.getElementById('register-username').value.trim();
        const e = document.getElementById('register-email').value.trim();
        const p = document.getElementById('register-password').value;
        const c = document.getElementById('register-confirm-password').value;
        if (!u || !e || !p || !c) {
            return this.showAuthMessage('Completa todos los campos', 'warning');
        }
        if (p !== c) {
            return this.showAuthMessage('Las contraseñas no coinciden', 'warning');
        }
        try {
            await API.auth.register({ username: u, email: e, password: p });
            this.showAuthMessage('Registro exitoso. Inicia sesión.', 'success');
            document.getElementById('login-tab').click();
        } catch (err) {
            console.error('Error de registro:', err);
            this.showAuthMessage(err.message || 'Error al registrar', 'danger');
        }
    },

    // Logout completo
    logout() {
        API.removeToken();
        this.currentUser = null;
        this.showLoginPage();
    },

    // Mensajes en auth
    showAuthMessage(msg, type = 'info') {
        const el = document.getElementById('auth-message');
        if (!el) return;
        el.textContent = msg;
        el.className = `small text-${type}`;
        setTimeout(() => {
            el.textContent = '';
            el.className = 'small';
        }, 5000);
    }
};
