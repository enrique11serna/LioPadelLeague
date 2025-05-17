// Módulo de autenticación

// Estado global de autenticación
let currentUser = null;

const Auth = {
    // Inicializar módulo de autenticación
    init() {
        this.bindEvents();
        this.checkAuthStatus();
    },
    
    // Vincular eventos de formularios
    bindEvents() {
        // Formulario de login
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login();
            });
        }
        
        // Formulario de registro
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.register();
            });
        }
        
        // Botón de logout
        document.addEventListener('click', (e) => {
            if (e.target.id === 'nav-logout') {
                e.preventDefault();
                this.logout();
            }
        });
    },
    
    // Verificar estado de autenticación al cargar la página
    async checkAuthStatus() {
        const token = API.getToken();
        
        if (!token) {
            this.showLoginPage();
            return;
        }
        
        try {
            const response = await API.auth.validateToken();
            if (response.valid) {
                currentUser = response.user;
                App.showHomePage();
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Error validando token:', error);
            this.logout();
        }
    },
    
    // Mostrar página de login/registro
    showLoginPage() {
        const appContainer = document.getElementById('app');
        const authTemplate = document.getElementById('auth-template');
        
        appContainer.innerHTML = authTemplate.innerHTML;
        
        // Vincular eventos después de cargar el template
        this.bindEvents();
    },
    
    // Proceso de login
    async login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            this.showAuthMessage('Por favor, completa todos los campos', 'error');
            return;
        }
        
        try {
            const response = await API.auth.login({ email, password });
            
            if (response.token) {
                API.setToken(response.token);
                currentUser = response.user;
                this.showAuthMessage('Inicio de sesión exitoso', 'success');
                
                // Redirigir a la página principal
                setTimeout(() => {
                    App.showHomePage();
                }, 1000);
            }
        } catch (error) {
            console.error('Error de login:', error);
            this.showAuthMessage('Credenciales inválidas', 'error');
        }
    },
    
    // Proceso de registro
    async register() {
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        
        if (!username || !email || !password || !confirmPassword) {
            this.showAuthMessage('Por favor, completa todos los campos', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showAuthMessage('Las contraseñas no coinciden', 'error');
            return;
        }
        
        try {
            const response = await API.auth.register({ username, email, password });
            
            if (response.message) {
                this.showAuthMessage('Registro exitoso. Ahora puedes iniciar sesión', 'success');
                
                // Cambiar a la pestaña de login
                const loginTab = document.getElementById('login-tab');
                if (loginTab) {
                    const tabInstance = new bootstrap.Tab(loginTab);
                    tabInstance.show();
                }
                
                // Limpiar formulario
                document.getElementById('register-form').reset();
            }
        } catch (error) {
            console.error('Error de registro:', error);
            this.showAuthMessage('Error al registrar usuario. El email o nombre de usuario ya existe', 'error');
        }
    },
    
    // Cerrar sesión
    logout() {
        API.removeToken();
        currentUser = null;
        this.showLoginPage();
    },
    
    // Mostrar mensaje en la página de autenticación
    showAuthMessage(message, type = 'info') {
        const messageElement = document.getElementById('auth-message');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = `small ${type}`;
            
            // Limpiar mensaje después de 5 segundos
            setTimeout(() => {
                messageElement.textContent = '';
                messageElement.className = 'small';
            }, 5000);
        }
    },
    
    // Obtener usuario actual
    getCurrentUser() {
        return currentUser;
    },
    
    // Actualizar datos del usuario actual
    setCurrentUser(user) {
        currentUser = user;
    }
};
