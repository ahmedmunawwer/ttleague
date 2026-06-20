import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket.js';
import socketEmit from '../socketEmit.js';
import { computePlayerDetail } from '../utils/leagueAggregations.js';

const HEADER_STYLE = {
  display: 'flex',
  alignItems: 'center',
  padding: '16px 20px',
  borderBottom: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  gap: '16px',
};

const BACK_BTN_STYLE = {
  background: 'none',
  border: 'none',
  color: 'var(--color-primary)',
  fontSize: '1rem',
  fontWeight: 700,
  cursor: 'pointer',
  padding: '4px 0',
  WebkitTapHighlightColor: 'transparent',
};

const PLAYER_NAME_STYLE = {
  flex: 1,
  textAlign: 'center',
  margin: 0,
  fontSize: '1.3rem',
  fontWeight: 800,
  color: 'var(--color-text-primary)',
};

const LOADING_STYLE = {
  textAlign: 'center',
  color: 'var(--color-text-secondary)',
  marginTop: '40px',
  fontSize: '1rem',
  minHeight: '100vh',
  background: 'var(--color-background)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const ERROR_STYLE = {
  background: 'var(--color-error-bg)',
  color: 'var(--color-error)',
  padding: '12px 16px',
  borderRadius: '10px',
  fontSize: '0.95rem',
  fontWeight: 600,
  textAlign: 'center',
  marginTop: '40px',
  margin: '40px 20px 0',
};

const EMPTY_STYLE = {
  textAlign: 'center',
  color: 'var(--color-text-secondary)',
  marginTop: '40px',
  fontSize: '1rem',
  minHeight: '100vh',
  background: 'var(--color-background)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
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
  cursor: 'pointer',
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

function formatStatus(status) {
  if (status === 'completed') return 'Completed';
  if (status === 'in_progress') return 'In Progress';
  if (status === 'terminated') return 'Terminated';
  return status;
}

export default function PlayerDetail() {
  const { name } = useParams();
  const playerName = decodeURIComponent(name);
  const navigate = useNavigate();
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
    return <div style={LOADING_STYLE}>Loading...</div>;
  }

  if (fetchError) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-background)', padding: '20px' }}>
        <div style={ERROR_STYLE}>{fetchError}</div>
      </div>
    );
  }

  const detail = computePlayerDetail(playerName, entries);

  if (!detail || detail.summary.leaguesPlayed === 0) {
    return (
      <div style={EMPTY_STYLE}>Player "{playerName}" not found</div>
    );
  }

  const { summary, leagues, h2h, bestSeasonFinish } = detail;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', flexDirection: 'column' }}>
      <div style={HEADER_STYLE}>
        <button onClick={() => navigate(-1)} style={BACK_BTN_STYLE}>← Back</button>
        <h1 style={PLAYER_NAME_STYLE}>{playerName}</h1>
      </div>

      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {bestSeasonFinish && (
          <div style={CAPTION_STYLE}>
            Best finish: #{bestSeasonFinish.rank} in {bestSeasonFinish.leagueName} (Season {bestSeasonFinish.seasonNum})
          </div>
        )}

        <div style={SUMMARY_GRID_STYLE}>
          <div style={STAT_CELL_STYLE}>
            <span style={STAT_LABEL_STYLE}>Leagues</span>
            <span style={STAT_VALUE_STYLE}>{summary.leaguesPlayed}</span>
          </div>
          <div style={STAT_CELL_STYLE}>
            <span style={STAT_LABEL_STYLE}>Won</span>
            <span style={STAT_VALUE_STYLE}>{summary.leaguesWon}</span>
          </div>
          <div style={STAT_CELL_STYLE}>
            <span style={STAT_LABEL_STYLE}>Record</span>
            <span style={STAT_VALUE_STYLE}>{summary.wins}-{summary.losses}</span>
          </div>
          <div style={STAT_CELL_STYLE}>
            <span style={STAT_LABEL_STYLE}>Points</span>
            <span style={STAT_VALUE_STYLE}>{summary.pointsFor}-{summary.pointsAgainst}</span>
          </div>
        </div>

        {leagues.length > 0 && (
          <div>
            <h2 style={SECTION_HEADER_STYLE}>Leagues</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {leagues.map((league) => (
                <div
                  key={league.leagueId}
                  onClick={() => navigate(`/league/${league.leagueId}`)}
                  style={LEAGUE_CARD_STYLE}
                >
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

        {Object.keys(h2h).length > 0 && (
          <div>
            <h2 style={SECTION_HEADER_STYLE}>Head-to-Head</h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {Object.keys(h2h).sort().map((opponent) => (
                <div key={opponent} style={H2H_ROW_STYLE}>
                  vs {opponent}: {h2h[opponent].wins}-{h2h[opponent].losses}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
