import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Box, Typography, TextField, Button, Link, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { register, login } from '../services/authService';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { saveAuth } = useAuth();
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [validationError, setValidationError] = useState('');

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: async (_data, variables) => {
      // Registration returns a success message, NOT a JWT.
      // We must log in immediately to get a real token.
      const loginData = await login({ username: variables.username, password: variables.password });
      saveAuth(loginData);
      navigate('/', { replace: true });
    },
  });

  const handleChange = (e) => {
    setValidationError('');
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }
    mutation.mutate({ username: form.username, password: form.password });
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
      }}
    >
      {/* Brand */}
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: '#111',
          mb: 5,
          letterSpacing: '-0.5px',
        }}
      >
        EasyChat
      </Typography>

      {/* Card */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: '100%',
          maxWidth: 340,
          bgcolor: '#e8e8e8',
          borderRadius: 3,
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        {(validationError || mutation.isError) && (
          <Alert severity="error" sx={{ borderRadius: 2, py: 0.5, fontSize: '0.8rem' }}>
            {validationError || mutation.error?.response?.data?.message || 'Registration failed'}
          </Alert>
        )}

        <TextField
          id="register-username"
          name="username"
          placeholder="username..."
          value={form.username}
          onChange={handleChange}
          required
          autoFocus
          fullWidth
          variant="outlined"
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#f5f5f5',
              borderRadius: 2,
              fontSize: '0.9rem',
              '& fieldset': { border: 'none' },
            },
            '& input::placeholder': { color: '#888', opacity: 1 },
          }}
        />

        <TextField
          id="register-password"
          name="password"
          type="password"
          placeholder="password..."
          value={form.password}
          onChange={handleChange}
          required
          fullWidth
          variant="outlined"
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#f5f5f5',
              borderRadius: 2,
              fontSize: '0.9rem',
              '& fieldset': { border: 'none' },
            },
            '& input::placeholder': { color: '#888', opacity: 1 },
          }}
        />

        <TextField
          id="register-confirm-password"
          name="confirmPassword"
          type="password"
          placeholder="confirm password..."
          value={form.confirmPassword}
          onChange={handleChange}
          required
          fullWidth
          variant="outlined"
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#f5f5f5',
              borderRadius: 2,
              fontSize: '0.9rem',
              '& fieldset': { border: 'none' },
            },
            '& input::placeholder': { color: '#888', opacity: 1 },
          }}
        />

        <Box sx={{ textAlign: 'center', mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            already have an account?{' '}
            <Link
              component={RouterLink}
              to="/login"
              sx={{ color: '#333', fontWeight: 600, textDecoration: 'underline' }}
            >
              sign in
            </Link>
          </Typography>
        </Box>

        <Button
          id="register-submit"
          type="submit"
          fullWidth
          disabled={mutation.isPending}
          sx={{
            bgcolor: '#111',
            color: '#fff',
            borderRadius: 50,
            py: 1.2,
            fontWeight: 700,
            fontSize: '1rem',
            textTransform: 'lowercase',
            letterSpacing: '0.5px',
            '&:hover': { bgcolor: '#333' },
            '&.Mui-disabled': { bgcolor: '#555', color: '#aaa' },
          }}
        >
          {mutation.isPending ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'sign up'}
        </Button>
      </Box>
    </Box>
  );
}
