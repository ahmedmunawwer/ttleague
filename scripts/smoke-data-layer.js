'use strict';

const { io } = require('socket.io-client');

const LEAGUE_NAME = 'Summer 2025';
const LEAGUE_NAME_RENAMED = 'Summer 2025 Renamed';
const PRESET_NAME = 'TT Rule';
const TIMEOUT_MS = 5000;

let passed = 0;
let failed = 0;
let leagueBroadcasts = 0;
let presetBroadcasts = 0;
let scoreboardBroadcasts = 0;

const socket = io('http://localhost:3000', { reconnection: false });

function emit(event, ...args) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ ok: false, error: 'ack timeout' });
    }, TIMEOUT_MS);
    socket.emit(event, ...args, (ack) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

function pass(step, detail) {
  passed++;
  console.log(`[PASS] ${step}${detail ? ` (${detail})` : ''}`);
}

function fail(step, error) {
  failed++;
  console.log(`[FAIL] ${step}: ${error}`);
}

socket.once('connect_error', () => {
  console.error('ERROR: Could not connect to localhost:3000 — is the server running?');
  process.exit(1);
});

socket.on('connect', async () => {
  socket.on('leagues_list_changed', () => { leagueBroadcasts++; });
  socket.on('presets_changed', () => { presetBroadcasts++; });
  socket.on('scoreboard_changed', () => { scoreboardBroadcasts++; });

  // Pre-flight cleanup — leagues
  const listResult = await emit('list_leagues');
  if (!listResult.ok) {
    console.error(`ERROR: pre-flight cleanup failed: ${listResult.error}`);
    socket.disconnect();
    process.exit(1);
  }

  const staleLeagues = listResult.leagues.filter(
    (l) => l.name === LEAGUE_NAME || l.name === LEAGUE_NAME_RENAMED
  );
  for (const l of staleLeagues) {
    await emit('delete_league', l.id);
  }

  // Pre-flight cleanup — scoreboard
  const sbCleanup = await emit('list_scoreboard');
  if (sbCleanup.ok) {
    const staleEntries = (sbCleanup.entries || []).filter(
      (e) => e.name === LEAGUE_NAME || e.name === LEAGUE_NAME_RENAMED
    );
    for (const e of staleEntries) {
      await emit('delete_scoreboard_entry', e.id);
    }
  }

  const postCleanupLeagues = await emit('list_leagues');
  if (!postCleanupLeagues.ok) {
    console.error(`ERROR: pre-flight cleanup failed: ${postCleanupLeagues.error}`);
    socket.disconnect();
    process.exit(1);
  }
  const leagueBaseline = postCleanupLeagues.leagues.length;

  const presetsResult = await emit('list_presets');
  if (!presetsResult.ok) {
    console.error(`ERROR: pre-flight cleanup failed: ${presetsResult.error}`);
    socket.disconnect();
    process.exit(1);
  }
  const stalePresets = presetsResult.presets.filter((p) => p.name === PRESET_NAME);
  for (const p of stalePresets) {
    await emit('remove_preset', p.id);
  }
  const presetBaseline = presetsResult.presets.length - stalePresets.length;

  leagueBroadcasts = 0;
  presetBroadcasts = 0;
  scoreboardBroadcasts = 0;

  let leagueId = null;
  let presetId = null;

  // Step 1: create_league
  const create = await emit('create_league', {
    name: LEAGUE_NAME,
    num_players: 3,
    players: ['Ali', 'Ben', 'Cal'],
    points_per_win: 1,
    round_robin_freq: 2,
    num_seasons: 1,
    game_point: 10,
  });
  if (create.ok) {
    leagueId = create.league.id;
    pass('create_league', `id=${leagueId}`);
  } else {
    fail('create_league', create.error);
  }

  // Step 2: list_scoreboard (verify in_progress entry written on create)
  const sb1 = await emit('list_scoreboard');
  const sbEntry1 = sb1.ok ? (sb1.entries || []).find((e) => e.id === leagueId) : null;
  if (sb1.ok && sbEntry1 && sbEntry1.completionStatus === 'in_progress') {
    pass('list_scoreboard (in_progress after create)', `id=${leagueId}`);
  } else {
    fail('list_scoreboard (in_progress after create)', sb1.error || (sbEntry1 ? `status=${sbEntry1.completionStatus}` : 'entry not found'));
  }

  // Step 3: list_leagues unfiltered
  const list1 = await emit('list_leagues');
  if (list1.ok && list1.leagues.length >= 1) {
    pass('list_leagues (unfiltered)', `count=${list1.leagues.length}`);
  } else {
    fail('list_leagues (unfiltered)', list1.error || 'empty result');
  }

  // Step 4: list_leagues with status filter
  const list2 = await emit('list_leagues', { status: 'in_progress' });
  if (list2.ok && list2.leagues.length >= 1) {
    pass('list_leagues (status=in_progress)', `count=${list2.leagues.length}`);
  } else {
    fail('list_leagues (status=in_progress)', list2.error || 'empty result');
  }

  // Step 5: load_league
  const load = leagueId
    ? await emit('load_league', leagueId)
    : { ok: false, error: 'no id from step 1' };
  if (load.ok && load.league.name === LEAGUE_NAME) {
    pass('load_league', `name=${load.league.name}`);
  } else {
    fail('load_league', load.error || `unexpected name: ${load.league?.name}`);
  }

  // Step 6: rename_league
  const rename = leagueId
    ? await emit('rename_league', leagueId, LEAGUE_NAME_RENAMED)
    : { ok: false, error: 'no id from step 1' };
  if (rename.ok && rename.league.name === LEAGUE_NAME_RENAMED) {
    pass('rename_league', `name=${rename.league.name}`);
  } else {
    fail('rename_league', rename.error || `unexpected name: ${rename.league?.name}`);
  }

  // Step 7: list_presets (save initial count)
  const presets1 = await emit('list_presets');
  if (presets1.ok) {
    pass('list_presets (initial)', `count=${presets1.presets.length}`);
  } else {
    fail('list_presets (initial)', presets1.error);
  }

  // Step 8: add_preset
  const addPreset = await emit('add_preset', PRESET_NAME);
  if (addPreset.ok) {
    presetId = addPreset.preset.id;
    pass('add_preset', `id=${presetId}`);
  } else {
    fail('add_preset', addPreset.error);
  }

  // Step 9: remove_preset
  const removePreset = presetId
    ? await emit('remove_preset', presetId)
    : { ok: false, error: 'no id from step 8' };
  if (removePreset.ok) {
    pass('remove_preset', 'ok');
  } else {
    fail('remove_preset', removePreset.error);
  }

  // Step 10: delete_league
  const del = leagueId
    ? await emit('delete_league', leagueId)
    : { ok: false, error: 'no id from step 1' };
  if (del.ok) {
    pass('delete_league', 'ok');
  } else {
    fail('delete_league', del.error);
  }

  // Step 11: list_scoreboard (verify terminated entry after delete)
  const sb2 = await emit('list_scoreboard', { status: 'terminated' });
  const sbEntry2 = sb2.ok ? (sb2.entries || []).find((e) => e.id === leagueId) : null;
  if (sb2.ok && sbEntry2 && sbEntry2.completionStatus === 'terminated') {
    pass('list_scoreboard (terminated after delete)', `id=${leagueId}`);
  } else {
    fail('list_scoreboard (terminated after delete)', sb2.error || (sbEntry2 ? `status=${sbEntry2.completionStatus}` : 'entry not found'));
  }

  // Step 12: list_leagues (verify gone)
  const list3 = await emit('list_leagues');
  if (list3.ok && list3.leagues.length === leagueBaseline) {
    pass('list_leagues (verify gone)', `count=${list3.leagues.length} matches baseline`);
  } else {
    fail('list_leagues (verify gone)', list3.error || `count=${list3.leagues?.length}, expected=${leagueBaseline}`);
  }

  // Step 13: list_presets (verify baseline)
  const presets2 = await emit('list_presets');
  if (presets2.ok && presets2.presets.length === presetBaseline) {
    pass('list_presets (verify baseline)', `count=${presets2.presets.length} matches baseline`);
  } else {
    fail('list_presets (verify baseline)', presets2.error || `count=${presets2.presets?.length}, expected=${presetBaseline}`);
  }

  // Broadcast verification
  if (leagueBroadcasts === 3) {
    pass('broadcasts: leagues_list_changed', `count=${leagueBroadcasts}`);
  } else {
    fail('broadcasts: leagues_list_changed', `expected 3, got ${leagueBroadcasts}`);
  }

  if (presetBroadcasts === 2) {
    pass('broadcasts: presets_changed', `count=${presetBroadcasts}`);
  } else {
    fail('broadcasts: presets_changed', `expected 2, got ${presetBroadcasts}`);
  }

  if (scoreboardBroadcasts === 2) {
    pass('broadcasts: scoreboard_changed', `count=${scoreboardBroadcasts}`);
  } else {
    fail('broadcasts: scoreboard_changed', `expected 2, got ${scoreboardBroadcasts}`);
  }

  const total = passed + failed;
  console.log(`\nRESULT: ${passed}/${total} passed${failed > 0 ? ` (${failed} failed)` : ''}`);

  socket.disconnect();
  process.exit(failed > 0 ? 1 : 0);
});
