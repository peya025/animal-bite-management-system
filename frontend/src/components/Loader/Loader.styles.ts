import { keyframes, styled } from '@mui/material/styles';

const grow = keyframes`
  0% { width: 0; }
  100% { width: 100%; }
`;

const sparkDown = keyframes`
  0% { transform: rotate(-45deg) translateX(0); opacity: 0.7; }
  100% { transform: rotate(-45deg) translateX(-45px); opacity: 0; }
`;

const sparkUp = keyframes`
  0% { transform: rotate(45deg) translateX(0); opacity: 1; }
  100% { transform: rotate(45deg) translateX(-45px); opacity: 0.7; }
`;

export const LoaderBar = styled('span')({
  width: 0,
  height: 4.8,
  display: 'inline-block',
  position: 'relative',
  background: '#54f98d',
  boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
  boxSizing: 'border-box',
  animation: `${grow} 8s linear infinite`,

  '&::after, &::before': {
    content: '""',
    width: 10,
    height: 1,
    background: '#fff',
    position: 'absolute',
    top: 9,
    right: -2,
    opacity: 0,
    transform: 'rotate(-45deg) translateX(0)',
    boxSizing: 'border-box',
    animation: `${sparkDown} 0.3s linear infinite`,
  },

  '&::before': {
    top: -4,
    transform: 'rotate(45deg)',
    animation: `${sparkUp} 0.3s linear infinite`,
  },
});

export const InlineLoader = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',

  [`& ${LoaderBar}`]: {
    flex: 1,
    minWidth: 60,
  },
});

export const InlineLabel = styled('span')({
  fontSize: 14,
  fontWeight: 600,
  color: 'inherit',
  whiteSpace: 'nowrap',
});

export const LoaderOverlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.45)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
});

export const LoaderBox = styled('div')({
  background: '#ffffff',
  borderRadius: 16,
  padding: '36px 40px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 20,
  minWidth: 220,
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',

  [`& ${LoaderBar}`]: {
    width: 0,
    minWidth: 0,
    alignSelf: 'stretch',
  },
});

export const LoaderLabel = styled('p')({
  fontSize: 14,
  fontWeight: 600,
  color: '#374151',
  margin: 0,
  textAlign: 'center',
});
