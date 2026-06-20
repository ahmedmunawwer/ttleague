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

export function computeAllPlayersStats(scoreboardEntries) {
  const playerStats = {};
  const allPlayers = new Set();

  // First pass: collect all players, initialize stats
  for (const entry of scoreboardEntries) {
    if (entry.completionStatus === 'terminated') continue;
    for (const player of entry.config.players) {
      allPlayers.add(player);
      if (!playerStats[player]) {
        playerStats[player] = {
          name: player,
          leaguesPlayed: 0,
          leaguesWon: 0,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
        };
      }
      playerStats[player].leaguesPlayed += 1;
    }
  }

  // Second pass: aggregate fixtures and compute stats
  for (const entry of scoreboardEntries) {
    if (entry.completionStatus === 'terminated') continue;

    // Gather all fixtures from this league
    const allFixtures = [
      ...(entry.history || []).flatMap(snap => snap.fixtures),
      ...(entry.completionStatus === 'in_progress'
        ? entry.state.fixtures.filter(f => f.scoreA !== null && f.scoreB !== null)
        : [])
    ];

    // Process each fixture
    for (const fixture of allFixtures) {
      const playerA = fixture.playerA;
      const playerB = fixture.playerB;

      if (playerStats[playerA]) {
        playerStats[playerA].matchesPlayed += 1;
        playerStats[playerA].pointsFor += fixture.scoreA;
        playerStats[playerA].pointsAgainst += fixture.scoreB;
        playerStats[playerA].wins += fixture.scoreA > fixture.scoreB ? 1 : 0;
        playerStats[playerA].losses += fixture.scoreA < fixture.scoreB ? 1 : 0;
      }

      if (playerStats[playerB]) {
        playerStats[playerB].matchesPlayed += 1;
        playerStats[playerB].pointsFor += fixture.scoreB;
        playerStats[playerB].pointsAgainst += fixture.scoreA;
        playerStats[playerB].wins += fixture.scoreB > fixture.scoreA ? 1 : 0;
        playerStats[playerB].losses += fixture.scoreB < fixture.scoreA ? 1 : 0;
      }
    }

    // For completed leagues: compute standings and credit leaguesWon
    if (entry.completionStatus === 'completed') {
      const allFixtures = (entry.history || []).flatMap(snap => snap.fixtures);
      const standings = computeStandings(
        allFixtures,
        entry.config.players,
        entry.config.points_per_win,
        entry.config.game_point
      );

      const rank1Players = standings.filter(s => s.rank === 1).map(s => s.player);
      for (const player of rank1Players) {
        if (playerStats[player]) {
          playerStats[player].leaguesWon += 1;
        }
      }
    }
  }

  // Sort by leaguesWon desc, then matchesPlayed desc
  return Object.values(playerStats).sort((a, b) => {
    if (b.leaguesWon !== a.leaguesWon) return b.leaguesWon - a.leaguesWon;
    return b.matchesPlayed - a.matchesPlayed;
  });
}

