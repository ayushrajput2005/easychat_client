import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  IconButton,
  Typography,
  Avatar,
  Button,
  CircularProgress,
  Divider,
  Chip,
  Snackbar,
  Alert,
  Skeleton,
} from '@mui/material';
import { ArrowBack, Check, Close } from '@mui/icons-material';
import { getChatRequests, updateChatRequest } from '../services/chatRequestService';
import { useAuth } from '../context/AuthContext';
import { getInitials, stringToColor, formatChatTime } from '../utils/formatters';

function RequestItem({ request, currentUser, onAccept, onReject, isPending }) {
  const isIncoming = request.receiver === currentUser;
  const otherUser = isIncoming ? request.sender : request.receiver;
  const avatarColor = stringToColor(otherUser);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        bgcolor: 'background.paper',
        borderRadius: 3,
        mb: 1,
        boxShadow: 1,
      }}
    >
      <Avatar sx={{ bgcolor: avatarColor, width: 44, height: 44, fontWeight: 700 }}>
        {getInitials(otherUser)}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" fontWeight={600} noWrap>
          {otherUser}
        </Typography>
        <Chip
          label={isIncoming ? 'Incoming' : 'Sent'}
          size="small"
          sx={{
            height: 18,
            fontSize: '0.65rem',
            mt: 0.5,
            bgcolor: isIncoming ? 'rgba(108, 99, 255, 0.1)' : 'rgba(107, 114, 128, 0.1)',
            color: isIncoming ? 'secondary.main' : 'text.secondary',
          }}
        />
      </Box>
      {isIncoming && request.status === 'PENDING' && (
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <IconButton
            id={`accept-request-${request.requestId}`}
            onClick={() => onAccept(request.requestId)}
            disabled={isPending}
            size="small"
            sx={{ bgcolor: '#22c55e', color: 'white', '&:hover': { bgcolor: '#16a34a' }, width: 32, height: 32 }}
            aria-label="accept request"
          >
            <Check fontSize="small" />
          </IconButton>
          <IconButton
            id={`reject-request-${request.requestId}`}
            onClick={() => onReject(request.requestId)}
            disabled={isPending}
            size="small"
            sx={{ bgcolor: '#ef4444', color: 'white', '&:hover': { bgcolor: '#dc2626' }, width: 32, height: 32 }}
            aria-label="reject request"
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
      )}
      {(!isIncoming || request.status !== 'PENDING') && (
        <Chip
          label={request.status}
          size="small"
          sx={{
            bgcolor:
              request.status === 'ACCEPTED' ? 'rgba(34, 197, 94, 0.1)' :
              request.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.1)' :
              'rgba(245, 158, 11, 0.1)',
            color:
              request.status === 'ACCEPTED' ? '#16a34a' :
              request.status === 'REJECTED' ? '#dc2626' :
              '#d97706',
            fontWeight: 600,
            fontSize: '0.65rem',
          }}
        />
      )}
    </Box>
  );
}

export default function ChatRequestsPage() {
  const navigate = useNavigate();
  const { username } = useAuth();
  const queryClient = useQueryClient();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['chatRequests'],
    queryFn: getChatRequests,
    // No polling — invalidated by REQUEST_RECEIVED/REQUEST_ACCEPTED via STOMP
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

  const handleAccept = (requestId) =>
    updateMutation.mutate({ requestId, requestStatus: 'ACCEPTED' });
  const handleReject = (requestId) =>
    updateMutation.mutate({ requestId, requestStatus: 'REJECTED' });

  const incoming = requests.filter((r) => r.receiver === username);
  const sent = requests.filter((r) => r.sender === username);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
        <IconButton onClick={() => navigate('/')} id="requests-back-button" aria-label="go back">
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" fontWeight={600}>
          Chat Requests
        </Typography>
      </Box>

      <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 3, mb: 1 }} />
          ))
        ) : (
          <>
            {incoming.length > 0 && (
              <>
                <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
                  Incoming ({incoming.length})
                </Typography>
                {incoming.map((r) => (
                  <RequestItem
                    key={r.requestId}
                    request={r}
                    currentUser={username}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    isPending={updateMutation.isPending}
                  />
                ))}
                {sent.length > 0 && <Divider sx={{ my: 2 }} />}
              </>
            )}

            {sent.length > 0 && (
              <>
                <Typography variant="overline" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
                  Sent ({sent.length})
                </Typography>
                {sent.map((r) => (
                  <RequestItem
                    key={r.requestId}
                    request={r}
                    currentUser={username}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    isPending={updateMutation.isPending}
                  />
                ))}
              </>
            )}

            {requests.length === 0 && (
              <Box sx={{ textAlign: 'center', mt: 8, color: 'text.secondary' }}>
                <Typography variant="body2">No chat requests yet</Typography>
              </Box>
            )}
          </>
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
