import React, { useState, useEffect } from 'react';
import socket from '../socket.js';
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
  flexShrink: 0,
};

export default function EditPresetsModal({ onClose }) {
  const [presets, setPresets] = useState(null);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchPresets() {
      const result = await socketEmit('list_presets');
      if (cancelled) return;
      if (result.ok) {
        setPresets(result.presets);
      } else {
        setError(result.error);
      }
    }
    fetchPresets();
    socket.on('presets_changed', fetchPresets);
    return () => {
      cancelled = true;
      socket.off('presets_changed', fetchPresets);
    };
  }, []);

  async function handleAdd() {
    const trimmed = newName.trim();
    if (trimmed.length < 1 || trimmed.length > 20) {
      setError('Name must be between 1 and 20 characters');
      return;
    }
    setLoading('add');
    const ack = await socketEmit('add_preset', trimmed);
    if (ack.ok) {
      setNewName('');
      setError(null);
    } else {
      setError(ack.error);
    }
    setLoading(null);
  }

  async function handleRemove(id) {
    setLoading(`remove:${id}`);
    const ack = await socketEmit('remove_preset', id);
    if (ack.ok) {
      setError(null);
    } else {
      setError(ack.error);
    }
    setLoading(null);
  }

  return (
    <div style={BACKDROP} onClick={onClose}>
      <div style={CARD} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: '1.3rem', fontWeight: 800 }}>
          Manage Presets
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

        {presets === null && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
            Loading...
          </div>
        )}

        {presets !== null && presets.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
            No presets yet. Add some below.
          </div>
        )}

        {presets !== null && presets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {presets.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ flex: 1, fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                  {p.name}
                </span>
                <button
                  style={ICON_BTN}
                  onClick={() => handleRemove(p.id)}
                  disabled={loading === `remove:${p.id}`}
                  aria-label="Delete"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ borderTop: '1.5px solid var(--color-border)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            style={INPUT_STYLE}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New preset name"
            maxLength={20}
            disabled={loading === 'add'}
          />
          <button
            style={{ ...BTN_PRIMARY, opacity: loading === 'add' ? 0.7 : 1 }}
            onClick={handleAdd}
            disabled={loading === 'add'}
          >
            {loading === 'add' ? 'Adding...' : 'Add'}
          </button>
        </div>

        <button style={BTN_SECONDARY} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
