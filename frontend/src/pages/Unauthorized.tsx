import { ROUTES } from '../shared/config/routes';

export default function Unauthorized() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      textAlign: 'center',
      padding: '20px',
    }}>
      <h1 style={{ fontSize: '72px', margin: '0' }}>🚫</h1>
      <h2>Unauthorized Access</h2>
      <p>You don't have permission to access this page.</p>
      <button onClick={() => window.location.href = ROUTES.DASHBOARD}>
        Back to Dashboard
      </button>
    </div>
  );
}