export function computePlayerDetail(playerName, scoreboardEntries) {
  // Build summary stats (same aggregation as above, but single player)
  const summary = {
    name: playerName,
    leaguesPlayed: 0,
    leaguesWon: 0,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
  };

  // Build H2H counters
  const h2h = {};

  // Build leagues list
  const leagues = [];

  // Build best season finish tracker
  let bestSeasonFinish = null;

  // Process each entry
  for (const entry of scoreboardEntries) {
    if (entry.completionStatus === 'terminated') continue;

    // Check if player is in this league
    if (!entry.config.players.includes(playerName)) continue;

    summary.leaguesPlayed += 1;

    // Gather all fixtures from this league
    const allFixtures = [
      ...(entry.history || []).flatMap(snap => snap.fixtures),
      ...(entry.completionStatus === 'in_progress'
        ? entry.state.fixtures.filter(f => f.scoreA !== null && f.scoreB !== null)
        : [])
    ];

    // Aggregate stats from fixtures
    let leagueWins = 0;
    let leagueLosses = 0;
    let leaguePointsFor = 0;
    let leaguePointsAgainst = 0;

    for (const fixture of allFixtures) {
      let playerScore, opponentScore, opponentName;

      if (fixture.playerA === playerName) {
        playerScore = fixture.scoreA;
        opponentScore = fixture.scoreB;
        opponentName = fixture.playerB;
      } else if (fixture.playerB === playerName) {
        playerScore = fixture.scoreB;
        opponentScore = fixture.scoreA;
        opponentName = fixture.playerA;
      } else {
        continue;
      }

      // Update summary
      summary.matchesPlayed += 1;
      summary.pointsFor += playerScore;
      summary.pointsAgainst += opponentScore;

      if (playerScore > opponentScore) {
        summary.wins += 1;
        leagueWins += 1;
      } else {
        summary.losses += 1;
        leagueLosses += 1;
      }

      leaguePointsFor += playerScore;
      leaguePointsAgainst += opponentScore;

      // Update H2H
      if (!h2h[opponentName]) {
        h2h[opponentName] = { wins: 0, losses: 0, matches: 0 };
      }
      h2h[opponentName].matches += 1;
      if (playerScore > opponentScore) {
        h2h[opponentName].wins += 1;
      } else {
        h2h[opponentName].losses += 1;
      }
    }

    // Compute rank for this league
    let leagueRank = null;
    if (allFixtures.length > 0) {
      const standings = computeStandings(
        allFixtures,
        entry.config.players,
        entry.config.points_per_win,
        entry.config.game_point
      );
      const playerStanding = standings.find(s => s.player === playerName);
      if (playerStanding) {
        leagueRank = playerStanding.rank;
      }
    }

    // Add to leagues list
    leagues.push({
      leagueId: entry.id,
      leagueName: entry.name,
      status: entry.completionStatus,
      rank: leagueRank,
      wins: leagueWins,
      losses: leagueLosses,
      pointsFor: leaguePointsFor,
      pointsAgainst: leaguePointsAgainst,
      seasonCount: entry.history.length + (entry.completionStatus === 'in_progress' ? 1 : 0),
    });

    // For best season finish: evaluate all seasons across all leagues (in-progress OR completed)
    for (let i = 0; i < (entry.history || []).length; i++) {
      const seasonFixtures = entry.history[i].fixtures;
      if (seasonFixtures.length === 0) continue;

      const seasonStandings = computeStandings(
        seasonFixtures,
        entry.config.players,
        entry.config.points_per_win,
        entry.config.game_point
      );

      const playerStanding = seasonStandings.find(s => s.player === playerName);
      if (playerStanding) {
        const rank = playerStanding.rank;
        if (bestSeasonFinish === null || rank < bestSeasonFinish.rank) {
          bestSeasonFinish = {
            rank,
            leagueId: entry.id,
            leagueName: entry.name,
            seasonNum: entry.history[i].season_num,
          };
        }
      }
    }

    // For completed leagues: compute standings and credit leaguesWon
    if (entry.completionStatus === 'completed') {
      const allFixtures = (entry.history || []).flatMap(snap => snap.fixtures);
      const standings = computeStandings(
        allFixtures,
        entry.config.players,
        entry.config.points_per_win,
        entry.config.game_point
      );

      const rank1Players = standings.filter(s => s.rank === 1).map(s => s.player);
      if (rank1Players.includes(playerName)) {
        summary.leaguesWon += 1;
      }
    }
  }

  // Sort leagues by lastUpdatedAt desc
  leagues.sort((a, b) => {
    const entryA = scoreboardEntries.find(e => e.id === a.leagueId);
    const entryB = scoreboardEntries.find(e => e.id === b.leagueId);
    if (!entryA || !entryB) return 0;
    return new Date(entryB.lastUpdatedAt) - new Date(entryA.lastUpdatedAt);
  });

  return {
    name: playerName,
    summary,
    leagues,
    h2h,
    bestSeasonFinish,
  };
}
