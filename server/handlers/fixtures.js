'use strict';

const crypto = require('crypto');
const supabase = require('../supabase');
const { isValidUuid } = require('../validate');
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

}

module.exports = registerFixtureHandlers;
