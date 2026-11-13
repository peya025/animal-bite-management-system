import { useEffect, useState } from 'react';
import api from '../services/api';

/** Authenticated image fetch: never exposes tokens in an image URL. */
export default function SignatureImage({ endpoint, onReady, style, silentFallback }: {
  endpoint: string;
  onReady?: (ready: boolean) => void;
  style?: React.CSSProperties;
  silentFallback?: boolean;
}) {
  const [image, setImage] = useState<{ endpoint: string; url: string } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const reader = new FileReader();
    setFailed(false);
    onReady?.(false);
    api.get(endpoint, { responseType: 'blob' }).then(response => {
      if (!active) return;
      reader.onload = () => { if (active) setImage({ endpoint, url: String(reader.result) }); };
      reader.onerror = () => { if (active) setFailed(true); };
      reader.readAsDataURL(response.data);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; if (reader.readyState === FileReader.LOADING) reader.abort(); };
  }, [endpoint, onReady]);

  if (failed) return silentFallback ? null : <span>Signature preview unavailable.</span>;
  if (!image || image.endpoint !== endpoint) return silentFallback ? null : <span>Loading signature…</span>;
  return <img src={image.url} alt="Staff signature" onLoad={() => onReady?.(true)}
    onError={() => { setFailed(true); onReady?.(false); }}
    style={{ display: 'block', maxWidth: 200, maxHeight: 85, objectFit: 'contain', background: '#fff', margin: '0 auto', ...style }} />;
}
