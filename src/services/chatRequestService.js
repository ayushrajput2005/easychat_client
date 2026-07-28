import apiClient from '../api/apiClient';

/**
 * GET /user/chat/request
 * @returns {Promise<Array<{ requestId: number, sender: string, receiver: string, status: string, body: string }>>}
 */
export const getChatRequests = () =>
  apiClient.get('/user/chat/request').then((res) => res.data);

/**
 * POST /user/chat/request
 * @param {{ receiverUsername: string }} requestData
 * @returns {Promise<{ requestId: number, sender: string, receiver: string, status: string, body: string }>}
 */
export const sendChatRequest = (requestData) =>
  apiClient.post('/user/chat/request', requestData).then((res) => res.data);

/**
 * PUT /user/chat/request
 * @param {{ requestId: number, requestStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED' }} updateData
 * @returns {Promise<{ requestId: number, sender: string, receiver: string, status: string, body: string }>}
 */
export const updateChatRequest = (updateData) =>
  apiClient.put('/user/chat/request', updateData).then((res) => res.data);
