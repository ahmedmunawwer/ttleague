import React, { useState, useEffect } from 'react';
import socket from '../socket.js';
import socketEmit from '../socketEmit.js';
import { computePlayerDetail } from '../utils/leagueAggregations.js';

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

const HEADER_STYLE = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
};

const PLAYER_NAME_STYLE = {
  margin: 0,
  fontSize: '1.3rem',
  fontWeight: 800,
  color: 'var(--color-text-primary)',
};

const CLOSE_BTN_STYLE = {
  background: 'none',
  border: 'none',
  fontSize: '1.5rem',
  cursor: 'pointer',
  padding: '0',
  color: 'var(--color-text-secondary)',
  WebkitTapHighlightColor: 'transparent',
};

const CAPTION_STYLE = {
  fontSize: '0.9rem',
  color: 'var(--color-text-secondary)',
  fontStyle: 'italic',
};

const SUMMARY_GRID_STYLE = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
};

const STAT_CELL_STYLE = {
  flex: '1 1 calc(50% - 6px)',
  minWidth: '140px',
  background: 'var(--color-surface)',
  border: '1.5px solid var(--color-border)',
  borderRadius: '12px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  alignItems: 'center',
  justifyContent: 'center',
};

const STAT_LABEL_STYLE = {
  fontSize: '0.85rem',
  color: 'var(--color-text-secondary)',
  fontWeight: 600,
};

const STAT_VALUE_STYLE = {
  fontSize: '1.4rem',
  fontWeight: 800,
  color: 'var(--color-text-primary)',
};

const SECTION_HEADER_STYLE = {
  fontSize: '1.1rem',
  fontWeight: 800,
  color: 'var(--color-text-primary)',
  margin: '0 0 12px 0',
};

const LEAGUE_CARD_STYLE = {
  background: 'var(--color-surface)',
  border: '1.5px solid var(--color-border)',
  borderRadius: '12px',
  padding: '14px 16px',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
};

const LEAGUE_NAME_STYLE = {
  fontSize: '1rem',
  fontWeight: 700,
  color: 'var(--color-text-primary)',
};

const LEAGUE_STATUS_STYLE = {
  fontSize: '0.85rem',
  color: 'var(--color-text-secondary)',
};

const LEAGUE_STATS_STYLE = {
  fontSize: '0.9rem',
  color: 'var(--color-text-secondary)',
  marginTop: '6px',
};

const H2H_ROW_STYLE = {
  fontSize: '0.95rem',
  color: 'var(--color-text-secondary)',
  padding: '8px 0',
  borderBottom: '1px solid var(--color-border)',
};

const ERROR_STYLE = {
  background: 'var(--color-error-bg)',
  color: 'var(--color-error)',
  padding: '12px 16px',
  borderRadius: '10px',
  fontSize: '0.95rem',
  fontWeight: 600,
  textAlign: 'center',
};

function formatStatus(status) {
  if (status === 'completed') return 'Completed';
  if (status === 'in_progress') return 'In Progress';
  if (status === 'terminated') return 'Terminated';
  return status;
}

