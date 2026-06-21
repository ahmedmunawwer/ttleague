'use strict';

const supabase = require('../supabase');
const { isValidUuid, validateName, validateStatus, validateLeagueConfig, validateNumTablesChange } = require('../validate');
const scoreboardManager = require('../scoreboardManager');

function registerLeagueHandlers(io, socket) {

  socket.on('create_league', async (config, cb) => {
    try {
      const r = validateLeagueConfig(config);
      if (!r.ok) return cb({ ok: false, error: r.error });

      const { data, error } = await supabase
        .from('leagues')
        .insert({
          name: r.value.name,
          config: {
            num_players: r.value.num_players,
            players: r.value.players,
            points_per_win: r.value.points_per_win,
            round_robin_freq: r.value.round_robin_freq,
            num_seasons: r.value.num_seasons,
            game_point: r.value.game_point,
          },
          state: { current_season: 1, num_tables: 1, fixtures: [] },
          history: [],
          status: 'in_progress',
        })
        .select()
        .single();

      if (error) {
        console.error('[create_league]', error);
        if (error.code === '23505') return cb({ ok: false, error: 'A league with that name already exists' });
        return cb({ ok: false, error: 'Failed to create league' });
      }

      try { await scoreboardManager.writeEntry(data.id, data); }
      catch (sbErr) { console.warn('[scoreboard] writeEntry failed (non-fatal):', sbErr.message); }

      io.emit('leagues_list_changed');
      io.emit('scoreboard_changed');
      cb({ ok: true, league: data });
    } catch (err) {
      console.error('[create_league]', err);
      cb({ ok: false, error: 'Failed to create league' });
    }
  });

  socket.on('list_leagues', async (filterOrCb, maybeCb) => {
    try {
      let filter, cb;
      if (typeof filterOrCb === 'function') {
        filter = null;
        cb = filterOrCb;
      } else {
        filter = filterOrCb;
        cb = maybeCb;
      }

      let query = supabase
        .from('leagues')
        .select('*')
        .order('updated_at', { ascending: false });

      if (filter && filter.status !== undefined) {
        const r = validateStatus(filter.status);
        if (!r.ok) return cb({ ok: false, error: r.error });
        query = query.eq('status', filter.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[list_leagues]', error);
        return cb({ ok: false, error: 'Failed to list leagues' });
      }

      cb({ ok: true, leagues: data });
    } catch (err) {
      console.error('[list_leagues]', err);
      cb({ ok: false, error: 'Failed to list leagues' });
    }
  });

  socket.on('load_league', async (id, cb) => {
    try {
      if (!isValidUuid(id)) return cb({ ok: false, error: 'Invalid ID format' });

      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('[load_league]', error);
        if (error.code === 'PGRST116') return cb({ ok: false, error: 'League not found' });
        return cb({ ok: false, error: 'Failed to load league' });
      }

      cb({ ok: true, league: data });
    } catch (err) {
      console.error('[load_league]', err);
      cb({ ok: false, error: 'Failed to load league' });
    }
  });

  socket.on('rename_league', async (id, newName, cb) => {
    try {
      if (!isValidUuid(id)) return cb({ ok: false, error: 'Invalid ID format' });

      const nameResult = validateName(newName, 3, 20);
      if (!nameResult.ok) return cb({ ok: false, error: nameResult.error });

      const { data, error } = await supabase
        .from('leagues')
        .update({ name: nameResult.value })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[rename_league]', error);
        if (error.code === 'PGRST116') return cb({ ok: false, error: 'League not found' });
        if (error.code === '23505') return cb({ ok: false, error: 'A league with that name already exists' });
        return cb({ ok: false, error: 'Failed to rename league' });
      }

      io.emit('leagues_list_changed');
      cb({ ok: true, league: data });
    } catch (err) {
      console.error('[rename_league]', err);
      cb({ ok: false, error: 'Failed to rename league' });
    }
  });

  socket.on('delete_league', async (id, cb) => {
    try {
      if (!isValidUuid(id)) return cb({ ok: false, error: 'Invalid ID format' });

      // markTerminated first — scoreboard must be archived before the row is hard-deleted.
      // If the league has no scoreboard row (pre-scoreboard legacy data), markTerminated
      // no-ops silently; the hard delete proceeds but leaves no scoreboard entry.
      try {
        await scoreboardManager.markTerminated(id);
      } catch (sbErr) {
        console.error('[delete_league] scoreboard archive failed:', sbErr.message);
        return cb({ ok: false, error: 'Failed to archive league' });
      }

      const { data, error } = await supabase
        .from('leagues')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error('[delete_league]', error);
        return cb({ ok: false, error: 'Failed to delete league' });
      }

      if (!data || data.length === 0) {
        return cb({ ok: false, error: 'League not found' });
      }

      io.emit('leagues_list_changed');
      io.emit('scoreboard_changed');
      cb({ ok: true });
    } catch (err) {
      console.error('[delete_league]', err);
      cb({ ok: false, error: 'Failed to delete league' });
    }
  });

  socket.on('change_num_tables', async (leagueId, newNumTables, cb) => {
    try {
      if (!isValidUuid(leagueId)) return cb({ ok: false, error: 'Invalid ID format' });

      const { data: league, error: fetchErr } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single();

      if (fetchErr || !league) {
        return cb({ ok: false, error: 'League not found' });
      }

      const v = validateNumTablesChange(newNumTables, league);
      if (!v.ok) return cb({ ok: false, error: v.error });

      // Build score lookup: playerA|playerB → { scoreA, scoreB }
      const scoresByPair = {};
      for (const f of league.state.fixtures) {
        const key = `${f.playerA}|${f.playerB}`;
        scoresByPair[key] = { scoreA: f.scoreA, scoreB: f.scoreB };
      }

      // Extract all pairs from current fixtures
      const allPairs = league.state.fixtures.map(f => [f.playerA, f.playerB]);

      // Re-bin ALL fixtures using buildSchedule with new table count
      const { buildSchedule } = require('../fixtureGenerator');
      const newSchedule = buildSchedule([allPairs], newNumTables);

      // Convert schedule back to fixture objects, preserving scores
      const crypto = require('crypto');
      const newFixtures = [];
      newSchedule.forEach((slot, slotIdx) => {
        slot.forEach((match, orderIdx) => {
          const key = `${match[0]}|${match[1]}`;
          const oldScore = scoresByPair[key] || { scoreA: null, scoreB: null };
          newFixtures.push({
            id: crypto.randomUUID(),
            slot: slotIdx + 1,
            playerA: match[0],
            playerB: match[1],
            scoreA: oldScore.scoreA,
            scoreB: oldScore.scoreB,
            table: orderIdx + 1,
            order: orderIdx + 1,
          });
        });
      });

      // Update state with new num_tables and re-binned fixtures
      const newState = {
        ...league.state,
        num_tables: newNumTables,
        fixtures: newFixtures,
      };

      // Persist to database
      const { data: updated, error: updateErr } = await supabase
        .from('leagues')
        .update({ state: newState })
        .eq('id', leagueId)
        .select()
        .single();

      if (updateErr) {
        console.error('[change_num_tables] DB update failed:', updateErr);
        return cb({ ok: false, error: 'DB update failed' });
      }

      // Sync scoreboard
      try { await scoreboardManager.writeEntry(leagueId, updated); }
      catch (sbErr) { console.error('[change_num_tables] scoreboard sync failed:', sbErr.message); }

      // Broadcast changes
      io.emit('scoreboard_changed');
      io.emit('leagues_list_changed');

      cb({ ok: true, league: updated });
    } catch (err) {
      console.error('[change_num_tables]', err);
      cb({ ok: false, error: err.message });
    }
  });

}

module.exports = registerLeagueHandlers;
