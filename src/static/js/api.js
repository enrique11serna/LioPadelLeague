// API Service para comunicación con el backend
const API = {
    // URL base para las peticiones API (origen + /api)
    baseUrl: `${window.location.origin}/api`,

    // Token en localStorage
    getToken() {
        return localStorage.getItem('token');
    },
    setToken(token) {
        localStorage.setItem('token', token);
    },
    removeToken() {
        localStorage.removeItem('token');
    },

    // Headers autenticados
    getAuthHeaders() {
        const token = this.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    },

    // GET genérico
    async get(endpoint) {
        console.log(`GET ${this.baseUrl}${endpoint}`);
        const res = await fetch(this.baseUrl + endpoint, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || res.statusText);
        return data;
    },

    // POST genérico
    async post(endpoint, payload) {
        console.log(`POST ${this.baseUrl}${endpoint}`, payload);
        const res = await fetch(this.baseUrl + endpoint, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || res.statusText);
        return data;
    },

    // PUT genérico
    async put(endpoint, payload) {
        console.log(`PUT ${this.baseUrl}${endpoint}`, payload);
        const res = await fetch(this.baseUrl + endpoint, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || res.statusText);
        return data;
    },

    // Upload multipart/form-data
    async uploadFile(endpoint, formData) {
        console.log(`UPLOAD ${this.baseUrl}${endpoint}`);
        const headers = { 'Authorization': `Bearer ${this.getToken()}` };
        const res = await fetch(this.baseUrl + endpoint, {
            method: 'POST',
            headers,
            body: formData
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || res.statusText);
        return data;
    },

    // Endpoints específicos
    auth: {
        login: (creds) => API.post('/auth/login', creds),
        register: (u) => API.post('/auth/register', u),
        validateToken: () => API.get('/auth/validate-token'),
        getProfile: () => API.get('/auth/profile'),
        updateProfile: (u) => API.put('/auth/profile', u)
    },
    leagues: {
        getAll: () => API.get('/leagues'),
        getById: (id) => API.get(`/leagues/${id}`),
        create: (body) => API.post('/leagues', body),
        join: (code) => API.post(`/leagues/join/${code}`),
        update: (id, body) => API.put(`/leagues/${id}`, body),
        regenerateInvite: (id) => API.post(`/leagues/${id}/regenerate-invite`)
    },
    matches: {
        getByLeague: (lid) => API.get(`/leagues/${lid}/matches`),
        create: (lid, b) => API.post(`/leagues/${lid}/matches`, b),
        // … resto idéntico
    },
    users: {
        getStats: (uid) => API.get(`/users/${uid}/stats`)
    }
};

export default API;
