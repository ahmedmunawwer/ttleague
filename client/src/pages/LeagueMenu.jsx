import React from 'react';
import { useNavigate } from 'react-router-dom';

function LeagueMenu() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-background)',
      padding: '24px',
    }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-primary)',
          fontSize: '1rem',
          fontWeight: 700,
          cursor: 'pointer',
          marginBottom: '16px',
          padding: 0,
        }}
      >
        ← Back
      </button>

      <h1 style={{
        color: 'var(--color-text-primary)',
        fontSize: '1.5rem',
        fontWeight: 800,
        margin: 0,
      }}>
        Leagues
      </h1>
    </div>
  );
}

export default LeagueMenu;
