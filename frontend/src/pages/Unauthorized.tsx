// TODO: Unauthorized Access Page
// Show when user tries to access restricted page
// Features:
// - Error message
// - Back to dashboard button
// - Role requirement info

export default function Unauthorized() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '72px', margin: '0' }}>🚫</h1>
      <h2>Unauthorized Access</h2>
      <p>You don't have permission to access this page.</p>
      <button onClick={() => window.location.href = '/dashboard'}>
        Back to Dashboard
      </button>
    </div>
  );
}
