function computeNetEfficiency(playerName, completedMatches, gamePoint) {
  let total = 0;
  for (const match of completedMatches) {
    let playerScore, opponentScore;
    if (match.playerA === playerName) {
      playerScore = match.scoreA;
      opponentScore = match.scoreB;
    } else if (match.playerB === playerName) {
      playerScore = match.scoreB;
      opponentScore = match.scoreA;
    } else {
      continue;
    }
    const winnerScore = Math.max(playerScore, opponentScore);
    const isNormalGame = winnerScore === gamePoint + 1;
    if (isNormalGame) {
      total += playerScore;
    } else {
      // deuce game: cap at gamePoint+1 for winner, gamePoint for loser
      const playerWon = playerScore > opponentScore;
      total += playerWon ? gamePoint + 1 : gamePoint;
    }
  }
  return total;
}

function computeNetEfficiencyBreakdown(playerName, completedMatches, gamePoint) {
  const matches = [];
  let total = 0;
  for (const match of completedMatches) {
    let playerScore, opponentScore, opponentName;
    if (match.playerA === playerName) {
      playerScore = match.scoreA;
      opponentScore = match.scoreB;
      opponentName = match.playerB;
    } else if (match.playerB === playerName) {
      playerScore = match.scoreB;
      opponentScore = match.scoreA;
      opponentName = match.playerA;
    } else {
      continue;
    }
    const winnerScore = Math.max(playerScore, opponentScore);
    const isNormalGame = winnerScore === gamePoint + 1;
    const playerWon = playerScore > opponentScore;
    const result = playerWon ? 'Won' : 'Lost';
    const score = playerScore + '-' + opponentScore;

    let contribution, formulaText;
    if (isNormalGame) {
      contribution = playerScore;
      formulaText = '+' + contribution;
    } else {
      contribution = playerWon ? gamePoint + 1 : gamePoint;
      formulaText = '+' + contribution;
    }

    matches.push({
      opponent: opponentName,
      result,
      score,
      isDeuce: !isNormalGame,
      contribution,
      formulaText
    });
    total += contribution;
  }
  return { playerName, matches, total };
}

function computeStandings(fixtures, players, pointsPerWin, gamePoint = 10) {
  const completed = fixtures.filter(f => f.scoreA !== null && f.scoreB !== null);

  const playerStats = {};
  for (const p of players) {
    playerStats[p] = {
      player: p,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    };
  }

  for (const match of completed) {
    const a = match.playerA;
    const b = match.playerB;
    if (!playerStats[a] || !playerStats[b]) continue;

    playerStats[a].matchesPlayed += 1;
    playerStats[b].matchesPlayed += 1;
    playerStats[a].pointsFor += match.scoreA;
    playerStats[a].pointsAgainst += match.scoreB;
    playerStats[b].pointsFor += match.scoreB;
    playerStats[b].pointsAgainst += match.scoreA;

    if (match.scoreA > match.scoreB) {
      playerStats[a].wins += 1;
      playerStats[b].losses += 1;
    } else {
      playerStats[b].wins += 1;
      playerStats[a].losses += 1;
    }
  }

  for (const p of Object.keys(playerStats)) {
    const stat = playerStats[p];
    stat.pointDiff = stat.pointsFor - stat.pointsAgainst;
    stat.leaguePoints = stat.wins * pointsPerWin;
  }

  const standings = applyTiebreakers(
    Object.values(playerStats),
    completed,
    new Set(players),
    gamePoint
  );

  const result = standings.map((stat, idx) => ({
    rank: stat.rank,
    player: stat.player,
    matchesPlayed: stat.matchesPlayed,
    wins: stat.wins,
    losses: stat.losses,
    pointsFor: stat.pointsFor,
    pointsAgainst: stat.pointsAgainst,
    pointDiff: stat.pointDiff,
    leaguePoints: stat.leaguePoints,
    tieGroup: stat.tieGroup,
    unresolvedTie: stat.unresolvedTie,
  }));

  return result;
}

