// This file contains authentication-related API client functions.
import axios from 'axios';

/**
 * Logs in a user.
 * @param {string} username - The username of the user.
 * @param {string} password - The password of the user.
 * @returns {Promise<object>} - The response from the server.
 */
export async function login(username: string, password: string): Promise<object> {
  try {
    const response = await axios.post('/api/auth/login', { username, password });
    return response.data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

/**
 * Logs out the current user.
 * @returns {Promise<void>} - Resolves when the user is logged out.
 */
export async function logout(): Promise<void> {
  try {
    await axios.post('/api/auth/logout');
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
}

/**
 * Fetches the current user's profile.
 * @returns {Promise<object>} - The user's profile data.
 */
export async function fetchUserProfile(): Promise<object> {
  try {
    const response = await axios.get('/api/auth/profile');
    return response.data;
  } catch (error) {
    console.error('Fetching user profile failed:', error);
    throw error;
  }
}