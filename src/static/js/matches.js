// src/static/js/matches.js
;(function(window, API){
  const Matches = {
    init() {
      this.bindEvents();
    },

    bindEvents() {
      document.addEventListener('click', (e) => {
        const t = e.target;
        if (t.id === 'create-match-btn' || t.id === 'create-match-empty-btn') {
          e.preventDefault();
          this.showCreateMatchModal();
        }
        if (t.id === 'create-match-submit') {
          e.preventDefault();
          this.createMatch();
        }
        if (t.classList.contains('join-match-btn')) {
          e.preventDefault();
          this.joinMatch(t.dataset.matchId, t.dataset.team);
        }
        if (t.classList.contains('leave-match-btn')) {
          e.preventDefault();
          this.leaveMatch(t.dataset.matchId);
        }
        if (t.id === 'use-card-btn') {
          e.preventDefault();
          this.useCard(document.body.dataset.matchId);
        }
      });

      document.addEventListener('submit', (e) => {
        if (e.target.id === 'result-form') {
          e.preventDefault();
          this.submitResult(document.body.dataset.matchId);
        }
        if (e.target.id === 'ratings-form') {
          e.preventDefault();
          this.submitRatings(document.body.dataset.matchId);
        }
        if (e.target.id === 'upload-photo-form') {
          e.preventDefault();
          this.uploadPhoto(document.body.dataset.matchId);
        }
      });

      document.addEventListener('click', (e) => {
        const card = e.target.closest('.match-card');
        if (card && !e.target.matches('button')) {
          e.preventDefault();
          App.showMatchDetailPage(card.dataset.id);
        }
      });
    },

    async loadLeagueMatches(leagueId) {
      const container = document.getElementById('matches-container');
      const loadingEl = document.getElementById('matches-loading');
      const emptyEl   = document.getElementById('matches-empty');
      if (!container || !loadingEl || !emptyEl) return;

      loadingEl.classList.remove('d-none');
      emptyEl.classList.add('d-none');
      try {
        const res     = await API.matches.getByLeague(leagueId);
        const matches = (res.data && res.data.matches) || [];
        loadingEl.classList.add('d-none');
        if (!matches.length) {
          emptyEl.classList.remove('d-none');
          return;
        }

        const open       = matches.filter(m => m.status === 'open');
        const inProgress = matches.filter(m => m.status === 'in_progress');
        const completed  = matches.filter(m => m.status === 'completed');

        let html = '';
        if (inProgress.length) {
          html += `<div class="col-12 mb-4">
                     <h3 class="h5 mb-3">En Curso</h3>
                     <div class="row">${this.generateMatchesHTML(inProgress)}</div>
                   </div>`;
        }
        if (open.length) {
          html += `<div class="col-12 mb-4">
                     <h3 class="h5 mb-3">Próximos</h3>
                     <div class="row">${this.generateMatchesHTML(open)}</div>
                   </div>`;
        }
        if (completed.length) {
          html += `<div class="col-12 mb-4">
                     <h3 class="h5 mb-3">Completados</h3>
                     <div class="row">${this.generateMatchesHTML(completed)}</div>
                   </div>`;
        }

        container.innerHTML = html + loadingEl.outerHTML + emptyEl.outerHTML;
      } catch (err) {
        console.error('Error cargando partidos:', err);
        loadingEl.classList.add('d-none');
        App.showToast('Error al cargar los partidos', 'error');
      }
    },

    generateMatchesHTML(matches) {
      return matches.map(m => {
        const dt    = new Date(m.date);
        const date  = dt.toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' });
        const time  = dt.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' });
        const t1    = (m.participants || []).filter(p => p.team === 1).length;
        const t2    = (m.participants || []).filter(p => p.team === 2).length;
        const cls   = m.status === 'open' ? 'open' : m.status === 'in_progress' ? 'in-progress' : 'completed';
        const text  = m.status === 'open' ? 'Abierto' : m.status === 'in_progress' ? 'En Curso' : 'Completado';

        return `
          <div class="col-md-6 col-lg-4 mb-3">
            <div class="card match-card shadow-sm" data-id="${m.id}">
              <div class="card-body">
                <div class="mb-2"><i class="bi bi-calendar-event"></i> ${date} - ${time}</div>
                <div class="${cls} mb-2">${text}</div>
                <div class="team-container">
                  <div class="team-label text-success">Equipo 1</div>
                  <div class="team-count">${t1}/2</div>
                </div>
                <div class="team-container">
                  <div class="team-label text-danger">Equipo 2</div>
                  <div class="team-count">${t2}/2</div>
                </div>
                ${m.status === 'completed' ? `<div class="mt-2"><strong>Ganador:</strong> Equipo ${m.winner_team}</div>` : ''}
                <button class="btn btn-sm btn-primary w-100 mt-3"
                        onclick="App.showMatchDetailPage(${m.id})">
                  <i class="bi bi-arrow-right-circle"></i> Ver Detalles
                </button>
              </div>
            </div>
          </div>`;
      }).join('');
    },

    showCreateMatchModal() {
      new bootstrap.Modal(document.getElementById('createMatchModal')).show();
    },

    async createMatch() {
      const date     = document.getElementById('match-date').value;
      const leagueId = document.body.dataset.leagueId;
      if (!date) {
        App.showToast('Por favor, selecciona fecha y hora', 'warning');
        return;
      }
      try {
        await API.matches.create(leagueId, { date });
        bootstrap.Modal.getInstance(document.getElementById('createMatchModal')).hide();
        App.showToast('Partido creado correctamente', 'success');
        setTimeout(() => Matches.loadLeagueMatches(leagueId), 1000);
      } catch (err) {
        console.error('Error creando partido:', err);
        App.showToast('Error al crear el partido', 'error');
      }
    },

    async loadMatchDetails(matchId) {
      try {
        const res = await API.matches.getOne(matchId);
        const m   = res.data.match;
        if (!m) throw new Error('Partido no encontrado');

        document.body.dataset.matchId  = m.id;
        document.body.dataset.leagueId = m.league_id;
        const back = document.getElementById('back-to-league');
        if (back) back.onclick = e => {
          e.preventDefault();
          App.showLeagueDetailPage(m.league_id);
        };

        this.updateMatchInfo(m);
        this.loadTeams(m.participants || []);
        this.showCardIfAvailable(m);
        this.showResultSection(m);
        this.showRatingsSection(m);
        this.showPhotosSection(m);
        if (m.status === 'completed') this.loadMatchPhotos(m.id);
      } catch (err) {
        console.error('Error cargando detalles del partido:', err);
        App.showToast('Error al cargar los detalles del partido', 'error');
        App.showHomePage();
      }
    },

    updateMatchInfo(m) {
      const dateEl = document.getElementById('match-date');
      const statusEl = document.getElementById('match-status');
      if (dateEl) {
        const dt = new Date(m.date);
        dateEl.textContent = dt.toLocaleString('es-ES', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
      }
      if (statusEl) {
        statusEl.textContent = m.status === 'open' ? 'Abierto' :
          m.status === 'in_progress' ? 'En Curso' : 'Completado';
        statusEl.className = '';
        statusEl.classList.add(
          m.status === 'open' ? 'text-primary' :
          m.status === 'in_progress' ? 'text-warning' : 'text-success'
        );
      }

      // Acciones según estado
      const actions = document.getElementById('match-actions');
      if (actions) {
        let html = '';
        if (m.status === 'open') {
          html = m.is_participating
            ? `<button class="btn btn-outline-danger leave-match-btn" data-match-id="${m.id}">
                 <i class="bi bi-person-dash"></i> Abandonar Partido
               </button>`
            : `<button class="btn btn-success join-match-btn" data-match-id="${m.id}" data-team="1">
                 <i class="bi bi-person-plus"></i> Unirme Equipo 1
               </button>
               <button class="btn btn-danger ms-2 join-match-btn" data-match-id="${m.id}" data-team="2">
                 <i class="bi bi-person-plus"></i> Unirme Equipo 2
               </button>`;
        }
        actions.innerHTML = html;
      }
    },

    loadTeams(participants) {
      const t1 = document.getElementById('team1-container');
      const t2 = document.getElementById('team2-container');
      if (!t1 || !t2) return;
      const team1 = participants.filter(p => p.team === 1);
      const team2 = participants.filter(p => p.team === 2);

      const render = (team, el) => {
        if (!team.length) {
          el.innerHTML = `<div class="text-center py-3"><p class="text-muted">No hay jugadores</p></div>`;
        } else {
          el.innerHTML = team.map(p => `
            <div class="d-flex align-items-center mb-3">
              <div class="avatar bg-${p.team===1?'success':'danger'} text-white rounded-circle d-flex align-items-center justify-content-center" style="width:40px;height:40px">
                ${this.getInitials(p.username)}
              </div>
              <div class="ms-3"><h5 class="mb-0">${this.escapeHtml(p.username)}</h5></div>
            </div>`).join('');
        }
      };

      render(team1, t1);
      render(team2, t2);
    },

    showCardIfAvailable(m) {
      const section = document.getElementById('card-section');
      if (!section) return;
      if (m.can_view_card && m.card) {
        section.classList.remove('d-none');
        document.getElementById('card-name').textContent = m.card.name;
        document.getElementById('card-description').textContent = m.card.description;
        const btn = document.getElementById('use-card-btn');
        if (m.card.used) {
          btn.disabled = true;
          btn.textContent = 'Carta Usada';
        } else {
          btn.disabled = false;
          btn.textContent = 'Usar Carta';
        }
      } else {
        section.classList.add('d-none');
      }
    },

    showResultSection(m) {
      const sec = document.getElementById('result-section');
      const disp = document.getElementById('result-display');
      const formC = document.getElementById('submit-result-form');
      if (!sec || !disp || !formC) return;

      if (m.status === 'completed') {
        sec.classList.remove('d-none');
        disp.innerHTML = `
          <div class="alert alert-success">
            <h4>Resultado Final</h4>
            <p>El Equipo ${m.winner_team} ha ganado.</p>
          </div>`;
        formC.classList.add('d-none');
      } else if (m.status === 'in_progress' && m.is_participating) {
        sec.classList.remove('d-none');
        formC.classList.remove('d-none');
        disp.innerHTML = '';
      } else {
        sec.classList.add('d-none');
      }
    },

    showRatingsSection(m) {
      const sec = document.getElementById('ratings-section');
      const cont = document.getElementById('ratings-container');
      if (!sec || !cont) return;
      if (m.status === 'completed' && m.is_participating) {
        sec.classList.remove('d-none');
        const cur = Auth.getCurrentUser();
        cont.innerHTML = (m.participants || [])
          .filter(p => p.user_id !== cur.id)
          .map(p => `
            <div class="rating-container mb-3">
              <h5>${this.escapeHtml(p.username)}</h5>
              <div class="mb-3">
                <label>Valoración (1-10)</label>
                <select class="form-select" name="rating-${p.user_id}" required>
                  <option value="">Selecciona...</option>
                  ${[...Array(10)].map((_,i)=>
                    `<option value="${i+1}">${i+1}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="mb-3">
                <label>Comentario</label>
                <textarea class="form-control" name="comment-${p.user_id}" rows="2"></textarea>
              </div>
            </div>`).join('');
      } else {
        sec.classList.add('d-none');
      }
    },

    showPhotosSection(m) {
      const sec = document.getElementById('photos-section');
      const up  = document.getElementById('upload-photo-container');
      if (!sec || !up) return;
      if (m.status === 'completed') {
        sec.classList.remove('d-none');
        up.classList.toggle('d-none', !m.is_participating);
      } else {
        sec.classList.add('d-none');
      }
    },

    async loadMatchPhotos(matchId) {
      const cont = document.getElementById('photos-container');
      if (!cont) return;
      cont.innerHTML = `
        <div class="col-12 text-center py-3">
          <div class="spinner-border text-primary"></div>
          <p class="mt-3">Cargando fotos...</p>
        </div>`;
      try {
        const res = await API.results.uploadPhoto
          ? await API.results.uploadPhoto(matchId, new FormData()) // fallback
          : { data:{ photos: [] }}; 
        // If you have an endpoint API.matches.getPhotos, replace the above.
        const photos = (res.data && res.data.photos) || [];
        if (!photos.length) {
          cont.innerHTML = `<div class="col-12 text-center py-3"><p class="text-muted">Sin fotos.</p></div>`;
          return;
        }
        cont.innerHTML = photos.map(p => {
          const url = '/' + p.file_path;
          const d   = new Date(p.uploaded_at).toLocaleDateString('es-ES');
          const u   = p.user?.username || 'Usuario';
          return `
            <div class="col-md-4 col-sm-6 mb-3">
              <div class="card shadow-sm">
                <img src="${url}" class="photo-thumbnail" alt="Foto">
                <div class="card-body p-2">
                  <p class="small text-muted mb-0">
                    <i class="bi bi-person"></i> ${this.escapeHtml(u)}
                    <br>
                    <i class="bi bi-calendar"></i> ${d}
                  </p>
                </div>
              </div>
            </div>`;
        }).join('');
      } catch (err) {
        console.error('Error cargando fotos:', err);
        cont.innerHTML = `<div class="col-12 text-center py-3"><div class="alert alert-danger">Error al cargar fotos.</div></div>`;
      }
    },

    async joinMatch(matchId, team) {
      try {
        await API.matches.join(matchId, parseInt(team));
        App.showToast('Te has unido', 'success');
        setTimeout(()=> Matches.loadMatchDetails(matchId), 1000);
      } catch (err) {
        console.error('Error al unirse:', err);
        App.showToast('Error al unirse al partido', 'error');
      }
    },

    async leaveMatch(matchId) {
      try {
        await API.matches.leave(matchId);
        App.showToast('Has abandonado', 'success');
        setTimeout(()=> Matches.loadMatchDetails(matchId), 1000);
      } catch (err) {
        console.error('Error al abandonar:', err);
        App.showToast('Error al abandonar el partido', 'error');
      }
    },

    async useCard(matchId) {
      try {
        const res = await API.matches.assignCards(matchId);
        App.showToast(`Carta asignada: "${res.data.card.name}"`, 'success');
        setTimeout(()=> Matches.loadMatchDetails(matchId), 1000);
      } catch (err) {
        console.error('Error al usar carta:', err);
        App.showToast('Error al usar la carta', 'error');
      }
    },

    async submitResult(matchId) {
      const win = document.querySelector('input[name="winner-team"]:checked');
      if (!win) {
        App.showToast('Selecciona equipo ganador', 'warning');
        return;
      }
      try {
        await API.results.submitResult(matchId, { winner_team: parseInt(win.value) });
        App.showToast('Resultado registrado', 'success');
        setTimeout(()=> Matches.loadMatchDetails(matchId), 1000);
      } catch (err) {
        console.error('Error enviando resultado:', err);
        App.showToast('Error al registrar resultado', 'error');
      }
    },

    async submitRatings(matchId) {
      const ratings = [];
      document.querySelectorAll('[name^="rating-"]').forEach(sel => {
        const uid = sel.name.split('-')[1];
        const val = parseInt(sel.value);
        const com = document.querySelector(`[name="comment-${uid}"]`).value;
        if (val) ratings.push({ user_id: parseInt(uid), rating: val, comment: com });
      });
      if (!ratings.length) {
        App.showToast('Valora al menos un jugador', 'warning');
        return;
      }
      try {
        await API.results.submitRatings(matchId, { ratings });
        App.showToast('Valoraciones enviadas', 'success');
        setTimeout(()=> Matches.loadMatchDetails(matchId), 1000);
      } catch (err) {
        console.error('Error enviando valoraciones:', err);
        App.showToast('Error al enviar valoraciones', 'error');
      }
    },

    async uploadPhoto(matchId) {
      const inp = document.getElementById('photo-upload');
      if (!inp?.files.length) {
        App.showToast('Selecciona una foto', 'warning');
        return;
      }
      const file = inp.files[0];
      if (file.size > 5*1024*1024) {
        App.showToast('La foto supera 5MB', 'warning');
        return;
      }
      const form = new FormData();
      form.append('photo', file);
      const btn = document.querySelector('#upload-photo-form button[type="submit"]');
      const txt = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Subiendo...';
      try {
        await API.results.uploadPhoto(matchId, form);
        App.showToast('Foto subida', 'success');
        document.getElementById('upload-photo-form').reset();
        this.loadMatchPhotos(matchId);
      } catch (err) {
        console.error('Error subiendo foto:', err);
        App.showToast('Error al subir foto', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = txt;
      }
    },

    escapeHtml(text='') {
      const d = document.createElement('div'); d.textContent = text;
      return d.innerHTML;
    },

    getInitials(name='') {
      return name.split(' ').map(p => p[0].toUpperCase()).slice(0,2).join('');
    }
  };

  window.Matches = Matches;
})(window, window.API);
