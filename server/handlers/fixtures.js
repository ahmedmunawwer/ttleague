'use strict';

const crypto = require('crypto');
const supabase = require('../supabase');
const { isValidUuid, validateMatchScore } = require('../validate');
const fixtureGenerator = require('../fixtureGenerator');
const scoreboardManager = require('../scoreboardManager');

function registerFixtureHandlers(io, socket) {

  socket.on('generate_fixtures', async (leagueId, numTables, cb) => {
    try {
      if (!isValidUuid(leagueId)) return cb({ ok: false, error: 'Invalid ID format' });

      if (!Number.isInteger(numTables) || numTables < 1 || numTables > 6) {
        return cb({ ok: false, error: 'Invalid number of tables' });
      }

      const { data: league, error: loadError } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single();

      if (loadError) {
        console.error('[generate_fixtures]', loadError);
        if (loadError.code === 'PGRST116') return cb({ ok: false, error: 'League not found' });
        return cb({ ok: false, error: 'Failed to generate fixtures' });
      }

      if (league.state.fixtures && league.state.fixtures.length > 0) {
        return cb({ ok: false, error: 'Fixtures already generated for this season' });
      }

      const schedule = fixtureGenerator.generateFixtures(
        league.config.players,
        league.config.round_robin_freq,
        numTables
      );

      const flatFixtures = [];
      schedule.forEach((slot, slotIdx) => {
        slot.forEach((match, orderIdx) => {
          flatFixtures.push({
            id: crypto.randomUUID(),
            slot: slotIdx + 1,
            playerA: match.playerA,
            playerB: match.playerB,
            scoreA: null,
            scoreB: null,
            table: orderIdx + 1,
            order: orderIdx + 1,
          });
        });
      });

      const newState = { ...league.state, fixtures: flatFixtures, num_tables: numTables };

      const { data, error: updateError } = await supabase
        .from('leagues')
        .update({ state: newState })
        .eq('id', leagueId)
        .select()
        .single();

      if (updateError) {
        console.error('[generate_fixtures]', updateError);
        return cb({ ok: false, error: 'Failed to generate fixtures' });
      }

      try { await scoreboardManager.writeEntry(data.id, data); }
      catch (sbErr) { console.warn('[scoreboard] writeEntry failed (non-fatal):', sbErr.message); }

      io.emit('leagues_list_changed');
      io.emit('scoreboard_changed');
      io.emit('league_updated', { id: leagueId });
      cb({ ok: true, league: data });
    } catch (err) {
      console.error('[generate_fixtures]', err);
      cb({ ok: false, error: 'Failed to generate fixtures' });
    }
  });

  socket.on('update_match_score', async (leagueId, matchId, scoreA, scoreB, cb) => {
    try {
      if (!isValidUuid(leagueId)) return cb({ ok: false, error: 'Invalid ID format' });

      if (typeof matchId !== 'string' || matchId.length === 0) {
        return cb({ ok: false, error: 'Invalid match ID' });
      }

      const { data: league, error: loadError } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single();

      if (loadError) {
        if (loadError.code === 'PGRST116') return cb({ ok: false, error: 'League not found' });
        console.error('[update_match_score]', loadError);
        return cb({ ok: false, error: 'Failed to update match score' });
      }

      const fixtures = league.state.fixtures || [];
      const matchIndex = fixtures.findIndex(f => f.id === matchId);
      if (matchIndex === -1) {
        return cb({ ok: false, error: 'Match not found' });
      }

      const validation = validateMatchScore(scoreA, scoreB, league.config.game_point);
      if (!validation.ok) return cb({ ok: false, error: validation.error });

      const newFixtures = fixtures.map((f, i) =>
        i === matchIndex ? { ...f, scoreA, scoreB } : f
      );
      const newState = { ...league.state, fixtures: newFixtures };

      const { data: updatedLeague, error: updateError } = await supabase
        .from('leagues')
        .update({ state: newState })
        .eq('id', leagueId)
        .select()
        .single();

      if (updateError) {
        console.error('[update_match_score]', updateError);
        return cb({ ok: false, error: 'Failed to update match score' });
      }

      try { await scoreboardManager.writeEntry(updatedLeague.id, updatedLeague); }
      catch (sbErr) { console.warn('[scoreboard] writeEntry failed (non-fatal):', sbErr.message); }

      io.emit('leagues_list_changed');
      io.emit('scoreboard_changed');
      io.emit('league_updated', { id: leagueId });

      cb({ ok: true, league: updatedLeague });
    } catch (err) {
      console.error('[update_match_score]', err);
      cb({ ok: false, error: 'Failed to update match score' });
    }
  });

}

module.exports = registerFixtureHandlers;
