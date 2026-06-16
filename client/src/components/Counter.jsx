import React from 'react';

const BTN = {
  width: '44px',
  height: '44px',
  border: '1.5px solid var(--color-border)',
  borderRadius: '8px',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontSize: '1.2rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  WebkitTapHighlightColor: 'transparent',
};

export default function Counter({ value, onChange, min = 0, max = Infinity, label }) {
  const atMin = value <= min;
  const atMax = value >= max;

  function decrement() {
    if (atMin) return;
    onChange(value - 1);
  }

  function increment() {
    if (atMax) return;
    onChange(value + 1);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          type="button"
          style={{ ...BTN, opacity: atMin ? 0.4 : 1 }}
          onClick={decrement}
          disabled={atMin}
        >
          ▼
        </button>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, minWidth: '32px', textAlign: 'center', color: 'var(--color-text-primary)' }}>
          {value}
        </span>
        <button
          type="button"
          style={{ ...BTN, opacity: atMax ? 0.4 : 1 }}
          onClick={increment}
          disabled={atMax}
        >
          ▲
        </button>
      </div>
    </div>
  );
}
