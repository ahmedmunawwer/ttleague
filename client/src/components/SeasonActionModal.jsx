import React from 'react';

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

export default function SeasonActionModal({ action, league, onConfirm, onCancel }) {
  let title, bodyText, warningText, confirmLabel;

  if (action === 'next') {
    title = 'Start Next Season?';
    bodyText = `Season ${league.state.current_season} will be saved to history. The current fixtures will be cleared, and Season ${league.state.current_season + 1} will start. You'll generate new fixtures for the new season.`;
    warningText = 'This cannot be undone.';
    confirmLabel = `Start Season ${league.state.current_season + 1}`;
  } else {
    title = 'End the League?';
    bodyText = `Season ${league.state.current_season} will be saved as the final season. The league will move to the Completed tab in your scoreboard.`;
    warningText = 'This cannot be undone.';
    confirmLabel = 'End League';
  }

  return (
    <div style={BACKDROP} onClick={onCancel}>
      <div style={CARD} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: '1.3rem', fontWeight: 800 }}>
          {title}
        </h2>

        <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--color-text-primary)', lineHeight: '1.5' }}>
          {bodyText}
        </p>

        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 600 }}>
          {warningText}
        </p>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button style={BTN_SECONDARY} onClick={onCancel}>
            Cancel
          </button>
          <button style={BTN_PRIMARY} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
