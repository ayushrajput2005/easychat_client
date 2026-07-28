import apiClient from '../api/apiClient';

/**
 * GET /user/conversations
 * @returns {Promise<Array<{ id: number, conversationName: string, lastMessage: string, unseenCount: number, lastMessageAt: string, group: boolean }>>}
 */
export const getConversations = () =>
  apiClient.get('/user/conversations').then((res) => res.data);

/**
 * GET /user/conversation/{id}
 * @param {number} id
 * @returns {Promise<{ id: number, participants: string[], createdAt: string, messages: Array<{ authorUsername: string, content: string, createdAt: string }> }>}
 */
export const getConversation = (id) =>
  apiClient.get(`/user/conversation/${id}`).then((res) => res.data);

/**
 * POST /conversation/{id}/message
 * @param {number} id
 * @param {{ content: string }} messageData
 * @returns {Promise<{ authorUsername: string, content: string, createdAt: string }>}
 */
export const sendMessage = (id, messageData) =>
  apiClient.post(`/conversation/${id}/message`, messageData).then((res) => res.data);
