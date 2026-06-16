import React, { useState } from 'react';
import socketEmit from '../socketEmit.js';

const BACKDROP = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  padding: '16px',
};

const CARD = {
  background: 'var(--color-surface)',
  borderRadius: '16px',
  padding: '24px',
  width: '100%',
  maxWidth: '480px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  maxHeight: '90vh',
  overflowY: 'auto',
};

const INPUT_STYLE = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid var(--color-border)',
  borderRadius: '8px',
  fontSize: '1rem',
  color: 'var(--color-text-primary)',
  background: 'var(--color-background)',
  boxSizing: 'border-box',
};

const BTN_PRIMARY = {
  padding: '12px',
  background: 'var(--color-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  fontSize: '1rem',
  fontWeight: 700,
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
};

const BTN_SECONDARY = {
  padding: '12px',
  background: 'none',
  color: 'var(--color-text-secondary)',
  border: '1.5px solid var(--color-border)',
  borderRadius: '10px',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
};

const COUNTER_BTN = {
  width: '36px',
  height: '36px',
  border: '1.5px solid var(--color-border)',
  borderRadius: '8px',
  background: 'var(--color-surface)',
  fontSize: '1.2rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  WebkitTapHighlightColor: 'transparent',
};

function padPlayers(prev, next) {
  return prev.slice(0, next).concat(Array(Math.max(0, next - prev.length)).fill(''));
}

export default function CreateLeagueStub({ onClose }) {
  const [name, setName] = useState('');
  const [numPlayers, setNumPlayers] = useState(4);
  const [players, setPlayers] = useState(['', '', '', '']);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function changeNumPlayers(delta) {
    setNumPlayers((prev) => {
      const next = Math.min(12, Math.max(2, prev + delta));
      setPlayers((p) => padPlayers(p, next));
      return next;
    });
  }

  function updatePlayerAt(i) {
    return (e) => {
      const val = e.target.value;
      setPlayers((prev) => {
        const next = [...prev];
        next[i] = val;
        return next;
      });
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 3 || trimmedName.length > 20) {
      setError('Name must be between 3 and 20 characters');
      return;
    }
    if (players.some((p) => p.trim().length < 1)) {
      setError('Each player needs a name');
      return;
    }

    setLoading(true);
    const ack = await socketEmit('create_league', {
      name: trimmedName,
      num_players: numPlayers,
      players: players.map((p) => p.trim()),
      points_per_win: 1,
      round_robin_freq: 1,
      num_seasons: null,
      game_point: 10,
    });

    if (ack.ok) {
      onClose();
    } else {
      setError(ack.error);
      setLoading(false);
    }
  }

  return (
    <div style={BACKDROP} onClick={onClose}>
      <div style={CARD} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: '1.3rem', fontWeight: 800 }}>
          Create League
        </h2>

        {error && (
          <div style={{
            background: 'var(--color-error-bg)',
            color: 'var(--color-error)',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              League name
            </label>
            <input
              style={INPUT_STYLE}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer 2025"
              maxLength={20}
              disabled={loading}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Number of players
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button type="button" style={COUNTER_BTN} onClick={() => changeNumPlayers(-1)} disabled={loading}>−</button>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>
                {numPlayers}
              </span>
              <button type="button" style={COUNTER_BTN} onClick={() => changeNumPlayers(1)} disabled={loading}>+</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Player names
            </label>
            {players.map((p, i) => (
              <input
                key={i}
                style={INPUT_STYLE}
                type="text"
                value={p}
                onChange={updatePlayerAt(i)}
                placeholder={`Player ${i + 1}`}
                maxLength={20}
                disabled={loading}
              />
            ))}
          </div>

          <button type="submit" style={{ ...BTN_PRIMARY, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Creating...' : 'Create League'}
          </button>
          <button type="button" style={BTN_SECONDARY} onClick={onClose} disabled={loading}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
