export default function NotFound() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <a href="/" style={{
        display: 'inline-block',
        marginTop: '1rem',
        padding: '0.5rem 1rem',
        backgroundColor: '#1a74e8',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '4px'
      }}>
        Go to Homepage
      </a>
    </div>
  );
}