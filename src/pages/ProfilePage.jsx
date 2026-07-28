import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  IconButton,
  Typography,
  Avatar,
  TextField,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Skeleton,
  Divider,
} from '@mui/material';
import { ArrowBack, Edit, Logout } from '@mui/icons-material';
import { getProfile, updateProfile } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { getInitials, stringToColor } from '../utils/formatters';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { username, logout } = useAuth();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', about: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  useEffect(() => {
    if (profile) {
      setForm({ name: profile.name ?? '', email: profile.email ?? '', about: profile.about ?? '' });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setEditing(false);
      setSnackbar({ open: true, message: 'Profile updated', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to update profile', severity: 'error' });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const avatarColor = stringToColor(username ?? '');

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/')} id="profile-back-button" aria-label="go back">
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" fontWeight={600}>
            Profile
          </Typography>
        </Box>
        <IconButton
          id="profile-edit-button"
          onClick={() => setEditing((v) => !v)}
          sx={{ color: editing ? '#111' : 'inherit' }}
          aria-label="edit profile"
        >
          <Edit />
        </IconButton>
      </Box>

      <Box sx={{ p: 3, maxWidth: 480, mx: 'auto' }}>
        {/* Avatar section */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          {isLoading ? (
            <Skeleton variant="circular" width={96} height={96} sx={{ mx: 'auto', mb: 1 }} />
          ) : (
            <Avatar
              sx={{
                bgcolor: avatarColor,
                width: 96,
                height: 96,
                fontSize: 36,
                fontWeight: 700,
                mx: 'auto',
                mb: 1,
                boxShadow: 3,
              }}
            >
              {getInitials(profile?.name || username)}
            </Avatar>
          )}
          <Typography variant="h6" fontWeight={700}>
            {isLoading ? <Skeleton width={120} sx={{ mx: 'auto' }} /> : (profile?.name || username)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            @{username}
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Form fields */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={56} sx={{ borderRadius: 2 }} />
            ))
          ) : (
            <>
              <TextField
                id="profile-name"
                label="Display Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                disabled={!editing}
                fullWidth
              />
              <TextField
                id="profile-email"
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                disabled={!editing}
                fullWidth
              />
              <TextField
                id="profile-about"
                label="About"
                value={form.about}
                onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))}
                disabled={!editing}
                multiline
                rows={3}
                fullWidth
              />
            </>
          )}
        </Box>

        {editing && (
          <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => { setEditing(false); }}
              sx={{
                borderRadius: 4,
                borderColor: '#111',
                color: '#111',
                '&:hover': { borderColor: '#333', bgcolor: 'rgba(0,0,0,0.04)' },
              }}
            >
              Cancel
            </Button>
            <Button
              id="profile-save-button"
              variant="contained"
              fullWidth
              onClick={handleSave}
              disabled={updateMutation.isPending}
              sx={{
                borderRadius: 4,
                bgcolor: '#111',
                '&:hover': { bgcolor: '#333' },
              }}
            >
              {updateMutation.isPending ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Save'}
            </Button>
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Logout */}
        <Button
          id="logout-button"
          variant="outlined"
          color="error"
          fullWidth
          startIcon={<Logout />}
          onClick={handleLogout}
          sx={{ borderRadius: 4 }}
        >
          Sign out
        </Button>
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
