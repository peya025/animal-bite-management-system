import { keyframes, styled } from '@mui/material/styles';

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

export interface ButtonSpinnerProps {
  size?: number;
  color?: string;
  thickness?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const ButtonSpinner = styled('span', {
  shouldForwardProp: (prop) => prop !== 'size' && prop !== 'color' && prop !== 'thickness',
})<ButtonSpinnerProps>(({ size = 15, color, thickness = 2.2 }) => ({
  width: size,
  height: size,
  border: `${thickness}px solid ${color || 'currentColor'}`,
  borderTopColor: 'transparent',
  borderRadius: '50%',
  display: 'inline-block',
  animation: `${spin} 0.65s linear infinite`,
  flexShrink: 0,
  verticalAlign: 'middle',
  boxSizing: 'border-box',
  opacity: 0.9,
}));

export default ButtonSpinner;
