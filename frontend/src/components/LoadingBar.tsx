import { LinearProgress } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledLinearProgress = styled(LinearProgress)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 9999,
  height: 3,
  '& .MuiLinearProgress-bar': {
    background: 'linear-gradient(90deg, #00ff87 0%, #60efff 100%)',
  },
}));

const LoadingBar = () => {
  return <StyledLinearProgress />;
};

export default LoadingBar; 