import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  IconButton,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  NotificationsNone,
  PersonAdd,
  CheckCircleOutlined,
  Message as MessageIcon,
  InfoOutlined,
} from '@mui/icons-material';
import { useNotifications } from '../context/NotificationContext';
import { getInitials, stringToColor } from '../utils/formatters';

// Map each NotificationType to a human-readable label, icon and colour
const TYPE_META = {
  REQUEST_RECEIVED: {
    label: 'Chat request received',
    icon: PersonAdd,
    color: '#6c63ff',
    chipLabel: 'Request',
  },
  REQUEST_ACCEPTED: {
    label: 'Chat request accepted',
    icon: CheckCircleOutlined,
    color: '#22c55e',
    chipLabel: 'Accepted',
  },
  MESSAGE: {
    label: 'New message',
    icon: MessageIcon,
    color: '#0ea5e9',
    chipLabel: 'Message',
  },
  SYSTEM: {
    label: 'System notification',
    icon: InfoOutlined,
    color: '#f59e0b',
    chipLabel: 'System',
  },
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, clearBadge, clearAll } = useNotifications();

  // Clear badge when the user opens this page
  useEffect(() => { clearBadge(); }, [clearBadge]);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          p: 1.5,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/')} id="notifications-back-button" aria-label="go back">
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" fontWeight={600}>
            Notifications
          </Typography>
        </Box>
        {notifications.length > 0 && (
          <Typography
            variant="caption"
            onClick={() => { clearAll(); clearBadge(); }}
            sx={{ pr: 1, cursor: 'pointer', color: 'text.secondary', '&:hover': { color: 'error.main' } }}
          >
            Clear all
          </Typography>
        )}
      </Box>

      <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
        {notifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 8, color: 'text.secondary' }}>
            <NotificationsNone sx={{ fontSize: 48, opacity: 0.25, mb: 1 }} />
            <Typography variant="body2">No notifications yet</Typography>
            <Typography variant="caption" color="text.disabled">
              You'll see requests, messages, and system alerts here.
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {notifications.map((notif, idx) => {
              const meta = TYPE_META[notif.type] ?? TYPE_META.SYSTEM;
              const IconComp = meta.icon;
              const avatarBg = notif.recipientUsername
                ? stringToColor(notif.recipientUsername)
                : meta.color;

              return (
                <ListItem
                  key={idx}
                  id={`notification-item-${idx}`}
                  sx={{
                    mb: 1.5,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 4,
                    px: 2,
                    py: 1.5,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    alignItems: 'flex-start',
                    gap: 1,
                  }}
                  disablePadding
                >
                  <ListItemAvatar sx={{ minWidth: 52 }}>
                    <Avatar
                      sx={{
                        bgcolor: avatarBg,
                        width: 40,
                        height: 40,
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      {notif.recipientUsername
                        ? getInitials(notif.recipientUsername)
                        : <IconComp fontSize="small" />}
                    </Avatar>
                  </ListItemAvatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>
                        {meta.label}
                      </Typography>
                      <Chip
                        label={meta.chipLabel}
                        size="small"
                        icon={<IconComp style={{ fontSize: 12 }} />}
                        sx={{
                          height: 18,
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          bgcolor: `${meta.color}18`,
                          color: meta.color,
                          '& .MuiChip-icon': { color: meta.color, ml: 0.5 },
                          '& .MuiChip-label': { px: 0.75 },
                        }}
                      />
                    </Box>
                    {/* For MESSAGE type show the conversation name; for others show raw payload */}
                    {notif.type === 'MESSAGE' ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        New message from{' '}
                        <strong>
                          {notif._conversationName ?? (notif._conversationId ? `Conversation #${notif._conversationId}` : 'unknown chat')}
                        </strong>
                      </Typography>
                    ) : notif.payload ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', wordBreak: 'break-word' }}>
                        {notif.payload}
                      </Typography>
                    ) : null}

                  </Box>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
}
