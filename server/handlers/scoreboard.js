'use strict';

const scoreboardManager = require('../scoreboardManager');
const { isValidUuid, validateStatus } = require('../validate');

function registerScoreboardHandlers(io, socket) {

  socket.on('list_scoreboard', async (filterOrCb, maybeCb) => {
    try {
      let filter, cb;
      if (typeof filterOrCb === 'function') {
        filter = null;
        cb = filterOrCb;
      } else {
        filter = filterOrCb;
        cb = maybeCb;
      }

      if (filter?.status !== undefined) {
        const r = validateStatus(filter.status);
        if (!r.ok) return cb({ ok: false, error: r.error });
      }

      const entries = await scoreboardManager.listEntries(filter);
      cb({ ok: true, entries });
    } catch (err) {
      console.error('[list_scoreboard]', err);
      cb({ ok: false, error: 'Failed to list scoreboard' });
    }
  });

  socket.on('delete_scoreboard_entry', async (id, cb) => {
    try {
      if (!isValidUuid(id)) return cb({ ok: false, error: 'Invalid ID format' });

      await scoreboardManager.deleteEntry(id);
      io.emit('scoreboard_changed');
      cb({ ok: true });
    } catch (err) {
      console.error('[delete_scoreboard_entry]', err);
      cb({ ok: false, error: 'Failed to delete scoreboard entry' });
    }
  });

}

module.exports = registerScoreboardHandlers;
