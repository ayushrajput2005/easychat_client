import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = import.meta.env.VITE_WS_URL;

let stompClient = null;

// Queue of { destination, callback, resolve } waiting for the connection
// to complete before subscribing.
const pendingSubscriptions = [];

/**
 * Creates and activates a new STOMP client using SockJS.
 * Safe to call multiple times — returns the existing client if already active.
 */
export const connectStompClient = () => {
  if (stompClient && stompClient.active) return stompClient;

  const token = localStorage.getItem('token');

  stompClient = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    connectHeaders: {
      Authorization: token ? `Bearer ${token}` : '',
    },
    reconnectDelay: 5000,
    debug: (str) => {
      console.log('STOMP: ' + str);
    },
    onConnect: () => {
      // Flush all subscriptions that were registered before the connection
      // was ready. This is the single, stable onConnect handler — never
      // overwritten by subscriber code.
      const waiting = pendingSubscriptions.splice(0);
      waiting.forEach(({ destination, callback, resolve }) => {
        const token = localStorage.getItem('token');
        const sub = stompClient.subscribe(destination, callback, {
          Authorization: token ? `Bearer ${token}` : '',
        });
        resolve(sub);
      });
    },
    onStompError: (frame) => {
      console.error('STOMP error:', frame);
      window.dispatchEvent(
        new CustomEvent('api-error', { detail: `Messaging Error: ${frame.headers?.message || 'Lost connection'}` })
      );
    },
    onWebSocketError: (event) => {
      console.error('STOMP WebSocket error:', event);
      window.dispatchEvent(
        new CustomEvent('api-error', { detail: 'Network Error: Cannot connect to messaging server' })
      );
    },
  });

  stompClient.activate();
  return stompClient;
};

export const getStompClient = () => {
  if (!stompClient || !stompClient.active) {
    return connectStompClient();
  }
  return stompClient;
};

export const disconnectStompClient = () => {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
    // Clear pending queue on disconnect
    pendingSubscriptions.splice(0);
  }
};

/**
 * Internal: subscribes to any STOMP destination (topic or user queue).
 *
 * - If the client is already connected → subscribes immediately.
 * - If not yet connected → queues the subscription; it will be actioned
 *   inside the single, stable onConnect handler above.
 *
 * Returns a synchronous unsubscribe function that is safe to call at any
 * point (before or after the subscription is established).
 */
const subscribeToDestination = (destination, callback) => {
  const client = getStompClient();
  let subscription = null;  // set once the STOMP sub is created
  let unsubscribed = false; // set if caller unsubscribes before connection

  if (client.connected) {
    // Already connected — subscribe right now
    const token = localStorage.getItem('token');
    subscription = client.subscribe(destination, callback, {
      Authorization: token ? `Bearer ${token}` : '',
    });
  } else {
    // Not connected yet — enqueue. The onConnect handler will call resolve(sub)
    // when the handshake completes.
    const entry = {
      destination,
      callback,
      resolve: (sub) => {
        if (unsubscribed) {
          // Caller already unsubscribed before we connected; undo immediately.
          sub.unsubscribe();
        } else {
          subscription = sub;
        }
      },
    };
    pendingSubscriptions.push(entry);
  }

  return () => {
    unsubscribed = true;
    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
    }
    // Also remove from pending queue in case we haven't connected yet
    const idx = pendingSubscriptions.findIndex((e) => e.destination === destination && e.callback === callback);
    if (idx !== -1) pendingSubscriptions.splice(idx, 1);
  };
};

/**
 * Subscribe to a shared STOMP topic.
 * @param {string} topic   e.g. "/topic/conversation/1"
 * @param {Function} callback
 * @returns {() => void}  Unsubscribe function
 */
export const subscribeToTopic = (topic, callback) =>
  subscribeToDestination(topic, callback);

/**
 * Subscribe to a user-specific STOMP queue.
 * Spring's SimpMessagingTemplate.convertAndSendToUser() routes messages to
 * /user/{username}/queue/<suffix>. The STOMP client only needs to subscribe
 * to /user/queue/<suffix> — the broker rewrites the destination using the
 * authenticated principal automatically.
 *
 * @param {string} queueSuffix  e.g. "notifications"  (no leading slash)
 * @param {Function} callback
 * @returns {() => void}  Unsubscribe function
 */
export const subscribeToUserQueue = (queueSuffix, callback) =>
  subscribeToDestination(`/user/queue/${queueSuffix}`, callback);
