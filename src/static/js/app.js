// Aplicación principal

const App = {
    // Inicializar aplicación
    init() {
        // Inicializar módulos
        Auth.init();
        Leagues.init();
        Matches.init();
        Profile.init();
        
        // Vincular eventos de navegación
        this.bindNavigationEvents();
        
        // Crear contenedor para toasts
        this.createToastContainer();
    },
    
    // Vincular eventos de navegación
    bindNavigationEvents() {
        document.addEventListener('click', (e) => {
            // Navegación a home
            if (e.target.id === 'nav-home') {
                e.preventDefault();
                this.showHomePage();
            }
            
            // Navegación a perfil
            if (e.target.id === 'nav-profile') {
                e.preventDefault();
                this.showProfilePage();
            }
            
            // Volver a ligas desde detalle de liga
            if (e.target.id === 'back-to-leagues') {
                e.preventDefault();
                this.showHomePage();
            }
        });
    },
    
    // Mostrar página de inicio (ligas)
    showHomePage() {
        const appContainer = document.getElementById('app');
        const homeTemplate = document.getElementById('home-template');
        
        appContainer.innerHTML = homeTemplate.innerHTML;
        
        // Cargar ligas del usuario
        Leagues.loadUserLeagues();
        
        // Actualizar navegación
        this.updateNavigation('home');
    },
    
    // Mostrar página de detalle de liga
    showLeagueDetailPage(leagueId) {
        const appContainer = document.getElementById('app');
        const leagueDetailTemplate = document.getElementById('league-detail-template');
        
        appContainer.innerHTML = leagueDetailTemplate.innerHTML;
        
        // Cargar detalles de la liga
        Leagues.loadLeagueDetails(leagueId);
        
        // Actualizar navegación
        this.updateNavigation('leagues');
    },
    
    // Mostrar página de detalle de partido
    showMatchDetailPage(matchId) {
        const appContainer = document.getElementById('app');
        const matchDetailTemplate = document.getElementById('match-detail-template');
        
        appContainer.innerHTML = matchDetailTemplate.innerHTML;
        
        // Cargar detalles del partido
        Matches.loadMatchDetails(matchId);
        
        // Actualizar navegación
        this.updateNavigation('matches');
    },
    
    // Mostrar página de perfil
    showProfilePage(userId) {
        const appContainer = document.getElementById('app');
        const profileTemplate = document.getElementById('profile-template');
        
        appContainer.innerHTML = profileTemplate.innerHTML;
        
        // Cargar perfil del usuario
        Profile.loadUserProfile(userId);
        
        // Actualizar navegación
        this.updateNavigation('profile');
    },
    
    // Mostrar página de perfil de otro usuario
    showUserProfilePage(userId) {
        this.showProfilePage(userId);
    },
    
    // Actualizar navegación activa
    updateNavigation(page) {
        // Eliminar clase active de todos los enlaces
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Añadir clase active al enlace correspondiente
        if (page === 'home') {
            document.querySelectorAll('#nav-home').forEach(link => {
                link.classList.add('active');
            });
        } else if (page === 'profile') {
            document.querySelectorAll('#nav-profile').forEach(link => {
                link.classList.add('active');
            });
        }
    },
    
    // Crear contenedor para toasts
    createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    },
    
    // Mostrar toast de notificación
    showToast(message, type = 'info') {
        const container = document.querySelector('.toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = message;
        
        container.appendChild(toast);
        
        // Mostrar toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Ocultar y eliminar toast después de 5 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, 5000);
    }
};

// Inicializar aplicación cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
