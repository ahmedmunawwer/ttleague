import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket.js';
import socketEmit from '../socketEmit.js';
import Counter from '../components/Counter.jsx';

function computeWinnerScore(loserScore, gamePoint) {
  return Math.max(gamePoint + 1, loserScore + 2);
}

export default function LeagueView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [league, setLeague] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('fixtures');
  const [numTables, setNumTables] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [fixtureError, setFixtureError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [savingMatchId, setSavingMatchId] = useState(null);
  const [scoreErrors, setScoreErrors] = useState({});

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

  async function handleSaveScore(match, resolvedScoreA, resolvedScoreB) {
    setSavingMatchId(match.id);
    try {
      const ack = await socketEmit('update_match_score', id, match.id, resolvedScoreA, resolvedScoreB);
      if (ack.ok) {
        setLeague(ack.league);
        setEditing(null);
        setSavingMatchId(null);
        setScoreErrors((prev) => {
          const next = { ...prev };
          delete next[match.id];
          return next;
        });
      } else {
        setScoreErrors((prev) => ({ ...prev, [match.id]: ack.error }));
        setSavingMatchId(null);
      }
    } catch (err) {
      setScoreErrors((prev) => ({ ...prev, [match.id]: 'Network error' }));
      setSavingMatchId(null);
    }
  }

  function handleCancelEdit(matchId) {
    setEditing(null);
    setScoreErrors((prev) => {
      const next = { ...prev };
      delete next[matchId];
      return next;
    });
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
          ← Back
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}>
        <button
          onClick={() => navigate(-1)}
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
          ← Back
        </button>
        <h1 style={{
          flex: 1,
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

                    const canSave = isEditingThis
                      && loserScoreNum !== null
                      && (resolvedScoreA !== match.scoreA || resolvedScoreB !== match.scoreB);

                    function handleScoreChange(letter, rawValue) {
                      const digits = rawValue.replace(/\D/g, '').slice(0, 3);
                      setEditing({ matchId: match.id, loserInput: letter, loserScore: digits });
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

                      if (isThisSideStar) {
                        const starScore = side === 'A' ? resolvedScoreA : resolvedScoreB;
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
                            {starScore}
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
                          {isEditingThis && (
                            <>
                              <button
                                onClick={() => handleSaveScore(match, resolvedScoreA, resolvedScoreB)}
                                disabled={!canSave || savingMatchId === match.id}
                                style={{
                                  padding: '6px 10px',
                                  background: 'var(--color-primary)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  opacity: (!canSave || savingMatchId === match.id) ? 0.5 : 1,
                                  WebkitTapHighlightColor: 'transparent',
                                }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => handleCancelEdit(match.id)}
                                style={{
                                  padding: '6px 10px',
                                  background: 'none',
                                  border: '1.5px solid var(--color-border)',
                                  borderRadius: '6px',
                                  color: 'var(--color-text-secondary)',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  WebkitTapHighlightColor: 'transparent',
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          )}
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
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>
              Standings will appear once matches are played
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
