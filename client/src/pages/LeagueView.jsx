import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socketEmit from '../socketEmit.js';

export default function LeagueView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [league, setLeague] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('fixtures');

  useEffect(() => {
    let cancelled = false;
    async function fetchLeague() {
      const result = await socketEmit('load_league', id);
      if (cancelled) return;
      if (result.ok) {
        setLeague(result.league);
        setError(null);
      } else {
        setError(result.error);
        setLeague(false);
      }
    }
    fetchLeague();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (league === false) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '20px' }}>
        <div style={{
          background: 'var(--color-error-bg)',
          color: 'var(--color-error)',
          padding: '12px 16px',
          borderRadius: '10px',
          fontSize: '0.95rem',
          fontWeight: 600,
          textAlign: 'center',
        }}>
          {error}
        </div>
        <button
          onClick={() => navigate('/league')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-primary)',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '4px 0',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ← Back
        </button>
      </div>
    );
  }

  if (league === null) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>Loading...</span>
      </div>
    );
  }

  const seasonInfo = league.config.num_seasons === null
    ? `Season ${league.state.current_season} (Unlimited)`
    : `Season ${league.state.current_season} of ${league.config.num_seasons}`;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
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
            padding: '4px 0',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ← Back
        </button>
        <h1 style={{
          flex: 1,
          textAlign: 'center',
          margin: 0,
          fontSize: '1.2rem',
          fontWeight: 800,
          color: 'var(--color-text-primary)',
        }}>
          {league.name}
        </h1>
      </div>

      <div style={{ textAlign: 'center', padding: '10px 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        {seasonInfo}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setActiveTab('fixtures')}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'fixtures' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'fixtures' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Fixtures
        </button>
        <button
          onClick={() => setActiveTab('standings')}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'standings' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'standings' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Standings
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
        {activeTab === 'fixtures' ? (
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>
            Fixture generation coming in Phase 5
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>
            Standings will appear once matches are played
          </span>
        )}
      </div>
    </div>
  );
}
