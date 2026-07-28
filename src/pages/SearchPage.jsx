import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  Box,
  IconButton,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  Snackbar,
  Alert,
  Skeleton,
  InputAdornment,
} from '@mui/material';
import { ArrowBack, Search as SearchIcon, PersonAdd } from '@mui/icons-material';
import { sendChatRequest } from '../services/chatRequestService';
import { getInitials, stringToColor } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

/**
 * Search page note:
 * The openapi.json does NOT expose a user search endpoint.
 * This page shows a search UI but search results will require a backend endpoint.
 * Currently the search input is captured and a POST /user/chat/request is made
 * directly by username (the user types the exact username and sends a request).
 * If a search endpoint is added later, update searchUsers in userService.js.
 */

function UserCard({ username: targetUsername, about, onRequest, isPending, sent }) {
  const avatarColor = stringToColor(targetUsername);
  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: 2,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
      }}
    >
      <CardContent sx={{ textAlign: 'center', p: 2.5 }}>
        <Avatar
          sx={{
            bgcolor: avatarColor,
            width: 64,
            height: 64,
            fontSize: 24,
            fontWeight: 700,
            mx: 'auto',
            mb: 1.5,
          }}
        >
          {getInitials(targetUsername)}
        </Avatar>
        <Typography variant="subtitle2" fontWeight={700} noWrap>
          {targetUsername}
        </Typography>
        {about && (
          <Typography variant="caption" color="text.secondary" display="block" mb={1.5} sx={{ mt: 0.5 }}>
            {about}
          </Typography>
        )}
        <Button
          id={`send-request-${targetUsername}`}
          variant="contained"
          size="small"
          startIcon={<PersonAdd fontSize="small" />}
          onClick={() => onRequest(targetUsername)}
          disabled={isPending || sent}
          sx={{
            mt: 1,
            bgcolor: sent ? '#22c55e' : 'primary.main',
            '&:hover': { bgcolor: sent ? '#16a34a' : 'primary.light' },
            borderRadius: 4,
            fontSize: '0.75rem',
          }}
        >
          {sent ? 'Sent' : 'Send request'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SearchPage() {
  const navigate = useNavigate();
  const { username: currentUser } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [sentTo, setSentTo] = useState(new Set());
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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

  const handleRequest = useCallback(
    (receiverUsername) => { requestMutation.mutate(receiverUsername); },
    [requestMutation],
  );

  // Direct-send by username: show the typed username as a result card
  const trimmed = searchInput.trim();
  const showResult = trimmed.length > 0 && trimmed !== currentUser;

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
        <IconButton onClick={() => navigate('/')} id="search-back-button" aria-label="go back">
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" fontWeight={600}>
          Find People
        </Typography>
      </Box>

      <Box sx={{ p: 2, flex: 1 }}>
        {/* Search bar */}
        <TextField
          id="user-search-input"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search on EasyChat…"
          fullWidth
          autoFocus
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        {showResult && (
          <>
            <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ mb: 1.5, display: 'block' }}>
              RESULTS
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4} md={3}>
                <UserCard
                  username={trimmed}
                  about={null}
                  onRequest={handleRequest}
                  isPending={requestMutation.isPending}
                  sent={sentTo.has(trimmed)}
                />
              </Grid>
            </Grid>
          </>
        )}

        {!showResult && searchInput.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 8, color: 'text.secondary' }}>
            <SearchIcon sx={{ fontSize: 56, opacity: 0.2, mb: 1 }} />
            <Typography variant="body2">Type a username to find someone</Typography>
          </Box>
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ borderRadius: 3 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
