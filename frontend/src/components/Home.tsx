import { useState } from 'react';
import { Box, Button, Typography, Container } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import LoadingBar from './LoadingBar';
import cursorIcon from '../assets/cursor_v2_icon.png';

const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
  background: 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)',
  color: '#ffffff',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at center, rgba(96, 239, 255, 0.1) 0%, rgba(0, 255, 135, 0.05) 100%)',
    pointerEvents: 'none'
  }
}));

const Logo = styled('img')({
  width: '120px',
  height: '120px',
  marginBottom: '2rem',
  filter: 'drop-shadow(0 0 20px rgba(96, 239, 255, 0.3))'
});

const Title = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  fontSize: '3.5rem',
  fontWeight: 'bold',
  background: 'linear-gradient(90deg, #00ff87 0%, #60efff 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  textShadow: '0 0 30px rgba(96, 239, 255, 0.3)'
}));

const Subtitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(6),
  fontSize: '1.5rem',
  maxWidth: '600px',
  color: 'rgba(255, 255, 255, 0.8)'
}));

const GetStartedButton = styled(Button)(({ theme }) => ({
  padding: '15px 40px',
  fontSize: '1.2rem',
  borderRadius: '30px',
  background: 'linear-gradient(90deg, #00ff87 0%, #60efff 100%)',
  color: '#1e1e1e',
  fontWeight: 'bold',
  '&:hover': {
    background: 'linear-gradient(90deg, #00ff87 20%, #60efff 120%)',
    transform: 'translateY(-2px)',
    boxShadow: '0 0 30px rgba(96, 239, 255, 0.3)'
  },
  transition: 'all 0.3s ease'
}));

const Home = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = () => {
    setIsLoading(true);
    // Add a small delay to show the loading animation
    setTimeout(() => {
      navigate('/app');
    }, 500);
  };

  return (
    <StyledContainer maxWidth={false}>
      {isLoading && <LoadingBar />}
      <Logo src={cursorIcon} alt="Cursor V2 Logo" />
      <Title variant="h1">
        Welcome to Cursor V2
      </Title>
      <Subtitle variant="h5">
        Experience the next iteration of frontend development with our AI-powered platform
      </Subtitle>
      <GetStartedButton 
        variant="contained"
        onClick={handleGetStarted}
        disabled={isLoading}
      >
        {isLoading ? 'Loading...' : 'Let\'s Get Started'}
      </GetStartedButton>
    </StyledContainer>
  );
};

export default Home; 