function applyTiebreakers(standings, completed, allPlayers, gamePoint) {
  const byPoints = {};
  for (const stat of standings) {
    const pts = stat.leaguePoints;
    if (!byPoints[pts]) byPoints[pts] = [];
    byPoints[pts].push(stat);
  }

  const sorted = [];
  let maxRank = 0;
  for (const pts of Object.keys(byPoints)
    .map(Number)
    .sort((a, b) => b - a)) {
    const group = byPoints[pts];
    let baseRank = maxRank + 1;
    if (group.length === 1) {
      group[0].rank = baseRank;
      group[0].tieGroup = null;
      sorted.push(group[0]);
      maxRank = baseRank;
    } else {
      const tiedNames = new Set(group.map(s => s.player));
      const resolved = resolveTieGroup(group, tiedNames, completed, 0, tiedNames, gamePoint);
      let i = 0;
      while (i < resolved.length) {
        const stat = resolved[i];
        stat.rank = baseRank;

        if (stat.unresolvedTie) {
          // Find consecutive players with unresolvedTie=true (still tied)
          let j = i + 1;
          while (j < resolved.length && resolved[j].unresolvedTie) {
            resolved[j].rank = baseRank;
            j++;
          }
          // Dense ranking: next available rank is baseRank + 1
          for (let k = i; k < j; k++) {
            sorted.push(resolved[k]);
          }
          baseRank += 1;
          i = j;
        } else {
          // Unique player (resolved by some metric)
          sorted.push(stat);
          baseRank += 1;
          i += 1;
        }
      }
      maxRank = baseRank - 1;
    }
  }

  return sorted;
}

function resolveTieGroup(group, tiedNames, completed, metricsApplied = 0, originalTiedNames = tiedNames, gamePoint) {
  if (metricsApplied >= 4) {
    return group.map(s => ({
      ...s,
      tieGroup: Array.from(originalTiedNames).sort(),
      unresolvedTie: group.length > 1
    }));
  }

  const byMetric = {};

  for (const stat of group) {
    let value;
    if (metricsApplied === 0) {
      value = computeH2HWins(stat.player, tiedNames, completed);
    } else if (metricsApplied === 1) {
      value = computeH2HPointDiff(stat.player, tiedNames, completed);
    } else if (metricsApplied === 2) {
      value = computeOverallPointDiff(stat.player, group);
    } else {
      // metric 3: net efficiency (higher is better)
      value = computeNetEfficiency(stat.player, completed, gamePoint);
    }

    if (!byMetric[value]) byMetric[value] = [];
    byMetric[value].push(stat);
  }

  const sorted = [];
  const sortedValues = Object.keys(byMetric)
    .map(Number)
    .sort((a, b) => b - a);
  for (const value of sortedValues) {
    const subGroup = byMetric[value];

    if (subGroup.length === 1) {
      const stat = subGroup[0];
      stat.tieGroup = Array.from(originalTiedNames).sort();
      stat.unresolvedTie = false;
      sorted.push(stat);
    } else {
      const subTiedNames = new Set(subGroup.map(s => s.player));
      const madeProgress = subGroup.length < group.length;
      const nextMetric = madeProgress ? 0 : metricsApplied + 1;
      const subResolved = resolveTieGroup(subGroup, subTiedNames, completed, nextMetric, originalTiedNames, gamePoint);
      sorted.push(...subResolved);
    }
  }

  return sorted;
}

function computeH2HWins(playerName, tiedPlayerNames, completed) {
  let wins = 0;
  for (const match of completed) {
    if (
      tiedPlayerNames.has(match.playerA) &&
      tiedPlayerNames.has(match.playerB)
    ) {
      if (match.playerA === playerName && match.scoreA > match.scoreB) {
        wins += 1;
      } else if (match.playerB === playerName && match.scoreB > match.scoreA) {
        wins += 1;
      }
    }
  }
  return wins;
}

function computeH2HPointDiff(playerName, tiedPlayerNames, completed) {
  let pointsFor = 0;
  let pointsAgainst = 0;
  for (const match of completed) {
    if (tiedPlayerNames.has(match.playerA) && tiedPlayerNames.has(match.playerB)) {
      if (match.playerA === playerName) {
        pointsFor += match.scoreA;
        pointsAgainst += match.scoreB;
      } else if (match.playerB === playerName) {
        pointsFor += match.scoreB;
        pointsAgainst += match.scoreA;
      }
    }
  }
  return pointsFor - pointsAgainst;
}

function computeOverallPointDiff(playerName, statsArray) {
  for (const stat of statsArray) {
    if (stat.player === playerName) {
      return stat.pointsFor - stat.pointsAgainst;
    }
  }
  return 0;
}

