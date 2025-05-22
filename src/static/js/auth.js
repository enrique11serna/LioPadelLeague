// src/static/js/auth.js
(function (window, API) {
  let currentUser = null;

  const Auth = {
    init() {
      this.bindEvents();
      this.checkAuthStatus();
    },
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
    async checkAuthStatus() {
      const token = API.getToken();
      if (!token) return this.showLoginPage();
      try {
        const res = await API.auth.validateToken();
        // Ahora usamos res.success y res.data
        if (res.success) {
          currentUser = res.data.user;
          App.showHomePage();
        } else {
          this.logout();
        }
      } catch {
        this.logout();
      }
    },
    showLoginPage() {
      const app = document.getElementById('app');
      app.innerHTML = document.getElementById('auth-template').innerHTML;
      this.bindEvents();
    },
    async login() {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      try {
        const res = await API.auth.login({ email, password });
        API.setToken(res.data.token);
        currentUser = res.data.user;
        this.showAuthMessage('Sesión iniciada', 'success');
        setTimeout(() => App.showHomePage(), 800);
      } catch (err) {
        this.showAuthMessage(err.message || 'Error de credenciales', 'error');
      }
    },
    async register() {
      const u = {
        username: document.getElementById('register-username').value,
        email:    document.getElementById('register-email').value,
        password: document.getElementById('register-password').value
      };
      try {
        await API.auth.register(u);
        this.showAuthMessage('Registro completo, ahora inicia sesión', 'success');
        // Cambiamos a la pestaña de login
        new bootstrap.Tab(document.querySelector('#login-tab')).show();
      } catch (err) {
        this.showAuthMessage(err.message || 'Error registrando', 'error');
      }
    },
    logout() {
      API.removeToken();
      currentUser = null;
      this.showLoginPage();
    },
    showAuthMessage(msg, type) {
      const el = document.getElementById('auth-message');
      if (!el) return;
      el.textContent = msg;
      el.className = `small ${type}`;
      setTimeout(() => { el.textContent = ''; el.className = 'small'; }, 4000);
    }
  };

  // Exponemos Auth globalmente
  window.Auth = Auth;
})(window, window.API);
