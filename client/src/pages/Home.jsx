import React from 'react';
import { useNavigate } from 'react-router-dom';

const ICON_SIZE = 160;

function IconButton({ children, label, onClick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', userSelect: 'none' }}>
      <button
        onClick={onClick}
        style={{
          width: ICON_SIZE,
          height: ICON_SIZE,
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'var(--color-icon-bg)',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {children}
      </button>
      <span style={{
        color: 'var(--color-text-primary)',
        fontSize: '1rem',
        fontWeight: 700,
      }}>
        {label}
      </span>
    </div>
  );
}

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
      gap: '40px',
    }}>
      <h1 style={{
        color: 'var(--color-primary)',
        fontSize: '2rem',
        fontWeight: 800,
        margin: 0,
        letterSpacing: '-0.5px',
      }}>
        TT League
      </h1>
      <IconButton label="League" onClick={() => navigate('/league')}>
        <img src="/paddle.png" alt="League" style={{ width: '100%', height: '100%', display: 'block' }} />
      </IconButton>
      <IconButton label="Scoreboard" onClick={() => navigate('/scoreboard')}>
        <span role="img" aria-label="Scoreboard" style={{ fontSize: '6rem', lineHeight: 1 }}>🏆</span>
      </IconButton>
    </div>
  );
}

export default Home;