function computeTiebreakerBreakdown(tiedPlayerNames, fixtures, gamePoint = 10) {
  const tiedSet = new Set(tiedPlayerNames);
  const completed = fixtures.filter(f => f.scoreA !== null && f.scoreB !== null);

  const steps = [];
  const playerStats = {};

  // Pre-compute per-player overall stats for use in metric 2
  for (const p of tiedPlayerNames) {
    playerStats[p] = { pointsFor: 0, pointsAgainst: 0 };
  }
  for (const match of completed) {
    if (tiedSet.has(match.playerA)) {
      playerStats[match.playerA].pointsFor += match.scoreA;
      playerStats[match.playerA].pointsAgainst += match.scoreB;
    }
    if (tiedSet.has(match.playerB)) {
      playerStats[match.playerB].pointsFor += match.scoreB;
      playerStats[match.playerB].pointsAgainst += match.scoreA;
    }
  }

  // Recursive helper that records steps as cascade proceeds
  function recordSteps(subgroup, subTiedNames, metricsApplied = 0) {
    if (metricsApplied >= 4 || subgroup.length === 0) {
      return;
    }

    if (subgroup.length === 1) {
      return;
    }

    const values = {};
    for (const stat of subgroup) {
      let value;
      if (metricsApplied === 0) {
        value = computeH2HWinsForBreakdown(stat.player, subTiedNames, completed);
      } else if (metricsApplied === 1) {
        value = computeH2HPointDiffForBreakdown(stat.player, subTiedNames, completed);
      } else if (metricsApplied === 2) {
        value = playerStats[stat.player].pointsFor - playerStats[stat.player].pointsAgainst;
      } else {
        value = computeNetEfficiency(stat.player, completed, gamePoint);
      }
      values[stat.player] = value;
    }

    const byValue = {};
    for (const stat of subgroup) {
      const v = values[stat.player];
      if (!byValue[v]) byValue[v] = [];
      byValue[v].push(stat.player);
    }

    const sortedValues = Object.keys(byValue)
      .map(Number)
      .sort((a, b) => b - a);

    const metricLabels = [
      'Head-to-Head Wins',
      'Head-to-Head Point Difference',
      'Overall Point Difference',
      'Net Efficiency'
    ];
    const metricKeys = ['h2hWins', 'h2hPointDiff', 'overallPointDiff', 'netEfficiency'];

    const resolvedAtThisStep = [];
    for (const value of sortedValues) {
      const group = byValue[value];
      if (group.length === 1) {
        resolvedAtThisStep.push(group[0]);
      }
    }

    const madeProgress = sortedValues.length > 1;

    const step = {
      stepNum: steps.length + 1,
      subgroup: Array.from(subTiedNames).sort(),
      metric: metricKeys[metricsApplied],
      metricLabel: metricLabels[metricsApplied],
      direction: 'desc',
      values,
      madeProgress,
      resolvedAtThisStep,
    };
    steps.push(step);

    // Recurse on multi-player groups
    for (const value of sortedValues) {
      const group = byValue[value];
      if (group.length > 1) {
        const nextMetric = madeProgress ? 0 : metricsApplied + 1;
        const nextTiedNames = new Set(group);
        const nextSubgroup = subgroup.filter(s => group.includes(s.player));
        recordSteps(nextSubgroup, nextTiedNames, nextMetric);
      }
    }
  }

  // Start cascade from full group
  const initialStats = tiedPlayerNames.map(p => ({ player: p }));
  const initialTiedNames = new Set(tiedPlayerNames);
  recordSteps(initialStats, initialTiedNames, 0);

  // Determine finalUnresolved: players who remain in multi-player groups after all steps
  const resolvedSet = new Set();
  for (const step of steps) {
    for (const player of step.resolvedAtThisStep) {
      resolvedSet.add(player);
    }
  }
  const finalUnresolved = tiedPlayerNames.filter(p => !resolvedSet.has(p));

  return {
    originalGroup: Array.from(tiedPlayerNames).sort(),
    steps,
    finalUnresolved,
  };
}

function computeH2HWinsForBreakdown(playerName, tiedPlayerNames, completed) {
  let wins = 0;
  for (const match of completed) {
    if (tiedPlayerNames.has(match.playerA) && tiedPlayerNames.has(match.playerB)) {
      if (match.playerA === playerName && match.scoreA > match.scoreB) {
        wins += 1;
      } else if (match.playerB === playerName && match.scoreB > match.scoreA) {
        wins += 1;
      }
    }
  }
  return wins;
}

function computeH2HPointDiffForBreakdown(playerName, tiedPlayerNames, completed) {
  let pointsFor = 0;
  let pointsAgainst = 0;
  for (const match of completed) {
    if (tiedPlayerNames.has(match.playerA) && tiedPlayerNames.has(match.playerB)) {
      if (match.playerA === playerName) {
        pointsFor += match.scoreA;
        pointsAgainst += match.scoreB;
      } else if (match.playerB === playerName) {
        pointsFor += match.scoreB;
        pointsAgainst += match.scoreA;
      }
    }
  }
  return pointsFor - pointsAgainst;
}

export { computeStandings, computeTiebreakerBreakdown, computeNetEfficiencyBreakdown };
