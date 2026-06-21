import React, { useState } from 'react';
import socketEmit from '../socketEmit.js';
import Counter from './Counter.jsx';

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
  flex: 1,
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
  flex: 1,
};

export default function SettingsModal({ league, onSave, onCancel }) {
  const [numTables, setNumTables] = useState(league.state.num_tables);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const hasChanges = numTables !== league.state.num_tables;
  const saveDisabled = loading || !hasChanges;

  async function handleSave() {
    setLoading(true);
    setError(null);
    const result = await socketEmit('change_num_tables', league.id, numTables);
    if (result.ok) {
      onSave(result.league);
    } else {
      setError(result.error || 'Failed to update tables');
      setLoading(false);
    }
  }

  return (
    <div style={BACKDROP} onClick={onCancel}>
      <div style={CARD} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: '1.3rem', fontWeight: 800 }}>
          Settings
        </h2>

        <Counter
          value={numTables}
          onChange={setNumTables}
          min={1}
          max={6}
          label="Number of Tables"
        />

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

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button
            style={BTN_SECONDARY}
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            style={{ ...BTN_PRIMARY, opacity: saveDisabled ? 0.5 : 1 }}
            onClick={handleSave}
            disabled={saveDisabled}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
