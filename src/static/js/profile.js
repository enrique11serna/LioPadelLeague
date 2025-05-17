// Módulo de perfil de usuario

const Profile = {
    // Inicializar módulo de perfil
    init() {
        this.bindEvents();
    },
    
    // Vincular eventos
    bindEvents() {
        // Botón para editar perfil
        document.addEventListener('click', (e) => {
            if (e.target.id === 'edit-profile-btn') {
                e.preventDefault();
                this.showEditProfileModal();
            }
        });
        
        // Botón para guardar cambios de perfil
        document.addEventListener('click', (e) => {
            if (e.target.id === 'edit-profile-submit') {
                e.preventDefault();
                this.updateProfile();
            }
        });
    },
    
    // Cargar y mostrar perfil del usuario
    async loadUserProfile(userId) {
        try {
            // Si no se proporciona ID, usar el usuario actual
            if (!userId) {
                const currentUser = Auth.getCurrentUser();
                if (!currentUser) {
                    App.showToast('Error al obtener información del usuario', 'error');
                    App.showHomePage();
                    return;
                }
                userId = currentUser.id;
            }
            
            // Cargar información básica del usuario
            await this.loadBasicInfo(userId);
            
            // Cargar estadísticas del usuario
            await this.loadUserStats(userId);
        } catch (error) {
            console.error('Error cargando perfil:', error);
            App.showToast('Error al cargar el perfil', 'error');
            App.showHomePage();
        }
    },
    
    // Cargar información básica del usuario
    async loadBasicInfo(userId) {
        const currentUser = Auth.getCurrentUser();
        
        // Verificar si es el perfil del usuario actual
        const isCurrentUser = currentUser && currentUser.id === userId;
        
        if (isCurrentUser) {
            // Mostrar información del usuario actual
            document.getElementById('profile-username').textContent = currentUser.username;
            document.getElementById('profile-email').textContent = currentUser.email;
            
            // Mostrar botón de editar perfil
            const editProfileBtn = document.getElementById('edit-profile-btn');
            if (editProfileBtn) {
                editProfileBtn.classList.remove('d-none');
            }
        } else {
            try {
                // Obtener información del usuario
                const response = await API.users.getStats(userId);
                const user = response.user;
                
                // Mostrar información del usuario
                document.getElementById('profile-username').textContent = user.username;
                document.getElementById('profile-email').textContent = 'No disponible';
                
                // Ocultar botón de editar perfil
                const editProfileBtn = document.getElementById('edit-profile-btn');
                if (editProfileBtn) {
                    editProfileBtn.classList.add('d-none');
                }
            } catch (error) {
                console.error('Error cargando información del usuario:', error);
                App.showToast('Error al cargar la información del usuario', 'error');
            }
        }
    },
    
    // Cargar estadísticas del usuario
    async loadUserStats(userId) {
        try {
            const response = await API.users.getStats(userId);
            const stats = response.stats;
            const partners = response.partners;
            const cardUsage = response.card_usage;
            
            // Actualizar estadísticas generales
            document.getElementById('total-matches').textContent = stats.total_matches;
            document.getElementById('matches-won').textContent = stats.matches_won;
            document.getElementById('win-rate').textContent = `${Math.round(stats.win_rate)}%`;
            document.getElementById('avg-rating').textContent = stats.avg_rating.toFixed(1);
            
            // Cargar mejores compañeros
            this.loadPartners(partners);
            
            // Cargar cartas más usadas
            this.loadCardUsage(cardUsage);
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            App.showToast('Error al cargar las estadísticas', 'error');
        }
    },
    
    // Cargar y mostrar mejores compañeros
    loadPartners(partners) {
        const container = document.getElementById('partners-container');
        const loadingElement = document.getElementById('partners-loading');
        const emptyElement = document.getElementById('partners-empty');
        
        if (!container || !loadingElement || !emptyElement) return;
        
        // Ocultar loading
        loadingElement.classList.add('d-none');
        
        // Verificar si hay compañeros
        if (!partners || partners.length === 0) {
            emptyElement.classList.remove('d-none');
            return;
        }
        
        // Generar HTML para cada compañero
        let partnersHTML = '';
        
        partners.forEach((partner, index) => {
            const winRate = partner.matches_played > 0 
                ? Math.round((partner.matches_won / partner.matches_played) * 100) 
                : 0;
            
            partnersHTML += `
                <div class="d-flex align-items-center mb-3">
                    <div class="flex-shrink-0">
                        <div class="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                            ${this.getInitials(partner.username)}
                        </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <h5 class="mb-0">${this.escapeHtml(partner.username)}</h5>
                        <div class="small text-muted">
                            ${partner.matches_played} partidos, ${partner.matches_won} victorias (${winRate}%)
                        </div>
                    </div>
                    <div class="flex-shrink-0 ms-2">
                        <a href="#" class="btn btn-sm btn-outline-primary" onclick="App.showUserProfilePage(${partner.user_id})">
                            <i class="bi bi-person"></i>
                        </a>
                    </div>
                </div>
            `;
        });
        
        // Actualizar contenedor
        container.innerHTML = partnersHTML;
    },
    
    // Cargar y mostrar cartas más usadas
    loadCardUsage(cardUsage) {
        const container = document.getElementById('cards-container');
        const loadingElement = document.getElementById('cards-loading');
        const emptyElement = document.getElementById('cards-empty');
        
        if (!container || !loadingElement || !emptyElement) return;
        
        // Ocultar loading
        loadingElement.classList.add('d-none');
        
        // Verificar si hay cartas usadas
        if (!cardUsage || cardUsage.length === 0) {
            emptyElement.classList.remove('d-none');
            return;
        }
        
        // Generar HTML para cada carta
        let cardsHTML = '';
        
        cardUsage.forEach(card => {
            cardsHTML += `
                <div class="d-flex align-items-center mb-3">
                    <div class="flex-shrink-0">
                        <div class="avatar bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                            <i class="bi bi-joystick"></i>
                        </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <h5 class="mb-0">${this.escapeHtml(card.name)}</h5>
                        <div class="small text-muted">
                            Usada ${card.count} ${card.count === 1 ? 'vez' : 'veces'}
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Actualizar contenedor
        container.innerHTML = cardsHTML;
    },
    
    // Mostrar modal para editar perfil
    showEditProfileModal() {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;
        
        // Rellenar formulario con datos actuales
        document.getElementById('edit-username').value = currentUser.username;
        document.getElementById('edit-email').value = currentUser.email;
        document.getElementById('edit-password').value = '';
        document.getElementById('edit-confirm-password').value = '';
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
        modal.show();
    },
    
    // Actualizar perfil del usuario
    async updateProfile() {
        const username = document.getElementById('edit-username').value;
        const email = document.getElementById('edit-email').value;
        const password = document.getElementById('edit-password').value;
        const confirmPassword = document.getElementById('edit-confirm-password').value;
        
        if (!username || !email) {
            App.showToast('Por favor, completa los campos obligatorios', 'warning');
            return;
        }
        
        // Verificar contraseñas si se proporcionan
        if (password && password !== confirmPassword) {
            App.showToast('Las contraseñas no coinciden', 'warning');
            return;
        }
        
        // Preparar datos para actualizar
        const userData = {
            username,
            email
        };
        
        if (password) {
            userData.password = password;
        }
        
        try {
            const response = await API.auth.updateProfile(userData);
            
            // Actualizar usuario actual
            Auth.setCurrentUser(response.user);
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
            modal.hide();
            
            // Mostrar mensaje de éxito
            App.showToast('Perfil actualizado correctamente', 'success');
            
            // Recargar perfil
            setTimeout(() => {
                this.loadUserProfile();
            }, 1000);
        } catch (error) {
            console.error('Error actualizando perfil:', error);
            App.showToast('Error al actualizar el perfil', 'error');
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
