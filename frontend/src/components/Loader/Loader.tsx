import './Loader.css';

interface LoaderProps {
  /** Full-screen overlay loader (default: false — renders inline) */
  fullscreen?: boolean;
  /** Optional label shown below the bar */
  label?: string;
}

export default function Loader({ fullscreen = false, label }: LoaderProps) {
  if (fullscreen) {
    return (
      <div className="loader-overlay" role="status" aria-label={label ?? 'Loading'}>
        <div className="loader-box">
          <span className="loader" />
          {label && <p className="loader-label">{label}</p>}
        </div>
      </div>
    );
  }

  return (
    <span className="loader-inline" role="status" aria-label={label ?? 'Loading'}>
      <span className="loader" />
      {label && <span className="loader-label-inline">{label}</span>}
    </span>
  );
}
