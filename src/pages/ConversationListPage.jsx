import { useState, useRef, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchProfiles } from '../services/userService';
import {
  Box,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Fab,
  IconButton,
  Badge,
  Skeleton,
  Divider,
  Drawer,
  SwipeableDrawer,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Button,
  Snackbar,
  Alert,
  Chip,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  PersonAdd,
  Close,
  Check,
} from '@mui/icons-material';
import { getConversations } from '../services/conversationService';
import { getChatRequests, sendChatRequest, updateChatRequest } from '../services/chatRequestService';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { formatChatTime, getInitials, stringToColor, truncate } from '../utils/formatters';

// ────────────────────────────────────────────────────────────
// Skeleton loader for a conversation row
// ────────────────────────────────────────────────────────────
function ConversationSkeleton() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5 }}>
      <Skeleton variant="circular" width={52} height={52} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="55%" height={20} />
        <Skeleton variant="text" width="80%" height={16} />
      </Box>
      <Skeleton variant="text" width={32} height={14} />
    </Box>
  );
}

// ────────────────────────────────────────────────────────────
// Search drawer / panel content
// ────────────────────────────────────────────────────────────
function SearchPanel({ onClose, conversations = [] }) {
  const { username: currentUser } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [sentTo, setSentTo] = useState(new Set());
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const trimmed = searchInput.trim();
  const canSearch = trimmed.length >= 3;

  // Real search against /user/profiles?query=
  const { data: results = [], isFetching, isError } = useQuery({
    queryKey: ['userSearch', trimmed],
    queryFn: () => searchProfiles(trimmed),
    enabled: canSearch,
    staleTime: 30_000,
  });

  // Filter out the current user and users already in conversations from results
  const existingConversationUsernames = new Set(
    conversations
      .filter((c) => !c.group)
      .map((c) => c.conversationName)
  );
  
  const filtered = results.filter(
    (u) => u.username !== currentUser && !existingConversationUsernames.has(u.username)
  );

  const requestMutation = useMutation({
    mutationFn: (receiverUsername) => sendChatRequest({ receiverUsername }),
    onSuccess: (_, receiverUsername) => {
      setSentTo((prev) => new Set([...prev, receiverUsername]));
      setSnackbar({ open: true, message: `Request sent to ${receiverUsername}`, severity: 'success' });
    },
    onError: (error) => {
      const msg = error?.response?.data?.message ?? 'Failed to send request';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    },
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pb: 1.5, flexShrink: 0 }}>
        <Typography variant="h6" fontWeight={700}>Find People</Typography>
        <IconButton size="small" onClick={onClose} aria-label="close search"><Close /></IconButton>
      </Box>

      {/* Search input */}
      <Box sx={{ px: 2, pb: 2, flexShrink: 0 }}>
        <TextField
          id="user-search-input"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or username…"
          fullWidth
          autoFocus
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': { borderRadius: 6, bgcolor: 'action.hover' },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: isFetching ? (
              <InputAdornment position="end">
                <CircularProgress size={16} />
              </InputAdornment>
            ) : null,
          }}
        />
        {canSearch && !isFetching && (
          <Typography variant="caption" color="text.secondary" sx={{ pl: 1, mt: 0.5, display: 'block' }}>
            {filtered.length === 0 && !isError ? 'No users found' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
          </Typography>
        )}
        {!canSearch && trimmed.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ pl: 1, mt: 0.5, display: 'block' }}>
            Type at least 3 characters to search
          </Typography>
        )}
      </Box>

      {/* Results */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
        {!canSearch ? (
          <Box sx={{ textAlign: 'center', mt: 6, color: 'text.secondary' }}>
            <SearchIcon sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
            <Typography variant="body2">Search for people to start a conversation</Typography>
          </Box>
        ) : isError ? (
          <Box sx={{ textAlign: 'center', mt: 6, color: 'text.secondary' }}>
            <Typography variant="body2">Something went wrong. Try again.</Typography>
          </Box>
        ) : filtered.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {filtered.map((user) => {
              const sent = sentTo.has(user.username);
              return (
                <Card
                  key={user.username}
                  sx={{
                    borderRadius: 3,
                    boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'box-shadow 0.15s ease',
                    '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.10)' },
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Top row: avatar + names + button */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <Avatar
                        sx={{
                          bgcolor: stringToColor(user.username),
                          width: 46,
                          height: 46,
                          fontWeight: 700,
                          fontSize: 17,
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(user.name || user.username)}
                      </Avatar>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={700} noWrap>
                          {user.name || user.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                          @{user.username}
                        </Typography>
                      </Box>

                      <Button
                        id={`send-request-${user.username}`}
                        variant={sent ? 'outlined' : 'contained'}
                        size="small"
                        startIcon={sent ? <Check fontSize="small" /> : <PersonAdd fontSize="small" />}
                        onClick={() => !sent && requestMutation.mutate(user.username)}
                        disabled={requestMutation.isPending && !sent}
                        sx={{
                          flexShrink: 0,
                          borderRadius: 4,
                          fontSize: '0.72rem',
                          px: 1.5,
                          minWidth: 80,
                          ...(sent
                            ? { borderColor: '#22c55e', color: '#16a34a' }
                            : { bgcolor: '#111', '&:hover': { bgcolor: '#333' } }),
                        }}
                      >
                        {sent ? 'Sent' : 'Add'}
                      </Button>
                    </Box>

                    {/* About */}
                    {user.about && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1, fontSize: '0.8rem', lineHeight: 1.4, pl: 7.5 }}
                      >
                        {user.about}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        ) : null}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ borderRadius: 3 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────
// Swipeable Request Item
// Mobile: drag left/right to reject/accept
// Desktop: shows inline Accept / Reject buttons
// ────────────────────────────────────────────────────────────
const SWIPE_THRESHOLD = 80;
const SWIPE_MAX = 120;

function SwipeableRequestItem({ req, onAccept, onReject, isPending }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [offsetX, setOffsetX] = useState(0);
  const startXRef = useRef(0);
  const draggingRef = useRef(false);

  const handleTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
    draggingRef.current = false;
  };

  const handleTouchMove = (e) => {
    const deltaX = e.touches[0].clientX - startXRef.current;
    if (Math.abs(deltaX) > 6) {
      draggingRef.current = true;
      // Clamp so the card doesn't fly fully off screen
      const clamped = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, deltaX));
      setOffsetX(clamped);
    }
  };

  const handleTouchEnd = () => {
    if (draggingRef.current) {
      if (offsetX >= SWIPE_THRESHOLD) {
        onAccept(req.requestId);
      } else if (offsetX <= -SWIPE_THRESHOLD) {
        onReject(req.requestId);
      }
    }
    setOffsetX(0);
    draggingRef.current = false;
  };

  const avatarColor = stringToColor(req.sender);
  const isReqPending = req.status === 'PENDING';

  const overAcceptThreshold = offsetX >= SWIPE_THRESHOLD;
  const overRejectThreshold = offsetX <= -SWIPE_THRESHOLD;

  return (
    <Box sx={{ position: 'relative', mb: 1.5, borderRadius: 3, overflow: 'hidden' }}>

      {/* ── Swipe hint background (mobile only, pending only) ── */}
      {isReqPending && !isDesktop && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 3,
            borderRadius: 3,
            bgcolor:
              offsetX > 0
                ? overAcceptThreshold
                  ? '#16a34a' // Darker green when past threshold
                  : '#4ade80' // Lighter green while dragging
                : offsetX < 0
                ? overRejectThreshold
                  ? '#dc2626' // Darker red when past threshold
                  : '#f87171' // Lighter red while dragging
                : 'transparent',
            transition: 'background-color 0.25s ease',
            color: 'white',
          }}
        >
          {/* Left side (Accept) - visible when swiping right */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              opacity: offsetX > 0 ? 1 : 0,
              transform: `scale(${overAcceptThreshold ? 1.15 : 0.9})`,
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.25)' }}>
              <Check fontSize="small" />
            </Box>
            <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: 0.5 }}>ACCEPT</Typography>
          </Box>

          {/* Right side (Reject) - visible when swiping left */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              opacity: offsetX < 0 ? 1 : 0,
              transform: `scale(${overRejectThreshold ? 1.15 : 0.9})`,
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: 0.5 }}>REJECT</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.25)' }}>
              <Close fontSize="small" />
            </Box>
          </Box>
        </Box>
      )}

      {/* ── Card foreground ── */}
      <Box
        onTouchStart={isReqPending && !isPending && !isDesktop ? handleTouchStart : undefined}
        onTouchMove={isReqPending && !isPending && !isDesktop ? handleTouchMove : undefined}
        onTouchEnd={isReqPending && !isPending && !isDesktop ? handleTouchEnd : undefined}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.5,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: isReqPending ? 'rgba(108,99,255,0.15)' : 'divider',
          transform: !isDesktop ? `translateX(${offsetX}px)` : 'none',
          transition: offsetX === 0 ? 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none',
          position: 'relative',
          zIndex: 1,
          boxShadow: isReqPending && Math.abs(offsetX) > 0 ? 6 : 1,
          borderRadius: 3,
        }}
      >
        <Avatar sx={{ bgcolor: avatarColor, width: 44, height: 44, fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
          {getInitials(req.sender)}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>{req.sender}</Typography>
          
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              transition: 'opacity 0.2s',
              opacity: Math.abs(offsetX) > 10 ? 0 : 1,
            }}
          >
            {isReqPending
              ? isDesktop
                ? 'Sent you a chat request'
                : '← Reject · Accept →'
              : 'Sent you a chat request'}
          </Typography>
        </Box>

        {/* Desktop: inline accept / reject buttons */}
        {isReqPending && isDesktop && (
          <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
            <Button
              size="small"
              variant="contained"
              disabled={isPending}
              onClick={() => onAccept(req.requestId)}
              startIcon={<Check fontSize="small" />}
              sx={{
                bgcolor: '#22c55e',
                '&:hover': { bgcolor: '#16a34a' },
                borderRadius: 3,
                fontSize: '0.72rem',
                px: 1.5,
              }}
            >
              Accept
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={isPending}
              onClick={() => onReject(req.requestId)}
              startIcon={<Close fontSize="small" />}
              sx={{
                borderColor: '#ef4444',
                color: '#ef4444',
                '&:hover': { bgcolor: 'rgba(239,68,68,0.06)', borderColor: '#dc2626' },
                borderRadius: 3,
                fontSize: '0.72rem',
                px: 1.5,
              }}
            >
              Reject
            </Button>
          </Box>
        )}

        {/* Status chip for non-pending */}
        {!isReqPending && (
          <Chip
            label={req.status}
            size="small"
            sx={{
              flexShrink: 0,
              bgcolor: req.status === 'ACCEPTED' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              color: req.status === 'ACCEPTED' ? '#16a34a' : '#dc2626',
              fontWeight: 600,
              fontSize: '0.65rem',
            }}
          />
        )}
      </Box>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────
