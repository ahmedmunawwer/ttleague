import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket.js';
import socketEmit from '../socketEmit.js';
import { computeLeagueSummary, computeAllPlayersStats } from '../utils/leagueAggregations.js';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'terminated', label: 'Terminated' },
];

const EMPTY_MESSAGES = {
  all: 'No leagues yet',
  in_progress: 'No active leagues',
  completed: 'No completed leagues yet',
  terminated: 'No deleted leagues',
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

function PlayerCard({ player, navigate }) {
  return (
    <div
      onClick={() => navigate(`/players/${encodeURIComponent(player.name)}`)}
      style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '14px',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
        {player.name}
      </span>
      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
        {player.leaguesPlayed} played • {player.leaguesWon} won • {player.wins}-{player.losses} • {player.pointsFor}-{player.pointsAgainst}
      </span>
    </div>
  );
}

function ScoreboardCard({ entry, navigate }) {
  const badgeStyle = getBadgeStyle(entry.completionStatus);
  const summary = computeLeagueSummary(entry);

  let row2Text = null;
  if (entry.completionStatus === 'completed' && summary) {
    const seasonsLabel = summary.seasonCount === 1 ? '1 season' : `${summary.seasonCount} seasons`;
    const matchesLabel = summary.matchCount === 1 ? '1 match' : `${summary.matchCount} matches`;
    row2Text = `Winner: ${summary.winner} • ${seasonsLabel} • ${matchesLabel}`;
  } else if (entry.completionStatus === 'in_progress' && summary) {
    const seasonText = summary.totalSeasons === null
      ? `Season ${summary.currentSeason} (Unlimited)`
      : `Season ${summary.currentSeason} of ${summary.totalSeasons}`;
    if (summary.currentLeader) {
      const matchesLabel = summary.currentSeasonMatches === 1 ? '1 match' : `${summary.currentSeasonMatches} matches`;
      row2Text = `${seasonText} • Leading: ${summary.currentLeader} • ${matchesLabel} this season`;
    } else {
      row2Text = seasonText;
    }
  }

  return (
    <div
      onClick={() => navigate(`/league/${entry.id}`)}
      style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '14px',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
          {entry.name}
        </span>
        <span style={{
          ...badgeStyle,
          padding: '3px 10px',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          {getBadgeLabel(entry.completionStatus)}
        </span>
      </div>
      {row2Text && (
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          {row2Text}
        </span>
      )}
    </div>
  );
}

export default function Scoreboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [scoreboardView, setScoreboardView] = useState('leagues');
  const [entries, setEntries] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchEntries() {
      let result;
      if (scoreboardView === 'players') {
        result = await socketEmit('list_scoreboard');
      } else {
        result = activeTab === 'all'
          ? await socketEmit('list_scoreboard')
          : await socketEmit('list_scoreboard', { status: activeTab });
      }
      if (cancelled) return;
      if (result.ok) {
        const list = (scoreboardView === 'players' || activeTab === 'all')
          ? result.entries.filter((e) => e.completionStatus !== 'terminated')
          : result.entries;
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
  }, [activeTab, scoreboardView]);

  const players = scoreboardView === 'players' && entries ? computeAllPlayersStats(entries) : [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        position: 'relative',
        padding: '16px 20px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--color-primary)',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '4px 0',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ←
        </button>
        <h1 style={{
          textAlign: 'center',
          margin: 0,
          fontSize: '1.2rem',
          fontWeight: 800,
          color: 'var(--color-text-primary)',
        }}>
          Scoreboard
        </h1>
      </div>

      <div style={{ display: 'flex', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', justifyContent: 'center', padding: '12px 20px' }}>
        <div style={{ display: 'flex', background: 'var(--color-border)', borderRadius: '8px', padding: '4px' }}>
          <button
            onClick={() => setScoreboardView('leagues')}
            style={{
              flex: 1,
              padding: '8px 16px',
              background: scoreboardView === 'leagues' ? 'var(--color-primary)' : 'transparent',
              color: scoreboardView === 'leagues' ? '#fff' : 'var(--color-text-secondary)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Leagues
          </button>
          <button
            onClick={() => setScoreboardView('players')}
            style={{
              flex: 1,
              padding: '8px 16px',
              background: scoreboardView === 'players' ? 'var(--color-primary)' : 'transparent',
              color: scoreboardView === 'players' ? '#fff' : 'var(--color-text-secondary)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Players
          </button>
        </div>
      </div>

      {scoreboardView === 'leagues' && (
        <div style={{ display: 'flex', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab.key ? 'var(--color-primary)' : 'transparent'}`,
                color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                padding: '12px 0',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {entries === null && !fetchError && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: '40px', fontSize: '1rem' }}>
            Loading...
          </div>
        )}

        {fetchError && (
          <div style={{
            background: 'var(--color-error-bg)',
            color: 'var(--color-error)',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '0.95rem',
            fontWeight: 600,
            textAlign: 'center',
            marginTop: '40px',
          }}>
            {fetchError}
          </div>
        )}

        {entries !== null && entries.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: '40px', fontSize: '1rem' }}>
            {scoreboardView === 'leagues' ? EMPTY_MESSAGES[activeTab] : 'No players yet'}
          </div>
        )}

        {scoreboardView === 'leagues' && entries !== null && entries.length > 0 && entries.map((entry) => (
          <ScoreboardCard key={entry.id} entry={entry} navigate={navigate} />
        ))}

        {scoreboardView === 'players' && players.length > 0 && players.map((player) => (
          <PlayerCard key={player.name} player={player} navigate={navigate} />
        ))}
      </div>
    </div>
  );
}
