export default function EmptyState({ icon, title, hint }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      padding: '48px 20px',
      textAlign: 'center',
    }}>
      <span style={{ fontSize: '3rem' }}>{icon}</span>
      <h3 style={{
        margin: 0,
        fontSize: '1.1rem',
        fontWeight: 700,
        color: 'var(--color-text-primary)',
      }}>
        {title}
      </h3>
      {hint && (
        <p style={{
          margin: 0,
          fontSize: '0.9rem',
          color: 'var(--color-text-secondary)',
          maxWidth: '280px',
        }}>
          {hint}
        </p>
      )}
    </div>
  );
}
