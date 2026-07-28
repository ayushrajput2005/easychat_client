import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToUserQueue } from '../services/stompService';
import { getConversations } from '../services/conversationService';
import { useAuth } from './AuthContext';
import { playNotificationSound } from '../utils/sounds';

/**
 * NotificationType enum values matching the backend.
 */
export const NotificationType = {
  REQUEST_RECEIVED: 'REQUEST_RECEIVED',
  REQUEST_ACCEPTED: 'REQUEST_ACCEPTED',
  MESSAGE: 'MESSAGE',
  SYSTEM: 'SYSTEM',
};

const NotificationContext = createContext(null);

/**
 * NotificationProvider
 *
 * Subscribes to /user/queue/notifications once the user is authenticated.
 *
 * Badge behaviour:
 *   REQUEST_RECEIVED → badgeCount++ (numbered badge on bell)
 *   MESSAGE (non-active conv) → unreadCounts[conversationId]++ (conversation tile badge)
 *                               + red dot on bell if any unread counts exist
 *   REQUEST_ACCEPTED / SYSTEM → no badge
 *
 * Exposes:
 *   notifications          — enriched list (MESSAGE items have _conversationName/_conversationId)
 *   badgeCount             — REQUEST_RECEIVED count (numbered bell badge)
 *   unreadCounts           — { [conversationId: string]: number } per-conversation unread counts
 *   clearBadge()           — reset badgeCount to 0
 *   clearAll()             — clear notification history
 *   setActiveConversation  — called by ChatPage with current conv id (or null); resets that conv's unread count
 */
export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [notifications, setNotifications] = useState([]);
  const [badgeCount, setBadgeCount] = useState(0);

  // { [conversationId: string]: number }
  // Tracks unseen message counts per conversation (client-side, resets on nav)
  const [unreadCounts, setUnreadCounts] = useState({});

  // Track which conversation the user is actively viewing.
  const activeConversationIdRef = useRef(null);

  // Stable ref to queryClient
  const qcRef = useRef(queryClient);
  useEffect(() => { qcRef.current = queryClient; }, [queryClient]);

  const clearBadge = useCallback(() => setBadgeCount(0), []);
  const clearAll = useCallback(() => setNotifications([]), []);

  /**
   * ChatPage calls this when mounting/switching conversations.
   * Resets the unread count for that conversation so the badge disappears.
   */
  const setActiveConversation = useCallback((id) => {
    const strId = id != null ? String(id) : null;
    activeConversationIdRef.current = strId;

    if (strId != null) {
      // Clear the local unread count as soon as the user opens the chat
      setUnreadCounts((prev) => {
        if (!prev[strId]) return prev; // nothing to clear
        const next = { ...prev };
        delete next[strId];
        return next;
      });
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = subscribeToUserQueue('notifications', async (frame) => {
      try {
        /** @type {{ recipientUsername: string, type: string, payload: string|null }} */
        const event = JSON.parse(frame.body);
        const { type, payload } = event;

        const qc = qcRef.current;

        if (type === NotificationType.REQUEST_RECEIVED) {
          // Someone sent YOU a chat request:
          // → badge on bell, store notification, refresh the requests list
          playNotificationSound();
          setNotifications((prev) => [event, ...prev]);
          setBadgeCount((c) => c + 1);
          qc.invalidateQueries({ queryKey: ['chatRequests'] });

        } else if (type === NotificationType.REQUEST_ACCEPTED) {
          // Someone ACCEPTED your request → new conversation exists now:
          // → badge on bell, store notification,
          //   force-refetch conversations so new chat appears immediately,
          //   also refresh requests list (status changes to ACCEPTED)
          playNotificationSound();
          setNotifications((prev) => [event, ...prev]);
          setBadgeCount((c) => c + 1);
          qc.invalidateQueries({ queryKey: ['chatRequests'] });
          // Force immediate refetch so sidebar shows the new conversation right away
          qc.fetchQuery({
            queryKey: ['conversations'],
            queryFn: getConversations,
            staleTime: 0,
          }).catch(() => {
            qc.invalidateQueries({ queryKey: ['conversations'] });
          });

        } else if (type === NotificationType.MESSAGE) {
          // Parse conversation id
          let conversationId = null;
          try {
            const parsed = payload ? JSON.parse(payload) : null;
            conversationId = parsed?.conversationId != null ? String(parsed.conversationId) : null;
          } catch { /* ignore */ }

          const isViewingThatConvo =
            conversationId != null &&
            conversationId === activeConversationIdRef.current;

          if (!isViewingThatConvo) {
            playNotificationSound();
            // ── Increment local unread counter for this conversation ──────────
            if (conversationId != null) {
              setUnreadCounts((prev) => ({
                ...prev,
                [conversationId]: (prev[conversationId] ?? 0) + 1,
              }));
            }

            // ── Resolve the conversation name (cache → network fallback) ──────
            let conversationName = null;
            try {
              const cached = qc.getQueryData(['conversations']);
              const found = Array.isArray(cached)
                ? cached.find((c) => String(c.id) === conversationId)
                : null;

              if (found) {
                conversationName = found.conversationName;
                qc.invalidateQueries({ queryKey: ['conversations'] });
              } else {
                const fresh = await qc.fetchQuery({
                  queryKey: ['conversations'],
                  queryFn: getConversations,
                  staleTime: 0,
                });
                if (Array.isArray(fresh)) {
                  const foundFresh = fresh.find((c) => String(c.id) === conversationId);
                  conversationName = foundFresh?.conversationName ?? null;
                }
              }
            } catch {
              qc.invalidateQueries({ queryKey: ['conversations'] });
            }

            // ── Store enriched notification entry ─────────────────────────────
            const enriched = {
              ...event,
              _conversationId: conversationId,
              _conversationName: conversationName,
            };
            setNotifications((prev) => [enriched, ...prev]);
          }
          // If user IS viewing that conversation: ChatPage's /topic/ sub handles it
          // No notification entry, no unread count bump.

        } else {
          // SYSTEM and unknown: store, no badge
          setNotifications((prev) => [event, ...prev]);
        }

      } catch (err) {
        console.error('Failed to parse notification frame:', err);
      }
    });

    return () => { unsubscribe(); };
  }, [isAuthenticated]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        badgeCount,
        unreadCounts,
        clearBadge,
        clearAll,
        setActiveConversation,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return ctx;
}
