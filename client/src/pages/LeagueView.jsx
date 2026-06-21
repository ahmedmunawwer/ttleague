import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import socket from '../socket.js';
import socketEmit from '../socketEmit.js';
import Counter from '../components/Counter.jsx';
import { computeStandings } from '../utils/standings.js';
import TiebreakerModal from '../components/TiebreakerModal.jsx';
import SeasonActionModal from '../components/SeasonActionModal.jsx';
import SeasonBreakdownModal from '../components/SeasonBreakdownModal.jsx';
import SettingsModal from '../components/SettingsModal.jsx';
import EmptyState from '../components/EmptyState.jsx';

function computeWinnerScore(loserScore, gamePoint) {
  return Math.max(gamePoint + 1, loserScore + 2);
}

export default function LeagueView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [league, setLeague] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('fixtures');
  const [numTables, setNumTables] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [fixtureError, setFixtureError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [scoreErrors, setScoreErrors] = useState({});
  const [tiebreakerGroup, setTiebreakerGroup] = useState(null);
  const [seasonActionModal, setSeasonActionModal] = useState(null);
  const [standingsView, setStandingsView] = useState('current');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savedFlashId, setSavedFlashId] = useState(null);

  const debounceTimerRef = useRef(null);
  const savedFlashTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (savedFlashTimerRef.current) {
        clearTimeout(savedFlashTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchLeague() {
      const result = await socketEmit('load_league', id);
      if (cancelled) return;
      if (result.ok) {
        setLeague(result.league);
        setError(null);
      } else {
        setError(result.error);
        setLeague(false);
      }
    }
    fetchLeague();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    function handleLeagueUpdated(payload) {
      if (payload.id === id) {
        socketEmit('load_league', id).then((result) => {
          if (result.ok) setLeague(result.league);
        });
      }
    }
    socket.on('league_updated', handleLeagueUpdated);
    return () => {
      socket.off('league_updated', handleLeagueUpdated);
    };
  }, []);

  async function handleGenerateFixtures() {
    setGenerating(true);
    setFixtureError(null);
    const ack = await socketEmit('generate_fixtures', id, numTables);
    if (ack.ok) {
      setLeague(ack.league);
      setGenerating(false);
    } else {
      setFixtureError(ack.error);
      setGenerating(false);
    }
  }

  if (league === false) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '20px' }}>
        <div style={{
          background: 'var(--color-error-bg)',
          color: 'var(--color-error)',
          padding: '12px 16px',
          borderRadius: '10px',
          fontSize: '0.95rem',
          fontWeight: 600,
          textAlign: 'center',
        }}>
          {error}
        </div>
        <button
          onClick={() => navigate('/league')}
          style={{
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
      </div>
    );
  }

  if (league === null) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>Loading...</span>
      </div>
    );
  }

  const seasonInfo = league.config.num_seasons === null
    ? `Season ${league.state.current_season} (Unlimited)`
    : `Season ${league.state.current_season} of ${league.config.num_seasons}`;

  const standings = computeStandings(league.state.fixtures, league.config.players, league.config.points_per_win, league.config.game_point);

  const allTimeFixtures = [
    ...(league.history || []).flatMap(snapshot => snapshot.fixtures),
    ...league.state.fixtures
  ];
  const allTimeStandings = computeStandings(
    allTimeFixtures,
    league.config.players,
    league.config.points_per_win,
    league.config.game_point
  );

  const activeStandings = standingsView === 'alltime' ? allTimeStandings : standings;
  const activeFixtures = standingsView === 'alltime' ? allTimeFixtures : league.state.fixtures;

  const seasonComplete = league.state.fixtures.length > 0 && league.state.fixtures.every(f => f.scoreA !== null && f.scoreB !== null);
  const showStartNext = seasonComplete && (league.config.num_seasons === null || league.state.current_season < league.config.num_seasons);
  const showEndLeague = seasonComplete && league.status === 'in_progress';
  const isEditMode = searchParams.get('mode') === 'edit';
  const isCompletedLeague = league.status === 'completed';
  const isReadOnly = league.status !== 'in_progress' || !isEditMode;

  const handleSeasonAction = async (action) => {
    const event = action === 'next' ? 'complete_season' : 'end_league';
    try {
      const result = await socketEmit(event, league.id);
      if (result.ok) {
        setSeasonActionModal(null);
      } else {
        alert(result.error || 'Action failed');
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  async function performAutoSave(match, loserScoreStr, loserSide) {
    const loserScoreNum = /^\d+$/.test(loserScoreStr) ? parseInt(loserScoreStr, 10) : null;
    if (loserScoreNum === null) return;

    const winnerScoreNum = computeWinnerScore(loserScoreNum, league.config.game_point);
    const resolvedScoreA = loserSide === 'A' ? loserScoreNum : winnerScoreNum;
    const resolvedScoreB = loserSide === 'B' ? loserScoreNum : winnerScoreNum;

    if (resolvedScoreA === match.scoreA && resolvedScoreB === match.scoreB) {
      return;
    }

    try {
      const ack = await socketEmit('update_match_score', id, match.id, resolvedScoreA, resolvedScoreB);
      if (ack.ok) {
        setLeague(ack.league);
        setScoreErrors((prev) => {
          const next = { ...prev };
          delete next[match.id];
          return next;
        });
        if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
        setSavedFlashId(match.id);
        savedFlashTimerRef.current = setTimeout(() => setSavedFlashId(null), 2000);
      } else {
        setScoreErrors((prev) => ({ ...prev, [match.id]: ack.error }));
      }
    } catch (err) {
      setScoreErrors((prev) => ({ ...prev, [match.id]: 'Network error' }));
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', flexDirection: 'column' }}>
      {savedFlashId && (
        <div style={{
          position: 'fixed',
          top: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-win-bg)',
          color: 'var(--color-win)',
          padding: '8px 16px',
          borderRadius: '999px',
          fontSize: '0.9rem',
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 50,
          pointerEvents: 'none',
        }} className="toast-saved">
          ✓ Saved
        </div>
      )}
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
        {!isReadOnly && (
          <button
            onClick={() => setShowSettings(true)}
            style={{
              position: 'absolute',
              right: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--color-text-primary)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '4px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            ⚙️
          </button>
        )}
        <h1 style={{
          textAlign: 'center',
          margin: 0,
          fontSize: '1.2rem',
          fontWeight: 800,
          color: 'var(--color-text-primary)',
        }}>
          {league.name}
        </h1>
      </div>

      <div style={{ textAlign: 'center', padding: '10px 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        {seasonInfo}
      </div>

      {isCompletedLeague && (
        <div style={{ padding: '8px 16px', background: 'var(--color-badge-completed-bg)', color: 'var(--color-badge-completed-text)', borderRadius: '8px', textAlign: 'center', margin: '8px 0', fontWeight: 600, fontSize: '0.9rem' }}>
          League Completed
        </div>
      )}

      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setActiveTab('fixtures')}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'fixtures' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'fixtures' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Fixtures
        </button>
        <button
          onClick={() => setActiveTab('standings')}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'standings' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'standings' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Standings
        </button>
      </div>

      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'fixtures' ? (
          !league.state.fixtures || league.state.fixtures.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', paddingTop: '20px' }}>
              {fixtureError && (
                <div style={{
                  background: 'var(--color-error-bg)',
                  color: 'var(--color-error)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  width: '100%',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                }}>
                  {fixtureError}
                </div>
              )}
              {league.status === 'completed' && !league.state.fixtures.length ? (
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                  League completed — no fixtures were generated
                </span>
              ) : isReadOnly && !league.state.fixtures.length ? (
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                  No fixtures yet — switch to Edit Mode to generate
                </span>
              ) : !isReadOnly ? (
                <>
                  <Counter label="Number of tables" value={numTables} onChange={setNumTables} min={1} max={6} />
                  <button
                    onClick={handleGenerateFixtures}
                    disabled={generating}
                    style={{
                      padding: '12px 24px',
                      background: 'var(--color-primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      opacity: generating ? 0.7 : 1,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {generating ? 'Generating...' : 'Generate Fixtures'}
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {Object.entries(
                league.state.fixtures.reduce((bySlot, fixture) => {
                  (bySlot[fixture.slot] = bySlot[fixture.slot] || []).push(fixture);
                  return bySlot;
                }, {})
              ).map(([slotNum, matches]) => (
                <div key={slotNum} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                    Slot {slotNum}
                  </span>
                  {matches.map((match) => {
                    const isFinished = match.scoreA !== null && match.scoreB !== null;
                    const aWins = isFinished && match.scoreA > match.scoreB;
                    const bWins = isFinished && match.scoreB > match.scoreA;
                    const isEditingThis = editing && editing.matchId === match.id;
                    const loserScoreNum = isEditingThis && /^\d+$/.test(editing.loserScore)
                      ? parseInt(editing.loserScore, 10)
                      : null;
                    const winnerScoreNum = loserScoreNum !== null
                      ? computeWinnerScore(loserScoreNum, league.config.game_point)
                      : null;
                    const aIsWinner = (isEditingThis && winnerScoreNum !== null && editing.loserInput === 'B') || (!isEditingThis && isFinished && aWins);
                    const bIsWinner = (isEditingThis && winnerScoreNum !== null && editing.loserInput === 'A') || (!isEditingThis && isFinished && bWins);
                    const aIsLoser = (isEditingThis && winnerScoreNum !== null && editing.loserInput === 'A') || (!isEditingThis && isFinished && bWins);
                    const bIsLoser = (isEditingThis && winnerScoreNum !== null && editing.loserInput === 'B') || (!isEditingThis && isFinished && aWins);

                    let displayA;
                    let displayB;
                    let resolvedScoreA;
                    let resolvedScoreB;
                    if (isEditingThis && editing.loserInput === 'A') {
                      displayA = editing.loserScore;
                      displayB = winnerScoreNum !== null ? String(winnerScoreNum) : '';
                      resolvedScoreA = loserScoreNum;
                      resolvedScoreB = winnerScoreNum;
                    } else if (isEditingThis && editing.loserInput === 'B') {
                      displayB = editing.loserScore;
                      displayA = winnerScoreNum !== null ? String(winnerScoreNum) : '';
                      resolvedScoreA = winnerScoreNum;
                      resolvedScoreB = loserScoreNum;
                    } else {
                      displayA = match.scoreA !== null ? String(match.scoreA) : '';
                      displayB = match.scoreB !== null ? String(match.scoreB) : '';
                      resolvedScoreA = match.scoreA;
                      resolvedScoreB = match.scoreB;
                    }

                    function handleScoreChange(letter, rawValue) {
                      const digits = rawValue.replace(/\D/g, '').slice(0, 3);
                      setEditing({ matchId: match.id, loserInput: letter, loserScore: digits });

                      if (debounceTimerRef.current) {
                        clearTimeout(debounceTimerRef.current);
                      }

                      debounceTimerRef.current = setTimeout(() => {
                        performAutoSave(match, digits, letter);
                      }, 500);
                    }

                    function handleStarTap(side) {
                      const otherSide = side === 'A' ? 'B' : 'A';
                      const otherSideScore = otherSide === 'A' ? resolvedScoreA : resolvedScoreB;
                      setEditing({ matchId: match.id, loserInput: side, loserScore: String(otherSideScore) });
                    }

                    function renderNameStar(visible = true) {
                      return (
                        <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', flexShrink: 0, visibility: visible ? 'visible' : 'hidden' }}>
                          <polygon
                            points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9"
                            fill="var(--color-accent-gold)"
                          />
                        </svg>
                      );
                    }

                    function renderScoreCell(side) {
                      const isThisSideStar = side === 'A' ? aIsWinner : bIsWinner;
                      const scoreValue = side === 'A' ? resolvedScoreA : resolvedScoreB;

                      if (isReadOnly) {
                        return (
                          <span style={{ width: '44px', textAlign: 'center', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            {scoreValue}
                          </span>
                        );
                      }

                      if (isThisSideStar) {
                        return (
                          <button
                            onClick={() => handleStarTap(side)}
                            style={{
                              width: '44px',
                              padding: '6px 4px',
                              textAlign: 'center',
                              background: 'var(--color-winner-bg)',
                              color: 'var(--color-text-primary)',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '1rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              WebkitTapHighlightColor: 'transparent',
                            }}
                          >
                            {scoreValue}
                          </button>
                        );
                      }

                      const value = side === 'A' ? displayA : displayB;
                      const isLoser = side === 'A' ? aIsLoser : bIsLoser;
                      return (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={value}
                          onChange={(e) => handleScoreChange(side, e.target.value)}
                          style={{
                            width: '44px',
                            textAlign: 'center',
                            padding: '6px 4px',
                            border: '1.5px solid var(--color-border)',
                            borderRadius: '6px',
                            background: isLoser ? 'var(--color-loser-bg)' : 'var(--color-surface)',
                            color: 'var(--color-text-primary)',
                            WebkitTapHighlightColor: 'transparent',
                          }}
                        />
                      );
                    }

                    return (
                      <React.Fragment key={match.id}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 10px',
                            borderLeft: `4px solid var(--color-table-${match.table})`,
                            background: isFinished ? 'var(--color-match-completed-bg)' : 'var(--color-surface)',
                            borderRadius: '6px',
                          }}
                        >
                          <span style={{
                            width: '24px',
                            height: '20px',
                            flexShrink: 0,
                            borderRadius: '4px',
                            background: `var(--color-table-${match.table})`,
                            color: 'var(--color-surface)',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            T{match.table}
                          </span>
                          <span style={{ flex: 1, textAlign: 'right', fontSize: '0.95rem', fontWeight: aWins ? 700 : 600, color: 'var(--color-text-primary)' }}>
                            {match.playerA}
                          </span>
                          {renderNameStar(aIsWinner)}
                          {renderScoreCell('A')}
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>vs</span>
                          {renderScoreCell('B')}
                          {renderNameStar(bIsWinner)}
                          <span style={{ flex: 1, textAlign: 'left', fontSize: '0.95rem', fontWeight: bWins ? 700 : 600, color: 'var(--color-text-primary)' }}>
                            {match.playerB}
                          </span>
                        </div>
                        {scoreErrors[match.id] && (
                          <span style={{
                            color: 'var(--color-error)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            paddingLeft: '14px',
                          }}>
                            {scoreErrors[match.id]}
                          </span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              ))}
            </div>
          )
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {!league.state.fixtures || league.state.fixtures.every(f => f.scoreA === null || f.scoreB === null) ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <EmptyState
                  icon="⏳"
                  title="No matches played yet"
                  hint="Score matches in the Fixtures tab to see standings"
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {seasonComplete && league.status === 'in_progress' && !isReadOnly && (
                  <div style={{
                    padding: '16px',
                    background: 'var(--color-surface)',
                    border: '2px solid var(--color-primary)',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      marginBottom: '4px',
                    }}>
                      Season {league.state.current_season} complete
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: 'var(--color-text-secondary)',
                      marginBottom: '12px',
                    }}>
                      {showStartNext ? 'Choose how to continue' : 'This was the final configured season'}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {showStartNext && (
                        <button
                          onClick={() => setSeasonActionModal({ action: 'next', league })}
                          style={{
                            padding: '12px 20px',
                            background: 'var(--color-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '1rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            WebkitTapHighlightColor: 'transparent',
                          }}
                        >
                          Start Next Season →
                        </button>
                      )}
                      <button
                        onClick={() => setSeasonActionModal({ action: 'end', league })}
                        style={{
                          padding: '12px 20px',
                          background: 'none',
                          color: 'var(--color-text-secondary)',
                          border: '1.5px solid var(--color-border)',
                          borderRadius: '10px',
                          fontSize: '1rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        End the League
                      </button>
                    </div>
                  </div>
                )}

                {(league.state.fixtures.length > 0 || (league.history && league.history.length > 0)) && (
                  <div style={{
                    display: 'flex',
                    padding: '4px',
                    background: 'var(--color-border)',
                    borderRadius: '999px',
                    marginBottom: '12px',
                    gap: '4px',
                  }}>
                    <button
                      onClick={() => setStandingsView('current')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: standingsView === 'current' ? 'var(--color-primary)' : 'transparent',
                        color: standingsView === 'current' ? '#fff' : 'var(--color-text-secondary)',
                        border: 'none',
                        borderRadius: '999px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      Current Season
                    </button>
                    <button
                      onClick={() => setStandingsView('alltime')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: standingsView === 'alltime' ? 'var(--color-primary)' : 'transparent',
                        color: standingsView === 'alltime' ? '#fff' : 'var(--color-text-secondary)',
                        border: 'none',
                        borderRadius: '999px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      All-Time
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', overflowX: 'auto' }}>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        padding: '12px 10px',
                        borderBottom: '1.5px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: 'var(--color-text-secondary)',
                      }}>
                        <span style={{ width: '30px', textAlign: 'center' }}>Rank</span>
                        <span style={{ flex: 1, textAlign: 'left' }}>Player</span>
                        <span style={{ width: '25px', textAlign: 'center' }}>P</span>
                        <span style={{ width: '25px', textAlign: 'center' }}>W</span>
                        <span style={{ width: '25px', textAlign: 'center' }}>L</span>
                        <span style={{ width: '35px', textAlign: 'right', paddingRight: '10px' }}>Pts</span>
                        <span style={{ width: '30px', textAlign: 'right', paddingRight: '8px' }}>PF</span>
                        <span style={{ width: '30px', textAlign: 'right', paddingRight: '8px' }}>PA</span>
                        <span style={{ width: '35px', textAlign: 'right', paddingRight: '10px' }}>D</span>
                      </div>

                      {activeStandings.map((row, index) => (
                        <div key={row.player} style={{
                          display: 'flex',
                          gap: '8px',
                          padding: '12px 10px',
                          borderBottom: '1px solid var(--color-border)',
                          background: index % 2 === 1 ? 'var(--color-surface-subtle)' : 'var(--color-surface)',
                          fontSize: '0.95rem',
                          color: 'var(--color-text-primary)',
                          alignItems: 'center',
                          minHeight: '48px',
                        }}>
                          <span style={{ width: '55px', display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '8px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            <span style={{ width: '20px', display: 'inline-block', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                              {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : '•'}
                            </span>
                            <span>{row.rank}</span>
                          </span>
                          <span style={{ flex: 1, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {row.player}
                            {row.tieGroup !== null && row.tieGroup.length > 1 && (
                              <span
                                onClick={() => setTiebreakerGroup({ players: row.tieGroup, pointsLevel: row.leaguePoints })}
                                style={{
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  color: 'var(--color-primary)',
                                  fontSize: '0.85rem',
                                }}
                              >
                                ⓘ
                              </span>
                            )}
                          </span>
                          <span className="tabular" style={{ width: '25px', textAlign: 'center' }}>
                            {row.matchesPlayed}
                          </span>
                          <span className="tabular" style={{ width: '25px', textAlign: 'center' }}>
                            {row.wins}
                          </span>
                          <span className="tabular" style={{ width: '25px', textAlign: 'center' }}>
                            {row.losses}
                          </span>
                          <span className="tabular" style={{ width: '35px', textAlign: 'right', paddingRight: '10px', fontWeight: 700 }}>
                            {row.leaguePoints}
                          </span>
                          <span className="tabular" style={{ width: '30px', textAlign: 'right', paddingRight: '8px' }}>
                            {row.pointsFor}
                          </span>
                          <span className="tabular" style={{ width: '30px', textAlign: 'right', paddingRight: '8px' }}>
                            {row.pointsAgainst}
                          </span>
                          <span className="tabular" style={{ width: '35px', textAlign: 'right', paddingRight: '10px' }}>
                            {row.pointDiff > 0 ? '+' + row.pointDiff : row.pointDiff}
                          </span>
                        </div>
                      ))}
                </div>

                {standingsView === 'alltime' && league.history && league.history.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                    <button
                      onClick={() => setShowBreakdown(true)}
                      style={{
                        padding: '12px 20px',
                        background: 'transparent',
                        color: 'var(--color-primary)',
                        border: '1.5px solid var(--color-primary)',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      Points by Season
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>

      {tiebreakerGroup && (
        <TiebreakerModal
          group={tiebreakerGroup.players}
          fixtures={activeFixtures}
          pointsLevel={tiebreakerGroup.pointsLevel}
          standings={standings}
          gamePoint={league.config.game_point}
          onClose={() => setTiebreakerGroup(null)}
        />
      )}

      {showBreakdown && (
        <SeasonBreakdownModal
          league={league}
          onClose={() => setShowBreakdown(false)}
        />
      )}

      {seasonActionModal && (
        <SeasonActionModal
          action={seasonActionModal.action}
          league={seasonActionModal.league}
          onConfirm={() => handleSeasonAction(seasonActionModal.action)}
          onCancel={() => setSeasonActionModal(null)}
        />
      )}

      {showSettings && league && (
        <SettingsModal
          league={league}
          onSave={(updated) => {
            setLeague(updated);
            setShowSettings(false);
          }}
          onCancel={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
