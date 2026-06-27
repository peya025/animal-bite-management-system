import {
  InlineLabel,
  InlineLoader,
  LoaderBar,
  LoaderBox,
  LoaderLabel,
  LoaderOverlay,
} from './Loader.styles';

interface LoaderProps {
  /** Full-screen overlay loader (default: false — renders inline) */
  fullscreen?: boolean;
  /** Optional label shown below the bar */
  label?: string;
}

export default function Loader({ fullscreen = false, label }: LoaderProps) {
  if (fullscreen) {
    return (
      <LoaderOverlay role="status" aria-label={label ?? 'Loading'}>
        <LoaderBox>
          <LoaderBar />
          {label && <LoaderLabel>{label}</LoaderLabel>}
        </LoaderBox>
      </LoaderOverlay>
    );
  }

  return (
    <InlineLoader role="status" aria-label={label ?? 'Loading'}>
      <LoaderBar />
      {label && <InlineLabel>{label}</InlineLabel>}
    </InlineLoader>
  );
}
