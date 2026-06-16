import React, { useState, useEffect } from 'react';
import socket from '../socket.js';
import socketEmit from '../socketEmit.js';

const CLOSED_ROW = {
  padding: '12px 14px',
  borderRadius: '8px',
  border: '1.5px solid var(--color-border)',
  background: 'var(--color-surface)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  minHeight: '44px',
  boxSizing: 'border-box',
};

const DROPDOWN = {
  border: '1.5px solid var(--color-border)',
  borderRadius: '8px',
  background: 'var(--color-surface)',
  maxHeight: '240px',
  overflowY: 'auto',
};

const DROPDOWN_ROW = {
  padding: '12px 14px',
  fontSize: '1rem',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  borderBottom: '1px solid var(--color-border)',
  minHeight: '44px',
  display: 'flex',
  alignItems: 'center',
  boxSizing: 'border-box',
};

const INPUT_STYLE = {
  flex: 1,
  padding: '10px 12px',
  border: '1.5px solid var(--color-border)',
  borderRadius: '8px',
  fontSize: '1rem',
  color: 'var(--color-text-primary)',
  background: 'var(--color-background)',
  boxSizing: 'border-box',
};

const BTN_SMALL = {
  padding: '10px 16px',
  border: 'none',
  borderRadius: '8px',
  fontSize: '0.95rem',
  fontWeight: 700,
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  minHeight: '44px',
};

export default function NamePicker({ value, onChange, excludeNames = [], label, onEditPresets }) {
  const [mode, setMode] = useState('closed');
  const [presets, setPresets] = useState(null);
  const [draftName, setDraftName] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchPresets() {
      const result = await socketEmit('list_presets');
      if (cancelled) return;
      if (result.ok) setPresets(result.presets);
    }
    fetchPresets();
    socket.on('presets_changed', fetchPresets);
    return () => {
      cancelled = true;
      socket.off('presets_changed', fetchPresets);
    };
  }, []);

  function openList() {
    setMode('list');
  }

  function openInput() {
    setDraftName('');
    setMode('input');
  }

  function pickPreset(name) {
    onChange(name);
    setMode('closed');
  }

  function commit() {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setMode('closed');
  }

  function cancelInput() {
    setDraftName('');
    setMode('list');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') commit();
  }

  const available = (presets || []).filter(
    (p) => !excludeNames.some((e) => e.toLowerCase() === p.name.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
      )}

      {mode === 'closed' && (
        <div style={CLOSED_ROW} onClick={openList}>
          <span style={{
            fontSize: '1rem',
            fontWeight: value ? 700 : 400,
            color: value ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          }}>
            {value || 'Pick a name'}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: value ? 600 : 400 }}>
            {value ? 'Change' : '▾'}
          </span>
        </div>
      )}

      {mode === 'list' && (
        <div style={DROPDOWN}>
          <div style={{ ...DROPDOWN_ROW, color: 'var(--color-primary)', fontWeight: 700 }} onClick={openInput}>
            + New name
          </div>
          {presets === null && (
            <div style={{ ...DROPDOWN_ROW, color: 'var(--color-text-secondary)' }}>
              Loading...
            </div>
          )}
          {presets !== null && available.map((p) => (
            <div key={p.id} style={DROPDOWN_ROW} onClick={() => pickPreset(p.name)}>
              {p.name}
            </div>
          ))}
          {onEditPresets && (
            <div
              style={{ ...DROPDOWN_ROW, color: 'var(--color-text-secondary)', borderBottom: 'none' }}
              onClick={() => { setMode('closed'); onEditPresets(); }}
            >
              Manage presets
            </div>
          )}
        </div>
      )}

      {mode === 'input' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            style={INPUT_STYLE}
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter name"
            maxLength={20}
            autoFocus
          />
          <button
            style={{ ...BTN_SMALL, background: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            onClick={cancelInput}
            type="button"
          >
            Cancel
          </button>
          <button
            style={{ ...BTN_SMALL, background: 'var(--color-primary)', color: '#fff', opacity: draftName.trim() ? 1 : 0.5 }}
            onClick={commit}
            disabled={!draftName.trim()}
            type="button"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
