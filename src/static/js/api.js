// API Service para comunicación con el backend

const API = {
    // URL base para las peticiones API - siempre con HTTPS y host dinámico
    baseUrl: `${window.location.origin}/api`,

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
        console.log(`Realizando GET a: ${this.baseUrl}${endpoint}`);
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
            }
            return data;
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    },

    // Petición POST
    async post(endpoint, payload) {
        console.log(`Realizando POST a: ${this.baseUrl}${endpoint}`, payload);
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
            }
            return data;
        } catch (error) {
            console.error('API POST Error:', error.message);
            throw error;
        }
    },

    // Petición PUT
    async put(endpoint, payload) {
        console.log(`Realizando PUT a: ${this.baseUrl}${endpoint}`, payload);
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
            }
            return data;
        } catch (error) {
            console.error('API PUT Error:', error);
            throw error;
        }
    },

    // Subir archivo (formData)
    async uploadFile(endpoint, formData) {
        console.log(`Realizando upload a: ${this.baseUrl}${endpoint}`);
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': this.getToken() ? `Bearer ${this.getToken()}` : ''
                },
                body: formData
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
            }
            return data;
        } catch (error) {
            console.error('API Upload Error:', error);
            throw error;
        }
    },

    // Endpoints específicos
    auth: {
        login: creds => API.post('/auth/login', creds),
        register: user => API.post('/auth/register', user),
        validateToken: () => API.get('/auth/validate-token'),
        getProfile: () => API.get('/auth/profile'),
        updateProfile: user => API.put('/auth/profile', user)
    },

    leagues: {
        getAll: () => API.get('/leagues'),
        getById: id => API.get(`/leagues/${id}`),
        create: data => API.post('/leagues', data),
        join: code => API.post(`/leagues/join/${code}`),
        update: (id, data) => API.put(`/leagues/${id}`, data),
        regenerateInvite: id => API.post(`/leagues/${id}/regenerate-invite`)
    },

    matches: {
        getByLeague: lid => API.get(`/leagues/${lid}/matches`),
        getById: id => API.get(`/matches/${id}`),
        create: (lid, data) => API.post(`/leagues/${lid}/matches`, data),
        join: (id, team) => API.post(`/matches/${id}/join`, team),
        leave: id => API.post(`/matches/${id}/leave`),
        useCard: id => API.post(`/matches/${id}/use-card`),
        submitResult: (id, res) => API.post(`/matches/${id}/result`, res),
        submitRatings: (id, rates) => API.post(`/matches/${id}/ratings`, rates),
        getPhotos: id => API.get(`/matches/${id}/photos`),
        uploadPhoto: (id, fd) => API.uploadFile(`/matches/${id}/photos`, fd)
    },

    users: {
        getStats: id => API.get(`/users/${id}/stats`)
    }
};
