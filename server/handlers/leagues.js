'use strict';

const supabase = require('../supabase');
const { isValidUuid, validateName, validateStatus, validateLeagueConfig } = require('../validate');

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

      io.emit('leagues_list_changed');
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
      cb({ ok: true });
    } catch (err) {
      console.error('[delete_league]', err);
      cb({ ok: false, error: 'Failed to delete league' });
    }
  });

}

module.exports = registerLeagueHandlers;
