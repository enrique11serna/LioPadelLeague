(function (window) {
  const API = {
    baseUrl: `${window.location.origin}/api`,

    get(path) {
      return fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      }).then(this.handleResponse);
    },
    post(path, body) {
      return fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
        body: JSON.stringify(body)
      }).then(this.handleResponse);
    },
    put(path, body) {
      return fetch(`${this.baseUrl}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() },
        body: JSON.stringify(body)
      }).then(this.handleResponse);
    },
    delete(path) {
      return fetch(`${this.baseUrl}${path}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      }).then(this.handleResponse);
    },
    upload(path, formData) {
      return fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: formData
      }).then(this.handleResponse);
    },
    handleResponse(res) {
      return res.json().then(data => {
        if (!res.ok) return Promise.reject(data);
        return data;
      });
    },

    getToken() {
      return localStorage.getItem('token');
    },
    setToken(token) {
      localStorage.setItem('token', token);
    },
    removeToken() {
      localStorage.removeItem('token');
    },
    getAuthHeaders() {
      const token = this.getToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    },

    auth: {
      register: body => API.post('/auth/register', body),
      login:    body => API.post('/auth/login',    body),
      validateToken: () => API.get('/auth/validate-token'),
      getProfile: () => API.get('/auth/profile'),
      updateProfile: body => API.put('/auth/profile', body)
    },
    leagues: {
      getAll: () => API.get('/leagues'),
      getOne: id => API.get(`/leagues/${id}`),
      create: body => API.post('/leagues', body),
      update: (id, body) => API.put(`/leagues/${id}`, body),
      delete: id => API.delete(`/leagues/${id}`),
      join: code => API.post(`/leagues/join/${code}`),
      regenerateInvite: id => API.post(`/leagues/${id}/regenerate-invite`)
    },
    matches: {
      getByLeague: leagueId => API.get(`/leagues/${leagueId}/matches`),
      create: (leagueId, body) => API.post(`/leagues/${leagueId}/matches`, body),
      getOne: matchId => API.get(`/matches/${matchId}`),
      update: (matchId, body) => API.put(`/matches/${matchId}`, body),
      delete: matchId => API.delete(`/matches/${matchId}`),
      join: (matchId, team) => API.post(`/matches/${matchId}/join`, team ? { team } : {}),
      leave: matchId => API.post(`/matches/${matchId}/leave`),
      assignCards: matchId => API.post(`/matches/${matchId}/assign-cards`),
      getCard: matchId => API.get(`/matches/${matchId}/card`)
    },
    results: {
      submitResult: (matchId, body) => API.post(`/results/matches/${matchId}/result`, body),
      submitRatings: (matchId, body) => API.post(`/results/matches/${matchId}/ratings`, body),
      uploadPhoto: (matchId, formData) => API.upload(`/results/matches/${matchId}/photos`, formData)
    },
    profile: {
      getHistory: () => API.get('/profile/history'),
      getStats:   () => API.get('/profile/stats')
    }
  };

  window.API = API;
})(window);
