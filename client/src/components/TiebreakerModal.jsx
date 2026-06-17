import React from 'react';
import { computeTiebreakerBreakdown, computeNetEfficiencyBreakdown } from '../utils/standings.js';

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

const HIGHLIGHT_SECTION = {
  background: 'var(--color-tiebreaker-highlight)',
  padding: '8px 12px',
  borderRadius: '6px',
};

export default function TiebreakerModal({ group, fixtures, pointsLevel, standings, gamePoint, onClose }) {
  if (!group || group.length === 0) {
    return null;
  }

  const completed = fixtures.filter(f => f.scoreA !== null && f.scoreB !== null);
  const breakdown = computeTiebreakerBreakdown(group, fixtures, gamePoint);

  const getRankForPlayer = (playerName) => {
    const row = standings.find(s => s.player === playerName);
    return row ? row.rank : '?';
  };

  return (
    <div style={BACKDROP} onClick={onClose}>
      <div style={CARD} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: '1.3rem', fontWeight: 800 }}>
          Tiebreaker — {group.length} players tied at {pointsLevel} points
        </h2>

        <div style={{ borderTop: '1.5px solid var(--color-border)' }} />

        {breakdown.steps.map((step, idx) => (
          <div key={idx}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Step {step.stepNum}: {step.metricLabel}
              {step.direction === 'asc' && <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: '6px' }}>(lower is better)</span>}
            </h3>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              Among: {step.subgroup.join(', ')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              {step.subgroup.map(p => {
                const isResolved = step.resolvedAtThisStep.includes(p);
                const value = step.values[p];
                const formattedValue = value > 0 ? `+${value}` : String(value);

                return (
                  <div
                    key={p}
                    style={{
                      ...(isResolved ? HIGHLIGHT_SECTION : {}),
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>
                      {p}
                      {isResolved && (
                        <span style={{ marginLeft: '8px', color: 'var(--color-primary)', fontWeight: 700 }}>
                          → rank {getRankForPlayer(p)}
                        </span>
                      )}
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{formattedValue}</span>
                  </div>
                );
              })}
            </div>

            {step.metric === 'netEfficiency' && (
              <div style={{ margin: '12px 0', padding: '12px', backgroundColor: 'var(--color-background)', borderRadius: '6px' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Net Efficiency breakdown
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {step.subgroup.map(player => {
                    const playerBreakdown = computeNetEfficiencyBreakdown(player, completed, gamePoint);
                    return (
                      <div key={player} style={{ borderLeft: '2px solid var(--color-border)', paddingLeft: '10px' }}>
                        <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {player}'s matches:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                          {playerBreakdown.matches.map((match, idx) => (
                            <div key={idx}>
                              {match.result} {match.score} ({match.isDeuce ? 'deuce' : 'normal'}): {match.formulaText}
                            </div>
                          ))}
                          <div style={{ marginTop: '4px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            Total: {playerBreakdown.total >= 0 ? '+' : ''}{playerBreakdown.total}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!step.madeProgress && (
              <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
                No split — advancing to next metric
              </p>
            )}

            {idx < breakdown.steps.length - 1 && <div style={{ borderTop: '1.5px solid var(--color-border)' }} />}
          </div>
        ))}

        {breakdown.finalUnresolved.length > 0 && (
          <>
            <div style={{ borderTop: '1.5px solid var(--color-border)' }} />
            <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.9rem', padding: '12px' }}>
              Players remain tied after all tiebreakers — shared rank: {breakdown.finalUnresolved.join(', ')}
            </div>
          </>
        )}

        <button style={BTN_SECONDARY} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
