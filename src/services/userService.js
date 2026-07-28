import apiClient from '../api/apiClient';

/**
 * GET /user/profile
 * @returns {Promise<{ email: string, username: string, name: string, about: string }>}
 */
export const getProfile = () =>
  apiClient.get('/user/profile').then((res) => res.data);

/**
 * PUT /user/profile
 * @param {{ email: string, about: string, name: string }} profileData
 * @returns {Promise<{ username: string, body: string, status: string }>}
 */
export const updateProfile = (profileData) =>
  apiClient.put('/user/profile', profileData).then((res) => res.data);

/**
 * GET /user/profiles?query=<q>
 * Only call when query.length >= 3.
 * @param {string} query
 * @returns {Promise<Array<{ email: string, username: string, name: string, about: string }>>}
 */
export const searchProfiles = (query) =>
  apiClient.get('/user/profiles', { params: { query } }).then((res) => res.data);
