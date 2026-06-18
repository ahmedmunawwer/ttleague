'use strict';

const supabase = require('../supabase');
const { isValidUuid, validateSeasonComplete } = require('../validate');
const scoreboardManager = require('../scoreboardManager');

function registerSeasonHandlers(io, socket) {

  socket.on('complete_season', async (leagueId, cb) => {
    try {
      if (!isValidUuid(leagueId)) return cb({ ok: false, error: 'Invalid ID format' });

      const { data: league, error: loadError } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single();

      if (loadError) {
        console.error('[complete_season]', loadError);
        if (loadError.code === 'PGRST116') return cb({ ok: false, error: 'League not found' });
        return cb({ ok: false, error: 'Failed to complete season' });
      }

      // Validate season is complete
      const r = validateSeasonComplete(league);
      if (!r.ok) return cb({ ok: false, error: r.error });

      // Build snapshot
      const snapshot = {
        season_num: league.state.current_season,
        fixtures: league.state.fixtures,
      };

      // Build new history
      const newHistory = [...(league.history || []), snapshot];

      // Build new state
      const newState = {
        ...league.state,
        fixtures: [],
        num_tables: 1,
        current_season: league.state.current_season + 1,
      };

      // Persist
      const { data, error: updateError } = await supabase
        .from('leagues')
        .update({ state: newState, history: newHistory })
        .eq('id', leagueId)
        .select()
        .single();

      if (updateError) {
        console.error('[complete_season]', updateError);
        return cb({ ok: false, error: 'Failed to complete season' });
      }

      // Sync scoreboard
      try { await scoreboardManager.writeEntry(data.id, data); }
      catch (sbErr) { console.warn('[scoreboard] writeEntry failed (non-fatal):', sbErr.message); }

      // Broadcast
      io.emit('leagues_list_changed');
      io.emit('scoreboard_changed');
      io.emit('league_updated', { id: leagueId });

      cb({ ok: true, league: data });
    } catch (err) {
      console.error('[complete_season]', err);
      cb({ ok: false, error: 'Failed to complete season' });
    }
  });

  socket.on('end_league', async (leagueId, cb) => {
    try {
      if (!isValidUuid(leagueId)) return cb({ ok: false, error: 'Invalid ID format' });

      const { data: league, error: loadError } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single();

      if (loadError) {
        console.error('[end_league]', loadError);
        if (loadError.code === 'PGRST116') return cb({ ok: false, error: 'League not found' });
        return cb({ ok: false, error: 'Failed to end league' });
      }

      // Defensive check: only end in_progress leagues
      if (league.status !== 'in_progress') {
        return cb({ ok: false, error: 'League is not in progress' });
      }

      // Build snapshot of current season
      const snapshot = {
        season_num: league.state.current_season,
        fixtures: league.state.fixtures,
      };

      // Build new history
      const newHistory = [...(league.history || []), snapshot];

      // Persist
      const { data, error: updateError } = await supabase
        .from('leagues')
        .update({ status: 'completed', history: newHistory })
        .eq('id', leagueId)
        .select()
        .single();

      if (updateError) {
        console.error('[end_league]', updateError);
        return cb({ ok: false, error: 'Failed to end league' });
      }

      // Sync scoreboard
      try { await scoreboardManager.writeEntry(data.id, data); }
      catch (sbErr) { console.warn('[scoreboard] writeEntry failed (non-fatal):', sbErr.message); }

      // Broadcast
      io.emit('leagues_list_changed');
      io.emit('scoreboard_changed');
      io.emit('league_updated', { id: leagueId });

      cb({ ok: true, league: data });
    } catch (err) {
      console.error('[end_league]', err);
      cb({ ok: false, error: 'Failed to end league' });
    }
  });

}

module.exports = registerSeasonHandlers;
