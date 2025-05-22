// src/static/js/auth.js
;(function(window, API) {
  // Variable interna para mantener al usuario logeado
  let currentUser = null;

  const Auth = {
    /** Inicializa eventos y comprueba si ya hay token */
    init() {
      this.bindEvents();
      this.checkAuthStatus();
    },

    /** Asocia listeners a formulario de login, registro y logout */
    bindEvents() {
      document.getElementById('login-form')?.addEventListener('submit', e => {
        e.preventDefault();
        this.login();
      });
      document.getElementById('register-form')?.addEventListener('submit', e => {
        e.preventDefault();
        this.register();
      });
      document.addEventListener('click', e => {
        if (e.target.id === 'nav-logout') {
          e.preventDefault();
          this.logout();
        }
      });
    },

    /** Si hay token, valida en backend; si es válido, guarda user y arranca la app */
    async checkAuthStatus() {
      const token = API.getToken();
      if (!token) return this.showLoginPage();

      try {
        const res = await API.auth.validateToken();
        if (res.success) {
          currentUser = res.data.user;
          Auth.setCurrentUser(res.data.user);
          App.showHomePage();
        } else {
          this.logout();
        }
      } catch {
        this.logout();
      }
    },

    /** Renderiza la plantilla de login/registro */
    showLoginPage() {
      const app = document.getElementById('app');
      app.innerHTML = document.getElementById('auth-template').innerHTML;
      this.bindEvents();
    },

    /** Llama a la API para hacer login, guarda token y usuario */
    async login() {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      try {
        const res = await API.auth.login({ email, password });
        API.setToken(res.data.token);
        currentUser = res.data.user;
        Auth.setCurrentUser(res.data.user);
        this.showAuthMessage('Sesión iniciada', 'success');
        setTimeout(() => App.showHomePage(), 800);
      } catch (err) {
        this.showAuthMessage(err.message || 'Error de credenciales', 'error');
      }
    },

    /** Llama a la API para registrar, muestra mensaje y cambia a pestaña de login */
    async register() {
      const u = {
        username: document.getElementById('register-username').value,
        email:    document.getElementById('register-email').value,
        password: document.getElementById('register-password').value
      };

      try {
        await API.auth.register(u);
        this.showAuthMessage('Registro completo, ahora inicia sesión', 'success');
        new bootstrap.Tab(document.querySelector('#login-tab')).show();
      } catch (err) {
        this.showAuthMessage(err.message || 'Error registrando', 'error');
      }
    },

    /** Elimina el token y vuelve al login */
    logout() {
      API.removeToken();
      currentUser = null;
      Auth.setCurrentUser(null);
      this.showLoginPage();
    },

    /** Muestra un mensaje breve de éxito/error en la UI */
    showAuthMessage(msg, type) {
      const el = document.getElementById('auth-message');
      if (!el) return;
      el.textContent = msg;
      el.className = `small ${type}`;
      setTimeout(() => {
        el.textContent = '';
        el.className = 'small';
      }, 4000);
    }
  };

  /** Permite a otros módulos establecer manualmente el usuario */
  Auth.setCurrentUser = function(user) {
    currentUser = user;
  };

  /** Devuelve el usuario actual (null si no hay) */
  Auth.getCurrentUser = function() {
    return currentUser;
  };

  // Exponer globalmente
  window.Auth = Auth;
})(window, window.API);
