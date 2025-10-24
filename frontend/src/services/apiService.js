/**
 * API Service
 * Handles HTTP requests to the backend API
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  /**
   * Register a new user
   */
  async register(username, password) {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(username, password) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /**
   * Get current user from localStorage
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Get auth token
   */
  getToken() {
    return localStorage.getItem('token');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard() {
    try {
      const response = await fetch(`${API_URL}/auth/leaderboard`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch leaderboard');
      }

      return data.leaderboard;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getProfile(username) {
    try {
      const response = await fetch(`${API_URL}/auth/profile/${username}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch profile');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }
}

const apiService = new ApiService();
export default apiService;
