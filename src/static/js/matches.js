// Módulo de gestión de partidos

const Matches = {
    // Inicializar módulo de partidos
    init() {
        this.bindEvents();
    },
    
    // Vincular eventos
    bindEvents() {
        // Botones para crear partido
        document.addEventListener('click', (e) => {
            if (e.target.id === 'create-match-btn' || e.target.id === 'create-match-empty-btn') {
                e.preventDefault();
                this.showCreateMatchModal();
            }
        });
        
        // Botón para crear partido (submit)
        document.addEventListener('click', (e) => {
            if (e.target.id === 'create-match-submit') {
                e.preventDefault();
                this.createMatch();
            }
        });
        
        // Botón para unirse a partido
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('join-match-btn')) {
                e.preventDefault();
                const matchId = e.target.dataset.matchId;
                const team = e.target.dataset.team;
                if (matchId) {
                    this.joinMatch(matchId, team);
                }
            }
        });
        
        // Botón para abandonar partido
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('leave-match-btn')) {
                e.preventDefault();
                const matchId = e.target.dataset.matchId;
                if (matchId) {
                    this.leaveMatch(matchId);
                }
            }
        });
        
        // Botón para usar carta
        document.addEventListener('click', (e) => {
            if (e.target.id === 'use-card-btn') {
                e.preventDefault();
                const matchId = document.body.dataset.matchId;
                if (matchId) {
                    this.useCard(matchId);
                }
            }
        });
        
        // Formulario de resultado
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'result-form') {
                e.preventDefault();
                const matchId = document.body.dataset.matchId;
                if (matchId) {
                    this.submitResult(matchId);
                }
            }
        });
        
        // Formulario de valoraciones
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'ratings-form') {
                e.preventDefault();
                const matchId = document.body.dataset.matchId;
                if (matchId) {
                    this.submitRatings(matchId);
                }
            }
        });
        
        // Formulario de subida de foto
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'upload-photo-form') {
                e.preventDefault();
                const matchId = document.body.dataset.matchId;
                if (matchId) {
                    this.uploadPhoto(matchId);
                }
            }
        });
        
        // Clic en tarjeta de partido
        document.addEventListener('click', (e) => {
            const matchCard = e.target.closest('.match-card');
            if (matchCard && e.target.tagName !== 'BUTTON') {
                e.preventDefault();
                const matchId = matchCard.dataset.id;
                if (matchId) {
                    App.showMatchDetailPage(matchId);
                }
            }
        });
    },
    
    // Cargar y mostrar partidos de una liga
    async loadLeagueMatches(leagueId) {
        const container = document.getElementById('matches-container');
        const loadingElement = document.getElementById('matches-loading');
        const emptyElement = document.getElementById('matches-empty');
        
        if (!container || !loadingElement || !emptyElement) return;
        
        try {
            // Mostrar loading
            loadingElement.classList.remove('d-none');
            emptyElement.classList.add('d-none');
            
            // Obtener partidos de la liga
            const response = await API.matches.getByLeague(leagueId);
            const matches = response.matches || [];
            
            // Ocultar loading
            loadingElement.classList.add('d-none');
            
            // Verificar si hay partidos
            if (matches.length === 0) {
                emptyElement.classList.remove('d-none');
                return;
            }
            
            // Agrupar partidos por estado
            const upcomingMatches = matches.filter(match => match.status === 'open');
            const inProgressMatches = matches.filter(match => match.status === 'in_progress');
            const completedMatches = matches.filter(match => match.status === 'completed');
            
            // Generar HTML para cada grupo
            let matchesHTML = '';
            
            if (inProgressMatches.length > 0) {
                matchesHTML += `
                    <div class="col-12 mb-4">
                        <h3 class="h5 mb-3">Partidos en Curso</h3>
                        <div class="row">
                            ${this.generateMatchesHTML(inProgressMatches)}
                        </div>
                    </div>
                `;
            }
            
            if (upcomingMatches.length > 0) {
                matchesHTML += `
                    <div class="col-12 mb-4">
                        <h3 class="h5 mb-3">Próximos Partidos</h3>
                        <div class="row">
                            ${this.generateMatchesHTML(upcomingMatches)}
                        </div>
                    </div>
                `;
            }
            
            if (completedMatches.length > 0) {
                matchesHTML += `
                    <div class="col-12 mb-4">
                        <h3 class="h5 mb-3">Partidos Completados</h3>
                        <div class="row">
                            ${this.generateMatchesHTML(completedMatches)}
                        </div>
                    </div>
                `;
            }
            
            // Insertar HTML en el contenedor (sin incluir los elementos de loading/empty)
            const existingContent = container.innerHTML;
            container.innerHTML = matchesHTML + loadingElement.outerHTML + emptyElement.outerHTML;
        } catch (error) {
            console.error('Error cargando partidos:', error);
            loadingElement.classList.add('d-none');
            App.showToast('Error al cargar los partidos', 'error');
        }
    },
    
    // Generar HTML para lista de partidos
    generateMatchesHTML(matches) {
        let html = '';
        
        matches.forEach(match => {
            const statusClass = match.status === 'open' ? 'open' : 
                               match.status === 'in_progress' ? 'in-progress' : 'completed';
            
            const statusText = match.status === 'open' ? 'Abierto' : 
                              match.status === 'in_progress' ? 'En Curso' : 'Completado';
            
            const matchDate = new Date(match.date);
            const formattedDate = matchDate.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            const formattedTime = matchDate.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Contar participantes por equipo
            const team1 = match.participants ? match.participants.filter(p => p.team === 1) : [];
            const team2 = match.participants ? match.participants.filter(p => p.team === 2) : [];
            
            html += `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card match-card shadow-sm" data-id="${match.id}">
                        <div class="card-body">
                            <div class="match-date mb-2">
                                <i class="bi bi-calendar-event"></i> ${formattedDate} - ${formattedTime}
                            </div>
                            <div class="match-status ${statusClass} mb-2">
                                ${statusText}
                            </div>
                            <div class="team-container">
                                <div class="team-label text-success">Equipo 1</div>
                                <div class="team-count">${team1.length}/2</div>
                            </div>
                            <div class="team-container">
                                <div class="team-label text-danger">Equipo 2</div>
                                <div class="team-count">${team2.length}/2</div>
                            </div>
                            ${match.status === 'completed' ? `
                                <div class="mt-2">
                                    <strong>Ganador:</strong> Equipo ${match.winner_team}
                                </div>
                            ` : ''}
                            <div class="mt-3">
                                <button class="btn btn-sm btn-primary w-100" onclick="App.showMatchDetailPage(${match.id})">
                                    <i class="bi bi-arrow-right-circle"></i> Ver Detalles
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        return html;
    },
    
    // Mostrar modal para crear partido
    showCreateMatchModal() {
        const modal = new bootstrap.Modal(document.getElementById('createMatchModal'));
        modal.show();
    },
    
    // Crear nuevo partido
    async createMatch() {
        const matchDate = document.getElementById('match-date').value;
        const leagueId = document.body.dataset.leagueId;
        
        if (!matchDate) {
            App.showToast('Por favor, selecciona fecha y hora para el partido', 'warning');
            return;
        }
        
        if (!leagueId) {
            App.showToast('Error al obtener información de la liga', 'error');
            return;
        }
        
        try {
            const response = await API.matches.create(leagueId, { date: matchDate });
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createMatchModal'));
            modal.hide();
            
            // Limpiar formulario
            document.getElementById('match-date').value = '';
            
            // Mostrar mensaje de éxito
            App.showToast('Partido creado correctamente', 'success');
            
            // Recargar partidos
            setTimeout(() => {
                Leagues.loadLeagueDetails(leagueId);
            }, 1000);
        } catch (error) {
            console.error('Error creando partido:', error);
            App.showToast('Error al crear el partido', 'error');
        }
    },
    
    // Cargar y mostrar detalles de un partido
    async loadMatchDetails(matchId) {
        try {
            // Obtener detalles del partido
            const response = await API.matches.getById(matchId);
            const match = response.match;
            
            if (!match) {
                App.showToast('Partido no encontrado', 'error');
                App.showHomePage();
                return;
            }
            
            // Guardar datos del partido
            document.body.dataset.matchId = match.id;
            document.body.dataset.leagueId = match.league_id;
            
            // Actualizar breadcrumb
            const backToLeagueLink = document.getElementById('back-to-league');
            if (backToLeagueLink) {
                backToLeagueLink.onclick = (e) => {
                    e.preventDefault();
                    App.showLeagueDetailPage(match.league_id);
                };
            }
            
            // Actualizar información del partido
            this.updateMatchInfo(match);
            
            // Cargar equipos
            this.loadTeams(match.participants || []);
            
            // Mostrar carta si está disponible
            this.showCardIfAvailable(match);
            
            // Mostrar sección de resultado según estado
            this.showResultSection(match);
            
            // Mostrar sección de valoraciones según estado
            this.showRatingsSection(match);
            
            // Mostrar sección de fotos según estado
            this.showPhotosSection(match);
            
            // Cargar fotos si el partido está completado
            if (match.status === 'completed') {
                this.loadMatchPhotos(match.id);
            }
        } catch (error) {
            console.error('Error cargando detalles del partido:', error);
            App.showToast('Error al cargar los detalles del partido', 'error');
            App.showHomePage();
        }
    },
    
    // Actualizar información general del partido
    updateMatchInfo(match) {
        // Formatear fecha
        const matchDate = new Date(match.date);
        const formattedDate = matchDate.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Mostrar fecha
        const dateElement = document.getElementById('match-date');
        if (dateElement) {
            dateElement.textContent = formattedDate;
        }
        
        // Mostrar estado
        const statusElement = document.getElementById('match-status');
        if (statusElement) {
            const statusText = match.status === 'open' ? 'Abierto' : 
                              match.status === 'in_progress' ? 'En Curso' : 'Completado';
            statusElement.textContent = statusText;
            
            // Añadir clase según estado
            statusElement.className = '';
            if (match.status === 'open') {
                statusElement.classList.add('text-primary');
            } else if (match.status === 'in_progress') {
                statusElement.classList.add('text-warning');
            } else {
                statusElement.classList.add('text-success');
            }
        }
        
        // Mostrar acciones según estado
        const actionsElement = document.getElementById('match-actions');
        if (actionsElement) {
            let actionsHTML = '';
            
            if (match.status === 'open') {
                if (!match.is_participating) {
                    actionsHTML = `
                        <button class="btn btn-success join-match-btn" data-match-id="${match.id}" data-team="1">
                            <i class="bi bi-person-plus"></i> Unirme al Equipo 1
                        </button>
                        <button class="btn btn-danger ms-2 join-match-btn" data-match-id="${match.id}" data-team="2">
                            <i class="bi bi-person-plus"></i> Unirme al Equipo 2
                        </button>
                    `;
                } else {
                    actionsHTML = `
                        <button class="btn btn-outline-danger leave-match-btn" data-match-id="${match.id}">
                            <i class="bi bi-person-dash"></i> Abandonar Partido
                        </button>
                    `;
                }
            }
            
            actionsElement.innerHTML = actionsHTML;
        }
    },
    
    // Cargar y mostrar equipos
    loadTeams(participants) {
        const team1Container = document.getElementById('team1-container');
        const team2Container = document.getElementById('team2-container');
        
        if (!team1Container || !team2Container) return;
        
        // Filtrar participantes por equipo
        const team1 = participants.filter(p => p.team === 1);
        const team2 = participants.filter(p => p.team === 2);
        
        // Generar HTML para equipo 1
        let team1HTML = '';
        if (team1.length === 0) {
            team1HTML = `
                <div class="text-center py-3">
                    <p class="text-muted">No hay jugadores en este equipo</p>
                </div>
            `;
        } else {
            team1.forEach(player => {
                team1HTML += `
                    <div class="d-flex align-items-center mb-3">
                        <div class="flex-shrink-0">
                            <div class="avatar bg-success text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                                ${this.getInitials(player.username)}
                            </div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="mb-0">${this.escapeHtml(player.username)}</h5>
                        </div>
                    </div>
                `;
            });
        }
        
        // Generar HTML para equipo 2
        let team2HTML = '';
        if (team2.length === 0) {
            team2HTML = `
                <div class="text-center py-3">
                    <p class="text-muted">No hay jugadores en este equipo</p>
                </div>
            `;
        } else {
            team2.forEach(player => {
                team2HTML += `
                    <div class="d-flex align-items-center mb-3">
                        <div class="flex-shrink-0">
                            <div class="avatar bg-danger text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                                ${this.getInitials(player.username)}
                            </div>
                        </div>
                        <div class="flex-grow-1 ms-3">
                            <h5 class="mb-0">${this.escapeHtml(player.username)}</h5>
                        </div>
                    </div>
                `;
            });
        }
        
        // Actualizar contenedores
        team1Container.innerHTML = team1HTML;
        team2Container.innerHTML = team2HTML;
    },
    
    // Mostrar carta si está disponible
    showCardIfAvailable(match) {
        const cardSection = document.getElementById('card-section');
        
        if (!cardSection) return;
        
        if (match.can_view_card && match.card) {
            // Mostrar sección de carta
            cardSection.classList.remove('d-none');
            
            // Actualizar información de la carta
            document.getElementById('card-name').textContent = match.card.name;
            document.getElementById('card-description').textContent = match.card.description;
            
            // Deshabilitar botón si la carta ya fue usada
            const useCardBtn = document.getElementById('use-card-btn');
            if (useCardBtn) {
                if (match.card.used) {
                    useCardBtn.disabled = true;
                    useCardBtn.textContent = 'Carta Usada';
                } else {
                    useCardBtn.disabled = false;
                    useCardBtn.textContent = 'Usar Carta';
                }
            }
        } else {
            // Ocultar sección de carta
            cardSection.classList.add('d-none');
        }
    },
    
    // Mostrar sección de resultado según estado
    showResultSection(match) {
        const resultSection = document.getElementById('result-section');
        const resultDisplay = document.getElementById('result-display');
        const submitResultForm = document.getElementById('submit-result-form');
        
        if (!resultSection || !resultDisplay || !submitResultForm) return;
        
        if (match.status === 'completed') {
            // Mostrar sección de resultado
            resultSection.classList.remove('d-none');
            
            // Mostrar resultado
            resultDisplay.innerHTML = `
                <div class="alert alert-success">
                    <h4 class="alert-heading">Resultado Final</h4>
                    <p class="mb-0">El <strong>Equipo ${match.winner_team}</strong> ha ganado el partido.</p>
                </div>
            `;
            
            // Ocultar formulario
            submitResultForm.classList.add('d-none');
        } else if (match.status === 'in_progress' && match.is_participating) {
            // Mostrar sección de resultado
            resultSection.classList.remove('d-none');
            
            // Mostrar formulario
            submitResultForm.classList.remove('d-none');
            
            // Ocultar resultado
            resultDisplay.innerHTML = '';
        } else {
            // Ocultar sección de resultado
            resultSection.classList.add('d-none');
        }
    },
    
    // Mostrar sección de valoraciones según estado
    showRatingsSection(match) {
        const ratingsSection = document.getElementById('ratings-section');
        const ratingsContainer = document.getElementById('ratings-container');
        
        if (!ratingsSection || !ratingsContainer) return;
        
        if (match.status === 'completed' && match.is_participating) {
            // Mostrar sección de valoraciones
            ratingsSection.classList.remove('d-none');
            
            // Generar formularios de valoración para cada jugador
            let ratingsHTML = '';
            
            // Filtrar participantes (excluir al usuario actual)
            const currentUser = Auth.getCurrentUser();
            const otherParticipants = match.participants.filter(p => p.user_id !== currentUser.id);
            
            otherParticipants.forEach(player => {
                ratingsHTML += `
                    <div class="rating-container mb-3">
                        <h5>${this.escapeHtml(player.username)}</h5>
                        <div class="mb-3">
                            <label class="form-label">Valoración (1-10)</label>
                            <select class="form-select" name="rating-${player.user_id}" required>
                                <option value="">Selecciona una valoración</option>
                                ${Array.from({length: 10}, (_, i) => i + 1).map(num => 
                                    `<option value="${num}">${num}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Comentario (opcional)</label>
                            <textarea class="form-control" name="comment-${player.user_id}" rows="2"></textarea>
                        </div>
                    </div>
                `;
            });
            
            // Actualizar contenedor
            ratingsContainer.innerHTML = ratingsHTML;
        } else {
            // Ocultar sección de valoraciones
            ratingsSection.classList.add('d-none');
        }
    },
    
    // Mostrar sección de fotos según estado
    showPhotosSection(match) {
        const photosSection = document.getElementById('photos-section');
        const uploadPhotoContainer = document.getElementById('upload-photo-container');
        
        if (!photosSection || !uploadPhotoContainer) return;
        
        if (match.status === 'completed') {
            // Mostrar sección de fotos
            photosSection.classList.remove('d-none');
            
            // Mostrar formulario de subida solo si el usuario participa
            if (match.is_participating) {
                uploadPhotoContainer.classList.remove('d-none');
            } else {
                uploadPhotoContainer.classList.add('d-none');
            }
        } else {
            // Ocultar sección de fotos
            photosSection.classList.add('d-none');
        }
    },
    
    // Cargar fotos del partido
    async loadMatchPhotos(matchId) {
        const photosContainer = document.getElementById('photos-container');
        
        if (!photosContainer) return;
        
        try {
            // Mostrar loading
            photosContainer.innerHTML = `
                <div class="col-12 text-center py-3">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <p class="mt-3">Cargando fotos...</p>
                </div>
            `;
            
            // Obtener fotos del partido
            const response = await API.matches.getPhotos(matchId);
            const photos = response.photos || [];
            
            // Verificar si hay fotos
            if (photos.length === 0) {
                photosContainer.innerHTML = `
                    <div class="col-12 text-center py-3">
                        <p class="text-muted">No hay fotos de este partido.</p>
                    </div>
                `;
                return;
            }
            
            // Generar HTML para cada foto
            let photosHTML = '';
            
            photos.forEach(photo => {
                const photoUrl = `/${photo.file_path}`;
                const uploadDate = new Date(photo.uploaded_at).toLocaleDateString('es-ES');
                const username = photo.user ? photo.user.username : 'Usuario';
                
                photosHTML += `
                    <div class="col-md-4 col-sm-6 mb-3">
                        <div class="card shadow-sm">
                            <img src="${photoUrl}" class="photo-thumbnail" alt="Foto del partido">
                            <div class="card-body p-2">
                                <p class="small text-muted mb-0">
                                    <i class="bi bi-person"></i> ${this.escapeHtml(username)}
                                    <br>
                                    <i class="bi bi-calendar"></i> ${uploadDate}
                                </p>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            // Actualizar contenedor
            photosContainer.innerHTML = photosHTML;
        } catch (error) {
            console.error('Error cargando fotos:', error);
            photosContainer.innerHTML = `
                <div class="col-12 text-center py-3">
                    <div class="alert alert-danger">
                        <p>Error al cargar las fotos.</p>
                    </div>
                </div>
            `;
        }
    },
    
    // Unirse a un partido
    async joinMatch(matchId, team) {
        try {
            const response = await API.matches.join(matchId, { team: parseInt(team) });
            
            // Mostrar mensaje de éxito
            App.showToast('Te has unido al partido correctamente', 'success');
            
            // Recargar detalles del partido
            setTimeout(() => {
                this.loadMatchDetails(matchId);
            }, 1000);
        } catch (error) {
            console.error('Error uniéndose al partido:', error);
            App.showToast('Error al unirse al partido', 'error');
        }
    },
    
    // Abandonar un partido
    async leaveMatch(matchId) {
        try {
            const response = await API.matches.leave(matchId);
            
            // Mostrar mensaje de éxito
            App.showToast('Has abandonado el partido correctamente', 'success');
            
            // Recargar detalles del partido
            setTimeout(() => {
                this.loadMatchDetails(matchId);
            }, 1000);
        } catch (error) {
            console.error('Error abandonando el partido:', error);
            App.showToast('Error al abandonar el partido', 'error');
        }
    },
    
    // Usar carta
    async useCard(matchId) {
        try {
            const response = await API.matches.useCard(matchId);
            
            // Mostrar mensaje de éxito
            App.showToast(`Has usado la carta "${response.card.name}"`, 'success');
            
            // Recargar detalles del partido
            setTimeout(() => {
                this.loadMatchDetails(matchId);
            }, 1000);
        } catch (error) {
            console.error('Error usando carta:', error);
            App.showToast('Error al usar la carta', 'error');
        }
    },
    
    // Enviar resultado
    async submitResult(matchId) {
        const winnerTeam = document.querySelector('input[name="winner-team"]:checked');
        
        if (!winnerTeam) {
            App.showToast('Por favor, selecciona el equipo ganador', 'warning');
            return;
        }
        
        try {
            const response = await API.matches.submitResult(matchId, {
                winner_team: parseInt(winnerTeam.value)
            });
            
            // Mostrar mensaje de éxito
            App.showToast('Resultado registrado correctamente', 'success');
            
            // Recargar detalles del partido
            setTimeout(() => {
                this.loadMatchDetails(matchId);
            }, 1000);
        } catch (error) {
            console.error('Error enviando resultado:', error);
            App.showToast('Error al registrar el resultado', 'error');
        }
    },
    
    // Enviar valoraciones
    async submitRatings(matchId) {
        const currentUser = Auth.getCurrentUser();
        const otherParticipants = document.querySelectorAll('[name^="rating-"]');
        
        if (otherParticipants.length === 0) {
            App.showToast('No hay jugadores para valorar', 'warning');
            return;
        }
        
        const ratings = [];
        
        // Recopilar valoraciones
        otherParticipants.forEach(select => {
            const userId = select.name.split('-')[1];
            const rating = select.value;
            const comment = document.querySelector(`[name="comment-${userId}"]`).value;
            
            if (rating) {
                ratings.push({
                    user_id: parseInt(userId),
                    rating: parseInt(rating),
                    comment: comment
                });
            }
        });
        
        if (ratings.length === 0) {
            App.showToast('Por favor, valora al menos a un jugador', 'warning');
            return;
        }
        
        try {
            const response = await API.matches.submitRatings(matchId, { ratings });
            
            // Mostrar mensaje de éxito
            App.showToast('Valoraciones enviadas correctamente', 'success');
            
            // Recargar detalles del partido
            setTimeout(() => {
                this.loadMatchDetails(matchId);
            }, 1000);
        } catch (error) {
            console.error('Error enviando valoraciones:', error);
            App.showToast('Error al enviar las valoraciones', 'error');
        }
    },
    
    // Subir foto
    async uploadPhoto(matchId) {
        const photoInput = document.getElementById('photo-upload');
        
        if (!photoInput || !photoInput.files || photoInput.files.length === 0) {
            App.showToast('Por favor, selecciona una foto', 'warning');
            return;
        }
        
        const file = photoInput.files[0];
        
        // Verificar tamaño máximo (5MB)
        if (file.size > 5 * 1024 * 1024) {
            App.showToast('La foto es demasiado grande. Máximo 5MB', 'warning');
            return;
        }
        
        // Crear FormData
        const formData = new FormData();
        formData.append('photo', file);
        
        try {
            // Mostrar loading
            const uploadBtn = document.querySelector('#upload-photo-form button[type="submit"]');
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Subiendo...';
            }
            
            const response = await API.matches.uploadPhoto(matchId, formData);
            
            // Mostrar mensaje de éxito
            App.showToast('Foto subida correctamente', 'success');
            
            // Limpiar formulario
            document.getElementById('upload-photo-form').reset();
            
            // Recargar fotos
            this.loadMatchPhotos(matchId);
            
            // Restaurar botón
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = 'Subir Foto';
            }
        } catch (error) {
            console.error('Error subiendo foto:', error);
            App.showToast('Error al subir la foto', 'error');
            
            // Restaurar botón
            const uploadBtn = document.querySelector('#upload-photo-form button[type="submit"]');
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = 'Subir Foto';
            }
        }
    },
    
    // Utilidades
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
