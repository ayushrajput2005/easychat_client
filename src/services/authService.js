import apiClient from '../api/apiClient';

/**
 * POST /auth/login
 * @param {{ username: string, password: string }} credentials
 * @returns {Promise<{ status: string, body: string, username: string }>}
 */
export const login = (credentials) =>
  apiClient.post('/auth/login', credentials).then((res) => res.data);

/**
 * POST /auth/register
 * @param {{ username: string, password: string }} credentials
 * @returns {Promise<{ status: string, body: string, username: string }>}
 */
export const register = (credentials) =>
  apiClient.post('/auth/register', credentials).then((res) => res.data);
