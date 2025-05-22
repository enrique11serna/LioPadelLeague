// src/static/js/leagues.js
;(function(window, API){
  const Leagues = {
    init() {
      this.bindEvents();
    },

    bindEvents() {
      document.addEventListener('click', (e) => {
        switch(e.target.id) {
          case 'create-league-btn':
          case 'create-league-empty-btn':
            e.preventDefault();
            this.showCreateLeagueModal();
            break;
          case 'join-league-btn':
            e.preventDefault();
            this.showJoinLeagueModal();
            break;
          case 'create-league-submit':
            e.preventDefault();
            this.createLeague();
            break;
          case 'join-league-submit':
            e.preventDefault();
            this.joinLeague();
            break;
          case 'share-league-btn':
            e.preventDefault();
            this.showShareLeagueModal();
            break;
          case 'copy-invite-code':
            e.preventDefault();
            this.copyToClipboard('invite-code-display');
            break;
          case 'copy-invite-link':
            e.preventDefault();
            this.copyToClipboard('invite-link-display');
            break;
          case 'share-whatsapp':
            e.preventDefault();
            this.shareByWhatsApp();
            break;
        }
        // click en tarjeta de liga
        const leagueCard = e.target.closest('.league-card');
        if (leagueCard && !e.target.matches('button')) {
          e.preventDefault();
          const id = leagueCard.dataset.id;
          if (id) App.showLeagueDetailPage(id);
        }
      });
    },

    async loadUserLeagues() {
      const container      = document.getElementById('leagues-container');
      const loadingEl      = document.getElementById('leagues-loading');
      const emptyEl        = document.getElementById('leagues-empty');
      if (!container || !loadingEl || !emptyEl) return;

      loadingEl.classList.remove('d-none');
      emptyEl.classList.add('d-none');
      try {
        const res = await API.leagues.getAll();
        const leagues = (res.data && res.data.leagues) || [];
        loadingEl.classList.add('d-none');
        if (!leagues.length) {
          emptyEl.classList.remove('d-none');
          return;
        }
        let html = '';
        leagues.forEach(l => {
          html += `
            <div class="col-md-6 col-lg-4 mb-4">
              <div class="card league-card shadow-sm h-100" data-id="${l.id}">
                <div class="card-body d-flex flex-column">
                  <h2 class="card-title h5">${this.escapeHtml(l.name)}</h2>
                  <p class="text-muted small mt-auto">
                    <i class="bi bi-calendar-event"></i>
                    Creada el ${this.formatDate(l.created_at)}
                  </p>
                  <button class="btn btn-sm btn-primary mt-2" 
                          onclick="App.showLeagueDetailPage(${l.id})">
                    <i class="bi bi-arrow-right-circle"></i> Ver Liga
                  </button>
                </div>
              </div>
            </div>`;
        });
        container.innerHTML = html + loadingEl.outerHTML + emptyEl.outerHTML;
      } catch (err) {
        console.error('Error cargando ligas:', err);
        loadingEl.classList.add('d-none');
        App.showToast('Error al cargar las ligas', 'error');
      }
    },

    showCreateLeagueModal() {
      new bootstrap.Modal(document.getElementById('createLeagueModal')).show();
    },
    showJoinLeagueModal() {
      new bootstrap.Modal(document.getElementById('joinLeagueModal')).show();
    },

    async createLeague() {
      const name = document.getElementById('league-name').value.trim();
      if (!name) {
        App.showToast('Por favor, ingresa un nombre para la liga', 'warning');
        return;
      }
      const btn = document.getElementById('create-league-submit');
      const txt = btn.innerHTML;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Creando...`;
      btn.disabled = true;
      try {
        await API.leagues.create({ name });
        new bootstrap.Modal(document.getElementById('createLeagueModal')).hide();
        btn.innerHTML = txt;
        btn.disabled = false;
        App.showToast('Liga creada correctamente', 'success');
        setTimeout(() => App.showHomePage(), 1000);
      } catch (err) {
        console.error('Error creando liga:', err);
        btn.innerHTML = txt; btn.disabled = false;
        App.showToast(err.message || 'Error al crear la liga', 'error');
      }
    },

    async joinLeague() {
      const code = document.getElementById('invite-code').value.trim();
      if (!code) {
        App.showToast('Por favor, ingresa un código de invitación', 'warning');
        return;
      }
      const btn = document.getElementById('join-league-submit');
      const txt = btn.innerHTML;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Uniéndose...`;
      btn.disabled = true;
      try {
        await API.leagues.join(code);
        new bootstrap.Modal(document.getElementById('joinLeagueModal')).hide();
        btn.innerHTML = txt; btn.disabled = false;
        App.showToast('Te has unido a la liga correctamente', 'success');
        setTimeout(() => App.showHomePage(), 1000);
      } catch (err) {
        console.error('Error uniéndose a liga:', err);
        btn.innerHTML = txt; btn.disabled = false;
        App.showToast(err.message || 'Código de invitación inválido', 'error');
      }
    },

    async loadLeagueDetails(id) {
      try {
        const res = await API.leagues.getOne(id);
        const l   = res.data.league;
        if (!l) throw new Error('Liga no encontrada');
        document.getElementById('league-name-breadcrumb').textContent = l.name;
        document.getElementById('league-name-title').textContent      = l.name;
        document.body.dataset.leagueId       = l.id;
        document.body.dataset.leagueName     = l.name;
        document.body.dataset.leagueInviteCode = l.invite_code;
        Matches.loadLeagueMatches(l.id);
        this.loadLeagueMembers(l.members || []);
      } catch (err) {
        console.error('Error detalles liga:', err);
        App.showToast(err.message || 'Error al cargar detalles de la liga', 'error');
        App.showHomePage();
      }
    },

    loadLeagueMembers(members) {
      const c = document.getElementById('members-container'),
            lo = document.getElementById('members-loading');
      if (!c || !lo) return;
      lo.classList.add('d-none');
      if (!members.length) {
        c.innerHTML = `<div class="col-12 text-center py-3">
                         <div class="alert alert-info">
                           <p>No hay miembros en esta liga.</p>
                         </div>
                       </div>`;
        return;
      }
      let html = '';
      members.forEach(m => {
        html += `
          <div class="col-md-6 mb-3">
            <div class="card shadow-sm">
              <div class="card-body d-flex align-items-center">
                <div class="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                     style="width:48px;height:48px">
                  ${this.getInitials(m.username)}
                </div>
                <div class="ms-3 flex-grow-1">
                  <h5 class="mb-1">${this.escapeHtml(m.username)}</h5>
                  <p class="text-muted small mb-0">
                    <i class="bi bi-calendar-check"></i>
                    Miembro desde ${this.formatDate(m.joined_at)}
                  </p>
                </div>
                <a href="#" class="btn btn-sm btn-outline-primary" 
                   onclick="App.showUserProfilePage(${m.user_id})">
                  <i class="bi bi-person"></i>
                </a>
              </div>
            </div>
          </div>`;
      });
      c.innerHTML = html;
    },

    showShareLeagueModal() {
      const code = document.body.dataset.leagueInviteCode;
      const name = document.body.dataset.leagueName;
      const base = `${location.protocol}//${location.host}`;
      document.getElementById('invite-code-display').value = code;
      document.getElementById('invite-link-display').value = `${base}/join/${code}`;
      new bootstrap.Modal(document.getElementById('shareLeagueModal')).show();
    },

    copyToClipboard(id) {
      const el = document.getElementById(id);
      el.select(); el.setSelectionRange(0,99999);
      navigator.clipboard.writeText(el.value)
        .then(()=> App.showToast('Copiado al portapapeles','success'))
        .catch(()=> App.showToast('Error al copiar','error'));
    },

    shareByWhatsApp() {
      const name = document.body.dataset.leagueName;
      const code = document.body.dataset.leagueInviteCode;
      const base = `${location.protocol}//${location.host}`;
      const msg  = encodeURIComponent(`¡Únete a mi liga "${name}"! ${base}/join/${code}`);
      window.open(`https://wa.me/?text=${msg}`, '_blank');
    },

    formatDate(iso) {
      if(!iso) return 'N/A';
      return new Date(iso).toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'});
    },

    escapeHtml(txt='') {
      const d = document.createElement('div'); d.textContent = txt;
      return d.innerHTML;
    },

    getInitials(name='') {
      return name.split(' ').map(p=>p[0].toUpperCase()).slice(0,2).join('');
    }
  };

  window.Leagues = Leagues;
})(window, window.API);
