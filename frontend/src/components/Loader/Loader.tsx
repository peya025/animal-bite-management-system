import {
  LoaderWrapper,
  LoaderCircle,
  LoaderShadow,
  LoaderOverlay,
  LoaderBox,
  LoaderLabel,
} from './Loader.styles';

interface LoaderProps {
  /** Full-screen overlay loader (default: false — renders inline) */
  fullscreen?: boolean;
  /** Optional label shown below the loader animation */
  label?: string;
}

export default function Loader({ fullscreen = false, label }: LoaderProps) {
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <LoaderWrapper>
        <LoaderCircle />
        <LoaderCircle left="45%" delay=".2s" />
        <LoaderCircle left="auto" right="15%" delay=".3s" />
        
        <LoaderShadow />
        <LoaderShadow left="45%" delay=".2s" />
        <LoaderShadow left="auto" right="15%" delay=".3s" />
      </LoaderWrapper>
      {label && <LoaderLabel>{label}</LoaderLabel>}
    </div>
  );

  if (fullscreen) {
    return (
      <LoaderOverlay role="status" aria-label={label ?? 'Loading'}>
        <LoaderBox>
          {content}
        </LoaderBox>
      </LoaderOverlay>
    );
  }

  return (
    <div 
      role="status" 
      aria-label={label ?? 'Loading'} 
      style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '24px 0' }}
    >
      {content}
    </div>
  );
}
