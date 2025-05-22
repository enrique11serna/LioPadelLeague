// src/static/js/profile.js
;(function(window, API){
  const Profile = {
    init() {
      this.bindEvents();
    },

    bindEvents() {
      document.addEventListener('click', e => {
        if (e.target.id==='edit-profile-btn') {
          e.preventDefault();
          this.showEditProfileModal();
        }
        if (e.target.id==='edit-profile-submit') {
          e.preventDefault();
          this.updateProfile();
        }
      });
    },

    async loadUserProfile(userId) {
      try {
        if (!userId) {
          const cur = Auth.getCurrentUser();
          if (!cur) { App.showToast('Usuario no autenticado','error'); return App.showHomePage(); }
          userId = cur.id;
        }
        await this.loadBasicInfo(userId);
        await this.loadUserStats(userId);
      } catch (err) {
        console.error(err);
        App.showToast('Error al cargar perfil','error');
        App.showHomePage();
      }
    },

    async loadBasicInfo(userId) {
      const cur = Auth.getCurrentUser();
      const isMe = cur && cur.id==userId;
      if (isMe) {
        document.getElementById('profile-username').textContent = cur.username;
        document.getElementById('profile-email').textContent    = cur.email;
        document.getElementById('edit-profile-btn').classList.remove('d-none');
      } else {
        // Si quisieras perfil de otros via API.profile o API.users
        document.getElementById('profile-username').textContent = 'Usuario';
        document.getElementById('profile-email').textContent    = '-';
        document.getElementById('edit-profile-btn').classList.add('d-none');
      }
    },

    async loadUserStats(userId) {
      try {
        const res = await API.profile.getStats();
        const st  = res.data;
        document.getElementById('total-matches').textContent           = st.total_matches;
        document.getElementById('matches-won').textContent            = st.individual_wins;
        document.getElementById('win-rate').textContent               = `${Math.round((st.individual_wins/st.total_matches)*100)||0}%`;
        document.getElementById('avg-rating').textContent             = st.average_rating_received || '–';
        this.loadPartners(st.pair_wins);
        this.loadCardUsage(Object.entries(st.cards_used).map(([name,count])=>({ name, count })));
      } catch (err) {
        console.error(err);
        App.showToast('Error al cargar estadísticas','error');
      }
    },

    loadPartners(pairs) {
      const c = document.getElementById('partners-container'),
            lo = document.getElementById('partners-loading'),
            em = document.getElementById('partners-empty');
      if (!c||!lo||!em) return;
      lo.classList.add('d-none');
      if (!pairs.length) {
        em.classList.remove('d-none');
        return;
      }
      let html = '';
      pairs.forEach(p=>{
        const rate = p.wins && p.matches_played
          ? Math.round((p.wins/p.matches_played)*100)
          : 0;
        html += `
          <div class="d-flex align-items-center mb-3">
            <div class="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                 style="width:40px;height:40px">
              ${this.getInitials(p.pair.join(' '))}
            </div>
            <div class="flex-grow-1 ms-3">
              <h5 class="mb-0">${this.escapeHtml(p.pair.join(', '))}</h5>
              <div class="small text-muted">
                ${p.wins} victorias
              </div>
            </div>
            <a href="#" class="btn btn-sm btn-outline-primary">
              <i class="bi bi-person"></i>
            </a>
          </div>`;
      });
      c.innerHTML = html;
    },

    loadCardUsage(cards) {
      const c = document.getElementById('cards-container'),
            lo = document.getElementById('cards-loading'),
            em = document.getElementById('cards-empty');
      if (!c||!lo||!em) return;
      lo.classList.add('d-none');
      if (!cards.length) {
        em.classList.remove('d-none');
        return;
      }
      let html = '';
      cards.forEach(card=>{
        html += `
          <div class="d-flex align-items-center mb-3">
            <div class="avatar bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center" 
                 style="width:40px;height:40px">
              <i class="bi bi-joystick"></i>
            </div>
            <div class="flex-grow-1 ms-3">
              <h5 class="mb-0">${this.escapeHtml(card.name)}</h5>
              <div class="small text-muted">
                Usada ${card.count} ${card.count===1?'vez':'veces'}
              </div>
            </div>
          </div>`;
      });
      c.innerHTML = html;
    },

    showEditProfileModal() {
      const cur = Auth.getCurrentUser();
      if (!cur) return;
      document.getElementById('edit-username').value = cur.username;
      document.getElementById('edit-email').value    = cur.email;
      document.getElementById('edit-password').value = '';
      document.getElementById('edit-confirm-password').value = '';
      new bootstrap.Modal(document.getElementById('editProfileModal')).show();
    },

    async updateProfile() {
      const u = {
        username: document.getElementById('edit-username').value.trim(),
        email:    document.getElementById('edit-email').value.trim()
      };
      const pwd = document.getElementById('edit-password').value;
      const cpw = document.getElementById('edit-confirm-password').value;
      if (pwd) {
        if (pwd!==cpw) {
          App.showToast('Las contraseñas no coinciden','warning');
          return;
        }
        u.password = pwd;
      }
      try {
        const res = await API.auth.updateProfile(u);
        Auth.setCurrentUser(res.data.user);
        new bootstrap.Modal(document.getElementById('editProfileModal')).hide();
        App.showToast('Perfil actualizado','success');
        setTimeout(()=> this.loadUserProfile(),1000);
      } catch (err) {
        console.error(err);
        App.showToast('Error al actualizar perfil','error');
      }
    },

    escapeHtml(txt='') {
      const d = document.createElement('div'); d.textContent = txt;
      return d.innerHTML;
    },

    getInitials(name='') {
      return name.split(' ').map(p=>p[0].toUpperCase()).slice(0,2).join('');
    }
  };

  window.Profile = Profile;
})(window, window.API);
