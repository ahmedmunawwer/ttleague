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

const BTN_ACTION = {
  padding: '14px',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  border: '1.5px solid var(--color-border)',
  borderRadius: '10px',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'left',
  WebkitTapHighlightColor: 'transparent',
};

const ICON_BTN = {
  width: '44px',
  height: '44px',
  background: 'var(--color-border)',
  color: 'var(--color-text-primary)',
  border: 'none',
  borderRadius: '10px',
  fontSize: '1.2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
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

function getBadgeStyle(status) {
  if (status === 'in_progress') {
    return { background: 'var(--color-badge-in-progress-bg)', color: 'var(--color-badge-in-progress-text)' };
  }
  if (status === 'terminated') {
    return { background: 'var(--color-badge-terminated-bg)', color: 'var(--color-badge-terminated-text)' };
  }
  return { background: 'var(--color-badge-completed-bg)', color: 'var(--color-badge-completed-text)' };
}

function getBadgeLabel(status) {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'terminated') return 'Terminated';
  return 'Completed';
}

export default function LeagueInfoModal({ league, onClose, enableEditMode, navigate }) {
  const [action, setAction] = useState(null);
  const [newName, setNewName] = useState(league.name);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function cancelAction() {
    setAction(null);
    setError(null);
  }

  async function handleRename() {
    const trimmed = newName.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      setError('Name must be between 3 and 20 characters');
      return;
    }
    setLoading(true);
    const ack = await socketEmit('rename_league', league.id, trimmed);
    if (ack.ok) {
      onClose();
    } else {
      setError(ack.error);
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    const ack = await socketEmit('delete_league', league.id);
    if (ack.ok) {
      onClose();
    } else {
      setError(ack.error);
      setLoading(false);
    }
  }

  const badgeStyle = getBadgeStyle(league.status);

  return (
    <div style={BACKDROP} onClick={onClose}>
      <div style={CARD} onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 style={{ margin: '0 0 8px', color: 'var(--color-text-primary)', fontSize: '1.3rem', fontWeight: 800 }}>
            {league.name}
          </h2>
          <span style={{
            ...badgeStyle,
            padding: '3px 10px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'inline-block',
          }}>
            {getBadgeLabel(league.status)}
          </span>
        </div>

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

        {action === null && (
          <>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                style={ICON_BTN}
                onClick={() => setAction('rename')}
                aria-label="Rename"
                title="Rename"
              >
                ✏️
              </button>
              <button
                style={ICON_BTN}
                onClick={() => setAction('delete')}
                aria-label="Delete"
                title="Delete"
              >
                🗑️
              </button>
            </div>
            {enableEditMode && (
              <button
                style={BTN_PRIMARY}
                onClick={() => {
                  onClose();
                  navigate(`/league/${league.id}?mode=edit`);
                }}
              >
                Edit Mode
              </button>
            )}
            <button style={BTN_SECONDARY} onClick={onClose}>
              Cancel
            </button>
          </>
        )}

        {action === 'rename' && (
          <>
            <input
              style={INPUT_STYLE}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={20}
              disabled={loading}
              autoFocus
            />
            <button
              style={{ ...BTN_PRIMARY, opacity: loading ? 0.7 : 1 }}
              onClick={handleRename}
              disabled={loading}
            >
              {loading ? 'Working...' : 'Save'}
            </button>
            <button style={BTN_SECONDARY} onClick={cancelAction} disabled={loading}>
              Cancel
            </button>
          </>
        )}

        {action === 'delete' && (
          <>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
              Delete this league? This cannot be undone.
            </p>
            <button
              style={{ ...BTN_PRIMARY, opacity: loading ? 0.7 : 1 }}
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Working...' : 'Confirm'}
            </button>
            <button style={BTN_SECONDARY} onClick={cancelAction} disabled={loading}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
