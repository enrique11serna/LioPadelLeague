// API Service para comunicación con el backend

const API = {
    // URL base para las peticiones API
    baseUrl: window.location.protocol + '//' + window.location.host + '/api',
    
    // Obtener token de autenticación del almacenamiento local
    getToken() {
        return localStorage.getItem('token');
    },
    
    // Guardar token en almacenamiento local
    setToken(token) {
        localStorage.setItem('token', token);
    },
    
    // Eliminar token del almacenamiento local
    removeToken() {
        localStorage.removeItem('token');
    },
    
    // Configuración de headers para peticiones autenticadas
    getAuthHeaders() {
        const token = this.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    },
    
    // Petición GET
    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    },
    
    // Petición POST
    async post(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    },
    
    // Petición PUT
    async put(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API PUT Error:', error);
            throw error;
        }
    },
    
    // Subir archivo
    async uploadFile(endpoint, formData) {
        try {
            const token = this.getToken();
            const headers = {
                'Authorization': token ? `Bearer ${token}` : ''
                // No incluir Content-Type para que el navegador establezca el boundary correcto
            };
            
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: headers,
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Upload Error:', error);
            throw error;
        }
    },
    
    // Endpoints específicos
    auth: {
        login: (credentials) => API.post('/auth/login', credentials),
        register: (userData) => API.post('/auth/register', userData),
        validateToken: () => API.get('/auth/validate-token'),
        getProfile: () => API.get('/auth/profile'),
        updateProfile: (userData) => API.put('/auth/profile', userData)
    },
    
    leagues: {
        getAll: () => API.get('/leagues'),
        getById: (id) => API.get(`/leagues/${id}`),
        create: (leagueData) => API.post('/leagues', leagueData),
        join: (inviteCode) => API.post(`/leagues/join/${inviteCode}`),
        update: (id, leagueData) => API.put(`/leagues/${id}`, leagueData),
        regenerateInvite: (id) => API.post(`/leagues/${id}/regenerate-invite`)
    },
    
    matches: {
        getByLeague: (leagueId) => API.get(`/leagues/${leagueId}/matches`),
        getById: (id) => API.get(`/matches/${id}`),
        create: (leagueId, matchData) => API.post(`/leagues/${leagueId}/matches`, matchData),
        join: (id, teamData) => API.post(`/matches/${id}/join`, teamData),
        leave: (id) => API.post(`/matches/${id}/leave`),
        useCard: (id) => API.post(`/matches/${id}/use-card`),
        submitResult: (id, resultData) => API.post(`/matches/${id}/result`, resultData),
        submitRatings: (id, ratingsData) => API.post(`/matches/${id}/ratings`, ratingsData),
        getPhotos: (id) => API.get(`/matches/${id}/photos`),
        uploadPhoto: (id, formData) => API.uploadFile(`/matches/${id}/photos`, formData)
    },
    
    users: {
        getStats: (id) => API.get(`/users/${id}/stats`)
    }
};
