import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/system';

const slideIn = keyframes`
  from { transform: translateX(-8px) scaleX(0.88); opacity: 0; }
  60%  { transform: translateX(2px) scaleX(1.04); opacity: 1; }
  to   { transform: translateX(0) scaleX(1); opacity: 1; }
`;

export default function EasyChatLogo({ variant = 'h5', sx = {} }) {
  return (
    <Typography
      variant={variant}
      component="span"
      sx={{
        fontWeight: 800,
        letterSpacing: '-0.5px',
        display: 'inline-flex',
        alignItems: 'center',
        lineHeight: 1,
        userSelect: 'none',
        ...sx,
      }}
    >
      {/* "Easy" — black pill, bounce slide-in only */}
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          bgcolor: '#111',
          color: '#fff',
          px: '7px',
          py: '1px',
          borderRadius: '6px',
          mr: '3px',
          animation: `${slideIn} 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
        }}
      >
        Easy
      </Box>

      {/* "Chat" — plain black */}
      <Box component="span" sx={{ color: '#111' }}>
        Chat
      </Box>
    </Typography>
  );
}
