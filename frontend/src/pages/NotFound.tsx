// TODO: 404 Not Found Page
// Show when route doesn't exist
// Features:
// - 404 message
// - Back to dashboard
// - Search box (optional)

export default function NotFound() {
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
      <h1 style={{ fontSize: '72px', margin: '0' }}>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you're looking for doesn't exist.</p>
      <button onClick={() => window.location.href = '/dashboard'}>
        Back to Dashboard
      </button>
    </div>
  );
}
