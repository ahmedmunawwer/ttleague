import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-background)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      gap: '16px',
    }}>
      <h1 style={{
        color: 'var(--color-primary)',
        fontSize: '2rem',
        fontWeight: 800,
        margin: '0 0 24px',
        letterSpacing: '-0.5px',
      }}>
        TT League
      </h1>

      <button
        onClick={() => navigate('/league')}
        style={{
          width: '100%',
          maxWidth: '320px',
          padding: '20px',
          background: 'var(--color-primary)',
          color: 'var(--color-surface)',
          border: 'none',
          borderRadius: '14px',
          fontSize: '1.1rem',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        League
      </button>

      <button
        onClick={() => navigate('/scoreboard')}
        style={{
          width: '100%',
          maxWidth: '320px',
          padding: '20px',
          background: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
          border: '2px solid var(--color-border)',
          borderRadius: '14px',
          fontSize: '1.1rem',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Scoreboard
      </button>
    </div>
  );
}

export default Home;
