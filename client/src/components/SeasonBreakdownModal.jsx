import React from 'react';
import { computeStandings } from '../utils/standings.js';

const BACKDROP = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 999,
};

const CARD = {
  background: 'var(--color-surface)',
  borderRadius: '12px',
  padding: '20px',
  maxWidth: '90vw',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
};

const BTN_SECONDARY = {
  padding: '10px 16px',
  background: 'transparent',
  color: 'var(--color-primary)',
  border: '1.5px solid var(--color-primary)',
  borderRadius: '8px',
  fontSize: '0.95rem',
  fontWeight: 600,
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
};

export default function SeasonBreakdownModal({ league, onClose }) {
  // Filter current season to played matches only
  const playedCurrent = league.state.fixtures.filter(f => f.scoreA !== null && f.scoreB !== null);

  // Include current season only if in_progress and has played matches
  const includeCurrent = league.status === 'in_progress' && playedCurrent.length > 0;

  // Build seasons array with isCurrent tag
  const seasons = [
    ...(league.history || []).map(snap => ({
      num: snap.season_num,
      fixtures: snap.fixtures,
      isCurrent: false,
    })),
    ...(includeCurrent ? [{
      num: league.state.current_season,
      fixtures: playedCurrent,
      isCurrent: true,
    }] : []),
  ];

  // Compute per-season standings and aggregate by player
  const playerBreakdown = {};

  seasons.forEach(season => {
    const standings = computeStandings(
      season.fixtures,
      league.config.players,
      league.config.points_per_win,
      league.config.game_point
    );

    standings.forEach(row => {
      if (!playerBreakdown[row.player]) {
        playerBreakdown[row.player] = { total: 0 };
      }
      playerBreakdown[row.player][`S${season.num}`] = row.leaguePoints;
      playerBreakdown[row.player].total += row.leaguePoints;
    });
  });

  // Ensure all league players have an entry (even if didn't play)
  league.config.players.forEach(player => {
    if (!playerBreakdown[player]) {
      playerBreakdown[player] = { total: 0 };
      seasons.forEach(season => {
        playerBreakdown[player][`S${season.num}`] = 0;
      });
    }
  });

  // Sort by total descending
  const sortedPlayers = Object.keys(playerBreakdown).sort(
    (a, b) => playerBreakdown[b].total - playerBreakdown[a].total
  );

  return (
    <div style={BACKDROP} onClick={onClose}>
      <div style={CARD} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '1.3rem', fontWeight: 800 }}>
          Points by Season
        </h2>

        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
          {/* Header row */}
          <div style={{ display: 'flex', gap: '8px', padding: '12px 10px', borderBottom: '2px solid var(--color-border)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            <span style={{ flex: 1, minWidth: '100px', textAlign: 'left' }}>Player</span>
            {seasons.map(season => (
              <span
                key={`header-${season.num}`}
                style={{ width: '40px', textAlign: 'right', paddingRight: '8px' }}
              >
                S{season.num}{season.isCurrent ? '*' : ''}
              </span>
            ))}
            <span style={{ width: '50px', textAlign: 'right', paddingRight: '8px', fontWeight: 800 }}>
              Total
            </span>
          </div>

          {/* Data rows */}
          {sortedPlayers.map(player => (
            <div
              key={player}
              style={{
                display: 'flex',
                gap: '8px',
                padding: '12px 10px',
                borderBottom: '1px solid var(--color-border)',
                fontSize: '0.95rem',
                color: 'var(--color-text-primary)',
                alignItems: 'center',
              }}
            >
              <span style={{ flex: 1, minWidth: '100px', textAlign: 'left' }}>
                {player}
              </span>
              {seasons.map(season => (
                <span
                  key={`${player}-${season.num}`}
                  style={{
                    width: '40px',
                    textAlign: 'right',
                    paddingRight: '8px',
                  }}
                >
                  {playerBreakdown[player][`S${season.num}`] || 0}
                </span>
              ))}
              <span
                style={{
                  width: '50px',
                  textAlign: 'right',
                  paddingRight: '8px',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                }}
              >
                {playerBreakdown[player].total}
              </span>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={BTN_SECONDARY}>
          Close
        </button>
      </div>
    </div>
  );
}
