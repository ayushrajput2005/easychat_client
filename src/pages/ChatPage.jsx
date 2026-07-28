import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  IconButton,
  Typography,
  Avatar,
  TextField,
  CircularProgress,
  Skeleton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ArrowBack, Send } from '@mui/icons-material';
import { getConversation, sendMessage } from '../services/conversationService';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { formatChatTime, getInitials, stringToColor } from '../utils/formatters';
import { subscribeToTopic } from '../services/stompService';
import { playSentSound, playMessageReceivedSound } from '../utils/sounds';

export default function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { username } = useAuth();
  const queryClient = useQueryClient();
  const { setActiveConversation } = useNotifications();
  const messagesEndRef = useRef(null);
  const [input, setInput] = useState('');
  // Local buffer for WS messages that haven't yet been merged into the query cache
  const [liveMessages, setLiveMessages] = useState([]);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  // Register the active conversation so NotificationContext skips
  // redundant preview refreshes while we're already subscribed here.
  useEffect(() => {
    setActiveConversation(id);
    return () => setActiveConversation(null);
  }, [id, setActiveConversation]);

  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => getConversation(id),
    enabled: Boolean(id),
  });

  // When conversation data first loads, clear any WS-buffered messages
  // that arrived before the query finished (avoids duplicates).
  useEffect(() => {
    if (conversation) setLiveMessages([]);
  }, [conversation?.id]); // only when switching conversations

  // When the user opens a chat, tell the server we've "seen" messages
  // by invalidating the conversations list — this triggers a refetch
  // that returns a fresh unseenCount (reset to 0 by the server when
  // /user/conversation/:id is called).
  useEffect(() => {
    if (id) {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  }, [id, queryClient]);

  const sendMutation = useMutation({
    mutationFn: (content) => sendMessage(id, { content }),
    onSuccess: (newMsg) => {
      // Merge sent message into the query cache and clear live buffer
      queryClient.setQueryData(['conversation', id], (old) => {
        if (!old) return old;
        return { ...old, messages: [...old.messages, newMsg] };
      });
      // Remove from live buffer if it was optimistically added
      setLiveMessages((prev) =>
        prev.filter(
          (m) =>
            !(m.authorUsername === newMsg.authorUsername &&
              m.content === newMsg.content)
        )
      );
      playSentSound();
      setInput('');
    },
  });

  // WebSocket: subscribe to live message updates for this conversation
  useEffect(() => {
    if (!id) return;

    // NOTE: topic path MUST start with "/"
    const unsubscribe = subscribeToTopic(`/topic/conversation/${id}`, (frame) => {
      try {
        const msg = JSON.parse(frame.body);

        // The server echoes our own sent messages back over the topic.
        // We already added them via sendMutation.onSuccess, so skip them here
        // to avoid showing the same message twice.
        if (msg.authorUsername === username) {
          // Still refresh the conversation list (unread counts, last preview)
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          return;
        }

        // 1. Add to live buffer immediately so UI updates right away
        playMessageReceivedSound();
        setLiveMessages((prev) => {
          const key = `${msg.authorUsername}|${msg.content}|${msg.createdAt}`;
          const alreadyIn = prev.some(
            (m) => `${m.authorUsername}|${m.content}|${m.createdAt}` === key
          );
          if (alreadyIn) return prev;
          return [...prev, msg];
        });

        // 2. Also merge into query cache so it persists across re-renders
        queryClient.setQueryData(['conversation', id], (old) => {
          if (!old) return old;
          const key = `${msg.authorUsername}|${msg.content}|${msg.createdAt}`;
          const alreadyExists = old.messages.some(
            (m) => `${m.authorUsername}|${m.content}|${m.createdAt}` === key
          );
          if (alreadyExists) return old;
          return { ...old, messages: [...old.messages, msg] };
        });

        // 3. Refresh conversation list (unread counts, last message preview)
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      } catch (err) {
        console.error('Failed to parse STOMP message:', err);
      }
    });

    // Reset live buffer when switching conversations
    setLiveMessages([]);

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-scroll whenever messages update (cached or live)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages, liveMessages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherParticipant = conversation?.participants?.find((p) => p !== username) ?? 'Chat';
  const avatarColor = stringToColor(otherParticipant);

  return (
    <Box
      sx={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 1.5,
          py: 1,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
          minHeight: 60,
        }}
      >
        {/* Back button: on mobile → go to '/', on desktop → navigate to '/' (clears selection) */}
        <IconButton
          onClick={() => navigate('/')}
          aria-label="go back"
          id="chat-back-button"
          sx={{
            display: isDesktop ? 'none' : 'flex',
            color: 'primary.main',
          }}
        >
          <ArrowBack />
        </IconButton>

        <Avatar
          sx={{
            bgcolor: avatarColor,
            width: 42,
            height: 42,
            fontSize: 16,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {getInitials(otherParticipant)}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} noWrap>
            {isLoading ? <Skeleton width={120} /> : otherParticipant}
          </Typography>
          {conversation?.participants?.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
              {conversation.participants.length} participants
            </Typography>
          )}
        </Box>
      </Box>

      {/* ── Messages area ── */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: { xs: 1.5, sm: 2 },
          py: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
        }}
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Box
                key={i}
                sx={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start' }}
              >
                <Skeleton
                  variant="rounded"
                  width={`${40 + (i * 7) % 30}%`}
                  height={44}
                  sx={{ borderRadius: 4 }}
                />
              </Box>
            ))
          : (() => {
              // Merge cached history + any live WS messages not yet in cache
              const cached = conversation?.messages ?? [];
              const cachedKeys = new Set(
                cached.map((m) => `${m.authorUsername}|${m.content}|${m.createdAt}`)
              );
              const extra = liveMessages.filter(
                (m) => !cachedKeys.has(`${m.authorUsername}|${m.content}|${m.createdAt}`)
              );
              const allMessages = [...cached, ...extra];

              return allMessages.map((msg, i) => {
                const isOwn = msg.authorUsername === username;
                return (
                  <Box
                    key={`${msg.authorUsername}-${msg.createdAt}-${i}`}
                    sx={{
                      display: 'flex',
                      justifyContent: isOwn ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: { xs: '78%', sm: '65%' },
                        px: 1.75,
                        py: 0.875,
                        borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        bgcolor: isOwn ? 'primary.main' : 'background.paper',
                        color: isOwn ? 'white' : 'text.primary',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                      }}
                    >
                      <Typography variant="body2" sx={{ wordBreak: 'break-word', lineHeight: 1.45 }}>
                        {msg.content}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          textAlign: 'right',
                          mt: 0.25,
                          opacity: 0.65,
                          fontSize: '0.62rem',
                          lineHeight: 1.2,
                        }}
                      >
                        {formatChatTime(msg.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                );
              });
            })()}
        <div ref={messagesEndRef} />
      </Box>

      {/* ── Input bar ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          px: 1.5,
          py: 1,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <TextField
          id="chat-message-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          fullWidth
          multiline
          maxRows={4}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 6,
              bgcolor: 'action.hover',
              '& fieldset': { borderColor: 'transparent' },
              '&:hover fieldset': { borderColor: 'divider' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
            },
          }}
        />
        <IconButton
          id="chat-send-button"
          onClick={handleSend}
          disabled={!input.trim() || sendMutation.isPending}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            width: 42,
            height: 42,
            flexShrink: 0,
            borderRadius: 3,
            mb: 0.25,
            '&:hover': { bgcolor: 'primary.dark' },
            '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
            transition: 'all 0.15s ease',
          }}
          aria-label="send message"
        >
          {sendMutation.isPending ? (
            <CircularProgress size={18} sx={{ color: 'white' }} />
          ) : (
            <Send fontSize="small" />
          )}
        </IconButton>
      </Box>
    </Box>
  );
}
