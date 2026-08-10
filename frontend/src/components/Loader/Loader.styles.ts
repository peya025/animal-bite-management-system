import { keyframes, styled } from '@mui/material/styles';

const circleAnim = keyframes`
  0% {
    top: 24px;
    height: 3px;
    border-radius: 25px 25px 12px 12px;
    transform: scaleX(1.7);
  }

  40% {
    height: 10px;
    border-radius: 50%;
    transform: scaleX(1);
  }

  100% {
    top: 0%;
  }
`;

const shadowAnim = keyframes`
  0% {
    transform: scaleX(1.5);
  }

  40% {
    transform: scaleX(1);
    opacity: .7;
  }

  100% {
    transform: scaleX(.2);
    opacity: .4;
  }
`;

export const LoaderWrapper = styled('div')({
  width: 100,
  height: 35,
  position: 'relative',
  zIndex: 1,
  display: 'inline-block',
  margin: '0 auto',
});

export const LoaderCircle = styled('div')<{ delay?: string; left?: string; right?: string }>(({ delay, left, right }) => ({
  width: 10,
  height: 10,
  position: 'absolute',
  borderRadius: '50%',
  backgroundColor: '#10b981', // Medical primary green matching the system
  left: left || '15%',
  right: right || 'auto',
  transformOrigin: '50%',
  animation: `${circleAnim} .5s alternate infinite ease`,
  animationDelay: delay || '0s',
}));

export const LoaderShadow = styled('div')<{ delay?: string; left?: string; right?: string }>(({ delay, left, right }) => ({
  width: 10,
  height: 2,
  borderRadius: '50%',
  backgroundColor: 'rgba(0, 0, 0, 0.15)', // Clean, soft shadow
  position: 'absolute',
  top: 30,
  transformOrigin: '50%',
  zIndex: -1,
  left: left || '15%',
  right: right || 'auto',
  filter: 'blur(1px)',
  animation: `${shadowAnim} .5s alternate infinite ease`,
  animationDelay: delay || '0s',
}));

export const LoaderOverlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(2, 20, 17, 0.45)', // Custom ambient medical green overlay backdrop
  backdropFilter: 'blur(12px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
});

export const LoaderBox = styled('div')({
  background: '#ffffff',
  borderRadius: 24,
  padding: '36px 48px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 16,
  minWidth: 200,
  boxShadow: '0 24px 64px rgba(16, 185, 129, 0.12)',
  border: '1px solid rgba(16, 185, 129, 0.15)',
});

export const LoaderLabel = styled('p')({
  fontSize: 12,
  fontWeight: 700,
  color: '#1e293b',
  margin: 0,
  textAlign: 'center',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
});

