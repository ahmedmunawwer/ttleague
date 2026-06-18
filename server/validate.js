'use strict';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(id) {
  return typeof id === 'string' && UUID_RE.test(id);
}

function validateName(name, minLen, maxLen) {
  if (typeof name !== 'string') return { ok: false, error: 'Name must be a string' };
  const value = name.trim();
  if (value.length < minLen || value.length > maxLen) {
    return { ok: false, error: `Name must be between ${minLen} and ${maxLen} characters` };
  }
  return { ok: true, value };
}

function validateInt(value, min, max) {
  if (!Number.isInteger(value) || value < min || (max !== undefined && value > max)) {
    return { ok: false, error: 'Value must be a valid integer' };
  }
  return { ok: true };
}

function validateStatus(status) {
  if (status !== 'in_progress' && status !== 'completed' && status !== 'terminated') {
    return { ok: false, error: 'Invalid status filter' };
  }
  return { ok: true };
}

function validateLeagueConfig(config) {
  if (!config || typeof config !== 'object') {
    return { ok: false, error: 'Invalid configuration' };
  }

  const nameResult = validateName(config.name, 3, 20);
  if (!nameResult.ok) return nameResult;

  if (!Number.isInteger(config.num_players) || config.num_players < 2) {
    return { ok: false, error: 'Number of players must be an integer of at least 2' };
  }

  if (!Array.isArray(config.players) || config.players.length !== config.num_players) {
    return { ok: false, error: `Players list must contain exactly ${config.num_players} unique names` };
  }

  const trimmedPlayers = [];
  for (const p of config.players) {
    const pResult = validateName(p, 1, 20);
    if (!pResult.ok) return { ok: false, error: 'Each player name must be between 1 and 20 characters' };
    trimmedPlayers.push(pResult.value);
  }

  const uniquePlayers = new Set(trimmedPlayers.map(p => p.toLowerCase()));
  if (uniquePlayers.size !== trimmedPlayers.length) {
    return { ok: false, error: 'Player names must be unique' };
  }

  if (!Number.isInteger(config.points_per_win) || config.points_per_win < 1) {
    return { ok: false, error: 'Points per win must be a positive integer' };
  }

  if (!Number.isInteger(config.round_robin_freq) || config.round_robin_freq < 1) {
    return { ok: false, error: 'Round robin frequency must be a positive integer' };
  }

  if (config.num_seasons !== null) {
    if (!Number.isInteger(config.num_seasons) || config.num_seasons < 1) {
      return { ok: false, error: 'Number of seasons must be a positive integer or null' };
    }
  }

  if (!Number.isInteger(config.game_point) || config.game_point < 5) {
    return { ok: false, error: 'Game point must be an integer of at least 5' };
  }

  return {
    ok: true,
    value: {
      name: nameResult.value,
      num_players: config.num_players,
      players: trimmedPlayers,
      points_per_win: config.points_per_win,
      round_robin_freq: config.round_robin_freq,
      num_seasons: config.num_seasons,
      game_point: config.game_point,
    },
  };
}

function validateMatchScore(scoreA, scoreB, gamePoint) {
  if (scoreA === null && scoreB === null) {
    return { ok: true };
  }

  if (scoreA === null || scoreB === null) {
    return { ok: false, error: 'Both scores required' };
  }

  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB)) {
    return { ok: false, error: 'Scores must be integers' };
  }

  if (scoreA < 0 || scoreB < 0) {
    return { ok: false, error: 'Scores cannot be negative' };
  }

  if (scoreA === scoreB) {
    return { ok: false, error: 'Scores cannot be tied' };
  }

  const winner = Math.max(scoreA, scoreB);
  const loser = Math.min(scoreA, scoreB);
  const expected = Math.max(gamePoint + 1, loser + 2);

  if (winner !== expected) {
    return { ok: false, error: `Invalid final score (expected ${expected} for loser ${loser})` };
  }

  return { ok: true };
}

function validateSeasonComplete(league) {
  if (!league.state || !Array.isArray(league.state.fixtures)) {
    return { ok: false, error: 'League has no fixtures' };
  }

  if (league.state.fixtures.length === 0) {
    return { ok: false, error: 'Season not complete — no fixtures generated' };
  }

  const allPlayed = league.state.fixtures.every(f => f.scoreA !== null && f.scoreB !== null);
  if (!allPlayed) {
    return { ok: false, error: 'Season not complete — all matches must be played' };
  }

  return { ok: true };
}

module.exports = { isValidUuid, validateName, validateInt, validateStatus, validateLeagueConfig, validateMatchScore, validateSeasonComplete };