// Notifications drawer / panel content
// ────────────────────────────────────────────────────────────

// Tiny type-to-chip config (kept local to avoid another import)
const NOTIF_TYPE_LABEL = {
  REQUEST_RECEIVED: { label: '👤 Chat request received', color: '#6c63ff' },
  REQUEST_ACCEPTED: { label: '✅ Request accepted', color: '#22c55e' },
  MESSAGE: { label: '💬 New message', color: '#0ea5e9' },
  SYSTEM: { label: 'ℹ️ System', color: '#f59e0b' },
};

function NotificationsPanel({ onClose }) {
  const { username } = useAuth();
  const queryClient = useQueryClient();
  const { notifications, clearBadge } = useNotifications();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Clear badge the moment this panel is opened
  useEffect(() => { clearBadge(); }, [clearBadge]);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['chatRequests'],
    queryFn: getChatRequests,
    // No polling — STOMP REQUEST_RECEIVED/REQUEST_ACCEPTED notifications trigger invalidation
  });

  const updateMutation = useMutation({
    mutationFn: updateChatRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRequests'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to update request', severity: 'error' });
    },
  });

  const pendingRequests = requests.filter((r) => r.receiver === username);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pb: 1.5, flexShrink: 0 }}>
        <Typography variant="h6" fontWeight={700}>Notifications</Typography>
        <IconButton size="small" onClick={onClose} aria-label="close notifications"><Close /></IconButton>
      </Box>

      <Divider sx={{ flexShrink: 0 }} />

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pt: 1.5 }}>

        {/* ── Real-time STOMP notifications ── */}
        {notifications.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 1, display: 'block', mb: 1 }}>
              Recent
            </Typography>
            {notifications.map((notif, idx) => {
              const meta = NOTIF_TYPE_LABEL[notif.type] ?? NOTIF_TYPE_LABEL.SYSTEM;
              return (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    p: 1.25,
                    mb: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: meta.color,
                      flexShrink: 0,
                      mt: 0.75,
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" fontWeight={600} sx={{ display: 'block', color: meta.color }}>
                      {meta.label}
                    </Typography>
                    {notif.type === 'MESSAGE' ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        New message from{' '}
                        <strong>
                          {notif._conversationName ?? (notif._conversationId ? `Conversation #${notif._conversationId}` : 'a conversation')}
                        </strong>
                      </Typography>
                    ) : notif.payload ? (
                      <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                        {notif.payload}
                      </Typography>
                    ) : null}

                  </Box>
                </Box>
              );
            })}
            <Divider sx={{ mb: 2 }} />
          </Box>
        )}

        {/* ── Chat requests ── */}
        <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 1, display: 'block', mb: 1 }}>
          Chat Requests
        </Typography>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={64} sx={{ borderRadius: 3, mb: 1.5 }} />
          ))
        ) : pendingRequests.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
            <NotificationsIcon sx={{ fontSize: 40, opacity: 0.2, mb: 1 }} />
            <Typography variant="body2">No pending requests</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {pendingRequests.map((req) => {
              const isPend = req.status === 'PENDING';
              const avatarColor = stringToColor(req.sender);
              return (
                <Box
                  key={req.requestId}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: isPend ? 'rgba(108,99,255,0.18)' : 'divider',
                    borderRadius: 3,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}
                >
                  <Avatar sx={{ bgcolor: avatarColor, width: 42, height: 42, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                    {getInitials(req.sender)}
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap>{req.sender}</Typography>
                    <Typography variant="caption" color="text.secondary">Sent you a chat request</Typography>
                  </Box>

                  {isPend ? (
                    <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ requestId: req.requestId, requestStatus: 'ACCEPTED' })}
                        startIcon={<Check fontSize="small" />}
                        sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' }, borderRadius: 2.5, fontSize: '0.72rem', px: 1.5, minWidth: 0 }}
                      >
                        Accept
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ requestId: req.requestId, requestStatus: 'REJECTED' })}
                        startIcon={<Close fontSize="small" />}
                        sx={{ borderColor: '#ef4444', color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.06)', borderColor: '#dc2626' }, borderRadius: 2.5, fontSize: '0.72rem', px: 1.5, minWidth: 0 }}
                      >
                        Reject
                      </Button>
                    </Box>
                  ) : (
                    <Chip
                      label={req.status}
                      size="small"
                      sx={{
                        flexShrink: 0,
                        bgcolor: req.status === 'ACCEPTED' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        color: req.status === 'ACCEPTED' ? '#16a34a' : '#dc2626',
                        fontWeight: 600,
                        fontSize: '0.65rem',
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ borderRadius: 3 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}


// ────────────────────────────────────────────────────────────
// Draggable bottom drawer — opens at 75vh, drag to 100vh
// Strategy: Paper is always 100vh; translateY controls how much shows.
// 25% translateY = 75vh visible (default). 0% = full screen.
// Uses plain Drawer so MUI never intercepts our touch events.
// ────────────────────────────────────────────────────────────
function DraggableBottomDrawer({ open, onClose, children }) {
  const DEFAULT_Y = 25; // 75vh visible by default

  const [translateY, setTranslateY] = useState(DEFAULT_Y);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);
  const touchStartTranslate = useRef(DEFAULT_Y);

  useEffect(() => {
    if (open) setTranslateY(DEFAULT_Y);
  }, [open]);

  const handleTouchStart = (e) => {
    e.stopPropagation();
    touchStartY.current = e.touches[0].clientY;
    touchStartTranslate.current = translateY;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    e.stopPropagation();
    const deltaY = e.touches[0].clientY - touchStartY.current;
    const deltaPct = (deltaY / window.innerHeight) * 100;
    const next = touchStartTranslate.current + deltaPct;
    setTranslateY(Math.max(0, Math.min(35, next)));
  };

  const handleTouchEnd = (e) => {
    e.stopPropagation();
    setIsDragging(false);
    if (translateY >= 30) {
      onClose();
      setTranslateY(DEFAULT_Y);
    } else if (translateY <= 12) {
      setTranslateY(0);
    } else {
      setTranslateY(DEFAULT_Y);
    }
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          height: '100vh',
          borderTopLeftRadius: translateY === 0 ? 0 : 20,
          borderTopRightRadius: translateY === 0 ? 0 : 20,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transform: `translateY(${translateY}%) !important`,
          transition: isDragging
            ? 'none !important'
            : 'transform 0.3s cubic-bezier(0.4,0,0.2,1), border-radius 0.2s ease',
        },
      }}
    >
      {/* Drag handle — touchAction:none prevents scroll conflicts */}
      <Box
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        sx={{
          width: '100%',
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: 'grab',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <Box sx={{ width: 44, height: 5, bgcolor: 'action.disabled', borderRadius: 3 }} />
      </Box>

      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
    </Drawer>
  );
}


// ────────────────────────────────────────────────────────────
// Main: Conversation list
// ────────────────────────────────────────────────────────────
export default function ConversationListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { username } = useAuth();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { badgeCount, clearBadge, unreadCounts } = useNotifications();

  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Open notifications panel and clear bell badge
  const handleOpenNotif = () => {
    setNotifOpen(true);
    clearBadge();
  };

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    // No polling — refreshed by MESSAGE/REQUEST_ACCEPTED notifications via STOMP
  });

  // Bell: number for REQUEST_RECEIVED, dot for any unread messages
  const bellBadge = badgeCount;
  const hasAnyMessageUnread = Object.values(unreadCounts).some((c) => c > 0);

  const isInChat = location.pathname.startsWith('/chat/');

  // ── Sidebar conversation list ─────────────────────────────
  const SidebarContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: isDesktop ? '1px solid' : 'none',
        borderColor: 'divider',
      }}
    >
      {/* App Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          pt: 2,
          pb: 1.5,
          flexShrink: 0,
        }}
      >
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{ color: '#111', letterSpacing: -0.5 }}
        >
          EasyChat
        </Typography>

        {/* Both mobile + desktop: profile avatar in top bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {isDesktop && (
            <IconButton
              id="nav-search"
              onClick={() => setSearchOpen(true)}
              aria-label="search users"
              size="small"
              sx={{ color: '#111' }}
            >
              <SearchIcon />
            </IconButton>
          )}
          <IconButton
            id="nav-profile"
            onClick={() => navigate('/profile')}
            aria-label="profile"
            size="small"
            sx={{ p: 0.5 }}
          >
            <Avatar
              sx={{
                bgcolor: stringToColor(username ?? ''),
                width: 32,
                height: 32,
                fontSize: 13,
                fontWeight: 700,
                transition: 'transform 0.15s ease',
                '&:hover': { transform: 'scale(1.08)' },
              }}
            >
              {getInitials(username)}
            </Avatar>
          </IconButton>
        </Box>
      </Box>

      {/* Section label */}
      <Box sx={{ px: 2, pb: 1, flexShrink: 0 }}>
        <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 1 }}>
          Messages
        </Typography>
      </Box>

      {/* Conversation list */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Box key={i}>
              <ConversationSkeleton />
              {i < 5 && <Divider component="li" variant="inset" sx={{ ml: 9 }} />}
            </Box>
          ))
        ) : conversations.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 10, color: 'text.secondary', px: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              No conversations yet
            </Typography>
            <Typography variant="body2">
              Search for people and send a chat request to get started.
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {conversations.map((conv, index) => {
              const avatarColor = stringToColor(conv.conversationName ?? '');
              // Merge server unseenCount with local client-side unread counter
              const localUnread = unreadCounts[String(conv.id)] ?? 0;
              const totalUnread = Math.max(conv.unseenCount ?? 0, localUnread);
              const hasUnread = totalUnread > 0;
              return (
                <Box key={conv.id}>
                  <ListItemButton
                    id={`conversation-${conv.id}`}
                    onClick={() => navigate(`/chat/${conv.id}`)}
                    selected={location.pathname === `/chat/${conv.id}`}
                    sx={{
                      px: 2,
                      py: 1,
                      '&:hover': { bgcolor: 'rgba(108,99,255,0.05)' },
                      '&.Mui-selected': {
                        bgcolor: 'rgba(108,99,255,0.08)',
                        '&:hover': { bgcolor: 'rgba(108,99,255,0.1)' },
                      },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 64 }}>
                      <Avatar
                        sx={{
                          bgcolor: avatarColor,
                          width: 50,
                          height: 50,
                          fontWeight: 700,
                          fontSize: 19,
                        }}
                      >
                        {getInitials(conv.conversationName)}
                      </Avatar>
                    </ListItemAvatar>

                    <ListItemText
                      sx={{ my: 0 }}
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
                          <Typography
                            variant="subtitle2"
                            fontWeight={hasUnread ? 700 : 500}
                            noWrap
                            sx={{ flex: 1, color: 'text.primary' }}
                          >
                            {conv.conversationName}
                          </Typography>
                          <Typography
                            variant="caption"
                            color={hasUnread ? 'primary.main' : 'text.secondary'}
                            fontWeight={hasUnread ? 600 : 400}
                            sx={{ flexShrink: 0 }}
                          >
                            {formatChatTime(conv.lastMessageAt)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="body2"
                            color={hasUnread ? 'text.primary' : 'text.secondary'}
                            fontWeight={hasUnread ? 500 : 400}
                            noWrap
                            sx={{ flex: 1, fontSize: '0.82rem' }}
                          >
                            {truncate(conv.lastMessage, 40) || 'No messages yet'}
                          </Typography>
                          {/* Unread badge */}
                          {hasUnread && (
                            <Box
                              sx={{
                                flexShrink: 0,
                                minWidth: 20,
                                height: 20,
                                px: 0.75,
                                borderRadius: 10,
                                bgcolor: '#ef4444',
                                color: 'white',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 1px 4px rgba(239,68,68,0.4)',
                              }}
                            >
                              {totalUnread > 99 ? '99+' : totalUnread}
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                  {index < conversations.length - 1 && (
                    <Divider component="li" variant="inset" sx={{ ml: 9 }} />
                  )}
                </Box>
              );
            })}
          </List>
        )}
      </Box>

      {/* Mobile bottom bar: notifications left + search/add right */}
      {!isDesktop && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            flexShrink: 0,
            minHeight: 60,
          }}
        >
          {/* Notifications — bottom left */}
          <Badge
            badgeContent={bellBadge || undefined}
            variant={bellBadge > 0 ? 'standard' : hasAnyMessageUnread ? 'dot' : 'standard'}
            color="error"
            overlap="circular"
            invisible={bellBadge === 0 && !hasAnyMessageUnread}
          >
            <IconButton
              id="fab-notifications-mobile"
              onClick={handleOpenNotif}
              aria-label="notifications"
              sx={{
                bgcolor: '#111',
                color: 'white',
                width: 44,
                height: 44,
                borderRadius: 2,
                '&:hover': { bgcolor: '#333', transform: 'scale(1.05)' },
                transition: 'all 0.15s ease',
              }}
            >
              <NotificationsIcon fontSize="small" />
            </IconButton>
          </Badge>

          {/* Search / Add conversation — bottom right */}
          <IconButton
            id="nav-search-mobile"
            onClick={() => setSearchOpen(true)}
            aria-label="find people"
            sx={{
              bgcolor: '#111',
              color: 'white',
              width: 44,
              height: 44,
              borderRadius: 2,
              '&:hover': { bgcolor: '#333', transform: 'scale(1.05)' },
              transition: 'all 0.15s ease',
            }}
          >
            <SearchIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );

  return (
    <Box
      sx={{
        height: '100dvh',
        display: 'flex',
        bgcolor: 'background.default',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {/* ── Desktop: sidebar + main pane ── */}
      {isDesktop ? (
        <>
          {/* Sidebar — flush to left edge */}
          <Box
            sx={{
              width: 340,
              flexShrink: 0,
              height: '100%',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid',
              borderColor: 'divider',
            }}
          >
            {SidebarContent}

            {/* Notifications FAB — absolute inside sidebar, bottom-left */}
            <Badge
              badgeContent={bellBadge || undefined}
              variant={bellBadge > 0 ? 'standard' : hasAnyMessageUnread ? 'dot' : 'standard'}
              color="error"
              overlap="circular"
              invisible={bellBadge === 0 && !hasAnyMessageUnread}
              sx={{
                position: 'absolute',
                bottom: 20,
                left: 20,
              }}
            >
              <Fab
                id="fab-notifications"
                aria-label="notifications"
                onClick={handleOpenNotif}
                size="medium"
                sx={{
                  bgcolor: '#111',
                  color: 'white',
                  '&:hover': { bgcolor: '#333', transform: 'scale(1.05)' },
                  boxShadow: 3,
                  transition: 'all 0.15s ease',
                }}
              >
                <NotificationsIcon />
              </Fab>
            </Badge>
          </Box>

          {/* Main chat area */}
          <Box
            sx={{
              flex: 1,
              height: '100%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: isInChat ? 'background.default' : 'background.default',
            }}
          >
            {isInChat ? (
              <Outlet />
            ) : (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary',
                  gap: 1,
                  userSelect: 'none',
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1,
                  }}
                >
                  <Typography sx={{ fontSize: 38 }}>💬</Typography>
                </Box>
                <Typography variant="h6" fontWeight={600} color="text.primary">Open a conversation</Typography>
                <Typography variant="body2">Select a chat from the sidebar to start messaging</Typography>
              </Box>
            )}
          </Box>

          {/* Desktop: notification side panel (slide from right) */}
          <Drawer
            anchor="right"
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            PaperProps={{
              sx: {
                width: 360,
                borderLeft: '1px solid',
                borderColor: 'divider',
                borderRadius: 0,
              },
            }}
          >
            <NotificationsPanel onClose={() => setNotifOpen(false)} />
          </Drawer>

          {/* Desktop: search side panel */}
          <Drawer
            anchor="right"
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            PaperProps={{
              sx: {
                width: 360,
                borderLeft: '1px solid',
                borderColor: 'divider',
                borderRadius: 0,
              },
            }}
          >
            <SearchPanel onClose={() => setSearchOpen(false)} conversations={conversations} />
          </Drawer>
        </>
      ) : (
        /* ── Mobile: show list OR chat (not both) ── */
        isInChat ? (
          // Full-screen chat on mobile
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Outlet />
          </Box>
        ) : (
          // Full-screen conversation list
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            {SidebarContent}

            {/* Controls are in the bottom bar — no floating FAB on mobile */}

            {/* Search bottom drawer — draggable, default 75vh, can expand to full screen */}
            <DraggableBottomDrawer open={searchOpen} onClose={() => setSearchOpen(false)}>
              <SearchPanel onClose={() => setSearchOpen(false)} conversations={conversations} />
            </DraggableBottomDrawer>

            {/* Notifications bottom drawer — draggable, default 75vh, can expand to full screen */}
            <DraggableBottomDrawer open={notifOpen} onClose={() => setNotifOpen(false)}>
              <NotificationsPanel onClose={() => setNotifOpen(false)} />
            </DraggableBottomDrawer>
          </Box>
        )
      )}
    </Box>
  );
}
