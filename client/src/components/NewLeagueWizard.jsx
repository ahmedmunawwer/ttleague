import React, { useState } from 'react';
import socketEmit from '../socketEmit.js';
import Counter from './Counter.jsx';
import NamePicker from './NamePicker.jsx';
import EditPresetsModal from './EditPresetsModal.jsx';

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

const LABEL = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
};

const UNLIMITED_LABEL = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '0.9rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
};

function padPlayers(prev, next) {
  return prev.slice(0, next).concat(Array(Math.max(0, next - prev.length)).fill(''));
}

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={LABEL}>{label}</span>
      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{value}</span>
    </div>
  );
}

export default function NewLeagueWizard({ onClose }) {
  const [name, setName] = useState('');
  const [numPlayers, setNumPlayers] = useState(4);
  const [players, setPlayers] = useState(['', '', '', '']);
  const [pointsPerWin, setPointsPerWin] = useState(1);
  const [roundRobinFreq, setRoundRobinFreq] = useState(1);
  const [unlimitedSeasons, setUnlimitedSeasons] = useState(true);
  const [seasonsCount, setSeasonsCount] = useState(1);
  const [gamePoint, setGamePoint] = useState(10);
  const [screen, setScreen] = useState('form');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showEditPresets, setShowEditPresets] = useState(false);

  const numSeasons = unlimitedSeasons ? null : seasonsCount;

  function changeNumPlayers(next) {
    const clamped = Math.min(12, Math.max(2, next));
    setNumPlayers(clamped);
    setPlayers((prev) => padPlayers(prev, clamped));
  }

  function updatePlayerAt(i, val) {
    setPlayers((prev) => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  }

  function toggleUnlimited() {
    setUnlimitedSeasons((prev) => {
      const next = !prev;
      if (!next) setSeasonsCount(1);
      return next;
    });
  }

  function validate() {
    const trimmedName = name.trim();
    if (trimmedName.length < 3 || trimmedName.length > 20) {
      return 'League name must be between 3 and 20 characters';
    }
    const trimmedPlayers = players.map((p) => p.trim());
    if (trimmedPlayers.some((p) => p.length < 1 || p.length > 20)) {
      return 'Each player needs a name (1-20 characters)';
    }
    const unique = new Set(trimmedPlayers.map((p) => p.toLowerCase()));
    if (unique.size !== trimmedPlayers.length) {
      return 'Player names must be unique';
    }
    if (!Number.isInteger(numPlayers) || numPlayers < 2 || numPlayers > 12) {
      return 'Number of players must be between 2 and 12';
    }
    if (!Number.isInteger(pointsPerWin) || pointsPerWin < 1) {
      return 'Points per win must be at least 1';
    }
    if (!Number.isInteger(roundRobinFreq) || roundRobinFreq < 1) {
      return 'Round robin frequency must be at least 1';
    }
    if (numSeasons !== null && (!Number.isInteger(numSeasons) || numSeasons < 1)) {
      return 'Number of seasons must be at least 1';
    }
    if (!Number.isInteger(gamePoint) || gamePoint < 5) {
      return 'Game point must be at least 5';
    }
    return null;
  }

  const validationError = validate();
  const canReview = validationError === null;

  async function handleCreate() {
    setError(null);
    setLoading(true);
    const ack = await socketEmit('create_league', {
      name: name.trim(),
      num_players: numPlayers,
      players: players.map((p) => p.trim()),
      points_per_win: pointsPerWin,
      round_robin_freq: roundRobinFreq,
      num_seasons: numSeasons,
      game_point: gamePoint,
    });
    if (ack.ok) {
      onClose();
    } else {
      setError(ack.error);
      setLoading(false);
      setScreen('form');
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

        {screen === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={LABEL}>League name</span>
              <input
                style={INPUT_STYLE}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Summer 2025"
                maxLength={20}
              />
            </div>

            <Counter label="Number of players" value={numPlayers} onChange={changeNumPlayers} min={2} max={12} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={LABEL}>Players</span>
              {players.map((p, i) => (
                <NamePicker
                  key={i}
                  label={`Player ${i + 1}`}
                  value={p}
                  onChange={(val) => updatePlayerAt(i, val)}
                  excludeNames={players.filter((_, idx) => idx !== i).map((x) => x.trim()).filter(Boolean)}
                  onEditPresets={() => setShowEditPresets(true)}
                />
              ))}
            </div>

            <Counter label="Points per win" value={pointsPerWin} onChange={setPointsPerWin} min={1} />
            <Counter label="Round robin frequency" value={roundRobinFreq} onChange={setRoundRobinFreq} min={1} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={LABEL}>Number of seasons</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ opacity: unlimitedSeasons ? 0.5 : 1 }}>
                  <Counter
                    value={seasonsCount}
                    onChange={setSeasonsCount}
                    min={unlimitedSeasons ? seasonsCount : 1}
                    max={unlimitedSeasons ? seasonsCount : 999}
                  />
                </div>
                <label style={UNLIMITED_LABEL}>
                  <input type="checkbox" checked={unlimitedSeasons} onChange={toggleUnlimited} style={{ width: '20px', height: '20px' }} />
                  Unlimited
                </label>
              </div>
            </div>

            <Counter label="Game point" value={gamePoint} onChange={setGamePoint} min={5} />

            <button
              style={{ ...BTN_PRIMARY, opacity: canReview ? 1 : 0.5 }}
              onClick={() => setScreen('confirm')}
              disabled={!canReview}
            >
              Review
            </button>
            <button style={BTN_SECONDARY} onClick={onClose}>
              Cancel
            </button>
          </div>
        )}

        {screen === 'confirm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <SummaryRow label="League name" value={name.trim()} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={LABEL}>Players</span>
              {players.map((p, i) => (
                <span key={i} style={{ fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                  {i + 1}. {p.trim()}
                </span>
              ))}
            </div>

            <SummaryRow label="Points per win" value={pointsPerWin} />
            <SummaryRow label="Round robin frequency" value={roundRobinFreq} />
            <SummaryRow label="Seasons" value={numSeasons === null ? 'Unlimited' : numSeasons} />
            <SummaryRow label="Game point" value={gamePoint} />

            <button style={{ ...BTN_PRIMARY, opacity: loading ? 0.7 : 1 }} onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </button>
            <button style={BTN_SECONDARY} onClick={() => setScreen('form')} disabled={loading}>
              ← Back to edit
            </button>
          </div>
        )}

        {showEditPresets && <EditPresetsModal onClose={() => setShowEditPresets(false)} />}
      </div>
    </div>
  );
}