export default function PlayerStatsModal({ playerName, onClose }) {
  const [entries, setEntries] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchEntries() {
      const result = await socketEmit('list_scoreboard');
      if (cancelled) return;
      if (result.ok) {
        const list = result.entries.filter((e) => e.completionStatus !== 'terminated');
        setEntries(list);
        setFetchError(null);
      } else {
        setFetchError(result.error);
      }
    }
    fetchEntries();
    socket.on('scoreboard_changed', fetchEntries);
    return () => {
      cancelled = true;
      socket.off('scoreboard_changed', fetchEntries);
    };
  }, []);

  if (entries === null && !fetchError) {
    return (
      <div style={BACKDROP} onClick={onClose}>
        <div style={CARD} onClick={(e) => e.stopPropagation()}>
          <div style={HEADER_STYLE}>
            <h2 style={PLAYER_NAME_STYLE}>{playerName}</h2>
            <button onClick={onClose} style={CLOSE_BTN_STYLE}>×</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={BACKDROP} onClick={onClose}>
        <div style={CARD} onClick={(e) => e.stopPropagation()}>
          <div style={HEADER_STYLE}>
            <h2 style={PLAYER_NAME_STYLE}>{playerName}</h2>
            <button onClick={onClose} style={CLOSE_BTN_STYLE}>×</button>
          </div>
          <div style={ERROR_STYLE}>{fetchError}</div>
        </div>
      </div>
    );
  }

  const detail = computePlayerDetail(playerName, entries);

  if (!detail || detail.summary.leaguesPlayed === 0) {
    return (
      <div style={BACKDROP} onClick={onClose}>
        <div style={CARD} onClick={(e) => e.stopPropagation()}>
          <div style={HEADER_STYLE}>
            <h2 style={PLAYER_NAME_STYLE}>{playerName}</h2>
            <button onClick={onClose} style={CLOSE_BTN_STYLE}>×</button>
          </div>
          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: '20px' }}>
            No stats available
          </div>
        </div>
      </div>
    );
  }

  const { summary, leagues, h2h, bestSeasonFinish } = detail;

  return (
    <div style={BACKDROP} onClick={onClose}>
      <div style={CARD} onClick={(e) => e.stopPropagation()}>
        <div style={HEADER_STYLE}>
          <h2 style={PLAYER_NAME_STYLE}>{playerName}</h2>
          <button onClick={onClose} style={CLOSE_BTN_STYLE}>×</button>
        </div>

        {bestSeasonFinish && (
          <div style={CAPTION_STYLE}>
            Best finish: #{bestSeasonFinish.rank} in {bestSeasonFinish.leagueName} (Season {bestSeasonFinish.seasonNum})
          </div>
        )}

        <div style={SUMMARY_GRID_STYLE}>
          <div style={STAT_CELL_STYLE}>
            <span style={{ fontSize: '1.2rem' }}>🎾</span>
            <span style={STAT_LABEL_STYLE}>Leagues</span>
            <span style={STAT_VALUE_STYLE}>{summary.leaguesPlayed}</span>
          </div>
          <div style={STAT_CELL_STYLE}>
            <span style={{ fontSize: '1.2rem' }}>🏆</span>
            <span style={STAT_LABEL_STYLE}>Won</span>
            <span style={STAT_VALUE_STYLE}>{summary.leaguesWon}</span>
          </div>
          <div style={STAT_CELL_STYLE}>
            <span style={{ fontSize: '1.2rem' }}>⚖️</span>
            <span style={STAT_LABEL_STYLE}>Record</span>
            <span style={STAT_VALUE_STYLE}>{summary.wins}-{summary.losses}</span>
          </div>
          <div style={STAT_CELL_STYLE}>
            <span style={{ fontSize: '1.2rem' }}>🎯</span>
            <span style={STAT_LABEL_STYLE}>Points</span>
            <span style={STAT_VALUE_STYLE}>{summary.pointsFor}-{summary.pointsAgainst}</span>
          </div>
        </div>

        {Object.keys(h2h).length > 0 && (
          <div>
            <h3 style={SECTION_HEADER_STYLE}>Head-to-Head</h3>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {Object.keys(h2h).sort().map((opponent) => {
                const wins = h2h[opponent].wins;
                const losses = h2h[opponent].losses;
                const total = h2h[opponent].matches;
                const winPercent = total > 0 ? (wins / total) * 100 : 0;

                return (
                  <div key={opponent} style={H2H_ROW_STYLE}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ minWidth: '160px', flex: '0 0 160px' }}>
                        vs {opponent}: {wins}-{losses}
                      </span>
                      {total > 0 && (
                        <div style={{
                          flex: '1',
                          maxWidth: '120px',
                          height: '6px',
                          background: 'var(--color-divider)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                          display: 'flex',
                        }}>
                          <div style={{
                            width: `${winPercent}%`,
                            background: 'var(--color-win)',
                            height: '100%',
                          }} />
                          <div style={{
                            width: `${100 - winPercent}%`,
                            background: 'var(--color-loss)',
                            height: '100%',
                          }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {leagues.length > 0 && (
          <div>
            <h3 style={SECTION_HEADER_STYLE}>Leagues</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {leagues.map((league) => (
                <div key={league.leagueId} style={LEAGUE_CARD_STYLE}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={LEAGUE_NAME_STYLE}>{league.leagueName}</span>
                    <span style={LEAGUE_STATUS_STYLE}>{formatStatus(league.status)}</span>
                  </div>
                  <div style={LEAGUE_STATS_STYLE}>
                    {league.rank ? `Rank #${league.rank}` : 'Not ranked'} • {league.wins}-{league.losses} • {league.seasonCount} season{league.seasonCount === 1 ? '' : 's'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
