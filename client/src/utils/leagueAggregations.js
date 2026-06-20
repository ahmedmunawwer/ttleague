import { computeStandings } from './standings.js';

export function computeLeagueSummary(entryData) {
  // entryData shape: { id, name, createdAt, lastUpdatedAt, completionStatus, config, state, history }

  if (entryData.completionStatus === 'completed') {
    // Aggregate all history fixtures
    const allFixtures = (entryData.history || []).flatMap(snap => snap.fixtures);

    // Compute standings on aggregated set
    const standings = computeStandings(
      allFixtures,
      entryData.config.players,
      entryData.config.points_per_win,
      entryData.config.game_point
    );

    // Winner = all rank-1 players joined by ' / '
    const rank1Players = standings.filter(s => s.rank === 1).map(s => s.player);
    const winner = rank1Players.join(' / ');

    // Count seasons and matches
    const seasonCount = entryData.history.length;
    const matchCount = allFixtures.length;

    return { winner, seasonCount, matchCount };
  }

  if (entryData.completionStatus === 'in_progress') {
    // Filter for played-only matches
    const playedCurrent = entryData.state.fixtures.filter(f => f.scoreA !== null && f.scoreB !== null);

    // Compute current season standings
    const standings = computeStandings(
      playedCurrent,
      entryData.config.players,
      entryData.config.points_per_win,
      entryData.config.game_point
    );

    // Current leader = all rank-1 players joined by ' / ', or null if no played matches
    let currentLeader = null;
    if (standings.length > 0) {
      const rank1Players = standings.filter(s => s.rank === 1).map(s => s.player);
      currentLeader = rank1Players.join(' / ');
    }

    // Count matches
    const currentSeasonMatches = playedCurrent.length;
    const historicalMatches = (entryData.history || []).reduce((sum, snap) => sum + snap.fixtures.length, 0);

    return {
      currentLeader,
      currentSeasonMatches,
      historicalMatches,
      currentSeason: entryData.state.current_season,
      totalSeasons: entryData.config.num_seasons,
    };
  }

  if (entryData.completionStatus === 'terminated') {
    return null;
  }
}
