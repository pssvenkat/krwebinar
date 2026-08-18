import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-background)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>🌱</div>
      <h1
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-3xl)',
          fontWeight: 800,
          color: 'var(--color-text)',
          marginBottom: 'var(--space-3)',
        }}
      >
        Page Not Found
      </h1>
      <p
        style={{
          color: 'var(--color-muted)',
          fontSize: 'var(--text-lg)',
          marginBottom: 'var(--space-8)',
          maxWidth: 400,
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-3) var(--space-6)',
          background: 'var(--color-primary)',
          color: 'white',
          borderRadius: 'var(--radius-full)',
          fontWeight: 600,
          fontSize: 'var(--text-sm)',
          textDecoration: 'none',
        }}
      >
        ← Back to Home
      </Link>
    </div>
  )
}
