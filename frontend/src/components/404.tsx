import { useNavigate } from 'react-router-dom';
import { Button, Box, Typography, Container } from '@mui/material';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#fff',
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              height: { xs: 250, sm: 350, md: 400 },
              backgroundImage: 'url(https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif)',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'contain',
              position: 'relative',
            }}
          >
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '4rem', sm: '5rem', md: '6rem' },
                fontWeight: 700,
                color: '#000',
                pt: { xs: 3, sm: 4 },
              }}
            >
              404
            </Typography>
          </Box>

          <Box sx={{ mt: -6 }}>
            <Typography
              variant="h4"
              sx={{
                fontSize: { xs: '1.5rem', sm: '2rem' },
                fontWeight: 700,
                color: '#000',
                mb: 2,
              }}
            >
              Look like you're lost
            </Typography>
            <Typography sx={{ mb: 3, color: '#000' }}>
              The page you are looking for is not available!
            </Typography>

            <Button
              variant="contained"
              onClick={() => navigate('/')}
              sx={{
                my: 2,
                bgcolor: '#10b981',
                '&:hover': { bgcolor: '#059669' },
                textTransform: 'none',
                px: 4,
                py: 1.5,
              }}
            >
              Go to Home
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
