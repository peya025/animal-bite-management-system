import { useRef, useState } from 'react';
import SignatureImage from '../../../shared/components/SignatureImage';

export default function SignatureUpload({ staffName, userId, existingPath, value, removed, onChange }: {
  staffName: string;
  userId?: number;
  existingPath?: string;
  value?: string;
  removed?: boolean;
  onChange: (data: string, removed: boolean) => void;
}) {
  const [error, setError] = useState('');
  const revision = useRef(0);
  return <fieldset style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 14 }}>
    <legend>Electronic signature (optional)</legend>
    <p style={{ margin: '0 0 10px' }}>Signature for <strong>{staffName || 'this staff member'}</strong>. Upload an image supplied by them. They will confirm it when signing a treatment.</p>
    <label>
      PNG or JPG, up to 2 MB
      <input type="file" accept="image/png,image/jpeg" aria-label="Upload optional signature"
        style={{ display: 'block', margin: '8px 0' }} onChange={async event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          const current = ++revision.current;
          setError('');
          if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 2 * 1024 * 1024) {
            setError('Choose a PNG or JPG image no larger than 2 MB.'); return;
          }
          try {
            const data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            if (revision.current === current) onChange(data, false);
          } catch { setError('Unable to read the image. Please try again.'); }
        }} />
    </label>
    {value ? <img src={value} alt="New signature preview" style={{ maxWidth: 240, maxHeight: 100, background: '#fff' }} />
      : existingPath && userId && !removed ? <SignatureImage endpoint={`/users/${userId}/signature?version=${encodeURIComponent(existingPath)}`} />
      : <p>{removed ? 'Signature will be removed for future use.' : 'No signature. You can save without one.'}</p>}
    {(value || (existingPath && !removed)) && <button type="button" style={{ display: 'block', marginTop: 8 }}
      onClick={() => { revision.current++; onChange('', Boolean(existingPath)); }}>Remove signature</button>}
    {removed && <button type="button" onClick={() => onChange('', false)}>Keep existing signature</button>}
    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
  </fieldset>;
}
