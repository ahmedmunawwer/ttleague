import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket.js';
import socketEmit from '../socketEmit.js';
import useLongPress from '../hooks/useLongPress.js';
import NewLeagueWizard from '../components/NewLeagueWizard.jsx';
import LeagueInfoModal from '../components/LeagueInfoModal.jsx';
import EmptyState from '../components/EmptyState.jsx';

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

function LeagueCard({ league, onLongPress, navigate }) {
  const longPress = useLongPress(onLongPress);
  const seasonInfo = league.config.num_seasons === null
    ? `Season ${league.state.current_season} (Unlimited)`
    : `Season ${league.state.current_season} of ${league.config.num_seasons}`;
  const badgeStyle = getBadgeStyle(league.status);

  return (
    <div
      {...longPress}
      onClick={() => navigate('/league/' + league.id)}
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
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
          {league.name}
        </span>
        <span style={{
          ...badgeStyle,
          padding: '3px 10px',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          {getBadgeLabel(league.status)}
        </span>
      </div>
      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
        {seasonInfo}
      </span>
    </div>
  );
}

export default function LeagueMenu() {
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchLeagues() {
      const result = await socketEmit('list_leagues', { status: 'in_progress' });
      if (cancelled) return;
      if (result.ok) {
        setLeagues(result.leagues);
        setFetchError(null);
      } else {
        setFetchError(result.error);
      }
    }
    fetchLeagues();
    socket.on('leagues_list_changed', fetchLeagues);
    return () => {
      cancelled = true;
      socket.off('leagues_list_changed', fetchLeagues);
    };
  }, []);

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
          Leagues
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '36px',
            height: '36px',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1.4rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          +
        </button>
      </div>

      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {leagues === null && !fetchError && (
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

        {leagues !== null && leagues.length === 0 && (
          <EmptyState
            icon="🏓"
            title="No leagues yet"
            hint="Tap + to create your first league"
          />
        )}

        {leagues !== null && leagues.length > 0 && leagues.map((league) => (
          <LeagueCard
            key={league.id}
            league={league}
            onLongPress={() => setSelectedLeague(league)}
            navigate={navigate}
          />
        ))}
      </div>

      {showCreate && <NewLeagueWizard onClose={() => setShowCreate(false)} />}
      {selectedLeague && <LeagueInfoModal league={selectedLeague} onClose={() => setSelectedLeague(null)} enableEditMode={true} navigate={navigate} />}
    </div>
  );
}
