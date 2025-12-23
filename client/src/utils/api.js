/**
 * API Service Utility
 * 
 * Centralized API client for all backend communication.
 * Handles authentication tokens, error handling, and request/response formatting.
 * 
 * Features:
 * - Base API configuration
 * - Auth token management
 * - Request interceptors
 * - Response error handling
 * - Mock data fallback
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Mock data for development
const mockData = {
  procurements: [
    {
      id: '1',
      name: 'Office Supplies Procurement',
      status: 'planning',
      budget: 50000,
      stage: 'Planning',
      progress: 10,
      createdDate: new Date(Date.now() - 5 * 24 * 60 * 60000),
      description: 'Annual office supplies procurement'
    },
    {
      id: '2',
      name: 'IT Equipment Upgrade',
      status: 'template',
      budget: 250000,
      stage: 'Template Selection',
      progress: 20,
      createdDate: new Date(Date.now() - 10 * 24 * 60 * 60000),
      description: 'Computer hardware and software for all departments'
    },
    {
      id: '3',
      name: 'Construction Services',
      status: 'rfq',
      budget: 1000000,
      stage: 'RFQ Creation',
      progress: 30,
      createdDate: new Date(Date.now() - 15 * 24 * 60 * 60000),
      description: 'Building renovation and infrastructure improvements'
    },
  ],
  templates: [
    { id: 't1', name: 'Standard Goods', category: 'goods', fields: 8 },
    { id: 't2', name: 'Services Template', category: 'services', fields: 10 },
    { id: 't3', name: 'Works & Construction', category: 'works', fields: 12 },
  ],
  users: [
    { id: 'u1', name: 'John Smith', email: 'john@example.com', role: 'Procurement Officer' },
    { id: 'u2', name: 'Jane Doe', email: 'jane@example.com', role: 'Evaluator' },
    { id: 'u3', name: 'Admin User', email: 'admin@example.com', role: 'Administrator' },
  ]
};

// API Client Class
class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  // Get auth token from localStorage
  getAuthToken() {
    return localStorage.getItem('authToken');
  }

  // Build request headers
  buildHeaders() {
    const headers = { ...this.defaultHeaders };
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // Build full URL
  buildUrl(endpoint) {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    return `${this.baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  }

  // GET request
  async get(endpoint, options = {}) {
    try {
      const response = await fetch(this.buildUrl(endpoint), {
        method: 'GET',
        headers: this.buildHeaders(),
        ...options
      });

      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // POST request
  async post(endpoint, data = {}, options = {}) {
    try {
      const response = await fetch(this.buildUrl(endpoint), {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(data),
        ...options
      });

      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // PUT request
  async put(endpoint, data = {}, options = {}) {
    try {
      const response = await fetch(this.buildUrl(endpoint), {
        method: 'PUT',
        headers: this.buildHeaders(),
        body: JSON.stringify(data),
        ...options
      });

      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // PATCH request
  async patch(endpoint, data = {}, options = {}) {
    try {
      const response = await fetch(this.buildUrl(endpoint), {
        method: 'PATCH',
        headers: this.buildHeaders(),
        body: JSON.stringify(data),
        ...options
      });

      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // DELETE request
  async delete(endpoint, options = {}) {
    try {
      const response = await fetch(this.buildUrl(endpoint), {
        method: 'DELETE',
        headers: this.buildHeaders(),
        ...options
      });

      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Handle successful response
  async handleResponse(response) {
    if (!response.ok) {
      if (response.status === 401) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return response;
  }

  // Handle error
  handleError(error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Create API client instance
const apiClient = new APIClient(API_BASE_URL);

/**
 * Procurements API
 */
export const procurementsAPI = {
  // Get all procurements
  getAll: async () => {
    try {
      return await apiClient.get('/procurements');
    } catch {
      return mockData.procurements;
    }
  },

  // Get single procurement
  getById: async (id) => {
    try {
      return await apiClient.get(`/procurements/${id}`);
    } catch {
      return mockData.procurements.find(p => p.id === id);
    }
  },

  // Create procurement
  create: async (data) => {
    return await apiClient.post('/procurements', data);
  },

  // Update procurement
  update: async (id, data) => {
    return await apiClient.put(`/procurements/${id}`, data);
  },

  // Delete procurement
  delete: async (id) => {
    return await apiClient.delete(`/procurements/${id}`);
  }
};

/**
 * Templates API
 */
export const templatesAPI = {
  getAll: async () => {
    try {
      return await apiClient.get('/templates');
    } catch {
      return mockData.templates;
    }
  },

  getById: async (id) => {
    try {
      return await apiClient.get(`/templates/${id}`);
    } catch {
      return mockData.templates.find(t => t.id === id);
    }
  },

  create: async (data) => {
    return await apiClient.post('/templates', data);
  },

  update: async (id, data) => {
    return await apiClient.put(`/templates/${id}`, data);
  },

  delete: async (id) => {
    return await apiClient.delete(`/templates/${id}`);
  }
};

/**
 * Authentication API
 */
export const authAPI = {
  login: async (email, password) => {
    return await apiClient.post('/auth/login', { email, password });
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    try {
      return await apiClient.get('/auth/me');
    } catch {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
  },

  signup: async (data) => {
    return await apiClient.post('/auth/signup', data);
  }
};

/**
 * Approvals API
 */
export const approvalsAPI = {
  getAll: async () => {
    return await apiClient.get('/approvals');
  },

  getById: async (id) => {
    return await apiClient.get(`/approvals/${id}`);
  },

  approve: async (id, data) => {
    return await apiClient.post(`/approvals/${id}/approve`, data);
  },

  reject: async (id, data) => {
    return await apiClient.post(`/approvals/${id}/reject`, data);
  }
};

/**
 * Documents API
 */
export const documentsAPI = {
  getAll: async () => {
    return await apiClient.get('/documents');
  },

  upload: async (procurementId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('procurementId', procurementId);

    return await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiClient.getAuthToken()}`
      },
      body: formData
    });
  }
};

/**
 * Notifications API
 */
export const notificationsAPI = {
  getAll: async () => {
    return await apiClient.get('/notifications');
  },

  markAsRead: async (id) => {
    return await apiClient.patch(`/notifications/${id}`, { read: true });
  },

  markAllAsRead: async () => {
    return await apiClient.post('/notifications/mark-all-read');
  }
};

export default apiClient;
