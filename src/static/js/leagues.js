// Módulo de gestión de ligas

const Leagues = {
    // Inicializar módulo de ligas
    init() {
        this.bindEvents();
    },
    
    // Vincular eventos
    bindEvents() {
        // Botones para crear liga
        document.addEventListener('click', (e) => {
            if (e.target.id === 'create-league-btn' || e.target.id === 'create-league-empty-btn') {
                e.preventDefault();
                this.showCreateLeagueModal();
            }
        });
        
        // Botón para unirse a liga
        document.addEventListener('click', (e) => {
            if (e.target.id === 'join-league-btn') {
                e.preventDefault();
                this.showJoinLeagueModal();
            }
        });
        
        // Botón para crear liga (submit)
        document.addEventListener('click', (e) => {
            if (e.target.id === 'create-league-submit') {
                e.preventDefault();
                this.createLeague();
            }
        });
        
        // Botón para unirse a liga (submit)
        document.addEventListener('click', (e) => {
            if (e.target.id === 'join-league-submit') {
                e.preventDefault();
                this.joinLeague();
            }
        });
        
        // Botón para compartir liga
        document.addEventListener('click', (e) => {
            if (e.target.id === 'share-league-btn') {
                e.preventDefault();
                this.showShareLeagueModal();
            }
        });
        
        // Botones para copiar código/enlace
        document.addEventListener('click', (e) => {
            if (e.target.id === 'copy-invite-code') {
                e.preventDefault();
                this.copyToClipboard('invite-code-display');
            } else if (e.target.id === 'copy-invite-link') {
                e.preventDefault();
                this.copyToClipboard('invite-link-display');
            }
        });
        
        // Botón para compartir por WhatsApp
        document.addEventListener('click', (e) => {
            if (e.target.id === 'share-whatsapp') {
                e.preventDefault();
                this.shareByWhatsApp();
            }
        });
        
        // Clic en tarjeta de liga
        document.addEventListener('click', (e) => {
            const leagueCard = e.target.closest('.league-card');
            if (leagueCard && e.target.tagName !== 'BUTTON') {
                e.preventDefault();
                const leagueId = leagueCard.dataset.id;
                if (leagueId) {
                    App.showLeagueDetailPage(leagueId);
                }
            }
        });
    },
    
    // Cargar y mostrar ligas del usuario
    async loadUserLeagues() {
        const container = document.getElementById('leagues-container');
        const loadingElement = document.getElementById('leagues-loading');
        const emptyElement = document.getElementById('leagues-empty');
        
        if (!container || !loadingElement || !emptyElement) return;
        
        try {
            // Mostrar loading
            loadingElement.classList.remove('d-none');
            emptyElement.classList.add('d-none');
            
            // Obtener ligas del usuario
            const response = await API.leagues.getAll();
            const leagues = response.leagues || [];
            
            // Ocultar loading
            loadingElement.classList.add('d-none');
            
            // Verificar si hay ligas
            if (leagues.length === 0) {
                emptyElement.classList.remove('d-none');
                return;
            }
            
            // Generar HTML para cada liga
            let leaguesHTML = '';
            
            leagues.forEach(league => {
                leaguesHTML += `
                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card league-card shadow-sm h-100" data-id="${league.id}">
                            <div class="card-body">
                                <h2 class="card-title h5">${this.escapeHtml(league.name)}</h2>
                                <p class="card-text text-muted small">
                                    <i class="bi bi-calendar-event"></i> Creada el ${this.formatDate(league.created_at)}
                                </p>
                                <div class="mt-auto">
                                    <button class="btn btn-sm btn-primary w-100" onclick="App.showLeagueDetailPage(${league.id})">
                                        <i class="bi bi-arrow-right-circle"></i> Ver Liga
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            // Insertar HTML en el contenedor (sin incluir los elementos de loading/empty)
            const existingContent = container.innerHTML;
            container.innerHTML = leaguesHTML + loadingElement.outerHTML + emptyElement.outerHTML;
        } catch (error) {
            console.error('Error cargando ligas:', error);
            loadingElement.classList.add('d-none');
            App.showToast('Error al cargar las ligas', 'error');
        }
    },
    
    // Mostrar modal para crear liga
    showCreateLeagueModal() {
        const modal = new bootstrap.Modal(document.getElementById('createLeagueModal'));
        modal.show();
    },
    
    // Mostrar modal para unirse a liga
    showJoinLeagueModal() {
        const modal = new bootstrap.Modal(document.getElementById('joinLeagueModal'));
        modal.show();
    },
    
    // Crear nueva liga
    async createLeague() {
        const leagueName = document.getElementById('league-name').value;
        
        if (!leagueName) {
            App.showToast('Por favor, ingresa un nombre para la liga', 'warning');
            return;
        }
        
        try {
            const submitBtn = document.getElementById('create-league-submit');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creando...';
            submitBtn.disabled = true;
            
            const response = await API.leagues.create({ name: leagueName });

            // Restaurar botón
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createLeagueModal'));
            modal.hide();
            
            // Limpiar formulario
            document.getElementById('league-name').value = '';
            
            // Mostrar mensaje de éxito
            App.showToast('Liga creada correctamente', 'success');
            
            // Recargar ligas
            setTimeout(() => {
                App.showHomePage();
            }, 1000);
        } catch (error) {
            console.error('Error creando liga:', error);
            App.showToast('Error al crear la liga', 'error');

            // Restaurar botón si hay error
            const submitBtn = document.getElementById('create-league-submit');
            if (submitBtn.disabled) {
                submitBtn.innerHTML = 'Crear Liga';
                submitBtn.disabled = false;
            }
            
            // Mostrar mensaje de error más específico
            let errorMsg = 'Error al crear la liga';
            if (error.message) {
                errorMsg += `: ${error.message}`;
            }
            App.showToast(errorMsg, 'error');
        }
    },
    
    // Unirse a liga con código de invitación
    async joinLeague() {
        const inviteCode = document.getElementById('invite-code').value;
        
        if (!inviteCode) {
            App.showToast('Por favor, ingresa un código de invitación', 'warning');
            return;
        }
        
        try {
            const response = await API.leagues.join(inviteCode);
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('joinLeagueModal'));
            modal.hide();
            
            // Limpiar formulario
            document.getElementById('invite-code').value = '';
            
            // Mostrar mensaje de éxito
            App.showToast('Te has unido a la liga correctamente', 'success');
            
            // Recargar ligas
            setTimeout(() => {
                App.showHomePage();
            }, 1000);
        } catch (error) {
            console.error('Error uniéndose a liga:', error);
            App.showToast('Código de invitación inválido', 'error');
        }
    },
    
    // Cargar y mostrar detalles de una liga
    async loadLeagueDetails(leagueId) {
        try {
            // Obtener detalles de la liga
            const response = await API.leagues.getById(leagueId);
            const league = response.league;
            
            if (!league) {
                App.showToast('Liga no encontrada', 'error');
                App.showHomePage();
                return;
            }
            
            // Actualizar nombre de la liga en la interfaz
            document.getElementById('league-name-breadcrumb').textContent = league.name;
            document.getElementById('league-name-title').textContent = league.name;
            
            // Guardar datos de la liga para compartir
            document.body.dataset.leagueId = league.id;
            document.body.dataset.leagueName = league.name;
            document.body.dataset.leagueInviteCode = league.invite_code;
            
            // Cargar partidos de la liga
            Matches.loadLeagueMatches(leagueId);
            
            // Cargar miembros de la liga
            this.loadLeagueMembers(league.members || []);
        } catch (error) {
            console.error('Error cargando detalles de liga:', error);
            App.showToast('Error al cargar los detalles de la liga', 'error');
            App.showHomePage();
        }
    },
    
    // Cargar y mostrar miembros de una liga
    loadLeagueMembers(members) {
        const container = document.getElementById('members-container');
        const loadingElement = document.getElementById('members-loading');
        
        if (!container || !loadingElement) return;
        
        // Ocultar loading
        loadingElement.classList.add('d-none');
        
        // Verificar si hay miembros
        if (members.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-3">
                    <div class="alert alert-info">
                        <p>No hay miembros en esta liga.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        // Generar HTML para cada miembro
        let membersHTML = '';
        
        members.forEach(member => {
            membersHTML += `
                <div class="col-md-6 mb-3">
                    <div class="card shadow-sm">
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                <div class="flex-shrink-0">
                                    <div class="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                                        ${this.getInitials(member.username)}
                                    </div>
                                </div>
                                <div class="flex-grow-1 ms-3">
                                    <h5 class="mb-1">${this.escapeHtml(member.username)}</h5>
                                    <p class="text-muted small mb-0">
                                        <i class="bi bi-calendar-check"></i> Miembro desde ${this.formatDate(member.joined_at)}
                                    </p>
                                </div>
                                <div class="flex-shrink-0 ms-2">
                                    <a href="#" class="btn btn-sm btn-outline-primary" onclick="App.showUserProfilePage(${member.user_id})">
                                        <i class="bi bi-person"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Insertar HTML en el contenedor (manteniendo el elemento de loading)
        container.innerHTML = membersHTML + loadingElement.outerHTML;
    },
    
    // Mostrar modal para compartir liga
    showShareLeagueModal() {
        const leagueId = document.body.dataset.leagueId;
        const leagueName = document.body.dataset.leagueName;
        const inviteCode = document.body.dataset.leagueInviteCode;
        
        if (!leagueId || !inviteCode) {
            App.showToast('Error al obtener información de la liga', 'error');
            return;
        }
        
        // Configurar modal
        document.getElementById('invite-code-display').value = inviteCode;
        
        const baseUrl = `${window.location.protocol}//${window.location.host}`;
        const inviteLink = `${baseUrl}/join/${inviteCode}`;
        document.getElementById('invite-link-display').value = inviteLink;
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('shareLeagueModal'));
        modal.show();
    },
    
    // Copiar texto al portapapeles
    copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.select();
        element.setSelectionRange(0, 99999);
        
        navigator.clipboard.writeText(element.value)
            .then(() => {
                App.showToast('Copiado al portapapeles', 'success');
            })
            .catch(err => {
                console.error('Error al copiar:', err);
                App.showToast('Error al copiar', 'error');
            });
    },
    
    // Compartir por WhatsApp
    shareByWhatsApp() {
        const leagueName = document.body.dataset.leagueName;
        const inviteCode = document.body.dataset.leagueInviteCode;
        
        if (!leagueName || !inviteCode) {
            App.showToast('Error al obtener información de la liga', 'error');
            return;
        }
        
        const baseUrl = window.location.origin;
        const inviteLink = `${baseUrl}/join/${inviteCode}`;
        
        const message = encodeURIComponent(`¡Únete a mi liga de pádel "${leagueName}" en Lio Padel League! Usa este enlace: ${inviteLink}`);
        const whatsappUrl = `https://wa.me/?text=${message}`;
        
        window.open(whatsappUrl, '_blank');
    },
    
    // Utilidades
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },
    
    escapeHtml(text) {
        if (!text) return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    getInitials(name) {
        if (!name) return '?';
        
        return name
            .split(' ')
            .map(part => part.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    }
};
